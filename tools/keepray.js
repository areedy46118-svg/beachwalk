/* what is in the tavern window's view toward its top left (a grey beam in the caught view): rays from the capture point */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
const C = b.camera; C.position.set(-6000 - 2.6, 800 + 16.1 + 1.7, 6000 + 8.6 + 1.2); b.camBaseY = C.position.y; for (let i = 0; i < 6; i++) { b.frame(1); await sleep(20); }
const T = b.THREE, rc = new T.Raycaster(), O = new T.Vector3(-6000 + 5, 800 + 25, 6000);
b.scene.updateMatrixWorld(true);
for (const [dx, dy, dz] of [[0.74, 0.25, -0.63], [0.72, 0.30, -0.62], [0.78, 0.20, -0.60], [0.70, 0.22, -0.68]]) {
  const D = new T.Vector3(dx, dy, dz).normalize(); rc.set(O, D); rc.far = 20000; rc.camera = C;
  const hs = rc.intersectObjects(b.scene.children, true).filter((h) => h.object.visible).slice(0, 6);
  log('dir', dx, dy, dz, '|', hs.map((h) => (h.object.name || h.object.type) + '<' + (h.object.parent ? h.object.parent.name : '') + '> ' + h.distance.toFixed(0)).join(' ; '));
}
log('DONE');
{ let o24 = null; b.scene.traverse((o) => { if (o.name === 'Object_24' && o.parent && o.parent.name === 'bw_keep') o24 = o; });
  if (o24) { const bb = new T.Box3().setFromObject(o24); log('Object_24 box local', ['x', 'y', 'z'].map((k, i) => (bb.min[k] - [-6000, 800, 6000][i]).toFixed(1) + '..' + (bb.max[k] - [-6000, 800, 6000][i]).toFixed(1)).join(' '), '| faces', (o24.geometry.index ? o24.geometry.index.count : o24.geometry.attributes.position.count) / 3, '| mat', o24.material && o24.material.name); }
  const D = new T.Vector3(0.77, 0.45, -0.45).normalize(); rc.set(O, D); rc.camera = C; const h = rc.intersectObjects(b.scene.children, true)[0]; if (h) log('hit point local', (h.point.x + 6000).toFixed(1), (h.point.y - 800).toFixed(1), (h.point.z - 6000).toFixed(1));
}
log('DONE2');
