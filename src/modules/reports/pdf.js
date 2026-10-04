// Alejo OS · PDF Export Module
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { fmt, dateKey, normalizeAccountId, getAccountMeta } from '../../core/utils.js';
import { drawDonutToCanvas, drawFlowBarsToCanvas, drawBudgetBarsToCanvas, drawLineChartCanvas } from '../charts/charts.js';

let _getTxFn = () => [];
let _getAccountBalancesFn = () => null;
let _getGoalsFn = () => [];
let _goalProgressFn = () => ({});
let _getBudgetsForMonthFn = () => ({});
let _getAccountTotalsFn = () => ({});

export function registerPdfDeps(deps) {
  if (deps.getTx) _getTxFn = deps.getTx;
  if (deps.getAccountBalances) _getAccountBalancesFn = deps.getAccountBalances;
  if (deps.getGoals) _getGoalsFn = deps.getGoals;
  if (deps.goalProgress) _goalProgressFn = deps.goalProgress;
  if (deps.getBudgetsForMonth) _getBudgetsForMonthFn = deps.getBudgetsForMonth;
  if (deps.getAccountTotals) _getAccountTotalsFn = deps.getAccountTotals;
}

export function initPdfExport() {
document.getElementById('exportPdfBtn')?.addEventListener('click', async ()=>{
  const tx = _getTxFn();
  const accountBalances = _getAccountBalancesFn();
  const goals = _getGoalsFn();
  const goalProgress = _goalProgressFn;
  const getBudgetsForMonth = _getBudgetsForMonthFn;
  const getAccountTotals = _getAccountTotalsFn;

  if(!jsPDF){
    alert('No se pudo cargar el generador de PDF. Revisa tu conexión a internet e intenta de nuevo.');
    return;
  }
  if(tx.length===0){ alert('Todavía no tienes movimientos para exportar.'); return; }

  // jsPDF imported at top
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mx = 14;
  const usableW = pageW - mx*2;

  const C = {
    text:[28,28,33], textSoft:[113,113,122], line:[228,228,233],
    gold:[244,63,94], goldDark:[190,18,60], goldSoft:[255,241,242],
    headerBg:[18,6,12],
    green:[16,185,129], greenSoft:[240,253,244],
    red:[251,113,133], redSoft:[254,242,242],
    blue:[59,130,246], blueSoft:[239,246,255],
    amber:[217,119,6], amberSoft:[254,252,232],
    ink:[71,85,105]
  };
  let currentY = 0;
  const now = new Date();
  const fmtMk = mk => new Date(mk+'-01T00:00:00').toLocaleDateString('es-ES',{month:'long', year:'numeric'});

  function ensureSpace(needed){
    if(currentY + needed > pageH - 15){
      doc.addPage();
      currentY = 16;
    }
  }
  function sectionHeader(num, title, subtitle){
    ensureSpace(22);
    currentY += 4;
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...C.gold);
    doc.text((num ? num+'.  ' : '') + title.toUpperCase(), mx, currentY);
    currentY += 4.5;
    if(subtitle){
      doc.setFont('helvetica','normal'); doc.setFontSize(8.2); doc.setTextColor(...C.textSoft);
      doc.text(subtitle, mx, currentY);
      currentY += 3.5;
    }
    doc.setDrawColor(...C.line); doc.setLineWidth(0.3);
    doc.line(mx, currentY, pageW-mx, currentY);
    currentY += 5;
  }

  // ===== PORTADA CRIMSON PRO (Alejo OS) =====
  doc.setFillColor(...C.headerBg); doc.rect(0,0,pageW,38,'F');
  doc.setFillColor(...C.gold); doc.rect(0,38,pageW,1.5,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(255,255,255);
  doc.text('Alejo OS · Informe Financiero', mx, 14);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(255,225,230);
  doc.text('Centro de Control Personal & Gestión Patrimonial', mx, 21);
  const allMk = tx.map(t=>monthKey(t.date)).sort();
  const firstMk = allMk[0] || cursorKey();
  const lastMk = allMk[allMk.length-1] || cursorKey();
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(255,240,243);
  doc.text('Periodo: ' + fmtMk(firstMk) + '  →  ' + fmtMk(lastMk), mx, 31);
  doc.text('Emitido: ' + now.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}) + ' · ' + now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}), pageW-mx, 31, {align:'right'});
  currentY = 48;

  // ===== 1. RESUMEN HISTORICO =====
  sectionHeader(1, 'Resumen histórico', 'Totales acumulados de todo tu historial');
  const tInc = tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
  const tExp = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
  const tSav = tx.filter(t=>t.type==='saving').reduce((s,t)=>s+t.amt,0);
  const tBal = tInc - tExp - tSav;
  const cardW = (usableW-9)/4, cardH = 27;
  function drawCard(x,y,w,h,label,value,color,soft,foot){
    doc.setFillColor(255,255,255); doc.setDrawColor(...C.line); doc.setLineWidth(0.2);
    doc.roundedRect(x,y,w,h,2,2,'FD');
    doc.setFillColor(...color); doc.roundedRect(x,y,w,1.1,0.5,0.5,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...C.textSoft);
    doc.text(label.toUpperCase(), x+w/2, y+6.5, {align:'center'});
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...C.text);
    doc.text(fmt(value), x+w/2, y+14, {align:'center'});
    doc.setFillColor(...soft);
    doc.roundedRect(x, y+h-4.5, w, 4.5, 0,0,'F');
    doc.setFont('helvetica','italic'); doc.setFontSize(6.3); doc.setTextColor(...color);
    doc.text(foot, x+w/2, y+h-1.4, {align:'center'});
  }
  drawCard(mx, currentY, cardW, cardH, 'Ingresos', tInc, C.green, C.greenSoft, 'Total acumulado');
  drawCard(mx+cardW+3, currentY, cardW, cardH, 'Gastos', tExp, C.red, C.redSoft, 'Total acumulado');
  drawCard(mx+(cardW+3)*2, currentY, cardW, cardH, 'Ahorros', tSav, C.blue, C.blueSoft, 'Total acumulado');
  drawCard(mx+(cardW+3)*3, currentY, cardW, cardH, 'Balance', tBal, tBal>=0?C.green:C.red, tBal>=0?C.greenSoft:C.redSoft, tBal>=0?'Superávit global':'Déficit global');
  currentY += cardH + 9;
  ensureSpace(28);
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...C.textSoft);
  doc.text('Saldos por cuenta', mx, currentY+2);
  currentY += 5;
  const pdfAccountTotals = getCurrentAccountTotals();
  const pdfAccounts = getAccountOptions(Object.prototype.hasOwnProperty.call(pdfAccountTotals,'unassigned'));
  doc.autoTable({
    startY: currentY,
    margin:{left:mx,right:mx},
    head:[['Cuenta','Ingresos','Gastos','Ahorro','Saldo']],
    body: pdfAccounts.map(account=>{
      const values = pdfAccountTotals[account.id] || { income:0, expense:0, saving:0, balance:0 };
      return [account.name, fmt(values.income), fmt(values.expense), fmt(values.saving), fmt(values.balance)];
    }),
    styles:{font:'helvetica',fontSize:8.5,halign:'right',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
    headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
    alternateRowStyles:{fillColor:[252,252,254]},
    columnStyles:{0:{halign:'left'},4:{fontStyle:'bold',textColor:C.gold}}
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ===== 2. SALUD FINANCIERA (Sin colisión de textos) =====
  const mk = cursorKey();
  const monthTx = tx.filter(t=>monthKey(t.date)===mk);
  const mInc = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
  const mExp = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
  const healthScore = mInc>0 ? Math.max(0,Math.min(100,Math.round(((mInc-mExp)/mInc)*100))) : (mExp>0?0:100);
  sectionHeader(2, 'Salud financiera', 'Mes de ' + cursor.toLocaleDateString('es-ES',{month:'long', year:'numeric'}));
  
  ensureSpace(24);
  const barW = usableW * 0.65, barH = 5;
  doc.setFillColor(235,235,237); doc.roundedRect(mx, currentY, barW, barH, barH/2, barH/2, 'F');
  if(healthScore > 0){
    const grad = healthScore>=70 ? C.green : (healthScore>=40 ? C.amber : C.red);
    doc.setFillColor(...grad);
    doc.roundedRect(mx, currentY, barW*(healthScore/100), barH, barH/2, barH/2, 'F');
  }
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...C.text);
  doc.text(healthScore + '%', mx + barW + 5, currentY + 4);
  
  currentY += barH + 4;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...C.textSoft);
  const healthMsg = healthScore>=70 
    ? 'Excelente control: estás gastando menos de lo que ingresas y generando ahorro.' 
    : (healthScore>=40 ? 'Rango equilibrado: vigila los gastos imprevistos y mantén tus presupuestos.' : 'Alerta: tus gastos superan o están muy cerca de tus ingresos.');
  doc.text(healthMsg, mx, currentY);
  
  currentY += 4.5;
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...C.ink);
  doc.text('Ingresos de ' + cursor.toLocaleDateString('es-ES',{month:'short'}) + ': ' + fmt(mInc) + '    |    Gastos: ' + fmt(mExp) + '    |    Balance neto: ' + (mInc-mExp>=0?'+':'') + fmt(mInc-mExp), mx, currentY);
  currentY += 8;

  // ===== 3. RANKING DE CATEGORIAS (Sin colisión de barras ni texto) =====
  sectionHeader(3, 'Ranking de categorías', 'Categorías con mayor consumo durante ' + cursor.toLocaleDateString('es-ES',{month:'long', year:'numeric'}));
  const catT = {};
  monthTx.filter(t=>t.type==='expense').forEach(t=>{ catT[t.cat]=(catT[t.cat]||0)+t.amt; });
  const catSorted = Object.keys(catT).sort((a,b)=>catT[b]-catT[a]);
  const totalCat = catSorted.reduce((s,c)=>s+catT[c],0);
  if(catSorted.length===0){
    doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(...C.textSoft);
    doc.text('Sin gastos registrados este mes.', mx, currentY+5);
    currentY += 10;
  } else {
    const maxRank = catT[catSorted[0]] || 1;
    const barFull = usableW * 0.75;
    catSorted.slice(0,6).forEach(c=>{
      ensureSpace(12);
      const val = catT[c], pct = Math.round((val/totalCat)*100);
      const pct2 = Math.max(6, (val/maxRank)*100);
      
      // Fila 1: Nombre de categoría a la izquierda, Monto y % a la derecha
      doc.setFont('helvetica','bold'); doc.setFontSize(8.8); doc.setTextColor(...C.text);
      doc.text(c, mx, currentY + 3.5);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...C.ink);
      doc.text(fmt(val) + '  (' + pct + '%)', mx + barFull, currentY + 3.5, {align:'right'});
      
      // Fila 2: Barra de progreso situada debajo del texto
      currentY += 5;
      doc.setFillColor(236,236,240);
      doc.roundedRect(mx, currentY, barFull, 2.8, 1, 1, 'F');
      const rgb = hexToRgb(CAT_COLOR[c]||'#F43F5E');
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(mx, currentY, barFull*(pct2/100), 2.8, 1, 1, 'F');
      
      currentY += 5.5;
    });
    currentY += 3;
  }

  // ===== 4. GASTOS FIJOS =====
  const last6 = [];
  for(let i=5;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); last6.push(monthKeyFromDate(d)); }
  const catMonths = {};
  tx.filter(t=>t.type==='expense').forEach(t=>{
    const k=monthKey(t.date);
    if(last6.includes(k)){ if(!catMonths[t.cat]) catMonths[t.cat]={}; catMonths[t.cat][k]=1; }
  });
  const recurrent = Object.keys(catMonths).map(c=>{
    const months = Object.keys(catMonths[c]);
    const vals = months.map(k=> tx.filter(t=>t.type==='expense'&&t.cat===c&&monthKey(t.date)===k).reduce((s,t)=>s+t.amt,0));
    return { c, n:months.length, avg:vals.reduce((a,b)=>a+b,0)/vals.length };
  }).filter(r=>r.n>=3).sort((a,b)=>b.avg-a.avg);
  if(recurrent.length){
    sectionHeader(4, 'Posibles gastos fijos', 'Se repiten casi todos los meses · últimos 6 meses');
    doc.autoTable({
      startY: currentY,
      margin:{left:mx,right:mx},
      head:[['Categoría','Meses','Promedio mensual']],
      body: recurrent.map(r=>[r.c, r.n+' de 6', fmt(r.avg)]),
      styles:{font:'helvetica',fontSize:9,halign:'center',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
      headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
      alternateRowStyles:{fillColor:[252,252,254]},
      columnStyles:{0:{halign:'left'}},
      didParseCell:function(data){
        if(data.section==='body' && data.column.index===2){ data.cell.styles.textColor=C.gold; data.cell.styles.fontStyle='bold'; }
      }
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // ===== 5. DISTRIBUCION DE GASTOS =====
  const allCat = {};
  tx.filter(t=>t.type==='expense').forEach(t=>{ allCat[t.cat]=(allCat[t.cat]||0)+t.amt; });
  const allCatRows = Object.keys(allCat).sort((a,b)=>allCat[b]-allCat[a]);
  const totalGastoAll = Object.values(allCat).reduce((a,b)=>a+b,0);
  sectionHeader(5, 'Distribución de gastos', 'Reparto acumulado por categoría (todo el historial)');
  if(totalGastoAll>0){
    const donutMM=44;
    const donutImg = drawDonutToCanvas(allCat,totalGastoAll,180).toDataURL('image/png');
    doc.addImage(donutImg,'PNG',mx,currentY,donutMM,donutMM);
    const tableX = mx+donutMM+8;
    const tableW = usableW-donutMM-8;
    doc.autoTable({
      startY: currentY,
      margin:{left:tableX,right:mx},
      tableWidth: tableW,
      head:[['Categoría','Monto','%']],
      body: allCatRows.map(c=>[c, fmt(allCat[c]), Math.round((allCat[c]/totalGastoAll)*100)+'%']),
      theme:'grid',
      styles:{font:'helvetica',fontSize:8.5,halign:'center',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
      headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
      alternateRowStyles:{fillColor:[252,252,254]},
      columnStyles:{0:{halign:'left'}},
      didParseCell:function(data){
        if(data.section==='body' && data.column.index===2){ data.cell.styles.fontStyle='bold'; data.cell.styles.textColor=C.gold; }
      }
    });
    currentY = Math.max(currentY+donutMM, doc.lastAutoTable.finalY) + 8;
  } else {
    doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(...C.textSoft);
    doc.text('Todavía no tienes gastos registrados.', mx, currentY+5);
    currentY += 10;
  }

  // ===== 6. FLUJO FINANCIERO =====
  sectionHeader(6, 'Flujo financiero', 'Últimos 6 meses: ingresos vs gastos');
  const flowMonths = [];
  for(let i=5;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); flowMonths.push(monthKeyFromDate(d)); }
  const flowData = flowMonths.map(fmk=>{
    const ftx = tx.filter(t=>monthKey(t.date)===fmk);
    const inc = ftx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
    const exp = ftx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
    return { mk:fmk, income:inc, expense:exp, net:inc-exp };
  });
  const flowChartW = usableW*0.5, flowChartH = 44;
  const flowImg = drawFlowBarsToCanvas(flowData, 480, 220).toDataURL('image/png');
  doc.addImage(flowImg,'PNG',mx,currentY,flowChartW,flowChartH);
  doc.autoTable({
    startY: currentY,
    margin:{left:mx+flowChartW+6,right:mx},
    tableWidth: usableW-flowChartW-6,
    head:[['Mes','Ingresos','Gastos','Saldo']],
    body: flowData.map(f=>{
      const label = new Date(f.mk+'-01T00:00:00').toLocaleDateString('es-ES',{month:'short',year:'2-digit'});
      return [label, fmt(f.income), fmt(f.expense), (f.net>=0?'+':'')+fmt(f.net)];
    }),
    styles:{font:'helvetica',fontSize:8.5,halign:'center',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
    headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
    alternateRowStyles:{fillColor:[252,252,254]},
    columnStyles:{0:{halign:'left'},3:{fontStyle:'bold'}},
    didParseCell:function(data){
      if(data.section==='body' && data.column.index===3){
        data.cell.styles.textColor = flowData[data.row.index].net>=0?C.green:C.red;
      }
    }
  });
  currentY = Math.max(currentY+flowChartH, doc.lastAutoTable.finalY) + 8;

  // ===== 7. BALANCE GENERAL =====
  const series = getMonthlySeries();
  sectionHeader(7, 'Balance general', 'Evolución del saldo acumulado, mes a mes');
  if(series.length>0){
    const labels = series.map(s=>new Date(s.mk+'-01T00:00:00').toLocaleDateString('es-ES',{month:'short',year:'2-digit'}));
    const chartImg = drawLineChartCanvas(labels, series.map(s=>s.acc), 400, 190, '#F43F5E').toDataURL('image/png');
    const chartW = usableW*0.5, chartH = 42;
    doc.addImage(chartImg,'PNG',mx,currentY,chartW,chartH);
    doc.autoTable({
      startY: currentY,
      margin:{left:mx+chartW+6,right:mx},
      tableWidth: usableW-chartW-6,
       head:[['Mes','Ingresos','Gastos','Ahorro','Saldo','Acum.']],
      body: series.slice().reverse().map(s=>{
        const label = new Date(s.mk+'-01T00:00:00').toLocaleDateString('es-ES',{month:'short',year:'2-digit'});
         return [label, fmt(s.income), fmt(s.expense), fmt(s.saved), (s.net>=0?'+':'')+fmt(s.net), fmt(s.acc)];
      }),
      styles:{font:'helvetica',fontSize:7.5,halign:'right',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
      headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
      alternateRowStyles:{fillColor:[252,252,254]},
       columnStyles:{0:{halign:'left'}},
       didParseCell:function(data){
         if(data.section==='body' && data.column.index===4){
           const net = series.slice().reverse()[data.row.index].net;
           data.cell.styles.textColor = net>=0?C.green:C.red;
           data.cell.styles.fontStyle='bold';
         }
         if(data.section==='body' && data.column.index===5){
           data.cell.styles.textColor=C.gold; data.cell.styles.fontStyle='bold';
         }
      }
    });
    currentY = Math.max(currentY+chartH, doc.lastAutoTable.finalY) + 8;
  }

  // ===== 8. PRESUPUESTO VS REAL =====
  const monthBudgets = getBudgetsForMonth(mk);
  const budgetCats = CATS.filter(c=>monthBudgets[c]);
  if(budgetCats.length>0){
    sectionHeader(8, 'Presupuesto vs. Gasto real', 'Control por categoría · ' + cursor.toLocaleDateString('es-ES',{month:'long',year:'numeric'}));
    const mCatTotals = {};
    monthTx.filter(t=>t.type==='expense').forEach(t=>{ mCatTotals[t.cat]=(mCatTotals[t.cat]||0)+t.amt; });
    const budImg = drawBudgetBarsToCanvas(budgetCats, monthBudgets, mCatTotals, 520, 200).toDataURL('image/png');
    doc.addImage(budImg,'PNG',mx,currentY,usableW,34);
    currentY += 36;
    doc.autoTable({
      startY: currentY,
      margin:{left:mx,right:mx},
      head:[['Categoría','Presupuesto','Gastado','Diferencia','% Usado']],
      body: budgetCats.map(c=>{
        const budget=monthBudgets[c], spent=mCatTotals[c]||0, diff=budget-spent;
        return [c, fmt(budget), fmt(spent), (diff>=0?'+':'')+fmt(diff), Math.round((spent/budget)*100)+'%'];
      }),
      styles:{font:'helvetica',fontSize:8.5,halign:'center',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
      headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
      alternateRowStyles:{fillColor:[252,252,254]},
      columnStyles:{0:{halign:'left'},3:{fontStyle:'bold'}},
      didParseCell:function(data){
        if(data.section==='body' && data.column.index===3){
          data.cell.styles.textColor = (monthBudgets[budgetCats[data.row.index]]-(mCatTotals[budgetCats[data.row.index]]||0))>=0?C.green:C.red;
        }
        if(data.section==='body' && data.column.index===4){
          const pct = parseInt(data.cell.raw);
          data.cell.styles.textColor = pct<=70?C.green:(pct<=100?C.amber:C.red);
        }
      }
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // ===== 9. METAS DE AHORRO (Limpio y escalonado) =====
  if(goals.length>0 || goalHistory.length>0){
    sectionHeader(9, 'Metas de ahorro', 'Progreso de ahorro hacia tus objetivos');
    if(goals.length>0){
      const barFull = usableW * 0.72;
      goals.forEach(g=>{
        const { progress, pct, completed } = goalProgress(g);
        ensureSpace(16);
        
        // Fila 1: Nombre de la meta a la izquierda, estado a la derecha
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...C.text);
        doc.text(g.name, mx, currentY + 3.5);
        doc.setFont('helvetica','normal'); doc.setFontSize(8.2); doc.setTextColor(...C.textSoft);
        doc.text(fmt(progress) + ' de ' + fmt(g.target) + ' (' + pct + '%)', mx + barFull, currentY + 3.5, {align:'right'});
        
        // Fila 2: Barra de progreso
        currentY += 5;
        doc.setFillColor(236,236,240);
        doc.roundedRect(mx, currentY, barFull, 3.2, 1.2, 1.2, 'F');
        if(pct > 0){
          doc.setFillColor(...(completed ? C.green : C.gold));
          doc.roundedRect(mx, currentY, barFull * (Math.min(100, pct)/100), 3.2, 1.2, 1.2, 'F');
        }
        currentY += 4.5;

        // Fila 3: Estimación proyectada
        if(!completed){
          const gtx = tx.filter(t=>t.type==='saving'&&t.goalId===g.id);
          const mt={}; gtx.forEach(t=>{ const k=monthKey(t.date); mt[k]=(mt[k]||0)+t.amt; });
          const ks=Object.keys(mt).sort().slice(-6);
          const avg=ks.length?ks.reduce((s,k)=>s+mt[k],0)/ks.length:0;
          if(avg>0){
            const monthsLeft=Math.ceil((g.target-progress)/avg);
            const d=new Date(); d.setMonth(d.getMonth()+monthsLeft);
            doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...C.amber);
            doc.text('Estimado: a tu ritmo ('+fmt(avg)+'/mes) la completarías en '+d.toLocaleDateString('es-ES',{month:'long',year:'numeric'})+'.', mx, currentY + 1.5);
            currentY += 3.5;
          }
        }
        currentY += 3;
      });
    }
    if(goalHistory.length>0){
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...C.textSoft);
      doc.text('Metas cumplidas', mx, currentY+2);
      currentY += 4;
      doc.autoTable({
        startY: currentY,
        margin:{left:mx,right:mx},
        head:[['Meta','Monto objetivo','Fecha']],
        body: goalHistory.slice().reverse().map(g=>[g.name, fmt(g.target), g.date]),
        styles:{font:'helvetica',fontSize:8.5,halign:'left',valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1},
        headStyles:{fillColor:[250,250,252],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.5},lineColor:C.textSoft},
        alternateRowStyles:{fillColor:[252,252,254]},
      });
      currentY = doc.lastAutoTable.finalY + 8;
    }
  }

  // ===== 10. DETALLE DE MOVIMIENTOS (con soporte de Transferencias) =====
  sectionHeader(10, 'Detalle de movimientos', tx.length+' registros · agrupados por mes con saldo acumulado');
  const sorted = [...tx].sort((a,b)=> a.date.localeCompare(b.date) || a.id-b.id);
  const monthGroups = {};
  sorted.forEach(t=>{ const k=monthKey(t.date); (monthGroups[k]=monthGroups[k]||[]).push(t); });
  const mKeys = Object.keys(monthGroups).sort();
  const bodyArr = [];
  const bodyMeta = [];
  let runningSaldo = 0;
  mKeys.forEach(function(k){
    bodyArr.push([fmtMk(k),'','','','','','']);
    bodyMeta.push({type:'band'});
    let monthNet = 0;
    monthGroups[k].forEach(function(t){
      const isTrf = t.type==='withdrawal'||t.type==='transfer';
      const delta = t.type==='income' ? t.amt : ((t.type==='expense'||t.type==='saving') ? -t.amt : 0);
      runningSaldo += delta;
      monthNet += delta;
      let cat, desc, tipoCol;
      if(t.type==='income'){ cat='Ingreso'; desc=t.note||''; tipoCol='Ingreso'; }
      else if(t.type==='expense'){ cat=t.cat||''; desc=(t.cat==='Otros'&&t.note)?t.note:''; tipoCol='Gasto'; }
      else if(t.type==='saving'){ cat='Ahorro'; desc=goalNameById(t.goalId)||'Sin meta específica'; tipoCol='Ahorro'; }
      else {
        cat='Transferencia';
        const toAcc = getAccountMeta(t.toAccount||'cash');
        desc = (t.note ? t.note + ' ' : '') + '→ ' + toAcc.name;
        tipoCol='Traspaso';
      }
      const valueText = isTrf
        ? '↔$' + Math.abs(t.amt).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})
        : (delta>=0?'+':'-') + '$' + Math.abs(t.amt).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
      bodyArr.push([
        t.date, accountNameById(t.account), cat, desc, tipoCol,
        valueText,
        '$'+runningSaldo.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})
      ]);
      bodyMeta.push({type:'row', t, delta, isTrf});
    });
    bodyArr.push(['','','','Subtotal '+k,'',(monthNet>=0?'+':'')+'$'+Math.abs(monthNet).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}), '']);
    bodyMeta.push({type:'total', monthNet});
  });

  doc.autoTable({
    startY: currentY,
    margin:{left:mx,right:mx},
    head:[['Fecha','Cuenta','Categoría','Descripción','Tipo','Valor','Saldo']],
    body: bodyArr,
    columnStyles:{
      0:{cellWidth:20, halign:'center'},
      1:{cellWidth:26, halign:'left'},
      2:{cellWidth:26, halign:'left'},
      3:{cellWidth:46, halign:'left'},
      4:{cellWidth:20, halign:'center'},
      5:{cellWidth:22, halign:'right'},
      6:{cellWidth:22, halign:'right'}
    },
    styles:{font:'helvetica',fontSize:7.5,valign:'middle',textColor:C.text,lineColor:C.line,lineWidth:0.1,overflow:'linebreak'},
    headStyles:{fillColor:[242,242,247],textColor:C.text,fontStyle:'bold',lineWidth:{bottom:0.6},lineColor:C.textSoft,halign:'center'},
    didParseCell:function(data){
      const m = bodyMeta[data.row.index];
      if(!m) return;
      if(m.type==='band'){
        Object.keys(data.row.cells).forEach(function(k){
          data.row.cells[k].styles.fillColor=C.goldSoft;
          data.row.cells[k].styles.textColor=C.gold;
          data.row.cells[k].styles.fontStyle='bold';
          data.row.cells[k].styles.halign='left';
        });
      } else if(m.type==='total'){
        Object.keys(data.row.cells).forEach(function(k){
          data.row.cells[k].styles.fontStyle='bold';
          data.row.cells[k].styles.fillColor=[247,247,250];
          data.row.cells[k].styles.textColor=C.text;
        });
        if(data.column.index===5){ data.row.cells['5'].styles.textColor = m.monthNet>=0?C.green:C.red; }
      } else if(m.type==='row'){
        if(data.column.index===5){
          data.cell.styles.textColor = m.isTrf ? C.gold : (m.delta>=0?C.green:C.red);
          data.cell.styles.fontStyle='bold';
        }
        if(data.column.index===6){ data.cell.styles.textColor=C.text; }
      }
    }
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ===== PIE DE PAGINA (Alejo OS) =====
  const allPages = doc.internal.getNumberOfPages();
  for(let i=1;i<=allPages;i++){
    doc.setPage(i);
    doc.setDrawColor(...C.line); doc.setLineWidth(0.3);
    doc.line(mx, pageH-10, pageW-mx, pageH-10);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.8); doc.setTextColor(...C.textSoft);
    doc.text('Alejo OS · Centro Personal · ' + now.toLocaleDateString('es-ES'), mx, pageH-6);
    doc.text('Página '+i+' de '+allPages, pageW-mx, pageH-6, {align:'right'});
  }

  doc.save('alejo-os-informe-financiero-' + dateKey(now) + '.pdf');
});
}
