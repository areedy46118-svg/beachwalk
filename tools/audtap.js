/* A TAP ON THE EFFECTS BUS, and the game made silent without touching the output device: the final gate is taken off
 * the speakers and into an analyser that goes nowhere.   await import('/tools/audtap.js'); __audMute(); __audLevel(ms)
 * -> { peak, rms, frames } of what reached the effects bus over `ms` of wall time. */
(function () {
  const W = window;
  W.__audMute = () => {
    const b = W.__bw, ctx = b.audioCtx, N = b.audNodes();
    if (!ctx || !N.gate) return 'no audio';
    try { N.gate.disconnect(); } catch (e) { /* */ }
    W.__audSink = W.__audSink || ctx.createAnalyser(); N.gate.connect(W.__audSink);
    if (!W.__audTap) { W.__audTap = ctx.createAnalyser(); W.__audTap.fftSize = 2048; N.sfx.connect(W.__audTap); }
    document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; });
    return ctx.state;
  };
  W.__audLevel = (ms = 3000) => new Promise((res) => {
    const A = W.__audTap, buf = new Float32Array(A.fftSize); let peak = 0, sum = 0, n = 0, loud = 0;
    const t0 = performance.now();
    const tick = () => {
      A.getFloatTimeDomainData(buf); let m = 0, s = 0;
      for (const v of buf) { m = Math.max(m, Math.abs(v)); s += v * v; }
      peak = Math.max(peak, m); sum += s / buf.length; n++; if (m > 0.01) loud++;
      if (performance.now() - t0 < ms) setTimeout(tick, 20); else res({ peak: +peak.toFixed(4), rms: +Math.sqrt(sum / n).toFixed(5), frames: n, loud });
    };
    tick();
  });
})();
