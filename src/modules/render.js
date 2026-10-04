// Alejo OS · Main Render & Insights Module
import {
  monthKey,
  monthKeyFromDate,
  normalizeAccountId,
  fmt,
  catIcon,
  escapeHtml,
  animateNumber
} from '../core/utils.js';

let _getCursorFn = () => new Date();
let _getTxFn = () => [];
let _getCatsFn = () => [];
let _getCatColorFn = () => ({});
let _getGoalsFn = () => [];
let _goalProgressFn = () => ({});
let _getBudgetsForMonthFn = () => ({});
let _getCurrentAccountTotalsFn = () => ({});
let _getAlertThresholdFn = () => null;
let _getCurrentActiveTabFn = () => 'finance';
let _getMonthlySeriesFn = () => [];
let _getFlowSeriesFn = () => [];
let _renderAccountsFn = () => {};
let _renderCreditCardPanelFn = () => {};
let _renderMotorcycleMaintenanceFn = () => {};
let _renderBudgetFormFn = () => {};
let _renderGoalsFn = () => {};
let _renderBalanceFn = () => {};
let _drawDonutFn = () => {};
let _drawFlowChartFn = () => {};
let _drawBudgetChartFn = () => {};
let _drawProjectionChartFn = () => {};
let _deleteTxFn = () => {};
let _editTxFn = () => {};
let _txSearchTextFn = () => '';
let _txRowHtmlFn = () => '';
let _getTxTypeFilterFn = () => 'all';
let _getTxSearchFn = () => '';

export function registerRenderDeps(deps) {
  if (deps.getCursor) _getCursorFn = deps.getCursor;
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.getCats) _getCatsFn = deps.getCats;
  if (deps.getCatColor) _getCatColorFn = deps.getCatColor;
  if (deps.getGoals) _getGoalsFn = deps.getGoals;
  if (deps.goalProgress) _goalProgressFn = deps.goalProgress;
  if (deps.getBudgetsForMonth) _getBudgetsForMonthFn = deps.getBudgetsForMonth;
  if (deps.getCurrentAccountTotals) _getCurrentAccountTotalsFn = deps.getCurrentAccountTotals;
  if (deps.getAlertThreshold) _getAlertThresholdFn = deps.getAlertThreshold;
  if (deps.getCurrentActiveTab) _getCurrentActiveTabFn = deps.getCurrentActiveTab;
  if (deps.getMonthlySeries) _getMonthlySeriesFn = deps.getMonthlySeries;
  if (deps.getFlowSeries) _getFlowSeriesFn = deps.getFlowSeries;
  if (deps.renderAccounts) _renderAccountsFn = deps.renderAccounts;
  if (deps.renderCreditCardPanel) _renderCreditCardPanelFn = deps.renderCreditCardPanel;
  if (deps.renderMotorcycleMaintenance) _renderMotorcycleMaintenanceFn = deps.renderMotorcycleMaintenance;
  if (deps.renderBudgetForm) _renderBudgetFormFn = deps.renderBudgetForm;
  if (deps.renderGoals) _renderGoalsFn = deps.renderGoals;
  if (deps.renderBalance) _renderBalanceFn = deps.renderBalance;
  if (deps.drawDonut) _drawDonutFn = deps.drawDonut;
  if (deps.drawFlowChart) _drawFlowChartFn = deps.drawFlowChart;
  if (deps.drawBudgetChart) _drawBudgetChartFn = deps.drawBudgetChart;
  if (deps.drawProjectionChart) _drawProjectionChartFn = deps.drawProjectionChart;
  if (deps.deleteTx) _deleteTxFn = deps.deleteTx;
  if (deps.editTx) _editTxFn = deps.editTx;
  if (deps.txSearchText) _txSearchTextFn = deps.txSearchText;
  if (deps.txRowHtml) _txRowHtmlFn = deps.txRowHtml;
  if (deps.getTxTypeFilter) _getTxTypeFilterFn = deps.getTxTypeFilter;
  if (deps.getTxSearch) _getTxSearchFn = deps.getTxSearch;
}

