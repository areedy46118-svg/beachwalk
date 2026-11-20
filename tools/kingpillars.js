/* WHERE THE TEMPLE'S PILLARS ARE (2026-11-19, for the Ancient King's run up one): rays out from the podium's middle at
 * chest height round the full turn find the pillars' near faces; a ray down over each (a little past its face) reads the
 * top of what stands on it. Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kingpillars.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 600 && !b.devTemple(); i++) { b.frame(1); await sleep(60); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
const T = b.THREE, W = b.tmpG().world, F = b.tmpFloorAt(0, 0), X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
W.updateMatrixWorld(true);
const meshes = []; W.traverse((o) => { if (o.isMesh && o.visible && !o.isInstancedMesh && o.name !== 'ancientKing' && o.geometry && o.geometry.attributes.position.count > 50) meshes.push(o); });
const rc = new T.Raycaster(); const hits = [];
for (let i = 0; i < 360; i++) {
  const a = i * Math.PI / 180;
  rc.set(new T.Vector3(X, Y + F + 4, Z), new T.Vector3(Math.sin(a), 0, Math.cos(a))); rc.far = 60;
  const h = rc.intersectObjects(meshes, false)[0];
  hits.push(h ? h.distance : -1);
}
// runs of near hits are pillars: their middle angle and nearest distance
const runs = []; let cur = null;
for (let i = 0; i < 360; i++) { const d = hits[i]; const near = d > 0 && d < 45; if (near && (!cur || Math.abs(d - cur.dmin) < 3)) { if (!cur) { cur = { a0: i, a1: i, dmin: d }; runs.push(cur); } cur.a1 = i; cur.dmin = Math.min(cur.dmin, d); } else cur = near ? (cur = { a0: i, a1: i, dmin: d }, runs.push(cur), cur) : null; }
log('ray hits at 4 m (deg: dist):', hits.map((d, i) => (i % 10 === 0 ? i + ':' + d.toFixed(1) : null)).filter(Boolean).join(' '));
log('pillars', runs.length, runs.map((r) => { const am = (r.a0 + r.a1) / 2; return `${am.toFixed(0)}deg near face ${r.dmin.toFixed(1)} m (${r.a1 - r.a0 + 1} deg wide)`; }).join(' | '));
const r0 = runs[0];
if (r0) {
  const am = ((r0.a0 + r0.a1) / 2) * Math.PI / 180;
  for (const dd of [0.5, 1.5, 2.5, 3.5]) {
    const px = X + Math.sin(am) * (r0.dmin + dd), pz = Z + Math.cos(am) * (r0.dmin + dd);
    rc.set(new T.Vector3(px, Y + 300, pz), new T.Vector3(0, -1, 0)); rc.far = 600;
    const h = rc.intersectObjects(meshes, false)[0];
    log('down over the first pillar,', dd, 'm in from its face:', h ? (h.point.y - Y - F).toFixed(2) + ' m over the floor (' + (h.object.name || h.object.parent.name) + ')' : 'nothing');
  }
  rc.set(new T.Vector3(X, Y + 300, Z), new T.Vector3(0, -1, 0));
  const h0 = rc.intersectObjects(meshes, false)[0]; log('down over the middle:', h0 ? (h0.point.y - Y - F).toFixed(2) : 'nothing');
}
