// Alejo OS · Application Entry Point
import './styles/main.css';

import { runInitialMigrations } from './core/state.js';
import {
  dateKey,
  monthKey,
  monthKeyFromDate,
  escapeHtml,
  showToast,
  fmt,
  accountNameById,
  normalizeAccountId,
  isKnownAccountId
} from './core/utils.js';

import {
  budgets,
  getBudgets,
  setBudgets,
  saveBudgets,
  getBudgetsForMonth,
  setBudgetsForMonth,
  alertThreshold,
  getAlertThreshold,
  setAlertThreshold,
  saveAlert,
  registerBudgetsSync
} from './modules/finance/budgets.js';

import {
  creditCardConfig,
  getCreditCardConfig,
  setCreditCardConfig,
  saveCreditCard,
  calculateCreditCardDebt,
  renderCreditCardPanel,
  setupCreditCardEventListeners,
  registerCreditCardDeps
} from './modules/finance/credit-card.js';

import {
  accountBalances,
  getAccountBalances,
  setAccountBalances,
  saveAccountBalances,
  defaultAccountId,
  getDefaultAccountId,
  setDefaultAccountId,
  saveDefaultAccount,
  getAccountTotals,
  getCurrentAccountTotals,
  renderAccounts,
  renderAccountSettings,
  registerAccountsDeps
} from './modules/finance/accounts.js';

import {
  tx,
  getTx,
  setTx,
  saveTx,
  deletedTxIds,
  catsData,
  CATS,
  CAT_COLOR,
  applyCats,
  saveCats,
  renderCatOptions,
  renderCatMgmt,
  normalizeTxList,
  deleteTx,
  editTx,
  txLabel,
  txSearchText,
  txRowHtml,
  renderAllList,
  openEntryModal,
  closeEntryModal,
  setupTransactionEventListeners,
  registerTransactionsDeps,
  txTypeFilter,
  txSearch
} from './modules/finance/transactions.js';

import {
  goals,
  getGoals,
  setGoals,
  saveGoals,
  goalHistory,
  getGoalHistory,
  setGoalHistory,
  saveGoalHistory,
  goalNameById,
  goalProgress,
  renderGoals,
  showGoalForm,
  renderGoalHistory,
  updateGoalFieldOptions,
  goalFormOpen,
  registerGoalsDeps
} from './modules/finance/goals.js';

import {
  motorcycleMaintenance,
  getMotorcycleMaintenance,
  setMotorcycleMaintenance,
  saveMotorcycleMaintenance,
  deletedFuelLogIds,
  deletedServiceIds,
  renderMotorcycleMaintenance,
  renderMotoDashboard,
  openFuelModal,
  closeFuelModal,
  openServiceModal,
  closeServiceModal,
  deleteFuelLog,
  deleteMotoService,
  registerMotoDeps
} from './modules/moto/moto.js';

import {
  tasksList,
  getTasksList,
  setTasksList,
  saveTasksList,
  examsList,
  getExamsList,
  setExamsList,
  saveExamsList,
  deletedTaskIds,
  deletedExamIds,
  currentTaskFilter,
  renderTasksList,
  toggleTaskDone,
  deleteTask,
  openTaskModal,
  closeTaskModal,
  renderExamsList,
  toggleExamComplete,
  deleteExam,
  openExamModal,
  closeExamModal,
  updateBadges,
  setupNotifications,
  checkAndSendReminders,
  registerUniversityDeps,
  loadLifeOsData
} from './modules/university/university.js';

import {
  getMonthlySeries,
  getFlowSeries,
  drawDonut,
  drawFlowChart,
  drawBudgetChart,
  drawProjectionChart,
  renderBalance,
  registerChartsDeps
} from './modules/charts/charts.js';

import {
  initPdfExport,
  registerPdfDeps
} from './modules/reports/pdf.js';

import {
  initSupabase,
  scheduleSyncPush,
  setupSupabaseUi,
  registerSupabaseDeps
} from './core/supabase.js';

import {
  render,
  renderAnalysis,
  renderInsights,
  refreshAnalysisVisibility,
  registerRenderDeps
} from './modules/render.js';

// Application State
let cursor = new Date();
cursor.setDate(1);
let currentActiveTab = 'finance';

// Wire up dependencies between modules
registerBudgetsSync(scheduleSyncPush);

registerCreditCardDeps({
  syncPush: scheduleSyncPush,
  getTx,
  getCurrentAccountTotals,
  render
});

