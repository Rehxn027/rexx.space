// Animated backgrounds for the "immersive" themes. One canvas sits behind the page; each theme
// that has an effect registers it here. Effects pause when the tab is hidden, and with
// prefers-reduced-motion they draw a single still frame instead of animating.

const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/** Pre-rendered soft glow, drawn with drawImage. Far cheaper than canvas shadowBlur per particle. */
const sprites = new Map();
function glow(color) {
  if (!sprites.has(color)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color); gr.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
  }
  return sprites.get(color);
}

const EFFECTS = {
  /* Cosmos: drifting parallax starfield that follows the cursor. */
  cosmos: {
    init(w, h) {
      const n = Math.min(520, Math.floor((w * h) / 9000));
      return { stars: Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), z: rand(0.1, 1), tw: rand(0, TAU), hue: [200, 260, 320, 45][Math.floor(rand(0, 4))] })) };
    },
    frame(c, w, h, t, s, p) {
      c.clearRect(0, 0, w, h);
      for (const st of s.stars) {
        st.x -= st.z * 0.3; if (st.x < 0) st.x += w;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(st.tw + t / (1400 / st.z)));
        c.fillStyle = `hsla(${st.hue},90%,${70 + st.z * 25}%,${a * st.z})`;
        c.beginPath(); c.arc(st.x + p.x * st.z * 30, st.y + p.y * st.z * 30, st.z * 2.2, 0, TAU); c.fill();
      }
    },
  },

  /* Abyss: deep-sea light shafts, rising bubbles and glowing plankton. */
  abyss: {
    init(w, h) {
      return {
        bubbles: Array.from({ length: Math.floor(w / 28) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(1.5, 6), v: rand(0.3, 1.2), ph: rand(0, TAU) })),
        glow: Array.from({ length: Math.floor(w / 18) }, () => ({ x: rand(0, w), y: rand(h * 0.3, h), r: rand(1, 3), ph: rand(0, TAU), hue: rand(170, 200) })),
      };
    },
    frame(c, w, h, t, s) {
      c.clearRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = w * (0.15 + i * 0.18) + Math.sin(t / 3000 + i) * 60;
        const g = c.createLinearGradient(0, 0, 0, h * 0.8);
        g.addColorStop(0, 'rgba(120,220,255,0.10)'); g.addColorStop(1, 'rgba(120,220,255,0)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 160, h * 0.8); c.lineTo(x - 40, h * 0.8); c.fill();
      }
      const spr = glow('rgba(110,240,230,1)');
      for (const g of s.glow) {
        g.x += Math.sin(t / 4000 + g.ph) * 0.15;
        c.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(g.ph + t / 1600));
        const r = g.r * 7;
        c.drawImage(spr, g.x - r, g.y - r, r * 2, r * 2);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'rgba(200,240,255,0.35)'; c.lineWidth = 1.2;
      for (const b of s.bubbles) {
        b.y -= b.v; b.x += Math.sin(t / 700 + b.ph) * 0.4;
        if (b.y < -10) { b.y = h + 10; b.x = rand(0, w); }
        c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke();
      }
    },
  },

  /* Aurora: slow ribbons of northern light over a few stars. */
  aurora: {
    init(w, h) { return { stars: Array.from({ length: 140 }, () => ({ x: rand(0, w), y: rand(0, h * 0.7), r: rand(0.3, 1.3) })) }; },
    frame(c, w, h, t, s) {
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      for (const st of s.stars) { c.beginPath(); c.arc(st.x, st.y, st.r, 0, TAU); c.fill(); }
      c.globalCompositeOperation = 'lighter';
      const bands = [[150, 0.18, 0.0011, 0.00028], [175, 0.32, 0.0016, 0.00021], [290, 0.24, 0.0009, 0.00034]];
      const k = h / 900;
      for (const [hue, base, f, sp] of bands) {
        // Each ribbon is a column strip whose top follows two sine waves; a vertical gradient per
        // strip would be costly, so draw thin bars with a per-band gradient translated into place.
        const len = 220 * k;
        const g = c.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, `hsla(${hue},90%,60%,0)`); g.addColorStop(0.25, `hsla(${hue},90%,60%,0.17)`); g.addColorStop(1, `hsla(${hue + 30},90%,55%,0)`);
        c.fillStyle = g;
        for (let x = 0; x < w; x += 6) {
          const y = h * base + (Math.sin(x * f + t * sp) * 60 + Math.sin(x * f * 2.7 - t * sp * 1.6) * 25) * k;
          const stretch = 0.75 + 0.35 * Math.sin(x * 0.004 + t * 0.0004);
          c.setTransform(1, 0, 0, stretch, 0, y);
          c.fillRect(x, 0, 6, len);
        }
        c.setTransform(1, 0, 0, 1, 0, 0);
      }
      c.globalCompositeOperation = 'source-over';
    },
  },

  /* Synthwave: striped sun over an endless neon grid. */
  synthwave: {
    init() { return {}; },
    frame(c, w, h, t) {
      c.clearRect(0, 0, w, h);
      const hz = h * 0.74;
      const sky = c.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#0d0221'); sky.addColorStop(0.6, '#3b0a57'); sky.addColorStop(1, '#ff2a8a');
      c.fillStyle = sky; c.fillRect(0, 0, w, hz);
      // Sun with the classic cut-out stripes.
      const r = Math.min(w, h) * 0.17, cx = w / 2, cy = hz - r * 0.45;
      const sun = c.createLinearGradient(0, cy - r, 0, cy + r);
      sun.addColorStop(0, '#ffe66d'); sun.addColorStop(1, '#ff2a8a');
      c.save(); c.beginPath(); c.rect(0, 0, w, hz); c.clip();
      c.fillStyle = sun; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
      c.fillStyle = '#5a0f63';
      for (let i = 0; i < 7; i++) { const y = cy + r * (0.1 + i * 0.14); c.fillRect(cx - r, y, r * 2, 2 + i * 1.6); }
      c.restore();
      // Floor and grid.
      const floor = c.createLinearGradient(0, hz, 0, h);
      floor.addColorStop(0, '#1a0433'); floor.addColorStop(1, '#090014');
      c.fillStyle = floor; c.fillRect(0, hz, w, h - hz);
      const off = (t / 1400) % 1;
      c.beginPath();
      for (let i = 0; i < 18; i++) {
        const z = (i + off) / 18, y = hz + (h - hz) * z * z;
        c.moveTo(0, y); c.lineTo(w, y);
      }
      for (let i = -24; i <= 24; i++) { c.moveTo(cx + i * 8, hz); c.lineTo(cx + i * w * 0.09, h); }
      c.strokeStyle = 'rgba(255,60,200,0.18)'; c.lineWidth = 6; c.stroke();
      c.strokeStyle = 'rgba(255,90,215,0.85)'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = '#ff9be6'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, hz); c.lineTo(w, hz); c.stroke();
    },
  },

  /* Fireflies: soft glowing lights wandering through a night forest. */
  fireflies: {
    init(w, h) { return { f: Array.from({ length: Math.min(90, Math.floor(w / 16)) }, () => ({ x: rand(0, w), y: rand(0, h), a: rand(0, TAU), v: rand(0.2, 0.6), ph: rand(0, TAU) })) }; },
    frame(c, w, h, t, s) {
      c.clearRect(0, 0, w, h);
      for (const f of s.f) {
        f.a += rand(-0.08, 0.08); f.x += Math.cos(f.a) * f.v; f.y += Math.sin(f.a) * f.v;
        if (f.x < -20) f.x = w + 20; if (f.x > w + 20) f.x = -20; if (f.y < -20) f.y = h + 20; if (f.y > h + 20) f.y = -20;
        c.globalAlpha = 0.9 * Math.max(0, Math.sin(f.ph + t / 900));
        c.drawImage(glow('rgba(230,255,140,1)'), f.x - 16, f.y - 16, 32, 32);
      }
      c.globalAlpha = 1;
    },
  },

  /* Rainfall: slanted rain streaks over droplets on a window. */
  rain: {
    init(w, h) {
      return {
        drops: Array.from({ length: Math.min(420, Math.floor(w / 3)) }, () => ({ x: rand(0, w), y: rand(0, h), l: rand(10, 28), v: rand(9, 17) })),
        beads: Array.from({ length: 80 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(1.5, 4.5) })),
      };
    },
    frame(c, w, h, t, s) {
      c.clearRect(0, 0, w, h);
      for (const b of s.beads) {
        const g = c.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(160,190,220,0.06)');
        c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill();
      }
      c.strokeStyle = 'rgba(180,205,235,0.35)'; c.lineWidth = 1;
      c.beginPath();
      for (const d of s.drops) {
        d.y += d.v; d.x -= d.v * 0.18;
        if (d.y > h) { d.y = -d.l; d.x = rand(0, w * 1.2); }
        c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * 0.18, d.y - d.l);
      }
      c.stroke();
    },
  },

  /* Embers: sparks rising from a fire below the page. */
  embers: {
    init(w, h) { return { e: Array.from({ length: Math.min(160, Math.floor(w / 8)) }, () => this.spawn(w, h, true)) }; },
    spawn(w, h, any) { return { x: rand(0, w), y: any ? rand(0, h) : h + 10, v: rand(0.5, 1.8), r: rand(0.8, 2.6), ph: rand(0, TAU), life: rand(0.5, 1) }; },
    frame(c, w, h, t, s) {
      c.clearRect(0, 0, w, h);
      const heat = c.createLinearGradient(0, h * 0.55, 0, h);
      heat.addColorStop(0, 'rgba(255,90,20,0)'); heat.addColorStop(1, 'rgba(255,90,20,0.22)');
      c.fillStyle = heat; c.fillRect(0, h * 0.55, w, h * 0.45);
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < s.e.length; i++) {
        const e = s.e[i];
        e.y -= e.v; e.x += Math.sin(t / 600 + e.ph) * 0.6;
        const fade = Math.max(0, Math.min(1, e.y / h)) * e.life;
        if (e.y < -10 || fade <= 0.02) { s.e[i] = this.spawn(w, h, false); continue; }
        const flick = 0.6 + 0.4 * Math.sin(t / 90 + e.ph);
        c.globalAlpha = fade * flick;
        const r = e.r * 5;
        c.drawImage(glow('rgba(255,170,60,1)'), e.x - r, e.y - r, r * 2, r * 2);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    },
  },

  /* Snowfall: gentle snow with depth, for a light winter theme. */
  snow: {
    init(w, h) { return { f: Array.from({ length: Math.min(260, Math.floor(w / 5)) }, () => ({ x: rand(0, w), y: rand(0, h), z: rand(0.3, 1), ph: rand(0, TAU) })) }; },
    frame(c, w, h, t, s) {
      c.clearRect(0, 0, w, h);
      for (const f of s.f) {
        f.y += 0.3 + f.z * 0.9; f.x += Math.sin(t / 1500 + f.ph) * 0.4 * f.z;
        if (f.y > h + 5) { f.y = -5; f.x = rand(0, w); }
        c.fillStyle = `rgba(150,180,215,${0.35 + f.z * 0.5})`;
        c.beginPath(); c.arc(f.x, f.y, 1 + f.z * 2.6, 0, TAU); c.fill();
      }
    },
  },

  /* Neural: a slowly drifting network of linked ideas that reaches for the cursor. */
  neural: {
    init(w, h) { return { n: Array.from({ length: Math.min(150, Math.floor((w * h) / 9000)) }, () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25) })) }; },
    frame(c, w, h, t, s, p) {
      c.clearRect(0, 0, w, h);
      const k = w / innerWidth, mx = (p.x + 0.5) * w, my = (p.y + 0.5) * h, D = 150 * k;
      for (const n of s.n) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1; if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      c.lineWidth = k;
      for (let i = 0; i < s.n.length; i++) {
        const a = s.n[i];
        for (let j = i + 1; j < s.n.length; j++) {
          const b = s.n[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < D) { c.strokeStyle = `rgba(90,200,255,${0.55 * (1 - d / D)})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        const dm = Math.hypot(a.x - mx, a.y - my);
        if (p.active && dm < D * 1.6) { c.strokeStyle = `rgba(255,120,220,${0.5 * (1 - dm / (D * 1.6))})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(mx, my); c.stroke(); }
        c.fillStyle = 'rgba(140,220,255,0.95)'; c.beginPath(); c.arc(a.x, a.y, 2.4 * k, 0, TAU); c.fill();
      }
    },
  },
};

