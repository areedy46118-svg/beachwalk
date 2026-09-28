/* PREVIEW-PANE HARNESS FOR THE HUNTER'S NAVIGATION. Not part of the game.
 *   eval(await (await fetch('/tools/catnav.js')).text()); await __catSetup(); __nav(12, 900)
 * Random chases over the main graph: you stand pinned somewhere, he starts
 * 8-20 m off on your storey, already hunting you. Measured every tick:
 *  - CLIP: any of five points down his body (tail, middle, shoulders, head)
 *    inside drawn stone by more than 0.12 m, at knee and chest height;
 *  - STALL: net progress under 0.3 m in a second with you more than 3.5 m
 *    off and nothing on purpose (a swing, an act, a peek) going on;
 *  - how long he took to reach you. */
(function(){
const b = window.__bw;
window.__catSetup = async function () {
  b.beginGame(); b.fallbackLook = true;
  b.camera.position.set(12, 1.7, b.CAVE_Z + 14);
  for (let i = 0; i < 80; i++) { await new Promise(r => setTimeout(r, 250)); b.frame && b.frame(1); if (b.catWalk) break; }
  b.placeInCatacombs(); b.placeInCatacombs();
  return { ok: !!b.catWalk };
};
// the deepest drawn face within r of (x, z) in a height band — and WHICH face
const faceNear = (x, z, r, lo, hi) => {
  const S = b.CAT_SITE, W = S.walls, v = W.v, ic = Math.floor((x - S.X) / W.cell), jc = Math.floor((z - S.Z) / W.cell);
  let bd = -1, bid = -1;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const list = W.map.get(W.key(ic + di, jc + dj)); if (!list) continue;
    for (const id of list) {
      if (!W.steep[id] || W.yhi[id] <= lo || W.ylo[id] >= hi) continue;
      const o = id * 9; let d2 = 1e9;
      for (const [a, c] of [[0, 3], [3, 6], [6, 0]]) {
        const ax = v[o + a], az = v[o + a + 2], bx = v[o + c], bz = v[o + c + 2], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
        let t = L > 1e-12 ? ((x - ax) * dx + (z - az) * dz) / L : 0; t = Math.max(0, Math.min(1, t));
        const qx = ax + dx * t - x, qz = az + dz * t - z; d2 = Math.min(d2, qx * qx + qz * qz);
      }
      if (d2 >= r * r) continue;
      const depth = r - Math.sqrt(d2); if (depth > bd) { bd = depth; bid = id; }
    }
  }
  return bd < 0 ? null : { depth: bd, mat: W.mat[bid], tall: W.yhi[bid] - W.ylo[bid] };
};
window.__hitMats = {};
const probe = (u) => {
  const p = u.g.position, yaw = u.g.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
  let worst = 0, wm = null;
  for (const a of [-0.9, 0, 0.8, 1.3, 1.7]) for (const h of [0.55, 1.0]) {
    const x = p.x + fx * a, z = p.z + fz * a;
    const hit = faceNear(x, z, 0.35, p.y + h - 0.05, p.y + h + 0.05);
    if (hit && hit.depth > worst) { worst = hit.depth; wm = hit.mat + (hit.tall < 0.4 ? ':low' : '') + '@' + a; }
  }
  if (worst > 0.12) __hitMats[wm] = (__hitMats[wm] || 0) + 1;
  return worst;
};
window.__nav = function (trials, steps, seed) {
  const u = b.crawlerUnit, g = typeof b.catG === "function" ? b.catG() : b.catG, M = g.main, N = g.nodes;
  let rs = seed || 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const res = []; let tClip = 0, tFrames = 0, worstStall = 0, reached = 0;
  const base = performance.now; let fake = base.call(performance);
  performance.now = () => fake;
  try {
  for (let t = 0; t < trials; t++) {
    let pi, ui;
    for (let k = 0; k < 400; k++) {
      pi = (rnd() * N.length) | 0; if (M && !M[pi]) continue;
      const P = N[pi]; if (P.h < 2.2) continue;
      ui = -1;
      for (let j = 0; j < 300; j++) { const q = (rnd() * N.length) | 0; if (M && !M[q]) continue; const d = Math.hypot(N[q].x - P.x, N[q].z - P.z); if (d > 8 && d < 20 && Math.abs(N[q].f - P.f) < 0.6) { ui = q; break; } }
      if (ui >= 0) break;
    }
    const P = N[pi], U = N[ui];
    b.camera.position.set(P.x, P.f + 1.7, P.z); b.camBaseY = P.f + 1.7; b.groundY = P.f; b.setCatFloor && b.setCatFloor(P.f);
    u.g.position.set(U.x, U.f, U.z); u.catFloor = U.f; u.path = null; u.catRouteFail = 0; u.catGrind = 0; u.catGAt = null; u.catStill = 0; u.catReach = null;
    const C = u.cat || (u.cat = {}); C.mode = 'chase'; C.blooded = true; u.st.awake = true; u.st.roar = 0; u.st.hp = u.kind.hp; u.st.atk = -1;
    u.catLastSeen = { x: P.x, z: P.z, f: P.f }; u.catLost = 0;
    let clip = 0, moveF = 0, stall = 0, worst = 0, mark = { x: U.x, z: U.z }, mt = 0, at = -1;
    for (let i = 0; i < steps; i++) {
      fake += 16;
      b.camera.position.set(P.x, P.f + 1.7, P.z); b.camBaseY = P.f + 1.7; b.groundY = P.f; b.heal && b.heal(); u.st.hp = u.kind.hp;
      if (!u.st.awake) { u.st.awake = true; C.mode = 'chase'; }
      b.step(0.016);
      const pp = u.g.position, sep = Math.hypot(pp.x - P.x, pp.z - P.z);
      if (at < 0 && sep < 3.5 && Math.abs(pp.y - P.f) < 1) at = i;
      if (sep > 4 && u.st.atk < 0) { moveF++; if (probe(u) > 0.12) clip++; }
      mt += 0.016;
      if (mt >= 1) { const net = Math.hypot(pp.x - mark.x, pp.z - mark.z); const busy = u.st.atk >= 0 || C.mode === 'act' || (C.peekHold || 0) > 0;
        if (!busy && net < 0.3 && sep > 3.5) { stall += mt; if (stall > 2.4 && !window.__stallLog) window.__stallLog = { t, i, pos: [pp.x - b.CAT_X, pp.y - b.CAT_Y, pp.z - b.CAT_Z].map(v => +v.toFixed(2)), me: [P.x - b.CAT_X, P.f - b.CAT_Y, P.z - b.CAT_Z].map(v => +v.toFixed(2)), mode: C.mode, path: u.path ? u.path.length + ':' + u.pathI : 0, av: u.catAvWant, grind: u.catGrind, fail: u.catRouteFail, block: u.catBlockT, still: u.catStill, sep: +sep.toFixed(2), dy: +(pp.y - P.f).toFixed(2) }; }
        else { worst = Math.max(worst, stall); stall = 0; }
        mark = { x: pp.x, z: pp.z }; mt = 0; }
    }
    worst = Math.max(worst, stall);
    tClip += clip; tFrames += moveF; worstStall = Math.max(worstStall, worst); if (at >= 0) reached++;
    res.push({ t, clip: +(clip / Math.max(1, moveF) * 100).toFixed(1), moveF, stall: +worst.toFixed(1), at: at < 0 ? null : +(at * 0.016).toFixed(1), mode: C.mode });
  }
  } finally { const off = fake - base.call(performance); performance.now = () => base.call(performance) + off; }   // never run the clock backwards
  return { clipPct: +(tClip / tFrames * 100).toFixed(2), worstStall: +worstStall.toFixed(1), reached: reached + '/' + trials, res };
};
/* TOMBS: for every sarcophagus in the place, you stand just past one end of
 * it and he starts on the far side, so the straight line to you runs through
 * it. Counted: frames with any part of his body inside a TOMB (not a wall),
 * and whether he gets to you. */
window.__tombs = function (steps) {
  const u = b.crawlerUnit, g = typeof b.catG === 'function' ? b.catG() : b.catG, M = g.main, N = g.nodes, W = b.CAT_SITE.walls;
  const cl = [];
  for (let i = 0; i < W.mat.length; i++) {
    if (!/Sarcophagus|Crypt/.test(W.mat[i]) || !W.steep[i]) continue;
    const o = i * 9, x = (W.v[o] + W.v[o + 3] + W.v[o + 6]) / 3, y = W.ylo[i], z = (W.v[o + 2] + W.v[o + 5] + W.v[o + 8]) / 3;
    let c = cl.find(c => Math.hypot(c.x - x, c.z - z) < 1.8 && Math.abs(c.y - y) < 1.2);
    if (!c) cl.push(c = { x, y, z, n: 0 });
    c.n++;
  }
  const tombs = cl.filter(c => c.n > 30);
  const base = performance.now; let fake = base.call(performance); performance.now = () => fake;
  const res = [];
  try {
    for (const T of tombs) {
      // nodes on your storey round it, 2.2-4 m out; you at one, he at the most opposite 6-10 m off
      const ring = []; for (let i = 0; i < N.length; i++) { if (M && !M[i]) continue; const n = N[i]; const d = Math.hypot(n.x - T.x, n.z - T.z); if (d > 2.2 && d < 4 && Math.abs(n.f - T.y) < 1.2 && n.h > 2.2) ring.push(i); }
      if (ring.length < 2) continue;
      const P = N[ring[0]]; let U = null, best = -2;
      for (let i = 0; i < N.length; i++) { if (M && !M[i]) continue; const n = N[i]; if (Math.abs(n.f - P.f) > 0.6) continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < 6 || d > 10) continue;
        const ax = T.x - P.x, az = T.z - P.z, bx = n.x - P.x, bz = n.z - P.z; const cos = (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz)); if (cos > best) { best = cos; U = n; } }
      if (!U || best < 0.8) continue;
      b.camera.position.set(P.x, P.f + 1.7, P.z); b.camBaseY = P.f + 1.7; b.groundY = P.f; b.setCatFloor && b.setCatFloor(P.f);
      u.g.position.set(U.x, U.f, U.z); u.catFloor = U.f; u.path = null; u.catRouteFail = 0; u.catGrind = 0; u.catGAt = null; u.catStill = 0; u.catReach = null;
      const C = u.cat || (u.cat = {}); C.mode = 'chase'; C.blooded = true; u.st.awake = true; u.st.roar = 0; u.st.hp = u.kind.hp; u.st.atk = -1;
      u.catLastSeen = { x: P.x, z: P.z, f: P.f }; u.catLost = 0;
      let tomb = 0, mv = 0, at = -1;
      for (let i = 0; i < steps; i++) {
        fake += 16;
        b.camera.position.set(P.x, P.f + 1.7, P.z); b.camBaseY = P.f + 1.7; b.groundY = P.f; b.heal && b.heal(); u.st.hp = u.kind.hp;
        if (!u.st.awake) { u.st.awake = true; C.mode = 'chase'; }
        b.step(0.016);
        const pp = u.g.position, sep = Math.hypot(pp.x - P.x, pp.z - P.z);
        if (at < 0 && sep < 3.5) at = i;
        if (u.st.atk < 0 && sep > 3) {
          mv++;
          const yaw = u.g.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
          let hit = false;
          for (const a of [-0.9, 0, 0.8, 1.3, 1.7]) for (const h of [0.55, 1.0]) { const q = faceNear(pp.x + fx * a, pp.z + fz * a, 0.35, pp.y + h - 0.05, pp.y + h + 0.05); if (q && q.depth > 0.12 && /Sarcophagus|Crypt/.test(q.mat)) hit = true; }
          if (hit) tomb++;
        }
      }
      res.push({ tomb: [+(T.x - b.CAT_X).toFixed(1), +(T.z - b.CAT_Z).toFixed(1)], inTomb: +(tomb / Math.max(1, mv) * 100).toFixed(1), mv, at: at < 0 ? null : +(at * 0.016).toFixed(1) });
    }
  } finally { const off = fake - base.call(performance); performance.now = () => base.call(performance) + off; }
  return res;
};
})();
