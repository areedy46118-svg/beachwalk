/* THE MARIONETTE TO THE LIGHTHOUSE'S JETTY (2026-11-22, the owner: "the marionette got stuck going to the lighthouse peir" and "when
 * you bring the marionette over the bridge to the light house have an achievement"): him with you on the drawbridge, then walked
 * (real keys) over it, across the terrace, down the stair to the jetty and along it — after each leg, where you are, where he is,
 * how far behind, and whether the achievement came.  PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/marisle.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/sgtest.js'); await ev('/tools/isleshot.js');
log('isle', JSON.stringify(await w.__isle.boot()));
b.settings.devMode = true;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { w.__cadv(1); await sleep(50); }
const BR = b.isleBRS(), C = b.camera, M = b.MAR.u;
C.position.set(BR.x1 - 1.2, BR.y + 1.7, BR.z); b.camBaseY = C.position.y; b.isleSetLast(C.position.x, C.position.z, BR.y);
b.look(Math.PI / 2, 0); for (let i = 0; i < 60; i++) w.__cadv(1);
b.MAR.jump = true; for (let i = 0; i < 30; i++) w.__cadv(1);
const where = () => `you ${C.position.x.toFixed(1)},${(b.camBaseS() - 1.7).toFixed(1)},${C.position.z.toFixed(1)} | him ${M.g.position.x.toFixed(1)},${M.g.position.y.toFixed(1)},${M.g.position.z.toFixed(1)} d ${Math.hypot(M.g.position.x - C.position.x, M.g.position.z - C.position.z).toFixed(1)} | place ${b.marPlaceS()} st ${b.MAR.st} | crusty ${b.crustyS()}`;
log('start', where());
const R = b.ISLE_RAMPS[0], legs = (new URLSearchParams(location.search).get('short') ? [[BR.x0 - 2.5, BR.z]] : [[BR.x0 - 2.5, BR.z], [-5, BR.z + 3], [-16.6, R.z0 - 1.0], [-16.6, R.z1 + 0.3], [-23.5, R.z1 - 1.5], [-24, R.z1 - 12]]);
for (const [x, z] of legs) {
  const r = w.__isle.goto(x, z, 25);
  // and wait for him to catch up
  let dmin = 99; for (let i = 0; i < 240; i++) { w.__cadv(1); dmin = Math.min(dmin, Math.hypot(M.g.position.x - C.position.x, M.g.position.z - C.position.z)); }
  log('to', x.toFixed(1), z.toFixed(1), '→', r.split(' ').slice(0, 4).join(' '), '|', where(), '| closest after', dmin.toFixed(1));
}
log('achievement line on screen:', JSON.stringify([...w.document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /lil crusty/i.test(e.textContent || '')).map((e) => e.textContent.trim()).slice(0, 2)));
