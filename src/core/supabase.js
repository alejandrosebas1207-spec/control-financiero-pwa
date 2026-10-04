// Alejo OS · Supabase Cloud Synchronization & Auth Module
import { createClient } from '@supabase/supabase-js';
import {
  TX_KEY,
  GOALS_KEY,
  GOAL_HISTORY_KEY,
  BUDGETS_KEY,
  CREDIT_CARD_KEY,
  TASKS_KEY,
  EXAMS_KEY,
  DELETED_TX_KEY
} from './constants.js';
import { escapeHtml, showToast, isKnownAccountId, dateKey } from './utils.js';

let _getTxFn = () => [];
let _setTxFn = () => {};
let _getGoalsFn = () => [];
let _setGoalsFn = () => {};
let _getGoalHistoryFn = () => [];
let _setGoalHistoryFn = () => {};
let _getBudgetsFn = () => ({});
let _setBudgetsFn = () => {};
let _getAlertThresholdFn = () => null;
let _setAlertThresholdFn = () => {};
let _getCatsDataFn = () => [];
let _applyCatsFn = () => {};
let _getAccountBalancesFn = () => null;
let _setAccountBalancesFn = () => {};
let _saveAccountBalancesFn = () => {};
let _getDefaultAccountIdFn = () => 'guayaquil';
let _saveDefaultAccountFn = () => {};
let _getMotorcycleMaintenanceFn = () => null;
let _setMotorcycleMaintenanceFn = () => {};
let _saveMotorcycleMaintenanceFn = () => {};
let _getCreditCardConfigFn = () => ({});
let _setCreditCardConfigFn = () => {};
let _getTasksListFn = () => [];
let _setTasksListFn = () => {};
let _getExamsListFn = () => [];
let _setExamsListFn = () => {};
let _getDeletedTxIdsFn = () => new Set();
let _getDeletedTaskIdsFn = () => new Set();
let _getDeletedExamIdsFn = () => new Set();
let _getDeletedFuelLogIdsFn = () => new Set();
let _getDeletedServiceIdsFn = () => new Set();
let _getGoalFormOpenFn = () => false;
let _getCurrentActiveTabFn = () => 'finance';
let _getCurrentTaskFilterFn = () => 'all';
let _renderFn = () => {};
let _renderMotoDashboardFn = () => {};
let _renderTasksListFn = () => {};
let _renderExamsListFn = () => {};
let _updateBadgesFn = () => {};
let _normalizeTxListFn = x => x;
let _normalizeAccountBalancesFn = x => x;
let _normalizeMotorcycleMaintenanceFn = x => x;
let _normalizeCreditCardFn = x => x;
let _saveAlertFn = () => {};

