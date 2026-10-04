/* Castle gaps test. Not part of the game.
 *   await import('/tools/c13shot.js'); (boot as in c13shot) ; await import('/tools/c13gap.js')
 *   __gapMain()          the courts' floor: a walled flood from the arrival door
 *   __gapShove(push)     from every court cell beside a wall, shove into it for 24 frames;
 *                        reports any that end on floor the courts do not reach
 * The flood asks the walk's own questions: a step it could take, headroom, and
 * no drawn face crossed at three heights. */
(function () {
  const b = window.__bw;
  const site = () => (window.__gapSite || b.C13_SITE);
  window.__floodW = (lx0, lz0, jump) => {
    const S = site(), W = S.walk, gw = W.gw, gh = W.gh, cell = W.cell, C = S.cells;
    const at = (i, j) => C.get(j * gw + i), cx = (i) => W.x0 + (i + 0.5) * cell, cz = (j) => W.z0 + (j + 0.5) * cell;
    const i0 = Math.floor((lx0 - W.x0) / cell), j0 = Math.floor((lz0 - W.z0) / cell);
    const fl0 = at(i0, j0); if (!fl0) return null;
    const seen = new Map(); const q = [[i0, j0, fl0[0]]]; seen.set(j0 * gw + i0, fl0[0]);
    let qi = 0;
    while (qi < q.length) {
      const [i, j, f] = q[qi++];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= gw || jj >= gh) continue;
        const k = jj * gw + ii; if (seen.has(k)) continue;
        const fl = at(ii, jj); if (!fl) continue;
        let best = null;
        for (let m = 0; m < fl.length; m += 3) if (fl[m] - f < (jump || 0.62) && f - fl[m] < 3 && fl[m + 2] - fl[m] > 1.6) { if (best === null || Math.abs(fl[m] - f) < Math.abs(best - f)) best = fl[m]; }
        if (best === null) continue;
        const y = S.Y + Math.max(f, best);
        let blocked = false;
        for (const h of [0.7, 1.1, 1.5]) if (b.keepHitsWall(S.X + cx(i), S.Z + cz(j), S.X + cx(ii), S.Z + cz(jj), y + h, S)) { blocked = true; break; }
        if (blocked) continue;
        seen.set(k, best); q.push([ii, jj, best]);
      }
    }
    return seen;
  };
  // after `sessionStorage.setItem('beachwalk.skipIntro','1'); location.reload()` and an import of c13shot.js
  window.__gapBoot = async () => {
    b.beginGame(); b.settings.devMode = true;
    await __c13Go(); while (!b.fortWallsStep(1e6, b.C13_SITE));
    let n = 0; while ((b.mutCut || b.frozen()) && n < 3000) { b.step(1 / 60); n++; }
    __c13Step(20);
    return { frozen: b.frozen(), walls: b.c13State().walls };
  };
  window.__gapMain = (lx, lz) => { window.__main = __floodW(lx ?? 42, lz ?? -12, 1.4); return __main.size; };
  window.__gapShove = (push = 0.16, every = 7, place) => {
    const S = site(), W = S.walk, gw = W.gw, cell = W.cell, main = __main;
    const keyAt = (x, z) => Math.floor((z - S.Z - W.z0) / cell) * gw + Math.floor((x - S.X - W.x0) / cell);
    const cand = []; let i = 0;
    for (const [k, f] of main) {
      if ((i++) % every) continue;
      const x = S.X + W.x0 + (k % gw + 0.5) * cell, z = S.Z + W.z0 + (Math.floor(k / gw) + 0.5) * cell;
      const h = b.keepWallNear(x, z, 0.6, S.Y + f + 0.7, S.Y + f + 1.6, S);
      if (h) cand.push([x, z, f, h]);
    }
    const out = [];
    for (const [x, z, f, h] of cand) {
      let dx = h.x - x, dz = h.z - z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      (place || b.placeInC13)(); b.camera.position.set(x, S.Y + f + 1.7, z); b.camBaseY = S.Y + f + 1.7;
      for (let t = 0; t < 4; t++) b.step(1 / 60);
      for (let t = 0; t < 24; t++) { b.camera.position.x += dx * push; b.camera.position.z += dz * push; b.step(1 / 60); }
      const p = b.camera.position, k = keyAt(p.x, p.z);
      if (!main.has(k) && S.cells.has(k)) {
        // is it somewhere real (a sealed piece of floor), or the court's own edge the flood's coarse test missed?
        const far = !__floodW(p.x - S.X, p.z - S.Z, 1.4) ? 0 : __floodW(p.x - S.X, p.z - S.Z, 1.4).size;
        out.push([+(x - S.X).toFixed(1), +(z - S.Z).toFixed(1), +(p.x - S.X).toFixed(2), +(p.z - S.Z).toFixed(2), far]);
      }
    }
    return { tested: cand.length, out, sealed: out.filter((o) => o[4] > 0 && o[4] < main.size * 0.5).length };
  };
})();