registerAccountsDeps({
  syncPush: scheduleSyncPush,
  getTx,
  setTx,
  saveTx,
  calculateCreditCardDebt,
  getCreditCardConfig,
  render,
  getCursor: () => cursor
});

registerTransactionsDeps({
  syncPush: scheduleSyncPush,
  getDefaultAccountId,
  goalNameById,
  updateGoalFieldOptions,
  render,
  getCursor: () => cursor,
  openFuelModal,
  openTaskModal,
  openExamModal,
  getCurrentActiveTab: () => currentActiveTab
});

registerGoalsDeps({
  syncPush: scheduleSyncPush,
  getTx,
  render,
  openEntryModal
});

registerMotoDeps({
  syncPush: scheduleSyncPush,
  renderCreditCardPanel
});

registerUniversityDeps({
  syncPush: scheduleSyncPush,
  calculateCreditCardDebt,
  getCreditCardConfig
});

registerChartsDeps({
  getTx,
  getGoals,
  goalProgress,
  getCats: () => CATS,
  getCatColor: () => CAT_COLOR,
  getCursor: () => cursor
});

registerPdfDeps({
  getTx,
  getAccountBalances,
  getGoals,
  goalProgress,
  getBudgetsForMonth,
  getAccountTotals
});

registerSupabaseDeps({
  getTx,
  setTx,
  getGoals,
  setGoals,
  getGoalHistory,
  setGoalHistory,
  getBudgets,
  setBudgets,
  getAlertThreshold,
  setAlertThreshold,
  getCatsData: () => catsData,
  applyCats,
  getAccountBalances,
  setAccountBalances,
  saveAccountBalances,
  getDefaultAccountId,
  saveDefaultAccount,
  getMotorcycleMaintenance,
  setMotorcycleMaintenance,
  saveMotorcycleMaintenance,
  getCreditCardConfig,
  setCreditCardConfig,
  getTasksList,
  setTasksList,
  getExamsList,
  setExamsList,
  getDeletedTxIds: () => deletedTxIds,
  getDeletedTaskIds: () => deletedTaskIds,
  getDeletedExamIds: () => deletedExamIds,
  getDeletedFuelLogIds: () => deletedFuelLogIds,
  getDeletedServiceIds: () => deletedServiceIds,
  getGoalFormOpen: () => goalFormOpen,
  getCurrentActiveTab: () => currentActiveTab,
  getCurrentTaskFilter: () => currentTaskFilter,
  render,
  renderMotoDashboard,
  renderTasksList,
  renderExamsList,
  updateBadges,
  normalizeTxList,
  normalizeAccountBalances,
  normalizeMotorcycleMaintenance,
  normalizeCreditCard: c => c,
  saveAlert
});

registerRenderDeps({
  getCursor: () => cursor,
  getTx,
  getCats: () => CATS,
  getCatColor: () => CAT_COLOR,
  getGoals,
  goalProgress,
  getBudgetsForMonth,
  getCurrentAccountTotals,
  getAlertThreshold,
  getCurrentActiveTab: () => currentActiveTab,
  getMonthlySeries,
  getFlowSeries,
  renderAccounts,
  renderCreditCardPanel,
  renderMotorcycleMaintenance,
  renderBudgetForm: () => {},
  renderGoals,
  renderBalance,
  drawDonut,
  drawFlowChart,
  drawBudgetChart,
  drawProjectionChart,
  deleteTx,
  editTx,
  txSearchText,
  txRowHtml,
  getTxTypeFilter: () => txTypeFilter,
  getTxSearch: () => txSearch
});

// Expose functions required by inline HTML event handlers
window.switchTab = function(tabName) {
  if (currentActiveTab === tabName) return;
  currentActiveTab = tabName;

  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle) {
    if (tabName === 'finance') heroSubtitle.textContent = 'Resumen financiero';
    else if (tabName === 'moto') heroSubtitle.textContent = 'Mi Garaje & Moto';
    else if (tabName === 'tasks') heroSubtitle.textContent = 'Centro de Tareas';
    else if (tabName === 'uni') heroSubtitle.textContent = 'Control Académico';
  }

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.bottom-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetId = tabName === 'finance' ? 'tabViewFinance' :
                   tabName === 'moto' ? 'tabViewMoto' :
                   tabName === 'tasks' ? 'tabViewTasks' : 'tabViewUni';
  const targetView = document.getElementById(targetId);
  if (targetView) targetView.classList.add('active');

  if (tabName === 'finance') render();
  else if (tabName === 'moto') renderMotoDashboard();
  else if (tabName === 'tasks') renderTasksList(currentTaskFilter);
  else if (tabName === 'uni') renderExamsList();

  updateBadges();
  try { window.scrollTo(0, 0); } catch (e) {}
};

