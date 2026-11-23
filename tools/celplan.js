/* THE GROUND FLOOR'S PLAN AND THE TV ROOM (doors, the sofa, the window). Was: THE ROOMS UP THE CELLAR STAIRS (2026-11-22, the owner: the armchair in the way, the fridge's mess, the head through the ceiling,
 * the TV, the bath): stills of the fridge and sink, the living room, the TV corner, the bathroom from its door; then a jump in the
 * living room and how high the eye went against the ceiling (5.78 room-local).  PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/celroom.js&tag=before' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
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
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z, F = Y + 3.06, E = F + 1.6;
const A = new T.AmbientLight(0xffffff, +(new URLSearchParams(location.search).get('amb') || 1.0)); b.scene.add(A);
const at = (k, px, pz, tx, ty, tz, py = E) => { C.position.set(X + px, py, Z + pz); b.camBaseY = py; for (let q = 0; q < 6; q++) { w.__adv(1); C.position.set(X + px, py, Z + pz); } C.lookAt(X + tx, ty, Z + tz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(TAG + '-' + k, 640, 1.2); };
const P = new URLSearchParams(location.search);
// the parts and materials, named, with their boxes
const bx = (o) => { const B = new T.Box3().setFromObject(o); return [B.min.x - X, B.min.y - Y, B.min.z - Z, B.max.x - X, B.max.y - Y, B.max.z - Z].map((v) => v.toFixed(2)).join(','); };
const seen = {}; b.scene.traverse((o) => { if (o.isMesh && o.visible && o.material && !Array.isArray(o.material)) { const B = new T.Box3().setFromObject(o); if (Math.abs(B.min.x - X) < 30 && Math.abs(B.min.z - Z) < 30 && B.max.y - Y > 3.0) { const k = o.name + '|' + o.material.name; if (!seen[k]) { seen[k] = 1; log('mesh', k, bx(o)); } } } });
b.scene.traverse((o) => { if (o.isMesh && /kitchenDoor/.test(o.name)) log('door', o.name); });
at('living2', -1.0, -1.0, 2.5, F + 1.0, 1.5);
at('living3', 2.5, -2.0, 2.5, F + 1.0, 2.5);
at('living4', 3.0, 2.0, 0.0, F + 1.2, 0.0);
at('landing', 1.0, -2.8, 1.0, F + 1.0, 0.5);
// the plan: cut at 1.9 m over the floor, from above
b.renderer.localClippingEnabled = true; b.renderer.clippingPlanes = [new T.Plane(new T.Vector3(0, -1, 0), F + 1.9)];
b.scene.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) { if (/kitchenDoor/.test(o.name)) o.material = new T.MeshBasicMaterial({ color: 0xff2020 }); else if (o.material.name === 'sofa') o.material = new T.MeshBasicMaterial({ color: 0x20ff40 }); else if (/tvSet|tvStand|coffee/.test(o.name)) o.material = new T.MeshBasicMaterial({ color: 0x3080ff }); } });
C.position.set(X - 1.8, Y + 16, Z - 0.6); C.up.set(0, 0, -1); C.lookAt(X - 1.8, Y, Z - 0.6); C.fov = 44; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
b.renderer.render(b.scene, C); shot(TAG + '-plan', 900, 1.2); C.up.set(0, 1, 0);
b.renderer.clippingPlanes = [];
