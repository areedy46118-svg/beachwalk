/* DRIFTWOOD TAKES A BLOW AND HITS A CRAB (2026-11-23, the owner: "make it so you can hit or throw these pieces of driftwood
 * too or throw at an enemy" — "all driftwood"). Three checks through the game's own frame (devMode, the clock frozen):
 *  1. the shovel swung (`startDig`) at a piece 1.5 m off: the swing connects, the piece moves, and no mark is dug;
 *  2. a piece thrown (`thrown`, 12 m/s) at the loner crab set 3 m ahead: its hp drops;
 *  3. the same swing at open sand: a mark IS dug (nothing else changed).
 * Stills of the struck piece in the air. PB_PORT=4227 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/driftwood.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(3000);
b.settings.devMode = true;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
const C = b.camera, V = C.position.constructor;
const holes = () => { const H = b.scene.getObjectByName('digHoles'); const m = new H.matrixWorld.constructor(); let n = 0; for (let i = 0; i < H.count; i++) { H.getMatrixAt(i, m); if (Math.abs(m.elements[0]) > 1e-6) n++; } return n; };
const place = (x, z, tx, ty, tz) => { for (let i = 0; i < 3; i++) { C.position.set(x, 1.7, z); b.camBaseY = 1.7; b.lookAt(tx, ty, tz); w.__adv(1); } };
if (!b.state().inv.some((n) => /shovel/i.test(n))) b.addToInventory && b.addToInventory(b.shovelItem);
if (b.state().equipped !== b.shovelItem.name) b.toggleEquip(b.shovelItem);
w.__adv(30);
log('equipped', b.state().equipped);
// 1. a swing at a piece of the wrack, the nearest dry one past the spawn
const D = b.physProps.filter((p) => p.drift && !p.held && p.mesh.parent && p.mesh.position.x > 9 && p.mesh.position.z < -20 && p.mesh.position.z > -400)
  .sort((a, c) => c.mesh.position.z - a.mesh.position.z);
log('driftwood props', b.physProps.filter((p) => p.drift).length, 'candidates', D.length);
const p = D[0], P0 = p.mesh.position.clone();
place(P0.x - 1.4, P0.z + 0.4, P0.x, P0.y, P0.z);
const h0 = holes(); b.startDig(0.6);
let t = 0; const v = []; for (; t < 60; t++) { w.__adv(1); v.push(p.vel.length()); if (t === 14) { C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('drift-struck-a', 640); } }
const moved = p.mesh.position.distanceTo(P0);
log('SWING at driftwood r', p.radius.toFixed(2), '| peak speed', Math.max(...v).toFixed(2), '| moved', moved.toFixed(2), 'm | marks dug', holes() - h0, '| thrown flag seen', p.thrown);
w.__adv(120);
place(P0.x - 1.6, P0.z + 2.4, p.mesh.position.x, 0.2, p.mesh.position.z); shot('drift-after', 640);
// 3. the same swing at bare sand, nothing in the way
place(P0.x - 1.4, P0.z + 8, P0.x - 0.2, 0, P0.z + 6.6);
const h1 = holes(); b.startDig(0.6); w.__adv(60);
log('SWING at sand | marks dug', holes() - h1);
// 2. a piece thrown at the crab
const K = b.crab, st = b.crabState, q = D[1] || D[0];
const CX = 10, CZ = P0.z - 30;
K.position.set(CX, 0, CZ); K.visible = true; w.__adv(5); K.position.set(CX, 0, CZ);
const hp0 = st.hp;
q.asleep = false; q.held = false; q.mesh.position.set(CX, 0.6, CZ + 3); q.vel.set(0, 1.2, -12); q.thrown = true;
let hitAt = -1; for (let i = 0; i < 60; i++) { K.position.set(CX, 0, CZ); w.__adv(1); if (hitAt < 0 && st.hp < hp0) hitAt = i; }
log('THROW at crab | hp', hp0, '->', st.hp, '| hit on frame', hitAt, '| alive', st.alive);
// a control: the same throw a metre and a half to the side misses
const hp1 = st.hp; q.asleep = false; q.mesh.position.set(CX + 1.5, 0.6, CZ + 3); q.vel.set(0, 1.2, -12); q.thrown = true;
for (let i = 0; i < 60; i++) { K.position.set(CX, 0, CZ); w.__adv(1); }
log('THROW past the crab | hp', hp1, '->', st.hp);
