/* THE KING ROUND A PILLAR (2026-11-20): you stand hard behind one of the ring's pillars (outside it), he is put on the
 * other side; how long he takes to reach you, and whether he does. Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingpillar.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0), P = b.KING_PILLARS;
w.__clockOn();
C.position.set(X - 12, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) w.__adv(1);
for (let i = 0; i < 30; i++) w.__adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); w.__adv(2);
const a = P.a0, sx = Math.sin(a), sz = Math.cos(a);
for (let trial = 0; trial < 3; trial++) {
  // you: just outside the pillar's outer face; him: inside the ring, the pillar between
  const rY = P.face + 4.5 + trial, rK = P.face - 4 - trial;
  C.position.set(X + sx * rY, 0, Z + sz * rY); C.position.y = Y + b.tmpFloorAt(C.position.x - X, C.position.z - Z) + 1.7;
  u.g.position.set(X + sx * rK, 0, Z + sz * rK); u.g.position.y = Y + b.tmpFloorAt(u.g.position.x - X, u.g.position.z - Z);
  u.st.atk = -1; b.KING.mode = 'fight'; w.__adv(1);
  let reached = -1, minD = 1e9;
  for (let f = 0; f < 60 * 15; f++) {
    const keepC = C.position.clone(); b.lookAt(u.g.position.x, u.g.position.y + 1.7, u.g.position.z); w.__adv(1); C.position.copy(keepC);
    const d = Math.hypot(C.position.x - u.g.position.x, C.position.z - u.g.position.z); minD = Math.min(minD, d);
    if (f % 60 === 0) log('  trial', trial, 't', (f / 60).toFixed(0), 'mode', b.kingS().mode, 'dist', d.toFixed(2), 'blocked', b.kingLineBlockedS(u), 'swing', u.st.atk >= 0 ? u.st.swing : '-');
    if (reached < 0 && d < 2.6 && !b.kingLineBlockedS(u)) { reached = f / 60; break; }
  }
  log('TRIAL', trial, 'reached you in', reached < 0 ? 'never' : reached.toFixed(1) + ' s', 'closest', minD.toFixed(2));
  b.heal();
}
