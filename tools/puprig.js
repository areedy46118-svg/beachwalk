/* THE PUPPETS' RIGS, CLOSE (2026-11-22, the owner: "the puppets rigs are off you have to fix them"): the first one up and on you,
 * stills from a metre and a half at moments of his run and his blows, lit for the camera; and one of the hung, close.
 * Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/puprig.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
// a light on him for the stills
const L = new T.PointLight(0xffffff, 0, 4, 1.5); b.scene.add(L);
const close = (nm, u, ang = 0.6) => {
  const p = u.g.position, f = u.g.rotation.y + ang, at = new T.Vector3(p.x + Math.sin(f) * 1.4, p.y + 0.75, p.z + Math.cos(f) * 1.4);
  const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = 50; C.updateProjectionMatrix();
  C.position.copy(at); C.lookAt(p.x, p.y + 0.45, p.z); C.updateMatrixWorld(true); L.position.copy(at).add(new T.Vector3(0, 0.6, 0)); L.intensity = 3;
  if (u.model) u.model.visible = true; shot(nm, 560, 1.8); L.intensity = 0;
  C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q);
};
const U = b.cpUnitsS();
close('hung_host', U.find((u) => u.cpH && u.cpH.who === 'host'), 0);
close('hung_butcher', U.find((u) => u.cpH && u.cpH.who === 'butcher'), 0);
C.position.set(X - 0.4, Y + 1.7, Z + 1.0); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X - 0.4, Z + 1.0, Y);
b.gainJar(1); b.cpInject(); for (let i = 0; i < 60 * 5; i++) w.__adv(1);
b.settings.devMode = false;
const F = U.find((u) => u.cpBench);
C.position.set(X - 0.8, Y + 1.7, Z - 0.6); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X - 0.8, Z - 0.6, Y);
let k = 0;
for (let i = 0; i < 60 * 8 && k < 6; i++) {
  b.lookAt(F.g.position.x, Y + 1, F.g.position.z); w.__adv(1);
  const clip = F.cur && F.cur.getClip().name;
  if (i % 40 === 20) { close('fight_' + k + '_' + clip, F, k * 1.1); k++; }
}
log('clips seen', k);
// the rest down and on you: stills of three of them through their own moves
b.cpAllDown(); for (let i = 0; i < 60 * 3; i++) { b.lookAt(X + 1, Y + 1, Z + 1); w.__adv(1); }
const R = U.filter((u) => u.st.alive && !u.cpBench).slice(0, 3); let n = 0;
for (let i = 0; i < 60 * 6 && n < 9; i++) {
  w.__adv(1);
  if (i % 40 === 10) { const u = R[n % R.length]; const st = u.cpLeap ? 'leap' : u.cpDash ? 'dash' : u.cpAir ? 'air' : (u.cur && u.cur.getClip().name) || 'none'; close('swarm_' + n + '_' + st, u, 0.4 + n * 0.7); n++; }
}
