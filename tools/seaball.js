/* THE WATER BALL (2026-11-22, `SEA_BALL`): the Sea set in the katana, a full Shift heavy thrown down the beach at night — stills of
 * the ball in flight close, the trail, and the burst (crown, column, droplets, light); then thrown at one of the beach's three
 * (devMode off) and what it took; then the hook carrying one.  PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/seaball.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true; await sleep(800);
const C = b.camera, T = b.THREE;
b.addToInventory(b.katanaItem); b.toggleEquip(b.katanaItem); b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.katanaItem);
log('sea weapon', !!b.seaWeaponS || '', 'equipped', b.state().equipped, 'artifact on', b.katanaItem.artifact && b.katanaItem.artifact.name);
w.__clockOn();
C.position.set(6, 1.7, -60); b.camBaseY = 1.7; b.look(Math.PI, -0.05); w.__adv(30);
b.seaBallFire(); log('balls', b.seaBall.balls.length, 'cd', b.seaBall.cd.toFixed(1));
const B0 = b.seaBall.balls[0];
const snap = (nm, px, py, pz, tx, ty, tz, fov = 55) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 640, 1.2); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
w.__adv(8); { const p = B0.m.position.clone(); snap('ball_close', p.x + 0.9, p.y + 0.15, p.z + 0.6, p.x, p.y, p.z, 40); snap('ball_trail', p.x + 2.8, p.y + 0.6, p.z - 1.0, p.x, p.y, p.z + 1.5, 55); }
let at = null; for (let i = 0; i < 120 && b.seaBall.balls.length; i++) { at = B0.m.position.clone(); w.__adv(1); }
log('burst near', at && at.toArray().map((v) => v.toFixed(1)).join(','));
w.__adv(4); snap('burst_a', at.x + 2.6, at.y + 1.0, at.z + 2.6, at.x, at.y + 0.3, at.z, 55);
w.__adv(10); snap('burst_b', at.x + 2.6, at.y + 1.0, at.z + 2.6, at.x, at.y + 0.3, at.z, 55);
// at a body: one of the three, close in front
let u = b.mutantsS().find((q) => q.st.alive && q.g.visible && q.model);
if (!u) { const k = 'pale'; u = b.mutSpawnTest(8, -48, k); for (let i = 0; i < 200 && !u.model; i++) { w.__adv(1); await sleep(10); } log('spawned', k); }
log('target', !!u, u && u.kind && (u.kind.file || u.kind.name));
if (u) {
  b.settings.devMode = false; const hp0 = u.st.hp; b.seaBall.cd = 0;
  C.position.set(u.g.position.x + 6, u.g.position.y + 1.7, u.g.position.z); b.camBaseY = C.position.y; b.lookAt(u.g.position.x, u.g.position.y + 1.3, u.g.position.z); w.__adv(2); log("aim at", (u.g.position.y).toFixed(2));
  b.seaBallFire(); for (let i = 0; i < 60 && b.seaBall.balls.length; i++) w.__adv(1);
  log('hit: hp', hp0, '->', u.st.hp, '| stun', (u.st.stun || 0).toFixed(2));
  b.settings.devMode = true;
}
// the hook, carrying it
b.seaBall.cd = 0; b.addToInventory(b.hookItem); b.toggleEquip(b.hookItem); b.detachArtifact && b.detachArtifact(b.katanaItem); b.attachArtifact(b.seaArtItem, b.hookItem);
C.position.set(6, 1.7, -60); b.camBaseY = 1.7; b.look(Math.PI, -0.15); w.__adv(5);
b.HK.water = 1; b.seaBallFx(); const ok = b.hookThrowS(1); log('hook thrown', ok, 'st', b.HK.st);
for (let i = 0; i < 12; i++) w.__adv(1);
{ const p = b.HK.p.clone(); snap('hook_ball', p.x + 1.2, p.y + 0.3, p.z + 0.8, p.x, p.y, p.z, 40); }
for (let i = 0; i < 40; i++) w.__adv(1); log('hook water after', b.HK.water, 'st', b.HK.st);
