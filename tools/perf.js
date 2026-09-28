/* PERFORMANCE HARNESS. Not part of the game.
 *   eval(await (await fetch('/tools/perf.js')).text());
 *
 *   __profInit()                   freeze rAF, dev mode, 1080p buffer
 *   __whoDraws(n)                  draw calls / triangles each top-level group costs
 * GPU (EXT_disjoint_timer_query_webgl2; the pane shares its GPU, so readings
 * drift with its clock — interleave variants and keep the minimum):
 *   await __gpuMin(fn, k)          20th-percentile GPU ms of fn()
 *   await __ablR([[name, on, off], ...], rounds)   ablation: min per variant
 *   __sceneOnly                    renders the scene alone (no view model, no post)
 *   await __station(label, cam, look)   GPU/CPU/draws/tris at one spot
 * WALK (real clock; `__boot` first, then walk):
 *   await __boot(ms)               run frames while the boot finishes
 *   await __probe(z0, z1)          frames over 20 ms: render vs other, programs compiled, textures
 *   await __probeGap(z0, z1)       frame-to-frame gaps (catches parses between frames) + game spans
 *   await __probeProf(z0, z1)      the same with the JS Self-Profiler: which functions made each spike
 *                                  (needs the Document-Policy header serve.py sends)
 * Never leave performance.now stubbed: a frozen clock makes every frame dt=0
 * and the GPU numbers come out several times too high. Reload between runs. */
