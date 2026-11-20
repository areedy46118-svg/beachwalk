/* SKRIM'S HOOK, ITS STRING AND ITS HEAVY (2026-11-19, "make the hook swing 4 times with lights instead of 2 like the swords"
 * / "fix the hooks regular heavy its bad it should swing higher up and be more straight horizontal"): five light clicks a
 * beat apart (how many cuts run, and each one's step), then a plain hold and release — stills of the cock and the cut;
 * the same for the katana to compare. Run: PB_PORT=4273 sh tools/probe.sh 'evalFile&f=/tools/hookcombo.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const tiles = [];
const vshot = (lab) => { adv(1); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(lab, 6, 16); tiles.push(c); };
for (const it of [b.hookItem, b.katanaItem]) {
  b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it); adv(40);
  // the string: a click every 0.18 s for 2.4 s, each new swing counted
  let swings = 0, lastD = 0, steps = [];
  for (let f = 0; f < 150; f++) {
    if (f % 11 === 0) b.attackAction();
    adv(1);
    const d = b.digT; if (d > 0 && (lastD === 0 || d < lastD - 0.2)) { swings++; steps.push(b.comboStepS ? b.comboStepS() : '?'); } lastD = d;
  }
  log(it.name, 'light string: swings', swings, 'steps', steps.join(','));
  adv(90);
  // the heavy: a plain hold 0.7 s, then let go
  b.startWind(); for (let f = 0; f < 42; f++) { adv(1); if (f === 40) vshot(it.name + ' heavy cocked'); }
  b.releaseWind(); for (let f = 0; f < 40; f++) { if ([2, 5, 8, 11, 16].includes(f)) vshot(it.name + ' heavy +' + f); else adv(1); }
  adv(60);
}
const cols = 5, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'combo', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
