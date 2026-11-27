/* THE WATER BALL GOES WHERE IT IS AIMED (2026-11-25, the owner: "the water ball hits the ground when shooting at a far enemy"). A man
 * stood at 10, 25 and 40 m down the beach, the crosshair on his chest, one ball each: where it burst, how far from his chest, did it
 * hurt him.  PB_PORT=4241 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/seaaim.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true;
const C = b.camera;
b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem);
b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.katanaItem);
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
const X = 6, Z = -80;
const u = b.mutSpawnTest(X, Z - 10, 'pale', 0); for (let i = 0; i < 300 && !u.model; i++) { b.frame(1); await sleep(20); }
w.__clockOn(); w.__adv(30);
for (const d of [10, 25, 40]) {
  for (let i = 0; i < 400 && b.seaBall.cd > 0; i++) w.__adv(1);
  u.st.alive = true; u.st.hp = 99; u.st.awake = false; u.g.visible = true; u.g.position.set(X, 0, Z - d);
  C.position.set(X, 1.7, Z); b.camBaseY = 1.7; b.lookAt(X, (u.kind.h || 1.8) * 0.6, Z - d); w.__adv(1); b.lookAt(X, (u.kind.h || 1.8) * 0.6, Z - d);
  const hp0 = u.st.hp, n0 = b.seaBall.balls.length; b.seaBallFire();
  const B = b.seaBall.balls[b.seaBall.balls.length - 1]; let at = null;
  for (let i = 0; i < 300 && b.seaBall.balls.includes(B); i++) { u.g.position.set(X, 0, Z - d); at = B.m.position.clone(); w.__adv(1); }
  const ch = new b.THREE.Vector3(X, (u.kind.h || 1.8) * 0.6, Z - d);
  log(d + ' m: burst at', at ? at.toArray().map((v) => v.toFixed(2)).join(',') : '-', '| from his chest', at ? at.distanceTo(ch).toFixed(2) : '-', 'm | hurt', u.st.hp < hp0);
}
log('DONE');