export function registerSupabaseDeps(deps) {
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.setTx) _setTxFn = deps.setTx;
  if (deps.getGoals) _getGoalsFn = deps.getGoals;
  if (deps.setGoals) _setGoalsFn = deps.setGoals;
  if (deps.getGoalHistory) _getGoalHistoryFn = deps.getGoalHistory;
  if (deps.setGoalHistory) _setGoalHistoryFn = deps.setGoalHistory;
  if (deps.getBudgets) _getBudgetsFn = deps.getBudgets;
  if (deps.setBudgets) _setBudgetsFn = deps.setBudgets;
  if (deps.getAlertThreshold) _getAlertThresholdFn = deps.getAlertThreshold;
  if (deps.setAlertThreshold) _setAlertThresholdFn = deps.setAlertThreshold;
  if (deps.getCatsData) _getCatsDataFn = deps.getCatsData;
  if (deps.applyCats) _applyCatsFn = deps.applyCats;
  if (deps.getAccountBalances) _getAccountBalancesFn = deps.getAccountBalances;
  if (deps.setAccountBalances) _setAccountBalancesFn = deps.setAccountBalances;
  if (deps.saveAccountBalances) _saveAccountBalancesFn = deps.saveAccountBalances;
  if (deps.getDefaultAccountId) _getDefaultAccountIdFn = deps.getDefaultAccountId;
  if (deps.saveDefaultAccount) _saveDefaultAccountFn = deps.saveDefaultAccount;
  if (deps.getMotorcycleMaintenance) _getMotorcycleMaintenanceFn = deps.getMotorcycleMaintenance;
  if (deps.setMotorcycleMaintenance) _setMotorcycleMaintenanceFn = deps.setMotorcycleMaintenance;
  if (deps.saveMotorcycleMaintenance) _saveMotorcycleMaintenanceFn = deps.saveMotorcycleMaintenance;
  if (deps.getCreditCardConfig) _getCreditCardConfigFn = deps.getCreditCardConfig;
  if (deps.setCreditCardConfig) _setCreditCardConfigFn = deps.setCreditCardConfig;
  if (deps.getTasksList) _getTasksListFn = deps.getTasksList;
  if (deps.setTasksList) _setTasksListFn = deps.setTasksList;
  if (deps.getExamsList) _getExamsListFn = deps.getExamsList;
  if (deps.setExamsList) _setExamsListFn = deps.setExamsList;
  if (deps.getDeletedTxIds) _getDeletedTxIdsFn = deps.getDeletedTxIds;
  if (deps.getDeletedTaskIds) _getDeletedTaskIdsFn = deps.getDeletedTaskIds;
  if (deps.getDeletedExamIds) _getDeletedExamIdsFn = deps.getDeletedExamIds;
  if (deps.getDeletedFuelLogIds) _getDeletedFuelLogIdsFn = deps.getDeletedFuelLogIds;
  if (deps.getDeletedServiceIds) _getDeletedServiceIdsFn = deps.getDeletedServiceIds;
  if (deps.getGoalFormOpen) _getGoalFormOpenFn = deps.getGoalFormOpen;
  if (deps.getCurrentActiveTab) _getCurrentActiveTabFn = deps.getCurrentActiveTab;
  if (deps.getCurrentTaskFilter) _getCurrentTaskFilterFn = deps.getCurrentTaskFilter;
  if (deps.render) _renderFn = deps.render;
  if (deps.renderMotoDashboard) _renderMotoDashboardFn = deps.renderMotoDashboard;
  if (deps.renderTasksList) _renderTasksListFn = deps.renderTasksList;
  if (deps.renderExamsList) _renderExamsListFn = deps.renderExamsList;
  if (deps.updateBadges) _updateBadgesFn = deps.updateBadges;
  if (deps.normalizeTxList) _normalizeTxListFn = deps.normalizeTxList;
  if (deps.normalizeAccountBalances) _normalizeAccountBalancesFn = deps.normalizeAccountBalances;
  if (deps.normalizeMotorcycleMaintenance) _normalizeMotorcycleMaintenanceFn = deps.normalizeMotorcycleMaintenance;
  if (deps.normalizeCreditCard) _normalizeCreditCardFn = deps.normalizeCreditCard;
  if (deps.saveAlert) _saveAlertFn = deps.saveAlert;
}

export let sbClient = null;
export let sbUser = null;
export let sbRealtimeChannel = null;
export let isPushingToRemote = false;
export let needsAnotherPush = false;
export let supabaseDebounceTimer = null;
export let supabasePullPromise = null;
export let pendingAuthSyncTimer = null;
export let lastLocalMutationTime = 0;

export const SB_URL_KEY = 'mcf_sb_url_v2';
export const SB_KEY_KEY = 'mcf_sb_key_v2';

export const DEFAULT_SB_URL = 'https://mddrtrlhhfdtrtaxinxt.supabase.co';
export const DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZHJ0cmxoaGZkdHJ0YXhpbnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTEzNDEsImV4cCI6MjEwMjQ4NzM0MX0.MuBaGKPkfuPVg4dWwA99vrWvWFAXGAUdLbU-r4UzAZs';

