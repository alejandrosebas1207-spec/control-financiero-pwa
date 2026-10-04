// Alejo OS · University & Tasks Module
import {
  TASKS_KEY,
  EXAMS_KEY,
  DELETED_TASK_KEY,
  DELETED_EXAM_KEY,
  SEED_DATA
} from '../../core/constants.js';
import { escapeHtml, dateKey, fmt, showToast } from '../../core/utils.js';

let _syncPushFn = () => {};
let _calculateCreditCardDebtFn = () => 0;
let _getCreditCardConfigFn = () => ({ cutOffDay: 24, paymentDueDay: 8 });

export function registerUniversityDeps(deps) {
  if (deps.syncPush) _syncPushFn = deps.syncPush;
  if (deps.calculateCreditCardDebt) _calculateCreditCardDebtFn = deps.calculateCreditCardDebt;
  if (deps.getCreditCardConfig) _getCreditCardConfigFn = deps.getCreditCardConfig;
}

export let tasksList = [];
export let examsList = [];
export let currentTaskFilter = 'all';
export let editingTaskId = null;
export let editingExamId = null;

export let deletedTaskIds = new Set();
export let deletedExamIds = new Set();
try {
  const _sTask = localStorage.getItem(DELETED_TASK_KEY);
  if (_sTask) deletedTaskIds = new Set(JSON.parse(_sTask));
  const _sExam = localStorage.getItem(DELETED_EXAM_KEY);
  if (_sExam) deletedExamIds = new Set(JSON.parse(_sExam));
} catch (e) {}

export function loadLifeOsData() {
  try {
    const sTasks = localStorage.getItem(TASKS_KEY);
    if (sTasks) tasksList = JSON.parse(sTasks);
    else if (typeof SEED_DATA !== 'undefined' && SEED_DATA && SEED_DATA.tasks) tasksList = SEED_DATA.tasks;
  } catch (e) {
    tasksList = [];
  }

  try {
    const sExams = localStorage.getItem(EXAMS_KEY);
    if (sExams) examsList = JSON.parse(sExams);
    else if (typeof SEED_DATA !== 'undefined' && SEED_DATA && SEED_DATA.exams) examsList = SEED_DATA.exams;
  } catch (e) {
    examsList = [];
  }
}

export const getTasksList = () => tasksList;
export const setTasksList = val => { tasksList = Array.isArray(val) ? val : []; };

export const getExamsList = () => examsList;
export const setExamsList = val => { examsList = Array.isArray(val) ? val : []; };

export function saveTasksList(shouldSync = true) {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasksList)); } catch (e) {}
  updateBadges();
  if (shouldSync) _syncPushFn();
}

export function saveExamsList(shouldSync = true) {
  try { localStorage.setItem(EXAMS_KEY, JSON.stringify(examsList)); } catch (e) {}
  updateBadges();
  if (shouldSync) _syncPushFn();
}

export function updateBadges() {
  const pendingTasks = (tasksList || []).filter(t => !t.done).length;
  const taskBadge = document.getElementById('taskBadge');
  const taskBadgeMobile = document.getElementById('taskBadgeMobile');
  if (taskBadge) {
    taskBadge.textContent = pendingTasks;
    taskBadge.classList.toggle('hidden', pendingTasks === 0);
  }
  if (taskBadgeMobile) {
    taskBadgeMobile.textContent = pendingTasks;
    taskBadgeMobile.classList.toggle('hidden', pendingTasks === 0);
  }

  const upcomingExams = (examsList || []).filter(e => !e.completed).length;
  const examBadge = document.getElementById('examBadge');
  const examBadgeMobile = document.getElementById('examBadgeMobile');
  if (examBadge) {
    examBadge.textContent = upcomingExams;
    examBadge.classList.toggle('hidden', upcomingExams === 0);
  }
  if (examBadgeMobile) {
    examBadgeMobile.textContent = upcomingExams;
    examBadgeMobile.classList.toggle('hidden', upcomingExams === 0);
  }
}