(function () {
const b = window.__bw, R = b.renderer, gl = R.getContext();
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
/* a real-size drawing buffer (1920x1080 css at the game's own pixel ratio), frames on demand */
window.__profInit = function (W = 1920, H = 1080) {
  window.requestAnimationFrame = () => 0;
  b.settings.devMode = true;
  R.setSize(W, H, false); b.camera.aspect = W / H; b.camera.updateProjectionMatrix();
  return { ext: !!ext, buf: [R.domElement.width, R.domElement.height] };
};
/* who draws what: hide each top-level child and read the draw count back */
window.__whoDraws = function (top = 12) {
  const cnt = () => { R.info.autoReset = false; R.info.reset(); R.render(b.scene, b.camera); const c = [R.info.render.calls, R.info.render.triangles]; R.info.autoReset = true; return c; };
  const [c0, t0] = cnt(); const out = [];
  for (const o of b.scene.children) { if (!o.visible) continue; o.visible = false; const [c, t] = cnt(); o.visible = true; if (c0 - c > 0 || t0 - t > 5000) out.push([o.name || o.type, c0 - c, t0 - t]); }
  out.sort((x, y) => y[1] - x[1]); return { calls: c0, tris: t0, top: out.slice(0, top) };
};
})();
(function () {
const b = window.__bw, R = b.renderer, gl = R.getContext();
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
window.__gpu = async function (fn, k = 12) {
  const qs = [];
  for (let i = 0; i < k; i++) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); fn(); gl.endQuery(ext.TIME_ELAPSED_EXT); qs.push(q); }
  gl.finish(); await new Promise((r) => setTimeout(r, 100));
  const v = []; for (const q of qs) { if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) v.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q); }
  v.sort((x, y) => x - y); return v.length ? +v[v.length >> 1].toFixed(2) : null;
};
window.__sceneOnly = () => { R.setRenderTarget(null); R.clear(); R.render(b.scene, b.camera); };
/* GPU cost of each top-level child: scene time with it, minus without */
window.__gpuWho = async function (top = 14) {
  const all = await window.__gpu(window.__sceneOnly, 10); const out = [];
  for (const o of b.scene.children) {
    if (!o.visible) continue;
    o.visible = false; const t = await window.__gpu(window.__sceneOnly, 6); o.visible = true;
    const d = all - t; if (d > 0.25) out.push([o.name || (o.material && o.material.type) || o.type, +d.toFixed(2)]);
  }
  out.sort((x, y) => y[1] - x[1]); return { all, top: out.slice(0, top) };
};
})();
(function () {
const b = window.__bw, R = b.renderer;
window.__station = async function (label, cam, look, settle = 40) {
  for (let i = 0; i < settle; i++) { b.camera.position.set(...cam); b.camBaseY = cam[1]; if (look) b.lookAt(...look); b.frame(1); }
  const place = () => { b.camera.position.set(...cam); b.camBaseY = cam[1]; if (look) b.lookAt(...look); };
  const gpu = await window.__gpu(() => { place(); b.frame(1); }, 12);
  R.info.autoReset = false; R.info.reset(); place();
  const t0 = performance.now(); b.frame(1); const cpu = performance.now() - t0;
  const calls = R.info.render.calls, tris = R.info.render.triangles; R.info.autoReset = true;
  return { label, gpu, cpuFrame: +cpu.toFixed(2), calls, tris, progs: R.info.programs.length };
};
})();
(function () {
const b = window.__bw, R = b.renderer, gl = R.getContext();
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
window.__gpuMin = async function (fn, k = 24) {
  const qs = [];
  for (let i = 0; i < k; i++) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); fn(); gl.endQuery(ext.TIME_ELAPSED_EXT); qs.push(q); gl.finish(); }
  await new Promise((r) => setTimeout(r, 80));
  const v = []; for (const q of qs) { if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) v.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q); }
  v.sort((x, y) => x - y); return v.length ? +v[Math.floor(v.length * 0.2)].toFixed(2) : null;   // 20th percentile
};
window.__ablR = async function (variants, rounds = 4) {       // interleaved rounds, the minimum of each: the only stable reading here
  const best = {};
  for (let r = 0; r < rounds; r++) for (const [name, on, off] of variants) { if (on) on(); const t = await window.__gpuMin(window.__sceneOnly, 16); if (off) off(); best[name] = Math.min(best[name] ?? 1e9, t); }
  return best;
};
})();
(function () {
const b = window.__bw, R = b.renderer;
const tick = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
window.__boot = async function (ms = 12000) {
  window.requestAnimationFrame = () => 0; b.settings.devMode = true;
  R.setSize(1920, 1080, false); b.camera.aspect = 1920 / 1080; b.camera.updateProjectionMatrix();
  const t0 = performance.now(); while (performance.now() - t0 < ms) { b.frame(1); await tick(); }
};
/* walk z0 -> z1; on every frame over `over` ms, say how long update and render took, and what compiled or uploaded */
window.__probe = async function (z0, z1, speed = 10, over = 20) {
  const out = []; let z = z0, last = performance.now();
  // wrap render to time it
  const r0 = R.render.bind(R); let rt = 0; R.render = (s, c) => { const t = performance.now(); r0(s, c); rt += performance.now() - t; };
  try {
    while (z > z1) {
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
      z -= speed * dt; const x = 10 + Math.sin(z * 0.02) * 1.5;
      b.camera.position.set(x, 1.7, z); b.camBaseY = 1.7; b.lookAt(x - 1, 1.6, z - 15);
      const p0 = R.info.programs.length, tx0 = R.info.memory.textures, g0 = R.info.memory.geometries; rt = 0;
      const t0 = performance.now(); b.frame(1); const ft = performance.now() - t0;
      if (ft > over) {
        const newP = R.info.programs.slice(p0).map(p => p.name || p.cacheKey.slice(0, 30));
        out.push({ z: Math.round(z), ft: Math.round(ft), render: Math.round(rt), other: Math.round(ft - rt), progs: newP.slice(0, 6), nProg: newP.length, tex: R.info.memory.textures - tx0, geo: R.info.memory.geometries - g0 });
      }
      await tick();
    }
  } finally { R.render = r0; }
  return out;
};
})();
(function () {
const b = window.__bw;
const tick = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
/* walk with the JS self-profiler on; for every frame over `over` ms, the functions it spent its time in */
window.__probeProf = async function (z0, z1, speed = 10, over = 20) {
  const P = new Profiler({ sampleInterval: 1, maxBufferSize: 200000 });
  const win = []; let z = z0, last = performance.now();
  while (z > z1) {
    const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    z -= speed * dt; const x = 10 + Math.sin(z * 0.02) * 1.5;
    b.camera.position.set(x, 1.7, z); b.camBaseY = 1.7; b.lookAt(x - 1, 1.6, z - 15);
    const t0 = performance.now(); b.frame(1); const t1 = performance.now();
    if (t1 - t0 > over) win.push([t0, t1, Math.round(z)]);
    await tick();
  }
  const tr = await P.stop();
  const name = (fid) => { const f = tr.frames[fid]; return (f.name || '(anon)') + ':' + (f.line || ''); };
  return win.map(([t0, t1, zz]) => {
    const self = {}, incl = {};
    for (const s of tr.samples) {
      if (s.timestamp < t0 || s.timestamp > t1 || s.stackId === undefined) continue;
      let st = tr.stacks[s.stackId]; if (!st) continue;
      const leaf = name(st.frameId); self[leaf] = (self[leaf] || 0) + 1;
      const seen = new Set();
      while (st) { const n = name(st.frameId); if (!seen.has(n)) { incl[n] = (incl[n] || 0) + 1; seen.add(n); } st = st.parentId !== undefined ? tr.stacks[st.parentId] : null; }
    }
    const top = (o, k) => Object.entries(o).sort((a, b2) => b2[1] - a[1]).slice(0, k);
    return { z: zz, ms: Math.round(t1 - t0), self: top(self, 6), incl: top(incl, 14) };
  });
};
})();
(function () {
const b = window.__bw;
const tick = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
/* walk measuring the GAP between frames (what a player sees), and list the game's own long spans in the window */
window.__probeGap = async function (z0, z1, speed = 10, over = 25) {
  const tStart = performance.now(); const out = []; let z = z0, last = performance.now(), prevEnd = performance.now();
  while (z > z1) {
    const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    z -= speed * dt; const x = 10 + Math.sin(z * 0.02) * 1.5;
    b.camera.position.set(x, 1.7, z); b.camBaseY = 1.7; b.lookAt(x - 1, 1.6, z - 15);
    const t0 = performance.now(); const gap = t0 - prevEnd; b.frame(1); const t1 = performance.now(); prevEnd = t1;
    if (gap + (t1 - t0) > over) out.push([Math.round(z), Math.round(gap), Math.round(t1 - t0)]);
    await tick();
  }
  const spans = b.lag(15).filter(e => e[0] >= tStart - window.performance.timeOrigin * 0 && e[0] > 0).slice(0, 40);
  return { gaps: out, spans: spans.filter(e => e[0] > tStart - 1).slice(0, 20) };
};
})();
