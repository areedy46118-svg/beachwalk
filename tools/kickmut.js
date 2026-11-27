/* KICKING A BEACH MUTANT OVER (2026-11-26, "make mutants get knocked over by some kicks too not as much as farmers"). On the open beach
 * a pale mutant at full health, kicked from 1.6 m (`&air=1` as jump kicks) until it is thrown or 20 kicks: how many kicks it took,
 * how far it flew, how long in the ragdoll, when it was up, alive, and the worst a bone went under the sand while it rose.
 *   PB_PORT=4244 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/kickmut.js' <out> */
const Q = new URLSearchParams(location.search);
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1000);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true; w.__clockOn();
const C = b.camera; let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
for (let i = 0; i < 80 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
for (let round = 0; round < 3; round++) {
  const u = b.mutSpawnTest(X, Z - 1.6, Q.get('k') || 'pale', 0);
  for (let i = 0; i < 900 && !(u.model && u.mixer); i++) { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; w.__adv(1); await sleep(8); }
  let kicks = 0;
  for (; kicks < 20 && !u.kickRag; kicks++) {
    const m = u.g.position; for (let i = 0; i < 6; i++) { C.position.set(m.x, 1.7, m.z + 1.6); b.camBaseY = 1.7; b.lookAt(m.x, 1.3, m.z); w.__adv(1); }
    u.st.hp = Math.max(u.st.hp, 6); u.st.awake = true; b.KICK.cd = 0; b.heal(); if (Q.get('air')) b.KICK.forceAir = true;
    b.startKick(); const at = C.position.clone(); for (let i = 0; i < 12; i++) { C.position.copy(at); w.__adv(1); } b.KICK.forceAir = false;
    for (let i = 0; i < 40 && !u.kickRag; i++) { C.position.copy(at); w.__adv(1); }
  }
  if (!u.kickRag) { log('round', round, 'not thrown in', kicks, 'kicks'); u.g.visible = false; continue; }
  const at = C.position.clone(), p0 = u.g.position.clone(); let far = 0, tRag = 0, upAt = -1, under = 0;
  for (let i = 0; i < 400; i++) { C.position.copy(at); w.__adv(1);
    if (u.rag) { const H = u.rag.byName.Character1_Hips || u.rag.parts[0]; far = Math.max(far, Math.hypot(H.p.x - p0.x, H.p.z - p0.z)); tRag = i / 60; }
    else if (u.st.down > 0) { let lo = 9; u.model.updateMatrixWorld(true); u.model.traverse((o) => { if (o.isBone && /Head$|Hand$|Hips|Spine2|Foot$|Leg$/.test(o.name)) lo = Math.min(lo, o.getWorldPosition(new b.THREE.Vector3()).y); }); under = Math.max(under, (u.g.position.y - (u.dfLift || 0)) - lo); }
    else if (upAt < 0) upAt = i / 60; }
  log('round', round, '| thrown on kick', kicks + 1, '| flew', far.toFixed(2), 'm | ragdoll', tRag.toFixed(2), 's | up at', upAt < 0 ? 'NEVER' : upAt.toFixed(2) + ' s', '| alive', u.st.alive, '| rose by', u.st.riseClipNow || '(done)', '| worst bone under the sand', under.toFixed(2), 'm');
  u.g.visible = false;
}
log('DONE');
