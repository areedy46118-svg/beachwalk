/* THE RING'S INNER LIP (2026-11-19): rays down over the first pillar's angle and between two pillars, from 16 to 27 m out —
 * where the ring's top begins and how high. Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kinglip.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 600 && !b.devTemple(); i++) { b.frame(1); await sleep(60); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
const T = b.THREE, W = b.tmpG().world, F = b.tmpFloorAt(0, 0), X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, P = b.KING_PILLARS;
W.updateMatrixWorld(true);
const meshes = []; W.traverse((o) => { if (o.isMesh && o.visible && !o.isInstancedMesh && o.geometry && o.geometry.attributes.position.count > 50 && !/ancientKing/.test(o.parent && o.parent.name)) meshes.push(o); });
const rc = new T.Raycaster();
for (const [nm, a] of [['pillar', P.a0], ['between', P.a0 + Math.PI / P.n]]) {
  const row = [];
  for (let r = 16; r <= 27; r += 0.5) {
    rc.set(new T.Vector3(X + Math.sin(a) * r, Y + 300, Z + Math.cos(a) * r), new T.Vector3(0, -1, 0)); rc.far = 600;
    const h = rc.intersectObjects(meshes, false)[0]; row.push(r + ':' + (h ? (h.point.y - Y - F).toFixed(1) : '-'));
  }
  log(nm, row.join(' '));
  // and up from the floor: the underside
  const row2 = [];
  for (let r = 16; r <= 27; r += 0.5) {
    rc.set(new T.Vector3(X + Math.sin(a) * r, Y + F + 5, Z + Math.cos(a) * r), new T.Vector3(0, 1, 0)); rc.far = 100;
    const h = rc.intersectObjects(meshes, false)[0]; row2.push(r + ':' + (h ? (h.point.y - Y - F).toFixed(1) : '-'));
  }
  log(nm, 'underside', row2.join(' '));
}