let canvas, ctx, current = null, state = null, raf = 0, w = 0, h = 0;
const pointer = { x: 0, y: 0, active: false };
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

function size() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5); // soft backgrounds don't need full retina resolution
  w = canvas.width = Math.floor(innerWidth * dpr);
  h = canvas.height = Math.floor(innerHeight * dpr);
}

function loop(t) {
  if (!current) return;
  EFFECTS[current].frame(ctx, w, h, t, state, pointer);
  if (!reduce.matches && !document.hidden) raf = requestAnimationFrame(loop);
}

function start() {
  cancelAnimationFrame(raf);
  if (!current) { ctx?.clearRect(0, 0, w, h); return; }
  state = EFFECTS[current].init.call(EFFECTS[current], w, h);
  raf = requestAnimationFrame(loop);
}

/** Switch the background effect. Themes without an effect clear it. */
export function setEffect(id) {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'fx';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
    size();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); start(); }, 150); });
    addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; pointer.active = true; }, { passive: true });
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden && current) raf = requestAnimationFrame(loop); });
    reduce.addEventListener('change', start);
  }
  const next = EFFECTS[id] ? id : null;
  canvas.hidden = !next;
  // Frosted-glass blur over a moving canvas is recomputed every frame and halves the frame rate,
  // so animated themes use slightly more opaque panels instead (see .fx-on in style.css).
  document.documentElement.classList.toggle('fx-on', !!next);
  if (next === current) return;
  current = next;
  start();
}

export const hasEffect = (id) => id in EFFECTS;
