/* what is under the trail's line, drawn (2026-11-22): at points along it, every mesh a ray down meets (name, y) vs the walk's floor */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true; await sleep(1500);
const C = b.camera; for (const z of [-690, -702.9]) { C.position.set(12, 1.75, z); b.camBaseY = 1.75; for (let i = 0; i < 200; i++) { b.frame(1); await sleep(20); } }
const T = b.THREE, rc = new T.Raycaster(); rc.camera = C;
const pts = [[8, -701.7], [11, -702.3], [14.2, -703.4], [16.5, -704.9], [19.6, -707.2], [22.8, -709.3], [25.5, -710.9], [28, -712.2]];
b.scene.updateMatrixWorld(true);
for (const [x, z] of pts) {
  rc.set(new T.Vector3(x, 30, z), new T.Vector3(0, -1, 0)); rc.far = 60;
  const hs = rc.intersectObjects(b.scene.children, true).filter((h) => h.object.isMesh && h.object.visible !== false).slice(0, 6);
  const f = b.groundUnder(x, z, 5);
  log(x, z, '| walk floor', f.toFixed(2), '|', hs.map((h) => (h.object.name || h.object.parent && h.object.parent.name || h.object.type).slice(0, 14) + ' ' + h.point.y.toFixed(2)).join(', '));
}
