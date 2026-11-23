/* HIS HEAD COMING ROUND ON THE SWING WHEN YOU TALK (2026-11-22: smoothed): the head's turn per frame, idle, the talk opened, closed. Was: THE MARIONETTE ON THE SWING, AND AT YOUR SIDE (2026-11-21): out of the washer he is on the swing in front of Elvédor's house,
 * facing you, pumping it high (stills across a swing); the walk up (bars); the talk and his hop off; following you; a fight
 * with one of Elvédor's kind beside you; and his death, in pieces.
 * Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/marswing.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(2);
b.elvLandSet(true); C.position.set(HX - 8, HY + 1.9, HZ - 4); b.camBaseY = C.position.y;
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); if (b.elvSwingS() && i > 60) break; }
b.MAR.st = 'swing';
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && m.vis && i > 30) break; }
log('on the swing:', JSON.stringify(b.marS()));
w.__clockOn();
const S = b.elvSwingS(), gp = S.g.getWorldPosition(new T.Vector3()), ax = new T.Vector3(1, 0, 0).applyQuaternion(S.g.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
const fl = gp.y - S.L - 0.55;
// stand in front of him, 7 m off along his way
const side = (C.position.x - gp.x) * ax.x + (C.position.z - gp.z) * ax.z >= 0 ? 1 : -1;
const stand = (d, h = 1.7) => { C.position.set(gp.x + ax.x * side * d, fl + h, gp.z + ax.z * side * d); b.camBaseY = C.position.y; b.lookAt(gp.x, fl + 0.9, gp.z); };
const snap = (nm, px, py, pz, tx, ty, tz, fov = 55, g = 1.6) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); for (const u of b.mutants || []) if (u.model) u.model.visible = true; if (b.MAR.u && b.MAR.u.model) b.MAR.u.model.visible = true; shot(nm, 480, g); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
for (let i = 0; i < 60; i++) { stand(20); w.__adv(1); }
for (let i = 0; i < 30; i++) { stand(6); w.__adv(1); }
log('facing', b.MAR.face, '| side', side, '| amp', f2(S.amp));
for (let i = 0; i < 60; i++) { stand(3.0); w.__adv(1); }
const H = b.MAR.u.marBones.head, fw = () => new T.Vector3(0, 0, 1).applyQuaternion(H.getWorldQuaternion(new T.Quaternion()));
const run = (nm, n) => { let prev = fw(), mx = 0, tot = 0; const series = []; for (let i = 0; i < n; i++) { stand(3.0); w.__adv(1); const f = fw(), a = f.angleTo(prev); prev = f; mx = Math.max(mx, a); tot += a; if (i % 6 === 0) series.push((a * 180 / Math.PI).toFixed(1)); } log(nm, 'max per frame', (mx * 180 / Math.PI).toFixed(2), 'deg | total', (tot * 180 / Math.PI).toFixed(1), 'deg | every 6th frame:', series.join(' ')); };
run('idle', 60);
b.marTalk(); run('talk on', 120);
if (b.endDialog) b.endDialog(); else { w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); }
log('dialog open after end?', b.state().dialogOpen);
run('talk off', 120);
