/* ONE FORCED BLOW, FRAME BY FRAME (2026-11-16). Not part of the game. `sh tools/probe.sh 'evalFile&f=/tools/dkwalk.js&k=dkTurn&d=4.3'` */
const Q = new URLSearchParams(location.search), K = Q.get('k') || 'dkTurn', D0 = +(Q.get('d') || 4.3);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
for (const f of b.farmUnitsS()) f.st.awake = false;
b.dkTurn(u, true);
for (let i = 0; i < 120; i++) { w.__adv(1); b.heal(); for (const f of b.farmUnitsS()) f.st.awake = false; }
const C = b.camera.position, P = u.g.position;
for (let rep = 0; rep < 2; rep++) {
  for (let i = 0; i < 200 && u.st.atk >= 0; i++) w.__adv(1);
  const ry = u.g.rotation.y; C.x = P.x + Math.sin(ry) * D0; C.z = P.z + Math.cos(ry) * D0; const home = [C.x, C.z];
  u.st.swing = K; u.st.atk = 0; u.st.chained = false; u.st.chainAt = -1; u.st.cool = 0; u.st.forceSwing = null;
  const A = u.atk[K];
  log('FORCE', K, 'wind', A.wind.toFixed(2), 'rmStop', A.rmStop, 'rmFrom', A.rmFrom.map((x) => x.toFixed(2)).join('-'), 'clip', A.clip);
  let f = 0;
  while (u.st.atk >= 0 && u.st.swing === K && f < 200) {
    b.lookAt(P.x, C.y - 0.2, P.z);
    const p0 = P.clone();
    w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal(); f++;
    const d = Math.hypot(P.x - C.x, P.z - C.z), a = u.clips[A.clip];
    if (f % 4 === 0 || (u.st.atk >= A.wind && u.st.atk < A.wind + 0.05)) log('  f', f, 'atk', u.st.atk.toFixed(2), 'd', d.toFixed(2), 'moved', Math.hypot(P.x - p0.x, P.z - p0.z).toFixed(3), 'cur', u.cur && u.cur.getClip().name, 'w', u.cur && u.cur.getEffectiveWeight().toFixed(2), 'clipT', a && (a.time / a.getClip().duration).toFixed(2), 'k', u.dkRM ? (u.dkRM.k || 0).toFixed(2) : '-', 'face', (u.faceOff || 0).toFixed(2), 'hitstop', b.state().hitstop);
  }
  log('END', K, 'frames', f, 'final d', Math.hypot(P.x - C.x, P.z - C.z).toFixed(2));
}
