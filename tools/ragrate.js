/* THE SAME DEATH AT 30, 60 AND 120 FRAMES A SECOND (2026-11-26; the frame-rate probe of the owner's physics-tuning notes, on this
 * game's own ragdoll). On the open beach a farmer is spawned and killed by `mutRagdoll` itself with the same throw each time —
 * the random draws seeded the same — and the game is stepped at `&fps=` (comma list): where the hips are after 3 s of game
 * time, how far they went, the highest they rose, and when the body slept. The numbers should agree across the rates.
 *   PB_PORT=4244 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/ragrate.js&fps=30,60,120' <out> */
const Q = new URLSearchParams(location.search), RATES = (Q.get('fps') || '30,60,120').split(',').map(Number);
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1000);
b.settings.devMode = true; if (Q.get('old')) w.__ragVar = 1;
// a clock of our own: `ms` a frame
const real = performance.now.bind(performance); let off = 0; w.performance.now = () => real() + off;
const adv = (ms) => { off += ms; b.frame(1); };
const C = b.camera, X = 8; let Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
const rnd0 = Math.random;
for (const fps of RATES) for (const power of [0.9, 1.6]) {
  const ms = 1000 / fps;
  const u = b.mutSpawnTest(X, Z - 3, 'farmer1', 0);
  for (let i = 0; i < 900 && !(u.model && u.mixer); i++) { C.position.set(X, 1.7, Z + 6); b.camBaseY = 1.7; adv(16.7); await sleep(8); }
  for (let i = 0; i < 30; i++) { u.g.position.set(X, u.g.position.y, Z - 3); adv(16.7); }
  let sd = 12345; w.Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  u.st.alive = false; u.st.struck = true; u.st.deadT = 0; u.model.updateMatrixWorld(true);
  b.mutRagdollS(u, 0, -1, power);
  const R = u.rag, H = R.byName.Character1_Hips || R.parts[0], h0 = H.p.clone(); let top = 0, slept = -1;
  for (let t = 0; t < 3.0; t += ms / 1000) { adv(ms); top = Math.max(top, H.p.y - h0.y); if (slept < 0 && R.asleep) slept = t; }
  w.Math.random = rnd0;
  log('fps', fps, 'power', power, '| hips went', Math.hypot(H.p.x - h0.x, H.p.z - h0.z).toFixed(2), 'm (z', (H.p.z - h0.z).toFixed(2), ') | rose', top.toFixed(2), '| asleep at', slept < 0 ? '-' : slept.toFixed(2) + ' s', '| hips over the floor', (H.p.y - (H.floor ?? 0)).toFixed(2));
  u.g.visible = false; u.g.position.y -= 300;
}
log('DONE');
