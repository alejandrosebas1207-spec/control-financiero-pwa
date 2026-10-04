// Alejo OS · Charts & Visualizations Module
import { normalizeAccountId, monthKey, monthKeyFromDate, fmt, animateNumber } from '../../core/utils.js';

let _getTxFn = () => [];
let _getGoalsFn = () => [];
let _goalProgressFn = () => ({ completed: false });
let _getCatsFn = () => [];
let _getCatColorFn = () => ({});
let _getCursorFn = () => new Date();

export function registerChartsDeps(deps) {
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.getGoals) _getGoalsFn = deps.getGoals;
  if (deps.goalProgress) _goalProgressFn = deps.goalProgress;
  if (deps.getCats) _getCatsFn = deps.getCats;
  if (deps.getCatColor) _getCatColorFn = deps.getCatColor;
  if (deps.getCursor) _getCursorFn = deps.getCursor;
}

export function drawDonutToCanvas(catTotals, total, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, rOuter = size * 0.44, rInner = size * 0.26;
  ctx.clearRect(0, 0, size, size);
  if (!total) {
    ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, Math.PI * 2); ctx.fillStyle = '#E9E9EE'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    return canvas;
  }
  let start = -Math.PI / 2;
  const catColor = _getCatColorFn();
  Object.keys(catTotals).forEach(c => {
    const val = catTotals[c];
    if (!val || val <= 0) return;
    const angle = (val / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rOuter, start, start + angle); ctx.closePath();
    ctx.fillStyle = catColor[c] || '#999999';
    ctx.fill();
    start += angle;
  });
  ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  return canvas;
}

export function drawFlowBarsToCanvas(months, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  const padL = 26, padR = 8, padT = 12, padB = 24;
  const pW = w - padL - padR, pH = h - padT - padB;
  const maxV = Math.max(1, ...months.map(m => Math.max(m.income, m.expense)));
  const groupW = pW / months.length, barW = Math.min(15, groupW * 0.26);
  ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
  ctx.fillStyle = '#22C55E'; ctx.fillText('■ Ingresos', padL - 2, padT - 1);
  ctx.fillStyle = '#EF4444'; ctx.fillText('■ Gastos', padL - 2 + 46, padT - 1);
  months.forEach((m, i) => {
    const cx = padL + groupW * (i + 0.5);
    const hInc = (m.income / maxV) * pH, hExp = (m.expense / maxV) * pH;
    ctx.fillStyle = '#22C55E'; ctx.fillRect(cx - barW - 1.5, padT + pH - hInc, barW, hInc);
    ctx.fillStyle = '#EF4444'; ctx.fillRect(cx + 1.5, padT + pH - hExp, barW, hExp);
    ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(new Date(m.mk + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }), cx, h - 6);
  });
  return canvas;
}

export function drawBudgetBarsToCanvas(cats, monthBudgets, catTotals, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  if (!cats.length) return canvas;
  const padL = 8, padR = 8, padT = 16, padB = 20;
  const pW = w - padL - padR, pH = h - padT - padB;
  const maxV = Math.max(1, ...cats.map(c => Math.max(monthBudgets[c] || 0, catTotals[c] || 0)));
  const groupW = pW / cats.length, barW = Math.min(15, groupW * 0.26);
  ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(166,152,156,0.8)'; ctx.fillText('■ Presupuesto', padL - 2, padT - 1);
  ctx.fillStyle = '#EF4444'; ctx.fillText('■ Gastado', padL - 2 + 42, padT - 1);
  cats.forEach((c, i) => {
    const cx = padL + groupW * (i + 0.5);
    const b = monthBudgets[c] || 0, spent = catTotals[c] || 0;
    const hB = (b / maxV) * pH, hS = (spent / maxV) * pH;
    ctx.fillStyle = 'rgba(166,152,156,0.6)'; ctx.fillRect(cx - barW - 1.5, padT + pH - hB, barW, hB);
    const ratio = b > 0 ? spent / b : 0;
    ctx.fillStyle = ratio < 0.7 ? '#22C55E' : (ratio <= 1 ? '#FBBF24' : '#EF4444');
    ctx.fillRect(cx + 1.5, padT + pH - hS, barW, hS);
    ctx.fillStyle = '#555'; ctx.font = '8.5px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(c.length > 10 ? c.slice(0, 9) + '…' : c, cx, h - 6);
  });
  return canvas;
}

