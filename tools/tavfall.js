/* FALLING OUT OF THE TAVERN (2026-11-22, the owner, a still from under the hall's floor: "i fell through the wall and ground in
 * the tavern this should never happen anywahere"). From spots over the hall's floor: hook pulls at 16 bearings x 5 pitches
 * (down at the flags, level at the walls, up at the beams) and jumps, at a steady 60 fps and at a stuttering 12-20 fps (`&slow=1`);
 * every frame the feet are checked against the floor under them — a frame that ends under the walk's floor, or outside it,
 * is logged with how it got there.  PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/tavfall.js' <out> */
w.eval(await (await fetch('/tools/tavdrink.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search);
log('tav', JSON.stringify(await w.__tavSetup()));
const b2 = b; b2.addToInventory(b2.hookItem); if (b2.state().equipped !== b2.hookItem.name) b2.toggleEquip(b2.hookItem);
// a clock we step ourselves, at the frame time we choose
w.requestAnimationFrame = () => 0;
const real = performance.now.bind(performance), base = real(); let off = 0, creep = 0;
performance.now = () => base + off + (creep += 0.01);
const step = (ms) => { off += ms; b.frame(1); };
const slow = !!Q.get('slow'), ms = () => (slow ? 50 + Math.random() * 35 : 16.7);
const C = b.camera, T = b.THREE, TI = b.tavInfoS(), FL = 800 + 7.52, eye = () => C.position.y - (b.camBaseS() - C.position.y + C.position.y) ;
for (let i = 0; i < 30; i++) step(16.7);
const spots = []; const L0 = TI.last; log('last spot', JSON.stringify(L0));
// spots: a grid round the start, kept where the walk has a floor at the flags
for (let dx = -8; dx <= 8; dx += 2) for (let dz = -8; dz <= 8; dz += 2) { const x = L0[0] + dx, z = L0[1] + dz, f = TI.floor(x, z, FL + 0.2); if (f && Math.abs(f.f - FL) < 0.3) spots.push([x, z]); }
log('spots', spots.length);
let bad = 0, pulls = 0, worst = 0; const shown = [];
const check = (tag, prev) => {
  const p = C.position, feet = b.camBaseS() - 1.7, f = TI.floor(p.x, p.z, feet + 0.6);
  const under = feet < FL - 0.35 && (!f || f.f < FL - 0.35);
  const out = !f;
  if (under || out) { bad++; worst = Math.min(worst, feet - FL); if (shown.length < 8) shown.push(`${tag}: feet ${(feet - FL).toFixed(2)} at ${(p.x - L0[0]).toFixed(2)},${(p.z - L0[1]).toFixed(2)} floor ${f ? (f.f - FL).toFixed(2) : 'none'} from ${prev}`); return true; }
  return false;
};
for (const [sx, sz] of spots.slice(0, +(Q.get('n') || 40))) {
  for (let a = 0; a < 16; a++) for (const el of [-70, -35, 0, 30, 60]) {
    C.position.set(sx, FL + 1.7, sz); b.camBaseY = FL + 1.7; b.HK.st = 'idle'; b.HK.zipUsed = false; for (let i = 0; i < 3; i++) step(16.7);
    const yaw = a / 16 * Math.PI * 2, e = el * Math.PI / 180, d = new T.Vector3(Math.sin(yaw) * Math.cos(e), Math.sin(e), Math.cos(yaw) * Math.cos(e));
    // the iron where a throw this way would bite: the first drawn thing on the line (or 12 m)
    const rc = new T.Raycaster(C.position.clone(), d, 0.3, 14); rc.camera = C; const hit = rc.intersectObjects(b.scene.children, true).find((h) => h.object.isMesh && h.object.visible && !(h.object.material && h.object.material.transparent) && h.object.name !== 'hitProxy');
    const tgt = hit ? hit.point : C.position.clone().addScaledVector(d, 12);
    b.HK.st = 'out'; const ok = b.hookZipAtS(tgt.x, tgt.y, tgt.z); pulls++;
    if (Math.random() < 0.4) w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    let prev = `pull ${a * 22.5}°/${el}° ok ${ok} to ${(tgt.x - L0[0]).toFixed(1)},${(tgt.y - FL).toFixed(1)},${(tgt.z - L0[1]).toFixed(1)}`;
    let badAt = -1, minFeet = 9;
    for (let i = 0; i < 70; i++) { step(ms()); if (i === 2) w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'Space', key: ' ' })); const f0 = b.camBaseS() - 1.7 - FL; minFeet = Math.min(minFeet, f0); if (badAt < 0 && check(prev, prev)) badAt = i; }
    if (badAt >= 0 && shown.length < 14) { const p = C.position; shown.push(`   ...70 frames on: at ${(p.x - L0[0]).toFixed(2)},${(p.z - L0[1]).toFixed(2)} feet ${(b.camBaseS() - 1.7 - FL).toFixed(2)} lowest ${minFeet.toFixed(2)} | last ${JSON.stringify(TI.last.map((v, k) => (v - L0[k]).toFixed(2)))}`); }
    worst = Math.min(worst, minFeet);
    b.HK.st = 'idle';
  }
}
// drops: from 2-6 m over the flags with 120-250 ms frames (a hitch), and a hard downward start
let drops = 0, sunk = 0;
for (const [sx, sz] of spots) for (const h of [2, 4, 6]) {
  C.position.set(sx, FL + 1.7 + h, sz); b.camBaseY = FL + 1.7 + h; b.HK.st = 'idle';
  for (let i = 0; i < 40; i++) step(120 + Math.random() * 130);
  drops++; const feet = b.camBaseS() - 1.7 - FL; if (feet < -0.3) { sunk++; if (sunk < 5) log('  sunk from', h, 'm at', (sx - L0[0]).toFixed(1), (sz - L0[1]).toFixed(1), 'to feet', feet.toFixed(2)); }
}
log('drops', drops, '| ended under the flags', sunk);
log('pulls', pulls, '| frames under or outside the floor', bad, '| worst feet under the flags', worst.toFixed(2));
for (const s of shown) log('  ', s);
