/* THE FOOTPRINTS TO THE CELLAR DOOR (2026-11-22): loads the house and the door, stills the trail from above and from the side.
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/celprints.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, C = b.camera;
b.loadHouse(); for (let i = 0; i < 400 && !(b.houseS && b.houseS().ready); i++) { b.frame(1); await sleep(30); }
C.position.set(HX + 9, HY + 1.7, HZ + 6); b.camBaseY = C.position.y;
for (let i = 0; i < 400 && !(b.celOutS() && b.celOutS().prints); i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(15); }
w.__clockOn();
const O = b.celOutS(); log('door', !!(O && O.m), 'prints', O && O.prints ? O.prints.count : 0);
if (O && O.prints) { const m = new T.Matrix4(), p = new T.Vector3(); const out = []; for (let i = 0; i < O.prints.count; i += 3) { O.prints.getMatrixAt(i, m); p.setFromMatrixPosition(m); out.push([p.x - HX, p.y - HY, p.z - HZ].map((v) => v.toFixed(2)).join('/')); } log('prints (rel)', out.join(' ')); }
b.scene.traverse((o) => { if (o.name === 'celPrints' || o.name === 'cellarDoor') o.visible = true; });
const view = (nm, px, py, pz, lx, ly, lz, fov = 60) => { C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(lx, ly, lz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 640, 1.6); };
view('pr_side', HX - 7.5, HY + 1.75, HZ - 10.8, HX + 2, HY + 0.1, HZ - 8.8, 70);
view('pr_door', HX + 8.6, HY + 1.75, HZ - 5.2, HX + 5.6, HY + 0.2, HZ, 70);
