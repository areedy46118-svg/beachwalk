/* THE CHURCH'S FIGURE, STRUCK (2026-11-21, the owner: "make hitting the alter or throwing the hook at it in the church break it
 * as well"). In the church, 2.2 m from the altar looking at it: a blow down the crosshair, then the frames until it breaks;
 * and a point on the hook's line checked against it. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/ucidol.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
b.ROOM_BACK.uc.load(); for (let i = 0; i < 600 && !b.UCS().ready; i++) { b.frame(1); await sleep(30); }
b.ROOM_BACK.uc.place(); for (let i = 0; i < 30; i++) b.frame(1);
const A = b.ucIdolS().at; log('idol at', JSON.stringify(A));
log('a point in it near', b.ucIdolNearS(A[0], A[1], A[2]), '| 3 m off', b.ucIdolNearS(A[0] - 3, A[1], A[2]));
const C = b.camera; C.position.set(A[0] - 2.2, A[1] + 0.7, A[2]); b.camBaseY = C.position.y; b.lookAt(A[0], A[1] + 0.2, A[2]);
for (let i = 0; i < 5; i++) { b.lookAt(A[0], A[1] + 0.2, A[2]); b.frame(1); }
log('looking away: struck', b.ucIdolStrikeS(1)); b.lookAt(A[0], A[1] + 0.2, A[2] + 8); b.frame(1); log('away again', b.ucIdolStrikeS(1));
b.lookAt(A[0], A[1] + 0.2, A[2]); b.frame(1); C.updateMatrixWorld(true);
log('looking at it: struck', b.ucIdolStrikeS(1), Object.entries(b.ucIdolS()).join(' '));
for (let i = 0; i < 240 && !b.ucIdolS().broke; i++) b.step(1 / 60);
log('after', Object.entries(b.ucIdolS()).join(' '));