export function drawLineChartCanvas(labels, values, w, h, color) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  if (!values.length) return canvas;
  const padL = 24, padR = 8, padT = 10, padB = 22;
  const pW = w - padL - padR, pH = h - padT - padB;
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const range = (max - min) || 1;
  const xx = i => padL + (values.length === 1 ? pW / 2 : (pW / (values.length - 1)) * i);
  const yy = v => padT + pH - ((v - min) / range) * pH;
  ctx.beginPath(); ctx.moveTo(xx(0), yy(0));
  values.forEach((v, i) => ctx.lineTo(xx(i), yy(v)));
  ctx.lineTo(xx(values.length - 1), yy(0)); ctx.lineTo(xx(0), yy(0)); ctx.closePath();
  const g = ctx.createLinearGradient(0, padT, 0, padT + pH);
  g.addColorStop(0, 'rgba(249,115,22,0.22)'); g.addColorStop(1, 'rgba(249,115,22,0.02)');
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath();
  values.forEach((v, i) => { if (i === 0) ctx.moveTo(xx(i), yy(v)); else ctx.lineTo(xx(i), yy(v)); });
  ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
  const every = Math.ceil(values.length / 7);
  values.forEach((v, i) => {
    ctx.beginPath(); ctx.arc(xx(i), yy(v), 2.4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    if (i % every === 0 || values.length === 1) {
      ctx.fillStyle = '#777'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(labels[i], xx(i), h - 7);
    }
  });
  return canvas;
}

export function getMonthlySeries() {
  const tx = _getTxFn();
  if (tx.length === 0) return [];
  const allMonths = tx.map(t => monthKey(t.date));
  let minMonth = allMonths.reduce((a, b) => a < b ? a : b);
  let maxMonth = monthKeyFromDate(new Date());
  const cursorKey = monthKey(_getCursorFn());
  if (cursorKey > maxMonth) maxMonth = cursorKey;
  const months = [];
  let d = new Date(minMonth + '-01T00:00:00');
  const end = new Date(maxMonth + '-01T00:00:00');
  while (d <= end) { months.push(monthKeyFromDate(d)); d.setMonth(d.getMonth() + 1); }
  let acc = 0;
  return months.map(mk => {
    const mtx = tx.filter(t => monthKey(t.date) === mk);
    const income = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
    const expense = mtx.filter(t => t.type === 'expense' && normalizeAccountId(t.account) !== 'tc').reduce((s, t) => s + t.amt, 0);
    const saved = mtx.filter(t => t.type === 'saving').reduce((s, t) => s + t.amt, 0);
    const net = income - expense - saved;
    acc += net;
    return { mk, income, expense, saved, net, acc };
  });
}

