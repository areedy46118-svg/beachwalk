/* HIS WALK, MEASURED (2026-11-26, the owner: "fix his walk animations too they look weird"). The fight on; you back away at
 * `&v=` m/s (1.6) keeping him coming, then circle him. Every frame he is not swinging: his speed over the floor, the clip he
 * is on and its rate, the angle between the way he travels and the way he faces, and for each toe that is DOWN (within 0.1 m
 * of its own lowest height) how fast it slides over the floor. Summed by clip: a walk that fits reads a slide near 0.
 *   PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/scourgewalk.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), VB = +(Q.get('v') || 1.6);
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.setKingDown(true); for (let i = 0; i < 20; i++) adv(1);
const fy = (x, z) => Y + b.tmpFloorAt(x - X, z - Z);
let px = X - (+(Q.get('d') || 4.5)), pz = Z; const RD = +(Q.get('d') || 4.5); const put = () => { C.position.set(px, fy(px, pz) + 1.7, pz); b.camBaseY = C.position.y; b.lookAt(u.g.position.x, u.g.position.y + 2, u.g.position.z); };
put(); for (let i = 0; i < 30; i++) { put(); adv(1); }
if (b.kingFightOnS) b.kingFightOnS(u); else { b.KING.mode = 'fight'; u.st.puppet = false; u.st.awake = true; u.st.mine = true; }
const toes = ['Character1_LeftToeBase', 'Character1_RightToeBase'].map((n) => u.model.getObjectByName(n)), last = toes.map(() => null), lowY = toes.map(() => 1e9);
const S = {}; const lp = u.g.position.clone(); let ang = Math.PI;
const tv = new T.Vector3();
for (let f = 0; f < 60 * 34; f++) {
  const t = f / 60;
  if (t < 14) { const dd = Math.hypot(px - u.g.position.x, pz - u.g.position.z), ux = (px - u.g.position.x) / dd, uz = (pz - u.g.position.z) / dd; if (dd < RD + 0.3 && Math.hypot(px - X, pz - Z) < 19) { px += ux * VB / 60; pz += uz * VB / 60; } }   // backing away from him, never further than 4.8 m: he walks
  else { ang += 0.5 / 60; const d = Math.max(5.5, Math.hypot(px - u.g.position.x, pz - u.g.position.z)); px = u.g.position.x + Math.cos(ang) * RD; pz = u.g.position.z + Math.sin(ang) * RD; }   // then round him
  put(); adv(1);
  const p = u.g.position, vx = (p.x - lp.x) * 60, vz = (p.z - lp.z) * 60, sp = Math.hypot(vx, vz); lp.copy(p);
  u.g.updateMatrixWorld(true);
  const swingNow = u.st.atk >= 0, cur = (u.cur ? u.cur.getClip().name : '-') + (swingNow ? ' (swinging)' : '') + (b.KING.mode !== 'fight' ? ' [' + b.KING.mode + ']' : ''), swing = false;
  for (let i = 0; i < 2; i++) { toes[i].getWorldPosition(tv); const y = tv.y - fy(tv.x, tv.z); if (!swing && sp > 0.25) lowY[i] = Math.min(lowY[i], y);
    if (!swing && sp > 0.25 && last[i] && y < lowY[i] + 0.08) { const sl = Math.hypot(tv.x - last[i].x, tv.z - last[i].z) * 60; const R = S[cur] || (S[cur] = { n: 0, slide: 0, sp: 0, rate: 0, off: 0, fr: 0 }); R.n++; R.slide += sl; }
    last[i] = tv.clone(); }
  if (!swing && sp > 0.25) { const R = S[cur] || (S[cur] = { n: 0, slide: 0, sp: 0, rate: 0, off: 0, fr: 0 }); R.fr++; R.sp += sp; R.rate += u.cur ? u.cur.getEffectiveTimeScale() : 0;
    let a = Math.atan2(vx, vz) - (p0yaw()); a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); R.off += a * 57.3; }
}
function p0yaw() { return u.g.rotation.y + (u.model.rotation.y || 0); }
for (const k in S) { const R = S[k]; if (R.fr < 20) continue; log(k.padEnd(22), '| moving frames', R.fr, '| his speed', (R.sp / R.fr).toFixed(2), 'm/s | clip rate', (R.rate / R.fr).toFixed(2), '| travel vs facing', (R.off / R.fr).toFixed(0), 'deg | a planted toe slides', R.n ? (R.slide / R.n).toFixed(2) : '-', 'm/s over', R.n, 'samples'); }
log('toes lowest', lowY.map((v) => v.toFixed(2)).join(' '), '| clipSpeed', JSON.stringify(Object.fromEntries(Object.entries(u.clipSpeed || {}).filter(([k]) => ['walk', 'kSprint', 'sStalk'].includes(k)).map(([k, v]) => [k, +v.toFixed(2)]))));
log('DONE');
