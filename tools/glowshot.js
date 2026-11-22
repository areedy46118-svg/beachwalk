/* THE GLOWSTICK, LOOKED AT (2026-11-21, the owner: "make the glowstick model way better like this", with Sketchfab's "Glow
 * Stick"). On the examine screen (turned to lie across it, as the reference does), in your hand on the beach at night, and
 * its pack icon: stills. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/glowshot.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
const it = b.glowstickItem; if (!b.inventory.includes(it)) b.addToInventory(it);
const tiles = [];
const grab = (wd = 480) => { const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = wd; c.height = Math.round(wd * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); tiles.push(c); };
b.openInspect(it.inspectModel, { rotX: 0.15, rotY: 0.2, name: 'Glowstick' });
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(16); } b.frame(1); grab();
{ b.frame(1); const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 480; c.height = 270; c.getContext('2d').drawImage(src, src.width * 0.2, src.height * 0.3, src.width * 0.6, src.height * 0.4, 0, 0, 480, 270); tiles.push(c); }   // (close, the middle of it)
b.closeInspect(); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(16); }
if (b.equippedS() !== it) b.toggleEquip(it);
b.look(0.3, -0.35); for (let i = 0; i < 40; i++) { b.look(0.3, -0.35); b.frame(1); await sleep(16); } b.frame(1); grab();
{ b.frame(1); const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 480; c.height = 270; c.getContext('2d').drawImage(src, src.width * 0.55, src.height * 0.4, src.width * 0.45, src.height * 0.6, 0, 0, 480, 270 * 1); tiles.push(c); }   // (close, the hand's corner)
b.openPack(); await sleep(1500);
const im = [...w.document.querySelectorAll('#inv-grid .islot img')].find((x) => /glow/i.test(x.alt || x.title || '') ) || [...w.document.querySelectorAll('#inv-grid .islot')].map((s) => s.querySelector('img')).filter(Boolean).find((x, i, a) => true);
const slots = [...w.document.querySelectorAll('#inv-grid .islot')]; let gi = null; for (const s of slots) { const img = s.querySelector('img'); if (img && b.packSlotsS()[+s.dataset.index] === it) gi = img; }
if (gi) { await new Promise((r) => { if (gi.complete) r(); else gi.onload = r; }); const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#c8bea8'; g.fillRect(0, 0, 160, 160); g.drawImage(gi, 0, 0, 160, 160); tiles.push(c); } else log('no icon img');
const W = tiles.reduce((a, c) => a + c.width, 0), H = Math.max(...tiles.map((c) => c.height)), cv = document.createElement('canvas'); cv.width = W; cv.height = H; let x = 0; for (const c of tiles) { cv.getContext('2d').drawImage(c, x, 0); x += c.width; }
const d = cv.toDataURL('image/jpeg', 0.9).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'glow', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
