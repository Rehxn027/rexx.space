// Theme registry, picker and first-visit chooser.
import { setEffect, hasEffect } from './fx.js';

// Swatches: [background, surface, accent, accent-2, text].
export const THEMES = [
  { id: 'auto', name: 'Auto', note: 'Broadsheet, dark at night', sw: ['#f6f1e7', '#fffdf8', '#c8341f', '#1e1b15', '#16140f'], color: '#f6f1e7' },
  // Everyday: plain light and dark, plus a theme people build themselves.
  { id: 'light', name: 'Light', note: 'Clean, with sky blue', sw: ['#f6f9fc', '#ffffff', '#7dd3fc', '#0369a1', '#15202b'], color: '#f6f9fc', everyday: true },
  { id: 'dark', name: 'Dark', note: 'Calm dark, sky blue', sw: ['#0f1216', '#171b21', '#7dd3fc', '#9aa4b1', '#e6e9ee'], color: '#0f1216', everyday: true },
  { id: 'custom', name: 'Custom', note: 'Pick your own colours', sw: [], color: '#ffffff', everyday: true },
  { id: 'paper', name: 'Broadsheet', note: 'Editorial newspaper', sw: ['#f6f1e7', '#fffdf8', '#c8341f', '#1f4ec8', '#1b1712'], color: '#f6f1e7' },
  { id: 'night', name: 'Broadsheet Night', note: 'Low-glare reading', sw: ['#16140f', '#1e1b15', '#ff7a5c', '#8fb0ff', '#ece6d9'], color: '#16140f' },
  { id: 'swiss', name: 'Swiss Grid', note: 'Bold, red, gridded', sw: ['#ffffff', '#f1f1f1', '#e30613', '#0a0a0a', '#0a0a0a'], color: '#ffffff' },
  { id: 'brutal', name: 'Brutalist', note: 'Loud & blocky', sw: ['#ffde59', '#ffffff', '#ff3e7f', '#0040ff', '#000000'], color: '#ffde59' },
  { id: 'terminal', name: 'Terminal', note: 'Green phosphor CRT', sw: ['#050a06', '#08120a', '#39ff6a', '#7fdbff', '#b6ffc6'], color: '#050a06' },
  { id: 'fjord', name: 'Fjord', note: 'Cool Nordic dusk', sw: ['#2e3440', '#3b4252', '#88c0d0', '#b48ead', '#eceff4'], color: '#2e3440' },
  { id: 'forest', name: 'Evergreen', note: 'Forest library', sw: ['#12241b', '#193024', '#e3b15b', '#9fd3a6', '#f0ead8'], color: '#12241b' },
  { id: 'sunset', name: 'Golden Hour', note: 'Warm sunset glow', sw: ['#fff3ea', '#ffe9dc', '#f05a28', '#c42b62', '#3b1f14'], color: '#fff3ea' },
  { id: 'prism', name: 'Prism', note: 'Pastel glass', sw: ['#eef0fb', '#ffffff', '#5b5bd6', '#0b8f80', '#1e1b3a'], color: '#eef0fb' },
  { id: 'graphite', name: 'Graphite', note: 'Minimal pro dark', sw: ['#0b0b0d', '#1c1c21', '#ededf0', '#8ab4ff', '#8b8b95'], color: '#0b0b0d' },
  { id: 'notebook', name: 'Notebook', note: 'Graph paper & ink', sw: ['#fbfbf5', '#ffffff', '#2754c5', '#d9480f', '#1d2a44'], color: '#fbfbf5' },
  { id: 'retro', name: 'Retro OS', note: '90s desktop', sw: ['#008080', '#c0c0c0', '#000080', '#1084d0', '#000000'], color: '#008080' },
  { id: 'atlas', name: 'Old Atlas', note: 'Parchment & sepia', sw: ['#ecdfc0', '#f6ecd3', '#8b2e1a', '#2b5b6b', '#3a2a17'], color: '#ecdfc0' },
  { id: 'lagoon', name: 'Lagoon', note: 'Fresh teal & coral', sw: ['#f1fafa', '#ffffff', '#0e94a2', '#e8603c', '#0b3b45'], color: '#f1fafa' },
  { id: 'candy', name: 'Bubblegum', note: 'Playful & chunky', sw: ['#fff0f6', '#ffffff', '#ff3d8b', '#6b4cff', '#2b0f3a'], color: '#fff0f6' },
  { id: 'ink', name: 'Ink', note: 'Pure black & white', sw: ['#ffffff', '#f2f2f2', '#000000', '#4d4d4d', '#000000'], color: '#ffffff' },
  { id: 'sakura', name: 'Sakura', note: 'Soft Japanese minimal', sw: ['#fdf6f7', '#fbeaee', '#d24d6e', '#5f84ab', '#3d2a30'], color: '#fdf6f7' },
  // Immersive: animated backgrounds from js/fx.js
  { id: 'cosmos', name: 'Cosmos', note: 'Starfield & nebula', sw: ['#07040f', '#150e2c', '#8b7bff', '#ff6ad5', '#9ef0ff'], color: '#07040f' },
  { id: 'abyss', name: 'Abyss', note: 'Deep sea & glowing life', sw: ['#0a3a5c', '#04223a', '#3de0d0', '#7fd4ff', '#010b16'], color: '#021526' },
  { id: 'aurora', name: 'Aurora', note: 'Northern lights', sw: ['#050b14', '#0c1828', '#5cffb1', '#7fe8ff', '#b48cff'], color: '#050b14' },
  { id: 'synthwave', name: 'Synthwave', note: 'Neon sunset grid', sw: ['#0d0221', '#3b0a57', '#ff3cc8', '#2de2e6', '#ffe66d'], color: '#0d0221' },
  { id: 'fireflies', name: 'Fireflies', note: 'Forest after dark', sw: ['#050d08', '#0d1f15', '#e6ff8c', '#c3e88d', '#ffd27a'], color: '#050d08' },
  { id: 'rain', name: 'Rainfall', note: 'Rainy window, warm lamp', sw: ['#121a24', '#18222e', '#9cc4ee', '#ffb45a', '#e4ebf3'], color: '#121a24' },
  { id: 'embers', name: 'Embers', note: 'Campfire sparks', sw: ['#0f0806', '#1e110b', '#ff7a2e', '#ffc06b', '#c2341a'], color: '#0f0806' },
  { id: 'snow', name: 'Snowfall', note: 'Bright winter morning', sw: ['#dbe8f5', '#ffffff', '#2f6fd6', '#6aa3f0', '#16283d'], color: '#eef4fa' },
  { id: 'neural', name: 'Neural', note: 'Living network of ideas', sw: ['#050a18', '#0b1530', '#5ac8ff', '#ff78dc', '#e6f0ff'], color: '#050a18' },
];

