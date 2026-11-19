/* THE RAIN UNDER THE TITLE, MEASURED (2026-11-19, "make the rain less loud in the start scene"): RMS of the rain's own
 * node and of the room's bus, after it has faded up. Run: PB_PORT=4251 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/titlerain.js' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.rainAudio); i++) { try { if (b.audioCtx && b.audioCtx.state !== 'running') await b.audioCtx.resume(); } catch (e) { /* */ } await sleep(100); }
const ctx = b.audioCtx, T = b.TB; if (!T.rainAudio) { log('no rain'); return; }
await sleep(4000);
const rms = async (node) => { const a = ctx.createAnalyser(); a.fftSize = 2048; node.connect(a); const d = new Float32Array(2048); let s = 0, n = 0;
  for (let k = 0; k < 20; k++) { await sleep(50); a.getFloatTimeDomainData(d); for (const v of d) { s += v * v; n++; } } node.disconnect(a); return Math.sqrt(s / n); };
const r = await rms(T.rainAudio.g);
log('ctx', ctx.state, 'rain gain', T.rainAudio.g.gain.value.toFixed(3), 'rain RMS', r.toFixed(4), (20 * Math.log10(r)).toFixed(1), 'dBFS (before the sliders) | rain bus x', T.rainBus.gain.value.toFixed(3), 'master x', T.bus.gain.value.toFixed(3), '→ at the speakers', (20 * Math.log10(r * T.rainBus.gain.value * T.bus.gain.value)).toFixed(1), 'dBFS');
