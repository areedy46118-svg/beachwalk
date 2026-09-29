/* A hands-off walk through a list of waypoints with the game's own movement.
 * await import('/tools/route.js'); __route([[x, z], [x, z, 'crouch'], ...])
 * Each leg steers at the waypoint until within `near` of it in plan; a leg
 * that makes no progress for `stall` seconds is reported and the walk stops.
 * Records the worst single-frame move, every jump over 0.4 m, and eye-height
 * steps over 0.12 m (the "floor snaps under you" class of bug). */
(function () {
  const b = window.__bw;
  const real = performance.now.bind(performance);
  window.__route = (pts, o = {}) => {
    const { dt = 1 / 60, near = 0.45, stall = 2.5, max = 30000, run = false } = o;
    let off = 0; performance.now = () => real() + off;
    window.requestAnimationFrame = () => 0;
    b.fallbackLook = true;
    const p = b.camera.position, prev = p.clone();
    const ev = [], ring = []; let ctx = null; let worst = 0, worstY = 0, i = 0, leg = 0, best = Infinity, bestT = 0;
    for (; i < max && leg < pts.length; i++) {
      const w = pts[leg];
      const dx = w[0] - p.x, dz = w[1] - p.z, d = Math.hypot(dx, dz);
      if (d < near) { leg++; best = Infinity; bestT = 0; continue; }
      if (d < best - 0.02) { best = d; bestT = 0; } else { bestT += dt; if (bestT > stall) { ev.push(['stall', leg, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), 'd=' + d.toFixed(2)]); break; } }
      b.look(Math.atan2(-dx, -dz), -0.05);
      b.keys.KeyW = true; b.keys.ShiftLeft = !!run;
      if (w[2] === 'crouch' && !b.crouching) b.crouching = true;
      if (w[2] === 'stand' && b.crouching) b.crouching = false;
      if (w[2] === 'jump' && d < 1.4) b.keys.Space = true; else b.keys.Space = false;
      b.heal && b.heal();
      b.step(dt); off += dt * 1000;
      const m = p.distanceTo(prev), my = Math.abs(p.y - prev.y);
      if (m > worst) worst = m; if (my > worstY) worstY = my;
      ring.push([i, +p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +m.toFixed(3), b.crouching ? 1 : 0]); if (ring.length > 6) ring.shift();
      if (m > 0.4) { ev.push(['jump', leg, i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +m.toFixed(2)]); if (!ctx) { ctx = ring.slice(); if (o.stopOnJump) break; } }
      else if (my > 0.12) ev.push(['ystep', leg, i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +my.toFixed(2)]);
      prev.copy(p);
    }
    b.keys.KeyW = false; b.keys.ShiftLeft = false; b.keys.Space = false;
    performance.now = real;
    return { steps: i, legsDone: leg, of: pts.length, at: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], worstStep: +worst.toFixed(3), worstY: +worstY.toFixed(3), ev: ev.slice(0, 30), ctx, logs: (window.__logs || []).slice(-15) };
  };
})();