export function renderAnalysis(monthTx, income, expense) {
  const cursor = _getCursorFn();
  const mk = monthKey(cursor);
  const now = new Date();
  const isCurrentMonth = mk === monthKeyFromDate(now);
  const y = parseInt(mk.slice(0, 4), 10), m = parseInt(mk.slice(5, 7), 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  let daysElapsed = daysInMonth;
  if (isCurrentMonth) daysElapsed = Math.max(1, Math.min(daysInMonth, now.getDate()));
  const avgDaily = expense / daysElapsed;
  animateNumber('anAvgDaily', avgDaily);
  const anAvgDailySub = document.getElementById('anAvgDailySub');
  if (anAvgDailySub) anAvgDailySub.textContent = `sobre ${daysElapsed} día${daysElapsed === 1 ? '' : 's'} transcurrido${daysElapsed === 1 ? '' : 's'}`;
  const daysLeft = daysInMonth - daysElapsed;
  const anDaysLeft = document.getElementById('anDaysLeft');
  const anDaysSub = document.getElementById('anDaysSub');
  if (anDaysLeft) anDaysLeft.textContent = isCurrentMonth ? String(daysLeft) : '—';
  if (anDaysSub) anDaysSub.textContent = isCurrentMonth ? `faltan ${daysLeft} para terminar el mes` : 'mes cerrado';
}

export function renderInsights() {
  const grid = document.getElementById('insightsGrid');
  if (!grid) return;
  const cursor = _getCursorFn();
  const mk = monthKey(cursor);
  const tx = _getTxFn();
  const monthTx = tx.filter(t => monthKey(t.date) === mk);
  const tiles = [];

  const catT = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => { catT[t.cat] = (catT[t.cat] || 0) + t.amt; });
  const topCat = Object.keys(catT).sort((a, b) => catT[b] - catT[a])[0];
  if (topCat) {
    tiles.push(`<div class="insight-tile"><div class="tag">Top categoría del mes</div><div class="val gold">${escapeHtml(topCat)}</div><div class="sub">${fmt(catT[topCat])} gastados</div></div>`);
  } else {
    tiles.push(`<div class="insight-tile"><div class="tag">Top categoría del mes</div><div class="val">—</div><div class="sub">sin gastos este mes</div></div>`);
  }

  const monthsMap = {};
  tx.filter(t => t.type === 'expense').forEach(t => { const k = monthKey(t.date); monthsMap[k] = (monthsMap[k] || 0) + t.amt; });
  const maxMonthKey = Object.keys(monthsMap).sort((a, b) => monthsMap[b] - monthsMap[a])[0];
  if (maxMonthKey) {
    const mm = new Date(maxMonthKey + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    tiles.push(`<div class="insight-tile"><div class="tag">Mes con mayor gasto</div><div class="val red">${fmt(monthsMap[maxMonthKey])}</div><div class="sub">${mm}</div></div>`);
  } else {
    tiles.push(`<div class="insight-tile"><div class="tag">Mes con mayor gasto</div><div class="val">—</div><div class="sub">sin historial aún</div></div>`);
  }

  const series = _getMonthlySeriesFn();
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    const s = series[i];
    const hadData = tx.some(t => monthKey(t.date) === s.mk);
    if (!hadData) continue;
    if (s.net >= 0) streak++;
    else break;
  }
  tiles.push(`<div class="insight-tile"><div class="tag">Racha de superávit</div><div class="val ${streak > 0 ? 'green' : ''}">${streak} mes${streak === 1 ? '' : 'es'}</div><div class="sub">meses seguidos con saldo positivo</div></div>`);

  const y0 = parseInt(mk.slice(0, 4), 10);
  const ytx = tx.filter(t => monthKey(t.date).slice(0, 4) === String(y0));
  const yInc = ytx.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
  const yExp = ytx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amt, 0);
  tiles.push(`<div class="insight-tile"><div class="tag">Año ${y0} · ingresos vs gastos</div><div class="val ${yInc >= yExp ? 'green' : 'red'}">${fmt(yInc - yExp)}</div><div class="sub">balance acumulado del año</div></div>`);

  const last6Mk = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); last6Mk.push(monthKeyFromDate(d)); }
  const catMonths = {};
  tx.filter(t => t.type === 'expense').forEach(t => { const k = monthKey(t.date); if (last6Mk.includes(k)) { if (!catMonths[t.cat]) catMonths[t.cat] = {}; catMonths[t.cat][k] = 1; } });
  const recurrent = Object.keys(catMonths).map(c => {
    const months = Object.keys(catMonths[c]);
    const vals = months.map(mk0 => tx.filter(t => t.type === 'expense' && t.cat === c && monthKey(t.date) === mk0).reduce((s, t) => s + t.amt, 0));
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { c, n: months.length, avg };
  }).filter(r => r.n >= 3).sort((a, b) => b.avg - a.avg);

  if (recurrent.length) {
    tiles.push(`<div class="insight-tile" style="grid-column:span 2;"><div class="tag">Posibles gastos fijos · últimos 6 meses</div>
      <div class="recurrent-badges">${recurrent.map(r => `<span class="recurrent-badge">${escapeHtml(r.c)} · ${r.n}/6 meses · <b>${fmt(r.avg)}/mes</b></span>`).join('')}</div>
      <div class="sub" style="margin-top:8px;">Se repiten casi todos los meses. Revisa si puedes ajustarlos.</div>
    </div>`);
  }

  grid.innerHTML = tiles.join('');
}

