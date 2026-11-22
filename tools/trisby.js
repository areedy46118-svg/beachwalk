/* WHERE THE TRIANGLES ARE (2026-11-22): at a few places, the main scene's own draw — its draw calls and triangles (`renderer.info`
 * read around the scene's render only) — and the visible, in-frustum meshes summed by the top-level group they belong to.
 * Run: PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/trisby.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(8000);
const T = b.THREE, C = b.camera;
const report = (name) => {
  C.updateMatrixWorld(true); const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse));
  const by = {}; let total = 0, draws = 0;
  for (const top of b.scene.children) {
    if (!top.visible) continue;
    top.traverseVisible((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (o.frustumCulled !== false) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(s)) return; }
      const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      let k = top.name; if (!k) { k = top.type + '#' + b.scene.children.indexOf(top) + '[' + top.children.slice(0, 3).map((c) => c.name || c.type).join(',') + ']@' + Math.round(top.position.x) + ',' + Math.round(top.position.z); } by[k] = by[k] || { t: 0, d: 0 }; by[k].t += n; by[k].d++; total += n; draws++;
    });
  }
  const top8 = Object.entries(by).sort((a, c) => c[1].t - a[1].t).slice(0, 12).map(([k, v]) => k + ' ' + Math.round(v.t / 1000) + 'k/' + v.d).join(' | ');
  log(name.padEnd(11), '| in view: draws', draws, 'tris', Math.round(total / 1000) + 'k', '||', top8);
};
for (const z of [-600]) { b.clearRoomFlags(); C.position.set(6, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); } report('beach ' + z); }
for (const k of []) {
  const RB = b.ROOM_BACK[k]; b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  RB.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(10); }
  report(k);
}
