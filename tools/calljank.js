/* THE CALL IN REAL TIME, FRAME BY FRAME (2026-11-19, "its laggy as shit"). Not part of the game. Run headless:
 *   PB_PORT=4283 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/calljank.js' <out>
 * Every animation frame of the page from START to the call's end: the gap from the last (a held frame) and the time
 * spent in its callbacks, with where in the recording it was and what the boot behind the cover was doing. */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
const R0 = w.requestAnimationFrame.bind(w), long = [], gaps = []; let last = 0, n = 0, work = 0;
w.requestAnimationFrame = (cb) => R0((ts) => { const a = performance.now(); try { cb(ts); } finally { const d = performance.now() - a; work += d; if (d > 30) long.push([b.icNow ? +b.icNow().toFixed(1) : -1, Math.round(d)]); } });
const tick = (ts) => { if (last) { const g = ts - last; n++; if (g > 50) gaps.push([b.icNow ? +b.icNow().toFixed(1) : -1, Math.round(g)]); } last = ts; R0(tick); };
R0(tick);
st.click();
const t0 = performance.now();
while (performance.now() - t0 < 80000 && !(b.IC.ended)) await sleep(250);
log('frames', n, 'over', ((performance.now() - t0) / 1000).toFixed(0), 's | held over 50 ms', gaps.length, '| over 100 ms', gaps.filter((g) => g[1] > 100).length);
log('held (call t: ms)', gaps.slice(0, 40).map((g) => g[0] + ':' + g[1]).join(' '));
log('long callbacks over 30 ms (call t: ms)', long.slice(0, 40).map((g) => g[0] + ':' + g[1]).join(' '));
log('boot left at the end', JSON.stringify(b.bootLeft()).slice(0, 200));
