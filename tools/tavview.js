/* THE TAVERN WINDOW'S VIEW AS THE GAME CATCHES IT (2026-11-26): stood on the keep's terrace at its door (where the entry cut catches
 * it, `tavVistaCapture`), caught, then into the hall and a still out of the window.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/tavview.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
const C = b.camera; C.position.set(-6000 - 2.6, 800 + 16.1 + 1.7, 6000 + 8.6 + 1.2); b.camBaseY = C.position.y; b.look(Math.PI, 0);
for (let i = 0; i < 10; i++) { b.frame(1); await sleep(20); }
shot('terrace', 640, 1.5);
if (new URLSearchParams(location.search).get('hide24')) b.scene.traverse((o) => { if (o.name === 'Object_24' && o.parent && o.parent.name === 'bw_keep') { o.visible = false; log('hid Object_24'); } });
b.tavVistaCaptureS();
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
w.__clockOn();
const X = -6000, Z = 12000, W = b.TAV_WINS, fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 800 + 10), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const eye = (nm, x, z, yaw, pitch = 0) => { for (let i = 0; i < 3; i++) { C.position.set(X + x, fl + 1.7, Z + z); b.camBaseY = C.position.y; b.look(yaw, pitch); w.__adv(1); } C.updateMatrixWorld(true); shot(nm, 640, 1.5); };
eye('view_near', -1.4, -12.3, 0, -0.25);
eye('view_far', -1.4, -6, 0, 0.0);
b.tavVistaS().material.uniforms.uHave.value = 0; eye('view_nocap', -1.4, -12.3, 0, -0.25);
log('DONE');
