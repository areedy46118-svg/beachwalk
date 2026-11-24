/* FAR DETAIL, MEASURED (2026-11-23). At each z: the levels the view asks for are built (the worker waited out), then whole
 * frames are timed GPU-synced (a one-pixel readPixels after each) with the far detail on and off, triangles counted, and a
 * still taken of each — the same view, so the two can be laid side by side. `&zs=`, `&tag=`.
 * PB_PORT=4227 PB_WAIT=600 PB_WIN=1940,1120 sh tools/probe.sh 'evalFile&f=/tools/lodcost.js&fw=1920&fh=1080&zs=-60,-450,-600,-900' <out> */
const Q = new URLSearchParams(location.search), TAG = Q.get('tag') || 'lod';
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
b.settings.devMode = true;
for (let i = 0; i < 90 * 60 && !b.state().introDone; i++) { b.frame(1); if (i % 20 === 0) await sleep(1); }
w.requestAnimationFrame = () => 0;
if (Q.get('gfx') === 'low') { b.setGfx('low', false); b.renderer.setPixelRatio(+(Q.get('k') || 0.42)); b.renderer.setSize(w.innerWidth, w.innerHeight); log('low graphics at', b.renderer.getPixelRatio()); }   // (&gfx=low&k=: what a slow machine runs)
const R = b.renderer, gl = R.getContext(), px = new Uint8Array(4), C = b.camera, L = b.lodS();
const time = (n) => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); b.frame(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t.push(performance.now() - t0); } t.sort((a, c) => a - c); return t[n >> 1]; };
const count = () => { R.info.autoReset = false; R.info.reset(); b.frame(1); const r = [R.info.render.calls, R.info.render.triangles]; R.info.autoReset = true; return r; };
const worst = [];
for (const z of (Q.get('zs') || '-60,-450,-600,-900').split(',').map(Number)) {
  C.position.set(4, C.position.y, z); b.look(0, -0.04);
  b.lodOn(true);
  // let the walk find everything and the worker build what this view wants (each frame's own cost noted as it goes)
  const t0 = performance.now();
  for (let i = 0; i < 1500; i++) { const f0 = performance.now(); b.frame(1); worst.push(performance.now() - f0); if (i > 60 && !L.queue.length && !L.busy) break; if (i % 4 === 0) await sleep(4); }
  const build = (performance.now() - t0) / 1000;
  const on = time(30), [cOn, tOn] = count(); b.lodBegin(); shot(`${TAG}${z}-on`, 640); b.lodEnd();   // (a still is its own render: the levels on for it, as the frame does)
  b.lodOn(false);
  const off = time(30), [cOff, tOff] = count(); shot(`${TAG}${z}-off`, 640);
  b.lodOn(true); b.frame(2);
  const lv = {}; for (const e of L.list) lv[e.cur] = (lv[e.cur] || 0) + 1;
  log('z', z, '| on', on.toFixed(2), 'ms', cOn, 'calls', (tOn / 1000).toFixed(0) + 'k', '| off', off.toFixed(2), 'ms', cOff, 'calls', (tOff / 1000).toFixed(0) + 'k',
    '| meshes', L.list.length, 'levels in use', JSON.stringify(lv), 'built', L.built, 'kept', L.kept, 'build s', build.toFixed(1));
}
worst.sort((a, c) => c - a);
log('frames while building: worst', worst.slice(0, 5).map((v) => v.toFixed(1)).join(','), 'over 33ms', worst.filter((v) => v > 33).length, 'of', worst.length);
