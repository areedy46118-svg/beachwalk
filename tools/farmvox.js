/* THE FARMERS' VOICES, COUNTED (2026-11-16, the owner's recordings, `farmVox`). Not part of the game. Run headless:
 *   PB_PORT=4243 sh tools/probe.sh 'evalFile&f=/tools/farmvox.js&n=5400' <out>
 * A natural fight in the street, you standing still and healed, and every 2.5 s a blow on one of the men out (so they
 * are hurt and die). The audio clock is driven by the frames (the headless context is suspended). Per bank: how many
 * takes played against how many chances (blows struck, men hurt, men killed), the gaps between shouts, and the most
 * farmer voices at once. */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 5400);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().length >= 20 && units().every((u) => u.model)); i++) { w.__adv(2); await sleep(30); }
const ctx = b.audioCtx;
if (!ctx) { log('no audio context'); return; }
let T = 0; Object.defineProperty(ctx, 'currentTime', { get: () => T, configurable: true });
for (let i = 0; i < 100 && ['farmSwing', 'farmHit', 'farmShout', 'farmDie'].some((k) => !(b.sampleBanks[k] || []).filter(Boolean).length); i++) { w.__adv(1); await sleep(50); }
const bankOf = new Map();
for (const k of ['farmSwing', 'farmHit', 'farmShout', 'farmDie']) { const L = (b.sampleBanks[k] || []).filter(Boolean); log('bank', k, L.length); for (const buf of L) bankOf.set(buf, k); }
const played = { farmSwing: [], farmHit: [], farmShout: [], farmDie: [] }, on = [];
let maxOn = 0, osc = 0;
const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) {
  const k = this.buffer && bankOf.get(this.buffer);
  if (k) { played[k].push(T); const end = T + this.buffer.duration / this.playbackRate.value; for (let i = on.length - 1; i >= 0; i--) if (on[i] <= T) on.splice(i, 1); on.push(end); maxOn = Math.max(maxOn, on.length); }
  return S0.apply(this, a);
};
const O0 = w.OscillatorNode.prototype.start; w.OscillatorNode.prototype.start = function (...a) { osc++; return O0.apply(this, a); };
b.settings.devMode = false;
const P = b.dkSlotS(); if (P.unit) { P.unit.st.awake = false; P.unit.g.visible = false; }
const cam = b.camera.position, home = [cam.x, cam.z];
let strikes = 0, hits = 0, deaths = 0;
const was = new Map(), alive = new Map();
for (let f = 0; f < N; f++) {
  const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
  let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
  if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
  if (f % 150 === 75 && us.length) { const u = us[(Math.random() * us.length) | 0]; hits++; b.hurtMutant(u, 1, 0.5); }
  w.__adv(1); T += 1 / 60; cam.x = home[0]; cam.z = home[1];
  if (b.state().hp < 3) b.heal();
  if (P.unit) P.unit.st.awake = false;
  for (const u of units()) {
    const s = u.st, A = s.atk >= 0 && u.atk && u.atk[s.swing], a0 = was.get(u);
    if (A && a0 != null && a0 < A.wind && s.atk >= A.wind && u.kind.voice.farm) strikes++;
    was.set(u, s.atk >= 0 ? s.atk : null);
    if (alive.get(u) && !s.alive && u.kind.voice.farm) deaths++;
    alive.set(u, s.alive);
  }
}
const gaps = played.farmShout.slice(1).map((t, i) => (t - played.farmShout[i]).toFixed(1));
log('over', (N / 60).toFixed(0), 's of fight');
log('SWING grunts', played.farmSwing.length, 'of', strikes, 'blows struck by the men →', strikes ? (played.farmSwing.length / strikes * 100).toFixed(0) + ' %' : '-');
log('HIT cries', played.farmHit.length, 'of', hits, 'blows on them');
log('DEATH cries', played.farmDie.length, 'of', deaths, 'men killed');
log('SHOUTS', played.farmShout.length, 'at', played.farmShout.map((t) => t.toFixed(0)).join(' '), '| gaps', gaps.join(' '));
log('most farmer voices at once', maxOn, '| oscillators started (bell, synth)', osc);
