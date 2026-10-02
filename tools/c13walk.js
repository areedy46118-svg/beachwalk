/* CASTLE XIII WALK TEST. Not part of the game.
 *   await import('/tools/c13shot.js'); await __c13Go(); await import('/tools/c13walk.js')
 *   __c13Clip(12, 300)     walk out from a few spots in every direction
 *   __c13Route()           the way through: the door you arrive by, the arch, the throne room's door
 * Drives the real update with the keys and the look, and reports any frame the
 * body ended inside drawn stone, inside something the dressing stood on the
 * floor (a stall, a crate, the fountain), off the castle, or stalled. */
(function () {
  const b = window.__bw;
  const local = () => ({ x: b.camera.position.x - b.C13_X, z: b.camera.position.z - b.C13_Z });
  const inSolid = (p, r) => {
    for (const s of b.c13Solids) {
      const dx = p.x - s.x, dz = p.z - s.z;
      if (s.r !== undefined) { if (Math.hypot(dx, dz) < s.r + r - 0.02) return true; continue; }
      const vx = -s.uz, vz = s.ux, a = dx * s.ux + dz * s.uz, c = dx * vx + dz * vz;
      if (Math.abs(a) < s.hw + r - 0.02 && Math.abs(c) < s.hd + r - 0.02) return true;
    }
    return false;
  };
  const place = (lx, lz) => {
    b.fallbackLook = true;
    b.placeInC13();
    b.camera.position.x = b.C13_X + lx; b.camera.position.z = b.C13_Z + lz;
    for (let i = 0; i < 3; i++) b.step(1 / 60);
  };
  window.__c13Clip = function (dirs = 12, ticks = 300) {
    const T = b.c13Thrive(), F = T.fountain;
    const starts = [[42, -12], [24, -4], [-6, 2], F ? [F.x + 5.5, F.z] : [-20, 6], [-14, 14]];
    let frames = 0, stone = 0, solid = 0, stalls = 0, worst = 0;
    for (const [sx, sz] of starts) for (let d = 0; d < dirs; d++) {
      place(sx, sz);
      const yaw = d / dirs * Math.PI * 2;
      b.keys.KeyW = true;
      let last = local(), still = 0;
      for (let t = 0; t < ticks; t++) {
        b.look(yaw + Math.sin(t * 0.05) * 0.35, 0);
        if (t % 70 === 35) b.keys.Space = true; else b.keys.Space = false;
        b.step(1 / 60); frames++;
        const p = local();
        const feet = b.camera.position.y - 1.7;
        const h = b.keepWallNear ? b.keepWallNear(b.camera.position.x, b.camera.position.z, 0.20, feet + 0.7, feet + 1.6, b.C13_SITE) : null;
        if (h && h.depth > 0.05) { stone++; worst = Math.max(worst, h.depth); }
        if (inSolid(p, 0.18)) solid++;
        const mv = Math.hypot(p.x - last.x, p.z - last.z);
        if (mv < 0.002) still++; else still = 0;
        if (still === 90) stalls++;
        last = p;
      }
      b.keys.KeyW = false; b.keys.Space = false;
    }
    return { frames, inStone: stone, worstDepth: +worst.toFixed(3), inDressing: solid, stalled: stalls };
  };
  window.__c13Route = function () {
    const T = b.c13Thrive(); if (!T || !T.door) return 'no door';
    b.openC13Arch(true);
    for (let i = 0; i < 10; i++) b.step(1 / 60);
    const D = T.door;
    const wp = [[24, -5], [14, -2.5], [b.C13_ARCH.x + 3, b.C13_ARCH.z], [b.C13_ARCH.x - 4, b.C13_ARCH.z + 0.5], [-6, 3], [-12, 9], [D.x + D.nx * 3, D.z + D.nz * 3], [D.x + D.nx * 1.0, D.z + D.nz * 1.0]];
    place(42, -12);
    let ticks = 0, i = 0, still = 0, worstStill = 0, last = local();
    b.keys.KeyW = true;
    while (i < wp.length && ticks < 6000) {
      const p = local(), dx = wp[i][0] - p.x, dz = wp[i][1] - p.z;
      if (Math.hypot(dx, dz) < 0.8) { i++; continue; }
      b.look(Math.atan2(-dx, -dz), 0);
      b.step(1 / 60); ticks++;
      const q = local(), mv = Math.hypot(q.x - last.x, q.z - last.z);
      if (mv < 0.003) { still++; worstStill = Math.max(worstStill, still); } else still = 0;
      if (still > 240) break;
      last = q;
    }
    b.keys.KeyW = false;
    const p = local();
    return { reached: i, of: wp.length, ticks, worstStillFrames: worstStill, at: [+p.x.toFixed(1), +p.z.toFixed(1)], prompt: b.state && b.state().hover };
  };
})();
