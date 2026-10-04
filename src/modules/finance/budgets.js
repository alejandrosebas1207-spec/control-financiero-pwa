// Alejo OS · Budgets & Alerts Module
import { BUDGETS_KEY, ALERT_KEY, SEED_DATA } from '../../core/constants.js';

let _syncPushFn = () => {};
export function registerBudgetsSync(fn) { _syncPushFn = fn; }

export function loadBudgets() {
  try {
    const stored = localStorage.getItem(BUDGETS_KEY);
    const raw = stored ? JSON.parse(stored) : (SEED_DATA.budgets || {});
    const keys = Object.keys(raw);
    if (keys.length && typeof raw[keys[0]] === 'number') {
      const migrated = { "_default": raw };
      localStorage.setItem(BUDGETS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (!stored && Object.keys(raw).length) {
      localStorage.setItem(BUDGETS_KEY, JSON.stringify(raw));
    }
    return raw;
  } catch (e) {
    return SEED_DATA.budgets || {};
  }
}

export let budgets = loadBudgets();
export const getBudgets = () => budgets;
export const setBudgets = b => { budgets = b; };

export const saveBudgets = (b, shouldSync = true) => {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(b));
  if (shouldSync) _syncPushFn();
};

export const loadAlert = () => {
  try {
    const v = localStorage.getItem(ALERT_KEY);
    return v ? parseFloat(v) : null;
  } catch (e) { return null; }
};

export let alertThreshold = loadAlert();
export const getAlertThreshold = () => alertThreshold;
export const setAlertThreshold = v => { alertThreshold = v; };

export const saveAlert = v => {
  if (v == null) localStorage.removeItem(ALERT_KEY);
  else localStorage.setItem(ALERT_KEY, String(v));
};

export function getBudgetsForMonth(mk, customBudgets) {
  const b = customBudgets || budgets;
  return Object.prototype.hasOwnProperty.call(b, mk) ? b[mk] : {};
}

export function setBudgetsForMonth(mk, values) {
  budgets[mk] = values;
  saveBudgets(budgets);
}
