/* THE HOOK'S HEAVY, POSES TRIED (2026-11-19): a plain hold released, the arm's pose read at the middle of the cut, then held
 * there (`window.__bwPose`) with its lift and pitch varied, a still of each. Run: PB_PORT=4273 sh tools/probe.sh 'evalFile&f=/tools/hookheavy.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const tiles = [];
const vshot = (lab) => { adv(1); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(lab, 6, 16); tiles.push(c); };
const at = (+new URLSearchParams(location.search).get('at')) || 6;
b.startWind(); adv(42); b.releaseWind(); adv(at);
const P = b.poseS(); log('pose at +' + at, P.map((v) => v.toFixed(3)).join(' '));
for (const [dl, dp, dy, ds] of [[0, 0, 0, 0], [0.25, 0, 0, 0], [0.25, -0.4, 0, 0], [0.35, -0.7, 0, 0], [0.25, -0.4, 0.3, 0], [0.35, -0.7, -0.3, 0], [0.4, -0.9, 0, -0.2], [0.3, -0.5, 0, 0.2]]) {
  const Q = P.slice(); Q[1] += dl; Q[0] += dp; Q[2] += dy; Q[5] += ds; w.__bwPose = Q; adv(2); vshot(`lift+${dl} pitch${dp} yaw${dy} side${ds}`);
}
w.__bwPose = null;
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'heavy', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
