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

// THE PALADIN'S BLOWS, where they land ON SCREEN: every swing forced 3x with you standing still; for each, whether it
// hurt and the landed blade point projected to the screen (ndc x,y in -1..1; the middle is 0,0)
export async function paladin({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot()));
  w.__clockOn();
  const P = b.paladinS(), u = P.unit, cam = b.camera.position;
  b.settings.devMode = false; P.out = true; u.g.visible = true; u.holdAnim = false; u.st.awake = true;
  const V = cam.constructor, home = [cam.x, cam.z];
  for (const k of Object.keys(u.kind.use)) {
    const res = [];
    for (let r = 0; r < 3; r++) {
      cam.x = home[0]; cam.z = home[1];
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); for (const f of b.farmUnitsS()) f.st.awake = false; }
      w.__nb = 99; w.__ny = 0; w.__nd = 0; w.__nf = 0; u.st.forceSwing = k; let started = false, hit = null, hp0 = b.state().hp, t0 = u.hitAt || 0;
      for (let i = 0; i < 360; i++) {
        b.lookAt(u.g.position.x, cam.y - 0.1, u.g.position.z);   // (a player looks at the man swinging at him)
        w.__adv(1); for (const f of b.farmUnitsS()) f.st.awake = false;
        cam.x = home[0]; cam.z = home[1];
        const A = u.st.atk >= 0 && u.st.swing === k; if (A) started = true; else if (started) break;
        const AA = A ? u.atk[k] : null;
        if (AA && u.st.atk >= AA.wind - 0.05 && u.st.atk <= AA.wind + AA.strike + 0.1 && u.palTip && u.palHilt) {
          const H = new V(), T = new V(), Q = new V(); u.palHilt.getWorldPosition(H); u.palTip.getWorldPosition(T);
          const dx = u.g.position.x - cam.x, dz = u.g.position.z - cam.z, dl = Math.hypot(dx, dz) || 1, vx = cam.x + dx / dl * 0.32, vz = cam.z + dz / dl * 0.32;
          for (let j = 0; j <= 8; j++) { Q.copy(H).lerp(T, 0.25 + 0.75 * j / 8); if (Q.y < cam.y - 1.0 || Q.y > cam.y + 0.4) continue;
            const rx = Q.x - cam.x, rz = Q.z - cam.z, fwd = (rx * dx + rz * dz) / dl, lat = Math.abs(rx * dz - rz * dx) / dl;
            if (lat < (w.__nb || 99)) { w.__nb = lat; w.__ny = Q.y - cam.y; w.__nf = fwd; w.__nd = dl; } }
        }
        if (!hit && (u.hitAt || 0) > t0 && u.hitPt) { const q = u.hitPt.clone().project(b.camera); hit = q.x.toFixed(2) + ',' + q.y.toFixed(2) + (q.z > 1 ? '(behind)' : ''); }
        if (b.state().hp < hp0) hit = hit || 'hurt-no-pt';
        b.heal(); hp0 = b.state().hp;
      }
      res.push(started ? (hit || 'miss') + '[lat ' + w.__nb.toFixed(2) + ' fwd ' + (w.__nf || 0).toFixed(2) + ' dy ' + w.__ny.toFixed(2) + ' at ' + w.__nd.toFixed(2) + ']' : 'never');
    }
    log(k, res.join('  '), 'stand', (u.atk[k].stop || 0).toFixed(2));
  }
}

// THE FARMERS' BLOWS ON SCREEN: a natural fight, standing still and facing whoever is swinging; each blow that hurt,
// where its tool was on the screen when it landed (ndc), and how many landed with no tool point (the old fallback)
export async function farmers({ w, b, log }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot()));
  w.__clockOn();
  b.settings.devMode = false;
  const cam = b.camera.position, home = [cam.x, cam.z], pts = []; let hurt = 0, noPt = 0, hp0 = b.state().hp;
  const P = b.paladinS(); if (P.unit) { P.unit.st.awake = false; P.unit.g.visible = false; }
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

