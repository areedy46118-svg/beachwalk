/* BLACK BETWEEN THE SKETCH AND THE WAVES (2026-11-21, the owner: "i keep seeing the game after the sketch of beachwalk i need
 * it to be black then the waves i see the hotbar too"). The call in real time from START; from 72 s of it, every frame
 * (~16 ms) until the waves are on: what covers the screen — the call's cover (`#overlay`, hidden?), the intro's black
 * (`#intro`, its computed opacity), the waves (`#intro video`'s opacity) — and whether the game and its hotbar could be seen
 * (nothing opaque over them). Out: the first and last such frame and how long the gap was; 0 is right.
 * Run: PB_WAIT=200 PB_PORT=4266 sh tools/probe.sh 'evalFile&f=/tools/callblack.js&title=1' <out>   (`&skip=1`: Enter at 30 s) */
const Q = new URLSearchParams(location.search), SKIP = !!+(Q.get('skip') || 0);
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
st.click();
const IC = b.IC, D = w.document;
const ov = D.getElementById('overlay'), intro = D.getElementById('intro'), vid = D.getElementById('intro-video'), hb = D.getElementById('hotbar');
if (SKIP) { for (let i = 0; i < 900 && !(b.icNow() >= 30); i++) await sleep(50); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); log('skipped at', b.icNow().toFixed(2)); }
else for (let i = 0; i < 2000 && !(b.icNow() >= 72) && !IC.ended; i++) await sleep(50);
const op = (el) => +w.getComputedStyle(el).opacity;
const covered = () => {
  const ovOn = !ov.classList.contains('hidden') && w.getComputedStyle(ov).display !== 'none' && op(ov) > 0.99;
  return { ovOn, intro: op(intro), vid: op(vid), hb: w.getComputedStyle(hb).display !== 'none' && op(hb) > 0.01 };
};
const T0 = performance.now(); let gapA = null, gapB = null, worst = 1, n = 0, lastLog = -1, endedAt = null;
for (let i = 0; i < 60 * 25; i++) {
  await new Promise((r) => w.requestAnimationFrame(r));
  const t = (performance.now() - T0) / 1000, c = covered();
  if (IC.ended && endedAt === null) { endedAt = t; log('the call ended at', t.toFixed(2), 's after 72 (call t', b.icNow && b.icNow().toFixed(2), ')'); }
  const shown = !c.ovOn && c.intro < 0.99;       // neither the call's cover nor the intro's black is opaque: the world shows
  if (shown) { n++; if (gapA === null) gapA = t; gapB = t; worst = Math.min(worst, c.intro); }
  if (t - lastLog > 0.25 || (shown && n === 1)) { lastLog = t; log(' t', t.toFixed(2), '| call cover', c.ovOn ? 'ON' : 'off', '| intro black', c.intro.toFixed(2), '| waves', c.vid.toFixed(2), '| hotbar shown', c.hb, shown ? '| WORLD SHOWS' : ''); }
  if (c.vid > 0.95) { log('waves on at', t.toFixed(2)); break; }
}
log('RESULT frames with the world showing', n, gapA === null ? '' : 'from ' + gapA.toFixed(2) + ' to ' + gapB.toFixed(2) + ' s, the intro black down to ' + worst.toFixed(2));
