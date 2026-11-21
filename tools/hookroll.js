/* THE HOOK'S POINT WHILE IT IS WOUND (2026-11-19, the owner: "have the bloody tip face down when charged", then "the hook tip
 * should face left when charged"): Shift held a second into the throw's charge, then the hook rolled about its own length
 * (`hookModel.rotation.y`) to each of a set of angles; where its point is on the screen against the top of its curl and the
 * fist (NDC). Run: PB_PORT=4261 sh tools/probe.sh 'evalFile&f=/tools/hookroll.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn();
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); w.__adv(40);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift' })); b.startWind(); w.__adv(60);
const T = b.THREE, vmc = b.vmCamera, m = b.hookModel.children[0].children[0].children[0];
const ndc = (o, v) => o.localToWorld(v).project(vmc), f = (v) => v.x.toFixed(2) + ',' + v.y.toFixed(2);
const rows = [];
for (const r of [-0.4, -0.2, 0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4]) {
  b.hookModel.rotation.y = r; b.hookVM.updateMatrixWorld(true);
  const pt = ndc(m, new T.Vector3(-0.082, 0.032, 0.253)), top = ndc(m, new T.Vector3(-0.08, 0.085, 0.36)), shaft = ndc(m, new T.Vector3(-0.03, 0.03, 0.2)), fist = ndc(b.hookVM, new T.Vector3());
  const back = ndc(m, new T.Vector3(-0.128, 0.033, 0.342)), ax = pt.x - back.x, ay = pt.y - back.y, al = Math.hypot(ax, ay) || 1;
  rows.push(`roll ${r.toFixed(2)}  aims on screen ${(ax / al).toFixed(2)},${(ay / al).toFixed(2)}  point ${f(pt)}  curl top ${f(top)}  shaft top ${f(shaft)}  fist ${f(fist)}  point left of shaft by ${(shaft.x - pt.x).toFixed(3)}`);
}
log(rows.join('\n'));
// stills of the wound hook at a few rolls (the frame's own lerp toward the held roll is undone first: k 0.2 at 1/60 s)
const tiles = [];
for (const r of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
  b.HK.roll = (r - 0.2 * Math.PI) / 0.8; w.__adv(1);
  const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * src.height / src.width);
  const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none';
  g.fillStyle = '#fff'; g.font = '14px monospace'; g.fillText('roll ' + r.toFixed(2) + ' (' + b.hookModel.rotation.y.toFixed(2) + ')', 6, 18); tiles.push(c);
}
const cv = w.document.createElement('canvas'); cv.width = 4 * 480; cv.height = tiles[0].height; const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, i * 480, 0));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'roll', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
