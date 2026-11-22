/* THE PEOPLE ARE THERE WHEN THE BLACK LIFTS (2026-11-22, the owner: "I HATE SEEING THE PEOPLE SPAWN IN WHEN WALKING INTO THE TAVERN
 * OR CASTLE"): a fresh game, into the keep, then the tavern's door — every frame of the cut, the black and how many of the room's
 * people are not yet whole; the same at the castle's gate. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/castin.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(1500);
const blk = () => +(document.getElementById('blackout') ? getComputedStyle(document.getElementById('blackout')).opacity : -1);
const whole = (x, z, r) => { let n = 0, bad = 0; for (const u of b.mutants || []) { if (u.retired || !u.st.alive) continue; if (Math.abs(u.g.position.x - x) > r || Math.abs(u.g.position.z - z) > r) continue; n++; if (!u.model || u.parLate) bad++; } return bad + '/' + n; };
const watch = async (name, x, z, r, busy) => {
  let lifted = null, held = 0;
  for (let i = 0; i < 600; i++) {
    b.frame(1); await sleep(16);
    const k = blk();
    if (k >= 0.99) held++;
    if (lifted === null && held > 3 && k < 0.95) { lifted = i; log(name, '| the black starts to lift at frame', i, '| not whole then', whole(x, z, r), '| held black frames', held); }
    if (!busy()) break;
  }
  log(name, '| after: not whole', whole(x, z, r));
};
const RB = b.ROOM_BACK.keep; RB.load(); for (let i = 0; i < 300 && !RB.ready(); i++) { b.frame(2); await sleep(50); } RB.place();
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(10); }
log('in the keep; tavern people before the door', whole(b.TAV_X, b.TAV_Z, 40));
b.startTavern(1);
await watch('tavern', b.TAV_X, b.TAV_Z, 40, () => b.tavState().busy);
