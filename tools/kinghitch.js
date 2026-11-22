/* HITCHES IN THE KING'S ARRIVAL (2026-11-21, the perf pass): the dev teleport, the temple let settle, then the real loop (rAF
 * left running, no fixed clock) while you step into his trigger and watch his whole descent and 12 s of the fight; every
 * frame over 25 ms logged with what was compiled and uploaded in it (`renderer.info.programs`, textures, geometries).
 * Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/kinghitch.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { await sleep(50); }
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0), R = b.renderer;
C.position.set(X - 40, Y + F + 1.7, Z); b.camBaseY = C.position.y; b.lookAt(X, Y + F + 2, Z);
await sleep(6000);                                   // (the room's own warm-up, as a player walking up to it would give it)
const progs = () => R.info.programs ? R.info.programs.length : 0;
const MT = {}; let lastP = null, last = performance.now(), p0 = progs(), t0 = R.info.memory.textures, g0 = R.info.memory.geometries, n = 0, over = [];
const tick = () => {
  const now = performance.now(), dt = now - last; last = now; n++;
  const p = progs(), tx = R.info.memory.textures, gg = R.info.memory.geometries;
  if (dt > 25) over.push(`${(n / 60).toFixed(1)}s ${dt.toFixed(0)}ms mode ${b.kingS().mode} swing ${b.kingS().swing}@${(b.kingS().atk || 0).toFixed(2)} +prog ${p - p0} +tex ${tx - t0} +geo ${gg - g0}`);
  const P = b.KING.u && b.KING.u.g.position; if (P && lastP) { const jump = Math.hypot(P.x - lastP.x, P.z - lastP.z); if (jump > 0.25) over.push(`${(n / 60).toFixed(1)}s JUMP ${jump.toFixed(2)} m in one frame (${dt.toFixed(0)} ms) mode ${b.kingS().mode} swing ${b.kingS().swing}@${(b.kingS().atk || 0).toFixed(2)}`); }
  if (P && lastP) { const m = b.kingS().mode + (b.kingS().atk >= 0 ? ':' + b.kingS().swing : ''), v = Math.hypot(P.x - lastP.x, P.z - lastP.z) / Math.max(1e-3, dt / 1000); MT[m] = MT[m] || { n: 0, vmax: 0 }; MT[m].n++; if (dt < 40) MT[m].vmax = Math.max(MT[m].vmax, v); }
  if (P) (lastP || (lastP = P.clone())).copy(P);
  p0 = p; t0 = tx; g0 = gg;
};
const step = async (secs, fn) => { const end = performance.now() + secs * 1000; while (performance.now() < end) { if (fn) fn(); await new Promise((r) => w.requestAnimationFrame(r)); tick(); } };
C.position.set(X - b.KING_TRIGGER * 0.9, Y + F + 1.7, Z); b.camBaseY = C.position.y;
await step(19);
const u = b.KING.u;
// (the fight: stood off him, then walked away every 8 s so he runs you down — his sprint, his dust, his flying kick, his strings)
const FIGHT = +(new URLSearchParams(location.search).get('fight') || 12);
let ft = 0; await step(FIGHT, () => { ft += 1 / 60; const P = u.g.position; if (b.state().hp < 4) b.heal(); if ((ft % 8) > 5.5) { const dx = C.position.x - P.x, dz = C.position.z - P.z, d = Math.hypot(dx, dz) || 1; C.position.x += dx / d * 0.1; C.position.z += dz / d * 0.1; } b.lookAt(P.x, P.y + 1.6, P.z); });
log('modes', JSON.stringify(Object.fromEntries(Object.entries(MT).map(([k, v]) => [k, v.n + ' frames, top ' + v.vmax.toFixed(1) + ' m/s']))));
log('frames', n, '| over 25 ms:', over.length); for (const o of over) log('  ', o);
