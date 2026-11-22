/* LEAVING PLACES (2026-11-22, the owner: "random lag spikes when breaking things or leaving areas"): into and out of the church,
 * the sewer and the tavern — the longest frame through each cut and the three seconds after, and the game's own long spans.
 * Run: PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/exits.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 600 && !(b.state().started && b.UCS().ready); i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 200; i++) { b.frame(1); await sleep(15); }      // (the boot's own loads settle)
const frames = (n, tag) => { let mx = 0, at = -1; for (let i = 0; i < n; i++) { const t0 = performance.now(); b.frame(1); const d = performance.now() - t0; if (d > mx) { mx = d; at = i; } } log(tag, ': longest frame', mx.toFixed(1), 'ms at', at); };
const t0 = performance.now();
const asyncFrames = async (n, tag) => { let mx = 0, at = -1; for (let i = 0; i < n; i++) { const a = performance.now(); b.frame(1); const d = performance.now() - a; if (d > mx) { mx = d; at = i; } await sleep(1); } log(tag, ': longest frame', mx.toFixed(1), 'ms at', at); };
b.enterUndercroft(); await asyncFrames(240, 'into the church');
b.leaveUndercroft('entry'); await asyncFrames(300, 'OUT OF THE CHURCH');
b.loadSewer(); for (let i = 0; i < 1500 && !b.sewS().ready; i++) { b.frame(1); await sleep(15); }
b.placeInSewer(); await asyncFrames(180, 'into the sewer');
b.placeOutOfSewer(); await asyncFrames(300, 'OUT OF THE SEWER');
if (b.startTavern) { b.startTavern(1); await asyncFrames(300, 'into the tavern'); b.startTavern(-1); await asyncFrames(300, 'OUT OF THE TAVERN'); }
log('long spans:', JSON.stringify(b.lag(24).filter((e) => e[0] >= t0).slice(0, 12)));
