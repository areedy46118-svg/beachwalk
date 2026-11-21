/* THE TEMPLE'S CARVED FLOOR, ALONE (2026-11-21, the owner: "THERE WAS AN OLD CENTER PEICE IN THE MODEL … JUST THE GROUND"): from
 * 16 m straight over the middle, the scene as it is, then each of the floor's own meshes drawn alone (`&only=` names). Logs each
 * mesh's room-frame height range. Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/templefloor.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0), T = b.THREE;
b.KING.mode = 'gone'; for (let i = 0; i < 30; i++) adv(1);
const W = b.scene.getObjectByName('temple'), inv = W.matrixWorld.clone().invert(), meshes = [];
W.traverse((o) => { if (o.isMesh) meshes.push(o); });
for (const o of meshes) if (/Object_(6|7|8|9|10|31|14|21)$/.test(o.name)) { const bb = new T.Box3().setFromObject(o).applyMatrix4(inv); log(o.name, 'y', bb.min.y.toFixed(2), '..', bb.max.y.toFixed(2), 'r', ((bb.max.x - bb.min.x) / 2).toFixed(1), 'vis', o.visible, 'side', o.material.side, 'map', !!o.material.map); }
const tiles = [];
const shotTop = (lab) => { C.position.set(X, Y + F + 16, Z + 0.01); C.up.set(0, 0, -1); C.fov = 80; C.updateProjectionMatrix(); C.lookAt(X, Y + F, Z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); C.up.set(0, 1, 0); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 420; c.height = Math.round(420 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.8)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
shotTop('as it is (x1.8)');
const sand = b.scene.getObjectByName('desertSand'); if (sand) { sand.visible = false; shotTop('no sand (x1.8)'); sand.visible = true; }
for (const nm of ['Object_6', 'Object_7', 'Object_9', 'Object_10', 'Object_31']) {
  const keep = meshes.map((o) => o.visible); meshes.forEach((o) => { o.visible = o.name === nm; }); if (sand) sand.visible = false;
  shotTop(nm + ' alone (x1.8)'); meshes.forEach((o, i) => { o.visible = keep[i]; }); if (sand) sand.visible = true;
}
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'floor', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
