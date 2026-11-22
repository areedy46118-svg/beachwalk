/* WHERE THE DRAWS ARE, PLACE BY PLACE (2026-11-22): the beach spots then rooms (`&rooms=tav,thr`), and at each the one-render
 * call count and the top groups by draws, each with its heaviest name paths (`&dep=3`).
 * PB_PORT=4223 PB_WAIT=900 PB_Q='&rooms=tav,thr,dojo' sh tools/probe.sh 'evalFile&f=/tools/drawsat.js' <out> */
const Q = new URLSearchParams(location.search), DEP = +(Q.get('dep') || 3);
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(30000);
const T = b.THREE, C = b.camera;
const report = (name) => {
  C.updateMatrixWorld(true); const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse));
  const tops = [];
  for (const top of b.scene.children) {
    if (!top.visible) continue; const by = {}; let d = 0, t = 0;
    top.traverseVisible((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      if (o.frustumCulled !== false && o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(s)) return; }
      const g = o.geometry, n = g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0;
      const ms = Array.isArray(o.material) ? o.material.length : 1, two = (Array.isArray(o.material) ? o.material : [o.material]).filter((m) => m && m.transparent && m.side === 2 && !m.forceSinglePass).length;
      const path = []; let p = o; while (p && p !== top) { path.unshift(p.name || p.type); p = p.parent; }
      const k = path.slice(0, DEP).join('/'); by[k] = by[k] || { d: 0, t: 0 }; by[k].d += ms + two; by[k].t += n; d += ms + two; t += n;
    });
    if (d) tops.push({ top, by, d, t });
  }
  const R = b.renderer; R.info.autoReset = false; R.info.reset(); R.render(b.scene, C); const calls = R.info.render.calls; R.info.autoReset = true;
  tops.sort((a, c) => c.d - a.d);
  log('#### ' + name + ': one render ' + calls + ' calls; counted ' + tops.reduce((s, x) => s + x.d, 0));
  for (const { top, by, d, t } of tops.slice(0, 6)) {
    log('== ' + (top.name || top.type) + ' #' + b.scene.children.indexOf(top) + ' @' + Math.round(top.position.x) + ',' + Math.round(top.position.z) + ' draws ' + d + ' tris ' + Math.round(t / 1000) + 'k');
    for (const [k, v] of Object.entries(by).sort((a, c) => c[1].d - a[1].d).slice(0, 6)) log('     ' + k.slice(0, 64).padEnd(64) + ' ' + v.d + ' / ' + Math.round(v.t / 1000) + 'k');
  }
};
for (const z of (Q.get('zs') || '-300,-600').split(',').map(Number)) { b.clearRoomFlags(); C.position.set(6, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); } report('beach ' + z); }
for (const k of (Q.get('rooms') || '').split(',').filter(Boolean)) {
  const RB = b.ROOM_BACK[k]; if (!RB) continue; b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(10); } report(k);
}
