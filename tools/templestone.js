/* THE DESERT TEMPLES' NEW STONE (2026-11-21, `tmpStoneMat`): the dev teleport to the temple (the king not yet come — you are kept
 * outside his trigger), stills from far, near, at a pillar's foot, up a pillar, and of a far colonnade, at the room's own light.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/templestone.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0), P = b.KING_PILLARS;
for (let i = 0; i < 90; i++) adv(1);
const tiles = [];
const at = (lab, x, y, z, lx, ly, lz, fov = 70) => { C.position.set(X + x, Y + y, Z + z); C.fov = fov; C.updateProjectionMatrix(); for (let i = 0; i < 3; i++) adv(1); C.position.set(X + x, Y + y, Z + z); b.lookAt(X + lx, Y + ly, Z + lz); b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
const a = P.a0, sx = Math.sin(a), sz = Math.cos(a), R = P.face;
at('from the sand, 45 m', -45, F + 1.7, 6, 0, F + 12, 0);
at('the colonnade, 26 m', sx * (R + 3) - 3, F + 1.7, sz * (R + 3) + 3, 0, F + 8, 0);
at('a pillar from 4 m', sx * (R + 4), F + 1.7, sz * (R + 4), sx * R, F + 2.2, sz * R, 60);
at('a pillar from 1.6 m', sx * (R + 1.6) + 0.4, F + 1.7, sz * (R + 1.6), sx * R, F + 1.8, sz * R, 60);
at('up a pillar', sx * (R + 2.5), F + 1.4, sz * (R + 2.5), sx * R, F + 30, sz * R, 75);
at('the podium step', -16, F + 1.6, -2, -12.5, F + 0.2, 0, 60);
at('a far colonnade', -45, F + 1.7, 6, -200, F + 10, -260, 40);
at('the ring from the floor', -8, F + 1.6, 0, 0, F + 40, 0, 80);
const cols = 2, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'stone', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('mode', b.kingS().mode);
