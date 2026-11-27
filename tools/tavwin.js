/* THE TAVERN'S END DOOR, WHERE THE OWNER STOOD (2026-11-26: "instead of this being a doorway can you make it a window that shows outside
 * the tavern high up … i want to be able to kick enemies out of this window and they fall to their death"). His readout: TAVERN, feet
 * -1.57, 0.03, -10.40, look -0.01 rad, aim -1.51, 1.56, -13.31 (2.9 m). Stood there: what the crosshair meets (mesh, its parents), the
 * drawn faces round the opening, the walk grid's floor beyond it, and a still. `&at=x,z&yaw=` another spot.
 *   PB_PORT=4241 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/tavwin.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
b.settings.devMode = true; w.__clockOn();
const Q = new URLSearchParams(location.search), T = b.THREE, C = b.camera, X = b.TAV_X ?? -6000, Y = b.TAV_Y ?? 800, Z = b.TAV_Z ?? 12000;
const at = (Q.get('at') || '-1.57,-10.40').split(',').map(Number), yaw = +(Q.get('yaw') || -0.01);
const fl = b.tavInfoS().floor(X + at[0], Z + at[1], Y + 10);
log('TAV', X, Y, Z, '| floor there', fl && fl.f !== undefined ? fl.f : JSON.stringify(fl));
const feet = typeof fl === 'number' ? fl : fl && fl.f !== undefined ? fl.f : Y + 7.52;
C.position.set(X + at[0], feet + 1.7, Z + at[1]); b.camBaseY = C.position.y; b.look(yaw, 0); C.updateMatrixWorld(true);
try { for (let i = 0; i < 20; i++) { C.position.set(X + at[0], feet + 1.7, Z + at[1]); b.look(yaw, 0); w.__adv(1); } } catch (e) { log('adv failed', e.message, e.stack.split('\n').slice(1, 3).join(' < ')); }
const rc = new T.Raycaster(); rc.camera = C; const D = new T.Vector3(); C.getWorldDirection(D);
const path = (o) => { const n = []; for (let a = o; a && n.length < 6; a = a.parent) n.push(a.name || a.type); return n.join(' < '); };
for (const [nm, dy, dx] of [['centre', 0, 0], ['low', -1.2, 0], ['high', 1.0, 0], ['left', 0, -1.0], ['right', 0, 1.0]]) {
  const O = C.position.clone().add(new T.Vector3(dx, dy, 0)); rc.set(O, D); rc.far = 30;
  const hs = rc.intersectObjects(b.scene.children, true).filter((h) => { let v = h.object.visible; for (let a = h.object.parent; a && v; a = a.parent) v = a.visible; return v && h.object.isMesh; }).slice(0, 3);
  log(nm.padEnd(6), hs.map((h) => `${h.distance.toFixed(2)} m: ${path(h.object)} @ local ${(h.point.x - X).toFixed(2)},${(h.point.y - feet).toFixed(2)},${(h.point.z - Z).toFixed(2)}`).join(' | '));
}
// the walk grid's floor along the line, a quarter metre a step
const row = []; for (let d = 0; d <= 8; d += 0.5) { const x = X + at[0] + D.x * d, z = Z + at[1] + D.z * d, f = b.tavInfoS().floor(x, z, feet + 0.4); const fv = typeof f === 'number' ? f : f && f.f; row.push(d + ':' + (Number.isFinite(fv) ? (fv - feet).toFixed(2) : 'none')); }
log('walk floor ahead (m: height over his feet)', row.join(' '));
shot('tavwin_eye', 640, 1.6);
C.position.set(X + at[0] + 2.5, feet + 2.2, Z + at[1] + 2.5); C.lookAt(X + at[0], feet + 1.5, Z + at[1] - 3); C.updateMatrixWorld(true); shot('tavwin_side', 640, 1.6);
// from above: the end wall and what is behind it (the roof hidden for the shot)
{ const hid = []; b.scene.traverse((o) => { if (o.isMesh && o.visible && /BackSide|Roof|roof/i.test(o.name)) { hid.push(o); o.visible = false; } });
  const kf = C.fov; C.fov = 70; C.updateProjectionMatrix(); C.position.set(X - 4, feet + 26, Z - 12); C.lookAt(X - 4, feet, Z - 12.01); C.updateMatrixWorld(true); shot('tavwin_top', 640, 1.4); C.fov = kf; C.updateProjectionMatrix();
  for (const o of hid) o.visible = true; }
// the scan's triangles behind the end wall (z < -13.45), by mesh: how many, their x and y spans
{ const by = {}; const v = new T.Vector3(); b.scene.traverse((o) => { if (!o.isMesh || !/FrontSide|BackSide/.test(o.name)) return; let inT = false; for (let a = o; a; a = a.parent) if (a.name === 'bw_tavern') inT = true; if (!inT) return;
    const P = o.geometry.attributes.position, I = o.geometry.index, n = (I ? I.count : P.count) / 3; o.updateMatrixWorld(true);
    for (let t = 0; t < n; t++) { let cx = 0, cy = 0, cz = 0; for (let q = 0; q < 3; q++) { v.fromBufferAttribute(P, I ? I.getX(t * 3 + q) : t * 3 + q).applyMatrix4(o.matrixWorld); cx += v.x / 3; cy += v.y / 3; cz += v.z / 3; }
      const lx = cx - X, ly = cy - feet, lz = cz - Z; if (lz > -13.45 || lz < -24 || lx < -8 || lx > 5) continue;
      const B = by[o.name] || (by[o.name] = { n: 0, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 }); B.n++; B.x0 = Math.min(B.x0, lx); B.x1 = Math.max(B.x1, lx); B.y0 = Math.min(B.y0, ly); B.y1 = Math.max(B.y1, ly); B.z0 = Math.min(B.z0, lz); B.z1 = Math.max(B.z1, lz); } });
  for (const k in by) { const B = by[k]; log('behind the wall:', k, B.n, 'tris | x', B.x0.toFixed(1), B.x1.toFixed(1), '| y', B.y0.toFixed(1), B.y1.toFixed(1), '| z', B.z0.toFixed(1), B.z1.toFixed(1)); } }
// the end wall round the arch: FrontSide_5's triangles with centroid in x -4.5..1.5, z -13.6..-12.6, by depth band
{ const v = new T.Vector3(), rows = {}; b.scene.traverse((o) => { if (!o.isMesh || o.name !== 'FrontSide_5') return; let inT = false; for (let a = o; a; a = a.parent) if (a.name === 'bw_tavern') inT = true; if (!inT) return;
  const P = o.geometry.attributes.position, I = o.geometry.index, n = (I ? I.count : P.count) / 3; o.updateMatrixWorld(true); const A = new T.Vector3(), B2 = new T.Vector3(), C2 = new T.Vector3();
  for (let t = 0; t < n; t++) { A.fromBufferAttribute(P, I ? I.getX(t * 3) : t * 3).applyMatrix4(o.matrixWorld); B2.fromBufferAttribute(P, I ? I.getX(t * 3 + 1) : t * 3 + 1).applyMatrix4(o.matrixWorld); C2.fromBufferAttribute(P, I ? I.getX(t * 3 + 2) : t * 3 + 2).applyMatrix4(o.matrixWorld);
    const lx = (A.x + B2.x + C2.x) / 3 - X, ly = (A.y + B2.y + C2.y) / 3 - feet, lz = (A.z + B2.z + C2.z) / 3 - Z; if (lx < -4.5 || lx > 1.5 || lz < -13.6 || lz > -12.6 || ly > 4.5) continue;
    const nz = Math.abs(new T.Vector3().subVectors(B2, A).cross(new T.Vector3().subVectors(C2, A)).normalize().z), key = lz.toFixed(2) + (nz > 0.9 ? ' facing' : ' side');
    const R = rows[key] || (rows[key] = { n: 0, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }); R.n++; R.x0 = Math.min(R.x0, lx, A.x - X, B2.x - X, C2.x - X); R.x1 = Math.max(R.x1, lx, A.x - X, B2.x - X, C2.x - X); R.y0 = Math.min(R.y0, A.y - feet, B2.y - feet, C2.y - feet); R.y1 = Math.max(R.y1, A.y - feet, B2.y - feet, C2.y - feet); } });
  for (const k of Object.keys(rows).sort()) { const R = rows[k]; log('end wall z', k, R.n, 'tris | x', R.x0.toFixed(2), R.x1.toFixed(2), '| y', R.y0.toFixed(2), R.y1.toFixed(2)); } }
log('DONE');
