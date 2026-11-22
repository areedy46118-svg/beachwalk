/* IS IT THE PIXELS OR THE GEOMETRY (2026-11-22): at a few places, the GPU's time a frame at the game's resolution and at half of it
 * in each direction (a quarter of the pixels). Time that falls with the pixels is fill (shaders, overdraw); what stays is geometry
 * and draws. Run: PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/gpusplit.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(8000);
const C = b.camera, med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : -1; };
const gpuAt = async (pr) => {
  b.renderer.setPixelRatio(pr); b.renderer.setSize(w.innerWidth, w.innerHeight);
  for (let i = 0; i < 30; i++) await new Promise((r) => w.requestAnimationFrame(r));
  b.drsGpuS(); await sleep(2000); return med(b.drsGpuS());
};
const at = async (name) => {
  const full = await gpuAt(0.62), quarter = await gpuAt(0.31), big = await gpuAt(1.0);
  log(name.padEnd(12), '| gpu ms at 0.62', full.toFixed(2), '| at 0.31 (¼ pixels)', quarter.toFixed(2), '| at 1.0 (2.6× pixels)', big.toFixed(2), '| pixel share ~', Math.round(100 * (full - quarter) / (full * 0.75)) + '%');
  b.renderer.setPixelRatio(0.62); b.renderer.setSize(w.innerWidth, w.innerHeight);
};
for (const z of [-300, -900]) { b.clearRoomFlags(); C.position.set(6, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); await at('beach ' + z); }
for (const k of ['fort', 'whale', 'cat', 'tav']) {
  const RB = b.ROOM_BACK[k]; b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  RB.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(10); }
  await at(k);
}
