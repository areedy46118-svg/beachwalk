/* SKRIM DROPS HIS HOOK (2026-11-19, "make skrim drop this weapon too"): in the whale, him fought and killed; his hook out of
 * his fist and onto the gut's floor; a still of it lying; taken (the pack, your hand); and laid again as a restore lays it.
 * Run: PB_PORT=4257 sh tools/probe.sh 'evalFile&f=/tools/skhookdrop.js' <out> */
b.settings.devMode = false;
b.placeInWhale();
const S = b.SKRIM;
for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed); i++) { b.frame(1); await sleep(40); }
for (let i = 0; i < 200 && !b.hookRawS(); i++) { b.frame(1); await sleep(40); }
const u = S.u; for (let i = 0; i < 30; i++) b.frame(1);
const hand = u.model.getObjectByName('skrim_hook');
log('his hook in hand before', !!hand && hand.visible, 'state', b.skHook.state);
b.skrimFight(); for (let i = 0; i < 60; i++) b.step(1 / 60);
b.hurtMutantTest(u, 999);
for (let i = 0; i < 60 * 3; i++) b.step(1 / 60);
const H = b.skHook, o = H.obj;
log('after his death: state', H.state, 'in his hand', hand && hand.visible, 'lying', !!o, o ? 'over floor ' + (o.position.y - b.skrimFloorW(o.position.x, o.position.z)).toFixed(3) : '', 'falling', !!H.fall, 'at', JSON.stringify(H.at && H.at.map((v) => +v.toFixed(2))));
if (o) {
  const P = o.position, cam = b.camera.position; w.requestAnimationFrame = () => 0;
  cam.set(P.x + 1.3, P.y + 1.0, P.z + 1.3); b.camera.fov = 45; b.camera.updateProjectionMatrix(); b.camera.lookAt(P.x, P.y, P.z); b.camera.updateMatrixWorld(true); b.lamps();
  b.renderer.render(b.scene, b.camera); shot('hook_lying', 560, 1.3);
}
const take = b.interactables.find((e) => e && e.label === "Take Skrim's Hook");
log('takeable', !!take);
if (take) { take.onActivate(); for (let i = 0; i < 5; i++) b.step(1 / 60); }
log('taken: state', H.state, 'in pack', b.inventory.includes(b.hookItem), 'equipped', b.state().equipped, 'still lying', !!H.obj);
// a restore that had it on the floor
H.state = 1; H.at = [o ? o.position.x : u.g.position.x, o ? o.position.y : u.g.position.y, o ? o.position.z : u.g.position.z, 0.7]; H.obj = null; H.put = false; H.hid = false;
for (let i = 0; i < 10; i++) b.step(1 / 60);
log('restored on the floor:', !!H.obj, 'takeable again', !!b.interactables.find((e) => e && e.label === "Take Skrim's Hook"));
