/* THE BRAZIERS (2026-11-26): built (count, what each is made of), one knocked over by a kick, one by a man shoved into it (is he
 * burning, did his hp go), and stills of a standing one close up and one over.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/brazier.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = true;
const C = b.camera, BZ = b.fortBraziersS ? b.fortBraziersS() : null;
if (!BZ || !BZ.length) { log('no braziers'); throw 0; }
log('BRAZIERS', BZ.length, '| meshes in one', (() => { let n = 0; BZ[0].g.traverse((o) => { if (o.isMesh) n++; }); return n; })(), '| flames', BZ[0].flames.length);
const W = (B) => new b.THREE.Vector3(b.FORT_SITE.X + B.x, b.FORT_SITE.Y + B.g.position.y, b.FORT_SITE.Z + B.z);
// a still, close, standing
{ const p = W(BZ[0]); w.requestAnimationFrame = () => 0; C.position.set(p.x + 1.6, p.y + 1.7, p.z + 1.1); C.lookAt(p.x, p.y + 1.0, p.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('standing', 520, 1.0); }
// kicked
{ const B = BZ[1], p = W(B); for (let i = 0; i < 20; i++) { C.position.set(p.x + 1.3, p.y + 1.7, p.z); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 0.6, p.z); w.__adv(1); }
  b.KICK.cd = 0; b.heal(); b.startKick(); for (let i = 0; i < 40; i++) { C.position.set(p.x + 1.3, p.y + 1.7, p.z); w.__adv(1); }
  log('KICKED: over', !B.up, '| light', B.lamp.base.toFixed(2)); for (let i = 0; i < 30; i++) w.__adv(1); C.position.set(p.x + 2.2, p.y + 1.8, p.z + 1.2); C.lookAt(p.x - 0.6, p.y + 0.2, p.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('kicked', 520, 1.0); }
// a man shoved into one
{ const B = BZ[2], p = W(B); const u = b.farmUnitsS().find((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out); 
  if (u) { const hp0 = u.st.hp; u.g.position.set(p.x + 0.9, u.g.position.y, p.z); u.st.flinchPush = { x: -1, z: 0, v: 4.6, d: 5.5 }; u.st.recoil = 0.3;
    let burned = false; for (let i = 0; i < 60; i++) { w.__adv(1); if (u.st.burn && u.st.burn.t > 0) burned = true; }
    log('SHOVED IN:', u.kindName, '| burning', burned, '| hp', hp0.toFixed(2), '->', u.st.hp.toFixed(2), '| brazier over', !B.up); } }
log('DONE');
