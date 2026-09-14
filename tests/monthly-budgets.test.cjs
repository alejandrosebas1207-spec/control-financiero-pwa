const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const functions=source.slice(source.indexOf('function getBudgetsForMonth('),source.indexOf('function emptyAccountTotal('));
function setup(budgets){const context={budgets,saveBudgets:()=>{}};vm.createContext(context);vm.runInContext(functions,context);return context;}
test('a new month inherits neither prior budgets nor legacy defaults',()=>{const c=setup({'2026-07':{Moto:15},'2026-08':{Moto:20},_default:{Moto:50}});assert.equal(Object.keys(c.getBudgetsForMonth('2026-09')).length,0);assert.equal(Object.keys(c.getBudgetsForMonth('2026-06')).length,0);assert.equal(c.getBudgetsForMonth('2026-08').Moto,20);});
test('saving and clearing are isolated to the selected month',()=>{const c=setup({'2026-08':{Moto:20},_default:{Moto:50}});c.setBudgetsForMonth('2026-09',{Moto:8});assert.equal(c.getBudgetsForMonth('2026-09').Moto,8);assert.equal(c.getBudgetsForMonth('2026-08').Moto,20);assert.equal(Object.keys(c.getBudgetsForMonth('2026-10')).length,0);c.setBudgetsForMonth('2026-09',{});assert.equal(Object.keys(c.getBudgetsForMonth('2026-09')).length,0);assert.equal(c.getBudgetsForMonth('2026-08').Moto,20);});
