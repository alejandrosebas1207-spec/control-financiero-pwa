const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const accountsSource = fs.readFileSync(path.join(__dirname, '../src/modules/finance/accounts.js'), 'utf8');
const txSource = fs.readFileSync(path.join(__dirname, '../src/modules/finance/transactions.js'), 'utf8');

const context = {
  window: {},
  document: { getElementById: () => null },
  localStorage: { getItem: () => null, setItem: () => null },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  ACCOUNT_DEFS: [
    { id:'guayaquil', name:'Banco Guayaquil', color:'#DE0059', icon:'bank' },
    { id:'deuna', name:'Deuna!', color:'#F2B84B', icon:'deuna' },
    { id:'tc', name:'Tarjeta de Crédito', color:'#F43F5E', icon:'card' },
    { id:'cash', name:'Efectivo', color:'#6EA8FE', icon:'cash' }
  ],
  ARCHIVED_ACCOUNTS: [],
  ALL_ACCOUNTS: [
    { id:'guayaquil', name:'Banco Guayaquil', color:'#DE0059', icon:'bank' },
    { id:'deuna', name:'Deuna!', color:'#F2B84B', icon:'deuna' },
    { id:'tc', name:'Tarjeta de Crédito', color:'#F43F5E', icon:'card' },
    { id:'cash', name:'Efectivo', color:'#6EA8FE', icon:'cash' }
  ],
  UNASSIGNED_ACCOUNT: { id:'unassigned', name:'Sin asignar', color:'#A6989C', icon:'unassigned' }
};
context.ACCOUNT_BY_ID = Object.fromEntries([...context.ALL_ACCOUNTS, context.UNASSIGNED_ACCOUNT].map(a => [a.id, a]));
context.isKnownAccountId = id => Object.prototype.hasOwnProperty.call(context.ACCOUNT_BY_ID, id);
context.normalizeAccountId = id => context.isKnownAccountId(id) ? id : context.UNASSIGNED_ACCOUNT.id;
context.getAccountOptions = includeUnassigned => includeUnassigned ? [...context.ACCOUNT_DEFS, context.UNASSIGNED_ACCOUNT] : context.ACCOUNT_DEFS;

vm.createContext(context);

const getAccountTotalsCode = accountsSource.slice(
  accountsSource.indexOf('export function emptyAccountTotal()'),
  accountsSource.indexOf('export function getCurrentAccountTotals()')
).replace(/export\s+function/g, 'function');

const normalizeTxListCode = txSource.slice(
  txSource.indexOf('export function normalizeTxList(raw)'),
  txSource.indexOf('export function loadTx(')
).replace(/export\s+function/g, 'function');

vm.runInContext(normalizeTxListCode, context);
vm.runInContext(getAccountTotalsCode, context);

test('normalizeTxList preserves toAccount for transfers', () => {
  const list = [
    { id: 1, type: 'transfer', amt: 20, account: 'guayaquil', toAccount: 'cash', date: '2026-10-01' },
    { id: 2, type: 'withdrawal', amt: 15, account: 'guayaquil', date: '2026-10-01' },
    { id: 3, type: 'expense', amt: 5, account: 'deuna', date: '2026-10-01' }
  ];
  const normalized = context.normalizeTxList(list);
  assert.equal(normalized[0].toAccount, 'cash');
  assert.equal(normalized[1].toAccount, 'cash');
  assert.equal(normalized[2].toAccount, undefined);
});

test('transfer moves money between accounts without altering net income/expense', () => {
  const transactions = [
    { id: 1, type: 'income', amt: 100, account: 'guayaquil', date: '2026-10-01' },
    { id: 2, type: 'transfer', amt: 30, account: 'guayaquil', toAccount: 'cash', date: '2026-10-02' },
    { id: 3, type: 'transfer', amt: 20, account: 'guayaquil', toAccount: 'deuna', date: '2026-10-02' }
  ];
  const totals = context.getAccountTotals(transactions, null);

  assert.equal(totals.guayaquil.balance, 50);
  assert.equal(totals.cash.balance, 30);
  assert.equal(totals.deuna.balance, 20);

  const totalLiquid = totals.guayaquil.balance + totals.cash.balance + totals.deuna.balance;
  assert.equal(totalLiquid, 100);

  assert.equal(totals.cash.income, 0);
  assert.equal(totals.deuna.income, 0);
  assert.equal(totals.guayaquil.expense, 0);
});