export function renderTaskCard(t) {
  const isDue = t.dueDate ? new Date(t.dueDate + 'T00:00:00') : null;
  let dueClass = '';
  let dueLabel = '';
  if (isDue) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDays = Math.round((isDue - today) / (1000 * 60 * 60 * 24));
    if (dueDays < 0) { dueClass = 'overdue'; dueLabel = '⚠️ Vencida hace ' + Math.abs(dueDays) + 'd'; }
    else if (dueDays === 0) { dueClass = 'today'; dueLabel = '⏰ Hoy'; }
    else if (dueDays === 1) { dueClass = 'today'; dueLabel = 'Mañana'; }
    else { dueLabel = '📅 ' + isDue.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); }
  }

  const prioClass = t.priority || 'normal';

  return `
    <div class="task-card ${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="task-check" onclick="toggleTaskDone(${t.id})" title="${t.done ? 'Marcar como pendiente' : 'Marcar como completada'}">
        ${t.done ? '✓' : ''}
      </button>
      <div class="task-content" onclick="toggleTaskDone(${t.id})" style="cursor:pointer;">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          <span class="task-priority-dot ${prioClass}"></span>
          ${dueLabel ? `<span class="task-due ${dueClass}">${dueLabel}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="link-btn" onclick="openTaskModal(${t.id})" style="font-size:11px;">Editar</button>
        <button class="del-x" onclick="deleteTask(${t.id})" title="Eliminar">&times;</button>
      </div>
    </div>
  `;
}

export function renderTasksList(filter = 'all') {
  currentTaskFilter = filter;
  const container = document.getElementById('taskListContainer');
  const subtitle = document.getElementById('taskSubtitle');
  if (!container) return;

  document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });

  const total = tasksList.length;
  const doneCount = tasksList.filter(t => t.done).length;
  const pendingCount = total - doneCount;

  if (subtitle) {
    subtitle.textContent = pendingCount + ' pendiente' + (pendingCount !== 1 ? 's' : '');
  }

  let filtered = tasksList;
  if (filter === 'pending') filtered = tasksList.filter(t => !t.done);
  if (filter === 'done') filtered = tasksList.filter(t => t.done);

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:28px 12px; color:var(--text-soft); font-size:13px;">
      ${filter === 'done' ? 'No tienes tareas completadas aún.' : (filter === 'pending' ? '🎉 ¡Estás al día! No tienes tareas pendientes.' : 'No tienes tareas creadas. Escribe una arriba o toca el botón +.')}
    </div>`;
    return;
  }

  if (filter === 'all') {
    const todayKey = dateKey(new Date());
    const urgentTasks = filtered.filter(t => !t.done && ((t.dueDate && t.dueDate <= todayKey) || t.priority === 'high'));
    const normalTasks = filtered.filter(t => !t.done && (!t.dueDate || t.dueDate > todayKey) && t.priority !== 'high');
    const completedTasks = filtered.filter(t => t.done);

    const htmlParts = [];
    if (urgentTasks.length > 0) {
      htmlParts.push('<div class="task-group-title">🔥 Hoy / Prioritarias</div>' + urgentTasks.map(renderTaskCard).join(''));
    }
    if (normalTasks.length > 0) {
      htmlParts.push('<div class="task-group-title">📋 Próximas</div>' + normalTasks.map(renderTaskCard).join(''));
    }
    if (completedTasks.length > 0) {
      htmlParts.push('<div class="task-group-title">✓ Completadas</div>' + completedTasks.map(renderTaskCard).join(''));
    }
    container.innerHTML = htmlParts.join('');
  } else {
    container.innerHTML = filtered.map(renderTaskCard).join('');
  }
}

export function toggleTaskDone(id) {
  const t = tasksList.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasksList();
  renderTasksList(currentTaskFilter);
}

export function deleteTask(id) {
  const idx = tasksList.findIndex(x => x.id === id);
  if (idx === -1) return;
  const removed = tasksList[idx];
  const card = document.querySelector(`.task-card[data-id="${id}"]`);

  deletedTaskIds.add(id);
  try { localStorage.setItem(DELETED_TASK_KEY, JSON.stringify([...deletedTaskIds])); } catch (e) {}

  const finalizeDelete = () => {
    tasksList.splice(idx, 1);
    saveTasksList();
    renderTasksList(currentTaskFilter);
    showToast('Tarea eliminada');
  };

  if (card) {
    card.classList.add('is-deleting');
    setTimeout(finalizeDelete, 220);
  } else {
    finalizeDelete();
  }
}

export function openTaskModal(idOrNull) {
  const overlay = document.getElementById('taskModalOverlay');
  const titleEl = document.getElementById('taskModalTitle');
  if (!overlay) return;

  if (idOrNull !== null && idOrNull !== undefined) {
    const t = tasksList.find(x => x.id === idOrNull);
    if (t) {
      editingTaskId = t.id;
      if (titleEl) titleEl.textContent = 'Editar Tarea';
      document.getElementById('taskInputTitle').value = t.title;
      document.getElementById('taskInputDueDate').value = t.dueDate || '';
      document.getElementById('taskInputPriority').value = t.priority || 'normal';
    }
  } else {
    editingTaskId = null;
    if (titleEl) titleEl.textContent = '📋 Nueva Tarea';
    document.getElementById('taskInputTitle').value = '';
    document.getElementById('taskInputDueDate').value = '';
    document.getElementById('taskInputPriority').value = 'normal';
  }
  overlay.classList.remove('hidden');
  if (window.innerWidth > 768 && !('ontouchstart' in window)) {
    document.getElementById('taskInputTitle')?.focus();
  }
}

