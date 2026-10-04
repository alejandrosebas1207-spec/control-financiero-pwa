// Alejo OS · Motorcycle Module
import {
  MOTORCYCLE_MAINTENANCE_KEY,
  DELETED_FUEL_KEY,
  DELETED_SERVICE_KEY,
  OIL_CHANGE_INTERVAL,
  SEED_DATA
} from '../../core/constants.js';
import { fmt, escapeHtml, dateKey, showToast } from '../../core/utils.js';

let _syncPushFn = () => {};
let _renderCreditCardPanelFn = () => {};

export function registerMotoDeps(deps) {
  if (deps.syncPush) _syncPushFn = deps.syncPush;
  if (deps.renderCreditCardPanel) _renderCreditCardPanelFn = deps.renderCreditCardPanel;
}

export function normalizeMotorcycleMaintenance(raw) {
  if (!raw || typeof raw !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.lastDate || '')) return null;
  const lastMileage = Number(raw.lastMileage);
  if (!Number.isFinite(lastMileage) || lastMileage < 0) return null;
  return {
    lastDate: raw.lastDate,
    lastMileage,
    fuelLogs: Array.isArray(raw.fuelLogs) ? raw.fuelLogs : [],
    serviceHistory: Array.isArray(raw.serviceHistory) ? raw.serviceHistory : []
  };
}

