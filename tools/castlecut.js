/* KILLS AND CUTS IN THE CASTLE (2026-11-24, the owner: "the fall animation for farmers he fell through the floor and every
 * hit is laggy. improve the combat again make it feel smoother"). The garrison booted (`fortboot`), one man at a time out in
 * the street, the katana's real swings: per cut and per kill, the frame's REAL cost (outer clock) on the frame the blow lands
 * and the worst in the second after; the world's freeze (`hitstop`) and slow beat; and for a kill, every ragdoll part's
 * lowest point under the floor under it (`groundUnder`) over 3 s. &n= kills.
 * PB_PORT=4241 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/castlecut.js' <out> */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 6);
if (Q.get('zd')) w.__bwZDieAll = true;
if (Q.get('musoff')) w.__musOff = 1; if (Q.get('nothroe')) w.__noThroe = 1; if (Q.get('oldw')) w.__ragOldW = 1; if (Q.get('nowall')) w.__noFortWall = 1; if (Q.get('dbgwall')) w.__fwDbg = [];   // (2026-11-25: which of them throws a dead body about)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.farm && x.farm.out && x.model).length >= N + 1); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
const C = b.camera, T = b.THREE, f2 = (v) => (+v).toFixed(2);
const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat);
const pool = units().filter((x) => x.farm && x.farm.out && x.model).slice(0, N + 1);
for (const o of units()) if (!pool.includes(o)) o.g.position.y -= 300;
const frameMs = () => { const t0 = performance.now(); w.__adv(1); return performance.now() - t0; };
// a warm second first (compiles, first draws), then a baseline
for (let i = 0; i < 60; i++) w.__adv(1);
let base = 0; for (let i = 0; i < 30; i++) base += frameMs(); base /= 30;
log('baseline frame', f2(base), 'ms');
let k = 0;
for (const u of pool) {
  for (const o of pool) if (o !== u && o.g.position.y > -100) o.g.position.y -= 300;
  const p = u.g.position, f = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
  const ay = [1.5, 1.0, 0.5, 1.3, 0.7, 1.6, 1.2][k % 7], P = k % 2;
  const killNow = k < N; k++;
  u.st.hp = killNow ? 1 : 999; u.st.awake = true; u.lastHitMine = true;
  const put = () => { C.position.set(p.x + f.x * 1.75, p.y + 1.7, p.z + f.z * 1.75); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + ay, p.z); };
  for (let i = 0; i < 10; i++) { put(); w.__adv(1); }
  const stoodY = p.y, gU = b.groundUnder(p.x, p.z), wf = b.walkFloorS ? b.walkFloorS(p.x, p.z, p.y) : null;
  const hp0 = u.st.hp; let land = -1, worst = 0, landMs = 0, hs = 0, slow = 0;
  for (let i = 0; i < 120; i++) {
    put(); if (i === 2) b.startDig(P);
    const ms = frameMs();
    if (land < 0 && (u.st.hp < hp0 || !u.st.alive)) { land = i; landMs = ms; hs = b.hitstop; }
    if (land >= 0) { worst = Math.max(worst, ms); slow = Math.max(slow, b.killSlowS()); }
    if (land >= 0 && i - land > 60) break;
  }
  let under = 0, tooLow = 0, floorAt = null, how = '';
  const FL = (x, z, y) => { const f = b.bunkerFloorAtS(x, z, y); return f === null || f === undefined ? null : f; };
  const bonesLow = () => { let lo = Infinity, at = null; u.model.updateMatrixWorld(true); u.model.traverse((o) => { if (o.isBone) { const v = o.getWorldPosition(new T.Vector3()); if (v.y < lo) { lo = v.y; at = v; } } }); return at; };
  let fly = { top: 0, pk: 0, travel: 0, late: 0, h0: null, up: 0 };   // (2026-11-25 "they still fly around after death": how high, how far, how late)
  if (killNow) {
    for (let i = 0; i < 240; i++) {
      w.__adv(1);
      if (u.rag && !u.__toeLogged) { u.__toeLogged = 1; const R = u.rag; const toe = R.byName['Character1_LeftToeBase'];
    if (toe) { const cs = R.cons.filter((c) => c.a === toe || c.b === toe).map((c) => `${(c.a === toe ? c.b : c.a).name.replace('Character1_', '')} d ${f2(c.d)}${c.stiff ? ' stiff' : ''}`);
      const bs = R.bends.filter((c) => c.a === toe || c.c === toe).map((c) => `bend ${(c.a === toe ? c.c : c.a).name.replace('Character1_', '')} min ${f2(c.min)}`);
      const hs = R.hits.filter((c) => c.a === toe || c.b === toe).map((c) => `hit ${(c.a === toe ? c.b : c.a).name.replace('Character1_', '')} ${f2(c.d)}`);
      log('    toe at ragdoll start: cons', cs.join(', '), '|', bs.join(', '), '|', hs.join(', '), '| foot built', !!R.byName['Character1_LeftFoot'], '| toe-foot', R.byName['Character1_LeftFoot'] ? f2(toe.p.distanceTo(R.byName['Character1_LeftFoot'].p)) : '-'); } }
      if (u.rag) { const R = u.rag, hp = R.byName['Character1_Hips'] || R.parts[0], fl = hp.floor ?? stoodY; if (!fly.h0) fly.h0 = hp.p.clone(); fly.top = Math.max(fly.top, hp.p.y - fl); fly.travel = Math.max(fly.travel, Math.hypot(hp.p.x - fly.h0.x, hp.p.z - fly.h0.z));
        for (const q of R.parts) { fly.pk = Math.max(fly.pk, q.p.y - (q.floor ?? stoodY)); const v = q.p.distanceTo(q.pp) * 180; if (i > 90 && v > fly.late) { fly.late = v; fly.who = `${q.name.replace('Character1_', '')} at ${f2(q.p.x)},${f2(q.p.y)},${f2(q.p.z)} floor ${q.floor !== undefined ? f2(q.floor) : '-'} r ${f2(q.r)} moving ${f2((q.p.x - q.pp.x) * 180)},${f2((q.p.y - q.pp.y) * 180)},${f2((q.p.z - q.pp.z) * 180)} asleep ${R.asleep} landed ${!!R.landed} wallHit ${R.wallHit}`; } if (i > 30 && q.p.y - q.pp.y > 0) fly.up = Math.max(fly.up, (q.p.y - q.pp.y) * 180); } }
      if (u.rag) { how = how || 'ragdoll'; for (const q of u.rag.parts) { const g = FL(q.p.x, q.p.z, q.p.y + 0.6); if (g !== null) { const d = g - q.p.y; if (d > under) { under = d; floorAt = g; } if (q.p.y < g - 0.15) tooLow++; } } }
      else if (u.model) { how = u.zDie ? 'dies on his feet' : how || 'clip'; const v = bonesLow(); const g = v && FL(v.x, v.z, v.y + 0.6); if (g !== null && v) { const d = g - v.y; if (d > under) { under = d; floorAt = g; } if (v.y < g - 0.15) tooLow++; } }
    }
  }
  if (killNow) log('  FLIGHT hips highest', f2(fly.top), '| any joint highest', f2(fly.pk), '| hips travelled', f2(fly.travel), '| fastest joint after 1.5 s', f2(fly.late), 'm/s | fastest rising after 0.5 s', f2(fly.up), 'm/s'); if (killNow && fly.who) log('    the fast one:', fly.who);
  let restLo = Infinity; if (u.rag) for (const q of u.rag.parts) restLo = Math.min(restLo, q.p.y);
  log('  stood at y', f2(stoodY), '| groundUnder', gU, '| body at rest: lowest joint y', f2(restLo), '| floor the ragdoll used', u.rag && u.rag.parts[0].floor !== undefined ? f2(u.rag.parts[0].floor) : '-');
  log(killNow ? 'kill' : 'cut', k - 1, P ? 'heavy' : 'light', 'at', ay, '| landed', land >= 0, '| frame on the blow', f2(landMs), 'ms, worst after', f2(worst), '| freeze', f2(hs), 'slow', f2(slow),
    killNow ? `| ${how} | deepest under the floor ${f2(under)} m (floor ${floorAt !== null ? f2(floorAt) : '-'}) part-frames 15 cm under ${tooLow}` : '', '| zdie', !!u.zDie || !!(u.st && u.st.zd));
  u.g.position.y -= 300;
}
