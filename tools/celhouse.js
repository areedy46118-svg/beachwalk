/* THE BACK OF ELVÉDOR'S HOUSE, for the cellar door (2026-11-21, the owner: "add this outdoor cellar door behind elvedors house
 * leading to under his house"). Loads the house, finds its back wall by rays in from the yard's far side, and stills it from
 * the yard. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/celhouse.js' <out>   (&cel=1: the door too) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, C = b.camera;
b.loadHouse(); for (let i = 0; i < 400 && !(b.houseS && b.houseS().ready); i++) { b.frame(1); await sleep(30); }
C.position.set(HX + 7, HY + 1.7, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(15); }
w.__clockOn();
const H = b.elvHouseS(); H.updateMatrixWorld(true);
const ms = []; H.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy' && o.visible) ms.push(o); });
const bb = new T.Box3(); for (const m of ms) bb.expandByObject(m);
log('house box', bb.min.toArray().map((v) => v.toFixed(2)).join(','), '..', bb.max.toArray().map((v) => v.toFixed(2)).join(','), '| HOUSE', HX, HY.toFixed(2), HZ);
const rc = new T.Raycaster();
for (const dz of [-7, -5, -3, -1, 0, 1, 3, 5, 7]) for (const h of [0.3, 1.2]) {
  rc.set(new T.Vector3(HX + 12, HY + h, HZ + dz), new T.Vector3(-1, 0, 0)); rc.far = 12;
  const hs = rc.intersectObjects(ms, false); const g = b.elvLandFloorAt ? null : null;
  log('dz', dz, 'h', h, '→', hs.slice(0, 2).map((q) => (q.object.name || '?').slice(0, 16) + '@x' + q.point.x.toFixed(2)).join(' '));
}
const fl = (x, z) => { try { return b.elvLandS(x, z, HY + 3)[1]; } catch (e) { return 'err'; } };
for (const dx of [5.5, 6.0, 6.5, 7.5, 8.5]) log('ground behind at dx', dx, [-4, -2, 0, 2, 4].map((dz) => { const f = fl(HX + dx, HZ + dz); return f == null ? 'none' : typeof f === 'number' ? f.toFixed(2) : f; }).join(' '));
const view = (nm, px, py, pz, lx, ly, lz, fov = 60) => { C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(lx, ly, lz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 640, 1.6); };
view('back_far', HX + 9.5, HY + 1.8, HZ - 5, HX + 5, HY + 1.2, HZ, 65);
view('back_up', HX + 11, HY + 9, HZ, HX + 5, HY + 0.5, HZ, 60);
view('back_side', HX + 9, HY + 1.8, HZ + 6, HX + 5, HY + 1.0, HZ, 65);
