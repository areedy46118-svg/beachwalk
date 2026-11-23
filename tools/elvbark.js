/* THE DEAD TREES' BARK (makeDeadBarkTextures): a trunk close and the swing tree whole; &em=&co= try a glow and colour (hex). Was (2026-11-22, the owner: "lighten the sand like a path up to elvedors front door"): stills from where
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
let BM = null; b.scene.traverse((o) => { if (o.isMesh && o.material && o.material.bumpMap && o.material.bumpMap.image && o.material.bumpMap.image.width === 256 && o.material.bumpMap.image.height === 512) BM = o.material; });
log('bark mat', !!BM);
const em = new URLSearchParams(location.search).get('em'); if (em && BM) { BM.emissive.setHex(parseInt(em, 16)); BM.color.setHex(parseInt(new URLSearchParams(location.search).get('co') || '6a6258', 16)); }
view(23.3, 4.4, -724.7, 24.25, 4.2, -725.9); shot(TAG + '-trunk', 900, 1.3);
view(21.0, 4.9, -721.5, 24.2, 7.0, -725.9); shot(TAG + '-tree', 900, 1.3);
