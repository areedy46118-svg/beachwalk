/* the image release where it is quiet (2026-11-23): on the title how many maps were released before START, and through the call none.
 * PB_PORT=4282 PB_WAIT=300 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/imgrelq.js' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
const R = b.imgRelS(); log('title ready: released', R.done, 'waiting', R.q, 'freed MB', (R.freed / 1048576).toFixed(0));
await sleep(8000); const R2 = b.imgRelS(); log('8 s more on the title: released', R2.done, 'waiting', R2.q, 'freed MB', (R2.freed / 1048576).toFixed(0));
st.click(); await sleep(30000); const R3 = b.imgRelS(); log('30 s into the call: released', R3.done, '(no more than on the title)', 'waiting', R3.q);
