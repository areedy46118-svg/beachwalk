/* WHAT A HEAP OF BODIES COSTS (2026-11-26, the owner: "make them less laggy ragdolls please"). The first castle; eight men killed on the
 * same frame where they stand, then 90 frames timed (real ms of `__adv`), with the walls asked on every pass (`&all=1`, the old)
 * or on four of twelve (the new).
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/ragcost.js' <out> */
const Q = new URLSearchParams(location.search);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = false;
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
const res = [];
for (const all of [0, 1, 0, 1]) {
  w.__ragWallAll = !!all;
  const men = units().filter((x) => x.st.alive && x.model && x.g.visible).slice(0, 8);
  for (const u of men) { u.st.hp = 0.01; u.lastHitMine = true; b.hurtMutantS ? b.hurtMutantS(u, 1, 0.4) : (u.st.hp = 0, b.killMutantS && b.killMutantS(u)); }
  for (let i = 0; i < 2; i++) w.__adv(1);
  const nR = units().filter((x) => x.rag).length; const T = []; for (let i = 0; i < 40; i++) { const t0 = performance.now(); w.__adv(1); T.push(performance.now() - t0); }
  const mean = T.reduce((a, c) => a + c, 0) / T.length; T.sort((a, c) => a - c);
  res.push(`${all ? 'walls every pass' : 'walls 4 of 12'}: ${nR} bodies falling | the first 40 frames: mean ${mean.toFixed(1)} ms, median ${T[20].toFixed(1)}, worst ${T[39].toFixed(1)}`);
  for (let i = 0; i < 200; i++) w.__adv(1);
}
log(res.join(' | '));
log('DONE');
