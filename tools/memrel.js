/* THE DECODED IMAGES LET GO (2026-11-22, `imgRel`): through the beach's far rest and every room, how many bitmaps were swapped
 * for their half copies, the MB freed, and how many maps three had to upload AGAIN from a half copy (`reup`, wants 0), with a
 * MARK at each stage for `ps` (see perf.md).  PB_PORT=4223 PB_WAIT=1200 sh tools/probe.sh 'evalFile&f=/tools/memrel.js' <out> */
const errs = []; const ce = console.error; console.error = function (...a) { const s = a.map(String).join(' '); if (/WebGL|texImage|ImageBitmap|detached|closed/i.test(s)) errs.push(s.slice(0, 160)); return ce.apply(this, a); };
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(70000);
log('beach', JSON.stringify(b.imgRelS()), 'heap', (performance.memory.usedJSHeapSize / 1048576).toFixed(0)); log('MARK beach');
for (const k of Object.keys(b.ROOM_BACK)) {
  const RB = b.ROOM_BACK[k]; b.clearRoomFlags(); try { RB.load(); } catch (e) { continue; } for (let i = 0; i < 500 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  try { RB.place(); } catch (e) {} for (let i = 0; i < 40; i++) { b.frame(1); await sleep(10); }
}
b.clearRoomFlags(); await sleep(60000);
for (const z of [-60, -400, -900, -1200]) { b.camera.position.set(6, 1.7, z); b.camBaseY = 1.7; for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); } }
log('rooms', JSON.stringify(b.imgRelS()), 'errors', errs.length, errs.slice(0, 4).join(' || ')); log('MARK rooms');
await sleep(10000);
