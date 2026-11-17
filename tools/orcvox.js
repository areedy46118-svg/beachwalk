/* THE ORC'S VOICE, COUNTED (2026-11-16, the owner's recordings, `ORC_VOX`). Not part of the game. Run headless:
 *   PB_PORT=4244 sh tools/probe.sh 'evalFile&f=/tools/orcvox.js&n=3600' <out>
 * The tavern loaded, the orc provoked onto you, you standing still and healed, a blow on him every 2.5 s until he
 * dies. The audio clock is driven by the frames (the headless context is suspended). Counts his grunts against the
 * blows he struck, his cries against the blows taken, and when his death cry starts against the ring's sting. */
const N = +(new URLSearchParams(location.search).get('n') || 3600);
const RB = b.ROOM_BACK.tav; RB.load();
for (let i = 0; i < 300 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
if (!RB.ready()) { log('the tavern never loaded'); return; }
RB.place(); for (let i = 0; i < 60; i++) b.frame(1);
const u = b.orcUnit; if (!u) { log('no orc'); return; }
for (let i = 0; i < 200 && !u.model; i++) { b.frame(2); await sleep(50); }
const ctx = b.audioCtx; if (!ctx) { log('no audio context'); return; }
let T = 0; Object.defineProperty(ctx, 'currentTime', { get: () => T, configurable: true });
const K = ['orcSwing', 'orcHit', 'orcDie', 'ringDrop'];
for (let i = 0; i < 100 && K.some((k) => !(b.sampleBanks[k] || []).filter(Boolean).length); i++) { b.frame(1); await sleep(50); }
const bankOf = new Map();
for (const k of K) { const L = (b.sampleBanks[k] || []).filter(Boolean); log('bank', k, L.length); for (const buf of L) bankOf.set(buf, k); }
const played = {}; K.forEach((k) => (played[k] = []));
const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) { const k = this.buffer && bankOf.get(this.buffer); if (k) played[k].push(T); return S0.apply(this, a); };
b.settings.devMode = false;
u.kind.provoke(u, true);
const cam = b.camera.position;
// stand 2.6 m off him, on the side you came in from, so he swings rather than walking round the tables
const dx0 = cam.x - u.g.position.x, dz0 = cam.z - u.g.position.z, l0 = Math.hypot(dx0, dz0) || 1;
const home = [u.g.position.x + dx0 / l0 * 2.6, u.g.position.z + dz0 / l0 * 2.6];
let strikes = 0, hits = 0, was = null, diedAt = -1;
for (let f = 0; f < N; f++) {
  b.lookAt(u.g.position.x, cam.y - 0.2, u.g.position.z);
  if (f > 1800 && f % 150 === 0 && u.st.alive) { hits++; b.hurtMutant(u, u.st.hp > 3 ? 2 : 1, 0.5); }
  b.frame(1); T += 1 / 60; cam.x = home[0]; cam.z = home[1];
  if (b.state().hp < 3) b.heal();
  const s = u.st, A = s.atk >= 0 && u.atk && u.atk[s.swing];
  if (A && was != null && was < A.wind && s.atk >= A.wind) strikes++;
  was = s.atk >= 0 ? s.atk : null;
  if (!s.alive && diedAt < 0) diedAt = T;
  if (f % 600 === 0) log('t', T.toFixed(0), 'awake', s.awake, 'foe', s.foe ? (s.foe.kind.glb || '?').split('/').pop() : '-', 'mine', s.mine, 'atk', s.atk.toFixed(2), 'swing', s.swing, 'd', Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z).toFixed(2), 'roar', (s.roar || 0).toFixed(1), 'hold', u.holdAnim);
  if (diedAt >= 0 && T - diedAt > 4) break;
}
log('over', T.toFixed(0), 's; the orc', u.st.alive ? 'ALIVE hp ' + u.st.hp : 'dead at ' + diedAt.toFixed(1) + ' s');
log('SWING grunts', played.orcSwing.length, 'of', strikes, 'blows he struck', strikes ? '→ ' + (played.orcSwing.length / strikes * 100).toFixed(0) + ' %' : '');
log('HIT cries', played.orcHit.length, 'of', hits, 'blows on him');
log('DEATH cry at', played.orcDie.map((t) => t.toFixed(2)).join(' ') || 'NONE', '| ring sting at', played.ringDrop.map((t) => t.toFixed(2)).join(' ') || 'NONE');
