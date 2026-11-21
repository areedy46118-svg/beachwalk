/* WHERE THE DESK VIEW LOOKS (2026-11-20): the call's desk camera, its screen's corners and a grid laid onto the table top
 * (room metres), and where the book is lying. Run: PB_PORT=4261 sh tools/probe.sh 'evalFile&f=/tools/deskmap.js&title=1' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
for (let i = 0; i < 300 && !b.IC.meta; i++) await sleep(100);
const T = b.TB3, IC = b.IC, TB = b.TB; const cam = IC.deskCam || null;
log('desk top', TB.desk.top.toFixed(3), 'deskCam', !!cam);
if (cam) {
  cam.updateMatrixWorld(true);
  const rc = new T.Raycaster(), pl = new T.Plane(new T.Vector3(0, 1, 0), -TB.desk.top), hit = new T.Vector3();
  const at = (nx, ny) => { rc.setFromCamera(new T.Vector2(nx, ny), cam); return rc.ray.intersectPlane(pl, hit) ? hit.x.toFixed(2) + ',' + hit.z.toFixed(2) : 'sky'; };
  const rows = [];
  for (const ny of [0.95, 0.6, 0.3, 0, -0.3, -0.6, -0.95]) rows.push('ny ' + ny + ': ' + [-0.95, -0.6, -0.3, 0, 0.3, 0.6, 0.95].map((nx) => at(nx, ny)).join('  '));
  for (const r of rows) log(r);
  if (TB.clutter) { const v = new T.Vector3(); const out = []; TB.clutter.children.forEach((m) => { m.getWorldPosition(v); const p = v.clone().project(cam); out.push(v.x.toFixed(2) + ',' + v.z.toFixed(2) + '->' + p.x.toFixed(2) + ',' + p.y.toFixed(2)); }); log('clutter on screen', out.join(' | ')); }
  log('phone at', TB.phone.position.x.toFixed(2), TB.phone.position.z.toFixed(2), 'syringe', TB.syr.position.x.toFixed(2), TB.syr.position.z.toFixed(2));
}