export function refreshAnalysisVisibility() {
  const cursor = _getCursorFn();
  const mk = monthKey(cursor);
  const tx = _getTxFn();
  const CATS = _getCatsFn();
  const goals = _getGoalsFn();
  const monthTx = tx.filter(t => monthKey(t.date) === mk);
  const monthExp = monthTx.filter(t => t.type === 'expense');
  const monthBudgets = _getBudgetsForMonthFn(mk);
  const hasBudgets = CATS.some(c => monthBudgets[c]);
  const hasExpenses = monthExp.length > 0;
  const hasTransactions = tx.length > 0;
  const hasGoal = goals.some(g => !_goalProgressFn(g).completed);

  function manageChartRow(detailsId, rowClass, panels, summaryId, visibleText) {
    const details = document.getElementById(detailsId);
    const row = details && details.querySelector('[data-chart-row]');
    const summary = document.getElementById(summaryId);
    if (!details) return;
    let visibleCount = 0;
    if (panels.left) visibleCount++;
    if (panels.right) visibleCount++;
    if (visibleCount === 0) {
      details.open = false;
      details.classList.add('hidden');
      return;
    }
    details.classList.remove('hidden');
    if (summary) summary.textContent = visibleText || '';
    if (row) {
      row.classList.toggle('single', visibleCount === 1);
      const panelEls = row.querySelectorAll('.panel');
      panelEls[0] && panelEls[0].classList.toggle('hidden', !panels.left);
      panelEls[1] && panelEls[1].classList.toggle('hidden', !panels.right);
    }
  }

  manageChartRow('flowAnalysisSection', '', { left: hasTransactions, right: hasExpenses }, 'flowSectionNote', '');
  manageChartRow('budgetAnalysisSection', '', { left: hasExpenses && hasBudgets, right: hasGoal }, 'budgetSectionNote', '');
  document.getElementById('balanceDetails')?.classList.toggle('hidden', !hasTransactions);

  const insights = document.getElementById('insightsDetails');
  const insightsGrid = document.getElementById('insightsGrid');
  const hasInsights = insightsGrid && insightsGrid.innerHTML.trim() !== '';
  if (insights) {
    if (!hasInsights) {
      insights.open = false;
      insights.classList.add('hidden');
    } else {
      insights.classList.remove('hidden');
    }
  }
}

