/* THE PUPPET ON THE BED (2026-11-22, the owner: "the puppet you pick up should be on the bed he keeps being on the floor"):
 * where he is put, against the floor and the mattress under him, on a plain walk up and after a checkpoint load.
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/pupbed.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
const far = (b.Q || new URLSearchParams(w.location.search)).get ? new URLSearchParams(w.location.search).get('far') : null;
if (far) { C.position.set(6, 1.7, HZ + 80); b.camBaseY = 1.7; for (let i = 0; i < 400; i++) { b.frame(1); await sleep(15); } for (let k = 0; k <= 20; k++) { C.position.set(6 + k * (HX - 12 - 6) / 20, 1.7 + k * (HY + 0.1) / 20, HZ + 80 - k * 4); b.camBaseY = C.position.y; if (k > 10) b.elvLandSet(true); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(15); } } }
C.position.set(HX - 12, HY + 1.8, HZ); b.camBaseY = C.position.y; b.elvLandSet(true);
for (let i = 0; i < 3000; i++) { b.frame(1); await sleep(15); if (b.elvPupBedS() && i > 60) break; }
const R = b.elvPupBedS(); if (!R) { log('no bed puppet'); } else {
  R.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(R), c = bb.getCenter(new T.Vector3());
  const H = b.elvHouseS(); const ms = []; H.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') ms.push(o); });
  const ray = new T.Raycaster(new T.Vector3(c.x, bb.max.y + 0.5, c.z), new T.Vector3(0, -1, 0), 0, 4);
  const hits = ray.intersectObjects(ms, false).slice(0, 4).map((h) => (h.object.name || '?') + '@' + (h.point.y - HY).toFixed(2));
  log('bed puppet: box y', (bb.min.y - HY).toFixed(2), '..', (bb.max.y - HY).toFixed(2), '| centre local', (c.x - HX).toFixed(2), (c.z - HZ).toFixed(2), '| visible', R.visible, '| under him:', hits.join(' '), '| meshes', ms.length);
  const all = []; b.scene.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy' && !(o.material && o.material.transparent)) all.push(o); });
  for (const lx of [1.0, 1.5, 2.0, 2.52, 2.87, 3.3]) { const r2 = new T.Raycaster(new T.Vector3(HX + lx, HY + 6.9, HZ - 4.13), new T.Vector3(0, -1, 0), 0, 4); log('down at x', lx, ':', r2.intersectObjects(all, false).slice(0, 3).map((h) => (h.object.name || '?') + '(' + (h.object.parent && h.object.parent.name) + ')@' + (h.point.y - HY).toFixed(2)).join(' ')); }
  const q = C.quaternion.clone(); C.position.set(c.x - 1.6, c.y + 0.5, c.z + 0.3); C.lookAt(c); C.updateMatrixWorld(true); shot('bed', 480, 2.2); C.position.set(c.x - 1.3, c.y + 0.1, c.z + 1.0); C.lookAt(c.x + 0.1, c.y - 0.15, c.z); C.updateMatrixWorld(true); shot('bed_side', 480, 3.0); C.quaternion.copy(q);
}
