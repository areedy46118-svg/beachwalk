/* A hands-off walk down the beach with the game's own movement, logging what
 * goes wrong. await import('/tools/walker.js'); __walk({ to: -700, x: 11 })
 * Captures console warnings/errors (window.__logs), and every frame where the
 * body stalls, jumps, leaves the ground or goes under it. A fake clock moves
 * with the steps so wall-clock timers (the takes, the typewriter) advance. */
(function () {
  const b = window.__bw;
  if (!window.__logs) {
    window.__logs = [];
    for (const k of ['warn', 'error']) {
      const f = console[k].bind(console);
      console[k] = (...a) => { try { window.__logs.push(k + ': ' + a.map(String).join(' ').slice(0, 240)); } catch (e) {} f(...a); };
    }
    window.addEventListener('error', (e) => window.__logs.push('uncaught: ' + e.message + ' @' + e.lineno));
  }
  const real = performance.now.bind(performance);
  window.__walk = (o = {}) => {
    const { to = -300, x = 11, dt = 1 / 60, max = 20000, wander = 0 } = o;
    let off = 0; performance.now = () => real() + off;
    window.requestAnimationFrame = () => 0;
    b.fallbackLook = true;
    const ev = []; let lastZ = b.camera.position.z, stallT = 0, prev = b.camera.position.clone();
    let i = 0, worst = 0, t0 = real();
    for (; i < max; i++) {
      const p = b.camera.position;
      if (p.z <= to) break;
      // steer at a point 6 m ahead on the lane
      const tz = p.z - 6, tx = x + (wander ? Math.sin(p.z * 0.07) * wander : 0);
      b.look(Math.atan2(-(tx - p.x), -(tz - p.z)), -0.05);
      b.keys.KeyW = true;
      b.heal && b.heal();
      b.step(dt); off += dt * 1000;
      const d = p.distanceTo(prev);
      if (d > worst) worst = d;
      if (d > 0.4) ev.push(['jump', i, +p.x.toFixed(2), +p.z.toFixed(2), +d.toFixed(2)]);
      if (Math.abs(p.z - lastZ) < 0.001) { stallT += dt; if (stallT > 2) { ev.push(['stall', i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), b.state().dialogOpen ? 'dialog' : '']); break; } }
      else stallT = 0;
      lastZ = p.z; prev.copy(p);
    }
    b.keys.KeyW = false;
    performance.now = real;
    return { steps: i, at: [+b.camera.position.x.toFixed(2), +b.camera.position.y.toFixed(2), +b.camera.position.z.toFixed(2)], worstStep: +worst.toFixed(3), ms: Math.round(real() - t0), ev: ev.slice(0, 40), logs: window.__logs.slice(-25) };
  };
})();
