/* THE MARIONETTE'S STANCE (2026-11-22, Mixamo "Old Man Idle": "make this a marionettes idle stance"): him with you, you standing
 * still — which clip, and stills of him a few seconds apart. Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/maridle.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(1500);
const C = b.camera; C.position.set(8, 1.7, -60); b.camBaseY = 1.7;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { b.frame(1); await sleep(30); }
w.__clockOn();
for (let i = 0; i < 120; i++) w.__adv(1);
const u = b.MAR.u, p = u.g.position;
for (const k of [0, 1, 2]) {
  for (let i = 0; i < 90; i++) { C.position.set(8, 1.7, -60); w.__adv(1); }
  log('clip', u.cur && u.cur.getClip().name, 'v', b.MAR.v, 'has', Object.keys(u.clips).filter((k) => /Old|Situp|Sleep|MRun/.test(k)).join(','));
  const q = C.quaternion.clone(); C.fov = 45; C.updateProjectionMatrix(); C.position.set(p.x + Math.sin(u.g.rotation.y + 0.5) * 1.8, p.y + 0.8, p.z + Math.cos(u.g.rotation.y + 0.5) * 1.8); C.lookAt(p.x, p.y + 0.5, p.z); C.updateMatrixWorld(true);
  u.model.visible = true; b.renderer.render(b.scene, C); shot('idle_' + k, 480, 1.4); C.quaternion.copy(q);
}
