/* MYLES'S VOICE, COUNTED (2026-11-17, the owner's recordings, `MYLES_VOX`). Not part of the game. Run headless:
 *   PB_PORT=4256 sh tools/probe.sh 'evalFile&f=/tools/mylesvox.js' <out>
 * `minoKneel` (probes.js) — down in XIII's court, on his knee, his lines clicked through, the sketch taken, his death —
 * with every take of his three banks counted as it starts, against the dialog text shown at that moment. */
const ctx = b.audioCtx; if (ctx) Object.defineProperty(ctx, 'currentTime', { get: () => performance.now() / 1000, configurable: true });
const K = ['mylesGrunt', 'mylesTalk', 'mylesDie'], bankOf = new Map(), played = [];
const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) {
  if (!bankOf.size) for (const k of K) for (const x of (b.sampleBanks[k] || []).filter(Boolean)) bankOf.set(x, k);
  const k = this.buffer && bankOf.get(this.buffer);
  if (k) { const el = w.document.getElementById('dialog-text'); played.push(k + ' @ ' + JSON.stringify(((el && el.textContent) || '').slice(0, 30)) + ' stage ' + b.MINO.stage); }
  return S0.apply(this, a);
};
const P = await import('/tools/probes.js?' + Date.now());
await P.minoKneel({ w, b, log, sleep, shot: () => {} });
log('MYLES takes', played.length); for (const p of played) log('  ', p);
