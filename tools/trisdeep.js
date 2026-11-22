/* INSIDE THE HEAVY GROUPS (2026-11-22): for each of the top scene groups in view at a beach spot, the in-frustum meshes
 * grouped by their name path (two levels under the top), with draws and triangles — which prop each draw belongs to.
 * Run: PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/trisdeep.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(+(new URLSearchParams(location.search).get("w") || 8000));
const T = b.THREE, C = b.camera;
const Z = +(new URLSearchParams(location.search).get('z') || -600);
b.clearRoomFlags(); C.position.set(6, 1.7, Z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
C.updateMatrixWorld(true); const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse));
const tops = [];
for (const top of b.scene.children) {
  if (!top.visible) continue; const by = {}; let t = 0, d = 0;
  top.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (o.frustumCulled !== false) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(s)) return; }
    const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    const path = []; let p = o; while (p && p !== top) { path.unshift(p.name || p.type); p = p.parent; }
    const k = path.slice(0, +(new URLSearchParams(location.search).get('dep') || 2)).join('/') + (o.isSkinnedMesh ? ' [skin]' : ''); by[k] = by[k] || { t: 0, d: 0 }; by[k].t += n; by[k].d++; t += n; d++;
  });
  if (d) tops.push({ top, by, t, d });
}
tops.sort((a, c) => c.d - a.d);
for (const { top, by, t, d } of tops.slice(0, 8)) {
  log('== ' + (top.name || top.type) + ' #' + b.scene.children.indexOf(top) + ' @' + Math.round(top.position.x) + ',' + Math.round(top.position.z) + ' draws ' + d + ' tris ' + Math.round(t / 1000) + 'k');
  for (const [k, v] of Object.entries(by).sort((a, c) => c[1].d - a[1].d).slice(0, 14)) log('   ' + k.slice(0, 70).padEnd(70) + ' ' + v.d + ' draws ' + Math.round(v.t / 1000) + 'k');
}
{ const R = b.renderer; R.info.autoReset = false; R.info.reset(); R.render(b.scene, C); log('one scene render: calls', R.info.render.calls, 'tris', Math.round(R.info.render.triangles / 1000) + 'k'); R.info.autoReset = true; }
