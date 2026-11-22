/* SKINNED MESHES DRAWN OFF-SCREEN (2026-11-22): every skinned mesh is `frustumCulled = false` (its box is the bind pose), so it
 * is skinned and drawn wherever it is. At a few places: how many are drawn, their vertices, and how many of them a generous
 * sphere round the unit (bind-pose sphere x2 + 1.5 m) puts wholly outside the view.  PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/skincull.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(30000);
const T = b.THREE, C = b.camera, s = new T.Sphere();
const report = (name) => {
  C.updateMatrixWorld(true); const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse));
  let n = 0, v = 0, on = 0, vOut = 0; const outs = {};
  b.scene.traverseVisible((o) => {
    if (!o.isSkinnedMesh || o.frustumCulled) return; n++; const nv = o.geometry.attributes.position.count; v += nv;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    s.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); s.radius = s.radius * 2 + 1.5;
    if (fr.intersectsSphere(s)) { on++; return; }
    vOut += nv; let p = o; while (p.parent && p.parent !== b.scene) p = p.parent; const k = (p.name || o.name || 'x').slice(0, 18); outs[k] = (outs[k] || 0) + 1;
  });
  const R = b.renderer; R.info.autoReset = false; R.info.reset(); const t0 = performance.now(); R.render(b.scene, C); const ms = performance.now() - t0; const calls = R.info.render.calls; R.info.autoReset = true;
  log(name.padEnd(11), 'skinned drawn', n, 'verts', Math.round(v / 1000) + 'k', '| outside view', n - on, Math.round(vOut / 1000) + 'k verts', '| calls', calls, 'cpu', ms.toFixed(2), '|', Object.entries(outs).slice(0, 8).map(([k, c]) => k + ' ' + c).join(', '));
};
for (const z of [-60, -300, -600, -900]) { b.clearRoomFlags(); C.position.set(6, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); } report('beach ' + z); }
for (const k of ['tav', 'cat', 'keep', 'uc', 'dojo', 'bunker', 'thr']) {
  const RB = b.ROOM_BACK[k]; if (!RB) continue; b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(10); } report(k);
}
