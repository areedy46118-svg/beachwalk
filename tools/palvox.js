/* THE PALADIN'S VOICE, COUNTED (2026-11-17, the owner's recordings, `PAL_VOX`). Not part of the game. Run headless:
 *   PB_PORT=4255 sh tools/probe.sh 'evalFile&f=/tools/palvox.js' <out>
 * The first castle, the dark knight turned on you, you 3 m off him and healed, a blow on him every 2 s, for 60 s of the
 * frame clock (the audio clock driven by it: the headless context is suspended); then he is killed. Counts his grunts
 * against his blows, his cries against the blows on him, his phrases, and his death. */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
for (const f of b.farmUnitsS()) f.st.awake = false;
b.dkTurn(u, true);
const ctx = b.audioCtx; let T = 0; Object.defineProperty(ctx, 'currentTime', { get: () => T, configurable: true });
const K = ['palAttack', 'palHurt', 'palPhrase', 'palDie'], bankOf = new Map();
for (const k of K) { const L = (b.sampleBanks[k] || []).filter(Boolean); log('bank', k, L.length); for (const x of L) bankOf.set(x, k); }
const played = {}; K.forEach((k) => (played[k] = []));
const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) { const k = this.buffer && bankOf.get(this.buffer); if (k) played[k].push(T); return S0.apply(this, a); };
const cam = b.camera.position, home = [cam.x, cam.z];
let strikes = 0, hits = 0, was = null;
for (let f = 0; f < 3600; f++) {
  b.lookAt(u.g.position.x, cam.y - 0.2, u.g.position.z);
  if (f > 60 && f % 120 === 0 && u.st.alive) { hits++; u.st.hp = Math.max(u.st.hp, 40); b.hurtMutant(u, 1, 0.5); }
  w.__adv(1); T += 1 / 60; cam.x = home[0]; cam.z = home[1]; b.heal();
  const s = u.st, A = s.atk >= 0 && u.atk && u.atk[s.swing];
  if (A && was != null && was < A.wind && s.atk >= A.wind) strikes++;
  was = s.atk >= 0 ? s.atk : null;
}
log('60 s: grunts', played.palAttack.length, 'of', strikes, 'blows he struck | cries', played.palHurt.length, 'of', hits, 'blows on him | phrases', played.palPhrase.length, 'at', played.palPhrase.map((t) => t.toFixed(0)).join(' '));
u.st.hp = 1; b.hurtMutant(u, 5, 1.0);
for (let f = 0; f < 240; f++) { w.__adv(1); T += 1 / 60; }
log('killed: alive', u.st.alive, '| death cries', played.palDie.length, 'at', played.palDie.map((t) => t.toFixed(2)).join(' '));
