/* THE MARIONETTE WAITS ON THE SAND (2026-11-22): him with you by the fishing spot, the bite's `marWaitBegin` (the deep's lock on),
 * stills of him sat there; then the lock off — is he up and following? Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh
 * 'evalFile&f=/tools/marwait.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(1500);
const FS = b.FISH_SPOT, C = b.camera;
C.position.set(FS.x + 12, 1.7, FS.z); b.camBaseY = 1.7;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(15); }
log('with', JSON.stringify(b.marS()));
b.marWaitBeginS(FS.x - 6, FS.z); b.setDeepLockS(true);
C.position.set(FS.x - 4, 1.7, FS.z + 3);          // (you, pulled out into the surf)
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(15); }
log('sitting', JSON.stringify(b.marS()), 'wait', JSON.stringify(b.MAR.wait));
w.__clockOn();
log('after frames', JSON.stringify(b.marThighS()));
b.marSitStepS(); log('after one direct', JSON.stringify(b.marThighS()));
const u = b.MAR.u, p = u.g.position; u.model.visible = true;
const bb = new b.THREE.Box3().setFromObject(u.model); log('box y', bb.min.y.toFixed(2), bb.max.y.toFixed(2), 'ground', b.groundUnder(p.x, p.z).toFixed(2));
const view = (nm, dx, dy, dz) => { C.fov = 50; C.updateProjectionMatrix(); C.position.set(p.x + dx, p.y + dy, p.z + dz); C.lookAt(p.x, p.y + 0.4, p.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 640, 1.6); };
view('mw_side', 0.2, 0.7, 2.2);
view('mw_back', 2.6, 1.1, 0.4);
view('mw_front', -2.0, 0.7, -0.3);
C.position.set(p.x + 5, 1.7, p.z + 2); b.camBaseY = 1.7; b.setDeepLockS(false);
const side = () => { C.fov = 50; C.updateProjectionMatrix(); C.position.set(p.x - 0.4, p.y + 0.9, p.z + 2.6); C.lookAt(p.x, p.y + 0.4, p.z); C.updateMatrixWorld(true); };
for (const [t, nm] of [[0.6, 'rise_06'], [1.6, 'rise_16'], [2.6, 'rise_26'], [3.6, 'rise_36'], [4.6, 'rise_46']]) {
  while (performance.now() < 0) {}
  for (let i = 0; i < 60 * (t - (s0 || 0)); i++) { C.position.set(p.x + 5, 1.7, p.z + 2); w.__adv(1); }
  var s0 = t; u.model.visible = true; side(); b.renderer.render(b.scene, C); shot(nm, 640, 1.6);
  log(nm, 'rise', JSON.stringify(b.MAR.rise), 'clip', u.cur && u.cur.getClip().name, 'at', p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2));
}
for (let i = 0; i < 60 * 2; i++) { C.position.set(p.x + 5, 1.7, p.z + 2); w.__adv(1); }
log('after', JSON.stringify(b.marS()));
