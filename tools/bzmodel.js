/* THE OWNER'S BRAZIER MODEL (2026-11-26, "use this for the braziers make sure they dont spawn clipped in anything and make them on fire.
 * give them a break sound too"): did the model load and dress every brazier, where did the settle leave each (kept / moved / STUCK),
 * what is near each (the nearest prop, wall, door, other brazier), stills with the fire running, and one knocked over (its sounds).
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/bzmodel.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 600 && !b.bzLogS().model; i++) { b.frame(1); await sleep(20); }
log('STATE', JSON.stringify(b.bzLogS()));
const BZ = b.fortBraziersS(), G = b.fortGeoS(), X = G.X, Z = G.Z, f2 = (v) => v.toFixed(2), site = b.CP.sites.fort;
BZ.forEach((B, i) => {
  const near = site.props.filter((P) => !P.on).map((P) => [Math.hypot(P.x - X - B.x, P.z - Z - B.z) - P.kind.r, P.kind.name]).sort((a, c) => a[0] - c[0])[0];
  const door = Math.min(...b.fortDbg.farmDoors.map((D) => Math.hypot(D.cx - B.x, D.cz - B.z)));
  const other = Math.min(...BZ.filter((q) => q !== B).map((q) => Math.hypot(q.x - B.x, q.z - B.z)));
  let wall = 9; for (const r of [0.3, 0.45, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0]) if (b.keepWallNearS ? b.keepWallNearS(X + B.x, Z + B.z, r, b.FORT_SITE.Y + B.g.position.y + 0.1, b.FORT_SITE.Y + B.g.position.y + 2.2) : 0) { wall = r; break; }
  log('BZ', i, 'at', f2(B.x), f2(B.z), '| model', !!B.model, 'fireY', B.fireY, '| ok now', b.bzSpotOkS(B.x, B.z, i), '| nearest prop edge', near ? f2(near[0]) + ' ' + near[1] : '-', '| door', f2(door), '| other bz', f2(other), '| wall within', wall);
});
w.__clockOn(); b.settings.devMode = true;
const C = b.camera;
for (const i of [0, 1]) {
  const B = BZ[i], p = new b.THREE.Vector3(X + B.x, b.FORT_SITE.Y + B.g.position.y, Z + B.z);
  for (const [nm, dx, dy, dz, ty] of [['eye', 2.2, 1.7, 1.2, 1.2], ['close', 1.1, 1.6, 0.6, 1.3]]) {
    for (let k = 0; k < 40; k++) { C.position.set(p.x + dx, p.y + dy, p.z + dz); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + ty, p.z); w.__adv(1); }
    shot('bz' + i + '_' + nm, 560, 1.0);
  }
}
// over: the first, pushed away from the camera, its sounds logged
{ const B = BZ[0], p = new b.THREE.Vector3(X + B.x, b.FORT_SITE.Y + B.g.position.y, Z + B.z);
  const n0 = (b.sampleLogS ? b.sampleLogS() : []).length;
  C.position.set(p.x + 2.4, p.y + 1.7, p.z + 1.3); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 0.8, p.z);
  b.brazierToppleS ? b.brazierToppleS(B, -1, -0.5, 1) : log('no topple export');
  for (let k = 0; k < 60; k++) { C.position.set(p.x + 2.4, p.y + 1.7, p.z + 1.3); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 0.6, p.z); w.__adv(1); if (k === 12 || k === 59) shot('over_' + k, 560, 1.0); }
  log('OVER up', B.up, 'logs glow', B.logMat && f2(B.logMat.emissiveIntensity));
}
log('DONE');
