/* What each castle's walkable floor is MADE of. Not part of the game.
 *   eval(await (await fetch('/tools/castlefloor.js')).text())
 *   __floorMats('fort' | 'c13')   per material: cells of the courts' floor (S._main) it is
 * One pass over the triangles, binned into the walk's own cells; a cell takes the material
 * of the face whose height at the cell's centre is the floor's. Needs S._main built. */
(function () {
  const b = window.__bw;
  window.__floorMats = (nm, every = 1) => {
    const S = nm === 'c13' ? b.C13_SITE : b.FORT_SITE;
    const root = nm === 'c13' ? b.scene.getObjectByName('castle13') : b.fortWorld();
    const W = S.walk, gw = W.gw, cell = W.cell, main = S._main.set;
    root.updateMatrixWorld(true);
    const best = new Map();                    // cell -> [dy, matName]
    const v = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], e = root.matrixWorld.elements;
    root.traverse((o) => {
      if (!o.isMesh || o.userData.bwGhost || o.name === 'hitProxy') return;
      o.updateMatrixWorld(true);
      const g = o.geometry, P = g.attributes.position, I = g.index, E = o.matrixWorld.elements;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const groups = g.groups && g.groups.length ? g.groups : [{ start: 0, count: I ? I.count : P.count, materialIndex: 0 }];
      for (const G of groups) {
        const mname = (mats[G.materialIndex] || mats[0]).name || o.name || 'anon';
        for (let t = G.start; t < G.start + G.count; t += 3) {
          for (let c = 0; c < 3; c++) {
            const id = I ? I.getX(t + c) : t + c, x = P.getX(id), y = P.getY(id), z = P.getZ(id);
            v[c][0] = E[0] * x + E[4] * y + E[8] * z + E[12] - S.X;
            v[c][1] = E[1] * x + E[5] * y + E[9] * z + E[13] - S.Y;
            v[c][2] = E[2] * x + E[6] * y + E[10] * z + E[14] - S.Z;
          }
          const [A, B, C] = v;
          const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
          const ny = uz * wx - ux * wz; const nl = Math.hypot(uy * wz - uz * wy, ny, ux * wy - uy * wx) || 1;
          if (Math.abs(ny / nl) < 0.5) continue;           // floors only
          const i0 = Math.max(0, Math.floor((Math.min(A[0], B[0], C[0]) - W.x0) / cell)), i1 = Math.min(gw - 1, Math.floor((Math.max(A[0], B[0], C[0]) - W.x0) / cell));
          const j0 = Math.max(0, Math.floor((Math.min(A[2], B[2], C[2]) - W.z0) / cell)), j1 = Math.min(W.gh - 1, Math.floor((Math.max(A[2], B[2], C[2]) - W.z0) / cell));
          const det = ux * wz - uz * wx; if (Math.abs(det) < 1e-9) continue;
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const k = j * gw + i, f = main.get(k); if (f === undefined) continue;
            const px = W.x0 + (i + 0.5) * cell - A[0], pz = W.z0 + (j + 0.5) * cell - A[2];
            const s = (px * wz - pz * wx) / det, r = (ux * pz - uz * px) / det;
            if (s < -0.02 || r < -0.02 || s + r > 1.02) continue;
            const y = A[1] + s * uy + r * wy, dy = Math.abs(y - f);
            const cur = best.get(k); if (!cur || dy < cur[0]) best.set(k, [dy, mname]);
          }
        }
      }
    });
    const out = {};
    for (const [k, f] of main) {
      const r = best.get(k), m = r && r[0] < 0.3 ? r[1] : 'NONE';
      const o2 = out[m] || (out[m] = { n: 0, cells: [] }); o2.n++;
      o2.cells.push([+(W.x0 + (k % gw + 0.5) * cell).toFixed(2), +(W.z0 + (Math.floor(k / gw) + 0.5) * cell).toFixed(2), +f.toFixed(2)]);
    }
    window['__fm_' + nm] = out;
    return Object.fromEntries(Object.entries(out).map(([k, o2]) => [k, o2.n]));
  };
})();
