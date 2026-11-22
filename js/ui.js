// Tiny DOM + formatting helpers.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Tagged template that escapes interpolations unless wrapped with raw(). */
export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => {
    if (i === 0) return s;
    const v = vals[i - 1];
    const str = v == null || v === false ? ''
      : Array.isArray(v) ? v.map((x) => (x?.__raw ?? esc(x))).join('')
      : v.__raw ?? esc(v);
    return out + str + s;
  }, '');
}
export const raw = (s) => ({ __raw: String(s ?? '') });

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function ago(ts) {
  if (!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  const units = [[60, 'm'], [3600, 'h'], [86400, 'd'], [604800, 'w'], [2629800, 'mo'], [31557600, 'y']];
  let label = `${Math.floor(s / 60)}m`;
  for (let i = 0; i < units.length; i++) {
    const next = units[i + 1];
    if (!next || s < next[0]) { label = `${Math.floor(s / units[i][0])}${units[i][1]}`; break; }
  }
  return `${label} ago`;
}

export const compact = (n) => (n == null ? '' : Intl.NumberFormat('en', { notation: 'compact' }).format(n));

export function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

export const skeleton = (n = 3) => raw(Array.from({ length: n }, () => '<div class="skel"></div>').join(''));

/** Render a card that resolves a promise; shows a skeleton, then content, or hides itself on failure. */
export function slot(el, promise, render, { emptyText } = {}) {
  promise.then((data) => {
    const out = render(data);
    if (!out) {
      if (emptyText) el.innerHTML = `<p class="muted">${esc(emptyText)}</p>`; else el.closest('.card')?.remove();
      return;
    }
    el.innerHTML = out;
  }).catch((err) => {
    const card = el.closest('.card');
    if (err?.name === 'LiveOnly') {
      if (card?.dataset.optional !== undefined) { card.remove(); return; }
      el.innerHTML = '<p class="muted live-note">Live data. This section fills in when the full app is running with an internet connection.</p>';
      return;
    }
    console.warn(err);
    if (!navigator.onLine) el.innerHTML = '<p class="muted">Offline — this source needs a connection. Saved items live in your Vault.</p>';
    else if (card?.dataset.optional !== undefined) card.remove();
    else el.innerHTML = '<p class="muted">This source didn\'t respond. Try again in a moment.</p>';
  });
}

/** Web-Mercator projection to 0..1 (matches OSM tiles). */
export function mercator(lat, lon) {
  const l = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180;
  return { x: (lon + 180) / 360, y: (1 - Math.log(Math.tan(l) + 1 / Math.cos(l)) / Math.PI) / 2 };
}
