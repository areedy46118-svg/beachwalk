/* THE KING STUDIED FRAME BY FRAME (2026-11-20, the owner: "THE FINAL BOSS FIGHT IS NOT GOOD MAKE ALL HIS HITS ACTUALLY
 * CONNECT … STUDY HIS MOVEMENTS AND HIT BOXES WITH GREAT DETAIL"). You stand still (or `&walk=1` drift side to side), turned
 * to him, never cutting, never guarding, healed when low. Every swing he throws is recorded every frame from wind-up to
 * recovery: his distance to you, the striking ends (hands, feet, knees) in YOUR CAMERA'S frame (x right, y up, z ahead of
 * the lens), the nearest any striking segment comes to the face point (on your eye line, 0.25 m ahead of the lens), whether
 * the game's hit test says yes this frame, and whether health was taken. Then per blow: where the nearest approach falls
 * against the contact window, how far, where on screen. And where his time goes (swinging / closing / circling / stunned).
 * `&walk=1` you strafe side to side; `&flee=5.71` you sprint straight away; `&guard=1` the guard up through every contact
 * (katana); `&only=kgBike` only that blow; `&shots=n` stills as blows land; `&strip=kgBike` a still every 0.2 s through one;
 * `&verb=2` every frame of the first swings (`&all=1` the whole swing).
 * Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingstudy.js&secs=40' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 40), WALK = !!+(Q.get('walk') || 0), VERB = +(Q.get('verb') || 2), FLEE = +(Q.get('flee') || 0), GUARD = !!+(Q.get('guard') || 0);
let blocks = 0, parries = 0, guardHits = 0, stamLow = 1;
const SHOTS = +(Q.get('shots') || 0), tiles = [];
const grab = (lab) => { b.renderer.render(b.scene, b.camera); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(lab, 6, 15); tiles.push(c); };
b.settings.devMode = false;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
w.__clockOn();
C.position.set(X - 20, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) w.__adv(1);
for (let i = 0; i < 30; i++) w.__adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); w.__adv(2);
for (let i = 0; i < 30; i++) w.__adv(1);
log('blows', b.kingBlowsS());
if (Q.get('only')) { const o = {}; for (const k of Q.get('only').split(',')) o[k] = 1; u.kind.use = Object.assign({ kgRun: 0 }, o); }
if (GUARD) { b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem); w.__adv(30); }
const RAG = u.kind.rag, bone = (n) => u.model.getObjectByName(RAG['Character1_' + n]);
const chains = [['RightArm', 'RightForeArm', 'RightHand'], ['LeftArm', 'LeftForeArm', 'LeftHand'], ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'], ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase']].map((c) => c.map(bone));
const _a = new T.Vector3(), _b = new T.Vector3(), _p = new T.Vector3(), _f = new T.Vector3(), _c = new T.Vector3();
const face = () => { C.getWorldDirection(_f); return _c.copy(C.position).addScaledVector(_f, 0.25); };
function near(i) {
  const fp = face(), ch = chains[i]; let best = 1e9, bp = null;
  for (let j = 1; j < ch.length; j++) {
    ch[j - 1].getWorldPosition(_a); ch[j].getWorldPosition(_b);
    for (let k = 0; k <= 8; k++) { _p.lerpVectors(_a, _b, k / 8); const d = _p.distanceTo(fp); if (d < best) { best = d; bp = _p.clone(); } }
  }
  const cs = bp.clone().applyMatrix4(C.matrixWorldInverse);
  return { d: best, x: cs.x, y: cs.y, z: -cs.z, scr: bp.clone().project(C) };
}
const f2 = (x) => (x >= 0 ? ' ' : '') + x.toFixed(2);
const time = { swing: 0, stun: 0, recoil: 0, down: 0, cool: 0, move: 0, still: 0, puppet: 0 };
let cur = null, n = 0, hpLast = b.state().hp, lost = 0, lastP = u.g.position.clone();
const sums = {}, whyStill = {}, modes = {}, ends = {};
function closeSwing() {
  if (!cur) return;
  const s = cur, A = s.A, r = sums[s.k] || (sums[s.k] = { n: 0, landedAny: 0, took: 0, nearIn: [], nearAll: [], tNear: [], dist: [] });
  r.n++; if (s.landed) r.landedAny++; if (s.took) r.took++;
  for (const w0 of s.wins) {
    const inWin = s.fr.filter((q) => q.t >= w0 && q.t <= w0 + A.strike + 0.04);
    const bestIn = inWin.reduce((m, q) => (q.nd < m.nd ? q : m), { nd: 9 });
    const bestAll = s.fr.reduce((m, q) => (q.nd < m.nd ? q : m), { nd: 9 });
    r.nearIn.push(bestIn.nd.toFixed(2)); r.nearAll.push(bestAll.nd.toFixed(2) + '@' + (bestAll.t - w0).toFixed(2)); r.dist.push(inWin.length ? inWin[0].dist.toFixed(2) : '-');
  }
  if (VERB >= 2 && n <= 14) {
    log('— swing', n, s.k, 'wind', A.wind.toFixed(2), 'strike', A.strike.toFixed(2), 'more', (A.moreT || []).map((x) => x.toFixed(2)).join(','), 'stop', (A.stop || 0).toFixed(2), 'faceOff', ((A.faceOff || 0) * 57.3).toFixed(0), 'chained', s.chained, 'landed', s.landed, 'took', s.took);
    for (const q of s.fr) if (Q.get('all') || s.wins.some((w0) => q.t >= w0 - 0.25 && q.t <= w0 + A.strike + 0.2) && (q.i % 2 === 0 || q.hit))
      log('   t', q.t.toFixed(2), 'dist', q.dist.toFixed(2), 'yawErr', f2(q.yawErr), 'end x', f2(q.x), 'y', f2(q.y), 'z', f2(q.z), 'near', q.nd.toFixed(2), 'scr', f2(q.sx) + ',' + f2(q.sy), q.win ? 'WIN' : '   ', q.hit ? 'HITTEST' : '', q.took ? 'TOOK' : '');
  }
  cur = null;
}
let side = 1, sideT = 0;
for (let f = 0; f < 60 * SECS; f++) {
  const p = u.g.position, st = u.st;
  if (WALK && (sideT -= 1 / 60) <= 0) { side = -side; sideT = 1.2 + Math.random(); }
  if (WALK) { const dx = C.position.x - p.x, dz = C.position.z - p.z, d = Math.hypot(dx, dz) || 1; C.position.x += (-dz / d) * side * 2.5 / 60; C.position.z += (dx / d) * side * 2.5 / 60; }
  if (FLEE && b.kingS().mode === 'fight') { const ox = C.position.x - X, oz = C.position.z - Z, ol = Math.hypot(ox, oz) || 1; C.position.x += ox / ol * FLEE / 60; C.position.z += oz / ol * FLEE / 60; C.position.y = Y + b.tmpFloorAt(C.position.x - X, C.position.z - Z) + 1.7; if (f % 120 === 0) log('flee r', ol.toFixed(1), 'his dist', Math.hypot(C.position.x - p.x, C.position.z - p.z).toFixed(2), 'clip', u.cur && u.cur.getClip().name, 'hp', b.state().hp); }
  b.lookAt(p.x, p.y + 1.75, p.z);
  if (GUARD) { const A0 = st.atk >= 0 && u.atk ? u.atk[st.swing] : null; const inW = A0 && [A0.wind, ...(A0.moreT || [])].some((t0) => st.atk >= t0 - 0.3 && st.atk <= t0 + A0.strike + 0.05); if (inW && !b.blockingS()) b.setGuardTest(true, 0.4); else if (!inW && b.blockingS()) b.setGuardTest(false); }
  const stam0 = b.state().stamina;
  w.__adv(1);
  if (GUARD && b.state().stamina < stam0 - 0.05) blocks++;
  stamLow = Math.min(stamLow, b.state().stamina);
  const mode = b.kingS().mode;
  if (mode !== 'fight') { time.puppet++; modes[mode] = (modes[mode] || 0) + 1; }
  else if (st.atk >= 0) time.swing++; else if (st.stun > 0) time.stun++; else if (st.recoil > 0) time.recoil++; else if ((st.down || 0) > 0) time.down++;
  else { const v = Math.hypot(p.x - lastP.x, p.z - lastP.z) * 60; if (v > 0.4) time.move++; else if (st.cool > 0) time.cool++; else { time.still++; const dd = Math.hypot(C.position.x - p.x, C.position.z - p.z); const key = 'tok' + (b.mutTokenS() === u ? 'Me' : b.mutTokenS() ? 'Other' : 'None') + ' near' + (dd <= (u.maxReach || 9)) + ' side' + st.side + ' back' + (st.back > 0) + ' struck' + !!st.struck + ' roar' + (st.roar > 0); whyStill[key] = (whyStill[key] || 0) + 1; } }
  lastP.copy(p);
  const hn = b.state().hp, took = hn < hpLast; if (took) lost += hpLast - hn; if (hn < 4) b.heal(); hpLast = b.state().hp;
  const A = st.atk >= 0 && u.atk ? u.atk[st.swing] : null;
  if (A && (!cur || cur.k !== st.swing || st.atk < cur.lastT)) { closeSwing(); n++; cur = { k: st.swing, A, fr: [], wins: [A.wind, ...(A.moreT || [])], chained: !!st.chained, landed: false, took: false, lastT: 0 }; }
  if (!A && cur) { const c0 = cur.wins[0]; if (cur.lastT < c0) { const why = 'feint' + (st.feint > 0) + ' recoil' + (st.recoil > 0) + ' stun' + (st.stun > 0) + ' mode ' + mode + ' cool' + (st.cool||0).toFixed(2); ends[why] = (ends[why] || 0) + 1; } }
  if (!A) closeSwing();
  if (cur && A) {
    cur.lastT = st.atk;
    const t = st.atk, win = cur.wins.some((w0) => t >= w0 && t < w0 + A.strike + 0.04);
    let best = null; for (const i of (A.limbs || [0, 1])) { const q = near(i); if (!best || q.d < best.d) best = q; }
    const hit = b.blowLandsS(u);
    const dx = C.position.x - p.x, dz = C.position.z - p.z;
    let yawErr = Math.atan2(dx, dz) - u.g.rotation.y; yawErr = Math.atan2(Math.sin(yawErr), Math.cos(yawErr)) * 57.3;
    cur.fr.push({ i: cur.fr.length, t, dist: Math.hypot(dx, dz), yawErr, x: best.x, y: best.y, z: best.z, nd: best.d, sx: best.scr.x, sy: best.scr.y, win, hit, took });
    if (took) cur.took = true;
    if (Q.get('strip') && cur.k === Q.get('strip') && !w.__stripDone && cur.fr.length % 12 === 1 && tiles.length < SHOTS) grab(cur.k + ' t ' + t.toFixed(2) + ' lift ' + (u.model.position.y).toFixed(2) + ' d ' + Math.hypot(dx, dz).toFixed(2) + (hit ? ' HIT' : ''));
    if (Q.get('strip') && cur.k !== Q.get('strip') && tiles.length) w.__stripDone = 1;
    if (!Q.get('strip') && win && hit && !cur.landed && tiles.length < SHOTS) grab(cur.k + ' lands, dist ' + Math.hypot(dx, dz).toFixed(2));
    if (win && hit) cur.landed = true;
  }
}
closeSwing();
for (const k in sums) { const r = sums[k]; log(k.padEnd(8), 'swings', r.n, 'test-yes in window', r.landedAny, 'took health', r.took, '| nearest in window', r.nearIn.slice(0, 10).join(' '), '| nearest overall @t-from-contact', r.nearAll.slice(0, 8).join(' '), '| dist at contact', r.dist.slice(0, 10).join(' ')); }
const tot = Object.values(time).reduce((a, b2) => a + b2, 0);
log('guard: blocks', blocks, 'lowest stamina', stamLow.toFixed(2));
log('puppet modes', JSON.stringify(modes), 'swing ends', JSON.stringify(ends));
log('still because', JSON.stringify(whyStill), 'maxReach', u.maxReach);
log('time:', Object.entries(time).map(([k, v]) => k + ' ' + (100 * v / tot).toFixed(0) + '%').join('  '), '| health taken', lost, 'swings', n, 'his hp', u.st.hp, 'errors', errs.length, errs.slice(0, 3).join(' | '));

if (tiles.length) {
  const cols = 3, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
  const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'kingstudy', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}
