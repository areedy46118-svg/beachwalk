/* THE MAN AT THE TAVERN'S RAILING (2026-11-26, `buildTavLookout`): is he there, stood at the rail facing out and held; a still; then
 * the game's own kick on him from behind (`kickManS` along -Z): thrown, through the railing, out, dead, hidden.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/tavlook.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 400 && !(b.tavLookoutS() && b.tavLookoutS().model && b.tavLookoutS().clips); i++) { b.frame(1); await sleep(40); }
for (let i = 0; i < 500 && !b.TAV_YARDS.on; i++) { b.frame(1); await sleep(40); }
log('the keep outside behind the window', b.TAV_YARDS.on);
const u = b.tavLookoutS(); if (!u) { log('NO LOOKOUT'); log('DONE'); }
b.settings.devMode = true; w.__clockOn();
const T = b.THREE, C = b.camera, X = -6000, Z = 12000, fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 810), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const errs = []; w.addEventListener('error', (e) => errs.push(String(e.message).slice(0, 140)));
const eye = (nm, x, z, yaw, pitch = 0) => { for (let i = 0; i < 3; i++) { C.position.set(X + x, fl + 1.7, Z + z); b.camBaseY = C.position.y; b.look(yaw, pitch); w.__adv(1); } C.updateMatrixWorld(true); shot(nm, 640, 1.5); };
for (let i = 0; i < 60; i++) w.__adv(1);
log('lookout', u.kindName, '| alive', u.st.alive, 'awake', u.st.awake, '| at local', (u.g.position.x - X).toFixed(2), (u.g.position.z - Z).toFixed(2), 'feet', (u.g.position.y - fl).toFixed(2), '| yaw', u.g.rotation.y.toFixed(2), '| clip', u.cur ? u.cur.getClip().name : '-', '| visible', u.g.visible);
eye('look_back', -0.6, -9.6, 0, -0.08);
eye('look_side', -3.0, -11.6, -1.1, -0.1);
eye('look_out', -1.4, -12.76, 0, -0.15); eye('look_outdown', -1.4, -12.76, 0, -0.7); eye('look_outL', -1.4, -12.76, 0.7, -0.3); eye('look_outR', -1.4, -12.76, -0.7, -0.3);
// the kick, from 1.3 m behind him
C.position.set(u.g.position.x, fl + 1.7, u.g.position.z + 1.3); b.camBaseY = C.position.y; b.look(0, 0); for (let i = 0; i < 4; i++) w.__adv(1);
if (new URLSearchParams(location.search).get('kill')) u.st.hp = 1;
b.kickDirS(0, -1); b.kickManS(u);
let out = null, dead = null, hid = null, low = 9;
for (let f = 0; f < 60 * 12; f++) { w.__adv(1); const H = u.rag && (u.rag.byName['Character1_Hips'] || u.rag.parts[0]); const y = H ? H.p.y - fl : u.g.position.y - fl; low = Math.min(low, y);
  if (f % 60 === 59) log('  t', ((f + 1) / 60).toFixed(0), '| hips local', H ? [(H.p.x - X).toFixed(1), (H.p.y - fl).toFixed(1), (H.p.z - Z).toFixed(1)].join(' ') : 'no rag', '| g', [(u.g.position.x - X).toFixed(1), (u.g.position.y - fl).toFixed(1), (u.g.position.z - Z).toFixed(1)].join(' '), '| alive', u.st.alive, 'visible', u.g.visible, 'kickRag', !!u.kickRag, 'rag', !!u.rag);
  if (H && out === null && b.tavOutsideS(H.p.x, H.p.z)) out = (f / 60).toFixed(2); if (dead === null && !u.st.alive) dead = (f / 60).toFixed(2); if (hid === null && !u.g.visible) hid = (f / 60).toFixed(2);
  if (f === 70) { C.position.set(X - 0.43, fl + 1.7, Z - 12.95); b.look(0, -0.8); C.updateMatrixWorld(true); shot('look_falling', 640, 1.5); }
  if (f === 14) { C.position.set(X - 0.4, fl + 1.7, Z - 10.4); b.look(0, -0.1); C.updateMatrixWorld(true); shot('look_kicked', 640, 1.5); } }
{ const H = u.rag && (u.rag.byName['Character1_Hips'] || u.rag.parts[0]); log('ground is', (b.tavGroundYS() - fl).toFixed(1), 'm under the floor | fellOut', !!u.st.fellOut, 'fellHit', !!u.st.fellHit);
  for (const [nm, pitch, fov] of [['look_down', -0.75, 75], ['look_down2', -0.5, 75], ['look_zoom', Math.atan2(-(fl + 1.7 - H.p.y), Math.hypot(H.p.z - (Z - 12.95), 0.01)), 22]]) { C.fov = fov; C.updateProjectionMatrix(); for (let i = 0; i < 3; i++) { C.position.set(X - 0.43, fl + 1.7, Z - 12.95); b.camBaseY = C.position.y; b.look(0, pitch); w.__adv(1); } C.updateMatrixWorld(true); shot(nm, 640, 1.5); } }
log('kicked from behind | awake', u.st.awake, '| ragdoll', !!u.rag, '| out at', out, 's | lowest', low.toFixed(1), '| dead at', dead, '| hidden at', hid, '| railing bays down', b.tavRailS().bays.map((B) => B.dead).join(','));
log('errors', JSON.stringify(errs.slice(0, 4)));
log('DONE');
