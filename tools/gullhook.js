/* THE HOOK AND THE GULLS (2026-11-21, the owner: "make the seagulls hit boxes with the chain more tight"). The island loaded;
 * for each gull, lines from 6 m off: through its middle, and past it at 10–40 cm. What the old ball (r + 0.14) took, and what
 * the hook takes now (`hookGullTight`). Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/gullhook.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
b.loadIsle(); for (let i = 0; i < 600 && !(b.isleBirdsS() && b.isleBirdsS().length); i++) { b.frame(1); await sleep(30); }
const T = b.THREE, L = b.isleBirdsS(); log('gulls', L.length);
const rows = { 0: [0, 0], 0.1: [0, 0], 0.2: [0, 0], 0.3: [0, 0], 0.4: [0, 0] };
L.forEach((B, i) => {
  for (const off of Object.keys(rows)) for (let a = 0; a < 8; a++) {
    const ang = a / 8 * Math.PI * 2, O = B.c.clone().add(new T.Vector3(Math.sin(ang) * 6, 1.2, Math.cos(ang) * 6));
    const side = new T.Vector3(Math.cos(ang), 0, -Math.sin(ang)).multiplyScalar(+off);
    const D = B.c.clone().add(side).sub(O).normalize();
    const t = B.c.clone().sub(O).dot(D), dist = B.c.distanceTo(O.clone().addScaledVector(D, t));
    if (dist < B.r + 0.14) rows[off][0]++;
    if (b.hookGullTightS(i, O.x, O.y, O.z, D.x, D.y, D.z)) rows[off][1]++;
  }
});
log('radius', L.map((B) => B.r.toFixed(2)).join(','));
for (const k of Object.keys(rows)) log('line', k, 'm off the middle: old ball took', rows[k][0], '/', L.length * 8, '| hook now takes', rows[k][1]);
