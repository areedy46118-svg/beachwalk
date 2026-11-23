/* THE FRIDGE, CLOSE (the doors on their hinge, shut and open; boxes logged). Was: THE ROOMS UP THE CELLAR STAIRS (2026-11-22, the owner: the armchair in the way, the fridge's mess, the head through the ceiling,
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
const FR = b.celFridgeS();
const bx = (o) => { const B = new T.Box3().setFromObject(o); return [B.min.x - X, B.min.y - Y, B.min.z - Z, B.max.x - X, B.max.y - Y, B.max.z - Z].map((v) => v.toFixed(2)).join(','); };
log('square', JSON.stringify(b.celFridgeSquareS())); log('pivTop', bx(FR.pivTop), '| pivLow', bx(FR.pivLow), '| piv at', (FR.pivTop.position.x).toFixed(2), (FR.pivTop.position.z).toFixed(2));
b.scene.traverse((o) => { if (o.isMesh && /^fridge/.test(o.name)) log(o.name, bx(o)); });
at('f1', -5.6, 0.6, -5.6, F + 1.0, 2.2);
at('f2', -4.5, 1.2, -5.6, F + 1.0, 2.1);
at('f3', -6.6, 0.9, -5.6, F + 1.0, 2.2);
FR.open = true; w.__adv(60);
at('o1', -5.6, 0.6, -5.6, F + 1.0, 2.2);
at('o2', -4.5, 1.2, -5.6, F + 1.0, 2.1);
at('o3', -6.6, 0.9, -5.6, F + 1.0, 2.2);
