/* THE PATH'S END AT THE PORCH STEPS (2026-11-22): from over the porch and from the yard, the path painted red (&red=1). Was (2026-11-22, the owner: "lighten the sand like a path up to elvedors front door"): stills from where
 * his screenshot stood at the gully's mouth (13.6, −702.9, looking up it), from the beach 15 m back, and in the yard looking
 * at the porch. `&tag=` names them.  PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/elvtrail.js&tag=after' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true; await sleep(2000);
const C = b.camera;
const go = async (x, z, n = 120) => { C.position.set(x, 1.75, z); b.camBaseY = 1.75; for (let i = 0; i < n; i++) { b.frame(1); await sleep(25); } };
await go(9, -690, 200); await go(13.6, -702.9, 300);
{ for (let i = 0; i < 200 && !(b.elvTrailS() && b.elvTrailS().isMesh); i++) { b.frame(1); await sleep(25); } const T = b.elvTrailS(); T.geometry.computeBoundingBox(); const bb = T.geometry.boundingBox; const P = T.geometry.attributes.position; log('trail', P.count, 'visible', T.visible, 'box', bb.min.toArray().map((v) => v.toFixed(1)).join(','), '..', bb.max.toArray().map((v) => v.toFixed(1)).join(','), '| first', P.getX(3).toFixed(1), P.getY(3).toFixed(2), P.getZ(3).toFixed(1), '| mid', P.getX(P.count >> 1).toFixed(1), P.getY(P.count >> 1).toFixed(2), P.getZ(P.count >> 1).toFixed(1)); }
w.requestAnimationFrame = () => 0; await sleep(50);
if (new URLSearchParams(location.search).get('red')) { const T = b.elvTrailS(); T.material = new b.THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: !new URLSearchParams(location.search).get('nodepth'), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); }
const view = (x, y, z, lx, ly, lz) => { C.position.set(x, y, z); b.camBaseY = y; b.lookAt(lx, ly, lz); b.updateFarProps && b.updateFarProps(); C.updateMatrixWorld(true); };
for (const D of b.elvDoorsS()) { const c = D.pivot.getWorldPosition(new b.THREE.Vector3()); log('door', D.name, 'hinge', c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2), 'centre', D.c ? [D.c.x, D.c.y, D.c.z].map((v) => (+v).toFixed(2)).join(',') : '-', 'alongX', D.alongX); }
log('HOUSE', b.HOUSE_X, b.HOUSE_Y.toFixed(2), b.HOUSE_Z);
// the ground's height in front of the house, every 0.25 m across its front (the steps show as a run of rises)
{ const r = []; for (let x = 20; x <= 30.5; x += 0.5) { const f = b.elvLandS(x, -712.6, 6)[1]; r.push(x.toFixed(1) + ':' + (f === null ? '-' : f.toFixed(2))); } log('floor along z -712.6:', r.join(' ')); }
for (let z = -718; z <= -706; z += 0.5) { const r = []; for (let x = 28.0; x <= 31.0; x += 0.25) { const f = b.elvLandS(x, z, 6)[1]; r.push(f === null ? '  -  ' : f.toFixed(2)); } log('z', z.toFixed(1), r.join(' ')); }
view(26.5, 14, -712.5, 29.5, 3.5, -713.5); shot(TAG + '-porchtop', 900, 1.3);
view(22.5, 5.6, -712.0, 30.5, 4.2, -713.0); shot(TAG + '-porch', 900, 1.3);
