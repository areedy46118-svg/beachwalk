/* THE DARK KNIGHT ALONE (2026-11-16). Not part of the game. `sh tools/probe.sh 'evalFile&f=/tools/dkstudio.js'`: his clips
 * posed and drawn alone, close, from his front-left and his right — the idle, the walk, and each blow at its contact. */
if (new URLSearchParams(location.search).get('blocks')) w.__list = [['sBlockI', 0.4], ['sCBlock', 0.4], ['sIdleB', 0.4], ['sHitC', 0.3], ['sStr1', 0.3], ['sRoar', 0.5], ['sCast', 0.5], ['sDie', 0.6]];
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn();
for (let i = 0; i < 300 && !(b.dkS().u && b.dkS().u.natDone && !(b.dkS().u.clipsPending > 0)); i++) { w.__adv(1); await sleep(10); }
const u = b.dkS().u, m = u.model, C = b.camera.position, P = u.g.position;
u.g.visible = true;
const hid = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isLineSegments) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } });
const T3 = await w.eval("import('three')"); const lamp = new T3.DirectionalLight(0xffffff, 2.2); b.scene.add(lamp); b.scene.add(lamp.target);
b.camera.fov = 34; b.camera.updateProjectionMatrix();
const pose = (clip, f) => { for (const x of Object.values(u.clips)) { x.stop(); x.enabled = false; x.setEffectiveWeight(0); } const a = u.clips[clip]; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * f; m.rotation.y = 0; u.mixer.update(0); u.g.updateMatrixWorld(true); };
const ry = u.g.rotation.y;
for (const [clip, f] of (w.__list || [['sIdle', 0.3], ['sWalk', 0.25], ['sSlash', 0.388], ['sSlashC', 0.5], ['sAtkB', 0.419], ['sSlashE', 0.411], ['sAtkC', 0.42], ['sHit', 0.3]])) {
  if (!u.clips[clip]) { log('no', clip); continue; }
  pose(clip, f);
  for (const [nm, a] of [['f', 0.5], ['s', -Math.PI / 2]]) {
    C.set(P.x + Math.sin(ry + a) * 6.5, P.y + 1.6, P.z + Math.cos(ry + a) * 6.5); b.lookAt(P.x, P.y + 1.35, P.z); b.camera.updateMatrixWorld(true);
    lamp.position.set(C.x, C.y + 3, C.z); lamp.target.position.copy(P);
    shot('st_' + clip + '_' + nm, 300, 1.4);
  }
}
