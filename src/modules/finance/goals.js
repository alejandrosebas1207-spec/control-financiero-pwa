// Alejo OS · Savings Goals Module
import { GOALS_KEY, GOAL_HISTORY_KEY, SEED_DATA } from '../../core/constants.js';
import { normalizeAccountId, getAccountMeta, fmt, escapeHtml, escapeAttr, dateKey, icon, showToast } from '../../core/utils.js';

let _syncPushFn = () => {};
let _getTxFn = () => [];
let _renderFn = () => {};
let _openEntryModalFn = () => {};

export function registerGoalsDeps(deps) {
  if (deps.syncPush) _syncPushFn = deps.syncPush;
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.render) _renderFn = deps.render;
  if (deps.openEntryModal) _openEntryModalFn = deps.openEntryModal;
}

export function loadGoals() {
  try {
    const v2 = localStorage.getItem(GOALS_KEY);
    if (v2) return JSON.parse(v2);
    const initial = SEED_DATA.goals || [];
    if (initial.length) {
      localStorage.setItem(GOALS_KEY, JSON.stringify(initial));
    }
    return initial;
  } catch (e) {
    return SEED_DATA.goals || [];
  }
}

export let goals = loadGoals();
export const getGoals = () => goals;
export const setGoals = g => { goals = g; };

export const saveGoals = (g, shouldSync = true) => {
  goals = g;
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  if (shouldSync) _syncPushFn();
};

export const loadGoalHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(GOAL_HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
};

export let goalHistory = loadGoalHistory();
export const getGoalHistory = () => goalHistory;
export const setGoalHistory = h => { goalHistory = h; };

export const saveGoalHistory = h => {
  goalHistory = h;
  localStorage.setItem(GOAL_HISTORY_KEY, JSON.stringify(goalHistory));
};

export let goalFormOpen = false;

export function goalNameById(id) {
  const g = goals.find(x => x.id === id);
  return g ? g.name : null;
}

export function goalProgress(g) {
  const tx = _getTxFn();
  const goalSavings = (tx || []).filter(t => t.type === 'saving' && t.goalId === g.id);
  const goalWithdrawals = (tx || []).filter(t => t.type === 'withdrawal' && t.goalId === g.id);
  
  const byAccount = {};
  goalSavings.forEach(t => {
    const acc = normalizeAccountId(t.account) || 'deuna';
    byAccount[acc] = (byAccount[acc] || 0) + t.amt;
  });
  goalWithdrawals.forEach(t => {
    const acc = normalizeAccountId(t.account) || 'deuna';
    byAccount[acc] = (byAccount[acc] || 0) - t.amt;
  });

  const total = goalSavings.reduce((s, t) => s + t.amt, 0) - goalWithdrawals.reduce((s, t) => s + t.amt, 0);
  const progress = Math.min(g.target, Math.max(0, total));
  const pct = g.target > 0 ? Math.min(100, Math.round((Math.max(0, total) / g.target) * 100)) : 0;
  const completed = total >= g.target;
  return { total, progress, pct, completed, byAccount };
}

