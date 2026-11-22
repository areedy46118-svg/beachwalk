/* THE ONE IN THE CELLAR'S WASHER (2026-11-21): in, to the workbench (the washer wakes), in front of the washer while it
 * bangs, the padlock struck off with a swing's own test (`celLockStrike`), and the escape in stills — the kick, the leap,
 * the stare, the run, the stairs. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/washer.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(2);
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 900; i++) { b.frame(1); await sleep(15); const s = b.celS(), m = b.celWashS(); if (s.out && s.ready && m.mar && i > 60) break; }
log('loaded:', JSON.stringify(b.celWashS()));
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
const at = (lx, lz, tx, ty, tz) => { const f = b.celFloorNear(X + lx, Z + lz, Y + 3.2) ?? Y; C.position.set(X + lx, f + 1.7, Z + lz); b.camBaseY = C.position.y; b.lookAt(X + tx, Y + ty, Z + tz); };
const view = { lx: -4.3, lz: -0.7, tx: -5.2, ty: 0.5, tz: -2.45, fov: 52 };
const snap = (nm, g = 2.1) => { const q = C.quaternion.clone(), pp = C.position.clone(); const f0 = C.fov; C.fov = view.fov || 52; C.updateProjectionMatrix(); C.position.set(X + view.lx, Y + 1.35, Z + view.lz); C.lookAt(X + view.tx, Y + view.ty, Z + view.tz); C.updateMatrixWorld(true); shot(nm, 560, g); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
// to the bench: it wakes
at(-0.3, 1.2, -0.4, 0.8, 2.3); for (let i = 0; i < 6; i++) { at(-0.3, 1.2, -0.4, 0.8, 2.3); w.__adv(1); }
log('at the bench: wash', b.celWashS().wash);
// over to the washer while it bangs
let hopMax = 0, bangs0 = b.sampleLogS().length;
for (let i = 0; i < 300; i++) { at(-4.3, -1.15, -5.3, 0.6, -2.75); w.__adv(1); hopMax = Math.max(hopMax, b.celWashS().hop); if (i === 150) snap('wash_bang'); }
log('banging: hop max', hopMax.toFixed(3), '| sounds', b.sampleLogS().slice(-6).join(','));
// struck: the swing's own test, aimed at the padlock
at(-4.6, -1.6, -5.2, 0.52, -2.68); w.__adv(1); at(-4.6, -1.6, -5.2, 0.52, -2.68);
log('the blow lands on the lock:', b.celLockStrikeS(1));
const shots = [[0.3, 'esc_snap'], [1.35, 'esc_leap'], [3.2, 'esc_look1'], [4.6, 'esc_look2'], [6.0, 'esc_look3'], [7.4, 'esc_look4'], [9.6, 'esc_stare']];
let t = 0, k = 0, ph = '';
for (let i = 0; i < 60 * 14; i++) {
  if (b.celWashS().esc !== 'run' || t < 4.0) at(-4.6, -1.6, -5.0, 0.55, -2.4);
  w.__adv(1); t += 1 / 60;
  const s = b.celWashS();
  if (s.esc !== ph) { log(t.toFixed(2), 'phase', s.esc, '| him at', JSON.stringify(s.at), 'vis', s.vis, '| door', s.door); ph = s.esc; }
  if (k < shots.length && t >= shots[k][0]) { snap(shots[k][1]); k++; }
  if (s.esc === 'run' && !shots.stairs && s.at && s.at[0] > 0.2) { shots.stairs = 1; Object.assign(view, { lx: -1.95, lz: -2.8, tx: 1.0, ty: 1.3, tz: -2.8 }); snap('esc_stairs'); Object.assign(view, { lx: -4.3, lz: -0.7, tx: -5.2, ty: 0.5, tz: -2.45 }); }
  if (s.esc === 'run' && !shots.hall && s.at && s.at[0] > -3.4) { shots.hall = 1; Object.assign(view, { lx: -3.2, lz: -0.6, tx: -3.0, ty: 0.5, tz: -2.6 }); snap('esc_run2'); Object.assign(view, { lx: -4.3, lz: -0.7, tx: -5.2, ty: 0.5, tz: -2.45 }); }
  if (s.esc === 'run' && s.at) {   // the body's facing (off his shoulders) against where he is going
    const M = b.celMarS(), B = M.B; const L = B.LeftArm.getWorldPosition(new T.Vector3()), Rr = B.RightArm.getWorldPosition(new T.Vector3());
    const left = L.sub(Rr).setY(0).normalize(), fwd = new T.Vector3().crossVectors(left, new T.Vector3(0, 1, 0));
    if (shots.prev) { const mv = new T.Vector3(s.at[0] - shots.prev[0], 0, s.at[2] - shots.prev[2]); if (mv.length() > 0.02) { mv.normalize(); const ang = Math.acos(Math.max(-1, Math.min(1, mv.dot(fwd)))) * 180 / Math.PI; (shots.angs = shots.angs || []).push(ang); } }
    shots.prev = s.at;
  }
  if (!s.esc && s.wash === 2) { log(t.toFixed(2), 'gone; wash', s.wash, '| run: facing vs travel, degrees: mean', shots.angs ? (shots.angs.reduce((a, b) => a + b, 0) / shots.angs.length).toFixed(1) : '?', 'max', shots.angs ? Math.max(...shots.angs).toFixed(1) : '?', '| runYaw', (b.celMarRunYawS() || 0).toFixed(2)); break; }
}
at(-4.4, -1.3, -5.3, 0.4, -2.6); w.__adv(2); snap('after');
log('end:', JSON.stringify(b.celWashS()), '| marionette', JSON.stringify(b.marS()));
