// Alejo OS · Accounts Module
import {
  ACCOUNT_DEFS,
  ACCOUNT_BALANCES_KEY,
  DEFAULT_ACCOUNT_KEY,
  SEED_DATA
} from '../../core/constants.js';
import {
  isKnownAccountId,
  normalizeAccountId,
  getAccountMeta,
  getAccountOptions,
  accountArtwork,
  accountIcon,
  accountNameById,
  fmt,
  escapeHtml,
  dateKey,
  monthKey,
  animateNumber,
  showToast
} from '../../core/utils.js';

let _syncPushFn = () => {};
let _getTxFn = () => [];
let _setTxFn = () => {};
let _saveTxFn = () => {};
let _calculateCreditCardDebtFn = () => 0;
let _getCreditCardConfigFn = () => ({ cutOffDay: 24, paymentDueDay: 8 });
let _renderFn = () => {};
let _getCursorFn = () => new Date();

export function registerAccountsDeps(deps) {
  if (deps.syncPush) _syncPushFn = deps.syncPush;
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.setTx) _setTxFn = deps.setTx;
  if (deps.saveTx) _saveTxFn = deps.saveTx;
  if (deps.calculateCreditCardDebt) _calculateCreditCardDebtFn = deps.calculateCreditCardDebt;
  if (deps.getCreditCardConfig) _getCreditCardConfigFn = deps.getCreditCardConfig;
  if (deps.render) _renderFn = deps.render;
  if (deps.getCursor) _getCursorFn = deps.getCursor;
}

export function normalizeAccountBalances(raw) {
  if (!raw || typeof raw !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.baselineDate || '')) return null;
  const rawBalances = raw.balances && typeof raw.balances === 'object' ? raw.balances : {};
  const balances = {};
  ACCOUNT_DEFS.forEach(account => {
    const value = parseFloat(rawBalances[account.id]);
    if (account.id === 'tc') {
      balances[account.id] = Number.isFinite(value) ? (value > 0 ? -value : value) : 0;
    } else {
      balances[account.id] = Number.isFinite(value) && value >= 0 ? value : 0;
    }
  });
  return { baselineDate: raw.baselineDate, balances };
}

