/* THE SECRET CUBBY IN XIII (2026-11-22, the owner's still from castle XIII, feet 26.51, 0.64, −16.25 looking up at 1.98 rad: "put a
 * secret cubby you can hook to up here"): the view again, and where the faces up the wall in front are (rays at rising pitches:
 * the distance and height of the first drawn face). &view=1 stills only.  PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/c13cubby.js' <out> */
w.eval(await (await fetch('/tools/c13look.js?' + Date.now())).text());
log('c13', await w.__c13LookBoot());
const C = b.camera, T = w.__T, X = b.C13_X, Z = b.C13_Z, Q = new URLSearchParams(location.search);
const LX = +(Q.get('lx') || 26.51), LZ = +(Q.get('lz') || -16.25), YAW = +(Q.get('yaw') || 1.98);
C.position.set(X + LX, C.position.y, Z + LZ); b.camBaseY = C.position.y; b.look(YAW, 0); w.__c13Adv(10);
const S = b.C13_SITE, eye = C.position.clone(); log('eye', (eye.x - X).toFixed(2), eye.y.toFixed(2), (eye.z - Z).toFixed(2));
const rc = new T.Raycaster(); rc.camera = C;
for (let p = 0; p <= 1.3; p += 0.1) {
  b.look(YAW, p); C.updateMatrixWorld(true); const D = new T.Vector3(); C.getWorldDirection(D);
  const t = b.siteRayS(S, eye.clone(), D.clone(), 60);
  rc.set(eye, D); rc.far = 80; const h = rc.intersectObjects(b.scene.children, true).find((q) => q.object.isMesh && q.object.visible && q.object.name !== 'hitProxy' && !(q.object.material && q.object.material.transparent));
  log('pitch', p.toFixed(1), 'siteRay', t === null ? '-' : t.toFixed(2), '| drawn', h ? `${h.distance.toFixed(2)} at ${(h.point.x - X).toFixed(2)},${h.point.y.toFixed(2)},${(h.point.z - Z).toFixed(2)} n ${h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld).toArray().map((v) => v.toFixed(2)).join(',') : '-'} ${h.object.name}` : '-');
}
w.__c13Adv(2);
const v = Q.get('views') ? JSON.parse(Q.get('views')) : [[LX, LZ, YAW, 0.95], [LX, LZ, YAW, 0.55], [LX - 4, LZ + 3, YAW, 0.6], [LX, LZ, YAW, 0.25]];
const d = w.__c13Look(v, 480, 6).split('#')[0];
const n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'c13cubby', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
// the wall's stone: how many uv units a metre, off the triangle the ray met; and how high the face goes
{
  b.look(YAW, 0.9); C.updateMatrixWorld(true); const D = new T.Vector3(); C.getWorldDirection(D);
  rc.set(eye, D); rc.far = 80; const h = rc.intersectObjects(b.scene.children, true).find((q) => q.object.isMesh && q.object.visible && q.object.material && q.object.material.name === 'acmat_4');
  if (h) { const G = h.object.geometry, P = G.attributes.position, U = G.attributes.uv, f = h.face, M = h.object.matrixWorld;
    const p = [f.a, f.b, f.c].map((i) => new T.Vector3().fromBufferAttribute(P, i).applyMatrix4(M)), u = [f.a, f.b, f.c].map((i) => new T.Vector2().fromBufferAttribute(U, i));
    log('uv per metre', (u[0].distanceTo(u[1]) / p[0].distanceTo(p[1])).toFixed(3), (u[1].distanceTo(u[2]) / p[1].distanceTo(p[2])).toFixed(3), '| wrap', h.object.material.map && h.object.material.map.wrapS, '| scale', h.object.getWorldScale(new T.Vector3()).x.toFixed(3), '| c13World scale', b.scene.getObjectByName('castle13').scale.x, 'pos y', b.scene.getObjectByName('castle13').position.y);
  }
  // up the face: a level ray into it from 2 m out, every metre
  const n = new T.Vector3(0.87, 0, -0.49), F0 = new T.Vector3(X + 24.55, 0, Z - 15.40);
  const tops = [];
  for (let y = 6; y < 40; y += 1) { const O = F0.clone().addScaledVector(n, 2.0); O.y = y; rc.set(O, n.clone().negate()); rc.far = 4; const h2 = rc.intersectObjects(b.scene.children, true).find((q) => q.object.isMesh && q.object.visible); tops.push(y + ':' + (h2 ? h2.distance.toFixed(1) : '-')); }
  log('face out to in, by height:', tops.join(' '));
}