export function cleanSupabaseUrl(url) {
  return (url || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
}

export let sbUrl = cleanSupabaseUrl(localStorage.getItem(SB_URL_KEY) || DEFAULT_SB_URL);
export let sbAnonKey = localStorage.getItem(SB_KEY_KEY) || DEFAULT_SB_KEY;

export function initSupabase() {
  if (sbUrl && sbAnonKey) {
    try {
      sbClient = createClient(sbUrl, sbAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      setupAuthListener();
    } catch (e) {
      console.warn('Error inicializando cliente Supabase:', e);
    }
  }
}

export async function setupAuthListener() {
  if (!sbClient) return;
  const authClient = sbClient;

  authClient.auth.onAuthStateChange((event, session) => {
    if (authClient !== sbClient) return;
    handleAuthState(session ? session.user : null);

    if (event === 'SIGNED_OUT') {
      clearTimeout(pendingAuthSyncTimer);
      if (sbRealtimeChannel) {
        authClient.removeChannel(sbRealtimeChannel);
        sbRealtimeChannel = null;
      }
      return;
    }

    if (session && session.user && (
      event === 'INITIAL_SESSION' ||
      event === 'SIGNED_IN' ||
      event === 'TOKEN_REFRESHED'
    )) {
      queueSupabaseRefresh(0, 2);
    }
  });

  try {
    const { data: { session }, error } = await authClient.auth.getSession();
    if (authClient !== sbClient) return;
    if (error) throw error;
    handleAuthState(session ? session.user : null);
    if (session && session.user) {
      const synced = await pullFromSupabase();
      subscribeToRealtime();
      if (!synced || !synced.ok) queueSupabaseRefresh(1200, 2);
    }
  } catch (e) {
    console.warn('Error en auth listener:', e);
    queueSupabaseRefresh(1200, 2);
  }
}

export function queueSupabaseRefresh(delay, retriesLeft) {
  clearTimeout(pendingAuthSyncTimer);
  pendingAuthSyncTimer = setTimeout(async function() {
    pendingAuthSyncTimer = null;
    if (!sbClient || !sbUser) return;
    const synced = await pullFromSupabase();
    subscribeToRealtime();
    if ((!synced || !synced.ok) && retriesLeft > 0 && typeof document !== 'undefined' && document.visibilityState === 'visible') {
      queueSupabaseRefresh(1200, retriesLeft - 1);
    }
  }, delay || 0);
}

export function handleAuthState(user) {
  sbUser = user;
  const authBtn = document.getElementById('authBtn');
  const authBtnLabel = document.getElementById('authBtnLabel');
  const loggedInView = document.getElementById('authLoggedInView');
  const loggedOutView = document.getElementById('authLoggedOutView');
  const emailEl = document.getElementById('authAccountEmail');
  const settingsAuthStatus = document.getElementById('settingsAuthStatus');
  const settingsAccountBtn = document.getElementById('settingsAccountBtn');
  
  if (user) {
    if (authBtn) authBtn.classList.add('logged-in');
    if (authBtnLabel) authBtnLabel.innerHTML = '<span class="dot"></span> ' + escapeHtml(user.email.split('@')[0]);
    if (loggedInView) loggedInView.classList.remove('hidden');
    if (loggedOutView) loggedOutView.classList.add('hidden');
    if (emailEl) emailEl.textContent = user.email;
    if (settingsAuthStatus) {
      settingsAuthStatus.className = 'sync-status ok';
      settingsAuthStatus.innerHTML = '🟢 Conectado: <b>' + escapeHtml(user.email) + '</b>';
    }
    if (settingsAccountBtn) settingsAccountBtn.textContent = 'Gestionar / Cerrar sesión';
  } else {
    if (authBtn) authBtn.classList.remove('logged-in');
    if (authBtnLabel) authBtnLabel.textContent = 'Conectar cuenta';
    if (loggedInView) loggedInView.classList.add('hidden');
    if (loggedOutView) loggedOutView.classList.remove('hidden');
    if (settingsAuthStatus) {
      settingsAuthStatus.className = 'sync-status error';
      settingsAuthStatus.textContent = '🔴 No has iniciado sesión en este dispositivo.';
    }
    if (settingsAccountBtn) settingsAccountBtn.textContent = 'Iniciar sesión / Conectar cuenta';
  }
}

export function collectState() {
  const tx = _getTxFn();
  const deletedTxIds = _getDeletedTxIdsFn();
  const tasksList = _getTasksListFn();
  const deletedTaskIds = _getDeletedTaskIdsFn();
  const examsList = _getExamsListFn();
  const deletedExamIds = _getDeletedExamIdsFn();
  const deletedFuelLogIds = _getDeletedFuelLogIdsFn();
  const deletedServiceIds = _getDeletedServiceIdsFn();
  const motorcycleMaintenance = _getMotorcycleMaintenanceFn();

  return {
    tx: _normalizeTxListFn(tx).filter(t => !deletedTxIds.has(t.id)),
    deletedTxIds: Array.from(deletedTxIds),
    tasks: (tasksList || []).filter(t => !deletedTaskIds.has(t.id)),
    deletedTaskIds: Array.from(deletedTaskIds),
    exams: (examsList || []).filter(e => !deletedExamIds.has(e.id)),
    deletedExamIds: Array.from(deletedExamIds),
    deletedFuelLogIds: Array.from(deletedFuelLogIds),
    deletedServiceIds: Array.from(deletedServiceIds),
    goals: _getGoalsFn(),
    goalHistory: _getGoalHistoryFn(),
    budgets: _getBudgetsFn(),
    alertThreshold: _getAlertThresholdFn(),
    defaultAccountId: _getDefaultAccountIdFn(),
    accountBalances: _getAccountBalancesFn(),
    motorcycleMaintenance,
    motorcycle: motorcycleMaintenance,
    creditCard: _getCreditCardConfigFn(),
    cats: _getCatsDataFn()
  };
}

export function applyState(data) {
  if (!data || typeof data !== 'object') return;
  const deletedTxIds = _getDeletedTxIdsFn();
  if (data.deletedTxIds && Array.isArray(data.deletedTxIds)) {
    data.deletedTxIds.forEach(id => deletedTxIds.add(id));
    try { localStorage.setItem(DELETED_TX_KEY, JSON.stringify(Array.from(deletedTxIds))); } catch (e) {}
  }
  if (data.tx && Array.isArray(data.tx)) {
    const txMap = new Map();
    _normalizeTxListFn(data.tx).forEach(t => {
      if (!deletedTxIds.has(t.id)) txMap.set(t.id, t);
    });
    (_getTxFn() || []).forEach(t => {
      if (!deletedTxIds.has(t.id) && !txMap.has(t.id)) {
        txMap.set(t.id, t);
      }
    });
    const mergedTx = Array.from(txMap.values());
    _setTxFn(mergedTx);
    localStorage.setItem(TX_KEY, JSON.stringify(mergedTx));
  }
  if (data.goals && Array.isArray(data.goals)) {
    _setGoalsFn(data.goals);
    localStorage.setItem(GOALS_KEY, JSON.stringify(data.goals));
  }
  if (data.goalHistory && Array.isArray(data.goalHistory)) {
    _setGoalHistoryFn(data.goalHistory);
    localStorage.setItem(GOAL_HISTORY_KEY, JSON.stringify(data.goalHistory));
  }
  if (data.budgets) {
    _setBudgetsFn(data.budgets);
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(data.budgets));
  }
  if ('alertThreshold' in data) {
    _setAlertThresholdFn(data.alertThreshold);
    _saveAlertFn(data.alertThreshold);
  }
  if (data.cats) _applyCatsFn(data.cats);
  if ('accountBalances' in data) {
    if (data.accountBalances && data.accountBalances.balances) {
      delete data.accountBalances.balances.peigo;
      delete data.accountBalances.balances.pacifico;
      if (data.accountBalances.balances.guayaquil === undefined) data.accountBalances.balances.guayaquil = 0;
    }
    const normBal = _normalizeAccountBalancesFn(data.accountBalances);
    _setAccountBalancesFn(normBal);
    _saveAccountBalancesFn(normBal, false);
  }
  if ('motorcycleMaintenance' in data) {
    const normMoto = _normalizeMotorcycleMaintenanceFn(data.motorcycleMaintenance);
    _setMotorcycleMaintenanceFn(normMoto);
    _saveMotorcycleMaintenanceFn(normMoto);
  }
  if ('creditCard' in data) {
    const normCc = _normalizeCreditCardFn(data.creditCard);
    _setCreditCardConfigFn(normCc);
    localStorage.setItem(CREDIT_CARD_KEY, JSON.stringify(normCc));
  }
  if ('tasks' in data && Array.isArray(data.tasks)) {
    _setTasksListFn(data.tasks);
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(data.tasks)); } catch (e) {}
  }
  if ('exams' in data && Array.isArray(data.exams)) {
    _setExamsListFn(data.exams);
    try { localStorage.setItem(EXAMS_KEY, JSON.stringify(data.exams)); } catch (e) {}
  }
  if ('defaultAccountId' in data) {
    let defId = data.defaultAccountId;
    if (defId === 'pacifico' || defId === 'peigo' || defId === 'unassigned' || !isKnownAccountId(defId)) {
      defId = 'guayaquil';
    }
    _saveDefaultAccountFn(defId, false);
  }
  _updateBadgesFn();
}

