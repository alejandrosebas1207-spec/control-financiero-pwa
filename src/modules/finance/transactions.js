// Alejo OS · Transactions Module
import {
  TX_KEY,
  DELETED_TX_KEY,
  CATS_KEY,
  DEFAULT_CATS,
  ACCOUNT_DEFS,
  UNASSIGNED_ACCOUNT,
  SEED_DATA
} from '../../core/constants.js';
import {
  normalizeAccountId,
  isKnownAccountId,
  getAccountMeta,
  accountNameById,
  accountIcon,
  catIcon,
  icon,
  fmt,
  escapeHtml,
  dateKey,
  monthKey,
  showToast
} from '../../core/utils.js';

let _syncPushFn = () => {};
let _getDefaultAccountIdFn = () => 'guayaquil';
let _goalNameByIdFn = () => '';
let _updateGoalFieldOptionsFn = () => {};
let _renderFn = () => {};
let _getCursorFn = () => new Date();
let _openFuelModalFn = () => {};
let _openTaskModalFn = () => {};
let _openExamModalFn = () => {};
let _getCurrentActiveTabFn = () => 'finance';

export function registerTransactionsDeps(deps) {
  if (deps.syncPush) _syncPushFn = deps.syncPush;
  if (deps.getDefaultAccountId) _getDefaultAccountIdFn = deps.getDefaultAccountId;
  if (deps.goalNameById) _goalNameByIdFn = deps.goalNameById;
  if (deps.updateGoalFieldOptions) _updateGoalFieldOptionsFn = deps.updateGoalFieldOptions;
  if (deps.render) _renderFn = deps.render;
  if (deps.getCursor) _getCursorFn = deps.getCursor;
  if (deps.openFuelModal) _openFuelModalFn = deps.openFuelModal;
  if (deps.openTaskModal) _openTaskModalFn = deps.openTaskModal;
  if (deps.openExamModal) _openExamModalFn = deps.openExamModal;
  if (deps.getCurrentActiveTab) _getCurrentActiveTabFn = deps.getCurrentActiveTab;
}

export function normalizeTxList(raw) {
  const source = Array.isArray(raw) ? raw : [];
  return source.filter(Boolean).map(t => {
    const isTrf = t.type === 'withdrawal' || t.type === 'transfer';
    return {
      ...t,
      account: normalizeAccountId(t.account),
      toAccount: isTrf ? normalizeAccountId(t.toAccount || 'cash') : (t.toAccount ? normalizeAccountId(t.toAccount) : undefined)
    };
  });
}

