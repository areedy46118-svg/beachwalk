/* THE KING'S FIGHT, TIMED (2026-11-21, the owner: "optimize what we have so far so it runs best as possible make sure nothing
 * changes"). The dev teleport, his descent skipped, the fight on and him held where he is (puppet, so the numbers are the
 * room's and not his moves'), you 7 m off looking at him; then 360 real frames at a 1920x1080 buffer with the GPU synced each
 * frame (a one-pixel read), as `perftour.js` does — with everything on, and then with each of the fight's air parts off in
 * turn (measurement only: `&parts=1`), so what each costs is read off the difference. `&prof=1`: the JS sampler over the
 * all-on run. Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingperf.js&parts=1' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), PARTS = !!+(Q.get('parts') || 0), PROF = !!+(Q.get('prof') || 0), N = +(Q.get('n') || 360);
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
w.requestAnimationFrame = () => 0;
const R = b.renderer, gl = R.getContext(), px = new Uint8Array(4);
R.setSize(1920, 1080, false); C.aspect = 16 / 9; C.updateProjectionMatrix();
C.position.set(X - 12, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 900 && b.kingS().mode !== 'descend'; i++) { b.frame(1); if (i % 20 === 0) await sleep(0); }
for (let i = 0; i < 30; i++) b.frame(1);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
for (let i = 0; i < 240; i++) { b.frame(1); if (i % 20 === 0) await sleep(0); }
const hold = () => { if (b.KA) b.KA.k = 1; b.KING.mode = 'ready'; u.st.puppet = true; u.st.atk = -1; const P = u.g.position; C.position.set(P.x - 7, Y + F + 1.7, P.z + 0.5); b.camBaseY = C.position.y; b.lookAt(P.x, P.y + 1.6, P.z); };
hold(); for (let i = 0; i < 120; i++) { b.frame(1); hold(); if (i % 20 === 0) await sleep(0); }
log('in the fight: mode', b.kingS().mode, 'filter', R.domElement.style.filter, 'KA k', b.KA ? b.KA.k.toFixed(2) : '?');
const run = async (tag) => {
  const ts = [];
  for (let i = 0; i < N; i++) { hold(); const t0 = performance.now(); b.frame(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); if (i % 30 === 0) await sleep(0); }
  ts.sort((a, c) => a - c);
  const r = { med: +ts[ts.length >> 1].toFixed(2), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(2), max: +ts[ts.length - 1].toFixed(2), calls: R.info.render.calls, tris: R.info.render.triangles };
  log(tag, JSON.stringify(r)); return r;
};
let P = null; if (PROF) P = new w.Profiler({ sampleInterval: 1, maxBufferSize: 600000 });
await run('ALL ON');
if (P) {
  const tr = await P.stop(), self = new Map(); let tot = 0;
  for (const s of tr.samples) { if (s.stackId == null) continue; tot++; const f = tr.frames[tr.stacks[s.stackId].frameId]; const k = (f.name || '(anon)') + ':' + (f.line || 0); self.set(k, (self.get(k) || 0) + 1); }
  log('PROF samples', tot, 'SELF', JSON.stringify([...self.entries()].sort((a, c) => c[1] - a[1]).slice(0, 30).map(([k, v]) => k + ' ' + v)));
}
if (PARTS && b.KA) {
  const KA = b.KA, set = (arr, v) => { for (const m of arr) m.visible = v; };
  // (each part off for its run only, by the same flag the game's own frame sets — so they are held off inside the loop)
  const off = async (tag, fn) => { const r0 = b.frame; b.frame = (n) => { r0(n); fn(); }; await run(tag); b.frame = r0; };
  await off('no ground mist', () => set(KA.mist, false));
  await off('no ash', () => { if (KA.ash) KA.ash.visible = false; });
  await off('no shafts', () => set(KA.shafts, false));
  await off('no B&W filter', () => { R.domElement.style.filter = ''; });
  await off('no beam/cloud', () => { if (b.KFX.beam) b.KFX.beam.visible = false; if (b.KFX.cloud) b.KFX.cloud.visible = false; });
  await run('ALL ON again');
}