export function loadMotorcycleMaintenance() {
  try {
    const stored = localStorage.getItem(MOTORCYCLE_MAINTENANCE_KEY);
    if (stored) return normalizeMotorcycleMaintenance(JSON.parse(stored));
    if (SEED_DATA && SEED_DATA.motorcycleMaintenance) {
      const parsed = normalizeMotorcycleMaintenance(SEED_DATA.motorcycleMaintenance);
      if (parsed) {
        localStorage.setItem(MOTORCYCLE_MAINTENANCE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    return normalizeMotorcycleMaintenance(SEED_DATA ? SEED_DATA.motorcycleMaintenance : null);
  }
  return null;
}

export let motorcycleMaintenance = loadMotorcycleMaintenance();
export const getMotorcycleMaintenance = () => motorcycleMaintenance;
export const setMotorcycleMaintenance = val => { motorcycleMaintenance = normalizeMotorcycleMaintenance(val); };

export function saveMotorcycleMaintenance(value, shouldSync = true) {
  motorcycleMaintenance = normalizeMotorcycleMaintenance(value);
  if (motorcycleMaintenance) localStorage.setItem(MOTORCYCLE_MAINTENANCE_KEY, JSON.stringify(motorcycleMaintenance));
  else localStorage.removeItem(MOTORCYCLE_MAINTENANCE_KEY);
  if (shouldSync) _syncPushFn();
}

export let deletedFuelLogIds = new Set();
export let deletedServiceIds = new Set();
try {
  const _sFuel = localStorage.getItem(DELETED_FUEL_KEY);
  if (_sFuel) deletedFuelLogIds = new Set(JSON.parse(_sFuel));
  const _sServ = localStorage.getItem(DELETED_SERVICE_KEY);
  if (_sServ) deletedServiceIds = new Set(JSON.parse(_sServ));
} catch (e) {}

export function renderMotorcycleMaintenance() {
  const summary = document.getElementById('motoMaintenanceSummary');
  const dateInput = document.getElementById('motoLastDate');
  const mileageInput = document.getElementById('motoLastMileage');
  const form = document.getElementById('motoMaintenanceForm');
  const toggleBtn = document.getElementById('toggleMotoMaintenanceBtn');
  if (!summary || !dateInput || !mileageInput || !form || !toggleBtn) return;
  const formIsOpen = !form.classList.contains('hidden');
  if (!formIsOpen || !motorcycleMaintenance) {
    dateInput.value = motorcycleMaintenance ? motorcycleMaintenance.lastDate : dateKey(new Date());
    mileageInput.value = motorcycleMaintenance ? motorcycleMaintenance.lastMileage : '';
  }
  if (!motorcycleMaintenance) {
    summary.innerHTML = '<div class="maintenance-empty">Todavía no hay un mantenimiento registrado. Completa los datos para calcular el próximo cambio de aceite.</div>';
    form.classList.remove('hidden');
    toggleBtn.textContent = 'Ocultar';
    return;
  }
  const nextMileage = motorcycleMaintenance.lastMileage + OIL_CHANGE_INTERVAL;
  const lastDateLabel = new Date(motorcycleMaintenance.lastDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  summary.innerHTML = `<div class="maintenance-item"><span class="tag">Último mantenimiento</span><strong>${lastDateLabel}</strong></div>
    <div class="maintenance-item"><span class="tag">Kilometraje registrado</span><strong>${motorcycleMaintenance.lastMileage.toLocaleString('es-ES')} km</strong></div>
    <div class="maintenance-item next"><span class="tag">Próximo cambio de aceite</span><strong>${nextMileage.toLocaleString('es-ES')} km</strong></div>`;
  if (!formIsOpen) form.classList.add('hidden');
  toggleBtn.textContent = formIsOpen ? 'Cerrar' : 'Editar';
}

export function renderMotoDashboard() {
  renderMotorcycleMaintenance();
  renderMotoFuelStats();
  renderMotoFuelList();
  renderMotoServiceList();
}

export function renderMotoFuelStats() {
  const container = document.getElementById('motoFuelStats');
  if (!container) return;
  const cfg = motorcycleMaintenance || { lastDate: '2026-08-16', lastMileage: 21953, fuelLogs: [], serviceHistory: [] };
  const fuelLogs = cfg.fuelLogs || [];

  const totalSpent = fuelLogs.reduce((s, f) => s + (parseFloat(f.cost) || 0), 0);
  const totalEntries = fuelLogs.length;
  const latestFuel = fuelLogs[0] || null;
  const latestKm = latestFuel ? (latestFuel.mileage.toLocaleString('es-ES') + ' km') : 'Sin registros';

  container.innerHTML = `
    <div class="moto-fuel-item">
      <span class="tag">Total invertido en gasolina</span>
      <strong class="gold">${fmt(totalSpent)}</strong>
    </div>
    <div class="moto-fuel-item">
      <span class="tag">Última tanqueada</span>
      <strong>${latestKm}</strong>
    </div>
    <div class="moto-fuel-item">
      <span class="tag">Tanqueadas registradas</span>
      <strong class="green">${totalEntries}</strong>
    </div>
  `;
}

export function renderMotoFuelList() {
  const list = document.getElementById('motoFuelList');
  if (!list) return;
  const cfg = motorcycleMaintenance || { lastDate: '2026-08-16', lastMileage: 21953, fuelLogs: [], serviceHistory: [] };
  const fuelLogs = cfg.fuelLogs || [];

  if (fuelLogs.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-soft); font-size:12.5px;">No hay tanqueadas registradas aún. Toca "+ Tanqueada" para añadir una.</div>`;
    return;
  }

  list.innerHTML = fuelLogs.map((f, idx) => {
    const dStr = new Date(f.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const prevKm = fuelLogs[idx + 1] ? (f.mileage - fuelLogs[idx + 1].mileage) : null;
    const diffLabel = prevKm !== null && prevKm > 0 ? `· +${prevKm} km recorridos` : '';
    return `
      <div class="fuel-log-row">
        <div class="left">
          <span class="fkm">⛽ ${f.mileage.toLocaleString('es-ES')} km <span style="font-size:11px; color:var(--text-soft); font-family:'JetBrains Mono';">${diffLabel}</span></span>
          <span class="fdate">${dStr} ${f.note ? `· ${escapeHtml(f.note)}` : ''}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="fcost">${fmt(f.cost)}</span>
          <button class="del-x" onclick="deleteFuelLog(${f.id})" title="Eliminar">&times;</button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderMotoServiceList() {
  const list = document.getElementById('motoServiceList');
  if (!list) return;
  const cfg = motorcycleMaintenance || { lastDate: '2026-08-16', lastMileage: 21953, fuelLogs: [], serviceHistory: [] };
  const services = cfg.serviceHistory || [];

  if (services.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-soft); font-size:12.5px;">No hay otros servicios registrados. Toca "+ Mantenimiento" para registrar frenos, cadena, llantas, etc.</div>`;
    return;
  }

  list.innerHTML = services.map(s => {
    const dStr = new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <div class="fuel-log-row">
        <div class="left">
          <span class="fkm">🛠️ ${escapeHtml(s.type)} ${s.mileage ? `(${s.mileage.toLocaleString('es-ES')} km)` : ''}</span>
          <span class="fdate">${dStr} ${s.note ? `· ${escapeHtml(s.note)}` : ''}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="fcost">${s.cost ? fmt(s.cost) : 'Preventivo'}</span>
          <button class="del-x" onclick="deleteMotoService(${s.id})" title="Eliminar">&times;</button>
        </div>
      </div>
    `;
  }).join('');
}

export function openFuelModal() {
  const overlay = document.getElementById('fuelModalOverlay');
  if (!overlay) return;
  const fDate = document.getElementById('fuelDate');
  const fMileage = document.getElementById('fuelMileage');
  const fCost = document.getElementById('fuelCost');
  const fNote = document.getElementById('fuelNote');
  if (fDate) fDate.value = dateKey(new Date());
  if (fMileage) fMileage.value = (motorcycleMaintenance && motorcycleMaintenance.lastMileage) || '';
  if (fCost) fCost.value = '';
  if (fNote) fNote.value = 'Extra';
  overlay.classList.remove('hidden');
}

export function closeFuelModal() {
  const overlay = document.getElementById('fuelModalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

export function deleteFuelLog(id) {
  if (!motorcycleMaintenance || !motorcycleMaintenance.fuelLogs) return;
  deletedFuelLogIds.add(id);
  try { localStorage.setItem(DELETED_FUEL_KEY, JSON.stringify([...deletedFuelLogIds])); } catch (e) {}
  motorcycleMaintenance.fuelLogs = motorcycleMaintenance.fuelLogs.filter(f => f.id !== id);
  saveMotorcycleMaintenance(motorcycleMaintenance);
  renderMotoDashboard();
  showToast('Registro de tanqueada eliminado');
}

export function openServiceModal() {
  const overlay = document.getElementById('serviceModalOverlay');
  if (!overlay) return;
  const sDate = document.getElementById('serviceDate');
  const sType = document.getElementById('serviceType');
  const sMileage = document.getElementById('serviceMileage');
  const sCost = document.getElementById('serviceCost');
  const sNote = document.getElementById('serviceNote');
  if (sDate) sDate.value = dateKey(new Date());
  if (sType) sType.value = '';
  if (sMileage) sMileage.value = (motorcycleMaintenance && motorcycleMaintenance.lastMileage) || '';
  if (sCost) sCost.value = '';
  if (sNote) sNote.value = '';
  overlay.classList.remove('hidden');
}

export function closeServiceModal() {
  const overlay = document.getElementById('serviceModalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

export function deleteMotoService(id) {
  if (!motorcycleMaintenance || !motorcycleMaintenance.serviceHistory) return;
  deletedServiceIds.add(id);
  try { localStorage.setItem(DELETED_SERVICE_KEY, JSON.stringify([...deletedServiceIds])); } catch (e) {}
  motorcycleMaintenance.serviceHistory = motorcycleMaintenance.serviceHistory.filter(s => s.id !== id);
  saveMotorcycleMaintenance(motorcycleMaintenance);
  renderMotoDashboard();
  showToast('Servicio eliminado');
}
