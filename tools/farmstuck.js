/* THE FARMERS AGAINST THE BUILDINGS (2026-11-17, the owner with a screenshot of the first castle's street: "MAKE THEM GET
 * STUCK ON THESE BUILDINGS LESS"). Not part of the game. Run headless:
 *   PB_PORT=4265 sh tools/probe.sh 'evalFile&f=/tools/farmstuck.js&n=5400&at=0' <out>      (at: where you stand — 0 the
 *   street's middle, 1 by the round tower, 2 down by the back door)
 * A natural fight, you standing still and healed. A man is STUCK in a second when he is out, alive, not swinging, not
 * stunned, more than his reach + 1 m from you, and his feet moved under 0.25 m in it. Per man: stuck seconds, and the
 * spots (castle-local, rounded) where it happened. */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 5400), AT = +(Q.get('at') || 0);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn();
b.settings.devMode = false;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
const cam = b.camera.position;
const spots = [[cam.x, cam.z], [cam.x + 4, cam.z + 8], [cam.x - 3, cam.z - 10], [cam.x + 9, cam.z - 4], [cam.x - 8, cam.z + 6], [cam.x + 6, cam.z + 16]];
const home = spots[AT] || spots[0];
const last = new Map(), stuck = new Map(), where = {};
let secs = 0, stuckTotal = 0, manSecs = 0;
for (let f = 0; f < N; f++) {
  cam.x = home[0]; cam.z = home[1];
  w.__adv(1); b.heal();
  if (f % 60 !== 0) continue;
  secs++;
  for (const u of b.farmUnitsS()) {
    if (!u.st.alive || !u.farm || !u.farm.out || !u.g.visible) { last.delete(u); continue; }
    const p = u.g.position, L = last.get(u); last.set(u, [p.x, p.z]);
    if (!L) continue;
    const d = Math.hypot(p.x - cam.x, p.z - cam.z), mv = Math.hypot(p.x - L[0], p.z - L[1]);
    const busy = !!u.farm.unstick || u.st.atk >= 0 || u.st.stun > 0 || u.st.recoil > 0 || u.st.down > 0 || (u.farm.burst);
    if (busy || d < (u.maxReach || 2.5) + 1) continue;
    manSecs++;
    if (mv < 0.25) {
      stuckTotal++; stuck.set(u, (stuck.get(u) || 0) + 1);
      const k = Math.round(p.x) + ',' + Math.round(p.z); where[k] = (where[k] || 0) + 1;
    }
  }
}
log('fight', secs, 's | man-seconds wanting to come at you', manSecs, '| stuck', stuckTotal, '(' + (manSecs ? (stuckTotal / manSecs * 100).toFixed(0) : 0) + ' %)');
const U = b.farmUnitsS(); let unst = 0; log('wall rule: moves sent back', U.reduce((a, u) => a + (u.st.fkoBack || 0), 0), '| turned along a face', U.reduce((a, u) => a + (u.st.fkoTurn || 0), 0));
log('stuck by man', [...stuck.entries()].map(([u, n]) => u.kind.file + '/' + u.kind.tool + ':' + n).join(' '));
log('stuck spots (world x,z: seconds)', Object.entries(where).sort((a, c) => c[1] - a[1]).slice(0, 12).map(([k, n]) => k + ':' + n).join('  '));