window.deleteExam = deleteExam;
window.deleteFuelLog = deleteFuelLog;
window.deleteMotoService = deleteMotoService;
window.deleteTask = deleteTask;
window.openExamModal = openExamModal;
window.openTaskModal = openTaskModal;
window.toggleExamComplete = toggleExamComplete;
window.toggleTaskDone = toggleTaskDone;

// Setup Profile Avatar
function setupAvatar() {
  const AVATAR_KEY = 'mcf_avatar_v1';
  const avatarBtn = document.getElementById('avatarBtn');
  const avatarRemoveBtn = document.getElementById('avatarRemoveBtn');
  const avatarInput = document.getElementById('avatarInput');

  function renderAvatar() {
    const photo = localStorage.getItem(AVATAR_KEY);
    if (photo) {
      if (avatarBtn) avatarBtn.innerHTML = `<img src="${photo}" alt="Foto de perfil">`;
      if (avatarRemoveBtn) avatarRemoveBtn.classList.add('has-photo');
    } else {
      if (avatarBtn) avatarBtn.textContent = 'AS';
      if (avatarRemoveBtn) avatarRemoveBtn.classList.remove('has-photo');
    }
  }
  renderAvatar();

  if (avatarBtn && avatarInput) {
    avatarBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const size = 200;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            localStorage.setItem(AVATAR_KEY, dataUrl);
            renderAvatar();
          } catch (err) {
            alert('No se pudo guardar la foto (puede ser muy pesada).');
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      avatarInput.value = '';
    });
  }
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener('click', e => {
      e.stopPropagation();
      localStorage.removeItem(AVATAR_KEY);
      renderAvatar();
    });
  }
}

// Setup Settings, Export & Import Backups
function setupSettingsAndBackups() {
  document.getElementById('gearBtn')?.addEventListener('click', () => {
    const p = document.getElementById('settingsPanel');
    if (!p) return;
    if (p.classList.contains('hidden')) {
      const alertInput = document.getElementById('alertInput');
      if (alertInput) alertInput.value = alertThreshold || '';
      renderAccountSettings();
      renderCatMgmt();
    }
    p.classList.toggle('hidden');
  });

  document.getElementById('saveAlertBtn')?.addEventListener('click', () => {
    const alertInput = document.getElementById('alertInput');
    const v = alertInput ? parseFloat(alertInput.value) : null;
    const newThresh = (v && v > 0) ? v : null;
    setAlertThreshold(newThresh);
    saveAlert(newThresh);
    document.getElementById('settingsPanel')?.classList.add('hidden');
    render();
  });

  document.getElementById('clearAlertBtn')?.addEventListener('click', () => {
    setAlertThreshold(null);
    saveAlert(null);
    const alertInput = document.getElementById('alertInput');
    if (alertInput) alertInput.value = '';
    document.getElementById('settingsPanel')?.classList.add('hidden');
    render();
  });

  // Export JSON Backup
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const backupData = {
      tx: getTx(),
      goals: getGoals(),
      goalHistory: getGoalHistory(),
      budgets: getBudgets(),
      alertThreshold: getAlertThreshold(),
      defaultAccountId: getDefaultAccountId(),
      accountBalances: getAccountBalances(),
      motorcycleMaintenance: getMotorcycleMaintenance(),
      cats: catsData
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'respaldo-finanzas-' + dateKey(new Date()) + '.json'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile')?.click());
  document.getElementById('importFile')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported.tx) { setTx(imported.tx); saveTx(getTx()); }
        if (imported.goals) { setGoals(imported.goals); saveGoals(getGoals()); }
        if (imported.goalHistory) { setGoalHistory(imported.goalHistory); saveGoalHistory(getGoalHistory()); }
        if (imported.budgets) { setBudgets(imported.budgets); saveBudgets(getBudgets()); }
        if ('alertThreshold' in imported) { setAlertThreshold(imported.alertThreshold); saveAlert(imported.alertThreshold); }
        if (imported.cats) applyCats(imported.cats);
        if ('accountBalances' in imported) {
          setAccountBalances(imported.accountBalances);
          saveAccountBalances(getAccountBalances());
        }
        if ('motorcycleMaintenance' in imported) {
          setMotorcycleMaintenance(imported.motorcycleMaintenance);
          saveMotorcycleMaintenance(getMotorcycleMaintenance());
        }
        if ('defaultAccountId' in imported && isKnownAccountId(imported.defaultAccountId)) {
          setDefaultAccountId(imported.defaultAccountId);
          saveDefaultAccount(getDefaultAccountId());
        }
        render();
        alert('Respaldo importado correctamente.');
      } catch (err) {
        alert('El archivo no es un respaldo válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Export CSV
  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    const currentTx = getTx();
    if (currentTx.length === 0) { showToast('Todavía no tienes movimientos para exportar'); return; }
    const sorted = [...currentTx].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const header = ['Fecha', 'Cuenta', 'Destino', 'Tipo', 'Categoría', 'Nota / Meta', 'Monto'];
    const rows = sorted.map(t => {
      const tipo = t.type === 'income' ? 'Ingreso' : (t.type === 'expense' ? 'Gasto' : (t.type === 'saving' ? 'Ahorro' : 'Retiro a efectivo'));
      const destino = t.type === 'withdrawal' ? 'Efectivo' : '';
      const cat = t.type === 'expense' ? (t.cat || '') : '';
      const desc = t.note || (t.type === 'saving' ? goalNameById(t.goalId) : '');
      const monto = (t.type === 'income' || t.type === 'withdrawal' ? t.amt : -t.amt).toFixed(2);
      return [t.date, accountNameById(t.account), destino, tipo, cat, desc, monto].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'movimientos-finanzas-' + dateKey(new Date()) + '.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado');
  });
}

