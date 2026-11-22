/* DOES THE IMAGE SWAP STUTTER (2026-11-22): real rAF frame times through the first 100 s of a game, in 10 s windows, with
 * how many swaps were done in each — p95, max and frames over 50 ms.  PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/relfps.js' <out> */
const OFF = new URLSearchParams(location.search).get('off'); if (OFF) b.imgRelOn(false);
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
const d = []; let last = 0, run = true; const raf = w.requestAnimationFrame.bind(w); const tick = (t) => { if (last) d.push(t - last); last = t; if (run) raf(tick); }; raf(tick);
for (let k = 0; k < 10; k++) {
  const n0 = d.length, s0 = b.imgRelS().done; await sleep(10000);
  const win = d.slice(n0).sort((a, c) => a - c); const p95 = win[Math.floor(win.length * 0.95)] || 0;
  log(`${k * 10}-${k * 10 + 10}s frames ${win.length} p95 ${p95.toFixed(0)} max ${(win[win.length - 1] || 0).toFixed(0)} >50ms ${win.filter((x) => x > 50).length} | swaps ${b.imgRelS().done - s0}`);
}
run = false;
