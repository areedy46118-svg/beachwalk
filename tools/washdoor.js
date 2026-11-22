/* THE WASHER'S DOOR AFTER HE IS OUT (2026-11-21): where the door is, and a still of the machine from in front.
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/washdoor.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 900; i++) { b.frame(1); await sleep(15); const s = b.celS(), m = b.celWashS(); if (s.out && s.ready && m.mar && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z, W = b.celWPS();
const bb = (o) => { const B = new T.Box3().setFromObject(o); return [B.min.x - X, B.min.y - Y, B.min.z - Z, B.max.x - X, B.max.y - Y, B.max.z - Z].map((v) => v.toFixed(2)).join(','); };
log('door before', bb(W.door), '| piv', W.piv.rotation.x.toFixed(2), '| door parent', W.door.parent === W.piv);
b.celLockBreak();
for (let i = 0; i < 60 * 4; i++) { C.position.set(X - 4.4, Y + 1.5, Z - 0.9); w.__adv(1); }
log('door after', bb(W.door), '| piv', W.piv.rotation.x.toFixed(2), '| lock', bb(W.lock), '| chains', bb(W.chains));
const f0 = C.fov; C.fov = 50; C.updateProjectionMatrix(); C.position.set(X - 5.3, Y + 1.2, Z - 0.9); C.lookAt(X - 5.3, Y + 0.4, Z - 2.7); C.updateMatrixWorld(true); shot('door_front', 560, 2.2);
C.position.set(X - 4.2, Y + 0.7, Z - 1.6); C.lookAt(X - 5.3, Y + 0.3, Z - 2.6); C.updateMatrixWorld(true); shot('door_side', 560, 2.2);
