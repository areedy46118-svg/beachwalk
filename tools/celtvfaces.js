/* THE TV'S FACES: every front-facing triangle of the set, grouped by its plane, with its uv box. Was: THE ROOMS UP THE CELLAR STAIRS (2026-11-22, the owner: the armchair in the way, the fridge's mess, the head through the ceiling,
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
let M = null; b.scene.traverse((o) => { if (!M && o.isMesh && o.name.startsWith('tvSet_')) M = o; });
const G = M.geometry, P = G.attributes.position, U = G.attributes.uv, I = G.index;
log('tv', P.count, I ? I.count / 3 : P.count / 3, 'groups', JSON.stringify(G.groups), 'map', M.material.map && M.material.map.image && M.material.map.image.width);
const v = [new T.Vector3(), new T.Vector3(), new T.Vector3()], n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
const bins = {};
const nt = I ? I.count / 3 : P.count / 3;
for (let t = 0; t < nt; t++) {
  const ids = [0, 1, 2].map((k) => I ? I.getX(t * 3 + k) : t * 3 + k);
  ids.forEach((id, k) => v[k].fromBufferAttribute(P, id).applyMatrix4(M.matrixWorld).sub(new T.Vector3(X, Y, Z)));
  e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); n.crossVectors(e1, e2); const A = n.length() / 2; n.normalize();
  const key = 'n' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ',' + n.z.toFixed(1) + ' z' + ((v[0].z + v[1].z + v[2].z) / 3).toFixed(2);
  const B = bins[key] = bins[key] || { c: 0, a: 0, x0: 9, x1: -9, y0: 99, y1: -99, u0: 9, u1: -9, v0: 9, v1: -9 };
  B.c++; B.a += A;
  for (let k = 0; k < 3; k++) { B.x0 = Math.min(B.x0, v[k].x); B.x1 = Math.max(B.x1, v[k].x); B.y0 = Math.min(B.y0, v[k].y); B.y1 = Math.max(B.y1, v[k].y); const uu = U.getX(ids[k]), vv = U.getY(ids[k]); B.u0 = Math.min(B.u0, uu); B.u1 = Math.max(B.u1, uu); B.v0 = Math.min(B.v0, vv); B.v1 = Math.max(B.v1, vv); }
}
for (const [k, B] of Object.entries(bins).sort((a, b) => b[1].a - a[1].a).slice(0, 30)) log(k, 'tris', B.c, 'area', B.a.toFixed(3), 'x', B.x0.toFixed(2), B.x1.toFixed(2), 'y', B.y0.toFixed(2), B.y1.toFixed(2), 'uv', B.u0.toFixed(3), B.u1.toFixed(3), B.v0.toFixed(3), B.v1.toFixed(3));
for (let t = 0; t < nt; t++) { const ids = [0, 1, 2].map((k) => I ? I.getX(t * 3 + k) : t * 3 + k); ids.forEach((id, k) => v[k].fromBufferAttribute(P, id).applyMatrix4(M.matrixWorld).sub(new T.Vector3(X, Y, Z))); e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); n.crossVectors(e1, e2).normalize(); if (n.z < -0.9 && v[0].z < 1.97) log('FT', ids.map((id, k) => v[k].x.toFixed(3) + ',' + v[k].y.toFixed(3) + ',' + v[k].z.toFixed(3) + '/' + U.getX(id).toFixed(3) + ',' + U.getY(id).toFixed(3)).join(' ')); }
const im = M.material.map && M.material.map.image; if (im) { const c = w.document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); log('TEXPNG', c.toDataURL('image/png')); w.__tvtex = c.toDataURL('image/png'); }
at('tvclose', 1.1, 0.9, 1.1, F + 0.85, 2.3);
