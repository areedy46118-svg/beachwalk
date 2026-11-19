/* THE CALL'S COST A FRAME (2026-11-19, "its laggy as shit"). Not part of the game. Run headless:
 *   PB_PORT=4282 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/callperf.js' <out>
 * START pressed, the call running; then the room drawn 120 times at the current size and at twice it (the old way),
 * with the call's own frame step: the mean and worst ms of each. */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
st.click(); for (let i = 0; i < 60 && !(b.IC.on && b.IC.start); i++) await sleep(100);
await sleep(3000);
const T = b.TB; T.raf && w.cancelAnimationFrame(T.raf); T.raf = 0;
const gl = T.r.getContext();
const run = (label) => { const ms = []; for (let i = 0; i < 120; i++) { const t0 = performance.now(); b.icFrame(1 / 60, 0); b.tbRender(); gl.finish(); ms.push(performance.now() - t0); } ms.sort((a, c) => a - c); log(label, 'rt', T.rt.width + 'x' + T.rt.height, '| mean', (ms.reduce((a, c) => a + c, 0) / ms.length).toFixed(1), 'ms | p90', ms[108].toFixed(1), '| worst', ms[119].toFixed(1)); };
run('now (1x)');
T.rt.setSize(T.vw * 2, T.vh * 2); run('old (2x)');
T.rt.setSize(T.vw, T.vh);
