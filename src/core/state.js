// Alejo OS · Central State & Store
import {
  SEED_DATA,
  TX_KEY,
  BUDGETS_KEY,
  GOALS_KEY,
  ACCOUNT_BALANCES_KEY,
  DEFAULT_ACCOUNT_KEY,
  DELETED_TX_KEY,
  DELETED_TASK_KEY,
  DELETED_EXAM_KEY,
  DELETED_FUEL_KEY,
  DELETED_SERVICE_KEY,
  CREDIT_CARD_KEY,
  MOTORCYCLE_MAINTENANCE_KEY,
  TASKS_KEY,
  EXAMS_KEY,
  CURRENT_APP_DATA_VERSION
} from './constants.js';

export const state = {
  tx: [],
  deletedTxIds: new Set(),
  deletedTaskIds: new Set(),
  deletedExamIds: new Set(),
  deletedFuelLogIds: new Set(),
  deletedServiceIds: new Set(),
  budgets: {},
  goals: [],
  goalHistory: [],
  alertThreshold: null,
  defaultAccountId: 'guayaquil',
  accountBalances: null,
  creditCard: null,
  motorcycleMaintenance: null,
  cats: [],
  catsData: [],
  catColor: {},
  tasksList: [],
  examsList: [],
  currentTaskFilter: 'all',
  editingTaskId: null,
  editingExamId: null,
  editingTxId: null,
  goalFormOpen: false,
  currentActiveTab: 'finance',
  currentMonth: '',
  lastLocalMutationTime: 0,
  sbClient: null,
  sbUser: null,
  sbRealtimeChannel: null,
  isPushingToRemote: false,
  needsAnotherPush: false,
  supabaseDebounceTimer: null,
  supabasePullPromise: null,
  pendingAuthSyncTimer: null
};

export function initTombstoneSet(key, setRef) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) JSON.parse(raw).forEach(id => setRef.add(id));
  } catch (e) {}
}

export function saveTombstoneSet(key, setRef) {
  try {
    localStorage.setItem(key, JSON.stringify([...setRef]));
  } catch (e) {}
}

export function runInitialMigrations() {
  initTombstoneSet(DELETED_TX_KEY, state.deletedTxIds);
  initTombstoneSet(DELETED_TASK_KEY, state.deletedTaskIds);
  initTombstoneSet(DELETED_EXAM_KEY, state.deletedExamIds);
  initTombstoneSet(DELETED_FUEL_KEY, state.deletedFuelLogIds);
  initTombstoneSet(DELETED_SERVICE_KEY, state.deletedServiceIds);

  try {
    // Migración limpia para reemplazar Banco del Pacífico / PeiGo por Banco Guayaquil
    const storedBal = localStorage.getItem(ACCOUNT_BALANCES_KEY);
    if (storedBal) {
      try {
        const b = JSON.parse(storedBal);
        if (b && b.balances) {
          delete b.balances.peigo;
          delete b.balances.pacifico;
          if (b.balances.guayaquil === undefined) b.balances.guayaquil = 0;
          localStorage.setItem(ACCOUNT_BALANCES_KEY, JSON.stringify(b));
        }
      } catch (err) {}
    }
    const storedDef = localStorage.getItem(DEFAULT_ACCOUNT_KEY);
    if (!storedDef || storedDef === 'peigo' || storedDef === 'pacifico' || storedDef === 'unassigned') {
      localStorage.setItem(DEFAULT_ACCOUNT_KEY, 'guayaquil');
    }

    // Migrar cualquier transacción local que tenga 'pacifico' o 'unassigned' a 'guayaquil'
    const storedTx = localStorage.getItem(TX_KEY);
    if (storedTx) {
      try {
        const txs = JSON.parse(storedTx);
        let changed = false;
        if (Array.isArray(txs)) {
          txs.forEach(t => {
            if (t.account === 'pacifico' || t.account === 'unassigned') {
              t.account = 'guayaquil';
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(TX_KEY, JSON.stringify(txs));
          }
        }
      } catch (err) {}
    }

    // Primera instalación: solo poblar seed si el storage está completamente vacío
    if (!localStorage.getItem(TX_KEY) && typeof SEED_DATA !== 'undefined' && SEED_DATA) {
      if (SEED_DATA.tx) localStorage.setItem(TX_KEY, JSON.stringify(SEED_DATA.tx));
      if (SEED_DATA.accountBalances) localStorage.setItem(ACCOUNT_BALANCES_KEY, JSON.stringify(SEED_DATA.accountBalances));
      if (SEED_DATA.goals) localStorage.setItem(GOALS_KEY, JSON.stringify(SEED_DATA.goals));
      if (SEED_DATA.creditCard) localStorage.setItem(CREDIT_CARD_KEY, JSON.stringify(SEED_DATA.creditCard));
      if (SEED_DATA.motorcycleMaintenance) localStorage.setItem(MOTORCYCLE_MAINTENANCE_KEY, JSON.stringify(SEED_DATA.motorcycleMaintenance));
      if (SEED_DATA.tasks) localStorage.setItem(TASKS_KEY, JSON.stringify(SEED_DATA.tasks));
      if (SEED_DATA.exams) localStorage.setItem(EXAMS_KEY, JSON.stringify(SEED_DATA.exams));
    }
    localStorage.setItem('mcf_app_data_version', CURRENT_APP_DATA_VERSION);
  } catch (e) {
    console.warn('Error en inicializador seguro de datos:', e);
  }
}