export let lastSeries = [];
export function renderBalance() {
  const series = getMonthlySeries();
  lastSeries = series;
  const total = series.length ? series[series.length - 1].acc : 0;
  animateNumber('balTotalHist', total);

  const tbody = document.getElementById('balanceTableBody');
  if (tbody) {
    if (series.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:14px 0;">Aún no hay movimientos.</td></tr>';
    } else {
      tbody.innerHTML = series.slice().reverse().map(s => {
        const label = new Date(s.mk + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        return `<tr>
          <td>${label}</td><td>${fmt(s.income)}</td><td>${fmt(s.expense)}</td><td>${fmt(s.saved)}</td>
          <td class="${s.net >= 0 ? 'pos' : 'neg'}">${s.net >= 0 ? '+' : ''}${fmt(s.net)}</td>
          <td class="acc">${fmt(s.acc)}</td>
        </tr>`;
      }).join('');
    }
  }
  drawBalanceChart(series);
  return total;
}

export function drawBalanceChart(series) {
  const canvas = document.getElementById('balanceChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = 170;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!series || series.length === 0) return;
  const padL = 6, padR = 6, padT = 16, padB = 22;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const vals = series.map(s => s.acc);
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals);
  const range = (max - min) || 1;
  const x = i => padL + (series.length === 1 ? plotW / 2 : (plotW / (series.length - 1)) * i);
  const y = v => padT + plotH - ((v - min) / range) * plotH;
  ctx.strokeStyle = 'rgba(140,170,220,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, y(0)); ctx.lineTo(w - padR, y(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x(0), y(series[0].acc));
  series.forEach((s, i) => ctx.lineTo(x(i), y(s.acc)));
  ctx.lineTo(x(series.length - 1), y(0)); ctx.lineTo(x(0), y(0)); ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, 'rgba(249,115,22,0.28)'); grad.addColorStop(1, 'rgba(249,115,22,0.02)');
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  series.forEach((s, i) => { const px = x(i), py = y(s.acc); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
  ctx.strokeStyle = '#F97316'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const showEvery = Math.ceil(series.length / 7);
  series.forEach((s, i) => {
    const px = x(i), py = y(s.acc);
    ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#F97316'; ctx.fill();
    if (i % showEvery === 0 || series.length === 1) {
      ctx.fillStyle = 'rgba(234,240,250,0.55)'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(new Date(s.mk + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }), px, h - 6);
    }
  });
}

export let lastFlow = [];
export function getFlowSeries() {
  const months = [];
  const cursor = _getCursorFn();
  for (let i = 5; i >= 0; i--) { const d = new Date(cursor); d.setMonth(d.getMonth() - i); months.push(monthKeyFromDate(d)); }
  const tx = _getTxFn();
  return months.map(mk => {
    const mtx = tx.filter(t => monthKey(t.date) === mk);
    const income = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
    const expense = mtx.filter(t => t.type === 'expense' && normalizeAccountId(t.account) !== 'tc').reduce((s, t) => s + t.amt, 0);
    return { mk, income, expense };
  });
}

export function drawFlowChart(series) {
  lastFlow = series;
  const canvas = document.getElementById('flowChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = 180;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!series || series.length === 0) return;
  const padL = 8, padR = 8, padT = 14, padB = 22;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const maxV = Math.max(1, ...series.map(s => Math.max(s.income, s.expense)));
  const x = i => padL + (series.length === 1 ? plotW / 2 : (plotW / (series.length - 1)) * i);
  const y = v => padT + plotH - (v / maxV) * plotH;

  function drawArea(key, color, alpha) {
    ctx.beginPath(); ctx.moveTo(x(0), y(series[0][key]));
    series.forEach((s, i) => ctx.lineTo(x(i), y(s[key])));
    ctx.lineTo(x(series.length - 1), padT + plotH); ctx.lineTo(x(0), padT + plotH); ctx.closePath();
    ctx.fillStyle = color.replace('ALPHA', alpha); ctx.fill();
    ctx.beginPath();
    series.forEach((s, i) => { const px = x(i), py = y(s[key]); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.strokeStyle = color.replace('ALPHA', '1'); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  }
  drawArea('expense', 'rgba(226,76,91,ALPHA)', '0.12');
  drawArea('income', 'rgba(52,199,154,ALPHA)', '0.14');

  const showEvery = Math.ceil(series.length / 6);
  series.forEach((s, i) => {
    if (i % showEvery === 0 || series.length === 1) {
      ctx.fillStyle = 'rgba(234,240,250,0.5)'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(new Date(s.mk + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }), x(i), h - 6);
    }
  });
}

export function drawDonut(catTotals, total) {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 150;
  canvas.width = size * dpr; canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, rOuter = 68, rInner = 42;
  let start = -Math.PI / 2;
  const CATS = _getCatsFn();
  const CAT_COLOR = _getCatColorFn();
  const entries = CATS.filter(c => catTotals[c] > 0);
  if (total <= 0) {
    ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(140,170,220,0.12)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(140,170,220,0.06)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--panel').trim() || '#222225';
    ctx.fill();
    return;
  }
  entries.forEach(c => {
    const frac = catTotals[c] / total;
    const end = start + frac * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rOuter, start, end);
    ctx.closePath();
    ctx.fillStyle = CAT_COLOR[c] || '#999999';
    ctx.fill();
    start = end;
  });
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export let lastBudgetData = { cats: [], catTotals: {}, monthBudgets: {} };
export function drawBudgetChart(catTotals, monthBudgets) {
  const canvas = document.getElementById('budgetChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = 180;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const CATS = _getCatsFn();
  const cats = CATS.filter(c => monthBudgets[c]);
  lastBudgetData = { cats, catTotals, monthBudgets };
  const emptyNote = document.getElementById('budgetChartEmpty');
  if (cats.length === 0) {
    if (emptyNote) emptyNote.textContent = 'Define presupuestos por categoría (arriba, en "Presupuestos") para ver esta comparación.';
    return;
  }
  if (emptyNote) emptyNote.textContent = '';

  const padL = 8, padR = 8, padT = 14, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const maxV = Math.max(1, ...cats.map(c => Math.max(monthBudgets[c], catTotals[c] || 0)));
  const groupW = plotW / cats.length;
  const barW = Math.min(26, groupW * 0.28);

  cats.forEach((c, i) => {
    const groupCenter = padL + groupW * (i + 0.5);
    const budget = monthBudgets[c] || 0;
    const spent = catTotals[c] || 0;
    const budgetH = (budget / maxV) * plotH;
    const spentH = (spent / maxV) * plotH;
    const ratio = budget > 0 ? spent / budget : 0;
    const spentColor = ratio < 0.7 ? '#22C55E' : (ratio <= 1 ? '#FBBF24' : '#EF4444');

    ctx.fillStyle = 'rgba(166,152,156,0.35)';
    ctx.fillRect(groupCenter - barW - 2, padT + plotH - budgetH, barW, budgetH);

    ctx.fillStyle = spentColor;
    ctx.fillRect(groupCenter + 2, padT + plotH - spentH, barW, spentH);

    ctx.fillStyle = 'rgba(243,238,239,0.55)';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(c.length > 10 ? c.slice(0, 9) + '…' : c, groupCenter, h - 8);
  });
}

export function getProjectionData() {
  const goals = _getGoalsFn();
  const tx = _getTxFn();
  const activeGoals = goals.filter(g => !_goalProgressFn(g).completed);
  if (activeGoals.length === 0) return null;
  const g = activeGoals[0];
  const goalTx = tx.filter(t => t.type === 'saving' && t.goalId === g.id);

  const monthTotals = {};
  goalTx.forEach(t => { const mk = monthKey(t.date); monthTotals[mk] = (monthTotals[mk] || 0) + t.amt; });
  const months = Object.keys(monthTotals).sort();

  let cum = 0;
  const history = months.map(mk => { cum += monthTotals[mk]; return { mk, cum }; });
  const currentTotal = cum;
  const remaining = Math.max(0, g.target - currentTotal);

  const recentMonths = months.slice(-6);
  const avgRate = recentMonths.length ? recentMonths.reduce((s, mk) => s + monthTotals[mk], 0) / recentMonths.length : 0;

  return { goal: g, history, currentTotal, remaining, avgRate, othersCount: activeGoals.length - 1 };
}

export function drawProjectionChart() {
  const canvas = document.getElementById('projectionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = 180;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const data = getProjectionData();
  const emptyNote = document.getElementById('projectionChartEmpty');

  if (!data) {
    if (emptyNote) emptyNote.textContent = 'Crea una meta de ahorro para ver tu proyección.';
    return;
  }
  if (data.history.length === 0) {
    if (emptyNote) emptyNote.textContent = `Todavía no tienes ahorros registrados para "${data.goal.name}".`;
    return;
  }
  if (data.avgRate <= 0) {
    if (emptyNote) emptyNote.textContent = `A tu ritmo actual no alcanzarías "${data.goal.name}". Intenta ahorrar algo este mes.`;
  } else {
    const monthsLeft = Math.ceil(data.remaining / data.avgRate);
    const target = new Date(); target.setMonth(target.getMonth() + monthsLeft);
    const label = target.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    if (emptyNote) {
      emptyNote.textContent = data.remaining <= 0
        ? `¡"${data.goal.name}" ya está completa!`
        : `A tu ritmo actual (${fmt(data.avgRate)}/mes), la completarías en ${label}.`;
      if (data.othersCount > 0) emptyNote.textContent += ` (mostrando tu primera meta activa)`;
    }
  }

  const points = data.history.map(h => ({ label: h.mk, val: h.cum, projected: false }));
  if (data.avgRate > 0 && data.remaining > 0) {
    let cum = data.currentTotal;
    let mDate = new Date();
    for (let i = 1; i <= 24 && cum < data.goal.target; i++) {
      mDate.setMonth(mDate.getMonth() + 1);
      cum += data.avgRate;
      points.push({ label: monthKeyFromDate(mDate), val: Math.min(cum, data.goal.target * 1.05), projected: true });
    }
  }
  if (points.length < 2) points.unshift({ label: 'inicio', val: 0, projected: false });

  const padL = 8, padR = 8, padT = 16, padB = 22;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const maxV = Math.max(data.goal.target, ...points.map(p => p.val)) * 1.05;
  const x = i => padL + (points.length === 1 ? plotW / 2 : (plotW / (points.length - 1)) * i);
  const y = v => padT + plotH - (v / maxV) * plotH;

  const targetY = y(data.goal.target);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(padL, targetY); ctx.lineTo(w - padR, targetY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#FBBF24'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText('Meta: ' + fmt(data.goal.target), padL + 2, targetY - 4);

  const firstProjIdx = points.findIndex(p => p.projected);
  ctx.beginPath();
  points.forEach((p, i) => { const px = x(i), py = y(p.val); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
  ctx.strokeStyle = 'rgba(63,165,122,0.9)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  if (firstProjIdx > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, x(firstProjIdx) - padL, plotH);
    ctx.clip();
    points.forEach((p, i) => { const px = x(i), py = y(p.val); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.stroke();
    ctx.restore();
  } else if (firstProjIdx === -1) {
    ctx.stroke();
  }

  if (firstProjIdx > 0) {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(212,175,55,0.9)';
    ctx.beginPath();
    for (let i = firstProjIdx - 1; i < points.length; i++) {
      const px = x(i), py = y(points[i].val);
      if (i === firstProjIdx - 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(p.val), 2.4, 0, Math.PI * 2);
    ctx.fillStyle = p.projected ? 'rgba(212,175,55,0.9)' : 'rgba(63,165,122,0.9)';
    ctx.fill();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    drawBalanceChart(lastSeries);
    drawFlowChart(lastFlow);
    drawBudgetChart(lastBudgetData.catTotals, lastBudgetData.monthBudgets);
    drawProjectionChart();
  });
}
