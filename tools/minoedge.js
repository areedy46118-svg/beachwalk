/* IS MYLES CULLED WHILE HE IS ON SCREEN (2026-11-26, "myles went invisible", the first castle). `cullUnitModels` hides a body whose
 * sphere is outside the camera's view; he walks at your left shoulder, at the edge of a 105° view. Him at your side, you turning
 * slowly through a full circle and back at three pitches; each frame, after the frame is drawn: is his model culled, and is any of
 * his skeleton's joints inside the picture (projected through the camera as drawn)? Culled with a joint on screen = he vanished.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/minoedge.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js');
const M = b.MINO, T = b.THREE, C = b.camera;
for (let i = 0; i < 200 && !(M.u && M.u.model); i++) { b.frame(2); await sleep(50); }
const u = M.u; if (!u) { log('no minotaur'); return; }
for (const f of b.farmUnitsS()) f.g.position.y -= 300;   // (the fight away: he stays at your side)
M.stage = 'with'; M.ally = true; M.place = '?';
w.__clockOn(); for (let i = 0; i < 120; i++) w.__adv(1);
log('fov', C.fov, 'aspect', C.aspect.toFixed(3), '| canvas', b.renderer.domElement.width + 'x' + b.renderer.domElement.height, '| settings fov', b.settings.fov);
const bones = []; u.model.traverse((o) => { if (o.isBone) bones.push(o); });
let culled = 0, wrong = 0, n = 0; const ex = [];
const v = new T.Vector3();
for (const pitch of [-0.35, 0, 0.35]) for (let k = 0; k < 360; k += 3) {
  b.look(k * Math.PI / 180, pitch); w.__adv(1);
  if (!u.g.visible) continue; n++;
  C.updateMatrixWorld(); u.g.updateMatrixWorld(true);
  let on = 0; for (const bn of bones) { bn.getWorldPosition(v); v.project(C); if (v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) on++; }
  if (!u.model.visible) { culled++; if (on > 0) { wrong++; if (ex.length < 6) ex.push(`yaw ${k} pitch ${pitch}: ${on} of ${bones.length} joints on screen, culled | fov now ${C.fov.toFixed(1)}`); } }
}
log('frames', n, '| culled', culled, '| culled while ON SCREEN', wrong);
for (const e of ex) log('  ', e);
log('DONE');