// Setup Moto & LifeOS Modals & Forms
function setupLifeOsEvents() {
  document.getElementById('fuelModalOverlay')?.addEventListener('click', function(e) { if (e.target === this) closeFuelModal(); });
  document.getElementById('serviceModalOverlay')?.addEventListener('click', function(e) { if (e.target === this) closeServiceModal(); });
  document.getElementById('taskModalOverlay')?.addEventListener('click', function(e) { if (e.target === this) closeTaskModal(); });
  document.getElementById('examModalOverlay')?.addEventListener('click', function(e) { if (e.target === this) closeExamModal(); });

  document.getElementById('fuelModalClose')?.addEventListener('click', closeFuelModal);
  document.getElementById('fuelModalCancel')?.addEventListener('click', closeFuelModal);
  document.getElementById('openFuelModalBtn')?.addEventListener('click', openFuelModal);
  document.getElementById('quickFuelBtn')?.addEventListener('click', openFuelModal);

  document.getElementById('fuelForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const date = document.getElementById('fuelDate').value;
    const mileage = parseInt(document.getElementById('fuelMileage').value, 10);
    const cost = parseFloat(document.getElementById('fuelCost').value);
    const note = document.getElementById('fuelNote').value.trim();
    const syncExpense = document.getElementById('fuelSyncExpense')?.checked;

    if (!date || isNaN(mileage) || isNaN(cost)) return;
    const moto = getMotorcycleMaintenance() || { lastDate: date, lastMileage: mileage, fuelLogs: [], serviceHistory: [] };
    if (!moto.fuelLogs) moto.fuelLogs = [];
    moto.fuelLogs.unshift({ id: Date.now(), date, mileage, cost, note });

    if (mileage > (moto.lastMileage || 0)) {
      moto.lastMileage = mileage;
      moto.lastDate = date;
    }
    saveMotorcycleMaintenance(moto);

    if (syncExpense) {
      const currentTx = getTx();
      currentTx.push({
        id: Date.now() + 1,
        type: 'expense',
        cat: 'Moto',
        amt: cost,
        date,
        note: note ? ('Gasolina · ' + note) : 'Gasolina',
        account: 'deuna',
        goalId: null
      });
      saveTx(currentTx);
    }

    closeFuelModal();
    renderMotoDashboard();
    showToast('Tanqueada registrada con éxito ✓');
  });

  document.getElementById('serviceModalClose')?.addEventListener('click', closeServiceModal);
  document.getElementById('serviceModalCancel')?.addEventListener('click', closeServiceModal);
  document.getElementById('openServiceModalBtn')?.addEventListener('click', openServiceModal);
  document.getElementById('quickServiceBtn')?.addEventListener('click', openServiceModal);

  document.getElementById('serviceForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const date = document.getElementById('serviceDate').value;
    const type = document.getElementById('serviceType').value.trim();
    const mileage = parseInt(document.getElementById('serviceMileage').value, 10) || null;
    const cost = parseFloat(document.getElementById('serviceCost').value) || 0;
    const note = document.getElementById('serviceNote').value.trim();

    if (!date || !type) return;
    const moto = getMotorcycleMaintenance() || { lastDate: date, lastMileage: 21953, fuelLogs: [], serviceHistory: [] };
    if (!moto.serviceHistory) moto.serviceHistory = [];
    moto.serviceHistory.unshift({ id: Date.now(), date, type, mileage, cost, note });
    saveMotorcycleMaintenance(moto);

    closeServiceModal();
    renderMotoDashboard();
    showToast('Servicio registrado ✓');
  });

  document.getElementById('openTaskModalBtn')?.addEventListener('click', () => openTaskModal(null));
  document.getElementById('taskModalClose')?.addEventListener('click', closeTaskModal);
  document.getElementById('taskModalCancel')?.addEventListener('click', closeTaskModal);

  document.getElementById('taskForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const title = document.getElementById('taskInputTitle').value.trim();
    const dueDate = document.getElementById('taskInputDueDate').value || null;
    const priority = document.getElementById('taskInputPriority').value;
    if (!title) return;

    const list = getTasksList();
    const editId = window._editingTaskId;
    if (editId) {
      const idx = list.findIndex(t => t.id === editId);
      if (idx > -1) list[idx] = { ...list[idx], title, dueDate, priority };
      window._editingTaskId = null;
    } else {
      list.unshift({ id: Date.now(), title, dueDate, priority, done: false, createdAt: dateKey(new Date()) });
    }
    saveTasksList();
    closeTaskModal();
    renderTasksList(currentTaskFilter);
    showToast('Tarea guardada ✓');
  });

  document.getElementById('taskQuickAddForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('taskQuickTitle');
    const title = input ? input.value.trim() : '';
    if (!title) return;
    const list = getTasksList();
    list.unshift({ id: Date.now(), title, dueDate: null, priority: 'normal', done: false, createdAt: dateKey(new Date()) });
    input.value = '';
    saveTasksList();
    renderTasksList(currentTaskFilter);
    showToast('Tarea añadida ✓');
  });

  document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => renderTasksList(btn.getAttribute('data-filter')));
  });

  document.getElementById('examModalClose')?.addEventListener('click', closeExamModal);
  document.getElementById('examModalCancel')?.addEventListener('click', closeExamModal);
  document.getElementById('openExamModalBtn')?.addEventListener('click', () => openExamModal(null));

  document.getElementById('examForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const subject = document.getElementById('examSubject').value.trim();
    const type = document.getElementById('examType').value;
    const title = document.getElementById('examTitleInput').value.trim();
    const date = document.getElementById('examDate').value;
    const time = document.getElementById('examTime').value || null;
    const note = document.getElementById('examNote').value.trim() || null;

    if (!subject || !title || !date) return;
    const list = getExamsList();
    list.unshift({ id: Date.now(), subject, type, title, date, time, note, completed: false, grade: null });
    saveExamsList();
    closeExamModal();
    renderExamsList();
    showToast('Evaluación guardada ✓');
  });
}

