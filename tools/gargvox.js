/* THE GARGOYLES' VOICES, COUNTED (2026-11-16, the owner's recordings, `GARG_VOX`). Not part of the game. Run headless:
 *   PB_PORT=4245 sh tools/probe.sh 'evalFile&f=/tools/gargvox.js&n=4800' <out>
 * Through the door's conversation (as `gargDoor` clicks it) — when the "drop" plays against the frame the scripted one
 * lands behind Myles — then the fight, you standing at the door healed, and from 20 s a heavy blow on one of them every
 * 3 s until they are dead. The audio clock is driven by the frames (the headless context is suspended). */
const N = +(new URLSearchParams(location.search).get('n') || 4800);
w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch;
const ctx = b.audioCtx; if (!ctx) { log('no audio context'); return; }
let T = 0; Object.defineProperty(ctx, 'currentTime', { get: () => T, configurable: true });
const K = ['gargAttack', 'gargDie', 'gargDrop'];
for (let i = 0; i < 100 && K.some((k) => !(b.sampleBanks[k] || []).filter(Boolean).length); i++) { w.__c13Step(1); await sleep(50); }
const bankOf = new Map();
for (const k of K) { const L = (b.sampleBanks[k] || []).filter(Boolean); log('bank', k, L.length); for (const buf of L) bankOf.set(buf, k); }
const played = {}; K.forEach((k) => (played[k] = []));
const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) { const k = this.buffer && bankOf.get(this.buffer); if (k) played[k].push(T); return S0.apply(this, a); };
let scr = 0; const sc0 = w.OscillatorNode.prototype.start; w.OscillatorNode.prototype.start = function (...a) { scr++; return sc0.apply(this, a); };
const step = (n) => { for (let i = 0; i < n; i++) { w.__c13Step(1); T += 1 / 60; } };
const door = [b.C13_X + A.ax + A.ux * A.L * 0.5, b.C13_Z + A.az + A.uz * A.L * 0.5];
const home = [b.C13_X + A.ax + A.ux * (A.L + 2.0), b.C13_Z + A.az + A.uz * (A.L + 2.0)];
cam.set(home[0], cam.y, home[1]); b.lookAt(door[0], cam.y, door[1]); step(3);
M.stage = 'with'; M.ally = true; M.place = '?';
for (let i = 0; i < 240; i++) { cam.x = home[0]; cam.z = home[1]; b.lookAt(door[0], cam.y, door[1]); step(1); }
b.settings.devMode = false;
b.gargTryDoor();
const D = w.document.getElementById('dialog');
const choose = (k) => { D.click(); const bs = [...D.querySelectorAll('button.choice')]; if (bs[k]) bs[k].click(); };
step(90); choose(0); choose(0);
let landT = -1;
for (let i = 0; i < 300; i++) { step(1); const S = G.scene; if (S && S.phase === 'crouch' && landT < 0) landT = T; }
choose(0); D.click(); D.click();
for (let k = 0; k < 160 && b.state().dialogOpen; k++) step(6);
log('door: landed behind him at', landT.toFixed(2), '| "drop" at', played.gargDrop.map((t) => t.toFixed(2)).join(' ') || 'NONE', '| dialog open', b.state().dialogOpen);
// the fight
const t0 = T, mode = new Map(); let tells = 0, deaths = 0, hits = 0; const alive = new Map();
for (let f = 0; f < N; f++) {
  cam.x = home[0]; cam.z = home[1];
  const us = G.units.filter((u) => u.st.alive);
  if (!us.length) break;
  const near = us[0]; b.lookAt(near.g.position.x, cam.y, near.g.position.z);
  if (T - t0 > 20 && f % 180 === 0) { const v = us.filter((u) => u.gp && !['perch', 'wake', 'drop', 'script'].includes(u.gp.mode)); if (v.length) { hits++; b.hurtMutant(v[0], 9, 1); } }
  step(1);
  if (b.state().hp < 3) b.heal();
  for (const u of G.units) {
    const m = u.gp && u.gp.mode; if (m === 'tell' && mode.get(u) !== 'tell') tells++; mode.set(u, m);
    if (alive.get(u) && !u.st.alive) deaths++; alive.set(u, u.st.alive);
  }
}
const gaps = played.gargAttack.slice(1).map((t, i) => (t - played.gargAttack[i]).toFixed(1));
log('fight', (T - t0).toFixed(0), 's | tells', tells, '| voices off the attack bank', played.gargAttack.length, '(tells, wakes, landed blows, wings) | gaps', gaps.join(' '));
log('deaths', deaths, '| death cries', played.gargDie.length, '| alive at the end', G.units.filter((u) => u.st.alive).length, '| oscillators started (wings etc.)', scr);
