// A drifting, parallax starfield. Pauses when the tab is hidden and respects reduced motion.
export function starfield(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, stars = [], mx = 0, my = 0, raf;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const n = Math.min(520, Math.floor((innerWidth * innerHeight) / 3200));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      z: Math.random() * 0.9 + 0.1,
      tw: Math.random() * Math.PI * 2,
      hue: [200, 260, 320, 45][Math.floor(Math.random() * 4)],
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      if (!reduce) {
        s.x -= s.z * 0.15;
        if (s.x < 0) s.x += w;
      }
      const px = s.x + mx * s.z * 18, py = s.y + my * s.z * 18;
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.tw + t / (1400 / s.z)));
      ctx.fillStyle = `hsla(${s.hue}, 90%, ${70 + s.z * 25}%, ${a * s.z})`;
      const r = s.z * 1.6 * (devicePixelRatio > 1 ? 1.5 : 1);
      ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
  resize();
  raf = requestAnimationFrame(frame);
}