export async function pullFromSupabase(force = false) {
  if (!sbClient || !sbUser || _getGoalFormOpenFn()) return { ok: false, reason: 'no_auth_or_open' };
  if (supabasePullPromise) return supabasePullPromise;
  const targetClient = sbClient;
  const targetUserId = sbUser.id;
  if (!force && Date.now() - lastLocalMutationTime < 2500) return { ok: false, reason: 'debounce' };

  const currentPull = (async function() {
    try {
      const { data, error } = await targetClient
        .from('user_finance')
        .select('data, updated_at')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Error al obtener datos de Supabase:', error);
        return { ok: false, error };
      }

      if (
        targetClient !== sbClient ||
        !sbUser ||
        sbUser.id !== targetUserId ||
        _getGoalFormOpenFn() ||
        (!force && Date.now() - lastLocalMutationTime < 2500)
      ) return { ok: false, reason: 'aborted' };

      if (data && data.data && Object.keys(data.data).length > 0) {
        applyState(data.data);
        _renderFn();
        return { ok: true, data: data.data, updated_at: data.updated_at };
      } else {
        if (!force) {
          await pushToSupabase();
        }
        return { ok: true, empty: true };
      }
    } catch (err) {
      console.error('Excepción en pullFromSupabase:', err);
      return { ok: false, error: err };
    }
  })();

  supabasePullPromise = currentPull;
  try {
    return await currentPull;
  } catch (e) {
    console.warn('Fallo en pullFromSupabase:', e);
    return { ok: false, error: e };
  } finally {
    if (supabasePullPromise === currentPull) supabasePullPromise = null;
  }
}

