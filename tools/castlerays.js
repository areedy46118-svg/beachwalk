/* THE MOON'S SHAFTS AT THE CASTLE'S GATE (2026-11-26, the owner: "light rays should not go through walls i see this mainly at the castle
 * entrance"). Outside the gate and just inside it, looking along the moon's line (and a little either side): stills of the finished
 * frame, the post pass and its shafts included. `&k=` the floor the dark pixels keep (the shader's 0.16), for a before-and-after.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/castlerays.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = true;
const C = b.camera, G = b.FORT_GATE || { x: -8.85 * 1.0, z: 34.15, xi: -8.61, zi: 26 }, SI = b.FORT_SITE || { X: 0, Z: 0 }, FX = SI.X, FZ = SI.Z, M = b.MOON_DIR || new b.THREE.Vector3(-0.28, 0.12, -1).normalize();
log('have', !!b.FORT_GATE, !!b.FORT_SITE, !!b.MOON_DIR, 'gate', G.x, G.z, 'site', FX, FZ);
const spots = [['outside', G.x, G.z + 4], ['gate', G.x, G.z + 0.6], ['inside', G.xi, G.zi - 3]];
for (const [nm, lx, lz] of spots) for (const yaw of [-0.35, 0, 0.35]) {
  const x = FX + lx, z = FZ + lz, y = (b.groundUnderS ? b.groundUnderS(x, z, 50) : 0) + 1.7;
  const dx = M.x * Math.cos(yaw) - M.z * Math.sin(yaw), dz = M.x * Math.sin(yaw) + M.z * Math.cos(yaw);
  for (let i = 0; i < 20; i++) { C.position.set(x, y, z); b.camBaseY = y; b.lookAt(x + dx * 20, y + 3, z + dz * 20); w.__adv(1); }
  shot(nm + '_' + yaw, 480, 1.0);
}
log('DONE');
