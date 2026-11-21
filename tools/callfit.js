/* THE CALL ON EVERY SCREEN (2026-11-21, the owner, a 3:2 window: "the syringe on a smaller screen is cut off i need the cutscene to
 * look the same on all screens but still be full screen the objects shouldnt be changing size either"). The game's frame set
 * to each shape in turn (16:9, 3:2, 4:3, 21:9 at one width), START, and the picture as the screen shows it ~12 s in (at the
 * desk), each scaled to one width so sizes compare. Run: PB_PORT=4251 PB_Q='&title=1' PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/callfit.js' <out> */
const f = w.frameElement, Q = new URLSearchParams(location.search), AT = +(Q.get('at') || 12);
const sizes = [[1280, 720, '16:9'], [1280, 853, '3:2'], [1280, 960, '4:3'], [1280, 549, '21:9']];
const tiles = [];
for (const [W, H, lab] of sizes) {
  f.style.width = W + 'px'; f.style.height = H + 'px';
  w.location.reload(); await sleep(1500);
  const w2 = f.contentWindow; for (let i = 0; i < 300 && !(w2.__bw && w2.__bw.TB && w2.__bw.TB.ready); i++) await sleep(100);
  const b2 = w2.__bw; for (let i = 0; i < 300 && !(b2.state && b2.state().started) && !b2.IC.on; i++) { try { b2.beginGame(); } catch (e) {} await sleep(200); }
  await sleep(AT * 1000);
  const el = b2.TB.el, cv = b2.TB.r.domElement, r = el.getBoundingClientRect();
  // what the screen shows: the part of the view inside the window
  const sx = Math.max(0, -r.left) / r.width * cv.width, sy = Math.max(0, -r.top) / r.height * cv.height, sw = Math.min(W, r.right) - Math.max(0, r.left), sh = Math.min(H, r.bottom) - Math.max(0, r.top);
  const c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * H / W);
  const g = c.getContext('2d'); g.fillStyle = '#300'; g.fillRect(0, 0, c.width, c.height);
  b2.TB.r.render(b2.TB.postSc || b2.TB.sc, b2.TB.postCam || b2.TB.cam);
  g.drawImage(cv, sx, sy, sw / r.width * cv.width, sh / r.height * cv.height, Math.max(0, r.left) / W * c.width, Math.max(0, r.top) / H * c.height, sw / W * c.width, sh / H * c.height);
  g.fillStyle = '#ff0'; g.font = '14px monospace'; g.fillText(lab + ' ' + W + 'x' + H + '  view ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' at ' + Math.round(r.left) + ',' + Math.round(r.top), 6, 16);
  const cs = w2.getComputedStyle(el), ov = el.parentElement.getBoundingClientRect(); log('  style.top', el.style.top, 'computed top', cs.top, 'transform', cs.transform, 'parent', el.parentElement.id, Math.round(ov.top), Math.round(ov.height), 'scrollTop', el.parentElement.scrollTop);
  tiles.push(c); log(lab, 'view', Math.round(r.width), 'x', Math.round(r.height), 'at', Math.round(r.left), Math.round(r.top), 'IC on', b2.IC.on, 'boxK', b2.TB.boxK);
}
const cv = document.createElement('canvas'); cv.width = 1280; cv.height = tiles.reduce((a, t, i) => (i % 2 ? a : a + Math.max(t.height, (tiles[i + 1] || t).height)), 0);
const g = cv.getContext('2d'); let y = 0; for (let i = 0; i < tiles.length; i += 2) { g.drawImage(tiles[i], 0, y); if (tiles[i + 1]) g.drawImage(tiles[i + 1], 640, y); y += Math.max(tiles[i].height, (tiles[i + 1] || tiles[i]).height); }
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'callfit', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
