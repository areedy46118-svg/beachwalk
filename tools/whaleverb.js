/* THE WHALE'S REVERB (2026-11-21, `whaleVerbTick`): the send's level before, inside and after the whale; and, offline, how loud
 * the room is under the dry sound — the owner's flesh hit and a step through the same chain (150 Hz-2.6 kHz, the gut's IR,
 * ×`WHALE_VERB`), RMS of the dry, of the wet, and the wet's tail 0.3-1.5 s after the hit, in dB against the dry's peak.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/whaleverb.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && !(b.state().started && b.audioCtx); i++) { b.frame(1); await sleep(50); }
log('beach: whale send', JSON.stringify(b.spaceVerb));
b.placeInWhale();
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(20); }
log('in the whale (inWhale', b.whaleState().inWhale, '): send', JSON.stringify(b.spaceVerb));
const B = b.sampleBanks, src = (B.fleshHit || []).find(Boolean), step = (B.whaleStep || B.sandStep || B.fleshHit || []).find(Boolean);
const CFG = {
  whale: { secs: 1.55, o: { decay: 3.6, dark: 0.82, pre: 0.022, flutter: 0.034, flutterN: 6, flutterK: 0.2 }, g: b.WHALE_VERB, band: true },
  ship: { secs: 1.05, o: { decay: 6.5, dark: 0.9, pre: 0.004, flutter: 0.011, flutterN: 6, flutterK: 0.3 }, g: 0.55, band: false },
  pipe: { secs: 2.3, o: { decay: 3.6, dark: 0.35, pre: 0.008, flutter: 0.031, flutterN: 14, flutterK: 0.42 }, g: 0.62, band: false },
};
for (const [nm, buf] of [['fleshHit', src], ['a step', step]]) {
  if (!buf) continue;
  const run = async (C) => {
    const oc = new w.OfflineAudioContext(2, Math.ceil((buf.duration + 2.5) * 48000), 48000);
    const s = oc.createBufferSource(); s.buffer = buf;
    if (C) { let head = s; if (C.band) { const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 150; hp.Q.value = 0.5; const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5; head = head.connect(hp).connect(lp); }
      const cv = oc.createConvolver(); cv.buffer = b.makeSpaceIR(oc, C.secs, C.o); const g = oc.createGain(); g.gain.value = C.g; head.connect(cv).connect(g).connect(oc.destination); } else s.connect(oc.destination);
    s.start(0); const r = await oc.startRendering(); return r.getChannelData(0);
  };
  const dry = await run(null);
  const rms = (a, i0 = 0, i1 = a.length) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };
  const end = Math.floor(buf.duration * 48000), dr = rms(dry, 0, end), db = (x) => (20 * Math.log10(x / dr)).toFixed(1);
  for (const k in CFG) { const wet = await run(CFG[k]); log(nm, k, '| wet RMS over the sound', db(rms(wet, 0, end)), 'dB re dry | 0.1-0.4 s after', db(rms(wet, end + 4800, end + 19200)), '| 0.4-1 s after', db(rms(wet, end + 19200, end + 48000))); }
}
b.placeOutOfWhale && b.placeOutOfWhale();
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
log('out: send', JSON.stringify(b.spaceVerb));
for (let i = 0; i < 200; i++) { b.frame(1); await sleep(20); }
log('out, 4 s later: send', JSON.stringify(b.spaceVerb));
