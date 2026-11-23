/* THE CUBBY, TRIED (2026-11-22): built? its look from the street (night, as you see it) and from inside; a hook thrown up into its
 * doorway from the street, pulled to, and where you end; then walked about inside it with the keys (and out of its doorway: held).
 * PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/c13cubby2.js' <out> */
w.eval(await (await fetch('/tools/c13look.js?' + Date.now())).text());
log('c13', await w.__c13LookBoot());
const C = b.camera, T = w.__T, X = b.C13_X, Z = b.C13_Z, K = b.C13_CUBBY;
log('cubby', !!b.c13CubbyS(), 'walls', !!b.C13_SITE.walls);
const nx = K.nx, nz = K.nz, base = new T.Vector3(X + K.lx, b.C13_SITE.Y + K.ly, Z + K.lz);
const inner = base.clone().add(new T.Vector3(nx * 0.9, 1.0, nz * 0.9));            // a point in the room, a metre up
const street = base.clone().add(new T.Vector3(nx * 5.5, 0, nz * 5.5)); street.y = C.position.y;
const d1 = w.__c13Look([[street.x - X, street.z - Z, Math.atan2(-(base.x - street.x), -(base.z - street.z)), 0.75], [street.x - X + nx * 3, street.z - Z + nz * 3, Math.atan2(-(base.x - street.x), -(base.z - street.z)), 0.55]], 480, 6).split('#')[0];
{ const n = Math.ceil(d1.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'cubby_street', i + '/' + n, d1.slice(i * 8000, (i + 1) * 8000)); }
// the hook, thrown at it from the street
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 40; i++) { w.__c13Adv(1); await sleep(40); }
C.position.set(street.x, C.position.y, street.z); b.camBaseY = C.position.y; w.__c13Adv(5);
const aim = inner.clone().sub(C.position).normalize(); b.look(Math.atan2(-aim.x, -aim.z), Math.asin(aim.y)); C.updateMatrixWorld(true);
let ok = false; for (let k = 0; k < 40 && !ok; k++) { b.HK.st = 'idle'; b.HK.zipUsed = false; ok = b.hookThrowS(1); if (!ok) { w.__c13Adv(2); await sleep(80); } }
const to = b.HK.to; log('thrown', ok, 'bit', to ? to.kind + ' at ' + to.point.toArray().map((v, i) => (v - [X, 0, Z][i]).toFixed(2)).join(',') + ' t ' + to.t.toFixed(1) : '-', '| in the cubby?', to ? b.c13CubbyHas(to.point, 0.3) : '-');
// let the iron fly, then pull (in the air: a jump)
for (let i = 0; i < 6; i++) w.__c13Adv(1);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Space', key: ' ' })); w.__c13Adv(2); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'Space', key: ' ' }));
let zipped = false, trace = []; for (let i = 0; i < 120; i++) { w.__c13Adv(1); if (b.HK.st === 'zip') zipped = true; if (i % 8 === 0) trace.push(b.HK.st + ':' + (C.position.y - b.C13_SITE.Y - K.ly - 1.7).toFixed(1)); }
log('the pull, feet over its floor every 8 frames:', trace.join(' '));
const feet = () => (b.camBaseS() - 1.7 - b.C13_SITE.Y - K.ly).toFixed(2);
log('pulled', zipped, '| end: inside', b.c13CubbyHas(C.position), 'feet over its floor', feet(), '| hook', b.HK.st);
if (!b.c13CubbyHas(C.position)) { // put there, to try the walking
  C.position.copy(inner); C.position.y = b.C13_SITE.Y + K.ly + 1.7; b.camBaseY = C.position.y; w.__c13Adv(10); log('placed inside: inside', b.c13CubbyHas(C.position), 'feet', feet()); }
// walk: into each wall and out of the doorway
const out = [];
for (const [nm, yaw] of [['back', Math.atan2(nx, nz)], ['door', Math.atan2(-nx, -nz)], ['left', Math.atan2(-nz, nx)], ['right', Math.atan2(nz, -nx)]]) {
  C.position.copy(inner); C.position.y = b.C13_SITE.Y + K.ly + 1.7; b.camBaseY = C.position.y; w.__c13Adv(4);
  b.look(yaw, 0); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
  for (let i = 0; i < 120; i++) { b.look(yaw, 0); w.__c13Adv(1); }
  w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyW', key: 'w' })); w.__c13Adv(10);
  out.push(`${nm}: inside ${b.c13CubbyHas(C.position)} feet ${feet()}`);
}
log('walked:', out.join(' | '));
C.position.copy(inner); C.position.y = b.C13_SITE.Y + K.ly + 1.7; w.__c13Adv(2);
const d2 = w.__c13Look([[inner.x - X - nx * 0.6, inner.z - Z - nz * 0.6, Math.atan2(nx, nz), -0.05], [inner.x - X - nx * 0.6, inner.z - Z - nz * 0.6, Math.atan2(nx, nz) + Math.PI, -0.35]], 480, 2).split('#')[0];
{ const n = Math.ceil(d2.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'cubby_in', i + '/' + n, d2.slice(i * 8000, (i + 1) * 8000)); }
