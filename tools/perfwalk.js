/* THE WHOLE WALK, TIMED (2026-11-15, the owner: "optimize performance and load times of the entire game. i want no lag at
 * any moment"). Run as `sh tools/probe.sh 'evalFile&f=/tools/perfwalk.js'`: boots, waits for the far rest to be in,
 * then walks the beach from the spawn to the castle merchant on the real clock at `&v=` m/s (8), turning the head
 * now and then, and logs every frame-to-frame gap over `&over=` ms (25) with the game's own named spans in it.
 * Dev mode (no cuts on the walk: a real game builds those under their black). */
const q = new URLSearchParams(location.search), V = +(q.get('v') || 8), OVER = +(q.get('over') || 25);
const z0 = +(q.get('z0') || -20), z1 = q.get('z1') ? +q.get('z1') : b.TRADER2_Z + 6;
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const left = () => (b.startGate ? b.startGate().left : 0);
const t0 = performance.now();
for (let i = 0; i < 2400 && left() > 0; i++) { b.frame(1); await sleep(16); }
log('far rest in after', ((performance.now() - t0) / 1000).toFixed(1), 's; left', left());
w.requestAnimationFrame = () => 0;
const tick = () => new Promise((r) => setTimeout(r, 0));
for (let i = 0; i < 60; i++) { b.frame(1); await tick(); }
const PROF = q.get('prof') ? q.get('prof').split(',').map(Number) : null; let PR = null, PRdone = false, PRtrace = null; const PRslow = [];
const out = [], ms = []; let z = z0, last = performance.now(), prevEnd = performance.now(); const tStart = performance.now();
while (z > z1) {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  z -= V * dt; const x = 6 + Math.sin(z * 0.013) * 3;
  const yaw = Math.sin(z * 0.004) * 1.2;
  b.camera.position.set(x, b.beachGroundAt ? b.beachGroundAt(x, z) + 1.7 : 1.7, z); b.camBaseY = b.camera.position.y; b.look(yaw, 0);
  if (PROF && !PR && z < PROF[0]) PR = new w.Profiler({ sampleInterval: 1, maxBufferSize: 600000 });
  if (PR && !PRdone && z < PROF[1]) { PRdone = true; PRtrace = await PR.stop(); }
  const RI = b.renderer.info, pg0 = RI.programs ? RI.programs.length : 0, tx0 = RI.memory.textures, ge0 = RI.memory.geometries;
  const ta = performance.now(), gap = ta - prevEnd; b.frame(1); const tb = performance.now(); prevEnd = tb;
  const dPg = (RI.programs ? RI.programs.length : 0) - pg0, dTx = RI.memory.textures - tx0, dGe = RI.memory.geometries - ge0;
  const newPg = dPg > 0 ? RI.programs.slice(-dPg).map((p2) => p2.name || p2.cacheKey.slice(0, 30)).join('/') : '';
  if (PR && !PRdone && gap + (tb - ta) > OVER) PRslow.push([ta - (gap), tb]);
  ms.push(gap + (tb - ta));
  if (gap + (tb - ta) > OVER) out.push([Math.round(z), Math.round(gap), Math.round(tb - ta), Math.round(ta - tStart), dPg, dTx, dGe, newPg]);
  await tick();
}
const s = ms.slice().sort((a, c) => a - c), qq = (f) => s[Math.floor((s.length - 1) * f)].toFixed(1);
log('WALK frames', ms.length, 'med', qq(0.5), 'p95', qq(0.95), 'p99', qq(0.99), 'max', qq(1), 'over33', ms.filter((x) => x > 33).length, 'over50', ms.filter((x) => x > 50).length);
const spans = (b.lagTime ? b.lagTime(16) : []).filter((e) => e[0] > tStart - 50);   // [t0, ms, name]
for (const g of out) {
  const tAbs = tStart + g[3];
  const near = spans.filter((e) => e[0] > tAbs - g[1] - 40 && e[0] < tAbs + g[2] + 5).map((e) => e[2] + ' ' + e[1]).slice(0, 4).join(' | ');
  log('GAP z', g[0], 'gap', g[1], 'frame', g[2], 'new programs', g[4], g[7] || '', 'textures', g[5], 'geoms', g[6], near ? '<- ' + near : '');
}

// (&prof=z0,z1: the JS sampling profiler over that stretch; what the CPU was doing inside the slow frames, by function)
if (PRtrace) {
  const tr = PRtrace, nm = (fi) => { const f = tr.frames[fi]; return (f.name || '(anon)') + ':' + (f.line || 0); };
  const inSlow = (t) => PRslow.some(([a2, c2]) => t >= a2 && t <= c2);
  const self = new Map(), incl = new Map(); let n = 0;
  for (const smp of tr.samples) {
    if (smp.stackId == null || !inSlow(smp.timestamp)) continue; n++;
    const k = nm(tr.stacks[smp.stackId].frameId); self.set(k, (self.get(k) || 0) + 1);
    const seen = new Set(); for (let id = smp.stackId; id != null; id = tr.stacks[id].parentId) { const kk = nm(tr.stacks[id].frameId); if (!seen.has(kk)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + 1); } }
  }
  const top = (m, k) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, k).map(([kk, v]) => kk + ' ' + v).join(' · ');
  log('PROF slow frames', PRslow.length, 'samples in them', n);
  log('SELF', top(self, 20));
  log('INCL', top(incl, 40));
}
