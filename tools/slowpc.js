/* HOW IT RUNS ON A WEAK MACHINE (2026-11-22, the owner: "i want this game to run perfectly on all computers even if they arent that
 * good"): a a fresh game at a few spots down the beach — the level chosen, the GPU it saw, the lights, the largest texture on the card,
 * the resolution, and the frame times over 4 s at each. Run under software rendering for the weakest GPU there is:
 *   PB_GL='--use-angle=swiftshader --enable-unsafe-swiftshader' PB_PORT=4223 PB_WAIT=600 PB_Q='&q=0' sh tools/probe_gl.sh 'evalFile&f=/tools/slowpc.js' <out> */
const f = w.frameElement, Q = new URLSearchParams(top.location.search), q = Q.get('q');

const w2 = w;
const B = w2.__bw;
for (let i = 0; i < 300 && !B.state().started; i++) { try { B.beginGame(); } catch (e) {} await sleep(200); }
for (let i = 0; i < 300 && !B.state().introDone; i++) await sleep(100);
await sleep(3000);
{ const gl = B.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); log('gpu', e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?', '| lights', B.drsS().lights, '| textures', B.renderer.info.memory.textures, '| geometries', B.renderer.info.memory.geometries); }
let big = 0; B.scene.traverse((o) => { if (!o.isMesh || !o.material) return; for (const m of [].concat(o.material)) for (const k in m) { const t = m[k]; if (t && t.isTexture && t.image) big = Math.max(big, t.image.width || 0, t.image.height || 0); } }); log('largest texture', big);
for (const z of [-60, -300, -600, -900]) {
  B.camera.position.set(6, 1.7, z); B.camBaseY = 1.7;
  const fr = []; let last = performance.now(); const t0 = last;
  while (performance.now() - t0 < 4000) { await new Promise((r) => w2.requestAnimationFrame(r)); const n = performance.now(); fr.push(n - last); last = n; }
  fr.sort((a, b) => a - b);
  log('z', z, '| frames', fr.length, '| fps', (fr.length / 4).toFixed(1), '| median', fr[fr.length >> 1].toFixed(1), 'ms | p95', fr[Math.floor(fr.length * 0.95)].toFixed(1), '| res', B.drsS().k);
}
