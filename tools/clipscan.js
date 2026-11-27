/* STONE YOU CAN WALK INTO (2026-11-25, the owner, from inside a big rock by the shore: "make sure he doesnt clip through anything
 * i shouldnt clip through this either"). Walks the player down the whole beach (z from `Z0` to `Z1` in `STEP` m stops, a second at
 * each for the far props and the streamed models to come in), and at each stop asks every drawn, still mesh standing in the walk
 * band (WADE_X-1 … CLIFF_BLOCK_X) on a half-metre grid: where it stands more than 0.6 m over the sand, and the point is INSIDE it
 * (an upward ray from the sand crosses it an odd number of times — an overhang you walk under crosses twice), is there a collider
 * there that stops a body (`rockColliders`, top within half a metre of the stone's)? Prints the uncovered cells grouped by mesh.
 *   PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/clipscan.js' /tmp/bw-clip      (&z0=..&z1=..&step=.. to narrow) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), Z0 = +(Q.get('z0') || 70), Z1 = +(Q.get('z1') || -1330), STEP = +(Q.get('step') || 30);
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const T = b.THREE, C = b.camera, bx = new T.Box3(), rc = new T.Raycaster(), up = new T.Vector3(0, 1, 0);
const XA = (b.WADE_X ?? -2.4) - 1, XB = b.CLIFF_BLOCK_X ?? 14.2;   // (not on `__bw`: main.js WADE_X -2.4, CLIFF_BLOCK_X = 16 - 1.8)
const seen = new Set(), found = new Map();
const nameOf = (o) => { let n = o.name || o.material?.name || '?', p = o.parent; for (let k = 0; k < 3 && p && p !== b.scene; k++, p = p.parent) n = (p.name || '?') + '/' + n; return n; };
const inCam = (o) => { for (let p = o; p; p = p.parent) if (p === C) return true; return false; };
// every height at which the vertical line through (x, z) crosses the mesh's surface, both windings (three's Raycaster is off
// on many of these: `raycast` emptied for the frame's pick, or another layer), from a 0.5 m grid of its world triangles
const crossIdx = (m) => {
  if (m.userData._cxi) return m.userData._cxi;
  const g = m.geometry, P = g.attributes.position, idx = g.index, n = idx ? idx.count : P.count, W = new Float32Array(P.count * 3), v = new T.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z; }
  const cells = new Map(), CS = 0.5, ix = (i) => (idx ? idx.getX(i) : i) * 3;
  for (let t = 0; t + 2 < n; t += 3) {
    const a = ix(t), bb = ix(t + 1), c = ix(t + 2);
    const x0 = Math.floor(Math.min(W[a], W[bb], W[c]) / CS), x1 = Math.floor(Math.max(W[a], W[bb], W[c]) / CS);
    const z0 = Math.floor(Math.min(W[a + 2], W[bb + 2], W[c + 2]) / CS), z1 = Math.floor(Math.max(W[a + 2], W[bb + 2], W[c + 2]) / CS);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 400) continue;
    for (let X = x0; X <= x1; X++) for (let Z = z0; Z <= z1; Z++) { const k = X * 100003 + Z; let L = cells.get(k); if (!L) cells.set(k, L = []); L.push(a, bb, c); }
  }
  return (m.userData._cxi = { W, cells, CS });
};
const crossings = (m, x, z) => {
  const R = crossIdx(m), L = R.cells.get(Math.floor(x / R.CS) * 100003 + Math.floor(z / R.CS)); if (!L) return [];
  const W = R.W, out = [];
  for (let i = 0; i < L.length; i += 3) {
    const a = L[i], bb = L[i + 1], c = L[i + 2];
    const x0 = W[a], z0 = W[a + 2], x1 = W[bb], z1 = W[bb + 2], x2 = W[c], z2 = W[c + 2];
    const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2); if (Math.abs(d) < 1e-12) continue;
    const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d, l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d, l2 = 1 - l0 - l1;
    if (l0 < 0 || l1 < 0 || l2 < 0) continue;
    out.push(l0 * W[a + 1] + l1 * W[bb + 1] + l2 * W[c + 1]);
  }
  out.sort((p, q) => p - q);
  const u = []; for (const y of out) if (!u.length || y - u[u.length - 1] > 0.004) u.push(y);   // a shared edge counted once
  return u;
};
for (let z = Z0; z >= Z1; z -= STEP) {
  C.position.set(6, 1.7, z); b.camBaseY = 1.7;
  for (let i = 0; i < 40; i++) { b.frame(1); await sleep(25); }
  const meshes = [];
  b.scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || seen.has(o) || inCam(o)) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.isShaderMaterial || m === b.sandMatS?.()) return;
    o.updateWorldMatrix(true, false); bx.setFromObject(o); if (bx.isEmpty()) return;
    if (bx.max.x - bx.min.x > 90 || bx.max.z - bx.min.z > 90) return;            // the sand, the sea, the cliff, the sky
    if (bx.max.y < 0.7 || bx.min.y > 1.8) return;                                 // in the sand, or overhead
    if (bx.max.x < XA || bx.min.x > XB || bx.max.z < z - STEP - 20 || bx.min.z > z + 20) return;
    if (Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z) < 0.5) return;          // a shell, a stone: nothing to walk into
    if (Q.get('rocks')) { let r = false; for (let q = o; q && !r; q = q.parent) r = q === b.rockGroupS() || /rock/i.test(q.name || '') || /rock/i.test(o.material.name || ''); if (!r) return; }
    meshes.push([o, bx.clone()]);
  });
  for (const [o, B] of meshes) {
    seen.add(o);
    const side = o.material.side; o.material.side = T.DoubleSide;
    let bad = [], nIn = 0;
    if (Q.get('dbg')) { const R = crossIdx(o), cx = (B.min.x + B.max.x) / 2, cz = (B.min.z + B.max.z) / 2; log('  dbg', nameOf(o), 'verts', o.geometry.attributes.position.count, 'idx', o.geometry.index ? o.geometry.index.count : '-', 'cells', R.cells.size, 'W0', R.W[0].toFixed(2), R.W[1].toFixed(2), R.W[2].toFixed(2), 'at centre', JSON.stringify(crossings(o, cx, cz).map((y) => +y.toFixed(2)))); }
    for (let x = Math.ceil(Math.max(B.min.x, XA) * 2) / 2; x <= Math.min(B.max.x, XB); x += 0.5) for (let zz = Math.ceil(B.min.z * 2) / 2; zz <= B.max.z; zz += 0.5) {
      const g = Math.max(0, b.beachGroundAt(x, zz));   // the ground you stand on there (an apron, a mound), not y = 0
      const hy = crossings(o, x, zz).filter((y) => y > g + 0.15); if (!hy.length) continue;
      // the stretches of this column that are INSIDE the stone: odd crossings start inside it
      const iv = []; let k = 0; if (hy.length % 2) { iv.push([g + 0.15, hy[0]]); k = 1; }
      for (; k + 1 < hy.length; k += 2) iv.push([hy[k], hy[k + 1]]);
      // anything between a knee and the eye's near plane (an eye at 1.7, its head to ~1.95) is in your way
      const hit = iv.find(([a, c]) => c > g + 0.6 && a < g + 1.95); if (!hit) continue;
      nIn++;
      const top = Math.max(...hy);
      let ok = false; for (const c of b.colNear(x, zz, 0)) { if (g >= c.top - (c.step ?? 0.42)) continue; if (c.floorY !== undefined && g + 1.75 < c.floorY) continue; if (b.solidDepth(c, x, zz, 0) > 0.02) { ok = true; break; } }   // the walk's own rule (`solidBlocks`), a body on the sand with its head at 1.75
      if (!ok && Q.get('why') && bad.length < 4) log('   why', x, zz, 'g', g.toFixed(2), 'hy', JSON.stringify(hy.map((y) => +y.toFixed(2))), 'mine', JSON.stringify(b.vCrossings(o, x, zz).map((y) => +y.toFixed(2))), 'near', b.colNear(x, zz, 0.6).filter((c) => b.solidDepth(c, x, zz, 0.6) > 0).map((c) => (c.r != null ? 'r' + c.r.toFixed(2) : 'box') + ' top' + c.top.toFixed(2) + (c.floorY != null ? ' fY' + c.floorY.toFixed(2) : '') + (c.fill ? ' fill' : '')).join('|'), 'wm', o.matrixWorld.elements[12].toFixed(2), o.matrixWorld.elements[14].toFixed(2));
      if (!ok) bad.push([x, zz, top]);
    }
    o.material.side = side;
    if (Q.get('v')) log('  mesh', nameOf(o), 'x', B.min.x.toFixed(1), B.max.x.toFixed(1), 'z', B.min.z.toFixed(1), B.max.z.toFixed(1), 'y', B.min.y.toFixed(1), B.max.y.toFixed(1), 'stone cells', nIn, 'uncovered', bad.length);
    if (bad.length) {
      const k = nameOf(o), f = found.get(k) || { n: 0, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, y: 0 };
      for (const [x, zz, y] of bad) { f.n++; f.x0 = Math.min(f.x0, x); f.x1 = Math.max(f.x1, x); f.z0 = Math.min(f.z0, zz); f.z1 = Math.max(f.z1, zz); f.y = Math.max(f.y, y); }
      found.set(k, f);
    }
  }
  log('stop z', z, 'meshes', meshes.length, 'uncovered so far', [...found.values()].reduce((s, f) => s + f.n, 0));
}
for (const [k, f] of [...found].sort((a, b) => b[1].n - a[1].n)) log('UNCOVERED', f.n, 'cells', k, 'x', f.x0, f.x1, 'z', f.z0, f.z1, 'top', f.y.toFixed(2));
log('fills from above', w.__bwRockFill);
log('DONE');
