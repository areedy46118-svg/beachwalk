/* Watching the mix while a fight runs. Not part of the game.
 *   load the page with skipIntro, then:  await import('/tools/audiowatch.js'); __awPatch()   (BEFORE beginGame)
 *   after beginGame: __awTap()   then run anything in real time; __awReport()
 * The context renders into a null sink (heard by nobody), every AudioParam
 * write that is not finite is caught with its stack, every exception thrown
 * by a param call is kept, node creation is counted, and an analyser on the
 * master gain samples the level ten times a second. */
(function () {
  const W = window.__aw || (window.__aw = { bad: [], thrown: [], nodes: 0, nodeHist: [], level: [], t0: 0 });   // one state, however often this is imported
  window.__awPatch = () => {
    if (W.patched) return 'already'; W.patched = true;
    const AC = window.AudioContext;
    const Wrap = function (opts) { let c; try { c = new AC(Object.assign({}, opts || {}, { sinkId: { type: 'none' } })); } catch (e) { c = new AC(opts); c.suspend(); W.noSink = String(e); } W.ctx = c; return c; };
    Wrap.prototype = AC.prototype; window.AudioContext = Wrap;
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
    const P = AudioParam.prototype;
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime']) {
      const f = P[m];
      P[m] = function (v, t, k) {
        if (!Number.isFinite(v) || !Number.isFinite(t)) { if (W.bad.length < 30) W.bad.push(m + ' v=' + v + ' t=' + t + ' | ' + new Error().stack.split('\n').slice(2, 5).join(' < ')); }
        try { return f.call(this, v, t, k); } catch (e) { if (W.thrown.length < 30) W.thrown.push(m + ' ' + e.message + ' | ' + new Error().stack.split('\n').slice(2, 5).join(' < ')); throw e; }
      };
    }
    const d = Object.getOwnPropertyDescriptor(P, 'value');
    Object.defineProperty(P, 'value', { get: d.get, set(v) { if (!Number.isFinite(v) && W.bad.length < 30) W.bad.push('value=' + v + ' | ' + new Error().stack.split('\n').slice(2, 5).join(' < ')); d.set.call(this, v); } });
    for (const m of ['createOscillator', 'createGain', 'createBiquadFilter', 'createBufferSource', 'createStereoPanner', 'createPanner', 'createConvolver', 'createWaveShaper', 'createDelay']) {
      const f = BaseAudioContext.prototype[m];
      BaseAudioContext.prototype[m] = function (...a) { W.nodes++; return f.apply(this, a); };
    }
    return 'patched';
  };
  window.__awTap = () => {
    const b = window.__bw, n = b.audioNodes(), c = W.ctx = n.masterGain.context;
    // made before the patch (the title card starts it): send it to no device instead
    if (c.setSinkId && !W.sunk) { W.sunk = true; c.setSinkId({ type: 'none' }).then(() => c.resume()).catch((e) => { W.noSink = String(e); c.suspend(); }); }
    const an = c.createAnalyser(); an.fftSize = 2048; n.masterGain.connect(an);
    const buf = new Float32Array(an.fftSize);
    W.t0 = performance.now(); let lastN = W.nodes;
    clearInterval(W.iv);
    W.iv = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let s = 0, nan = 0; for (let i = 0; i < buf.length; i++) { const v = buf[i]; if (!Number.isFinite(v)) nan++; else s += v * v; }
      W.level.push([+(c.currentTime).toFixed(2), +Math.sqrt(s / buf.length).toFixed(4), nan, c.state, +n.masterGain.gain.value.toFixed(3), W.nodes - lastN]);
      lastN = W.nodes;
      if (W.level.length > 3000) W.level.shift();
    }, 100);
    return c.state + ' ' + (W.noSink || 'null sink');
  };
  window.__awReport = (last = 60) => JSON.stringify({ bad: W.bad.slice(0, 8), thrown: W.thrown.slice(0, 8), nodes: W.nodes, level: W.level.slice(-last).map((r) => r.join(' ')) });
})();
