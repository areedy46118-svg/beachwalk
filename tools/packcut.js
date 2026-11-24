/* THE THREE COMING OUT OF THE WATER (2026-11-23, the owner: "improve the 3 crabs coming out of the water cutscene").
 * The real cut, dev mode off: the camera walked over the trigger (`PACK_Z + PACK_TRIGGER`), then the game's own frames on
 * a fake clock, a still every 0.4 s through the swim and the hold — the game's view and, for the same moment, a 30°
 * lens on the same aim (to see the crabs' poses). `&tag=` names them. Also logs whether each crab's clip moved.
 * PB_PORT=4227 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/packcut.js&tag=before' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
for (let i = 0; i < 200 && b.packCrabs.some((u) => !u.model); i++) { b.frame(1); await sleep(50); }
await sleep(3000);
b.settings.devMode = false;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
const C = b.camera, Z0 = b.PACK_Z + 20;
C.position.set(6, C.position.y, Z0 + 1.5); b.look(0, -0.05); w.__adv(20);
log('models', b.packCrabs.map((u) => !!u.model).join(','), 'phase', b.packPhase);
C.position.z = Z0 - 0.5; w.__adv(1);
log('phase after the line', b.packPhase);
const clipT = () => b.packCrabs.map((u) => u.cur ? u.cur.time.toFixed(2) : '-').join(',');
let t = 0;
for (let k = 0; k <= 11; k++) {
  const at = 0.15 + k * 0.4;
  while (t < at) { w.__adv(1); t += 1 / 60; }
  shot(`${TAG}-t${String(k).padStart(2, '0')}`, 480);
  const f = C.fov; C.fov = 30; C.updateProjectionMatrix(); shot(`${TAG}-z${String(k).padStart(2, '0')}`, 480); C.fov = f; C.updateProjectionMatrix();
  if (k % 3 === 0) log('t', at.toFixed(2), 'fov', C.fov.toFixed(1), 'phase', b.packPhase, 'clip times', clipT(), 'vis', b.packCrabs.map((u) => u.g.visible ? 1 : 0).join(''), 'x', b.packCrabs.map((u) => u.g.position.x.toFixed(1)).join(','));
}
