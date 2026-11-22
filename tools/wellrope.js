/* THE WELL'S ROPE (2026-11-21, the owner, of the well after the man in it has let you up: "look at the rope floating and the rope
 * wrap around cut off"). The well loaded, the bucket wound up (as found) and then paid out to the bottom (after): stills from
 * the front a little above, as in his shot, and close on the drum; the rope's top, the coil's extent and the drum's in the
 * well's own frame. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/wellrope.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const G = b.wellGS(), T = b.THREE, C = b.camera, P0 = G.getWorldPosition(new T.Vector3());
C.position.set(P0.x + 4, 1.7, P0.z); b.camBaseY = 1.7;
for (let i = 0; i < 900 && !b.wellPartsS().crank; i++) { b.frame(1); await sleep(30); }
const W = b.wellPartsS(); log('well at', P0.toArray().map((v) => v.toFixed(1)).join(','), 'parts', Object.keys(W).filter((k) => W[k]).join(','));
w.requestAnimationFrame = () => 0;
const ext = (o) => { if (!o) return '-'; o.updateMatrixWorld(true); const B = new T.Box3().setFromObject(o); return ['x', 'y', 'z'].map((a) => a + ' ' + (B.min[a] - P0[a]).toFixed(3) + '..' + (B.max[a] - P0[a]).toFixed(3)).join(' '); };
const R = b.renderer, tiles = [];
const pic = (eye, at) => { C.position.copy(eye); b.camBaseY = eye.y; for (let i = 0; i < 3; i++) { b.lookAt(at.x, at.y, at.z); b.frame(1); } C.updateMatrixWorld(true); R.render(b.scene, C); const c = document.createElement('canvas'); c.width = 480; c.height = 360; c.getContext('2d').drawImage(R.domElement, 0, 0, 480, 360); tiles.push(c); };
const front = () => { const f0 = C.fov; C.fov = 22; C.updateProjectionMatrix(); for (const sz of [1, -1]) pic(new T.Vector3(P0.x - 0.15, P0.y + 0.55, P0.z + sz * 1.25), new T.Vector3(P0.x - 0.15, P0.y + 0.3, P0.z)); C.fov = f0; C.updateProjectionMatrix(); };
log('AS FOUND: rope', ext(W.myRope), '| coil', ext(W.rope), '| crank', ext(W.crank));
front();
b.wellBucketDownS();
log('AFTER: rope', ext(W.myRope), '| coil', ext(W.rope), '| crank', ext(W.crank));
front();
const cv = document.createElement('canvas'); cv.width = 960; cv.height = 720; tiles.forEach((c, i) => cv.getContext('2d').drawImage(c, (i % 2) * 480, Math.floor(i / 2) * 360));
const d = cv.toDataURL('image/jpeg', 0.88).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'well', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
// (in the well model's own frame: the coil's kept triangles and ALL its vertices, the crank's axle, and our rope)
{
  const m = W.rope.parent; while (m && !(m.parent === G)) { /* the model root under wellG */ break; }
  const root = G.children.find((c) => { let f = false; c.traverse((o) => { if (o === W.rope) f = true; }); return f; });
  root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(root.matrixWorld).invert(), M = new T.Matrix4(), v = new T.Vector3();
  const scan = (obj, keptOnly) => { const B = new T.Box3(); obj.traverse((o) => { if (!o.isMesh) return; M.multiplyMatrices(inv, o.matrixWorld); const P = o.geometry.attributes.position; const ix = o.geometry.index; const ids = keptOnly && ix ? ix.array : null; const n = ids ? ids.length : P.count; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, ids ? ids[i] : i).applyMatrix4(M); B.expandByPoint(v); } }); return ['x', 'y', 'z'].map((a) => a + ' ' + B.min[a].toFixed(3) + '..' + B.max[a].toFixed(3)).join(' '); };
  log('MODEL FRAME coil kept', scan(W.rope, true), '| coil all', scan(W.rope, false), '| crank', scan(W.crank, false));
  // the crank's axle: its vertices near x = 0 (the drum), their y,z centre and radius
  let sy = 0, sz = 0, n = 0, rr = []; W.crank.traverse((o) => { if (!o.isMesh) return; M.multiplyMatrices(inv, o.matrixWorld); const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); if (Math.abs(v.x) < 0.15) { sy += v.y; sz += v.z; n++; rr.push(v.clone()); } } });
  if (n) { const cy = sy / n, cz = sz / n, R = rr.map((p) => Math.hypot(p.y - cy, p.z - cz)).sort((a, c) => a - c); log('drum near x 0: centre y', cy.toFixed(3), 'z', cz.toFixed(3), '| radius med', R[R.length >> 1].toFixed(3), 'max', R[R.length - 1].toFixed(3), 'n', n); }
  const rp = W.myRope; log('our rope (model): x', rp.position.x.toFixed(3), 'z', rp.position.z.toFixed(3), 'top', (rp.position.y + rp.scale.y / 2).toFixed(3), '| model scale', root.scale.toArray().map((s) => s.toFixed(2)).join(','));
}
{ const root = G.children.find((c) => { let f = false; c.traverse((o) => { if (o === W.rope) f = true; }); return f; }); root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert(), M = new T.Matrix4(), v = new T.Vector3(), B = new T.Box3();
  b.wellSetBucketS(0); root.updateMatrixWorld(true);
  W.handle.traverse((o) => { if (!o.isMesh) return; M.multiplyMatrices(inv, o.matrixWorld); const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); if (v.y > 0.18) B.expandByPoint(v); } });
  log('handle top part (model):', ['x', 'y', 'z'].map((a) => a + ' ' + B.min[a].toFixed(3) + '..' + B.max[a].toFixed(3)).join(' ')); }
