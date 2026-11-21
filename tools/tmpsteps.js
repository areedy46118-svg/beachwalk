/* THE DESERT'S STEPS (2026-11-21, the owner: "while walking on the temple ground use the church footsteps but have the
 * ambience match. while walking on the sand in the desert have the sand footstep sounds"). The dev teleport; you put at
 * spots on the podium, on its edge, on the sand round it and out on the dunes, the walk let settle your feet, then a step:
 * which bank's buffer it played (counted off createBufferSource) and how long the gate lets it ring.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/tmpsteps.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.devRoom() === 'tmp'); i++) { b.frame(1); await sleep(50); if (i % 40 === 39 && b.devRoom() !== 'tmp') b.devTeleportTemple(); }
log('room', b.devRoom());
for (let i = 0; i < 200 && !((b.sampleBanks.churchStep || []).filter(Boolean).length && (b.sampleBanks.sandStep || []).filter(Boolean).length); i++) await sleep(50);
const ctx = b.audioCtx, CH = new Set(b.sampleBanks.churchStep.filter(Boolean)), SA = new Set(b.sampleBanks.sandStep.filter(Boolean));
let last = null; const orig = ctx.createBufferSource.bind(ctx);
ctx.createBufferSource = () => { const s = orig(); let buf = null; Object.defineProperty(s, 'buffer', { get: () => buf, set: (v) => { buf = v; last = CH.has(v) ? 'church' : SA.has(v) ? 'sand' : 'other'; } }); return s; };
b.KING.probeHold = true;
const X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, R = b.TMP_POD_R || 0;
for (const [lab, lx, lz] of [['podium middle', 0, 0], ['podium 8 m', 8, 0], ['podium edge-0.5', R - 0.5, 0], ['sand edge+1', -(R + 1), 0], ['sand edge+4', -(R + 4), 0], ['dune 40 m', 0, 40], ['dune 90 m', -60, -60]]) {
  b.camera.position.set(X + lx, Y + b.tmpFloorAt(lx, lz) + 1.7, Z + lz);
  for (let i = 0; i < 20; i++) b.frame(1);
  last = null; b.sfxStepTemple();
  const c = b.camera.position; log(lab, 'want r', Math.hypot(lx, lz).toFixed(1), 'at', (c.x - X).toFixed(1), (c.z - Z).toFixed(1), 'feet', (b.camBaseS() - 1.7 - Y).toFixed(2), 'floor', b.tmpFloorAt(c.x - X, c.z - Z).toFixed(2), 'stone?', b.tmpStepOnStone(), 'played', last);
}
log('pod R', R);
