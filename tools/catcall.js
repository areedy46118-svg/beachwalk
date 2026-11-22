/* THE CATACOMBS' DISTANT CALLS (2026-11-22): in the catacombs, `catDistantCall` asked twenty times from where you stand — where
 * each comes from (him / the dark), how far round by the corridors, and how it arrives (open / route / stone, level, low-pass).
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/catcall.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
const RB = b.ROOM_BACK.cat; RB.load();
for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
RB.place(); for (let i = 0; i < 200; i++) { b.frame(1); await sleep(15); }
for (let i = 0; i < 200 && !b.catDiagS().unit; i++) { b.frame(2); await sleep(50); }
log('diag', JSON.stringify(b.catDiagS()));
const run = async (tag) => {
const out = { him: 0, dark: 0, none: 0, via: {} };
for (let k = 0; k < 20; k++) {
  const r = b.catDistantCallS();
  if (!r) { out.none++; continue; }
  out[r.from]++; const v = r.H ? r.H.via : 'none'; out.via[v] = (out.via[v] || 0) + 1;
  if (k < 8) log(r.from, 'corridor', r.d, 'm', r.H ? `${r.H.via} g ${r.H.g.toFixed(3)} lp ${Math.round(r.H.lp)} from ${(r.H.px - b.camera.position.x).toFixed(1)},${(r.H.pz - b.camera.position.z).toFixed(1)}` : 'unheard', 'played', r.ok);
  await sleep(200);
}
log(tag, 'tally', JSON.stringify(out));
};
await run('landing');
// and from out in the halls: the node with the most of the place within 50 m of corridor
const G = b.catGS ? b.catGS() : null;

for (let t = 0; t < 60; t++) {
  const N = G.nodes, n = N[(Math.random() * N.length) | 0];
  b.camera.position.set(n.x, n.f + 1.7, n.z); b.catSndResetS();
  const d = b.catDiagS(); if (t < 6) log('try', JSON.stringify(d.fin), d.me); if (d.fin && d.fin[0] > 500 && d.fin[1] > 35) { log('moved', JSON.stringify(d.fin)); await run('halls'); break; }
}
