/* THE IMAGE SWAP RUNNING ON ITS OWN (2026-11-22): its count every 3 s through a minute after the intro, to see it finish (or
 * where the browser dies).  PB_PORT=4223 sh tools/probe.sh 'evalFile&f=/tools/relrun.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
const t0 = performance.now();
for (let i = 0; i < 30; i++) { const s = b.imgRelS(); let big = 0; for (const t of b.imgRelQ()) if (t.image && Math.max(t.image.width, t.image.height) >= 2048) big++; log(((performance.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(s), 'big left', big, 'heap', (performance.memory.usedJSHeapSize / 1048576).toFixed(0)); await sleep(3000); }
