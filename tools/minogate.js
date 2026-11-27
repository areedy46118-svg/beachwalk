/* MYLES THROUGH THE GATE MID-FADE (2026-11-26, the owner: "myles went invisible", in the first castle). After your yes he walks into
 * the gate's doors and fades into them (`minoToGate`: his materials' opacity down over 0.7 s, put back by `minoWhole` when it ENDS).
 * Go through the gate yourself while he is fading and the place change makes him 'with' you at once. This puts him exactly there —
 * 'toGate', half faded, the place still the beach — with you in the first castle, then runs 10 s: his materials' opacity and
 * whether he is drawn.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/minogate.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js');
const M = b.MINO;
for (let i = 0; i < 200 && !(M.u && M.u.mats && M.u.mats.length); i++) { b.frame(2); await sleep(50); }
const u = M.u; if (!u) { log('no minotaur'); return; }
w.__clockOn();
// as `minoToGate` leaves him 0.45 s into his fade, on the sand, when you step through the gate
M.stage = 'toGate'; M.ally = true; M.place = 'beach'; M.fade = 0.64;
for (const m of u.mats) { m.transparent = true; m.opacity = 1 - M.fade; m.depthWrite = false; }
const op = () => { const o = u.mats.map((m) => m.opacity); return Math.min(...o).toFixed(2) + '..' + Math.max(...o).toFixed(2) + (u.mats.some((m) => m.transparent) ? ' (transparent)' : ''); };
log('set | stage', M.stage, 'place', M.place, 'opacity', op());
for (let f = 0; f < 600; f++) { w.__adv(1); if (f === 1 || f % 120 === 0) log('t', (f / 60).toFixed(1), '| stage', M.stage, 'place', M.place, '| g.visible', u.g.visible, '| fade', M.fade, '| his materials\' opacity', op()); }
log('DONE');
