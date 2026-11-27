/* THE BRAZIER, CLOSE (2026-11-26, "MAKE THESE BRAZZIERS LOOK WAY BETTER"), and the market stall turned round: stills with the fire
 * running (the game's own frames, not a frozen draw), from two heights.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/bzlook.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 600 && !(b.fortBraziersS() && b.fortBraziersS().length); i++) { b.frame(1); await sleep(20); }
log('braziers', b.fortBraziersS().length);
w.__clockOn(); b.settings.devMode = true;
const C = b.camera, BZ = b.fortBraziersS(), B = BZ[0];
const p = new b.THREE.Vector3(b.FORT_SITE.X + B.x, b.FORT_SITE.Y + B.g.position.y, b.FORT_SITE.Z + B.z);
for (const [nm, dx, dy, dz, ty] of [['bz_eye', 1.5, 1.7, 0.9, 1.1], ['bz_close', 0.9, 1.45, 0.5, 1.15], ['bz_low', 1.4, 0.7, 0.6, 0.9]]) {
  for (let i = 0; i < 40; i++) { C.position.set(p.x + dx, p.y + dy, p.z + dz); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + ty, p.z); w.__adv(1); }
  shot(nm, 560, 1.0);
}
const P = b.CP.sites.fort.props.find((q) => q.kind.name === 'mpStall');
if (P) { const a = P.yaw; for (let i = 0; i < 30; i++) { C.position.set(P.x + Math.sin(a) * 4.5, P.fy + 1.7, P.z + Math.cos(a) * 4.5); b.camBaseY = C.position.y; b.lookAt(P.x, P.fy + 1.0, P.z); w.__adv(1); } shot('stall_front', 560, 1.0);
  for (let i = 0; i < 30; i++) { C.position.set(P.x - Math.sin(a) * 4.5, P.fy + 1.7, P.z - Math.cos(a) * 4.5); b.camBaseY = C.position.y; b.lookAt(P.x, P.fy + 1.0, P.z); w.__adv(1); } shot('stall_back', 560, 1.0); }
log('DONE');