export function closeTaskModal() {
  const overlay = document.getElementById('taskModalOverlay');
  if (overlay) overlay.classList.add('hidden');
  editingTaskId = null;
}

export function renderExamsList() {
  const container = document.getElementById('examGridContainer');
  const subtitle = document.getElementById('uniSubtitle');
  if (!container) return;

  const upcoming = examsList.filter(e => !e.completed).length;
  if (subtitle) {
    subtitle.textContent = upcoming + ' evaluación' + (upcoming !== 1 ? 'es' : '') + ' próxima' + (upcoming !== 1 ? 's' : '');
  }

  if (examsList.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:36px 12px; color:var(--text-soft); font-size:13px;">
      No tienes exámenes ni tareas registradas. Toca "+ Nuevo examen o entrega" para comenzar.
    </div>`;
    return;
  }

  const sorted = examsList.slice().sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.date.localeCompare(b.date);
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  container.innerHTML = sorted.map(e => {
    const examDate = new Date(e.date + 'T00:00:00');
    const diffDays = Math.round((examDate - today) / (1000 * 60 * 60 * 24));
    
    let countdownLabel = '';
    let countdownClass = 'normal';
    let cardUrgentClass = '';

    if (e.completed) {
      countdownLabel = e.grade ? ('✓ Nota: ' + e.grade) : '✓ Rendido';
      countdownClass = 'completed';
    } else if (diffDays < 0) {
      countdownLabel = '⚠️ Pasado';
      countdownClass = 'urgent';
    } else if (diffDays === 0) {
      countdownLabel = '🔥 ¡HOY!';
      countdownClass = 'urgent';
      cardUrgentClass = 'urgent';
    } else if (diffDays === 1) {
      countdownLabel = '⚡ ¡MAÑANA!';
      countdownClass = 'urgent';
      cardUrgentClass = 'urgent';
    } else if (diffDays <= 4) {
      countdownLabel = '⏳ En ' + diffDays + ' días';
      countdownClass = 'soon';
    } else {
      countdownLabel = '📅 En ' + diffDays + ' días';
      countdownClass = 'normal';
    }

    const dStr = examDate.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });

    return `
      <div class="exam-card ${cardUrgentClass}">
        <div class="exam-card-head">
          <span class="exam-subject">${escapeHtml(e.subject)} · ${escapeHtml(e.type || 'Evaluación')}</span>
          <span class="exam-countdown ${countdownClass}">${countdownLabel}</span>
        </div>
        <h3 class="exam-title">${escapeHtml(e.title)}</h3>
        <div class="exam-info-row">
          <span>📅 ${dStr}</span>
          ${e.time ? `<span>⏰ ${e.time}</span>` : ''}
        </div>
        ${e.note ? `<div class="exam-note">${escapeHtml(e.note)}</div>` : ''}
        <div class="exam-actions">
          <button class="btn-ghost-sm" onclick="toggleExamComplete(${e.id})">
            ${e.completed ? 'Desmarcar' : '✓ Marcar como rendido'}
          </button>
          <div style="display:flex; gap:8px;">
            <button class="link-btn" onclick="openExamModal(${e.id})">Editar</button>
            <button class="del-x" onclick="deleteExam(${e.id})" title="Eliminar">&times;</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function toggleExamComplete(id) {
  const e = examsList.find(x => x.id === id);
  if (!e) return;
  e.completed = !e.completed;
  if (e.completed && !e.grade) {
    const grade = prompt('¿Qué nota obtuviste? (Opcional, ej. 9.5/10):');
    if (grade) e.grade = grade.trim();
  }
  saveExamsList();
  renderExamsList();
}

export function deleteExam(id) {
  const idx = examsList.findIndex(x => x.id === id);
  if (idx === -1) return;
  deletedExamIds.add(id);
  try { localStorage.setItem(DELETED_EXAM_KEY, JSON.stringify([...deletedExamIds])); } catch (e) {}
  examsList.splice(idx, 1);
  saveExamsList();
  renderExamsList();
  showToast('Evaluación eliminada');
}

export function openExamModal(idOrNull) {
  const overlay = document.getElementById('examModalOverlay');
  const titleEl = document.getElementById('examModalTitle');
  if (!overlay) return;

  if (idOrNull !== null && idOrNull !== undefined) {
    const e = examsList.find(x => x.id === idOrNull);
    if (e) {
      editingExamId = e.id;
      if (titleEl) titleEl.textContent = 'Editar Evaluación';
      document.getElementById('examSubject').value = e.subject;
      document.getElementById('examType').value = e.type || 'Examen';
      document.getElementById('examTitleInput').value = e.title;
      document.getElementById('examDate').value = e.date;
      document.getElementById('examTime').value = e.time || '08:00';
      document.getElementById('examNote').value = e.note || '';
    }
  } else {
    editingExamId = null;
    if (titleEl) titleEl.textContent = '🎓 Nuevo Examen o Entrega';
    document.getElementById('examSubject').value = '';
    document.getElementById('examType').value = 'Examen';
    document.getElementById('examTitleInput').value = '';
    document.getElementById('examDate').value = dateKey(new Date());
    document.getElementById('examTime').value = '08:00';
    document.getElementById('examNote').value = '';
  }
  overlay.classList.remove('hidden');
}

export function closeExamModal() {
  const overlay = document.getElementById('examModalOverlay');
  if (overlay) overlay.classList.add('hidden');
  editingExamId = null;
}

export async function sendUniversalNotification(title, options) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch (e) {}
  }
  try {
    new Notification(title, options);
  } catch (e) {}
}