export function loadTx() {
  try {
    const stored = localStorage.getItem(TX_KEY);
    const raw = stored ? JSON.parse(stored) : (SEED_DATA.tx || []);
    const normalized = normalizeTxList(raw);
    if (!stored && normalized.length) {
      localStorage.setItem(TX_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (e) {
    return normalizeTxList(SEED_DATA.tx || []);
  }
}

export let tx = loadTx();
export const getTx = () => tx;
export const setTx = val => { tx = normalizeTxList(val); };

export const saveTx = (d, shouldSync = true) => {
  tx = normalizeTxList(d || tx);
  localStorage.setItem(TX_KEY, JSON.stringify(tx));
  if (shouldSync) _syncPushFn();
};

export let deletedTxIds = new Set();
try {
  const _sDel = localStorage.getItem(DELETED_TX_KEY);
  if (_sDel) deletedTxIds = new Set(JSON.parse(_sDel));
} catch (e) {}

export function loadCats() {
  try {
    const raw = JSON.parse(localStorage.getItem(CATS_KEY));
    if (Array.isArray(raw) && raw.length) return raw;
  } catch (e) {}
  return DEFAULT_CATS.map(c => ({ ...c }));
}

export let catsData = loadCats();
export let CATS = catsData.map(c => c.name);
export let CAT_COLOR = {};

if (!CATS.includes('Pago Tarjeta')) {
  CATS.push('Pago Tarjeta');
  CAT_COLOR['Pago Tarjeta'] = '#F43F5E';
  catsData.push({ name: 'Pago Tarjeta', color: '#F43F5E' });
}
catsData.forEach(c => { CAT_COLOR[c.name] = c.color; });

export function saveCats(shouldSync = true) {
  catsData = CATS.map(name => ({ name, color: CAT_COLOR[name] || '#A6989C' }));
  localStorage.setItem(CATS_KEY, JSON.stringify(catsData));
  if (shouldSync) _syncPushFn();
}

export function applyCats(raw) {
  if (!Array.isArray(raw) || !raw.length) return;
  const valid = raw.filter(c => c && typeof c.name === 'string' && c.name.trim()).map(c => ({
    name: c.name.trim(), color: /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#A6989C'
  }));
  if (!valid.length) return;
  catsData = valid;
  CATS = valid.map(c => c.name);
  CAT_COLOR = {};
  valid.forEach(c => { CAT_COLOR[c.name] = c.color; });
  saveCats();
}

export function renderCatOptions() {
  const fCat = document.getElementById('fCat');
  if (!fCat) return;
  const cur = fCat.value;
  fCat.innerHTML = CATS.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (CATS.includes(cur)) fCat.value = cur;
}

export function renderCatMgmt() {
  const list = document.getElementById('catMgmtList');
  if (!list) return;
  list.innerHTML = catsData.map(c => `
    <div class="cat-chip-row">
      <span class="color-dot" style="background:${c.color}"></span>
      <span class="cat-name">${escapeHtml(c.name)}</span>
      <button class="del-cat-btn" data-cat="${escapeHtml(c.name)}" title="Eliminar categoría">&times;</button>
    </div>
  `).join('');
  
  list.querySelectorAll('.del-cat-btn').forEach(btn => {
    btn.onclick = () => {
      const name = btn.dataset.cat;
      if (CATS.length <= 1) { showToast('Debes tener al menos una categoría'); return; }
      CATS = CATS.filter(c => c !== name);
      delete CAT_COLOR[name];
      saveCats();
      renderCatOptions();
      renderCatMgmt();
      _renderFn();
      showToast(`Categoría "${name}" eliminada`);
    };
  });
}

// Transaction Modal State & Handlers
let type = 'income';
let editingId = null;
export let txSearch = '';
export let txTypeFilter = 'all';
export let allSearch = '';

export function renderToAccountOptions(selectedId, fromId) {
  const sel = document.getElementById('fToAccount');
  if (!sel) return;
  const available = ACCOUNT_DEFS.filter(acc => acc.id !== fromId);
  sel.innerHTML = available.map(account => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
  const targetId = (selectedId && selectedId !== fromId && isKnownAccountId(selectedId))
    ? selectedId
    : (available.find(a => a.id === 'cash') ? 'cash' : (available[0] ? available[0].id : ''));
  sel.value = targetId;
}

export function renderAccountOptions(selectedId, forTransfer) {
  const sel = document.getElementById('fAccount');
  if (!sel) return;
  const defaultAccountId = _getDefaultAccountIdFn();
  const includeUnassigned = normalizeAccountId(selectedId) === 'unassigned';
  const available = ACCOUNT_DEFS;
  const options = includeUnassigned ? [...available, UNASSIGNED_ACCOUNT] : available;
  sel.innerHTML = options.map(account => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
  const selectedIsAvailable = isKnownAccountId(selectedId);
  sel.value = includeUnassigned ? UNASSIGNED_ACCOUNT.id : (selectedIsAvailable ? selectedId : defaultAccountId);
}

export function updateNoteFieldVisibility() {
  const isTransfer = type === 'withdrawal' || type === 'transfer';
  const fCat = document.getElementById('fCat');
  const show = type === 'income' || isTransfer || (type === 'expense' && fCat && fCat.value === 'Otros');
  const noteField = document.getElementById('noteField');
  if (noteField) noteField.classList.toggle('hidden', !show);
  const noteLabel = document.getElementById('noteLabel');
  const fNote = document.getElementById('fNote');
  if (!noteLabel || !fNote) return;
  if (type === 'income') {
    noteLabel.textContent = '¿De dónde viene este ingreso?';
    fNote.placeholder = 'Ej. Sueldo, quincena, décimo, un camello, beca...';
  } else if (isTransfer) {
    noteLabel.textContent = 'Concepto del traspaso (opcional)';
    fNote.placeholder = 'Ej. Retiro cajero, recarga de saldo, traspaso...';
  } else {
    noteLabel.textContent = '¿A qué corresponde?';
    fNote.placeholder = 'Ej. Pasaje, cyber, recarga, arriendo, copias...';
  }
}

export function syncTypeVisibility() {
  const isTransfer = type === 'withdrawal' || type === 'transfer';
  const catField = document.getElementById('catField');
  const goalField = document.getElementById('goalField');
  const withdrawalDest = document.getElementById('withdrawalDestination');
  const accountLabel = document.getElementById('accountLabel');
  
  if (catField) catField.classList.toggle('hidden', type !== 'expense');
  if (goalField) goalField.classList.toggle('hidden', type !== 'saving');
  if (withdrawalDest) withdrawalDest.classList.toggle('hidden', !isTransfer);
  if (accountLabel) accountLabel.textContent = isTransfer ? 'Cuenta de origen (sale)' : 'Cuenta';
  
  const fAccount = document.getElementById('fAccount');
  const currentAccount = fAccount ? fAccount.value : _getDefaultAccountIdFn();
  renderAccountOptions(currentAccount, isTransfer);
  if (isTransfer && fAccount) {
    const toAccVal = document.getElementById('fToAccount')?.value;
    renderToAccountOptions(toAccVal, fAccount.value);
  }
  if (type === 'saving') {
    const curGoal = document.getElementById('fGoal')?.value;
    _updateGoalFieldOptionsFn(curGoal);
  }
  updateNoteFieldVisibility();
}

export function resetEntryForm() {
  type = 'income';
  document.querySelectorAll('.type-toggle button').forEach(b => b.classList.toggle('active', b.dataset.t === 'income'));
  const fAmt = document.getElementById('fAmt');
  const fNote = document.getElementById('fNote');
  const fDate = document.getElementById('fDate');
  const fCat = document.getElementById('fCat');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  
  if (fAmt) fAmt.value = '';
  if (fNote) fNote.value = '';
  if (fDate) fDate.value = dateKey(new Date());
  renderCatOptions();
  if (fCat) fCat.value = CATS[0] || '';
  renderAccountOptions(_getDefaultAccountIdFn());
  editingId = null;
  if (modalTitle) modalTitle.textContent = 'Nuevo movimiento';
  if (modalSubmitBtn) modalSubmitBtn.textContent = 'Guardar movimiento';
  syncTypeVisibility();
}

export function openEntryModal(prefill) {
  resetEntryForm();
  const modalTitle = document.getElementById('modalTitle');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  
  if (prefill) {
    if (prefill.id) editingId = prefill.id;
    if (prefill.type) {
      type = prefill.type === 'transfer' ? 'withdrawal' : prefill.type;
      document.querySelectorAll('.type-toggle button').forEach(b => b.classList.toggle('active', b.dataset.t === type));
    }
    if (prefill.amt !== undefined && prefill.amt !== '') document.getElementById('fAmt').value = prefill.amt;
    if (prefill.date) document.getElementById('fDate').value = prefill.date;
    if (prefill.note) document.getElementById('fNote').value = prefill.note || '';
    if (prefill.account) renderAccountOptions(prefill.account, type === 'withdrawal');
    if (prefill.toAccount) renderToAccountOptions(prefill.toAccount, prefill.account);
    if (prefill.cat) document.getElementById('fCat').value = prefill.cat;
    if (modalTitle) modalTitle.textContent = prefill.id ? 'Editar movimiento' : 'Nuevo movimiento';
    if (modalSubmitBtn) modalSubmitBtn.textContent = prefill.id ? 'Guardar cambios' : 'Guardar movimiento';
    syncTypeVisibility();
    if (prefill.goalId) {
      _updateGoalFieldOptionsFn(prefill.goalId);
      const fGoal = document.getElementById('fGoal');
      if (fGoal) fGoal.value = prefill.goalId;
    }
  }
  if (modalOverlay) modalOverlay.classList.remove('hidden');
  if (window.innerWidth > 768 && !('ontouchstart' in window)) {
    document.getElementById('fAmt')?.focus();
  }
}

export function closeEntryModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) modalOverlay.classList.add('hidden');
  editingId = null;
}

export function deleteTx(id) {
  const idx = tx.findIndex(t => t.id === id);
  if (idx === -1) return;
  const removed = tx[idx];
  deletedTxIds.add(id);
  try { localStorage.setItem(DELETED_TX_KEY, JSON.stringify([...deletedTxIds])); } catch (e) {}
  tx.splice(idx, 1);
  saveTx(tx);
  _renderFn();
  renderAllList();
  showToast('Movimiento eliminado');
}

export function editTx(id) {
  const t = tx.find(x => x.id === id);
  if (t) openEntryModal({ ...t });
}

export function txLabel(t) {
  if (t.type === 'expense') return escapeHtml(t.cat || 'Gasto') + ((t.cat === 'Otros' && t.note) ? ` — ${escapeHtml(t.note)}` : '');
  if (t.type === 'income') return 'Ingreso' + (t.note ? ` — ${escapeHtml(t.note)}` : '');
  if (t.type === 'withdrawal' || t.type === 'transfer') {
    const toAcc = getAccountMeta(t.toAccount || 'cash');
    return (t.note ? escapeHtml(t.note) : `Traspaso a ${escapeHtml(toAcc.name)}`);
  }
  const gName = _goalNameByIdFn(t.goalId);
  return 'Ahorro' + (gName ? ` — ${escapeHtml(gName)}` : '');
}

export function txSearchText(t) {
  const isTrf = t.type === 'withdrawal' || t.type === 'transfer';
  const typeLabel = isTrf ? 'transferencia traspaso retiro' : (t.type === 'income' ? 'ingreso' : (t.type === 'expense' ? 'gasto' : 'ahorro'));
  const toAcc = isTrf ? accountNameById(t.toAccount || 'cash') : '';
  return [t.note || '', t.cat || '', t.type || '', typeLabel, accountNameById(t.account), toAcc].join(' ').toLowerCase();
}

export function txRowHtml(t, showDay) {
  const d = new Date(t.date + 'T00:00:00');
  const dayLabel = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const isTrf = t.type === 'withdrawal' || t.type === 'transfer';
  const iconHtml = t.type === 'expense' ? catIcon(t.cat) : icon(t.type === 'income' ? 'ingreso' : (isTrf ? 'withdrawal' : 'ahorro'));
  const sign = t.type === 'expense' ? '-' : (isTrf ? '↔' : '+');
  const account = getAccountMeta(t.account);
  const toAcc = isTrf ? getAccountMeta(t.toAccount || 'cash') : null;
  const accountLabel = isTrf
    ? `${accountIcon(t.account, 11)}${escapeHtml(account.name)} → ${accountIcon(toAcc.id, 11)}${escapeHtml(toAcc.name)}`
    : `${accountIcon(t.account, 11)}${escapeHtml(account.name)}`;
  return `<div class="tx-row ${t.type} ${showDay ? 'dayed' : ''}">
    ${showDay ? `<span class="day">${dayLabel}</span>` : ''}
    <span class="cat">${iconHtml}<span class="tx-copy"><span class="tx-label">${txLabel(t)}</span><span class="tx-account">${accountLabel}</span></span></span>
    <span class="amt">${sign}${fmt(t.amt)}</span>
    <button class="edit" data-edit-id="${t.id}" title="Editar" aria-label="Editar">✎</button>
    <button class="del" data-del-id="${t.id}" title="Eliminar" aria-label="Eliminar">&times;</button>
  </div>`;
}

export function renderAllList() {
  const list = document.getElementById('allList');
  if (!list) return;
  const q = allSearch.trim().toLowerCase();
  let arr = [...tx].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (q) arr = arr.filter(t => txSearchText(t).includes(q));
  const allTotal = document.getElementById('allTotal');
  if (allTotal) allTotal.textContent = arr.length + ' movimientos';
  if (arr.length === 0) {
    list.innerHTML = '<div class="tx-empty-note"><span class="eicon">🔎</span>Sin resultados.</div>';
    return;
  }
  const groups = {};
  arr.forEach(t => { const k = monthKey(t.date); (groups[k] = groups[k] || []).push(t); });
  list.innerHTML = Object.keys(groups).sort().reverse().map(mk => {
    const items = groups[mk].sort((a, b) => b.date.localeCompare(a.date));
    const label = new Date(mk + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return `<div class="month-band">${label}</div>` + items.map(t => txRowHtml(t, true)).join('');
  }).join('');
  list.onclick = e => {
    const delBtn = e.target.closest('.del'); if (delBtn) { deleteTx(parseInt(delBtn.dataset.delId, 10)); return; }
    const editBtn = e.target.closest('.edit'); if (editBtn) { editTx(parseInt(editBtn.dataset.editId, 10)); return; }
  };
}

export function setupTransactionEventListeners() {
  document.getElementById('fabBtn')?.addEventListener('click', function() {
    const tab = _getCurrentActiveTabFn();
    if (tab === 'finance') openEntryModal(null);
    else if (tab === 'moto') _openFuelModalFn();
    else if (tab === 'tasks') _openTaskModalFn(null);
    else if (tab === 'uni') _openExamModalFn(null);
  });

  document.getElementById('modalClose')?.addEventListener('click', closeEntryModal);
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeEntryModal);
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeEntryModal(); });
  }

  document.querySelectorAll('.type-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      type = btn.dataset.t;
      document.querySelectorAll('.type-toggle button').forEach(b => b.classList.toggle('active', b === btn));
      syncTypeVisibility();
    });
  });

  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q || 'income';
      openEntryModal({ type: q });
    });
  });

  document.getElementById('fCat')?.addEventListener('change', () => {
    updateNoteFieldVisibility();
    const catVal = document.getElementById('fCat')?.value;
    const accSel = document.getElementById('fAccount');
    if (catVal === 'Pago Tarjeta' && accSel && accSel.value === 'tc') {
      const defAcc = _getDefaultAccountIdFn();
      accSel.value = (defAcc && defAcc !== 'tc') ? defAcc : 'deuna';
      showToast('Selecciona la cuenta líquida de donde saldrá el pago (Deuna, Banco Guayaquil o Efectivo)');
    }
  });

  document.getElementById('fAccount')?.addEventListener('change', () => {
    if (type === 'withdrawal' || type === 'transfer') {
      renderToAccountOptions(document.getElementById('fToAccount')?.value, document.getElementById('fAccount')?.value);
    }
  });

  document.getElementById('entryForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('fAmt').value);
    const date = document.getElementById('fDate').value;
    if (!amt || !date) return;
    const isTransfer = type === 'withdrawal' || type === 'transfer';
    const cat = type === 'expense' ? document.getElementById('fCat').value : null;
    const goalId = type === 'saving' ? (document.getElementById('fGoal').value || null) : null;
    const account = normalizeAccountId(document.getElementById('fAccount').value);
    const toAccount = isTransfer ? normalizeAccountId(document.getElementById('fToAccount')?.value || 'cash') : null;
    const note = (type === 'income' || isTransfer || (type === 'expense' && cat === 'Otros')) ? document.getElementById('fNote').value.trim() || null : null;
    
    if (editingId !== null) {
      const idx = tx.findIndex(t => t.id === editingId);
      if (idx > -1) tx[idx] = { ...tx[idx], type, cat, amt, date, goalId, note, account, toAccount };
      editingId = null;
      saveTx(tx);
      closeEntryModal();
      _renderFn();
      showToast(isTransfer ? 'Transferencia actualizada' : 'Movimiento actualizado');
    } else {
      tx.push({ id: Date.now(), type, cat, amt, date, goalId, note, account, toAccount });
      saveTx(tx);
      document.getElementById('fAmt').value = '';
      document.getElementById('fNote').value = '';
      closeEntryModal();
      _renderFn();
      showToast(isTransfer ? 'Transferencia guardada' : 'Movimiento guardado');
    }
  });

  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    document.getElementById('allModalOverlay')?.classList.remove('hidden');
    renderAllList();
  });
  document.getElementById('allModalClose')?.addEventListener('click', () => document.getElementById('allModalOverlay')?.classList.add('hidden'));
  document.getElementById('allModalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('allModalOverlay')) document.getElementById('allModalOverlay')?.classList.add('hidden');
  });
  document.getElementById('allSearchInput')?.addEventListener('input', e => { allSearch = e.target.value; renderAllList(); });

  document.getElementById('txSearchInput')?.addEventListener('input', e => { txSearch = e.target.value; _renderFn(); });
  document.getElementById('txFilterChips')?.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    txTypeFilter = btn.dataset.f;
    document.querySelectorAll('#txFilterChips button').forEach(b => b.classList.toggle('active', b === btn));
    _renderFn();
  });

  document.getElementById('prevMonth')?.addEventListener('click', () => {
    const cursor = _getCursorFn();
    cursor.setMonth(cursor.getMonth() - 1);
    _renderFn();
  });
  document.getElementById('nextMonth')?.addEventListener('click', () => {
    const cursor = _getCursorFn();
    cursor.setMonth(cursor.getMonth() + 1);
    _renderFn();
  });
  document.getElementById('todayBtn')?.addEventListener('click', () => {
    const cursor = _getCursorFn();
    const now = new Date();
    cursor.setFullYear(now.getFullYear(), now.getMonth(), 1);
    _renderFn();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeEntryModal();
      document.getElementById('allModalOverlay')?.classList.add('hidden');
    }
  });
}
