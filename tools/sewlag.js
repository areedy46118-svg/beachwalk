/* RUNNING THROUGH THE SEWER, TIMED (2026-11-26, the owner: "i lagged while running in the sewer fix it"). Into the sewer at the ladder
 * (levers all down, the far side open), then RUN — Shift held — down the near walk, over the bridge, along the far walk, into the
 * branch and back, twice (the second lap is what a player who has been there sees). Every frame's real ms; every frame over
 * `&slow=` (25) is logged with where you were, how many shader programs exist (a new one = a compile), and what the renderer drew.
 *   PB_PORT=4244 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/sewlag.js' <out> */
const Q = new URLSearchParams(location.search), SLOW = +(Q.get('slow') || 25);
b.settings.devMode = true;
// (which vec4 arrays go up, how often, how big: every location named as it is made, every uniform4fv counted by it)
const GL = b.renderer.getContext(), locName = new WeakMap(), u4 = {};
{ const gu = GL.getUniformLocation.bind(GL); GL.getUniformLocation = (pr, nm) => { const l = gu(pr, nm); if (l) locName.set(l, nm); return l; };
  const uf = GL.uniform4fv.bind(GL); GL.uniform4fv = (l, d, ...rest) => { const nm = (l && locName.get(l)) || '?'; const e = u4[nm] || (u4[nm] = { n: 0, f: 0 }); e.n++; e.f += d ? d.length : 0; return uf(l, d, ...rest); }; }
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
b.introDone = true; b.started = true;
w.eval(await (await fetch('/tools/sewer.js?' + Date.now())).text().then((t) => t.replace(/^const b = window.__bw;/m, 'var b = window.__bw;')));
b.loadSewer();
for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
const ov = w.document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
b.sewRestore({ lv: 15 }); b.placeInSewer(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(5); }
const R = b.renderer, S = b.sewG().SEW;
const f0 = b.frame.bind(b); let n = 0; const T = [], slow = [];
const spans = [];
b.frame = (k) => { const w0 = w.performance.now(), t0 = performance.now(), p0 = R.info.programs ? R.info.programs.length : 0, bl0 = (() => { const B = b.bootLeft(); return B.nWarm + '/' + B.tex + '/' + B.parsing + '/' + (B.warm[0] || ''); })(), lw0 = w.__lastWarm; f0(k); const dt = performance.now() - t0; T.push(dt); n++;
  if (dt > SLOW) spans.push([w0, w.performance.now()]);
  if (dt > SLOW) { const s = b.sewS(), p1 = R.info.programs ? R.info.programs.length : 0; slow.push(`#${n} ${dt.toFixed(0)}ms at ${s.lx},${s.lz} programs ${p0}->${p1} calls ${R.info.render.calls} tris ${R.info.render.triangles} geos ${R.info.memory.geometries} tex ${R.info.memory.textures} | boot ${bl0} -> ${(() => { const B = b.bootLeft(); return B.nWarm + '/' + B.tex + '/' + B.parsing + '/' + (B.warm[0] || ''); })()} | mon ${JSON.stringify(b.sewMonS ? b.sewMonS() : null).slice(0, 90)}`); } };
const key = (code, down) => w.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
const lap = [[-1.85, S.BRIDGE_Z], [1.85, S.BRIDGE_Z], [1.85, S.T_Z + 0.3], [S.BR_END + 2.0, S.T_Z - 1.85], [10.2, S.T_Z - 1.85], [S.BR_END + 2.0, S.T_Z - 1.85], [1.85, S.T_Z + 0.3], [1.85, S.BRIDGE_Z], [-1.85, S.BRIDGE_Z], [-1.85, 0.6]];
let prof = null; try { prof = new w.Profiler({ sampleInterval: 1, maxBufferSize: 200000 }); } catch (e) { log('no profiler:', e.message); }
for (let l = 0; l < 2; l++) {
  const m0 = n; key('ShiftLeft', true);
  try { const r = await w.__sw.route(lap, { maxSec: 25 }); log('lap', l + 1, 'legs', r.map((q) => q.ok === false || q.stuck ? 'STUCK' : 'ok').join(' ')); } finally { key('ShiftLeft', false); }
  const L = T.slice(m0).sort((a, c) => a - c);
  log('lap', l + 1, '| frames', L.length, '| ms median', L[L.length >> 1].toFixed(1), 'p95', L[(L.length * 0.95) | 0].toFixed(1), 'worst', L[L.length - 1].toFixed(1), '| over', SLOW, 'ms:', L.filter((x) => x > SLOW).length);
}
// what ran in the slow frames: each sample's whole stack, counted once per function, and its top (self)
if (prof) { const tr = await prof.stop(); const self = {}, incl = {}; let ns = 0;
  const name = (fi) => { const f = tr.frames[fi]; return (f.name || '(anon)') + (f.line ? ':' + f.line : ''); };
  for (const smp of tr.samples) { if (smp.stackId == null || !spans.some(([a, z]) => smp.timestamp >= a && smp.timestamp <= z)) continue; ns++;
    let st = tr.stacks[smp.stackId], top = true; const seen = new Set();
    while (st) { const nm = name(st.frameId); if (top) { self[nm] = (self[nm] || 0) + 1; top = false; } if (!seen.has(nm)) { seen.add(nm); incl[nm] = (incl[nm] || 0) + 1; } st = st.parentId != null ? tr.stacks[st.parentId] : null; } }
  const tb = (o) => Object.entries(o).sort((a, c) => c[1] - a[1]).slice(0, 22).map(([k, v]) => k + ' ' + v).join(' | ');
  log('PROFILE in the slow frames:', ns, 'samples\n  SELF  ' + tb(self) + '\n  INCL  ' + tb(incl)); }
log('uniform4fv over the run (calls, floats):', Object.entries(u4).sort((x, y) => y[1].f - x[1].f).slice(0, 12).map(([k, v]) => k + ' ' + v.n + ' ' + v.f).join(' | '), '| frames', n);
log('SLOW FRAMES', slow.length, '\n  ' + slow.slice(0, 30).join('\n  '));
log('DONE');