// THE CASTLE FIGHT, FRAME BY FRAME from your eye: a paladin cut and a farmer's blow, a still every 4 frames through each,
// you standing and facing the one swinging (devMode off, healed every frame). Stills named cs_<who>_<n>.
export async function castleSheet({ w, b, log, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot()));
  w.__clockOn();
  b.settings.devMode = false;
  const cam = b.camera.position, home = [cam.x, cam.z];
  const P = b.paladinS(), pu = P.unit;
  // a paladin cut: pS2 then on into its string
  if (pu && !w.__noPal) {
    const sleepF = () => { for (const f of b.farmUnitsS()) f.st.awake = false; };
    P.out = true; pu.g.visible = true; pu.holdAnim = false; pu.st.awake = true;
    for (let i = 0; i < 400 && pu.st.atk >= 0; i++) { w.__adv(1); cam.x = home[0]; cam.z = home[1]; b.heal(); sleepF(); }
    pu.st.forceSwing = w.__palSwing || 'pS2'; let m = 0, started = false;
    log('pal d', Math.hypot(pu.g.position.x - cam.x, pu.g.position.z - cam.z).toFixed(2), 'awake', pu.st.awake, 'atk', pu.st.atk);
    for (let i = 0; i < 400 && m < 16; i++) {
      b.lookAt(pu.g.position.x, cam.y - 0.1, pu.g.position.z); w.__adv(1); cam.x = home[0]; cam.z = home[1]; b.heal(); sleepF();
      if (pu.st.atk >= 0) started = true;
      if (started && i % 4 === 0) { shot('cs_pal_' + String(m).padStart(2, '0'), 300, 1.3); m++; log('  pal', m - 1, 'd', Math.hypot(pu.g.position.x - cam.x, pu.g.position.z - cam.z).toFixed(2), 'atk', pu.st.atk.toFixed(2), 'swing', pu.st.swing); }
      if (started && pu.st.atk < 0 && m > 6) break;
    }
    log('paladin frames', m);
  }
  // a farmer's blow first (the paladin kept out of it)
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

export async function farmSheet(ctx) { ctx.w.__noPal = true; return castleSheet(ctx); }

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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false;   // (dev mode stops a creature swinging at reach)
  log('boot', JSON.stringify(await w.__palBoot()));
  b.settings.devMode = false;
  w.__clockOn();
  const S = () => b.dkS(), C = b.camera.position, home = [C.x, C.z];
  for (let i = 0; i < 60 * 40; i++) {
    w.__adv(1); b.heal(); C.x = home[0]; C.z = home[1];
    const s = S(), u = s.u;
    if (u && s.dk.stage >= 1) b.lookAt(u.g.position.x, C.y - 0.2, u.g.position.z);
    if (i % 120 === 0) log('t', (i / 60).toFixed(0), 'stage', s.dk.stage, 'out', b.paladinS().out, 'vis', u && u.g.visible, 'dkHP', u && u.st.hp, 'victims alive', s.dk.victims.filter((f) => f.st.alive).length, '/', s.dk.victims.length, 'foe', u && u.st.foe ? 'farmer' : 'you', 'swing', u && u.st.atk >= 0 ? u.st.swing : '-', 'd', u ? Math.hypot(u.g.position.x - C.x, u.g.position.z - C.z).toFixed(1) : '-');
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot())); w.__clockOn(); for (let i = 0; i < 60; i++) w.__adv(1);
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot())); w.__clockOn(); for (let i = 0; i < 60; i++) w.__adv(1);
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
  const fs = []; const SP = b.palDbg.FARM_SPINE; for (let i = 0; i < SP.length - 1; i++) for (let t = 0; t < 1; t += 0.34) { const L = b.palDbg.fortW(SP[i][0] + (SP[i + 1][0] - SP[i][0]) * t, SP[i][1] + (SP[i + 1][1] - SP[i][1]) * t); const f = b.palDbg.fortCourtAt(L.x, L.z); if (f !== null) fs.push([L.x, f + 1.7, L.z]); }
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot())); w.__clockOn(); for (let i = 0; i < 60; i++) w.__adv(1);
  const R = b.renderer, gl = R.getContext(), C = b.camera, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const grp = (n) => b.scene.children.find((o) => o.name === n);
  const grab = () => { R.render(b.scene, C); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const diff = (a2, b2) => { let n = 0; for (let k = 0; k < a2.length; k += 16) if (Math.abs(a2[k] - b2[k]) + Math.abs(a2[k + 1] - b2[k + 1]) + Math.abs(a2[k + 2] - b2[k + 2]) > 24) n++; return n; };
  const fs = []; const SP = b.palDbg.FARM_SPINE; for (let i = 0; i < SP.length - 1; i++) for (let t = 0; t < 1; t += 0.25) { const L = b.palDbg.fortW(SP[i][0] + (SP[i + 1][0] - SP[i][0]) * t, SP[i][1] + (SP[i + 1][1] - SP[i][1]) * t); const f = b.palDbg.fortCourtAt(L.x, L.z); if (f !== null) fs.push([L.x, f + 1.7, L.z]); }
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot()));
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
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
