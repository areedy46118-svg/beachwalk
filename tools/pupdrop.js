/* THE PUPPET PUT DOWN AGAINST A WALL (2026-11-22): inside Elvédor's house, a drop point a hand from a wall, laid across it —
 * does his head or his feet cross the wall from his middle, is he above the floor. Run: PB_PORT=4223 PB_WAIT=400 sh
 * tools/probe.sh 'evalFile&f=/tools/pupdrop.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX, HY + 1.8, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); if (b.houseWallsS() && b.pupDropS().pup && i > 60) break; }
log('walls', b.houseWallsS(), '| puppet', b.pupDropS().pup);
const fy = b.groundUnderS(HX, HZ, HY + 0.6);
for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  // the first wall out from the middle of the room
  let r = 0.2; while (r < 6 && !b.pupDropWallS(HX, HZ, HX + dx * r, HZ + dz * r, fy + 0.12)) r += 0.05;
  const x = HX + dx * (r - 0.12), z = HZ + dz * (r - 0.12);
  const yaw = Math.atan2(dx, dz) + Math.PI / 2;                       // (laid along the wall's normal: his head into it)
  for (const yw of [yaw - Math.PI / 2, yaw]) log('wall at', r.toFixed(2), 'm', dx, dz, '| laid', JSON.stringify(b.pupLayTestS(x, fy, z, yw)));
}
