/* HITCHES THROUGH THE OPENING (2026-11-21, the perf pass): START pressed on the real clock, the call played out, the black and
 * the waves; every frame over 25 ms logged with the call's own time and what was compiled or uploaded in it.
 * Run: PB_PORT=4266 PB_WAIT=240 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/callhitch.js' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
const R = b.renderer, progs = () => (R.info.programs ? R.info.programs.length : 0);
let last = performance.now(), p0 = progs(), t0 = R.info.memory.textures, n = 0; const over = [];
const CHECK = !!+(new URLSearchParams(location.search).get('check') || 0); if (CHECK) b.IC.scanCheck = true;   // (&check=1: the sleeve's edge reads both ways, compared)
st.click();
const vid = w.document.getElementById('intro-video');
const end = performance.now() + 100000; let wavesAt = 0;
while (performance.now() < end) {
  await new Promise((r) => w.requestAnimationFrame(r));
  const now = performance.now(), dt = now - last; last = now; n++;
  const p = progs(), tx = R.info.memory.textures;
  if (dt > 25) over.push(`${b.IC.ended ? 'after the call' : 'call ' + b.icNow().toFixed(2)} ${dt.toFixed(0)}ms +prog ${p - p0} +tex ${tx - t0}`);
  p0 = p; t0 = tx;
  if (!wavesAt && vid.classList.contains('on')) wavesAt = now;
  if (wavesAt && now - wavesAt > 8000) break;
}
if (CHECK) log('sleeve scan: lines read', b.IC.scanDiff && b.IC.scanDiff.n, 'differing', b.IC.scanDiff && b.IC.scanDiff.diff, 'in position', b.IC.scanDiff && b.IC.scanDiff.pos, 'largest colour gap (of 255)', b.IC.scanDiff && b.IC.scanDiff.col.toFixed(3), (b.IC.scanDiff && b.IC.scanDiff.ex || []).join(' | '));
log('frames', n, '| over 25 ms:', over.length, '| over 50:', over.filter((o) => +o.split(' ').find((x) => /ms$/.test(x)).slice(0, -2) > 50).length);
const bySec = {}; for (const o of over) { const k = o.startsWith('call') ? 'call ' + Math.floor(+o.split(' ')[1]) : 'after'; bySec[k] = (bySec[k] || 0) + 1; }
log('by second of the call:', JSON.stringify(bySec)); log('worst', over.map((o) => +o.split(' ').find((x) => /ms$/.test(x)).slice(0, -2)).sort((a, c) => c - a).slice(0, 8).join(' '));