export function loadAccountBalances() {
  try {
    const stored = localStorage.getItem(ACCOUNT_BALANCES_KEY);
    if (stored) return normalizeAccountBalances(JSON.parse(stored));
    if (SEED_DATA && SEED_DATA.accountBalances) {
      const parsed = normalizeAccountBalances(SEED_DATA.accountBalances);
      if (parsed) {
        localStorage.setItem(ACCOUNT_BALANCES_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    return normalizeAccountBalances(SEED_DATA ? SEED_DATA.accountBalances : null);
  }
  return null;
}

export let accountBalances = loadAccountBalances();
export const getAccountBalances = () => accountBalances;
export const setAccountBalances = b => { accountBalances = normalizeAccountBalances(b); };

export const saveAccountBalances = (value, shouldSync = true) => {
  accountBalances = normalizeAccountBalances(value);
  if (accountBalances) localStorage.setItem(ACCOUNT_BALANCES_KEY, JSON.stringify(accountBalances));
  else localStorage.removeItem(ACCOUNT_BALANCES_KEY);
  if (shouldSync) _syncPushFn();
};

export function loadDefaultAccount() {
  const stored = localStorage.getItem(DEFAULT_ACCOUNT_KEY);
  return (isKnownAccountId(stored) && stored !== 'peigo' && stored !== 'pacifico') ? stored : ACCOUNT_DEFS[0].id;
}

export let defaultAccountId = loadDefaultAccount();
export const getDefaultAccountId = () => defaultAccountId;
export const setDefaultAccountId = id => { defaultAccountId = normalizeAccountId(id); };

export const saveDefaultAccount = (id, shouldSync = true) => {
  defaultAccountId = normalizeAccountId(id);
  localStorage.setItem(DEFAULT_ACCOUNT_KEY, defaultAccountId);
  if (shouldSync) _syncPushFn();
};

export function emptyAccountTotal() {
  return { income: 0, expense: 0, saving: 0, withdrawalOut: 0, withdrawalIn: 0, balance: 0 };
}

export function refreshAccountTotal(total) {
  total.balance = total.income - total.expense - total.saving - total.withdrawalOut + total.withdrawalIn;
}

export function getAccountTotals(items, baselineDate) {
  const relevantItems = baselineDate ? items.filter(t => t.date >= baselineDate) : items;
  const totals = {};
  getAccountOptions(relevantItems.some(t => normalizeAccountId(t.account) === 'unassigned')).forEach(account => {
    totals[account.id] = emptyAccountTotal();
  });
  relevantItems.forEach(t => {
    const accountId = normalizeAccountId(t.account);
    if (!totals[accountId]) totals[accountId] = emptyAccountTotal();
    if (t.type === 'withdrawal' || t.type === 'transfer') {
      const toAccountId = normalizeAccountId(t.toAccount || 'cash');
      if (!totals[toAccountId]) totals[toAccountId] = emptyAccountTotal();
      totals[accountId].withdrawalOut += t.amt;
      totals[toAccountId].withdrawalIn += t.amt;
      refreshAccountTotal(totals[accountId]);
      refreshAccountTotal(totals[toAccountId]);
      return;
    }
    if (t.type === 'income') totals[accountId].income += t.amt;
    if (t.type === 'expense') totals[accountId].expense += t.amt;
    if (t.type === 'saving') totals[accountId].saving += t.amt;
    refreshAccountTotal(totals[accountId]);
  });
  return totals;
}

export function getCurrentAccountTotals() {
  const tx = _getTxFn();
  const totals = getAccountTotals(tx, accountBalances ? accountBalances.baselineDate : null);
  if (accountBalances) {
    ACCOUNT_DEFS.forEach(account => {
      if (!totals[account.id]) totals[account.id] = emptyAccountTotal();
      totals[account.id].balance += accountBalances.balances[account.id] || 0;
    });
  }
  return totals;
}

export function signedAmount(value) {
  return Math.abs(value) < 0.005 ? fmt(0) : (value > 0 ? '+' : '−') + fmt(Math.abs(value));
}

export function balanceAmount(value) {
  return value < 0 ? '−' + fmt(Math.abs(value)) : fmt(value);
}

export function renderAccounts() {
  const cards = document.getElementById('accountCards');
  if (!cards) return;
  const totals = getCurrentAccountTotals();
  const cursor = _getCursorFn();
  const cursorKey = monthKey(cursor);
  const tx = _getTxFn();
  const monthTotals = getAccountTotals(tx.filter(t => monthKey(t.date) === cursorKey), accountBalances ? accountBalances.baselineDate : null);
  const accountIds = getAccountOptions(Object.prototype.hasOwnProperty.call(totals, 'unassigned')).map(account => account.id);
  
  // Total en cuentas líquidas (Banco Guayaquil, Deuna!, Efectivo) - NO resta tarjeta
  const liquidAccountIds = ['guayaquil', 'deuna', 'cash'];
  const liquidTotal = liquidAccountIds.reduce((sum, id) => sum + (totals[id] ? totals[id].balance : 0), 0);
  const flowLabel = cursor.toLocaleDateString('es-ES', { month: 'short' });
  animateNumber('accountsTotal', liquidTotal);
  
  const tcDebt = _calculateCreditCardDebtFn();
  const creditCardConfig = _getCreditCardConfigFn();
  
  cards.innerHTML = accountIds.map(id => {
    const meta = getAccountMeta(id);
    
    if (id === 'tc') {
      const tcHasDebt = tcDebt > 0.005;
      const tcClass = tcHasDebt ? 'tc-has-debt' : 'tc-zero';
      return `<div class="account-card tc-card">
        <div class="account-card-top gold-card-heading">
          <span class="account-card-name">Mastercard <span class="gold-edition">Gold</span></span>
          <span class="card-chip" aria-hidden="true"><svg viewBox="0 0 32 24" fill="none"><rect x="1" y="1" width="30" height="22" rx="5"/><path d="M11 1v22M21 1v22M1 8h10M1 16h10M21 8h10M21 16h10M11 12h10"/></svg></span>
        </div>
        <div class="account-balance-label">Deuda actual</div>
        <div class="account-card-balance tc-val ${tcClass}">${fmt(tcDebt)}</div>
        <div class="gold-card-footer"><div class="account-card-flow">Corte · día ${creditCardConfig.cutOffDay}<br>Pago · día ${creditCardConfig.paymentDueDay || 8}</div><img class="mastercard-logo" src="icons/brands/mastercard.svg" alt="Mastercard" width="48" height="38"></div>
      </div>`;
    }
    
    const current = totals[id] || { balance: 0 };
    const month = monthTotals[id] || { balance: 0 };
    const monthFlow = month.balance;
    const balanceClass = current.balance > 0.005 ? 'pos' : (current.balance < -0.005 ? 'neg' : 'zero');
    const flowClass = monthFlow > 0.005 ? 'pos' : (monthFlow < -0.005 ? 'neg' : '');
    return `<div class="account-card account-${escapeHtml(id)}">
      <div class="account-card-top">
      <div class="account-card-icon" style="--account-color:${meta.color}">${accountArtwork(id, 26)}</div>
        <span class="account-card-name">${escapeHtml(meta.name)}</span>
      </div>
      <div class="account-balance-label">Saldo disponible</div>
      <div class="account-card-balance ${balanceClass}">${balanceAmount(current.balance)}</div>
      <div class="account-card-flow">En ${flowLabel}: <span class="${flowClass}">${signedAmount(monthFlow)}</span></div>
      ${(() => {
        const savedFromAcc = (tx || []).filter(t => t.type === 'saving' && normalizeAccountId(t.account) === id).reduce((s, t) => s + t.amt, 0)
                           - (tx || []).filter(t => t.type === 'withdrawal' && normalizeAccountId(t.account) === id).reduce((s, t) => s + t.amt, 0);
        return savedFromAcc > 0.005 ? `<div class="account-savings"><span>Ahorro</span><strong>${fmt(savedFromAcc)}</strong></div>` : '';
      })()}
    </div>`;
  }).join('');

  const unassignedCount = tx.filter(t => normalizeAccountId(t.account) === 'unassigned').length;
  const note = document.getElementById('accountNote');
  const notes = [];
  if (accountBalances) {
    const baselineLabel = new Date(accountBalances.baselineDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    notes.push(`Saldos de partida configurados desde el ${baselineLabel}. Los movimientos anteriores se mantienen en el historial, pero no cambian estos saldos.`);
  }
  if (unassignedCount) {
    notes.push(`${unassignedCount} movimiento${unassignedCount === 1 ? '' : 's'} antiguo${unassignedCount === 1 ? '' : 's'} todavía no tiene cuenta. Puedes repartirlos desde <b>Ajustes → Mis cuentas</b> o editarlos individualmente.`);
  }
  if (notes.length && note) {
    note.classList.remove('hidden');
    note.innerHTML = notes.join(' ');
  } else if (note) {
    note.classList.add('hidden');
    note.textContent = '';
  }
}

export function renderAccountSettings() {
  const defaultSelect = document.getElementById('defaultAccountSelect');
  if (!defaultSelect) return;
  defaultSelect.innerHTML = ACCOUNT_DEFS.map(account => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
  defaultSelect.value = defaultAccountId;
  defaultSelect.onchange = () => {
    defaultAccountId = normalizeAccountId(defaultSelect.value);
    saveDefaultAccount(defaultAccountId);
    _renderFn();
    showToast(`Cuenta predeterminada: ${accountNameById(defaultAccountId)}`);
  };

  const openingFields = document.getElementById('accountOpeningFields');
  const baselineInput = document.getElementById('accountBaselineDate');
  const balancesStatus = document.getElementById('accountBalancesStatus');
  if (openingFields) {
    openingFields.innerHTML = ACCOUNT_DEFS.map(account => {
      let val = '';
      if (accountBalances && accountBalances.balances && accountBalances.balances[account.id] !== undefined) {
        val = Math.abs(accountBalances.balances[account.id]);
      } else if (account.id === 'tc') {
        val = 0.00;
      }
      const labelExtra = account.id === 'tc' ? ' (Deuda inicial)' : '';
      return `<div class="account-opening-item">
        <label for="opening-${account.id}">${accountIcon(account.id, 13)}${escapeHtml(account.name)}${labelExtra}</label>
        <input class="opening-balance-input" id="opening-${account.id}" data-account="${account.id}" type="number" min="0" step="0.01" placeholder="0.00" value="${val}">
      </div>`;
    }).join('');
  }
  if (baselineInput) baselineInput.value = accountBalances ? accountBalances.baselineDate : dateKey();
  if (balancesStatus) {
    balancesStatus.className = 'sync-status' + (accountBalances ? ' ok' : '');
    balancesStatus.textContent = accountBalances
      ? 'Saldos de partida activos desde ' + new Date(accountBalances.baselineDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) + '.'
      : 'Todavía no has configurado saldos de partida.';
  }
  const saveBtn = document.getElementById('saveAccountBalancesBtn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const baselineDate = (baselineInput && baselineInput.value) || dateKey();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(baselineDate) || baselineDate > dateKey()) {
        showToast('Elige una fecha válida, que no sea futura');
        return;
      }
      const balances = {};
      if (openingFields) {
        openingFields.querySelectorAll('.opening-balance-input').forEach(input => {
          const value = parseFloat(input.value);
          if (input.dataset.account === 'tc') {
            balances[input.dataset.account] = Number.isFinite(value) ? -Math.abs(value) : 0.00;
          } else {
            balances[input.dataset.account] = Number.isFinite(value) && value >= 0 ? value : 0;
          }
        });
      }
      accountBalances = normalizeAccountBalances({ baselineDate, balances });
      saveAccountBalances(accountBalances);
      renderAccountSettings();
      _renderFn();
      showToast('Saldos de partida guardados');
    };
  }
  const clearBtn = document.getElementById('clearAccountBalancesBtn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      accountBalances = null;
      saveAccountBalances(null);
      renderAccountSettings();
      _renderFn();
      showToast('Se usarán solo los movimientos registrados');
    };
  }

  const tx = _getTxFn();
  const oldTx = tx.filter(t => normalizeAccountId(t.account) === 'unassigned');
  const migration = document.getElementById('accountMigration');
  const migrationText = document.getElementById('accountMigrationText');
  const legacySelect = document.getElementById('legacyAccountSelect');
  const assignBtn = document.getElementById('assignLegacyBtn');
  if (migration) {
    if (oldTx.length === 0) {
      migration.classList.add('hidden');
    } else {
      migration.classList.remove('hidden');
      if (migrationText) migrationText.textContent = `Tienes ${oldTx.length} movimiento${oldTx.length === 1 ? '' : 's'} antiguo${oldTx.length === 1 ? '' : 's'} sin cuenta. Si todos pertenecen al mismo lugar, asígnalos de una vez:`;
      if (legacySelect) legacySelect.innerHTML = ACCOUNT_DEFS.map(account => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
      if (assignBtn) {
        assignBtn.onclick = () => {
          const account = normalizeAccountId(legacySelect.value);
          const updatedTx = tx.map(t => normalizeAccountId(t.account) === 'unassigned' ? { ...t, account } : t);
          _setTxFn(updatedTx);
          _saveTxFn(updatedTx);
          renderAccountSettings();
          _renderFn();
          showToast(`${oldTx.length} movimiento${oldTx.length === 1 ? '' : 's'} asignado${oldTx.length === 1 ? '' : 's'} a ${accountNameById(account)}`);
        };
      }
    }
  }
}

export function renderAccountOptions(selectedId) {
  const select = document.getElementById('accountSelect');
  if (!select) return;
  const currentSelected = selectedId || select.value || defaultAccountId;
  select.innerHTML = ACCOUNT_DEFS.map(account => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
  select.value = normalizeAccountId(currentSelected);
}

export function renderToAccountOptions(selectedId, fromId) {
  const select = document.getElementById('toAccountSelect');
  if (!select) return;
  const sourceId = normalizeAccountId(fromId || document.getElementById('accountSelect')?.value || defaultAccountId);
  const currentSelected = selectedId || select.value || (sourceId === 'guayaquil' ? 'cash' : 'guayaquil');
  const available = ACCOUNT_DEFS.filter(a => a.id !== sourceId);
  select.innerHTML = available.map(account => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
  select.value = available.some(a => a.id === currentSelected) ? currentSelected : (available[0] ? available[0].id : '');
}