/* ───────────── Custom theme ───────────── */

export const ACCENTS = [
  ['#ef4444', 'Red'], ['#f97316', 'Orange'], ['#f59e0b', 'Amber'], ['#eab308', 'Yellow'], ['#84cc16', 'Lime'], ['#22c55e', 'Green'],
  ['#10b981', 'Emerald'], ['#14b8a6', 'Teal'], ['#06b6d4', 'Cyan'], ['#38bdf8', 'Sky'], ['#3b82f6', 'Blue'], ['#6366f1', 'Indigo'],
  ['#8b5cf6', 'Violet'], ['#a855f7', 'Purple'], ['#d946ef', 'Fuchsia'], ['#ec4899', 'Pink'], ['#f43f5e', 'Rose'], ['#b91c1c', 'Crimson'],
  ['#c2410c', 'Rust'], ['#a16207', 'Ochre'], ['#166534', 'Forest'], ['#1e3a8a', 'Navy'], ['#7c2d12', 'Brown'], ['#57534e', 'Stone'],
];
export const BACKGROUNDS = {
  light: [['#ffffff', 'White'], ['#f6f9fc', 'Cloud'], ['#f6f1e7', 'Paper'], ['#f3f4f6', 'Grey'], ['#effaf5', 'Mint'], ['#f5f3ff', 'Lavender'], ['#fff1f2', 'Blush'], ['#fefce8', 'Lemon']],
  dark: [['#0f1216', 'Charcoal'], ['#000000', 'Black'], ['#0b1220', 'Navy'], ['#0f1a14', 'Forest'], ['#1a1020', 'Plum'], ['#1c1512', 'Espresso'], ['#111827', 'Slate'], ['#1a1a1a', 'Graphite']],
};
const CUSTOM = 'rexx-custom';
const CUSTOM_VARS = 'rexx-custom-vars';
let custom = { mode: 'light', accent: '#14b8a6', bg: '#ffffff' };
try { custom = { ...custom, ...JSON.parse(localStorage.getItem(CUSTOM) || '{}') }; } catch { /* ignore */ }

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => `#${c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** Darken (on light backgrounds) or lighten (on dark ones) a colour until it reaches the contrast target. */
export function readable(c, bg, target = 4.5) {
  const toward = lum(bg) > 0.4 ? '#000000' : '#ffffff';
  for (let t = 0; t <= 1.0001; t += 0.04) { const out = mix(c, toward, t); if (contrast(out, bg) >= target) return out; }
  return toward;
}
const alpha = (h, a) => `rgba(${rgb(h).join(', ')}, ${a})`;

/** All the colour tokens for a custom theme, derived so text always meets WCAG AA contrast. */
export function customVars(cfg) {
  const light = cfg.mode !== 'dark';
  const bg = cfg.bg;
  const surface = light ? mix(bg, '#ffffff', 0.7) : mix(bg, '#ffffff', 0.05);
  const accentText = readable(cfg.accent, surface, 4.5);
  const onAccent = contrast('#ffffff', cfg.accent) >= contrast('#111827', cfg.accent) ? '#ffffff' : '#111827';
  // Mid-tone accents (some violets, for example) reach only ~4.3:1 with either text colour, so deepen
  // or lighten the button just enough for its label to pass 4.5:1.
  const btnBg = readable(cfg.accent, onAccent, 4.5);
  const onAccentText = contrast('#ffffff', accentText) >= contrast('#111827', accentText) ? '#ffffff' : '#111827';
  const vars = {
    '--bg': bg, '--bg-image': 'none', '--surface': surface, '--surface-solid': surface,
    '--surface-2': light ? mix(bg, '#000000', 0.035) : mix(bg, '#ffffff', 0.09),
    '--line': light ? mix(bg, '#000000', 0.11) : mix(bg, '#ffffff', 0.14),
    '--line-strong': light ? mix(bg, '#000000', 0.3) : mix(bg, '#ffffff', 0.3),
    '--muted': readable(light ? '#5b6b7b' : '#9aa4b1', surface, 4.5),
    '--accent': accentText, '--accent-2': accentText, '--h3-color': accentText, '--highlight': accentText,
    '--accent-soft': alpha(cfg.accent, light ? 0.16 : 0.2), '--on-accent': onAccentText,
    '--btn-bg': btnBg, '--btn-text': onAccent,
    '--title-fill': `linear-gradient(${readable(cfg.accent, bg, 3)}, ${readable(cfg.accent, bg, 3)})`,
    '--topbar-bg': alpha(bg, 0.9), '--shadow-hover': `0 6px 18px ${alpha(cfg.accent, 0.18)}`,
  };
  return { base: light ? 'light' : 'dark', vars };
}
const customSwatch = () => { const v = customVars(custom).vars; return [custom.bg, v['--surface'], custom.accent, v['--accent'], custom.mode === 'dark' ? '#e6e9ee' : '#15202b']; };
let appliedVars = [];
function clearCustomVars() { for (const k of appliedVars) document.documentElement.style.removeProperty(k); appliedVars = []; }

const KEY = 'rexx-theme';
const SEEN = 'rexx-theme-chosen';
const dark = matchMedia('(prefers-color-scheme: dark)');
let chosen = 'auto';

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

/** Is the surrounding app (or OS) in dark mode? An embedding host may set data-theme="dark|light" on <html>. */
function prefersDark() {
  const host = document.documentElement.dataset.theme;
  return host === 'dark' || (host !== 'light' && dark.matches);
}

/** "auto" resolves to Broadsheet or Broadsheet Night. */
const resolve = (id) => (id === 'auto' ? (prefersDark() ? 'night' : 'paper') : id);

export function applyTheme(id, { save = true } = {}) {
  chosen = THEMES.some((t) => t.id === id) ? id : 'auto';
  clearCustomVars();
  let look = resolve(chosen);
  let color = THEMES.find((x) => x.id === look)?.color;
  if (chosen === 'custom') {
    const { base, vars } = customVars(custom);
    look = base; color = custom.bg;
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
    appliedVars = Object.keys(vars);
    // Saved so the inline script in index.html can paint the custom colours before the app loads.
    store.set(CUSTOM_VARS, JSON.stringify({ base, vars }));
  }
  document.documentElement.dataset.look = look;
  setEffect(look);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  if (save) store.set(KEY, chosen);
  document.querySelectorAll('.theme-opt').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === chosen)));
  document.querySelectorAll('.custom-editor').forEach((ed) => { ed.hidden = chosen !== 'custom'; });
}
dark.addEventListener('change', () => { if (chosen === 'auto') applyTheme('auto', { save: false }); });
new MutationObserver(() => { if (chosen === 'auto') applyTheme('auto', { save: false }); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const swatchHTML = (cols) => cols.map((c) => `<i style="background:${c}"></i>`).join('');
const option = (t) => `
  <button type="button" class="theme-opt" data-id="${t.id}" aria-pressed="false">
    <span class="sw${hasEffect(t.id) ? ' fx' : ''}">${swatchHTML(t.id === 'custom' ? customSwatch() : t.sw)}</span>
    <span>${t.name}<br><small>${t.note}</small></span>
  </button>`;

/** The colour pickers for the Custom theme. */
function editorInner() {
  const cell = (attr, [c, name], on) => `<button type="button" class="cg" ${attr}="${c}" style="background:${c}" aria-pressed="${on}" title="${name}" aria-label="${name}"></button>`;
  const isPreset = ACCENTS.some(([c]) => c === custom.accent);
  return `<p class="theme-group">Your custom theme</p>
    <div class="seg" role="group" aria-label="Base">
      <button type="button" data-mode="light" aria-pressed="${custom.mode === 'light'}">Light</button>
      <button type="button" data-mode="dark" aria-pressed="${custom.mode === 'dark'}">Dark</button>
    </div>
    <p class="ce-label">Accent colour</p>
    <div class="color-grid" role="group" aria-label="Accent colour">
      ${ACCENTS.map((a) => cell('data-accent', a, a[0] === custom.accent)).join('')}
      <label class="cg any" title="Any colour" aria-pressed="${!isPreset}" style="${isPreset ? '' : `background:${custom.accent}`}"><input type="color" data-accent-any value="${custom.accent}" aria-label="Choose any accent colour"><span aria-hidden="true">+</span></label>
    </div>
    <p class="ce-label">Background</p>
    <div class="color-grid bg-grid" role="group" aria-label="Background colour">
      ${BACKGROUNDS[custom.mode].map((b) => cell('data-bg', b, b[0] === custom.bg)).join('')}
    </div>
    <p class="meta">Text and link colours adjust automatically so everything stays readable.</p>`;
}
const editorHTML = () => `<div class="custom-editor" ${chosen === 'custom' ? '' : 'hidden'}>${editorInner()}</div>`;

function setCustom(patch) {
  custom = { ...custom, ...patch };
  if (!BACKGROUNDS[custom.mode].some(([c]) => c === custom.bg)) custom.bg = BACKGROUNDS[custom.mode][0][0];
  store.set(CUSTOM, JSON.stringify(custom));
  applyTheme('custom');
  document.querySelectorAll('.custom-editor').forEach((ed) => { ed.innerHTML = editorInner(); });
  document.querySelectorAll('.theme-opt[data-id="custom"] .sw').forEach((sw) => { sw.innerHTML = swatchHTML(customSwatch()); });
}

const optionsHTML = () => {
  const everyday = THEMES.filter((t) => t.id === 'auto' || t.everyday);
  const immersive = THEMES.filter((t) => hasEffect(t.id));
  const classic = THEMES.filter((t) => !hasEffect(t.id) && !t.everyday && t.id !== 'auto');
  return `<p class="theme-group">Everyday</p><div class="theme-list">${everyday.map(option).join('')}</div>
    ${editorHTML()}
    <p class="theme-group">Immersive · animated</p><div class="theme-list">${immersive.map(option).join('')}</div>
    <p class="theme-group">Classic</p><div class="theme-list">${classic.map(option).join('')}</div>`;
};

function wire(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.theme-opt');
    if (b) { applyTheme(b.dataset.id); return; }
    const m = e.target.closest('[data-mode]');
    if (m) { setCustom({ mode: m.dataset.mode }); return; }
    const a = e.target.closest('[data-accent]');
    if (a) { setCustom({ accent: a.dataset.accent }); return; }
    const g = e.target.closest('[data-bg]');
    if (g) setCustom({ bg: g.dataset.bg });
  });
  // The free colour picker: preview while dragging, keep on release.
  root.addEventListener('input', (e) => { if (e.target.matches('[data-accent-any]')) { custom.accent = e.target.value; applyTheme('custom'); } });
  root.addEventListener('change', (e) => { if (e.target.matches('[data-accent-any]')) setCustom({ accent: e.target.value }); });
}

export function mountPicker(button, panel) {
  panel.innerHTML = `<h4>Theme</h4>${optionsHTML()}`;
  wire(panel);
  const toggle = (open = panel.hidden) => { panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
  button.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  // composedPath() is captured when the click starts, so it still includes the panel even if the
  // clicked swatch has since been re-rendered away.
  document.addEventListener('click', (e) => { const path = e.composedPath(); if (!panel.hidden && !path.includes(panel) && !path.includes(button)) toggle(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false);
    // "t" opens the picker (when not typing).
    if (e.key === 't' && !e.metaKey && !e.ctrlKey && !/input|textarea|select/i.test(document.activeElement.tagName)) toggle();
  });
  applyTheme(store.get(KEY) || 'auto', { save: false });
  if (!store.get(SEEN)) welcome();
}

/** First visit: a full chooser. Clicking a theme restyles the page behind it live. */
function welcome() {
  const dlg = document.createElement('dialog');
  dlg.className = 'welcome';
  dlg.setAttribute('aria-labelledby', 'welcome-title');
  dlg.innerHTML = `
    <h2 id="welcome-title">Pick your look</h2>
    <p class="muted">Tap a theme to preview it on the page behind. You can change it any time with the <b>Theme</b> button or by pressing <kbd>t</kbd>.</p>
    ${optionsHTML()}
    <div class="welcome-actions"><button type="button" class="go">Start exploring →</button></div>`;
  document.body.append(dlg);
  wire(dlg);
  applyTheme(chosen, { save: false });
  const done = () => { store.set(SEEN, '1'); store.set(KEY, chosen); dlg.close(); dlg.remove(); };
  dlg.querySelector('.go').addEventListener('click', done);
  dlg.addEventListener('cancel', done);
  dlg.showModal();
}
