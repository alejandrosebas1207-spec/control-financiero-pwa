// Alejo OS · Credit Card Module
import { CREDIT_CARD_KEY, ACCOUNT_BALANCES_KEY, SEED_DATA } from '../../core/constants.js';
import { normalizeAccountId, fmt, showToast } from '../../core/utils.js';

let _syncPushFn = () => {};
let _getTxFn = () => [];
let _getCurrentAccountTotalsFn = () => ({});
let _renderFn = () => {};

export function registerCreditCardDeps(deps) {
  if (deps.syncPush) _syncPushFn = deps.syncPush;
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.getCurrentAccountTotals) _getCurrentAccountTotalsFn = deps.getCurrentAccountTotals;
  if (deps.render) _renderFn = deps.render;
}

export const DEFAULT_CREDIT_CARD = {
  cutOffDay: 24,
  paymentDueDay: 8,
  baselineDate: '2026-08-19',
  baselineDebt: 0.00,
  name: 'Tarjeta de Crédito'
};

export function normalizeCreditCard(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_CREDIT_CARD;
  const cutOffDay = parseInt(raw.cutOffDay, 10) || 24;
  const paymentDueDay = parseInt(raw.paymentDueDay, 10) || 8;
  const baselineDebt = Number.isFinite(Number(raw.baselineDebt)) ? Number(raw.baselineDebt) : 0.00;
  const baselineDate = (raw.baselineDate && /^\d{4}-\d{2}-\d{2}$/.test(raw.baselineDate)) ? raw.baselineDate : '2026-08-19';
  return { cutOffDay, paymentDueDay, baselineDebt, baselineDate, name: raw.name || 'Tarjeta de Crédito' };
}

export function loadCreditCard() {
  try {
    const stored = localStorage.getItem(CREDIT_CARD_KEY);
    if (stored) {
      const parsed = normalizeCreditCard(JSON.parse(stored));
      if (parsed.baselineDebt === 14.23) parsed.baselineDebt = 0.00;
      return parsed;
    }
    if (SEED_DATA && SEED_DATA.creditCard) {
      const parsed = normalizeCreditCard(SEED_DATA.creditCard);
      localStorage.setItem(CREDIT_CARD_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) {}
  return DEFAULT_CREDIT_CARD;
}

export let creditCardConfig = loadCreditCard();
export const getCreditCardConfig = () => creditCardConfig;
export const setCreditCardConfig = val => { creditCardConfig = normalizeCreditCard(val); };

export function saveCreditCard(val, shouldSync = true) {
  creditCardConfig = normalizeCreditCard(val);
  localStorage.setItem(CREDIT_CARD_KEY, JSON.stringify(creditCardConfig));
  if (shouldSync) _syncPushFn();
}

export function getNextCutOffDate(cutOffDay) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  if (day <= cutOffDay) {
    return new Date(year, month, cutOffDay);
  } else {
    return new Date(year, month + 1, cutOffDay);
  }
}

export function getNextPaymentDueDate(cutOffDay, paymentDueDay) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  
  if (day > cutOffDay) {
    return new Date(year, month + 1, paymentDueDay);
  } else {
    if (day <= paymentDueDay) {
      return new Date(year, month, paymentDueDay);
    } else {
      return new Date(year, month + 1, paymentDueDay);
    }
  }
}

export function isCreditCardPaymentTx(t) {
  if (!t || t.type !== 'expense') return false;
  if (normalizeAccountId(t.account) === 'tc') return false;
  const cat = (t.cat || '').trim().toLowerCase();
  const note = (t.note || '').trim().toLowerCase();
  return cat === 'pago tarjeta' || cat === 'pago tarjeta de crédito' || cat === 'pago tc' || cat === 'pagar tarjeta de credito' || /pago.*tarjeta/i.test(cat) || /pagar.*tarjeta/i.test(cat) || /pago.*tarjeta/i.test(note) || /pago.*tc/i.test(note);
}

