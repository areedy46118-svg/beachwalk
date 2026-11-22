/* THE KITCHEN DOOR AT THE TOP OF THE CELLAR STAIRS, OPEN AGAIN (2026-11-22): from the cellar's spawn, looking round to the left.
 * Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/celkitchen.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(); if (s.out && s.ready && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const A = new T.AmbientLight(0xffffff, 1.3); b.scene.add(A);
const e = new T.Euler().setFromQuaternion(C.quaternion, 'YXZ');
for (const [k, dy] of [['a', 0.9], ['b', 1.6]]) { C.quaternion.setFromEuler(new T.Euler(0, e.y + dy, 0, 'YXZ')); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('kit_' + k, 480, 1.3); }
// and in the rooms: through the door, a few metres in (room-local, file units × 0.0034)
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z, S = 0.0034, fy = Y + 3.06 + 1.6;
for (const [k, fx, fz, tx, tz] of [['c', 1000, -400, 300, 300], ['d', 200, 200, -1500, 300], ['e', -1500, -300, -1800, 500]]) {
  C.position.set(X + fx * S, fy, Z + fz * S); C.lookAt(X + tx * S, fy - 0.4, Z + tz * S); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('kit_' + k, 480, 1.3);
}
