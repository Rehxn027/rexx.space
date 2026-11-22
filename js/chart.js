// Small SVG charts drawn in the theme's colours. One series each, so the title names the series and
// no legend is needed. Line charts get a crosshair and tooltip on hover; sparklines a text summary.

import { esc } from './ui.js';

const fmtDefault = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en') : v.toPrecision(4));

/** Tiny trend line for a table row. `values` is a plain number array. */
export function sparkline(values, { w = 120, h = 32, label = '' } = {}) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return '';
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const x = (i) => 2 + (i / (v.length - 1)) * (w - 6);
  const y = (n) => 3 + (1 - (n - min) / span) * (h - 6);
  const d = v.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join('');
  const up = v[v.length - 1] >= v[0];
  const summary = `${label ? `${label}: ` : ''}from ${fmtDefault(v[0])} to ${fmtDefault(v[v.length - 1])} (low ${fmtDefault(min)}, high ${fmtDefault(max)})`;
  return `<svg class="spark ${up ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(summary)}"><title>${esc(summary)}</title>
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(v.length - 1).toFixed(1)}" cy="${y(v[v.length - 1]).toFixed(1)}" r="2.6" fill="currentColor"/></svg>`;
}

/**
 * Line chart placeholder. The SVG is drawn by wireCharts() at the container's real pixel width
 * (and redrawn on resize), so text, dots and strokes stay their true size on every screen.
 * points: [{ t: epoch ms, v: number }].
 */
export function lineChart(points, { h = 190, format = fmtDefault, label = '' } = {}) {
  const p = points.filter((q) => Number.isFinite(q.v));
  if (p.length < 2) return '';
  const vals = p.map((q) => q.v);
  const dfmt = (t) => new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const summary = `${label}: ${p.length} points from ${dfmt(p[0].t)} to ${dfmt(p[p.length - 1].t)}; latest ${format(vals[vals.length - 1])}, low ${format(Math.min(...vals))}, high ${format(Math.max(...vals))}.`;
  return `<figure class="chart" data-points="${esc(JSON.stringify(p.map((q) => [q.t, q.v])))}" data-h="${h}">
    <div class="chart-svg" role="img" aria-label="${esc(summary)}"></div>
    <div class="chart-tip" hidden></div>
    <figcaption class="sr-only">${esc(summary)}</figcaption>
  </figure>`;
}

function draw(fig, format) {
  const pts = JSON.parse(fig.dataset.points);
  const W = Math.max(240, Math.round(fig.clientWidth));
  const H = Number(fig.dataset.h);
  // Leave room on the left for the widest y-axis label.
  const sample = [format(Math.max(...pts.map((q) => q[1]))), format(Math.min(...pts.map((q) => q[1])))];
  const L = 12 + Math.max(...sample.map((s) => s.length)) * 6.6, R = 12, T = 10, B = 24;
  const vals = pts.map((q) => q[1]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.05 || 1;
  const lo = min - pad, hi = max + pad;
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
  const x = (t) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(t1).toFixed(1)},${H - B}L${x(t0).toFixed(1)},${H - B}Z`;
  const grid = [0, 0.5, 1].map((f) => {
    const v = lo + (hi - lo) * f;
    const gy = y(v).toFixed(1);
    return `<line x1="${L}" x2="${W - R}" y1="${gy}" y2="${gy}" class="grid"/><text x="${L - 8}" y="${gy}" class="axis" text-anchor="end" dominant-baseline="middle">${esc(format(v))}</text>`;
  }).join('');
  const dfmt = (t) => new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const [lt, lv] = pts[pts.length - 1];
  fig.querySelector('.chart-svg').innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${grid}
    <path d="${area}" class="area"/><path d="${line}" class="line"/>
    <circle cx="${x(lt).toFixed(1)}" cy="${y(lv).toFixed(1)}" r="4" class="end"/>
    <text x="${L}" y="${H - 5}" class="axis">${esc(dfmt(t0))}</text>
    <text x="${W - R}" y="${H - 5}" class="axis" text-anchor="end">${esc(dfmt(t1))}</text>
    <line class="xhair" y1="${T}" y2="${H - B}" x1="0" x2="0" visibility="hidden"/>
    <circle class="hover-dot" r="4.5" cx="0" cy="0" visibility="hidden"/>
    <rect class="hit" x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent"/>
  </svg>`;
  const svg = fig.querySelector('svg'), tip = fig.querySelector('.chart-tip');
  const xh = svg.querySelector('.xhair'), dot = svg.querySelector('.hover-dot');
  const move = (clientX) => {
    const vx = clientX - svg.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(x(pts[i][0]) - vx) < Math.abs(x(pts[best][0]) - vx)) best = i;
    const [t, v] = pts[best];
    const px = x(t);
    xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', px); dot.setAttribute('cy', y(v)); dot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${esc(format(v))}</b><span>${esc(new Date(t).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }))}</span>`;
    tip.style.left = `${Math.min(Math.max(px, 60), W - 60)}px`;
  };
  const hide = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', (e) => move(e.clientX));
  svg.addEventListener('pointerdown', (e) => move(e.clientX));
  svg.addEventListener('pointerleave', hide);
}

/** Draw every .chart inside root, and redraw when its width changes. */
export function wireCharts(root, format = fmtDefault) {
  root.querySelectorAll('.chart').forEach((fig) => {
    if (fig.dataset.wired) return;
    fig.dataset.wired = '1';
    draw(fig, format);
    let last = fig.clientWidth;
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (Math.abs(fig.clientWidth - last) < 4) return;
        last = fig.clientWidth;
        draw(fig, format);
      }).observe(fig);
    }
  });
}
