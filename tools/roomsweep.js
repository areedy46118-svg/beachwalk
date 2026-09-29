/* Walks the player into everything in a storeyed room and reports what the
 * corrections did: the worst single-frame move, how many frames moved the
 * body AGAINST the input (a push that sends you backwards), and how many
 * walks ended stuck. await import('/tools/roomsweep.js'); __roomSweep(spots, frames)
 * `spots` is [[x, z, feetY], ...] in world space. */
(function () {
  const b = window.__bw;
  window.__roomSweep = (spots, frames = 90) => {
    const p = b.camera.position, prev = p.clone();
    let worst = 0, worstAt = null, rev = 0, big = 0, n = 0, stuck = 0;
    for (const s of spots) for (let k = 0; k < 8; k++) {
      p.set(s[0], s[2] + 1.7, s[1]); b.camBaseY = p.y; b.groundY = s[2];
      b.keys.KeyW = false; for (let i = 0; i < 6; i++) b.step(1 / 60);
      const yaw = k * Math.PI / 4; b.look(yaw, -0.05);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      prev.copy(p); const start = p.clone();
      for (let i = 0; i < frames; i++) {
        b.keys.KeyW = true; b.heal && b.heal(); b.step(1 / 60);
        const dx = p.x - prev.x, dz = p.z - prev.z, m = Math.hypot(dx, dz);
        if (m > worst) { worst = m; worstAt = [+prev.x.toFixed(2), +prev.y.toFixed(2), +prev.z.toFixed(2), k]; }
        if (m > 0.2) big++;
        if (dx * fx + dz * fz < -0.004) rev++;
        n++; prev.copy(p);
      }
      if (Math.hypot(p.x - start.x, p.z - start.z) < 0.3) stuck++;
    }
    b.keys.KeyW = false;
    return { walks: spots.length * 8, frames: n, worst: +worst.toFixed(3), worstAt, big, rev, stuck };
  };
})();