export async function pushToSupabase() {
  if (!sbClient || !sbUser) return;
  if (isPushingToRemote) {
    needsAnotherPush = true;
    return;
  }
  const targetUserId = sbUser.id;
  isPushingToRemote = true;
  try {
    const currentState = collectState();
    const { error } = await sbClient
      .from('user_finance')
      .upsert({
        user_id: targetUserId,
        data: currentState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.warn('Error al guardar en Supabase:', error);
    }
  } catch (e) {
    console.warn('Fallo en pushToSupabase:', e);
  } finally {
    isPushingToRemote = false;
    if (needsAnotherPush) {
      needsAnotherPush = false;
      scheduleSyncPush();
    }
  }
}

export function scheduleSyncPush() {
  lastLocalMutationTime = Date.now();
  if (!sbClient) return;
  clearTimeout(supabaseDebounceTimer);
  supabaseDebounceTimer = setTimeout(pushToSupabase, 250);
}

export function subscribeToRealtime() {
  if (!sbClient || !sbUser || sbRealtimeChannel) return;
  const targetUserId = sbUser.id;

  sbRealtimeChannel = sbClient
    .channel('user_finance_realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_finance',
      filter: `user_id=eq.${targetUserId}`
    }, payload => {
      if (payload.new && payload.new.data && !isPushingToRemote && !_getGoalFormOpenFn()) {
        applyState(payload.new.data);
        _renderFn();
        const tab = _getCurrentActiveTabFn();
        if (tab === 'moto') _renderMotoDashboardFn();
        else if (tab === 'tasks') _renderTasksListFn(_getCurrentTaskFilterFn());
        else if (tab === 'uni') _renderExamsListFn();
      }
    })
    .subscribe();
}