export function updateGoalFieldOptions(selectedGoalId) {
  const sel = document.getElementById('fGoal');
  if (!sel) return;
  const currentVal = selectedGoalId !== undefined ? selectedGoalId : sel.value;
  const selectable = goals.filter(g => !goalProgress(g).completed || g.id === currentVal);
  sel.innerHTML = '<option value="">Sin meta específica</option>' +
    selectable.map(g => `<option value="${g.id}" ${g.id === currentVal ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
  if (currentVal) sel.value = currentVal;
}

export function renderGoals(force = false) {
  const area = document.getElementById('goalArea');
  if (!area) return;
  if (goalFormOpen && !force) return;
  goalFormOpen = false;
  if (goals.length === 0) {
    area.innerHTML = `<div class="goal-empty">
      <div class="empty-icon">${icon('target', 34)}</div>
      <p>Aún no tienes metas activas. Crea una y elígela al registrar un ahorro.</p>
      <button type="button" class="btn-outline" id="newGoalBtn">+ Crear primera meta</button>
    </div>`;
    document.getElementById('newGoalBtn')?.addEventListener('click', () => showGoalForm(null));
  } else {
    area.innerHTML = goals.map(g => {
      const { progress, pct, completed, byAccount } = goalProgress(g);
      return `<div class="goal-mini ${completed ? 'completed' : ''}">
        ${completed ? `<div class="goal-complete-banner"><p>🎉 ¡Meta cumplida!</p></div>` : ''}
        <div class="goal-mini-head">
          <span class="gname">${escapeHtml(g.name)}</span>
          <span class="gpct">${pct}%</span>
        </div>
        <div class="track"><div class="fill ${completed ? 'full': ''}" style="width:${pct}%"></div></div>
        <div class="goal-mini-amt">${fmt(progress)} de ${fmt(g.target)}</div>
        ${Object.keys(byAccount).length > 0 ? `
          <div class="goal-mini-breakdown" style="font-size:10px; font-family:'JetBrains Mono',monospace; color:var(--text-soft); margin-bottom:9px; display:flex; flex-wrap:wrap; gap:5px;">
            ${Object.entries(byAccount).filter(([_, amt]) => amt > 0.005).map(([accId, amt]) => {
              const aMeta = getAccountMeta(accId);
              return `<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(0,0,0,0.28); padding:2px 7px; border-radius:5px; border:1px solid rgba(255,255,255,0.08);"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${aMeta.color};"></span> ${escapeHtml(aMeta.name)}: <b style="color:var(--text);">${fmt(amt)}</b></span>`;
            }).join('')}
          </div>
        ` : ''}
        <div class="goal-mini-actions">
          ${completed
            ? `<button class="btn-ghost-sm archive-g" data-id="${g.id}">Archivar</button><button class="btn-ghost-sm discard-g" data-id="${g.id}">Descartar</button>`
            : `<button class="btn-ghost-sm add-saving-g" data-id="${g.id}" style="color:var(--green); border-color:rgba(16,185,129,0.3); font-weight:600;">+ Ahorrar</button><button class="btn-ghost-sm edit-g" data-id="${g.id}">Editar</button><button class="btn-ghost-sm del-g" data-id="${g.id}">Eliminar</button>`}
        </div>
      </div>`;
    }).join('') + `<button type="button" class="btn-outline" id="newGoalBtn" style="width:100%;margin-top:2px;">+ Nueva meta</button>`;

    area.querySelectorAll('.add-saving-g').forEach(b => b.addEventListener('click', () => _openEntryModalFn({ type: 'saving', goalId: b.dataset.id })));
    area.querySelectorAll('.edit-g').forEach(b => b.addEventListener('click', () => showGoalForm(goals.find(g => g.id === b.dataset.id))));
    area.querySelectorAll('.del-g').forEach(b => b.addEventListener('click', () => { goals = goals.filter(g => g.id !== b.dataset.id); saveGoals(goals); _renderFn(); }));
    area.querySelectorAll('.archive-g').forEach(b => b.addEventListener('click', () => {
      const g = goals.find(x => x.id === b.dataset.id);
      if (g) {
        goalHistory.push({ name: g.name, target: g.target, date: dateKey(new Date()) });
        saveGoalHistory(goalHistory);
        goals = goals.filter(x => x.id !== g.id);
        saveGoals(goals);
        _renderFn();
      }
    }));
    area.querySelectorAll('.discard-g').forEach(b => b.addEventListener('click', () => { goals = goals.filter(g => g.id !== b.dataset.id); saveGoals(goals); _renderFn(); }));
    document.getElementById('newGoalBtn')?.addEventListener('click', () => showGoalForm(null));
  }
  renderGoalHistory();
  if (document.getElementById('goalField')) updateGoalFieldOptions();
}

export function showGoalForm(existing) {
  const area = document.getElementById('goalArea');
  if (!area) return;
  goalFormOpen = true;
  area.innerHTML = `<form class="goal-form" id="goalForm" novalidate>
    <label for="gName">Nombre de la meta</label>
    <input id="gName" type="text" placeholder="Ej. Laptop nueva" maxlength="80" required value="${existing ? escapeAttr(existing.name) : ''}">
    <label for="gTarget">Monto objetivo</label>
    <input id="gTarget" type="number" min="0.01" step="0.01" placeholder="300" required value="${existing ? existing.target : ''}">
    <p class="form-error hidden" id="goalFormError" role="alert"></p>
    <div class="goal-form-actions">
      <button type="submit" class="btn-submit" id="saveGoalBtn">Guardar meta</button>
      <button type="button" class="btn-ghost-sm" id="cancelGoalBtn">Cancelar</button>
    </div>
  </form>`;
  document.getElementById('goalForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('gName').value.trim();
    const target = parseFloat(document.getElementById('gTarget').value);
    const error = document.getElementById('goalFormError');
    if (!name || !Number.isFinite(target) || target <= 0) {
      if (error) {
        error.textContent = 'Escribe un nombre y un monto objetivo mayor que $0.';
        error.classList.remove('hidden');
      }
      return;
    }
    if (existing) {
      const idx = goals.findIndex(g => g.id === existing.id);
      if (idx > -1) goals[idx] = { ...existing, name, target };
    } else {
      goals.push({ id: 'g' + Date.now(), name, target, createdDate: dateKey(new Date()) });
    }
    goalFormOpen = false;
    saveGoals(goals);
    _renderFn();
    showToast(existing ? 'Meta actualizada ✓' : 'Meta creada ✓');
  });
  document.getElementById('cancelGoalBtn')?.addEventListener('click', () => renderGoals(true));
}

export function renderGoalHistory() {
  const wrap = document.getElementById('goalArea');
  if (!wrap) return;
  let histEl = document.getElementById('goalHistoryBox');
  if (!histEl) { histEl = document.createElement('div'); histEl.id = 'goalHistoryBox'; wrap.appendChild(histEl); }
  if (goalHistory.length === 0) { histEl.innerHTML = ''; return; }
  histEl.innerHTML = `<div class="goal-history">
    <h3>Metas cumplidas</h3>
    ${goalHistory.map((g, i) => ({ g, i })).reverse().map(({ g, i }) => `
      <div class="goal-history-item">
        <span class="name">✅ ${escapeHtml(g.name)}</span>
        <span class="right"><span class="amt">${fmt(g.target)}</span><button class="del-x" data-i="${i}">&times;</button></span>
      </div>`).join('')}
    <button class="goal-history-clear" id="clearHistoryBtn">Borrar todo el historial</button>
  </div>`;
  histEl.querySelectorAll('.del-x').forEach(btn => {
    btn.addEventListener('click', () => {
      goalHistory.splice(parseInt(btn.dataset.i, 10), 1);
      saveGoalHistory(goalHistory);
      renderGoalHistory();
    });
  });
  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    goalHistory = [];
    saveGoalHistory(goalHistory);
    renderGoalHistory();
  });
}
