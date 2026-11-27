/* THE KEEP'S GROUND ROUND IT (2026-11-26): rays straight down (from y 45, skipping its sky dome) on lines out from the building on
 * each side — the height of what is there, keep-local — to place the tavern's window on its outside and know the drop under it. */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
const T = b.THREE, rc = new T.Raycaster(), KX = -6000, KY = 800, KZ = 6000;
b.scene.updateMatrixWorld(true);
let kw = null; b.scene.traverse((o) => { if (o.name === 'bw_keep') kw = o; });
const meshes = []; (kw || b.scene).traverse((o) => { if (o.isMesh && o.visible && o.name !== 'Object_24' && !o.isSkinnedMesh) meshes.push(o); });
log('keep meshes', meshes.length, '| names', meshes.slice(0, 40).map((m) => m.name + ':' + ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 | 0)).join(' '));
log('bw_keep parent', kw && kw.parent && kw.parent.name, '| pos', kw && [kw.position.x, kw.position.y, kw.position.z].join(','), '| rot', kw && kw.rotation.y, '| scale', kw && kw.scale.x);
const top = (x, z, from = 45) => { rc.set(new T.Vector3(KX + x, KY + from, KZ + z), new T.Vector3(0, -1, 0)); rc.far = 80; const h = rc.intersectObjects(meshes, false)[0]; return h ? (h.point.y - KY).toFixed(0) : '-'; };
for (const [nm, ax, az] of [['+X', 1, 0], ['-X', -1, 0], ['-Z', 0, -1], ['+Z', 0, 1]]) for (const off of [-6, 0, 6]) {
  const row = []; for (let d = 0; d <= 40; d += 2.5) { const x = -2.6 * 0 + ax * d + (az ? off : 0), z = az * d + (ax ? off : 0); row.push(top(x, z)); }
  log(nm, 'off', off, '| every 2.5 m out from the middle:', row.join(' ')); }
log('DONE');
// the -X face: rays from x -40 toward +X at heights over the hall's floor (16.1), for z -6..4
for (const y of [15, 16.5, 18, 20]) { const row = []; for (let z = -6; z <= 4; z += 1) { rc.set(new T.Vector3(KX - 40, KY + y, KZ + z), new T.Vector3(1, 0, 0)); rc.far = 60; const h = rc.intersectObjects(meshes, false)[0]; row.push(z + ':' + (h ? (h.point.x - KX).toFixed(1) : '-')); } log('-X face at y', y, row.join(' ')); }
for (const z of [-3, -0.8, 1]) { const row = []; for (let x = -8; x >= -26; x -= 1.5) row.push(top(x, z, 17)); log('ground under, z', z, 'x -8 … -26 by 1.5:', row.join(' ')); }
log('KEEP_SITE walls', !!(b.KEEP_SITES && b.KEEP_SITES().walls));
log('DONE3');
