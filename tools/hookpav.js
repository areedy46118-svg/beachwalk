/* NO PULL INTO THE PAVILION (2026-11-22, the owner: "i shouldnt be able to hook into the pavillon at all"): from the sand round
 * it, a pull at its upper windows, its parapet, through it to the cliff beyond, and a pull along the beach clear of it — which
 * start (`hookZipStart` via `hookZipAtS`) and, for the ones that do, where you end up.  PB_PORT=4223 sh tools/probe.sh 'evalFile&f=/tools/hookpav.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 600 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(40); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(2000);
const C = b.camera, MX = b.MUSH_XS(), MZ = b.MUSH_S().Z !== undefined ? 0 : 0;
const mz = C.position.z; // placeholder
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); b.frame(20);
const MUSHZ = b.mushHouseS().group.position.z, MUSHX = b.mushHouseS().group.position.x;
const cases = [['upper window', 9.5, 1.7, MUSHZ + 3, MUSHX - 3.5, 6.5, MUSHZ + 1.5], ['parapet', 8.5, 1.7, MUSHZ - 7, MUSHX - 4.6, 1.6, MUSHZ - 2],
  ['across it', 8.5, 1.7, MUSHZ + 9, MUSHX + 1, 3, MUSHZ - 9], ['along the beach', 7, 1.7, MUSHZ + 30, 7, 2, MUSHZ + 15]];
for (const [nm, x, y, z, tx, ty, tz] of cases) {
  b.HK.st = 'idle'; C.position.set(x, y, z); b.camBaseY = y; b.frame(2);
  b.HK.st = 'out'; const ok = b.hookZipAtS(tx, ty, tz);
  let d = 0; if (ok) for (let i = 0; i < 90; i++) b.frame(1);
  log(nm.padEnd(16), 'pull started', ok, ok ? '| ended at ' + C.position.x.toFixed(1) + ',' + C.position.y.toFixed(1) + ',' + C.position.z.toFixed(1) + ' | from the column ' + Math.hypot(C.position.x - MUSHX, C.position.z - MUSHZ).toFixed(1) + ' m' : '');
  b.HK.st = 'idle';
}