export function calculateCreditCardDebt() {
  const cfg = creditCardConfig || DEFAULT_CREDIT_CARD;
  const baseline = Number.isFinite(Number(cfg.baselineDebt)) ? Number(cfg.baselineDebt) : 0;
  const bDate = cfg.baselineDate || '2026-08-19';
  const tx = _getTxFn();
  
  const tcExpenses = (tx || []).filter(t => normalizeAccountId(t.account) === 'tc' && t.type === 'expense' && (!bDate || t.date >= bDate)).reduce((s, t) => s + Number(t.amt || 0), 0);
  
  const directPayments = (tx || []).filter(t => (
    (normalizeAccountId(t.account) === 'tc' && t.type === 'income') ||
    ((t.type === 'withdrawal' || t.type === 'transfer') && normalizeAccountId(t.toAccount) === 'tc')
  ) && (!bDate || t.date >= bDate)).reduce((s, t) => s + Number(t.amt || 0), 0);
  
  const catPayments = (tx || []).filter(t => isCreditCardPaymentTx(t) && (!bDate || t.date >= bDate)).reduce((s, t) => s + Number(t.amt || 0), 0);
  
  return Math.max(0, baseline + tcExpenses - (directPayments + catPayments));
}

export function renderCreditCardPanel() {
  const summary = document.getElementById('tcSummary');
  const badge = document.getElementById('tcCutOffBadge');
  const form = document.getElementById('tcForm');
  if (!summary || !badge || !form) return;
  
  const cfg = creditCardConfig || DEFAULT_CREDIT_CARD;
  const pDay = cfg.paymentDueDay || 8;
  badge.textContent = `corte: día ${cfg.cutOffDay} · pago: día ${pDay}`;
  
  const debt = calculateCreditCardDebt();
  const nextCut = getNextCutOffDate(cfg.cutOffDay);
  const nextCutLabel = nextCut.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const nextPay = getNextPaymentDueDate(cfg.cutOffDay, pDay);
  const nextPayLabel = nextPay.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  
  const totals = _getCurrentAccountTotalsFn();
  const liquidCash = (totals.guayaquil ? totals.guayaquil.balance : 0) + (totals.deuna ? totals.deuna.balance : 0) + (totals.cash ? totals.cash.balance : 0);
  const isCovered = liquidCash >= debt;
  const coverageText = isCovered ? `${fmt(liquidCash)} (100% ✓)` : `${fmt(liquidCash)} (Faltan ${fmt(debt - liquidCash)})`;
  const coverageClass = isCovered ? 'coverage' : 'coverage warn';
  
  summary.innerHTML = `
    <div class="credit-card-item debt">
      <span class="tag">Deuda actual</span>
      <strong>${fmt(debt)}</strong>
    </div>
    <div class="credit-card-item">
      <span class="tag">Próximo corte</span>
      <strong>${nextCutLabel}</strong>
    </div>
    <div class="credit-card-item">
      <span class="tag">Máximo pago</span>
      <strong>${nextPayLabel}</strong>
    </div>
    <div class="credit-card-item ${coverageClass}">
      <span class="tag">Liquidez disponible</span>
      <strong>${coverageText}</strong>
    </div>
  `;
}

export function setupCreditCardEventListeners() {
  const toggleBtn = document.getElementById('toggleTcBtn');
  const cancelBtn = document.getElementById('cancelTcBtn');
  const form = document.getElementById('tcForm');
  if (toggleBtn && form) {
    toggleBtn.onclick = () => {
      const isHidden = form.classList.toggle('hidden');
      toggleBtn.textContent = isHidden ? 'Editar' : 'Cerrar';
      if (!isHidden) {
        document.getElementById('tcCutOffDay').value = creditCardConfig.cutOffDay || 24;
        const pInput = document.getElementById('tcPaymentDueDay');
        if (pInput) pInput.value = creditCardConfig.paymentDueDay || 8;
        document.getElementById('tcBaselineDebt').value = creditCardConfig.baselineDebt || 0;
      }
    };
  }
  if (cancelBtn && form) {
    cancelBtn.onclick = () => {
      form.classList.add('hidden');
      if (toggleBtn) toggleBtn.textContent = 'Editar';
    };
  }
  if (form) {
    form.onsubmit = e => {
      e.preventDefault();
      const cutOffDay = parseInt(document.getElementById('tcCutOffDay').value, 10) || 24;
      const paymentDueDay = parseInt(document.getElementById('tcPaymentDueDay').value, 10) || 8;
      const baselineDebt = parseFloat(document.getElementById('tcBaselineDebt').value) || 0;
      saveCreditCard({
        cutOffDay,
        paymentDueDay,
        baselineDebt,
        baselineDate: (creditCardConfig && creditCardConfig.baselineDate) ? creditCardConfig.baselineDate : '2026-08-19',
        name: 'Tarjeta de Crédito'
      });
      form.classList.add('hidden');
      if (toggleBtn) toggleBtn.textContent = 'Editar';
      _renderFn();
      showToast('Configuración de tarjeta guardada ✓');
    };
  }
}
