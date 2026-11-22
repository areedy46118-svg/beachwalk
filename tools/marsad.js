/* THE MARIONETTE ON THE SWING, SAD (2026-11-22): close stills — in front of him (the sea's side), beside, behind (his view out
 * over the water) — the swing's own motion, and the gap between him and the plank (`MAR.lift`).
 * Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/marsad.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(3);
b.elvLandSet(true); C.position.set(HX - 8, HY + 1.9, HZ - 4); b.camBaseY = C.position.y;
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); if (b.elvSwingS() && i > 60) break; }
b.MAR.st = 'swing';
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && m.vis && i > 30) break; }
w.__clockOn();
const S = b.elvSwingS(), gp = S.g.getWorldPosition(new T.Vector3()), ax = new T.Vector3(1, 0, 0).applyQuaternion(S.g.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
const sp = () => S.seat.getWorldPosition(new T.Vector3());
for (let i = 0; i < 240; i++) { C.position.set(gp.x - 9, gp.y - 1.5, gp.z + 6); b.camBaseY = C.position.y; w.__adv(1); }
let mx = 0; for (let i = 0; i < 360; i++) { w.__adv(1); mx = Math.max(mx, Math.abs(S.ang)); }
log('face', b.MAR.face, '| ax', f2(ax.x), f2(ax.z), '| swing amplitude over 6 s', f2(mx), '| lift', f2(b.MAR.lift));
const s0 = sp(), F = ax.clone().multiplyScalar(b.MAR.face), N = new T.Vector3(-F.z, 0, F.x);
const snap = (nm, p, at, fov = 50) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.copy(p); C.lookAt(at); C.updateMatrixWorld(true); if (b.MAR.u.model) b.MAR.u.model.visible = true; shot(nm, 480, 1.9); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
const mid = s0.clone().add(new T.Vector3(0, 0.3, 0));
snap('sad_front', s0.clone().addScaledVector(F, 2.0).add(new T.Vector3(0, 0.5, 0)), mid);
snap('sad_side', s0.clone().addScaledVector(N, 1.6).add(new T.Vector3(0, 0.35, 0)), mid);
snap('sad_side2', s0.clone().addScaledVector(N, -1.2).add(new T.Vector3(0, 0.1, 0)), s0.clone().add(new T.Vector3(0, 0.05, 0)), 45);
snap('sad_behind', s0.clone().addScaledVector(F, -2.2).add(new T.Vector3(0, 0.9, 0)), s0.clone().addScaledVector(F, 6).add(new T.Vector3(0, -0.2, 0)), 60);
snap('swing_wide', s0.clone().addScaledVector(N, 4.5).addScaledVector(F, 1.5).add(new T.Vector3(0, 1.2, 0)), s0.clone().add(new T.Vector3(0, 0.8, 0)), 60);
// walk into the empty seat after he is gone
b.marHopOff(); for (let i = 0; i < 200; i++) w.__adv(1);
let m2 = 0; for (let i = 0; i < 120; i++) { w.__adv(1); m2 = Math.max(m2, Math.abs(S.ang)); }
log('after he hops off: amplitude', f2(m2), '| him', b.MAR.st);
