/* THE TEMPLE'S MIDDLE, FROM ABOVE AND FROM YOUR EYE (2026-11-21, the owner: "add the old center part of the temple fight in the
 * temple but have the new texture"): the dev teleport, the king kept from coming (`KING.mode` held at 'gone' for the stills),
 * the floor's middle from 14 m straight over it, from 30 m at an angle, and from your eye at the podium's edge.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/templecentre.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
b.KING.mode = 'gone';
for (let i = 0; i < 60; i++) adv(1);
const tiles = [];
const at = (lab, x, y, z, lx, ly, lz, fov = 60) => { b.KING.mode = 'gone'; C.position.set(X + x, Y + y, Z + z); C.fov = fov; C.updateProjectionMatrix(); for (let i = 0; i < 3; i++) { b.KING.mode = 'gone'; adv(1); } C.position.set(X + x, Y + y, Z + z); C.up.set(0, 1, 0); if (Math.abs(x - lx) + Math.abs(z - lz) < 0.01) { C.up.set(0, 0, -1); } C.lookAt(X + lx, Y + ly, Z + lz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); C.up.set(0, 1, 0); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 560; c.height = Math.round(560 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
at('from 14 m over the middle', 0, F + 14, 0.01, 0, F, 0, 70);
at('from 30 m, at an angle', -18, F + 22, 0, 0, F, 0, 55);
at('your eye at the podium edge', -11, F + 1.7, 2, 0, F + 0.3, 0, 75);
at('close: the middle', -4, F + 1.7, 0, 0, F, 0, 70);
const cols = 2, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'centre', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('done');
