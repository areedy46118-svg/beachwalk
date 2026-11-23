/* THE ROOMS UP THE CELLAR STAIRS (2026-11-22, the owner: the armchair in the way, the fridge's mess, the head through the ceiling,
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
at('fridge', -5.0, -0.4, -5.9, F + 1.0, 1.9);
at('fridgeFront', -5.6, 0.2, -5.6, F + 0.95, 2.4, F + 1.1);
at('fridgeSide', -4.4, 1.4, -5.7, F + 0.9, 1.9, F + 1.0);
at('sink', -5.4, 0.2, -7.3, F + 0.9, 1.4);
at('living', 0.4, -0.6, 3.2, F + 0.5, 0.4);
at('tv', 1.6, 0.4, 1.0, F + 0.6, 2.3);
for (let i = 0; i < 200 && !b.celBathS(); i++) w.__adv(2);
log('bath pup', !!b.celBathS());
{ const B = b.celBathS(); if (B && B.root) B.root.visible = false; b.celWorldS && 0;
  const rc = new T.Raycaster(); rc.camera = C; const W = b.scene; const vis = {};
  const sides = []; b.scene.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) { sides.push([o.material, o.material.side]); o.material.side = 2; } });
  for (const ex of [-4.3, -4.0, -3.7, -3.4, -3.1, -2.8]) for (const ez of [-2.9, -2.7, -2.5, -2.3, -2.1, -1.9]) for (let tz = -3.65; tz <= -1.9; tz += 0.25) {
    const O = new T.Vector3(X + ex, Y + 3.06 + 1.6, Z + ez), P = new T.Vector3(X - 7.13, Y + 3.5, Z + tz), d = P.clone().sub(O), L = d.length();
    rc.set(O, d.normalize()); rc.far = L - 0.05; const h = rc.intersectObjects(W.children, true).filter((q) => q.object.isMesh && q.object.visible && !(q.object.material && q.object.material.transparent) && q.object.name !== 'hitProxy');
    if (!h.length) { const k = tz.toFixed(2); vis[k] = (vis[k] || []); vis[k].push(ex + ',' + ez); } }
  for (const [m, sd] of sides) m.side = sd;
  log('tub points seen at head height (z: from where)', JSON.stringify(vis).slice(0, 1400));
  if (B && B.root) B.root.visible = true; }
at('bath', -3.85, -2.3, -7.1, F + 0.55, -2.15); { const f0 = C.fov; C.fov = 14; C.updateProjectionMatrix(); at('bathZoom', -3.85, -2.3, -7.1, Y + 3.66, -2.15); C.fov = f0; C.updateProjectionMatrix(); } at('bathNear', -4.6, -2.6, -7.1, F + 0.3, -2.2, F + 1.2); at('tubClose', -6.1, -3.0, -7.1, Y + 3.4, -3.5, Y + 4.1); { const B = b.celBathS(); if (B && B.rig) { const h = B.rig.B.head.getWorldPosition(new T.Vector3()); log('head at', (h.x - X).toFixed(2), (h.y - Y).toFixed(2), (h.z - Z).toFixed(2)); } }
const FR = b.celFridgeS(); log('fridge', !!FR, FR ? FR.jars.length + ' jars, water ' + !!FR.water : '');
if (FR) { FR.open = true; w.__adv(60); at('fridgeOpen', -5.3, 0.5, -5.6, F + 0.6, 2.1, F + 1.2); at('fridgeOpen2', -4.6, 0.9, -5.6, F + 0.7, 2.1, F + 1.3); at('fridgeOpen3', -5.0, -0.9, -5.6, F + 0.8, 2.0, F + 1.4); FR.open = false; w.__adv(60); at('fridgeShut3', -5.0, -0.9, -5.6, F + 0.8, 2.0, F + 1.4); }
b.scene.remove(A);
// the jump: stood in the living room, Space, the highest the eye goes
C.position.set(X + 1.2, E, Z + 0.3); b.camBaseY = E; w.__adv(20);
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
let top = -1e9; key('Space', true); w.__adv(2); key('Space', false);
for (let i = 0; i < 90; i++) { w.__adv(1); top = Math.max(top, C.position.y); }
log('jump: eye stood', (E - Y).toFixed(2), '| highest eye', (top - Y).toFixed(2), '| head (eye+0.12)', (top - Y + 0.12).toFixed(2), '| ceiling 5.78');
