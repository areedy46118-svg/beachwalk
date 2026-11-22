/* THE KING'S SAND, ON ITS OWN (2026-11-21: `kingDust`): in the temple with the fight's air on (the black and white), you 7 m off
 * the middle; a blow of each size `&k=` (comma list, default 0.16,0.6,1.3) thrown on the floor in front of you, stills at 0.1,
 * 0.35, 0.8, 1.6 s after each. Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/kingdust.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), KS = (Q.get('k') || '0.16,0.6,1.3').split(',').map(Number);
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
C.position.set(X - 12, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) adv(1);
for (let i = 0; i < 30; i++) adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); adv(60);
b.KING.u.g.visible = false; const um = b.KING.u; um.st.puppet = true; b.KING.mode = 'gone';
C.position.set(X - 5, Y + F + 1.7, Z); b.lookAt(X, Y + F + 0.8, Z); adv(2); const camAt = C.position.clone();
const tiles = [];
const grab = (lab) => { b.lookAt(X, Y + F + 0.8, Z); b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
for (const k of KS) {
  C.position.copy(camAt); b.kingDust(X, Y + F, Z, k);
  let tt = 0; for (const at of [0.1, 0.35, 0.8, 1.6]) { while (tt < at) { adv(1); C.position.copy(camAt); tt += 1 / 60; } grab('k ' + k + ' +' + at); }
  adv(240);
}
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'dust', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('filter', b.renderer.domElement.style.filter, 'fog', b.scene.fog && b.scene.fog.density);