// Service Worker Registration
function registerPwa() {
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing && performance.now() < 2000) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker PWA activo:', reg.scope);
        })
        .catch(err => console.log('Service Worker info:', err));
    });
  }
}

// Master Initialization
async function init() {
  runInitialMigrations();
  loadLifeOsData();
  setupAvatar();
  setupSettingsAndBackups();
  setupCreditCardEventListeners();
  setupTransactionEventListeners();
  setupLifeOsEvents();
  setupNotifications();
  setupSupabaseUi();
  initSupabase();
  initPdfExport();
  registerPwa();

  // Mobile gesture protection
  document.addEventListener('gesturestart', e => { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', e => { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', e => { e.preventDefault(); }, { passive: false });

  // Greeting
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = `${saludo}, Alejandro 👋`;

  // Quick Amount Buttons
  const amtQuick = document.getElementById('amtQuick');
  if (amtQuick) {
    amtQuick.innerHTML = [2, 5, 10, 20, 50].map(v => `<button type="button" data-v="${v}">$${v}</button>`).join('');
    amtQuick.addEventListener('click', e => {
      const fAmt = document.getElementById('fAmt');
      if (e.target.dataset.v && fAmt) fAmt.value = e.target.dataset.v;
    });
  }

  // Initial render
  render();
  updateBadges();
  checkAndSendReminders(false);
}

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
