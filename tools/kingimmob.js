/* THE KING HELD IN THE GOLD (2026-11-21, the owner: "IMMOBILIZE JUST BROKE THE FINAL BOSS WHERE HIS ANIMATION IS MESSED UP AND
 * SPINNING AROUND"). Dev teleport, his descent skipped to the fight, him fighting you 4 m off; `artImmobilize` on him, then
 * every 0.25 s of the hold: how far he has moved and turned from where it took him, and his clip's time; then after.
 * Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingimmob.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
w.__clockOn();
const u = b.KING.u, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
C.position.set(X - 12, Y + b.tmpFloorAt(-12, 0) + 1.7, Z); b.lookAt(X, Y + 2, Z);
for (let i = 0; i < 900 && b.kingS().mode !== 'descend'; i++) w.__adv(1);
w.__adv(30); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
for (let i = 0; i < 600 && b.kingS().mode !== 'fight'; i++) w.__adv(1);
w.__adv(90);
const P = u.g.position; log('mode', b.kingS().mode, 'at', P.x.toFixed(1), P.z.toFixed(1));
const put = () => { const d = Math.hypot(C.position.x - P.x, C.position.z - P.z) || 1; C.position.x = P.x + (C.position.x - P.x) / d * 4; C.position.z = P.z + (C.position.z - P.z) / d * 4; b.lookAt(P.x, P.y + 1.5, P.z); };
put(); w.__adv(2);
b.artImmobilize(u);
const p0 = P.clone(), r0 = u.g.rotation.y, clip = () => u.cur ? u.cur.getClip().name + '@' + u.cur.time.toFixed(2) : '-';
let maxD = 0, maxR = 0;
for (let f = 1; f <= 60 * 6; f++) {
  put(); w.__adv(1);
  const d = P.distanceTo(p0), dr = Math.abs(((u.g.rotation.y - r0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  if (u.st.immob > 0) { maxD = Math.max(maxD, d); maxR = Math.max(maxR, dr); }
  if (f % 15 === 0) log((f / 60).toFixed(2) + 's held', (u.st.immob > 0).toString(), 'moved', d.toFixed(3), 'turned', dr.toFixed(3), 'clip', clip(), 'mode', b.kingS().mode);
  if (!(u.st.immob > 0) && f % 15 === 0 && f > 60) break;
}
log('WHILE HELD: max moved', maxD.toFixed(3), 'm, max turned', maxR.toFixed(3), 'rad');
