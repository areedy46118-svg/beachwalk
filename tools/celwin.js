/* THE TV ROOM'S WINDOW: stills toward its walls and what a ray through the middle of each hits. Was: THE ROOMS UP THE CELLAR STAIRS (2026-11-22, the owner: the armchair in the way, the fridge's mess, the head through the ceiling,
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
const rc = new T.Raycaster();
const hit = (k) => { rc.setFromCamera(new T.Vector2(0, 0), C); const h = rc.intersectObjects(b.scene.children, true).filter((q) => q.object.isMesh && q.object.visible && q.object.name !== 'hitProxy')[0]; log(k, h ? h.object.name + '|' + h.object.material.name + ' at ' + [h.point.x - X, h.point.y - Y, h.point.z - Z].map((v) => v.toFixed(2)).join(',') + ' face ' + h.faceIndex : 'none'); };
const views = [['door', 3.1, 0.9, 3.1, -2.6], ['door2', 1.6, 0.6, 3.4, -1.6], ['wS', 1.5, 0.3, 1.5, 2.58], ['wS2', 2.5, 0.3, 3.0, 2.58], ['wE', 2.0, 0.6, 4.08, 1.0], ['wE2', 2.0, -0.6, 4.08, -0.6], ['wW', 1.0, 0.6, -2.18, 0.8], ['wN', 1.0, 0.6, 0.5, -1.7]];
for (const [k, px, pz, tx, tz] of views) { at(k, px, pz, tx, F + 1.5, tz); hit(k); }
