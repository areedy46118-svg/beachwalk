/* THE GARGOYLES WITHOUT MYLES (2026-11-23): XIII's court, Myles not with you; walked toward the locked arch door — at what distance
 * do they come down? PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/gargdoor.js' <out> */
w.eval(await (await fetch('/tools/c13look.js?' + Date.now())).text());
log('c13', await w.__c13LookBoot());
const C = b.camera;
for (let i = 0; i < 400 && !(b.gargDoorS() && b.gargDoorS().models === b.gargDoorS().n && b.gargDoorS().n); i++) { w.__c13Adv(1); await sleep(15); }
let D = b.gargDoorS(); log('door', JSON.stringify(D));
const y = C.position.y;
for (const d of [14, 10, 8, 6.5, 5.0, 4.0]) {
  // from the court side of the door: back along the line from the door to where you were standing
  const ox = C.position.x - D.x, oz = C.position.z - D.z, L = Math.hypot(ox, oz) || 1;
  C.position.set(D.x + ox / L * d, y, D.z + oz / L * d); b.camBaseY = y;
  for (let i = 0; i < 20; i++) w.__c13Adv(1);
  D = b.gargDoorS(); log('at', d, 'm from the door → phase', D.phase, 'perched', D.perched);
  if (D.phase === 1) break;
}
