/* STUCK IN THE FIRST CASTLE (2026-11-25, the owner: "i got stuck right here" — his where-am-I read castle, feet 13.90, 1.13,
 * -15.02 in the fort's frame, looking -1.16: a tall wall corner on his right, the sea and a long low wall off to his left).
 * Not part of the game. The fort booted, the farmers put away; you stood on the spot, then walked from it 24 ways, a second
 * each, holding W through the REAL update (the walk, the push-outs, the props, the clamp). Per way: how far you got, and for a
 * 10 cm step that way, which of the walk's questions said no (floor / mask / crossed a face / off the main court / a wall's
 * push / a prop's push). And an ascii map of the walk's `legal` round the spot.
 *   PB_PORT=4225 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/fortwalkout.js' <out>      (&x=&z=&feet=&yaw= another spot) */
const Q = new URLSearchParams(location.search);
const LX = +(Q.get('x') || 13.90), LZ = +(Q.get('z') || -15.02), LF = +(Q.get('feet') || 1.13), YAW = +(Q.get('yaw') || -1.16);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn();
b.settings.devMode = true;
for (const u of (b.farmUnitsS ? b.farmUnitsS() : [])) { u.st.awake = false; u.g.position.y -= 500; u.g.visible = false; }
const P0 = b.dkSlotS && b.dkSlotS(); if (P0 && P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
const C = b.camera, S = b.FORT_SITE, f2 = (v) => (+v).toFixed(2);
const WX = b.FORT_X + LX, WZ = b.FORT_Z + LZ, FEET = b.FORT_Y + LF;
const eye = b.camBaseY - b.groundY;
const place = () => { C.position.set(WX, FEET + eye, WZ); b.camBaseY = FEET + eye; b.groundY = FEET; for (let i = 0; i < 6; i++) w.__adv(1); };
place();
const feet = () => b.camBaseY - eye;
log('spot world', f2(WX), f2(WZ), 'eye', f2(eye), '| after settling: at', f2(C.position.x - b.FORT_X), f2(C.position.z - b.FORT_Z), 'feet', f2(feet() - b.FORT_Y),
  '| lastSpot', f2(b.fortLastSpotS().x - b.FORT_X), f2(b.fortLastSpotS().z - b.FORT_Z),
  '| floor', JSON.stringify(b.keepFloorAtS(WX, WZ, FEET, b.FORT_STEP, S)), 'mask', b.fortMaskAt(WX, WZ), 'main', b.siteOnMain(S, WX, WZ),
  'wallNear', JSON.stringify(b.keepWallNear(WX, WZ, b.FORT_BODY, FEET + 0.35, FEET + 1.8, S)));
{ // the castle's breakables round the spot (`CP`)
  const site = b.CP && b.CP.sites && b.CP.sites.fort;
  log('props loaded', !!site, site ? site.props.length : 0);
  if (site) for (const P of site.props) { const d = Math.hypot(P.x - WX, P.z - WZ); if (d < 4) log('  PROP', P.kind.name || P.kind.id || '?', 'local', f2(P.x - b.FORT_X), f2(P.y - b.FORT_Y), f2(P.z - b.FORT_Z), 'yaw', f2(P.yaw), 'hx', f2(P.kind.hx), 'hz', f2(P.kind.hz), 'h', f2(P.kind.h), P.kind.K && P.kind.K.round ? 'round' : 'box', P.lean ? 'lean' : '', P.dead ? 'DEAD' : '', P.on ? 'ON' : '', 'd', f2(d)); }
}
{ // the beach's solids (`rockColliders`) round the spot: `pushOutOfRocks` runs after the castle's clamp, every frame
  const near = b.rockColliders.filter((c) => { const x = c.x != null ? c.x : (c.x0 + c.x1) / 2, z = c.z != null ? c.z : (c.z0 + c.z1) / 2; return Math.hypot(x - WX, z - WZ) < 25; });
  for (const c of near) log('  ROCKCOL', c.r != null ? `disc ${f2(c.x - b.FORT_X)},${f2(c.z - b.FORT_Z)} r ${f2(c.r)}` : `box x ${f2(c.x0 - b.FORT_X)}..${f2(c.x1 - b.FORT_X)} z ${f2(c.z0 - b.FORT_Z)}..${f2(c.z1 - b.FORT_Z)}`, 'top', f2(c.top - b.FORT_Y), Object.keys(c).filter((k) => !['x', 'z', 'r', 'top', 'x0', 'x1', 'z0', 'z1'].includes(k)).map((k) => k + '=' + c[k]).join(' '));
  for (const [nm, lx, lz, lf] of [['spot', LX, LZ, LF], ['pressed', 14.03, -14.97, 0.94]]) {
    const q = new b.THREE.Vector3(b.FORT_X + lx, 0, b.FORT_Z + lz), fy = b.FORT_Y + lf;
    const hit = b.pushOutOfSolids(q, fy, 0.4 * 0.85, fy + 1.75);
    log('  rock push at', nm, hit ? 'MOVES ' + f2(Math.hypot(q.x - b.FORT_X - lx, q.z - b.FORT_Z - lz)) + ' m to ' + f2(q.x - b.FORT_X) + ',' + f2(q.z - b.FORT_Z) : 'none');
  }
}
if (b.toggleWhereAmI) { b.toggleWhereAmI(); for (let i = 0; i < 3; i++) { w.__adv(1); b.frame(1); } const el = [...w.document.querySelectorAll('div')].find((d) => d.style && d.style.top === '46px' && d.style.right === '14px'); log('OVERLAY', el ? JSON.stringify(el.textContent) : 'none'); b.toggleWhereAmI(); }
// why a step is refused, asked the walk's own way
const why = (x0, z0, x1, z1, fy) => {
  const r = [];
  if (!b.keepFloorAtS(x1, z1, fy, b.FORT_STEP, S)) r.push('floor');
  if (!b.fortMaskAt(x1, z1)) r.push('mask');
  for (const h of [0.8, 1.25, 1.68]) if (b.keepHitsWall(x0, z0, x1, z1, fy + h, S)) { r.push('face@' + h); break; }
  if (b.siteCrossed(S, { x: x0, z: z0 }, { x: x1, z: z1 }, fy)) r.push('crossed');
  if (!b.siteOnMain(S, x1, z1)) r.push('offMain');
  const q = { x: x1, z: z1 }; b.cpPushPlayer(q, b.FORT_BODY, fy); if (Math.hypot(q.x - x1, q.z - z1) > 1e-3) r.push('prop' + f2(Math.hypot(q.x - x1, q.z - z1)));
  const q2 = { x: x1, z: z1, y: 0 }; b.fortPropPush(q2, b.FORT_BODY); if (Math.hypot(q2.x - x1, q2.z - z1) > 1e-3) r.push('fprop' + f2(Math.hypot(q2.x - x1, q2.z - z1)));
  return r.join('+') || 'ok';
};
b.fallbackLook = true;
const res = [], whys = [];
for (let k = 0; k < 24; k++) {
  place();
  const a = k / 24 * Math.PI * 2;                       // the way walked, as a yaw (0 = -z, the game's forward)
  const x0 = C.position.x, z0 = C.position.z, fy = feet();
  b.look(a, 0);
  const dx = -Math.sin(a), dz = -Math.cos(a);
  whys.push(Math.round(a * 180 / Math.PI) + ':' + why(x0, z0, x0 + dx * 0.1, z0 + dz * 0.1, fy));
  b.keys.KeyW = true; for (let i = 0; i < 60; i++) { b.look(a, 0); w.__adv(1); } b.keys.KeyW = false;
  res.push(Math.round(a * 180 / Math.PI) + ':' + f2(Math.hypot(C.position.x - x0, C.position.z - z0)));
}
log('WALKS (yaw deg : m in 1 s)', res.join(' '));
if (Q.get('trace')) for (const deg of [30, 240, 315, 105]) {
  place(); const a = deg * Math.PI / 180; b.look(a, 0);
  b.keys.KeyW = true; for (let i = 0; i < 20; i++) { b.look(a, 0); w.__adv(1); }
  w.__fortTrace = []; b.look(a, 0); w.__adv(1); log('TRACE', deg, JSON.stringify(w.__fortTrace)); w.__fortTrace = null;
  b.keys.KeyW = false;
}

log('WHY a 10 cm step', whys.join(' '));
// jumped from the spot each way, then from where he came down: can he walk away (8 ways, a second each)?
if (Q.get('jump') !== '0') {
  const traps = [], lands = [];
  for (let k = 0; k < 24; k++) {
    place(); const a = k / 24 * Math.PI * 2; b.look(a, 0);
    b.keys.KeyW = true; b.keys.Space = true;
    for (let i = 0; i < 50; i++) { b.look(a, 0); w.__adv(1); if (i === 3) b.keys.Space = false; }
    b.keys.KeyW = false; for (let i = 0; i < 30; i++) w.__adv(1);
    const lx = C.position.x, lz = C.position.z, lf = feet();
    let best = 0;
    for (let m = 0; m < 8; m++) {
      C.position.x = lx; C.position.z = lz; b.camBaseY = lf + eye; w.__adv(2);
      const x0 = C.position.x, z0 = C.position.z, aa = m / 8 * Math.PI * 2;
      b.keys.KeyW = true; for (let i = 0; i < 60; i++) { b.look(aa, 0); w.__adv(1); } b.keys.KeyW = false;
      best = Math.max(best, Math.hypot(C.position.x - x0, C.position.z - z0));
    }
    lands.push(Math.round(a * 180 / Math.PI) + ':(' + f2(lx - b.FORT_X) + ',' + f2(lf - b.FORT_Y) + ',' + f2(lz - b.FORT_Z) + ')' + f2(best));
    if (best < 0.3) traps.push(Math.round(a * 180 / Math.PI) + ' at ' + f2(lx - b.FORT_X) + ',' + f2(lz - b.FORT_Z) + ' feet ' + f2(lf - b.FORT_Y));
  }
  log('JUMPS (yaw: landed local x,feet,z  best walk-out m)', lands.join(' '));
  log('TRAPPED after a jump', traps.length ? traps.join(' | ') : 'none');
}
if (Q.get('faces')) {   // every steep face of the wall index within 0.8 m of the corner spot, in plan (local), with its height
  const W = S.walls, cx = b.FORT_X + 14.03, cz = b.FORT_Z - 14.97, ic = Math.floor((cx - S.X) / W.cell), jc = Math.floor((cz - S.Z) / W.cell), seen = new Set();
  log('wall cell', W.cell, 'S.X/Z', f2(S.X), f2(S.Z), 'slice', !!S.slice);
  for (let di = -3; di <= 3; di++) for (let dj = -3; dj <= 3; dj++) { const L = W.map.get(W.key(ic + di, jc + dj)); if (!L) continue; for (const id of L) { if (seen.has(id) || !W.steep[id]) continue; seen.add(id); const o = id * 9, v = W.v;
    const pts = [[v[o], v[o + 2]], [v[o + 3], v[o + 5]], [v[o + 6], v[o + 8]]];
    const sd = (ax, az, bx2, bz2, px, pz) => { const dx = bx2 - ax, dz = bz2 - az, L = dx * dx + dz * dz; let t = L > 1e-12 ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(ax + dx * t - px, az + dz * t - pz); };
    const pd = Math.min(sd(pts[0][0], pts[0][1], pts[1][0], pts[1][1], cx, cz), sd(pts[1][0], pts[1][1], pts[2][0], pts[2][1], cx, cz), sd(pts[2][0], pts[2][1], pts[0][0], pts[0][1], cx, cz));
    const lo = b.FORT_Y + 1.40, hi = b.FORT_Y + 2.88;
    if (pd > 0.7 || W.yhi[id] <= lo || W.ylo[id] >= hi) continue;
    log('  FACE', id, 'plan d', f2(pd), 'y', f2(W.ylo[id] - b.FORT_Y), '..', f2(W.yhi[id] - b.FORT_Y), pts.map(([x, z]) => '(' + f2(x - b.FORT_X) + ',' + f2(z - b.FORT_Z) + ')').join(' '));
  } }
  const h = b.keepWallNear(cx, cz, b.FORT_BODY + 0.01, b.FORT_Y + 0.94 + 0.46, b.FORT_Y + 0.94 + 1.75, S); log('nearest at the spot', h ? f2(h.x - b.FORT_X) + ',' + f2(h.z - b.FORT_Z) + ' depth ' + f2(h.depth) : '-');
}
// arrived from the raised floor beside it (feet 1.13, where a jump that way lands), walked into the corner the way he looked
if (Q.get('arrive') !== '0') {
  for (const [sx, sz] of [[13.38, -14.13], [12.73, -14.24], [14.68, -13.47], [13.74, -13.84]]) {
    C.position.set(b.FORT_X + sx, b.FORT_Y + 1.13 + eye, b.FORT_Z + sz); b.camBaseY = b.FORT_Y + 1.13 + eye; b.groundY = b.FORT_Y + 1.13; for (let i = 0; i < 6; i++) w.__adv(1);
    const tx = WX - C.position.x, tz = WZ - C.position.z, toward = Math.atan2(-tx, -tz);
    b.keys.KeyW = true; for (let i = 0; i < 90; i++) { b.look(toward, 0); w.__adv(1); } for (let i = 0; i < 120; i++) { b.look(YAW, 0); w.__adv(1); } b.keys.KeyW = false;
    const x0 = C.position.x, z0 = C.position.z, f0 = feet(), out = [];
    let free = 0;
    for (let k = 0; k < 24; k++) {
      C.position.x = x0; C.position.z = z0; b.camBaseY = f0 + eye; w.__adv(2);
      const a = k / 24 * Math.PI * 2, xa = C.position.x, za = C.position.z;
      b.keys.KeyW = true; for (let i = 0; i < 60; i++) { b.look(a, 0); w.__adv(1); } b.keys.KeyW = false;
      const d = Math.hypot(C.position.x - xa, C.position.z - za); if (d > 0.5) free++;
      out.push(Math.round(a * 180 / Math.PI) + ':' + f2(d));
    }
    log('ARRIVED from', sx, sz, '-> pressed in at', f2(x0 - b.FORT_X), f2(f0 - b.FORT_Y), f2(z0 - b.FORT_Z), '| ways out', free, 'of 24 |', out.join(' '));
  }
}
// the hook from the spot: jumped, thrown each way (the real throw; a bite in the air pulls you in, `hookZipStart`), then a second and a
// half watched — every frame that ENDS off the castle's courts (no court floor, or off the main court) with `inFort` still on
if (Q.get('hook')) {
  b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
  for (let i = 0; i < 40; i++) w.__adv(1);
  const out = [], rows = [];
  const starts = [['spot', LX, LZ], ['pressed', 14.03, -14.97]];
  for (const [nm, sx, sz] of starts) for (let k = 0; k < 24; k++) for (const pitch of [0.1, 0.35]) {
    C.position.set(b.FORT_X + sx, FEET + eye, b.FORT_Z + sz); b.camBaseY = FEET + eye; b.groundY = FEET; for (let i = 0; i < 4; i++) w.__adv(1);
    const a = k / 24 * Math.PI * 2; b.look(a, pitch);
    b.HK.st = 'idle'; b.HK.cd = 0; b.HK.carry && b.HK.carry.set(0, 0, 0); b.HK.zipUsed = false;
    b.keys.Space = true; for (let i = 0; i < 3; i++) { b.look(a, pitch); w.__adv(1); } b.keys.Space = false;
    b.look(a, pitch); const thrown = b.hookThrowS(1);
    let offN = 0, zipped = false, maxOut = 0, last = null;
    for (let i = 0; i < 90; i++) {
      b.look(a, pitch); w.__adv(1);
      if (b.HK.st === 'zip') zipped = true;
      const x = C.position.x, z = C.position.z, court = b.fortCourtAt(x, z), main = b.siteOnMain(S, x, z);
      if (court === null || !main) { offN++; last = [f2(x - b.FORT_X), f2(z - b.FORT_Z), court === null ? 'nocourt' : 'offmain']; }
    }
    rows.push(`${nm}:${Math.round(a * 180 / Math.PI)}/${pitch}${zipped ? 'Z' : ''}${offN ? '!' + offN : ''}`);
    if (offN) out.push(`${nm} yaw ${Math.round(a * 180 / Math.PI)} pitch ${pitch}: ${offN} frames off the courts${zipped ? ' (zipped)' : ''}, last ${last.join(' ')}; end ${f2(C.position.x - b.FORT_X)},${f2(C.position.z - b.FORT_Z)} thrown ${!!thrown}`);
  }
  log('HOOK (start:yaw/pitch, Z = pulled, !n = frames off the courts)', rows.join(' '));
  log('HOOK OFF THE COURTS', out.length ? '\n  ' + out.join('\n  ') : 'none');
}
// the walk's `legal` round the spot (+x across, +z down; 0.2 m a char): . legal  # no floor/mask  | a face from the spot  o off main  @ the spot
{
  const fy = FEET, rows = [];
  for (let dz = -3; dz <= 3.01; dz += 0.25) {
    let r = '';
    for (let dx = -4; dx <= 4.01; dx += 0.2) {
      const x = WX + dx, z = WZ + dz;
      if (Math.abs(dx) < 0.1 && Math.abs(dz) < 0.13) { r += '@'; continue; }
      if (!b.keepFloorAtS(x, z, fy, b.FORT_STEP, S) || !b.fortMaskAt(x, z)) { r += '#'; continue; }
      if (b.keepWallNear(x, z, b.FORT_BODY, fy + 0.35, fy + 1.8, S)) { r += 'w'; continue; }
      if (!b.siteOnMain(S, x, z)) { r += 'o'; continue; }
      r += '.';
    }
    rows.push(r);
  }
  log('MAP x -4..4 (0.2) z -3..3 (0.25) round the spot; w = in a wall at the body, # = no floor/off the mask, o = off the main court');
  for (const r of rows) log('|' + r);
}
if (Q.get('views')) {   // from the corner he was pressed into, four ways (heading deg: 0 = -z)
  const R = b.renderer; R.setSize(960, 600, false); C.aspect = 1.6; C.updateProjectionMatrix();
  for (const deg of (Q.get('views') || '60,90,135,294').split(',').map(Number)) {
    C.position.set(b.FORT_X + 14.03, b.FORT_Y + 0.94 + eye, b.FORT_Z - 14.97); b.camBaseY = C.position.y; b.look(deg * Math.PI / 180, -0.05); w.__adv(1);
    C.position.set(b.FORT_X + 14.03, b.FORT_Y + 0.94 + eye, b.FORT_Z - 14.97); b.look(deg * Math.PI / 180, -0.05);
    C.updateMatrixWorld(true); R.render(b.scene, C);
    const c = document.createElement('canvas'); c.width = 960; c.height = 600; c.getContext('2d').drawImage(R.domElement, 0, 0, 960, 600);
    const u64 = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(u64.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', 'h' + deg, i + '/' + n, u64.slice(i * 8000, (i + 1) * 8000));
  }
}
if (Q.get('fmap')) {   // floor heights round the spot: what the walk would stand on from the courts' height (+x across, +z down, 0.25 m)
  const [xa, xb, za, zb] = Q.get('fmap').split(',').map(Number), fy = b.FORT_Y + 1.13, rows = [];
  for (let z = za; z <= zb + 1e-6; z += 0.25) {
    let r = '';
    for (let x = xa; x <= xb + 1e-6; x += 0.25) {
      const X = b.FORT_X + x, Z = b.FORT_Z + z;
      if (Math.abs(x - 13.9) < 0.13 && Math.abs(z + 15.02) < 0.13) { r += '@'; continue; }
      const st = b.keepFloorAtS(X, Z, fy, 0.42, S);
      if (!st || !b.fortMaskAt(X, Z)) { r += ' '; continue; }
      const f = st.f - b.FORT_Y;
      if (b.keepWallNear(X, Z, 0.05, st.f + 0.35, st.f + 1.8, S)) { r += '|'; continue; }
      const main = b.siteOnMain(S, X, Z);
      r += f > 1.08 ? (main ? '.' : 'o') : f > 0.98 ? (main ? '1' : 'q') : f > 0.9 ? (main ? '9' : 'n') : (main ? '_' : 'u');
    }
    rows.push(r);
  }
  log('FMAP x', xa, '..', xb, 'z', za, '..', zb, ': . floor 1.13  1 floor ~1.01  9 floor ~0.94  _ lower  (o q n u: the same, off the main court)  | a face  blank: no floor');
  for (const r of rows) log('#' + r);
}
if (Q.get('exact')) {   // his exact eye, his FOV, nothing run: what the owner's screenshot should show
  w.requestAnimationFrame = () => 0;
  const R = b.renderer; R.setSize(1000, 418, false); C.aspect = 1000 / 418; C.fov = 105 / (1000 / 418) * 1.0; C.fov = 2 * Math.atan(Math.tan(105 * Math.PI / 360) / (1000 / 418) * 1.6) * 180 / Math.PI;
  for (const [nm, fy] of [['ex113', 1.13], ['ex094', 0.94]]) {
    C.position.set(WX, b.FORT_Y + fy + eye, WZ); b.look(YAW, 0); C.position.set(WX, b.FORT_Y + fy + eye, WZ);
    C.updateProjectionMatrix(); C.updateMatrixWorld(true); b.scene.updateMatrixWorld(true); R.render(b.scene, C);
    const c = document.createElement('canvas'); c.width = 1000; c.height = 418; c.getContext('2d').drawImage(R.domElement, 0, 0, 1000, 418);
    const u64 = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(u64.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', nm, i + '/' + n, u64.slice(i * 8000, (i + 1) * 8000));
  }
  log('fov', C.fov.toFixed(1), 'ocean visible', b.scene.getObjectByName ? '' : '');
}
if (Q.get('cands')) {   // the overlay's pixel digits read other ways: each spot at his eye and look
  w.requestAnimationFrame = () => 0;
  const R = b.renderer; R.setSize(500, 209, false); C.aspect = 500 / 209; C.fov = 2 * Math.atan(Math.tan(105 * Math.PI / 360) / (500 / 209) * 1.6) * 180 / Math.PI;
  for (const cs of Q.get('cands').split(';')) {
    const [x, z] = cs.split(',').map(Number), X = b.FORT_X + x, Z = b.FORT_Z + z;
    const st = b.keepFloorAtS(X, Z, b.FORT_Y + 1.13, 0.42, S);
    log('CAND', x, z, 'floor', st ? f2(st.f - b.FORT_Y) : '-', 'mask', b.fortMaskAt(X, Z), 'main', b.siteOnMain(S, X, Z), 'wall', !!b.keepWallNear(X, Z, 0.26, b.FORT_Y + 1.5, b.FORT_Y + 2.8, S));
    C.position.set(X, b.FORT_Y + 1.13 + eye, Z); b.look(YAW, 0); C.position.set(X, b.FORT_Y + 1.13 + eye, Z);
    C.updateProjectionMatrix(); C.updateMatrixWorld(true); R.render(b.scene, C);
    const c = document.createElement('canvas'); c.width = 500; c.height = 209; c.getContext('2d').drawImage(R.domElement, 0, 0, 500, 209);
    const u64 = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(u64.length / 8000);
    for (let i = 0; i < n; i++) console.log('[PBIMG]', 'c' + cs.replace(/[,.;-]/g, '_'), i + '/' + n, u64.slice(i * 8000, (i + 1) * 8000));
  }
}
if (Q.get('top')) {   // straight down over the spot, the castle drawn, the spot a red dot (+x right, -z up)
  w.requestAnimationFrame = () => 0;
  const T = b.THREE, H = +Q.get('top'), R = b.renderer; R.setSize(900, 900, false);
  const oc = new T.OrthographicCamera(-H, H, H, -H, 0.1, 400); oc.position.set(WX, 120, WZ); oc.up.set(0, 0, -1); oc.lookAt(WX, 0, WZ); oc.updateMatrixWorld(true);
  const dot = new T.Mesh(new T.SphereGeometry(H / 40), new T.MeshBasicMaterial({ color: 0xff2020, depthTest: false })); dot.position.set(WX, 60, WZ); dot.renderOrder = 1e6; b.scene.add(dot);
  const fw = b.fortWorld(); log('fort visible', fw && fw.visible, 'inFort', b.state().inFort);
  R.render(b.scene, oc); b.scene.remove(dot);
  const c = document.createElement('canvas'); c.width = 900; c.height = 900; c.getContext('2d').drawImage(R.domElement, 0, 0, 900, 900);
  const u64 = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(u64.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'top' + H, i + '/' + n, u64.slice(i * 8000, (i + 1) * 8000));
}
// a still from where he stood, the way he looked
{
  place(); b.look(YAW, 0); w.__adv(1);
  w.requestAnimationFrame = () => 0;
  const R = b.renderer; R.setSize(960, 600, false); C.aspect = 1.6; C.updateProjectionMatrix(); C.updateMatrixWorld(true); R.render(b.scene, C);
  const c = document.createElement('canvas'); c.width = 960; c.height = 600; c.getContext('2d').drawImage(R.domElement, 0, 0, 960, 600);
  const u64 = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(u64.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'view', i + '/' + n, u64.slice(i * 8000, (i + 1) * 8000));
}
log('DONE');
