// Theme registry + picker. Swatches: [background, surface, accent, accent-2, text].
export const THEMES = [
  { id: 'paper', name: 'Broadsheet', note: 'Editorial newspaper', sw: ['#f6f1e7', '#fffdf8', '#c8341f', '#1f4ec8', '#1b1712'], color: '#f6f1e7' },
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
];

const KEY = 'rexx-theme';

export function currentTheme() {
  try { return localStorage.getItem(KEY) || 'paper'; } catch { return 'paper'; }
}

export function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.color);
  try { localStorage.setItem(KEY, t.id); } catch { /* storage blocked */ }
  document.querySelectorAll('.theme-opt').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === t.id)));
}

export function mountPicker(button, panel) {
  panel.innerHTML = `<h4>Theme</h4><div class="theme-list">${THEMES.map((t) => `
    <button class="theme-opt" data-id="${t.id}" aria-pressed="false">
      <span class="sw">${t.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span>${t.name}<br><small>${t.note}</small></span>
    </button>`).join('')}</div>`;
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('.theme-opt');
    if (b) applyTheme(b.dataset.id);
  });
  button.addEventListener('click', (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden)); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== button) panel.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') panel.hidden = true; });
  applyTheme(currentTheme());
}