export function render() {
  const cursor = _getCursorFn();
  const cursorKey = monthKey(cursor);
  const budgetForm = document.getElementById('budgetForm');
  if (budgetForm && !budgetForm.classList.contains('hidden') && budgetForm.dataset.month !== cursorKey) {
    _renderBudgetFormFn();
  }
  const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 680;
  const monthLabel = document.getElementById('monthLabel');
  if (monthLabel) monthLabel.textContent = cursor.toLocaleDateString('es-ES', { month: isNarrow ? 'short' : 'long', year: 'numeric' });
  
  const currentActiveTab = _getCurrentActiveTabFn();
  if (currentActiveTab === 'finance') {
    const subEl = document.getElementById('heroSubtitle');
    if (subEl) subEl.textContent = 'Resumen financiero de ' + cursor.toLocaleDateString('es-ES', { month: 'long' });
  }

  const tx = _getTxFn();
  const monthTx = tx.filter(t => monthKey(t.date) === cursorKey).sort((a, b) => b.date.localeCompare(a.date));
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
  const expense = monthTx.filter(t => t.type === 'expense' && normalizeAccountId(t.account) !== 'tc').reduce((s, t) => s + t.amt, 0);
  const saved = monthTx.filter(t => t.type === 'saving').reduce((s, t) => s + t.amt, 0);
  const free = income - expense - saved;

  _renderAccountsFn();
  _renderCreditCardPanelFn();
  _renderMotorcycleMaintenanceFn();

  const currentTotals = _getCurrentAccountTotalsFn();
  const liquidCashTotal = ['guayaquil', 'deuna', 'cash'].reduce((sum, id) => sum + (currentTotals[id] ? currentTotals[id].balance : 0), 0);
  animateNumber('heroBalance', liquidCashTotal);
  
  const heroChange = document.getElementById('heroChange');
  if (heroChange) {
    const prevMonthDate = new Date(cursor);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMkKey = monthKeyFromDate(prevMonthDate);
    const prevSeries = _getMonthlySeriesFn();
    const prevEntry = prevSeries.find(s => s.mk === prevMkKey);
    const prevAcc = prevEntry ? prevEntry.acc : 0;
    const prevMonthName = prevMonthDate.toLocaleDateString('es-ES', { month: 'long' });
    
    if (Math.abs(prevAcc) > 0.005) {
      const pSign = prevAcc > 0 ? '+' : '−';
      heroChange.innerHTML = `<span class="pos">${pSign}${fmt(Math.abs(prevAcc))}</span> <span style="opacity:0.85;">del mes anterior (${prevMonthName})</span>`;
    } else {
      heroChange.innerHTML = `<span style="opacity:0.75;">Sin saldo del mes anterior</span>`;
    }
  }

  animateNumber('chipIncome', income);
  animateNumber('chipExpense', expense);
  animateNumber('chipSaving', saved);

  const prevMkCmp = new Date(cursor); prevMkCmp.setMonth(prevMkCmp.getMonth() - 1);
  const prevMkCmpKey = monthKeyFromDate(prevMkCmp);
  const prevTxCmp = tx.filter(t => monthKey(t.date) === prevMkCmpKey);
  const prevIncCmp = prevTxCmp.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
  const prevExpCmp = prevTxCmp.filter(t => t.type === 'expense').reduce((s, t) => s + t.amt, 0);
  const prevSavCmp = prevTxCmp.filter(t => t.type === 'saving').reduce((s, t) => s + t.amt, 0);

  const chipSub = (id, cur, prev, invert) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (prev > 0) {
      const diff = cur - prev;
      const pct = Math.round((diff / prev) * 100);
      const up = diff > 0;
      const good = invert ? !up : up;
      el.className = 'sub ' + (Math.abs(diff) < 0.01 ? 'flat' : (good ? 'up' : 'down'));
      el.textContent = Math.abs(diff) < 0.01 ? 'igual que el mes pasado' : (up ? '+' : '') + fmt(diff) + ` (${pct > 0 ? '+' : ''}${pct}%) vs mes pasado`;
    } else if (cur > 0) {
      el.className = 'sub up';
      el.textContent = 'el mes pasado fue $0';
    } else {
      el.className = 'sub flat';
      el.textContent = '';
    }
  };
  chipSub('chipIncomeSub', income, prevIncCmp, false);
  chipSub('chipExpenseSub', expense, prevExpCmp, true);
  chipSub('chipSavingSub', saved, prevSavCmp, false);

  const banner = document.getElementById('alertBanner');
  const alertThreshold = _getAlertThresholdFn();
  if (banner) {
    if (alertThreshold != null && free < alertThreshold) {
      banner.classList.remove('hidden');
      banner.textContent = `⚠️ Tu disponible de este mes (${fmt(free)}) está por debajo de tu umbral de ${fmt(alertThreshold)}.`;
    } else {
      banner.classList.add('hidden');
    }
  }

  let healthScore;
  if (income > 0) healthScore = Math.max(0, Math.min(100, Math.round(((income - expense) / income) * 100)));
  else healthScore = expense > 0 ? 0 : 100;
  const healthFill = document.getElementById('healthFill');
  const healthPct = document.getElementById('healthPct');
  const healthMsg = document.getElementById('healthMsg');
  if (healthFill) healthFill.style.width = healthScore + '%';
  if (healthPct) healthPct.textContent = healthScore + '%';
  if (healthMsg) {
    const msg = healthScore >= 70 ? 'Buen control este mes 👍' : healthScore >= 40 ? 'Vas bien, sigue así' : 'Cuidado: estás gastando cerca (o más) de lo que ingresa';
    healthMsg.textContent = msg;
  }

  renderAnalysis(monthTx, income, expense);
  renderInsights();

  const monthBudgets = _getBudgetsForMonthFn(cursorKey);
  const catTotals = {};
  const CATS = _getCatsFn();
  const CAT_COLOR = _getCatColorFn();
  CATS.forEach(c => { catTotals[c] = 0; });
  monthTx.filter(t => t.type === 'expense').forEach(t => { catTotals[t.cat] = (catTotals[t.cat] || 0) + t.amt; });
  const maxCat = Math.max(1, ...Object.values(catTotals));
  const catBars = document.getElementById('catBars');
  const visibleCats = CATS.filter(c => catTotals[c] > 0 || monthBudgets[c]).sort((a, b) => catTotals[b] - catTotals[a]);
  if (catBars) {
    if (visibleCats.length === 0) {
      catBars.innerHTML = '<div class="cat-empty">Sin categorías activas este mes. Registra un gasto o configura un presupuesto para este mes.</div>';
    } else {
      catBars.innerHTML = visibleCats.map(c => {
        const spent = catTotals[c]; const budget = monthBudgets[c];
        let fillPct, fillClass, extra = '';
        if (budget) {
          const ratio = spent / budget;
          fillPct = Math.min(100, ratio * 100);
          fillClass = ratio < 0.7 ? 'ok' : (ratio <= 1 ? 'warn' : 'over');
          extra = ` / ${fmt(budget)}${ratio > 1 ? ' ⚠️' : ''}`;
        } else {
          fillPct = (spent / maxCat) * 100;
          fillClass = 'neutral';
        }
        return `<div class="cat-row">
          <span class="name">${catIcon(c)}${escapeHtml(c)}</span>
          <div class="track"><div class="fill ${fillClass}" style="width:${fillPct}%"></div></div>
          <span class="amt">${fmt(spent)}${extra}</span>
        </div>`;
      }).join('');
    }
  }

  const totalExpense = Object.values(catTotals).reduce((a, b) => a + b, 0);
  const donutLegend = document.getElementById('donutLegend');
  if (donutLegend) {
    if (totalExpense <= 0) {
      donutLegend.innerHTML = '<div class="donut-empty">Sin gastos este mes.</div>';
    } else {
      donutLegend.innerHTML = CATS.filter(c => catTotals[c] > 0).sort((a, b) => catTotals[b] - catTotals[a]).map(c => `
        <div class="drow">
          <span class="dname"><span class="dsw" style="background:${CAT_COLOR[c]}"></span>${escapeHtml(c)}</span>
          <span class="dval">${Math.round((catTotals[c] / totalExpense) * 100)}%</span>
        </div>`).join('');
    }
  }
  _drawDonutFn(catTotals, totalExpense);
  _drawFlowChartFn(_getFlowSeriesFn());
  _drawBudgetChartFn(catTotals, monthBudgets);
  _drawProjectionChartFn();

  const list = document.getElementById('txList');
  if (list) {
    list.onclick = e => {
      const delBtn = e.target.closest('.del');
      if (delBtn) { _deleteTxFn(parseInt(delBtn.dataset.delId, 10)); return; }
      const editBtn = e.target.closest('.edit');
      if (editBtn) { _editTxFn(parseInt(editBtn.dataset.editId, 10)); return; }
    };
    let filtered = monthTx;
    const filter = _getTxTypeFilterFn();
    if (filter !== 'all') filtered = filtered.filter(t => t.type === filter);
    const search = _getTxSearchFn().trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(t => _txSearchTextFn(t).includes(search));
    }
    const txCount = document.getElementById('txCount');
    if (txCount) txCount.textContent = filtered.length + ' de ' + monthTx.length + ' este mes';
    if (filtered.length === 0) {
      list.innerHTML = '<div class="tx-empty-note"><span class="eicon">🔎</span>' + (monthTx.length === 0 ? 'Sin movimientos este mes. Toca "Nuevo movimiento" para empezar.' : 'No hay resultados con ese filtro.') + '</div>';
    } else {
      const groups = {};
      filtered.forEach(t => { (groups[t.date] = groups[t.date] || []).push(t); });
      list.innerHTML = Object.keys(groups).sort().reverse().map(date => {
        const items = groups[date];
        const d = new Date(date + 'T00:00:00');
        const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
        let inc = 0, exp = 0, transfers = 0;
        items.forEach(t => { if (t.type === 'income') inc += t.amt; else if (t.type === 'expense') exp += t.amt; else if (t.type === 'withdrawal') transfers += t.amt; });
        const sumParts = [];
        if (inc > 0) sumParts.push(`<span class="pos">+${fmt(inc)}</span>`);
        if (exp > 0) sumParts.push(`<span class="neg">−${fmt(exp)}</span>`);
        if (transfers > 0) sumParts.push(`<span class="transfer">↔${fmt(transfers)}</span>`);
        return `<div class="day-group">
          <div class="day-group-head"><span class="ddate"><span class="wd">${dayLabel}</span></span><span class="dsum">${sumParts.join(' · ')}</span></div>
          ${items.map(t => _txRowHtmlFn(t, false)).join('')}
        </div>`;
      }).join('');
    }
  }

  _renderGoalsFn();
  _renderBalanceFn();
  refreshAnalysisVisibility();
}