export function setupNotifications() {
  const btn = document.getElementById('enableNotificationsBtn');
  const testBtn = document.getElementById('testNotificationBtn');
  const statusEl = document.getElementById('notificationsStatus');

  function updateStatus() {
    if (!('Notification' in window)) {
      if (statusEl) statusEl.textContent = 'Tu navegador no soporta notificaciones web.';
      if (btn) btn.disabled = true;
      return;
    }
    if (Notification.permission === 'granted') {
      if (statusEl) { statusEl.textContent = '● Notificaciones activadas ✓'; statusEl.style.color = 'var(--green)'; }
      if (btn) { btn.textContent = '🔔 Notificaciones activas'; btn.classList.add('active'); }
    } else if (Notification.permission === 'denied') {
      if (statusEl) { statusEl.textContent = 'Notificaciones bloqueadas en el navegador.'; statusEl.style.color = 'var(--red)'; }
      if (btn) { btn.textContent = 'Notificaciones bloqueadas'; }
    } else {
      if (statusEl) { statusEl.textContent = 'Permiso no solicitado aún.'; statusEl.style.color = 'var(--text-soft)'; }
      if (btn) { btn.textContent = '🔔 Activar notificaciones'; }
    }
  }

  updateStatus();

  btn?.addEventListener('click', () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        updateStatus();
        if (p === 'granted') {
          showToast('Notificaciones activadas con éxito ✓');
          checkAndSendReminders(true);
        }
      });
    }
  });

  testBtn?.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      sendUniversalNotification('Alejo OS', {
        body: '¡Las notificaciones están funcionando perfectamente!',
        icon: './icons/icon-192.png?v=4'
      });
      showToast('Notificación enviada');
    } else {
      showToast('Primero activa las notificaciones');
    }
  });
}

export function checkAndSendReminders(isTest) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const lastCheckKey = 'mcf_last_notif_check';
  const lastCheck = localStorage.getItem(lastCheckKey);
  const todayKey = dateKey(new Date());
  if (!isTest && lastCheck === todayKey) return;

  const alerts = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // 1. Check Exams
  (examsList || []).forEach(e => {
    if (e.completed) return;
    const eDate = new Date(e.date + 'T00:00:00');
    const diff = Math.round((eDate - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) alerts.push(`🎓 ¡HOY tienes evaluación!: ${e.subject} - ${e.title}`);
    else if (diff === 1) alerts.push(`🎓 Mañana tienes evaluación: ${e.subject} - ${e.title}`);
  });

  // 2. Check Tasks Due Today
  const pendingToday = (tasksList || []).filter(t => !t.done && t.dueDate === todayKey);
  if (pendingToday.length > 0) {
    alerts.push(`📋 Tienes ${pendingToday.length} tarea${pendingToday.length !== 1 ? 's' : ''} para hoy.`);
  }

  // 3. Check Credit Card
  const currDay = new Date().getDate();
  const cfg = _getCreditCardConfigFn();
  const dueDay = cfg.paymentDueDay || 8;
  const debt = _calculateCreditCardDebtFn();
  if (currDay >= 1 && currDay <= dueDay && debt > 0.005) {
    alerts.push(`💳 Recordatorio TC: Pago máximo el día ${dueDay} (${fmt(debt)})`);
  }

  if (alerts.length > 0) {
    alerts.forEach((msg, idx) => {
      setTimeout(() => {
        sendUniversalNotification('Alejo OS', {
          body: msg,
          icon: './icons/icon-192.png?v=4'
        });
      }, idx * 1500);
    });
    localStorage.setItem(lastCheckKey, todayKey);
  }
}
