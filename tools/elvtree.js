/* THE TREES ARE SOLID (elvTreeBlocks): walk at four of Elvédor's trees and log the closest the eye came to each trunk. Was (2026-11-22, the owner: "lighten the sand like a path up to elvedors front door"): stills from where
 * his screenshot stood at the gully's mouth (13.6, −702.9, looking up it), from the beach 15 m back, and in the yard looking
 * at the porch. `&tag=` names them.  PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/elvtrail.js&tag=after' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true; await sleep(2000);
const C = b.camera;
const go = async (x, z, n = 120) => { C.position.set(x, 1.75, z); b.camBaseY = 1.75; for (let i = 0; i < n; i++) { b.frame(1); await sleep(25); } };
await go(9, -690, 200); await go(13.6, -702.9, 200);
for (let i = 0; i < 400 && !(b.elvTreeSolidS() && b.elvTreeSolidS().length); i++) { b.frame(1); await sleep(25); }
const TS = b.elvTreeSolidS(); log('trees', TS.length);
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
for (const k of [0, 1, 2, 3]) {
  const T = TS[k], hx = b.HOUSE_X - T.x, hz = b.HOUSE_Z - T.z, hl = Math.hypot(hx, hz);
  const sx = T.x + hx / hl * 2.6, sz = T.z + hz / hl * 2.6;
  b.elvLandSet(true); C.position.set(sx, b.HOUSE_Y + 1.9, sz); b.camBaseY = C.position.y; for (let i = 0; i < 90; i++) { b.frame(1); await sleep(12); }
  const y0 = C.position.y;
  let min = 9;
  key('KeyW', true);
  for (let i = 0; i < 160; i++) { b.lookAt(T.pts[2].x, C.position.y, T.pts[2].z); b.frame(1); await sleep(12);
    const f = C.position.y - 1.7; for (const p of T.pts) if (p.y > f - 0.2 && p.y < f + 1.9) min = Math.min(min, Math.hypot(C.position.x - p.x, C.position.z - p.z)); }
  key('KeyW', false);
  log('tree', k, 'r0', T.r0.toFixed(2), 'start', sx.toFixed(1), sz.toFixed(1), 'eye', y0.toFixed(2), '-> end', C.position.x.toFixed(2), C.position.z.toFixed(2), '| closest to trunk', min.toFixed(2), '| trunk foot', T.pts[0].x.toFixed(2), T.pts[0].z.toFixed(2), T.pts[0].y.toFixed(2), '| blocks at start', b.elvTreeBlocksS(sx, sz, y0 - 1.7));
}
