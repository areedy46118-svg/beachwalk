/* WHERE THINGS STAND ON THE CALL'S DESK (2026-11-19): the phone, the book, the syringe, the photo, the table and the
 * wall behind them, in room metres. Run: PB_PORT=4251 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/callgeo.js' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready && b.IC.props); i++) await sleep(100);
const T = b.TB, IC = b.IC, V = b.TB3.Vector3, f = (v) => v ? [v.x, v.y, v.z].map((n) => n.toFixed(3)).join(',') : '-';
log('desk top', T.desk.top.toFixed(3), 'deskBox', T.deskBox && f(new b.TB3.Box3().setFromObject(T.deskBox).min), f(new b.TB3.Box3().setFromObject(T.deskBox).max));
log('phone at', f(IC.phoneAt), 'scale', f(T.phone.scale), 'syringe', f(T.syrPose.position));
// the wall: rays from the phone's centre and its far end out along +z, +x, -x
const rc = new b.TB3.Raycaster(); const room = T.sc;
for (const d of [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, -1]]) {
  for (const h of [0.01, 0.05]) { const o = IC.phoneAt.clone(); o.y += h; rc.set(o, new V(...d)); const hit = rc.intersectObject(room, true).filter((x) => x.object.visible && x.object !== T.phone && !T.phone.children.includes(x.object))[0];
    log('from the phone +' + h, 'dir', d.join(','), hit ? hit.distance.toFixed(3) + ' ' + (hit.object.material && hit.object.material.name) : 'none'); }
}
const pb = new b.TB3.Box3().setFromObject(T.phone); log('phone box', f(pb.min), f(pb.max));
