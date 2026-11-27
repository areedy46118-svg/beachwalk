/* THE TAVERN'S WINDOW (2026-11-26, `buildTavWindow`): stills through it from the hall (the view, the sill, the arch); you walking
 * and jumping at it (you must stay in); and the orc and Wong, each stood a stride in from it, kicked at it (`kickRagStartS` as the kick
 * does at the window, 1.8): does he go out, how far down, is he dead, is he hidden once far below.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/tavwintest.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 300 && !(b.orcUnit && b.orcUnit.model && b.wongUnit && b.wongUnit.model); i++) { b.frame(1); await sleep(30); }
b.settings.devMode = true; w.__clockOn();
const T = b.THREE, C = b.camera, X = -6000, Y = 800, Z = 12000, W = b.TAV_WINS, fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, Y + 10), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const errs = []; w.addEventListener('error', (e) => errs.push(String(e.message).slice(0, 140)));
log('window built', !!b.tavVistaS(), '| floor', fl.toFixed(2));
const eye = (nm, x, z, yaw, pitch = 0, fov = 75) => { C.fov = fov; C.updateProjectionMatrix(); for (let i = 0; i < 3; i++) { C.position.set(X + x, fl + 1.7, Z + z); b.camBaseY = C.position.y; b.look(yaw, pitch); w.__adv(1); } C.updateMatrixWorld(true); shot(nm, 640, 1.5); };
eye('win_far', -1.4, -5.5, 0, 0.05);
eye('win_near', -1.4, -12.2, 0, -0.35);
eye('rail_mid', -1.4, -9.5, 0, -0.12);
if (new URLSearchParams(location.search).get('cap')) { b.tavVistaCaptureS(); eye('win_cap', -1.4, -12.2, 0, -0.3); }
// you, walking and jumping at it from 3 m
{ C.position.set(X - 1.4, fl + 1.7, Z - 10.4); b.camBaseY = C.position.y; let minZ = 0;
  for (let f = 0; f < 240; f++) { b.look(0, 0); const k = b.keysS ? b.keysS() : null; C.position.z -= 0.05; if (f % 40 === 20 && b.jumpS) b.jumpS(); w.__adv(1); minZ = Math.min(minZ, C.position.z - Z); }
  log('you walked at it: got to local z', minZ.toFixed(2), '(held at', W.stop, '— out would be under', W.alcove, ')', '| feet', (C.position.y - 1.7 - fl).toFixed(2)); }
// kicked out
for (const nm of ['orcUnit', 'wongUnit']) {
  const u = b[nm]; if (!u || !u.st.alive) { log(nm, 'not there'); continue; }
  u.g.position.set(X + W.cx + 0.2, fl, Z + W.cz + 1.3); log(nm, 'placed at local', (W.cx + 0.2).toFixed(2), (W.cz + 1.3).toFixed(2)); u.g.rotation.y = 0; u.st.atk = -1; u.st.hp = Math.max(u.st.hp, 30);
  C.position.set(X + W.cx, fl + 1.7, Z + W.cz + 3.2); b.camBaseY = C.position.y; b.look(0, 0);
  for (let i = 0; i < 20; i++) w.__adv(1);
  u.g.position.set(X + W.cx + 0.2, fl, Z + W.cz + (nm === 'wongUnit' ? 3.4 : 1.3));
  log(nm, 'kicked from local', (u.g.position.x - X).toFixed(2), (u.g.position.z - Z).toFixed(2), '| mode', u.st.mode || u.mode || '-');
  const ok = b.kickRagStartS(u, 0, -1, 1.8); if (ok && b.tavWindowThrowS) b.tavWindowThrowS(u, new T.Vector3(0, 0, -1));
  let lowest = 9, dead = null, hidden = null, outAt = null;
  for (let f = 0; f < 60 * 6; f++) { w.__adv(1); const H = u.rag && (u.rag.byName['Character1_Hips'] || u.rag.parts[0]); const y = H ? H.p.y - fl : u.g.position.y - fl; lowest = Math.min(lowest, y); if (f % 9 === 0 && f < 120 && H) log('   orc hips t', (f / 60).toFixed(2), 'local', (H.p.x - X).toFixed(2), (H.p.y - fl).toFixed(2), (H.p.z - Z).toFixed(2), '| floor', (H.floor !== undefined ? (H.floor - fl).toFixed(2) : '-'), '| wall hits', u.rag.wallHit || 0, '| kickRag', !!u.kickRag, '| parts', u.rag.parts.length, H.name || '', '| zmin', Math.min(...u.rag.parts.map(q => q.p.z - Z)).toFixed(2), '| alive', u.st.alive);
    if (H && outAt === null && b.tavOutsideS(H.p.x, H.p.z)) outAt = (f / 60).toFixed(2); if (dead === null && !u.st.alive) dead = (f / 60).toFixed(2); if (hidden === null && !u.g.visible) hidden = (f / 60).toFixed(2); }
  log(nm, 'railing bays down', b.tavRailS() ? b.tavRailS().bays.map((B) => B.dead).join(',') : 'none');
  log(nm, '| thrown', ok, '| hips past the wall at', outAt, 's | lowest', lowest.toFixed(1), 'm under the floor | dead at', dead, 's | hidden at', hidden, 's');
  if (nm === 'orcUnit') { C.position.set(X + W.cx, fl + 1.7, Z + W.cz + 1.2); b.look(0, -0.5); C.updateMatrixWorld(true); }
}
{ for (let i = 0; i < 30; i++) w.__adv(1); eye('rail_after', -1.4, -10.2, 0, -0.2); b.tavRailMendS(); const c = C.position.clone(); c.set(X - 2.4, fl + 1.7, Z - 12.4); const D = new T.Vector3(0, 0, -1); log('your kick at the left bay breaks it', b.tavRailKickS(c, D), b.tavRailS().bays.map((B) => B.dead).join(',')); for (let i = 0; i < (+(new URLSearchParams(location.search).get('kw')) || 6); i++) w.__adv(1); eye('rail_kick', -2.4, -11.6, 0, -0.35); }
log('errors', JSON.stringify(errs.slice(0, 4)));
log('DONE');
