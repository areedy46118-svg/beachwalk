/* where the keep's +X face is at the tavern window's height (rays from +X), and stills from out there */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
const T = b.THREE, rc = new T.Raycaster(), KX = -6000, KY = 800, KZ = 6000;
b.scene.updateMatrixWorld(true);
const tgt = b.scene.children.filter((o) => o.visible);
for (const y of [14, 18, 21, 24]) { const row = [];
  for (let z = -14; z <= 14; z += 4) { rc.set(new T.Vector3(KX + 80, KY + y, KZ + z), new T.Vector3(-1, 0, 0)); rc.far = 120; const h = rc.intersectObjects(tgt, true).find((h) => h.object.isMesh && h.object.visible && !h.object.isSkinnedMesh);
    row.push(z + ':' + (h ? (h.point.x - KX).toFixed(1) : '-')); }
  log('y', y, row.join(' ')); }
log('DONE');
