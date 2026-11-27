/* WHAT A CRAB LEAVES (2026-11-23, the owner: "make these look better too i hate how its just random shapes"). The loner
 * set down on flat dry beach, burst (`burstCrab`, what `finishCrab` runs after the hit's hold), stills in the air and
 * settled, from standing and through a long lens; and how long the burst and the frame after it took (a first kill
 * that compiles a program is a hitch). `&tag=` names the stills.
 * PB_PORT=4227 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/crabgibs.js&tag=after' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(4000);
b.settings.devMode = true;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
let X = 8, Z = -49;
const C = b.camera, K = b.crab;
const aim = (x, h, z, tx, ty, tz) => { C.position.set(x, h, z); b.camBaseY = h; b.lookAt(tx, ty, tz); w.__adv(1); C.position.set(x, h, z); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); };
for (let i = 0; i < 100 && K.children.length < 2; i++) { w.__adv(2); await sleep(100); }
K.position.set(X, 0, Z); K.rotation.y = 0.6; K.visible = true;
aim(X + 1.2, 1.7, Z + 2.6, X, 0.2, Z);
for (let i = 0; i < 20; i++) { K.position.set(X, 0, Z); w.__adv(1); }
aim(X + 1.2, 1.7, Z + 2.6, X, 0.2, Z); shot(`${TAG}-crab-alive`, 640);
const st = b.crabState; st.alive = false; st.struck = false; st.deadT = 0; K.visible = false;   // (as finishCrab leaves it)
let t0 = Date.now(); b.burstCrab(); const tb = Date.now() - t0;
t0 = Date.now(); w.__adv(1); const tf = Date.now() - t0;
log('burst ms', tb, 'next frame ms', tf, 'gibs', b.gibsN ? b.gibsN() : '?');
for (let i = 0; i < 8; i++) w.__adv(1);
aim(X + 1.2, 1.7, Z + 2.6, X, 0.2, Z); shot(`${TAG}-crab-air`, 640);
w.__adv(200);
aim(X + 1.2, 1.7, Z + 2.6, X, 0, Z); shot(`${TAG}-crab-settled`, 640);
aim(X - 2.2, 1.7, Z - 1.5, X, 0, Z); shot(`${TAG}-crab-settled-back`, 640);
C.fov = 34; C.updateProjectionMatrix();
aim(X + 1.2, 1.7, Z + 2.6, X, 0, Z); shot(`${TAG}-crab-zoom`, 640); shot(`${TAG}-crab-zoom-g`, 640, 2.2);
aim(X + 0.9, 1.1, Z + 1.2, X, 0, Z); shot(`${TAG}-crab-close-g`, 640, 2.2);
aim(X - 1.4, 1.2, Z - 0.6, X, 0, Z); shot(`${TAG}-crab-close2-g`, 640, 2.2);
C.fov = 105; C.updateProjectionMatrix();
