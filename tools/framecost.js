/* WHAT A FRAME COSTS, WHERE (2026-11-22, the owner: "run perfectly on all computers even if they arent that good"): a fresh game,
 * then a tour of the places that matter — the beach at four spots, the castle's street, Castle XIII's court, the tavern, the
 * cellar's fight, the catacombs, the whale — each for 3 s of real frames: our own CPU time a frame (the game's update and the
 * render's submission, `b.frame` timed) and the GPU's own time (EXT_disjoint_timer_query, the dynamic resolution's own reading).
 * Run: PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/framecost.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(8000);
const C = b.camera, med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : -1; }, p95 = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.95)] : -1; };
const measure = async (name) => {
  for (let i = 0; i < 40; i++) { await new Promise((r) => w.requestAnimationFrame(r)); }
  b.drsGpuS(); b.drsRecS(true);
  await sleep(3000);
  const cpu = b.drsRecS(false).filter((v) => v > 0), gpu = b.drsGpuS(), info = b.renderer.info.render;
  log(name.padEnd(14), '| cpu ms median', med(cpu).toFixed(1), 'p95', p95(cpu).toFixed(1), '| gpu ms median', med(gpu).toFixed(2), 'p95', p95(gpu).toFixed(2), '(n', gpu.length + ')', '| draws', info.calls, 'tris', info.triangles, '| units', b.mutants.filter((u) => !u.retired && u.st.alive && u.g.visible).length);
};
for (const z of [-60, -300, -600, -900]) { b.clearRoomFlags(); C.position.set(6, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); await measure('beach ' + z); }
for (const k of ['fort', 'c13', 'tav', 'cat', 'whale', 'cel']) {
  const RB = b.ROOM_BACK[k]; if (!RB) continue;
  b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  if (!RB.ready()) { log(k, 'never ready'); continue; }
  RB.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(10); }
  await measure(k);
}