export function openAuthModal() {
  const sbUrlInput = document.getElementById('sbUrlInput');
  const sbKeyInput = document.getElementById('sbKeyInput');
  const supabaseConfigView = document.getElementById('supabaseConfigView');
  const authModalOverlay = document.getElementById('authModalOverlay');
  if (sbUrlInput) sbUrlInput.value = sbUrl;
  if (sbKeyInput) sbKeyInput.value = sbAnonKey;
  if (!sbUrl || !sbAnonKey) {
    if (supabaseConfigView) supabaseConfigView.classList.remove('hidden');
  }
  if (authModalOverlay) authModalOverlay.classList.remove('hidden');
}

export function closeAuthModal() {
  const authModalOverlay = document.getElementById('authModalOverlay');
  const authMsg = document.getElementById('authMsg');
  if (authModalOverlay) authModalOverlay.classList.add('hidden');
  if (authMsg) authMsg.textContent = '';
}

export function setupSupabaseUi() {
  let authMode = 'login';
  const authModalOverlay = document.getElementById('authModalOverlay');
  const authBtn = document.getElementById('authBtn');
  const authModalClose = document.getElementById('authModalClose');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const authForm = document.getElementById('authForm');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authMsg = document.getElementById('authMsg');
  const toggleConfigBtn = document.getElementById('toggleConfigBtn');
  const supabaseConfigView = document.getElementById('supabaseConfigView');
  const saveSbConfigBtn = document.getElementById('saveSbConfigBtn');
  const cancelSbConfigBtn = document.getElementById('cancelSbConfigBtn');
  const sbUrlInput = document.getElementById('sbUrlInput');
  const sbKeyInput = document.getElementById('sbKeyInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const forceSyncBtn = document.getElementById('forceSyncBtn');

  if (authBtn) authBtn.addEventListener('click', openAuthModal);
  if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);
  if (authModalOverlay) authModalOverlay.addEventListener('click', e => { if (e.target === authModalOverlay) closeAuthModal(); });

  if (tabLogin) tabLogin.addEventListener('click', () => {
    authMode = 'login';
    tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (authSubmitBtn) authSubmitBtn.textContent = 'Entrar';
    if (authMsg) authMsg.textContent = '';
  });
  if (tabSignup) tabSignup.addEventListener('click', () => {
    authMode = 'signup';
    tabSignup.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    if (authSubmitBtn) authSubmitBtn.textContent = 'Registrarse';
    if (authMsg) authMsg.textContent = '';
  });

  if (toggleConfigBtn) toggleConfigBtn.addEventListener('click', () => {
    if (supabaseConfigView) supabaseConfigView.classList.toggle('hidden');
  });
  if (cancelSbConfigBtn) cancelSbConfigBtn.addEventListener('click', () => {
    if (supabaseConfigView) supabaseConfigView.classList.add('hidden');
  });
  if (saveSbConfigBtn) saveSbConfigBtn.addEventListener('click', () => {
    const newUrl = cleanSupabaseUrl(sbUrlInput.value.trim());
    const newKey = sbKeyInput.value.trim();
    if (!newUrl || !newKey) {
      alert('Por favor ingresa tanto la URL como la Anon Key de Supabase');
      return;
    }
    sbUrl = newUrl;
    sbAnonKey = newKey;
    localStorage.setItem(SB_URL_KEY, sbUrl);
    localStorage.setItem(SB_KEY_KEY, sbAnonKey);
    initSupabase();
    if (supabaseConfigView) supabaseConfigView.classList.add('hidden');
    showToast('Credenciales de Supabase guardadas ✓');
  });

  const settingsSyncNowBtn = document.getElementById('settingsSyncNowBtn');
  const settingsAccountBtn = document.getElementById('settingsAccountBtn');

  if (settingsSyncNowBtn) {
    settingsSyncNowBtn.addEventListener('click', async () => {
      const res = await pullFromSupabase(true);
      if (res && res.ok) {
        if (res.empty) showToast('Conectado a la nube (sin datos guardados)');
        else showToast('Sincronización completada ✓');
      } else if (res && res.error) {
        showToast('Error de Supabase: ' + (res.error.message || ''));
      } else {
        showToast('No se pudo conectar con la nube');
      }
    });
  }
  if (settingsAccountBtn) {
    settingsAccountBtn.addEventListener('click', () => {
      document.getElementById('settingsPanel')?.classList.add('hidden');
      openAuthModal();
    });
  }

  if (authForm) authForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!sbClient) {
      if (authMsg) {
        authMsg.className = 'auth-msg error';
        authMsg.textContent = 'Primero debes configurar tus credenciales de Supabase abajo.';
      }
      if (supabaseConfigView) supabaseConfigView.classList.remove('hidden');
      return;
    }
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return;

    if (authSubmitBtn) authSubmitBtn.disabled = true;
    if (authMsg) {
      authMsg.className = 'auth-msg';
      authMsg.textContent = 'Procesando...';
    }

    try {
      if (authMode === 'login') {
        const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (authMsg) {
          authMsg.className = 'auth-msg ok';
          authMsg.textContent = '¡Sesión iniciada con éxito!';
        }
        setTimeout(() => closeAuthModal(), 800);
      } else {
        const { data, error } = await sbClient.auth.signUp({ email, password });
        if (error) throw error;
        if (authMsg) {
          authMsg.className = 'auth-msg ok';
          authMsg.textContent = '¡Cuenta creada! ' + (data.session ? 'Iniciando sesión...' : 'Revisa tu correo de confirmación.');
        }
        if (data.session) setTimeout(() => closeAuthModal(), 800);
      }
    } catch (err) {
      if (authMsg) {
        authMsg.className = 'auth-msg error';
        authMsg.textContent = err.message || 'Error de autenticación';
      }
    } finally {
      if (authSubmitBtn) authSubmitBtn.disabled = false;
    }
  });

  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    if (sbClient) {
      await sbClient.auth.signOut();
      handleAuthState(null);
      closeAuthModal();
      showToast('Sesión cerrada');
    }
  });

  if (forceSyncBtn) forceSyncBtn.addEventListener('click', async () => {
    forceSyncBtn.disabled = true;
    forceSyncBtn.textContent = 'Descargando...';
    try {
      const res = await pullFromSupabase(true);
      if (res && res.ok) {
        if (res.empty) {
          showToast(`Conectado como ${sbUser?.email || ''} (sin datos guardados en la nube)`);
        } else {
          const txCount = res.data && res.data.tx ? res.data.tx.length : 0;
          showToast(`Sincronizado: ${txCount} movimientos cargados ✓`);
        }
      } else if (res && res.error) {
        showToast('Error: ' + (res.error.message || JSON.stringify(res.error)));
      } else {
        showToast('No se pudo descargar datos de la nube');
      }
    } finally {
      forceSyncBtn.disabled = false;
      forceSyncBtn.textContent = 'Sincronizar ahora';
    }
  });

  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') pullFromSupabase();
    });
    window.addEventListener('focus', function() { pullFromSupabase(); });
    window.addEventListener('pageshow', function() { pullFromSupabase(); });
    window.addEventListener('online', function() { queueSupabaseRefresh(0, 2); });
  }
}
