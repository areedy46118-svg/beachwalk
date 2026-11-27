/* WONG'S AND THE DRUNK'S BLOWS, SEEN (2026-11-26, "give the drunk and wong some animations that work better"). Each of their swing
 * clips posed on the man where he stands at the wind-up's cock, the contact and the follow-through, a still from his side and one from
 * where you would be (1.4 m in front, eye height). &who=wong|drunk, &k=clip,clip (default: his `use`).
 *   PB_PORT=4247 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/tavblows.js&who=wong' <out> */
const Q = new URLSearchParams(location.search), WHO = Q.get('who') || 'wong';
await (async () => { w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.eval(await (await fetch('/tools/tavdrink.js?' + Date.now())).text()); })();
await w.__tavSetup();
const u = WHO === 'wong' ? b.wongUnit : b.drunkUnit;
for (let i = 0; i < 400 && !(u && u.clips); i++) { b.frame(1); await sleep(40); }
w.__clockOn(); b.settings.devMode = true;
const C = b.camera, T = b.THREE;
const keys = (Q.get('k') || Object.keys(u.kind.use).join(',')).split(',');
// stand him on the open floor in front of the dancers, facing -Z
const D = b.tavDancers, P = new T.Vector3((D[0].g.position.x + D[1].g.position.x) / 2, u.g.position.y, (D[0].g.position.z + D[1].g.position.z) / 2 - 1.0);
for (const q of [b.wongUnit, b.drunkUnit, b.orcUnit]) if (q && q !== u) q.g.visible = false;
const pose = (name, f) => {
  const al = (u.kind.alias && u.kind.alias[name]) || name, a = u.clips[name] || u.clips[al];
  if (!a) return null;
  u.mixer.stopAllAction(); a.reset(); a.play(); a.setEffectiveWeight(1); a.paused = true; a.time = f * a.getClip().duration;
  u.g.position.copy(P); u.g.rotation.y = Math.PI; u.holdAnim = true;
  u.mixer.update(0); u.g.updateMatrixWorld(true);
  return a;
};
for (const k of keys) {
  const A = b.MUT_ATTACKS[k], hit = A ? A.hit : 0.5;
  for (const [tag, f] of [['cock', Math.max(0, hit - 0.18)], ['hit', hit], ['after', Math.min(0.98, hit + 0.15)]]) {
    if (!pose(k, f)) { log('NO CLIP', k); break; }
    C.fov = 60; C.updateProjectionMatrix();
    C.position.set(P.x + 2.6, P.y + 1.3, P.z - 0.4); C.lookAt(P.x, P.y + 1.0, P.z - 0.4); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C); shot(WHO + '_' + k + '_' + tag + '_side', 480, 1.4);
    if (tag === 'hit') { C.position.set(P.x, P.y + 1.65, P.z - 1.4); C.lookAt(P.x, P.y + 1.2, P.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(WHO + '_' + k + '_' + tag + '_you', 480, 1.4); }
  }
}
log('DONE');
