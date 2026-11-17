/* Scenarios for tools/probe.sh. Each gets { w, b, log, sleep, shot }. Not part of the game. */
export async function house({ b, log, sleep, shot }) {
  b.settings.devMode = true;
  b.loadHouse();
  for (let i = 0; i < 200 && !(b.houseS().ready); i++) { b.frame(2); await sleep(100); }
  const HW = b.houseS().world; log('house ready', b.houseS().ready, 'props', !!b.HP.toilet, !!b.HP.fridge, !!b.HP.tv);
  const H = HW.position, C = b.camera;
  const look = (x, y, z, tx, ty, tz) => { C.position.set(H.x + x, H.y + y, H.z + z); b.lookAt(H.x + tx, H.y + ty, H.z + tz); b.frame(1); C.position.set(H.x + x, H.y + y, H.z + z); b.lookAt(H.x + tx, H.y + ty, H.z + tz); C.updateMatrixWorld(true); };
  // the fridge, shut then open
  look(2.6, 2.2, -1.9, 4.3, 1.8, -1.9); shot('fridge_shut');
  b.HP.fridge.open = true; for (let i = 0; i < 90; i++) b.frame(1);
  look(2.6, 2.2, -1.9, 4.3, 1.8, -1.9); shot('fridge_open');
  // the toilet
  look(3.85, 6.5, -1.4, 3.85, 5.4, -2.7); shot('toilet_shut');
  b.HP.toilet.open = true; for (let i = 0; i < 60; i++) b.frame(1);
  look(3.85, 6.5, -1.4, 3.85, 5.4, -2.7); shot('toilet_open');
  // the TV, on (snow until the clip is there)
  b.hpTvToggle(); await sleep(1500); for (let i = 0; i < 10; i++) b.frame(1);
  look(2.2, 2.1, 5.27, 4.8, 2.0, 5.27); shot('tv_on');
  log('tv', b.HP.tv.on, 'ok', b.HP.tv.ok);
}

export async function toilet({ b, log, sleep, shot }) {
  b.settings.devMode = true; b.loadHouse();
  for (let i = 0; i < 200 && !(b.houseS().ready); i++) { b.frame(2); await sleep(100); }
  const H = b.houseS().world.position, C = b.camera, T = b.HP.toilet;
  log('toilet', !!T, T && T.pivot.position.toArray().map((v) => +v.toFixed(2)).join(','));
  const P = T.pivot.position;
  const look = () => { C.position.set(H.x + P.x - 0.2, H.y + P.y + 1.0, H.z + P.z + 1.3); b.lookAt(H.x + P.x, H.y + P.y, H.z + P.z + 0.2); C.updateMatrixWorld(true); };
  look(); b.frame(1); look(); shot('toilet_shut', 640, 4);
  T.open = true; for (let i = 0; i < 60; i++) b.frame(1); look(); shot('toilet_open', 640, 4);
}

// THE FARMERS' BLOWS ON SCREEN: a natural fight, standing still and facing whoever is swinging; each blow that hurt,
// where its tool was on the screen when it landed (ndc), and how many landed with no tool point (the old fallback)
export async function farmers({ w, b, log }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  log('boot', JSON.stringify(await w.__fortBoot()));
  w.__clockOn();
  b.settings.devMode = false;
  const cam = b.camera.position, home = [cam.x, cam.z], pts = []; let hurt = 0, noPt = 0, hp0 = b.state().hp;
  const P = b.dkSlotS(); if (P.unit) { P.unit.st.awake = false; P.unit.g.visible = false; }
  const seen = new Map();
  for (let i = 0; i < 60 * 40; i++) {
    const us = b.farmUnitsS().filter((f) => f.st.alive && f.farm && f.farm.out);
    let tgt = null, bd = 99; for (const f of us) { const d = Math.hypot(f.g.position.x - cam.x, f.g.position.z - cam.z); if (f.st.atk >= 0 && d < bd) { bd = d; tgt = f; } }
    if (!tgt) for (const f of us) { const d = Math.hypot(f.g.position.x - cam.x, f.g.position.z - cam.z); if (d < bd) { bd = d; tgt = f; } }
    if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
    w.__adv(1); cam.x = home[0]; cam.z = home[1];
    if (P.unit) { P.unit.st.awake = false; }
    if (b.state().hp < hp0) {
      hurt++;
      let best = null; for (const f of us) if (f.hitAt && (!best || f.hitAt > best.hitAt)) best = f;
      if (best && best.hitPt && seen.get(best) !== best.hitAt) { seen.set(best, best.hitAt); const q = best.hitPt.clone().project(b.camera); pts.push(q.x.toFixed(2) + ',' + q.y.toFixed(2) + (q.z > 1 ? 'B' : '')); }
      else noPt++;
    }
    b.heal(); hp0 = b.state().hp;
  }
  log('hurt', hurt, 'with a tool point', pts.length, 'without', noPt);
  log('ndc', pts.join('  '));
}

// THE SEA ARTIFACT'S WAVE: four stills through it, from a little behind and above where it starts
export async function wave({ w, b, log, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); w.__clockOn();
  const C = b.camera.position; C.set(8, 1.7, -40); b.lookAt(8, 0.4, -46); w.__adv(5);
  const gy = 0;
  log('dbg', typeof b.seaWaveDbg, typeof b.seaS, b.sea && b.sea.waves && b.sea.waves.length);
  try { b.seaWaveDbg(8, gy, -44); } catch (e) { log('seaWave threw', e && e.stack); }
  log('waves', b.sea.waves.length);
  for (const [t, n] of [[0.18, 'wave_a'], [0.45, 'wave_b'], [0.75, 'wave_c'], [1.2, 'wave_d']]) {
    while (b.sea.waves[0].t < t) { C.set(8, 1.7, -40); b.lookAt(8, 0.4, -46); w.__adv(1); }
    C.set(8, 1.7, -40); b.lookAt(8, 0.4, -46); shot(n, 480, 1.6);
  }
  log('wave t', b.sea.waves[0].t.toFixed(2));
}

// BODIES: kill beach mutants (light, heavy, and a shotgun-like power), then hack each corpse five times; report how
// high any joint went above the sand and where it came to rest
export async function bodies({ w, b, log }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); w.__clockOn();
  b.settings.devMode = true;
  const C = b.camera.position;
  const kinds = ['pale', 'red', 'dark', 'dealer'];
  for (const [i, kn] of kinds.entries()) {
    const u = b.mutants.find((m) => m.kindName === kn); if (!u) { log(kn, 'none'); continue; }
    try { Object.defineProperty(u.g, 'visible', { get: () => true, set: () => {}, configurable: true }); } catch (e) {}
    const x = 8, z = -30 - i * 8; u.g.position.set(x, 0, z); C.set(x + 2.2, 1.7, z); b.lookAt(x, 1, z);
    Object.assign(u.st, { alive: true, struck: false, hp: 1, awake: false, atk: -1 });
    for (let k = 0; k < 40 && !u.model; k++) { w.__adv(5); await new Promise((r) => setTimeout(r, 100)); }
    w.__adv(3);
    b.hurtMutant(u, 99, [0.4, 1.0, 1.0, 1.0][i]);
    let top = 0, t = 0;
    for (let f = 0; f < 60 * 8; f++) { w.__adv(1); if (u.rag) for (const q of u.rag.parts) top = Math.max(top, q.p.y); }
    const rest = u.rag ? Math.max(...u.rag.parts.map((q) => q.p.y)) : -1;
    // now hack the corpse
    let top2 = 0;
    for (let h = 0; h < 5; h++) { if (u.rag) { const q = u.rag.parts[0]; b.ragHit(u, q, 1.0, 0.3, 0.7); } for (let f = 0; f < 30; f++) { w.__adv(1); if (u.rag) for (const q of u.rag.parts) top2 = Math.max(top2, q.p.y); } }
    for (let f = 0; f < 60 * 10; f++) w.__adv(1);
    const rest2 = u.rag ? Math.max(...u.rag.parts.map((q) => q.p.y)) : -1;
    log(kn, 'rag', !!u.rag, 'peak', top.toFixed(2), 'rest top joint', rest.toFixed(2), '| hacked 5x: peak', top2.toFixed(2), 'rest', rest2.toFixed(2), 'asleep', u.rag && u.rag.asleep);
  }
}

// THE LIGHTHOUSE'S GULLS: the island loaded, stills of four sitting birds from a metre and a half off
export async function isleGulls({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready); i++) { b.frame(2); await sleep(100); }
  const W = b.isleWorldG(); W.visible = true;
  w.__clockOn();
  for (let i = 0; i < 30; i++) w.__adv(1);
  const birds = b.isleBirdsS ? b.isleBirdsS() : null;
  log('ready', b.isleS().ready, 'birds', birds && birds.length);
  const C = b.camera;
  // stand near each, so its head is found; then three looks, forced, from beside it
  let n = 0;
  for (const B of (birds || [])) {
    if (B.gone || n >= 3) continue;
    C.position.set(B.c.x + 2, B.c.y + 0.5, B.c.z); w.__adv(2);
    if (!B.head) { log('no head on', n); continue; }
    log('bird', n, 'head verts', B.head.idx.length, 'of', B.m.geometry.attributes.position.count);
    const sd = B.head.side, d = Math.max(1.2, B.r * 5);
    for (const [nm, yw, tp] of [['l', 0.7, 0], ['c', 0, 0.3], ['r', -0.7, 0]]) {
      B.head.t = 99; B.head.wy = yw; B.head.wt = tp;
      for (let f = 0; f < 40; f++) { C.position.set(B.c.x + sd.x * d, B.c.y + 0.2, B.c.z + sd.z * d); b.lookAt(B.c.x, B.c.y + 0.1, B.c.z); w.__adv(1); }
      C.position.set(B.c.x + sd.x * d, B.c.y + 0.2, B.c.z + sd.z * d); b.lookAt(B.c.x, B.c.y + 0.1, B.c.z); C.updateMatrixWorld(true);
      shot('gull' + n + nm, 360, 2.2);
    }
    n++;
  }
}

export async function isleGullDbg({ w, b, log, sleep }) {
  b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready); i++) { b.frame(2); await sleep(100); }
  b.isleWorldG().visible = true;
  for (let i = 0; i < 20; i++) b.frame(1);
  const B = b.isleBirdsS().find((q) => q.bird);
  if (!B) { log('no bird'); return; }
  const m = B.bird.g.children[0];
  log('skinned', m.isSkinnedMesh, 'skinW', !!m.geometry.attributes.skinWeight, 'skinI', !!m.geometry.attributes.skinIndex, 'bones', m.skeleton && m.skeleton.bones.length, 'b1 scale', m.skeleton.bones[1].scale.toArray().join(','), 'same', m.skeleton.bones[1] === B.bird.bones[1], 'bindMode', m.bindMode, 'parent', B.bird.g.parent && B.bird.g.parent.name, 'gscale', B.bird.g.scale.x.toFixed(2));
  const sw = m.geometry.attributes.skinWeight, si = m.geometry.attributes.skinIndex; let c = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < si.count; i++) { let bb = 0, bw = -1; for (let k = 0; k < 4; k++) { const wv = sw.getComponent(i, k); if (wv > bw) { bw = wv; bb = si.getComponent(i, k); } } c[bb]++; }
  const P = m.geometry.attributes.position; let xs = [1e9, -1e9]; for (let i = 0; i < P.count; i++) { xs[0] = Math.min(xs[0], P.getX(i)); xs[1] = Math.max(xs[1], P.getX(i)); }
  log('x range', xs.map((v) => v.toFixed(2)).join('..'), 'count', P.count);
  log('verts by main bone', c.join(','));
}

export async function isleGullAB({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready); i++) { b.frame(2); await sleep(100); }
  b.isleWorldG().visible = true; w.__clockOn();
  for (let i = 0; i < 30; i++) w.__adv(1);
  const B = b.isleBirdsS().find((q) => q.bird && !q.gone);
  const C = b.camera, yaw = B.bird.yaw0 + 0.9, d = 0.9;
  const place = () => { C.position.set(B.c.x + Math.sin(yaw) * d, B.c.y + 0.5, B.c.z + Math.cos(yaw) * d); b.lookAt(B.c.x, B.c.y, B.c.z); C.updateMatrixWorld(true); };
  place(); w.__adv(1); place(); shot('ab_both', 420, 2.2);
  const g = B.bird.g; log('g', g.visible, g.parent && g.parent.type, g.position.toArray().map((v) => v.toFixed(2)).join(','), 'c', B.c.toArray().map((v) => v.toFixed(2)).join(','), 'dr', JSON.stringify(B.m.geometry.drawRange));
  const m = g.children[0]; const bm = m.skeleton.boneMatrices; log('bone1 matrix', Array.from(bm.slice(16, 32)).map((v) => v.toFixed(2)).join(' '));
  log('bone1 world scale', m.skeleton.bones[1].matrixWorld.elements.slice(0, 3).map((v) => v.toFixed(2)).join(','), 'g scale', g.scale.x.toFixed(2), 'auto', m.skeleton.bones[1].matrixAutoUpdate, m.skeleton.bones[1].matrixWorldAutoUpdate);
  for (const q of b.isleBirdsS()) if (q.bird) q.bird.g.visible = false;
  b.renderer.render(b.scene, C); shot('ab_old', 420, 2.2);
}

// THE HOUSE'S DOORWAYS: what lies at the floor under each door's leaf (coplanar faces flicker)
export async function doorFloor({ w, b, log, sleep }) {
  b.settings.devMode = true; b.loadHouse();
  for (let i = 0; i < 200 && !(b.houseS().ready); i++) { b.frame(2); await sleep(100); }
  const HW = b.houseS().world, T = w.__bw.renderer && w.THREE;
  const D = b.elvDoorsS ? b.elvDoorsS() : null; log('doors', D && D.length);
  const V3 = b.camera.position.constructor, ray = new (b.raycasterClass || Object)();
  const meshes = []; HW.traverse((o) => { if (o.isMesh && o.visible && o.name !== 'hitProxy') meshes.push(o); });
  for (const d of (D || [])) {
    const out = [];
    for (const f of [0.25, 0.5, 0.75]) {
      const lx = d.alongX ? d.c.x + (f - 0.5) * d.w : d.c.x, lz = d.alongX ? d.c.z : d.c.z + (f - 0.5) * d.w;
      const o = new V3(HW.position.x + lx, HW.position.y + d.y0 + 0.5, HW.position.z + lz);
      const rc = b.mkRay(o, new V3(0, -1, 0)); const hits = rc.intersectObjects(meshes, false).slice(0, 4);
      out.push(hits.map((h) => (h.object.material.name || '?') + '@' + (h.point.y - HW.position.y).toFixed(4)).join(' / '));
    }
    log(d.name, 'y0', d.y0.toFixed(3), '|', out.join('  ||  '));
  }
}

// THE TV SHOW: the stage scene's own picture, read straight off its render target, three moments
export async function tvshow({ w, b, log, sleep }) {
  b.settings.devMode = true; b.loadHouse(); if (b.loadElvPuppet) b.loadElvPuppet();
  for (let i = 0; i < 200 && !(b.houseS().ready && b.HP.tv); i++) { b.frame(2); await sleep(100); }
  for (let i = 0; i < 60; i++) { b.frame(2); await sleep(50); }
  b.tvShowOn();
  const T = b.tvShowS();
  for (let i = 0; i < 100 && !T.man; i++) { b.tvShowTick(1 / 30); b.frame(1); await sleep(100); }
  log('man pos', T.man && T.man.position.toArray().map((v) => v.toFixed(2)).join(','), 'scale', T.man && T.man.scale.x.toFixed(3), 'pup pos', T.pup && T.pup.root.position.toArray().map((v) => v.toFixed(2)).join(','));
  log('man', !!T.man, 'pup', !!T.pup, 'bones', T.B && Object.keys(T.B).slice(0, 8).join(','));
  const R = b.renderer;
  for (const [k, n] of [[30, 'tv_a'], [80, 'tv_b'], [160, 'tv_c']]) {
    for (let i = 0; i < k; i++) b.tvShowTick(1 / 60);
    b.tvShowTick(1 / 60); b.tvShowTick(1 / 60);
    const W = T.rt.width, H = T.rt.height, px = new Uint8Array(W * H * 4);
    R.readRenderTargetPixels(T.rt, 0, 0, W, H, px);
    const c = document.createElement('canvas'); c.width = W * 3; c.height = H * 3; const g = c.getContext('2d');
    const im = new ImageData(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 4; for (let k2 = 0; k2 < 4; k2++) im.data[d + k2] = px[s + k2]; }
    const c1 = document.createElement('canvas'); c1.width = W; c1.height = H; c1.getContext('2d').putImageData(im, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(c1, 0, 0, W * 3, H * 3);
    const d = c.toDataURL('image/jpeg', 0.9).split(',')[1], nn = Math.ceil(d.length / 8000);
    for (let i = 0; i < nn; i++) console.log('[PBIMG]', n, i + '/' + nn, d.slice(i * 8000, (i + 1) * 8000));
  }
}

// THE ROCK GAP RAYS: the old Raycaster against the grid-indexed `vRayTop`, every sample point, every rock
export async function rockRays({ w, b, log }) {
  const T = w.__bw.renderer && w.__bw.scene.constructor;    // (any THREE class reachable)
  const RG = b.rockGroupS(); RG.updateMatrixWorld(true);
  const THREE = { Raycaster: w.__bw.mkRay(new (b.camera.position.constructor)(), new (b.camera.position.constructor)(0, -1, 0)).constructor };
  const V3 = b.camera.position.constructor;
  const stone = [], sandy = []; for (const o of RG.children) if (o.isMesh) (o.material === b.sandMatS() ? sandy : stone).push(o);
  let n = 0, diff = 0, maxd = 0, sdiff = 0;
  for (const m of stone) {
    const bb = new (w.__bw.HP.toilet ? Object : Object)(); const box = new (b.scene.children[0].geometry ? Object : Object)();
    m.geometry.computeBoundingBox(); const B = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    if (B.max.y < 0.9) continue;
    for (let x = Math.ceil(B.min.x * 2) / 2; x <= B.max.x; x += 0.5) for (let z = Math.ceil(B.min.z * 2) / 2; z <= B.max.z; z += 0.5) {
      const top = B.max.y + 1, far = B.max.y + 3;
      const ray = new THREE.Raycaster(new V3(x, top, z), new V3(0, -1, 0), 0, far);
      const h = ray.intersectObject(m, false)[0], q = b.vRayTop(m, x, z, top, far); n++;
      if (!!h !== (q !== null)) diff++; else if (h) { const d = Math.abs(h.point.y - q); maxd = Math.max(maxd, d); if (d > 1e-4) diff++; }
      const g = ray.intersectObjects(sandy, false)[0]; let gq = null; for (const s2 of sandy) { const v = b.vRayTop(s2, x, z, top, far); if (v !== null && (gq === null || v > gq)) gq = v; }
      if (!!g !== (gq !== null)) sdiff++; else if (g && Math.abs(g.point.y - gq) > 1e-4) sdiff++;
    }
  }
  log('points', n, 'rock mismatches', diff, 'max dy', maxd.toExponential(2), 'sand mismatches', sdiff, 'fills', w.__bwRockFill);
}

// THE PAVILION'S FLOOR TEST: the old ray against `vRayTop`, 3000 points over the upstairs room
export async function mushRays({ w, b, log }) {
  const M = b.mushHouseS(); const V3 = b.camera.position.constructor, F = b.MUSH_S().H_ROOM, room = [];
  M.group.updateMatrixWorld(true); M.group.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy' && !(o.material && o.material.opacity === 0)) room.push(o); });
  const RC = w.__bw.mkRay(new V3(), new V3(0, -1, 0)).constructor; let n = 0, diff = 0;
  for (let i = 0; i < 3000; i++) {
    const a = Math.random() * 6.283, r = 1.2 + Math.random() * 5, x = Math.sin(a) * r, z = Math.cos(a) * r;
    const p = M.group.localToWorld(new V3(x, F + 1.4, z)), ray = new RC(p.clone(), new V3(0, -1, 0), 0, 1.6);
    const h = ray.intersectObjects(room, false)[0], A = !h || M.group.worldToLocal(h.point.clone()).y < F + 0.03;
    let best = null; for (const m of room) { const y = b.vRayTop(m, p.x, p.z, p.y, 1.6); if (y !== null && (best === null || y > best)) best = y; }
    const B = best === null || M.group.worldToLocal(new V3(p.x, best, p.z)).y < F + 0.03; n++; if (A !== B) diff++;
  }
  log('points', n, 'mismatches', diff);
}

// THE PERF TOUR in one area (?a=fort | beach:-450 | ...), tools/perftour.js's own timing: 360 synced frames at 1080p
export async function tour({ w, log }) {
  const a = new URLSearchParams(location.search).get('a') || 'beach:-150';
  w.eval(await (await fetch('/tools/perftour.js?' + Date.now())).text());
  log('TOUR', await w.__tour(a));
}

// THE PERF TOUR UNDER THE JS SAMPLING PROFILER (?a=..., 2026-10-30): the same 360 timed frames, then the functions
// that held them — self time (where the CPU was) and inclusive time (what called it), by name:line, top 40 each
export async function tourProf({ w, b, log }) {
  const a = new URLSearchParams(location.search).get('a') || 'beach:-150';
  w.eval(await (await fetch('/tools/perftour.js?' + Date.now())).text());
  // armed at the first b.look, which __tour calls only inside its timed loop (one frame in)
  const look = b.look; let P = null;
  b.look = function (...x) { if (!P) P = new w.Profiler({ sampleInterval: 1, maxBufferSize: 600000 }); return look.apply(this, x); };
  const res = await w.__tour(a, +(new URLSearchParams(location.search).get('n') || 360));
  const tr = P ? await P.stop() : null; b.look = look;
  log('TOUR', res);
  if (!tr) { log('no trace'); return; }
  const self = new Map(), incl = new Map(), nm = (fi) => { const f = tr.frames[fi]; return (f.name || '(anon)') + ':' + (f.line || 0) + (f.resourceId != null && !/main\.js/.test(tr.resources[f.resourceId] || '') ? '@' + (tr.resources[f.resourceId] || '').split('/').pop().split('?')[0] : ''); };
  let tot = 0;
  for (const s of tr.samples) {
    if (s.stackId == null) continue; tot++;
    let st = tr.stacks[s.stackId]; const k = nm(st.frameId); self.set(k, (self.get(k) || 0) + 1);
    const seen = new Set(); for (let id = s.stackId; id != null; id = tr.stacks[id].parentId) { const kk = nm(tr.stacks[id].frameId); if (!seen.has(kk)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + 1); } }
  }
  const top = (m) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 40).map(([k, v]) => k + ' ' + v);
  log('PROF samples', tot, 'of', tr.samples.length);
  log('SELF', JSON.stringify(top(self)));
  log('INCL', JSON.stringify(top(incl)));
}

// A THROWAWAY SCRIPT AS A SCENARIO (?f=/path.js): its text is the body of an async function of (w, b, log, sleep, shot)
export async function evalFile({ w, b, log, sleep, shot }) {
  const f = new URLSearchParams(location.search).get('f');
  const src = await (await fetch(f + '?' + Date.now())).text();
  await new (Object.getPrototypeOf(async function () {}).constructor)('w', 'b', 'log', 'sleep', 'shot', src)(w, b, log, sleep, shot);
}

// WHAT THE DRAW CALLS ARE in an area (?a=...): every mesh in view, grouped by its top-level ancestor and material
export async function draws({ w, b, log }) {
  const a = new URLSearchParams(location.search).get('a') || 'beach:-150';
  w.eval(await (await fetch('/tools/perftour.js?' + Date.now())).text());
  b.beginGame(); b.settings.devMode = true; w.requestAnimationFrame = () => 0;
  if (a.startsWith('beach:')) { b.camera.position.set(4, 1.7, +a.split(':')[1]); b.camBaseY = 1.7; }
  else { const RB = b.ROOM_BACK[a]; RB.load(); for (let i = 0; i < 200 && !RB.ready(); i++) { b.frame(1); await new Promise((r) => setTimeout(r, 50)); } RB.place(); }
  for (let i = 0; i < 120; i++) { b.frame(1); if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0)); }
  const R = b.renderer, cam = b.camera, groups = new Map();
  const F = new (b.camera.constructor.prototype.constructor === Object ? Object : Object)();
  // count per full turn: 8 directions
  const seenObj = new Set();
  for (let k = 0; k < 8; k++) {
    b.look(k * Math.PI / 4, 0); b.frame(1);
    R.info.autoReset = false; R.info.reset();
    const list = []; const orig = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = (camera, scene, geometry, material, object, group) => { list.push([object, material]); return orig(camera, scene, geometry, material, object, group); };
    R.render(b.scene, cam); R.renderBufferDirect = orig; R.info.autoReset = true;
    for (const [o, m] of list) {
      let top = o; while (top.parent && top.parent !== b.scene) top = top.parent;
      const key = (top.name || top.type) + ' | ' + (m.name || m.type) + (o.isInstancedMesh ? ' [inst]' : '') + (o.isSkinnedMesh ? ' [skin]' : '');
      const G = groups.get(key) || { n: 0, objs: new Set(), tris: 0 }; G.n++; G.objs.add(o); groups.set(key, G);
    }
  }
  const rows = [...groups.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, 25).map(([k, G]) => (G.n / 8).toFixed(1) + ' draws/view  ' + G.objs.size + ' objs  ' + k);
  log('DRAWS', a); for (const r of rows) log('  ', r);
}

// THE CARRIED PUPPET'S BLINK: picked up in the house, then out on the sand; its lids frame by frame
export async function pupBlink({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadHouse(); b.loadElvPuppet();
  for (let i = 0; i < 200 && !(b.houseS().ready); i++) { b.frame(2); await sleep(100); }
  for (let i = 0; i < 60; i++) { b.frame(2); await sleep(30); }
  w.__clockOn();
  const C = b.camera.position;
  C.set(b.HOUSE_X - 2, b.HOUSE_Y + 1.7, b.HOUSE_Z); w.__adv(5);
  b.elvPickUp(); w.__adv(5);
  log('picked', JSON.stringify(b.elvCarryDbg()));
  w.__adv(60); log('in the house a second later', JSON.stringify(b.elvCarryDbg()));
  // out of the gully mouth and up the sand to him, at a walk; where the one blink comes, and that it is the only one
  const seen = []; let shut = 0, wasShut = false, at = null;
  for (let i = 0; i < 1300; i++) {
    const z = -703 + i * 0.05; C.set(8, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.1); w.__adv(1);
    const d = b.elvCarryDbg(), sh = !!(d.cap0 && d.cap0[0]);
    if (sh && !wasShut) { shut++; if (at === null) at = z; }
    wasShut = sh;
    if (i % 200 === 0) seen.push(z.toFixed(1) + ':' + d.blinkT.toFixed(2));
  }
  log('blink z', JSON.stringify(b.elvCarryDbg().blinkZ), 'first shut at z', at && at.toFixed(2), 'blinks seen', shut, '|', seen.join('  '));
}

export async function pupCapDbg({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadHouse(); b.loadElvPuppet();
  for (let i = 0; i < 200 && !(b.houseS().ready); i++) { b.frame(2); await sleep(100); }
  for (let i = 0; i < 60; i++) { b.frame(2); await sleep(30); }
  w.__clockOn(); const C = b.camera.position; C.set(b.HOUSE_X - 2, b.HOUSE_Y + 1.7, b.HOUSE_Z); w.__adv(5); b.elvPickUp(); w.__adv(5);
  C.set(8, 1.7, -690); b.look(Math.PI, -0.1); w.__adv(3);
  const P = b.pupCarryS(), R = b.renderer;
  const M = b.camera.constructor; let red = null;
  for (const L of P.rig.E.caps) { L.cap.visible = true; L.cap.scale.set(1, 1, 1); L.ball.material = L.ball.material.clone(); L.ball.material.color.setRGB(1, 0, 0); L.ball.material.emissive && L.ball.material.emissive.setRGB(1, 0, 0); }
  const wp = new (b.camera.position.constructor)(); P.rig.E.caps[0].ball.getWorldPosition(wp);
  const ep = new (b.camera.position.constructor)(); P.rig.E.eyes[0].node.children[0] && P.rig.E.eyes[0].node.children[0].getWorldPosition(ep);
  log('cap0 world', wp.toArray().map((v) => v.toFixed(3)).join(','), 'eye0 mesh world', ep.toArray().map((v) => v.toFixed(3)).join(','), 'ball r', P.rig.E.caps[0].ball.geometry.parameters.radius.toFixed(4), 'rW', P.rig.E.caps[0].rW.toFixed(4), 'ps', P.rig.E.caps[0].ps.toFixed(4));
  R.render(b.scene, b.camera); R.autoClear = false; R.clearDepth(); R.render(b.vmScene, b.vmCamera); R.autoClear = true;
  const src = R.domElement, c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.6)'; g.drawImage(src, 0, 0, c.width, c.height);
  const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'caps_red', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}

// THE TV ON THE WALL, its show through the tube shader: the man and the puppet loaded first, then the set from the sofa
export async function tvscreen({ w, b, log, sleep, shot }) {
  b.settings.devMode = true; b.loadHouse(); b.loadElvPuppet(); b.loadElvMan();
  for (let i = 0; i < 300 && !(b.houseS().ready && b.HP.tv); i++) { b.frame(2); await sleep(100); }
  for (let i = 0; i < 80; i++) { b.frame(2); await sleep(40); }
  { const H0 = b.houseS().world.position; b.camera.position.set(H0.x + 3.2, H0.y + 2.1, H0.z + 5.27); b.camBaseY = H0.y + 2.1; for (let i = 0; i < 10; i++) b.frame(1); }   // (stood in the house: the set stays on)
  b.HP.tv.on = true; try { b.tvShowOn(); } catch (e) { log('tvShowOn threw', e && e.stack); }
  log('after on', b.HP.tv.scr.material.type, 'T.on', b.tvShowS() && b.tvShowS().on);
  const T = b.tvShowS();
  for (let i = 0; i < 100 && !T.man; i++) { b.tvShowTick(1 / 30); await sleep(100); }
  const H = b.houseS().world.position, C = b.camera;
  const look = (x, y, z, tx, ty, tz) => { C.position.set(H.x + x, H.y + y, H.z + z); b.lookAt(H.x + tx, H.y + ty, H.z + tz); C.updateMatrixWorld(true); };
  b.houseS().world.visible = true;
  for (const [k, n] of [[40, 'tvscr_a'], [90, 'tvscr_b']]) {
    for (let i = 0; i < k; i++) { look(3.2, 2.1, 5.27, 4.8, 2.03, 5.27); b.frame(1); }
    look(3.2, 2.1, 5.27, 4.8, 2.03, 5.27); shot(n, 640, 1.4);
  }
  // and the show itself, straight off its target, bigger
  const R = b.renderer, Wd = T.rt.width, Hd = T.rt.height, px = new Uint8Array(Wd * Hd * 4);
  R.readRenderTargetPixels(T.rt, 0, 0, Wd, Hd, px);
  const c1 = document.createElement('canvas'); c1.width = Wd; c1.height = Hd; const im = new ImageData(Wd, Hd);
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { const s0 = ((Hd - 1 - y) * Wd + x) * 4, d0 = (y * Wd + x) * 4; for (let q = 0; q < 4; q++) im.data[d0 + q] = px[s0 + q]; }
  c1.getContext('2d').putImageData(im, 0, 0);
  const d = c1.toDataURL('image/jpeg', 0.9).split(',')[1], nn = Math.ceil(d.length / 8000); for (let i = 0; i < nn; i++) console.log('[PBIMG]', 'tvraw', i + '/' + nn, d.slice(i * 8000, (i + 1) * 8000));
  const ms = []; T.man.traverse((o) => { if (o.isMesh) ms.push(o.name + ':' + o.visible + ':' + (o.material && [o.material.type, o.material.opacity, o.material.transparent, o.material.visible, !!o.material.map].join('/'))); });
  log('man meshes', ms.slice(0, 12).join(' | '));
  const bx = new (b.camera.position.constructor)(); T.man.getWorldPosition(bx); log('man pos', bx.toArray().map((v) => v.toFixed(2)).join(','), 'scale', T.man.scale.x.toFixed(3), 'visible', T.man.visible, 'parent', T.man.parent && T.man.parent.type);
  const scr = b.HP.tv.scr, sp = new (b.camera.position.constructor)(); scr.getWorldPosition(sp); log('screen world', sp.toArray().map((v) => v.toFixed(2)).join(','), 'cam', b.camera.position.toArray().map((v) => v.toFixed(2)).join(','), 'mat', scr.material.type);
}

// THE SET, over time: the man's blocking (where he stands, which way, which clip) and stills off the target
export async function tvmove({ w, b, log, sleep }) {
  b.settings.devMode = true; b.loadHouse(); b.loadElvPuppet(); b.loadElvMan();
  for (let i = 0; i < 300 && !(b.houseS().ready && b.HP.tv && b.elvMocapS()); i++) { b.frame(2); await sleep(100); }
  log('mocap', !!b.elvMocapS(), b.elvMocapS() && b.elvMocapS().clips.map((c) => c.name).join(','));
  { const H0 = b.houseS().world.position; b.camera.position.set(H0.x + 3.2, H0.y + 2.1, H0.z + 5.27); b.camBaseY = H0.y + 2.1; for (let i = 0; i < 10; i++) b.frame(1); }
  b.HP.tv.on = true; b.tvShowOn();
  const T = b.tvShowS();
  for (let i = 0; i < 100 && !T.man; i++) { b.tvShowTick(1 / 30); await sleep(100); }
  const R = b.renderer, grab = (n) => {
    const Wd = T.rt.width, Hd = T.rt.height, px = new Uint8Array(Wd * Hd * 4); R.readRenderTargetPixels(T.rt, 0, 0, Wd, Hd, px);
    const c1 = document.createElement('canvas'); c1.width = Wd; c1.height = Hd; const im = new ImageData(Wd, Hd);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { const s0 = ((Hd - 1 - y) * Wd + x) * 4, d0 = (y * Wd + x) * 4; for (let q = 0; q < 4; q++) im.data[d0 + q] = px[s0 + q]; }
    c1.getContext('2d').putImageData(im, 0, 0);
    const c2 = document.createElement('canvas'); c2.width = Wd * 2; c2.height = Hd * 2; const g = c2.getContext('2d'); g.drawImage(c1, 0, 0, Wd * 2, Hd * 2);
    const d = c2.toDataURL('image/jpeg', 0.9).split(',')[1], nn = Math.ceil(d.length / 8000); for (let i = 0; i < nn; i++) console.log('[PBIMG]', n, i + '/' + nn, d.slice(i * 8000, (i + 1) * 8000));
  };
  let shots = 0;
  for (let f = 0; f < 60 * 16; f++) {
    T.frame = 0; b.tvShowTick(1 / 60);
    if (!(f % 60)) log('t', (f / 60).toFixed(0), 'mixer', !!T.mixer, 'mode', T.ch && T.ch.mode, 'clip', T.ch && T.ch.clip, 'x', T.man.position.x.toFixed(2), 'ry', T.man.rotation.y.toFixed(2), 'line', T.line, 'laugh', T.laugh.toFixed(2));
    if ([90, 600, 1300, 2000].includes(f) || (T.ch && T.ch.mode === 'walk' && shots < 2 && f % 50 === 0)) { if (T.ch && T.ch.mode === 'walk') shots++; grab('tvm_' + f); }
  }
  const pp = T.pup.root.position.clone(), hp = new (b.camera.position.constructor)(); T.B.LeftHand.getWorldPosition(hp);
  // close up on the hand and the puppet: from the house, and from his left
  const C2 = T.cam.clone(); C2.fov = 22; C2.updateProjectionMatrix();
  for (const [n, dx, dz] of [['tvm_close', 0.4, 4.2], ['tvm_side', 3.6, 1.8]]) {
    T.frame = 1; b.tvShowTick(1 / 60);
    C2.position.set(pp.x + dx, 2.3, pp.z + dz); C2.lookAt(pp.x, 2.2, pp.z);
    R.setRenderTarget(T.rt); R.render(T.S, C2); R.setRenderTarget(null); grab(n);
  }
  log('pup', pp.toArray().map((v) => v.toFixed(2)).join(','), 'pup ry', T.pup.root.rotation.y.toFixed(2), 'man ry', T.man.rotation.y.toFixed(2), 'hand', hp.toArray().map((v) => v.toFixed(2)).join(','));
}

// THE PACK FOLLOWS YOU UP: woken on the beach, then you in the gully, then in the lot by the porch; where each of them gets to
export async function landChase({ w, b, log, sleep }) {
  b.settings.devMode = true; b.loadHouse();
  for (let i = 0; i < 300 && !(b.houseS().ready); i++) { b.frame(2); await sleep(100); }
  for (let i = 0; i < 60; i++) { b.frame(2); await sleep(30); }
  const C = b.camera.position, put = (x, z) => { const L = b.elvLandS(x, z, 30); const f = L[0] ? b.elvLandS(x, z, 30)[1] : 0; C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; };
  put(6, -672); for (let i = 0; i < 60; i++) { b.frame(2); await sleep(5); }
  const M = () => b.mutants.filter((u) => u.st.alive && Math.abs(u.g.position.z + 690) < 40);
  log('units near', M().length, M().map((u) => (u.st.awake ? 'A' : 'z') + u.g.position.x.toFixed(1) + ',' + u.g.position.z.toFixed(1)).join(' '));
  for (const u of M()) { u.st.awake = true; u.st.roar = 0.5; u.st.cool = 0.3; }
  const P = b.ELV_PATH;
  for (const [name, x, z, secs] of [['gully', P[5][0], P[5][1], 14], ['yard', b.HOUSE_X - 8, b.HOUSE_Z + 4, 20]]) {
    for (let s = 0; s < secs; s++) {
      for (let k = 0; k < 30; k++) { put(x, z); b.frame(2); }
      await sleep(5);
      if (s % 2 === 1 || s === secs - 1) log(name, s + 1, 's', 'me', C.x.toFixed(1), C.z.toFixed(1), 'land', b.elvLandS(C.x, C.z, C.y)[2], '|', M().map((u) => { const g = u.g.position, L = b.elvLandS(g.x, g.z, g.y); return (u.st.awake ? 'A' : 'z') + g.x.toFixed(1) + ',' + g.z.toFixed(1) + ' y' + g.y.toFixed(2) + (L[0] ? ' f' + (L[1] ?? NaN).toFixed(2) : ' beach') + ' d' + Math.hypot(g.x - C.x, g.z - C.z).toFixed(1) + (u.path ? ' P' + u.path.length : ''); }).join(' ; '));
    }
  }
}

// HE CANNOT BE HIT ON HIS RUN IN: a blow and a shot while `run` is set, then the same once he has stopped
export async function elvRunHit({ b, log, sleep }) {
  b.settings.devMode = true; b.loadElvMan();
  b.camera.position.set(8, 1.7, -630);
  for (let i = 0; i < 300 && !(b.elvManS() && b.elvManS().ready); i++) { b.frame(2); await sleep(100); }
  const M = b.elvManS(), u = M.u;
  M.run = { from: u.g.position.clone(), t: 0, T: 99 };
  const hp0 = u.st.hp; const r1 = b.hurtMutant(u, 3, 0.5);
  log('running: hurt returned', r1, 'hp', hp0, '->', u.st.hp, 'awake', u.st.awake);
  M.run = null;
  const r2 = b.hurtMutant(u, 3, 0.5);
  log('stopped: hurt returned', r2, 'hp', hp0, '->', u.st.hp, 'awake', u.st.awake);
}

// THE PUPPET'S LIDS close up: a puppet of its own in front of a camera, the lids at 0, 0.35, 0.7, 1
export async function lidShots({ b, log, sleep }) {
  b.loadElvPuppet();
  for (let i = 0; i < 200 && !(b.pupCarryS && b.pupCarryS()); i++) { b.frame(2); await sleep(100); }
  const P = b.pupCarryS(), R = b.renderer, V = b.camera.position.constructor;
  const S = new b.scene.constructor(); const root = P.root; const was = root.parent;
  S.add(root); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.visible = true;
  root.updateMatrixWorld(true);
  const E = P.rig.E, a0 = E.caps[0].cap.getWorldPosition(new V()), a1 = E.caps[1].cap.getWorldPosition(new V());
  const c = a0.clone().add(a1).multiplyScalar(0.5), f = new V(0, 0, 1).applyQuaternion(E.caps[0].cap.getWorldQuaternion(new b.camera.quaternion.constructor()));
  const amb = new (b.scene.children.find((o) => o.isHemisphereLight) || { constructor: Object }).constructor(0xffffff, 0x444444, 2.5); S.add(amb);
  const cam = b.camera.clone(); cam.fov = 18; cam.near = 0.01; cam.far = 10; cam.aspect = 1.6; cam.updateProjectionMatrix();
  cam.position.copy(c).addScaledVector(f, 0.28); cam.position.y += 0.03; cam.lookAt(c);
  log('eyes', E.eyes.length, 'caps', E.caps.length, 'c', c.toArray().map((v) => v.toFixed(3)).join(','));
  for (const k of [0, 0.35, 0.7, 1]) {
    b.pupLidsS(E, k); root.updateMatrixWorld(true);
    R.setSize(640, 400, false); R.setPixelRatio(1); R.render(S, cam);
    const d = R.domElement.toDataURL('image/jpeg', 0.9).split(',')[1], n = Math.ceil(d.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', 'lid_' + k, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  }
}

// THE SEA'S WAVE IN THE WHALE: stood in the belly, the wave let go; where it breaks and where its splashes fly
export async function whaleWave({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  const RB = b.ROOM_BACK.whale; RB.load(); for (let i = 0; i < 100 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
  RB.place(); w.__clockOn(); w.__adv(30);
  const C = b.camera.position;
  log('in whale at', C.toArray().map((v) => v.toFixed(1)).join(','), 'groundY', b.groundY.toFixed(2), 'state', JSON.stringify(b.state().inWhale));
  b.seaBurstDbg(); w.__adv(1);
  const W = b.sea.waves.find((q) => q.on);
  log('wave at y', W && W.g.position.y.toFixed(2), 'feet', (b.camBaseY - 1.7).toFixed(2));
  let best = 0, near = 0;
  for (let f = 0; f < 50; f++) { w.__adv(1); const live = b.splashesS().filter((p) => p.life > 0); best = Math.max(best, live.length); near = Math.max(near, live.filter((p) => Math.abs(p.pos.y - C.y) < 4).length); }
  log('splashes live (max)', best, 'within 4 m of your eye height', near);
}

// THE SEA MONSTER'S TAIL AND ITS TEMPER: in the deep, you holding still; N forced tail swings (how many land), and N cuts
// made while it swims past (how many it answers with a bite, and how many of those bites reach you)
export async function plioTest({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  b.camera.position.set(8, 1.7, -60);
  for (let i = 0; i < 400 && !(b.plioS().ready); i++) { b.frame(2); await sleep(100); }
  log('plio ready', b.plioS().ready);
  b.placeInDeep(); w.__clockOn();
  const P = b.plioS(), D = b.deepS(), C = b.camera.position;
  C.set(25000, 2000 - 10, 25000); b.camBaseY = C.y;
  D.ph = 'fight'; D.t = 0; b.plioStartPass(); w.__adv(30);
  const hold = () => { C.set(25000, 1990, 25000); b.camBaseY = C.y; D.v.set(0, 0, 0); D.knock.set(0, 0, 0); };
  const runTo = (pred, max) => { for (let i = 0; i < max; i++) { hold(); w.__adv(1); if (pred()) return i; } return -1; };
  // the tail, N times
  const N = 12; P.nTail = 0; P.nSwipe = 0;
  for (let k = 0; k < N; k++) {
    runTo(() => P.st === 'lurk', 600);
    b.plioTell(); P.atk = 'tail';
    runTo(() => P.st === 'flee' || P.st === 'lurk', 900);
  }
  log('tail: swipes', P.nSwipe, 'landed', P.nTail);
  // the cuts: while it lurks near / goes by, a blade blow; did it answer, did the answer land
  P.nSnap = 0; P.nBite = 0; let hits0 = 0;
  for (let k = 0; k < 8; k++) {
    runTo(() => P.st === 'lurk', 600);
    // bring it alongside: put it 4 m off you, going past
    P.g.position.set(C.x + 4, C.y - 1, C.z - 3); P.dir.set(0, 0, 1);
    w.__adv(1);
    const knock0 = D.knock.length();
    b.plioHurt(1, 0.5, null, true);
    const st = P.st;
    let landed = false; for (let i = 0; i < 120; i++) { hold(); w.__adv(1); if (D.knock.length() > 0.5) { landed = true; break; } }
    if (landed) hits0++;
    log('cut', k, 'state after', st, 'bite landed', landed, 'mouth was', P.lastBiteD && P.lastBiteD.toFixed(2));
  }
  log('snaps', P.nSnap, 'bites', P.nBite, 'landed', hits0, 'hp', P.hp);
}

// THE CASTLE FIGHT, FRAME BY FRAME from your eye: a farmer's blow, a still every 4 frames through it,
// you standing and facing the one swinging (devMode off, healed every frame). Stills named cs_<who>_<n>.
export async function castleSheet({ w, b, log, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  log('boot', JSON.stringify(await w.__fortBoot()));
  w.__clockOn();
  b.settings.devMode = false;
  const cam = b.camera.position, home = [cam.x, cam.z];
  const P = b.dkSlotS(), pu = P.unit;
  // a farmer's blow (the dark knight kept out of it)
  if (pu) { pu.st.awake = false; pu.g.visible = false; }
  let n = 0, prevAtk = -1, tgt = null;
  for (let i = 0; i < (w.__noFarm ? 0 : 60 * 40) && n < 14; i++) {
    const us = b.farmUnitsS().filter((f) => f.st.alive && f.farm && f.farm.out);
    if (!tgt || !tgt.st.alive) { let bd = 99; for (const f of us) { const d = Math.hypot(f.g.position.x - cam.x, f.g.position.z - cam.z); if (d < bd) { bd = d; tgt = f; } } }
    if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
    w.__adv(1); cam.x = home[0]; cam.z = home[1]; if (pu) pu.st.awake = false;
    for (const f of us) if (f !== tgt && f.st.atk >= 0) f.st.atk = -1;   // one at a time
    if (tgt && tgt.st.atk >= 0 && i % 4 === 0) { b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z); shot('cs_farm_' + String(n).padStart(2, '0'), 300, 1.3); n++;
      const A = tgt.atk && tgt.atk[tgt.st.swing]; log('  farm', n - 1, 'd', Math.hypot(tgt.g.position.x - cam.x, tgt.g.position.z - cam.z).toFixed(2), 'atk', tgt.st.atk.toFixed(2), A ? 'wind ' + A.wind.toFixed(2) + ' strike ' + A.strike.toFixed(2) + ' rec ' + (A.recover || 0).toFixed(2) + ' reach ' + (A.reach || 0).toFixed(2) : '', 'clip', tgt.st.swing); }
    else if (n > 0 && tgt && tgt.st.atk < 0 && prevAtk >= 0) break;
    prevAtk = tgt ? tgt.st.atk : -1;
    b.heal();
  }
  log('farm frames', n, 'swing', tgt && tgt.st.swing);
}

export async function farmSheet(ctx) { return castleSheet(ctx); }

// THE WAY UP TO THE TOWER DOOR: the island's floor in front of the door, as a map — rows from the wall out (0.1 m),
// columns across the door's line (0.15 m); '.' the deck's height, 'v' lower (a fall), 'x' no floor, '^' higher (a wall)
export async function isleDoorGap({ w, b, log, sleep, shot }) {
  b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.isleWorldG().visible = true;
  const A = b.ISLE_DOOR_A, X = b.ISLE_AXIS, F = b.ISLE_FLOOR, sa = Math.sin(A), ca = Math.cos(A);
  log('door A', A.toFixed(3), 'axis', X.x.toFixed(2), X.z.toFixed(2), 'deck', F.toFixed(2), 'walls', b.isleS().walls);
  const rows = [];
  for (let r = 2.2; r <= 8.0; r += 0.1) {
    let line = '';
    for (let c = -2.0; c <= 2.0001; c += 0.15) {
      const x = X.x + sa * r + ca * c, z = X.z + ca * r - sa * c;
      const f = b.isleFloorAt(x, z, F + 0.2, 0.45);
      line += f === null ? 'x' : f < F - 0.3 ? 'v' : f > F + 0.3 ? '^' : '.';
    }
    rows.push(r.toFixed(1) + ' ' + line);
  }
  for (const r of rows) log(r);
  // the threshold, in numbers (floor − deck, cm), r 1.8–3.2 by 0.1, c −0.9…0.9 by 0.15
  for (let r = 1.8; r <= 3.21; r += 0.1) { const v = []; for (let c = -0.9; c <= 0.9001; c += 0.15) { const x = X.x + sa * r + ca * c, z = X.z + ca * r - sa * c; const f = b.isleFloorAt(x, z, F + 0.2, 0.45); v.push(f === null ? '  x ' : String(Math.round((f - F) * 100)).padStart(4)); } log('thr', r.toFixed(1), v.join('')); }
  // and what the floor reads along the door's own line, finely
  const fine = []; for (let r = 2.2; r <= 5.0; r += 0.05) { const x = X.x + sa * r, z = X.z + ca * r; const f = b.isleFloorAt(x, z, F + 0.2, 0.45); fine.push(r.toFixed(2) + ':' + (f === null ? 'null' : (f - F).toFixed(2))); }
  log(fine.join(' '));
  // a still from 4 m out, looking at the door
  const C = b.camera; C.position.set(X.x + sa * 5.5, F + 1.7, X.z + ca * 5.5); b.lookAt(X.x + sa * 2.4, F + 0.3, X.z + ca * 2.4); C.updateMatrixWorld(true); shot('doorgap', 640, 1.6);
}

// THROUGH THE TOWER DOOR ON YOUR FEET: from 4.5 m out on the deck, W held, on five lines across the door; in and out.
// Reports how far under the deck the eye ever dropped and where you ended up
export async function isleDoorWalk({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  b.setIsleDoor(true); w.__adv(30);
  const A = b.ISLE_DOOR_A, X = b.ISLE_AXIS, F = b.ISLE_FLOOR, sa = Math.sin(A), ca = Math.cos(A), C = b.camera.position;
  for (const c of [-0.45, -0.25, 0, 0.25, 0.45]) for (const dir of ['in', 'out']) {
    const r0 = dir === 'in' ? 4.5 : 1.3, r1 = dir === 'in' ? 1.3 : 4.5;
    C.set(X.x + sa * r0 + ca * c, F + 1.7, X.z + ca * r0 - sa * c); b.camBaseY = F + 1.7; b.groundY = F; w.__adv(5);
    const tx = X.x + sa * r1 + ca * c, tz = X.z + ca * r1 - sa * c;
    let minY = 99, fell = false;
    b.keys.KeyW = true;
    for (let i = 0; i < 150; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); minY = Math.min(minY, C.y - (F + 1.7)); if (C.y < F + 1.0) fell = true; }
    b.keys.KeyW = false; w.__adv(10);
    const r = (C.x - X.x) * sa + (C.z - X.z) * ca;
    log(dir, 'c', c.toFixed(2), 'lowest eye vs deck', minY.toFixed(2), 'fell', fell, 'ended r', r.toFixed(2), 'eye', (C.y - F).toFixed(2));
  }
}

// A LIGHTHOUSE GULL'S HEAD, close: one bird from its side, head straight then turned both ways; and its shape in numbers
export async function gullBeak({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready); i++) { b.frame(2); await sleep(100); }
  b.isleWorldG().visible = true; w.__clockOn(); w.__adv(5);
  const birds = b.isleBirdsS(), C = b.camera, V = C.position.constructor;
  let n = 0;
  for (const B of birds) {
    if (B.gone || n >= 2) continue;
    C.position.set(B.c.x + 2, B.c.y + 0.5, B.c.z); w.__adv(2);
    if (!B.head) continue;
    const H = B.head, fw = new V().crossVectors(H.side, new V(0, 1, 0));   // forward (side = up × fwd)
    // the head's vertices along forward / up from the neck, binned: where the beak runs to
    const P = B.m.geometry.attributes.position; B.m.updateMatrixWorld(true);
    let maxF = -9, maxFw = 0, all = [];
    for (let i = 0; i < P.count; i++) { const v = new V().fromBufferAttribute(P, i).applyMatrix4(B.m.matrixWorld).sub(H.neck); const f = v.dot(fw), u = v.y; all.push([f, u, i]); }
    all.sort((a, c) => c[0] - a[0]);
    const inHead = new Set(H.idx);
    const lab = ([f, u, i]) => f.toFixed(2) + '/' + u.toFixed(2) + (inHead.has(i) ? 'H' + H.w[H.idx.indexOf(i)].toFixed(1) : '-');
    const uniq = (L) => [...new Map(L.map((q) => [q[0].toFixed(2) + q[1].toFixed(2), q])).values()];
    log('bird', n, 'r', B.r.toFixed(2), 'front-most (fwd/up from neck):', uniq(all).slice(0, 16).map(lab).join(' '));
    const hi = [...all].sort((a, c) => c[1] - a[1]); log('  top-most:', uniq(hi).slice(0, 10).map(lab).join(' '));
    log('  head verts by up band:', [-0.1, -0.05, 0, 0.05, 0.1, 0.15].map((y) => y + ':' + all.filter((q) => q[1] >= y && q[1] < y + 0.05).length + '/' + all.filter((q) => q[1] >= y && q[1] < y + 0.05 && inHead.has(q[2])).length).join(' '));
    const sd = H.side, d = Math.max(0.9, B.r * 3.5);
    for (const [nm, yw] of [['0', 0], ['l', 0.7], ['r', -0.7]]) {
      H.t = 99; H.wy = yw; H.wt = 0;
      for (let f = 0; f < 40; f++) w.__adv(1);
      C.position.set(B.c.x + sd.x * d, B.c.y + 0.15, B.c.z + sd.z * d); b.lookAt(B.c.x, B.c.y + 0.12, B.c.z); C.updateMatrixWorld(true);
      shot('beak' + n + nm, 360, 2.0);
    }
    n++;
  }
}

// THE WEST COURT'S TWO SWORDSMEN: loaded in the court; strips of the moves on each, and the measured contact of every swing
export async function knStrips({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  log('go', JSON.stringify(await w.__knGo()));
  for (let i = 0; i < 300 && !b.knUnitsS().every((u) => u.model && !(u.clipsPending > 0)); i++) { w.__c13Step(1); await sleep(100); if (i % 50 === 0) log('wait', i, b.knUnitsS().map((u) => !!u.model + '/' + u.clipsPending + '/' + (u.mixer ? 'mx' : '-')).join(' ')); }
  const list = (w.__knList || 'sIdle,sIdleB,sIdleC,sIdleD,sWalk,sRun,sStr1,sSlash,sSlashB,sSlashC,sSlashD,sSlashE,sAtk,sAtkB,sAtkC,sAtkD,sKick,sHitC,sRoar,sDraw').split(',');
  for (const i of (w.__knWho || [0, 1])) {
    for (const c of list) { const d = w.__knStrip(i, c, w.__knN || 7, w.__knW || 200, w.__knSide || 4.0, w.__knAng ?? 1.5708, w.__knFov || 42); if (!d) { log('no clip', i, c); continue; } const nn = Math.ceil(d.length / 8000); for (let k = 0; k < nn; k++) console.log('[PBIMG]', 'kn' + i + '_' + c, k + '/' + nn, d.slice(k * 8000, (k + 1) * 8000)); }
    log('contact', i, JSON.stringify(w.__knContact(i, ['sSlash', 'sSlashB', 'sSlashC', 'sSlashD', 'sSlashE', 'sAtk', 'sAtkB', 'sAtkC', 'sAtkD', 'sKick'])));
  }
}

export async function glbTest({ b, log }) {
  for (const u of ['/assets/knight-man.glb', '/assets/knight-iron.glb']) log(u, await b.glbTest(u));
}

export async function knClose(ctx) {
  const w = ctx.w; w.__knN = 5; w.__knW = 280; w.__knSide = 3.0; w.__knAng = 0.75; w.__knFov = 40;
  w.__knList = 'sIdle,sIdleB,sIdleC,sIdleD,sWalk,sRun,sStr1,sStr2,sSlash,sSlashB,sSlashC,sSlashD,sSlashE,sAtk,sAtkB,sAtkC,sKick,sRoar,sHit,sHitB';
  return knStrips(ctx);
}

// THE WEST COURT FIGHT, HANDS OFF: you stand where they come at you, healed every frame, looking at whoever is swinging.
// Every swing each man throws: which, whether it landed (and where on the screen its blade was), and how the two shared it
export async function knFight({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  log('go', JSON.stringify(await w.__knGo()));
  for (let i = 0; i < 300 && !b.knUnitsS().every((u) => u.model && !(u.clipsPending > 0) && u.natDone); i++) { w.__c13Step(1); await sleep(50); }
  const K = b.knUnitsS(), cam = b.camera.position, P0 = K[0].g.position, P1 = K[1].g.position;
  const mx = (P0.x + P1.x) / 2, mz = (P0.z + P1.z) / 2, yaw = K[0].g.rotation.y;
  const home = [mx + Math.sin(yaw) * 5, mz + Math.cos(yaw) * 5];
  cam.set(home[0], P0.y + 1.7, home[1]); b.camBaseY = P0.y + 1.7;
  for (const u of K) { u.st.awake = true; u.st.roar = 0.3; }
  const seen = [], per = { 0: {}, 1: {} }; let hp0 = b.state().hp, hurts = 0;
  const last = K.map(() => ({ swing: null, atk: -1, hitAt: 0 }));
  const secs = w.__knSecs || 50;
  for (let f = 0; f < 60 * secs; f++) {
    let tgt = null; for (const u of K) if (u.st.alive && u.st.atk >= 0) tgt = u;
    if (!tgt) { let bd = 99; for (const u of K) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (u.st.alive && d < bd) { bd = d; tgt = u; } } }
    if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
    w.__c13Step(1);
    if (w.__knKite && f % 240 === 0 && f) { const nb = K.filter((u) => u.st.alive).map((u) => Math.hypot(u.g.position.x - home[0], u.g.position.z - home[1])); const dx = home[0] - (P0.x + P1.x) / 2, dz = home[1] - (P0.z + P1.z) / 2, dl = Math.hypot(dx, dz) || 1; home[0] += dx / dl * 3.0; home[1] += dz / dl * 3.0; if (f > 60 * 20) { home[0] -= dx / dl * 6.0; home[1] -= dz / dl * 6.0; } }
    cam.x = home[0]; cam.z = home[1];
    K.forEach((u, i) => {
      const L = last[i];
      if (u.st.atk >= 0 && (L.swing !== u.st.swing || u.st.atk < L.atk)) { const s = per[i][u.st.swing] || (per[i][u.st.swing] = { n: 0, land: 0, scr: [] }); s.n++; L.cur = s; L.d0 = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); }
      if (u.hitAt && u.hitAt !== L.hitAt && L.cur) { L.hitAt = u.hitAt; L.cur.land++; if (u.hitPt) { const q = u.hitPt.clone().project(b.camera); L.cur.scr.push(q.x.toFixed(2) + ',' + q.y.toFixed(2) + (q.z > 1 ? 'B' : '')); } }
      L.swing = u.st.atk >= 0 ? u.st.swing : null; L.atk = u.st.atk;
    });
    if (b.state().hp < hp0) hurts++;
    b.heal(); hp0 = b.state().hp;
    if (w.__knShots && (f % 4 === 0) && tgt && tgt.st.atk >= 0 && (w.__knShotN = (w.__knShotN || 0) + 1) <= w.__knShots) { const n = String(w.__knShotN).padStart(3, '0'); w.__pbShot('ksh_' + n + '_' + (tgt === K[0] ? 'man' : 'iron') + '_' + tgt.st.swing, 300, 1.4); }
  }
  for (const i of [0, 1]) for (const [k, s] of Object.entries(per[i])) log(i ? 'IRON' : 'MAN ', k, 'thrown', s.n, 'landed', s.land, 'screen', s.scr.slice(0, 6).join(' '));
  log('hurts', hurts, 'dist now', K.map((u) => Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z).toFixed(2)).join(' '), 'apart', Math.hypot(P0.x - P1.x, P0.z - P1.z).toFixed(2));
}

export async function knSheet(ctx) { ctx.w.__knShots = 64; ctx.w.__knSecs = 22; ctx.w.__pbShot = ctx.shot; return knFight(ctx); }

export async function knMat({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  log('go', JSON.stringify(await w.__knGo()));
  for (const u of b.knUnitsS()) {
    const out = [];
    u.model.traverse((o) => { if (o.isMesh && o.material) { const m = o.material; out.push(o.name + ':' + m.type + ' c' + m.color.getHexString() + ' e' + m.emissive.getHexString() + '*' + m.emissiveIntensity + ' map' + !!m.map + ' emap' + !!m.emissiveMap + ' r' + m.roughness + ' m' + m.metalness + ' vc' + m.vertexColors + ' tr' + m.transparent + ' op' + m.opacity + ' vis' + o.visible); } });
    log(u.kind.glb, out.join(' | '));
  }
  // one close still of each, in the court, from the front
  const K = b.knUnitsS();
  for (const [i, u] of K.entries()) { const P = u.g.position, y = u.g.rotation.y; for (let k = 0; k < 3; k++) { b.camera.position.set(P.x + Math.sin(y) * 3.2, P.y + 1.6, P.z + Math.cos(y) * 3.2); b.lookAt(P.x, P.y + 1.1, P.z); w.__c13Step(1); } b.camera.position.set(P.x + Math.sin(y) * 3.2, P.y + 1.6, P.z + Math.cos(y) * 3.2); b.lookAt(P.x, P.y + 1.1, P.z); b.camera.updateMatrixWorld(true); shot('knfront' + i, 480, 1.0); }
}

export async function knLight({ w, b, log, sleep }) {
  w.__knLightOnly = true;
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  log('go', JSON.stringify(await w.__knGo()));
  const R = b.renderer, gl = R.getContext();
  for (const [i, u] of b.knUnitsS().entries()) {
    const P = u.g.position, y = u.g.rotation.y;
    const place = () => { b.camera.position.set(P.x + Math.sin(y) * 3.2, P.y + 1.6, P.z + Math.cos(y) * 3.2); b.lookAt(P.x, P.y + 1.1, P.z); b.camera.updateMatrixWorld(true); };
    for (let k = 0; k < 3; k++) { place(); w.__c13Step(1); }
    const lum = () => { place(); R.render(b.scene, b.camera); const c = new (b.camera.position.constructor)(P.x, P.y + 1.2, P.z).project(b.camera); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const x = Math.round((c.x + 1) / 2 * W), yy = Math.round((c.y + 1) / 2 * H); const px = new Uint8Array(16 * 16 * 4); gl.readPixels(x - 8, yy - 8, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px); let s = [0, 0, 0]; for (let k = 0; k < 256; k++) for (let c2 = 0; c2 < 3; c2++) s[c2] += px[k * 4 + c2]; return s.map((v) => Math.round(v / 256)).join(','); };
    const mats = []; u.model.traverse((o) => { if (o.isMesh) mats.push(o.material); });
    log(i, 'as is', lum());
    { place(); R.render(b.scene, b.camera); const c = new (b.camera.position.constructor)(P.x + Math.sin(y) * 1.2, P.y, P.z + Math.cos(y) * 1.2).project(b.camera); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const x = Math.round((c.x + 1) / 2 * W), yy = Math.round((c.y + 1) / 2 * H); const px = new Uint8Array(16 * 16 * 4); gl.readPixels(x - 8, yy - 8, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px); let s2 = 0; for (let k = 0; k < 256; k++) s2 += px[k * 4] + px[k * 4 + 1] + px[k * 4 + 2]; log(i, 'paving before him', Math.round(s2 / 768)); }
    if (w.__knLightOnly) continue;
    const save = mats.map((m) => ({ e: m.emissiveIntensity, n: m.normalMap, ob: m.onBeforeCompile }));
    mats.forEach((m) => { m.emissiveIntensity = 0; }); log(i, 'no emissive', lum());
    mats.forEach((m) => { m.normalMap = null; m.needsUpdate = true; }); log(i, '+ no normal map', lum());
    mats.forEach((m) => { m.onBeforeCompile = () => {}; m.customProgramCacheKey = () => 'x' + Math.random(); m.needsUpdate = true; }); log(i, '+ no rim/gamma', lum());
    const lights = []; b.scene.traverse((o) => { if (o.isLight && o.visible && o.intensity > 0) lights.push(o.type + ':' + o.intensity.toFixed(2) + ':' + (o.color ? o.color.getHexString() : '') + (o.isPointLight ? '@' + o.position.distanceTo(P).toFixed(1) : '')); });
    log('lights', lights.slice(0, 20).join(' '));
  }
}

export async function knFreeLook(ctx) {
  const w = ctx.w; w.__knN = 4; w.__knW = 300; w.__knSide = 3.2; w.__knAng = 0.5; w.__knFov = 40; w.__knFree = true;
  w.__knList = 'sIdle,sIdleB,sWalk,sStr1';
  return knStrips(ctx);
}

export async function knFreeFront(ctx) {
  const w = ctx.w; w.__knN = 3; w.__knW = 380; w.__knSide = 2.7; w.__knAng = 0.0; w.__knFov = 40; w.__knFree = !w.location.search.includes('raw');
  w.__knList = 'sIdle,sWalk';
  return knStrips(ctx);
}

export async function knKite(ctx) { ctx.w.__knKite = true; ctx.w.__knSecs = 40; ctx.w.__gapDbg = {}; await knFight(ctx); ctx.log('gap', JSON.stringify(ctx.w.__gapDbg)); const K = ctx.b.knUnitsS(); ctx.log('atk keys', Object.keys(K[0].atk).join(','), 'clips', ['kmLunge','kmLeap'].map((k) => !!K[0].clips[k]).join(','), 'minD', K[0].atk.kmLunge && K[0].atk.kmLunge.minDist, K[0].atk.kmLunge && K[0].atk.kmLunge.reach); }

// BOTH DOWN: each killed by blows; their deaths, the throne room's door, and what a save says of them
export async function knDeath({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  log('go', JSON.stringify(await w.__knGo()));
  const K = b.knUnitsS(), cam = b.camera.position;
  log('alive before', b.knAlive());
  for (const [i, u] of K.entries()) {
    const P = u.g.position; cam.set(P.x + Math.sin(u.g.rotation.y) * 2.4, P.y + 1.7, P.z + Math.cos(u.g.rotation.y) * 2.4); b.camBaseY = P.y + 1.7;
    u.st.awake = true;
    for (let k = 0; k < 40 && u.st.alive; k++) { b.hurtMutant(u, 3, 0.5); for (let f = 0; f < 12; f++) { w.__c13Step(1); b.heal(); } }
    for (let f = 0; f < 120; f++) { w.__c13Step(1); b.heal(); }
    { const fl = b.c13CourtAt(P.x, P.z) ?? P.y, V = P.constructor; const hb = (nm) => { let o = null; u.model.traverse((q) => { if (!o && q.isBone && new RegExp(nm, 'i').test(q.name)) o = q; }); return o ? +(o.getWorldPosition(new V()).y - fl).toFixed(2) : null; };
      if (u.rag) log(i, 'rag parts', u.rag.parts.map((q) => q.bone.name.replace(/^Character1_/, '') + ':' + +(q.bone.getWorldPosition(new V()).y - fl).toFixed(2) + '/p' + +(q.p.y - q.floor).toFixed(2)).join(' '), '| orphans', u.rag.orphans.length, 'h0', u.rag.h0 && u.rag.h0.toFixed(2), 'limp', u.rag.limp);
      if (u.rag) { const q = u.rag.parts[0]; log(i, 'part0', q.bone.name, 'turns', q.turns, 'child', q.child, 'alt', q.kidAlt && q.kidAlt.bone.name, 'rooted', q.rooted, 'pin', !!q.pin, '| acts', u.mixer._actions.filter((x) => x.enabled && x.isRunning()).map((x) => x.getClip().name).join(',')); }
      log(i, 'down: hips', hb('hips|pelvis'), 'm, head', hb('head'), 'm off the floor | rag', !!u.rag, u.rag && u.rag.asleep, '| cur clip', u.cur && u.cur.getClip().name, u.cur && u.cur.time.toFixed(2), '| kind', u.kind === b.MUT_KINDS.knIron ? 'IRON' : 'MAN'); }
    log(i, 'alive', u.st.alive, 'rag', !!u.rag, 'key', u.saveKey, 'dead keys has', b.deadUnitKeysS ? [...b.deadUnitKeysS()].filter((k) => k.startsWith('kn')).join(',') : '?');
    b.lookAt(P.x, P.y + 0.5, P.z); shot('kndead' + i, 400, 1.4);
  }
  log('alive after', b.knAlive());
}

// THE WEAPON IN YOUR HAND ACROSS A CHECKPOINT: a fresh game, the shovel and the katana given and the katana held, saved;
// then the page reloaded into that checkpoint the way a death does; is it drawn? (its own profile: never the owner's save)
export async function vmRestore({ w, b, log, sleep }) {
  const f = w.frameElement;
  // first life: hold the katana, save
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(2500);
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); } catch (e) { log('add failed', e.message); }
  if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem);
  await sleep(500);
  { const R = b.renderer, gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const grab = () => { b.frame(1); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
    const diff = (a2, b2) => { let n = 0; for (let k = 0; k < a2.length; k += 4) if (Math.abs(a2[k] - b2[k]) + Math.abs(a2[k + 1] - b2[k + 1]) + Math.abs(a2[k + 2] - b2[k + 2]) > 30) n++; return n; };
    const on = grab(); b.toggleEquip(b.equippedS()); const off = grab(); b.toggleEquip(b.katanaItem);
    log('pixels the katana covers before the save:', diff(on, off), 'of', W * H); }
  log('before', 'equipped', b.equippedS && b.equippedS() && b.equippedS().name, 'vm vis', b.viewmodelS && b.viewmodelS().visible);
  if (w.__vmRoom === 'fort') { b.placeInFort(); for (let i = 0; i < 100 && !b.fortRdy(); i++) await sleep(150); await sleep(2500); log('in fort', b.state().inFort); }
  else b.camera.position.set(8, 1.7, -60);
  await sleep(300); b.saveCheckpoint();
  // second life: the death's reload
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
  f.contentWindow.location.reload();
  await sleep(1500);
  let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
  const B = w2.__bw;
  const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
  for (let i = 0; i < 300 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
  await sleep(2000);
  const vmVis = (o) => { let v = true, x = o; while (x) { if (!x.visible) v = false; x = x.parent; } return v; };
  const E = B.equippedS && B.equippedS();
  log('after', 'equipped', E && E.name, 'viewmodel', B.viewmodelS && B.viewmodelS().visible, 'katanaVM chain visible', B.katanaVM ? vmVis(B.katanaVM) : '?', 'children vis', B.katanaVM ? (() => { let n = 0, v = 0; B.katanaVM.traverse((o) => { if (o.isMesh) { n++; if (o.visible) v++; } }); return v + '/' + n; })() : '?');
  log('room', JSON.stringify({ fort: B.state().inFort, room: B.devRoom && B.devRoom() }), 'show parts', JSON.stringify({ held: !!B.heldS, dialog: B.state().dialog, insp: B.state().inspecting }));
  { const R = B.renderer, gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const grab = () => { w2.__bw.frame(1); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
    const diff = (a2, b2) => { let n = 0; for (let k = 0; k < a2.length; k += 4) if (Math.abs(a2[k] - b2[k]) + Math.abs(a2[k + 1] - b2[k + 1]) + Math.abs(a2[k + 2] - b2[k + 2]) > 30) n++; return n; };
    const on = grab(); B.toggleEquip(B.equippedS()); const off = grab(); B.toggleEquip(B.katanaItem); const on2 = grab();
    log('pixels the katana covers after the restore:', diff(on, off), 'and held again:', diff(on2, off), 'of', W * H); }
  let par = []; let x = B.katanaVM; while (x) { par.push((x.name || x.type) + ':' + x.visible); x = x.parent; } log('chain', par.join(' < '));
}

export async function vmRestoreFort(ctx) { ctx.w.__vmRoom = 'fort'; return vmRestore(ctx); }

// THE SAWN-OFF, FROM THE HIP AND DOWN THE SIGHTS: the whole frame (world and hands), on the beach looking down it
export async function sgAim({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(2500);
  if (!b.inventory.includes(b.shotgunItem)) b.addToInventory(b.shotgunItem);
  if (b.equippedS() !== b.shotgunItem) b.toggleEquip(b.shotgunItem);
  for (let i = 0; i < 100 && !b.sgG; i++) await sleep(100);
  w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
  const C = b.camera; C.position.set(8, 1.7, -40); b.look(Math.PI, -0.02);
  const snap = (name) => { const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.strokeStyle = '#f00'; g.beginPath(); g.moveTo(c.width / 2 - 8, c.height / 2); g.lineTo(c.width / 2 + 8, c.height / 2); g.moveTo(c.width / 2, c.height / 2 - 8); g.lineTo(c.width / 2, c.height / 2 + 8); g.stroke(); const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
  for (let i = 0; i < 90; i++) { C.position.set(8, 1.7, -40); b.look(Math.PI, -0.02); w.__adv(1); }
  snap('sg_hip');
  for (let i = 0; i < 60; i++) { b.magAiming = true; C.position.set(8, 1.7, -40); b.look(Math.PI, -0.02); w.__adv(1); }
  if (b.magAim < 0.9) { b.magAim = 1; w.__adv(1); }
  log('aim k', b.magAim);
  snap('sg_ads');
  if (w.location.search.includes('old')) {}
  { const keep = b.SG_HOLD_ADS.slice(); b.SG_HOLD_ADS.splice(0, 6, 0.0, -0.112, -0.297, 0.0737, 0, 0); for (let i = 0; i < 30; i++) { b.magAiming = true; C.position.set(8, 1.7, -40); b.look(Math.PI, -0.02); w.__adv(1); } snap('sg_ads_old'); b.SG_HOLD_ADS.splice(0, 6, ...keep); }
  { const S = b.sgParts(), V = C.position.constructor, VC = b.vmCamera; VC.updateMatrixWorld(true);
    const inEye = (o) => { const v = o.getWorldPosition(new V()); return v.applyMatrix4(VC.matrixWorldInverse); };
    const m0 = inEye(S.muzzle[0]), m1 = inEye(S.muzzle[1]), s0 = inEye(S.slugs[0]), s1 = inEye(S.slugs[1]), bd = inEye(S.bead);
    const mid = m0.clone().add(m1).multiplyScalar(0.5), br = s0.clone().add(s1).multiplyScalar(0.5), ax = mid.clone().sub(br).normalize();
    const f = (v) => v.toArray().map((x) => x.toFixed(3)).join(',');
    { const G = b.sgG; log('state', 'idleT', G.actIdle.time.toFixed(3), 'idleW', G.actIdle.weight.toFixed(2), 'actW', G.act.weight.toFixed(2), 'actT', G.act.time.toFixed(2), 'runW', G.actRun.weight.toFixed(2), 'A', b.SG_HOLD_ADS.join(','), 'magAim', b.magAim.toFixed(3)); }
    log('eye-space: muzzles', f(mid), 'breech', f(br), 'bead', f(bd), 'bore axis', f(ax), 'yaw deg', (Math.atan2(ax.x, -ax.z) * 57.3).toFixed(1), 'pitch deg', (Math.atan2(ax.y, -ax.z) * 57.3).toFixed(1), 'barrels side by side along', f(m1.clone().sub(m0).normalize())); }
  log('aim', b.magAiming);
}

// solve the sawn-off's sight picture: the hold's pitch / yaw / roll so the bores lie down the view (a degree of rise),
// level side by side; then where the breech sits under the eye. Prints the hold to paste.
export async function sgSolve({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(2500);
  if (!b.inventory.includes(b.shotgunItem)) b.addToInventory(b.shotgunItem);
  if (b.equippedS() !== b.shotgunItem) b.toggleEquip(b.shotgunItem);
  for (let i = 0; i < 100 && !b.sgG; i++) await sleep(100);
  w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
  const C = b.camera, V = C.position.constructor, A = b.SG_HOLD_ADS;
  const settle = (n) => { for (let i = 0; i < n; i++) { b.magAiming = true; b.magAim = 1; C.position.set(8, 1.7, -40); b.look(Math.PI, 0); w.__adv(1); } };
  const meas = () => { settle(30); const S = b.sgParts(), VC = b.vmCamera; VC.updateMatrixWorld(true);
    const e = (o) => o.getWorldPosition(new V()).applyMatrix4(VC.matrixWorldInverse);
    const m0 = e(S.muzzle[0]), m1 = e(S.muzzle[1]), s0 = e(S.slugs[0]), s1 = e(S.slugs[1]);
    const mid = m0.clone().add(m1).multiplyScalar(0.5), br = s0.clone().add(s1).multiplyScalar(0.5), ax = mid.clone().sub(br).normalize(), sd = m1.clone().sub(m0).normalize();
    return { v: [Math.atan2(ax.x, -ax.z) * 57.3, Math.atan2(ax.y, -ax.z) * 57.3 - 1.0, Math.atan2(sd.y, Math.abs(sd.x)) * 57.3 * Math.sign(sd.x || 1)], br }; };
  if (b.sgG && b.sgG.actIdle) { b.sgG.actIdle.timeScale = 0; b.sgG.actIdle.time = 0; }
  settle(60);
  for (let it = 0; it < 8; it++) {
    const r0 = meas().v; log('iter', it, 'A', A.map((x) => x.toFixed(4)).join(','), 'err yaw,pitch,roll deg', r0.map((x) => x.toFixed(2)).join(','));
    if (Math.hypot(...r0) < 0.3) break;
    const J = [];
    for (let k = 0; k < 3; k++) { const h = 0.03; A[3 + k] += h; const r = meas().v; A[3 + k] -= h; J.push(r.map((x, i) => (x - r0[i]) / h)); }
    // solve J^T delta = -r0 (J[k][i] = d r_i / d a_k)
    const M = [[J[0][0], J[1][0], J[2][0]], [J[0][1], J[1][1], J[2][1]], [J[0][2], J[1][2], J[2][2]]];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M), d = [];
    for (let k = 0; k < 3; k++) { const Mk = M.map((row, i) => row.map((x, j) => (j === k ? -r0[i] : x))); d.push(det(Mk) / D); }
    for (let k = 0; k < 3; k++) A[3 + k] += 0.8 * Math.max(-0.25, Math.min(0.25, d[k]));
  }
  { const act = b.sgG.actIdle, clip = act.getClip(), out = []; act.timeScale = 0;
    for (let k = 0; k < 8; k++) { act.time = clip.duration * k / 8; const r = meas().v; out.push(r.map((x) => x.toFixed(1)).join('/')); }
    act.time = 0; log('across the idle (yaw/pitch/roll err deg):', out.join('  ')); }
  const f = meas(); log('final A', A.map((x) => x.toFixed(4)).join(', '), 'err', f.v.map((x) => x.toFixed(2)).join(','), 'breech in eye', f.br.toArray().map((x) => x.toFixed(3)).join(','));
  const snap = (name) => { const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.strokeStyle = '#f00'; g.beginPath(); g.moveTo(c.width / 2 - 8, c.height / 2); g.lineTo(c.width / 2 + 8, c.height / 2); g.moveTo(c.width / 2, c.height / 2 - 8); g.lineTo(c.width / 2, c.height / 2 + 8); g.stroke(); const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
  settle(5); snap('sg_solved');
}

// THE DARK KNIGHT, measured: spawned on the sand; each of his own strings — the blows in it (the blade's speed peaks) —
// and strips of them in the studio
export async function dkMeasure({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(1500);
  const u = b.dkSpawnTest(8, -50, 0); u.g.visible = true;
  w.__clockOn();
  for (let i = 0; i < 400 && !(u.model && u.mixer && !(u.clipsPending > 0)); i++) { w.__adv(1); await sleep(30); }
  log('loaded', !!u.model, 'clips', Object.keys(u.clips).length, 'blade', u.knBlade && u.knBlade.toFixed(2), 'tip', !!(u.bones && u.bones.tip), 'h', (() => { const B = new (b.camera.position.constructor)(); return u.g.scale.y.toFixed(3); })());
  b.knUnitsS().push(u);   // (so the strips can address him: index 2 if the court is loaded, else 0)
  const idx = b.knUnitsS().indexOf(u);
  const V = b.camera.position.constructor, m = u.mixer, tip = u.bones.tip;
  const LIST = (w.__dkList || 'dkC0,dkC1,dkC2,dkC3,dkC4,dkC5,dkC6,dkC7').split(',');
  for (const cn of LIST) {
    const c = cn.replace(/^dkC/, ''); const a = u.clips[cn]; if (!a) { log('no ' + cn); continue; }
    const useShield = cn === 'sAtkD';
    for (const x of m._actions) { x.stop(); x.enabled = false; }
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const dur = a.getClip().duration, N = Math.round(dur * 60), pos = [];
    const TIP = useShield ? u.model.getObjectByName('dk_shield') : tip;
    for (let k = 0; k <= N; k++) { a.time = dur * k / N; m.update(0); u.g.updateMatrixWorld(true); pos.push(TIP.getWorldPosition(new V()).sub(u.g.position)); }
    // where a man standing in front of him would be met: the blade (hilt to tip) against a body at 1.6 / 2.0 / 2.4 m,
    // chest to eye (y 1.2 to 1.9); each pass within 0.45 m is a contact, its time the closest frame of the pass
    { const hp = [], hilt = useShield ? u.model.getObjectByName('dk_shield') : u.model.getObjectByName('kn_hilt'); for (let k = 0; k <= N; k++) { a.time = dur * k / N; m.update(0); u.g.updateMatrixWorld(true); hp.push(hilt.getWorldPosition(new V()).sub(u.g.position)); }
      const ry = u.g.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), out = [];
      for (const D of [1.6, 2.0, 2.4]) {
        const dist = []; for (let k = 0; k <= N; k++) { let best = 9; for (let j = 0; j <= 8; j++) { const q = hp[k].clone().lerp(pos[k], 0.3 + 0.7 * j / 8); const tx = fx * D, tz = fz * D, ty = Math.min(1.9, Math.max(1.2, q.y)); best = Math.min(best, Math.hypot(q.x - tx, q.y - ty, q.z - tz)); } dist.push(best); }
        const hits = []; let inP = false, bk = -1;
        for (let k = 0; k <= N; k++) { if (dist[k] < 0.45) { if (!inP || dist[k] < dist[bk]) bk = k; inP = true; } else if (inP) { hits.push(+(bk / N).toFixed(3)); inP = false; } }
        if (inP) hits.push(+(bk / N).toFixed(3));
        out.push(D + ':' + JSON.stringify(hits));
      }
      log(cn, 'dur', dur.toFixed(2), 'contacts (fraction of clip) by stand-off', out.join('  ')); }
    const sp = []; for (let k = 1; k <= N; k++) sp.push(pos[k].distanceTo(pos[k - 1]) * 60);
    const mx = Math.max(...sp), peaks = [];
    for (let k = 3; k < sp.length - 3; k++) if (sp[k] > mx * 0.45 && sp[k] >= Math.max(...sp.slice(k - 8 < 0 ? 0 : k - 8, k + 9))) { if (!peaks.length || k - peaks[peaks.length - 1].k > 14) peaks.push({ k, t: +(k / 60).toFixed(2), v: +sp[k].toFixed(1), y: +pos[k].y.toFixed(2), f: +(Math.cos(u.g.rotation.y) * pos[k].z + Math.sin(u.g.rotation.y) * pos[k].x).toFixed(2) }); }
    if (!w.__dkNoStrips) log(cn, 'dur', dur.toFixed(2), 'peaks', JSON.stringify(peaks.map((p) => [p.t, p.v, p.y, p.f])));
    a.stop();
  }
  if (w.__dkNoStrips) return;
  w.__knN = 7; w.__knW = 200; w.__knSide = 4.6; w.__knAng = 0.9; w.__knFov = 42;
  for (let c = 0; c < 8; c++) { const d = w.__knStrip(idx, 'dkC' + c, 7, 200, 4.6, 0.9, 42); if (!d) continue; const nn = Math.ceil(d.length / 8000); for (let k = 0; k < nn; k++) console.log('[PBIMG]', 'dk_C' + c, k + '/' + nn, d.slice(k * 8000, (k + 1) * 8000)); }
  for (const c of ['sIdle', 'sBlockI', 'sSlash', 'sAtkB']) { const d = w.__knStrip(idx, c, 5, 240, 4.6, 0.9, 42); if (!d) continue; const nn = Math.ceil(d.length / 8000); for (let k = 0; k < nn; k++) console.log('[PBIMG]', 'dk_' + c, k + '/' + nn, d.slice(k * 8000, (k + 1) * 8000)); }
}

export async function dkContacts(ctx) { ctx.w.__dkNoStrips = true; return dkMeasure(ctx); }

export async function dkPack(ctx) { ctx.w.__dkNoStrips = true; ctx.w.__dkList = 'sSlash,sSlashB,sSlashC,sSlashD,sSlashE,sAtk,sAtkB,sAtkC,sAtkD,sKick'; return dkMeasure(ctx); }

// THE DARK KNIGHT'S ENTRANCE: into the first castle, standing at the gate; is he on the street with three men on him,
// does he kill them, does he turn on you — and stills from your eye while he works
export async function dkIntro({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false;   // (dev mode stops a creature swinging at reach)
  log('boot', JSON.stringify(await w.__fortBoot()));
  b.settings.devMode = false;
  w.__clockOn();
  const S = () => b.dkS(), C = b.camera.position, home = [C.x, C.z];
  for (let i = 0; i < 60 * 40; i++) {
    w.__adv(1); b.heal(); C.x = home[0]; C.z = home[1];
    const s = S(), u = s.u;
    if (u && s.dk.stage >= 1) b.lookAt(u.g.position.x, C.y - 0.2, u.g.position.z);
    if (i % 120 === 0) log('t', (i / 60).toFixed(0), 'stage', s.dk.stage, 'out', b.dkSlotS().out, 'vis', u && u.g.visible, 'dkHP', u && u.st.hp, 'victims alive', s.dk.victims.filter((f) => f.st.alive).length, '/', s.dk.victims.length, 'foe', u && u.st.foe ? 'farmer' : 'you', 'swing', u && u.st.atk >= 0 ? u.st.swing : '-', 'd', u ? Math.hypot(u.g.position.x - C.x, u.g.position.z - C.z).toFixed(1) : '-');
    if (s.dk.stage === 1 && i % 30 === 0 && (w.__dkShots = (w.__dkShots || 0) + 1) <= 12) shot('dki_' + String(w.__dkShots).padStart(2, '0'), 360, 1.5);
    if (s.dk.stage === 1 && i % 45 === 0 && (w.__dkClose = (w.__dkClose || 0) + 1) <= 8) { const P = u.g.position, sv = C.clone(); C.set(P.x + 4.5, P.y + 1.8, P.z + 2.5); b.lookAt(P.x, P.y + 1.2, P.z); b.renderer.render(b.scene, b.camera); shot('dkc_' + String(w.__dkClose).padStart(2, '0'), 360, 1.3); C.copy(sv); }
    if (s.dk.stage === 2 && !w.__turned) { w.__turned = true; log('TURNED at', (i / 60).toFixed(1), 's'); }
    for (const f of s.dk.victims) { if (f.rag && !f.__rl) { f.__rl = true; log('rag', 'fling', f.st.killFling, 'vmax', f.rag.vmax, 'travel', f.rag.travel, 'seed0', f.rag.parts[0] && f.rag.parts[0].seed ? f.rag.parts[0].seed.toArray().map((x) => x.toFixed(1)).join(',') : '-'); }
      if (!f.st.alive && !f.__d0) f.__d0 = f.g.position.clone();
      if (f.rag && f.__d0 && (f.__tr = (f.__tr || 0) + 1) <= 70 && f.__tr % 7 === 0 && !w.__trDone) { const hp = f.rag.byName['Character1_Hips'] || f.rag.parts[0]; (w.__tr = w.__tr || []).push(Math.hypot(hp.p.x - f.__d0.x, hp.p.z - f.__d0.z).toFixed(1) + '/' + (hp.p.y - f.__d0.y).toFixed(1)); if (f.__tr >= 70) { w.__trDone = true; log('first body, dist/height every 7 frames:', w.__tr.join(' '), 'landed', f.rag.landed, 'fort', !!f.rag.fort); } } if (f.__d0 && f.rag && f.rag.parts && f.rag.parts.length && !f.__logged && (f.__dt = (f.__dt || 0) + 1) > 240) { f.__logged = true; const hp = f.rag.parts[0].p; let top = 0; log('victim thrown', Math.hypot(hp.x - f.__d0.x, hp.z - f.__d0.z).toFixed(1), 'm'); } }
  }
}

export async function dkLight({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; u.st.awake = false; u.st.foe = null; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 50; }
  const R = b.renderer, gl = R.getContext(), V = b.camera.position.constructor, P = u.g.position, y = u.g.rotation.y;
  const place = () => { b.camera.position.set(P.x + Math.sin(y) * 3.6, P.y + 1.7, P.z + Math.cos(y) * 3.6); b.lookAt(P.x, P.y + 1.3, P.z); b.camera.updateMatrixWorld(true); };
  for (let k = 0; k < 20; k++) { place(); w.__adv(1); }
  const lumAt = (wp) => { place(); R.render(b.scene, b.camera); const c = wp.clone().project(b.camera); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const x = Math.round((c.x + 1) / 2 * W), yy = Math.round((c.y + 1) / 2 * H); const px = new Uint8Array(16 * 16 * 4); gl.readPixels(x - 8, yy - 8, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px); let s2 = 0; for (let k2 = 0; k2 < 256; k2++) s2 += px[k2 * 4] + px[k2 * 4 + 1] + px[k2 * 4 + 2]; return Math.round(s2 / 768); };
  log('dark knight chest', lumAt(new V(P.x, P.y + 1.4, P.z)), 'paving before him', lumAt(new V(P.x + Math.sin(y) * 1.3, P.y, P.z + Math.cos(y) * 1.3)));
  place(); shot('dk_front', 480, 1.0);
}

// THE DARK KNIGHT ON YOU, HANDS OFF: turned at once, you standing still facing him, healed; each swing, landed, on screen
export async function dkFight({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, home = [P.x + Math.sin(u.g.rotation.y) * (w.__fightR || 3), P.z + Math.cos(u.g.rotation.y) * (w.__fightR || 3)];
  const per = {}; let last = { swing: null, atk: -1 }, hitAt = 0, hurts = 0, hp0 = b.state().hp, landed = 0;
  for (let f = 0; f < 60 * 45; f++) {
    b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = home[0]; C.z = home[1];
    for (const g of b.farmUnitsS()) g.st.awake = false;
    if (u.st.atk >= 0 && (last.swing !== u.st.swing || u.st.atk < last.atk)) { const s = per[u.st.swing] || (per[u.st.swing] = { n: 0, land: 0, scr: [] }); s.n++; last.cur = s; }
    if (u.hitAt && u.hitAt !== hitAt && last.cur) { hitAt = u.hitAt; last.cur.land++; if (u.hitPt) { const q = u.hitPt.clone().project(b.camera); last.cur.scr.push(q.x.toFixed(2) + ',' + q.y.toFixed(2) + (q.z > 1 ? 'B' : '')); } }
    last.swing = u.st.atk >= 0 ? u.st.swing : null; last.atk = u.st.atk;
    if (b.state().hp < hp0) hurts++; b.heal(); hp0 = b.state().hp;
  }
  for (const [k, s] of Object.entries(per)) log(k, 'thrown', s.n, 'contacts landed', s.land, 'screen', s.scr.slice(0, 5).join(' '));
  { let th = 0, ld = 0; for (const s2 of Object.values(per)) { th += s2.n; ld += Math.min(s2.n, s2.land); } log('thrown', th, 'with a contact landed', ld); }
  log('hurts', hurts, 'in 45 s');
}

// THE SOUNDS OF A CHECKPOINT LOAD: a checkpoint saved (holding the katana, the shovel and rings in the pack), then loaded
// the way a death loads it, in a silent frame that logs every source started — and who started it — for the first 12 s
export async function loadSounds({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(2500);
  for (const it of [b.katanaItem, b.ringItem, b.militaryItem]) try { if (it && !b.inventory.includes(it)) b.addToInventory(it); } catch (e) {}
  try { if (b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) {}
  if (w.__lsRoom === 'fort') { b.placeInFort(); for (let i = 0; i < 100 && !b.fortRdy(); i++) await sleep(150); await sleep(3000); }
  else if (w.__lsRoom === 'c13') { for (let i = 0; i < 60 && !b.c13State().ready; i++) await sleep(300); b.placeInC13(); await sleep(4000); }
  else b.camera.position.set(8, 1.7, -60);
  await sleep(400); b.saveCheckpoint();
  try { await b.audioCtx.close(); } catch (e) {}
  await import('/tools/silentframe.js?' + Date.now());
  const ok = await window.__sfLoad(() => { sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1'); });
  const F = window.__sfW(), t0 = performance.now(), seen = [];
  const who = () => ((new Error().stack || '').split('\n').slice(2, 6).map((l) => l.trim().replace(/^at /, '').split(' ')[0]).filter((n) => n && !/^(Object|eval|new|<anonymous>)/.test(n)).join('<'));
  for (const C of [F.AudioBufferSourceNode, F.OscillatorNode, F.HTMLMediaElement]) {
    const pr = C.prototype, name = C === F.HTMLMediaElement ? 'play' : 'start', orig = pr[name];
    pr[name] = function (...a) { seen.push(((performance.now() - t0) / 1000).toFixed(2) + ' ' + (C === F.OscillatorNode ? 'osc' : C === F.HTMLMediaElement ? 'media' : 'buf') + ' ' + who()); return orig.apply(this, a); };
  }
  log('frame hooked', ok);
  for (let i = 0; i < 160; i++) { await sleep(100); const bb = F.__bw; if (bb && i === 40) { const btn = F.document.querySelector('.dc-restart'); if (btn) btn.click(); } }
  const counts = {}; for (const s of seen) { const k = s.split(' ').slice(1).join(' '); counts[k] = (counts[k] || 0) + 1; }
  log('sources started:', seen.length);
  for (const [k, n] of Object.entries(counts).sort((a, c) => c[1] - a[1]).slice(0, 40)) log(n, 'x', k);
  log('first 30 in order:', seen.slice(0, 30).join(' | '));
}

export async function loadSoundsFort(ctx) { ctx.w.__lsRoom = 'fort'; return loadSounds(ctx); }
export async function loadSoundsC13(ctx) { ctx.w.__lsRoom = 'c13'; return loadSounds(ctx); }

// THE CASTLES' FRAME COST: each section, the look down its length, 150 frames timed (gl.finish so the GPU's share counts),
// with draws, triangles, skinned meshes and visible lights
export async function castlePerf({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  const R = b.renderer, gl = R.getContext(), C = b.camera;
  const measure = async (name, n = 150) => {
    for (let i = 0; i < 30; i++) { w.__adv(1); b.heal(); }
    const ts = []; let calls = 0, tris = 0; R.info.autoReset = false;
    for (let i = 0; i < n; i++) { R.info.reset(); const t = performance.now(); w.__adv(1); gl.finish(); ts.push(performance.now() - t); calls += R.info.render.calls; tris += R.info.render.triangles; b.heal(); if (i % 30 === 0) await sleep(1); }
    R.info.autoReset = true;
    // what is drawn: the visible (and in-frustum) meshes this frame by top-level group, triangles
    { const fr = new (b.camera.constructor.prototype.constructor === Object ? Object : Object)(); const F = new (window.__THREEF || (window.__THREEF = null) || Object)(); }
    { const byTop = new Map(); const cam = b.camera; cam.updateMatrixWorld(true);
      const T = b.renderer.constructor; const fr = new (b.frustumCtor || Object)();
      for (const top of b.scene.children) { if (!top.visible) continue; let t = 0, n2 = 0, sk = 0; top.traverseVisible((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; const c = (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3; t += c * (o.isInstancedMesh ? o.count : 1); n2++; if (o.isSkinnedMesh) sk++; } }); if (n2) byTop.set((top.name || top.type) + '#' + top.id, [Math.round(t / 1000), n2, sk]); }
      log('  heaviest visible groups (k tris, meshes, skinned):', [...byTop.entries()].sort((a2, c2) => c2[1][0] - a2[1][0]).slice(0, 8).map(([k2, v]) => k2 + ':' + v.join('/')).join('  ')); }
    ts.sort((a, c) => a - c);
    let sk = 0, ms = 0, lt = 0; b.scene.traverse((o) => { if (!o.visible) return; if (o.isSkinnedMesh) sk++; else if (o.isMesh) ms++; if (o.isLight && o.intensity > 0) lt++; });
    log(name, 'median', ts[n >> 1].toFixed(1), 'ms p90', ts[Math.floor(n * 0.9)].toFixed(1), 'max', ts[n - 1].toFixed(1), 'draws', Math.round(calls / n), 'tris', Math.round(tris / n / 1000) + 'k', 'skinned', sk, 'meshes', ms, 'lights', lt);
  };
  // the first castle: the street mid-fight, looking up it
  await measure('fort street (fight on)');
  const D = b.dkS ? b.dkS().u : null;
  // castle XIII
  for (let i = 0; i < 60 && !b.c13State().ready; i++) await sleep(300);
  b.placeInC13(); for (let i = 0; i < 400 && !b.c13State().walls; i++) { w.__adv(1); await sleep(5); }
  await sleep(2000); for (let i = 0; i < 200; i++) w.__adv(1);
  await measure('castle XIII court');
  b.look(b.camera.rotation.y + Math.PI, 0); await measure('castle XIII court, turned');
  // the throne room
  try { b.startThrone(1); for (let i = 0; i < 600 && !b.state().inThrone; i++) { w.__adv(1); if (i % 20 === 0) await sleep(20); } } catch (e) { log('throne', e.message); }
  for (let i = 0; i < 300; i++) w.__adv(1);
  await measure('throne room');
}

export async function castleWhat({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn(); for (let i = 0; i < 60; i++) w.__adv(1);
  const V = b.camera.position.constructor, C = b.camera.position;
  log('player', C.toArray().map((x) => x.toFixed(1)).join(','));
  for (const top of b.scene.children) {
    if (!top.visible) continue; let t = 0, n = 0, sk = 0; top.traverseVisible((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); n++; if (o.isSkinnedMesh) sk++; } });
    if (t < 20000) continue;
    const bb = new (b.scene.children[0].geometry ? Object : Object)();
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; top.updateMatrixWorld(true); top.traverseVisible((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox && !o.geometry.boundingBox && o.geometry.computeBoundingBox(); const B = o.geometry.boundingBox; if (!B) return; const p = new V(); for (const k of [B.min, B.max]) { p.copy(k).applyMatrix4(o.matrixWorld); mn = mn.map((v, i) => Math.min(v, p.getComponent(i))); mx = mx.map((v, i) => Math.max(v, p.getComponent(i))); } } });
    const names = []; top.traverseVisible((o) => { if (o.isMesh && names.length < 3) names.push(o.name); });
    log(top.name || top.type, '#' + top.id, Math.round(t / 1000) + 'k tris', n, 'meshes', sk, 'skinned', 'box', mn.map((v) => v.toFixed(0)).join(','), '->', mx.map((v) => v.toFixed(0)).join(','), 'eg', names.join('|'), 'fc', (() => { let f = 0; top.traverseVisible((o) => { if (o.isMesh && o.frustumCulled === false) f++; }); return f; })());
  }
}

// WHAT CAN BE SEEN FROM INSIDE EACH CASTLE: along the first castle's street and Castle XIII's court, eight ways round at
// each spot, the frame drawn with and without each other big group; how many pixels each changes (any = it is seen)
export async function castleVis({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn(); for (let i = 0; i < 60; i++) w.__adv(1);
  const R = b.renderer, gl = R.getContext(), C = b.camera, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const grp = (n) => b.scene.children.find((o) => o.name === n);
  const ocean = b.scene.children.find((o) => o.isMesh && o.geometry && o.geometry.index && o.geometry.index.count / 3 > 100000 && !o.name);
  const grab = () => { R.render(b.scene, C); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const diff = (a2, b2) => { let n = 0; for (let k = 0; k < a2.length; k += 4) if (Math.abs(a2[k] - b2[k]) + Math.abs(a2[k + 1] - b2[k + 1]) + Math.abs(a2[k + 2] - b2[k + 2]) > 24) n++; return n; };
  const test = async (label, spots, others) => {
    const tot = {}; for (const o of others) tot[o] = 0;
    for (const [x, y, z] of spots) for (let k = 0; k < 8; k++) {
      C.position.set(x, y, z); b.look(k / 8 * Math.PI * 2, 0.12); C.updateMatrixWorld(true);
      for (const o of others) { const G = o === 'ocean' ? ocean : grp(o); if (!G || !G.visible) continue; const A = grab(); G.visible = false; const B = grab(); G.visible = true; tot[o] = Math.max(tot[o], diff(A, B)); }
      if ((k & 3) === 0) await sleep(1);
    }
    log(label, 'most pixels changed at any spot/direction (of ' + W * H + '):', JSON.stringify(tot));
  };
  const fy = b.camera.position.y;
  const fs = []; const SP = b.fortDbg.FARM_SPINE; for (let i = 0; i < SP.length - 1; i++) for (let t = 0; t < 1; t += 0.34) { const L = b.fortDbg.fortW(SP[i][0] + (SP[i + 1][0] - SP[i][0]) * t, SP[i][1] + (SP[i + 1][1] - SP[i][1]) * t); const f = b.fortDbg.fortCourtAt(L.x, L.z); if (f !== null) fs.push([L.x, f + 1.7, L.z]); }
  log('fort spots', fs.length);
  if (!w.__skipFort) await test('FIRST CASTLE STREET', fs, ['castle13', 'isle', 'ocean']);
  for (let i = 0; i < 60 && !b.c13State().ready; i++) await sleep(300);
  b.placeInC13(); for (let i = 0; i < 400 && !b.c13State().walls; i++) { w.__adv(1); await sleep(5); }
  for (let i = 0; i < 100; i++) w.__adv(1);
  const c0 = b.camera.position.clone(), cs = [];
  // every 9 m over Castle XIII's box (x 18..134, z -1294..-1231), wherever there is a court floor
  for (let x = 20; x <= 132; x += 9) for (let z = -1292; z <= -1233; z += 9) { const f = b.c13CourtAt(x, z); if (f !== null) cs.push([x, f + 1.7, z]); }
  w.__fy = cs.map((q) => q[1].toFixed(1)).join(',');
  log('c13 spots', cs.length, 'eye heights', w.__fy);
  await test('CASTLE XIII COURT', cs, ['fort', 'isle', 'ocean']);
}

export async function castleVisC13(ctx) { ctx.w.__skipFort = true; return castleVis(ctx); }

// WHICH PIECES OF CASTLE XIII AND THE ISLAND ARE SEEN FROM THE FIRST CASTLE'S STREET: every mesh hidden in turn at every
// spot and direction; the ones that never change a pixel are listed (by traversal index)
export async function castleVisMesh({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn(); for (let i = 0; i < 60; i++) w.__adv(1);
  const R = b.renderer, gl = R.getContext(), C = b.camera, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const grp = (n) => b.scene.children.find((o) => o.name === n);
  const grab = () => { R.render(b.scene, C); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const diff = (a2, b2) => { let n = 0; for (let k = 0; k < a2.length; k += 16) if (Math.abs(a2[k] - b2[k]) + Math.abs(a2[k + 1] - b2[k + 1]) + Math.abs(a2[k + 2] - b2[k + 2]) > 24) n++; return n; };
  const fs = []; const SP = b.fortDbg.FARM_SPINE; for (let i = 0; i < SP.length - 1; i++) for (let t = 0; t < 1; t += 0.25) { const L = b.fortDbg.fortW(SP[i][0] + (SP[i + 1][0] - SP[i][0]) * t, SP[i][1] + (SP[i + 1][1] - SP[i][1]) * t); const f = b.fortDbg.fortCourtAt(L.x, L.z); if (f !== null) fs.push([L.x, f + 1.7, L.z]); }
  for (const gname of ['castle13', 'isle']) {
    const G = grp(gname); if (!G) continue;
    const ms = []; G.traverse((o) => { if (o.isMesh && o.visible) ms.push(o); });
    const seen = new Array(ms.length).fill(0);
    for (const [x, y, z] of fs) for (let k = 0; k < 8; k++) {
      C.position.set(x, y, z); b.look(k / 8 * Math.PI * 2, 0.15); C.updateMatrixWorld(true);
      const base = grab();
      if (diff(base, (() => { G.visible = false; const p2 = grab(); G.visible = true; return p2; })()) === 0) continue;   // none of it here
      for (let i = 0; i < ms.length; i++) { if (seen[i] > 40) continue; ms[i].visible = false; const p2 = grab(); ms[i].visible = true; seen[i] = Math.max(seen[i], diff(base, p2)); }
      await sleep(1);
    }
    const unseen = []; let tri = 0, triAll = 0;
    ms.forEach((m, i) => { const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); triAll += t; if (seen[i] === 0) { unseen.push(i); tri += t; } });
    log(gname, 'meshes', ms.length, 'never seen from the street:', unseen.length, Math.round(tri / 1000) + 'k of ' + Math.round(triAll / 1000) + 'k tris');
    log(gname, 'unseen idx', JSON.stringify(unseen));
    log(gname, 'seen names', ms.filter((m, i) => seen[i] > 0).map((m) => m.name + (m.parent && m.parent !== G ? '<' + m.parent.name : '')).slice(0, 40).join(','));
    const un = {}; ms.forEach((m, i) => { if (seen[i] === 0) { const k = m.name + (m.parent && m.parent !== G ? '<' + m.parent.name : ''); un[k] = (un[k] || 0) + 1; } }); log(gname, 'unseen names', JSON.stringify(un));
  }
}

// CASTLE XIII'S ARCH DOOR: what its two leaves are made of — each leaf's meshes by material, triangle count, map, colour,
// and each material's footprint in the leaf (height range, depth) — and stills of the leaves alone, shut and open
export async function archDoor({ w, b, log, sleep, shot }) {
  await import('/tools/c13shot.js?' + Date.now()).catch(() => {});
  w.eval(await (await fetch('/tools/swordknights.js?' + Date.now())).text());
  log('go', JSON.stringify(await w.__knGo()));
  const A = b.c13Dbg().arch; log('arch', !!A);
  if (!A) return;
  for (const [i, L] of A.leaves.entries()) {
    L.pivot.updateMatrixWorld(true);
    L.pivot.children.forEach((m) => { const g = m.geometry; g.computeBoundingBox(); const B = g.boundingBox; const mp = m.material.map; log('leaf', i, 'mat', m.material.name, 'tris', g.attributes.position.count / 3, 'map', mp ? (mp.name || '?') + ' ' + (mp.image ? mp.image.width + 'x' + mp.image.height : '') : '-', 'col', m.material.color.getHexString(), 'y', B.min.y.toFixed(2) + '..' + B.max.y.toFixed(2), 'x', B.min.x.toFixed(2) + '..' + B.max.x.toFixed(2), 'z', B.min.z.toFixed(2) + '..' + B.max.z.toFixed(2)); });
  }
  // stills: from each court, four metres out, shut and then open
  const C = b.camera.position, X = b.C13_X, Z = b.C13_Z, Y = b.c13CourtAt(X + A.ax, Z + A.az) ?? b.camera.position.y - 1.7;
  const mid = { x: X + A.ax + A.ux * A.L / 2, z: Z + A.az + A.uz * A.L / 2 };
  const shots = async (tag) => { for (const [nm, s2] of [['w', -1], ['e', 1]]) { const px = mid.x + A.ux * s2 * (A.L / 2 + 3.6), pz = mid.z + A.uz * s2 * (A.L / 2 + 3.6); for (let k = 0; k < 3; k++) { C.set(px, Y + 1.7, pz); b.lookAt(mid.x, Y + 1.6, mid.z); w.__c13Step(1); } C.set(px, Y + 1.7, pz); b.lookAt(mid.x, Y + 1.6, mid.z); b.camera.updateMatrixWorld(true); shot('arch_' + tag + '_' + nm, 420, 1.5); } };
  await shots('shut');
  b.openC13Arch(true); for (let i = 0; i < 180; i++) w.__c13Step(1);
  await shots('open');
}

// THE DARK KNIGHT'S EVERY SWING, FORCED: you stand still in front of him, facing him, healed; each swing 3 times. For each
// contact (the main and the string's others): did it land, where was his blade's point on the screen at that moment
// (ndc), and how far from your eye the blade passed (m) — the misses with their distance
export async function dkSwings({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, V = C.constructor, P = u.g.position;
  const tip = u.bones.tip, hilt = u.model.getObjectByName('kn_hilt');
  const keys = (w.__dkKeys || Object.keys(u.kind.use)).filter((k) => u.atk[k]);
  for (const k of keys) {
    const A = u.atk[k], res = [];
    for (let r = 0; r < 3; r++) {
      // stand him off at this swing's own stop, you facing him
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
      const yaw = u.g.rotation.y, d0 = (A.stop || 2) + 0.4;
      const home = [P.x + Math.sin(yaw) * d0, P.z + Math.cos(yaw) * d0];
      C.set(home[0], C.y, home[1]);
      for (let i = 0; i < 20; i++) { b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
      u.st.forceSwing = k; u.st.cool = 0;
      let started = false, hitN = 0, hitAt0 = u.hitAt || 0; const contacts = (A.moreT ? [A.wind, ...A.moreT] : [A.wind]).map((t) => ({ t, best: 9, land: false, ndc: null }));
      for (let i = 0; i < 600; i++) {
        b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; for (const g of b.farmUnitsS()) g.st.awake = false;
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (!live) continue;
        const t = u.st.atk;
        for (const c of contacts) if (Math.abs(t - c.t) < 0.12) {
          const H = hilt.getWorldPosition(new V()), T = tip.getWorldPosition(new V());
          for (let j = 0; j <= 6; j++) { const q = H.clone().lerp(T, 0.3 + 0.7 * j / 6); const dd = q.distanceTo(C); if (dd < c.best) { c.best = dd; c.ndc = q.clone().project(b.camera); } }
        }
        if (u.hitAt && u.hitAt !== hitAt0) { hitAt0 = u.hitAt; const c = contacts.reduce((a2, c2) => (Math.abs(t - c2.t) < Math.abs(t - a2.t) ? c2 : a2)); c.land = true; }
        b.heal();
      }
      res.push(started ? contacts.map((c) => (c.land ? 'L' : 'm') + c.best.toFixed(2) + (c.ndc ? '@' + c.ndc.x.toFixed(2) + ',' + c.ndc.y.toFixed(2) : '')).join('+') : 'never');
    }
    log(k, 'stop', (A.stop || 0).toFixed(2), res.join('  '));
  }
}

// EACH DARK KNIGHT SWING AT EACH STAND-OFF: forced once at stops 1.5 … 3.3; where its landed blow was on your screen (ndc)
export async function dkStopSweep({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position;
  const keys = (w.__dkKeys || Object.keys(u.kind.use)).filter((k) => u.atk[k]);
  for (const k of keys) {
    const A = u.atk[k], out = [], st0 = A.stop;
    for (const S of [1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3]) {
      A.stop = S;
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
      const yaw = u.g.rotation.y, home = [P.x + Math.sin(yaw) * (S + 0.3), P.z + Math.cos(yaw) * (S + 0.3)];
      for (let i = 0; i < 15; i++) { C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
      u.st.forceSwing = k; u.st.cool = 0;
      let started = false, h0 = u.hitAt || 0; const hits = [];
      for (let i = 0; i < 600; i++) {
        C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); for (const g of b.farmUnitsS()) g.st.awake = false;
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (u.hitAt && u.hitAt !== h0) { h0 = u.hitAt; const q = u.hitPt.clone().project(b.camera); hits.push(q.x.toFixed(2) + ',' + q.y.toFixed(2)); }
        b.heal();
      }
      out.push(S + ':' + (hits.length ? hits.join('+') : (started ? 'miss' : 'never')));
    }
    A.stop = st0;
    log(k, out.join('  '));
  }
}

// THE DEATH CARD'S RESTART, CLICKED ONCE (2026-10-19, the owner: "i keep having to click restart twice"): a death's reload in
// a silent frame, Restart clicked before main.js is running ('early'), on the card before the reload ('pre'), or not at all
// ('none' — it must still be waiting). Logs when the words fade and when the game is in, with no second click.
export async function dcClick({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(2500); b.camera.position.set(8, 1.7, -60); await sleep(400); b.saveCheckpoint();
  try { await b.audioCtx.close(); } catch (e) {}
  await import('/tools/silentframe.js?' + Date.now());
  for (const v of ['early', 'pre', 'none']) {
    await window.__sfLoad(() => { sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1'); if (v === 'pre') sessionStorage.setItem('beachwalk.dcGo', '1'); });
    const F = window.__sfW(), t0 = performance.now(); let clickedAt = -1, fadedAt = -1, inAt = -1, bwAt = -1;
    for (let i = 0; i < 400; i++) {
      await sleep(50);
      const d = F.document, btn = d.querySelector('.dc-restart'), card = d.getElementById('deathcard'), t = Math.round(performance.now() - t0);
      if (v === 'early' && clickedAt < 0 && btn && !F.__bw) { btn.click(); clickedAt = t; }
      if (bwAt < 0 && F.__bw && F.__bw.state) bwAt = t;
      const h1 = d.querySelector('#deathcard h1'); if (fadedAt < 0 && h1 && +F.getComputedStyle(h1).opacity < 0.5) fadedAt = t;
      const black = d.getElementById('blackout'); const died = d.documentElement.classList.contains('died');
      if (inAt < 0 && F.__bw && !died && black && +black.style.opacity === 0) { inAt = t; break; }
    }
    log(v, 'clicked', clickedAt, 'ms; module up', bwAt, 'ms; words faded', fadedAt, 'ms; in the game', inAt, 'ms', inAt < 0 ? '(still waiting: card ' + F.document.documentElement.classList.contains('died') + ')' : '');
  }
}

// UNDER THE DRAWBRIDGE'S LAND END (2026-10-19, the owner's screenshot: down on the rock beside the buttress, the deck's
// stringer overhead, "i fell and got stuck"). Every floor the island's plan holds in x 3…14 across the bridge, as a map
// of the top floor's height against the deck; then a body stood on each floor more than a metre under the deck walks out
// eight ways — every one that cannot get back within half a metre of the terrace's height is a trap.
export async function isleUnderBr({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const BR = b.ISLE_BR, S = b.ISLE_SITE, D = BR.y;
  const X0 = +(w.__ubX0 || 2), X1 = +(w.__ubX1 || 14), Z0 = BR.z - 6, Z1 = BR.z + 6;
  log('deck', D, 'bridge z', BR.z.toFixed(2), 'x', BR.x0, '…', BR.x1);
  for (let z = Z1; z >= Z0 - 1e-6; z -= 0.4) {
    let line = '';
    for (let x = X0; x <= X1 + 1e-6; x += 0.2) {
      const fl = b.keepCellAt(x, z, S); let top = null;
      if (fl) for (let k = 0; k < fl.length; k += 3) if (fl[k] < D + 1.5 && (top === null || fl[k] > top)) top = fl[k];
      const d = top === null ? null : top - D;
      line += d === null ? ' ' : d > -0.3 ? '.' : d > -1.1 ? '-' : d > -3 ? 'o' : d > -6.5 ? 'O' : '#';
    }
    log((z - BR.z).toFixed(1).padStart(5), line);
  }
  // the walk-out test
  const C = b.camera.position, traps = [];
  let tried = 0;
  for (let z = Z0; z <= Z1 + 1e-6; z += 0.4) for (let x = X0; x <= X1 + 1e-6; x += 0.4) {
    const fl = b.keepCellAt(x, z, S); if (!fl) continue;
    for (let k = 0; k < fl.length; k += 3) {
      const f = fl[k]; if (f > D - 1.0 || f < D - 9) continue;
      tried++;
      let out = false, best = -99;
      for (let a = 0; a < 8 && !out; a++) {
        C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.groundY = f; w.__adv(3);
        if (Math.abs(C.y - (f + 1.7)) > 0.3) break;   // not a floor a body stands on
        const ang = a / 8 * Math.PI * 2; b.keys.KeyW = true;
        for (let i = 0; i < 90; i++) { b.lookAt(C.x + Math.sin(ang) * 5, C.y, C.z + Math.cos(ang) * 5); w.__adv(1); if (i % 30 === 29) { b.keys.Space = true; w.__adv(1); b.keys.Space = false; } }
        b.keys.KeyW = false; w.__adv(4);
        best = Math.max(best, C.y - 1.7 - D);
        if (C.y - 1.7 > D - 0.5) out = true;
      }
      if (!out && best > -98) traps.push([x.toFixed(1), (z - BR.z).toFixed(1), (f - D).toFixed(2), best.toFixed(2)]);
    }
  }
  log('floors under the deck tried', tried, 'traps', traps.length);
  for (const t of traps.slice(0, 60)) log('trap x', t[0], 'dz', t[1], 'floor', t[2], 'highest reached', t[3]);
}

// stills from candidate spots under the bridge's land end, to match the owner's screenshot
export async function isleUnderBrShots({ w, b, log, sleep, shot }) {
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(30); }
  window.requestAnimationFrame = () => 0; w.requestAnimationFrame = () => 0;
  const BR = b.ISLE_BR, S = b.ISLE_SITE, C = b.camera;
  b.isleWorldG().visible = true;
  const top = (x, z) => { const fl = b.keepCellAt(x, z, S); let t = null; if (fl) for (let k = 0; k < fl.length; k += 3) if (fl[k] < BR.y + 1.5 && (t === null || fl[k] > t)) t = fl[k]; return t; };
  const spots = [[8.0, -3, 0], [8.4, -1.6, 0], [9.6, 1.6, Math.PI], [7.6, -4.5, 0.6], [8.8, -2.2, -0.6], [9.0, -1.2, 0.3]];
  let n = 0;
  for (const [x, dz, yaw] of spots) {
    const z = BR.z + dz, f = top(x, z); if (f === null) { log('no floor', x, dz); continue; }
    C.position.set(x, f + 1.0, z); C.rotation.set(0, 0, 0); C.rotation.order = 'YXZ'; C.rotation.y = yaw; C.rotation.x = 0.25; C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C);
    log('spot', ++n, 'x', x, 'dz', dz, 'floor', (f - BR.y).toFixed(2));
    shot('ub_' + n, 640, 2.0);
  }
}

// THE JETTY'S BOX AT SEA LEVEL (2026-10-19, the owner's screenshot: in the sea mist, the jetty's lamp post at the left,
// "i fell and got stuck"). The walk lets you drop onto ANY floor in `isleJettyBox`, not only the boards. Maps the top
// floor in the box, then stands a body on every low floor (under 1.5 m) and walks it out eight ways with jumps; a spot
// that never gets back up onto the boards' height (or the stair) is a trap.
export async function isleJettyTraps({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const S = b.ISLE_SITE;
  const ez = (z) => z - 100;
  const X0 = -28, X1 = -12.5, Z0 = ez(-1162.5), Z1 = ez(-1135);
  const top = (x, z) => { const fl = b.keepCellAt(x, z, S); let t = null; if (fl) for (let k = 0; k < fl.length; k += 3) if (fl[k] < 6 && (t === null || fl[k] > t)) t = fl[k]; return t; };
  for (let z = Z1; z >= Z0; z -= 0.5) {
    let line = '';
    for (let x = X0; x <= X1; x += 0.25) { const t = top(x, z); line += t === null ? ' ' : t < 0.2 ? '~' : t < 0.36 ? '_' : t < 0.8 ? '=' : t < 1.5 ? 'r' : t < 3 ? 'o' : 'O'; }
    log(String((z + 100).toFixed(1)).padStart(8), line);
  }
  const C = b.camera.position, traps = []; let tried = 0;
  const T0 = performance.now();
  for (let z = Z0; z <= Z1; z += 0.5) for (let x = X0; x <= X1; x += 0.5) {
    const f = top(x, z); if (f === null || f >= 1.5) continue;
    if (f > 0.36 && f < 0.8) continue;                     // the boards themselves
    tried++;
    let out = false, best = -9, stood = false;
    for (let a = 0; a < 8 && !out; a++) {
      C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.groundY = f; b.isleSetLast(x, z, f); w.__adv(3);
      if (Math.abs(C.y - (f + 1.7)) > 0.3 || Math.hypot(C.x - x, C.z - z) > 0.3) break;
      stood = true;
      const ang = a / 8 * Math.PI * 2; b.keys.KeyW = true;
      for (let i = 0; i < 100; i++) { b.lookAt(C.x + Math.sin(ang) * 5, C.y, C.z + Math.cos(ang) * 5); w.__adv(1); if (i % 25 === 20) { b.keys.Space = true; w.__adv(1); b.keys.Space = false; } }
      b.keys.KeyW = false; w.__adv(4);
      const g = b.isleS().groundY; best = Math.max(best, g);
      if (g > 0.36) out = true;
    }
    if (stood && !out) traps.push([x.toFixed(1), (z + 100).toFixed(1), f.toFixed(2), best.toFixed(2)]);
  }
  log('low floors tried', tried, 'traps', traps.length, 'in', Math.round(performance.now() - T0), 'ms');
  for (const t of traps.slice(0, 80)) log('trap x', t[0], 'z', t[1], 'floor', t[2], 'best', t[3]);
}

// after the fix: from the boards and from the rock round the pockets, walk (and jump) at each old trap spot; nobody may
// end up under 1.5 m off the boards. Then a body put down in a pocket must be lifted back to its last good spot.
export async function isleJettyFix({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const S = b.ISLE_SITE, ez = (z) => z - 100, C = b.camera.position;
  const top = (x, z) => { const fl = b.keepCellAt(x, z, S); let t = null; if (fl) for (let k = 0; k < fl.length; k += 3) if (fl[k] < 40 && (t === null || fl[k] > t)) t = fl[k]; return t; };
  const boards = (x, z) => (x > -27.2 && x < -21.3 && z > ez(-1161.8) && z < ez(-1139)) || (x > -27.2 && x < -12.5 && z > ez(-1140.2) && z < ez(-1135));
  const targets = [[-14.0, -1157.0], [-14.5, -1156.0], [-18.0, -1154.0], [-17.0, -1154.0], [-17.5, -1153.5], [-16.0, -1155.0]];
  // starts: every floor within 7 m of a target that is > 1.5 or on the boards, sampled every 1 m
  let walks = 0, bad = [];
  for (const [tx, tz0] of (location.search.includes('rescue') || w.__onlyRescue ? [] : targets)) {
    const tz = ez(tz0);
    for (let dx = -7; dx <= 7; dx += 1) for (let dz = -7; dz <= 7; dz += 1) {
      const x = tx + dx, z = tz + dz, f = top(x, z); if (f === null || !(f > 1.5 || boards(x, z)) || Math.hypot(dx, dz) < 1.5) continue;
      C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.groundY = f; b.isleSetLast(x, z, f); w.__adv(3);
      if (Math.hypot(C.x - x, C.z - z) > 0.3) continue;
      walks++; let low = 99, at = null; b.keys.KeyW = true;
      for (let i = 0; i < 160; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); if (i % 20 === 10) { b.keys.Space = true; w.__adv(1); b.keys.Space = false; }
        const g = b.isleS().groundY; if (b.state().onGround && g < 1.5 && !boards(C.x, C.z) && g < low) { low = g; at = [C.x.toFixed(1), (C.z + 100).toFixed(1)]; } }
      b.keys.KeyW = false; w.__adv(4);
      if (at) bad.push(`from ${x.toFixed(1)},${(z + 100).toFixed(1)} (f ${f.toFixed(1)}) down to ${low.toFixed(2)} at ${at.join(',')}`);
    }
  }
  log('walks', walks, 'ended low off the boards', bad.length); for (const s of bad.slice(0, 20)) log(s);
  // the rescue: stand on the boards (a good spot), then be put down in a pocket
  { const gx = -24, gz = ez(-1150), gf = top(gx, gz);
    C.set(gx, gf + 1.7, gz); b.camBaseY = gf + 1.7; b.groundY = gf; b.isleSetLast(gx, gz, gf); b.keys.KeyW = true; w.__adv(20); b.keys.KeyW = false; w.__adv(10);
    const px = -14.5, pz = ez(-1156), pf = (() => { const fl = b.keepCellAt(px, pz, S); let t = null; for (let k = 0; k < fl.length; k += 3) if (fl[k] < 1.5) t = fl[k]; return t; })();
    C.set(px, pf + 1.7, pz); b.camBaseY = pf + 1.7; b.groundY = pf; w.__adv(1);
    const sx = C.x, sz = C.z; w.__adv(20);
    log('rescue: put at', px, -1156, 'floor', pf.toFixed(2), '→ now', C.x.toFixed(2), (C.z + 100).toFixed(2), 'ground', b.isleS().groundY, 'eye', C.y.toFixed(2)); }
}

export async function isleJettyRescue(ctx) { ctx.w.__onlyRescue = true; return isleJettyFix(ctx); }

// the jetty's ways still walk: down the flight from its landing to the boards, off the flight's west side from the third
// tread onto the deck, along the walkway to its sea end, and back up the flight to the landing
export async function isleJettyWays({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const ez = (z) => z - 100, C = b.camera.position;
  const put = (x, z, f) => { C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.groundY = f; b.isleSetLast(x, z, f); w.__adv(5); };
  const go = (tx, tz, n, jump) => { b.keys.KeyW = true; for (let i = 0; i < n; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); if (jump && i === 5) { b.keys.Space = true; w.__adv(1); b.keys.Space = false; } if (Math.hypot(C.x - tx, C.z - tz) < 0.3) break; } b.keys.KeyW = false; w.__adv(10); return `${C.x.toFixed(2)},${(C.z + 100).toFixed(2)} ground ${b.isleS().groundY}`; };
  put(-16.6, ez(-1148.6), 15.65); log('landing → down the flight:', go(-16.6, ez(-1136.6), 900));
  log('→ along the landing to the walkway:', go(-24, ez(-1138), 600));
  log('→ out to the sea end:', go(-24, ez(-1160.5), 1200));
  log('→ back to the foot of the flight:', go(-16.6, ez(-1136.8), 1400));
  log('→ up the flight:', go(-16.6, ez(-1148.4), 1400));
  put(-17.4, ez(-1138.65), 2.76); log('third tread → off the west side:', go(-19.5, ez(-1138.65), 120, true));
  put(-22.0, ez(-1151.4), 0.41); log('edge, straight up the walkway:', go(-22.0, ez(-1141), 900));
  put(-22.0, ez(-1151.4), 0.41); log('edge, diagonal again:', go(-16.6, ez(-1136.8), 900));
  if (w.__oldRule) log('(old rule)');
}

// what holds a body at the walkway's east edge by the post (x −22, z −1151.4): the cells round it and the walls a stride
// of 10 cm meets each way at the walk's five heights
export async function isleEdgeDbg({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const S = b.ISLE_SITE, ez = (z) => z - 100, x0 = +(w.__edX || -22.0), z0 = ez(+(w.__edZ || -1151.4)), feet = 0.41;
  for (let dz = 0.8; dz >= -0.81; dz -= 0.2) { const row = []; for (let dx = -0.8; dx <= 0.81; dx += 0.2) { const fl = b.keepCellAt(x0 + dx, z0 + dz, S); row.push(fl ? (fl.length ? fl.filter((v, k) => k % 3 === 0).map((v) => v.toFixed(2)).join('/') : 'wall') : 'null'); } log(dz.toFixed(1).padStart(5), row.map((s) => s.padEnd(11)).join(' ')); }
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2, x1 = x0 + Math.sin(an) * 0.1, z1 = z0 + Math.cos(an) * 0.1;
    const h = [0.45, 0.8, 1.0, 1.25, 1.68].map((y) => b.keepHitsWall(x0, z0, x1, z1, feet + y, S) ? 'X' : '.').join('');
    const st = b.keepFloorAt(x1, z1, feet, S.step, S);
    log('dir', (a * 45) + '°', 'walls at knee…head', h, 'floor', st ? st.f.toFixed(2) + (st.s ? ' s' : '') : 'null', 'near', b.keepWallNear(x1, z1, 0.26 * 0.9, feet + 0.3, feet + 1.7, S)); }
}

// the diagonal from the walkway's sea end toward the flight's foot, traced: where the body is each frame near the edge
export async function isleEdgeTrace({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const ez = (z) => z - 100, C = b.camera.position, S = b.ISLE_SITE;
  C.set(-24, 0.41 + 1.7, ez(-1160.6)); b.camBaseY = 2.11; b.groundY = 0.41; b.isleSetLast(-24, ez(-1160.6), 0.41); w.__adv(5);
  const tx = -16.6, tz = ez(-1136.8); b.keys.KeyW = true; const tr = [];
  for (let i = 0; i < 700; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); const L = b.isleLast(); const fl = b.keepCellAt(C.x, C.z, S);
    if (C.x > -22.6) tr.push(`${i}:${C.x.toFixed(3)},${(C.z + 100).toFixed(2)} cell ${fl ? 'y' : 'n'} last ${L.x.toFixed(3)},${(L.z + 100).toFixed(2)}`); }
  b.keys.KeyW = false;
  log(tr.slice(0, 14).join(' | ')); log(tr.slice(-4).join(' | '));
}

export async function isleEdgeDbg2(ctx) { ctx.w.__edX = -22.0; ctx.w.__edZ = -1154.8; return isleEdgeDbg(ctx); }

// at the spot the diagonal stops, the walk's own tests for a stride each way
export async function isleEdgeWhy({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const ez = (z) => z - 100, C = b.camera.position, S = b.ISLE_SITE;
  C.set(-24, 2.11, ez(-1160.6)); b.camBaseY = 2.11; b.groundY = 0.41; b.isleSetLast(-24, ez(-1160.6), 0.41); w.__adv(5);
  const tx = -16.6, tz = ez(-1136.8); b.keys.KeyW = true;
  for (let i = 0; i < 400; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); }
  w.__isleDbg = {}; const tr = []; for (let i = 0; i < 12; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); tr.push(C.x.toFixed(3) + ',' + (C.z + 100).toFixed(3)); }
  log('frames', tr.join(' '), 'tried', w.__isleDbg.tried, 'slips', w.__isleDbg.slip, 'onGround', b.state().onGround);
  if (w.__whyOnly) return;
  w.__isleDbg = {}; b.lookAt(tx, C.y, tz); w.__adv(1); b.keys.KeyW = false;
  const F = w.__isleDbg.f; log('at', C.x.toFixed(4), (C.z + 100).toFixed(4), 'pre', F.pre.x.toFixed(4), (F.pre.z + 100).toFixed(4), 'feet', F.feet.toFixed(2), 'ref', F.ref.toFixed(2), 'up', F.up);
  const x0 = F.pre.x, z0 = F.pre.z;
  for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2;
    for (const d of [0.07, 0.15, 0.25]) { const x = x0 + Math.sin(an) * d, z = z0 + Math.cos(an) * d, st = b.keepFloorAt(x, z, F.feet, F.up, S);
      log(String(Math.round(an * 57.3)).padStart(4) + '°', d, 'floor', st ? st.f.toFixed(2) : 'null', 'next', !!F.nextTo(st, x, z), 'hits', F.hits(x0, z0, x, z), 'steep', st ? F.steep(x, z, st) : '-', 'tower', F.tower(x, z), 'flank', F.flank(x, z), 'legal', !!F.legal(x, z)); } }
}

export async function isleEdgeFrames(ctx) { ctx.w.__whyOnly = true; return isleEdgeWhy(ctx); }

// the post on the walkway's rim: walk up the edge into it, then the walk's tests each way and the cells round it
export async function islePostWhy({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const ez = (z) => z - 100, C = b.camera.position, S = b.ISLE_SITE;
  C.set(-22.3, 2.11, ez(-1150.5)); b.camBaseY = 2.11; b.groundY = 0.41; b.isleSetLast(-22.3, ez(-1150.5), 0.41); w.__adv(5);
  const tx = -22.0, tz = ez(-1141); b.keys.KeyW = true;
  for (let i = 0; i < 300; i++) { b.lookAt(tx, C.y, tz); w.__adv(1); }
  w.__isleDbg = {}; b.lookAt(tx, C.y, tz); w.__adv(1); b.keys.KeyW = false;
  const F = w.__isleDbg.f; log('at', C.x.toFixed(3), (C.z + 100).toFixed(3), 'feet', F.feet.toFixed(2));
  for (let dz = 0.6; dz >= -0.21; dz -= 0.1) { const row = []; for (let dx = -0.8; dx <= 0.41; dx += 0.1) { const fl = b.keepCellAt(C.x + dx, C.z + dz, S); row.push(fl ? fl.filter((v, k) => k % 3 === 0).map((v) => v.toFixed(1)).join('/') : '-'); } log(dz.toFixed(1).padStart(5), row.map((q) => q.padEnd(7)).join('')); }
  const x0 = F.pre.x, z0 = F.pre.z;
  for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2, x = x0 + Math.sin(an) * 0.07, z = z0 + Math.cos(an) * 0.07, st = b.keepFloorAt(x, z, F.feet, F.up, S);
    log(String(Math.round(an * 57.3)).padStart(4) + '°', 'floor', st ? st.f.toFixed(2) : 'null', 'next', !!F.nextTo(st, x, z), 'hits', F.hits(x0, z0, x, z), 'legal', !!F.legal(x, z), 'wallNear', !!b.keepWallNear(x, z, 0.26, F.feet + 0.66, F.feet + 1.75, S)); }
}

// what the island walk costs a frame pushing into the jetty's side, against walking along the boards
export async function isleEdgeCost({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const ez = (z) => z - 100, C = b.camera.position;
  const run = (x, z, tx, tz) => { C.set(x, 2.11, ez(z)); b.camBaseY = 2.11; b.groundY = 0.41; b.isleSetLast(x, ez(z), 0.41); w.__adv(5); b.keys.KeyW = true; const ts = [];
    for (let i = 0; i < 200; i++) { b.lookAt(tx, C.y, ez(tz)); const t = performance.now(); b.step(1 / 60); ts.push(performance.now() - t); } b.keys.KeyW = false; ts.sort((a, c) => a - c); return 'median ' + ts[100].toFixed(2) + ' ms, p95 ' + ts[190].toFixed(2) + ' ms'; };
  log('along the boards:', run(-24, -1158, -24, -1100));
  log('into the side, square:', run(-26.0, -1150, -40, -1150));
  log('into the side, slanting:', run(-26.0, -1150, -40, -1140));
  log('into the rim post:', run(-22.3, -1150.5, -22.0, -1141));
}

// IN THROUGH THE GATE (2026-10-19, the owner: "i see them clip in when entering the castle they should already be there
// fighting"): a game booted the ordinary way, stood outside the gate while the castle loads, then the gate's own cut.
// From the frame the black starts to lift: every change in who is drawn (the dark knight, his three, the other farmers),
// and stills as it lifts.
export async function fortEntry({ w, b, log, sleep, shot }) {
  for (let k = 0; k < 300 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(30); }
  b.settings.devMode = false;
  b.loadFort();
  for (let i = 0; i < 120 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.frame(1); await sleep(250); }
  b.skipTakes(); b.placeOutOfFort('gate'); b.look(0, 0);
  const wait = +(w.__feWait || 8);
  for (let i = 0; i < wait * 10; i++) { b.frame(1); await sleep(100); }
  const u = b.dkS().u, rd = () => ({ model: !!u.model, mixer: !!u.mixer, pend: u.clipsPending || 0, nat: !!u.natDone, comp: !!(u.texW && u.texW.compiled) });
  log('before the gate, waited', wait, 's: dark knight', JSON.stringify(rd()), 'stage', b.dkS().dk.stage);
  w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
  b.skipTakes(); log('gate guards: frozen', b.frozen(), JSON.stringify(b.frozenWhy()).slice(0, 120), 'ready', b.fortRdy(), 'state', JSON.stringify(b.state()).slice(0, 200));
  b.startFort(1);
  const blk = () => +(w.document.getElementById('blackout').style.opacity || 0);
  const vis = (f) => { let o = f.g, v = true; while (o) { if (!o.visible) v = false; o = o.parent; } return v && (!f.model || f.model.visible) && !!f.model; };
  let prev = '', lifted = -1, shots = 0;
  for (let i = 0; i < 60 * 6; i++) {
    w.__adv(1);
    const B = blk(); if (lifted < 0 && b.roomFlags().inFort && B < 0.999 && i > 10) lifted = i;
    const s = b.dkS(), F = b.farmUnitsS();
    const vic = s.dk.victims.filter(vis).length, others = F.filter((f) => !s.dk.victims.includes(f) && vis(f)).length;
    const cur = `stage ${s.dk.stage} knight ${vis(u) ? 'drawn' : 'not'} victims ${vic}/${s.dk.victims.length} others ${others} ready ${JSON.stringify(rd())}`;
    if (cur !== prev) { log('frame', i, 'black', B.toFixed(2), cur); prev = cur; }
    for (const f of F) if (!s.dk.victims.includes(f) && vis(f) && !f.__seen) { f.__seen = true; const C = b.camera; const p = f.g.position.clone().project(C); log('  farmer drawn at', f.g.position.x.toFixed(1), f.g.position.z.toFixed(1), 'd', Math.hypot(f.g.position.x - C.position.x, f.g.position.z - C.position.z).toFixed(1), 'on screen', Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1, 'burst', !!f.farm.burst, 'door', f.farm.door !== undefined ? f.farm.door : '-'); }
    if (lifted >= 0 && (i === lifted || i === lifted + 15 || i === lifted + 45) && shots < 3) { shots++; shot('fe_' + shots, 480, 1.4); }
  }
  log('lifted at frame', lifted);
}
export async function fortEntryCold(ctx) { ctx.w.__feWait = 0.5; return fortEntry(ctx); }

// A CHECKPOINT LOAD IN THE FIRST CASTLE: in through the gate (its autosave), then the death's reload; from the reload,
// when the black lifts and when the dark knight and his three are drawn
export async function fortEntryRestore({ w, b, log, sleep, shot }) {
  for (let k = 0; k < 300 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(30); }
  b.settings.devMode = false; b.loadFort();
  for (let i = 0; i < 120 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.frame(1); await sleep(250); }
  b.skipTakes(); b.placeOutOfFort('gate'); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(100); }
  b.skipTakes(); b.startFort(1); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(60); }
  log('in', b.roomFlags().inFort, 'save room', b.devRoom());
  const f = document.querySelector('iframe');
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
  f.contentWindow.location.reload(); await sleep(1500);
  let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.dkS) break; } catch (e) {} }
  const B = w2.__bw, t0 = performance.now(); let prev = '', lifted = -1;
  const vis = (q) => { let o = q.g, v = true; while (o) { if (!o.visible) v = false; o = o.parent; } return v && !!q.model && q.model.visible; };
  for (let i = 0; i < 400; i++) {
    await sleep(50);
    const s = B.dkS(), u = s.u, bl = +(w2.document.getElementById('blackout').style.opacity || 0);
    if (lifted < 0 && bl < 0.999 && B.roomFlags().inFort && !B.frozen()) { lifted = i; log('black lifting at', Math.round(performance.now() - t0), 'ms'); }
    const cur = `stage ${s.dk.stage} knight ${u && vis(u) ? 'drawn' : 'not'} victims ${s.dk.victims.filter(vis).length}/${s.dk.victims.length} inFort ${B.roomFlags().inFort} black ${bl < 0.999 ? (bl > 0.001 ? 'lifting' : 'off') : 'on'}`;
    if (cur !== prev) { log(Math.round(performance.now() - t0), 'ms', cur); prev = cur; }
    if (lifted >= 0 && i - lifted > 80) break;
  }
}

// COLLATERALS (2026-10-19, the owner: "make bullets travel through enemies making collaterals possible"): four pale ones
// in a file down the beach, asleep, and one round from the revolver down the line at the chest; then four more and one
// shell from the sawn-off. Logs each one's health after.
export async function collateral({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  for (let k = 0; k < 300 && !b.state().introDone; k++) { b.frame(3); await sleep(30); }
  b.skipTakes(); b.settings.devMode = false;
  const C = b.camera.position, X = 8, Z0 = -60;
  const line = async (n, gap) => {
    const us = []; for (let i = 0; i < n; i++) us.push(b.mutSpawnTest(X, Z0 - 6 - i * gap, 'pale', 0));
    for (let i = 0; i < 200 && us.some((u) => !u.model); i++) { b.frame(1); await sleep(50); }
    for (const u of us) { u.st.awake = false; u.g.visible = true; u.g.rotation.y = 0; }
    return us;
  };
  w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
  const aim = () => { C.set(X, 1.7, Z0); b.camBaseY = 1.7; b.lookAt(X, 1.2, Z0 - 20); };
  for (const gun of (w.__colKill ? ['magnum'] : ['magnum', 'shotgun'])) {
    const it = gun === 'magnum' ? b.magnumItem : b.shotgunItem;
    if (!b.inventory.includes(it)) b.addToInventory(it);
    if (b.equippedS() !== it) b.toggleEquip(it);
    const us = await line(4, gun === 'magnum' ? 1.6 : 1.2);
    for (let i = 0; i < 150; i++) { aim(); for (const u of us) { u.st.awake = false; u.st.atk = -1; } w.__adv(1); }
    b.loadGunsTest(); b.magAim = 1; aim(); w.__adv(1);
    if (w.__colKill) for (const u of us) u.st.hp = 9;
    const hp0 = us.map((u) => u.st.hp);
    if (gun === 'magnum') b.magFire(); else b.sgFire();
    for (let i = 0; i < 30; i++) w.__adv(1);
    log(gun, 'hp before', hp0.join(','), 'after', us.map((u) => (u.st.alive ? u.st.hp : 'dead')).join(','), 'ammo', JSON.stringify(b.magAmmoS()));
    for (const u of us) { u.st.alive && (u.st.hp = 0); u.g.visible = false; u.g.position.x += 200; }
  }
}

export async function collateralKill(ctx) { ctx.w.__colKill = true; return collateral(ctx); }

// EVERY WEAPON AFTER A CHECKPOINT LOAD (2026-10-19, the owner again: "i loaded a checkpoint and my weapons were
// invisible"): the pack filled, the katana in hand, a save; then a death's reload with Restart clicked AT ONCE (the early
// click); from the moment the game is in, the held thing's pixels, then each weapon in turn taken into the hand
export async function vmAll({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  for (let k = 0; k < 300 && !b.state().introDone; k++) { b.frame(3); await sleep(30); }
  b.skipTakes();
  const names = ['katanaItem', 'shotgunItem', 'magnumItem', 'militaryItem', 'shovelItem', 'pegItem', 'fishingRodItem', 'screwdriverItem', 'syringeItem', 'glowstickItem'];
  for (const n of names) { const it = b[n]; try { if (it && !b.inventory.includes(it)) b.addToInventory(it); } catch (e) { log('add failed', n, e.message); } }
  await sleep(3000);
  const first = b[w.__vmFirst || 'katanaItem'];
  if (b.equippedS() !== first) b.toggleEquip(first);
  if (w.__vmRoom === 'fort') { b.loadFort(); for (let i = 0; i < 120 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.frame(1); await sleep(250); } b.placeInFort(); await sleep(3000); }
  else b.camera.position.set(8, 1.7, -60);
  await sleep(500); b.saveCheckpoint();
  log('saved holding', b.equippedS() && b.equippedS().name, 'pack', b.inventory.map((i) => i.name).join('|'));
  const f = document.querySelector('iframe');
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
  f.contentWindow.location.reload(); await sleep(300);
  let clicked = false, w2 = null;
  for (let i = 0; i < 400; i++) { await sleep(50); try { w2 = f.contentWindow; const btn = w2.document.querySelector('.dc-restart'); if (btn && !clicked) { btn.click(); clicked = true; } if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
  const B = w2.__bw;
  for (let i = 0; i < 400 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
  const R = B.renderer, gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const grab = () => { B.frame(1); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const diff = (a2, b2) => { let n = 0; for (let k = 0; k < a2.length; k += 4) if (Math.abs(a2[k] - b2[k]) + Math.abs(a2[k + 1] - b2[k + 1]) + Math.abs(a2[k + 2] - b2[k + 2]) > 30) n++; return n; };
  // drawn with the hands' pass and without it (the rig hidden for one frame)
  const measure = () => { const v = B.viewmodelS(); const on = grab(); const vv = v.visible; v.visible = false; const off = grab(); v.visible = vv; return diff(on, off); };
  const E0 = B.equippedS();
  log('in: holding', E0 && E0.name, 'pixels', measure());
  for (const n of names) {
    const it = B[n]; if (!it || !B.inventory.includes(it) || !it.viewmodel) continue;
    if (B.equippedS() !== it) B.toggleEquip(it);
    let px = 0; for (let t = 0; t < 12 && (px = measure()) < 200; t++) await sleep(250);
    const vm = it.viewmodel; let meshes = 0; vm.traverse((o) => { if (o.isMesh) meshes++; });
    // the thing itself: drawn, then its own held copy hidden (a gun's own rig is not in the copy: `it.vmRig` if it has one)
    let own = -1; if (meshes) { const on = grab(); vm.visible = false; const off = grab(); vm.visible = true; own = diff(on, off); }
    log(n, 'pixels', px, 'its own', own, 'meshes in its held copy', meshes, 'build pending', !!vm.userData.build);
  }
}
export async function vmAllFort(ctx) { ctx.w.__vmRoom = 'fort'; return vmAll(ctx); }
export async function vmAllGun(ctx) { ctx.w.__vmFirst = 'shotgunItem'; ctx.w.__vmRoom = 'fort'; return vmAll(ctx); }

// THE DARK KNIGHT AGAINST A HELD GUARD (2026-10-19, the owner: "the dark knight has a swing where i see no white air
// effect following the sword and cant block it"): the katana up and the guard held the whole time, you standing; every
// hit that still costs health, with the swing, the swing's clock against its contacts, and whether his trail was drawn
export async function dkBlock({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem);
  if (b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem);
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, home = [P.x + Math.sin(u.g.rotation.y) * 3, P.z + Math.cos(u.g.rotation.y) * 3];
  let hp0 = b.state().hp, hurts = 0, swings = {}, lastSw = null, lastAtk = -1;
  const guard = w.__dkNoGuard ? false : true;
  for (let f = 0; f < 60 * 60; f++) {
    // you step back out to a range now and then (3, 6, 4.5, 8 m, six seconds each), so the gap-closers come too
    if (f % 360 === 0) { const R = [3, 6, 4.5, 8][(f / 360) % 4], dx = C.x - P.x, dz = C.z - P.z, L = Math.hypot(dx, dz) || 1; home[0] = P.x + dx / L * R; home[1] = P.z + dz / L * R; }
    b.lookAt(P.x, C.y - 0.2, P.z); b.testGuard(guard); w.__adv(1); C.x = home[0]; C.z = home[1];
    for (const g of b.farmUnitsS()) g.st.awake = false;
    if (u.st.atk >= 0 && (lastSw !== u.st.swing || u.st.atk < lastAtk)) swings[u.st.swing] = (swings[u.st.swing] || 0) + 1;
    lastSw = u.st.atk >= 0 ? u.st.swing : null; lastAtk = u.st.atk;
    const hp = b.state().hp;
    if (hp < hp0) {
      hurts++;
      const A = u.atk && u.st.swing ? u.atk[u.st.swing] : null;
      log('HURT', 'swing', u.st.swing, 'atk', u.st.atk.toFixed(2), 'wind', A ? A.wind.toFixed(2) : '-', 'more', A && A.moreT ? A.moreT.map((x) => x.toFixed(2)).join('/') : '-',
        'd', Math.hypot(P.x - C.x, P.z - C.z).toFixed(2), 'trail', !!(u.swTrail && u.swTrail.m.visible), 'blocking', b.blocking, 'foe', !!u.st.foe, 'alive', u.st.alive);
    }
    b.heal(); hp0 = b.state().hp;
  }
  log('swings', JSON.stringify(swings), 'hurts through the guard', hurts);
}
export async function dkOpen(ctx) { ctx.w.__dkNoGuard = true; return dkBlock(ctx); }

// THE DARK KNIGHT'S LEAP, MEASURED (2026-10-19, the owner: "the dark knight jump move he slides towards you then hits
// you … make his jump move hit right where he lands and when he actually swing"): the leap forced from 7 m; each frame
// the swing's clock, both feet's height over the paving, the pelvis's, and how far he has come
export async function dkLeapMeasure({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position;
  const R = +(w.__leapR || 7);
  const place = () => { const a = u.g.rotation.y; C.x = P.x + Math.sin(a) * R; C.z = P.z + Math.cos(a) * R; };
  place(); for (let i = 0; i < 40; i++) { b.lookAt(P.x, C.y - 0.2, P.z); u.st.atk = -1; u.st.cool = 1; w.__adv(1); place(); b.heal(); }
  const home = [C.x, C.z], A = u.atk.dkLeap;
  log('dkLeap wind', A.wind.toFixed(3), 'strike', A.strike, 'recover', A.recover.toFixed(3), 'lunge', A.lunge.toFixed(2), 'air', A.air, 'stop', A.stop);
  u.st.swing = 'dkLeap'; u.st.atk = 0; u.st.cool = 0;
  const V = P.constructor, fl = new V(), fr = new V(), pe = new V();
  const bone = (n) => u.model.getObjectByName(n);
  const bl = bone('b_MF_Foot_L'), br = bone('b_MF_Foot_R'), bp = bone('b_MF_Pelvis');
  const x0 = P.x, z0 = P.z, rows = [];
  for (let i = 0; i < 160 && u.st.swing === 'dkLeap' && u.st.atk >= 0; i++) {
    b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal();
    u.model.updateMatrixWorld(true); bl.getWorldPosition(fl); br.getWorldPosition(fr); bp.getWorldPosition(pe);
    const tp = u.bones.tip.getWorldPosition(new V()), cl = u.cur, fr2 = cl ? cl.time / cl.getClip().duration : -1;
    const fwd = (tp.x - P.x) * Math.sin(u.g.rotation.y) + (tp.z - P.z) * Math.cos(u.g.rotation.y);
    if (i % 2 === 0) rows.push(`${u.st.atk.toFixed(2)}[${fr2.toFixed(3)}]:ft ${(Math.min(fl.y, fr.y) - P.y).toFixed(2)} tip ${(tp.y - P.y).toFixed(2)}/${fwd.toFixed(2)} mv ${Math.hypot(P.x - x0, P.z - z0).toFixed(2)}`);
  }
  for (let k = 0; k < rows.length; k += 5) log(rows.slice(k, k + 5).join('  '));
}

// HOW MUCH HE SKATES (2026-10-19, the owner: "the dark knight is sliding around a lot"): forty seconds of him on you at
// 3, 6, 4.5 and 8 m; each frame the lower foot, if it is planted (within 6 cm of its lowest), and how fast it moves over
// the paving — a planted foot should not move at all. Split by what he is doing.
export async function dkSkate({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, home = [P.x + Math.sin(u.g.rotation.y) * 3, P.z + Math.cos(u.g.rotation.y) * 3];
  const V = P.constructor, fl = new V(), fr = new V(), pl = new V(), pr = new V();
  const bl = u.model.getObjectByName('b_MF_Foot_L'), br = u.model.getObjectByName('b_MF_Foot_R');
  const S = {}; let first = true, bodyMv = 0;
  const px0 = { x: P.x, z: P.z };
  for (let f = 0; f < 60 * 40; f++) {
    if (f % 360 === 0) { const R = [3, 6, 4.5, 8][(f / 360) % 4], dx = C.x - P.x, dz = C.z - P.z, L = Math.hypot(dx, dz) || 1; home[0] = P.x + dx / L * R; home[1] = P.z + dz / L * R; }
    b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal();
    for (const g of b.farmUnitsS()) g.st.awake = false;
    u.model.updateMatrixWorld(true); bl.getWorldPosition(fl); br.getWorldPosition(fr);
    if (!first) {
      const low = fl.y < fr.y ? [fl, pl] : [fr, pr], hy = low[0].y - P.y;
      const sp = Math.hypot(low[0].x - low[1].x, low[0].z - low[1].z) * 60, vy = Math.abs(low[0].y - low[1].y) * 60;
      const bm = Math.hypot(P.x - px0.x, P.z - px0.z) * 60;
      const k = u.st.atk >= 0 ? 'swing ' + u.st.swing : bm > 0.2 ? 'moving' : 'standing';
      const kk = u.st.atk >= 0 ? 'swing (all)' : k;
      if (k === 'moving' && (w.__mvLog = (w.__mvLog || 0) + 1) % 25 === 1) { const c = u.cur; log('moving: clip', c ? c.getClip().name : '-', 'ts', c ? c.timeScale.toFixed(2) : '-', 'w', c ? c.getEffectiveWeight().toFixed(2) : '-', 'body', bm.toFixed(2), 'foot', sp.toFixed(2), 'vg', u._vgMode, 'clipSpeed', c && u.clipSpeed ? (u.clipSpeed[c.getClip().name] || 0).toFixed(2) : '-'); }
      if (k === 'standing' && (w.__stLog = (w.__stLog || 0) + 1) % 8 === 1) { const c = u.cur; log('standing: clip', c ? c.getClip().name : '-', 'yaw rate', ((u.g.rotation.y - (w.__py || 0)) * 60).toFixed(2), 'model yaw', u.model.rotation.y.toFixed(2), 'foot', sp.toFixed(2)); }
      w.__py = u.g.rotation.y;
      if (hy < (w.__skH || 0.345) && vy < 0.4) for (const key of [k, kk === k ? null : kk, 'ALL'].filter(Boolean)) { const s = S[key] || (S[key] = { n: 0, sum: 0, bad: 0, body: 0 }); s.n++; s.sum += sp; if (sp > 0.6) s.bad++; s.body += bm; }
    }
    first = false; pl.copy(fl); pr.copy(fr); px0.x = P.x; px0.z = P.z;
  }
  for (const [k, s] of Object.entries(S).sort((a, c) => c[1].n - a[1].n)) log(k.padEnd(16), 'frames', String(s.n).padStart(5), 'planted foot speed', (s.sum / s.n).toFixed(2), 'm/s; skating (>0.6)', Math.round(100 * s.bad / s.n) + '%', 'body', (s.body / s.n).toFixed(2), 'm/s');
}

// what the dark knight's clips carry of their own travel (`u.clipTravel`): each attack's total forward/side step, and the
// leap's along its length
export async function dkTravel({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/fortboot.js');
  log('boot', JSON.stringify(await w.__fortBoot()));
  const u = b.dkS().u, T = u.clipTravel || {};
  log('clips with travel', Object.keys(T).length, 'of', Object.keys(u.clips || {}).length);
  for (const k of Object.keys(u.atk || {})) { if (!/^dk/.test(k)) continue; const A = u.atk[k], c = A.clip, tr = T[c] || T[k]; const e = tr && tr[tr.length - 1];
    log(k.padEnd(8), 'clip', c, 'travel', tr ? `fwd ${e[1].toFixed(2)} side ${e[0].toFixed(2)} (${tr.length} samples)` : 'none', 'own clip key travel', T[k] ? 'yes' : 'no'); }
  for (const g of ['sWalk', 'sRun', 'sRunB', 'sStr1', 'sStr2', 'sWalkB']) { const tr = T[g]; const e = tr && tr[tr.length - 1]; log(g, tr ? `fwd ${e[1].toFixed(2)} side ${e[0].toFixed(2)}` : 'none', 'clipSpeed', u.clipSpeed && u.clipSpeed[g]); }
  for (const c of ['sAtk', 'sAtkC', 'sAtkB', 'sSlashD']) { const tr = T[c]; if (tr) log(c, 'side/fwd along:', tr.filter((_, i) => i % Math.max(1, Math.floor(tr.length / 16)) === 0).map((v) => v[0].toFixed(2) + '/' + v[1].toFixed(2)).join(' ')); }
}

// THE CLIFF IN THE JETTY'S BOX (2026-10-19, the owner's screenshot: feet 9.85 at x −19.53, z −1148.40, stuck under the
// landing beside the stair's head — "i fell off the first part of the lighthouse dock where the 2 seagulls sit"). Every
// floor in `isleJettyBox` over 1.5 m that is not the flight, the landing (≥ 15.3) or the boards: a body stood on it walks
// out eight ways with jumps; a trap is one that never gets back onto the flight, the landing or the boards. With
// `w.__boxReach`, it also asks which of them the walk lets you DROP onto from the landing and the flight's edges.
export async function isleBoxTraps({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); w.__clockOn(); w.__adv(30);
  const S = b.ISLE_SITE, ez = (z) => z - 100, C = b.camera.position;
  const boards = (x, z) => (x > -27.2 && x < -21.3 && z > ez(-1161.8) && z < ez(-1139)) || (x > -27.2 && x < -12.5 && z > ez(-1140.2) && z < ez(-1135));
  const path = (x, z, g) => b.isleRampAt(x, z) !== null || (boards(x, z) && g < 1.5) || g >= 15.3;
  { const fl = b.keepCellAt(-19.53, ez(-1148.40), S); log('the owner\'s spot: floors', fl ? fl.filter((v, k) => k % 3 === 0).map((v) => v.toFixed(2)).join('/') : 'none'); }
  const traps = []; let tried = 0;
  for (let z = ez(-1162); z <= ez(-1135.5); z += 0.5) for (let x = -27.5; x <= -13; x += 0.5) {
    const fl = b.keepCellAt(x, z, S); if (!fl) continue;
    for (let k = 0; k < fl.length; k += 3) {
      const f = fl[k]; if (f <= 1.5 || f >= 15.3 || b.isleRampAt(x, z) !== null) continue;
      tried++;
      let out = false, stood = false;
      for (let a = 0; a < 8 && !out; a++) {
        C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.groundY = f; b.isleSetLast(x, z, f); w.__adv(3);
        if (Math.abs(b.isleS().groundY - f) > 0.4 || Math.hypot(C.x - x, C.z - z) > 0.4) break;
        stood = true;
        const an = a / 8 * Math.PI * 2; b.keys.KeyW = true;
        for (let i = 0; i < 110 && !out; i++) { b.lookAt(C.x + Math.sin(an) * 5, C.y, C.z + Math.cos(an) * 5); w.__adv(1); if (i % 25 === 20) { b.keys.Space = true; w.__adv(1); b.keys.Space = false; } if (b.state().onGround && path(C.x, C.z, b.isleS().groundY)) out = true; }
        b.keys.KeyW = false; w.__adv(3);
      }
      if (stood && !out) traps.push(`${x.toFixed(1)},${(z + 100).toFixed(1)} f ${f.toFixed(2)}`);
    }
  }
  log('floors tried', tried, 'traps', traps.length); for (let i = 0; i < traps.length; i += 6) log(traps.slice(i, i + 6).join(' | '));
  // and from the paths: walk off every edge of the landing and the flight, eight ways, and see where you end up
  const land = []; let walks = 0;
  for (let z = ez(-1150.5); z <= ez(-1137); z += 0.5) for (let x = -19.0; x <= -14.0; x += 0.5) {
    const fl = b.keepCellAt(x, z, S); if (!fl) continue; const f = fl[fl.length - 3];
    if (!(b.isleRampAt(x, z) !== null || f >= 15.3)) continue;
    for (let a = 0; a < 8; a++) {
      C.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.groundY = f; b.isleSetLast(x, z, f); w.__adv(3);
      if (Math.hypot(C.x - x, C.z - z) > 0.4) break;
      walks++; const an = a / 8 * Math.PI * 2; b.keys.KeyW = true;
      for (let i = 0; i < 60; i++) { b.lookAt(C.x + Math.sin(an) * 5, C.y, C.z + Math.cos(an) * 5); w.__adv(1); if (i === 10) { b.keys.Space = true; w.__adv(1); b.keys.Space = false; } }
      b.keys.KeyW = false; w.__adv(40);
      const g = b.isleS().groundY;
      if (!path(C.x, C.z, g) && b.state().onGround) land.push(`${x.toFixed(1)},${(z + 100).toFixed(1)} → ${C.x.toFixed(1)},${(C.z + 100).toFixed(1)} f ${g.toFixed(2)}`);
    }
  }
  log('walks off the landing and the flight', walks, 'ended off the paths', land.length); for (const s of land.slice(0, 30)) log(s);
}

// THE TOWN ON HIM (2026-10-19, the owner: "make the farmers also attack the dark knight"): he has turned on you, you
// stand ten metres off, the farmers' fight runs as it does; every two seconds how many are on him, his health and whom
// he is on, and at the end the men he threw and the hurts you took
export async function dkTown({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position;
  const away = () => { const dx = C.x - P.x, dz = C.z - P.z, L = Math.hypot(dx, dz) || 1; return [P.x + dx / L * 10, P.z + dz / L * 10]; };
  let home = away(), hurts = 0, hp0 = b.state().hp, thrown = 0, onHimMax = 0;
  const seen = new Set();
  for (let f = 0; f < 60 * 40; f++) {
    if (f % 240 === 0) home = away();
    b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = home[0]; C.z = home[1];
    if (b.state().hp < hp0) hurts++; b.heal(); hp0 = b.state().hp;
    const F = b.farmUnitsS(), on = F.filter((q) => q.st.alive && q.st.foe === u).length; onHimMax = Math.max(onHimMax, on);
    for (const q of F) if (!q.st.alive && q.st.killFling && !seen.has(q)) { seen.add(q); thrown++; }
    if (f % 120 === 0) log('t', (f / 60).toFixed(0), 'on him', on, 'out', F.filter((q) => q.st.alive && q.farm && q.farm.out && !q.farm.burst).length, 'his hp', u.st.hp, 'he is on', u.st.foe ? 'a farmer' : 'you', 'd you', Math.hypot(P.x - C.x, P.z - C.z).toFixed(1), 'swing', u.st.atk >= 0 ? u.st.swing : '-');
  }
  log('most on him at once', onHimMax, 'farmers he threw', thrown, 'your hurts', hurts, 'his hp', u.st.hp, '/', u.kind.hp);
}

// EVERY SWING OF HIS, AT EVERY STAND-OFF, WITH THE ARM'S BEND (2026-10-19, the owner: "make the dark knights connectivity
// way more tight hes all over the place and his arm is moving weird on some swings"): as `dkStopSweep`, with the kind's
// `aimK` set from `w.__aimK` and, for each throw, the most the aim bent his shoulder off the clip (degrees)
export async function dkAimSweep({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  if (w.__aimK != null) u.kind.aimK = +w.__aimK;
  log('aimK', u.kind.aimK);
  const C = b.camera.position, P = u.g.position;
  const keys = (w.__dkKeys || Object.keys(u.kind.use)).filter((k) => u.atk[k]);
  const stops = w.__stops || [1.6, 1.9, 2.2, 2.5, 2.8, 3.1, 3.4];
  for (const k of keys) {
    const A = u.atk[k], out = [], st0 = A.stop;
    for (const S of stops) {
      A.stop = S;
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
      const yaw = u.g.rotation.y, home = [P.x + Math.sin(yaw) * (S + 0.3), P.z + Math.cos(yaw) * (S + 0.3)];
      for (let i = 0; i < 15; i++) { C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
      u.st.forceSwing = k; u.st.cool = 0; u.aimProbe = { max: 0 };
      let started = false, h0 = u.hitAt || 0; const hits = [];
      for (let i = 0; i < 600; i++) {
        C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); for (const g of b.farmUnitsS()) g.st.awake = false;
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (u.hitAt && u.hitAt !== h0) { h0 = u.hitAt; const q = u.hitPt.clone().project(b.camera); hits.push(q.x.toFixed(2) + ',' + q.y.toFixed(2)); }
        b.heal();
      }
      out.push(S + ':' + (hits.length ? hits.join('+') : (started ? 'miss' : 'never')) + '/' + Math.round(u.aimProbe.max * 57.3) + '°');
      u.aimProbe = null;
    }
    A.stop = st0;
    log(k.padEnd(8), out.join('  '));
  }
}
export async function dkAimSweep1(ctx) { ctx.w.__aimK = 1.0; return dkAimSweep(ctx); }
export async function dkAimSweep26(ctx) { ctx.w.__aimK = 2.6; return dkAimSweep(ctx); }

export async function dkAimSweep03(ctx) { ctx.w.__aimK = 0.3; return dkAimSweep(ctx); }
export async function dkAimSweep0(ctx) { ctx.w.__aimK = 0.01; return dkAimSweep(ctx); }

export async function dkAimSweepK(ctx) { ctx.w.__stops = [1.4, 1.7, 2.0, 2.3, 2.6, 2.9, 3.2]; return dkAimSweep(ctx); }

// EVERY SWING OF HIS, SEEN FROM THE SIDE: thrown at its own stand-off against you, a still three quarters of the way
// through its wind-up and one at its contact, from a camera off his sword side (you are at the right of the frame)
export async function dkPoseSheet({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera, P = u.g.position, V = P.constructor;
  const keys = Object.keys(u.kind.use).filter((k) => u.atk[k]);
  let n = 0;
  for (const k of keys) {
    const A = u.atk[k];
    for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
    const S = A.stop, yaw = u.g.rotation.y, home = [P.x + Math.sin(yaw) * (S + 0.3), P.z + Math.cos(yaw) * (S + 0.3)];
    for (let i = 0; i < 15; i++) { C.position.set(home[0], C.position.y, home[1]); b.lookAt(P.x, C.position.y - 0.15, P.z); w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
    u.st.forceSwing = k; u.st.cool = 0;
    let started = false, shotW = false, shotC = false;
    // drawn in the harness's studio (`knStudio`): him alone, lit, a camera off his side; a red post where you stand
    const ST = b.knStudio(), cam = w.__psCam || (w.__psCam = new C.constructor(40, 1.4, 0.1, 100));
    const post = w.__psPost || (w.__psPost = (() => { const T = P.constructor; const g = new (b.scene.constructor)(); return null; })());
    const side = () => {
      const sc = ST.scene(u); if (u.model) u.model.visible = true;
      const yw = u.g.rotation.y, fx = Math.sin(yw), fz = Math.cos(yw), rx = Math.cos(yw), rz = -Math.sin(yw);
      cam.position.set(P.x + fx * 1.5 + rx * 6.5, P.y + 2.0, P.z + fz * 1.5 + rz * 6.5); cam.lookAt(P.x + fx * 1.5, P.y + 1.4, P.z + fz * 1.5); cam.updateMatrixWorld(true);
      b.renderer.render(sc, cam);
      const src = b.renderer.domElement, cv = document.createElement('canvas'); cv.width = 300; cv.height = Math.round(300 * src.height / src.width); cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
      ST.done(u); return cv; };
    const emit = (name, cv) => { const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], m = Math.ceil(d.length / 8000); for (let j = 0; j < m; j++) console.log('[PBIMG]', name, j + '/' + m, d.slice(j * 8000, (j + 1) * 8000)); };
    for (let i = 0; i < 600; i++) {
      C.position.set(home[0], C.position.y, home[1]); b.lookAt(P.x, C.position.y - 0.15, P.z); w.__adv(1); for (const g of b.farmUnitsS()) g.st.awake = false; b.heal();
      const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
      if (live && !shotW && u.st.atk >= A.wind * 0.75) { shotW = true; emit('ps_' + String(++n).padStart(2, '0') + '_' + k + '_w', side()); }
      if (live && !shotC && u.st.atk >= A.wind + 0.03) { shotC = true; emit('ps_' + String(++n).padStart(2, '0') + '_' + k + '_c', side()); }
    }
    log(k, 'stills', shotW, shotC);
  }
}

// HOW HE CONDUCTS HIMSELF (2026-10-19, round 3: "hes all over the place"): forty seconds of him on you at 3, 6, 4.5 and 8 m;
// the share of time in each gait (by `velGait`'s own mode) and swinging, swings a minute, flips between closing and backing
// off a minute, and how far from you he keeps between blows
export async function dkBehave({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, home = [0, 0];
  const cnt = {}; let swings = 0, lastSw = null, lastAtk = -1, flips = 0, lastDir = 0, dsum = 0, dn = 0;
  const N = 60 * 40;
  for (let f = 0; f < N; f++) {
    if (f % 360 === 0) { const R = [3, 6, 4.5, 8][(f / 360) % 4], dx = C.x - P.x, dz = C.z - P.z, L = Math.hypot(dx, dz) || 1; home[0] = P.x + dx / L * R; home[1] = P.z + dz / L * R; }
    b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal();
    for (const g of b.farmUnitsS()) g.st.awake = false;
    const k = u.st.atk >= 0 ? 'swinging' : (u._vgMode || '?');
    cnt[k] = (cnt[k] || 0) + 1;
    if (u.st.atk >= 0 && (lastSw !== u.st.swing || u.st.atk < lastAtk)) swings++;
    lastSw = u.st.atk >= 0 ? u.st.swing : null; lastAtk = u.st.atk;
    if (u.st.atk < 0) { const dir = u._vgMode === 'fwd' ? 1 : u._vgMode === 'back' ? -1 : 0; if (dir && lastDir && dir !== lastDir) flips++; if (dir) lastDir = dir; dsum += Math.hypot(P.x - C.x, P.z - C.z); dn++; }
  }
  log('time share', Object.entries(cnt).map(([k, v]) => k + ' ' + Math.round(100 * v / N) + '%').join(', '));
  log('swings a minute', (swings * 1.5).toFixed(0), 'close/back flips a minute', (flips * 1.5).toFixed(0), 'mean distance between blows', (dsum / Math.max(1, dn)).toFixed(2));
}

// UP CLOSE (2026-10-19, the owner: "some of the dark nights hits don even land when he swings close to the player"): each
// swing at its OWN stand-off, but you standing 1.2 / 1.6 / 2.0 / 2.4 m from him (he may step back through the wind, as he
// does); landed or missed, where, and how far he was at the contact
export async function dkClose({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position;
  const keys = Object.keys(u.kind.use).filter((k) => u.atk[k]);
  let land = 0, tot = 0;
  for (const k of keys) {
    const out = [];
    for (const D of [1.2, 1.6, 2.0, 2.4]) {
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
      const yaw = u.g.rotation.y, home = [P.x + Math.sin(yaw) * D, P.z + Math.cos(yaw) * D];
      for (let i = 0; i < 15; i++) { C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
      u.st.forceSwing = k; u.st.cool = 0;
      let started = false, h0 = u.hitAt || 0, hp0 = b.state().hp, hurt = 0, dAt = -1; const hits = [];
      for (let i = 0; i < 600; i++) {
        C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); for (const g of b.farmUnitsS()) g.st.awake = false;
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (live && dAt < 0 && u.st.atk >= u.atk[k].wind) dAt = Math.hypot(P.x - C.x, P.z - C.z);
        if (u.hitAt && u.hitAt !== h0) { h0 = u.hitAt; const q = u.hitPt.clone().project(b.camera); hits.push(q.x.toFixed(2) + ',' + q.y.toFixed(2)); }
        if (b.state().hp < hp0) hurt++; b.heal(); hp0 = b.state().hp;
      }
      tot++; if (hits.length) land++;
      out.push(D + (hits.length ? ':' + hits.join('+') : ':MISS') + '@' + dAt.toFixed(1));
    }
    log(k.padEnd(8), out.join('  '));
  }
  log('landed', land, 'of', tot);
}

export async function dkFightClose(ctx) { ctx.w.__fightR = 1.6; return dkFight(ctx); }
// (2026-10-29) the dark knight against a player who moves — strafing, backing off, wandering, dodging late: `tools/dkmove.js`
export async function dkMove(ctx) { return (await import('/tools/dkmove.js?' + Date.now())).dkMove(ctx); }
// (any other scenario of that file: `sh tools/probe.sh 'dkx&f=<name>'`)
export async function dkx(ctx) { return (await import('/tools/dkmove.js?' + Date.now()))[new URLSearchParams(location.search).get('f')](ctx); }

// THE SAMURAI'S SCORE AGAINST EVERYTHING ELSE AT THE SPEAKERS (2026-10-21, the owner: "my music isnt playing at the
// samurai"): a fresh game in a silent frame, the dojo, the sword taken; every half second for twelve seconds the peak
// of each thing that reaches the output, by who connected it (`tools/silentframe.js`)
export async function samLevels({ w, b, log, sleep }) {
  try { await b.audioCtx.close(); } catch (e) {}
  await import('/tools/silentframe.js?' + Date.now());
  await window.__sfLoad(() => { sessionStorage.setItem('beachwalk.skipIntro', '1'); });
  let F = null; for (let i = 0; i < 80; i++) { await sleep(250); F = window.__sfW(); if (F && F.__bw) break; }
  const B = F.__bw;
  for (let i = 0; i < 80 && !B.state().started; i++) { try { B.beginGame(); } catch (e) {} await sleep(250); }
  for (let k = 0; k < 200 && !B.state().introDone; k++) { B.frame(3); await sleep(30); }
  log('settings', JSON.stringify({ vol: B.settings.volume, music: B.settings.musicVolume, fx: B.settings.effectsVolume }));
  const RB = B.ROOM_BACK.dojo; RB.load();
  for (let i = 0; i < 160 && !RB.ready(); i++) { B.frame(2); await sleep(50); }
  RB.place(); for (let i = 0; i < 60; i += 5) { B.frame(5); await sleep(5); }
  const it = B.interactables.find((x) => /Take the katana/.test(typeof x.label === 'function' ? x.label() : x.label));
  if (w.__samDev) B.settings.devMode = true;
  log('katana on the stand', !!it); if (it) it.onActivate();
  for (let s = 0; s < 24; s++) { for (let i = 0; i < 30; i += 5) { B.frame(5); await sleep(5); } await sleep(380); if (s % 2 === 1) log('t', ((s + 1) / 2).toFixed(0), window.__sfLevels(), 'dojo', B.roomFlags().inDojo, 'dying', B.state().dying, 'hp', B.state().hp, 'sam alive', B.samuraiS ? B.samuraiS().st.alive : '?'); }
}

export async function samLevelsDev(ctx) { ctx.w.__samDev = true; return samLevels(ctx); }

// THE REMATCH (2026-10-21): the dojo's checkpoint written, the sword taken, killed by him; the death's own reload, Restart
// on the card; then what is on the stand, how he wakes, and what reaches the speakers for twenty seconds
export async function samRematch({ w, b, log, sleep }) {
  try { await b.audioCtx.close(); } catch (e) {}
  await import('/tools/silentframe.js?' + Date.now());
  await window.__sfLoad(() => { sessionStorage.setItem('beachwalk.skipIntro', '1'); });
  let F = null; for (let i = 0; i < 80; i++) { await sleep(250); F = window.__sfW(); if (F && F.__bw) break; }
  let B = F.__bw;
  for (let i = 0; i < 80 && !B.state().started; i++) { try { B.beginGame(); } catch (e) {} await sleep(250); }
  for (let k = 0; k < 200 && !B.state().introDone; k++) { B.frame(3); await sleep(30); }
  const RB = B.ROOM_BACK.dojo; RB.load();
  for (let i = 0; i < 160 && !RB.ready(); i++) { B.frame(2); await sleep(50); }
  RB.place(); for (let i = 0; i < 60; i += 5) { B.frame(5); await sleep(5); }
  B.saveCheckpoint(); log('saved in', B.devRoom());
  const it = B.interactables.find((x) => /Take the katana/.test(typeof x.label === 'function' ? x.label() : x.label));
  it.onActivate(); B.settings.devMode = false;
  // die to him: the reload is the game's own
  const f0 = window.__sfW();
  for (let i = 0; i < 400 && window.__sfW() === f0 && !(f0.document.documentElement.classList.contains('died') && f0.__bwReloading); i++) { try { B.frame(5); } catch (e) {} await sleep(30); if (B.state().dying) break; }
  log('dying', B.state().dying);
  // the death's reload, done through the silent frame so what it plays is heard (the same session keys a death sets)
  await sleep(2500);
  await window.__sfLoad(() => { sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1'); });
  let F2 = null; for (let i = 0; i < 200; i++) { await sleep(200); try { F2 = window.__sfW(); if (F2.__bw && F2.__bw.state) break; } catch (e) {} }
  const B2 = F2.__bw;
  const btn = F2.document.querySelector('.dc-restart');
  for (let i = 0; i < 300 && btn && btn.classList.contains('loading'); i++) { try { B2.frame(4); } catch (e) {} await sleep(30); }
  if (btn) btn.click();
  for (let i = 0; i < 300 && (B2.frozen() || !B2.state().introDone); i++) { try { B2.frame(3); } catch (e) {} await sleep(30); }
  log('back: room', B2.devRoom(), 'holding', B2.state().equipped, 'pack has katana', B2.state().inv.includes('Katana'));
  const it2 = B2.interactables.find((x) => /Take the katana/.test(typeof x.label === 'function' ? x.label() : x.label));
  log('katana on the stand again', !!it2, it2 ? (typeof it2.data?.when === 'function' ? it2.data.when() : '-') : '');
  B2.settings.devMode = true;
  if (it2) it2.onActivate();
  for (let s = 0; s < 40; s++) { for (let i = 0; i < 30; i += 5) { B2.frame(5); await sleep(5); } await sleep(380); if (s % 4 === 3) log('t', ((s + 1) / 2).toFixed(0), window.__sfLevels(), 'sam awake', B2.samurai ? B2.samurai.st.awake : '?'); }
}

// RESTART GAME ASKS FIRST (2026-10-24): the menu, Restart game pressed — the question and its two buttons; then Cancel
export async function menuAsk({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(1500);
  b.openMenu(); await sleep(300);
  const d = w.document, M = d.getElementById('menu'), vis = (sel) => { const e = d.querySelector(sel); return e && w.getComputedStyle(e).display !== 'none'; };
  d.getElementById('m-restart').click(); await sleep(250);
  log('after Restart game: settings shown', vis('#menu .panel.settings'), 'question shown', vis('#menu .panel.ask'), 'text', d.querySelector('#menu .ask-q').textContent, 'still started', b.state().started);
  const src = d.body; const c = d.createElement('canvas');
  // the menu is HTML over the canvas: capture by drawing its box as text is not possible here, so report its geometry
  const r = d.querySelector('#menu .panel.ask').getBoundingClientRect(); log('question panel at', Math.round(r.left), Math.round(r.top), Math.round(r.width) + 'x' + Math.round(r.height));
  d.getElementById('m-ask-no').click(); await sleep(250);
  log('after Cancel: settings shown', vis('#menu .panel.settings'), 'question shown', vis('#menu .panel.ask'), 'menu open', M.classList.contains('show'), 'game still on', b.state().started);
  d.getElementById('m-restart').click(); await sleep(100); b.closeMenu(); await sleep(100); b.openMenu(); await sleep(250);
  log('closed while asking, reopened: settings shown', vis('#menu .panel.settings'), 'question shown', vis('#menu .panel.ask'));
}

// "QUIT TO TITLE SCREEN" ASKS FIRST (2026-10-24): a death's reload in a silent frame; Quit pressed before main.js runs —
// the question, then Cancel; again once the game is in — the question, then Quit: the page goes to the title, save kept
export async function dcQuitAsk({ w, b, log, sleep }) {
  for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
  await sleep(2000); b.camera.position.set(8, 1.7, -60); await sleep(300); b.saveCheckpoint();
  try { await b.audioCtx.close(); } catch (e) {}
  await import('/tools/silentframe.js?' + Date.now());
  await window.__sfLoad(() => { sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1'); });
  const F = window.__sfW(), vis = (sel) => { const e = F.document.querySelector(sel); return !!e && F.getComputedStyle(e).display !== 'none'; };
  let early = false;
  for (let i = 0; i < 200; i++) { await sleep(20); const q = F.document.querySelector('.dc-quit'); if (q && !F.__bw) { q.click(); early = true; break; } }
  log('early press: module up', !!F.__bw, '| choices shown', vis('#deathcard > .opts'), 'question shown', vis('#deathcard .ask'), 'text', F.document.querySelector('#deathcard .ask p').textContent);
  F.document.querySelector('.dc-quit-no').click();
  log('Cancel: choices shown', vis('#deathcard > .opts'), 'question shown', vis('#deathcard .ask'), 'page still the game', F.location.href.includes('index'));
  for (let i = 0; i < 300 && !(F.__bw && F.__bw.state); i++) await sleep(50);
  F.document.querySelector('.dc-quit').click();
  log('in, Quit pressed: question shown', vis('#deathcard .ask'));
  const before = F.document; F.document.querySelector('.dc-quit-yes').click();
  let reloaded = false; for (let i = 0; i < 100; i++) { await sleep(100); try { if (window.__sfW().document !== before && window.__sfW().document.readyState !== 'loading') { reloaded = true; break; } } catch (e) {} }
  const F2 = window.__sfW();
  log('Quit: reloaded', reloaded, 'died card on', F2.document.documentElement.classList.contains('died'), 'load key', sessionStorage.getItem('beachwalk.load'), 'save kept', !!localStorage.getItem('beachwalk.save'));
}

// THE MINOTAUR (2026-10-28). Into XIII's court with him at your side, the two before the throne room's door killed, him
// down; a checkpoint; the page reloaded into it the way a death does: is he lying where he fell, with his blood and his
// swords? (its own profile: never the owner's save)
async function mnCourt(w, b, sleep) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  const M = b.MINO, u = M.u;
  for (let i = 0; i < 120 && !b.c13State().ready; i++) { await sleep(300); w.__c13Step(2); }
  b.skipTakes(); await w.__c13Go(); b.skipTakes();
  M.stage = 'with'; M.ally = true;
  for (let i = 0; i < 400 && !(b.knUnitsS().length === 2 && b.knUnitsS().every((k) => k.model && !(k.clipsPending > 0) && k.natDone)); i++) { w.__c13Step(1); await sleep(40); }
  const K = b.knUnitsS(), P0 = K[0].g.position, yaw = K[0].g.rotation.y, cam = b.camera.position;
  const home = [P0.x + Math.sin(yaw) * 7, P0.z + Math.cos(yaw) * 7];
  cam.set(home[0], P0.y + 1.7, home[1]); b.camBaseY = P0.y + 1.7;
  b.minoJoin(u); w.__c13Step(5);
  return { M, u, K, home };
}
export async function minoRestore({ w, b, log, sleep, shot }) {
  const f = w.frameElement;
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = true;
  log('your blade on him while he is yours: landed', b.hurtMutantTest(u, 5), 'hp', u.st.hp);
  for (const k of K) b.hurtMutantTest(k, 999);
  for (let i = 0; i < 60 * 9; i++) { b.camera.position.x = home[0]; b.camera.position.z = home[1]; w.__c13Step(1); }
  log('before', JSON.stringify({ stage: M.stage, spot: M.spot, hipY: +(u.minoAuthor.J.hip.getWorldPosition(u.g.position.clone()).y - u.g.position.y).toFixed(2) }));
  b.settings.devMode = false;
  b.saveCheckpoint();
  const sv = JSON.parse(localStorage.getItem('beachwalk.save') || 'null');
  log('saved', JSON.stringify(sv && sv.flags.mino), 'dead', JSON.stringify(sv && sv.flags.deadUnits.filter((k) => /^kn|mino/.test(k))), 'room', sv && sv.room);
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
  f.contentWindow.location.reload();
  await sleep(1500);
  let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
  const B = w2.__bw;
  const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
  for (let i = 0; i < 300 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
  try { await B.audioCtx.suspend(); } catch (e) { /* */ }
  const M2 = B.MINO;
  for (let i = 0; i < 400 && !(M2.u && M2.u.model && !(M2.u.clipsPending > 0) && M2.u.minoAuthor && !M2.restored); i++) {
    if (i % 40 === 0) log('wait', i, JSON.stringify({ stage: M2.stage, restored: M2.restored, u: !!M2.u, model: !!(M2.u && M2.u.model), pend: M2.u && M2.u.clipsPending, lay: !!(M2.u && M2.u.minoLay), cam: [+B.camera.position.x.toFixed(1), +B.camera.position.z.toFixed(1)], room: B.devRoom() }));
    await sleep(100);
  }
  await sleep(1500);
  const u2 = M2.u;
  log('loads', JSON.stringify(B.loadLog().filter((e) => /minotaur|gargoyle|castle13|knight-|moves/.test(e[0])).map((e) => [e[0], (e[1] / 1000).toFixed(1), e[2]])));
  log('after', JSON.stringify({ stage: M2.stage, ally: M2.ally, at: u2 && u2.g.position.toArray().map((v) => +v.toFixed(2)), spot: M2.spot, vis: u2 && u2.g.visible, pool: !!M2.pool, swords: M2.swords && M2.swords.length,
    hipY: u2 && u2.minoAuthor && +(u2.minoAuthor.J.hip.getWorldPosition(u2.g.position.clone()).y - u2.g.position.y).toFixed(2), knAlive: B.knAlive(), inC13: B.state().inC13 }));
  if (u2) { w2.requestAnimationFrame = () => 0; const p = u2.g.position, c = B.camera.position; c.set(p.x - 2.6, p.y + 1.7, p.z + 0.6); B.lookAt(p.x, p.y + 0.3, p.z); B.camera.updateMatrixWorld(true);
    B.renderer.render(B.scene, B.camera); log('drawn'); }
}
// HE GOES DOWN, in the court where he does (2026-10-29, the owner: "his body should not float while laying … he should be
// easier to talk to i couldn't prompt it"): the two killed, him down; once he lies, how far each part of him is off the
// paving UNDER IT (the court's own floor, not his feet's), and from eight sides at two distances, does the prompt come up
// looking at his chest. (its own profile)
export async function minoDown({ w, b, log, sleep, shot }) {
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = true;
  for (const k of K) b.hurtMutantTest(k, 999);
  for (let i = 0; i < 60 * 10 && M.stage !== 'down'; i++) { b.camera.position.x = home[0]; b.camera.position.z = home[1]; w.__c13Step(1); }
  for (let i = 0; i < 60 * 12; i++) { b.camera.position.x = home[0]; b.camera.position.z = home[1]; w.__c13Step(1); }   // (his fall is ten seconds now)
  log('lookK', M.lookK, 'base', !!M.base, 'fall', u.clips.mnFall.getClip().duration, 'act', u.clips.mnFall.isRunning(), u.clips.mnFall.enabled, u.clips.mnFall.getEffectiveWeight());
  log('yaw', u.g.rotation.y.toFixed(3), 'clear', b.minoLieClear(u.g.position.x, u.g.position.z, u.g.rotation.y));
  { const F = b.c13Thrive() && b.c13Thrive().fountain, g = u.g.position;
    log('fountain', F && [F.x, F.z].map((q) => +q.toFixed(2)).join(','), 'world', F && [b.C13_X + F.x, b.C13_Z + F.z].map((q) => +q.toFixed(2)).join(','), 'from him', F && Math.hypot(b.C13_X + F.x - g.x, b.C13_Z + F.z - g.z).toFixed(2),
      'overlaps', b.c13Overlaps ? b.c13Overlaps(g.x - b.C13_X, g.z - b.C13_Z, 0.2) : '?', 'solids', b.c13Solids.filter((q) => q.r !== undefined).map((q) => [q.x, q.z, q.r].map((v) => +v.toFixed(1)).join('/')).join(' '));
    const yy = []; for (let k = 0; k < 24; k++) yy.push(k + ':' + (b.minoLieClear(g.x, g.z, k / 24 * Math.PI * 2) ? 'Y' : 'n')); log('clear by yaw', yy.join(' ')); }
  log('stage', M.stage, 't', M.t.toFixed(1), 'at', JSON.stringify(u.g.position.toArray().map((v) => +v.toFixed(2))), 'floor there', b.c13CourtAt(u.g.position.x, u.g.position.z));
  // every vertex of his body against the floor under it
  let body = null; u.model.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes.position.count === 3572) body = o; });
  u.g.updateMatrixWorld(true);
  const P = body.geometry.attributes.position, SI = body.geometry.attributes.skinIndex, SW = body.geometry.attributes.skinWeight, bs = body.skeleton.bones, v = b.camera.position.clone();
  const lo = {}; let under = 0, nf = 0;
  for (let i = 0; i < P.count; i++) {
    let best = -1, bw = 0; for (let k = 0; k < 4; k++) { const x = SW.getComponent(i, k); if (x > bw) { bw = x; best = SI.getComponent(i, k); } }
    v.fromBufferAttribute(P, i); body.applyBoneTransform(i, v); v.applyMatrix4(body.matrixWorld);
    const f = b.c13CourtAt(v.x, v.z); if (f === null) { nf++; continue; }
    const g = v.y - f, k = bs[best].name.replace(/[LR]$/, '').replace(/^F\d+$/, 'F');
    if (!(k in lo) || g < lo[k]) lo[k] = g; under = Math.min(under, g);
  }
  // (and again with his clip alone re-applied, no breath laid on it: which is it that puts his head in the stone)
  const headLow = () => { let lo = 1e9; u.g.updateMatrixWorld(true); for (let i = 0; i < P.count; i++) { let best = -1, bw = 0; for (let k = 0; k < 4; k++) { const x = SW.getComponent(i, k); if (x > bw) { bw = x; best = SI.getComponent(i, k); } } if (!/^(Head|Mouth)/.test(bs[best].name)) continue; v.fromBufferAttribute(P, i); body.applyBoneTransform(i, v); v.applyMatrix4(body.matrixWorld); const f = b.c13CourtAt(v.x, v.z); if (f !== null) lo = Math.min(lo, v.y - f); } return lo.toFixed(3); };
  log('actions', u.mixer._actions.filter((x) => x.enabled && x.getEffectiveWeight() > 0.001).map((x) => x.getClip().name + '@' + x.time.toFixed(2) + ' w' + x.getEffectiveWeight().toFixed(2)).join(', '),
    '| model pos', u.model.position.toArray().map((q) => +q.toFixed(3)).join(','), 'rot', [u.model.rotation.x, u.model.rotation.y, u.model.rotation.z].map((q) => +q.toFixed(3)).join(','), 'scale', +u.model.scale.x.toFixed(3), '| g rot', [u.g.rotation.x, u.g.rotation.z].map((q) => +q.toFixed(3)).join(','));
  { const tr = u.clips.mnFall.getClip().tracks, res = [];
    for (const nm of ['Head', 'Neck', 'Spine5', 'Spine4']) { const t = tr.find((x) => x.name === nm + '.quaternion'), bn = u.model.getObjectByName(nm); if (!t || !bn) { res.push(nm + ':none'); continue; } const n = t.values.length; const q = new b.THREE.Quaternion(t.values[n - 4], t.values[n - 3], t.values[n - 2], t.values[n - 1]); res.push(nm + ' off its clip ' + bn.quaternion.angleTo(q).toFixed(3)); }
    log('bones vs the clip', res.join(' | '), '| base', M.base ? [...M.base.keys()].map((k) => k.name).join(',') : '-'); }
  const h0 = headLow(); u.mixer.update(0); const h1 = headLow();
  log('head off the floor: as drawn', h0, '| his clip alone', h1);
  { const H = u.bones.head.getWorldPosition(u.g.position.clone()), y = u.g.rotation.y, fx = Math.sin(y), fz = Math.cos(y), o = u.g.position;
    const fw = (H.x - o.x) * fx + (H.z - o.z) * fz, sd = (H.x - o.x) * fz - (H.z - o.z) * fx;
    const prof = []; for (let d = -3; d <= 1.5; d += 0.5) prof.push(d + ':' + ((b.c13CourtAt(o.x + fx * d, o.z + fz * d) ?? NaN) - o.y).toFixed(2));
    log('his head is', fw.toFixed(2), 'm ahead of him,', sd.toFixed(2), 'to the side | the floor along him (m ahead: height over his feet)', prof.join(' ')); }
  log('off the floor under it (m):', Object.entries(lo).sort((a, c) => a[1] - c[1]).map(([k, g]) => k + ' ' + g.toFixed(3)).join(', '), '| deepest', under.toFixed(3), 'off the court', nf);
  // the prompt, looking at his chest from around him
  const C = u.minoAuthor.J.chest.getWorldPosition(u.g.position.clone()), cam = b.camera.position, res = [];
  for (const r of [1.8, 3.0]) for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2, x = C.x + Math.sin(a) * r, z = C.z + Math.cos(a) * r, f = b.c13CourtAt(x, z);
    if (f === null) { res.push(r + '/' + k + ':wall'); continue; }
    cam.set(x, f + 1.7, z); b.camBaseY = f + 1.7; b.lookAt(C.x, C.y, C.z); w.__c13Step(1); cam.set(x, f + 1.7, z); b.lookAt(C.x, C.y, C.z); w.__c13Step(1);
    const moved = Math.hypot(cam.x - x, cam.z - z);
    res.push(r + '/' + k + ':' + (b.hoveredS() === 'Talk to the minotaur' ? 'YES' : (b.hoveredS() || 'none')) + (moved > 0.05 ? '(moved ' + moved.toFixed(2) + ')' : '') + (b.hoveredS() ? '' : ' d' + cam.distanceTo(C).toFixed(2) + ' dy' + (cam.y - C.y).toFixed(2)));
  }
  log('prompt', res.join(' '));
  // (close, from where you would stand over him, at your own eye height: the arm the owner saw)
  for (const k of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const a = k / 8 * Math.PI * 2, x = C.x + Math.sin(a) * 1.9, z = C.z + Math.cos(a) * 1.9, f = b.c13CourtAt(x, z);
    if (f === null || b.gargWhy(x, f + 1, z).wall6) continue;
    cam.set(x, f + 1.7, z); b.camera.fov = 60; b.camera.updateProjectionMatrix(); b.camera.lookAt(C.x, C.y, C.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('mndown' + k, 640, 1.2);
  }
  // (from over him, straight down and from his feet: the arms, whatever is round him)
  { const vs = []; u.model.traverse((o) => { if (o.isMesh) vs.push(o.name + ':' + o.visible + '/' + (o.material && o.material.visible) + '/' + o.frustumCulled + '/' + (o.layers && o.layers.mask)); });
    let pv = u.g, chain = []; while (pv) { chain.push((pv.name || pv.type) + ':' + pv.visible); pv = pv.parent; }
    log('meshes', vs.join(' '), '| chain', chain.join(' < '), '| cam layers', b.camera.layers.mask, 'near', b.camera.near); }
  log('visible', u.g.visible, u.model.visible, 'C', C.toArray().map((q) => +q.toFixed(2)).join(','), 'g', u.g.position.toArray().map((q) => +q.toFixed(2)).join(','));
  { const y = u.g.rotation.y; b.camera.fov = 60; b.camera.updateProjectionMatrix();
    for (const [nm, dx, dy, dz] of [['mnover', 0.01, 3.2, 0], ['mnfeet', Math.sin(y) * 2.4, 1.6, Math.cos(y) * 2.4], ['mnside', Math.cos(y) * 2.2, 1.5, -Math.sin(y) * 2.2], ['mnside2', -Math.cos(y) * 2.2, 1.5, Math.sin(y) * 2.2]]) {
      cam.set(C.x + dx, C.y + dy, C.z + dz); b.camera.lookAt(C.x, C.y, C.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 640, 1.4); } }
  b.camera.fov = 105; b.camera.updateProjectionMatrix();
}
// THE TWO BEFORE THE THRONE ROOM, FOUGHT (2026-10-29, the owner: "make the two knights before the throne room actually
// hard and a good fight they should be smarter and have different personalities. make sure one fights the minotaur first
// as well unless engaged with"): him at your side, both awake; you go for whichever is NOT on him, keep a stride off it
// and strike (2) between its blows, once a second; when it is dead, the other. Who is on whom, their health, their
// blows landed on you, their sidesteps out of your line, their second wind. (its own profile)
export async function knDuelBack(ctx) { ctx.w.__backOff = true; return knDuel(ctx); }
export async function knDuel({ w, b, log, sleep, shot }) {
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = false;            // (dev mode: no creature ever starts a swing — measured, nobody here struck anybody)
  let hp0 = b.state().hp, hurts = 0;
  const cam = b.camera.position, nm = (k) => (k === K[0] ? 'MAN' : 'IRON');
  { const D = b.C13_THR_DOOR, dX = b.C13_X + D.x, dZ = b.C13_Z + D.z;
    log('posts: from the throne room door', K.map((k) => Math.hypot(k.g.position.x - dX, k.g.position.z - dZ).toFixed(1)).join(', '), 'm, apart', Math.hypot(K[0].g.position.x - K[1].g.position.x, K[0].g.position.z - K[1].g.position.z).toFixed(1));
    const c0 = cam.clone(); cam.set(home[0], K[0].g.position.y + 1.7, home[1]); b.camera.lookAt(dX, K[0].g.position.y + 1.6, dZ); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('kn_posts', 720, 1.2); cam.copy(c0); }
  for (const k of K) { k.st.awake = true; k.st.roar = 0.3; }
  const landed = { MAN: 0, IRON: 0 }, onHim = { MAN: 0, IRON: 0 }, mine = { MAN: 0, IRON: 0 }, dodges = { MAN: 0, IRON: 0 }, raged = {}, seen = {}, ev = {};
  let t = 0, cd = 0, first = null;
  for (let f = 0; f < 60 * 150 && K.some((k) => k.st.alive); f++) {
    t += 1 / 60; cd -= 1 / 60;
    const tgt = K.filter((k) => k.st.alive).sort((a, c) => (a.knOnMino ? 1 : 0) - (c.knOnMino ? 1 : 0) || Math.hypot(a.g.position.x - cam.x, a.g.position.z - cam.z) - Math.hypot(c.g.position.x - cam.x, c.g.position.z - cam.z))[0];
    if (tgt) {
      const P = tgt.g.position, d = Math.hypot(P.x - cam.x, P.z - cam.z);
      const backing = w.__backOff && (t % 5) > 3;   // (you giving ground: two seconds in every five, walking back off it)
      if (backing) { const nx = cam.x - (P.x - cam.x) / d * 2.6 / 60, nz = cam.z - (P.z - cam.z) / d * 2.6 / 60; if (b.c13CourtAt(nx, nz) !== null) { cam.x = nx; cam.z = nz; } }
      else if (d > 2.6) { const nx = cam.x + (P.x - cam.x) / d * 3.2 / 60, nz = cam.z + (P.z - cam.z) / d * 3.2 / 60; if (b.c13CourtAt(nx, nz) !== null) { cam.x = nx; cam.z = nz; } }
      { const F = M.u.st.foe; if (F && F.st.alive) { w.__mnGap = (w.__mnGap || 0) + Math.hypot(F.g.position.x - M.u.g.position.x, F.g.position.z - M.u.g.position.z); w.__mnGapN = (w.__mnGapN || 0) + 1; } if (M.u.st.atk >= 0 && !w.__mnWas) w.__mnSw = (w.__mnSw || 0) + 1; w.__mnWas = M.u.st.atk >= 0; }
      b.lookAt(P.x, cam.y - 0.1, P.z);
      if (cd <= 0 && d < 2.9 && tgt.st.atk < 0 && !(tgt.st.evade > 0)) { b.hurtMutantTest(tgt, 2, 0.3); mine[nm(tgt)]++; cd = 1.0; }   // (a light blow, as a click is)
    }
    const cx = cam.x, cz = cam.z; w.__c13Step(1); cam.x = cx; cam.z = cz;
    if (b.state().hp < hp0) hurts += hp0 - b.state().hp; b.heal(); hp0 = b.state().hp;
    for (const k of K) {
      const n = nm(k);
      if (!first && k.knOnMino) first = n + ' at ' + t.toFixed(1) + 's';
      if (k.st.foe === M.u) onHim[n] += 1 / 60;
      if (k.hitAt && k.hitAt !== seen[n]) { seen[n] = k.hitAt; if (!k.st.foe) landed[n]++; }
      if (k.st.evade > 0 && !ev[n]) dodges[n]++; ev[n] = k.st.evade > 0;
      if (k.st.raged && !raged[n]) raged[n] = t.toFixed(1) + 's';
    }
    if (f % 600 === 0 && t > 35) log('  foes seen', b.minoPickDbg());
    if (f % 600 === 0) log(t.toFixed(0) + 's', K.map((k) => nm(k) + ' hp ' + (k.st.alive ? k.st.hp : 'dead') + ' on ' + (k.st.foe === M.u ? 'HIM' : k.st.foe ? 'other' : 'you')).join(' | '), '| minotaur hp', M.u.st.hp, 'on', M.u.st.foe ? (M.u.st.foe === K[0] ? 'MAN' : M.u.st.foe === K[1] ? 'IRON' : 'other:' + M.u.st.foe.kindName + (M.u.st.foe.st.alive ? '' : '(dead)')) : '-', 'pickT', (b.MINO.pickT || 0).toFixed(2), 'his atk', M.u.st.atk.toFixed(2), '| him to his', (() => { const o = K.find((k) => k.st.foe === M.u); return o ? Math.hypot(o.g.position.x - M.u.g.position.x, o.g.position.z - M.u.g.position.z).toFixed(1) + 'm, its atk ' + o.st.atk.toFixed(2) + ' cool ' + (o.st.cool || 0).toFixed(2) + ', his atk ' + M.u.st.atk.toFixed(2) + ' awake ' + M.u.st.awake : '-'; })());
  }
  log('minotaur: swings', w.__mnSw || 0, '| mean gap to his foe', ((w.__mnGap || 0) / (w.__mnGapN || 1)).toFixed(2), 'm | knights hp he took', K.reduce((a, k) => a + (k.kind.hp - Math.max(0, k.st.hp)), 0) - 2 * Object.values(mine).reduce((a, c) => a + c, 0));
  log('done at', t.toFixed(1), 's; first on the minotaur:', first, '| time on him (s)', JSON.stringify(Object.fromEntries(Object.entries(onHim).map(([k, v]) => [k, +v.toFixed(1)]))));
  log('your health lost', hurts, '| your blows', JSON.stringify(mine), '| theirs landed on you', JSON.stringify(landed), '| sidesteps', JSON.stringify(dodges), '| second wind at', JSON.stringify(raged), '| minotaur', M.u.st.hp, M.stage);
}
// the street, hands off: him at your side as the town comes out of its doors and the dark knight cuts them down
export async function minoFort({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  const M = b.MINO, u = M.u, cam = b.camera.position;
  M.stage = 'inside'; M.ally = true; u.g.visible = false;
  b.placeInFort(); w.__c13Step(20);
  log('joined', M.stage, M.place, 'd', Math.hypot(cam.x - u.g.position.x, cam.z - u.g.position.z).toFixed(2), 'vis', u.g.visible);
  const home = [cam.x, cam.z]; let shots = 0, sw = {}, last = null, la = -1;
  for (let k = 0; k < 40; k++) {
    for (let i = 0; i < 60; i++) {
      cam.x = home[0]; cam.z = home[1]; w.__c13Step(1);
      if (u.st.atk >= 0 && (u.st.swing !== last || u.st.atk < la)) sw[u.st.swing] = (sw[u.st.swing] || 0) + 1;
      last = u.st.atk >= 0 ? u.st.swing : null; la = u.st.atk;
      const A = u.st.atk >= 0 && u.atk[u.st.swing];
      if (A && Math.abs(u.st.atk - A.wind) < 0.02 && shots < 8) { shots++; b.lookAt(u.g.position.x, u.g.position.y + 1.3, u.g.position.z); b.camera.updateMatrixWorld(true); shot('mnfort' + shots + '_' + u.st.swing, 480, 1.2); }
    }
    if (k % 5 === 4) log(k, 'farmers alive', b.farmUnitsS().filter((f) => f.st.alive).length, 'on him', b.farmUnitsS().filter((f) => f.st.alive && f.st.foe === u).length, 'dk hp', b.dkS().u.st.hp, 'his hp', u.st.hp, 'my hp', b.state().hp);
    if (b.state().dying) { log('you died'); break; }
  }
  log('swings', JSON.stringify(sw));
}

// THEIR BLOWS ON EACH OTHER IN THE STREET (2026-10-29, the owner: "some of the minotaurs hits never land and look
// ridiculous same with dark knight tighten this up now everything needs to be flawless and visually correct when
// fighting the farmer fight right now is bad"): him at your side in the first castle's street, hands off. Every swing
// the minotaur and the dark knight throw at a man (not you): at its contact, how far off the man is, whether he is in
// front, and did it land. (its own profile)
export async function townHits({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  const M = b.MINO, u = M.u, cam = b.camera.position;
  M.stage = 'inside'; M.ally = true; u.g.visible = false;
  b.placeInFort(); w.__c13Step(20);
  b.settings.devMode = false;
  const home = [cam.x, cam.z], DK = () => b.dkS().u, rec = { MINO: [], DK: [] }, open = new Map();
  for (let f = 0; f < 60 * (w.__thSecs || 75); f++) {
    cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); b.heal();
    for (const [nm, x] of [['MINO', u], ['DK', DK()]]) {
      if (!x || !x.st.alive) continue;
      const A = x.st.atk >= 0 && x.atk ? x.atk[x.st.swing] : null, F = x.st.foe;
      const o = open.get(x);
      if (A && F && F.st && x.st.atk >= A.wind && (!o || o.atk > x.st.atk + 0.05 || o.sw !== x.st.swing) && x.st.atk < A.wind + 0.05) {
        const dx = F.g.position.x - x.g.position.x, dz = F.g.position.z - x.g.position.z, d = Math.hypot(dx, dz) || 1;
        const front = (dx * Math.sin(x.g.rotation.y) + dz * Math.cos(x.g.rotation.y)) / d;
        const r = { sw: x.st.swing, d: +d.toFixed(2), front: +front.toFixed(2), foe: F.kindName || (F.kind.farmer ? 'farmer' : '?'), foeHp: F.st.hp, landed: false, reach: A.reach, stop: A.stop, foeAtk: F.st.atk >= 0, foeFlung: !!(F.st.down || F.rag) };
        rec[nm].push(r); open.set(x, { atk: x.st.atk, sw: x.st.swing, r, t: 0 });
      }
      const oo = open.get(x);
      if (oo) { oo.t += 1 / 60; if (x.st.landed) oo.r.landed = true; if (oo.t > 0.5) open.delete(x); else oo.atk = x.st.atk; }
    }
  }
  for (const nm of ['MINO', 'DK']) {
    const R = rec[nm], L = R.filter((r) => r.landed);
    log(nm, 'blows at men', R.length, 'landed', L.length, '| misses:', JSON.stringify(R.filter((r) => !r.landed).slice(0, 14).map((r) => [r.sw, r.d, r.front, r.stop, r.foe, r.foeFlung ? 'down' : ''])));
    log(nm, 'landed at', JSON.stringify(L.slice(0, 10).map((r) => [r.sw, r.d, r.front])));
  }
}
// THE GARGOYLES (2026-10-28): into XIII's east court with the minotaur at your side, the arch door tried, and the fight
// hands off — you stand two and a half metres out from the door and land a blow (2) on whichever one strikes at you within
// reach, the way a guard-and-answer player would. Their modes, your hurts, his, the kills, and the door after.
export async function gargFight({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch;
  log('perches', JSON.stringify(G.perches.map((p) => [+(p.x - b.C13_X).toFixed(1), +(p.z - b.C13_Z).toFixed(1)])), 'units', G.units.length);
  // (the passage runs from the arch's start A along u, into the east court: you stand on THAT side, 2.6 m out)
  const home = [b.C13_X + A.ax + A.ux * (A.L + 2.6), b.C13_Z + A.az + A.uz * (A.L + 2.6)];
  cam.set(home[0], cam.y, home[1]); b.lookAt(b.C13_X + A.ax, cam.y, b.C13_Z + A.az); w.__c13Step(3);
  if (w.__ggMino !== false && M.u && M.u.model) { M.stage = 'with'; M.ally = true; M.place = '?'; w.__c13Step(3); }
  log('minotaur', M.stage, M.place, M.u && M.u.g.visible);
  b.settings.devMode = true;                     // (your health clamps at one; nothing else of theirs reads it)
  w.__ggDbg = [];
  b.gargTryDoor();
  log('tried: his line up', b.state().dialogOpen); if (b.state().dialogOpen) b.endDialog();   // (his "FUCK its locked...", closed: they come down)
  let hp0 = b.state().hp, hurts = 0, hits = 0, t = 0, shots = 0; const hitOn = new Set(), mino0 = M.u ? M.u.st.hp : 0;
  const tally = {};
  while (G.phase < 2 && t < 150) {
    for (let i = 0; i < 30; i++) {
      cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); t += 1 / 60;
      if (b.state().hp < hp0) hurts++; hp0 = b.state().hp;
      for (const u of G.units) {
        if (!u.st.alive || !u.gp) continue;
        tally[u.gp.mode] = (tally[u.gp.mode] || 0) + 1;
        const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z);
        // (you answer in its opening: a blow as it hangs in front of you after its lunge — `w.__ggIdle` stands and takes it)
        if (!w.__ggIdle && u.gp.mode === 'recover' && !u.gp.tgt && d < 2.8 && u.gp.t > 0.15 && !hitOn.has(u)) { b.hurtMutantTest(u, 2); hits++; hitOn.add(u); }
        if (u.gp.mode !== 'recover' && u.gp.mode !== 'reel') hitOn.delete(u);
        // (their blows that land on you, counted at the blow — your health is held at one, so its drops stop at three)
        if (!u.gp.tgt && u.hitAt && u.hitAt !== u._pbHit) { u._pbHit = u.hitAt; w.__ggLanded = (w.__ggLanded || 0) + 1; }
        // (the bones the clip leaves alone must not wander: the spin)
        if (u.gRest) for (const [bn, q0] of u.gRest) w.__ggDrift = Math.max(w.__ggDrift || 0, bn.quaternion.angleTo(q0));
        for (const [m, at, kd] of [['tell', 0.3, 'talon'], ['tell', 0.3, 'rake'], ['lunge', 0.18, 'talon'], ['lunge', 0.12, 'bite'], ['rake', 0.14, 'rake'], ['rake', 0.5, 'rake'], ['recover', 0.12, 'talon']]) {
          const tt = m === 'rake' ? (u.gp.rk || 0) : u.gp.t, key = m + kd + at;
          if (u.gp.mode === m && u.gp.kind === kd && tt > at && tt < at + 0.03 && !u.gp.tgt && (w.__ggShot = w.__ggShot || {})[key] === undefined) {
            w.__ggShot[key] = 1; b.camera.lookAt(u.g.position.x, u.g.position.y + 1.1, u.g.position.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('g_' + m + '_' + kd + '_' + at, 560, 1.15);
          }
        }
      }
    }
    if (Math.round(t * 2) % 10 === 0) log(t.toFixed(1) + 's', 'alive', G.units.filter((u) => u.st.alive).length, 'hp', G.units.map((u) => (u.st.alive ? u.st.hp : 'x')).join(','),
      'tgt', G.units.map((u) => (u.gp.tgt ? 'M' : 'Y')).join(''), 'minotaur hp', M.u && M.u.st.hp, 'his foe', M.u && M.u.st.foe && M.u.st.foe.kindName,
      '|', G.units.filter((u) => u.st.alive).map((u) => { const T = u.gp.tgt ? u.gp.tgt.g.position : cam; return u.gp.i + ':' + u.gp.mode + ' d' + Math.hypot(u.g.position.x - T.x, u.g.position.z - T.z).toFixed(1) + ' h' + (u.g.position.y - (b.camBaseY - 1.7)).toFixed(1) + ' p' + (u.g.position.x - b.C13_X).toFixed(0) + ',' + (u.g.position.z - b.C13_Z).toFixed(0); }).join(' '));
  }
  const frames = Object.values(tally).reduce((a, c) => a + c, 0);
  log('done at', t.toFixed(1), 's; phase', G.phase, 'your blows', hits, 'their hurts on you', hurts, 'minotaur', mino0, '->', M.u && M.u.st.hp,
    'time in', JSON.stringify(Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, +(v / frames).toFixed(2)]))));
  log('pieces', JSON.stringify(G.units.map((u) => u.gp.mode)), 'door locked', b.gargLockedS && b.gargLockedS());
  if (w.__ggDbg) { const D = w.__ggDbg.filter((r) => r[7] === 'Y'); log('strikes on you', D.length, 'hit', D.filter((r) => r[6]).length, JSON.stringify(D.slice(0, 24))); }
  log('their blows landed on you', w.__ggLanded || 0, '| most any spine/neck bone was off its rest (rad):', (w.__ggDrift || 0).toFixed(2));
}

// THROUGH THE ARCH DOOR WITH HIM (2026-10-29, the owner: "the minotaur needs to step through the door he keeps getting stuck
// in the gargoyle part"): the four broken, the door open, you through it and on into the fountain's court; him from the
// east side. Where he gets to, and where along the passage a step of his is refused. (its own profile)
export async function minoArch({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, M = b.MINO, u = M.u, cam = b.camera.position, A = b.c13Dbg().arch;
  for (const g of G.units) { g.st.hp = 0; g.st.alive = false; g.retired = true; g.g.visible = false; }
  G.phase = 2; b.openC13Arch(true);
  const X = (s, o = 0) => b.C13_X + A.ax + A.ux * s - A.uz * o, Z = (s, o = 0) => b.C13_Z + A.az + A.uz * s + A.ux * o;
  const sOf = (x, z) => (x - b.C13_X - A.ax) * A.ux + (z - b.C13_Z - A.az) * A.uz;
  log('arch', 'L', A.L.toFixed(2), 'open', b.c13Dbg().archOpen);
  // where along the axis (and a little either side of it) is a step of his legal?
  const row = []; for (let s = A.L + 2; s >= -3; s -= 0.5) { const x = X(s), z = Z(s), f = b.c13CourtAt(x, z); row.push(s.toFixed(1) + (f === null ? ':nofloor' : b.minoLegal(x, z, x, z, f) ? ':ok' : ':NO')); }
  log('his legal along the passage (s: from the door start, east is > L)', row.join(' '));
  M.stage = 'with'; M.ally = true; M.place = '?';
  const off = w.__maOff ?? 4.0;   // (off to one side of the door: walking straight at you he meets the wall beside it)
  { let o = off; for (; Math.abs(o) > 0.5 && b.c13CourtAt(X(A.L + 3.5, o), Z(A.L + 3.5, o)) === null; o *= 0.8); u.g.position.set(X(A.L + 3.5, o), b.c13CourtAt(X(A.L + 3.5, o), Z(A.L + 3.5, o)), Z(A.L + 3.5, o)); log('him set', o.toFixed(1), 'm off the door\'s line'); }
  cam.set(X(A.L + 1.5), cam.y, Z(A.L + 1.5)); w.__c13Step(5);
  // you walk through and on
  for (let f = 0; f < 60 * 24; f++) {
    const sMe = A.L + 1.5 - Math.min(f / 60, (w.__maWalk || 8.4) / 1.4) * 1.4, oMe = w.__maWalk ? 0 : sMe < -2 ? Math.min(3, (-2 - sMe) * 0.8) * -Math.sign(off || 1) : 0;
    const x = X(sMe, oMe), z = Z(sMe, oMe), fl = b.c13CourtAt(x, z);
    cam.set(x, (fl ?? cam.y - 1.7) + 1.7, z); b.camBaseY = cam.y; b.lookAt(X(sMe - 5), cam.y, Z(sMe - 5));
    w.__c13Step(1);
    if (f % 120 === 0) log((f / 60).toFixed(0) + 's', 'him at', u.g.position.x.toFixed(1), u.g.position.z.toFixed(1), 'you at s', sMe.toFixed(1), '| him at s', sOf(u.g.position.x, u.g.position.z).toFixed(2), 'v', (M.v || 0).toFixed(2), 'stuck', (M.stuckT || 0).toFixed(1), 'hold', M.hold);
  }
  log('end: him at s', sOf(u.g.position.x, u.g.position.z).toFixed(2), 'you at s', sOf(cam.x, cam.z).toFixed(2), 'apart', Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z).toFixed(1));
}
// THE LOCKED DOOR WITH HIM (2026-10-29, the owner: "when you go to open the locked door make the player spin around and
// enter dialog with the minotaur in the angle i provided … 'FUCK its locked...'"): you at the arch door facing it, him a
// few strides behind; tried: does the view swing round onto him, level and wide, the line up, and do they come down after?
export async function gargDoor({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch;
  const door = [b.C13_X + A.ax + A.ux * A.L * 0.5, b.C13_Z + A.az + A.uz * A.L * 0.5];
  const home = [b.C13_X + A.ax + A.ux * (A.L + 2.0), b.C13_Z + A.az + A.uz * (A.L + 2.0)];
  cam.set(home[0], cam.y, home[1]); b.lookAt(door[0], cam.y, door[1]); w.__c13Step(3);
  M.stage = 'with'; M.ally = true; M.place = '?';
  for (let i = 0; i < 240; i++) { cam.x = home[0]; cam.z = home[1]; b.lookAt(door[0], cam.y, door[1]); w.__c13Step(1); }
  const u = M.u, dM = () => Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z).toFixed(1);
  const yawOf = () => { const f = new b.THREE.Vector3(0, 0, -1).applyQuaternion(b.camera.quaternion); return Math.atan2(f.x, f.z); };
  const toM = () => Math.atan2(u.g.position.x - cam.x, u.g.position.z - cam.z);
  const off = () => { let d = yawOf() - toM(); while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return (d * 57.3).toFixed(0); };
  log('before: him', M.stage, M.place, 'at', dM(), 'm, view off him', off(), 'deg, vis', u.g.visible);
  b.gargTryDoor();
  const D = w.document.getElementById('dialog'), txt = () => w.document.getElementById('dialog-text').textContent;
  const step = (n) => { for (let i = 0; i < n; i++) w.__c13Step(1); };
  const choose = (k) => { D.click(); const bs = [...D.querySelectorAll('button.choice')]; log('  said:', JSON.stringify(txt()), '| you:', bs.map((x) => x.textContent).join(' / '), '-> pick', k); bs[k].click(); };
  const S = () => G.scene, gu = () => S() && S().unit;
  const rel = () => { const x = gu(); if (!x) return 'none'; const P = x.g.position, Q = u.g.position, f = b.c13CourtAt(P.x, P.z); const toM = Math.atan2(Q.x - cam.x, Q.z - cam.z), toG = Math.atan2(P.x - cam.x, P.z - cam.z); return S().phase + ' behind him ' + (Math.hypot(P.x - cam.x, P.z - cam.z) - Math.hypot(Q.x - cam.x, Q.z - cam.z)).toFixed(1) + 'm, off-line ' + ((toG - toM) * 57.3).toFixed(0) + 'deg, toes over floor ' + (P.y + (x.gp.footH || 0.83) - f).toFixed(2); };
  const facing = () => { const x = gu(); if (!x) return '-'; let d = Math.atan2(x.g.position.x - u.g.position.x, x.g.position.z - u.g.position.z) - u.g.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return (d * 57.3).toFixed(0); };
  log('tried: dialog', b.state().dialogOpen); step(90);
  log('turned: view off him', off(), 'deg, him at', dM(), 'm');
  choose(0); choose(0); step(30);
  for (let k = 0; k < 6; k++) { step(30); log('  t', ((k + 1) * 0.5).toFixed(1), 'the gargoyle:', rel()); }
  b.camera.updateMatrixWorld(true); shot('door_dropped', 900, 1.2);
  choose(0); D.click();
  log('  said:', JSON.stringify(txt())); D.click();
  log('box shown', D.classList.contains('show'));
  // the double take: his body's yaw, where his head points against you and against it, by the stage, every 0.1 s
  const H = u.bones.head, F = H.userData.mnFront, hp = new b.THREE.Vector3(), hq = new b.THREE.Quaternion(), hf = new b.THREE.Vector3(), to = new b.THREE.Vector3();
  const headOff = (x, y, z) => { u.g.updateMatrixWorld(true); H.getWorldPosition(hp); H.getWorldQuaternion(hq); hf.copy(F).applyQuaternion(hq); to.set(x, y, z).sub(hp).normalize(); return +(hf.angleTo(to) * 57.3).toFixed(0); };
  const shots = {}; let lastSt = '', yaw0 = null, tB = 0, tEye = 0, tRound = 0, t = 0, yawSwing = 0, minC = 999;
  for (let k = 0; k < 160 && b.state().dialogOpen; k++) {
    step(6); t += 0.1;
    const Sc = S(), stg = Sc && Sc.stage, gp = gu() && gu().g.position;
    const toYou = headOff(cam.x, cam.y - 0.15, cam.z), toIt = gp ? headOff(gp.x, gp.y + 1.0, gp.z) : -1;
    if (stg !== lastSt) { log('  stage', stg, 'at', t.toFixed(1), 's | body to it', facing(), 'deg | head to you', toYou, 'to it', toIt); lastSt = stg; if (stg === 'back') { yaw0 = u.g.rotation.y; tB = t; } }
    if (stg === 'back' || stg === 'away') { yawSwing = Math.max(yawSwing, Math.abs(u.g.rotation.y - yaw0) * 57.3); minC = Math.min(minC, toYou); }
    if (stg === 'back' && Sc.eye && !tEye) tEye = t;
    if (stg === 'turn' && !shots.turn && Math.abs(+facing()) < 100) { shots.turn = 1; b.camera.updateMatrixWorld(true); shot('dt_turning', 900, 1.2); }
    if (stg === 'back' && Sc.eye && !shots.eye) { shots.eye = 1; b.camera.updateMatrixWorld(true); shot('dt_eye', 900, 1.2); }
    if (stg === 'away' && Sc.backK < 0.05 && !shots.away) { shots.away = 1; tRound = t; b.camera.updateMatrixWorld(true); shot('dt_away', 900, 1.2); }
    if (k % 3 === 0 && (stg === 'back' || stg === 'away')) log('   ', t.toFixed(1), stg, 'backK', Sc.backK.toFixed(2), 'head to you', toYou, 'to it', toIt);
  }
  log('double take: eyes on you', (tEye - tB).toFixed(1), 's after it began, back round', (tRound - tB).toFixed(1), 's | his body turned', yawSwing.toFixed(0), 'deg in it | head closest to you', minC, 'deg | dialog', b.state().dialogOpen);
  log('after: phase', G.phase, 'modes', G.units.map((x) => x.gp.mode).join(','));
  step(180);
  log('3 s on: modes', G.units.map((x) => x.gp.mode).join(','), 'his foe', u.st.foe && u.st.foe.kindName);
}
// THE MINOTAUR AGAINST YOU (a no), each swing at each stand-off: did the blade reach you, and where on the screen did it
// arrive (ndc; the middle is 0,0). (its own profile)
export async function minoClose({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(6);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  const M = b.MINO, u = M.u, C = b.camera.position, P = u.g.position;
  b.settings.devMode = false;
  b.minoTurn(u); for (let i = 0; i < 120; i++) { w.__c13Step(1); b.heal(); }
  const keys = (w.__mnKeys || Object.keys(u.kind.use)).filter((k) => u.atk[k]);
  const stops = w.__mnStops || [1.4, 1.8, 2.2, 2.6, 3.0];
  let land = 0, tot = 0; const best = {};
  for (const k of keys) {
    const out = []; let bs = -1, bD = null;
    for (const D of stops) {
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__c13Step(1); b.heal(); }
      const yaw = u.g.rotation.y, home = [P.x + Math.sin(yaw) * D, P.z + Math.cos(yaw) * D];
      for (let i = 0; i < 15; i++) { C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__c13Step(1); b.heal(); }
      u.st.forceSwing = k; u.st.cool = 0;
      let started = false, h0 = u.hitAt || 0; const hits = [];
      for (let i = 0; i < 600; i++) {
        C.set(home[0], C.y, home[1]); b.lookAt(P.x, C.y - 0.15, P.z); w.__c13Step(1);
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (u.hitAt && u.hitAt !== h0) { h0 = u.hitAt; const q = u.hitPt ? u.hitPt.clone().project(b.camera) : { x: 9, y: 9 }; hits.push([q.x, q.y]); }
        b.heal();
      }
      tot++; if (hits.length) land++;
      const sc = hits.length ? 2 - Math.min(...hits.map(([x, y]) => Math.hypot(x, y + 0.15))) : -1;
      if (sc > bs) { bs = sc; bD = D; }
      out.push(D + (hits.length ? ':' + hits.map(([x, y]) => x.toFixed(2) + ',' + y.toFixed(2)).join('+') : ':MISS'));
    }
    best[k] = bD;
    log(k.padEnd(9), out.join('  '));
  }
  log('landed', land, 'of', tot, 'best stand-offs', JSON.stringify(best));
}

// THE STREET FIGHT'S FRAMES (2026-10-29, the owner: "the farmer fight is a laggy mess"): 40 s of the farmers' fight from
// the gate, standing, with the minotaur at your side (or, `w.__noMino`, without him): each frame's own time (update +
// render, gl.finish so the GPU counts), and what is going on — bodies falling, the living, the debris
export async function fortPerf({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  const M = b.MINO, u = M.u, cam = b.camera.position;
  b.settings.devMode = false;
  if (!w.__noMino) { M.stage = 'inside'; M.ally = true; u.g.visible = false; }
  b.placeInFort(); w.__c13Step(20);
  const gl = b.renderer.getContext(), home = [cam.x, cam.z], T = [], tags = [];
  for (let f = 0; f < 60 * 40; f++) {
    cam.x = home[0]; cam.z = home[1];
    const t0 = performance.now.call ? Date.now() : 0;
    const a = (window.performance && window.performance.timeOrigin) ? 0 : 0;
    const s0 = Date.now(); w.__c13Step(1); b.renderer.render(b.scene, b.camera); gl.finish(); const dt = Date.now() - s0; b.heal();
    T.push(dt);
    if (dt > 30) tags.push(f + ':' + dt + 'ms rag' + b.mutantsS().filter((x) => x.rag && !x.rag.asleep).length + ' gib' + (b.gibsS ? b.gibsS().length : '?'));
  }
  const S = T.slice().sort((p, q) => p - q), q = (k) => S[Math.floor(S.length * k)];
  log(w.__noMino ? 'WITHOUT him' : 'WITH him', 'median', q(0.5), 'p90', q(0.9), 'p99', q(0.99), 'max', S[S.length - 1], 'over 33ms', T.filter((x) => x > 33).length, 'of', T.length);
  log('farmers alive', b.farmUnitsS().filter((x) => x.st.alive).length, 'ragdolls', b.mutantsS().filter((x) => x.rag).length, 'awake rags', b.mutantsS().filter((x) => x.rag && !x.rag.asleep).length);
  log('spikes', tags.slice(0, 14).join('  '));
}
export async function fortPerfNo(ctx) { ctx.w.__noMino = true; return fortPerf(ctx); }

// HIS LEFT ARM AT REST, SOLVED (2026-10-29, the owner: "fix the minotaurs arm when hes laying down just make it normal he
// doesnt have to hold his stomach"): on the studio minotaur, the lying pose with only the left arm free, from two mirrored
// guesses, against `__lieRest` (tools/minolie.js); then the frames of his fall and his death checked for the arm in him
// or off the stone, and stills. (its own profile)
export async function minoArm({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/minotaur.js'); log('spawn', JSON.stringify(await w.__mnSpawn())); await ev('/tools/minolie.js');
  const L = b.MINO_LIE, out = (k, a) => { for (let i = 0; i < a.length; i++) { const d = a[i], n = Math.ceil(d.length / 8000); for (let j = 0; j < n; j++) console.log('[PBIMG]', k + i, j + '/' + n, d.slice(j * 8000, (j + 1) * 8000)); } };
  log('now', JSON.stringify(w.__lieRest(L, true)), '| old score', JSON.stringify(w.__lieScore(L, true)));
  out('lie_old', w.__lieShot(L));
  let best = null;
  if (w.__lieRest(L, true).s < 0.05) best = { best: L, d: w.__lieRest(L, true) };   // (the game's pose already rests: no solve)
  else for (const g of [{ right: 0.191, fwd: 0.285, up: 0.871 }, { right: 0.191, fwd: -0.285, up: -0.871 }, { right: 0.0, fwd: 0, up: 0 }]) {
    const st = Object.assign({}, L, { armL: g, foreL: { right: 0, up: 0 } });
    w.__lieSteps = null;
    const r = w.__lieSolve(st, 25000, w.__lieRestVars, w.__lieRest);
    log('from', JSON.stringify(g), '->', JSON.stringify(r.d), JSON.stringify({ armL: r.best.armL, foreL: r.best.foreL }));
    if (!best || r.d.s < best.d.s) best = r;
  }
  log('BEST', JSON.stringify({ armL: best.best.armL, foreL: best.best.foreL }), JSON.stringify(best.d));
  // (his last breath lifts the chest, and the arm hanging off it, into the stone: the arm turned back onto it, key by key)
  for (const [c, h, up] of [[0.18, 0.2, -0.791], [0.14, 0.14, -0.897]]) {
    const lk = Object.assign({}, L, { chest: { right: L.chest.right + c }, head: { right: L.head.right + h, up: L.head.up }, armR: { right: 0.111, fwd: -0.365, up } });
    log('lift', c, 'as is', JSON.stringify(w.__lieRest(lk, true)));
    w.__lieSteps = null; const r = w.__lieSolve(lk, 15000, w.__lieRestVars.slice(0, 3), w.__lieRest);
    log('lift', c, '->', JSON.stringify(r.d), JSON.stringify(r.best.armL));
  }
  // his clips as built now: every frame of the fall's last part and the death, the left arm in him / its hand off the stone
  const fr = [];
  for (const [c, a, z] of (w.__armClips || [['mnFall', 0.7, 1], ['mnDie', 0, 1]])) for (let f = a; f <= z + 1e-6; f += 0.05) { const d = w.__lieRest({ clip: c, f }, true); fr.push(c + '@' + f.toFixed(2) + ' pc' + d.pc + ' pd' + d.pd + ' hl' + d.hl + ' under' + d.under); }
  log('frames', fr.join(' | '));
}
// THE COURT FIGHT, FOR SLIDING AND LAG (2026-10-29, the owner: "improve the combat … make enemies slide around and lag
// less"): the two knights and him, you fighting the one not on him (the knDuel driver). Per creature and per state
// (its swing, a dodge, moving, standing): how fast its PLANTED foot travels over the floor (a foot on the stone should
// not move; >0.6 m/s is a skate), and the CPU of each whole frame of the castle's tick. (its own profile)
export async function knSkate({ w, b, log, sleep }) {
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = false;
  const cam = b.camera.position, V = cam.constructor, nm = (k) => (k === K[0] ? 'MAN' : k === K[1] ? 'IRON' : 'MINO');
  const feet = (x) => { const bs = []; x.model.traverse((o) => { if (o.isBone && /toe/i.test(o.name) && !/^ik_/.test(o.name)) bs.push(o); });
    if (bs.length < 2) x.model.traverse((o) => { if (o.isBone && /(foot|feet)/i.test(o.name) && !/toe|^ik_/i.test(o.name)) bs.push(o); });
    const L = bs.find((o) => /(left|_l\b|L$|\.L)/i.test(o.name)), R = bs.find((o) => /(right|_r\b|R$|\.R)/i.test(o.name)); return [L || bs[0], R || bs[1]]; };
  const all = [...K, u], F = new Map(all.map((x) => [x, { f: feet(x), p: [new V(), new V()], q: [new V(), new V()], low: 9, b0: x.g.position.clone(), first: true }]));
  log('feet', all.map((x) => nm(x) + ':' + F.get(x).f.map((o) => o && o.name).join('/')).join(' '));
  for (const k of K) { k.st.awake = true; k.st.roar = 0.3; }
  const S = {}, ms = []; let t = 0, cd = 0, hp0 = b.state().hp;
  for (let f = 0; f < 60 * 70 && K.some((k) => k.st.alive); f++) {
    t += 1 / 60; cd -= 1 / 60;
    const tgt = K.filter((k) => k.st.alive).sort((a, c) => (a.knOnMino ? 1 : 0) - (c.knOnMino ? 1 : 0))[0];
    if (tgt) {
      const P = tgt.g.position, d = Math.hypot(P.x - cam.x, P.z - cam.z);
      if (d > 2.6) { const nx = cam.x + (P.x - cam.x) / d * 3.2 / 60, nz = cam.z + (P.z - cam.z) / d * 3.2 / 60; if (b.c13CourtAt(nx, nz) !== null) { cam.x = nx; cam.z = nz; } }
      b.lookAt(P.x, cam.y - 0.1, P.z);
      if (cd <= 0 && d < 2.9 && tgt.st.atk < 0 && !(tgt.st.evade > 0)) { b.hurtMutantTest(tgt, 1, 0.3); cd = 1.0; }
    }
    const snap = all.map((x) => x.st.atk >= 0 ? x.st.swing + '@' + x.st.atk.toFixed(2) : x.st.evade > 0 ? 'dodge' : x.st.stun > 0 ? 'stun' : '-').join(',');
    const cx = cam.x, cz = cam.z, t0 = performance.now(); w.__c13Step(1); const dms = performance.now() - t0; ms.push(dms); cam.x = cx; cam.z = cz;
    if (dms > 7) (w.__spk = w.__spk || []).push([+dms.toFixed(1), +t.toFixed(2), snap, all.map((x) => x.st.atk >= 0 ? x.st.swing + '@' + x.st.atk.toFixed(2) : x.st.evade > 0 ? 'dodge' : x.st.stun > 0 ? 'stun' : '-').join(','), b.state().hp]);
    b.heal();
    for (const x of all) {
      if (!x.st.alive || !x.model || x.g.visible === false) continue;
      const D = F.get(x); if (!D.f[0] || !D.f[1]) continue;
      x.model.updateMatrixWorld(true); D.f[0].getWorldPosition(D.p[0]); D.f[1].getWorldPosition(D.p[1]);
      const lo = D.p[0].y < D.p[1].y ? 0 : 1, hy = D.p[lo].y - x.g.position.y; D.low = Math.min(D.low, hy);
      if (!D.first) {
        const sp = Math.hypot(D.p[lo].x - D.q[lo].x, D.p[lo].z - D.q[lo].z) * 60, vy = Math.abs(D.p[lo].y - D.q[lo].y) * 60;
        const bm = Math.hypot(x.g.position.x - D.b0.x, x.g.position.z - D.b0.z) * 60;
        const st = x.st.atk >= 0 ? 'swing ' + x.st.swing : x.st.evade > 0 ? 'dodge' : x.st.stun > 0 ? 'stun' : bm > 0.2 ? 'moving ' + (x.cur ? x.cur.getClip().name : '-') : 'standing';
        const c = x.cur, cn = c ? c.getClip().name + '@' + c.timeScale.toFixed(1) + (c.paused ? 'P' : '') : '-', yr = Math.abs(x.g.rotation.y - (D.yaw ?? x.g.rotation.y)) * 60; D.yaw = x.g.rotation.y;
        const key0 = nm(x) + ' ' + st;
        if (/^moving/.test(st) && c && bm > 0.5) { const T = x.clipTravel && x.clipTravel[c.getClip().name], yw = x.g.rotation.y, vx = (x.g.position.x - D.b0.x), vz = (x.g.position.z - D.b0.z);
          const lx = vx * Math.cos(yw) - vz * Math.sin(yw), lz = vx * Math.sin(yw) + vz * Math.cos(yw), e = T && T.length > 1 ? T[T.length - 1] : null;
          const dk = '#' + key0; const q = S[dk] || (S[dk] = { n: 0, agree: 0, tr: e ? e.map((v) => +v.toFixed(2)).join(',') : 'none', lx: 0, lz: 0 }); q.n++; q.lx += lx * 60; q.lz += lz * 60;
          if (e) { const along = Math.abs(e[0]) > Math.abs(e[1]) ? Math.sign(e[0]) * Math.sign(lx) : Math.sign(e[1]) * Math.sign(lz); if (along * Math.sign(c.timeScale) > 0) q.agree++; } } (S['@' + key0] = S['@' + key0] || {})[cn] = (S['@' + key0][cn] || 0) + 1;
        if (hy < D.low + 0.06 && vy < 0.4) for (const key of [key0, nm(x) + ' ALL']) { const s = S[key] || (S[key] = { n: 0, sum: 0, bad: 0, body: 0, yr: 0 }); s.n++; s.sum += sp; if (sp > 0.6) s.bad++; s.body += bm; s.yr += yr; }
      }
      D.first = false; D.q[0].copy(D.p[0]); D.q[1].copy(D.p[1]); D.b0.copy(x.g.position);
    }
  }
  log('spikes (ms, t, before, after)', JSON.stringify((w.__spk || []).sort((a, c) => c[0] - a[0]).slice(0, 14)));
  ms.sort((a, c) => a - c);
  log('frame CPU ms: median', ms[ms.length >> 1].toFixed(2), 'p95', ms[Math.floor(ms.length * 0.95)].toFixed(2), 'p99', ms[Math.floor(ms.length * 0.99)].toFixed(2), 'max', ms[ms.length - 1].toFixed(1), 'frames', ms.length, '| t', t.toFixed(0), 's, knights alive', K.filter((k) => k.st.alive).length);
  for (const [k, s] of Object.entries(S).sort((a, c) => a[0] < c[0] ? -1 : 1)) if (k[0] !== '@' && k[0] !== '#' && s.n > 20) log(k.padEnd(22), 'n', String(s.n).padStart(5), 'planted foot', (s.sum / s.n).toFixed(2), 'm/s, skating', Math.round(100 * s.bad / s.n) + '%', 'body', (s.body / s.n).toFixed(2), 'm/s, turning', (s.yr / s.n).toFixed(2), 'rad/s | clips', JSON.stringify(Object.entries(S['@' + k] || {}).sort((a, c) => c[1] - a[1]).slice(0, 4)));
  for (const [k, q] of Object.entries(S)) if (k[0] === '#' && q.n > 10) log('direction', k.slice(1).padEnd(20), 'n', q.n, 'clip travel (side,fwd)', q.tr, '| body local (side,fwd) m/s', (q.lx / q.n).toFixed(2), (q.lz / q.n).toFixed(2), '| feet go the body\'s way', Math.round(100 * q.agree / q.n) + '%');
  for (const x of all) log(nm(x), 'clipSpeed', JSON.stringify(Object.fromEntries(Object.entries(x.clipSpeed || {}).filter(([k]) => /Str|Walk|Run|walk|run|str/.test(k)).map(([k, v]) => [k, +v.toFixed(2)]))), 'gaitMax', x.kind.gaitMax, 'velGait', !!x.kind.velGait, 'measured', !!x._gaitMeasured);
  log('MAN', JSON.stringify({ alive: K[0].st.alive, awake: K[0].st.awake, vis: K[0].g.visible, foe: K[0].st.foe ? 'unit' : 'you', hp: K[0].st.hp, low: F.get(K[0]).low.toFixed(2), states: Object.keys(S).filter((k) => k.startsWith('@MAN')).map((k) => k + ':' + Object.values(S[k]).reduce((a, c) => a + c, 0)) }));
}
// EVERY KNIGHT BLOW, CAN YOU SEE IT COMING (2026-10-29, the owner: "any enemy swings that look bad and you can barely see
// to block take them out"): each knight alone in the court with you standing at its stand-off looking at it; each of its
// swings forced three times. Its wind-up, whether it landed, and over the last 0.4 s before contact how much of the time
// the weapon (the blade's tip, or the foot for a kick) was on your screen, and where it was at contact. (its own profile)
export async function knSee({ w, b, log, sleep }) {
  const { M, u, K } = await mnCourt(w, b, sleep);
  b.settings.devMode = false;
  u.st.awake = false; u.g.visible = false; u.g.position.x += 80; M.stage = 'wait';
  const cam = b.camera.position, V = cam.constructor, v = new V();
  for (const k of K) { k.st.awake = false; k.g.position.x += 0; }
  for (const k of K) {
    const other = K.find((x) => x !== k), o0 = other.g.position.clone(); other.g.position.x += 60; other.st.awake = false;
    k.st.awake = true; k.st.roar = 0;
    const keys = Object.keys(k.kind.use).filter((x) => k.atk[x]), tip = k.bones && k.bones.tip;
    let foot = null; k.model.traverse((o) => { if (!foot && o.isBone && /RightToeBase|foot_r$/i.test(o.name) && !/^ik_/.test(o.name)) foot = o; });
    for (const key of keys) {
      const A = k.atk[key], kick = A.limbs && A.limbs.some((i) => i >= 2), P = k.kind.lungeStop || 1.6;
      const res = [];
      for (let rep = 0; rep < 3; rep++) {
        for (let i = 0; i < 300 && k.st.atk >= 0; i++) { w.__c13Step(1); b.heal(); }
        const D = Math.max(1.4, (A.stop || 1.5) + 0.1), Q = k.g.position, yw = k.g.rotation.y, home = [Q.x + Math.sin(yw) * D, Q.z + Math.cos(yw) * D];
        const put = () => { cam.set(home[0], cam.y, home[1]); b.lookAt(Q.x, cam.y - 0.1, Q.z); };
        for (let i = 0; i < 10; i++) { put(); w.__c13Step(1); b.heal(); }
        k.st.forceSwing = key; k.st.cool = 0;
        let started = false, hp0 = b.state().hp, landed = false, win = [], atContact = null, t = 0;
        for (let i = 0; i < 400; i++) {
          put(); w.__c13Step(1); t += 1 / 60;
          const live = k.st.atk >= 0 && k.st.swing === key; if (live) started = true; else if (started) break;
          if (!live) continue;
          const bone = kick ? foot : tip; if (!bone) break;
          bone.getWorldPosition(v); v.project(b.camera);
          const on = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
          if (k.st.atk > A.wind - 0.4 && k.st.atk < A.wind) win.push(on ? 1 : 0);
          if (!atContact && k.st.atk >= A.wind) atContact = [+v.x.toFixed(2), +v.y.toFixed(2)];
          if (b.state().hp < hp0) landed = true;
          b.heal(); hp0 = b.state().hp;
        }
        res.push({ landed, seen: win.length ? win.reduce((a, c) => a + c, 0) / win.length : -1, at: atContact });
      }
      log((k === K[0] ? 'MAN ' : 'IRON') + ' ' + key.padEnd(9), 'clip', A.clip, kick ? '(KICK)' : '', 'wind', A.wind.toFixed(2), 's strike', A.strike.toFixed(2),
        '| landed', res.filter((r) => r.landed).length + '/3', '| on screen before contact', res.map((r) => Math.round(r.seen * 100) + '%').join(' '), '| at contact', res.map((r) => JSON.stringify(r.at)).join(' '));
    }
    k.st.awake = false; other.g.position.copy(o0);
  }
}
// THE DARK KNIGHT'S EVERY CONTACT, CAN YOU SEE IT COMING (2026-10-29, the `knSee` question asked of him): you at each
// swing's stop facing him; each swing 3 times. For each contact, over the 0.4 s before it: how much of the time ANY of his
// blade (seven points hilt to tip) was on your screen, and how much of the time its middle was. (its own profile)
export async function dkSee({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, V = C.constructor, P = u.g.position, tip = u.bones.tip, hilt = u.model.getObjectByName('kn_hilt'), H = new V(), T = new V(), q = new V();
  const on = (x) => { q.copy(x).project(b.camera); return q.z < 1 && Math.abs(q.x) < 0.97 && Math.abs(q.y) < 0.97; };
  for (const k of Object.keys(u.kind.use).filter((k) => u.atk[k])) {
    const A = u.atk[k], cts = A.moreT ? [A.wind, ...A.moreT] : [A.wind], acc = cts.map(() => ({ any: 0, mid: 0, n: 0 }));
    let landed = 0;
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
      const yaw = u.g.rotation.y, d0 = (A.stop || 2) + 0.4, home = [P.x + Math.sin(yaw) * d0, P.z + Math.cos(yaw) * d0];
      C.set(home[0], C.y, home[1]);
      for (let i = 0; i < 20; i++) { b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
      u.st.forceSwing = k; u.st.cool = 0;
      let started = false, hp0 = b.state().hp;
      for (let i = 0; i < 600; i++) {
        b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); C.x = home[0]; C.z = home[1]; for (const g of b.farmUnitsS()) g.st.awake = false;
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (b.state().hp < hp0) landed++; b.heal(); hp0 = b.state().hp;
        if (!live) continue;
        hilt.getWorldPosition(H); tip.getWorldPosition(T);
        cts.forEach((ct, j) => { if (u.st.atk > ct - 0.4 && u.st.atk < ct) { const a = acc[j]; a.n++; let any = 0; for (let s = 0; s <= 6; s++) if (on(q.copy(H).lerp(T, s / 6).clone())) any = 1; a.any += any; a.mid += on(H.clone().lerp(T, 0.5)) ? 1 : 0; } });
      }
    }
    log(k.padEnd(8), 'clip', String(A.clip).padEnd(8), 'wind', A.wind.toFixed(2), '| landed', landed, '| seen before each contact (any of the blade / its middle):', acc.map((a) => a.n ? Math.round(100 * a.any / a.n) + '%/' + Math.round(100 * a.mid / a.n) + '%' : '-').join('  '));
  }
}
// HIS IDLES' BREATHING (2026-10-29, "make the minotaurs breathing less hard and fast until hes dying"): on the studio
// minotaur, each idle clip scrubbed — its length, and how far his chest and shoulders swing in it (rad) and how often
export async function minoIdleBreath({ w, b, log }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text()); log('spawn', JSON.stringify(await w.__mnSpawn()));
  const u = w.__mnU, J = u.minoAuthor.J, Q = b.camera.quaternion.constructor;
  log('idle clips', Object.keys(u.clips).filter((k) => /idle/i.test(k)).join(','), '| kind idle', u.kind.anim.idle, JSON.stringify(u.kind.gaits.idle));
  for (const nm of Object.keys(u.clips).filter((k) => /idle/i.test(k))) {
    const a = u.clips[nm], dur = a.getClip().duration;
    for (const x of u.mixer._actions) { x.stop(); x.enabled = false; }
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const out = {};
    for (const bn of ['chest', 'clavL', 'clavR', 'neck', 'head']) {
      const bone = J[bn]; if (!bone) continue; const q0 = new Q(), ang = []; let first = true;
      for (let i = 0; i <= 120; i++) { a.time = dur * i / 120; u.mixer.update(0); if (first) { q0.copy(bone.quaternion); first = false; } ang.push(bone.quaternion.angleTo(q0)); }
      const mx = Math.max(...ang); let peaks = 0; for (let i = 1; i < ang.length - 1; i++) if (ang[i] > ang[i - 1] && ang[i] >= ang[i + 1] && ang[i] > mx * 0.6) peaks++;
      out[bn] = +mx.toFixed(3) + ' rad, ' + peaks + ' peaks';
    }
    log(nm.padEnd(8), 'dur', dur.toFixed(2), 's', JSON.stringify(out));
  }
}
// ON THEIR STONES (2026-10-29, the owner: "the gargoyles are not even on their stone parts their clipped through it"): XIII
// booted, the four perched. Each: its toes against the slab's top (`p.y`) and how far out from the face they stand (the
// slab reaches 1.1 m), the lowest and furthest-in of its body, and stills from the court and from the side. (own profile)
export async function gargPerches({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, cam = b.camera.position, V = cam.constructor, v = new V();
  for (let i = 0; i < 30; i++) w.__c13Step(1);
  log('corbels', !!G.corbels, G.corbels && G.corbels.visible, G.corbels && G.corbels.parent && G.corbels.parent.name);
  G.units.forEach((u, i) => {
    const p = u.gp.perch; u.g.updateMatrixWorld(true);
    let toe = 1e9, inMost = 1e9, low = 1e9; const outOf = (x, z) => (x - p.wx) * p.nx + (z - p.wz) * p.nz;
    u.model.traverse((o) => { if (!o.isBone) return; o.getWorldPosition(v); if (/^(Toe\d_[34]_|Ankle_)/.test(o.name)) toe = Math.min(toe, v.y); inMost = Math.min(inMost, outOf(v.x, v.z)); low = Math.min(low, v.y); });
    let feetOut = []; u.model.traverse((o) => { if (o.isBone && /^Toe\d_4_/.test(o.name)) { o.getWorldPosition(v); feetOut.push(+outOf(v.x, v.z).toFixed(2)); } });
    log('perch', i, 'mode', u.gp.mode, 'clip', u.cur && u.cur.getClip().name, 'footH', u.gp.footH && u.gp.footH.toFixed(2), 'footZ', u.gp.footZ && u.gp.footZ.toFixed(2),
      '| toes over the slab top', (toe - p.y).toFixed(2), 'm | toes out from the face', JSON.stringify(feetOut), '| deepest bone into the wall', inMost.toFixed(2), '| lowest bone under the slab', (low - p.y).toFixed(2));
  });
  { const u = G.units[0]; log('unit0 model.y', u.model.position.y.toFixed(2), 'model scale', u.model.scale.x.toFixed(2), 'rot', [u.g.rotation.x, u.g.rotation.y, u.g.rotation.z].map((q) => q.toFixed(2)).join(','),
      '| actions', u.mixer._actions.filter((x) => x.enabled && x.getEffectiveWeight() > 0.01).map((x) => x.getClip().name + '@' + x.time.toFixed(2) + ' w' + x.getEffectiveWeight().toFixed(2)).join(', '));
    const h0 = u.gp.footH; delete u.gp.footH; w.__c13Step(1); log('re-measured footH', u.gp.footH && u.gp.footH.toFixed(2), 'was', h0 && h0.toFixed(2));
    const gb = u.model.getObjectByName('Leg_1_Left'); log('Leg_1_Left local q', gb && gb.quaternion.toArray().map((q) => q.toFixed(2)).join(','), 'clip has leg track', u.clips.gPerch.getClip().tracks.some((t) => /Leg_1_Left/.test(t.name))); }
  if (w.__gpBind) {                                       // (the rig's own bind pose instead of the clip's frame, held)
    for (const u of G.units) { for (const x of u.mixer._actions) { x.stop(); x.enabled = false; } u.model.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); }); u.g.updateMatrixWorld(true);
      let toe = 1e9; u.model.traverse((o) => { if (o.isBone && /^(Toe\d_[34]_|Ankle_)/.test(o.name)) { o.getWorldPosition(v); toe = Math.min(toe, v.y); } }); log('bind pose: toes over its origin', (toe - u.g.position.y).toFixed(2)); }
  }
  b.camera.fov = 60; b.camera.updateProjectionMatrix();
  G.units.forEach((u, i) => {
    const p = u.gp.perch, tx = p.wx + p.nx * 0.6, tz = p.wz + p.nz * 0.6, ty = p.y + 0.4;
    for (const [nm, out, side, up] of [['front', 5.5, 0, -2.5], ['side', 2.2, 3.2, -0.6]]) {
      cam.set(tx + p.nx * out + p.nz * side, ty + up, tz + p.nz * out - p.nx * side); b.camera.lookAt(tx, ty, tz); b.camera.updateMatrixWorld(true);
      b.renderer.render(b.scene, b.camera); shot('perch' + i + '_' + nm, 520, 1.3);
    }
  });
}

export async function gargPerchesBind(ctx) { ctx.w.__gpBind = true; return gargPerches(ctx); }
// HIS KNEE, THEN HIS BACK (2026-10-29, the owner: "make it so he takes the knee and drops his stuff then when you go to talk
// to him while hes kneeled it says you can ask 'What's wrong?' to which he replies 'Im bleeding' … after 'Im bleeding' he
// should lay down and then continue to the other dialog"): the two killed, him down; the prompt on his knee, the talk
// clicked through, his lying down in it, the rest of it, his death; the song; stills kneeling and lying. (own profile)
export async function minoKneel({ w, b, log, sleep, shot }) {
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = true;
  for (const k of K) b.hurtMutantTest(k, 999);
  const cam = b.camera.position, hipY = () => +(u.minoAuthor.J.hip.getWorldPosition(u.g.position.clone()).y - u.g.position.y).toFixed(2);
  for (let i = 0; i < 60 * 10 && M.stage !== 'down'; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
  log('down', M.stage, 'kneel', M.kneel);
  for (let i = 0; i < 60 * 7; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
  log('after 7 s: kneel', M.kneel, 'hip over feet', hipY(), 'swords', M.swords && M.swords.length, 'clip', u.cur && u.cur.getClip().name, 'song', !!b.music().minoSong);
  const C = u.minoAuthor.J.chest.getWorldPosition(u.g.position.clone()), y = u.g.rotation.y;
  const look = (d, h) => { cam.set(C.x + Math.sin(y) * d, u.g.position.y + h, C.z + Math.cos(y) * d); b.camera.lookAt(C.x, C.y, C.z); b.camera.updateMatrixWorld(true); };
  b.camera.fov = 60; b.camera.updateProjectionMatrix(); look(3.2, 1.7); b.renderer.render(b.scene, b.camera); shot('kneeling', 640, 1.3);
  // the prompt, from in front of him
  cam.set(C.x + Math.sin(y) * 2.2, u.g.position.y + 1.7, C.z + Math.cos(y) * 2.2); b.camBaseY = cam.y; b.lookAt(C.x, C.y, C.z); w.__c13Step(1); b.lookAt(C.x, C.y, C.z); w.__c13Step(1);
  log('prompt on his knee:', b.hoveredS());
  b.minoTalk();
  const D = w.document.getElementById('dialog'), txt = () => w.document.getElementById('dialog-text').textContent, step = (n) => { for (let i = 0; i < n; i++) w.__c13Step(1); };
  step(30); await sleep(1500); log('said:', JSON.stringify(txt()), '| you:', [...D.querySelectorAll('button.choice')].map((x) => x.textContent).join(' / '), '| song started', !!b.music().minoSong);
  const bs = [...D.querySelectorAll('button.choice')]; if (bs[0]) bs[0].click();
  step(30); await sleep(1500); log('said:', JSON.stringify(txt())); D.click();
  step(10); log('box shown', D.classList.contains('show'), 'kneel', M.kneel, 'clip', u.cur && u.cur.getClip().name);
  for (let k = 0; k < 6; k++) { step(60); await sleep(200); if (k < 4) { const fv = b.camera.fov; b.camera.fov = 60; b.camera.updateProjectionMatrix(); const c0 = cam.clone(), q0 = b.camera.quaternion.clone(); cam.set(C.x + Math.cos(y) * 3.4, u.g.position.y + 1.6, C.z - Math.sin(y) * 3.4); b.camera.lookAt(C.x, u.g.position.y + 0.6, C.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('lie' + (k + 1), 480, 1.3); cam.copy(c0); b.camera.quaternion.copy(q0); b.camera.fov = fv; b.camera.updateProjectionMatrix(); } log('  +' + (k + 1) + ' s: hip', hipY(), 'box', D.classList.contains('show'), 'text', JSON.stringify(txt().slice(0, 30)), 'dialog', b.state().dialogOpen); }
  b.camera.fov = 60; b.camera.updateProjectionMatrix(); look(3.4, 1.9); b.renderer.render(b.scene, b.camera); shot('lying', 640, 1.3);
  step(30); await sleep(2500); log('said:', JSON.stringify(txt())); D.click(); step(30); await sleep(2500); log('said:', JSON.stringify(txt())); D.click(); step(30); await sleep(300);
  // "Take this.": his arm up with it, what you see, and taking it
  for (let k = 0; k < 6 && !/take this/i.test(txt()); k++) { D.click(); step(30); await sleep(900); }
  for (let k = 0; k < 4; k++) { step(30); await sleep(400); }
  log('said:', JSON.stringify(txt()), '| you:', [...D.querySelectorAll('button.choice')].map((x) => x.textContent).join(' / '), '| offering', M.offering, 'sketch in hand', !!M.sketchW, 'clip', u.cur && u.cur.getClip().name);
  b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('offer_view', 800, 1.3);
  { const fv = b.camera.fov, c0 = cam.clone(), q0 = b.camera.quaternion.clone(); b.camera.fov = 50; b.camera.updateProjectionMatrix(); cam.set(C.x + Math.cos(y) * 2.6, u.g.position.y + 1.9, C.z - Math.sin(y) * 2.6); b.camera.lookAt(C.x, u.g.position.y + 0.5, C.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('offer_side', 640, 1.3); cam.copy(c0); b.camera.quaternion.copy(q0); b.camera.fov = fv; b.camera.updateProjectionMatrix(); }
  const tb = [...D.querySelectorAll('button.choice')]; if (tb[0]) tb[0].click(); step(30); await sleep(300);
  log('after: stage', M.stage, 'dialog', b.state().dialogOpen, '| given', M.sketchGiven, 'in hand still', !!M.sketchW);
  step(60 * 8); log('8 s on: stage', M.stage);
}
// THE SAVE AT THE DOOR (2026-10-29, the owner: "make a save point after opening the door after the gargoyle fight"): XIII
// booted with him at your side, the four killed, you at the arch: it opened as you open it; the save it writes; and that
// save reloaded the way a death does — where you are, the door, him, the four. (its own profile)
export async function gargSave({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch, f = w.frameElement;
  M.stage = 'with'; M.ally = true; M.place = '?';
  const home = [b.C13_X + A.ax + A.ux * (A.L + 2.0), b.C13_Z + A.az + A.uz * (A.L + 2.0)];
  cam.set(home[0], cam.y, home[1]); for (let i = 0; i < 120; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
  G.phase = 1; for (const u of G.units) { u.gp.mode = 'recover'; b.hurtMutantTest(u, 999); }
  for (let i = 0; i < 240 && G.phase !== 2; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
  log('phase', G.phase, 'locked', b.gargLockedS && b.gargLockedS(), 'dead', G.units.filter((u) => !u.st.alive).length);
  localStorage.removeItem('beachwalk.save');
  b.openC13Arch(false); await sleep(1500); w.__c13Step(2);
  const sv = JSON.parse(localStorage.getItem('beachwalk.save') || 'null');
  log('saved', !!sv, sv && JSON.stringify({ room: sv.room, pos: sv.pos, arch: sv.flags.c13Arch, garg: sv.flags.garg, mino: sv.flags.mino, dead: sv.flags.deadUnits.filter((k) => /garg|kn/.test(k)).length }));
  if (!sv) return;
  const at0 = [cam.x, cam.z];
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
  f.contentWindow.location.reload(); await sleep(1500);
  let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
  const B = w2.__bw, btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
  for (let i = 0; i < 400 && (B.frozen() || !B.state().introDone || !(B.MINO.u && B.MINO.u.model)); i++) await sleep(100);
  try { await B.audioCtx.suspend(); } catch (e) { /* */ }
  await sleep(2500);
  const c2 = B.camera.position, M2 = B.MINO;
  log('after: room', B.devRoom(), 'inC13', B.state().inC13, 'from the save spot', Math.hypot(c2.x - at0[0], c2.z - at0[1]).toFixed(2), 'm | arch open', B.c13Dbg().archOpen,
    '| garg phase', B.GARG.phase, 'retired', B.GARG.units.filter((u) => u.retired).length, '| him', M2.stage, M2.u && Math.hypot(M2.u.g.position.x - c2.x, M2.u.g.position.z - c2.z).toFixed(1), 'm off, vis', M2.u && M2.u.g.visible, '| knights alive', B.knAlive());
}
// WHO TAKES HIM WHEN THE LIGHT ONE WAKES FIRST (2026-10-29, the owner: "make the big knight gaurding the throne room attack
// the minotaur first"): only the duelist woken; a second on, which is on him, and is the iron one awake. (own profile)
export async function knFirst({ w, b, log, sleep }) {
  const { M, u, K } = await mnCourt(w, b, sleep);
  b.settings.devMode = false;
  K[0].st.awake = true; K[0].st.roar = 0.3;
  for (let i = 0; i < 60; i++) { w.__c13Step(1); b.heal(); }
  log('on him:', K.map((k, i) => (i ? 'IRON' : 'MAN') + ' onMino ' + !!k.knOnMino + ' awake ' + !!k.st.awake + ' foe ' + (k.st.foe === u ? 'HIM' : k.st.foe ? 'other' : 'you')).join(' | '));
}
// HIS HEAD AND ARMS, FRAME TO FRAME, THROUGH HIS DEATH (2026-10-29, the owner: "his head keeps glitching around during the
// death scene and dialog … his arm keeps glitching too"): the minoKneel run, every frame each bone's turn since the frame
// before (world), by phase — the largest, and how many frames jumped more than 0.08 rad. (its own profile)
export async function minoJitter({ w, b, log, sleep }) {
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = true;
  for (const k of K) b.hurtMutantTest(k, 999);
  const cam = b.camera.position, Q = b.camera.quaternion.constructor, J = u.minoAuthor.J;
  const bones = { head: J.head, neck: J.neck, chest: J.chest, armL: J.armL, armR: J.armR, foreL: J.foreL, foreR: J.foreR, handL: u.model.getObjectByName('F4L'), handR: u.model.getObjectByName('F4R') };
  const prev = {}, S = {}; let phase = 'fight';
  const tick = (n, real = 0) => { for (let i = 0; i < n; i++) { w.__c13Step(1);
    for (const [nm, bn] of Object.entries(bones)) { if (!bn) continue; const q = bn.getWorldQuaternion(new Q()); if (prev[nm]) { const a = prev[nm].angleTo(q), k = phase + ' ' + nm, s = S[k] || (S[k] = { max: 0, big: 0, n: 0, at: 0 }); s.n++; if (a > s.max) { s.max = a; s.at = s.n; } if (a > 0.08) { s.big++; if ((nm === 'neck' || nm === 'head') && (w.__mjN = (w.__mjN || 0) + 1) < 60) log('  JUMP', phase, nm, a.toFixed(2), 'pre-look jump', (() => { const In = M.lookIn && M.lookIn.get(bn), P = w.__mjPre && w.__mjPre[nm]; return In && P ? In.angleTo(P).toFixed(2) : '-'; })(), 'restores', M.dbgRest || 0, 'look', (() => { const c = M.lookS && M.lookS.get(bn); return c ? (2 * Math.acos(Math.min(1, Math.abs(c.w)))).toFixed(2) : '-'; })(), 't', M.t.toFixed(2), M.stage, 'kneel', M.kneel, 'lookK', (M.lookK || 0).toFixed(2), 'base', !!M.base, 'acts', u.mixer._actions.filter((x) => x.enabled && x.getEffectiveWeight() > 0.01).map((x) => x.getClip().name + '@' + x.time.toFixed(2) + 'w' + x.getEffectiveWeight().toFixed(2) + (x.paused ? 'P' : '')).join(',')); } } prev[nm] = q; (w.__mjPre = w.__mjPre || {})[nm] = M.lookIn && M.lookIn.get(bn) ? M.lookIn.get(bn).clone() : null; } } };
  for (let i = 0; i < 60 * 10 && M.stage !== 'down'; i++) { cam.x = home[0]; cam.z = home[1]; tick(1); }
  phase = 'kneeling'; for (let i = 0; i < 60 * 7; i++) { cam.x = home[0]; cam.z = home[1]; tick(1); }
  const C = u.minoAuthor.J.chest.getWorldPosition(u.g.position.clone()), y = u.g.rotation.y;
  cam.set(C.x + Math.sin(y) * 2.2, u.g.position.y + 1.7, C.z + Math.cos(y) * 2.2); b.camBaseY = cam.y; b.lookAt(C.x, C.y, C.z); tick(2);
  b.minoTalk(); phase = 'talk on knee';
  const D = w.document.getElementById('dialog');
  for (let k = 0; k < 4; k++) { tick(20); await sleep(400); }
  const bs = [...D.querySelectorAll('button.choice')]; if (bs[0]) bs[0].click();
  for (let k = 0; k < 4; k++) { tick(20); await sleep(400); } D.click();
  phase = 'lying down'; for (let k = 0; k < 6; k++) { tick(50); await sleep(100); }
  phase = 'talk lying'; for (let k = 0; k < 6; k++) { tick(20); await sleep(500); } D.click(); for (let k = 0; k < 6; k++) { tick(20); await sleep(500); } D.click(); await sleep(300); D.click();
  phase = 'dying'; tick(60 * 7);
  phase = 'dead'; tick(60 * 4);
  log('stage at the end', M.stage);
  for (const [k, s] of Object.entries(S)) if (s.max > 0.03 || s.big) log(k.padEnd(24), 'frames', s.n, 'max jump', s.max.toFixed(3), 'rad at frame', s.at, '| over 0.08:', s.big);
}

export async function minoJitterBare(ctx) { ctx.w.__mnNoLook = true; return minoJitter(ctx); }

export async function minoArmLie(ctx) { ctx.w.__armClips = [['mnLie', 0.3, 1]]; return minoArm(ctx); }
// HIS BLINK (2026-10-29, "make him naturally blink as well must look good"): him at your side in XIII, close on his face,
// lids open and shut; and over twenty seconds how many blinks. (own profile)
export async function minoBlink({ w, b, log, sleep, shot }) {
  const { M, u } = await mnCourt(w, b, sleep);
  for (let i = 0; i < 30; i++) w.__c13Step(1);
  log('lids', !!u.mnLids, u.mnLids && u.mnLids.lids.length, u.mnLids && u.mnLids.lids.map((L) => L.r.toFixed(3) + ' @' + L.piv.position.toArray().map((q) => q.toFixed(3)).join(',')).join(' | '));
  let n = 0, was = 0; for (let i = 0; i < 60 * 20; i++) { w.__c13Step(1); const s = u.mnLids && u.mnLids.ph; if (s === 1 && was !== 1) n++; was = s; }
  log('blinks in 20 s', n);
  w.requestAnimationFrame = () => 0; log('vis', u.g.visible, u.model.visible);
  const H = u.bones.head, hp = H.getWorldPosition(u.g.position.clone()), y = u.g.rotation.y, cam = b.camera.position;
  b.camera.fov = 16; b.camera.updateProjectionMatrix();
  for (const [nm, ang] of [['face', 0], ['face34', 0.6]]) for (const [st, c] of [['open', -1.15], ['shut', 1.62], ['half', 0.25]]) {
    for (const L of u.mnLids.lids) L.hinge.rotation.x = c;
    cam.set(hp.x + Math.sin(y + ang) * 2.6, hp.y + 0.1, hp.z + Math.cos(y + ang) * 2.6); b.camera.lookAt(hp.x, hp.y - 0.02, hp.z); b.camera.updateMatrixWorld(true);
    b.renderer.render(b.scene, b.camera); shot('blink_' + nm + '_' + st, 400, 1.4);
  }
}
// A CHECKPOINT IN XIII, LOADED, TIMED (2026-10-29, the owner: "the minotaur isnt spawning in instantly at my checkpoint in
// the castle. make the load times in the castle as fast as possible"): him at your side by the arch, saved; reloaded the
// way a death does; from the reload, when the black lifts, when he is there (model, visible), and every file's arrival.
export async function c13Load({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch, f = w.frameElement;
  M.stage = 'with'; M.ally = true; M.place = '?';
  const home = [b.C13_X + A.ax + A.ux * (A.L + 2.0), b.C13_Z + A.az + A.uz * (A.L + 2.0)];
  for (let i = 0; i < 120; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
  b.saveCheckpoint();
  for (let run = 0; run < 2; run++) {
    sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
    const t0 = performance.now(); f.contentWindow.location.reload(); await sleep(300);
    let w2 = null; for (let i = 0; i < 400; i++) { await sleep(25); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
    const B = w2.__bw; let clicked = false, tLift = null, tMino = null, tModel = null;
    for (let i = 0; i < 2400 && !(tLift && tMino); i++) {
      if (!clicked) { const btn = w2.document.querySelector('.dc-restart'); if (btn) { btn.click(); clicked = performance.now() - t0; } }
      if (!tLift && clicked && !B.frozen() && B.state().introDone) tLift = performance.now() - t0;
      const u = B.MINO.u; if (!tModel && u && u.model) tModel = performance.now() - t0;
      const G = w2.__mlG || (w2.__mlG = {}), now = +((performance.now() - t0) / 1000).toFixed(2);
      const mark = (k, ok) => { if (ok && G[k] === undefined) G[k] = now; };
      mark('unit', !!u); mark('model', u && u.model); mark('laid', u && u.model && !u.minoLay); mark('packs', B.minoPacksIn && B.minoPacksIn()); mark('clips', u && u.model && !(u.clipsPending > 0));
      mark('tex', u && u.texW && u.texW.compiled); mark('visible', u && u.g.visible); mark('restored', B.MINO.restored === false || (u && !B.MINO.restored));
      if (!tMino && u && u.model && u.g.visible && !(u.clipsPending > 0)) tMino = performance.now() - t0;
      await sleep(25);
    }
    log('run', run, '| restart clicked', (clicked / 1000).toFixed(2), 's | black lifted', tLift && (tLift / 1000).toFixed(2), 's | his model', tModel && (tModel / 1000).toFixed(2), 's | him there', tMino && (tMino / 1000).toFixed(2), 's | room', B.devRoom());
    log('  his gates (s):', JSON.stringify(w2.__mlG));
    log('  files (name, s, MB):', JSON.stringify(B.loadLog().map((e) => [e[0].split('/').pop(), +(e[1] / 1000).toFixed(2), e[2]]).sort((a, c) => a[1] - c[1])));
    try { await B.audioCtx.suspend(); } catch (e) { /* */ }
    // and the frames after the black, as drawn (rAF intervals), ten seconds: what you would feel as lag
    const dts = []; let last = performance.now(), go = true;
    const loop = () => { const n = performance.now(); dts.push(n - last); last = n; if (go) w2.requestAnimationFrame(loop); };
    w2.requestAnimationFrame(loop); await sleep(10000); go = false;
    const sd = dts.slice(2).sort((a, c) => a - c), big = dts.map((d, k) => [d, k]).filter(([d]) => d > 50);
    log('  long spans (worst first):', JSON.stringify((B.lag ? B.lag() : []).slice(0, 12)));
    log('  frames after the black: n', sd.length, 'median', sd[sd.length >> 1].toFixed(1), 'p95', sd[Math.floor(sd.length * 0.95)].toFixed(1), 'max', sd[sd.length - 1].toFixed(1), 'ms | over 50 ms', big.length, JSON.stringify(big.slice(0, 12).map(([d, k]) => [+d.toFixed(0), k])));
  }
}
// FARMERS IN THE STONE (2026-10-29, the owner, with a screenshot of one sunk into the foot of a tower in the first castle's
// street: "farmers should not be getting stuck in these walls"): the street fight as played (him at your side), 60 s, you
// moving between three spots; every frame each farmer's body against the castle's wall index and the paving — the
// longest spell in the stone (or off the paving), where, and what he was doing. (own profile)
export async function fortStuck({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  const M = b.MINO, cam = b.camera.position;
  b.settings.devMode = false;
  M.stage = 'inside'; M.ally = true;
  b.placeInFort(); w.__c13Step(20);
  const S = b.FORT_SITE, h0 = [cam.x, cam.z], spots = [h0, [h0[0] + 4, h0[1] - 8], [h0[0] - 3, h0[1] - 16]];
  const R = new Map(); let t = 0, worst = null;
  for (let f = 0; f < 60 * 60; f++) {
    t += 1 / 60;
    const hm = spots[Math.floor(t / 20) % 3]; cam.x = hm[0]; cam.z = hm[1];
    w.__c13Step(1); b.heal();
    for (const u of b.farmUnitsS()) {
      if (!u.st.alive || !u.model || u.rag) continue;
      const p = u.g.position, r = (u.kind.body || 0.42) * 0.6;
      const wall = !!b.keepWallNear(p.x, p.z, r, p.y + 0.4, p.y + 1.6, S), off = b.fortCourtAt(p.x, p.z) === null;
      const st = R.get(u) || { run: 0, best: 0, at: null, what: '', n: 0, offN: 0 }; R.set(u, st);
      if (wall || off) { st.run += 1 / 60; st.n++; if (off) st.offN++; if (st.run > st.best) { st.best = st.run; st.at = [+(p.x - b.FORT_X).toFixed(1), +(p.z - b.FORT_Z).toFixed(1)]; st.what = (u.st.struck ? 'struck ' : '') + (u.st.foe ? 'on a unit ' : '') + (u.st.atk >= 0 ? 'swing ' + u.st.swing : u.cur ? u.cur.getClip().name : '-') + (off ? ' OFF PAVING' : '') + ' | out ' + !!(u.farm && u.farm.out) + ' burst ' + !!(u.farm && u.farm.burst) + ' legal ' + (u.st.fortLegal ? (Math.hypot(u.st.fortLegal.x - p.x, u.st.fortLegal.z - p.z)).toFixed(2) : 'none') + ' fortBody ' + !!u.kind.fortBody; } }
      else st.run = 0;
      if (st.best > 1 && (!worst || st.best > worst.best)) worst = { u, best: st.best };
    }
  }
  const rows = [...R.entries()].filter(([, s]) => s.n > 0).sort((a, c) => c[1].best - a[1].best);
  log('farmers seen', R.size, '| ever in the stone', rows.length, '| stuck over 1 s', rows.filter(([, s]) => s.best > 1).length, '| alive at the end', b.farmUnitsS().filter((x) => x.st.alive).length);
  for (const [u, s] of rows.slice(0, 10)) log('  ', u.kindName || u.kind.name || '?', 'longest', s.best.toFixed(2), 's at', JSON.stringify(s.at), 'frames in', s.n, '(off the paving', s.offN + ')', '|', s.what);
  if (worst) { const p = worst.u.g.position; w.requestAnimationFrame = () => 0; cam.set(p.x + 3, p.y + 1.8, p.z + 3); b.camera.lookAt(p.x, p.y + 1, p.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('stuck', 640, 1.4); }
}
// WHERE THEY COME OUT (2026-10-29): the first castle's street, stills of a spot (castle frame) from the street side
export async function fortSpot({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  b.placeInFort(); w.__c13Step(20);
  for (const u of b.farmUnitsS()) u.st.awake = false;
  const cam = b.camera.position, pts = w.__fsPts || [[-7.9, -15.3], [8.0, 1.8], [6.8, 13.6], [6.8, -6.7]];
  const doors = b.fortDoorsS ? b.fortDoorsS() : null; log('doors', doors ? JSON.stringify(doors.map((d) => [+(d.x).toFixed(1), +(d.z).toFixed(1)])) : 'n/a');
  w.requestAnimationFrame = () => 0; b.camera.fov = 70; b.camera.updateProjectionMatrix();
  pts.forEach(([lx, lz], i) => {
    const x = b.FORT_X + lx, z = b.FORT_Z + lz, f = b.fortCourtAt(x, z) ?? cam.y - 1.7;
    let best = null; for (let a = 0; a < 16; a++) { const ax = x + Math.sin(a / 16 * 6.283) * 5, az = z + Math.cos(a / 16 * 6.283) * 5; if (b.fortCourtAt(ax, az) !== null && !b.keepWallNear(ax, az, 0.3, f + 0.5, f + 2, b.FORT_SITE)) { best = [ax, az]; break; } }
    if (!best) best = [x + 5, z];
    cam.set(best[0], f + 1.7, best[1]); b.camera.lookAt(x, f + 1.0, z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('spot' + i, 480, 1.5);
  });
}

// the farmers' doors (castle frame), each shot straight on from four metres out along its own normal
export async function fortDoors({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5); w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  b.placeInFort(); w.__c13Step(20); for (const u of b.farmUnitsS()) u.st.awake = false;
  const P = b.fortDbg, D = P.farmDoors, cam = b.camera.position;
  w.requestAnimationFrame = () => 0; b.camera.fov = 60; b.camera.updateProjectionMatrix();
  D.forEach((d, i) => {
    const c = P.fortW(d.cx, d.cz), o = P.fortW(d.cx + d.n.x * 4, d.cz + d.n.z * 4), f = b.fortCourtAt(c.x, c.z) ?? b.fortCourtAt(o.x, o.z) ?? cam.y - 1.7;
    const iw = P.fortW(d.cx - d.n.x * 0.75, d.cz - d.n.z * 0.75), ow = P.fortW(d.cx + d.n.x * 3.4, d.cz + d.n.z * 3.4), yy = b.FORT_Y + d.yLo;
    const segHit = []; for (let k = 0; k <= 14; k++) { const q = k / 14, x = iw.x + (ow.x - iw.x) * q, z = iw.z + (ow.z - iw.z) * q; segHit.push(b.fortDbg.keepWallNear(x, z, 0.22, yy + 0.4, yy + 1.6, b.FORT_SITE) ? '#' : (b.fortCourtAt(x, z) !== null ? (P.farmCobble(x, z) ? 'c' : '.') : '_')); }
    log('  path in→out (0.75 in .. 3.4 out):', segHit.join(''), 'door frame at', Math.round(0.75 / 4.15 * 14));
    log('door', i, 'at', (c.x - b.FORT_X).toFixed(1), (c.z - b.FORT_Z).toFixed(1), 'out', d.out, 'leaf visible', d.leaf && d.leaf.visible, 'W', d.W && d.W.toFixed(2), 'H', d.H && d.H.toFixed(2));
    if (Math.hypot(c.x - b.FORT_X - 8, c.z - b.FORT_Z - 1.8) < 3) for (const sg of [1, -1]) { const oo = P.fortW(d.cx + d.n.x * 4.5 * sg, d.cz + d.n.z * 4.5 * sg); cam.set(oo.x, f + 1.6, oo.z); b.camera.lookAt(c.x, f + 1.1, c.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('door' + i + (sg > 0 ? 'p' : 'm'), 560, 1.5); }
    if (false) { cam.set(o.x, f + 1.6, o.z); b.camera.lookAt(c.x, f + 1.1, c.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('door' + i, 560, 1.5); }
  });
}
// INTO THE THRONE ROOM (2026-10-29, the owner: "no one spawned in the thrown room then i completely froze while playing"):
// XIII with the two at its door dead and him down, through the door as the game does it; every frame's CPU (a frozen
// frame is seconds), who is in the room, and the long spans. (own profile)
export async function throneIn({ w, b, log, sleep }) {
  const { M, u, K, home } = await mnCourt(w, b, sleep);
  b.settings.devMode = false;
  for (const k of K) b.hurtMutantTest(k, 999);
  for (let i = 0; i < 60 * 4; i++) { w.__c13Step(1); b.heal(); }
  log('before: in XIII', b.state().inC13, 'files waiting', JSON.stringify(b.bootLeft ? b.bootLeft().waiting.slice(0, 12) : '?'));
  let worst = 0, t0 = performance.now();
  try { b.startThrone(1); } catch (e) { log('startThrone threw', e.message); }
  for (let i = 0; i < 60 * 20 && !b.state().inThrone; i++) { const s0 = performance.now(); w.__c13Step(1); worst = Math.max(worst, performance.now() - s0); b.heal(); if (i % 30 === 0) { try { b.startThrone(1); } catch (e) { /* */ } await sleep(30); } }
  log('in the throne room', b.state().inThrone, 'after', ((performance.now() - t0) / 1000).toFixed(1), 's, worst frame', worst.toFixed(0), 'ms');
  const ms = []; for (let i = 0; i < 60 * 15; i++) { const s0 = performance.now(); w.__c13Step(1); ms.push(performance.now() - s0); b.heal(); if (i % 60 === 0) await sleep(20); }
  ms.sort((a, c) => a - c);
  const D = b.danteU && b.danteU();
  log('15 s in it: frame median', ms[ms.length >> 1].toFixed(1), 'max', ms[ms.length - 1].toFixed(0), 'ms | dante', !!D, D && !!D.model, D && D.g.visible, D && D.st && D.st.awake, '| units in the room', b.mutantsS().filter((x) => x.st.alive && Math.hypot(x.g.position.x - b.camera.position.x, x.g.position.z - b.camera.position.z) < 40).map((x) => x.kindName || '?').join(','));
  log('long spans', JSON.stringify((b.lag ? b.lag(100) : []).slice(0, 8)), '| threw', JSON.stringify((b.threw ? b.threw() : []).slice(0, 3)));
}

export async function minoArchFar(ctx) { ctx.w.__maWalk = 16; ctx.w.__maOff = 0.0; return minoArch(ctx); }

// the gargoyle's rig and maps, listed
export async function gargRig({ w, b, log, sleep }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const u = b.GARG.units[0], names = [];
  u.model.traverse((o) => { if (o.isBone) names.push(o.name); });
  log('bones', names.length, names.join(' '));
  const mats = new Set(); u.model.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); });
  for (const m of mats) log('mat', m.name, 'map', m.map && m.map.image && (m.map.image.width + 'x' + m.map.image.height), 'shared with unit1', b.GARG.units[1] && (() => { let sh = false; b.GARG.units[1].model.traverse((o) => { if (o.isMesh && o.material === m) sh = true; }); return sh; })(), 'mapShared', b.GARG.units[1] && (() => { let sh = false; b.GARG.units[1].model.traverse((o) => { if (o.isMesh && o.material.map === m.map) sh = true; }); return sh; })());
  log('meshes', (() => { const r = []; u.model.traverse((o) => { if (o.isMesh) r.push(o.name + ':' + o.geometry.attributes.position.count + (o.isSkinnedMesh ? 'S' : '')); }); return r.join(' '); })());
}
// THE GARGOYLES GIVING (2026-10-29: "start to visually crack more as their health gets lower … make ones wings just break
// off then he crawls at you very fast to try and bite you"): XIII, the four down off the walls; one beaten a blow at a
// time with stills of it as it cracks; the one whose wings go, on the ground, coming, biting; and your blows on it.
export async function gargTail(ctx) { ctx.w.__tailTry = true; return gargCrawl(ctx); }
export async function gargCrawl({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch;
  M.stage = 'with'; M.ally = true; M.place = '?';
  b.settings.devMode = false;
  const home = [b.C13_X + A.ax + A.ux * (A.L + 4.0), b.C13_Z + A.az + A.uz * (A.L + 4.0)];
  cam.set(home[0], cam.y, home[1]); for (let i = 0; i < 60; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
  b.gargTryDoor(); if (b.state().dialogOpen) b.endDialog();
  for (let i = 0; i < 60 * 6; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); b.heal(); }
  const u = G.units.find((x) => x.st.alive && !['perch', 'wake', 'drop'].includes(x.gp.mode));
  log('modes', G.units.map((x) => x.gp.mode).join(','), '| chosen', u && u.gp.i, 'hp', u && u.st.hp);
  if (!u) return;
  // (the LAST of them crawls, 2026-10-29: the other three broken first)
  for (const o of G.units) if (o !== u && o.st.alive) b.hurtMutantTest(o, 999);
  for (let i = 0; i < 30; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); b.heal(); }
  log('alive after the three', G.units.filter((x) => x.st.alive).length, 'key yet', !!w.__bw.gargKeyS());
  const V = cam.constructor, still = (nm) => { const hb = u.model.getObjectByName('Hip'), P = hb ? hb.getWorldPosition(new V()) : u.g.position.clone(), c0 = cam.clone(), q0 = b.camera.quaternion.clone(); const fl = b.c13CourtAt(P.x, P.z) ?? P.y - 1; let at = null; for (let k = 0; k < 16 && !at; k++) { const a = u.g.rotation.y + k / 16 * Math.PI * 2, x = P.x + Math.sin(a) * 3.2, z = P.z + Math.cos(a) * 3.2; if (b.c13CourtAt(x, z) !== null && !b.keepWallNear(x, z, 0.5, fl + 0.5, fl + 2, b.C13_SITE) && !b.keepHitsWall(x, z, P.x, P.z, fl + 1.0, b.C13_SITE)) at = [x, z]; } if (!at) at = [P.x + 2.2, P.z + 2.2]; b.camera.fov = 60; b.camera.updateProjectionMatrix(); cam.set(at[0], fl + 2.7, at[1]); b.camera.lookAt(P.x, P.y, P.z); b.camera.updateMatrixWorld(true); const mine = new Set(); u.g.traverse((o) => mine.add(o)); const hid = []; const W = new V(); b.scene.traverse((o) => { if (!o.isMesh || !o.visible || mine.has(o)) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); if (o.isSkinnedMesh || (g.boundingSphere.radius < 2.5 && o.getWorldPosition(W).distanceTo(P) < 4)) hid.push(o); }); for (const o of hid) o.visible = false; b.renderer.render(b.scene, b.camera); for (const o of hid) o.visible = true; shot(nm, 480, 1.4); cam.copy(c0); b.camera.quaternion.copy(q0); };
  for (let k = 0; k < 8 && u.st.alive && !u.gp.crawl; k++) { const bd0 = b.bloodDropsN(); b.hurtMutantTest(u, 3, 0.4); log('  blood drops from that blow', b.bloodDropsN() - bd0); for (let i = 0; i < 8; i++) { w.__c13Step(1); b.heal(); } log('  hit', k, 'hp', u.st.hp, 'cracks', u.gCrack && u.gCrack.drawn, 'crawl', !!u.gp.crawl); if (k === 1 || k === 3) still('crack' + k); }
  log('wings broken', !!u.gp.crawl, 'wingless is it', G.wingless === u, 'wing bones', (u.gWingGone || []).length);
  let landedT = null, bites = 0, hurt0 = w.__ggLanded || 0, t = 0, minD = 99;
  const hp0 = b.state().hp;
  for (let i = 0; i < 60 * 8; i++) {
    cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); t += 1 / 60;
    if (u.gp.cph === 'run' && landedT === null) { landedT = t; still('crawl_land'); }
    if (u.gp.cph === 'bite' && u.gp.ck < 0.02) bites++;
    minD = Math.min(minD, Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z));
    if (i === 200) still('crawl_run'); if (i === 320) still('crawl_run2');
    if (i === 229) { let n = 0, vis = 0, sk = 0, par = []; u.g.traverse((o) => { if (o.isMesh) { n++; if (o.visible) vis++; if (o.isSkinnedMesh) sk++; } }); let q = u.g; while (q) { par.push((q.name || q.type) + (q.visible ? '' : '(hidden)')); q = q.parent; } const M0 = []; u.g.traverse((o) => { if (o.isMesh) { const m = o.material, g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const c = g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld); M0.push((o.name || '?') + ' mv' + (m.visible ? 1 : 0) + ' op' + (+m.opacity).toFixed(2) + ' tr' + (m.transparent ? 1 : 0) + ' fc' + (o.frustumCulled ? 1 : 0) + ' bs' + g.boundingSphere.radius.toFixed(2) + ' d' + c.distanceTo(u.g.position).toFixed(1) + ' sc' + o.getWorldScale(c.clone()).x.toFixed(3)); } }); log('crawler mats', M0.join(' | ')); { let o = null; u.g.traverse((x) => { if (!o && x.isMesh) o = x; }); const ch = []; while (o) { ch.push((o.name || o.type) + (o.visible ? '' : '(HIDDEN)')); o = o.parent; } log('mesh chain', ch.join('<')); const H = u.gB.Hip.getWorldPosition(new V()), sp = H.clone().project(b.camera); log('hip on screen', sp.x.toFixed(2), sp.y.toFixed(2), sp.z.toFixed(3), 'hip', H.toArray().map((v) => v.toFixed(1)).join(','), 'cam', cam.toArray().map((v) => v.toFixed(1)).join(',')); } log('crawler meshes', n, 'visible', vis, 'skinned', sk, 'chain', par.join('<'), 'model in g', !!(u.model && u.model.parent), 'model scale', u.model && u.model.scale.x.toFixed(3), 'pos', u.g.position.toArray().map((v) => v.toFixed(1)).join(',')); }
    if (i === 230 || i === 236) { const T = b.camera.layers.mask, NM = new (b.THREE || w.__bw.THREE).MeshNormalMaterial(), P = u.gB.Hip.getWorldPosition(u.g.position.clone()), y = u.g.rotation.y, c0 = cam.clone(), q0 = b.camera.quaternion.clone();
      const off = b.scene.children.filter((o) => o !== u.g && o.visible); for (const o of off) o.visible = false; b.scene.overrideMaterial = NM; b.camera.fov = 45; b.camera.updateProjectionMatrix();
      for (const [nm, a] of [['side', Math.PI / 2], ['front', 0.25]]) { cam.set(P.x + Math.sin(y + a) * 4.5, P.y + 0.5, P.z + Math.cos(y + a) * 4.5); b.camera.lookAt(P.x, P.y - 0.2, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('cr_' + nm + i, 360, 1.3); if (nm === 'side') { b.scene.overrideMaterial = null; for (const o of off) o.visible = true; b.renderer.render(b.scene, b.camera); shot('cr_full' + i, 360, 1.3); for (const o of off) o.visible = false; b.scene.overrideMaterial = NM; } }
      b.scene.overrideMaterial = null; for (const o of off) o.visible = true; cam.copy(c0); b.camera.quaternion.copy(q0); }
    if (i === 260) { const B = u.gB, fl = b.c13CourtAt(u.g.position.x, u.g.position.z), V = u.g.position.constructor, hy = (n) => B[n] ? +(B[n].getWorldPosition(new V()).y - fl).toFixed(2) : null;
      const row = () => ['Hip', 'Head', 'JawTip', 'Tail1', 'Tail3', 'Tail5', 'Tail8', 'Ankle_Left'].map((n) => n + ' ' + hy(n)).join(' ');
      log('crawl heights', row());
      if (w.__tailTry) { const x0 = u.g.rotation.x, y0 = u.g.position.y; for (const pt of [0.0, 0.2, 0.4, 0.6, 0.8, 1.1]) { u.g.rotation.x = pt; u.g.updateMatrixWorld(true); log(' pitch', pt, row(), 'Neck', hy('Neck'), 'Spine3', hy('Spine3')); } u.g.rotation.x = x0; u.g.updateMatrixWorld(true); }
      if (w.__tailTry) for (const a of [0.8, -0.8]) { const q0 = B.Tail1.quaternion.clone(); w.__bw.gargBodyTurnT(u, B.Tail1, a); u.g.updateMatrixWorld(true); log(' Tail1 turned', a, row()); B.Tail1.quaternion.copy(q0); u.g.updateMatrixWorld(true); } }
    if (b.state().hp < hp0) { b.heal(); }
  }
  log('on the ground after', landedT && landedT.toFixed(2), 's | bites', bites, '| nearest to you', minD.toFixed(2), 'm | its height over the floor', (u.g.position.y - b.c13CourtAt(u.g.position.x, u.g.position.z)).toFixed(2), 'crawlH', u.gp.crawlH && u.gp.crawlH.toFixed(2));
  // your swing at it, low, as you would
  b.lookAt(u.g.position.x, u.g.position.y, u.g.position.z);
  log('your blade reaches it (meleeT span)', JSON.stringify(u.meleeSpan));
  for (let k = 0; k < 10 && u.st.alive; k++) { b.hurtMutantTest(u, 3, 0.4); for (let i = 0; i < 10; i++) { w.__c13Step(1); b.heal(); } }
  log('finished', !u.st.alive, 'mode', u.gp.mode);
  // the key out of it: falling, landing, lying in its glint; taken; the door
  for (let i = 0; i < 120; i++) { w.__c13Step(1); }
  const K = w.__bw.gargKeyS(); log('key', K ? K.st : 'none', K ? 'at y-floor ' + (K.g.position.y - b.c13CourtAt(K.g.position.x, K.g.position.z)).toFixed(3) + ' from you ' + Math.hypot(K.g.position.x - cam.x, K.g.position.z - cam.z).toFixed(1) : '', '| door locked', b.gargLockedS());
  if (K) { const c0 = cam.clone(); cam.set(K.g.position.x + 1.2, K.g.position.y + 1.2, K.g.position.z + 1.2); b.camera.lookAt(K.g.position.x, K.g.position.y, K.g.position.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('key_lies', 480, 1.3); cam.copy(c0); }
  w.__bw.gargTakeKey(); log('taken: door locked', b.gargLockedS(), 'garg save', JSON.stringify(w.__bw.gargSaveS()));
}
// SKRIM IN THE WHALE (2026-10-29): into the belly; him placed under the widest wound's moonbeam, digging; stills; the
// prompt, the talk through to "I tried to be nice."; then his fight for 40 s with you standing your ground at 7 m,
// blocking now and then: what he throws and how it lands. (own profile)
export async function skrimIn({ w, b, log, sleep, shot }) {
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
  b.placeInWhale();
  const S = b.SKRIM, cam = b.camera.position;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u;
  log('skrim', !!u, 'model', !!(u && u.model), 'placed', S.placed, 'clips', u && Object.keys(u.clips).length, 'crouchIdle', !!(u && u.clips.crouchIdle), 'spot', JSON.stringify(b.whaleS() && b.whaleS().arena && b.whaleS().arena.skrimSpot && { x: +b.whaleS().arena.skrimSpot.x.toFixed(2), s: +b.whaleS().arena.skrimSpot.s.toFixed(2), w: +b.whaleS().arena.skrimSpot.w.toFixed(2) }));
  if (!u || !u.model) return;
  for (let i = 0; i < 30; i++) b.frame(1);
  const P = u.g.position, y = u.g.rotation.y;
  w.__rafOrig = w.__rafOrig || w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = () => 0;
  const shotFrom = (nm, ang, d, h, fov = 50) => { b.camera.fov = fov; b.camera.updateProjectionMatrix(); cam.set(P.x + Math.sin(y + ang) * d, P.y + h, P.z + Math.cos(y + ang) * d); b.camera.lookAt(P.x, P.y + 0.7, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 560, 1.2); };
  shotFrom('dig_front', 0.5, 3.2, 1.6); shotFrom('dig_side', 1.9, 3.0, 1.5); shotFrom('dig_far', 0.9, 7.5, 2.2, 60);
  log('hips over floor', (() => { const hb = u.model.getObjectByName('Character1_Hips'); return hb ? +(hb.getWorldPosition(P.clone()).y - P.y).toFixed(2) : null; })());
  if (w.__skFace) {
    const g = (n) => u.model.getObjectByName(n), V3 = cam.constructor, wp = (o) => o.getWorldPosition(new V3());
    u.g.updateMatrixWorld(true);
    const eL = wp(g('c_eye_l')), eR = wp(g('c_eye_r')), H = wp(g('Character1_Head')), mid = eL.clone().add(eR).multiplyScalar(0.5);
    log('eye L to lid top_01 origin', eL.distanceTo(wp(g('c_eyelid_top_01_l'))).toFixed(3), 'bot_01', eL.distanceTo(wp(g('c_eyelid_bot_01_l'))).toFixed(3), 'eyes apart', eL.distanceTo(eR).toFixed(3));
    const fwd = mid.clone().sub(H).normalize(), at = mid.clone().addScaledVector(fwd, 0.42);
    const lat = eR.clone().sub(eL).normalize(), Q = b.camera.quaternion.constructor;
    const tops = ['01', '02', '03'].flatMap((k) => ['l', 'r'].map((sd) => g('c_eyelid_top_' + k + '_' + sd))), bots = ['01', '02', '03'].flatMap((k) => ['l', 'r'].map((sd) => g('c_eyelid_bot_' + k + '_' + sd)));
    const turn = (bn, ang) => { const qW = new Q().setFromAxisAngle(lat, ang), p = new Q(); bn.parent.getWorldQuaternion(p); const pi = p.clone().invert(); bn.quaternion.premultiply(pi.multiply(qW).multiply(p)); };
    const shotF = (nm, aT, aB) => { const keep = [...tops, ...bots].map((x) => x.quaternion.clone()); for (const x of tops) turn(x, aT); for (const x of bots) turn(x, aB); u.g.updateMatrixWorld(true);
      b.camera.fov = 28; b.camera.updateProjectionMatrix(); cam.copy(at); b.camera.lookAt(mid.x, mid.y, mid.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 320, 1.2);
      [...tops, ...bots].forEach((x, i) => x.quaternion.copy(keep[i])); u.g.updateMatrixWorld(true); };
    shotF('face_open', 0, 0);
    // "bro…": you 3 m off his side at standing height; his head up onto you
    const P = u.g.position, yy = u.g.rotation.y, me = new V3(P.x + Math.sin(yy + 1.0) * 3, P.y + 1.62, P.z + Math.cos(yy + 1.0) * 3);
    const look = (nm) => { cam.copy(me); b.camera.fov = 13; b.camera.updateProjectionMatrix(); const H2 = g('Character1_Head').getWorldPosition(new V3()); b.camera.lookAt(H2.x, H2.y + 0.02, H2.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 420, 1.2); };
    cam.copy(me); for (let i = 0; i < 60; i++) b.updateSkrimLife(1 / 60); look('bro_before');
    b.SKRIM.lookT = 4.8; for (let i = 0; i < 30; i++) { cam.copy(me); b.updateSkrimLife(1 / 60); } look('bro_pause');
    for (let i = 0; i < 90; i++) { cam.copy(me); b.updateSkrimLife(1 / 60); } { const f = b.skrimFaceDir(u, u.skJ), d = me.clone().sub(u.skEm).normalize(); log('bro: face to your eye', (f.angleTo(d) * 57.3).toFixed(1), 'deg; face pitch', (Math.asin(f.y) * 57.3).toFixed(1), 'eye pitch', (Math.asin(d.y) * 57.3).toFixed(1)); } look('bro_look');
    for (let i = 0; i < 240; i++) { cam.copy(me); b.updateSkrimLife(1 / 60); } look('bro_after');
    log('lids', !!u.skLids, 'tops', u.skLids && u.skLids.top.length, 'bots', u.skLids && u.skLids.bot.length);
    return;
  }
  if (w.__skPerf) {
    // what a frame in here costs, by part: the world drawn and finished (a 1-px read syncs the GPU), and the update step
    const run = (sec) => { for (let i = 0; i < sec * 60; i++) { b.step(1 / 60); b.updateSkrimLife(1 / 60); b.updateSkrimMood(1 / 60); } b.lamps(); };
    const R = b.renderer, gl = R.getContext(), px = new Uint8Array(4), A = b.whaleS().arena, G = b.whaleS().G;
    R.setSize(1280, 720, false);
    const at = (dd, h, ang) => { cam.set(P.x + Math.sin(y + ang) * dd, P.y + h, P.z + Math.cos(y + ang) * dd); b.camera.fov = 70; b.camera.updateProjectionMatrix(); b.camera.lookAt(P.x, P.y + 0.6, P.z); b.camera.updateMatrixWorld(true); b.lamps(); };
    const gpu = (n = 40) => { R.render(b.scene, b.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now(); for (let i = 0; i < n; i++) { R.render(b.scene, b.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t) / n; };
    const cpu = (n = 60) => { const t = performance.now(); for (let i = 0; i < n; i++) { b.step(1 / 60); b.updateSkrimLife(1 / 60); b.updateSkrimMood(1 / 60); } return (performance.now() - t) / n; };
    const tog = (list, v) => { for (const o of list || []) if (o) o.visible = v; };
    for (const [where, dd, h, ang] of [['near him', 5, 1.6, 0.6], ['across the gut', 14, 1.6, 0.9]]) {
      at(dd, h, ang); run(1);
      const base = gpu(), info = R.info.render;
      const mist = A.mist ? A.mist.layers : [], rays = A.rays ? A.rays.rays : [], motes = (A.motes || []).map((m) => m.sp), air = A.air ? A.air.list : [];
      tog(mist, false); const noMist = gpu(); tog(mist, true);
      tog(rays, false); const noRays = gpu(); tog(rays, true);
      tog(motes, false); const noMotes = gpu(); tog(motes, true);
      tog(air, false); const noAir = gpu(); tog(air, true);
      const vis = G.visible; G.visible = false; const noWhale = gpu(); G.visible = vis;
      log('PERF', where, '| frame ms', base.toFixed(2), 'draws', info.calls, 'tris', info.triangles, '| without: mist', noMist.toFixed(2), 'rays', noRays.toFixed(2), 'motes', noMotes.toFixed(2), 'air', noAir.toFixed(2), 'the whole whale', noWhale.toFixed(2), '| update step ms', cpu().toFixed(2));
    }
    // and the real loop, near him, as he digs: every frame's length, and what held the thread when one ran long
    w.requestAnimationFrame = w.__rafOrig; b.animate && b.animate();
    at(4, 1.6, 0.6); const lag0 = b.lag().length, dl = []; let last = performance.now(), go = true;
    (function tick() { const n = performance.now(); dl.push(n - last); last = n; if (go) w.requestAnimationFrame(tick); })();
    await sleep(15000); go = false;
    const sr = dl.slice(5).sort((a, c) => a - c), q = (f) => sr[Math.floor(sr.length * f)].toFixed(1);
    log('LOOP near him 15 s | frames', sr.length, 'p50', q(0.5), 'p95', q(0.95), 'p99', q(0.99), 'max', sr[sr.length - 1].toFixed(0), '| over 33 ms', sr.filter((d) => d > 33).length, 'over 50', sr.filter((d) => d > 50).length);
    const L = b.lag().slice(lag0), sum = {}; for (const e of L) { const k = String(e[2]).replace(/\d+/g, '#'); sum[k] = (sum[k] || 0) + e[1]; }
    log('LOOP spans over 16 ms', L.length, JSON.stringify(Object.entries(sum).sort((a, c) => c[1] - a[1]).slice(0, 12).map(([k, v]) => k + ':' + Math.round(v))));
    return;
  }
  if (w.__skChains) {
    b.skcInit(u); const C = b.SKC, L = u.model.getObjectByName('Character1_LeftHand'), R = u.model.getObjectByName('Character1_RightHand');
    const lk = (nm, ang, dd, h, at) => { b.camera.fov = 50; b.camera.updateProjectionMatrix(); cam.set(at.x + Math.sin(y + ang) * dd, at.y + h, at.z + Math.cos(y + ang) * dd); b.camera.lookAt(at.x, at.y, at.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 560, 1.2); };
    // a thrown hook, frozen halfway to a point 6 m in front of him
    cam.set(P.x + Math.sin(y) * 7, P.y + 1.6, P.z + Math.cos(y) * 7);
    const T = b.skcThrow(u, L, 0, true); for (let i = 0; i < 12; i++) b.updateSkrimChains(1 / 60);
    log('throw links', C.n, 'tip', T.p.toArray().map((v) => v.toFixed(1)).join(','), 'hook visible', !!T.hook);
    lk('ch_throw_side', 1.57, 3.2, 0.4, T.p.clone().lerp(u.g.position.clone().setY(T.p.y), 0.4)); lk('ch_hook_close', 1.2, 0.9, 0.15, T.p);
    C.list.length = 0; b.updateSkrimChains(1 / 60);
    const at = u.g.position.clone().add(cam.clone().sub(u.g.position).setY(0).normalize().multiplyScalar(4)); at.y = u.g.position.y;
    b.skcPit(u, at); for (let i = 0; i < 20; i++) b.updateSkrimChains(1 / 60);
    log('pit links', C.n); lk('ch_pit', 0.9, 5.5, 1.6, at.clone().setY(at.y + 1.3));
    for (let i = 0; i < 120; i++) b.updateSkrimChains(1 / 60);
    { const q = u.g.position, T = b.skcTell(q.x, q.z, 5.4, 0.6), E = b.skcRingEdge(u, q, 0.6); for (let i = 0; i < 24; i++) b.updateSkrimChains(1 / 60);
      log('ring tell edge chains', E.length, 'links', C.n); lk('ch_ring_tell', 0.6, 8, 2.5, q.clone().setY(q.y + 1)); T.done = true; }
    b.skcRing(u, u.g.position.clone()); for (let i = 0; i < 16; i++) b.updateSkrimChains(1 / 60);
    log('ring links', C.n); lk('ch_ring', 0.6, 8, 2.5, u.g.position.clone().setY(u.g.position.y + 1));
    for (let i = 0; i < 120; i++) b.updateSkrimChains(1 / 60);
    const sw = b.skcSweep(u, R); for (let i = 0; i < 12; i++) b.updateSkrimChains(1 / 60);
    log('sweep links', C.n); lk('ch_sweep', 0.4, 6, 2.2, u.g.position.clone().setY(u.g.position.y + 1));
    return;
  }
  if (w.__skLight) {
    const G = b.WH_GL, sh = (nm) => { cam.set(P.x + Math.sin(y + 0.6) * 4, P.y + 1.6, P.z + Math.cos(y + 0.6) * 4); b.camera.fov = 55; b.camera.updateProjectionMatrix(); b.camera.lookAt(P.x, P.y + 0.7, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 400, 1.2); };
    log('uWhMoon', G.uWhMoon.value, 'uWhN', G.uWhN.value, 'exposure', b.renderer.toneMappingExposure, 'lights', (() => { let n = 0, s = []; b.scene.traverse((o) => { if (o.isLight && o.visible && o.intensity > 0) { n++; const d = o.getWorldPosition(cam.clone()).distanceTo(P); if (d < 30 || !o.isPointLight) s.push(o.type + ':' + o.intensity.toFixed(2) + '@' + d.toFixed(0)); } }); return n + ' ' + s.join(' '); })());
    { const A = b.whaleS().arena, fills = new Set((A.fills || []).map((f) => f.L)), moons = new Set((A.moonLamps || []).map((m) => m.L)); const rows = [];
      b.scene.traverse((o) => { if (o.isPointLight && o.visible && o.intensity > 0) { const d = o.getWorldPosition(cam.clone()).distanceTo(P); if (d < 25) rows.push(o.intensity.toFixed(1) + '@' + d.toFixed(0) + ' dist' + o.distance + ' dec' + o.decay + ' ' + (fills.has(o) ? 'FILL' : moons.has(o) ? 'MOON' : (o.name || o.parent && o.parent.name || '?')) + (o.userData.lpReal ? ' real' : '')); } });
      log('near lights', rows.join(' | ')); }
    sh('L0_base');
    const m0 = G.uWhMoon.value; G.uWhMoon.value = 0; sh('L1_nowash'); G.uWhMoon.value = m0;
    const n0 = G.uWhN.value; G.uWhN.value = 0; sh('L2_noglands'); G.uWhN.value = n0;
    const off = []; b.scene.traverse((o) => { if (o.isLight && o.intensity > 0) { off.push([o, o.intensity]); o.intensity = 0; } }); sh('L3_nolights'); for (const [o, i] of off) o.intensity = i;
    G.uWhMoon.value = 0; G.uWhN.value = 0; for (const [o] of off) o.intensity = 0; sh('L4_nothing'); G.uWhMoon.value = m0; G.uWhN.value = n0; for (const [o, i] of off) o.intensity = i;
    return;
  }
  if (w.__skDigOnly) {
    // the search on fixed steps, through each of its three things; the approach's mood far and near
    const R = () => u.sk.sr || {}, run = (sec) => { for (let i = 0; i < sec * 60; i++) { b.step(1 / 60); b.updateSkrimLife(1 / 60); b.updateSkrimMood(1 / 60); } b.lamps(); };
    const ws = b.whaleS(), A = ws.arena; log('bones in the heap', (A.skrimBones || []).length, 'motes', (A.motes || []).length);
    cam.set(P.x + Math.sin(y + 0.6) * 16, P.y + 1.6, P.z + Math.cos(y + 0.6) * 16); run(3); log('cine from 16 m', b.whMood.cine.toFixed(2));
    { const H = () => u.skJ.head.getWorldPosition(P.clone()), K = b.SK_POSTURE, k0 = K.straight, res = [], J = u.skJ, s1 = u.model.getObjectByName('Character1_Spine1');
      const bends = () => { const ft = ['Character1_LeftFoot', 'Character1_RightFoot'].map((n) => u.model.getObjectByName(n)).filter(Boolean).map((o) => o.getWorldPosition(P.clone())); const p = [J.hip, J.waist, s1, J.chest, J.neck, J.head].map((o) => o.getWorldPosition(P.clone())); const feet = ft.map((f) => f.toArray().map((v) => v.toFixed(2)).join(',')).join(' '); const d = [], latv = new (b.THREE.Vector3)(Math.cos(y), 0, -Math.sin(y)); for (let i = 1; i < 5; i++) { const a1 = p[i].clone().sub(p[i - 1]).normalize(), a2 = p[i + 1].clone().sub(p[i]).normalize(); d.push((Math.sign(a1.clone().cross(a2).dot(latv)) * a1.angleTo(a2) * 57.3).toFixed(0)); } const back = p[4].clone().sub(p[1]); return 'hip>waist>sp1>sp2>neck>head ' + d.join('/') + ' | back from upright ' + (Math.acos(back.y / back.length()) * 57.3).toFixed(0) + ' | feet ' + feet; };
      const LB = b.SK_LOWBACK, lb0 = LB.tuck, t0 = K.tuck, r0 = K.round; for (const [kk, tk, rr] of [[0, 0, 0], [1, 0, 0]]) { LB.tuck = kk ? lb0 : 0; K.straight = 0; K.tuck = tk; K.round = rr; const keep = b.skrimPosture; cam.set(P.x + Math.sin(y + 1.57) * 6, P.y + 1.6, P.z + Math.cos(y + 1.57) * 6); for (let i = 0; i < 30; i++) b.updateSkrimLife(1 / 60); const h = H(); res.push('straight ' + kk + ' tuck ' + tk + ': head y ' + (h.y - P.y).toFixed(3) + ' fwd ' + ((h.x - P.x) * Math.sin(y) + (h.z - P.z) * Math.cos(y)).toFixed(3) + ' bends ' + bends() + ' deg'); shotFrom('posture_' + kk + '_' + tk, 1.57, 3.2, 1.0, 45); }
      LB.tuck = lb0; K.tuck = t0; K.round = r0; K.straight = k0; log('POSTURE', res.join(' | ')); }
    shotFrom('mood_far', 0.6, 16, 1.6, 60);
    { const ws = b.whaleS(), G = ws.G, T = b.THREE, rc = new T.Raycaster(), rows = [];
      for (const dd of [16, 13, 10, 7, 4]) { const x = P.x + Math.sin(y + 0.6) * dd, z = P.z + Math.cos(y + 0.6) * dd; rc.set(new T.Vector3(x, P.y + 6, z), new T.Vector3(0, -1, 0)); const ms = []; G.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.isSprite) ms.push(o); }); rc.camera = b.camera; const hits = rc.intersectObjects(ms, false).filter((h) => h.object.isMesh && !h.object.userData.bwGhost && h.object.material && !h.object.material.transparent); const fl = b.skrimFloorW(x, z); rows.push(dd + 'm: drawn ' + (hits[0] ? (hits[0].point.y - fl).toFixed(2) : 'none') + ' (' + (hits[0] ? (hits[0].object.name || hits[0].object.type) : '') + ')'); }
      log('drawn floor over the walked floor', rows.join(' | ')); }
    cam.set(P.x + Math.sin(y + 0.6) * 9, P.y + 1.6, P.z + Math.cos(y + 0.6) * 9); run(4); shotFrom('mood_mid', 0.6, 9, 1.6, 55); shotFrom('mood_low', 1.4, 7, 0.9, 62);
    cam.set(P.x + Math.sin(y + 0.6) * 4, P.y + 1.6, P.z + Math.cos(y + 0.6) * 4); run(5); log('cine from 4 m', b.whMood.cine.toFixed(2));
    { const c0 = cam.clone(), q0 = b.camera.quaternion.clone(); b.placeInWhale(); for (let i = 0; i < 90; i++) { b.step(1 / 60); b.updateSkrimMood(1 / 60); } b.lamps(); b.camera.fov = 70; b.camera.updateProjectionMatrix(); b.camera.lookAt(P.x, P.y + 0.3, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('entry_view', 560, 1.2); cam.copy(c0); b.camera.quaternion.copy(q0); }
    shotFrom('mood_near', 0.6, 4, 1.6, 55);
    { const G = b.WH_GL, m0 = G.uWhMoon.value, d0 = G.uWhDim.value, n0 = G.uWhN.value; log('near: uWhMoon', m0.toFixed(2), 'uWhDim', d0.toFixed(2), 'uWhN', n0, 'pooled', (() => { const r = []; b.scene.traverse((o) => { if (o.isPointLight && o.visible && o.intensity > 0.01 && o.userData.lpReal) r.push(o.intensity.toFixed(1) + '@' + o.getWorldPosition(cam.clone()).distanceTo(P).toFixed(0)); }); return r.join(' '); })());
      G.uWhMoon.value = 0; shotFrom('v_nowash', 0.6, 4, 1.6, 55); G.uWhMoon.value = m0;
      G.uWhDim.value = 0; shotFrom('v_noeye', 0.6, 4, 1.6, 55); G.uWhDim.value = d0;
      G.uWhN.value = 0; shotFrom('v_noglands', 0.6, 4, 1.6, 55); G.uWhN.value = n0;
      const off = []; b.scene.traverse((o) => { if (o.isPointLight && o.intensity > 0) { off.push([o, o.intensity]); o.intensity = 0; } }); shotFrom('v_nopoint', 0.6, 4, 1.6, 55); for (const [o, i] of off) o.intensity = i; }
    { let big = null; b.scene.traverse((o) => { if (o.isPointLight && o.intensity > 20) big = o; }); if (big) { const i0 = big.intensity; big.intensity = 0; shotFrom('v_noskrim', 0.6, 4, 1.6, 55); big.intensity = i0; log('big light at', big.getWorldPosition(cam.clone()).toArray().map((v) => v.toFixed(1)).join(','), 'him', P.toArray().map((v) => v.toFixed(1)).join(','), 'dist', big.distance, 'decay', big.decay); } }
    { const A = b.whaleS().arena, sk = A.moonLamps.find((m) => m.skrim).L, rows = []; b.scene.traverse((o) => { if (o.isPointLight && o.intensity > 0.01) rows.push((o === sk ? 'SKRIM ' : '') + o.intensity.toFixed(1) + '@' + o.getWorldPosition(cam.clone()).distanceTo(P).toFixed(1) + ' d' + o.distance); }); log('point lights', rows.join(' | ')); }
    const seen = {}; let n = 0;
    for (let k = 0; k < 60 * 40 && n < 6; k++) {
      cam.set(P.x + Math.sin(y + 0.6) * 4, P.y + 1.6, P.z + Math.cos(y + 0.6) * 4); run(1 / 60);
      const r = R(), key = r.mode + (r.mode === 'bone' ? (r.t > 2.2 ? '_look' : r.t > 4.2 ? '_toss' : '') : r.mode === 'fling' ? (r.t > 1.2 && r.t < 1.5 ? '_pull' : '') : '');
      if (!seen[key] && (key === 'bone_look' || key === 'fling_pull' || (key === 'dig' && k > 120))) { seen[key] = 1; n++; shotFrom('srch_' + key + '_a', 0.3, 2.6, 1.35, 45); shotFrom('srch_' + key + '_b', 1.6, 2.6, 1.3, 45); }
    }
    log('modes seen', Object.keys(seen).join(','), '| thrown', b.SKS.fly.length, 'resting', b.SKS.fly.filter((f) => f.rest).length, 'bones left', (A.skrimBones || []).filter((x) => !x.taken).length);
    shotFrom('srch_after_wide', 0.9, 6, 2.2, 60);
    return;
  }
  // his poses, close: the crouch as drawn, then a standing idle and a cast scrubbed (put back after)
  { const big = (nm, ang) => { b.camera.fov = 35; b.camera.updateProjectionMatrix(); cam.set(P.x + Math.sin(y + ang) * 3.4, P.y + 1.1, P.z + Math.cos(y + ang) * 3.4); b.camera.lookAt(P.x, P.y + 0.75, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 420, 1.3); };
    big('pose_crouch_front', 0); big('pose_crouch_side', 1.57);
    for (const [clip, f] of [['idle', 0.2], ['m1A1', 0.38], ['walk', 0.3]]) { const a = u.clips[clip]; if (!a) continue; for (const x of u.mixer._actions) x.enabled = false; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true; a.time = a.getClip().duration * f; u.mixer.update(0); big('pose_' + clip + '_front', 0); big('pose_' + clip + '_side', 1.57); a.stop(); }
    for (const x of u.mixer._actions) x.enabled = true; }
  // the prompt and the talk
  cam.set(P.x + Math.sin(y + 0.4) * 2.0, P.y + 1.7, P.z + Math.cos(y + 0.4) * 2.0); b.camBaseY = cam.y; b.lookAt(P.x, P.y + 0.7, P.z); b.frame(1); b.lookAt(P.x, P.y + 0.7, P.z); b.frame(1);
  log('prompt', b.hoveredS());
  b.skrimTalk();
  const D = w.document.getElementById('dialog'), txt = () => w.document.getElementById('dialog-text').textContent;
  const step = async (ms = 900) => { for (let i = 0; i < 20; i++) b.frame(1); await sleep(ms); };
  const pick = async (re) => { for (let k = 0; k < 12 && !D.querySelectorAll('button.choice').length; k++) { if (k === 3) D.click(); await step(500); } const bs = [...D.querySelectorAll('button.choice')]; log('  said:', JSON.stringify(txt()), '| you:', bs.map((x) => x.textContent).join(' / ')); const B = bs.find((x) => re.test(x.textContent)) || bs[0]; if (B) B.click(); else D.click(); };
  b.camera.fov = 105; b.camera.updateProjectionMatrix();
  await pick(/What are you/); await pick(/Must be/); await pick(/Why/); await pick(/Hell no/); await step(3200);
  log('after no jars: dialog', b.state().dialogOpen, 'stage', S.stage);
  b.skrimTalk(); await pick(/What are you/); await pick(/Kill him/); for (let k = 0; k < 8 && b.state().dialogOpen; k++) await step(500);
  log('after *Kill him*: dialog', b.state().dialogOpen, 'stage', S.stage);
  // the fight
  w.requestAnimationFrame = (f) => setTimeout(f, 16);
  b.settings.devMode = false;
  const home = [P.x + Math.sin(y) * 7, P.z + Math.cos(y) * 7];
  const tally = {}, res = { hit: 0, blocked: 0, parried: 0 }; let hp0 = b.state().hp, n = 0, shots = 0;
  const hp1 = u.st.hp;
  for (let f = 0; f < 60 * 40 && u.st.alive; f++) {
    const fl = b.whaleS() ? null : null;
    cam.x = home[0]; cam.z = home[1]; b.lookAt(P.x, cam.y - 0.2, P.z);
    // (your guard: up as a ball comes within 4 m, every other one — the first frames of it are the parry)
    const near = b.SKC.list.find((q) => q.kind === 'throw' && q.st === 'out' && q.p.distanceTo(cam) < 4.5);
    if (near && !near.seen) { near.seen = true; { w.__gdAge = (n++) % 2 ? 0 : 1.0; w.__gdT = 30; if (!w.__gdLog) { w.__gdLog = 1; log('guard up?', b.blockingS(), 'equipped', b.equippedS && b.equippedS() && b.equippedS().name, 'started', b.state().started, 'frozen', b.frozen && b.frozen()); } } }
    if (w.__gdT > 0) { if (--w.__gdT === 0) b.setGuardTest(false); else if (!b.blockingS() || w.__gdT === 29) b.setGuardTest(true, w.__gdAge); }
    b.step(1 / 60);
    const A = u.sk.act; if (A && A.t < 0.02) tally[A.name] = (tally[A.name] || 0) + 1;
    if (b.state().hp < hp0) res.hit++; b.heal(); hp0 = b.state().hp;
    if (A && !shots && A.name === 'bolt' && A.t > A.rel[0] * A.dur * 0.7) { shots++; b.renderer.render(b.scene, b.camera); shot('fight_bolt', 640, 1.2); }
    if (A && shots === 1 && A.name === 'geyser' && A.fired) { shots++; b.renderer.render(b.scene, b.camera); shot('fight_geyser', 640, 1.2); }
    if (A && shots < 3 && A.name === 'wave' && A.fired && A.t > A.rel[0] * A.dur + 0.4) { shots = 3; b.renderer.render(b.scene, b.camera); shot('fight_wave', 640, 1.2); }
    if (f % 600 === 0) log(' ', (f / 60).toFixed(0) + 's', 'his hp', u.st.hp, 'act', A && A.name, 'chains', b.SKC.list.length, 'links', b.SKC.n, 'd', Math.hypot(P.x - cam.x, P.z - cam.z).toFixed(1));
    if (f % 30 === 0) await sleep(1);
  }
  log('his own count', JSON.stringify(u.sk.counts), '| outcomes', JSON.stringify(u.sk.res));
  log('40 s: his moves', JSON.stringify(tally), '| landed on you', res.hit, '| his hp', hp1, '->', u.st.hp, '| threw', JSON.stringify((b.threw ? b.threw() : []).slice(0, 3)));
}

export async function skrimDig(ctx) { ctx.w.__skDigOnly = true; return skrimIn(ctx); }
export async function skrimFace(ctx) { ctx.w.__skFace = true; return skrimIn(ctx); }
export async function skrimPerf(ctx) { ctx.w.__skPerf = true; return skrimIn(ctx); }
export async function skrimChains(ctx) { ctx.w.__skChains = true; return skrimIn(ctx); }
export async function skrimLight(ctx) { ctx.w.__skLight = true; return skrimIn(ctx); }

// HIS IRON AND HIS SPARKS (2026-10-30, the owner: "make his sound effects better with the metal chains. make sparks fly
// like sekiro when blocked or parried against him"): the chains' sound bank (built, in how long, each bank's count);
// each chain sound's peak and loudest 43 ms RMS on the effects bus beside the game's own block sample; and stills of a
// block and a parry from the moment of contact on, drawn as the game draws a frame (the world, then the view model).
// `&m=snd` the sounds only, `&m=fx` the stills only.
export async function skrimSparks({ w, b, log, sleep }) {
  const M = new URLSearchParams(location.search).get('m') || 'all';
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
  b.placeInWhale();
  const S = b.SKRIM, cam = b.camera.position, V3 = cam.constructor;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u; if (!u || !u.model) { log('no Skrim'); return; }
  for (let i = 0; i < 30; i++) b.frame(1);
  b.skcInit(u);
  const A = b.SKA; log('bank ready', A.ready, 'built in', A.ms, 'ms;', ['clink', 'heavy', 'clang', 'parry', 'tick', 'slap', 'drag', 'swish', 'rumble'].map((k) => k + ' ' + A[k].length + '×' + (A[k][0] ? A[k][0].duration.toFixed(2) + 's' : '-')).join(', '));
  const P = u.g.position, y = u.g.rotation.y;
  // where each bank's energy is: the first 2048 samples, a plain DFT summed into octaves
  for (const k of ['clink', 'heavy', 'clang', 'parry', 'tick', 'slap', 'drag', 'swish', 'rumble']) {
    const d = A[k][0].getChannelData(0), sr = A[k][0].sampleRate, N = Math.min(2048, d.length), oct = {};
    for (let j = 1; j < N / 2; j++) { let re = 0, im = 0; const wv = 2 * Math.PI * j / N; for (let i = 0; i < N; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); re += d[i] * h * Math.cos(wv * i); im -= d[i] * h * Math.sin(wv * i); }
      const f = j * sr / N, o = f < 177 ? '<177' : f < 354 ? '250' : f < 707 ? '500' : f < 1414 ? '1k' : f < 2828 ? '2k' : f < 5657 ? '4k' : f < 11314 ? '8k' : '16k'; oct[o] = (oct[o] || 0) + re * re + im * im; }
    const tot = Object.values(oct).reduce((x, q) => x + q, 0);
    log('  energy by octave', k.padEnd(7), ['<177', '250', '500', '1k', '2k', '4k', '8k', '16k'].map((o) => o + ' ' + Math.round(100 * (oct[o] || 0) / tot) + '%').join('  '));
  }
  if (M !== 'fx') {
    const ctx = b.audioCtx; try { await ctx.resume(); } catch (e) {} await sleep(200); log('context', ctx.state, ctx.sampleRate);
    // (each sound alone: while it is made, whatever would connect to the effects bus connects to `iso` instead, which
    // goes only to the analyser — the whale's beds are on the bus too and read 0.03 under everything)
    const base = b.sfxOut(), iso = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 2048; iso.connect(an); const buf = new Float32Array(2048);
    const AN = w.AudioNode.prototype, con = AN.connect, isoOn = () => { AN.connect = function (d, ...r) { return con.call(this, d === base ? iso : d, ...r); }; }, isoOff = () => { AN.connect = con; };
    w.requestAnimationFrame = () => 0; await sleep(300);      // (the loop stopped: nothing of the game's own on the bus but its beds)
    const near = [cam.x + 2, cam.z];
    const meas = async (nm, fn, ms = 1500) => {
      await sleep(250); const n0 = A.n; let err = null; isoOn(); try { fn(); } catch (e) { err = e.message; } isoOff();
      let pk = 0, rms = 0; const t0 = performance.now();
      while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) { const q = Math.abs(v); if (q > pk) pk = q; s += v * v; } rms = Math.max(rms, Math.sqrt(s / buf.length)); await sleep(12); }
      log('  ', nm.padEnd(22), 'peak', pk.toFixed(3), 'rms', rms.toFixed(3), 'sources', A.n - n0, err ? 'ERR ' + err : '');
    };
    await meas('nothing, again', () => {});
    await meas('katBlock (game, 0.82)', () => b.playSample('katBlock', 0.82, 0.05, 0.98));
    await meas('katParry (game, 0.62)', () => b.playSample('katParry', 0.62));
    await meas('clang (block)', () => b.sfxChainClang(false));
    await meas('clang (parry)', () => b.sfxChainClang(true));
    await meas('rattle 0.5 s', () => b.sfxChainRattle(near[0], near[1], 0.5, 1));
    await meas('rattle heavy', () => b.sfxChainRattle(near[0], near[1], 0.6, 1, true));
    await meas('whirl', () => b.sfxChainWhirl(near[0], near[1], 0.8));
    await meas('payout (throw)', () => b.sfxChainPayout(near[0], near[1], 1));
    await meas('drag', () => b.sfxChainDrag(near[0], near[1], 0.3, 0.9));
    await meas('slap (slack lands)', () => b.sfxChainSlap(near[0], near[1], 1));
    await meas('bite', () => b.sfxChainBite(cam.x, cam.z, 1));
    await meas('burst (pit, 1.3)', () => b.sfxChainBurst(near[0], near[1], 1.3, 0.9));
    await meas('burst (ring, 1.5)', () => b.sfxChainBurst(near[0], near[1], 1.5, 1.1));
    await meas('rattle at 12 m', () => b.sfxChainRattle(cam.x + 12, cam.z, 0.5, 1));
    await meas('fleshHit (game)', () => b.playSample('fleshHit', 0.9));
    try { await ctx.suspend(); } catch (e) {}
  }
  if (M === 'snd') return;
  // the stills: you 2 m in front of him at your own fov, guard up; his hand's blow on it
  w.requestAnimationFrame = () => 0;
  b.camera.fov = 105; b.camera.updateProjectionMatrix();
  const place = () => { cam.set(P.x + Math.sin(y) * 2.0, b.skrimFloorW(P.x + Math.sin(y) * 2.0, P.z + Math.cos(y) * 2.0) + 1.62, P.z + Math.cos(y) * 2.0); b.camBaseY = cam.y; b.lookAt(P.x, cam.y - 0.25, P.z); };
  const grab = (nm, W = 480) => {
    const R = b.renderer; R.render(b.scene, b.camera); R.autoClear = false; R.clearDepth(); R.render(b.vmScene, b.vmCamera); R.autoClear = true;
    const src = R.domElement, c = document.createElement('canvas'); c.width = W; c.height = Math.round(W * src.height / src.width);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', nm, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  };
  const steps = (n) => { for (let i = 0; i < n; i++) { place(); b.step(1 / 60); } };
  const sp = () => { const L = b.SKSP; let lo = 1e9, hi = -1e9, far = 0; for (const s of L.p) if (s.ttl > 0) { lo = Math.min(lo, s.p.y); hi = Math.max(hi, s.p.y); far = Math.max(far, s.p.distanceTo(cam)); } return 'live ' + L.live + ' y ' + (lo - cam.y).toFixed(2) + '..' + (hi - cam.y).toFixed(2) + ' furthest ' + far.toFixed(2) + ' m'; };
  place(); b.setGuardTest(true, 1); steps(40);
  { const at = b.skSparkAt(new V3()); b.camera.updateMatrixWorld(true); const l = at.clone().applyMatrix4(b.camera.matrixWorldInverse); log('contact in your view (m): x', l.x.toFixed(2), 'y', l.y.toFixed(2), 'z', l.z.toFixed(2), '| equipped', b.equippedS() && b.equippedS().name, 'vm', b.vmScene.children.length, 'vm fov', b.vmCamera.fov, 'aspect', b.vmCamera.aspect.toFixed(2), '/', b.camera.aspect.toFixed(2)); }
  grab('guard_up');
  const H = () => u.model.getObjectByName('Character1_LeftHand').getWorldPosition(new V3());
  log('block:', b.skrimHitsYou(u, H(), 0, true));
  steps(1); grab('blk_0'); log('  +1', sp()); steps(4); grab('blk_1'); log('  +5', sp()); steps(8); grab('blk_2'); log('  +13', sp()); steps(15); log('  +28', sp());
  steps(60); b.setGuardTest(false); steps(20); b.setGuardTest(true, 0); place(); b.step(1 / 60);
  log('parry:', b.skrimHitsYou(u, H(), 0, true));
  steps(1); grab('par_0'); log('  +1', sp()); steps(5); grab('par_1'); log('  +6', sp()); steps(8); grab('par_2'); log('  +14', sp()); steps(16); grab('par_3'); log('  +30', sp());
  steps(90); b.setGuardTest(false); steps(20); b.setGuardTest(true, 1); steps(30);
  log('sweep, blocked:', b.skrimHitsYou(u, cam.clone().setY(cam.y - 0.42), 0, true, new V3(Math.cos(y), 0, -Math.sin(y))));
  steps(3); grab('swp_blk'); log('  +3', sp());
  steps(90); b.setGuardTest(false); steps(20); b.setGuardTest(true, 0); place(); b.step(1 / 60);
  log('chain from the floor, parried:', b.skrimHitsYou(u, cam.clone().setY(cam.y - 0.7), 0, false, new V3(0, 1, 0)));
  steps(4); grab('rise_par'); log('  +4', sp());
  b.setGuardTest(false);
  log('bursts', b.SKSP.bursts, 'his outcomes', JSON.stringify(u.sk.res));
}

// SKRIM'S FIGHT, MEASURED (2026-10-30, the owner: "he slides around too much. when you are up close he does nothing"):
// the head-back pose of every fight clip (face pitch against his chest, scrubbed), stills of the worst; then the fight
// on fixed steps from four places — you 1.5 m off and standing, you pressing him at 1.5 m and cutting, you at 7 m, you
// backing off — with what he does, how close, and how far his planted foot skates (`__skF2` 'poses' / 'fight' / both)
export async function skrimF2({ w, b, log, sleep, shot }) {
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
  b.placeInWhale();
  const S = b.SKRIM, cam = b.camera.position, V3 = cam.constructor;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u; if (!u || !u.model) { log('no skrim'); return; }
  for (let i = 0; i < 30; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const mode = new URLSearchParams(window.location.search).get('m') || 'all';
  w.__skW = new URLSearchParams(window.location.search).get('wt');
  const g = (n) => u.model.getObjectByName(n), wp = (o, v = new V3()) => o.getWorldPosition(v);
  const P = u.g.position;
  const side = (nm, ang = 1.57, dd = 3.4, fov = 38) => { const y = u.g.rotation.y; b.camera.fov = fov; b.camera.updateProjectionMatrix(); cam.set(P.x + Math.sin(y + ang) * dd, P.y + 1.1, P.z + Math.cos(y + ang) * dd); b.camera.lookAt(P.x, P.y + 0.95, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 400, 1.3); };
  // the face's pitch off his chest: + is the head thrown back
  const facePitch = () => { u.g.updateMatrixWorld(true);
    const H = wp(g('Character1_Head')), e = wp(g('c_eye_l')).add(wp(g('c_eye_r'))).multiplyScalar(0.5), f = e.sub(H).normalize();
    const C = wp(g('Character1_Spine2')), N = wp(g('Character1_Neck')), up = N.sub(C).normalize();
    const fw = new V3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y)), lat = new V3().crossVectors(up, fw).normalize(), cf = new V3().crossVectors(lat, up).normalize();
    // the face in the chest's own plane: the angle up off the chest's forward
    return w.__skWorld ? Math.asin(f.y) * 57.3 : Math.atan2(f.dot(up), f.dot(cf)) * 57.3; };
  const scrub = (clip, f) => { const a = u.clips[clip]; for (const x of u.mixer._actions) x.enabled = false; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true; a.time = a.getClip().duration * f; u.mixer.update(0); return a; };
  if (mode === 'all' || mode === 'poses') {
    S.stage = 'fight'; u.sk.act = null;
    const keep = u.g.rotation.y;
    scrub('idle', 0.3); const p0 = facePitch(); log('idle face pitch off chest', p0.toFixed(1));
    const rows = [];
    for (const c of ['m1A1', 'm1A2', 'm1A3', 'm2A1', 'm2A2', 'm2A3', 'm2A4', 'm2A5', 'area1', 'area2', 'cast1', 'cast2', 'hitSF', 'hitSL', 'hitSR', 'fromCrouch', 'walk', 'walkB', 'walkL', 'walkR', 'runB', 'blockHit']) {
      if (!u.clips[c]) continue; let mx = -1e9, at = 0;
      for (let i = 0; i <= 40; i++) { scrub(c, i / 40); const p = facePitch() - p0; if (p > mx) { mx = p; at = i / 40; } }
      rows.push([c, mx, at]);
    }
    rows.sort((a, b2) => b2[1] - a[1]);
    { w.__skWorld = 1; scrub('idle', 0.3); const q0 = facePitch(); const r2 = [];
      for (const c of ['m1A1', 'm1A2', 'm1A3', 'm2A1', 'm2A2', 'm2A4', 'area1', 'area2', 'cast1', 'cast2', 'hitSF', 'hitSL']) { if (!u.clips[c]) continue; let mx = -1e9, at = 0; for (let i = 0; i <= 40; i++) { scrub(c, i / 40); const p = facePitch() - q0; if (p > mx) { mx = p; at = i / 40; } } r2.push(c + ' ' + mx.toFixed(0) + '@' + at.toFixed(2)); }
      w.__skWorld = 0; log('face pitch in the world over idle (' + q0.toFixed(0) + '):', r2.join(' | ')); }
    // the swings: each hand's fastest frame along his front, how fast, and how far out in front of him it is then
    for (const c of ['m1A1', 'm1A2', 'm1A3', 'm1A1M', 'm1A2M', 'm1A3M', 'm2A1', 'm2A2', 'm2A4', 'cast1']) { if (!u.clips[c]) continue; const out = [];
      for (const hn of ['Character1_LeftHand', 'Character1_RightHand']) { let pv = null, bv = -1e9, bf = 0, reach = 0, hy = 0, top = 0; const H = g(hn), y = u.g.rotation.y, fx = Math.sin(y), fz = Math.cos(y);
        for (let i = 0; i <= 60; i++) { scrub(c, i / 60); u.g.updateMatrixWorld(true); const q = wp(H); if (pv) { const v = Math.hypot(q.x - pv.x, q.y - pv.y, q.z - pv.z) * 60 / u.clips[c].getClip().duration; if (v > bv) { bv = v; bf = i / 60; reach = (q.x - P.x) * fx + (q.z - P.z) * fz; hy = q.y - P.y; } } top = Math.max(top, (q.x - P.x) * fx + (q.z - P.z) * fz); pv = q; }
        out.push(hn.slice(11, 12) + ' v' + bv.toFixed(1) + '@' + bf.toFixed(2) + ' out' + reach.toFixed(2) + ' y' + hy.toFixed(2) + ' max out' + top.toFixed(2)); }
      log('swing', c, (u.clips[c].getClip().duration).toFixed(2) + 's', out.join(' ; ')); }
    log('head back (deg over idle, at f):', rows.map(([c, m, f]) => c + ' ' + m.toFixed(0) + '@' + f.toFixed(2)).join(' | '));
    for (const [c, , f] of rows.slice(0, 3)) { scrub(c, f); u.g.updateMatrixWorld(true); if (w.__skPoseFix) w.__skPoseFix(u, c); side('pose_' + c); }
    if (w.__bw.skrimNeckFix) { for (const [c, , f] of rows.slice(0, 3)) { scrub(c, f); u.g.rotation.y = keep; const ov = w.__bw.skrimNeckFix(u); u.g.updateMatrixWorld(true); log('  fixed', c, 'over', (ov * 57.3).toFixed(0), 'now off chest', (facePitch() - p0).toFixed(0)); side('posefix_' + c); } }
    // the gaits with him held still: the planted toe's speed back under him against the clip's root travel (they should
    // be equal and opposite — the ratio is the scale the travel needs)
    { const tl = g('Character1_LeftToeBase'), tr = g('Character1_RightToeBase'), y = u.g.rotation.y, c = Math.cos(y), s = Math.sin(y), out = [];
      for (const cn of ['walk', 'walkB', 'walkL', 'walkR', 'runB']) { const T = u.clipTravel[cn]; if (!T) continue; const dur = u.clips[cn].getClip().duration; let pv = null, sF = 0, sT = 0, nn = 0;
        const smp = []; let ymin = 1e9;
        for (let i = 0; i <= 120; i++) { const f = i / 120; scrub(cn, f); u.g.updateMatrixWorld(true); const a = wp(tl), bb = wp(tr), lo = a.y < bb.y ? a : bb, wh = a.y < bb.y;
          const x = f * (T.length - 1), j = Math.min(T.length - 2, Math.floor(x)), t = x - j, tx = T[j][0] + (T[j + 1][0] - T[j][0]) * t, tz = T[j][1] + (T[j + 1][1] - T[j][1]) * t;
          const lx = (lo.x - P.x) * c - (lo.z - P.z) * s, lz = (lo.x - P.x) * s + (lo.z - P.z) * c;
          smp.push({ wh, lx, lz, tx, tz, y: lo.y - P.y }); ymin = Math.min(ymin, lo.y - P.y); }
        const K = { walk: 0.8, walkB: 0.82, walkL: 0.75, walkR: 0.75, runB: 0.8 }[cn]; let res = 0, old = 0;
        const E = T[T.length - 1], ox = E[0] / (T.length - 1), oz = E[1] / (T.length - 1);      // (the old way: the clip's mean speed, every frame)
        for (const q of smp) { if (pv && pv.wh === q.wh && q.y < ymin + 0.03 && pv.y < ymin + 0.03) { sF += Math.hypot(q.lx - pv.lx, q.lz - pv.lz); sT += Math.hypot(q.tx - pv.tx, q.tz - pv.tz); res += Math.hypot(q.lx - pv.lx + K * (q.tx - pv.tx), q.lz - pv.lz + K * (q.tz - pv.tz)); old += Math.hypot(q.lx - pv.lx + ox * (T.length - 1) / 120, q.lz - pv.lz + oz * (T.length - 1) / 120); nn++; } pv = q; }
        out.push('residual ' + (res / (dur * nn / 120 || 1)).toFixed(2) + ' (the old way at its best ' + (old / (dur * nn / 120 || 1)).toFixed(2) + ')');
        out.push(cn + ' toe low ' + ymin.toFixed(3) + ' foot ' + (sF / (dur * nn / 120 || 1)).toFixed(2) + ' travel ' + (sT / (dur * nn / 120 || 1)).toFixed(2) + ' ratio ' + (sF / (sT || 1)).toFixed(2) + ' n' + nn); }
      log('gait scale (him still):', out.join(' | ')); }
    // his hook swings, the mirrored three: the wind-up, the contact, after (from in front and to his left, where the hook is)
    for (const c of ['m1A1M', 'm1A2M', 'm1A3M']) for (const f of [0.55, 0.8, 1]) { if (!u.clips[c]) continue; const rel = w.__bw.skrimRelS ? w.__bw.skrimRelS(u, c) : 0.38; scrub(c, Math.min(0.95, rel * f)); u.g.rotation.y = keep; u.g.updateMatrixWorld(true); w.__bw.skrimNeckFix && w.__bw.skrimNeckFix(u); side('sw_' + c + '_' + f, 0.75, 3.6, 42); }
    // (stopped, every one: left enabled and paused at weight 1 they froze his legs under the fight that followed — every
    // skate number read 0.00 in that run)
    for (const x of u.mixer._actions) { x.stop(); x.enabled = true; } u.cur = null;
    if (mode === 'poses') return;
  }
  if (mode === 'chains') {
    // the chains as they hang: a throw caught mid-flight, then let fall slack onto the floor; the pit coming up and swaying;
    // a sweep mid-swing from over his shoulder
    b.skcInit(u); const C = b.SKC, L = g('Character1_LeftHand'), R = g('Character1_RightHand'), y = u.g.rotation.y;
    const lk = (nm, ang, dd, h, at, fov = 50) => { b.camera.fov = fov; b.camera.updateProjectionMatrix(); cam.set(at.x + Math.sin(y + ang) * dd, at.y + h, at.z + Math.cos(y + ang) * dd); b.camera.lookAt(at.x, at.y, at.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot(nm, 480, 1.3); };
    const run = (n) => { for (let i = 0; i < n; i++) b.updateSkrimChains(1 / 60); };
    cam.set(P.x + Math.sin(y) * 9, P.y + 1.6, P.z + Math.cos(y) * 9);
    const T = b.skcThrow(u, L, 0, true); run(14);
    const mid = T.p.clone().lerp(P.clone().setY(T.p.y), 0.5); log('throw out: links', C.n, 'out', T.p.distanceTo(P).toFixed(1));
    lk('c_throw', 1.57, 4.2, 0.3, mid);
    T.st = 'slack'; T.st0 = T.t; T.Ls = T.p.distanceTo(T.A) * 1.06; T.v.multiplyScalar(0.3); run(30);
    log('slack: links', C.n, 'tip y over floor', (T.p.y - b.skrimFloorW(T.p.x, T.p.z)).toFixed(2), 'pts over floor', T.pts.map((q) => (q.y - b.skrimFloorW(q.x, q.z)).toFixed(2)).join(' '));
    lk('c_slack', 2.6, 3.4, 2.6, T.p.clone().lerp(P.clone().setY(T.p.y), 0.5));
    run(30); lk('c_haul', 2.6, 3.4, 2.6, T.p.clone().lerp(P.clone().setY(T.p.y), 0.5));
    C.list.length = 0; run(1);
    const at = P.clone().add(new V3(Math.sin(y), 0, Math.cos(y)).multiplyScalar(4)); at.y = b.skrimFloorW(at.x, at.z);
    b.skcPit(u, at); run(12); lk('c_pit_up', 0.9, 5.0, 1.5, at.clone().setY(at.y + 1.4));
    run(24); lk('c_pit_sway', 0.9, 5.0, 1.5, at.clone().setY(at.y + 1.4));
    C.list.length = 0; run(1);
    b.skcSweep(u, R); run(14); lk('c_sweep', 0.2, 4.5, 3.2, P.clone().setY(P.y + 1), 60);
    return;
  }
  // ---- the fight
  S.stage = 'dig'; cam.set(P.x + Math.sin(u.g.rotation.y) * 4, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 4);
  b.skrimFight();
  for (let i = 0; i < 90 && S.stage !== 'fight'; i++) b.step(1 / 60);
  log('stage', S.stage);
  const toeL = g('Character1_LeftToeBase'), toeR = g('Character1_RightToeBase'), fL = g('Character1_LeftFoot'), fR = g('Character1_RightFoot');
  const seg = async (label, secs, place) => {
    const k = u.sk, acts = {}, res0 = JSON.stringify(k.res || {}); let close = 0, idleClose = 0, dsum = 0, n = 0, sk = 0, skN = 0, skMax = 0, hpY0 = b.state().hp, hits = 0;
    const byClip = {}; let prev = null, last = null; const hp0 = u.st.hp;
    for (let f = 0; f < secs * 60 && u.st.alive; f++) {
      place(f);
      b.lookAt(P.x, cam.y - 0.2, P.z);
      const cur0 = u.cur, t0 = cur0 && cur0.time;
      b.step(1 / 60);
      if (w.__skW && f === 200) log('   clip time per step', cur0 && cur0.getClip().name, ((cur0.time - t0) * 60).toFixed(3), 'x timeScale', cur0.timeScale.toFixed(2));
      const A = k.act; if (A && A !== last) { const nm = A.name + (A.seq ? 'x' + A.seq.length : ''); acts[nm] = (acts[nm] || 0) + 1; } last = A;
      const d = Math.hypot(P.x - cam.x, P.z - cam.z); dsum += d; n++;
      if (d < 3) { close++; const sp = Math.hypot(k.vx || 0, k.vz || 0); if (!A && sp < 0.3 && !(u.st.stun > 0)) idleClose++; }
      if (b.state().hp < hpY0) hits++; b.heal(); hpY0 = b.state().hp;
      // planted foot: the lower toe, while it is within 4 cm of the floor
      u.g.updateMatrixWorld(true);
      const a = wp(toeL || fL), c = wp(toeR || fR), fy = b.skrimFloorW ? b.skrimFloorW(P.x, P.z) : P.y;
      const lo = a.y < c.y ? a : c, which = a.y < c.y ? 'L' : 'R';
      const th = ({ walk: 0.067, walkB: 0.042, runB: 0.051 }[u.cur ? u.cur.getClip().name : ''] || 0.03) + 0.03;     // (3 cm over the clip's own lowest toe, as the poses' "gait scale")
      if (prev && prev.w === which && lo.y - fy < th && prev.y < th) { const v = Math.hypot(lo.x - prev.p.x, lo.z - prev.p.z) * 60; if (v < 6) { sk += v; skN++; skMax = Math.max(skMax, v); let mw = 0; for (const x of u.mixer._actions) if (x.enabled) mw = Math.max(mw, x.getEffectiveWeight());
        const cn = (u.cur ? u.cur.getClip().name : '?') + (mw > 0.97 ? '' : '~'); const B = byClip[cn] || (byClip[cn] = [0, 0]); B[0] += v; B[1]++; } }
      if (w.__skW && u.cur && /^walk[LB]$/.test(u.cur.getClip().name) && u.cur.getEffectiveWeight() > 0.99 && (w.__skN = (w.__skN || 0) + 1) < 40) {
        const R0 = w.__skR || P.clone(); log('    ' + u.cur.getClip().name, 't', u.cur.time.toFixed(3), 'root d', (Math.hypot(P.x - R0.x, P.z - R0.z) * 60).toFixed(2), 'yaw', u.g.rotation.y.toFixed(3), which, 'toe y', (lo.y - fy).toFixed(3), 'toe v', prev ? (Math.hypot(lo.x - prev.p.x, lo.z - prev.p.z) * 60).toFixed(2) : '-');
      }
      w.__skR = P.clone();
      prev = { w: which, p: lo.clone(), y: lo.y - fy };
      if (w.__skShots && w.__skShots(label, f, u, side)) { /* (a still taken) */ }
      if (w.__skW && f % 90 === 45 && label === '7m standing') log('   weights', 'toes over floor', (a.y - fy).toFixed(2), (c.y - fy).toFixed(2), u.mixer._actions.filter((x) => x.isRunning()).map((x) => x.getClip().name + ':' + x.getEffectiveWeight().toFixed(2) + (x.isRunning() ? '' : '(stopped)') + (x.enabled ? '' : '(off)') + (x.paused ? '(paused)' : '')).join(' '));
      if (f % 30 === 0) await sleep(1);
    }
    log(label, '| moves', JSON.stringify(acts), '| mean d', (dsum / n).toFixed(1), '| close frames', close, 'of them idle', idleClose, '| on you', hits, '| his hp', hp0, '->', u.st.hp,
      '| planted skate mean', (sk / Math.max(1, skN)).toFixed(2), 'm/s max', skMax.toFixed(2), 'n', skN,
      '| by clip', Object.entries(byClip).map(([c2, [s2, n2]]) => c2 + ' ' + (s2 / n2).toFixed(2) + '(' + n2 + ')').join(' '));
    log('   outcomes', JSON.stringify(k.res || {}), 'was', res0);
  };
  const at = (dd) => { const dx = cam.x - P.x, dz = cam.z - P.z, l = Math.hypot(dx, dz) || 1; cam.x = P.x + dx / l * dd; cam.z = P.z + dz / l * dd; };
  const took = {};
  w.__skShots = (label, f, u2, sideF) => {
    const A = u2.sk.act; let nm = null;
    if (A && A.name === 'hook' && A.sw && !took.hk_wind && A.i === 0 && A.sw.t >= A.sw.rel * A.sw.dur * 0.6) nm = 'hk_wind';
    else if (A && A.name === 'hook' && A.sw && took.hk_wind && !took.hk_hit && A.sw.t >= A.sw.rel * A.sw.dur) nm = 'hk_hit';
    else if (A && A.name === 'dash' && !took.dash && A.t > 0.3) nm = 'dash';
    else if (A && A.name === 'bolt' && !took.bolt && A.fired && A.t > A.rel[0] * A.dur + 0.15) nm = 'bolt';
    if (!nm) return; took[nm] = 1;
    const c0 = cam.clone(), f0 = b.camera.fov, q0 = b.camera.quaternion.clone();
    sideF('f_' + nm, nm === 'bolt' ? 0.9 : 1.25, nm === 'bolt' ? 6.5 : 4.2, nm === 'bolt' ? 55 : 45);
    cam.copy(c0); b.camera.fov = f0; b.camera.updateProjectionMatrix(); b.camera.quaternion.copy(q0); b.camera.updateMatrixWorld(true);
  };
  if (mode === 'all' || mode === 'fight') {
    at(7); await seg('7m standing', 14, () => {});
    at(1.5); await seg('1.5m standing', 10, () => {});
    let cut = 0; await seg('pressing 1.5m, cutting', 12, (f) => { at(1.5); if (++cut % 50 === 0) b.hurtMutantTest(u, 1); });
    at(1.5); let stuns = 0, was = false; await seg('1.5m, parrying everything', 10, () => { at(1.5); b.setGuardTest(true, 0); const s = u.st.stun > 0; if (s && !was) stuns++; was = s; });
    b.setGuardTest(false); log('   staggers', stuns);
    at(4); let back = 0; await seg('backing off', 8, () => { const dx = cam.x - P.x, dz = cam.z - P.z, l = Math.hypot(dx, dz) || 1; if (b.skrimInGutS ? b.skrimInGutS(cam.x + dx / l * 0.03, cam.z + dz / l * 0.03) : true) { cam.x += dx / l * 0.03; cam.z += dz / l * 0.03; } });
  }
}

/* SKRIM'S DEAL (2026-10-30): the six heaps past him, the artifact in one, him getting up and coming for it, every branch
 * of the talk, and the way out. `&m=` give (let him leave) | givekill | keep | hitleave | none (out with nothing) | restore.
 * Run with PB_PORT=4223. The swings are real (`startDig` aimed at the heap, on fixed steps); the talk is clicked. */
export async function skrimQ({ w, b, log, sleep, shot }) {
  const mode = new URLSearchParams(window.location.search).get('m') || 'give';
  const f = w.frameElement;
  if (mode === 'restore2') return skrimQRestored({ w, b, log, sleep, shot, f });
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
  b.placeInWhale();
  const S = b.SKRIM, Q = b.SKQ, cam = b.camera.position, V3 = cam.constructor;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u; if (!u || !u.model) { log('no skrim'); return; }
  for (let i = 0; i < 30; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const P = u.g.position, home = P.clone();
  const st = () => `stage ${S.stage} art ${b.artState()} holding ${b.skqHolding()} world ${!!b.art.world} gave ${Q.gave} gone ${Q.gone} doomed ${Q.doomed} pick ${Q.pick} broke ${Q.broke.toString(2)}`;
  const put = (x, z) => { cam.x = x; cam.z = z; const fy = b.skrimFloorW(x, z); b.groundY = fy; cam.y = fy + 1.62; b.camBaseY = cam.y; };
  const steps = (n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); b.step(1 / 60); b.updateSkrimLife(1 / 60); } };
  log('piles', Q.built, Q.piles.length, Q.piles.map((p) => `#${p.i} ${(p.s - (b.whaleS().arena.skrimSpot.s)).toFixed(1)}m past, K${p.K.toFixed(2)}`).join(' | '));
  const G = (p) => p.g.getWorldPosition(new V3());
  // a real swing at a heap: stood 1.9 m short of it on the side you come from, aimed at its middle
  const swingAt = (p, pow) => {
    const g = G(p), dx = home.x - g.x, dz = home.z - g.z, L = Math.hypot(dx, dz) || 1;
    const x = g.x + dx / L * 1.9, z = g.z + dz / L * 1.9; put(x, z);
    b.lookAt(g.x, g.y + 0.3 * p.K, g.z); const h0 = p.hits, j0 = p.jig;
    b.startDig(pow);
    let hit = false; steps(110, () => { put(x, z); b.lookAt(g.x, g.y + 0.3 * p.K, g.z); if (p.jig > j0 + 0.5 || p.hits !== h0 || p.gone) hit = true; });
    return { hit, hits: p.hits, gone: p.gone };
  };
  // the deal, through his talk (four jars for "Fine here.")
  const D = w.document.getElementById('dialog'), txt = () => w.document.getElementById('dialog-text').textContent;
  const step = async (ms = 700) => { for (let i = 0; i < 12; i++) b.frame(1); await sleep(ms); };
  const pick = async (re) => {
    for (let k = 0; k < 16 && !D.querySelectorAll('button.choice').length; k++) { if (k % 3 === 2) D.click(); await step(450); }
    const bs = [...D.querySelectorAll('button.choice')]; log('  he:', JSON.stringify(txt()), '| you:', bs.map((x) => x.textContent).join(' / '));
    const B = bs.find((x) => re.test(x.textContent)); if (B) B.click(); else log('  NO CHOICE', re); return !!B;
  };
  const closed = async () => { for (let k = 0; k < 14 && b.state().dialogOpen; k++) { if (k % 3 === 2) D.click(); await step(450); } log('  last:', JSON.stringify(txt()), 'dialog', b.state().dialogOpen, '|', st()); };
  // BEFORE THE DEAL: a heap only squelches
  { const p = Q.piles[0], r = swingAt(p, 0); log('before the deal, a light swing at #0:', JSON.stringify(r), 'pick', Q.pick); }
  if (mode === 'none' && w.location.search.includes('nodeal')) { /* (never asked) */ }
  else {
    b.gainJar(4);
    put(P.x + Math.sin(u.g.rotation.y + 0.4) * 2.0, P.z + Math.cos(u.g.rotation.y + 0.4) * 2.0); b.lookAt(P.x, P.y + 0.7, P.z);
    b.skrimTalk();
    await pick(/What are you/); await pick(/Must be/); await pick(/Why/); await pick(/Fine here/); await pick(/An artifact/); await pick(/Whoa/);
    await pick(/now that you explained/); await pick(/help look/); await pick(/Of course/); await closed();
    steps(2);
    log('agreed:', st());
  }
  if (mode === 'none') {
    put(home.x, home.z + 30); steps(2);
    b.whaleClimbOut(); steps(3);
    log('out with nothing: farewell', !!b.wfState(), 'whale cut', JSON.stringify(b.whaleState()), '|', st());
    return;
  }
  // SEARCH: the heaps in turn, mixing light and heavy, until it is out; one heap all light, the next two heavies
  let plan = [0, 0, 0, 0], n = 0;
  for (const p of Q.piles) {
    if (b.art.world || b.artState() !== 0) break;
    plan = n % 2 ? [1, 1] : [0, 0, 0, 0]; n++;
    const res = plan.map((pw) => swingAt(p, pw));
    log(`#${p.i} ${plan.map((x) => (x ? 'H' : 'L')).join('')}:`, res.map((r) => `${r.hit ? 'hit' : 'MISS'} ${r.hits}${r.gone ? ' gone' : ''}`).join(', '), '| chunks thrown', Q.pool.length, 'resting', Q.pool.filter((c) => c.rest).length);
  }
  log('found:', st(), 'at', JSON.stringify(Q.artAt));
  steps(60);
  const W = b.art.world; if (!W) { log('NO ARTIFACT OUT'); return; }
  const wp = W.getWorldPosition(new V3()); log('  lying at floor+', (wp.y - b.skrimFloorW(wp.x, wp.z)).toFixed(3), 'fall done', !W.userData.fall, 'shine', !!(b.shinies ? b.shinies.find((s) => s.root === W) : 'n/a'));
  put(wp.x + 1.2, wp.z + 1.2); b.lookAt(wp.x, wp.y, wp.z); steps(2); shot('q_artifact_lying', 560, 1.3);
  if (mode === 'restore') {
    b.saveCheckpoint(); const d = JSON.parse(w.localStorage.getItem(b.SAVE_KEY)); log('saved skrimQ', JSON.stringify(d.flags.skrimQ), 'skrim', d.flags.skrim, 'whaleArt', d.flags.whaleArt, 'room', d.room);
    sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
    f.contentWindow.location.reload(); await sleep(1500);
    return skrimQRestored({ w: f.contentWindow, b: null, log, sleep, shot, f });
  }
  const it = b.interactables.find((x) => x.root === W); if (it) it.onActivate(); log('taken:', st(), 'in pack', b.inventory.includes(b.whaleArtItem));
  // BACK UP ON HIM: he gets up, comes over, and says it
  let t0 = 0; const far = { x: home.x - (wp.x - home.x) * 0.0, z: home.z };
  put(wp.x, wp.z); steps(1);
  const walk = []; let pts = 0;
  for (let i = 0; i < 60 * 25 && !b.state().dialogOpen; i++) {
    // you walk back toward the way out past him, slowly, and stop 3 m beyond his heap
    const tz = home.z + 3, dz = tz - cam.z; if (t0) b.lookAt(P.x, P.y + 1.4, P.z); else if (Math.abs(dz) > 0.02) put(cam.x + (home.x + 1.5 - cam.x) * 0.01, cam.z + Math.sign(dz) * Math.min(Math.abs(dz), 1.4 / 60));
    b.step(1 / 60); b.updateSkrimLife(1 / 60);
    if (S.stage !== 'deal' && !t0) { t0 = i; log('he gets up at', (i / 60).toFixed(1) + 's, you', Math.hypot(cam.x - P.x, cam.z - P.z).toFixed(1), 'm from him'); }
    if (t0 && (i - t0) % 30 === 0) walk.push(`${S.stage}/${u.sk.mp || ''}/${u.sk.gait || ''} d${Math.hypot(cam.x - P.x, cam.z - P.z).toFixed(1)} moved${Math.hypot(P.x - home.x, P.z - home.z).toFixed(1)} lock${u.sk.lock || 0}`);
    if (t0 && i - t0 === 150 && !pts++) { b.renderer.render(b.scene, b.camera); shot('q_coming', 560, 1.3); }
    if (t0 && (i - t0 === 130 || i - t0 === 146)) { const c0 = cam.clone(), q0 = b.camera.quaternion.clone(), yy = u.g.rotation.y; cam.set(P.x + Math.cos(yy) * 2.8, P.y + 1.2, P.z - Math.sin(yy) * 2.8); b.camera.lookAt(P.x, P.y + 0.95, P.z); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('q_walkside' + (i - t0), 420, 1.3); cam.copy(c0); b.camera.quaternion.copy(q0); b.camera.updateMatrixWorld(true); }
    if (i % 120 === 0) await sleep(1);
  }
  log('  his walk:', walk.join(' | '));
  log('talk open', b.state().dialogOpen, '|', st(), 'd', Math.hypot(cam.x - P.x, cam.z - P.z).toFixed(2));
  if (!b.state().dialogOpen) return;
  await sleep(1100); log('  he opens:', JSON.stringify(txt())); await step(300); shot('q_talk', 560, 1.3);
  if (mode === 'keep') {
    await pick(/keep this/); await closed();
    steps(30); log('kept: fight?', S.stage, 'awake', u.st.awake);
  } else {
    await pick(/Give him/);
    log('  given:', st(), 'in his hand', !!Q.held, 'pack has it', b.inventory.includes(b.whaleArtItem));
    await pick(/Wait you can/);
    if (mode === 'givekill') { await pick(/Kill him/); await closed(); steps(30); log('*Kill him*: ', st(), 'awake', u.st.awake); }
    else { await pick(/let him leave/); await closed(); log('*let him leave*:', st()); }
  }
  if (S.stage === 'leave') {
    const tr = []; let hit = false;
    for (let i = 0; i < 60 * 70 && S.stage === 'leave'; i++) {
      b.step(1 / 60); b.updateSkrimLife(1 / 60);
      if (i % 240 === 0) tr.push(`s${(b.WB_Z ? 0 : 0) + (15000 - P.z).toFixed(1)} gait ${u.sk.gait} lock${u.sk.lock || 0}`);
      if (mode === 'hitleave' && i === 300) { b.hurtMutantTest(u, 2, 0.2); hit = true; log('  hit him on his way out:', st()); }
      if (i % 120 === 0) await sleep(1);
    }
    log('  his way out:', tr.join(' | '));
    log('after:', st(), 'visible', u.g.visible, 'awake', u.st.awake);
    if (mode === 'giverestore') {
      b.saveCheckpoint(); const d = JSON.parse(w.localStorage.getItem(b.SAVE_KEY)); log('saved skrimQ', JSON.stringify(d.flags.skrimQ), 'whaleArt', d.flags.whaleArt, 'pack has it', (d.pack || []).includes('Artifact of the Whale'));
      sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
      f.contentWindow.location.reload(); await sleep(1500);
      await skrimQRestored({ w: f.contentWindow, b: null, log, sleep, shot, f });
      const B = f.contentWindow.__bw; log('  him: visible', B.SKRIM.u.g.visible, 'doomed', B.SKQ.doomed, 'bellyClear', B.wbBellyClear());
      return;
    }
    if (mode === 'give') {
      const sv = b.skqSave(); log('save says', JSON.stringify(sv));
      const d = JSON.parse(w.localStorage.getItem(b.SAVE_KEY) || 'null'); log('stored checkpoint patched:', d && JSON.stringify(d.flags && d.flags.skrimQ), 'pack has it', d && (d.pack || []).includes('Artifact of the Whale'));
      put(home.x, home.z + 40); steps(2); b.whaleClimbOut(); steps(3);
      log('out after he left: farewell', !!b.wfState(), 'whale cut', b.whaleState().busy, 'bellyClear', b.wbBellyClear());
      return;
    }
  }
  if (S.stage === 'fight' || S.stage === 'rise') {
    const nanC = () => b.SKC.list.filter((q) => q.p && !Number.isFinite(q.p.x)).map((q) => q.kind + '/' + q.st).join(',');
    for (let i = 0; i < 90; i++) { try { steps(1); } catch (e) { log('  STEP THREW', i, e.message, 'his pos', P.toArray().map((v) => v.toFixed(2)).join(','), 'act', u.sk.act && u.sk.act.name, 'nan chains', nanC()); break; } const nc = nanC(); if (nc) { log('  NaN chain at', i, nc, 'act', u.sk.act && u.sk.act.name, 'pos', P.toArray().map((v) => v.toFixed(2)).join(','), 'd', Math.hypot(cam.x - P.x, cam.z - P.z).toFixed(2)); break; } }
    log('  chains before the kill', b.SKC.list.map((q) => q.kind + '/' + q.st).join(','), 'act', u.sk.act && u.sk.act.name);
    // (a chain out when he dies goes NaN in the SKC code and throws from `update` every frame, 2026-10-30 — not this
    // probe's to fix: `&chainbug` leaves it in, otherwise the chains are cleared first so the drop can be measured)
    if (!w.location.search.includes('chainbug') && !window.location.search.includes('chainbug')) b.SKC.list.length = 0;
    b.hurtMutantTest(u, 999, 1); log('killed him:', st(), 'alive', u.st.alive);
    for (let i = 0; i < 120; i++) { const hR = u.model.getObjectByName('Character1_RightHand'), hp = hR.getWorldPosition(new V3()); try { steps(1); } catch (e) { log('  STEP THREW at', i, e.message, 'alive', u.st.alive, 'rag', !!u.rag, 'hand', hp.toArray().map((v) => v.toFixed(2)).join(','), 'chains', b.SKC.list.map((q) => q.kind + '/' + q.st + (q.p ? (Number.isFinite(q.p.x) ? '' : ' NaN') : '')).join(',')); break; } }
    const W2 = b.art.world;
    log('  after his death:', st(), W2 ? 'lying at ' + W2.position.toArray().map((v) => v.toFixed(1)).join(',') : '(nothing lying)');
    if (W2) { const it2 = b.interactables.find((x) => x.root === W2); steps(30); if (it2) it2.onActivate(); log('  taken off him:', st()); }
    put(home.x, home.z + 40); steps(2);
    log('bellyClear', b.wbBellyClear(), 'wb', !!b.wbObj());
    b.whaleClimbOut(); steps(4);
    const C = b.wfState(); log('out with it: farewell', !!C, 'artP (a beach artifact)', C ? JSON.stringify(C.artP) : '-');
    for (let i = 0; i < 260 && b.wfState() && !b.wfState().artP; i++) b.step(1 / 60);
    const C2 = b.wfState(); log('  after the cut onto the sand (t', C2 && C2.t.toFixed(2), '): artP', C2 && JSON.stringify(C2.artP), 'inWhale', b.state().inWhale, 'still yours', b.skqHolding());
  }
}
async function skrimQRestored({ w, b, log, sleep, shot, f }) {
  let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
  const B = w2.__bw; const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
  for (let i = 0; i < 400 && (B.frozen() || !B.state().introDone || !B.state().inWhale); i++) { await sleep(100); }
  await sleep(1500);
  for (let i = 0; i < 60; i++) B.frame(1);
  const Q = B.SKQ; log('restored: inWhale', B.state().inWhale, 'built', Q.built, 'broke', Q.broke.toString(2), 'gone piles', Q.piles.filter((p) => p.gone).map((p) => p.i).join(','), 'hidden', Q.piles.filter((p) => !p.g.visible).map((p) => p.i).join(','),
    'pick', Q.pick, 'art', B.artState(), 'holding', B.skqHolding(), 'stage', B.SKRIM.stage, 'lying', !!B.art.world, B.art.world ? B.art.world.userData.belly : '', 'artAt', JSON.stringify(Q.artAt));
}
// the 40 s fight of `skrimIn` with every step guarded: a throw names the chains' state when it fails (a NaN chain hauled in
// threw in the drag's pan, 2026-10-30), and after it how many sound sources the chains made and how many spark bursts
export async function skrimFxFight(ctx) {
  const st = ctx.b.step, n0 = ctx.b.SKA.n, t0 = performance.now();
  const was = new Map(), told = new Set();
  const nanWatch = () => { for (const C of ctx.b.SKC.list) { const bad = !(C.pts[0].x === C.pts[0].x) || (C.p && !(C.p.x === C.p.x)); if (bad && !told.has(C)) { told.add(C); const w = was.get(C) || {}; ctx.log('NaN CHAIN', C.kind, 'now', C.st, 'last frame', w.st, 't', C.t.toFixed(2), 'Ls', w.Ls, '->', C.Ls, 'p', w.p, 'v', C.v && C.v.toArray().map((q) => q.toFixed(1)).join(','), 'pull', C.pull, 'own', C.own, 'landed', C.landed); } was.set(C, { st: C.st, Ls: C.Ls, p: C.p && C.p.toArray().map((q) => q.toFixed(1)).join(',') }); } };
  ctx.b.step = (dt) => { try { st(dt); nanWatch(); } catch (e) { const c = ctx.b.camera.position; ctx.log('FAILED IN A STEP', e.message, 'cam', c.x.toFixed(1), c.z.toFixed(1), 'chains', ctx.b.SKC.list.map((C) => C.kind + ':' + C.st + ' p' + (C.p ? C.p.x : '-') + ' Ls ' + C.Ls).join(' | ')); throw e; } };
  await skrimIn(ctx);
  ctx.log('chain sound sources', ctx.b.SKA.n - n0, 'in', ((performance.now() - t0) / 1000).toFixed(0), 's of probe (40 s of fight) | spark bursts', ctx.b.SKSP.bursts, '| chains left', ctx.b.SKC.list.length, 'NaN chains', ctx.b.SKC.list.filter((C) => !(C.pts[0].x === C.pts[0].x)).map((C) => C.kind + ':' + C.st + ' t' + C.t.toFixed(1) + ' Ls ' + C.Ls + ' p ' + (C.p ? C.p.x : '-') + ' tip ' + (C.tip ? C.tip.x : '-') + ' base ' + (C.base ? C.base.x : '-')).join(' | ') || 0);
}

// THE CRYING HEAD AS IT COMES OUT OF ITS FILE (2026-10-30): its size and which way it faces in the bind pose, what its
// two clips do to its height, and how fast its leg tips go back under it while they are down (the MOVE clip's ground speed)
export async function cryMeasure({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 600 && !b.CRY.gltf; i++) { b.frame(1); await sleep(50); }
  const g = b.CRY.gltf; if (!g) { log('no gltf'); return; }
  const T = b.THREE, sc = g.scene; sc.updateMatrixWorld(true);
  let sk = null; sc.traverse((o) => { if (o.isSkinnedMesh) sk = o; });
  const bb = new T.Box3(); sk.computeBoundingBox(); bb.copy(sk.boundingBox).applyMatrix4(sk.matrixWorld);
  const f = (v) => v.toArray().map((q) => q.toFixed(3)).join(',');
  log('bind bbox', f(bb.min), '..', f(bb.max), 'size', f(bb.getSize(new T.Vector3())), 'clips', g.animations.map((a) => a.name + ' ' + a.duration.toFixed(2)).join(' | '));
  const W = (n) => { const o = sc.getObjectByName(n); return o ? o.getWorldPosition(new T.Vector3()) : null; };
  for (const n of ['HeadBase', 'Jaw', 'Jaw_end', 'Eyelid_left', 'Eyelid_right', 'Eye_ropes', 'H_left', 'H_left_004_end', 'H_right_004_end', 'H_left_009_end', 'H_left_014_end', 'H_left_019_end']) { const p = W(n); log('  ', n, p ? f(p) : '-'); }
  const names = []; sc.traverse((o) => { if (o.isBone) names.push(o.name); }); log('bones', names.join(' '));
  const tips = []; sc.traverse((o) => { if (o.isBone && /^H_(left|right)_\d+_end$/.test(o.name)) tips.push(o); });
  const mx = new T.AnimationMixer(sc);
  for (const clip of g.animations) {
    mx.stopAllAction(); const a = mx.clipAction(clip); a.reset().play(); mx.update(0);
    const N = 48, dt = clip.duration / N, rows = []; let prev = null; const sp = []; let hbMin = 1e9, hbMax = -1e9, low = 1e9, high = -1e9;
    for (let k = 0; k <= N; k++) {
      mx.setTime(k * dt); sc.updateMatrixWorld(true);
      const P = tips.map((t) => t.getWorldPosition(new T.Vector3())), hb = W('HeadBase');
      hbMin = Math.min(hbMin, hb.y); hbMax = Math.max(hbMax, hb.y);
      const ly = Math.min(...P.map((p) => p.y)); low = Math.min(low, ly); high = Math.max(high, ...P.map((p) => p.y));
      if (prev) P.forEach((p, i) => { if (p.y < ly + 0.02 * (bb.max.y - bb.min.y) + 1e-6) sp.push([(p.x - prev[i].x) / dt, (p.z - prev[i].z) / dt, (p.y - prev[i].y) / dt]); });
      if (k % 8 === 0) rows.push(`t${(k * dt).toFixed(2)} hb ${f(hb)} lowTip ${ly.toFixed(3)}`);
      prev = P;
    }
    const m = (j) => sp.reduce((s, q) => s + q[j], 0) / Math.max(1, sp.length);
    log(clip.name, 'HeadBase y', hbMin.toFixed(3), '..', hbMax.toFixed(3), 'tips y', low.toFixed(3), '..', high.toFixed(3), '| contact tip vel mean x', m(0).toFixed(3), 'z', m(2).toFixed(3), 'y', m(1).toFixed(3), 'n', sp.length);
    log('   ', rows.join(' | '));
  }
}
// the head from four sides in the gut, each clip (a red ball off its +X, a blue one off its +Z)
export async function cryLook({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 600 && !b.CRY.gltf; i++) { b.frame(1); await sleep(50); }
  const g = b.CRY.gltf, T = b.THREE, sc = g.scene, K = +(new URLSearchParams(window.location.search).get('k') || 0.0016);
  b.placeInWhale(); for (let i = 0; i < 20; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const cam = b.camera.position, fx = cam.x, fz = cam.z - 2.2, fy = b.skrimFloorW(fx, fz);
  sc.scale.setScalar(K); sc.position.set(fx, fy + 184 * K, fz); b.scene.add(sc);
  const lamp = new T.PointLight(0xffffff, 6, 8, 1); lamp.position.set(fx + 0.6, fy + 1.6, fz + 1.2); b.scene.add(lamp);
  const ball = (c, x, z) => { const m = new T.Mesh(new T.SphereGeometry(0.04), new T.MeshBasicMaterial({ color: c })); m.position.set(fx + x, fy + 0.3, fz + z); b.scene.add(m); };
  ball(0xff0000, 0.7, 0); ball(0x0000ff, 0, 0.7);
  if (window.location.search.includes('basic')) sc.traverse((o) => { if (o.isMesh) o.material = new T.MeshBasicMaterial({ map: o.material.map }); });
  const mx = new T.AnimationMixer(sc);
  for (const [clip, t] of [['IDLE', 0], ['MOVE', 0.2], ['MOVE', 0.4]]) {
    mx.stopAllAction(); mx.clipAction(g.animations.find((a) => a.name === clip)).reset().play(); mx.setTime(t);
    for (const [nm, x, y, z] of [['f', 0, 0.35, 0.8], ['r', 0.8, 0.35, 0], ['top', 0.01, 1.0, 0.0], ['b', 0, 0.35, -0.8]]) {
      cam.set(fx + x, fy + y, fz + z); b.camera.lookAt(fx, fy + 0.2, fz); b.camera.updateMatrixWorld(true);
      shot(`look_${clip}${t}_${nm}`, 420, 1.6);
    }
  }
}
// each leg tip through MOVE: its height, and its velocity over the ground while it is down (within 6 units of the floor)
export async function cryGait({ w, b, log, sleep }) {
  for (let i = 0; i < 600 && !b.CRY.gltf; i++) { b.frame(1); await sleep(50); }
  const g = b.CRY.gltf, T = b.THREE, sc = g.scene;
  const tips = []; sc.traverse((o) => { if (o.isBone && /^H_(left|right)_\d+_end$/.test(o.name)) tips.push(o); });
  const mx = new T.AnimationMixer(sc), clip = g.animations.find((a) => a.name === 'MOVE'); mx.clipAction(clip).play();
  const N = 76, dt = clip.duration / N, ys = tips.map(() => []), ps = tips.map(() => []);
  for (let k = 0; k <= N; k++) { mx.setTime(k * dt); sc.updateMatrixWorld(true); tips.forEach((t, i) => { const p = t.getWorldPosition(new T.Vector3()); ys[i].push(p.y); ps[i].push(p); }); }
  const floor = Math.min(...ys.flat()); log('floor (lowest tip)', floor.toFixed(1));
  let sx = 0, sz = 0, n = 0;
  tips.forEach((t, i) => {
    const v = []; let st = 0;
    for (let k = 1; k <= N; k++) { const y0 = ps[i][k - 1].y, y1 = ps[i][k].y; const lo = Math.min(...ys[i]); if (y0 < lo + 12 && y1 < lo + 12) { v.push([(ps[i][k].x - ps[i][k - 1].x) / dt, (ps[i][k].z - ps[i][k - 1].z) / dt]); st++; } }
    const mx_ = v.reduce((s, q) => s + q[0], 0) / Math.max(1, v.length), mz = v.reduce((s, q) => s + q[1], 0) / Math.max(1, v.length);
    if (v.length) { sx += mx_ * v.length; sz += mz * v.length; n += v.length; }
    log(t.name, 'y', Math.min(...ys[i]).toFixed(0), '..', Math.max(...ys[i]).toFixed(0), 'stance frames', st, '/', N, 'vel x', mx_.toFixed(1), 'z', mz.toFixed(1), 'start', ps[i][0].x.toFixed(0), ps[i][0].z.toFixed(0));
  });
  log('ALL stance vel x', (sx / n).toFixed(1), 'z', (sz / n).toFixed(1), 'units/s over', n, 'frames');
}
// SKRIM'S FOUR JARS AND THE ONE-HIT HEAPS (2026-10-30): a small heap struck once; then him killed — his jars thrown,
// where they come to rest over the gut's floor; taken one; the save's list. (own profile)
export async function skrimJars({ w, b, log, sleep, shot }) {
  b.settings.devMode = false;
  b.placeInWhale();
  const S = b.SKRIM;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed); i++) { b.frame(1); await sleep(40); }
  const u = S.u; for (let i = 0; i < 30; i++) b.frame(1);
  const Q = b.SKQ, small = Q.piles.find((p) => p.K < 0.65 && !p.gone), big = Q.piles.find((p) => p.K >= 0.65 && !p.gone);
  log('piles', Q.piles.length, 'small', Q.piles.filter((p) => p.K < 0.65).length);
  if (small) log('small heap K', small.K.toFixed(2), 'one light blow:', b.skqPileHit(small, 1), 'gone', small.gone);
  if (big) log('big heap K', big.K.toFixed(2), 'one light blow:', b.skqPileHit(big, 1), 'hits', big.hits);
  b.skrimFight(); for (let i = 0; i < 60; i++) b.step(1 / 60);
  b.hurtMutantTest(u, 999);
  for (let i = 0; i < 60 * 4; i++) b.step(1 / 60);
  const J = S.jars || [];
  log('jars out', J.length, 'done', !!S.jarsDone, J.map((j) => 'over floor ' + (j.jar.position.y - b.skrimFloorW(j.x, j.z)).toFixed(3)).join(' | '));
  if (J[1]) { const P = J[1].jar.position, cam = b.camera.position; w.requestAnimationFrame = () => 0; cam.set(P.x + 1.1, P.y + 0.35, P.z + 1.1); b.camera.fov = 40; b.camera.updateProjectionMatrix(); b.camera.lookAt(P.x, P.y, P.z); b.camera.updateMatrixWorld(true); b.lamps(); b.renderer.render(b.scene, b.camera); shot('jar_rest', 420, 1.3); log('jar box', (() => { const B = new (b.THREE.Box3)().setFromObject(J[1].jar.children.find((o) => o.isMesh && o.name !== 'hitProxy') || J[1].jar); return 'min y over floor ' + (B.min.y - b.skrimFloorW(P.x, P.z)).toFixed(3); })()); }
  if (J[0]) { J[0].jar.parent.remove(J[0].jar); for (let i = 0; i < 5; i++) b.step(1 / 60); }
  log('after one taken: left', (S.jars || []).length);
}
// SKRIM'S HOOK IN THE BEACHED WHALE'S SIDE (2026-10-30): up the beach to it; his model in; the chain settled; stills from
// the side and below, and the chain's shape: where it hangs, how much lies on the sand, how far it swings. (own profile)
export async function wbHook({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 200 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(250); }
  let W = null; for (let i = 0; i < 120 && !(W = b.wbHookS()); i++) { b.frame(2); await sleep(100); }
  if (!W) { log('no whale hook'); return; }
  const cam = b.camera.position, A = W.H.getWorldPosition(cam.clone());
  cam.set(A.x + 6, 1.7, A.z + 2); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !W.built; i++) { cam.set(A.x + 6, 1.7, A.z + 2); b.frame(2); await sleep(60); }
  log('hook built', W.built, 'at', A.toArray().map((v) => v.toFixed(1)).join(','));
  const sw = []; for (let i = 0; i < 60 * 6; i++) { cam.set(A.x + 6, 1.7, A.z + 2); b.frame(1); if (W.sim && i % 30 === 0) sw.push(W.sim.P[Math.floor(W.sim.N * 0.6)].clone()); if (i % 60 === 0) await sleep(5); }
  const S = W.sim; if (!S) { log('no chain sim'); return; }
  log('flank reach by height (m out from the hook point):', Array.from({ length: 12 }, (_, k) => (k * 0.5).toFixed(1) + ':' + S.out[k * 5].toFixed(2)).join(' '));
  log('points (y, out):', S.P.filter((_, i) => i % 4 === 0).map((p) => p.y.toFixed(2) + '/' + ((p.x - S.hpW.x) * S.Nh.x + (p.z - S.hpW.z) * S.Nh.z).toFixed(2)).join(' '), '| hook point y', S.hpW.y.toFixed(2), 'seg', S.seg.toFixed(3));
  const onSand = S.P.filter((p) => p.y < 0.06).length, low = Math.min(...S.P.map((p) => p.y)), spread = sw.length ? Math.max(...sw.map((p) => p.distanceTo(sw[0]))) : 0;
  log('chain: links drawn', S.L.count, '| points on the sand', onSand, 'of', S.N, '| lowest', low.toFixed(3), '| a point 60% down moved up to', spread.toFixed(2), 'm in 6 s');
  w.requestAnimationFrame = () => 0;
  const still = (nm, ox, oy, oz, ty = 0) => { cam.set(A.x + ox, oy, A.z + oz); b.camera.fov = 50; b.camera.updateProjectionMatrix(); b.camera.lookAt(A.x, A.y * 0.5 + ty, A.z); b.camera.updateMatrixWorld(true); b.lamps(); b.renderer.render(b.scene, b.camera); shot(nm, 480, 1.3); };
  const Nh = S.Nh, T = S.T;
  still('hook_side', Nh.x * 5 + T.x * 2, 1.7, Nh.z * 5 + T.z * 2);
  still('hook_close', Nh.x * 2.2 + T.x * 0.8, A.y + 0.2, Nh.z * 2.2 + T.z * 0.8, A.y * 0.5);
  still('hook_low', Nh.x * 3.5 - T.x * 1.5, 0.6, Nh.z * 3.5 - T.z * 1.5, -A.y * 0.2);
  const q0 = W.H.quaternion.clone(); for (const r of [0, 1.57, 3.14, 4.71]) { W.H.quaternion.copy(q0); W.H.rotateZ(r - Math.PI); W.H.updateMatrixWorld(true); still('hook_rot' + r, Nh.x * 2 + T.x * 0.5, A.y + 0.1, Nh.z * 2 + T.z * 0.5, A.y * 0.5); } W.H.quaternion.copy(q0);
}
// THE CRYING HEADS (2026-10-30): walk past the farthest heap; the wake, every leap (launch, apex, where it came down
// against where you were), the bites, a swing that takes one out of the air and the body's flight, a guard, and stills.
// `&m=` fight (default) | restore
export async function cryHeads({ w, b, log, sleep, shot }) {
  const mode = new URLSearchParams(window.location.search).get('m') || 'fight';
  const f = w.frameElement;
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
  for (let i = 0; i < 600 && !b.CRY.gltf; i++) { b.frame(1); await sleep(50); }
  b.placeInWhale();
  const C = b.CRY, cam = b.camera.position, V3 = cam.constructor, WX = 15000, WY = 500, WZ = 15000;
  for (let i = 0; i < 400 && !C.built; i++) { b.frame(1); await sleep(50); }
  for (let i = 0; i < 20; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const A = b.whaleS().arena;
  log('built', C.built, 'skrim s', A.skrimSpot.s.toFixed(1), 'piles s', b.SKQ.piles.map((p) => p.s.toFixed(1)).join(','), 'far', C.farS.toFixed(1), 'wakeS', C.wakeS.toFixed(1), 'WH_S1 154');
  log('nest', C.list.map((h) => `#${h.i} x${h.p.x.toFixed(1)} s${(-h.p.z).toFixed(1)} y${h.p.y.toFixed(2)}`).join(' | '), 'jar', C.jar ? C.jar.position.toArray().map((q) => q.toFixed(2)).join(',') + ' local s ' + (WZ - C.jar.position.z).toFixed(1) : 'none');
  const put = (x, z) => { cam.x = x; cam.z = z; const fy = b.skrimFloorW(x, z); b.groundY = fy; cam.y = fy + 1.62; b.camBaseY = cam.y; };
  const fl = (v) => v.toArray().map((q) => q.toFixed(2)).join(',');
  C.log = [];
  let seen = 0; const flush = () => { while (seen < C.log.length) log('  EV', JSON.stringify(C.log[seen++])); };
  // the jar from 25 m up the gut and from short of the wake line, looking at it: lit like a dropped thing
  const cxW = (s) => WX + 4.4 * Math.sin(s * 0.021) + 1.3 * Math.sin(s * 0.057 + 1.3);
  if (C.jar) { const J = C.jar.position, js = WZ - J.z, Wl = b.whWallAtS ? b.whWallAtS(js) : null; log('jar local x', (J.x - WX).toFixed(2), 's', js.toFixed(2), 'floor+', (J.y - b.skrimFloorW(J.x, J.z)).toFixed(3)); }
  for (const [nm, back] of [['cry_jar_25m', 25], ['cry_jar_near', 8.5]]) { const J = C.jar.position, s = WZ - J.z - back; put(cxW(s), WZ - s); b.lookAt(J.x, J.y + 0.2, J.z); b.step(1 / 60); b.lookAt(J.x, J.y + 0.2, J.z); b.renderer.render(b.scene, b.camera); shot(nm, 480, 1.0); }
  if (mode === 'restore') {
    for (let i = 0; i < 3; i++) { const h = C.list[i]; h.was = 'probe'; }
  }
  // walk on toward the jar at a walk, looking down the gut, until the nest wakes
  let s = C.wakeS - 2.5, woke = -1;
  for (let i = 0; i < 600 && woke < 0; i++) { s += 1.4 / 60; put(cxW(s), WZ - s); b.look(0, -0.05); b.step(1 / 60); if (C.woke) woke = i; }
  log('woke at s', s.toFixed(2), 'after', (woke / 60).toFixed(2), 's of walking', '| head0', C.list[0].mode, fl(C.list[0].p));
  // THE SCARE: from your eye, as it comes
  let shotScare = false;
  for (let i = 0; i < 240; i++) {
    b.step(1 / 60);
    const h = C.list[0];
    if (!shotScare && h.mode === 'leap' && h.t > h.T * 0.8) { shotScare = true; b.renderer.render(b.scene, b.camera); shot('cry_scare_eye', 480, 1.0); log('scare frame: head0 at', fl(h.p), 'dist to eye', Math.hypot(h.p.x - (cam.x - WX), h.p.y - (cam.y - WY), h.p.z - (cam.z - WZ)).toFixed(2)); }
    if (h.mode === 'latch' && h.t > 0.2 && h.t < 0.22) { b.renderer.render(b.scene, b.camera); shot('cry_latched', 480, 1.0); }
    flush(); if (i % 30 === 0) b.heal();
    if (h.mode === 'crawl' && i > 60) break;
  }
  log('after the scare: hp', b.state().hp, C.list.map((h) => h.mode).join(','));
  if (mode === 'restore') {
    b.saveCheckpoint(); const d = JSON.parse(w.localStorage.getItem(b.SAVE_KEY)); log('saved cry', JSON.stringify(d.flags.cry));
    // kill one, then a stick should put it into the stored save
    const h = C.list[1]; h.mode = 'crawl'; h.cd = 9; h.p.set(cam.x - WX + 1, b.skrimFloorW(cam.x + 1, cam.z - 1) - WY + 0.39, cam.z - WZ - 1);
    for (let i = 0; i < 40 && !(C.dead & 2); i++) { if (i === 0) { b.lookAt(h.p.x + WX, h.p.y + WY, h.p.z + WZ); b.startDig(0); } b.step(1 / 60); } flush();
    // and the jar taken
    const jars0 = b.state().jars, it = b.interactables.find((q) => q.root === C.jar); if (it) it.onActivate();
    log('jar taken: jars', jars0, '->', b.state().jars, 'jar left', !!C.jar);
    const d2 = JSON.parse(w.localStorage.getItem(b.SAVE_KEY)); log('stored after a kill and the jar', JSON.stringify(d2.flags.cry), 'dead bits', C.dead, 'took has the jar', (d2.took || []).filter((q) => q.startsWith('Take the jar@')).length);
    b.saveCheckpoint();
    sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
    f.contentWindow.location.reload(); await sleep(1500);
    let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
    const B = w2.__bw; const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
    for (let i = 0; i < 400 && (B.frozen() || !B.state().introDone || !B.state().inWhale); i++) await sleep(100);
    await sleep(1500); for (let i = 0; i < 60; i++) B.frame(1);
    const C2 = B.CRY; log('restored: inWhale', B.state().inWhale, 'built', C2.built, 'woke', C2.woke, 'dead', C2.dead, 'modes', C2.list.map((h) => h.mode).join(','), 'jar', !!C2.jar, 'jarTaken', C2.jarTaken);
    return;
  }
  // THE FIGHT: you stand and face the nearest; every leap logged; the third leap you swing at, mid-air; one you guard
  let leaps = 0, swung = false, guarded = false, sideShot = false, deadShot = false, killed = null;
  const near = () => { let best = null, bd = 1e9; for (const h of C.list) { if (h.mode === 'dead' || h.mode === 'still') continue; const d = Math.hypot(h.p.x - (cam.x - WX), h.p.z - (cam.z - WZ)); if (d < bd) { bd = d; best = h; } } return best; };
  const home = [cam.x, cam.z];
  for (let i = 0; i < 60 * 40; i++) {
    put(home[0], home[1]);
    const h = near(); if (!h && !killed) break;
    const tgt = C.list.find((q) => q.mode === 'leap' || q.mode === 'rear') || h;
    if (tgt) b.lookAt(tgt.p.x + WX, tgt.p.y + WY, tgt.p.z + WZ);
    const n0 = C.log.length;
    b.step(1 / 60); if (i % 20 === 0) b.heal();
    flush();
    for (let k = n0; k < C.log.length; k++) if (C.log[k].ev === 'leap' && !C.log[k].scare) leaps++;
    const L = C.list.find((q) => q.mode === 'leap' && !q.scare);
    if (L && !sideShot && L.t > L.T * 0.45 && leaps >= 1) {
      sideShot = true; const c0 = cam.clone(), q0 = b.camera.quaternion.clone();
      const vx = L.v.x, vz = L.v.z, vl = Math.hypot(vx, vz) || 1;
      cam.set(L.p.x + WX - vz / vl * 2.2, L.p.y + WY + 0.2, L.p.z + WZ + vx / vl * 2.2); b.camera.lookAt(L.p.x + WX, L.p.y + WY, L.p.z + WZ); b.camera.updateMatrixWorld(true);
      b.renderer.render(b.scene, b.camera); shot('cry_leap_side', 480, 1.3); cam.copy(c0); b.camera.quaternion.copy(q0); b.camera.updateMatrixWorld(true);
      log('side still: leap of #' + L.i, 'at', fl(L.p), 'v', fl(L.v));
    }
    if (L && leaps === 2 && !guarded) { guarded = true; b.testGuard(true); log('guard up for #' + L.i); }
    if (guarded && guarded !== 'down' && !C.list.some((q) => q.mode === 'leap' && !q.scare)) { b.testGuard(false); guarded = 'down'; }
    if (L && leaps >= 3 && !swung) {
      const d = Math.hypot(L.p.x - (cam.x - WX), L.p.z - (cam.z - WZ));
      if (d < 3.6) { swung = true; b.lookAt(L.p.x + WX, L.p.y + WY, L.p.z + WZ); b.startDig(0); log('SWING (light) at #' + L.i, 'd', d.toFixed(2), 'in flight t', L.t.toFixed(2), '/', L.T.toFixed(2)); }
    }
    const K = C.list.find((q) => q.mode === 'dead');
    if (K && !killed) { killed = K; log('killed #' + K.i, 'was', K.was); }
    if (killed && killed.mode === 'dead' && i % 6 === 0) log('   body', fl(killed.p), '|v|', killed.v.length().toFixed(2), '|w|', killed.w.length().toFixed(1), 'ground', killed.ground);
    if (killed && killed.mode === 'still' && !deadShot) {
      deadShot = true; const c0 = cam.clone(), q0 = b.camera.quaternion.clone(), P = killed.p;
      cam.set(P.x + WX + 0.9, P.y + WY + 0.7, P.z + WZ + 0.9); b.camera.lookAt(P.x + WX, P.y + WY, P.z + WZ); b.camera.updateMatrixWorld(true);
      b.renderer.render(b.scene, b.camera); shot('cry_dead', 480, 1.3); cam.copy(c0); b.camera.quaternion.copy(q0); b.camera.updateMatrixWorld(true);
      log('dead one settled at', fl(P), 'travelled', Math.hypot(P.x - killed.lastAt[0], P.z - killed.lastAt[2]).toFixed(2), 'm from where it was struck');
    }
    if (killed && !killed.lastAt) killed.lastAt = killed.p.toArray();
    if (leaps >= 7 && deadShot) break;
    if (i % 240 === 0) await sleep(1);
  }
  flush();
  log('end: hp', b.state().hp, 'modes', C.list.map((h) => h.mode).join(','), 'dead bits', C.dead, 'leaps', leaps, 'save', JSON.stringify(b.crySave()));
}
// one built head in MOVE, unlit, from six sides round its body origin (which way its face is, in the game's own frame)
export async function cryFace({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 600 && !b.CRY.gltf; i++) { b.frame(1); await sleep(50); }
  b.placeInWhale(); const C = b.CRY;
  for (let i = 0; i < 400 && !C.built; i++) { b.frame(1); await sleep(50); }
  w.requestAnimationFrame = () => 0;
  const T = b.THREE, h = C.list[0], cam = b.camera.position;
  h.model.traverse((o) => { if (o.isMesh) o.material = new T.MeshBasicMaterial({ map: o.material.map, skinning: true }); });
  h.idle.weight = 0; h.move.weight = 1; h.mixer.update(0.2); h.yaw = 0; h.pitch = 0; h.roll = 0;
  h.body.position.copy(h.p); h.body.quaternion.set(0, 0, 0, 1); h.body.updateMatrixWorld(true);
  const P = h.body.getWorldPosition(new T.Vector3());
  h.model.updateMatrixWorld(true);
  const hb = h.model.getObjectByName('HeadBase').getWorldPosition(new T.Vector3()), jw = h.model.getObjectByName('Jaw').getWorldPosition(new T.Vector3()), el = h.model.getObjectByName('Eyelid_left').getWorldPosition(new T.Vector3());
  let sk = null; h.model.traverse((o) => { if (o.isSkinnedMesh) sk = o; }); sk.computeBoundingBox(); const bb = sk.boundingBox.clone().applyMatrix4(sk.matrixWorld);
  const f = (v) => v.clone().sub(P).toArray().map((q) => q.toFixed(3)).join(',');
  log('rel body origin: HeadBase', f(hb), 'Jaw', f(jw), 'Eyelid_left', f(el), 'bbox', f(bb.min), '..', f(bb.max));
  for (const [nm, x, y, z] of [['pz', 0, 0.1, 0.6], ['nz', 0, 0.1, -0.6], ['px', 0.6, 0.1, 0], ['nx', -0.6, 0.1, 0], ['py', 0.01, 0.6, 0], ['ny', 0.01, -0.6, 0]]) {
    cam.set(P.x + x, P.y + y, P.z + z); b.camera.lookAt(P); b.camera.updateMatrixWorld(true); shot('face_' + nm, 300, 1.0);
  }
  // the camera on +Z of it at 0.55 m, the body pitched (Euler YXZ, yaw 0): which pitch turns its face to you
  for (const pt of [-0.6, -0.4, -0.2, 0.4]) {
    h.body.quaternion.setFromEuler(new T.Euler(pt, 0, 0, 'YXZ')); h.body.updateMatrixWorld(true);
    cam.set(P.x, P.y, P.z + 0.42); b.camera.lookAt(P); b.camera.updateMatrixWorld(true); shot('pitch_' + pt, 360, 1.0);
  }
}
// THE HOOK IN THE HEAL (2026-10-30, "make the hook and chain dissapear in the healing cutscene not sit in the water"):
// the farewell started on the beach, run past the throw (WL.harp 15.2 s) — the hook and its chain gone, not lying. (own profile)
export async function wbHookHeal({ w, b, log, sleep }) {
  for (let i = 0; i < 200 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(250); }
  let W = null; for (let i = 0; i < 120 && !(W = b.wbHookS()); i++) { b.frame(2); await sleep(100); }
  if (!W) { log('no hook'); return; }
  const A = W.H.getWorldPosition(b.camera.position.clone()), cam = b.camera.position;
  for (let i = 0; i < 300 && !(W.built && W.sim); i++) { cam.set(A.x + 6, 1.7, A.z + 2); b.frame(2); await sleep(40); }
  log('before: hook in scene', !!W.H.parent, 'chain shown', !!(W.sim && W.sim.L.visible));
  b.startWhaleFarewell();
  const seen = []; let gone = null;
  for (let i = 0; i < 60 * 24; i++) { b.step(1 / 60); const C = b.wfState(); const t = (i + 1) / 60;
    if (C && C.harp && !seen.length) seen.push('thrown at ' + t.toFixed(1) + 's');
    if (C && C.harp && !W.H.parent && gone === null) gone = t;
    if (i % 120 === 0) await sleep(1); }
  const ch = b.scene.getObjectByName('harpoonChain');
  log('heal:', seen.join(' '), '| hook gone at', gone && gone.toFixed(2) + 's', '| hook in scene', !!W.H.parent, '| chain visible', !!(ch && ch.visible));
}
// THE CRYING HEADS, SECOND PASS (2026-10-30): the jar from Skrim's spot; the walk to it (they come running, the first
// at your face); then you back off, stand, and circle — where they are every half second, every leap and whether it bit,
// and the smoothness: the largest one-frame turn of each head's body and its largest one-frame step, by mode
export async function cryRun({ w, b, log, sleep, shot }) {
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) {}
  for (let i = 0; i < 600 && !b.CRY.gltf; i++) { b.frame(1); await sleep(50); }
  b.placeInWhale();
  const C = b.CRY, cam = b.camera.position, T = b.THREE, WX = 15000, WY = 500, WZ = 15000;
  for (let i = 0; i < 400 && !C.built; i++) { b.frame(1); await sleep(50); }
  for (let i = 0; i < 20; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const A = b.whaleS().arena, J = C.jar.position;
  const put = (x, z) => { cam.x = x; cam.z = z; const fy = b.skrimFloorW(x, z); b.groundY = fy; cam.y = fy + 1.62; b.camBaseY = cam.y; };
  const cxW = (s) => WX + 4.4 * Math.sin(s * 0.021) + 1.3 * Math.sin(s * 0.057 + 1.3);
  // FROM SKRIM: stood beside him, looking down the gut at it
  { put(WX + A.skrimSpot.x + 1.2, WZ - A.skrimSpot.s); b.lookAt(J.x, J.y + 0.3, J.z); b.step(1 / 60); b.lookAt(J.x, J.y + 0.3, J.z); b.step(1 / 60);
    log('from Skrim: distance to the jar', cam.distanceTo(J).toFixed(1), 'glow scale', C.glow.scale.x.toFixed(2), 'opacity', C.glow.material.opacity.toFixed(2));
    const q = J.clone(); q.y += 0.3; q.project(b.camera); log('  jar on screen at ndc', q.x.toFixed(3), q.y.toFixed(3));
    b.renderer.render(b.scene, b.camera); shot('run_from_skrim', 480, 1.0); }
  C.log = []; let seen = 0;
  const evs = []; const flush = () => { while (seen < C.log.length) { const e = C.log[seen++]; evs.push({ ...e, ph }); if (e.ev !== 'leap') log('  EV', ph, JSON.stringify(e)); } };
  let ph = 'approach';
  const prev = C.list.map((h) => ({ p: h.p.clone(), q: h.body.quaternion.clone(), m: h.mode }));
  const worst = {}; const note = (k, v, what) => { if (!worst[k] || v > worst[k][0]) worst[k] = [v, what]; };
  const frame = (fi) => {
    b.step(1 / 60); flush(); if (fi % 20 === 0) b.heal();
    C.list.forEach((h, i) => {
      const P = prev[i]; h.body.updateMatrixWorld(true);
      if (h.mode !== 'dead' && h.mode !== 'still' && h.mode !== 'latch' && P.m !== 'latch') {
        const ang = P.q.angleTo(h.body.quaternion) * 60, step = P.p.distanceTo(h.p) * 60;
        const key = P.m === h.mode ? h.mode : P.m + '>' + h.mode;
        note('turn ' + key, +ang.toFixed(1), 'rad/s #' + i); note('speed ' + key, +step.toFixed(2), 'm/s #' + i);
      }
      P.p.copy(h.p); P.q.copy(h.body.quaternion); P.m = h.mode;
    });
  };
  const rows = []; const snap = (t) => rows.push(`${ph} t${t.toFixed(1)} you s${(WZ - cam.z).toFixed(1)} | ` + C.list.map((h) => `#${h.i} ${h.mode} d${Math.hypot(h.p.x - (cam.x - WX), h.p.z - (cam.z - WZ)).toFixed(1)}`).join(' '));
  // THE APPROACH: from 10 m short of the line, walking at the jar
  let s = C.wakeS - 10, fi = 0, wokeAt = -1, scareAt = -1;
  for (; fi < 60 * 30 && s < WZ - J.z - 1.5; fi++) {
    if (scareAt < 0 || fi - scareAt > 70) s += 1.4 / 60;
    put(cxW(s), WZ - s); b.lookAt(J.x, J.y + 0.3, J.z); frame(fi);
    if (C.woke && wokeAt < 0) { wokeAt = fi; log('woke: you at s', s.toFixed(1), (WZ - J.z - s).toFixed(1), 'm short of the jar; heads', C.list.map((h) => Math.hypot(h.p.x - (cam.x - WX), h.p.z - (cam.z - WZ)).toFixed(1)).join(',')); }
    const h0 = C.list[0];
    if (scareAt < 0 && h0.mode === 'leap') { scareAt = fi; log('the scare leaps', ((fi - wokeAt) / 60).toFixed(2), 's after the wake, from', Math.hypot(h0.p.x - (cam.x - WX), h0.p.z - (cam.z - WZ)).toFixed(2), 'm, you at s', s.toFixed(1)); }
    if (scareAt > 0 && fi - scareAt === Math.round(h0.T * 0.75 * 60)) { b.renderer.render(b.scene, b.camera); shot('run_scare', 480, 1.0); }
    if (fi % 30 === 0 && wokeAt >= 0) snap((fi - wokeAt) / 60);
    if (scareAt > 0 && fi - scareAt > 240) break;
  }
  // BACK OFF up the gut at a jog for 6 s, looking back at them
  ph = 'retreat'; const t0 = fi;
  for (let k = 0; k < 360; k++, fi++) { s -= 3.0 / 60; put(cxW(s), WZ - s); const n = C.list.find((h) => h.mode !== 'dead' && h.mode !== 'still'); if (n) b.lookAt(n.p.x + WX, n.p.y + WY, n.p.z + WZ); frame(fi); if (k % 30 === 0) snap((fi - t0) / 60); }
  // STAND for 8 s
  ph = 'stand'; const t1 = fi;
  for (let k = 0; k < 480; k++, fi++) { put(cxW(s), WZ - s); const n = C.list.find((h) => h.mode === 'leap' || h.mode === 'rear') || C.list[0]; b.lookAt(n.p.x + WX, n.p.y + WY, n.p.z + WZ); frame(fi); if (k % 30 === 0) snap((fi - t1) / 60);
    const L = C.list.find((q) => q.mode === 'leap' && q.t > q.T * 0.5 && q.t < q.T * 0.5 + 0.02);
    if (L && !w.__side) { w.__side = 1; const c0 = cam.clone(), q0 = b.camera.quaternion.clone(), vl = Math.hypot(L.v.x, L.v.z) || 1; cam.set(L.p.x + WX - L.v.z / vl * 2.4, L.p.y + WY + 0.2, L.p.z + WZ + L.v.x / vl * 2.4); b.camera.lookAt(L.p.x + WX, L.p.y + WY, L.p.z + WZ); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); shot('run_leap_side', 480, 1.3); cam.copy(c0); b.camera.quaternion.copy(q0); b.camera.updateMatrixWorld(true); }
  }
  // CIRCLE: walking round a 3 m circle at 2.6 m/s for 10 s
  ph = 'moving'; const t2 = fi, cx0 = cam.x, cz0 = cam.z;
  for (let k = 0; k < 600; k++, fi++) { const a = k / 60 * 2.6 / 3; put(cx0 + Math.sin(a) * 3 - 0, cz0 + Math.cos(a) * 3 - 3); const n = C.list.find((h) => h.mode === 'leap' || h.mode === 'rear') || C.list[1]; b.lookAt(n.p.x + WX, n.p.y + WY, n.p.z + WZ); frame(fi); if (k % 30 === 0) snap((fi - t2) / 60); }
  for (const r of rows) log(r);
  for (const p of ['approach', 'retreat', 'stand', 'moving']) {
    const L = evs.filter((e) => e.ph === p && e.ev === 'leap'), B = evs.filter((e) => e.ph === p && e.ev === 'bit'), Ld = evs.filter((e) => e.ph === p && e.ev === 'landed' && !e.off);
    log(p, 'leaps', L.length, 'bites', B.length, 'missed (landed)', Ld.length, Ld.length ? 'miss by ' + Ld.map((e) => e.miss).join(',') : '');
  }
  log('SMOOTHNESS (largest one-frame body turn, rad/s, and step, m/s):'); for (const k of Object.keys(worst).sort()) log('  ', k, worst[k][0], worst[k][1]);
}
// SKRIM FOLLOWS YOU ANYWHERE IN THE GUT (2026-10-30, "SKRIM GOT STUCK AND COULDNT HURT ME HERE"): the fight begun, you
// stood 50 m further down the gut than his heap (past the old 30 m bound) — his distance to you over 20 s. (own profile)
export async function skrimFar({ w, b, log, sleep }) {
  b.settings.devMode = true;
  b.placeInWhale(); const S = b.SKRIM;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed); i++) { b.frame(1); await sleep(40); }
  const u = S.u, P = u.g.position, cam = b.camera.position, G = b.whaleS().G;
  b.skrimFight(); for (let i = 0; i < 60; i++) b.step(1 / 60);
  const far = new (b.THREE.Vector3)(P.x, cam.y, P.z - 50); cam.copy(far);
  const ds = [];
  for (let i = 0; i < 60 * 20; i++) { cam.x = far.x; cam.z = far.z; b.step(1 / 60); if (i % 120 === 0) ds.push(Math.hypot(P.x - cam.x, P.z - cam.z).toFixed(1)); }
  log('his distance to you every 2 s:', ds.join(' '), '| his stage', S.stage, '| hits on you', JSON.stringify(u.sk.res || {}));
}
// MYLES ALWAYS WITH YOU, the gargoyles without him, the dark knight's crouch (2026-10-30): `tools/myles.js`, 'myl&f=<name>'
export async function myl(ctx) { return (await import('/tools/myles.js?' + Date.now()))[new URLSearchParams(location.search).get('f')](ctx); }
// WHAT FLOATS IN THE WHALE (2026-10-30, "i said take these out", a still of a cluster of teal blobs on the gut's wall):
// every visible Points / Sprite / small additive thing in the scene while you are in the belly, by owner and colour. (own profile)
export async function whaleFloats({ w, b, log, sleep }) {
  b.placeInWhale(); for (let i = 0; i < 300; i++) { b.frame(1); if (i % 30 === 0) await sleep(30); }
  const rows = [], V = b.camera.position.constructor, cam = b.camera.position;
  b.scene.traverse((o) => {
    if (!(o.isPoints || o.isSprite || (o.isMesh && o.material && o.material.blending === 2))) return;
    let vis = true, q = o; while (q) { if (!q.visible) vis = false; q = q.parent; } if (!vis) return;
    const m = o.material || {}, col = m.color ? '#' + m.color.getHexString() : m.uniforms ? 'shader:' + Object.keys(m.uniforms).slice(0, 4).join(',') : '?';
    const chain = []; q = o; for (let k = 0; k < 4 && q; k++) { chain.push(q.name || q.type); q = q.parent; }
    const p = o.getWorldPosition(new V()), n = o.isPoints ? (o.geometry.drawRange.count !== Infinity ? o.geometry.drawRange.count : o.geometry.attributes.position.count) : 1;
    rows.push([o.isPoints ? 'Points' : o.isSprite ? 'Sprite' : 'AddMesh', n, col, chain.join('<'), p.distanceTo(cam).toFixed(0)].join(' '));
  });
  const agg = {}; for (const r of rows) { const k = r.split(' ').slice(0, 4).join(' '); agg[k] = (agg[k] || 0) + 1; }
  for (const [k, n] of Object.entries(agg).sort((a, c) => c[1] - a[1])) log(n + 'x', k);
}
// THE WALK INTO THE WHALE (2026-10-30, "the lag while walking into the whale belly needs to be fixed and any sounds of
// things spawning in i dont want to hear"): the real loop, from 70 m up the beach to its mouth, the swallow, the belly's
// cut and the first seconds inside — every frame over 25 ms with the spans that held the thread, and every sound that
// starts (who started it, from the stack). (own profile)
export async function whaleWalkInCold(ctx) { ctx.w.__cold = true; return whaleWalkIn(ctx); }
export async function whaleWalkIn({ w, b, log, sleep }) {
  for (let i = 0; i < 200 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(250); }
  try { await b.audioCtx.resume(); } catch (e) {}
  // every sound source started, by who started it
  const snd = []; let phase = 'boot';
  const tag = () => { const st = (new Error().stack || '').split('\n').slice(2, 7).map((l) => l.trim().replace(/^at /, '').split(' ')[0]).filter((n) => n && !/^(Object|Array|new|eval|<anonymous>)/.test(n)); return st.slice(0, 3).join('<'); };
  for (const C of [w.AudioBufferSourceNode, w.OscillatorNode]) { const st0 = C.prototype.start; C.prototype.start = function (...a) { if (phase !== 'boot') snd.push(phase + ' ' + tag()); return st0.apply(this, a); }; }
  // the beach in front of its mouth, and back from it
  b.placeOutOfWhale(); for (let i = 0; i < 20; i++) b.frame(1);
  const cam = b.camera.position, mouth = cam.clone(), back = new (b.THREE.Vector3)(mouth.x, mouth.y, mouth.z + 70);
  if (w.__cold) log('cold: skrim model in yet?', !!(b.SKRIM.u && b.SKRIM.u.model), 'clips', b.SKRIM.u && Object.keys(b.SKRIM.u.clips || {}).length);
  const frames = { walk: [], swallow: [], inside: [] }; let last = performance.now(), go = true;
  w.requestAnimationFrame((function tick() { const n = performance.now(); if (frames[phase]) frames[phase].push([n - last, n]); last = n; if (go) w.requestAnimationFrame(tick); }));
  // walk up the beach to it, 7 m/s for 10 s (the files of the whale come in as you come up)
  cam.copy(back); await sleep(800);
  phase = 'walk'; const lag0 = performance.now();
  for (let i = 0; i < 100; i++) { const k = i / 100; cam.set(back.x, mouth.y, back.z + (mouth.z - back.z) * k); b.lookAt(mouth.x - 5, mouth.y, mouth.z - 10); await sleep(100); }
  phase = 'swallow'; const t1 = performance.now(); b.startSwallow();
  for (let i = 0; i < 120 && b.whaleState().busy !== false || i < 20; i++) await sleep(100);
  phase = 'inside'; const t2 = performance.now(); await sleep(5000); go = false; phase = 'end';
  const lag = b.lag().filter((e) => e[0] >= lag0 - performance.timeOrigin || true);
  for (const [k, F] of Object.entries(frames)) {
    const d = F.map((f) => f[0]).sort((a, c) => a - c), big = F.filter((f) => f[0] > 25);
    log(k.toUpperCase(), 'frames', d.length, 'p50', (d[Math.floor(d.length / 2)] || 0).toFixed(1), 'max', (d[d.length - 1] || 0).toFixed(0), 'over 25 ms', big.length, 'over 50', F.filter((f) => f[0] > 50).length);
  }
  log('SPANS over 16 ms (latest 40):', JSON.stringify(b.lag().slice(-40).map((e) => Math.round(e[1]) + ':' + String(e[2]).slice(0, 28))));
  const agg = {}; for (const s of snd) agg[s] = (agg[s] || 0) + 1;
  for (const [k, n] of Object.entries(agg).sort((a, c) => c[1] - a[1]).slice(0, 40)) log('SOUND', n + 'x', k);
}
// what the whale's 0.5 s build is made of (2026-10-30): buildWhale, then placeInWhale's warm-ins and compile. (own profile)
export async function whaleBuildCost({ w, b, log, sleep }) {
  for (let i = 0; i < 200 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(250); }
  b.placeOutOfWhale(); for (let i = 0; i < 400; i++) { b.frame(1); if (i % 20 === 0) await sleep(30); }   // (its files in)
  const t0 = performance.now(); b.buildWhale(); const t1 = performance.now();
  b.placeInWhale(); const t2 = performance.now(); b.frame(1); const t3 = performance.now();
  log('COST buildWhale', (t1 - t0).toFixed(0), 'ms | placeInWhale (warm-ins, compile)', (t2 - t1).toFixed(0), 'ms | the first frame inside', (t3 - t2).toFixed(0), 'ms');
}
// the pieces of the arena's build, timed alone on a fresh page (2026-10-30). (own profile)
export async function whalePieces({ w, b, log, sleep }) {
  const T = b.THREE, G = new T.Group(), r = () => Math.random(), ms = (f) => { const t = performance.now(); f(); return (performance.now() - t).toFixed(1); };
  const spot = { x: 5.3, s: 56.2, H: new T.Vector3(5, 12, -56) }, cuts = [spot, { x: -3, s: 80 }, { x: 4, s: 100 }];
  log('PIECES noise tex', ms(() => b.whNoiseTex()), '| a heap (K 1, 10 bones)', ms(() => b.whFleshPile(G, 5, 56, r, 1, 10)), '| a small heap', ms(() => b.whFleshPile(G, 8, 60, r, 0.5, 3)),
    '| ground mist', ms(() => b.whGroundMist(G, spot, cuts)), '| air fog', ms(() => b.whAirFog(G, cuts, r)), '| rays ×5', ms(() => b.whGodRays(G, spot, 0, r)), '| buildWhale whole', ms(() => b.buildWhale()));
}
// THE TEAL ON THE GUT'S WALL (2026-10-30, a still: a column of round teal blobs on the wall by a cut; the plankton was not
// it). Every visible thing within 120 m whose colour (material colour, emissive, a colour uniform, or vertex colours) is
// cool — green and blue over red — with its owner chain; and the plankton's own colour for comparison. (own profile)
export async function whaleTeal({ w, b, log, sleep }) {
  b.placeInWhale(); for (let i = 0; i < 300; i++) { b.frame(1); if (i % 30 === 0) await sleep(30); }
  const cam = b.camera.position, V = cam.constructor, out = {};
  const cool = (c) => c && c.g > c.r * 1.3 && c.b > c.r * 1.3;
  b.scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isSprite || o.isInstancedMesh)) return;
    let vis = true, q = o; while (q) { if (!q.visible) vis = false; q = q.parent; } if (!vis) return;
    const p = o.getWorldPosition(new V()); if (p.distanceTo(cam) > 400 && !o.isPoints) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material]; const why = [];
    for (const m of ms) { if (!m) continue;
      if (cool(m.color)) why.push('color#' + m.color.getHexString()); if (cool(m.emissive) && m.emissiveIntensity > 0) why.push('emi#' + m.emissive.getHexString());
      if (m.uniforms) for (const [k, u] of Object.entries(m.uniforms)) { const v = u && u.value; if (v && v.isColor && cool(v)) why.push(k + '#' + v.getHexString()); if (v && v.isVector3 && v.y > v.x * 1.3 && v.z > v.x * 1.3 && v.y <= 2) why.push(k + 'v' + v.toArray().map((x) => x.toFixed(2)).join(',')); }
      if (m.fragmentShader && /vec3\(\s*0?\.[0-4]\d*\s*,\s*0?\.[5-9]/.test(m.fragmentShader)) why.push('frag-teal'); }
    const ca = o.geometry && o.geometry.attributes && o.geometry.attributes.color; if (ca) { let n = 0; for (let i = 0; i < Math.min(ca.count, 400); i++) if (ca.getY(i) > ca.getX(i) * 1.3 && ca.getZ(i) > ca.getX(i) * 1.3) n++; if (n > 20) why.push('vcol' + n); }
    if (!why.length) return;
    const chain = []; q = o; for (let k = 0; k < 5 && q; k++) { chain.push((q.name || q.type) + (q.userData && Object.keys(q.userData).length ? '{' + Object.keys(q.userData).slice(0, 2).join(',') + '}' : '')); q = q.parent; }
    const key = (o.isPoints ? 'Points' : o.isInstancedMesh ? 'Inst' : o.isSprite ? 'Sprite' : 'Mesh') + ' ' + why.join(',') + ' ' + chain.join('<');
    out[key] = (out[key] || 0) + 1;
  });
  for (const [k, n] of Object.entries(out).sort((a, c) => c[1] - a[1]).slice(0, 40)) log(n + 'x', k);
}
// THE WALK UP TO SKRIM (2026-10-30, "it still lags when i walk up to skrim fix any lag for good in here"): swallowed the
// real way, then walked from where you land up to him at a walk (3.4 m/s), looking at him, through the real loop; every
// frame over 22 ms with what it was doing — the draw's share, new shader programs, new textures and geometries, and
// what changed in his state that frame. Then 4 s beside him. `&talk=1` opens the talk at the end. (own profile)
export async function skrimWalkUp({ w, b, log, sleep }) {
  for (let k = 0; k < 600 && (!b.state().introDone || b.frozen()); k++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(30); }
  log('intro done', b.state().introDone, 'frozen', b.frozen());
  await sleep(3000); b.startWhale(1);   // (the cut the game puts you in by: black up, placed, held, black down — as tools/loadtime.html)
  for (let i = 0; i < 900 && (b.whaleState().busy !== false || !b.whaleState().inWhale) || i < 20; i++) await sleep(100);
  log('in the whale', b.whaleState().inWhale, JSON.stringify(b.whaleState()).slice(0, 120));
  const S = b.SKRIM; for (let i = 0; i < 200 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed); i++) await sleep(100);
  await sleep(1500);
  const aim = () => { const dx = P.x - cam.x, dz = P.z - cam.z, dy = P.y + 0.7 - cam.y; b.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
  const R = b.renderer, I = R.info, cam = b.camera.position, P = S.u.g.position;
  const rr = R.render.bind(R); let rT = 0; R.render = (a, c) => { const t = performance.now(); rr(a, c); rT += performance.now() - t; };
  const snap = () => [S.stage, b.skrimSongS && b.skrimSongS() ? 'song' : '-', b.whMood ? 'cine' + b.whMood.cine.toFixed(1) : '', S.u.sk && S.u.sk.noticed ? 'noticed' : '', S.u.sk && S.u.sk.sr ? 'sr:' + (S.u.sk.sr.ph || '') : ''].join(' ');
  const rows = [], all = []; let last = performance.now(), go = true, phase = 'stand', prog = I.programs ? I.programs.length : 0, tex = I.memory.textures, geo = I.memory.geometries, st = snap();
  (function tick() {
    const n = performance.now(), d = n - last; last = n;
    const p2 = I.programs ? I.programs.length : 0, s2 = snap();
    all.push([phase, d]);
    if (d > 22) rows.push(phase + ' ' + Math.round(d) + 'ms draw ' + Math.round(rT) + ' prog+' + (p2 - prog) + ' tex+' + (I.memory.textures - tex) + ' geo+' + (I.memory.geometries - geo) + (s2 !== st ? ' [' + st + ' → ' + s2 + ']' : '') + ' @' + cam.distanceTo(P).toFixed(1) + 'm');
    prog = p2; tex = I.memory.textures; geo = I.memory.geometries; st = s2; rT = 0;
    if (go) w.requestAnimationFrame(tick);
  })();
  await sleep(1500);
  const from = cam.clone(), to = P.clone(), dist = Math.hypot(to.x - from.x, to.z - from.z), stop = 2.6;
  log('walk from', dist.toFixed(1), 'm away; stage', S.stage, 'progs', prog);
  phase = 'walk'; const t0 = performance.now(), secs = (dist - stop) / 3.4;
  const lag0 = b.lag(0).length;
  while (true) {
    const k = Math.min(1, (performance.now() - t0) / 1000 / secs); const f = k * (dist - stop) / dist;
    cam.x = from.x + (to.x - from.x) * f; cam.z = from.z + (to.z - from.z) * f; aim();
    if (k >= 1) break; await sleep(16);
  }
  phase = 'near'; for (let i = 0; i < 250; i++) { aim(); await sleep(16); }
  if (new URLSearchParams(location.search).get('talk')) { phase = 'talk'; try { b.skrimTalk(); } catch (e) { log('talk', e.message); } await sleep(4000); }
  go = false;
  for (const ph of ['stand', 'walk', 'near', 'talk']) { const F = all.filter((r) => r[0] === ph).map((r) => r[1]).sort((a, c) => a - c); if (!F.length) continue;
    log('PHASE', ph, 'frames', F.length, 'p50', F[F.length >> 1].toFixed(1), 'p95', F[Math.floor(F.length * 0.95)].toFixed(1), 'max', F[F.length - 1].toFixed(0), 'over 33', F.filter((d) => d > 33).length); }
  for (const r of rows.slice(0, 60)) log('SLOW', r);
  log('SPANS', JSON.stringify(b.lag(0).slice(0).filter((e) => e[0] >= t0 - 2000 + performance.timeOrigin - performance.timeOrigin).slice(0, 20).map((e) => e[1] + ':' + String(e[2]).slice(0, 30))));
}
// SHOOTING THE GARGOYLES (2026-10-30, the owner: "MAKE SURE SHOOTING THE GARGOYLES STILL BREAKS THEM AND HAS THE KEY DROP
// THE KEY JUST DIDNT DROP"): XIII's court, the door tried, and then every one of them shot down with the real trigger
// (`&g=sg` the shotgun, `&g=mag` the magnum, aimed at its chest; `&head=1` at its head), Myles at your side as in a game.
// Each shot: who it hit, alive/struck/mode; then the key. (own profile)
export async function gargShoot({ w, b, log, sleep, shot }) {
  const Q = new URLSearchParams(location.search), gun = Q.get('g') || 'sg', head = !!Q.get('head'), solo = !!Q.get('solo');
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
  const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch;
  if (!solo) { M.stage = 'with'; M.ally = true; M.place = '?'; }
  b.settings.devMode = false;
  const it = gun === 'sg' ? b.shotgunItem : b.magnumItem;
  if (!b.inventory.includes(it)) b.addToInventory(it); if (b.equippedS && b.equippedS() !== it) b.toggleEquip(it);
  const home = [b.C13_X + A.ax + A.ux * (A.L + 4.0), b.C13_Z + A.az + A.uz * (A.L + 4.0)];
  const step = (n) => { for (let i = 0; i < n; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); b.heal(); } };
  cam.set(home[0], cam.y, home[1]); step(60);
  b.gargTryDoor(); if (b.state().dialogOpen) b.endDialog();
  step(60 * 6);
  log('phase', G.phase, 'modes', G.units.map((x) => x.gp.mode + (x.st.alive ? '' : '†')).join(','), 'equipped', b.equippedS() && b.equippedS().name);
  let shots = 0;
  for (let k = 0; k < (+Q.get('n') || 80) && G.units.some((u) => u.st.alive && !u.retired); k++) {
    const u = G.units.filter((x) => x.st.alive && !x.retired && !['perch', 'wake', 'drop', 'script'].includes(x.gp.mode)).sort((a, c) => a.g.position.distanceTo(cam) - c.g.position.distanceTo(cam))[0];
    if (!u) { step(20); continue; }
    const p = u.g.position, hb = u.model && u.model.getObjectByName(head ? 'Head' : 'Spine2'), at = hb ? hb.getWorldPosition(p.clone()) : p.clone().setY(p.y + 1);
    b.lookAt(at.x, at.y, at.z); w.__c13Step(1); b.lookAt(at.x, at.y, at.z);
    if (gun === 'sg') b.sgCh = [1, 1]; else b.magAmmo = 6;
    const dir = b.camera.getWorldDirection(cam.clone()), tr = b.magTrace(dir), ch0 = gun === 'sg' ? JSON.stringify(b.sgCh) : b.magAmmo;
    const hp0 = u.st.hp; b.magFire(); shots++;
    if (shots <= 6) log('  trace', tr ? tr.kind + (tr.u ? ' g' + (tr.u.gp ? tr.u.gp.i : '?') : '') + ' t' + tr.t.toFixed(1) : 'nothing', '| shells', ch0, '→', gun === 'sg' ? JSON.stringify(b.sgCh) : b.magAmmo, '| frozen', b.frozen(), 'aim at', at.toArray().map((v) => v.toFixed(1)).join(','), 'unit at', p.toArray().map((v) => v.toFixed(1)).join(','));
    if (Q.get('trace') && shots <= 2) for (let f = 0; f < 6; f++) { step(1); log('    frame', f, 'cam', cam.toArray().map((v) => v.toFixed(1)).join(','), 'unit', p.toArray().map((v) => v.toFixed(1)).join(','), 'mode', u.gp.mode, 'vel', u.gp.vel.toArray().map((v) => v.toFixed(1)).join(','), 'push', u.st.flinchPush ? u.st.flinchPush.v.toFixed(1) : '-'); }
    step(2); const r = 'shot ' + shots + ' at g' + u.gp.i + ' ' + p.distanceTo(cam).toFixed(1) + 'm mode ' + u.gp.mode + ' hp ' + hp0 + '→' + u.st.hp + ' alive ' + u.st.alive + ' struck ' + !!u.st.struck;
    step(40); log(r, '| after: alive', u.st.alive, 'mode', u.gp.mode, '| alive left', G.units.filter((x) => x.st.alive && !x.retired).length, 'phase', G.phase, 'key', !!w.__bw.gargKeyS());
  }
  step(180);
  const K = w.__bw.gargKeyS();
  log('END phase', G.phase, 'keyTaken', G.keyTaken, 'key', K ? K.st + ' at y-floor ' + (K.g.position.y - (b.c13CourtAt(K.g.position.x, K.g.position.z) ?? 0)).toFixed(2) + ' from you ' + Math.hypot(K.g.position.x - cam.x, K.g.position.z - cam.z).toFixed(1) + ' m, in scene ' + !!K.g.parent : 'NONE', '| door locked', b.gargLockedS(), '| modes', G.units.map((x) => x.gp.mode + (x.st.alive ? '' : '†') + (x.retired ? 'R' : '')).join(','));
}

// THE DEALER'S SIDE-STEP (2026-10-31): in the bunker, the fight on, you held 2.6 m off him on fixed 1/60 steps; per clip
// the frames and the planted foot's skate (the lower toe while within 3 cm of the lowest it has been, its world speed),
// and stills of him circling. `&m=hold` keeps you still; default orbits you slowly so he must circle.
export async function dealerSide({ w, b, log, sleep, shot }) {
  b.settings.devMode = false;   // (dev mode starts no mutant's swing: `main.js` ~39865; you are healed every frame instead)
  b.placeInBunker();
  const u = (b.mutants || []).find((m) => m.kindName === 'dealer'); if (!u) { log('no dealer'); return; }
  for (let i = 0; i < 300 && !(u.model && u.mixer && !(u.clipsPending > 0)); i++) { b.frame(1); await sleep(50); }
  log('model', !!u.model, 'clips', Object.keys(u.clips).length, 'strafeL', u.clips.strafeL && u.clips.strafeL.getClip().name, 'speed L', u.clipSpeed && u.clipSpeed.strafeL, 'R', u.clipSpeed && u.clipSpeed.strafeR);
  for (let i = 0; i < 20; i++) b.frame(1);
  if ((new URLSearchParams(window.location.search).get('m')) === 'clip') {
    // his feet on a clip alone: the mixer driven here, him carried sideways at the clip's speed both ways; the planted
    // toe (the lower one, within 1.5 cm of the lowest it gets in that clip) — its world speed. The way that reads ~0 is
    // the way the clip walks. Then 'walk', as the fight played it before (the old alias), at the same speed.
    w.requestAnimationFrame = () => 0;
    const V = b.camera.position.constructor, P = u.g.position, P0 = P.clone(), cs = u.clipSpeed.strafeR || 1.3; let cs2 = 0;
    const g = (re) => { let o = null; u.model.traverse((x) => { if (!o && x.isBone && re.test(x.name)) o = x; }); return o; };
    const tL = g(/LeftToeBase/), tR = g(/RightToeBase/), a = new V(), c = new V(), pv = new V();
    const run = (name, sgn, rate, shots) => {
      for (const x of u.mixer._actions) x.stop();
      const A = u.clips[name]; A.reset(); A.enabled = true; A.setEffectiveWeight(1); A.timeScale = rate; A.play();
      P.copy(P0); const y = u.g.rotation.y, rx = Math.cos(y), rz = -Math.sin(y);
      let lo = 1e9; const H = [];
      for (let f = 0; f < 150; f++) {
        u.mixer.update(1 / 60); P.x += rx * sgn * cs / 60; P.z += rz * sgn * cs / 60; u.g.updateMatrixWorld(true);
        tL.getWorldPosition(a); tR.getWorldPosition(c); const L = a.y < c.y; const t = (L ? a : c).clone(); t.w = L; H.push(t);
        if (f > 30) lo = Math.min(lo, t.y);
        if (shots && f >= 60 && f < 108 && f % 12 === 0) { u.g.visible = true; const fv = b.camera.fov; b.camera.fov = 30; b.camera.updateProjectionMatrix(); b.camera.position.set(P.x + Math.sin(y) * 4.2, P.y + 1.0, P.z + Math.cos(y) * 4.2); b.lookAt(P.x, P.y + 1.0, P.z); shot(name + '_' + f, 420, 1.5); b.camera.fov = fv; b.camera.updateProjectionMatrix(); }
      }
      let s = 0, n = 0;
      for (let f = 31; f < H.length; f++) { const q = H[f], r = H[f - 1]; if (q.w === r.w && q.y < lo + 0.015) { s += Math.hypot(q.x - r.x, q.z - r.z) * 60; n++; } }
      return [(s / Math.max(1, n)).toFixed(2), n];
    };
    log('clipSpeed strafe', cs.toFixed(2), 'walk', u.clipSpeed.walk, 'leg', u.dealerLeg && u.dealerLeg.toFixed(2));
    for (const [nm, rate] of [['strafeR', 1], ['strafeL', 1], ['walk', 1]]) {
      if (!u.clips[nm]) { log(nm, 'none'); continue; }
      const p1 = run(nm, 1, rate, false), m1 = run(nm, -1, rate, false);
      log(nm, 'carried +X (his left): planted toe', p1[0], 'm/s n', p1[1], '| carried -X (his right):', m1[0], 'm/s n', m1[1]);
    }
    for (const [nm, sg] of [['strafeR', 1], ['strafeL', -1]]) {
      const row = []; let best = [9, 0];
      for (let v = 0.6; v <= 2.21; v += 0.1) { const k = cs; cs2 = v; const r = run(nm, sg * v / cs, 1, false); row.push(v.toFixed(1) + ':' + r[0]); if (+r[0] < best[0]) best = [+r[0], v]; }
      log(nm, 'sweep', row.join(' '), '| best', best[1].toFixed(1), 'm/s at', best[0]);
    }
    // held still: the planted toe's own velocity in his frame (x his +X, z his front) — the way and pace the clip walks
    for (const nm of ['strafeR', 'strafeL']) {
      for (const x of u.mixer._actions) x.stop();
      const A = u.clips[nm]; A.reset(); A.enabled = true; A.setEffectiveWeight(1); A.timeScale = 1; A.play(); P.copy(P0); u.g.updateMatrixWorld(true);
      const inv = u.g.matrixWorld.clone().invert(), H = []; let loL = 1e9, loR = 1e9;
      for (let f = 0; f < 150; f++) { u.mixer.update(1 / 60); u.g.updateMatrixWorld(true); tL.getWorldPosition(a); tR.getWorldPosition(c); const L = a.y < c.y, t = (L ? a : c).clone().applyMatrix4(inv); t.w = L; t.wy = (L ? a : c).y; H.push(t); if (f > 30) { if (L) loL = Math.min(loL, t.wy); else loR = Math.min(loR, t.wy); } }
      let sx = 0, sz = 0, n = 0, sxL = 0, szL = 0, nL = 0;
      for (let f = 31; f < H.length; f++) { const q = H[f], r = H[f - 1]; if (q.w === r.w && q.wy < (q.w ? loL : loR) + 0.015) { const vx = (q.x - r.x) * 60, vz = (q.z - r.z) * 60; if (q.w) { sxL += vx; szL += vz; nL++; } else { sx += vx; sz += vz; n++; } } }
      log(nm, 'held still, planted toe in his frame: right foot (x,z)', (sx / Math.max(1, n)).toFixed(2), (sz / Math.max(1, n)).toFixed(2), 'n', n, '| left foot', (sxL / Math.max(1, nL)).toFixed(2), (szL / Math.max(1, nL)).toFixed(2), 'n', nL, '| his scale', u.g.scale.x.toFixed(3), 'model rot y', u.model.rotation.y.toFixed(3), 'g rot y', u.g.rotation.y.toFixed(3));
    }
    { const mine = new Set(); u.g.traverse((o) => mine.add(o)); b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite) && !mine.has(o)) o.visible = false; }); }
    run('strafeR', -1, 1, true); run('walk', -1, 1, true);
    return;
  }
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); w.__clockOn();
  for (let i = 0; i < 6; i++) { w.__adv(1); if (b.state().dialogOpen) b.endDialog(); }
  b.startDealerFight();
  for (let i = 0; i < 60; i++) { w.__adv(1); if (b.state().dialogOpen) b.endDialog(); }
  log('fight on: dialog', b.state().dialogOpen, 'awake', u.st.awake, 'frozen', b.frozen && b.frozen());
  const mode = new URLSearchParams(window.location.search).get('m') || 'orbit';
  if (mode === 'guard') {
    // your guard held against him (the katana): 20 s re-raised every frame (inside the parry window: parries), then 20 s
    // held (blocks). Every guard's sparks now come off `skSparks` (SKSP.bursts); stills of the whole frame (the view
    // model's pass included) the frame a burst goes off and three after
    try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
    for (let i = 0; i < 30; i++) w.__adv(1);
    const P = u.g.position, cam = b.camera.position, C0 = cam.clone(), SK = b.SKSP; const res = { parry: 0, block: 0 }; let shots = 0, pend = 0;
    const grab = (nm) => { const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 520; c.height = Math.round(520 * src.height / src.width); const g2 = c.getContext('2d'); g2.filter = 'brightness(1.5)'; g2.drawImage(src, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let k = 0; k < n; k++) console.log('[PBIMG]', nm, k + '/' + n, d.slice(k * 8000, (k + 1) * 8000)); };
    for (let f = 0; f < 60 * 40; f++) {
      const ph = f < 1200 ? 'parry' : 'block';
      cam.copy(C0); b.lookAt(P.x, P.y + 1.3, P.z);
      if (ph === 'parry') b.setGuardTest(true, 0); else if (!b.blockingS()) b.setGuardTest(true, 1);
      const b0 = SK.bursts; w.__adv(1); if (b.state().hp < 3) b.heal();
      if (SK.bursts > b0) { res[ph]++; if (shots < 4 && (ph === 'parry' ? shots < 2 : shots >= 2)) { grab('gs_' + ph + '_' + shots + 'a'); pend = 3; shots++; } }
      else if (pend && --pend === 0) grab('gs_' + ph + '_' + (shots - 1) + 'b');
    }
    b.setGuardTest(false);
    log('guard: spark bursts while parrying', res.parry, '| while blocking', res.block, '| his hp', u.st.hp, '| you', b.state().hp);
    return;
  }
  const g = (re) => { let o = null; u.model.traverse((x) => { if (!o && x.isBone && re.test(x.name)) o = x; }); return o; };
  const toeL = g(/LeftToeBase/), toeR = g(/RightToeBase/), P = u.g.position, cam = b.camera.position, V3 = cam.constructor;
  const a = new V3(), c = new V3(), prev = new V3(); let had = false, lowMin = 1e9;
  const by = {}, sideF = { n: 0, clips: {} }; let ang = Math.atan2(cam.x - P.x, cam.z - P.z), shots = 0;
  const C0 = cam.clone(); log('you at', C0.x.toFixed(1), C0.z.toFixed(1), 'him', P.x.toFixed(1), P.z.toFixed(1));
  for (let f = 0; f < 60 * 60; f++) {
    if (mode !== 'hold') ang += 0.2 / 60;
    cam.set(C0.x + (mode !== 'hold' ? Math.sin(ang) * 0.6 : 0), C0.y, C0.z + (mode !== 'hold' ? Math.cos(ang) * 0.6 : 0)); b.lookAt(P.x, P.y + 1.1, P.z);
    w.__adv(1); if (b.state().hp < 3) b.heal();
    u.g.updateMatrixWorld(true); toeL.getWorldPosition(a); toeR.getWorldPosition(c);
    const lo = a.y < c.y ? a : c, which = a.y < c.y ? 'L' : 'R';
    lowMin = Math.min(lowMin, lo.y - P.y);
    const nm = u.cur ? u.cur.getClip().name : '-';
    const B = by[nm] || (by[nm] = { n: 0, sk: 0, skN: 0, mx: 0 }); B.n++;
    if (u.st.side) { sideF.n++; sideF.clips[nm] = (sideF.clips[nm] || 0) + 1; }
    { const vx = (P.x - (w.__dsLast ? w.__dsLast.x : P.x)) * 60, vz = (P.z - (w.__dsLast ? w.__dsLast.z : P.z)) * 60, y = u.g.rotation.y, sx = vx * Math.cos(y) - vz * Math.sin(y);
      if (/strafe/.test(nm) && Math.hypot(vx, vz) > 0.3) { const k = nm + (sx > 0 ? ' +X' : ' -X'); sideF.dir = sideF.dir || {}; sideF.dir[k] = (sideF.dir[k] || 0) + 1; }
      w.__dsLast = P.clone(); }
    if (had && prev.w === which && lo.y - P.y < lowMin + 0.03) { const v = Math.hypot(lo.x - prev.x, lo.z - prev.z) * 60; B.sk += v; B.skN++; B.mx = Math.max(B.mx, v); }
    prev.copy(lo); prev.w = which; had = true;
    if (f % 120 === 0) log('  t', (f / 60).toFixed(0), 'd', Math.hypot(P.x - cam.x, P.z - cam.z).toFixed(2), 'clip', nm, 'atk', u.st.atk, 'side', u.st.side, 'awake', u.st.awake, 'vis', u.g.visible, 'near', u.st.near, 'realSp', (u.realSp || 0).toFixed(2));
    if (u.st.side && shots < 4 && f % 37 === 0) { const sv = cam.clone(); cam.set(P.x + (C0.x - P.x) * 1.4 + 1.2, P.y + 1.3, P.z + (C0.z - P.z) * 1.4); b.lookAt(P.x, P.y + 0.7, P.z); shot('ds_' + shots++, 520, 1.6); cam.copy(sv); }
  }
  log('mode', mode, '| frames circling (side≠0)', sideF.n, JSON.stringify(sideF.clips), '| strafe clip vs his own x travel', JSON.stringify(sideF.dir || {}));
  log('by clip', Object.entries(by).map(([k, B]) => k + ' ' + B.n + 'f skate ' + (B.sk / Math.max(1, B.skN)).toFixed(2) + ' max ' + B.mx.toFixed(2)).join(' | '));
  log('his hp', u.st.hp, 'alive', u.st.alive, 'player hp', b.state().hp);
}

// THE SAMURAI BETWEEN SWINGS (2026-10-31): the dojo, the katana taken, the fight on (dev mode: you never die); you stand
// 2.4 m off him on fixed 1/60 steps. For frames he is neither swinging, stunned nor travelling: how far his head and
// chest move in his own frame each frame (the note said 96 % under 5 mm, before the life layer), and over each second.
export async function samStill({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 80 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(250); }
  for (let k = 0; k < 200 && !b.state().introDone; k++) { b.frame(3); await sleep(30); }
  const RB = b.ROOM_BACK.dojo; RB.load();
  for (let i = 0; i < 160 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
  RB.place(); for (let i = 0; i < 60; i += 5) { b.frame(5); await sleep(5); }
  b.settings.devMode = false;
  const it = b.interactables.find((x) => /Take the katana/.test(typeof x.label === 'function' ? x.label() : x.label));
  log('katana', !!it); if (it) it.onActivate();
  const u = (b.mutants || []).find((m) => m.kindName === 'samurai');
  for (let i = 0; i < 200 && u && !(u.model && u.mixer && !(u.clipsPending > 0)); i++) { b.frame(2); await sleep(50); }
  if (!u || !u.model) { log('no samurai', !!u); return; }
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); w.__clockOn();
  w.__adv(240);
  const P = u.g.position, cam = b.camera.position, V3 = cam.constructor;
  if (new URLSearchParams(window.location.search).get('m') === 'clip') {
    // his side-steps on their own, him carried along his model's +X and -X at the clip's speed: the planted ankle's
    // world speed (the lower one, within 1.5 cm of its own lowest) — the way that reads ~0 is the way the clip walks
    const bn = (re) => { let o = null; u.model.traverse((x) => { if (!o && x.isBone && re.test(x.name)) o = x; }); return o; };
    const fL = bn(/footL$/), fR = bn(/footR$/), a = new V3(), c = new V3(), P0 = P.clone();
    log('feet', fL && fL.name, fR && fR.name);
    const carry = (nm, sg) => {
      for (const x of u.mixer._actions) x.stop(); const A = u.clips[nm]; A.reset(); A.enabled = true; A.setEffectiveWeight(1); A.timeScale = 1; A.play();
      P.copy(P0); u.g.updateMatrixWorld(true); const mx = new V3().setFromMatrixColumn(u.model.matrixWorld, 0).setY(0).normalize(), cs = u.clipSpeed[nm] || 1;
      const H = []; let loL = 1e9, loR = 1e9;
      for (let f = 0; f < 150; f++) { u.mixer.update(1 / 60); P.addScaledVector(mx, sg * cs / 60); u.g.updateMatrixWorld(true); fL.getWorldPosition(a); fR.getWorldPosition(c);
        const L = a.y < c.y, t = (L ? a : c).clone(); t.w = L; H.push(t); if (f > 30) { if (L) loL = Math.min(loL, t.y); else loR = Math.min(loR, t.y); } }
      let s2 = 0, n = 0; for (let f = 31; f < H.length; f++) { const q = H[f], r = H[f - 1]; if (q.w === r.w && q.y < (q.w ? loL : loR) + 0.015) { s2 += Math.hypot(q.x - r.x, q.z - r.z) * 60; n++; } }
      return (s2 / Math.max(1, n)).toFixed(2) + ' (n' + n + ')';
    };
    for (const nm of ['strafeL', 'strafeR']) log(nm, 'speed', (u.clipSpeed[nm] || 0).toFixed(2), '| carried +X (his left): planted ankle', carry(nm, 1), '| carried -X (his right):', carry(nm, -1));
    // stills: strafeR carried to his right, from in front of him, nothing else drawn
    const mine = new Set(); u.g.traverse((o) => mine.add(o)); b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite) && !mine.has(o)) o.visible = false; });
    for (const x of u.mixer._actions) x.stop(); const A = u.clips.strafeR; A.reset(); A.enabled = true; A.setEffectiveWeight(1); A.play(); P.copy(P0);
    u.g.updateMatrixWorld(true); const mx = new V3().setFromMatrixColumn(u.model.matrixWorld, 0).setY(0).normalize(), fz = new V3().setFromMatrixColumn(u.model.matrixWorld, 2).setY(0).normalize();
    b.camera.fov = 34; b.camera.updateProjectionMatrix();
    for (let f = 0; f < 110; f++) { u.mixer.update(1 / 60); P.addScaledVector(mx, -(u.clipSpeed.strafeR || 1) / 60); u.g.updateMatrixWorld(true);
      if (f >= 60 && f % 12 === 0) { u.g.visible = true; b.camera.position.set(P.x + fz.x * 5.5, P.y + 1.3, P.z + fz.z * 5.5); b.lookAt(P.x, P.y + 1.2, P.z); shot('sam_' + f, 420, 1.4); } }
    return;
  }
  const bone = (re) => { let o = null; u.model.traverse((x) => { if (!o && x.isBone && re.test(x.name)) o = x; }); return o; };
  const H = bone(/spine006$/), C = bone(/spine003$/), inv = new u.g.matrixWorld.constructor();
  const hp = new V3(), cp = new V3(), ph = new V3(), pc = new V3(); let have = false, last = P.clone();
  let n = 0, under = 0, sumH = 0, sumC = 0; const clips = {}, win = [], dirs = {}; let wl = [];
  for (let f = 0; f < 60 * 40; f++) {
    const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1;
    cam.set(P.x + dx / d * 2.4, cam.y, P.z + dz / d * 2.4); b.lookAt(P.x, P.y + 1.4, P.z);
    w.__adv(1); if (b.state().hp < 3) b.heal();
    u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert();
    H.getWorldPosition(hp).applyMatrix4(inv); C.getWorldPosition(cp).applyMatrix4(inv);
    const sp = Math.hypot(P.x - last.x, P.z - last.z) * 60; last.copy(P);
    const still = u.st.atk < 0 && !(u.st.stun > 0) && !(u.st.recoil > 0) && sp < 0.15 && u.st.alive;
    if (still && have) {
      const mh = hp.distanceTo(ph), mc = cp.distanceTo(pc); n++; sumH += mh; sumC += mc; if (mh < 0.005 * 1 / 60 * 60 && mh < 0.005) under++;
      const nm = u.cur ? u.cur.getClip().name : '-'; clips[nm] = (clips[nm] || 0) + 1;
      wl.push(hp.clone()); if (wl.length === 60) { let mx = 0; for (const q of wl) mx = Math.max(mx, q.distanceTo(wl[0])); win.push(mx); wl = []; }
    } else wl = [];
    ph.copy(hp); pc.copy(cp); have = true;
    { const nm = u.cur ? u.cur.getClip().name : '-', mx = new V3().setFromMatrixColumn(u.model.matrixWorld, 0).setY(0).normalize();
      const vx = (P.x - (w.__ssL ? w.__ssL.x : P.x)) * 60, vz = (P.z - (w.__ssL ? w.__ssL.z : P.z)) * 60; w.__ssL = P.clone();
      const mz = new V3().setFromMatrixColumn(u.model.matrixWorld, 2).setY(0).normalize();
      if (/strafe/.test(nm) && Math.hypot(vx, vz) > 0.3) { const D = dirs[nm] || (dirs[nm] = { x: 0, z: 0, n: 0 }); D.x += vx * mx.x + vz * mx.z; D.z += vx * mz.x + vz * mz.z; D.n++; } }
  }
  // each strafe clip held still: which way its planted foot goes under him along his model's +X (the clip walks the other way)
  const fL = bone(/footL$/), fR = bone(/footR$/), A = new V3(), Bv = new V3(), held = {};
  for (const nm of ['strafeL', 'strafeR']) {
    const Ac = u.clips[nm]; if (!Ac) continue; for (const x of u.mixer._actions) x.stop(); Ac.reset(); Ac.enabled = true; Ac.setEffectiveWeight(1); Ac.timeScale = 1; Ac.play();
    let prev = null, sx = 0, sz = 0, n = 0;
    for (let f = 0; f < 120; f++) { u.mixer.update(1 / 60); u.model.updateMatrixWorld(true); const inv = u.model.matrixWorld.clone().invert(); fL.getWorldPosition(A); fR.getWorldPosition(Bv);
      const low = (A.y < Bv.y ? A : Bv).clone().applyMatrix4(inv), wch = A.y < Bv.y; if (prev && prev.w === wch && f > 20) { sx += (low.x - prev.x) * 60; sz += (low.z - prev.z) * 60; n++; } low.w = wch; prev = low; }
    held[nm] = 'x ' + (sx / Math.max(1, n)).toFixed(2) + ' z ' + (sz / Math.max(1, n)).toFixed(2) + ' n' + n;
  }
  log('fight: his travel in his model frame per strafe clip (sum x, z)', JSON.stringify(Object.fromEntries(Object.entries(dirs).map(([k, D]) => [k, 'x ' + (D.x / D.n).toFixed(2) + ' z ' + (D.z / D.n).toFixed(2) + ' n' + D.n]))), '| held still, planted foot x-speed in model frame (clip walks the opposite way)', JSON.stringify(held), 'model scale', u.model.scale.x.toFixed(3));
  const s = win.slice().sort((a, b2) => a - b2), med = s.length ? s[s.length >> 1] : 0;
  log('still frames', n, '| per frame: head under 5 mm', (100 * under / Math.max(1, n)).toFixed(1) + '%', 'mean head', (1000 * sumH / Math.max(1, n)).toFixed(2), 'mm chest', (1000 * sumC / Math.max(1, n)).toFixed(2), 'mm');
  log('head travel within a still second: windows', win.length, 'median', (med * 1000).toFixed(0), 'mm max', ((s[s.length - 1] || 0) * 1000).toFixed(0), 'mm | clips', JSON.stringify(clips), '| life', !!u.life, 'restless', !!u.kind.restless);
}

// SKRIM'S AIM (2026-11-01): his fight on fixed 1/60 steps, your guard down, healed every frame; you standing 7 m off,
// then circling him at a walk (3.4 m/s) 7 m out, then backing and strafing at a run (5.7). Per attack: how many he
// started, and how many reached you (hit). `&m=phase` drops him to half health first and logs the heads' summon.
export async function skrimAim({ w, b, log, sleep }) {
  b.settings.devMode = false;
  b.placeInWhale();
  const S = b.SKRIM, cam = b.camera.position;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u; if (!u || !u.model) { log('no skrim'); return; }
  for (let i = 0; i < 30; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const P = u.g.position, mode = new URLSearchParams(window.location.search).get('m') || 'aim';
  S.stage = 'dig'; cam.set(P.x + Math.sin(u.g.rotation.y) * 4, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 4);
  b.skrimFight();
  for (let i = 0; i < 120 && S.stage !== 'fight'; i++) b.step(1 / 60);
  log('stage', S.stage, 'hp', u.st.hp);
  const C0 = P.clone(); let ang = Math.atan2(cam.x - P.x, cam.z - P.z);
  const floorY = () => cam.y;   // (the eye's height is kept by the game's own clamp each step)
  const seg = (label, secs, place) => {
    const k = u.sk, c0 = JSON.parse(JSON.stringify(k.counts || {})), r0 = JSON.parse(JSON.stringify(k.res || {}));
    let hpHits = 0, hpY = b.state().hp;
    for (let f = 0; f < secs * 60 && u.st.alive; f++) { place(f); b.lookAt(P.x, P.y + 1.3, P.z); b.step(1 / 60); if (b.state().hp < hpY) hpHits++; b.heal(); hpY = b.state().hp; if (w.__seg) w.__seg(f); }
    const c1 = k.counts || {}, r1 = k.res || {}, rows = [];
    for (const n of Object.keys(c1)) { const st = (c1[n] || 0) - (c0[n] || 0); if (!st) continue; const hit = (r1[n + ':hit'] || 0) - (r0[n + ':hit'] || 0); rows.push(n + ' ' + hit + '/' + st); }
    log(label, '| hit/started:', rows.join(' '), '| hp lost', hpHits, '| his hp', u.st.hp);
  };
  if (mode === 'phase') {
    u.st.hp = Math.round(u.kind.hp * 0.52); log('his hp set', u.st.hp); if (b.CRY) b.CRY.log = []; log('heads built', b.CRY && b.CRY.list.length, 'summon ready', b.CRY && b.CRY.list.filter((h) => h.summon).length);
    // one cut at him to cross half: his own fight sees the hp drop
    u.st.hp = Math.round(u.kind.hp * 0.49);
    w.__seg = (f) => { if (f % 60 === 0) { const C = b.CRY, sm = (C && C.list || []).filter((h) => h.summon); log('  t', (f / 60).toFixed(0), 'his hp', u.st.hp, 'act', u.sk.act && u.sk.act.name, 'heads', sm.map((h) => h.mode).join(','), 'next', C && C.next && C.next.toFixed(2)); } };
  }
  const place7 = () => { const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; cam.x = P.x + dx / d * 7; cam.z = P.z + dz / d * 7; };
  if (mode === 'phase') {
    // you at 6 m, the heads coming; every head in reach cut down a second after it lands near you (your blade's way: one hit)
    // and you fight back: a head leaping or rearing within 2.2 m is swung at once (65% of the time it connects, as a
    // player's cut at a thing in the air would), your guard otherwise down
    const tried = new Set(); let swung = 0, killed = 0;
    const fight = () => { for (const h of b.CRY.list) { if (!h.summon) continue; if (h.mode !== 'leap' && h.mode !== 'rear') { tried.delete(h); continue; } if (tried.has(h) || h.off) continue;
      const W = h.body.getWorldPosition(new P.constructor()); if (W.distanceTo(cam) > 2.2) continue; tried.add(h); swung++;
      if (Math.random() < 0.65) { b.lookAt(W.x, W.y, W.z); if (b.cryStrike(0.6)) killed++; } } };
    seg('phase, standing 6 m, cutting at heads', 30, (f) => { const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; cam.x = P.x + dx / d * 6; cam.z = P.z + dz / d * 6; fight(); });
    const ev = {}; for (const e of (b.CRY.log || [])) ev[e.ev] = (ev[e.ev] || 0) + 1; log('swung at heads', swung, 'killed', killed, '| head events', JSON.stringify(ev));
    const C = b.CRY; log('summoned heads', (C.list || []).filter((h) => h.summon).map((h) => h.i + ':' + h.mode).join(' '), '| log', JSON.stringify((C.log || []).slice(-12)));
    return;
  }
  seg('standing 7 m', 20, place7);
  seg('circling 7 m at a walk', 25, () => { const dx = cam.x - P.x, dz = cam.z - P.z; ang = Math.atan2(dx, dz) + 3.4 / 7 / 60; cam.x = P.x + Math.sin(ang) * 7; cam.z = P.z + Math.cos(ang) * 7; });
  seg('strafing 7 m at a run, turning every 1.5 s', 20, (f) => { const dx = cam.x - P.x, dz = cam.z - P.z, sg = Math.floor(f / 90) % 2 ? 1 : -1; ang = Math.atan2(dx, dz) + sg * 5.7 / 7 / 60; cam.x = P.x + Math.sin(ang) * 7; cam.z = P.z + Math.cos(ang) * 7; });
}

// THE SHIFT HEAVY, through the real inputs (2026-11-13, the owner: "my shift heavy wont work"): for each weapon, Shift
// pressed as a real keydown, the left button held past the charge latch, released, and what the swing came out as.
export async function shiftHeavy({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) { /* */ } b.frame(3); await sleep(30); }
  b.settings.devMode = true; b.camera.position.set(8, 1.7, -60);
  if (w.__shRoom) {
    const RB = b.ROOM_BACK[w.__shRoom]; RB.load();
    for (let i = 0; i < 200 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
    RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(5); }
    log('room', w.__shRoom, 'ready', RB.ready(), 'pos', b.camera.position.toArray().map((x) => x.toFixed(1)).join(','));
  }
  const cv = b.renderer.domElement;
  const pe = (t) => new PointerEvent(t, { button: 0, buttons: t === 'pointerup' ? 0 : 1, clientX: 400, clientY: 300, bubbles: true, pointerId: 1 });
  const ke = (t) => new KeyboardEvent(t, { code: 'ShiftLeft', key: 'Shift', shiftKey: t === 'keydown', bubbles: true });
  for (const name of (w.__shItems || 'shovelItem,militaryItem,katanaItem,pegItem').split(',')) {
    const it = b[name]; if (!it) { log(name, 'not exposed'); continue; }
    if (b.equippedS() !== it) b.toggleEquip(it);
    for (let i = 0; i < 40; i++) b.frame(1);
    for (const shift of [false, true]) {
      if (shift) w.dispatchEvent(ke('keydown'));
      const keyed = !!(b.keys.ShiftLeft);
      cv.dispatchEvent(pe('pointerdown'));
      let wound = false, wo = false;
      for (let i = 0; i < 70; i++) { b.frame(1); await sleep(16); wound = wound || b.state().digT > 0 || !!b.winding; wo = wo || b.windOverhead; }
      w.dispatchEvent(pe('pointerup'));
      let oh = false, swung = false;
      for (let i = 0; i < 40; i++) { b.frame(1); oh = oh || b.digOverhead; swung = swung || b.state().digT > 0; }
      if (shift) w.dispatchEvent(ke('keyup'));
      for (let i = 0; i < 60; i++) b.frame(1);
      log(name, shift ? 'SHIFT' : 'plain', '| key down', keyed, '| winding seen', wound, '| windOverhead', wo, '| swung', swung, '| overhead', oh, '| equipped', b.equippedS() && b.equippedS().name);
    }
  }
}
export async function shiftHeavyUc(ctx) { ctx.w.__shRoom = 'uc'; ctx.w.__shItems = 'militaryItem,shovelItem'; return shiftHeavy(ctx); }
// the same, the owner's way: the Military Shovel held in the undercroft, saved, the page reloaded into that checkpoint
// (no death, dev mode off), then Shift + hold + release through the real inputs
export async function shiftHeavyLoad({ w, b, log, sleep }) {
  const f = w.frameElement;
  const RB = b.ROOM_BACK.uc; RB.load();
  for (let i = 0; i < 200 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
  RB.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(5); }
  for (const it of [b.militaryItem, b.shovelItem]) if (!b.inventory.includes(it)) b.addToInventory(it);
  if (b.equippedS() !== b.militaryItem) b.toggleEquip(b.militaryItem);
  for (let i = 0; i < 30; i++) b.frame(1);
  b.saveCheckpoint(); await sleep(300);
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
  f.contentWindow.location.reload(); await sleep(1500);
  let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
  const B = w2.__bw;
  for (let i = 0; i < 900 && !(B.restoreS && B.restoreS().bootHold <= 0 && B.state().introDone); i++) await sleep(50);
  await sleep(1500);
  B.settings.devMode = false;
  log('loaded', 'room', B.devRoom && B.devRoom(), 'equipped', B.equippedS() && B.equippedS().name, 'frozen', B.frozen(), 'hp', B.state().hp);
  const cv = B.renderer.domElement;
  const pe = (t) => new w2.PointerEvent(t, { button: 0, buttons: t === 'pointerup' ? 0 : 1, clientX: 400, clientY: 300, bubbles: true, pointerId: 1 });
  const ke = (t) => new w2.KeyboardEvent(t, { code: 'ShiftLeft', key: 'Shift', shiftKey: t === 'keydown', bubbles: true });
  const kw = (t) => new w2.KeyboardEvent(t, { code: 'KeyW', key: 'w', bubbles: true });
  for (const [shift, run] of [[false, false], [true, false], [true, true], [true, true]]) {
    if (shift) w2.dispatchEvent(ke('keydown'));
    if (run) { w2.dispatchEvent(kw('keydown')); await sleep(1500); }
    const keyed = !!B.keys.ShiftLeft;
    cv.dispatchEvent(pe('pointerdown'));
    let wound = false, wo = false;
    for (let i = 0; i < 70; i++) { await sleep(16); wound = wound || !!B.winding; wo = wo || B.windOverhead; }
    w2.dispatchEvent(pe('pointerup'));
    let oh = false, swung = false;
    for (let i = 0; i < 40; i++) { await sleep(16); oh = oh || B.digOverhead; swung = swung || B.state().digT > 0; }
    if (shift) w2.dispatchEvent(ke('keyup'));
    if (run) w2.dispatchEvent(kw('keyup'));
    await sleep(800);
    log(shift ? (run ? 'SHIFT+W' : 'SHIFT') : 'plain', '| key down', keyed, '| winding seen', wound, '| windOverhead', wo, '| swung', swung, '| overhead', oh, '| stamina', B.state().stamina, '| exhausted', B.state().exhausted);
  }
}

/* THE ARTIFACT WITHOUT HIS DEAL (2026-11-13, the owner: "make the whale artifact spawn in the flesh pile even without
 * talking to skrim"): never talking to him, the heaps broken with real heavy swings in turn until it falls out; taken;
 * walked back past him; climbed out — the heal should start. */
export async function skrimNoDeal({ w, b, log, sleep }) {
  b.settings.devMode = false;
  try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
  b.placeInWhale();
  const S = b.SKRIM, Q = b.SKQ, cam = b.camera.position, V3 = cam.constructor;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u; if (!u || !u.model) { log('no skrim'); return; }
  for (let i = 0; i < 30; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const P = u.g.position, home = P.clone();
  const st = () => `stage ${S.stage} art ${b.artState()} holding ${b.skqHolding()} world ${!!b.art.world} pick ${Q.pick} broke ${Q.broke.toString(2)}`;
  const put = (x, z) => { cam.x = x; cam.z = z; const fy = b.skrimFloorW(x, z); b.groundY = fy; cam.y = fy + 1.62; b.camBaseY = cam.y; };
  const steps = (n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); b.step(1 / 60); b.updateSkrimLife(1 / 60); } };
  log('before any blow:', st(), '| farthest #', Q.piles.reduce((a, p) => (!a || p.s > a.s ? p : a), null).i);
  const G = (p) => p.g.getWorldPosition(new V3());
  const swingAt = (p, pow) => {
    const g = G(p), dx = home.x - g.x, dz = home.z - g.z, L = Math.hypot(dx, dz) || 1;
    const x = g.x + dx / L * 1.9, z = g.z + dz / L * 1.9; put(x, z);
    b.lookAt(g.x, g.y + 0.3 * p.K, g.z); b.startDig(pow);
    steps(110, () => { put(x, z); b.lookAt(g.x, g.y + 0.3 * p.K, g.z); });
  };
  for (const p of [...Q.piles].sort((a, c) => a.s - c.s)) {
    if (b.art.world || b.artState() !== 0) break;
    swingAt(p, 1); if (!p.gone) swingAt(p, 1);
    log(`#${p.i} HH gone ${p.gone} |`, st());
  }
  steps(60);
  const W = b.art.world; log('out:', !!W, 'stage still', S.stage);
  if (!W) return;
  const it = b.interactables.find((x) => x.root === W); if (it) it.onActivate(); steps(2);
  log('taken:', st(), 'in pack', b.inventory.includes(b.whaleArtItem));
  put(home.x + 1.5, home.z + 3); steps(120); log('walked back past him:', st(), 'dialog', b.state().dialogOpen);
  put(home.x, home.z + 40); steps(2); log('bellyClear', b.wbBellyClear());
  b.whaleClimbOut(); steps(3);
  log('climbed out: farewell', !!b.wfState(), '|', st());
}

/* THE ROOM WARMS' COMPILE, A/B (2026-11-13): `warmCompileOwn` prepares only the warm's own groups. Run twice —
 * `warmAB&ls=bw.warmAll:1` (the old whole-scene compile) and `warmAB&ls=bw.warmAll:0` — and compare: once the whole
 * first load is in, each room is entered and drawn, and any program compiled THEN is a hitch the warms missed. */
export async function warmAB({ w, b, log, sleep }) {
  log('mode warmAll', w.localStorage.getItem('bw.warmAll'));
  for (let i = 0; i < 600 && b.bootLeft().n > 0; i++) await sleep(100);
  await sleep(2000);
  const I = b.renderer.info, P = () => I.programs.length;
  log('all in: left', b.bootLeft().n, 'programs', P(), 'lag spans named compile', JSON.stringify(b.lag(16).filter((e) => /compile/.test(e[2])).map((e) => e[2] + ' ' + e[1]).slice(0, 20)));
  const rows = [];
  for (const k of ['bunker', 'uc', 'sewer', 'dun', 'dojo', 'cat', 'whale', 'keep', 'tav', 'fort', 'c13', 'thr']) {
    const R = b.ROOM_BACK[k]; R.load();
    for (let i = 0; i < 400 && !R.ready(); i++) { b.frame(1); await sleep(50); }
    if (!R.ready()) { rows.push(k + ' NOT READY'); continue; }
    for (let i = 0; i < 200 && b.bootLeft().n > 0; i++) { b.frame(1); await sleep(30); }
    const p0 = P(); b.clearRoomFlags(); R.place(); const tA = performance.now();
    let worst = 0; for (let i = 0; i < 40; i++) { const t = performance.now(); b.frame(1); worst = Math.max(worst, performance.now() - t); if (i % 5 === 0) await sleep(5); }
    rows.push(`${k} +${P() - p0} programs on entering, worst frame ${Math.round(worst)} ms`);
    if (k === 'sewer' || k === 'dojo') { const names = {}; const mats = new Map(); b.scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) mats.set(m, o); }); for (const pr of I.programs.slice(p0)) { const key = pr.cacheKey; let who = '?'; for (const [m, o] of mats) { const pp = b.renderer.properties.get(m); if (pp && pp.currentProgram === pr) { let r = o; while (r.parent && r.parent !== b.scene) r = r.parent; who = (r.name || r.type) + '/' + (o.name || '') + '/' + m.type; break; } } names[who] = (names[who] || 0) + 1; } log('  new on', k, JSON.stringify(names)); }
  }
  b.clearRoomFlags(); b.placeOnBeach && b.placeOnBeach();
  log('ROOMS', rows.join(' | '));
  log('end programs', P());
}

// THE STAIR DOWN TO HENRY'S JETTY (2026-11-13, the owner: "add a handrail down the steps to henry at the lighthouse
// people keep missing those steps"): stills of the flight from the jetty, the landing, the sea side and close on a tread
export async function isleStairShots({ w, b, log, sleep, shot }) {
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(30); }
  window.requestAnimationFrame = () => 0; w.requestAnimationFrame = () => 0;
  const R = b.ISLE_RAMPS[0], C = b.camera, zm = (R.z0 + R.z1) / 2;
  log('ramp x', R.x0, R.x1, 'z', R.z0.toFixed(2), R.z1.toFixed(2), 'hj', JSON.stringify(b.HJ_SPOT));
  b.isleWorldG().visible = true;
  const at = (n, px, py, pz, lx, ly, lz, g = 1.6) => { C.position.set(px, py, pz); C.lookAt(lx, ly, lz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('st_' + n, 640, g); };
  const extra = w.__stairViews || [];
  const yAt = (z) => { const P = R.prof; for (let k = 0; k < P.length - 1; k++) if (z <= P[k][0] && z >= P[k + 1][0]) { const u = (z - P[k][0]) / (P[k + 1][0] - P[k][0]); return P[k][1] + u * (P[k + 1][1] - P[k][1]); } return z > P[0][0] ? P[0][1] : P[P.length - 1][1]; };
  log('prof', JSON.stringify(R.prof.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)])));
  at('jetty', -24, 3, R.z1 + 2, -16.6, 7, zm);
  at('down', -16.6, yAt(R.z0 + 1) + 1.6, R.z0 + 1, -16.6, 0.5, R.z1 + 1);
  at('up', -16.6, yAt(R.z1 - 1) + 1.6, R.z1 - 1, -16.6, 15, R.z0);
  at('side', -27, 10, zm, -16.6, 8, zm);
  { const rail = b.isleWorldG().getObjectByName('isleStairRail'), m = rail && rail.material;
    log('rail', !!rail, 'map', m && m.map && m.map.image && m.map.image.width, 'nmap', m && m.normalMap && m.normalMap.image && m.normalMap.image.width, 'color', m && m.color.getHexString(), 'rough', m && m.roughness, 'metal', m && m.metalness, 'emis', m && m.emissive && m.emissive.getHexString(), m && m.emissiveIntensity, 'vc', m && m.vertexColors, 'side', m && m.side);
    if (m && m.map) { const c = m.map.image, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let r = 0, g = 0, bb = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bb += d[i + 2]; } const n = d.length / 4; log('crop mean', (r / n).toFixed(0), (g / n).toFixed(0), (bb / n).toFixed(0)); }
    const wk = b.isleWorldG().children.find((o) => o.name === 'isle_walkway'); if (wk) { const q = wk.material; log('walkway', 'color', q.color.getHexString(), 'vc', q.vertexColors, 'emis', q.emissive.getHexString(), 'metal', q.metalness, 'aoMap', !!q.aoMap, 'onBefore', !!q.onBeforeCompile && String(q.onBeforeCompile).length); } }
  at('close', -16.4, yAt(zm) + 1.5, zm + 0.6, -17.94, yAt(zm) + 0.6, zm - 1.2, 2.6);
  at('closeOut', -21.5, yAt(zm) + 1.0, zm + 1.5, -17.94, yAt(zm) + 0.5, zm, 2.6);
  for (const v of extra) at(...v);
}

// what the stair's treads and the jetty's boards are made of (their material, map, its size and UV spread)
export async function isleStairMat({ w, b, log, sleep }) {
  b.settings.devMode = true; b.loadIsle();
  for (let i = 0; i < 300 && !(b.isleS().ready && b.ISLE_SITE.cells); i++) { b.frame(2); await sleep(100); }
  b.placeOnIsle(); for (let i = 0; i < 10; i++) { b.frame(1); await sleep(30); }
  const T = b.THREE, G = b.isleWorldG(); G.visible = true; G.updateMatrixWorld(true);
  const R = b.ISLE_RAMPS[0], V = T.Vector3, ray = new T.Raycaster(); ray.camera = b.camera;
  for (const [x, z, y] of [[-16.6, R.z1 - 3, 30], [-16.6, R.z0 + 2, 40], [-24.2, b.HJ_SPOT.z + 3, 10], [-17.9, (R.z0 + R.z1) / 2, 30]]) {
    ray.set(new V(x, y, z), new V(0, -1, 0)); const h = ray.intersectObject(G, true)[0];
    if (!h) { log('no hit', x, z); continue; }
    const m = [].concat(h.object.material)[h.face ? h.face.materialIndex || 0 : 0] || h.object.material, mp = m.map;
    const uv = h.object.geometry.attributes.uv;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; if (uv) for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
    if (w.__dumpMap !== false && mp && mp.image && !w.__dumped) { w.__dumped = true; const c = document.createElement('canvas'); c.width = c.height = 768; const g2 = c.getContext('2d'); g2.drawImage(mp.image, 0, 0, 768, 768); g2.strokeStyle = '#f00'; for (let k = 1; k < 8; k++) { g2.beginPath(); g2.moveTo(k * 96, 0); g2.lineTo(k * 96, 768); g2.moveTo(0, k * 96); g2.lineTo(768, k * 96); g2.stroke(); } const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'walkway_map', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
      const tri = h.face, ua = uv; log('  hit uv', ua.getX(tri.a).toFixed(3), ua.getY(tri.a).toFixed(3), ua.getX(tri.b).toFixed(3), ua.getY(tri.b).toFixed(3), ua.getX(tri.c).toFixed(3), ua.getY(tri.c).toFixed(3), 'flipY', mp.flipY); }
    log('at', x, z.toFixed(1), 'y', h.point.y.toFixed(2), 'mesh', h.object.name, 'mat', m.name, m.type, 'color', m.color && m.color.getHexString(), 'emis', m.emissive && m.emissive.getHexString(), m.emissiveIntensity, 'map', mp ? (mp.image && (mp.image.width + 'x' + mp.image.height)) + ' ' + (mp.name || '') : 'none', 'normal', !!m.normalMap, 'rough', m.roughness, 'uv', uv ? [u0, u1, v0, v1].map((q) => q.toFixed(2)).join(',') : '-', 'tris', h.object.geometry.index ? h.object.geometry.index.count / 3 : 0);
  }
}

/* 2026-11-13's list, checked: the throne room's doors barred mid fight; the katana sold for four jars; the Lucky Ring
 * (its rate over many blows, a turned blow costs nothing, an old save's 'Gem Stone Ring' read as it); the bunker's step;
 * the well man's reveal cut and his stare's lens let go when you walk off; the Dealer's the same. */
export async function nov13({ w, b, log, sleep }) {
  b.settings.devMode = false;
  const only = new URLSearchParams(window.location.search).get('only');
  const frames = async (n) => { for (let i = 0; i < n; i++) { b.frame(1); if (i % 10 === 0) await sleep(5); } };
  // THE THRONE ROOM
  { const RB = b.ROOM_BACK.thr; RB.load(); for (let i = 0; i < 300 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
    b.clearRoomFlags(); RB.place(); await frames(20);
    const it = b.interactables.filter((x) => x.root && x.root.name === 'hitProxy' && b.thrWorldG && false);
    const S = b.thrSceneS(), lab = () => b.interactables.filter((x) => typeof x.label === 'function').map((x) => x.label()).filter((s) => /Lift|throne room|barred/.test(s));
    log('throne: phase', S.phase, 'barred', b.thrFightOn(), 'doors', JSON.stringify(lab()));
    S.phase = 2; log('throne mid fight: barred', b.thrFightOn(), 'doors', JSON.stringify(lab()));
    const D = b.danteU(), U = b.umbraU(); D.st.alive = false; S.phase = 5; log('beast down, him up: barred', b.thrFightOn());
    U.st.alive = false; log('both down: barred', b.thrFightOn(), 'doors', JSON.stringify(lab()));
    U.st.alive = true; D.st.alive = true; S.phase = 0; b.clearRoomFlags(); }
  // THE KATANA AT THE COUNTER
  { const K = b.katanaItemS(); if (!b.inventory.includes(K)) b.addToInventory(K); const j0 = b.state().jars ?? null;
    const row = b.SELL_ROWS ? b.SELL_ROWS.find((r) => r.key === 'katana') : null;
    const before = b.jarsS();
    b.traderSell('katana'); log('katana sold: in pack', b.inventory.includes(K), 'row', !!row, row && row.price, 'jars', before, '->', b.jarsS()); }
  // THE LUCKY RING
  { const G = b.gemItemS(); log('ring name', G.name, '| desc', G.desc);
    if (!b.inventory.includes(G)) b.addToInventory(G); b.wearRing && b.wearRing(G);
    log('worn', b.rings ? b.rings.includes(G) : '?');
    let lucky = 0, N = 2000; for (let i = 0; i < N; i++) { b.setLuckAt(-1e9); if (b.luckyBlow(null)) lucky++; }
    log('lucky rolls', lucky, 'of', N, (lucky / N * 100).toFixed(1) + '%');
    b.setLuckAt(-1e9); let back = 0; for (let i = 0; i < 50; i++) if (b.luckyBlow(null)) back++; log('within the gap after one: lucky', back, 'of 50 more (wants at most 1)');
    // a real blow that was lucky costs nothing
    b.setHp(4); let costFree = 0, cost = 0; for (let i = 0; i < 400; i++) { b.setLuckAt(-1e9); const h0 = b.hpS(); b.damagePlayer(1); if (b.hpS() === h0) costFree++; else cost++; b.setHp(4); await (i % 50 === 0 ? sleep(1) : null); }
    log('real blows with it worn: no damage', costFree, 'damage', cost);
  }
  // AN OLD SAVE'S NAME
  { const d = { pack: ['Gem Stone Ring', 'Katana'], slots: ['Gem Stone Ring', null], worn: ['Gem Stone Ring'], held: 'Gem Stone Ring', ext: 0 };
    const m = b.migrateSave ? b.migrateSave(d) : null; log('migrated', JSON.stringify(m && { pack: m.pack, slots: m.slots, worn: m.worn, held: m.held })); }
  // THE BUNKER'S STEP
  { const bank = (b.sampleBanks.churchStep || []).filter(Boolean).length; let ok = true; try { b.sfxStepBunker(); } catch (e) { ok = 'threw ' + e.message; } log('bunker step: church bank', bank, 'played', ok); }
  // THE WELL MAN: the reveal cut, the stare's lens, walking off
  { const u = b.wellU(); for (let i = 0; i < 300 && !(u && u.model && u.mixer); i++) { b.frame(1); await sleep(40); }
    b.setWellPhase(1); b.wellLook.on = true; b.wellLook.phase = 'black'; b.wellLook.t = 1.89; b.wellLook.to.copy(b.camera.position);
    const op = []; for (let i = 0; i < 40; i++) { b.step(1 / 60); op.push(w.document.getElementById('blackout').style.opacity); }
    const firstClear = op.findIndex((v) => +v === 0);
    log('reveal: black frames then', firstClear, 'opacities', [...new Set(op)].join(','), '| stare', JSON.stringify(b.wellStalkS()), 'cine', JSON.stringify(b.cineS()));
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    log('  standing: cine', JSON.stringify(b.cineS()));
    const c = b.camera.position; log('  before the walk: cam', c.x.toFixed(2), c.z.toFixed(2));
    b.keys.KeyS = true; for (let i = 0; i < 70; i++) b.step(1 / 60); b.keys.KeyS = false; for (let i = 0; i < 60; i++) b.step(1 / 60);
    log('  walked back (S) 70 frames: cam', c.x.toFixed(2), c.z.toFixed(2), 'cine', JSON.stringify(b.cineS()), 'stare still', JSON.stringify(b.wellStalkS()));
    c.x += 1.6; b.camBaseY = c.y; b.step(1 / 60); log('  pushed 1.6 m: cam', c.x.toFixed(2), 'cine', JSON.stringify(b.cineS()));
  }
  // THE DEALER'S
  { const RB = b.ROOM_BACK.bunker; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
    if (!RB.ready()) log('bunker never ready');
    else { b.clearRoomFlags(); RB.place(); await frames(30); const D = b.dealerU(); for (let i = 0; i < 200 && !(D && D.model); i++) { b.frame(1); await sleep(40); }
      b.startDealerPickup(); for (let i = 0; i < 20; i++) b.step(1 / 60);
      log('dealer reach: cine', JSON.stringify(b.cineS()));
      const c = b.camera.position; c.z += 1.4; for (let i = 0; i < 60; i++) b.step(1 / 60);
      log('  walked off: cine', JSON.stringify(b.cineS())); }
  }
}

// THE DEAD IN THE WATER (2026-11-14): loaded as the snap's checkpoint loads (`deepRestore`), the bodies and the blood from
// where you arrive, close up, and then the pliosaur let loose for a while with you held still — how far it throws them
export async function deadShots({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  log('ready plio', b.plioS().ready, 'dead gltf', !!b.dead.gltf);
  const t0 = performance.now();
  b.deepRestore();
  log('restore+build ms', (performance.now() - t0).toFixed(0), 'bodies', b.dead.bodies.length, 'pieces', b.dead.pieces.length, 'bleeds', b.dead.bleeds.length);
  w.__clockOn();
  const D = b.deepS(), C = b.camera, E = D.descE.clone(), T = b.THREE;
  let long = 0; for (let i = 0; i < 120; i++) { const a = performance.now(); w.__adv(1); long = Math.max(long, performance.now() - a); }
  log('2 s in: worst frame ms', long.toFixed(1), 'phase', D.ph, 'fog', b.scene.fog.density.toFixed(3));
  const G = (s) => w.__deadGain || s;
  const at = (n, px, py, pz, lx, ly, lz) => { C.position.set(px, py, pz); C.lookAt(lx, ly, lz); C.updateMatrixWorld(true); shot('dd_' + n, 640, G(1)); shot('dd_' + n + '_hi', 640, 2.4); };
  at('arrive', E.x, E.y, E.z, E.x - 0.3, E.y - 0.6, E.z + 8);
  const B0 = b.dead.bodies[0].G.position, B1 = b.dead.bodies[1].G.position;
  at('close0', B0.x + 1.6, B0.y + 0.5, B0.z - 2.2, B0.x, B0.y, B0.z);
  at('close1', B1.x - 2.0, B1.y + 0.8, B1.z - 2.5, B1.x, B1.y, B1.z);
  at('round', E.x, E.y, E.z, E.x - 8, E.y, E.z - 3);
  at('up', E.x, E.y, E.z, E.x + 2, E.y + 8, E.z + 3);
  { const L = b.dead.live; if (L) { const c = L.G.position; at('live', c.x - 1.4, c.y + 0.6, c.z - 2.4, c.x, c.y, c.z); } }
  { const bd = b.dead.bodies[4], cp = bd.capBones && bd.capBones[0]; if (cp) { const v = new T.Vector3(); cp.getWorldPosition(v); at('cap', v.x + 0.5, v.y + 0.35, v.z - 0.7, v.x, v.y, v.z); } }
  const V = b.dead.bodies[6].G.position;
  at('descent', V.x - 3.5, V.y + 0.5, V.z - 7, V.x, V.y, V.z);
  if (w.parent.__deadQuick || location.search.includes("quick")) return;
  // and the animal through them: the fight, you held where you arrived, 40 s
  const P = b.plioS();
  D.ph = 'fight'; D.t = 0; b.plioStartPass();
  const home = b.dead.pieces.map((q) => q.p.clone());
  let maxMove = 0, maxV = 0, maxFl = 0, closest = 1e9, shots = 0;
  for (let f = 0; f < 60 * 40; f++) {
    C.position.copy(E); b.camBaseY = E.y; D.v.set(0, 0, 0); D.knock.set(0, 0, 0); b.setHp && b.setHp(4);
    w.__adv(1);
    for (const q of b.dead.pieces) { maxV = Math.max(maxV, q.v.length()); maxFl = Math.max(maxFl, q.flail); }
    if (b.dead.pOn) for (const bd of b.dead.bodies) for (const s of b.dead.ps) { const d = s.distanceTo(bd.G.position); if (d < closest) closest = d;
      if (d < 4 && shots < 4 && f % 6 === 0) { shots++; const c = bd.G.position; C.position.set(c.x - 6, c.y + 1.5, c.z - 6); C.lookAt(c.x, c.y, c.z); C.updateMatrixWorld(true); shot('dd_push' + shots, 640, 2.0); C.position.copy(E); } }
  }
  b.dead.pieces.forEach((q, i) => { maxMove = Math.max(maxMove, q.p.distanceTo(home[i])); });
  log('fight 40 s: plio st', P.st, 'closest sphere to a body', closest.toFixed(2), 'max speed', maxV.toFixed(2), 'max flail', maxFl.toFixed(2), 'max moved m', maxMove.toFixed(2), 'push shots', shots);
  let live = 0; const Bl = b.dead.blood; for (let i = 0; i < Bl.life.length; i++) if (Bl.life[i] > 0) live++;
  log('blood clouds live', live, 'pieces under floor', b.dead.pieces.filter((q) => q.p.y < 2000 - 34).length);
  at('after', E.x, E.y, E.z, E.x - 0.3, E.y - 0.6, E.z + 8);
}

// what is the big pale thing in the deep's picture: each of the scene's top-level children hidden in turn, the left of the frame measured
export async function deadWho({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  b.deepRestore(); w.__clockOn(); w.__adv(60);
  const C = b.camera, E = b.deepS().descE;
  const pose = () => { C.position.set(E.x, E.y, E.z); C.lookAt(E.x - 0.3, E.y - 0.6, E.z + 8); C.updateMatrixWorld(true); };
  const R = b.renderer, gl = R.getContext();
  const meas = () => { pose(); R.render(b.scene, C); const px = new Uint8Array(4); gl.readPixels(Math.round(gl.drawingBufferWidth * 0.15), Math.round(gl.drawingBufferHeight * 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[0] + px[1] + px[2]; };
  const base = meas(); log('base', base, 'deep.world kids', b.deepS().world.children.length);
  for (const o of b.scene.children) { if (!o.visible) continue; o.visible = false; const v = meas(); o.visible = true; if (Math.abs(v - base) > 20) log('hide', o.name || o.type, o.type, '->', v); }
  for (const o of b.deepS().world.children) { if (!o.visible) continue; o.visible = false; const v = meas(); o.visible = true; if (Math.abs(v - base) > 20) log('hide deep kid', o.name || o.type, o.type, '->', v); }
  for (const o of b.dead.g.children) { if (!o.visible) continue; o.visible = false; const v = meas(); o.visible = true; if (Math.abs(v - base) > 20) log('hide dead kid', o.name || o.type, o.type, '->', v); }
}

// the frames after the snap's checkpoint loads, one by one: which are slow, and what the dead cost in each
export async function deadFrames({ w, b, log, sleep }) {
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  await sleep(1500);
  b.deepRestore();
  const R = b.renderer; let last = performance.now(); const t0 = last; const slow = []; let n = 0;
  await new Promise((res) => { const raf = w.requestAnimationFrame.bind(w); (function fr() { const now = performance.now(), d = now - last; last = now; n++;
    if (d > 35) slow.push(`+${((now - t0) / 1000).toFixed(2)}s ${Math.round(d)}ms dead ${(b.dead.ms || 0).toFixed(1)} prog ${R.info.programs.length} tex ${R.info.memory.textures} geo ${R.info.memory.geometries} ph ${b.deepS().ph}`);
    if (now - t0 < 16000) raf(fr); else res(); })(); });
  log('frames', n, 'dead max ms', (b.dead.msMax || 0).toFixed(2)); for (const s of slow) log('  slow', s);
}

// THE DEAD, LIVE: the bite at the tree, the pull, the plunge, the descent past the first two, the arrival — when the dead
// are parsed and built (which phase), the slow frames by the wall clock, and stills down the last of the descent
export async function deadLive({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/deepshot.js');
  w.__dpBoot();
  for (let i = 0; i < 100; i++) { w.__adv(2); await sleep(50); }
  log('hook', w.__dpHook());
  const D = b.deepS(), want = [['descent', 2.0], ['descent', 6.0], ['descent', 8.4], ['descent', 10.0], ['silence', 1.5], ['fight', 0.9], ['fight', 1.1], ['fight', 1.6], ['fight', 6]];
  let gAt = null, bAt = null, last = Date.now(), k = 0; const slow = [];
  for (let n = 0; n < 60 * 45 && k < want.length; n++) {
    w.__adv(1);
    if (n % 4 === 0) await sleep(2);
    const now = Date.now(), d = now - last; last = now;
    const where = D.ph + ' ' + D.t.toFixed(2);
    if (d > 45 && n > 30) slow.push(where + ' ' + d + 'ms');
    if (!gAt && b.dead.gltf) gAt = where;
    if (!bAt && b.dead.built) bAt = where + ' bodies ' + b.dead.bodies.length;
    const [ph, t] = want[k];
    if (D.ph === ph && D.t >= t) { shot('dl_' + k + '_' + ph + '_' + t, 640, 1.6); k++; }
  }
  log('parsed at', gAt, '| built at', bAt, '| fetched', !!b.dead.fetching);
  log('slow frames (wall clock, > 45 ms)', slow.length, slow.slice(0, 12).join(' | '));
}

// dev mode hands over the fishing rod (2026-11-14)
export async function devRod({ w, b, log, sleep }) {
  const has = () => b.inventory.includes(b.fishingRodItem);
  log('before', has(), 'dev', b.settings.devMode);
  const box = w.document.getElementById('s-dev') || [...w.document.querySelectorAll('input[type=checkbox]')].pop();
  box.checked = true; box.dispatchEvent(new w.Event('change'));
  await sleep(200);
  log('after the menu box', has(), 'dev', b.settings.devMode, 'pack', b.inventory.length);
}

// THE AMBUSH (2026-11-14): loaded as the snap's checkpoint loads, you looking where it leaves you: the one still alive
// struggling, the pliosaur out of the dark through it, carried off, and what it does next. A sheet of the run-in and the
// bite (`dd_amb_sheet`), stills either side, and where everything was.
export async function deadAmbush({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  for (let i = 0; i < 100 && !(b.fishingRodS && b.fishingRodS().children.length); i++) { b.frame(1); await sleep(100); }
  b.deepRestore(); w.__clockOn();
  const D = b.deepS(), P = b.plioS(), L = () => b.dead.live, C = b.camera, E = D.descE.clone(), Q = C.quaternion.clone();
  const hold = () => { C.position.copy(E); C.quaternion.copy(Q); b.camBaseY = E.y; D.v.set(0, 0, 0); D.knock.set(0, 0, 0); b.setHp && b.setHp(4); };
  log('live', !!L(), L() && L().st, 'rods', b.dead.rods ? b.dead.rods.length : 'none', 'pieces', b.dead.pieces.length);
  for (let i = 0; i < 90; i++) { hold(); w.__adv(1); }
  const lp = L().G.position; log('live at', lp.clone().sub(E).toArray().map((v) => v.toFixed(2)).join(','), 'seen', b.deadLiveSeen());
  shot('dd_amb_struggle', 640, 1.5);
  const cv = b.renderer.domElement, sw = 400, sh = Math.round(sw * cv.height / cv.width), cols = 3, rows = 5;
  const sheet = document.createElement('canvas'); sheet.width = sw * cols; sheet.height = sh * rows; const g2 = sheet.getContext('2d'); g2.filter = 'brightness(1.5)';
  let k = 0, tAmb = null, tBite = null, minCam = 1e9, biteD = null, carryMin = 1e9;
  for (let f = 0; f < 60 * 14; f++) {
    hold(); w.__adv(1);
    if (P.st === 'ambush' && tAmb === null) tAmb = D.t.toFixed(2) + ' (' + D.ph + ')';
    if (P.st === 'ambush' || (tBite && k < rows * cols)) {
      if (P.g) { P.g.updateMatrixWorld(true); const hp = new b.THREE.Vector3(); (P.head ? P.head.getWorldPosition(hp) : hp.copy(P.g.position)); minCam = Math.min(minCam, hp.distanceTo(E)); }
      if (P.amb === 'carry') carryMin = Math.min(carryMin, P.g.position.distanceTo(E));
      if (!tBite && L().st === 'held') { tBite = D.t.toFixed(2); biteD = L().G.position.distanceTo(E).toFixed(2); }
      if (f % 4 === 0 && k < rows * cols && (P.amb === 'carry' || (P.head && P.head.getWorldPosition(new b.THREE.Vector3()).distanceTo(E) < 24))) { b.renderer.render(b.scene, C); g2.drawImage(cv, (k % cols) * sw, Math.floor(k / cols) * sh, sw, sh); k++; }
    }
    if (tBite && P.st !== 'ambush' && P.st !== 'lurk' && !w.__ambNext) w.__ambNext = P.st + ' at ' + D.t.toFixed(2);
  }
  { const d = sheet.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'dd_amb_sheet', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); }
  log('ambush at', tAmb, '| bite at fight t', tBite, 'its distance from you', biteD, '| head nearest you', minCam.toFixed(1), 'in the carry', carryMin.toFixed(1), '| live', L().st, '| next', w.__ambNext || P.st, 'ambushes', P.nAmbush, 'bites at you', P.nBite || 0);
  shot('dd_amb_after', 640, 1.5);
  // the rods, from the side
  const R = b.dead.rods && b.dead.rods[0];
  if (R) { const p = R.H.position; C.position.set(p.x - 2.2, p.y + 0.6, p.z - 2.6); C.lookAt(p.x, p.y, p.z); C.updateMatrixWorld(true); shot('dd_amb_rod', 640, 1.6); }
}

// the ambush's run-in, frame by frame: where the mouth is against the one it is coming for
export async function ambDbg({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  b.deepRestore(); w.__clockOn();
  const D = b.deepS(), P = b.plioS(), C = b.camera, E = D.descE.clone(), Q = C.quaternion.clone(), V = b.THREE.Vector3;
  const hold = () => { C.position.copy(E); C.quaternion.copy(Q); b.camBaseY = E.y; D.v.set(0, 0, 0); D.knock.set(0, 0, 0); };
  for (let f = 0; f < 60 * 8; f++) {
    hold(); w.__adv(1);
    if (P.st === 'ambush' && f % 6 === 0) {
      const S = b.dead.live.G.position, h = new V(); P.head.getWorldPosition(h); const m = h.clone().addScaledVector(P.dir, 0.9 * 1.6);
      const toS = S.clone().sub(m), a = P.A.Attack_Bite;
      log(D.ph, D.t.toFixed(2), P.amb, 'dS', toS.length().toFixed(2), 'ahead', toS.dot(P.dir).toFixed(2), 'sp', P.speed.toFixed(1), 'clip', a.time.toFixed(2), 'ts', a.timeScale.toFixed(2), 'g', P.g.position.clone().sub(E).toArray().map((v) => v.toFixed(1)).join(','), 'dir', P.dir.toArray().map((v) => v.toFixed(2)).join(','), 'live', b.dead.live.st);
    }
  }
}

// 2026-11-14's list: the merchant hit once (his line) and twice (the gun, the shot, the card at once); splashes only in the water
export async function nov14({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = false;
  const C = b.camera, W = b.traderWorld, T = b.THREE;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  // the surf and the courtyard
  const at = (x, z, y = 1.7) => { C.position.set(x, y, z); b.camBaseY = y; };
  W.updateMatrixWorld(true); const tp = new T.Vector3(); W.getWorldPosition(tp);
  at(-14, -40, 1.7 - 0.1); log('wading: out in the sea', b.playerWading());
  at(tp.x, tp.z + 2); log('wading: by the trader on the sand', b.playerWading());
  // the merchant: stood 1.6 m in front of him, looking at his chest
  w.__clockOn();
  for (let i = 0; i < 60; i++) w.__adv(1);
  const face = () => { at(tp.x - 2.6, tp.z, 1.7); b.lookAt(tp.x, 1.3, tp.z); C.updateMatrixWorld(true); };
  face(); w.__adv(1); face();
  b.aimHere(); log('first blow lands on him', b.traderStrike(0.5), 'rage', b.TRADER_RAGE.n, 'dialog', b.state().dialogOpen, 'card', w.document.getElementById('dialog-speaker') ? w.document.getElementById('dialog-speaker').textContent : '?');
  for (let i = 0; i < 90; i++) { w.__adv(1); }
  shot('tr_line', 640, 1.2);
  b.endDialog(); for (let i = 0; i < 10; i++) { face(); w.__adv(1); }
  face(); b.aimHere();
  log('second blow lands', b.traderStrike(0.5), 'busy', b.TRADER_RAGE.busy, 'gun', !!b.TRADER_RAGE.gun);
  const R = b.TRADER_RAGE, de = w.document.getElementById('death');
  let f = 0, kicked = false;
  for (; f < 200 && !de.classList.contains('show'); f++) {
    face(); w.__adv(1);
    if (f === 12) shot('tr_draw', 640, 1.3);
    if (f === 70) { shot('tr_held', 640, 1.3);
      const q = C.position.clone(), qq = C.quaternion.clone(); C.position.set(tp.x - 1.0, 1.6, tp.z + 2.6); C.lookAt(tp.x - 1.0, 1.4, tp.z); C.updateMatrixWorld(true); shot('tr_side', 640, 1.5);
      { const hp = b.traderBonesS().handR.getWorldPosition(new b.THREE.Vector3()); C.position.set(hp.x - 0.2, hp.y + 0.12, hp.z + 0.6); C.lookAt(hp); C.updateMatrixWorld(true); shot('tr_hand', 640, 1.6); C.position.set(hp.x - 0.55, hp.y + 0.05, hp.z - 0.25); C.lookAt(hp); C.updateMatrixWorld(true); shot('tr_hand2', 640, 1.6); }
      C.position.copy(q); C.quaternion.copy(qq); C.updateMatrixWorld(true); }
    if (R.fired && !kicked) { kicked = true; log('fired at', R.t.toFixed(2), 's after the blow'); shot('tr_kick', 640, 1.3); }
  }
  const d = w.document, dc = d.getElementById('deathcard');
  log('card at frame', f, '(' + (f / 60).toFixed(2) + ' s) red up', de.classList.contains('show'), 'transition', de.style.transition, 'card shown', getComputedStyle(dc).display);

}

// standing in the surf, the game's own frames: your feet against the water's surface, and what the splash test says
export async function wadeCheck({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera;
  for (const x of [-2, -5, -8, -11]) {
    let yes = 0, n = 0, minGap = 9, maxGap = -9, inW = 0;
    for (let f = 0; f < 120; f++) {
      C.position.x = x; C.position.z = -60; b.frame(1); if (f % 10 === 0) await sleep(5);
      const feet = b.camBaseY - 1.7, surf = b.waterSurfaceAt ? b.waterSurfaceAt(C.position.x, C.position.z) : NaN;
      n++; if (b.playerWading()) yes++; if (b.inWater && b.inWater(C.position.x, C.position.z)) inW++;
      const gp = feet - surf; minGap = Math.min(minGap, gp); maxGap = Math.max(maxGap, gp);
    }
    log('x', x, 'at x', C.position.x.toFixed(2), 'wading', yes + '/' + n, 'inWater', inW, 'feet-surface', minGap.toFixed(2), '..', maxGap.toFixed(2));
  }
}

// THE DARK KNIGHT'S SKATE, BY CLIP: you strafing round him at the walk; on every moving frame (not swinging), which clip is
// on, its rate and weight, the body's speed, and whether the planted foot slid (the `dkMove` test: lower foot > 0.6 m/s)
export async function dkWhy({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; await w.__fortBoot(); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, V = C.constructor;
  const bl = u.model.getObjectByName('b_MF_Foot_L'), br = u.model.getObjectByName('b_MF_Foot_R');
  const fl = new V(), fr = new V(), pl = new V(), pr = new V(), px0 = { x: P.x, z: P.z };
  const me = { x: P.x + 3, z: P.z }; let side = 1, sideT = 1.5, first = true; const tally = {};
  for (let f = 0; f < 60 * 30; f++) {
    const dx = me.x - P.x, dz = me.z - P.z, d = Math.hypot(dx, dz) || 1;
    sideT -= 1 / 60; if (sideT <= 0) { side = -side; sideT = 1.2 + Math.random(); }
    me.x += -dz / d * side * 3.4 / 60; me.z += dx / d * side * 3.4 / 60;
    const k = (d - 3.2) * 0.05; me.x -= dx / d * k; me.z -= dz / d * k;
    C.set(me.x, C.y, me.z); b.camBaseY = C.y; b.lookAt(P.x, P.y + 1.4, P.z);
    w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false;
    u.model.updateMatrixWorld(true); bl.getWorldPosition(fl); br.getWorldPosition(fr);
    if (!first && u.st.atk < 0) {
      const low = fl.y < fr.y ? [fl, pl] : [fr, pr], hy = low[0].y - P.y;
      const sp = Math.hypot(low[0].x - low[1].x, low[0].z - low[1].z) * 60, vy = Math.abs(low[0].y - low[1].y) * 60;
      const bm = Math.hypot(P.x - px0.x, P.z - px0.z) * 60;
      if (bm > 0.2 && hy < 0.345 && vy < 0.4) {
        const acts = u.mixer._actions.filter((a) => a.isRunning() && a.getEffectiveWeight() > 0.05);
        const key = (u.cur ? u.cur.getClip().name : '-') + (acts.length > 1 ? ' (blend ' + acts.length + ')' : '');
        const t = tally[key] || (tally[key] = { n: 0, bad: 0, sp: 0, body: 0, rate: 0 });
        t.n++; if (sp > 0.6) t.bad++; t.sp += sp; t.body += bm; t.rate += u.cur ? u.cur.timeScale : 0;
      }
    }
    first = false; pl.copy(fl); pr.copy(fr); px0.x = P.x; px0.z = P.z;
  }
  for (const [k, t] of Object.entries(tally).sort((a, c) => c[1].n - a[1].n)) log(k.padEnd(22), 'n', t.n, 'skate', Math.round(100 * t.bad / t.n) + '%', 'foot', (t.sp / t.n).toFixed(2), 'body', (t.body / t.n).toFixed(2), 'rate', (t.rate / t.n).toFixed(2), 'mode', u._vgMode);
}

// HOW OFTEN IT IS IN YOUR FACE (2026-11-14): the fight, you held where the pull leaves you, 60 s; every frame, how near any
// vertex of its skin comes to your eye (every 5th vertex, skinned) — frames inside 0.3 m are frames it is through the lens
export async function plioClip({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  b.deepRestore(); w.__clockOn();
  const D = b.deepS(), P = b.plioS(), C = b.camera, E = D.descE.clone(), T = b.THREE;
  const meshes = []; P.g.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const v = new T.Vector3();
  const nearest = () => { let m = 1e9; for (const o of meshes) { o.skeleton.update(); const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i += 5) { v.fromBufferAttribute(pa, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); const d = v.distanceTo(C.position); if (d < m) m = d; } } return m; };
  D.ph = 'fight'; D.t = 0; b.plioStartPass(); w.__adv(30);   // (its ordinary fight, not the ambush)
  let n = 0, in03 = 0, in06 = 0, minD = 1e9, hurt = 0, hp0 = 4;
  for (let f = 0; f < 60 * 60; f++) {
    C.position.copy(E); b.camBaseY = E.y; D.v.set(0, 0, 0); D.knock.set(0, 0, 0); if (b.setHp) { if (b.hpS && b.hpS() < hp0) hurt++; b.setHp(4); }
    w.__adv(1);
    if (f % 2) continue;
    P.g.updateMatrixWorld(true);
    const d = nearest(); n++; if (d < 0.3) in03++; if (d < 0.6) in06++; if (d < minD) minD = d;
  }
  log('frames sampled', n, '| skin inside 0.3 m of the eye', in03, '| inside 0.6 m', in06, '| nearest', minD.toFixed(2), '| bites', P.nBite || 0, 'landed hurts', hurt, '| snaps', P.nSnap || 0, 'swipes', P.nSwipe || 0);
}

// THE ONE STILL ALIVE, SWIMMING: candidate ways (clip, rate, pitch, thrash) side by side, six frames over 1.5 s each, from a
// little in front and to one side. Rows: `__liveTry` or the defaults below.
export async function liveSwim({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  b.deepRestore(); w.__clockOn();
  const tries = w.__liveTry || JSON.parse(new URLSearchParams(location.search).get('tries') || 'null') || [
    { clip: 'run', rate: 0.85, pitch: -0.35, thr: 1 }, { clip: 'run', rate: 0.5, pitch: 0.7, thr: 0.25 },
    { clip: 'walk', rate: 0.75, pitch: 0.5, thr: 0.25 }, { clip: 'roar', rate: 0.9, pitch: -0.2, thr: 0.25 }];
  const D = b.deepS(), C = b.camera, L = b.dead.live, cv = b.renderer.domElement;
  const sw = 260, sh = 300, cols = 6;
  const sheet = document.createElement('canvas'); sheet.width = sw * cols; sheet.height = sh * tries.length; const g = sheet.getContext('2d'); g.filter = 'brightness(1.5)';
  const hold = () => { D.ph = 'silence'; D.t = 0; C.position.copy(D.descE); b.camBaseY = C.position.y; };
  tries.forEach((cfg, r) => {
    b.dead.liveCfg = cfg;
    for (let i = 0; i < 40; i++) { hold(); w.__adv(1); }
    for (let k = 0; k < cols; k++) {
      for (let i = 0; i < 15; i++) { hold(); w.__adv(1); }
      const p = L.G.position; C.position.set(p.x + 2.0, p.y + 0.4, p.z - 2.6); C.lookAt(p.x, p.y, p.z); C.updateMatrixWorld(true);
      b.renderer.render(b.scene, C);
      const W = cv.width, H = cv.height, cw = H * sw / sh;
      g.drawImage(cv, (W - cw) / 2, 0, cw, H, k * sw, r * sh, sw, sh);
    }
    log('row', r, JSON.stringify(cfg));
  });
  const d = sheet.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'live_swim', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}

// SKRIM'S HEAPS GIVE UP A BOTTLE AND THREE CRABS (2026-11-14): in the belly, every heap broken in turn; what came out of
// which (and the artifact's still its own), a still of each, then each taken; the save's account of it
export async function skqLoot({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.placeInWhale();
  const Q = b.SKQ;
  for (let i = 0; i < 300 && !Q.built; i++) { b.frame(1); await sleep(40); }
  log('built', Q.built, 'piles', Q.piles.length, 'artifact pile', Q.pick, 'loot', JSON.stringify(Q.loot));
  const C = b.camera, T = b.THREE;
  const water0 = b.waterBottleItem ? b.waterBottleItem.count : '?', crab0 = b.crabItem ? b.crabItem.count : '?';
  const order = Q.piles.slice().sort((a, c) => a.s - c.s);
  let shots = 0;
  for (const p of order) {
    const wx = b.WHALE_X + p.x, wz = b.WHALE_Z - p.s;
    C.position.set(wx + 1.6, C.position.y, wz + 1.6); b.frame(1);
    b.skqPileHit(p, 4, -1, -1); for (let i = 0; i < 20; i++) { b.frame(1); }
    const lw = Q.lootW[p.i];
    if (lw) {
      log('pile', p.i, 's', p.s.toFixed(1), '→', Q.loot[p.i], 'lies at', Q.lootAt[p.i].join(','), 'floor gap', (lw.position.y - b.skrimFloorW(lw.position.x, lw.position.z)).toFixed(3), 'visible', lw.visible);
      { lw.updateMatrixWorld(true); let nm = 0, tris = 0, hidden = 0, mats = []; lw.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') { nm++; tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; let v = true; for (let q = o; q; q = q.parent) if (!q.visible) v = false; if (!v) hidden++; mats.push((o.material.type || '') + ' op' + o.material.opacity + ' vis' + o.material.visible + ' em' + (o.material.emissiveIntensity ?? '-')); } });
        const bb = new T.Box3(); lw.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') bb.expandByObject(o); });
        const fy = b.skrimFloorW(lw.position.x, lw.position.z);
        log('   fluid over it', (-0.62 - b.whFloor(lw.position.x - b.WHALE_X, b.WHALE_Z - lw.position.z)).toFixed(3), 'm');
        { const q = lw.position, keep = C.position.clone(); C.position.set(q.x + 1.0, q.y + 1.3, q.z + 1.0); C.lookAt(q.x, q.y, q.z); C.updateMatrixWorld(true); shot('skq_each_' + p.i, 480, 1.4);
          const M = b.whaleS() && b.whaleS().arena && b.whaleS().arena.mist; if (M) { for (const m of M.layers) m.visible = false; shot('skq_nomist_' + p.i, 480, 1.4); for (const m of M.layers) m.visible = true; }
          const bx = new T.Box3().setFromObject(lw.children[0]), cc = bx.getCenter(new T.Vector3()), kf = C.fov; C.fov = 45; C.updateProjectionMatrix();
          C.position.set(cc.x + 0.9, cc.y + 0.8, cc.z + 0.9); C.lookAt(cc); C.updateMatrixWorld(true); shot('skq_close_' + p.i, 480, 1.4);
          lw.children[0].visible = false; shot('skq_closeNo_' + p.i, 480, 1.4); lw.children[0].visible = true;
          log('   relic box', bx.min.toArray().map((n) => n.toFixed(2)).join(','), '..', bx.max.toArray().map((n) => n.toFixed(2)).join(','), 'w at', lw.position.toArray().map((n) => n.toFixed(2)).join(','));
          C.fov = kf; C.updateProjectionMatrix();
          C.position.copy(keep); }
        log('   its meshes', nm, 'tris', tris, 'hidden', hidden, 'box y', bb.isEmpty() ? '-' : (bb.min.y - fy).toFixed(2) + '..' + (bb.max.y - fy).toFixed(2), 'size', bb.isEmpty() ? '-' : bb.getSize(new T.Vector3()).toArray().map((n) => n.toFixed(2)).join('x'), mats.slice(0, 2).join(' | '), 'scene child', lw.parent === b.scene); }
      if (!w['__sh' + Q.loot[p.i]]) { w['__sh' + Q.loot[p.i]] = 1; shots++; const q = lw.position; C.position.set(q.x + 1.1, q.y + 1.2, q.z + 1.1); C.lookAt(q.x, q.y, q.z); C.updateMatrixWorld(true); shot('skq_' + Q.loot[p.i] + shots, 640, 1.4); }
    } else if (p.i === Q.pick) log('pile', p.i, '→ the artifact', 'artAt', JSON.stringify(Q.artAt));
  }
  log('all broken', Q.broke.toString(2), 'loot out', Object.values(Q.lootW).filter(Boolean).length);
  log('save before taking', JSON.stringify(b.skqSave()).slice(0, 160));
  for (const k in Q.lootW) { const lw = Q.lootW[k]; if (!lw) continue; const it = b.interactables.find((e) => e.root === lw); if (it && it.onActivate) it.onActivate(); }
  log('taken: water', water0, '→', b.waterBottleItem && b.waterBottleItem.count, 'crabs', crab0, '→', b.crabItem && b.crabItem.count, 'lootTaken', Q.lootTaken.toString(2));
}

// THE WRECK, 2026-11-14: her torn floor from the sand at both tears; the gold king spoke; the key let down on its line from
// the helm, the lens following it; a chair and a bench broken
export async function shipNov14({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, S = b.shipwreck, V = b.THREE.Vector3;
  C.position.set(b.SHIP_X + 12, 1.7, b.SHIP_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !(S.userData.wheel && b.shipBrkS().length > 20); i++) { b.frame(1); await sleep(40); }
  const brk = b.shipBrkS();
  log('breakables', brk.length, 'tables/benches/chairs', brk.filter((B) => B.u.kind === 'table').length);
  w.__clockOn();
  S.updateMatrixWorld(true);
  const L = (x, y, z) => S.localToWorld(new V(x, y, z));
  const at = (n, p, t, g = 1.4) => { C.position.copy(p); C.lookAt(t); C.updateMatrixWorld(true); shot('sh_' + n, 640, g); };
  at('breach', L(-4.9, 1.0, 7.0), L(-4.9, 0.2, 3.4));
  at('breachLow', L(-6.2, 0.45, 5.4), L(-4.6, 0.15, 3.6));
  at('farTear', L(-0.8, 0.9, -6.4), L(-0.8, 0.2, -3.6));
  const wp = new V(); S.userData.wheel.getWorldPosition(wp);
  at('wheel', L(4.55, 5.7, 0.55), wp, 1.6);
  // a chair and a bench, smashed
  const tb = brk.filter((B) => B.u.kind === 'table');
  for (const B of tb.slice(2, 4)) b.smashShipStore(B, 6);
  for (let i = 0; i < 40; i++) w.__adv(1);
  log('smashed two of them, dead', tb.slice(2, 4).map((B) => B.dead).join(','), 'gibs now', b.gibs ? b.gibs.length : '?');
  // the key: you at the helm, looking up at the stars, and the last star sets
  C.position.copy(L(4.6, 5.85, 0)); b.camBaseY = C.position.y; b.lookAt(wp.x - 3, wp.y + 4, wp.z);
  for (let i = 0; i < 10; i++) w.__adv(1);
  b.dropShipKey();
  const K = () => b.shipKeyS();
  log('dropped: lowering', K().lowering, 'cut', K().cut, 'y', K().y.toFixed(2));
  let f = 0;
  for (; f < 60 * 8 && (K().cut || K().lowering); f++) {
    w.__adv(1);
    if (f === 30 || f === 90 || f === 150 || f === 230) { const kc = K().cam; if (kc) { b.renderer.render(b.scene, kc); const cv = b.renderer.domElement, c2 = document.createElement('canvas'); c2.width = 640; c2.height = Math.round(640 * cv.height / cv.width); const g2 = c2.getContext('2d'); g2.filter = 'brightness(1.6)'; g2.drawImage(cv, 0, 0, c2.width, c2.height); const d = c2.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let q = 0; q < n; q++) console.log('[PBIMG]', 'sh_key' + f, q + '/' + n, d.slice(q * 8000, (q + 1) * 8000)); } }
    if (f === 230) log('mid-cut camera from the helm (m)', C.position.distanceTo(L(4.6, 5.85, 0)).toFixed(2));
  }
  { const d = new V(); (K().cam || C).getWorldDirection(d); const kw = new V(); (w.__bw.boatKey || { getWorldPosition: () => kw }).getWorldPosition(kw); log('cut camera on the key (cos)', d.dot(kw.clone().sub((K().cam || C).position).normalize()).toFixed(3)); }
  log('back at the helm (m)', C.position.distanceTo(L(4.6, 5.85, 0)).toFixed(3), 'blackout', w.document.getElementById('blackout').style.opacity);
  log('cut over after', (f / 60).toFixed(2), 's: lowering', K().lowering, 'keyFall', K().keyFall.toFixed(2), 'y', K().y.toFixed(3), 'fov', C.fov.toFixed(1));
}

// where the ship's key, its basket and the hatch are, in her own frame
export async function shipWhere({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, S = b.shipwreck, V = b.THREE.Vector3;
  C.position.set(b.SHIP_X + 12, 1.7, b.SHIP_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !(S.userData.wheel && b.shipBrkS().length > 20); i++) { b.frame(1); await sleep(40); }
  S.updateMatrixWorld(true);
  const kp = b.boatKey.getWorldPosition(new V()), kl = S.worldToLocal(kp.clone()), cb = S.userData.catchBasket;
  log('key local', kl.toArray().map((v) => v.toFixed(2)).join(','), 'basket local', cb && [cb.x, cb.lo, cb.z].map((v) => (+v).toFixed(2)).join(','), 'ship rot y', S.rotation.y.toFixed(2), 'pos', S.position.toArray().map((v) => v.toFixed(1)).join(','));
  const wl = S.worldToLocal(S.userData.wheel.getWorldPosition(new V()));
  log('wheel local', wl.toArray().map((v) => v.toFixed(2)).join(','));
}

// THE WELL'S BUCKET AT REST: its parts' boxes in the model's own frame, and the look at it the owner sent
export async function wellBucket({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, P = b.wellPartsS(), T = b.THREE;
  C.position.set(b.WELL_X + 6, 1.7, b.WELL_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !(P.bucket && P.myRope); i++) { b.frame(1); await sleep(40); }
  const m = P.myRope.parent; m.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(m.matrixWorld).invert();
  for (const k of ['bucket', 'handle', 'bolts', 'rope', 'crank', 'myRope']) {
    const o = P[k]; if (!o) { log(k, 'none'); continue; }
    const bx = new T.Box3().setFromObject(o, true); bx.applyMatrix4(inv);
    log(k, 'min', bx.min.toArray().map((v) => v.toFixed(3)).join(','), 'max', bx.max.toArray().map((v) => v.toFixed(3)).join(','), 'visible', o.visible, 'pos.y', o.position.y.toFixed(3));
  }
  log('model scale', m.scale.toArray().map((v) => v.toFixed(3)).join(','));
  window.requestAnimationFrame = () => 0; w.requestAnimationFrame = () => 0;
  for (let o = P.myRope; o; o = o.parent) o.visible = o === P.myRope ? o.visible : true;
  const bw = new T.Vector3(); new T.Box3().setFromObject(P.bucket, true).getCenter(bw);
  { const bb = new T.Box3().setFromObject(P.bucket, true); const eyeY = b.WELL_RIM_Y + 0.40, eyeOff = 0.26 * b.WELL_S;
    log('bucket world y', bb.min.y.toFixed(3), '..', bb.max.y.toFixed(3), 'half-width', ((bb.max.x - bb.min.x) / 2).toFixed(3), '| lean eye y', eyeY.toFixed(3), 'off centre', eyeOff.toFixed(3), '| well', b.WELL_X, b.WELL_Z.toFixed(2), 'bucket centre', bw.x.toFixed(2), bw.z.toFixed(2)); }
  C.position.set(bw.x + 1.4, bw.y - 0.5, bw.z + 0.4); C.lookAt(bw); C.updateMatrixWorld(true); shot('well_bucket', 640, 1.8);
  C.position.set(bw.x + 0.2, bw.y + 0.05, bw.z + 0.75); C.lookAt(bw.x, bw.y + 0.12, bw.z); C.updateMatrixWorld(true); shot('well_bucket2', 640, 1.8);
}

// THE LEAN INTO THE WELL with the bucket where it hangs now: from each side of the well, what you see looking down the bore
export async function wellLean({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, P = b.wellPartsS();
  C.position.set(b.WELL_X + 6, 1.7, b.WELL_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !(P.bucket && P.myRope); i++) { b.frame(1); await sleep(40); }
  for (const [n, dx, dz] of [['east', 1.4, 0], ['west', -1.4, 0], ['north', 0, -1.4]]) {
    C.position.set(b.WELL_X + dx, 1.7, b.WELL_Z + dz); b.camBaseY = 1.7; b.lookAt(b.WELL_X, 1.0, b.WELL_Z);
    for (let i = 0; i < 10; i++) { b.frame(1); await sleep(5); }
    b.wellLookStart(false);
    for (let i = 0; i < 120; i++) { b.frame(1); if (i % 10 === 0) await sleep(5); }
    shot('lean_' + n, 640, 1.6);
    b.wellLeave && b.wellLeave();
    for (let i = 0; i < 120; i++) { b.frame(1); if (i % 10 === 0) await sleep(5); }
  }
}

// 2026-11-14 (later): a float cast on the snorkeler hails him; sea shells sell for a jar each
export async function nov14b({ w, b, log, sleep }) {
  b.settings.devMode = false;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera;
  C.position.set(b.SNORK_X + 12, 1.7, b.SNORK_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
  const R = b.rodState(); R.pos.set(b.SNORK_X + 1.2, 0, b.SNORK_Z + 0.8);
  b.landFloat({ wet: true, y: b.waterSurfaceAt(R.pos.x, R.pos.z) });
  log('float lands 1.4 m from him: he comes up', b.snork().want, 'talk in', b.snork().talkT.toFixed(2));
  for (let i = 0; i < 90; i++) { b.frame(1); await sleep(10); }
  log('a second and a half on: his dialog open', b.state().dialogOpen);
  b.endDialog && b.endDialog();
  // the shells
  const mk = () => ({ id: 'shell', name: 'Sea shell', use: () => {} });
  b.addToInventory(mk()); b.addToInventory(mk());
  const row = b.SELL_ROWS.find((r) => r.key === 'seashell'), j0 = b.jarsS();
  log('shells in the pack', row.count(), 'price', row.price);
  b.traderSell('seashell');
  log('sold one: jars', j0, '→', b.jarsS(), 'shells left', row.count());
  b.traderSell('seashell');
  log('sold two: jars', b.jarsS(), 'shells left', row.count());
}

// THE BUNKER'S SURFACES UNDER THE BLADE (2026-11-14): what a swing at each wall really meets (a raycast on the model:
// its material) and what it costs, from the middle of the room in twelve directions, level and a little down
export async function bunkerHit({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.placeInBunker();
  for (let i = 0; i < 300; i++) { const ib = b.state().inBunker; b.frame(1); await sleep(40); const B = b.bunkerG && b.bunkerG(); if (B && B.userData.bunker && B.userData.bunker.ready) break; }
  const g = b.bunkerG(), T = b.THREE, C = b.camera;
  let meshes = 0, tris = 0; const per = {};
  g.traverse((o) => { if (!o.isMesh) return; meshes++; const n = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; tris += n; const mn = [].concat(o.material).map((m) => m.name).join('/'); per[mn] = (per[mn] || 0) + n; });
  log('bunker meshes', meshes, 'tris', Math.round(tris), JSON.stringify(Object.fromEntries(Object.entries(per).map(([k, v]) => [k, Math.round(v)]))));
  const rc = new T.Raycaster(); rc.far = 3.2;
  for (const pitch of [0, -0.35]) for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, d = new T.Vector3(Math.sin(a) * Math.cos(pitch), Math.sin(pitch), Math.cos(a) * Math.cos(pitch));
    rc.set(C.position, d);
    const t0 = performance.now(), h = rc.intersectObject(g, true)[0], ms = performance.now() - t0;
    log('pitch', pitch, 'dir', k, h ? [].concat(h.object.material)[h.face && h.face.materialIndex || 0].name + ' @' + h.distance.toFixed(2) : 'nothing', ms.toFixed(1) + 'ms');
  }
}

// A REAL SWING AT THE MERCHANT: the shovel in hand, the swing started the game's way, and the view model and the swing's
// clock frame by frame through his line (where the weapon is, what is open)
export async function traderSwing({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, W = b.traderWorld, T = b.THREE; W.updateMatrixWorld(true); const tp = new T.Vector3(); W.getWorldPosition(tp);
  if (b.state().equipped !== 'Sand shovel') b.toggleEquip(b.shovelItem);
  w.__clockOn();
  const face = () => { C.position.set(tp.x - 1.5, 1.7, tp.z); b.camBaseY = 1.7; b.lookAt(tp.x, 1.2, tp.z); };
  for (let i = 0; i < 30; i++) { face(); w.__adv(1); }
  const vm = b.viewmodel || (b.armRig);
  b.startDig(0);
  for (let f = 0; f < 120; f++) {
    w.__adv(1);
    if (f % 6 === 0 || f < 30 && f % 2 === 0) {
      const v = vm ? vm.position : { x: 0, y: 0, z: 0 };
      log('f', f, 'dig', b.state().digT, 'dialog', b.state().dialogOpen, 'rage', b.TRADER_RAGE.n, 'vm', [v.x, v.y, v.z].map((q) => (+q).toFixed(2)).join(','), 'vm vis', vm && vm.visible, 'fov', C.fov.toFixed(0));
    }
  }
}

// THE MERCHANT'S ARM THROUGH THE DRAW: at each stage of it, how near his right elbow, forearm and hand come to his
// spine's line (the body they must not pass through), and the bones the hand has
export async function traderArm({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 200 && !(b.traderBonesS() && b.traderBonesS().upper_armR); i++) { b.frame(1); await sleep(40); }
  const B = b.traderBonesS(), T = b.THREE, C = b.camera, W = b.traderWorld;
  log('bones', Object.keys(B).join(' '));
  W.updateMatrixWorld(true); const tp = new T.Vector3(); W.getWorldPosition(tp);
  C.position.set(tp.x - 2.6, 1.7, tp.z); C.lookAt(tp.x, 1.3, tp.z); C.updateMatrixWorld(true);
  b.TRADER_RAGE.which = 1; b.TRADER_RAGE.arm0 = null;
  const P = (o) => o.getWorldPosition(new T.Vector3());
  const seg = (p, a, c) => { const d = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(d) / d.lengthSq())); return p.distanceTo(a.clone().addScaledVector(d, t)); };
  for (const k of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
    b.traderArmAim(k, 0);
    const s0 = P(B.spine), s4 = P(B.spine004 || B.spine003), el = P(B.forearmR), ha = P(B.handR), mid = el.clone().lerp(ha, 0.5);
    log('k', k, 'elbow', seg(el, s0, s4).toFixed(3), 'forearm mid', seg(mid, s0, s4).toFixed(3), 'hand', seg(ha, s0, s4).toFixed(3), 'shoulder', seg(P(B.upper_armR), s0, s4).toFixed(3));
  }
}

// THE DROWNING AND THE RESCUE (2026-11-14): from the snap's checkpoint, the fight skipped to its end; the drowning frame
// by frame (the veil, his face), the black, the wash, standing, his line, the throw, where it lands
export async function deepRescue({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true; b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  b.deepRestore(); w.__clockOn();
  for (let i = 0; i < 60; i++) w.__adv(1);
  const D = b.deepS(), C = b.camera, veil = () => { const v = [...w.document.querySelectorAll('div')].find((d) => d.style.zIndex === '10' && d.style.position === 'fixed'); return v ? (+v.style.opacity).toFixed(2) : '?'; };
  D.ph = 'after'; D.t = 4.05;
  { const row = []; for (let t = 0; t <= 10.4; t += 0.4) row.push(t.toFixed(1) + ':' + b.drownLid(t).toFixed(2)); log('lids through the drowning', row.join(' ')); }
  { const row = []; for (let t = 0; t <= 4; t += 0.25) row.push(t.toFixed(2) + ':' + b.washLid(t).toFixed(2)); log('lids waking', row.join(' ')); }
  // a still with the lids drawn over it as the page draws them (the canvas alone has no lids)
  w.__lidShot = (name, lid) => { const cv = b.renderer.domElement, c2 = document.createElement('canvas'); c2.width = 640; c2.height = Math.round(640 * cv.height / cv.width);
    const g = c2.getContext('2d'); g.filter = (cv.style.filter || 'none') + ' brightness(1.5)'; g.drawImage(cv, 0, 0, c2.width, c2.height); g.filter = 'blur(14px)';   // (the game's own filter on the canvas, 2026-11-15)
    const h = lid * 0.62 * c2.height; g.fillStyle = '#020304'; g.beginPath(); g.ellipse(c2.width / 2, 0, c2.width * 0.7, h + 6, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(c2.width / 2, c2.height, c2.width * 0.7, h + 6, 0, 0, Math.PI * 2); g.fill();
    const d = c2.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let q = 0; q < n; q++) console.log('[PBIMG]', name, q + '/' + n, d.slice(q * 8000, (q + 1) * 8000)); };
  const at = [8.7, 8.95, 9.2, 9.45, 9.65]; let k = 0;   // (the glimpse; 2.5 and 6.4 until 2026-11-15)
  for (let f = 0; f < 60 * 14 && D.ph !== 'black'; f++) {
    w.__adv(1);
    if (D.ph === 'drown' && k < at.length && D.t >= at[k]) { const F = b.deepFaceS(); log('drown t', D.t.toFixed(2), 'veil', veil(), 'lid', b.drownLid(D.t).toFixed(2), 'face', F ? (F.visible ? F.material.opacity.toFixed(2) : 'hidden') : 'none'); b.renderer.render(b.scene, C); w.__lidShot('rs_drown' + k, b.drownLid(D.t)); k++; }
  }
  log('black at', D.ph);
  let f = 0, dlg = false;
  for (; f < 60 * 30; f++) {
    w.__adv(1); if (f % 8 === 0) await sleep(2);
    const G = b.seaGiftS();
    if (!D.ph && G && G.ph === 'talk' && b.state().dialogOpen && !dlg) { dlg = true; log('his card up', (f / 60).toFixed(1), 's after the black; text', w.document.getElementById('dialog-text') ? w.document.getElementById('dialog-text').textContent : '?'); for (let i = 0; i < 40; i++) w.__adv(1); shot('rs_talk', 640, 1.4); await sleep(2600); w.__adv(2); }
    if (G && G.ph === 'windup' && G.t > 0.5 && !w.__wu) { w.__wu = 1; shot('rs_windup', 640, 1.4); }
    if (G && G.ph === 'throw' && G.t > 0.55 && !w.__thr) { w.__thr = 1; shot('rs_throw', 640, 1.4); log('mid-throw: cut', b.shipKeyS ? '' : '', 'fov', C.fov.toFixed(0)); }
    if (G && G.ph === 'wait' && G.t > 0.6 && !w.__ld) { w.__ld = 1; shot('rs_landed', 640, 1.4); }
    if (dlg && !G) break;
  }
  const S = b.seaS();
  log('done: gift over', !b.seaGiftS(), 'artifact', JSON.stringify(S), 'from you', S.spot ? Math.hypot(S.spot[0] - C.position.x, S.spot[1] - C.position.z).toFixed(2) : '-');
  shot('rs_lying', 640, 1.4);
}

// the sewer's lair (2026-11-14): the door open, looked at from the doorway and round the room; and the lamps by levers down
export async function sewLair({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  log('sewer ready', b.sewS().ready);
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  const view = async (name, lx, lz, yaw, pitch, n = 20, gain = 1) => { b.sewSet(lx, lz, yaw, pitch); for (let i = 0; i < n; i++) { b.sewSet(lx, lz, yaw, pitch); b.frame(1); await sleep(5); } b.sewSet(lx, lz, yaw, pitch); shot(name, 800, gain); };
  // the lamps: none down, two down, all four down, the generator off
  for (const [lv, nm] of [[0, 'lv0'], [3, 'lv2'], [15, 'lv4']]) {
    b.sewRestore({ lv }); b.placeInSewer();
    for (let i = 0; i < 30; i++) b.frame(1);
    await view('sw_' + nm, 0.6, 1.2, 0, -0.05, 40, 1.4);
    await view('sw_' + nm + 'b', 2.4, -16, 0.35, -0.05, 20, 1.4);
    const P = b.sewG().P; log(nm, 'lit', P.emerg.filter((l) => l.want).length, '/', P.emerg.length);
  }
  // a pull, live: the far side wakes a lamp at a time
  b.sewRestore({ lv: 0 }); b.placeInSewer(); for (let i = 0; i < 10; i++) b.frame(1);
  b.sewPullLeverNow && b.sewPullLeverNow(0);
  const P = b.sewG().P, seq = [];
  for (let i = 0; i < 240; i++) { b.frame(1); if (i % 30 === 0) seq.push(P.emerg.filter((l) => l.want).length); }
  log('after one pull, lit over 4 s:', seq.join(','));
  // the lair, its door open
  b.sewRestore({ lv: 15, d2: 1, kt: 1 }); b.placeInSewer();
  for (let i = 0; i < 30; i++) b.frame(1);
  await view('lair_door', 12.6, -31.7, 0, -0.12, 30, 1.0);
  await view('lair_doorB', 12.6, -31.7, 0, -0.12, 2, 1.8);
  await view('lair_bed', 13.4, -33.4, 0.75, -0.3, 10, 1.6);
  await view('lair_hung', 12.2, -35.9, -2.35, 0.05, 10, 1.6);
  await view('lair_east', 12.0, -35.2, -1.5707, -0.1, 10, 1.6);
  await view('lair_west', 14.6, -35.6, 1.5707, -0.15, 10, 1.6);
  await view('lair_south', 13.0, -33.0, 0.0, -0.25, 10, 1.6);
  b.settings.devMode = false;
}

// the lair's dead and its walls, close, with a work light and a narrower lens (2026-11-14)
export async function sewLairClose({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15, d2: 1, kt: 1 }); b.placeInSewer(); for (let i = 0; i < 30; i++) b.frame(1);
  const T = b.THREE, C = b.camera, X = b.sewG().SEW_X, Y = b.sewG().SEW_Y, Z = b.sewG().SEW_Z, F = -0.7;
  const amb = new T.AmbientLight(0xffffff, 1.6);
  const look = async (name, from, at, lit, gain = 1.2) => {
    if (lit) b.scene.add(amb); else b.scene.remove(amb);
    for (let i = 0; i < 6; i++) { b.sewSet(from[0], from[2], 0, 0); b.frame(1); }
    C.position.set(X + from[0], Y + from[1], Z + from[2]); C.lookAt(X + at[0], Y + at[1], Z + at[2]); C.fov = 60; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
    shot(name, 800, gain);
  };
  for (let i = 0; i < 400 && !(b.sewG().P.remains); i++) { b.frame(1); await sleep(30); }   // (the bones' files)
  for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
  await look('lc_sit', [11.5, F + 1.3, -33.4], [10.4, F + 0.4, -33.85], true);
  await look('lc_sit2', [10.9, F + 0.5, -34.9], [10.4, F + 0.3, -33.85], true);
  await look('lc_heap', [13.0, F + 1.2, -34.2], [14.35, F + 0.15, -35.3], true);
  await look('lc_heap2', [14.4, F + 0.45, -33.4], [14.35, F + 0.15, -35.3], true);
  await look('lc_lie', [13.3, F + 1.1, -34.6], [12.45, F + 0.15, -35.55], true);
  await look('lc_bed', [12.6, F + 1.2, -35.0], [11.1, F + 0.1, -36.6], true);
  await look('lc_room', [12.6, F + 1.65, -32.4], [12.8, F + 0.4, -35.5], false, 1.5);
  await look('lc_room2', [15.3, F + 1.65, -37.2], [11.5, F + 0.6, -33.2], false, 1.5);
  await look('lc_room3', [11.0, F + 1.65, -33.0], [14.0, F + 0.3, -36.0], false, 1.5);
  C.fov = 105; C.updateProjectionMatrix();
  b.settings.devMode = false;
}

// the dead thing's back: the key's shine and its column, from the walk (2026-11-14)
export async function sewBackKey({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15 }); b.placeInSewer(); for (let i = 0; i < 30; i++) b.frame(1);
  b.sewSet(1.8, -20, 0, 0); for (let i = 0; i < 30; i++) b.frame(1);
  b.sewElectrocute();
  for (let i = 0; i < 2400 && !((b.sewMon().deadT || 0) > 8); i++) { b.frame(1); if (i % 20 === 0) await sleep(1); }
  const m = b.sewMon(), P = b.sewG().P, T = b.THREE, kp = new T.Vector3(); P.backKey.getWorldPosition(kp);
  log('dead', b.sewLampS().dead, 'key visible', P.backKey.visible, 'at', kp.toArray().map((v) => +v.toFixed(2)).join(','), 'deadT', m.deadT && m.deadT.toFixed(1));
  const X = b.sewG().SEW_X, Y = b.sewG().SEW_Y, Z = b.sewG().SEW_Z, lx = kp.x - X, lz = kp.z - Z;
  { const k = P.backKey; k.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(k); let meshes = 0, vis = true, spr = 0; k.traverse((o) => { if (o.isMesh) meshes++; if (o.isSprite) spr = Math.max(spr, o.material.opacity); }); for (let o = k; o; o = o.parent) if (!o.visible) vis = false;
    const mb = new T.Box3().setFromObject(b.sewMon().g);
    log('key bbox y', (bb.min.y - Y).toFixed(2), (bb.max.y - Y).toFixed(2), 'size', bb.getSize(new T.Vector3()).toArray().map((v) => v.toFixed(2)).join(','), 'meshes', meshes, 'vis', vis, 'glint', spr.toFixed(2), '| monster y', (mb.min.y - Y).toFixed(2), (mb.max.y - Y).toFixed(2)); }
  const side = lx > 0 ? 1.85 : -1.85;
  const C = b.camera;
  { const k = P.backKey, M = b.sewMon(); log('backKeySet', P.backKeySet, 'k local', k.position.toArray().map((v) => v.toFixed(2)).join(','), 'parent', k.parent && k.parent.name, 'body scale', M.body.scale.x.toFixed(2));
    const rc = new T.Raycaster(new T.Vector3(kp.x, kp.y + 2.5, kp.z), new T.Vector3(0, -1, 0), 0, 5);
    let km = []; k.traverse((o) => { if (o.isMesh) { const bb = new T.Box3().setFromObject(o); km.push((o.name || o.geometry.type) + ' ' + (bb.min.y - Y).toFixed(2) + '..' + (bb.max.y - Y).toFixed(2) + ' v' + o.visible + ' op' + (o.material.opacity ?? 1)); } });
    log('key meshes', km.join(' | ')); }
  { const amb = new T.AmbientLight(0xffffff, 1.6); b.scene.add(amb); C.position.set(kp.x + 0.55, kp.y + 0.45, kp.z + 0.5); C.lookAt(kp); C.fov = 60; C.updateProjectionMatrix(); C.updateMatrixWorld(true); shot('bk_close', 800, 1.0); b.scene.remove(amb); }
  for (const [nm, dz, gain] of [['bk_near', 2.0, 1.0], ['bk_far', 5.5, 1.0], ['bk_near_lit', 2.0, 1.0]]) {
    const lit = nm.endsWith('lit'); const amb = new T.AmbientLight(0xffffff, 1.4); if (lit) b.scene.add(amb);
    b.sewSet(side, lz + dz, 0, 0); b.frame(1);
    C.position.set(X + side, Y - 0.7 + 1.62, Z + lz + dz); C.lookAt(kp); C.fov = 70; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
    shot(nm, 800, gain); if (lit) b.scene.remove(amb);
  }
  C.fov = 105; C.updateProjectionMatrix();
  b.settings.devMode = false;
}

// the bone mace's swings frame by frame beside the military shovel's (2026-11-14): contact sheets of the game's own frame
export async function maceFrames({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera;
  w.__clockOn();
  const sheet = (name, tiles, cols = 6, tw = 300) => {
    const th = Math.round(tw * tiles[0].height / tiles[0].width), rows = Math.ceil(tiles.length / cols);
    const c = w.document.createElement('canvas'); c.width = cols * tw; c.height = rows * th; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.font = '14px monospace';
    tiles.forEach((t, i) => { g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th, tw, th); g.fillText(t.lab, (i % cols) * tw + 4, ((i / cols) | 0) * th + 16); });
    const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  };
  const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); c.lab = lab; return c; };
  const place = () => { C.position.set(4, 1.7, -30); b.camBaseY = 1.7; b.look(0, -0.05); };
  const run = async (item, nm) => {
    if (!b.state().inventory || true) { try { b.addToInventory(item); } catch (e) {} }
    if (b.equippedS() !== item) b.toggleEquip(item);
    for (let i = 0; i < 90; i++) { place(); w.__adv(1); }
    // a light cut, every 3rd frame
    let tiles = []; b.attackAction();
    for (let f = 0; f < 66; f++) { place(); w.__adv(1); if (f % 3 === 0) tiles.push(grab('L' + f)); }
    sheet(nm + '_light', tiles);
    for (let i = 0; i < 60; i++) { place(); w.__adv(1); }
    // the second cut of the combo
    tiles = []; b.attackAction(); for (let f = 0; f < 6; f++) { place(); w.__adv(1); } b.attackAction();
    for (let f = 0; f < 66; f++) { place(); w.__adv(1); if (f % 3 === 0) tiles.push(grab('C' + f)); }
    sheet(nm + '_combo', tiles);
    for (let i = 0; i < 60; i++) { place(); w.__adv(1); }
    // a heavy: held 1.1 s, then let go
    tiles = []; log(nm, 'wind', b.startWind());
    for (let f = 0; f < 66; f++) { place(); w.__adv(1); if (f % 6 === 0) tiles.push(grab('W' + f)); }
    b.releaseWind();
    var T = b.THREE, A = b.armRig, M = item.gripModel, cam = b.vmCamera;
    var P = (y) => { if (!M) return '-'; const v = new T.Vector3(0, y, 0); M.localToWorld(v); const c = v.clone().project(cam); return c.x.toFixed(2) + ',' + c.y.toFixed(2); };
    for (let f = 0; f < 72; f++) { place(); w.__adv(1); if (f % 3 === 0) tiles.push(grab('H' + f)); if (f % 6 === 0) log(nm, 'H' + f, 'rot', A.rotation.x.toFixed(2), A.rotation.y.toFixed(2), A.rotation.z.toFixed(2), 'pos', A.position.x.toFixed(2), A.position.y.toFixed(2), A.position.z.toFixed(2), 'head', P(-0.21), 'cord', P(0.84), 'mount', M ? M.position.y.toFixed(2) : '-'); }
    sheet(nm + '_heavy', tiles);
    for (let i = 0; i < 60; i++) { place(); w.__adv(1); }
    // the Shift slam: held to full (3 s), then let go
    const kd = (down) => w.dispatchEvent(new w.KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'ShiftLeft', key: 'Shift', bubbles: true }));
    tiles = []; kd(true); log(nm, 'slam wind', b.startWind());
    for (let f = 0; f < 192; f++) { place(); w.__adv(1); if (f % 16 === 0) tiles.push(grab('S' + f)); }
    log(nm, 'slam overhead', b.windOverhead);
    b.releaseWind(); kd(false);
    for (let f = 0; f < 90; f++) { place(); w.__adv(1); if (f % 3 === 0) tiles.push(grab('R' + f)); if (f % 9 === 0) log(nm, 'R' + f, 'head', P(-0.21), 'cord', P(0.84), 'dip', (b.state().slamDip ?? '').toString()); }
    sheet(nm + '_slam', tiles);
    for (let i = 0; i < 60; i++) { place(); w.__adv(1); }
  };
  if (new URLSearchParams(w.parent.location.search).get('mil')) await run(b.militaryItem, 'mil');
  await run(b.maceItem, 'mace');
  b.settings.devMode = false;
}

// where the mace's two ends land on the screen for a sweep of arm pitches/yaws (2026-11-14): the pose signs, measured
export async function maceAxes({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  b.addToInventory(b.maceItem); b.toggleEquip(b.maceItem);
  for (let i = 0; i < 90; i++) w.__adv(1);
  const T = b.THREE, A = b.armRig, M = b.maceItem.gripModel, cam = b.vmCamera;
  const base = A.rotation.clone(), bp = A.position.clone();
  const bb = new T.Box3(); M.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(M.matrixWorld).invert();
  M.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); const g = o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)); bb.union(g); } });
  log('mace local y', bb.min.y.toFixed(2), bb.max.y.toFixed(2), '(+y is the cord end)');
  const P = (y) => { const v = new T.Vector3(0, y, 0); M.localToWorld(v); const c = v.clone().project(cam); return c.x.toFixed(2) + ',' + c.y.toFixed(2) + ' z' + v.applyMatrix4(cam.matrixWorldInverse).z.toFixed(2); };
  const Q = (y) => { const v = new T.Vector3(0, y, 0); M.localToWorld(v); return v.project(cam); };
  for (const px of [-0.9, -1.2]) for (const yw of [-0.4, 0, 0.4, 0.8, 1.2]) { let row = 'p' + px + ' y' + yw + ':'; for (const rl of [-0.6, -0.3, 0, 0.3, 0.6]) {
    A.rotation.set(base.x + px, base.y + yw, base.z + rl); A.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const h = Q(bb.min.y), c = Q(bb.max.y); row += ' r' + rl + '(' + (c.x - h.x).toFixed(2) + ',' + (c.y - h.y).toFixed(2) + ')';
  } log(row); }
  A.rotation.copy(base);
}

// the lair's scare on the way in, and its air (2026-11-15)
export async function lairScare({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15, d2: 1, kt: 1 }); b.placeInSewer(); for (let i = 0; i < 30; i++) b.frame(1);
  for (let i = 0; i < 300 && !(b.sewG().P.remains); i++) { b.frame(1); await sleep(30); }
  const P = b.sewG().P;
  // walk in from the passage
  b.sewSet(12.6, -31.6, 0, -0.15); for (let i = 0; i < 10; i++) b.frame(1);
  log('before: scare', !!P.scare);
  b.sewSet(12.6, -32.1, 0, -0.15); b.frame(1);
  log('at the threshold: scare', !!P.scare);
  const cam = () => b.sewSet(12.6, -32.1, 0.25, -0.32);
  for (const tt of [0.3, 0.5, 0.7, 0.9, 1.1, 1.3]) { if (!P.scare) break; P.scare.t = tt; cam(); b.frame(1); const r = P.scare && P.scare.rat; if (tt === 0.7 && r) { const T = b.THREE, C = b.camera, amb = new T.AmbientLight(0xffffff, 1.4); b.scene.add(amb); const wp = r.getWorldPosition(new T.Vector3()); C.position.set(wp.x + 0.5, wp.y + 0.35, wp.z + 0.45); C.lookAt(wp); C.fov = 50; C.updateProjectionMatrix(); C.updateMatrixWorld(true); shot('ls_rat', 800, 1.2); b.scene.remove(amb); C.fov = 105; C.updateProjectionMatrix(); } log('t', tt, 'rat', r ? r.visible + ' ' + r.position.x.toFixed(2) + ',' + r.position.y.toFixed(3) + ',' + r.position.z.toFixed(2) : '-'); shot('ls_' + Math.round(tt * 10), 800, 1.6); }
  for (let f = 0; f < 150; f++) b.frame(1);
  log('after: scare', !!P.scare, 'burst', P.flyBurst);
  b.sewSet(12.6, -31.6, 0, 0); b.frame(1); b.sewSet(12.6, -32.1, 0, 0); for (let f = 0; f < 20; f++) b.frame(1);
  log('second time in: scare', !!P.scare);
  // the rat itself, close, under a work light
  { const r = b.sewG().P.scare ? null : null; }
  b.settings.devMode = false;
}

// the keychain, frame by frame: five keys, a step right, a step left, a wrap past the end (2026-11-15)
export async function kcFrames({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 200 && !(b.kcG && b.bootLeft().parsing === 0); i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  const ks = [b.sewKeyItem, b.cellKeyItem, b.skullKeyItem, b.boatKeyItem, b.pavKeyItem, b.storeKeyItem].filter(Boolean);
  for (const k of ks) b.addToInventory(k);
  b.openPack(); await sleep(400);
  const K = b.kcG(); log('keys', K.items.length, K.items.map((i) => i.name).join(' | '), 'ring', !!K.ringModel);
  const cv = K.r.domElement; K.r.setSize(960, 600, false); K.cam.aspect = 960 / 600; K.cam.updateProjectionMatrix();
  let t = performance.now();
  const adv = (n) => { for (let i = 0; i < n; i++) { t += 16.7; b.kcFrame(t); } };
  const tiles = [];
  const grab = (lab) => { const c = w.document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 320, 200); g.imageSmoothingQuality = 'high'; g.drawImage(cv, cv.width * 0.36, cv.height * 0.02, cv.width * 0.28, cv.height * 0.58, 0, 0, 320, 200 * 0.58 / 0.28 * (cv.width / cv.height) * (200 / 320) > 200 ? 200 : 200); g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(lab, 4, 14); tiles.push(c); };
  adv(120); grab('rest');
  // the hand moved (the cursor across the pack) and let go: the ring swings, the keys hang plumb and swing after it
  const full = []; const grabF = (lab) => { const c2 = w.document.createElement('canvas'); c2.width = 320; c2.height = 200; const g2 = c2.getContext('2d'); g2.drawImage(cv, 0, 0, 320, 200); g2.fillStyle = '#fff'; g2.font = '12px monospace'; g2.fillText(lab, 4, 14); full.push(c2); };
  K.mx = 1; for (let f = 0; f < 36; f += 3) { adv(3); grab('M' + f); if (f % 6 === 0) grabF('M' + f); log('m f', f, 'aR', K.aR.toFixed(3), 'hx', K.hx.toFixed(3), 'th0', K.keys[0].th.toFixed(3)); }
  K.mx = 0; for (let f = 0; f < 60; f += 6) { adv(6); grab('B' + f); grabF('B' + f); log('b f', f, 'aR', K.aR.toFixed(3), 'th0', K.keys[0].th.toFixed(3)); }
  for (const [d, lab] of [[1, 'R'], [-1, 'L'], [-1, 'W']]) { b.kcStep(d); for (let f = 0; f < 42; f += 3) { adv(3); grab(lab + f); } adv(60); grab(lab + ' settled'); }
  const cols = 6, rows = Math.ceil(tiles.length / cols), c = w.document.createElement('canvas'); c.width = cols * 320; c.height = rows * 200;
  const g = c.getContext('2d'); tiles.forEach((tl, i) => g.drawImage(tl, (i % cols) * 320, ((i / cols) | 0) * 200));
  { const cc = w.document.createElement('canvas'); cc.width = 6 * 320; cc.height = Math.ceil(full.length / 6) * 200; const gg = cc.getContext('2d'); full.forEach((tl, i) => gg.drawImage(tl, (i % 6) * 320, ((i / 6) | 0) * 200));
    const dd = cc.toDataURL('image/jpeg', 0.82).split(',')[1], nn = Math.ceil(dd.length / 8000); for (let i = 0; i < nn; i++) console.log('[PBIMG]', 'kc_full', i + '/' + nn, dd.slice(i * 8000, (i + 1) * 8000)); }
  const d = c.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'kc_frames', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  // a close look at the hang, settled
  adv(240); K.r.setSize(1200, 700, false); const cam = K.cam.clone(); cam.aspect = 1200 / 700; cam.position.set(0.0, -0.10, 0.30); cam.lookAt(0, -0.10, 0); cam.updateProjectionMatrix(); K.r.render(K.sc, cam);
  const d2 = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n2 = Math.ceil(d2.length / 8000);
  for (let i = 0; i < n2; i++) console.log('[PBIMG]', 'kc_close', i + '/' + n2, d2.slice(i * 8000, (i + 1) * 8000));
  log('thick', K.keys.map((k) => k.thick.toFixed(4) + '/' + (k.beta || 0).toFixed(2)).join(' '));
  // the same, from the side and from three-quarters above: are they clear of each other and the wire?
  const shots = [['kc_side', [0.30, -0.08, 0.02]], ['kc_3q', [0.20, 0.06, 0.22]], ['kc_3qL', [-0.20, -0.02, 0.22]], ['kc_top', [0.0, 0.25, 0.012]], ['kc_under', [0.0, -0.40, 0.012]]];
  for (const [nm, pp] of shots) { cam.position.set(...pp); cam.lookAt(0, -0.10, 0); K.r.render(K.sc, cam);
    const d3 = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n3 = Math.ceil(d3.length / 8000); for (let i = 0; i < n3; i++) console.log('[PBIMG]', nm, i + '/' + n3, d3.slice(i * 8000, (i + 1) * 8000)); }
  // and one turned half a step (a key on its way up and over), from the front and three-quarters
  b.kcStep(1); for (let i = 0; i < 9; i++) { t += 16.7; b.kcFrame(t); } K.r.setSize(1200, 700, false);
  for (const [nm, pp] of [['kc_turnF', [0.0, -0.06, 0.30]], ['kc_turn3q', [0.22, 0.04, 0.22]]]) { cam.position.set(...pp); cam.lookAt(0, -0.06, 0); K.r.render(K.sc, cam);
    const d3 = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n3 = Math.ceil(d3.length / 8000); for (let i = 0; i < n3; i++) console.log('[PBIMG]', nm, i + '/' + n3, d3.slice(i * 8000, (i + 1) * 8000)); }
}

// walking the lair by the keys: in through the door, round the heap and the dead, to the nest and out (2026-11-15)
export async function lairWalk({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  w.eval(await (await fetch('/tools/sewer.js?' + Date.now())).text().then((t) => t.replace(/^const b = window.__bw;/m, 'var b = window.__bw;')));
  b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15, d2: 1, kt: 1, ls: 1 }); b.placeInSewer(); for (let i = 0; i < 30; i++) b.frame(1);
  b.sewSet(12.6, -27.5, 0, 0); for (let i = 0; i < 10; i++) b.frame(1);
  const r = await w.__sw.route([[12.6, -30.2], [12.6, -32.8], [13.0, -34.0], [12.9, -36.5], [11.9, -36.8], [11.1, -36.4], [10.8, -35.0], [11.2, -33.2], [15.2, -33.2], [15.2, -36.8], [14.0, -37.0], [12.6, -33.0], [12.6, -29.6]], { maxSec: 12 });
  for (const q of r) log(JSON.stringify(q));
  // into the heap and the sitting one: you should be stopped short of them
  const r2 = await w.__sw.route([[13.0, -35.3], [14.35, -35.3]], { maxSec: 5 });
  log('into the heap:', JSON.stringify(r2[1]));
  b.settings.devMode = false;
}

// the mace against bodies: a full Shift slam on a red mutant (hp 13) with a dark one (hp 8) beside it, then a light and a heavy
export async function maceFight({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  b.addToInventory(b.maceItem); b.toggleEquip(b.maceItem); w.__adv(60);
  const C = b.camera, kd = (down) => w.dispatchEvent(new w.KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'ShiftLeft', key: 'Shift', bubbles: true }));
  const trial = async (label, how, kinds) => {
    C.position.set(4, 1.7, -40); b.camBaseY = 1.7; b.look(0, -0.12);
    const us = kinds.map(([k, dx, dz]) => b.mutSpawnTest(4 + dx, -40 + dz, k));
    w.__adv(2);
    for (const u of us) { u.st.awake = false; }
    const hp0 = us.map((u) => u.st.hp);
    const aim = () => { C.position.set(4, 1.7, -40); b.camBaseY = 1.7; b.lookAt(us[0].g.position.x, 1.0, us[0].g.position.z); };
    aim();
    if (how === 'slam') { kd(true); b.startWind(); for (let f = 0; f < 190; f++) { aim(); w.__adv(1); } b.releaseWind(); kd(false); }
    else if (how === 'heavy') { b.startWind(); for (let f = 0; f < 80; f++) { aim(); w.__adv(1); } b.releaseWind(); }
    else b.attackAction();
    let mid = ''; for (let f = 0; f < 50; f++) { aim(); w.__adv(1); if ((f === 16 || f === 22 || f === 28) && label === 'slam') shot('mf_slam_' + f, 800, 1.4); if (f === 30) mid = us.map((u) => Math.max(0, u.st.hp).toFixed(1) + (u.st.alive ? '' : '✝')).join(','); }
    log(label, 'just after the blow:', mid);
    log(label, kinds.map(([k], i) => `${k} ${hp0[i]}→${Math.max(0, us[i].st.hp).toFixed(1)}${us[i].st.alive ? '' : ' DEAD'}`).join(' | '));
    for (const u of us) { u.g.visible = false; u.st.alive = false; }
    w.__adv(30);
  };
  await trial('slam', 'slam', [['red', 0, -2.0], ['dark', 1.6, -2.4], ['dark', 0, -6]]);
  await trial('light', 'light', [['red', 0, -1.8]]);
  await trial('heavy', 'heavy', [['red', 0, -1.8]]);
  b.settings.devMode = false;
}

// the kick and the big electrocution, frame by frame, in the game's own frames (hands' scene and all) (2026-11-15)
export async function sewKickShock({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15, ll: 1 }); b.placeInSewer(); for (let i = 0; i < 20; i++) b.frame(1);
  w.__clockOn();
  const grab = (lab, gain = 1.3) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = `brightness(${gain})`; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(lab, 4, 15); return c; };
  const sheet = (name, tiles, cols = 5) => {
    const tw = tiles[0].width, th = tiles[0].height, rows = Math.ceil(tiles.length / cols), c = w.document.createElement('canvas'); c.width = cols * tw; c.height = rows * th;
    const g = c.getContext('2d'); tiles.forEach((t, i) => g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th));
    const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  };
  const LP = b.sewG().P.fallLamp.hold.position.clone(); log('lamp at', LP.x.toFixed(2), LP.y.toFixed(2), LP.z.toFixed(2));
  const ex = LP.x - 1.7, ez = -30.15, ey = -0.7 + 1.62;
  const yaw0 = Math.atan2(-(LP.x - ex), -(LP.z + 0.35 - ez)), pit0 = Math.atan2(LP.y - ey, Math.hypot(LP.x - ex, LP.z + 0.35 - ez));
  const at = () => b.sewSet(ex, ez, yaw0, pit0);
  for (let i = 0; i < 30; i++) { at(); w.__adv(1); }
  let tiles = [];
  const work = new b.THREE.AmbientLight(0xffffff, 1.3); b.scene.add(work);
  b.sewKickLamp();
  for (let f = 0; f < 110; f++) { at(); w.__adv(1); if (f % 3 === 0 && f >= 6 && f < 81) tiles.push(grab('k' + f, 1.0)); }
  b.scene.remove(work);
  sheet('kick', tiles);
  // and the lamp alone, close, from the side, under a work light: the throw, the splash, the bob
  { b.sewRestore({ lv: 15, ll: 1 }); b.placeInSewer(); for (let i = 0; i < 6; i++) w.__adv(1);
    const tx = 15.9, ty = -0.95, tz = -29.25, cx = 17.6, cz = -30.6, ey2 = -0.7 + 1.62;
    const yw = Math.atan2(-(tx - cx), -(tz - cz)), pt = Math.atan2(ty - ey2, Math.hypot(tx - cx, tz - cz));
    const side = () => b.sewSet(cx, cz, yw, pt);
    const work = new b.THREE.AmbientLight(0xffffff, 1.6); b.scene.add(work);
    { const H = b.sewG().P.fallLamp.hold, T = b.THREE; H.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(H); const X = b.sewG().SEW_X, Z = b.sewG().SEW_Z, Y = b.sewG().SEW_Y;
      let vis = true; for (let o = H; o; o = o.parent) if (!o.visible) vis = false;
      log('lamp bbox local', (bb.min.x - X).toFixed(2), (bb.min.y - Y).toFixed(2), (bb.min.z - Z).toFixed(2), '→', (bb.max.x - X).toFixed(2), (bb.max.y - Y).toFixed(2), (bb.max.z - Z).toFixed(2), 'visible', vis, 'kids', H.children.length); }
    const t2 = []; b.sewKickLamp();
    for (let f = 0; f < 100; f++) { side(); w.__adv(1); if (f >= 8 && f % 3 === 0 && f < 98) t2.push(grab('L' + f, 1.0)); if (f % 6 === 0) { const H = b.sewG().P.fallLamp.hold; log('f', f, H.position.x.toFixed(2), H.position.y.toFixed(2), H.position.z.toFixed(2), 'rx', H.rotation.x.toFixed(2)); } }
    b.scene.remove(work); sheet('lampside', t2, 6); }
  log('after the kick: ll', b.sewLampS().ll, 'dead', b.sewLampS().dead);
  // the electrocution from down the walk, looking along the branch's water
  const at2 = () => b.sewSet(10.5, -30.1, -1.45, -0.28);
  tiles = [];
  b.sewRestore({ lv: 15, ll: 1 }); b.placeInSewer(); for (let i = 0; i < 10; i++) { at2(); w.__adv(1); }
  b.sewKickLamp();
  for (let f = 0; f < 200; f++) { at2(); w.__adv(1); if ((f >= 40 && f < 70 && f % 3 === 0) || (f >= 70 && f % 12 === 0)) tiles.push(grab('s' + f, 1.0)); }
  sheet('shock', tiles);
  b.settings.devMode = false;
}

// the storeroom's live water and wires, from the gate: frames where an arc is up (2026-11-15)
export async function storeArcs({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true; b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 0 }); b.placeInSewer(); w.__clockOn();
  const S = b.sewG().SEW, P = b.sewG().P;
  const at = () => b.sewSet(S.GATE_X - 0.7, S.DOOR_Z, -Math.PI / 2, -0.32);
  let n = 0;
  for (let f = 0; f < 900 && n < 6; f++) { at(); w.__adv(1); if (P.arcs.some((a) => a.life > 0) && f % 2 === 0) { shot('st_' + n, 800, 1.0); n++; f += 25; } }
  log('arc frames', n);
}

// the lair as you see it (no work light), and low views along the floor at the dead and the heap for anything floating (2026-11-15)
export async function lairLook2({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true; b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15, d2: 1, kt: 1, ls: 1 }); b.placeInSewer(); for (let i = 0; i < 30; i++) b.frame(1);
  for (let i = 0; i < 400 && !(b.sewG().P.remains); i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 60; i++) { b.frame(1); await sleep(15); }
  const T = b.THREE, C = b.camera, X = b.sewG().SEW_X, Y = b.sewG().SEW_Y, Z = b.sewG().SEW_Z, F = -0.7;
  const amb = new T.AmbientLight(0xffffff, 1.5);
  const look = async (name, from, at, lit, gain, fov = 75) => {
    if (lit) b.scene.add(amb); else b.scene.remove(amb);
    for (let i = 0; i < 6; i++) { b.sewSet(from[0], from[2], 0, 0); b.frame(1); }
    C.position.set(X + from[0], Y + from[1], Z + from[2]); C.lookAt(X + at[0], Y + at[1], Z + at[2]); C.fov = fov; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
    shot(name, 800, gain);
  };
  await look('l2_door', [12.6, F + 1.62, -32.0], [13.0, F + 0.3, -35.8], false, 1.5, 90);
  await look('l2_heap', [13.2, F + 1.55, -34.6], [15.2, F + 0.2, -37.0], false, 1.6);
  await look('l2_nest', [13.2, F + 1.55, -34.4], [10.9, F + 0.1, -36.9], false, 1.6);
  await look('l2_west', [13.4, F + 1.55, -33.4], [10.2, F + 0.4, -33.9], false, 1.6);
  await look('l2_heapLit', [13.2, F + 1.55, -34.6], [15.2, F + 0.2, -37.0], true, 1.0);
  await look('l2_doorLit', [12.6, F + 1.62, -32.0], [13.0, F + 0.3, -35.8], true, 1.0, 90);
  await look('l2_lowsit', [11.4, F + 0.18, -34.9], [10.4, F + 0.15, -33.85], true, 1.0, 60);
  await look('l2_lowlie', [13.6, F + 0.15, -35.2], [12.35, F + 0.1, -35.35], true, 1.0, 60);
  await look('l2_lowheap', [13.3, F + 0.25, -36.3], [15.0, F + 0.25, -37.1], true, 1.0, 60);
  await look('l2_lownest', [12.3, F + 0.15, -36.2], [10.9, F + 0.08, -36.9], true, 1.0, 60);
  C.fov = 105; C.updateProjectionMatrix();
  b.settings.devMode = false;
}

// the Shock Ring in the examine screen: frames of its arcs (2026-11-15)
export async function shockInspect({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 300 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  const it = b.shockRingItem; b.addToInventory(it);
  b.openInspect(it.inspectModel, { ...(it.inspectOpts ? it.inspectOpts() : {}), name: it.name, desc: it.desc });
  const cv = b.renderer.domElement, tiles = [];
  for (let f = 0; f < 60; f++) { await sleep(55); b.frame(1); if (f % 6 === 3) { const c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * cv.height / cv.width); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); tiles.push(c); } }
  log('gems', b.shockGemsS().length, 'arcs visible', b.shockArcsS() && b.shockArcsS().visible);
  const cols = 4, tw = tiles[0].width, th = tiles[0].height, c = w.document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(tiles.length / cols) * th;
  const g = c.getContext('2d'); tiles.forEach((tl, i) => g.drawImage(tl, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'ring', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}

// the Shock Ring's charge, forced: a red fighting you, two darks fighting you near it, one dark asleep near it (must be spared)
export async function shockProc({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  b.addToInventory(b.shockRingItem); log('wear', b.wearRing(b.shockRingItem), 'rings', (b.ringsS ? b.ringsS() : []).map((r) => r.name).join(','));
  const C = b.camera; C.position.set(4, 1.7, -40); b.camBaseY = 1.7;
  const u0 = b.mutSpawnTest(4, -42.5, 'red'), u1 = b.mutSpawnTest(5.4, -43.4, 'dark'), u2 = b.mutSpawnTest(2.6, -44.2, 'dark'), u3 = b.mutSpawnTest(4.2, -45.2, 'dark'), far = b.mutSpawnTest(4, -52, 'dark');
  w.__adv(2);
  for (const u of [u0, u1, u2, far]) { u.st.awake = true; }
  u3.st.awake = false;                               // asleep: must not be touched
  for (const u of [u0, u1, u2, u3, far]) u.st.atk = 99;  // (hold them still)
  const hp0 = [u0, u1, u2, u3, far].map((u) => u.st.hp);
  b.lookAt(4, 1.2, -43);
  log('ring worn', b.state().rings || '?', 'u0', u0.st.alive, u0.st.awake, !!u0.st.struck, u0.g.visible, !!u0.retired, JSON.stringify(Object.keys(u0.kind).filter((k) => /friend|ally|baby/.test(k))));
  const R = w.Math.random; w.Math.random = () => 0.01;      // (the game's own Math: it runs in the frame)
  const fired = b.shockRingProc(u0, 3, false);
  w.Math.random = R;
  for (let f = 0; f < 20; f++) { w.__adv(1); await sleep(20); if (f === 4) shot('shock_proc', 800, 1.3); }
  log('fired', fired, 'hp', ['red', 'dark1', 'dark2', 'asleep', 'far'].map((n, i) => n + ' ' + hp0[i] + '→' + [u0, u1, u2, u3, far][i].st.hp.toFixed(1)).join(' | '));
  b.settings.devMode = false;
}

// the Shock Ring on the jars in the storeroom's chest (2026-11-15)
export async function chestRing({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true; b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  for (let i = 0; i < 200 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  b.sewRestore({ lv: 15, gen: 1, gate: 1, chest: 1 }); b.placeInSewer();   // (gen: 1 is OFF in the save's own sense) for (let i = 0; i < 30; i++) b.frame(1);
  const S = b.sewG().SEW, P = b.sewG().P, T = b.THREE, C = b.camera, X = b.sewG().SEW_X, Y = b.sewG().SEW_Y, Z = b.sewG().SEW_Z;
  log('ring visible', P.ringWorld && P.ringWorld.visible, 'kids', P.ringWorld && P.ringWorld.children.length, 'local', P.ringWorld.position.toArray().map((v) => v.toFixed(3)).join(','));
  const amb = new T.AmbientLight(0xffffff, 1.2); b.scene.add(amb);
  const cp = new T.Vector3(); P.ringWorld.getWorldPosition(cp);
  b.sewSet(cp.x - X - 0.9, cp.z - Z + 0.4, 0, 0); b.frame(1);
  { const bb = new T.Box3().setFromObject(P.ringWorld); log('ring bbox y', (bb.min.y - Y).toFixed(3), (bb.max.y - Y).toFixed(3), 'size', bb.getSize(new T.Vector3()).toArray().map((v) => v.toFixed(3)).join(',')); }
  C.position.set(cp.x - 0.15, cp.y + 0.55, cp.z + 0.1); C.lookAt(cp); C.fov = 55; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
  log('cam', (C.position.x - X).toFixed(2), (C.position.y - Y).toFixed(2), (C.position.z - Z).toFixed(2), 'cp', (cp.x - X).toFixed(2), (cp.y - Y).toFixed(2), (cp.z - Z).toFixed(2), 'inSewer', b.sewS().lx, 'worldVis', b.sewG().world.visible, 'fog', b.scene.fog && b.scene.fog.density, 'parent', P.ringWorld.parent ? (P.ringWorld.parent.type + ' ' + P.ringWorld.parent.children.length) : 'none');
  shot('chest_ring', 800, 1.0); b.scene.remove(amb); C.fov = 105; C.updateProjectionMatrix();
}

// the first bridge from the walk, as you come down the tunnel: does the deck sit in the dark with the rest (2026-11-16)
export async function bridgeLook({ w, b, log, sleep, shot }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true; b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  for (let i = 0; i < 200 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
  const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  const S = b.sewG().SEW;
  for (const [lv, nm] of [[0, 'br_off'], [15, 'br_on']]) {
    b.sewRestore({ lv }); b.placeInSewer(); for (let i = 0; i < 30; i++) b.frame(1);
    for (let i = 0; i < 20; i++) { b.sewSet(-1.85, S.BRIDGE_Z + 3.2, -0.35, -0.35); b.frame(1); }
    shot(nm, 800, 1.4);
  }
  b.settings.devMode = false;
}

// the mace's momentum: three clicks in a row (forehand, back, forehand), then one let run out — every 3rd frame (2026-11-16)
export async function maceCombo({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  const C = b.camera;
  b.addToInventory(b.maceItem); b.toggleEquip(b.maceItem);
  const place = () => { C.position.set(4, 1.7, -30); b.camBaseY = 1.7; b.look(0, -0.05); };
  for (let i = 0; i < 100; i++) { place(); w.__adv(1); }
  const tiles = [];
  const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(lab, 4, 14); c.lab = lab; return c; };
  const clicks = [0, 22, 46];      // (frames: each after the blow before, inside the follow-through)
  let f = 0;
  for (; f < 150; f++) {
    if (clicks.includes(f)) { b.attackAction(); log('click at', f, 'digT', b.state().digT ?? '?', 'combo', b.comboStep); }
    place(); w.__adv(1);
    if (f % 3 === 0) { tiles.push(grab('F' + f + (clicks.includes(f) ? '*' : ''))); const M = b.maceItem.gripModel, T = b.THREE, cam = b.vmCamera, Pj = (y) => { const v = new T.Vector3(0, y, 0); M.localToWorld(v); v.project(cam); return v.x.toFixed(2) + ',' + v.y.toFixed(2); };
      if (f >= 12 && f <= 45) log('f', f, 'digT', (+b.state().digT).toFixed(2), 'combo', b.comboStep, 'head', Pj(-0.21), 'cord', Pj(0.84)); }
  }
  const cols = 8, tw = tiles[0].width, th = tiles[0].height, c = w.document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(tiles.length / cols) * th;
  const g = c.getContext('2d'); tiles.forEach((t, i) => g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'combo', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  b.settings.devMode = false;
}

// the sea against the rocks: the stones the surf reaches at both walls, and a strip of one wave striking them (2026-11-16)
export async function rockWash({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 300 && !b.rockSurfS().length; i++) { b.frame(1); await sleep(30); }
  const L = b.rockSurfS(), U = b.oceanUniforms.uTime;
  log('stones with surf', L.length, 'small (r<0.6)', L.filter((r) => r.r < 0.6).length);
  w.__clockOn();
  const C = b.camera, at = +(new URLSearchParams(w.parent.location.search).get('wall') || 0);
  const WZ = at ? b.ROCK_Z : 60, dz = at ? 1 : -1;     // the wall behind the drain (60) or the one past the mutants
  const near = L.filter((r) => Math.abs(r.z - WZ) < 16).sort((a, c) => a.x - c.x);
  log('wall', WZ, near.map((r) => `(${r.x.toFixed(1)},${r.z.toFixed(1)}) r${r.r.toFixed(2)} top${r.top.toFixed(2)} ph${r.ph.toFixed(2)}`).join(' '));
  const T0 = +(new URLSearchParams(w.parent.location.search).get('t') || (11.6 + 139.6 * 2));
  const Q = new URLSearchParams(w.parent.location.search), cam = (Q.get('cam') || '5.5,1.7,16,0.5,-0.3,10').split(',').map(Number);
  const place = () => { C.position.set(cam[0], cam[1], WZ + dz * cam[2]); b.camBaseY = cam[1]; b.lookAt(cam[3], cam[4], WZ + dz * cam[5]); };
  U.value = T0; for (let i = 0; i < 30; i++) { place(); w.__adv(1); U.value = T0 + i / 60; }
  const tiles = [];
  const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.2)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(lab, 4, 14); return c; };
  const EV = +(Q.get('every') || 15), NF = +(Q.get('frames') || 300);
  for (let f = 0; f < NF; f++) { place(); w.__adv(1); if (f % EV === 0) tiles.push(grab('t ' + (U.value).toFixed(2) + ' shore ' + b.shoreLineJS(WZ + dz * 10, U.value).toFixed(1))); }
  const cols = 4, tw = tiles[0].width, th = tiles[0].height, c = w.document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(tiles.length / cols) * th;
  const g = c.getContext('2d'); tiles.forEach((t, i) => g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'wash' + at, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
  b.settings.devMode = false;
}

// the mace's momentum, without and with a second press (2026-11-16): one click let run out (the swing back), then a click
// and a HOLD in its follow-through (a heavy carried on, wound up the far side) — every 3rd frame, with the head on screen
export async function maceMomentum({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  const C = b.camera;
  b.addToInventory(b.maceItem); b.toggleEquip(b.maceItem);
  const place = () => { C.position.set(4, 1.7, -30); b.camBaseY = 1.7; b.look(0, -0.05); };
  for (let i = 0; i < 100; i++) { place(); w.__adv(1); }
  const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = +(new URLSearchParams(w.parent.location.search).get('tw') || 280); c.height = Math.round(c.width * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(lab, 4, 14); return c; };
  const M = b.maceItem.gripModel, T = b.THREE, head = () => { const v = new T.Vector3(0, -0.21, 0); M.localToWorld(v); v.project(b.vmCamera); return v.x.toFixed(2) + ',' + v.y.toFixed(2); };
  const sheet = (name, tiles, cols = 8) => { const tw = tiles[0].width, th = tiles[0].height, c = w.document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(tiles.length / cols) * th;
    const g = c.getContext('2d'); tiles.forEach((t, i) => g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th));
    const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
  // 1: one click, let it run out
  let tiles = [];
  b.attackAction();
  const Q = new URLSearchParams(w.parent.location.search), F0 = +(Q.get('f0') || 0), F1 = +(Q.get('f1') || 72), EV = +(Q.get('every') || 3);
  for (let f = 0; f < F1; f++) { place(); w.__adv(1); if (f >= F0 && f % EV === 0) { tiles.push(grab('F' + f + ' t' + (+b.state().digT || 0).toFixed(2))); log('one f', f, 'digT', (+b.state().digT || 0).toFixed(2), 'head', head()); } }
  sheet('one', tiles);
  for (let i = 0; i < 40; i++) { place(); w.__adv(1); }
  // 2: click, then press-and-hold in the follow-through (a carried heavy), release after 50 frames
  tiles = [];
  b.attackAction();
  for (let f = 0; f < 120; f++) {
    if (f === 26) { const ok = b.startWind(); log('hold at', f, 'started', ok); }
    if (f === 80) b.releaseWind();
    place(); w.__adv(1);
    if (f % 4 === 0) { tiles.push(grab('H' + f + (f >= 26 && f < 80 ? ' hold' : ''))); log('heavy f', f, 'digT', (+b.state().digT || 0).toFixed(2), 'head', head()); }
  }
  sheet('carry', tiles);
  b.settings.devMode = false;
}

// the bone mace alone on grey, from the side and end-on, to see the whole model (2026-11-16: "the end of the club is cut off")
export async function maceAlone({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 200 && !b.maceItem.inspectModel.children.length; i++) { b.frame(1); await sleep(30); }
  const T = b.THREE, sc = new T.Scene(); sc.background = new T.Color(0x555a60);
  sc.add(new T.HemisphereLight(0xffffff, 0x444444, 2.2)); const dl = new T.DirectionalLight(0xffffff, 1.5); dl.position.set(1, 2, 3); sc.add(dl);
  const m = b.maceItem.inspectModel.clone(true); sc.add(m); m.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(m), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3());
  log('bbox', sz.toArray().map((v) => v.toFixed(3)).join(','));
  log('cap', JSON.stringify(w.__bwMaceCap));
  m.traverse((o) => { if (o.isMesh) log('mesh', o.name, 'idx', o.geometry.index ? o.geometry.index.count : 'none', 'pos', o.geometry.attributes.position.count, 'capped', !!o.geometry.userData.capped); });
  const cam = new T.PerspectiveCamera(30, 1280 / 720, 0.001, 100);
  const top = new T.Vector3(c.x, bb.max.y - 0.05, c.z);
  for (const [nm, dir, at, k] of [['side', [1, 0, 0.2], c, 2.2], ['front', [0, 0, 1], c, 2.2], ['ends', [0.6, 0.5, 0.6], c, 2.2], ['tipA', [0.5, 0.9, 0.6], top, 0.35], ['tipB', [-0.6, 0.2, -0.5], top, 0.35]]) {
    const d = new T.Vector3(...dir).normalize().multiplyScalar(Math.max(sz.x, sz.y, sz.z) * k);
    cam.position.copy(at).add(d); cam.lookAt(at);
    const save = b.scene; b.renderer.render(sc, cam);
    const src = b.renderer.domElement, cv = w.document.createElement('canvas'); cv.width = 640; cv.height = 360; cv.getContext('2d').drawImage(src, 0, 0, 640, 360);
    const dd = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(dd.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', 'mace_' + nm, i + '/' + n, dd.slice(i * 8000, (i + 1) * 8000));
  }
}

// the mace's two holds (plain heavy, Shift slam) and their releases: is the head, and the charge's glint, in the frame? (2026-11-16)
export async function maceHolds({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  const C = b.camera;
  b.addToInventory(b.maceItem); b.toggleEquip(b.maceItem);
  const place = () => { C.position.set(4, 1.7, -30); b.camBaseY = 1.7; b.look(0, -0.05); };
  for (let i = 0; i < 100; i++) { place(); w.__adv(1); }
  const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 300; c.height = Math.round(300 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.4)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(lab, 4, 14); return c; };
  const M = b.maceItem.gripModel, T = b.THREE, pj = (y) => { const v = new T.Vector3(0, y, 0); M.localToWorld(v); v.project(b.vmCamera); return v.x.toFixed(2) + ',' + v.y.toFixed(2); };
  const gl = () => { const g = b.tipGlint; if (!g.visible) return 'off'; const v = g.position.clone().project(b.vmCamera); return v.x.toFixed(2) + ',' + v.y.toFixed(2); };
  const sheet = (name, tiles, cols = 6) => { const tw = tiles[0].width, th = tiles[0].height, c = w.document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(tiles.length / cols) * th;
    const g = c.getContext('2d'); tiles.forEach((t, i) => g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th));
    const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
  for (const shift of [false, true]) {
    const tiles = [];
    if (shift) w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift' }));
    b.startWind();
    for (let f = 0; f < 240; f++) {
      place(); w.__adv(1);
      if (f % 24 === 0) { tiles.push(grab((shift ? 'S' : 'H') + f + ' hold')); log(shift ? 'slam' : 'heavy', 'hold f', f, 'head', pj(-0.21), 'cord', pj(0.6), 'glint', gl()); }
    }
    b.releaseWind();
    if (shift) w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'ShiftLeft', key: 'Shift' }));
    for (let f = 0; f < 72; f++) { place(); w.__adv(1); if (f % 4 === 0) tiles.push(grab((shift ? 'S' : 'H') + 'r' + f)); }
    for (let i = 0; i < 60; i++) { place(); w.__adv(1); }
    sheet(shift ? 'slamHold' : 'heavyHold', tiles);
  }
  b.settings.devMode = false;
}

// poses held still for the mace, labelled: a grid to read the axes off (2026-11-16). ?set=<json list of [label, pose]>
export async function maceGrid({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); w.__clockOn();
  b.addToInventory(b.maceItem); b.toggleEquip(b.maceItem);
  const C = b.camera, place = () => { C.position.set(4, 1.7, -30); b.camBaseY = 1.7; b.look(0, -0.05); };
  for (let i = 0; i < 90; i++) { place(); w.__adv(1); }
  const set = JSON.parse(decodeURIComponent(new URLSearchParams(w.parent.location.search).get('set')));
  const M = b.maceItem.gripModel, T = b.THREE, pj = (y) => { const v = new T.Vector3(0, y, 0); M.localToWorld(v); v.project(b.vmCamera); return v.x.toFixed(2) + ',' + v.y.toFixed(2); };
  const tiles = [];
  for (const [lab, pose] of set) {
    w.__bwPose = pose; for (let i = 0; i < 3; i++) { place(); w.__adv(1); }
    const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 300; c.height = Math.round(300 * src.height / src.width);
    const g = c.getContext('2d'); g.filter = 'brightness(1.4)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '11px monospace'; g.fillText(lab, 4, 13);
    // the crosshair
    g.strokeStyle = '#f44'; g.beginPath(); g.moveTo(c.width / 2 - 5, c.height / 2); g.lineTo(c.width / 2 + 5, c.height / 2); g.moveTo(c.width / 2, c.height / 2 - 5); g.lineTo(c.width / 2, c.height / 2 + 5); g.stroke();
    tiles.push(c); log(lab, 'head', pj(-0.21), 'cord', pj(0.6));
  }
  w.__bwPose = null;
  const cols = 5, tw = tiles[0].width, th = tiles[0].height, c = w.document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(tiles.length / cols) * th;
  const g = c.getContext('2d'); tiles.forEach((t, i) => g.drawImage(t, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'grid', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}

// the keychain's clearances, measured: each key's surface sampled into 1.5 mm cells, and the cells two keys share (or a key
// and the ring and its chain, or a key and another key's jump ring) counted — at rest and through a turn (2026-11-16)
export async function kcClip({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 200 && !(b.kcG && b.bootLeft().parsing === 0); i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true;
  const ks = [b.sewKeyItem, b.cellKeyItem, b.skullKeyItem, b.boatKeyItem, b.pavKeyItem, b.storeKeyItem].filter(Boolean);
  for (const k of ks) b.addToInventory(k);
  b.openPack(); await sleep(400);
  const K = b.kcG(), T = b.THREE; let t = performance.now();
  const adv = (n) => { for (let i = 0; i < n; i++) { t += 16.7; b.kcFrame(t); } };
  const C = 0.0015, A = new T.Vector3(), B = new T.Vector3(), D = new T.Vector3(), P = new T.Vector3();
  const cells = (root, skip) => { const S = new Set(); root.updateMatrixWorld(true);
    root.traverse((o) => { if (!o.isMesh || (skip && skip(o))) return; let vis = true; for (let q = o; q; q = q.parent) if (q.visible === false) vis = false; if (!vis) return;
      const pa = o.geometry.attributes.position, ix = o.geometry.index, n = ix ? ix.count : pa.count;
      for (let j = 0; j + 2 < n; j += 3) {
        A.fromBufferAttribute(pa, ix ? ix.getX(j) : j).applyMatrix4(o.matrixWorld); B.fromBufferAttribute(pa, ix ? ix.getX(j + 1) : j + 1).applyMatrix4(o.matrixWorld); D.fromBufferAttribute(pa, ix ? ix.getX(j + 2) : j + 2).applyMatrix4(o.matrixWorld);
        const L = Math.max(A.distanceTo(B), B.distanceTo(D), D.distanceTo(A)), m = Math.min(24, Math.ceil(L / C) + 1);
        for (let u = 0; u <= m; u++) for (let v = 0; v <= m - u; v++) { P.copy(A).multiplyScalar(1 - (u + v) / m).addScaledVector(B, u / m).addScaledVector(D, v / m);
          S.add(Math.floor(P.x / C) + ',' + Math.floor(P.y / C) + ',' + Math.floor(P.z / C)); }
      } });
    return S; };
  const shared = (a, b2) => { let n = 0; for (const c of a) if (b2.has(c)) n++; return n; };
  const report = (lab) => {
    const keyIds = new Set(K.keys.map((k) => k.pivot.uuid));
    const ring = cells(K.ring, (o) => { for (let q = o; q && q !== K.ring; q = q.parent) if (keyIds.has(q.uuid)) return true; return false; });
    const ties = K.keys.map((k) => cells(k.tieG, (o) => o.parent !== k.tieG));     // its jump ring only
    const keys = K.keys.map((k) => cells(k.bendG));
    const out = [];
    K.keys.forEach((k, i) => { const r = shared(keys[i], ring); if (r) { let sx = 0, sy = 0, sz = 0; for (const c of keys[i]) if (ring.has(c)) { const v = c.split(',').map(Number); sx += v[0]; sy += v[1]; sz += v[2]; }
      out.push(K.items[i].name + '×ring ' + r + ' @' + [sx, sy, sz].map((q) => (q / r * C - (q === sx ? K.ring.position.x : q === sy ? K.ring.position.y : 0)).toFixed(3)).join(',') + ' phi' + (k.phi * 57.3).toFixed(0)); } });
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const n = shared(keys[i], keys[j]); if (n) out.push(K.items[i].name + '×' + K.items[j].name + ' ' + n); }
    for (let i = 0; i < keys.length; i++) for (let j = 0; j < keys.length; j++) if (i !== j) { const n = shared(keys[i], ties[j]); if (n) out.push(K.items[i].name + '×ring of ' + K.items[j].name + ' ' + n); }
    log(lab, out.length ? out.join(' | ') : 'CLEAR');
    if (out.length) log('   at', K.keys.map((k, i) => K.items[i].name.slice(0, 5) + ' phi' + (k.phi * 57.3).toFixed(0) + ' th' + (k.th * 57.3).toFixed(0) + ' ps' + (k.ps * 57.3).toFixed(0) + ' up' + (k.near).toFixed(2)).join(' | '), 'ang', K.ang.toFixed(2), 'aR', (K.aR * 57.3).toFixed(0));
  };
  adv(240); report('rest');
  { const keyIds = new Set(K.keys.map((k) => k.pivot.uuid));
    const ring = cells(K.ring, (o) => { for (let q = o; q && q !== K.ring; q = q.parent) if (keyIds.has(q.uuid)) return true; return false; });
    // the ring's depth along its lowest part, in the ring's own frame (the ring is at the origin, rotated only by its swing)
    let z0 = 1e9, z1 = -1e9, n = 0; for (const c of ring) { const [x, y, z] = c.split(',').map(Number); if (y * C < -0.05) { z0 = Math.min(z0, z * C); z1 = Math.max(z1, z * C); n++; } }
    log('ring bottom z', z0.toFixed(4), z1.toFixed(4), 'cells', n, 'parts', K.ring.children.filter((o) => !keyIds.has(o.uuid)).map((o) => (o.name || o.type) + (o.visible ? '' : '(hidden)')).join(','));
    K.keys.forEach((k, i) => { const kc2 = cells(k.bendG); let a = 1e9, b2 = -1e9; for (const c of kc2) { const z = +c.split(',')[2] * C; a = Math.min(a, z); b2 = Math.max(b2, z); } log(K.items[i].name, 'z', a.toFixed(4), b2.toFixed(4), 'beta', k.beta.toFixed(2), 'thick', k.thick.toFixed(4)); });
    // which ring cells the Cell key shares: where they are
    const kc1 = cells(K.keys[1].bendG); const sh = []; for (const c of kc1) if (ring.has(c)) sh.push(c.split(',').map((v) => (+v * C).toFixed(3)).join(',')); log('cell×ring at', sh.slice(0, 8).join(' '));
  }
  // shaken: the hand thrown across and back (the cursor), the ring and keys swinging
  for (const [mx, lab] of [[1.2, 'shake R'], [-1.2, 'shake L'], [0, 'shake back']]) { K.mx = mx; for (const f of [8, 16, 30]) { adv(f === 8 ? 8 : f === 16 ? 8 : 14); report(lab + ' f' + f); } }
  if (new URLSearchParams(w.parent.location.search).get('dense')) {
    let bad = 0, n = 0; const rep2 = (lab) => { const was = bad; const L = []; const lg = log; report.quiet = true; n++; return lab; };
    for (const d of [1, 1, 1, 1, -1, -1, -1, -1]) { b.kcStep(d); for (let f = 0; f < 44; f += 2) { adv(2); report('dense ' + d + ' f' + f); } }
    K.mx = 1.2; for (let f = 0; f < 40; f += 2) { adv(2); report('dense shake f' + f); } K.mx = -1.2; for (let f = 0; f < 40; f += 2) { adv(2); report('dense shake2 f' + f); }
    b.kcStep(1); K.mx = 0; for (let f = 0; f < 44; f += 2) { adv(2); report('dense shake+step f' + f); }
  } else
  for (let s = 0; s < K.keys.length; s++) { b.kcStep(1); for (const f of [6, 12, 20, 60]) { adv(f === 6 ? 6 : f - (f === 12 ? 6 : f === 20 ? 12 : 20)); report('step' + (s + 1) + ' f' + f); } }
}

// the sewer thing's voice (2026-11-16): its six breaths and its death loaded, the breaths played in turn while it is about,
// and the death cry (not the scream) from where it went down when the lamp goes in the water
export async function sewVoice({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  b.introDone = true; b.started = true; b.loadSewer();
  for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
  for (let i = 0; i < 200 && !((b.sampleBanks.sewBreath || []).filter(Boolean).length === 6 && (b.sampleBanks.sewDeath || [])[0]); i++) await sleep(50);
  const SB = b.sampleBanks;
  log('breaths', (SB.sewBreath || []).filter(Boolean).map((x) => x.duration.toFixed(2)).join(' '), 'death', SB.sewDeath && SB.sewDeath[0] ? SB.sewDeath[0].duration.toFixed(2) : 'MISSING');
  // every buffer started, by which bank it came from
  const ctx = b.audioCtx, name = (buf) => { for (const [k, v] of Object.entries(SB)) { const i = (v || []).indexOf(buf); if (i >= 0) return k + (v.length > 1 ? i + 1 : ''); } return null; };
  const played = []; const orig = ctx.createBufferSource.bind(ctx);
  ctx.createBufferSource = () => { const s = orig(); const st = s.start.bind(s); s.start = (...a) => { const n = s.buffer && name(s.buffer); if (n && /^sew(Breath|Death)/.test(n)) played.push(n + '@' + performance.now().toFixed(0)); return st(...a); }; return s; };
  let scream = 0; const sc = b.sfxSewScream; // (the module's own binding is what fires; count the scream through its gain path instead)
  b.sewRestore({ lv: 15, ll: 1 }); b.placeInSewer();
  for (let i = 0; i < 1500 && played.filter((p) => p.startsWith('sewBreath')).length < 4; i++) { b.frame(1); await sleep(16); }
  log('breaths played', played.filter((p) => p.startsWith('sewBreath')).map((p) => p.split('@')[0]).join(' '));
  log('monster', JSON.stringify(b.sewMonS()));
  played.length = 0;
  b.sewElectrocute();
  for (let i = 0; i < 80; i++) { b.frame(1); await sleep(16); }
  log('after the shock', played.map((p) => p.split('@')[0]).join(' ') || 'nothing', 'dead', b.sewLampS().dead);
  b.settings.devMode = false;
}

// THE KEY ON ITS LINE: mid-lowering, where the line ends against the key's own box (its top, its middle), and a close look
export async function shipKeyRope({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, S = b.shipwreck, V = b.THREE.Vector3, T = b.THREE;
  C.position.set(b.SHIP_X + 12, 1.7, b.SHIP_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !(S.userData.wheel && b.shipBrkS().length > 20); i++) { b.frame(1); await sleep(40); }
  w.__clockOn(); S.updateMatrixWorld(true);
  C.position.copy(S.localToWorld(new V(4.6, 5.85, 0))); b.camBaseY = C.position.y;
  for (let i = 0; i < 10; i++) w.__adv(1);
  b.dropShipKey();
  for (const f of [70, 130]) {
    while (b.shipKeyS().lowering && (w.__f = (w.__f || 0) + 1) < f) w.__adv(1);
    const K = b.boatKey, L = b.keyLineS(); K.updateMatrixWorld(true);
    const bx = new T.Box3().setFromObject(K, true), kp = K.getWorldPosition(new V());
    const lb = L.position.y - L.scale.y / 2;
    log('frame', f, 'key origin y', kp.y.toFixed(3), 'box', bx.min.y.toFixed(3), '..', bx.max.y.toFixed(3), 'x', bx.min.x.toFixed(2), bx.max.x.toFixed(2), 'z', bx.min.z.toFixed(2), bx.max.z.toFixed(2), '| line bottom', lb.toFixed(3), 'at', L.position.x.toFixed(2), L.position.z.toFixed(2), '| gap to box top', (lb - bx.max.y).toFixed(3));
    const kc = b.shipKeyS().cam;
    if (kc) { kc.fov = 12; kc.updateProjectionMatrix(); kc.lookAt(kp); kc.updateMatrixWorld(true); b.renderer.render(b.scene, kc);
      const cv = b.renderer.domElement, c2 = document.createElement('canvas'); c2.width = 640; c2.height = Math.round(640 * cv.height / cv.width); const g2 = c2.getContext('2d'); g2.filter = 'brightness(1.6)'; g2.drawImage(cv, 0, 0, c2.width, c2.height);
      const d = c2.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let q = 0; q < n; q++) console.log('[PBIMG]', 'kr_' + f, q + '/' + n, d.slice(q * 8000, (q + 1) * 8000)); }
  }
}

// THE DARK KNIGHT'S TRAIL LEFT BEHIND (2026-11-14): caught mid-swing with his trail up, then he is not ticked any more (as
// a death or a cull does); is the sheet still there a second later?
export async function dkTrailLeft({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
  b.settings.devMode = false; await w.__fortBoot(); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position;
  let f = 0;
  for (; f < 60 * 30; f++) { C.set(P.x + 2.6, C.y, P.z); b.lookAt(P.x, P.y + 1.4, P.z); w.__adv(1); b.heal(); if (u.swTrail && u.swTrail.m.visible && u.swTrail.on > 0.9) break; }
  log('trail up at frame', f, 'visible', !!(u.swTrail && u.swTrail.m.visible));
  u.g.visible = false; u.st.alive = false;          // (nobody ticks his trail now)
  const T = u.swTrail; let goneAt = -1;
  for (let i = 0; i < 90; i++) { w.__adv(1); if (goneAt < 0 && !T.m.visible) goneAt = i; }
  log('a second and a half later: trail visible', T.m.visible, 'gone after frames', goneAt);
}

// THE DOCK'S POSTS: rays straight down over the seaward end of the pier; what stands above the boards, and how high
export async function dockPosts({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, T = b.THREE;
  C.position.set(-1.9, 1.74 + 1.7, -215.7); b.camBaseY = C.position.y;
  for (let i = 0; i < 200; i++) { b.frame(1); await sleep(30); }
  const D = b.dock; D.visible = true; D.updateMatrixWorld(true);
  const rc = new T.Raycaster(), hits = [];
  for (let x = -7; x <= 2; x += 0.08) for (let z = -222; z <= -209; z += 0.08) {
    rc.set(new T.Vector3(x, 6, z), new T.Vector3(0, -1, 0)); rc.far = 6;
    const h = rc.intersectObject(D, true)[0];
    if (h && h.point.y > b.DOCK_DECK + 0.25) hits.push([x, z, h.point.y]);
  }
  // clusters
  const cl = [];
  for (const p of hits) { let c = cl.find((q) => Math.hypot(q.x - p[0], q.z - p[1]) < 0.5); if (!c) cl.push(c = { x: 0, z: 0, n: 0, top: -9 }); c.x += p[0]; c.z += p[1]; c.n++; c.top = Math.max(c.top, p[2]); }
  for (const c of cl) log('post at', (c.x / c.n).toFixed(2), (c.z / c.n).toFixed(2), 'top', c.top.toFixed(2), 'cells', c.n);
  log('deck', b.DOCK_DECK.toFixed(2));
}

// THE CROW (2026-11-14): its TakeOff clip at a run of times (side view, a sheet), then the pet: it facing you, the beak
// open in the scream (close), and the take-off
export async function crowClip({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW, T = b.THREE;
  C.position.set(-1.9, 3.44, -215.7); b.camBaseY = C.position.y;
  for (let i = 0; i < 300 && !(K.g && K.mixer); i++) { b.frame(1); await sleep(40); }
  log('crow', !!K.g, 'jaw', !!K.jaw, 'lower beak verts', K.lower && K.lower.length, 'jawSign', K.jawSign, 'clip', K.act && K.act.getClip().duration.toFixed(2));
  w.__clockOn();
  const G = K.g, P = G.position.clone();
  const cv = b.renderer.domElement, sw = 240, sh = 200, cols = 6, times = [];
  for (let t = 0; t <= 10.5; t += 0.35) times.push(t);
  const sheet = document.createElement('canvas'); sheet.width = sw * cols; sheet.height = sh * Math.ceil(times.length / cols); const g2 = sheet.getContext('2d'); g2.filter = 'brightness(2.2)';
  K.st = 'test';
  const fov0 = C.fov;
  for (let k = 0; k < times.length; k++) { const t = times[k]; w.__adv(1); C.fov = 30; C.updateProjectionMatrix();
    K.act.paused = true; K.act.time = t; K.mixer.update(0); G.updateMatrixWorld(true);
    const bb = b.skinnedBoundsS ? null : null;
    C.position.set(P.x, P.y + 0.3, P.z + 2.2); C.lookAt(P.x, P.y + 0.15, P.z); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C); shot('cc_' + String(k).padStart(2, '0') + '_' + t.toFixed(2), 300, 2.2);
  }
  C.fov = fov0; C.updateProjectionMatrix();
  // the pet: you on the pier in front of it
  K.st = 'perch';
  C.position.set(P.x + 1.6, 3.44, P.z + 0.3); b.camBaseY = C.position.y; b.lookAt(P.x, P.y + 0.2, P.z);
  for (let i = 0; i < 5; i++) w.__adv(1);
  b.crowPet();
  let f = 0;
  for (; f < 60 * 3; f++) { C.position.set(P.x + 1.6, 3.44, P.z + 0.3); b.camBaseY = C.position.y; b.lookAt(P.x, P.y + 0.2, P.z); w.__adv(1); if (K.st === 'scream' && K.t > 0.4) break; }
  { const hp = new T.Vector3(); K.head.getWorldPosition(hp); C.fov = 40; C.updateProjectionMatrix(); C.position.set(P.x + 1.0, P.y + 0.75, P.z + 0.1); C.lookAt(hp); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('crow_scream', 640, 2.0);
    C.fov = 25; C.updateProjectionMatrix(); C.position.set(hp.x + 0.1, hp.y + 0.05, hp.z + 0.75); C.lookAt(hp); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('crow_scream_side', 640, 2.0); }
  log('scream state', K.st, 't', K.t.toFixed(2), 'jaw angle', (2 * Math.acos(Math.min(1, Math.abs(K.jaw ? K.jaw.quaternion.w : 1)))).toFixed(2));
  for (f = 0; f < 60 * 4 && K.st !== 'fly'; f++) w.__adv(1);
  for (const [nm, tt] of [['crow_fly_a', 0.15], ['crow_fly_b', 0.5], ['crow_fly_c', 1.2], ['crow_fly_d', 2.5]]) {
    while (K.t < tt && K.st === 'fly') w.__adv(1);
    C.fov = 60; C.updateProjectionMatrix(); C.position.set(P.x + 1.6, 3.44, P.z + 0.3); C.lookAt(K.g.position); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 480, 2.0);
    log(nm, 't', K.t.toFixed(2), 'from the post', K.g.position.clone().sub(P).toArray().map((n) => n.toFixed(2)).join(','), 'clip', K.act.time.toFixed(2), 'vis', K.g.visible);
  }
  log('flying: st', K.st, 'height over the post', (K.g.position.y - P.y).toFixed(2), 'gone flag', b.crowGoneS());
}

// THE CROW, MEASURED: its skinned bounds, feet and beak tip in the world against the post, through the clip
export async function crowMeasure({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW, T = b.THREE;
  C.position.set(-1.9, 3.44, -215.7); b.camBaseY = C.position.y;
  for (let i = 0; i < 300 && !(K.g && K.mixer && K.jaw); i++) { b.frame(1); await sleep(40); }
  K.st = 'test';
  const M = K.mesh, P = M.geometry.attributes.position, v = new T.Vector3(), G = K.g.position;
  const tip = 0;   // (the old jaw's vertex list is gone: the beak's tip is no longer a mesh vertex here)
  const at = (t) => {
    K.act.time = t; K.mixer.update(0); K.g.updateMatrixWorld(true); M.skeleton.update();
    const box = new T.Box3(); box.makeEmpty(); let low = null, lowY = 1e9;
    for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); M.applyBoneTransform(i, v); v.applyMatrix4(M.matrixWorld); box.expandByPoint(v); if (v.y < lowY) { lowY = v.y; low = v.clone(); } }
    v.fromBufferAttribute(P, tip); M.applyBoneTransform(tip, v); v.applyMatrix4(M.matrixWorld);
    const hp = new T.Vector3(); K.head.getWorldPosition(hp);
    const f = (q) => [q.x - G.x, q.y - G.y, q.z - G.z].map((n) => n.toFixed(2)).join(',');
    return `t ${t.toFixed(1)} box ${f(box.min)} .. ${f(box.max)}  feet ${f(low)}  tip ${f(v)}  head ${f(hp)}`;
  };
  log('crow group at', G.x.toFixed(2), G.y.toFixed(2), G.z.toFixed(2), 'post', -3.52, 2.32, -216.66);
  const T0 = +(new URLSearchParams(w.location.search).get('t0') || 0);
  for (let t = 6.8; t <= 10.52; t += 0.1) { const r = at(t); log(r.replace(/head.*/, '')); }
}

// THE CROW'S JAW: shut and open, side and front, close (fov 14)
export async function crowJawShots({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW, T = b.THREE;
  C.position.set(-1.9, 3.44, -215.7); b.camBaseY = C.position.y;
  for (let i = 0; i < 300 && !(K.g && K.jaw); i++) { b.frame(1); await sleep(40); }
  w.__clockOn(); K.st = 'test'; w.__adv(1);
  const hp = new T.Vector3(), hq = new T.Quaternion();
  log('jaw', K.jaw && K.jaw.name, 'the caw opens it', (K.jawOpen || 0).toFixed(3), 'rad about', K.jawAx.toArray().map((n) => n.toFixed(2)).join(','));
  for (const [a, mo] of [[0, 0], [1.0, 0], [1.25, 0]]) {
    K.act.time = 6.5; K.mixer.update(0); K.jaw.quaternion.multiply(new T.Quaternion().setFromAxisAngle(K.jawAx, K.jawOpen * a)); K.g.updateMatrixWorld(true);
    K.head.getWorldPosition(hp); K.head.getWorldQuaternion(hq);
    const ax = K.jawAx.clone().applyQuaternion(hq).normalize(), fw = K.headFwd.clone().applyQuaternion(hq).normalize(), aim = hp.clone().addScaledVector(fw, 0.04);
    for (const [nm, d] of [['side', ax], ['front', fw.clone().addScaledVector(ax, 0.35).normalize()]]) {
      C.fov = 9; C.updateProjectionMatrix(); C.position.copy(aim).addScaledVector(d, 0.7); C.lookAt(aim); C.updateMatrixWorld(true);
      b.renderer.render(b.scene, C); shot('jaw_' + a + (mo ? 'm' : '') + '_' + nm, 400, 2.6);
    }
  }
}

// THE CROW AS YOU MEET IT: standing where the owner stood on the pier, looking at it (the game's own fov, no gain),
// the prompt, then the click
export async function crowMeet({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW;
  const at = () => { C.position.set(-1.89, 3.44, -215.73); b.camBaseY = C.position.y; };
  at();
  for (let i = 0; i < 300 && !(K.g && K.jaw); i++) { b.frame(1); await sleep(40); }
  w.__clockOn(); b.setFallbackLook(true);
  const P = K.g.position;
  for (let i = 0; i < 20; i++) { at(); b.lookAt(P.x, P.y + 0.15, P.z); w.__adv(1); }
  log('from', C.position.distanceTo(P).toFixed(2), 'm, prompt', b.hoveredS(), 'st', K.st);
  { const T = b.THREE, r = new T.Raycaster(); C.updateMatrixWorld(true); r.setFromCamera({ x: 0, y: 0 }, C); const h = r.intersectObject(K.proxy, false); const pp = new T.Vector3(); K.proxy.getWorldPosition(pp);
    log('ray to the proxy', h.length && h[0].distance.toFixed(2), 'proxy at', pp.toArray().map((n) => n.toFixed(2)).join(','), 'crow it', b.crowHoverS()); }
  shot('meet_far', 640, 1.0);
  // nearer: a step up to it
  const near = () => { C.position.set(-2.7, 3.44, -216.4); b.camBaseY = C.position.y; };
  for (let i = 0; i < 20; i++) { near(); b.lookAt(P.x, P.y + 0.15, P.z); w.__adv(1); }
  log('near', C.position.distanceTo(P).toFixed(2), 'm, prompt', b.hoveredS());
  shot('meet_near', 640, 1.0);
  if (b.primaryAction) b.primaryAction(); else b.crowPet();
  log('after the click: st', K.st);
  for (let i = 0; i < 120 && !(K.st === 'scream' && K.t > 0.35); i++) { near(); w.__adv(1); }
  shot('meet_scream', 640, 1.0);
  { const T = b.THREE, G = K.g, hp = new T.Vector3(), q = new T.Quaternion(), tip = new T.Vector3();
    K.head.getWorldPosition(hp); K.head.getWorldQuaternion(q);
    const toEye = C.position.clone().sub(hp).normalize(), hf = K.headFwd.clone().applyQuaternion(q);
    const bf = new T.Vector3(0, 0, 1).applyQuaternion(G.quaternion); const flat = new T.Vector3(toEye.x, 0, toEye.z).normalize();
    log('body fwd . eye (flat)', bf.dot(flat).toFixed(2), 'head fwd . eye', hf.dot(toEye).toFixed(2), 'rotY', G.rotation.y.toFixed(2)); }
  log('scream', K.st, K.t.toFixed(2), 'fov', b.camera.fov.toFixed(1));
  for (let i = 0; i < 60 && !(K.st === 'scream' && K.t > 0.9); i++) { near(); w.__adv(1); }
  shot('meet_scream2', 640, 1.0);
  { const keep = C.position.clone(), kq = C.quaternion.clone(), kf = C.fov; const T = b.THREE, hp = new T.Vector3(); K.head.getWorldPosition(hp);
    for (const [nm, dx, dy, dz] of [['side', 0, 0.1, 1.2], ['behindEye', 1.6, 1.25, 0.3]]) { C.fov = 30; C.updateProjectionMatrix(); C.position.set(P.x + dx, P.y + dy + 0.2, P.z + dz); C.lookAt(hp); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('meet_' + nm, 480, 2.0); }
    C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix(); } log('scream later', K.t.toFixed(2), 'fov', b.camera.fov.toFixed(1));
  for (let i = 0; i < 240 && !(K.st === 'fly' && K.t > 0.6); i++) { near(); w.__adv(1); }
  shot('meet_fly', 640, 1.0); log('flying', K.t.toFixed(2), 'fov', b.camera.fov.toFixed(1));
}

// THE SCREAM, THROUGH: the owner's recording decoded, the beak's opening over it, and stills from your eye and from
// the side at a run of moments (the side views close on the head)
export async function crowScreamSeq({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW, T = b.THREE;
  const near = () => { C.position.set(-2.7, 3.44, -216.4); b.camBaseY = C.position.y; };
  near();
  for (let i = 0; i < 400 && !(K.g && K.jaw && K.env); i++) { b.frame(1); await sleep(40); }
  log('env', !!K.env, K.env && ('len ' + K.env.len.toFixed(2) + ' s, steps ' + K.env.k.length));
  w.__clockOn(); b.setFallbackLook(true);
  const P = K.g.position.clone();
  for (let i = 0; i < 10; i++) { near(); b.lookAt(P.x, P.y + 0.15, P.z); w.__adv(1); }
  for (let i = 0; i < 4; i++) { near(); w.__adv(1); }
  shot('sq_eye_perch', 480, 1.6);
  { const keep = C.position.clone(), kq = C.quaternion.clone(), kf = C.fov; C.fov = 30; C.updateProjectionMatrix(); C.position.set(P.x + 0.9, P.y + 0.35, P.z + 0.15); C.lookAt(P.x, P.y + 0.22, P.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('sq_front_perch', 480, 2.0); C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix(); C.updateMatrixWorld(true); }
  b.crowPet();
  while (K.st === 'look' && K.t < 0.5) { near(); w.__adv(1); }
  { const keep = C.position.clone(), kq = C.quaternion.clone(), kf = C.fov; K.head.updateMatrixWorld(true); const hp0 = new T.Vector3(); K.head.getWorldPosition(hp0);
    const hq = new T.Quaternion(); K.head.getWorldQuaternion(hq); const ax = K.jawAx.clone().applyQuaternion(hq).normalize(), fw = K.headFwd.clone().applyQuaternion(hq).normalize(), aim = hp0.clone().addScaledVector(fw, 0.05);
    C.fov = 18; C.updateProjectionMatrix(); C.position.copy(aim).addScaledVector(ax, 0.6); C.lookAt(aim); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('sq_side_shut', 480, 2.0);
    C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix(); C.updateMatrixWorld(true); }
  while (K.st === 'look') { near(); w.__adv(1); }
  const marks = [0.05, 0.3, 0.8, 1.5, 2.3, 3.0, 3.5, 3.8], rows = [];
  let m = 0, series = [];
  const hp = new T.Vector3();
  while (K.st === 'scream') {
    near(); w.__adv(1);
    if (K.st !== 'scream') break;
    const ang = K.jaw.quaternion.angleTo(new T.Quaternion(0, 0, 0.582, 0.813));
    if (series.length === 0 || K.t - series[series.length - 1][0] >= 0.25) series.push([K.t, ang]);
    if (m < marks.length && K.t >= marks[m]) {
      const tag = String(m) + '_' + K.t.toFixed(2);
      shot('sq_eye_' + tag, 480, 1.0);
      const keep = C.position.clone(), kq = C.quaternion.clone(), kf = C.fov;
      K.head.getWorldPosition(hp);
      // along the hinge: the beak's own side, square on (the hinge axis in the world, from the head)
      const hq = new T.Quaternion(); K.head.getWorldQuaternion(hq); const ax = K.jawAx.clone().applyQuaternion(hq).normalize();
      const fw = K.headFwd.clone().applyQuaternion(hq).normalize(), aim = hp.clone().addScaledVector(fw, 0.05);
      C.fov = 18; C.updateProjectionMatrix(); C.position.copy(aim).addScaledVector(ax, 0.6); C.up.set(0, 1, 0); C.lookAt(aim); C.updateMatrixWorld(true);
      b.renderer.render(b.scene, C); shot('sq_side_' + tag, 480, 2.0);
      C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
      m++;
    }
  }
  log('beak (s, rad):', series.map((r) => r[0].toFixed(2) + ':' + r[1].toFixed(2)).join(' '));
  log('then', K.st, 'fov', C.fov.toFixed(1));
}

// THE CROW'S OWN JAW BONE through the caw: its local turn and place against the idle frame, and whether a track drives it
export async function crowJawBone({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW, T = b.THREE;
  C.position.set(-1.9, 3.44, -215.7); b.camBaseY = C.position.y;
  for (let i = 0; i < 300 && !(K.g && K.act); i++) { b.frame(1); await sleep(40); }
  K.st = 'test';
  const J = K.jaw; log('jaw', J && J.name, 'parent', J && J.parent && J.parent.name);
  const tracks = K.act.getClip().tracks.filter((t) => /Queue|Head/.test(t.name)).map((t) => t.name + ' x' + t.times.length);
  log('tracks', tracks.join(' | '));
  const at = (t) => { K.act.time = t; K.mixer.update(0); return [J.quaternion.clone(), J.position.clone()]; };
  const [q0, p0] = at(6.5);
  const row = []; for (let t = 0; t <= 10.5; t += 0.1) { const [q, p] = at(t); row.push(t.toFixed(1) + ':' + q.angleTo(q0).toFixed(2)); }
  log('turn by time', row.join(' '));
  const bound = K.mixer._bindings ? K.mixer._bindings.filter((x) => x.binding && x.binding.node === J).length : -1;
  log('mixer bindings on the jaw', bound);
}

// THE CROW ON ITS POST: side, front and from your eye (solid now; its feet's middle on the post's middle), the post's
// own top measured by rays
export async function crowPerch({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW, T = b.THREE;
  const near = () => { C.position.set(-2.7, 3.44, -216.4); b.camBaseY = C.position.y; };
  near();
  for (let i = 0; i < 300 && !(K.g && K.jaw); i++) { b.frame(1); await sleep(40); }
  w.__clockOn(); for (let i = 0; i < 10; i++) { near(); w.__adv(1); }
  const P = K.g.position.clone(), D = b.dock; D.visible = true; D.updateMatrixWorld(true);
  const rc = new T.Raycaster(); let xs = [], zs = [];
  for (let dx = -0.4; dx <= 0.4; dx += 0.01) for (let dz = -0.4; dz <= 0.4; dz += 0.01) {
    rc.set(new T.Vector3(P.x + dx, P.y + 1, P.z + dz), new T.Vector3(0, -1, 0)); rc.far = 1.1;
    const h = rc.intersectObject(D, true)[0]; if (h && h.point.y > P.y - 0.05) { xs.push(P.x + dx); zs.push(P.z + dz); }
  }
  const cx = xs.reduce((a, v) => a + v, 0) / xs.length, cz = zs.reduce((a, v) => a + v, 0) / zs.length;
  log('post top: centre', cx.toFixed(3), cz.toFixed(3), 'across', (Math.max(...xs) - Math.min(...xs)).toFixed(2), 'x', (Math.max(...zs) - Math.min(...zs)).toFixed(2), '| crow at', P.x.toFixed(3), P.z.toFixed(3), 'feet points', K.feetN, 'material transparent', K.mesh.material.transparent);
  // the standing bird's feet, measured again on the post
  K.mixer.update(0); K.g.updateMatrixWorld(true); K.mesh.skeleton.update();
  const Pa = K.mesh.geometry.attributes.position, v = new T.Vector3(); let lowY = 1e9; const pts = [];
  for (let i = 0; i < Pa.count; i++) { v.fromBufferAttribute(Pa, i); K.mesh.applyBoneTransform(i, v); v.applyMatrix4(K.mesh.matrixWorld); pts.push(v.clone()); lowY = Math.min(lowY, v.y); }
  const ft = pts.filter((q) => q.y < lowY + 0.015), fx = ft.reduce((a, q) => a + q.x, 0) / ft.length, fz = ft.reduce((a, q) => a + q.z, 0) / ft.length;
  const bx = new T.Box3().setFromPoints(pts);
  log('feet: middle', fx.toFixed(3), fz.toFixed(3), 'lowest', lowY.toFixed(3), 'post top', P.y.toFixed(3), '| bird', (bx.max.x - bx.min.x).toFixed(2), 'x', (bx.max.y - bx.min.y).toFixed(2), 'x', (bx.max.z - bx.min.z).toFixed(2));
  for (const [nm, dx, dy, dz, fov, g] of [['perch_side', 0, 0.25, 1.6, 30, 2.0], ['perch_front', 1.6, 0.25, 0.1, 30, 2.0], ['perch_eye', -2.7 - P.x, 3.44 - P.y, -216.4 - P.z, 60, 1.3]]) {
    C.fov = fov; C.updateProjectionMatrix(); C.position.set(P.x + dx, P.y + dy, P.z + dz); C.lookAt(P.x, P.y + 0.18, P.z); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C); shot(nm, 480, g);
  }
}

// THE ZOOM AND THE SHAKE through the scream: the lens's fov and the trauma every quarter second from the click, from
// the far petting spot and from the near one, and what you see at its height
export async function crowZoomTrace({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, K = b.CROW;
  for (let i = 0; i < 300 && !(K.g && K.jaw && K.env); i++) { C.position.set(-1.89, 3.44, -215.73); b.camBaseY = C.position.y; b.frame(1); await sleep(40); }
  w.__clockOn(); b.setFallbackLook(true);
  const P = K.g.position;
  for (const [nm, x, z] of [['far', -1.89, -215.73], ['near', -2.7, -216.4]]) {
    b.crowAgain();
    const at = () => { C.position.x = x; C.position.z = z; b.camBaseY = 3.44; };
    for (let i = 0; i < 30; i++) { at(); b.lookAt(P.x, P.y + 0.15, P.z); w.__adv(1); }
    log(nm, 'from', C.position.distanceTo(P).toFixed(2), 'm, fov', C.fov.toFixed(1), 'st', K.st);
    b.crowPet();
    let next = 0, t0 = 0, shotDone = false;
    for (let i = 0; i < 900 && !(K.st === 'gone' || (K.st === 'fly' && K.achLogged && K.t > 1.2)); i++) {
      at(); w.__adv(1); t0 += 1 / 60;
      if (t0 >= next) { log(nm, 't', t0.toFixed(2), K.st, K.t.toFixed(2), 'fov', C.fov.toFixed(1), 'trauma', b.trauma.toFixed(2)); next += 0.25; }
      if (!shotDone && K.st === 'scream' && K.t > 0.6) { shot('zoom_' + nm, 640, 1.0); shotDone = true; }
      if (K.ach && !K.achLogged) { K.achLogged = true; const el = w.document.getElementById('ach'); log(nm, 'ACHIEVEMENT at fly t', K.t.toFixed(2), 'crow from you', K.g.position.distanceTo(C.position).toFixed(1), 'm, toast', el && el.className, el && el.textContent.replace(/\s+/g, ' ').trim()); }
    }
    log(nm, 'after: fov', C.fov.toFixed(1), 'st', K.st);
  }
}

// SKRIM UP HIS CHAIN AT HALF HEALTH (`SK_HANG`): the hook into the vault, him reeled up and hanging, five heads down the
// chain and off it, you cutting them down as they come, and him lowered back to the fight. Logs every half second; stills
// from your eye and from off to the side (the whole chain).
export async function skrimHang({ w, b, log, sleep, shot }) {
  b.settings.devMode = false;
  b.placeInWhale();
  const S = b.SKRIM, cam = b.camera.position, C = b.camera;
  for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
  const u = S.u; if (!u || !u.model) { log('no skrim'); return; }
  for (let i = 0; i < 30; i++) b.frame(1);
  w.requestAnimationFrame = () => 0;
  const P = u.g.position, T = P.constructor;
  S.stage = 'dig'; cam.set(P.x + Math.sin(u.g.rotation.y) * 4, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 4);
  b.skrimFight();
  for (let i = 0; i < 120 && S.stage !== 'fight'; i++) b.step(1 / 60);
  for (let i = 0; i < 300 && !(b.CRY && b.CRY.built); i++) b.step(1 / 60);
  log('stage', S.stage, 'heads built', b.CRY.list.length, 'his', b.CRY.list.filter((h) => h.summon).length);
  u.st.hp = Math.round(u.kind.hp * 0.49); b.CRY.log = [];
  const k = u.sk, heads = () => b.CRY.list.filter((h) => h.summon);
  const side = (nm) => {
    const keep = cam.clone(), kq = C.quaternion.clone(), kf = C.fov, H = k.hang;
    const top = H ? H.A : P; C.fov = 70; C.updateProjectionMatrix();
    const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1;
    C.position.set(P.x + 1.5, P.y + 3, P.z + 12); C.lookAt(P.x, (P.y + top.y) / 2, P.z); C.updateMatrixWorld(true);
    shot(nm, 640, 1.8);
    C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix();
  };
  const eye = (nm, x, y, z) => { const kf = C.fov; C.fov = 55; C.updateProjectionMatrix(); b.lookAt(x, y, z); C.updateMatrixWorld(true); shot(nm, 640, 1.8); C.fov = kf; C.updateProjectionMatrix(); };
  let t = 0, nextLog = 0, did = {}, hpLost = 0, cut = 0, hp0 = b.state().hp, hitHim = null, phs = [];
  const shoot = new URLSearchParams(window.location.search).get('m') === 'shoot';
  for (let f = 0; f < 60 * 70; f++) {
    // you: 6 m off him, looking at him (or at a head near you, and cutting it)
    const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; cam.x = P.x + dx / d * 6; cam.z = P.z + dz / d * 6;
    let look = [P.x, P.y + 1.3, P.z];
    for (const h of heads()) {
      if (h.mode === 'dead' || h.mode === 'still' || h.mode === 'buried' || h.mode === 'chain' || h.off) continue;
      const W = h.body.getWorldPosition(new T()); if (W.distanceTo(cam) > 2.3) continue;
      look = [W.x, W.y, W.z]; b.lookAt(W.x, W.y, W.z); if (b.cryStrike(0.6)) cut++; break;
    }
    b.lookAt(...look);
    b.step(1 / 60); t += 1 / 60;
    if (b.state().hp < hp0) hpLost += hp0 - b.state().hp; b.heal(); hp0 = b.state().hp;
    const H = k.hang, ph = H ? H.ph : (k.hangDone ? 'after' : 'before');
    if (phs[phs.length - 1] !== ph) { phs.push(ph); log('phase', ph, 'at', t.toFixed(2), 's, his feet over the floor', (P.y - b.skrimFloorW(P.x, P.z)).toFixed(2)); }
    if (H && H.ph === 'throw' && H.C && !did.throw) { did.throw = 1; eye('hang_throw', P.x, P.y + 3, P.z); side('hang_throw_side'); }
    if (H && H.ph === 'hang' && H.t > 0.3 && !did.up) {
      did.up = 1; eye('hang_up', P.x, P.y + 1.2, P.z); side('hang_up_side');
      log('anchor', H.A.toArray().map((q) => q.toFixed(2)).join(','), 'floor', b.skrimFloorW(P.x, P.z).toFixed(2), 'chain length', H.C && b.skcLen && b.skcLen(H.C).toFixed(2));
      const hp1 = u.st.hp; b.hurtMutantTest(u, 10); hitHim = hp1 + ' -> ' + u.st.hp;
    }
    const onC = heads().filter((h) => h.mode === 'chain');
    if (onC.length && onC[0].ca > 3 && !did.crab) {
      did.crab = 1; const W = onC[0].body.getWorldPosition(new T());
      eye('hang_crab_eye', W.x, W.y, W.z); side('hang_crab_side');
      const keep = cam.clone(), kq = C.quaternion.clone(), kf = C.fov; C.fov = 35; C.updateProjectionMatrix();
      C.position.set(W.x + (cam.x - W.x) / 3, W.y - 0.6, W.z + (cam.z - W.z) / 3); C.lookAt(W); C.updateMatrixWorld(true); shot('hang_crab_close', 640, 2.2);
      C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix();
    }
    if (heads().some((h) => h.mode === 'leap' && h.off && h.t > 0.15) && !did.drop) { did.drop = 1; const h = heads().find((q) => q.mode === 'leap' && q.off); const W = h.body.getWorldPosition(new T()); eye('hang_drop', W.x, W.y, W.z); }
    if (shoot && H && H.ph === 'hang' && H.t > 1.6 && !did.shot) {
      did.shot = t; const hp1 = u.st.hp, d0 = new T(P.x - cam.x, 0, P.z - cam.z).normalize();
      b.skrimShot(u, d0); b.hurtMutantTest(u, 7, 0.5); log('SHOT at', t.toFixed(2), 'his hp', hp1, '->', u.st.hp, 'phase now', k.hang && k.hang.ph, 'feet', (P.y - b.skrimFloorW(P.x, P.z)).toFixed(2));
    }
    if (shoot && H && H.ph === 'fall' && H.t > 0.35 && !did.fallShot) { did.fallShot = 1; eye('shot_fall', P.x, P.y + 1, P.z); }
    if (shoot && H && H.ph === 'down' && H.t > 0.3 && !did.downShot) { did.downShot = 1; eye('shot_down', P.x, P.y + 0.8, P.z); const hp2 = u.st.hp; b.hurtMutantTest(u, 5, 0.6); log('cut him while down', hp2, '->', u.st.hp); }
    if (ph === 'lower' && H.t > 0.6 && !did.low) { did.low = 1; eye('hang_lower', P.x, P.y + 1.2, P.z); }
    // close on him from along the gut and from across it: his weight on his fist, the swing, the chain
    for (const [tag, ph0, t0] of [['reel', 'reel', 0.3], ['catch', 'hang', 0.12], ['h1', 'hang', 0.7], ['h2', 'hang', 1.5], ['h3', 'hang', 4.2]]) {
      if (!H || H.ph !== ph0 || H.t < t0 || did['c' + tag]) continue; did['c' + tag] = 1;
      const keep = cam.clone(), kq = C.quaternion.clone(), kf = C.fov, cy = P.y + 1.4;
      for (const [nm, ox, oz] of [['z', 0.8, 7.5], ['x', 7.5, -0.6]]) {
        C.fov = 42; C.updateProjectionMatrix(); C.position.set(P.x + ox, cy + 0.3, P.z + oz); C.lookAt(P.x, cy + 0.4, P.z); C.updateMatrixWorld(true); shot('hc_' + tag + '_' + nm, 480, 1.8);
      }
      C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix();
    }
    if (t >= nextLog) { nextLog += 0.5; log(' t', t.toFixed(1), ph, 'feet', (P.y - b.skrimFloorW(P.x, P.z)).toFixed(2), 'heads', heads().map((h) => h.mode[0] + h.mode[1] + (h.mode === 'chain' ? h.ca.toFixed(1) : '')).join(' '), 'act', k.act && k.act.name, 'hp', u.st.hp, H && H.b ? 'swing ' + H.b.length().toFixed(2) + ' bounce ' + H.yb.toFixed(2) + ' chain sway ' + H.c.length().toFixed(2) + ' fist->chain end ' + (b.SKC.list.includes(H.C) ? H.C.pts[0].distanceTo(u.model.getObjectByName('Character1_LeftHand').getWorldPosition(new T())).toFixed(3) : '-') : ''); }
    if (ph === 'after' && !did.end) { did.end = t; }
    if (did.end && t > did.end + 6) break;
  }
  const ev = {}; for (const e of (b.CRY.log || [])) ev[e.ev] = (ev[e.ev] || 0) + 1;
  { const hs = heads().filter((h) => h.mode === 'still').slice(0, 2);
    hs.forEach((h, i) => { const W = h.body.getWorldPosition(new T()), fy = b.skrimFloorW(W.x, W.z); C.fov = 50; C.updateProjectionMatrix();
      C.position.set(W.x + 1.4, fy + 0.45, W.z + 0.6); C.lookAt(W.x, fy + 0.1, W.z); C.updateMatrixWorld(true); shot('dead_head_' + i, 480, 1.8); }); }
  log('his heads at the end:', heads().map((h) => { const W = h.body.getWorldPosition(new T()); return h.i + ' ' + h.mode + ' over the floor ' + (W.y - b.skrimFloorW(W.x, W.z)).toFixed(2); }).join(' | '));
  log('phases', phs.join(' > '), '| hit him while hung', hitHim, '| heads cut', cut, '| your hp lost', hpLost, '| events', JSON.stringify(ev), '| his hook back in his fist', b.SKC && b.SKC.hookSrc && b.SKC.hookSrc.visible, 'chains', b.SKC && b.SKC.list.length);
}

// THE BREACH'S FLOOR MEETING THE SAND (2026-11-15, the owner's screenshot from inside her, looking out along the tear:
// "make this part where the boat connects to sand look better") — from in the hold, out over the broken floor
export async function breachSeam({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const C = b.camera, S = b.shipwreck, V = b.THREE.Vector3;
  C.position.set(b.SHIP_X + 12, 1.7, b.SHIP_Z); b.camBaseY = 1.7;
  for (let i = 0; i < 400 && !(S.userData.wheel && b.shipBrkS().length > 20); i++) { b.frame(1); await sleep(40); }
  w.__clockOn(); for (let i = 0; i < 20; i++) w.__adv(1);
  S.updateMatrixWorld(true);
  const L = (x, y, z) => S.localToWorld(new V(x, y, z));
  const at = (n, p, t, g = 1.0) => { C.position.copy(p); C.lookAt(t); C.updateMatrixWorld(true); shot('bs_' + n, 800, g); };
  const q = new URLSearchParams(location.search).get('v') || '';
  // his shot: stood at the breach's aft end on her floor, looking forward along it, the hold left and the beach right
  C.fov = 105; C.updateProjectionMatrix();
  // (or the far tear, the moon's side: its sand spill and its pool of moonlight)
  for (const [n, z, lz] of [['m1', 3.4, 4.6], ['m2', 3.9, 5.2], ['m3', 4.4, 5.6]]) at(n, L(-8.6, 1.9, z), L(-3.5, -0.3, lz), 1.5);
  at('m4', L(-7.0, 1.0, 3.6), L(-2.5, -0.1, 5.0), 1.5);
  at('farOut', L(-0.8, 1.3, -7.6), L(-0.8, 0.2, -3.6), 1.5);
  at('farIn', L(-0.8, 1.0, -1.8), L(-0.8, -0.1, -5.5), 1.5);
  const rc = new b.THREE.Raycaster();
  for (const [nm, x, y] of [['pale', 0.8, -0.78], ['pale2', 0.6, -0.55], ['hump', 0.55, -0.11], ['floorEnd', 0.125, -0.69], ['floorEnd2', 0.3, -0.4], ['hump2', 0.85, -0.2]]) {
    rc.setFromCamera(new b.THREE.Vector2(x, y), C);
    const h = rc.intersectObjects(b.scene.children, true).filter((o) => o.object.visible && o.object.name !== 'hitProxy' && o.distance > 0.3).slice(0, 3);
    const chain = (o) => { const r = []; for (let q = o, k = 0; q && k < 4; q = q.parent, k++) r.push(q.name || q.type); return r.join('<'); };
    log(nm, h.map((o) => chain(o.object) + ' col:' + (o.object.material && o.object.material.color ? o.object.material.color.getHexString() : '-') + ' mat:' + (o.object.material && (o.object.material.name || o.object.material.type)) + ' d' + o.distance.toFixed(2) + ' y' + o.point.y.toFixed(2)).join(' | '));
  }
  log('ship rot', S.rotation.y.toFixed(2), q);
}

// THE CROW'S BONES AND ITS SHAPE THROUGH THE CLIP (2026-11-15, for the crow that takes Henry): bone names, and at each
// time its box in its own frame (+Z beak) and where its feet are, in metres at the dock's size
export async function crowShape({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const K = b.CROW, C = b.camera;
  for (let i = 0; i < 600 && !(K.g && K.act); i++) { C.position.set(-2.7, 3.44, -216.4); b.frame(2); await sleep(20); }
  const sk = K.mesh.skeleton; log('bones', sk.bones.map((x) => x.name).join(' '));
  const T = b.THREE, v = new T.Vector3(), P = K.mesh.geometry.attributes.position;
  const inv = new T.Matrix4();
  for (const t of [3.5, 6.6, 6.8, 7.0, 7.2, 7.5, 7.8, 8.1, 8.4, 8.8, 9.0, 9.3, 9.6, 9.8, 10.2]) {
    K.act.time = t; K.mixer.update(0); K.g.updateMatrixWorld(true); sk.update();
    inv.copy(K.g.matrixWorld).invert();
    const lo = new T.Vector3(1e9, 1e9, 1e9), hi = new T.Vector3(-1e9, -1e9, -1e9);
    for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); K.mesh.applyBoneTransform(i, v); v.applyMatrix4(K.mesh.matrixWorld).applyMatrix4(inv); lo.min(v); hi.max(v); }
    const feet = sk.bones.filter((x) => /foot|toe|claw|leg/i.test(x.name)).map((x) => { x.getWorldPosition(v); v.applyMatrix4(inv); return x.name.replace('CROW_', '') + '@' + v.toArray().map((q) => q.toFixed(2)).join(','); });
    log('t', t, 'box x', lo.x.toFixed(2), hi.x.toFixed(2), 'y', lo.y.toFixed(2), hi.y.toFixed(2), 'z', lo.z.toFixed(2), hi.z.toFixed(2), '| span', (hi.x - lo.x).toFixed(2), '|', feet.slice(0, 6).join(' '));
  }
  log('group scale', K.g.scale.x, 'm scale', K.m.scale.x.toFixed(4));
}

// THE CROW THAT TAKES HENRY OFF THE JETTY (2026-11-15, the eagle's replacement): its cut clips, its size, and the take
// in stills — stood behind him, talked to, the last line clicked off
export async function hjCrow({ w, b, log, sleep, shot }) {
  await w.eval(await (await fetch('/tools/hjshot.js?' + Date.now())).text());
  log('boot', JSON.stringify(await w.__hjBoot()));
  const G = b.hjG(), B = G.bird;
  if (!B) { log('no bird'); return; }
  const src = B.m; let sk = null; src.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
  log('clips', Object.entries(B.A).map(([k, a]) => k + ':' + a.getClip().duration.toFixed(2) + 's/' + a.getClip().tracks.length + 'tr').join(' '), 'feet', B.feet.map((f) => f.name).join(','), 'm scale', B.m.scale.x.toFixed(4));
  w.__hjTalk();
  for (let i = 0; i < 10; i++) { const c = w.document.querySelectorAll('#dialog .choice'); if (c.length) w.__hjChoose(0); else w.__hjClick(); if (b.hjS().cut) break; }
  log('cut', JSON.stringify(b.hjS()));
  const V = b.THREE.Vector3;
  for (const T of [0.3, 0.6, 0.8, 1.2, 2.0, 3.5, 6.0, 8.5]) {
    for (let n = 0; n < 3000 && b.hjS().cut && b.hjS().t < T; n++) w.__adv(1);
    const fe = new V(), hd = new V(); B.feet.forEach((f) => fe.add(f.getWorldPosition(new V()))); fe.multiplyScalar(0.5);
    G.hj.B.CC_Base_L_Hand.getWorldPosition(hd);
    log('t', T, b.hjS().cut, 'bird', B.g.position.toArray().map((v) => v.toFixed(1)).join(','), 'clip', B.cur && B.cur.getClip().name, 'feet-hand', fe.distanceTo(hd).toFixed(2), 'cam d', B.g.position.distanceTo(b.camera.position).toFixed(1));
    shot('hj_' + T, 640, 1.6);
  }
}

// THE MERCHANT'S GUN IN HIS HAND (2026-11-15, the owner: "make the gun fit better in the merchants hand when he shoots
// you it looks weird and off"): the draw stopped before the shot, seen from where you stand and from his side
export async function merchGun({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 300 && !(b.traderBonesS() && b.traderBonesS().upper_armR && b.magModel && b.magModel.children.length); i++) { b.frame(1); await sleep(40); }
  const T = b.THREE, C = b.camera, W = b.traderWorld, R = b.TRADER_RAGE;
  W.updateMatrixWorld(true); const tp = new T.Vector3(); W.getWorldPosition(tp);
  const me = new T.Vector3(tp.x - 1.6, tp.y + 1.62, tp.z + 0.3);
  const stand = () => { C.position.copy(me); b.camBaseY = me.y; b.lookAt(tp.x, tp.y + 1.45, tp.z); };
  stand(); b.frame(2);
  w.__clockOn();
  R.n = 1; b.traderStruck(1, tp.clone().setY(tp.y + 1.2));
  log('busy', R.busy, 'gun', !!R.gun);
  const B = b.traderBonesS(), P = (o) => o.getWorldPosition(new T.Vector3());
  const views = (tag) => {
    stand(); C.updateMatrixWorld(true); shot('mg_' + tag + '_you', 640, 1.6);
    const ha = P(B.handR);
    { const f0 = C.fov; C.fov = 16; C.updateProjectionMatrix(); C.lookAt(ha); C.updateMatrixWorld(true); shot('mg_' + tag + '_youZoom', 640, 1.8); C.fov = f0; C.updateProjectionMatrix(); }
    // from his right, level with the hand, and close behind his shoulder
    const side = new T.Vector3().subVectors(me, tp).setY(0).normalize(), rt = new T.Vector3(-side.z, 0, side.x);
    for (const [n, off] of [['side', rt.clone().multiplyScalar(0.5)], ['side2', rt.clone().multiplyScalar(-0.5)], ['over', side.clone().multiplyScalar(-0.35).addScaledVector(rt, 0.2).setY(0.25)]]) {
      const sv = C.position.clone(); C.position.copy(ha).add(off); C.lookAt(ha); C.updateMatrixWorld(true); shot('mg_' + tag + '_' + n, 640, 1.8); C.position.copy(sv);
    }
    { const f0 = C.fov; C.fov = 30; C.updateProjectionMatrix();
      for (const [n, off] of [['tightR', rt.clone().multiplyScalar(0.42)], ['tightL', rt.clone().multiplyScalar(-0.42)], ['tightUnder', rt.clone().multiplyScalar(0.25).setY(-0.32)]]) {
        const sv = C.position.clone(); C.position.copy(ha).add(off); C.lookAt(ha); C.updateMatrixWorld(true); shot('mg_' + tag + '_' + n, 640, 2.0); C.position.copy(sv);
      }
      C.fov = f0; C.updateProjectionMatrix(); }
    if (R.gun) { const gp = R.gun.getWorldPosition(new T.Vector3()); log(tag, 'gun origin to palm', gp.distanceTo(b.traderPalm ? b.traderPalm(new T.Vector3()) : ha).toFixed(3), 'to hand bone', gp.distanceTo(ha).toFixed(3)); }
  };
  for (let f = 0; f < 60 && R.t < 1.2; f++) { stand(); w.__adv(1); }
  const meas = (tag) => {
    const g = R.gun; g.updateMatrixWorld(true);
    const q = g.getWorldQuaternion(new T.Quaternion()), ax = (x, y, z) => new T.Vector3(x, y, z).applyQuaternion(q);
    const fa = P(B.forearmR), ha = P(B.handR), mid = B.f_middle01R ? P(B.f_middle01R) : ha, th = B.thumb01R ? P(B.thumb01R) : ha, pk = B.f_pinky01R ? P(B.f_pinky01R) : ha;
    const arm = ha.clone().sub(fa).normalize(), hand = mid.clone().sub(ha).normalize(), toMe = me.clone().sub(ha).normalize();
    const across = th.clone().sub(pk).normalize();                // pinky → thumb, across the knuckles
    const palmN = new T.Vector3().crossVectors(hand, across).normalize();
    const deg = (a2, b2) => (Math.acos(Math.max(-1, Math.min(1, a2.dot(b2)))) * 180 / Math.PI).toFixed(0);
    const bar = ax(1, 0, 0), up = ax(0, 1, 0), sd = ax(0, 0, 1);
    log(tag, 'barrel vs forearm', deg(bar, arm), 'vs hand', deg(bar, hand), 'vs to-you', deg(bar, toMe), '| gun up vs palm normal', deg(up, palmN), 'vs -palmN', deg(up, palmN.clone().negate()), 'vs across', deg(up, across), '| gun side vs across', deg(sd, across), '| hand vs forearm', deg(hand, arm));
    // where the gun's grip is: the model's lowest point in its own frame, and the barrel's far end
    const box = new T.Box3(); const inv = g.matrixWorld.clone().invert(), v = new T.Vector3();
    g.traverse((o) => { if (o.isMesh && o.geometry) { const pa = o.geometry.attributes.position; o.updateMatrixWorld(true); for (let i = 0; i < pa.count; i += 7) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); box.expandByPoint(v); } } });
    log(tag, 'gun local box (its units)', box.min.toArray().map((x) => x.toFixed(2)).join(','), '→', box.max.toArray().map((x) => x.toFixed(2)).join(','), 'scale', g.scale.x.toFixed(3));
  };
  meas('aim');
  { // the grip and his hand, in the gun's own frame, in metres
    const g = R.gun; g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), sc = g.scale.x, v = new T.Vector3(), pts = [];
    g.traverse((o) => { if (o.isMesh && o.geometry) { const pa = o.geometry.attributes.position, ix = o.geometry.index; const seen = new Set(); const n = ix ? ix.count : pa.count; for (let q = 0; q < n; q += 3) { const i = ix ? ix.getX(q) : q; if (seen.has(i)) continue; seen.add(i); v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).multiplyScalar(sc); if (v.length() < 0.5) pts.push(v.clone()); } } });
    const lo = Math.min(...pts.map((p2) => p2.y)), hi = Math.max(...pts.map((p2) => p2.y)), xs = pts.map((p2) => p2.x);
    log('gun body (m, its frame, near the origin): x', Math.min(...xs).toFixed(3), Math.max(...xs).toFixed(3), 'y', lo.toFixed(3), hi.toFixed(3), 'n', pts.length);
    for (const [y0, y1] of [[lo, lo + 0.02], [lo + 0.02, lo + 0.04], [lo + 0.04, lo + 0.06], [lo + 0.06, lo + 0.08], [lo + 0.08, lo + 0.10], [lo + 0.10, hi]]) {
      const band = pts.filter((p2) => p2.y >= y0 && p2.y < y1); if (!band.length) continue;
      log('  y', y0.toFixed(3), '..', y1.toFixed(3), 'x', Math.min(...band.map((p2) => p2.x)).toFixed(3), '..', Math.max(...band.map((p2) => p2.x)).toFixed(3), 'n', band.length);
    }
    for (const nm of ['handR', 'f_index01R', 'f_middle01R', 'f_middle02R', 'f_middle03R', 'f_pinky01R', 'thumb01R', 'thumb03R']) { if (!B[nm]) continue; const q2 = P(B[nm]).applyMatrix4(inv).multiplyScalar(sc); log('  bone', nm, q2.toArray().map((x) => x.toFixed(3)).join(',')); }
  }
  views('aim');
}

// THE CASTLE MERCHANT'S TELEPORT FROM A FRESH START (2026-11-15, "why when i teleport to the castle sometimes its not
// there"): the castle's state at the teleport, the black held, and when it is built and shown
export async function castleTp({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  await sleep(1500);
  const bo = () => w.document.getElementById('blackout').style.opacity;
  log('before: fort', JSON.stringify(b.fortState()));
  const ok = b.devTeleportShop(2), t0 = performance.now();
  log('teleported', ok, 'black', bo(), 'cam', b.camera.position.toArray().map((v) => v.toFixed(1)).join(','));
  let shown = 0;
  for (let i = 0; i < 1500; i++) {
    b.frame(1); await sleep(20);
    const F = b.fortState();
    if (i % 100 === 0) log('t', ((performance.now() - t0) / 1000).toFixed(1), 'ready', F.ready, 'vis', F.vis, 'black', bo());
    if (F.ready && F.vis && bo() === '0') { shown = performance.now() - t0; break; }
  }
  log('castle shown after', (shown / 1000).toFixed(1), 's; cam', b.camera.position.toArray().map((v) => v.toFixed(1)).join(','));
  for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
  b.look(Math.PI, 0.05); b.frame(1); shot('ct_down', 640, 1.4);
}

// AND FROM A CHECKPOINT LOAD (2026-11-15): a fast load waits only for what is near the save and the castle comes in
// behind you — saved at the spawn, reloaded into it, and the castle merchant's teleport taken at once
export async function castleTpCp({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  await sleep(1000);
  (b.saveCheckpoint || b.autosaveNow)();
  log('saved', !!localStorage.getItem('beachwalk.save'));
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
  const f = document.getElementById('g'); f.contentWindow.location.reload();
  await sleep(500);
  let w2 = null, b2 = null; for (let i = 0; i < 600; i++) { await sleep(50); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) { b2 = w2.__bw; break; } } catch (e) {} }
  for (let i = 0; i < 600 && !b2.state().started; i++) { try { b2.beginGame(); } catch (e) {} await sleep(100); }
  try { await b2.audioCtx.suspend(); } catch (e) {}
  const bo = () => w2.document.getElementById('blackout').style.opacity;
  for (let i = 0; i < 400 && bo() === '1'; i++) await sleep(50);
  log('reloaded: fort', JSON.stringify(b2.fortState()), 'left', b2.startGate ? b2.startGate().left : '?');
  const ok = b2.devTeleportShop(2), t0 = performance.now();
  log('teleported', ok, 'black', bo());
  let shown = 0, blackAll = true;
  for (let i = 0; i < 2000; i++) {
    await sleep(25);
    const F = b2.fortState();
    if (!F.ready && bo() !== '1') blackAll = false;
    if (i % 80 === 0) log('t', ((performance.now() - t0) / 1000).toFixed(1), 'ready', F.ready, 'vis', F.vis, 'black', bo());
    if (F.ready && F.vis && bo() === '0') { shown = performance.now() - t0; break; }
  }
  log('castle shown after', (shown / 1000).toFixed(1), 's; black the whole wait', blackAll, '; cam', b2.camera.position.toArray().map((v) => v.toFixed(1)).join(','));
  await sleep(500);
  b2.look(0, 0.05); b2.frame(1); b2.renderer.render(b2.scene, b2.camera);
  const src = b2.renderer.domElement, c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * src.height / src.width);
  const g2 = c.getContext('2d'); g2.filter = 'brightness(1.4)'; g2.drawImage(src, 0, 0, c.width, c.height);
  const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'ct_cp', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}

// THE EAGLE AND THE CROW THAT REPLACED IT, HUNG THE SAME? (2026-11-15, "the crow that grabs henry glitches into the
// ground i want it to have the same pathing as the old eagle"): each bird's feet and its lowest and highest points from
// its group's origin (which the flight keys move), through each of its clips. The eagle is read from git into
// tmp-preview/eagle-ref.glb for this and deleted after.
export async function birdHang({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  await w.eval(await (await fetch('/tools/hjshot.js?' + Date.now())).text());
  await w.__hjBoot();
  const T = b.THREE, v = new T.Vector3();
  const measure = (tag, g, m, mixer, acts, feetRe) => {
    let sk = null; m.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
    const feet = sk.skeleton.bones.filter((x) => feetRe.test(x.name));
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
    for (const [name, a] of Object.entries(acts)) {
      const dur = a.getClip().duration;
      for (const f of [0, 0.25, 0.5, 0.75]) {
        mixer.stopAllAction(); a.reset(); a.play(); a.time = dur * f; mixer.update(0); g.updateMatrixWorld(true); sk.skeleton.update();
        let lo = 1e9, hi = -1e9, x0 = 1e9, x1 = -1e9; const P = sk.geometry.attributes.position;
        for (let i = 0; i < P.count; i += 2) { v.fromBufferAttribute(P, i); sk.applyBoneTransform(i, v); v.applyMatrix4(sk.matrixWorld); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); }
        const fp = new T.Vector3(); feet.forEach((x) => fp.add(x.getWorldPosition(v.clone()))); fp.multiplyScalar(1 / Math.max(1, feet.length));
        let bx0 = 1e9, bx1 = -1e9; for (const bn of sk.skeleton.bones) { bn.getWorldPosition(v); bx0 = Math.min(bx0, v.x); bx1 = Math.max(bx1, v.x); }
        const xsAll = []; for (let i = 0; i < P.count; i += 2) { v.fromBufferAttribute(P, i); sk.applyBoneTransform(i, v); v.applyMatrix4(sk.matrixWorld); xsAll.push(v.x); } xsAll.sort((p1, p2) => p1 - p2);
        const q = (r) => xsAll[Math.floor(r * (xsAll.length - 1))];
        log(tag, name, 'bones x', bx0.toFixed(2), bx1.toFixed(2), '| verts x 0.5%/99.5%', q(0.005).toFixed(2), q(0.995).toFixed(2), 'min/max', q(0).toFixed(2), q(1).toFixed(2), 'meshes', (() => { let n = 0; m.traverse((o) => { if (o.isSkinnedMesh) n++; }); return n; })());
        log(tag, name, (dur * f).toFixed(2) + '/' + dur.toFixed(2), 'feet', fp.toArray().map((q) => q.toFixed(2)).join(','), 'y', lo.toFixed(2), hi.toFixed(2), 'span', (x1 - x0).toFixed(2));
      }
    }
  };
  // the crow, as the game built it
  const B = b.hjG().bird; measure('crow', B.g, B.m, B.mixer, B.A, /_[LR]_Foot_/);
  // the eagle, as the old loader built it
  const { GLTFLoader } = await w.eval("import('three/addons/loaders/GLTFLoader.js')");
  const rsp = await w.fetch('/tmp-preview/eagle-ref.glb?' + Date.now()), buf = await rsp.arrayBuffer();   // (fetched IN the game's frame: its GLTFLoader asks `instanceof ArrayBuffer` of its own realm)
  log('eagle file', rsp.status, buf.byteLength, String.fromCharCode(...new Uint8Array(buf, 0, 4)));
  await new Promise((res) => new GLTFLoader().parse(buf, '', (gltf) => {
    const m = gltf.scene, g = new T.Group(); g.add(m); g.rotation.order = 'YXZ'; g.scale.setScalar(1.1); b.scene.add(g);
    const mixer = new T.AnimationMixer(m), A = {}; for (const c of gltf.animations) A[c.name] = mixer.clipAction(c);
    const keep = {}; for (const k of ['gliding', 'landing', 'fly']) if (A[k]) keep[k] = A[k];
    log('eagle clips', Object.keys(A).join(' '));
    measure('eagle', g, m, mixer, keep, /^foot[lr]_/); res();
  }, (e) => { log('eagle parse failed', e && e.message); res(); }));
}

// why the jetty crow's load-time span (6.83) is not its posed span (12.7): the same measure, posed and at its bind pose
export async function birdSpan({ w, b, log, sleep }) {
  b.settings.devMode = true;
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  await w.eval(await (await fetch('/tools/hjshot.js?' + Date.now())).text());
  await w.__hjBoot();
  const T = b.THREE, B = b.hjG().bird, m = B.m, v = new T.Vector3(); let sk = null; m.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
  const span = () => { m.updateMatrixWorld(true); sk.skeleton.update(); let x0 = 1e9, x1 = -1e9; const P = sk.geometry.attributes.position; for (let i = 0; i < P.count; i += 7) { v.fromBufferAttribute(P, i); sk.applyBoneTransform(i, v); v.applyMatrix4(sk.matrixWorld); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); } return (x1 - x0).toFixed(2); };
  B.g.position.set(0, 0, 0); B.g.rotation.set(0, 0, 0);
  log('m.scale', m.scale.x.toFixed(4), 'g.scale', B.g.scale.x, 'bindMode', sk.bindMode);
  B.mixer.stopAllAction(); B.A.gliding.reset().play(); B.A.gliding.time = 0.4; B.mixer.update(0); log('posed (update 0)', span());
  B.mixer.update(0.01); log('posed (update 0.01)', span());
  sk.skeleton.pose(); log('bind pose', span());
  B.mixer.stopAllAction(); B.mixer.update(0); log('after stopAll + update 0', span());
}

// THE CAVE-IN AS PLAYED (not dev mode), on the real clock with everything loaded: every frame over 25 ms with how black
// the screen was on it (2026-11-15, the performance pass: is the catacombs' build under the black?)
export async function caveInPerf({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = false;
  w.requestAnimationFrame = () => 0;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  b.camera.position.set(6, 1.7, b.CAVE_Z + 2); b.camBaseY = 1.7;
  for (let i = 0; i < 60; i++) { b.frame(1); await tick(); }
  const bo = () => +(w.document.getElementById('blackout').style.opacity || 0);
  b.startCaveIn();
  let prev = performance.now(); const slow = []; const t0 = prev;
  for (let i = 0; i < 900; i++) {
    const RI = b.renderer.info, pg0 = RI.programs.length, tx0 = RI.memory.textures, ge0 = RI.memory.geometries, lg0 = b.lagTime(8).length;
    const op0 = bo(); const ta = performance.now(); b.frame(1); const tb = performance.now();
    const d = tb - prev; prev = tb;
    const dp = RI.programs.length - pg0;
    if (d > 25) slow.push([((ta - t0) / 1000).toFixed(2), Math.round(d), op0.toFixed(2), bo().toFixed(2), 'progs ' + dp + ' ' + (dp > 0 ? RI.programs.slice(-dp).map((p2) => p2.name).join('/') : ''), 'tex ' + (RI.memory.textures - tx0), 'geo ' + (RI.memory.geometries - ge0), b.lagTime(8).slice(lg0).map((e) => e[2] + ' ' + e[1]).join(' | ')]);
    await tick();
  }
  log('cave-in frames over 25 ms [t s, ms, black before, black after]:', JSON.stringify(slow));
}

// WHAT DRESSING A CREATURE COSTS (?k=skrim, 2026-11-15, the performance pass): a fresh copy made far off, the profiler
// over its parse and dressing, the functions under `dressMutant` by inclusive and self samples (1 ms each)
export async function dressProf({ w, b, log, sleep }) {
  const kind = new URLSearchParams(location.search).get('k') || 'skrim';
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  const P = new w.Profiler({ sampleInterval: 1, maxBufferSize: 600000 });
  const u = b.makeMutant(40, 9000, kind, 0);
  for (let i = 0; i < 400 && !u.ready; i++) { b.frame(1); await sleep(16); }
  const tr = await P.stop();
  log('ready', !!u.ready, 'lag', JSON.stringify(b.lagTime(16).slice(-6)));
  const nm = (fi) => { const f = tr.frames[fi]; return (f.name || '(anon)') + ':' + (f.line || 0); };
  const self = new Map(), incl = new Map(); let n = 0;
  for (const smp of tr.samples) {
    if (smp.stackId == null) continue;
    let under = false; for (let id = smp.stackId; id != null; id = tr.stacks[id].parentId) if (/^dressMutant:/.test(nm(tr.stacks[id].frameId))) { under = true; break; }
    if (!under) continue; n++;
    const k = nm(tr.stacks[smp.stackId].frameId); self.set(k, (self.get(k) || 0) + 1);
    const seen = new Set(); for (let id = smp.stackId; id != null; id = tr.stacks[id].parentId) { const kk = nm(tr.stacks[id].frameId); if (!seen.has(kk)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + 1); } }
  }
  const top = (m, k) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, k).map(([kk, v]) => kk + ' ' + v).join(' · ');
  log('samples under dressMutant', n);
  log('INCL', top(incl, 30));
  log('SELF', top(self, 15));
}

// THE RETARGET'S NEW LOOP AGAINST ITS OLD ONE (2026-11-15; the old one and the hook are gone from main.js since — put
// them back from git to rerun): booted with &ls=bw.ntarCheck:1 every creature's clips are
// built both ways and compared value by value; then a fresh Skrim, a crawler and a knight dressed on top
export async function ntarCheck({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  for (const k of ['skrim', 'crawler', 'knight', 'orc', 'umbra', 'demon']) { try { const u = b.makeMutant(40 + Math.random(), 9000, k, 0); for (let i = 0; i < 300 && !u.ready; i++) { b.frame(1); await sleep(16); } } catch (e) { log('kind', k, 'failed', e.message); } }
  for (let i = 0; i < 120; i++) { b.frame(1); await sleep(16); }
  log('NTAR', JSON.stringify(b.ntarDiff()));
}

// THE PUPPETEER'S STRETCH SHOWS WHERE IT ALWAYS DID (2026-11-15: built at boot now, hidden till its lines): walked down
// from -560 to -700, when the gully group and the house are first drawn, and a still past both
export async function elvShow({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true;
  const find = (n) => { let r = null; b.scene.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
  const F = find('elvLand'), H = find('puppetHouse');
  log('built at boot: gully', !!F, 'house', !!H, 'visible', F && F.visible, H && H.visible);
  let fAt = null, hAt = null;
  for (let z = -560; z > -700; z -= 0.5) {
    b.camera.position.set(8, 1.7, z); b.camBaseY = 1.7; b.frame(1);
    if (fAt === null && F && F.visible) fAt = z;
    if (hAt === null && H && H.visible) hAt = z;
  }
  log('gully first visible at z', fAt, '(built at ELV.z + 40 = -600 before) · house at z', hAt, '(asked at -628.5 before)');
  b.camera.position.set(9, 1.7, -655); b.camBaseY = 1.7; b.lookAt(30, 2, -716); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(16); }
  shot('elv_after', 640, 1.5);
}

// HITTING THE DEAD IN THE WATER (2026-11-15, "make it so i can slice and hit the mutants bodies in the water"): the deep
// restored, the camera put 1.6 m off a floating body looking at it, the katana swung; what moved, what came off, blood
export async function deadHit({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  b.settings.devMode = true;
  b.plioLoad(); b.deadLoad();
  for (let i = 0; i < 600 && !(b.plioS().ready && b.dead.gltf); i++) { b.frame(2); await sleep(100); }
  b.deepRestore(); w.__clockOn();
  for (let i = 0; i < 30; i++) w.__adv(1);
  const D = b.dead, C = b.camera, T = b.THREE;
  if (!b.inventory.includes(b.katanaItem)) b.inventory.push(b.katanaItem);
  if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem);
  log('equipped', b.state().equipped, 'bodies', D.bodies.length, 'pieces', D.pieces.length);
  const res = [];
  for (const [bi, label] of [[0, 'body0'], [2, 'body2']]) {
    const body = D.bodies[bi], P = body.piece;
    const aim = () => { const d = new T.Vector3(1, 0.1, 0.3).normalize(); C.position.copy(P.p).addScaledVector(d, -1.7); b.camBaseY = C.position.y; b.lookAt(P.p.x, P.p.y, P.p.z); };
    aim(); for (let i = 0; i < 6; i++) { aim(); w.__adv(1); }
    const p0 = P.p.clone(), cut0 = body.cut.size, pieces0 = D.pieces.length;
    shot('dh_' + label + '_before', 640, 1.8);
    for (let s = 0; s < 3; s++) {
      aim(); b.startDig(s === 2 ? 1 : 0);
      for (let f = 0; f < 50; f++) { if (f < 20) aim(); w.__adv(1); }
    }
    for (let f = 0; f < 30; f++) w.__adv(1);
    res.push(label + ': moved ' + P.p.distanceTo(p0).toFixed(2) + ' m, limbs cut ' + (body.cut.size - cut0) + ', pieces ' + pieces0 + '→' + D.pieces.length + ', flail ' + P.flail.toFixed(2));
    aim(); w.__adv(1); shot('dh_' + label + '_after', 640, 1.8);
  }
  log('HIT', res.join(' | '));
  log('worst deadStep ms', (D.msMax || 0).toFixed(2));
  // the newest limb, close
  const L = D.pieces[D.pieces.length - 1]; L.o.geometry.computeBoundingSphere();
  log('newest piece', L.kind, 'r', L.r.toFixed(2), 'verts', L.o.geometry.attributes.position.count, 'mat', L.o.material.type, L.o.material.emissiveIntensity);
  const d = new T.Vector3(0.3, 0.4, 1).normalize(); C.position.copy(L.p).addScaledVector(d, 0.9); b.lookAt(L.p.x, L.p.y, L.p.z); w.__adv(1);
  shot('dh_limb', 640, 1.8);
}

// HIS MAILBOX (2026-11-15, "put a realistic mailbox right here i dont want people to miss the house"): from the owner's
// own spot (feet 12.44, -706.55, look -1.22), from the walk coming down the beach, and close
export async function mailbox({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true;
  w.requestAnimationFrame = () => 0;
  let mb = null; b.scene.traverse((o) => { if (o.name === 'elvMailbox') mb = o; });
  if (!mb) { log('no mailbox'); return; }
  const C = b.camera, T = b.THREE, V = new T.Vector3(); mb.getWorldPosition(V);
  log('mailbox at', V.toArray().map((x) => x.toFixed(2)).join(','));
  const at = async (n, x, y, z, lx, ly, lz, gain = 1.6) => {
    C.position.set(x, y, z); b.camBaseY = y;
    for (let i = 0; i < 12; i++) { C.position.set(x, y, z); b.camBaseY = y; b.lookAt(lx, ly, lz); b.frame(1); await sleep(10); }
    shot('mb_' + n, 640, gain);
  };
  await at('his', 12.44, 1.7, -706.55, 12.44 + Math.sin(1.22) * 5, 0.2, -706.55 - Math.cos(1.22) * 5);
  await at('walk30', 8, 1.7, -676, V.x, 1.0, V.z, 1.4);
  await at('walk12', 8.5, 1.7, -693, V.x, 1.0, V.z, 1.4);
  await at('close', V.x - 1.0, V.y + 1.45, V.z + 1.2, V.x, V.y + 1.0, V.z, 1.8);
  await at('side', V.x - 1.4, V.y + 1.3, V.z - 0.2, V.x, V.y + 1.0, V.z, 1.8);
}

// THE MAILBOX, CLOSE AND LARGE (2026-11-15, "dont make the mailbox look ai slop"): 1280-wide stills, three sides
export async function mailboxClose({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true; w.requestAnimationFrame = () => 0;
  let mb = null; b.scene.traverse((o) => { if (o.name === 'elvMailbox') mb = o; });
  const C = b.camera, V = new b.THREE.Vector3(); mb.getWorldPosition(V);
  const at = async (n, dx, dy, dz) => { for (let i = 0; i < 12; i++) { C.position.set(V.x + dx, V.y + dy, V.z + dz); b.camBaseY = C.position.y; b.lookAt(V.x, V.y + 1.08, V.z); b.frame(1); await sleep(10); } shot('mc_' + n, 1280, 1.7); };
  await at('front', -0.75, 1.3, 0.05);
  await at('name', -0.25, 1.25, 0.75);
  await at('back', 0.5, 1.35, -0.55);
}

// THE CLIP AT THE GULLY'S MOUTH (2026-11-15, the owner at feet (15.68, 0.41, -708.36) look -1.29: "I CLIP THROUGH THE
// SAND RIGHT HERE"): the walk's floor there and round it against the drawn ground (a ray down onto what is drawn),
// and how far the drawn sand is from the eye each way
export async function mouthClip({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true; w.requestAnimationFrame = () => 0;
  const T = b.THREE, C = b.camera;
  C.position.set(15.68, 2.11, -708.36); b.camBaseY = 2.11; for (let i = 0; i < 6; i++) b.frame(1);
  const meshes = []; b.scene.traverse((o) => { if (o.isMesh && o.visible && o.geometry && !/hitProxy/.test(o.name)) { let v = true; for (let q = o; q; q = q.parent) if (!q.visible) v = false; if (v) meshes.push(o); } });
  const rc = new T.Raycaster(); rc.firstHitOnly = false;
  const drawn = (x, z) => { rc.set(new T.Vector3(x, 40, z), new T.Vector3(0, -1, 0)); rc.far = 80; const h = rc.intersectObjects(meshes, false).filter((q) => q.object.name !== 'elvMailbox' && !/sky|fog|mist|Points/i.test(q.object.name + q.object.type)); return h.length ? [+h[0].point.y.toFixed(2), (h[0].object.name || h[0].object.parent && h[0].object.parent.name || '?')] : null; };
  const rows = [];
  for (const [dx, dz] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5], [1, 0], [0, -1], [1, -1]]) {
    const x = 15.68 + dx, z = -708.36 + dz, L = b.elvLandS(x, z, 0.41);
    rows.push(`(${x.toFixed(2)},${z.toFixed(2)}) inLand ${L[0]} floor ${L[1] === null ? '-' : L[1].toFixed(2)} drawn ${JSON.stringify(drawn(x, z))}`);
  }
  log('MOUTH', rows.join(' | '));
  const eye = new T.Vector3(15.68, 2.11, -708.36), dirs = [];
  for (let a = 0; a < 8; a++) { const yaw = a * Math.PI / 4; const d = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); rc.set(eye, d); rc.far = 5; const h = rc.intersectObjects(meshes, false)[0]; dirs.push(`${(yaw).toFixed(2)}:${h ? h.distance.toFixed(2) + ' ' + (h.object.name || '?') : '-'}`); }
  log('EYE horizontal hits', dirs.join(' | '));
  b.look(-1.29, -0.1); b.frame(1); shot('mc_his', 640, 1.6);
}

// THE WAY UP STILL WALKS (2026-11-15: the gully's floor read off its drawn mesh now): along the path's line every 0.2 m,
// the floor, and the steepest rise over run any step takes (the walk refuses a step over 1.15)
export async function gullyWalk({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  const P = b.ELV_PATH; let prev = null, worst = 0, at = '', n = 0, nul = 0;
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [cx, cz] = P[i], L = Math.hypot(cx - ax, cz - az);
    for (let s = 0; s < L; s += 0.2) {
      const x = ax + (cx - ax) * s / L, z = az + (cz - az) * s / L, f = b.elvLandS(x, z, 5)[1]; n++;
      if (f === null) { nul++; continue; }
      if (prev) { const r = (f - prev.f) / Math.max(1e-3, Math.hypot(x - prev.x, z - prev.z)); if (r > worst) { worst = r; at = x.toFixed(2) + ',' + z.toFixed(2); } }
      prev = { x, z, f };
    }
  }
  log('GULLY samples', n, 'off the land', nul, 'steepest rise/run', worst.toFixed(2), 'at', at, 'top floor', prev && prev.f.toFixed(2));
}

// WHERE EACH ITEM SITS IN THE INSPECT VIEW (2026-11-15, the owner: "ITEMS SHOULD START CENTERED WHEN INSPECTING"): every
// item on `__bw` with an inspect model, opened as the pack opens it, one frame drawn, and the box of its drawn pixels
// against the frame's middle (as a share of the frame: 0 is centred)
export async function inspectCentre({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  w.requestAnimationFrame = () => 0;
  const items = [], seen = new Set();
  for (const k of Object.keys(b)) { let v; try { v = b[k]; } catch (e) { continue; } if (v && typeof v === 'object' && v.inspectModel && v.name && !seen.has(v)) { seen.add(v); items.push(v); } }
  log('items with an inspect model', items.length);
  const cv = b.renderer.domElement, rows = [];
  const only = new URLSearchParams(location.search).get('only');
  for (const it of items) {
    if (only && !only.split(',').includes(it.name)) continue;
    const opts = it.inspectOpts ? it.inspectOpts() : {};
    b.openInspect(it.inspectModel, { ...opts, name: it.name, desc: '' });
    for (let i = 0; i < 3; i++) b.frame(1);
    if (b.inspectPivot) log('  dbg', it.name, 'pivot', b.inspectPivot.position.toArray().map((v) => +v.toFixed(3)).join(','), 'cam', b.inspectCamera.position.toArray().map((v) => +v.toFixed(2)).join(','), 'inspecting', b.state().inspecting);
    b.renderer.render(b.inspectScene, b.inspectCamera);
    const c2 = document.createElement('canvas'); c2.width = 320; c2.height = Math.round(320 * cv.height / cv.width);
    const g = c2.getContext('2d'); g.drawImage(cv, 0, 0, c2.width, c2.height);
    const d = g.getImageData(0, 0, c2.width, c2.height).data;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < c2.height; y++) for (let x = 0; x < c2.width; x++) { const o = (y * c2.width + x) * 4; if (Math.abs(d[o] - 5) + Math.abs(d[o + 1] - 7) + Math.abs(d[o + 2] - 14) > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    const cx = x1 >= 0 ? ((x0 + x1) / 2 / c2.width - 0.5) : NaN, cy = y1 >= 0 ? ((y0 + y1) / 2 / c2.height - 0.5) : NaN;
    rows.push([it.name, +cx.toFixed(3), +cy.toFixed(3), x1 >= 0 ? +((x1 - x0) / c2.width).toFixed(2) : 0, x1 >= 0 ? +((y1 - y0) / c2.height).toFixed(2) : 0]);
    if (Math.abs(cx) > 0.06 || Math.abs(cy) > 0.06 || only) {   // (the inspect frame itself: `shot` draws the world)
      g.strokeStyle = 'rgba(255,0,0,0.6)'; g.beginPath(); g.moveTo(c2.width / 2, 0); g.lineTo(c2.width / 2, c2.height); g.moveTo(0, c2.height / 2); g.lineTo(c2.width, c2.height / 2); g.stroke();
      g.strokeStyle = 'rgba(0,255,0,0.7)'; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      const dd = c2.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(dd.length / 8000);
      for (let q = 0; q < n; q++) console.log('[PBIMG]', 'insp_' + it.name.replace(/[^a-z0-9]+/gi, '_'), q + '/' + n, dd.slice(q * 8000, (q + 1) * 8000));
    }
    b.closeInspect(); b.frame(1);
  }
  rows.sort((a, c) => Math.hypot(c[1], c[2]) - Math.hypot(a[1], a[2]));
  for (const r of rows) log('ITEM', r[0], 'off x', r[1], 'y', r[2], '| size', r[3], r[4]);
}

// what the inspect fit sees in one item (?k=name): each mesh, visible to the root, its material's visibility, its vertex box
export async function inspectParts({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  const k = new URLSearchParams(location.search).get('k');
  let it = null; for (const key of Object.keys(b)) { let v; try { v = b[key]; } catch (e) { continue; } if (v && typeof v === 'object' && v.inspectModel && v.name === k) it = v; }
  if (!it) { log('no item', k); return; }
  const T = b.THREE, m = it.inspectModel; m.updateMatrixWorld(true);
  m.traverse((o) => {
    if (!o.isMesh && !o.isSprite) return;
    let vis = true; for (let q = o; q && q !== m.parent; q = q.parent) if (!q.visible) vis = false;
    const ms = [].concat(o.material); const bb = new T.Box3().setFromObject(o); const s = bb.getSize(new T.Vector3());
    log('PART', o.name || o.type, 'vis', vis, 'sprite', !!o.isSprite, 'mat', ms.map((x) => x && (x.type + ' v' + x.visible + ' t' + x.transparent + ' o' + x.opacity)).join(';'), 'size', s.toArray().map((x) => x.toFixed(3)).join(','), 'verts', o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count, 'idx', o.geometry && o.geometry.index ? o.geometry.index.count : '-', 'range', o.geometry && JSON.stringify(o.geometry.drawRange));
  });
}

// BURNING THE PUPPET IS AN ACHIEVEMENT (2026-11-15, "make burning the puppet be an achievment 'Burn the puppet.'"): at his
// fire with the puppet in hand, thrown in on the fake clock; when the toast shows and what it says, and the rare count
export async function pupBurnAch({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true;
  const C = b.camera; C.position.set(9.2 - 1.6, 1.7, -697.0 + 1.2); b.camBaseY = 1.7;
  b.loadElvPuppet();
  for (let i = 0; i < 300 && !b.pupReadyS(); i++) { b.frame(1); await sleep(40); }
  log('puppet ready', b.pupReadyS());
  b.elvCarryBegin(true); for (let i = 0; i < 5; i++) b.frame(1);
  w.__clockOn();
  b.elvThrowPuppet();
  const el = w.document.getElementById('ach'); let tAch = null;
  for (let f = 0; f < 60 * 12; f++) { w.__adv(1); if (!tAch && el && el.className.includes('on')) { tAch = f / 60; break; } }
  log('burned', b.elvBurnedS(), '| toast at', tAch === null ? 'NEVER' : tAch.toFixed(2) + ' s after the throw', '|', el && el.textContent.replace(/\s+/g, ' ').trim());
  const st = b.statLines ? b.statLines() : null;
  if (st) log('stats rare', JSON.stringify(st.find((r) => /RARE/.test(r[0]))));
}

// THE CRAB SCAN AFTER A DEATH IN THE WHALE (2026-11-15, "the horshoe crab model doesnt appear when breaking skrims flesh
// piles"): a checkpoint written in the belly, reloaded as a death reloads, and whether the horseshoe crab scan (limule.glb,
// which the heaps' crabs are copies of) is in while you are still inside, and how long it took
export async function whaleCrab({ w, b, log, sleep }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true;
  const R = b.ROOM_BACK.whale; R.load(); for (let i = 0; i < 400 && !R.ready(); i++) { b.frame(1); await sleep(50); }
  b.clearRoomFlags(); R.place(); await sleep(1500);
  b.saveCheckpoint(); log('saved in', b.devRoom());
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
  const f = document.getElementById('g'); f.contentWindow.location.reload(); await sleep(500);
  let w2 = null, b2 = null; for (let i = 0; i < 600; i++) { await sleep(50); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) { b2 = w2.__bw; break; } } catch (e) {} }
  for (let i = 0; i < 600 && !b2.state().started; i++) { try { b2.beginGame(); } catch (e) {} await sleep(100); }
  const t0 = performance.now(); let at = null;
  for (let i = 0; i < 600; i++) { await sleep(50); if (b2.hcrab && b2.hcrab.children.length) { at = (performance.now() - t0) / 1000; break; } }
  log('reloaded into', b2.devRoom(), '| crab scan in', at === null ? 'NOT after 30 s' : at.toFixed(1) + ' s after start', '| still in the whale', b2.devRoom() === 'whale');
  // and then break the heaps that hold crabs, as a blow does, and look at what lies there
  const S = b2.SKQ; for (let i = 0; i < 400 && !S.piles.length; i++) { await sleep(30); }
  for (let i = 0; i < 100; i++) await sleep(16);
  if (!S.loot) for (const p of S.piles) { b2.skqLootOut(p, true); break; }
  log('piles', S.piles.length, 'loot', JSON.stringify(S.loot), 'broke', S.broke, 'taken', S.lootTaken);
  for (const p of S.piles) {
    if (!S.loot || S.loot[p.i] !== 'crab') continue;
    b2.skqPileHit(p, 4, 0, -1);
    await sleep(800);
    const L = S.lootW[p.i]; let M0 = null, vis = true; if (L) { L.traverse((o) => { if (!M0 && o.isMesh && o.name !== 'hitProxy') M0 = o; }); for (let q = L; q; q = q.parent) if (!q.visible) vis = false; }
    log('  heap', p.i, 'gone', p.gone, '| drop', !!L, 'crab mesh', !!M0, 'visible', vis, 'in scene', !!(L && L.parent), M0 ? 'verts ' + M0.geometry.attributes.position.count : '');
  }
}

// THE CRABS OUT OF SKRIM'S HEAPS, LOOKED AT (2026-11-15): in the belly, every heap's loot put out, and for each crab what
// the drop holds (meshes, sizes, visibility up the chain, where it sits against the floor) and a still from 1.4 m
export async function heapCrabs({ w, b, log, sleep, shot }) {
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true;
  const R = b.ROOM_BACK.whale; R.load(); for (let i = 0; i < 400 && !R.ready(); i++) { b.frame(1); await sleep(50); }
  b.clearRoomFlags(); R.place();
  const S = b.SKQ; for (let i = 0; i < 400 && !S.piles.length; i++) { b.frame(1); await sleep(30); }
  log('piles', S.piles.length, 'hcrab children', b.hcrab.children.length, b.hcrab.children.map((c) => c.name || c.type).join(','));
  for (const p of S.piles) b.skqLootOut(p, true);
  log('loot', JSON.stringify(S.loot));
  w.requestAnimationFrame = () => 0;
  const T = b.THREE, C = b.camera;
  for (const k in S.lootW) {
    const g = S.lootW[k]; if (!g) continue;
    let meshes = 0, vis = true; const box = new T.Box3();
    g.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') { meshes++; box.expandByObject(o); } });
    for (let q = g; q; q = q.parent) if (!q.visible) vis = false;
    const sz = box.getSize(new T.Vector3()), gp = g.position;
    log('DROP', k, S.loot[k], 'meshes', meshes, 'visible', vis, 'inScene', !!g.parent, 'at', gp.toArray().map((v) => v.toFixed(2)).join(','), 'box y', box.min.y.toFixed(2), box.max.y.toFixed(2), 'size', sz.toArray().map((v) => v.toFixed(2)).join(','));
    C.position.set(gp.x + 1.0, gp.y + 1.1, gp.z + 1.0); b.camBaseY = C.position.y; b.lookAt(gp.x, gp.y + 0.05, gp.z);
    for (let i = 0; i < 4; i++) b.frame(1);
    shot('hc_' + k + '_' + S.loot[k], 480, 1.6);
  }
}

// THE CRAB OUT OF A BROKEN HEAP, SEEN FROM WHERE YOU BROKE IT (2026-11-15): each crab heap broken as a blow breaks it,
// the camera 2.2 m back where you swung from, a frame with the crab and one without: how many pixels it is
export async function heapCrabSeen({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js');
  for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 2400 && b.startGate().left > 0; i++) { b.frame(1); await sleep(16); }
  b.settings.devMode = true;
  const R = b.ROOM_BACK.whale; R.load(); for (let i = 0; i < 400 && !R.ready(); i++) { b.frame(1); await sleep(50); }
  b.clearRoomFlags(); R.place();
  const S = b.SKQ; for (let i = 0; i < 400 && !S.piles.length; i++) { b.frame(1); await sleep(30); }
  for (let i = 0; i < 400 && !(b.hcrab.children.length); i++) { b.frame(1); await sleep(30); }
  w.__clockOn();
  const T = b.THREE, C = b.camera, cv = b.renderer.domElement;
  const grab = () => { b.renderer.render(b.scene, C); const c2 = document.createElement('canvas'); c2.width = 320; c2.height = 180; const g = c2.getContext('2d'); g.drawImage(cv, 0, 0, 320, 180); return { c2, d: g.getImageData(0, 0, 320, 180).data }; };
  b.SKQ.loot || (b.skqLootOut && 0);
  for (const p of S.piles) {
    if (!S.loot) { b.skqLootOut(p, true); }
  }
  for (const p of S.piles) {
    if (!S.loot || S.loot[p.i] !== 'crab') continue;
    const wx = b.WHALE_X + p.x, wz = b.WHALE_Z - p.s;
    // stand 2.2 m off it on the side toward the whale's mouth, eyes at 1.7 over the floor, and break it
    const sx = wx, sz = wz + 2.2;
    const place = () => { C.position.set(sx, b.skrimFloorW(sx, sz) + 1.7, sz); b.camBaseY = C.position.y; b.lookAt(wx, b.skrimFloorW(wx, wz) + 0.2, wz); };
    place(); for (let i = 0; i < 5; i++) { place(); w.__adv(1); }
    b.skqPileHit(p, 4, 0, -1);
    for (let i = 0; i < 90; i++) { place(); w.__adv(1); }        // the meat lands
    const L = S.lootW[p.i];
    if (!L) { log('heap', p.i, 'no crab out'); continue; }
    let M0 = null; L.traverse((o) => { if (!M0 && o.isMesh && o.name !== 'hitProxy') M0 = o; });
    const lpz = L.position.clone();
    const A = grab(); M0.visible = false; const B = grab(); M0.visible = true;
    { const spr = []; L.traverse((o) => { if (o.isSprite) { spr.push(o); o.visible = false; } }); const A2 = grab(); M0.visible = false; const B2 = grab(); M0.visible = true; for (const o of spr) o.visible = true;
      let dd = 0; for (let i = 0; i < A2.d.length; i += 4) if (Math.abs(A2.d[i] - B2.d[i]) + Math.abs(A2.d[i + 1] - B2.d[i + 1]) + Math.abs(A2.d[i + 2] - B2.d[i + 2]) > 30) dd++;
      log('  crab pixels with the shine hidden', dd);
      const dn = A2.c2.toDataURL('image/jpeg', 0.85).split(',')[1], nn = Math.ceil(dn.length / 8000); for (let q = 0; q < nn; q++) console.log('[PBIMG]', 'hcn_' + p.i, q + '/' + nn, dn.slice(q * 8000, (q + 1) * 8000)); }
    { const v = new T.Vector3(), P2 = M0.geometry.attributes.position, bb = new T.Box3(); M0.updateMatrixWorld(true); for (let i = 0; i < P2.count; i += 3) { v.fromBufferAttribute(P2, i).applyMatrix4(M0.matrixWorld); bb.expandByPoint(v); } log('  crab mesh by its vertices: y', bb.min.y.toFixed(3), bb.max.y.toFixed(3), 'size', bb.getSize(v).toArray().map((x) => x.toFixed(3)).join(','), 'verts', P2.count, 'scale', M0.getWorldScale(new T.Vector3()).x.toFixed(3)); }
    { const sv = C.position.clone(); C.position.set(lpz.x + 0.35, lpz.y + 0.45, lpz.z + 0.45); C.lookAt(lpz.x, lpz.y + 0.03, lpz.z); C.updateMatrixWorld(true); const Z = grab(); const dz = Z.c2.toDataURL('image/jpeg', 0.85).split(',')[1], nz = Math.ceil(dz.length / 8000); for (let q = 0; q < nz; q++) console.log('[PBIMG]', 'hcz_' + p.i, q + '/' + nz, dz.slice(q * 8000, (q + 1) * 8000)); C.position.copy(sv); b.lookAt(wx, b.skrimFloorW(wx, wz) + 0.2, wz); }
    let diff = 0; for (let i = 0; i < A.d.length; i += 4) if (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]) > 30) diff++;
    const lp = L.position.clone(); const pr = lp.clone().project(C);
    { // the drawn floor under it against where it sits: a ray down onto everything drawn but the drop itself
      const ms = []; b.scene.traverse((o) => { if (!o.isMesh || o.name === 'hitProxy') return; let v = true; for (let q = o; q; q = q.parent) { if (!q.visible) v = false; if (q === L) v = false; } if (v) ms.push(o); });
      const rc = new T.Raycaster(new T.Vector3(lp.x, lp.y + 3, lp.z), new T.Vector3(0, -1, 0), 0, 6);
      const h = rc.intersectObjects(ms, false).filter((q) => !/Sprite/.test(q.object.type));
      const cb = new T.Box3(); L.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy' && !/shine|Sprite/i.test(o.name + o.type)) cb.expandByObject(o); });
      L.traverse((o) => { if (!o.isMesh && !o.isSprite) return; const bb = new T.Box3().setFromObject(o); const sz = bb.getSize(new T.Vector3()); let vis = true; for (let q = o; q && q !== L.parent; q = q.parent) if (!q.visible) vis = false; log('    part', o.name || '-', o.type, 'vis', vis, 'mat', o.material && o.material.type, 'y', bb.min.y.toFixed(3), bb.max.y.toFixed(3), 'size', sz.toArray().map((v) => v.toFixed(3)).join(','), 'renderOrder', o.renderOrder, 'depthTest', o.material && o.material.depthTest); });
      log('  heap', p.i, 'drawn floor', h.length ? h[0].point.y.toFixed(3) + ' (' + (h[0].object.name || h[0].object.type) + ')' : '-', '| the floor it was put on', b.skrimFloorW(lp.x, lp.z).toFixed(3), '| crab box y', cb.min.y.toFixed(3), cb.max.y.toFixed(3), 'size', cb.getSize(new T.Vector3()).toArray().map((v) => v.toFixed(2)).join(','));
    }
    log('HEAP', p.i, 'crab pixels', diff, 'of 57600', '| crab at screen', pr.x.toFixed(2), pr.y.toFixed(2), '| dist', lp.distanceTo(C.position).toFixed(2));
    const d2 = A.c2.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d2.length / 8000);
    for (let q = 0; q < n; q++) console.log('[PBIMG]', 'hcs_' + p.i, q + '/' + n, d2.slice(q * 8000, (q + 1) * 8000));
  }
}
