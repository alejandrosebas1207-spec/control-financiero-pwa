// Alejo OS · Shared Utilities
import {
  ACCOUNT_DEFS,
  ACCOUNT_BY_ID,
  UNASSIGNED_ACCOUNT,
  CAT_ICON_KEY,
  ICON_PATHS
} from './constants.js';

export const isKnownAccountId = id => Object.prototype.hasOwnProperty.call(ACCOUNT_BY_ID, id);

export const normalizeAccountId = id => {
  if (id === 'pacifico' || id === 'unassigned') return 'guayaquil';
  return isKnownAccountId(id) ? id : UNASSIGNED_ACCOUNT.id;
};

export const getAccountMeta = id => ACCOUNT_BY_ID[normalizeAccountId(id)] || UNASSIGNED_ACCOUNT;

export const getAccountOptions = includeUnassigned => 
  includeUnassigned ? [...ACCOUNT_DEFS, UNASSIGNED_ACCOUNT] : ACCOUNT_DEFS;

export function icon(key, size = 15, noMargin = false) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align:-3px;margin-right:${noMargin ? '0' : '5px'};flex-shrink:0;">${ICON_PATHS[key] || ''}</svg>`;
}

export function catIcon(cat, size) {
  return icon(CAT_ICON_KEY[cat] || 'otros', size);
}

export function accountArtwork(id, size = 24) {
  const normalized = normalizeAccountId(id);
  const assets = {
    guayaquil: './icons/brands/guayaquil.svg',
    deuna: './icons/brands/deuna.svg',
    tc: './icons/brands/mastercard.svg',
    cash: './icons/brands/cash.svg'
  };
  const asset = assets[normalized];
  if (asset) {
    return `<img src="${asset}" alt="" class="account-badge-art" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  }
  return accountIcon(normalized, size);
}

export function accountIcon(id, size = 15) {
  const meta = getAccountMeta(id);
  return icon(meta.icon || 'card', size);
}

export function accountNameById(id) {
  return getAccountMeta(id).name;
}

export function dateKey(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).slice(0, 7);
}

export function monthKeyFromDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export const monthKey = d => (d ? String(d).slice(0, 7) : '');

export function hexToRgb(hex) {
  let h = (hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  if (isNaN(num) || h.length !== 6) return { r: 244, g: 63, b: 94 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2400);
}

export const fmt = n => {
  const num = Number(n) || 0;
  return '$' + num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const escapeHtml = s => {
  if (s === null || s === undefined) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

export const escapeAttr = s => escapeHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const _activeNumAnims = {};

export function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const targetNum = Number.isFinite(Number(target)) ? Number(target) : 0;
  const currentRaw = parseFloat(el.dataset.raw);
  const hasValidStart = Number.isFinite(currentRaw);
  
  if (!hasValidStart) {
    el.textContent = fmt(targetNum);
    el.dataset.raw = String(targetNum);
    return;
  }
  
  const startNum = currentRaw;
  el.dataset.raw = String(targetNum);
  
  if (Math.abs(startNum - targetNum) < 0.005) {
    el.textContent = fmt(targetNum);
    return;
  }
  
  if (_activeNumAnims[id]) {
    cancelAnimationFrame(_activeNumAnims[id]);
  }
  
  const startTime = performance.now();
  const duration = 380;
  
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = startNum + (targetNum - startNum) * ease;
    el.textContent = fmt(val);
    
    if (progress < 1) {
      _activeNumAnims[id] = requestAnimationFrame(step);
    } else {
      el.textContent = fmt(targetNum);
      delete _activeNumAnims[id];
    }
  }
  _activeNumAnims[id] = requestAnimationFrame(step);
}
