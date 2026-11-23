/* SAND THROWN UP (2026-11-22, the owner: "the sand particles have to look way more realistic they are awful"): a shovel's
 * throw (`spawnPuffs` x30 along a direction) and a body landing (x14, no direction) on the beach at night, stills at
 * 0.12 / 0.35 / 0.8 / 1.6 s from a metre and a half and from four metres. `&tag=` names the stills (before/after).
 * PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/sandfx.js&tag=before' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(6000);
b.settings.devMode = true;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
const C = b.camera, X = 8, Z = -40;
const view = (d, h) => { C.position.set(X + d * 0.7, h, Z + d * 0.7); b.camBaseY = h; b.lookAt(X, 0.35, Z); };
for (const [nm, n, dx, dz] of [['dig', 30, -0.7, -0.7], ['land', 14, 0, 0]]) for (const [vn, d, h] of [['near', 1.6, 1.5], ['far', 4.2, 1.7]]) {
  view(d, h); w.__adv(4);
  b.spawnPuffs(X, Z, n, dx, dz, 0.06);
  let t = 0; for (const at of [0.12, 0.35, 0.8, 1.6]) { while (t < at) { w.__adv(1); t += 1 / 60; } view(d, h); shot(`${TAG}-${nm}-${vn}-${String(at).replace('.', '')}`, 480); }
  w.__adv(200);
}
