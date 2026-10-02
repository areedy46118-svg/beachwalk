/* THE WHALE'S FAREWELL, on a fake clock. Not part of the game.
 *   eval(await (await fetch('/tools/wftest.js')).text()); await __wfSetup();
 *   __wfTo(S)         step the take until the song's mapped clock reaches S (old-clock seconds), return state
 *   __wfShot(W, H)    a padded base64 jpeg of the canvas as the player sees it */
(function () {
  const b = window.__bw;
  window.__wfSetup = async () => {
    b.beginGame && b.beginGame(); await new Promise((r) => setTimeout(r, 300));
    b.settings.devMode = true;
    window.requestAnimationFrame = () => 0;
    const rn = performance.now.bind(performance); const base0 = rn(); let off = 0;
    performance.now = () => base0 + off; window.__wfClock = { add: (ms) => { off += ms; } };
    b.placeInWhale();
    for (let i = 0; i < 30; i++) { off += 16.7; b.frame(1); }
    b.startWhaleFarewell();
    for (let i = 0; i < 5; i++) { off += 16.7; b.frame(1); }
    return b.wfState();
  };
  // the song's real position onto the take's own clock (the same map as `wfMapS`)
  const MAP = [[39.0, 5.5], [50.0, 18.15], [57.5, 27.45], [68.0, 36.6], [81.5, 52.4]];
  const mapS = (s) => { if (s <= MAP[0][0]) return MAP[0][1] + (s - MAP[0][0]); for (let i = 1; i < MAP.length; i++) if (s <= MAP[i][0]) { const [a0, b0] = MAP[i - 1], [a1, b1] = MAP[i]; return b0 + (s - a0) * (b1 - b0) / (a1 - a0); } const [aL, bL] = MAP[MAP.length - 1]; return bL + (s - aL); };
  window.__wfTo = (S, max = 6000) => {
    let n = 0, st = null;
    while (n++ < max) {
      window.__wfClock.add(16.7); b.frame(1);
      st = b.wfState(); if (!st) break;
      if (st.S != null && mapS(st.S) >= S) break;
    }
    st = b.wfState();
    return { S: st && st.S != null ? +mapS(st.S).toFixed(2) : null, song: st && st.S, cue: st && Object.keys(st.cue).filter((k) => st.cue[k]).join(' '), ended: !st, gone: b.wbGoneG(), art: b.artState(), artWorld: !!(b.art && b.art.world), drop: b.art && b.art.drop, frames: n };
  };
  window.__wfShot = (W = 640, H = 360) => { const c = b.renderer.domElement; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(c, 0, 0, W, H); const d = g.getImageData(0, 0, W, H); for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.min(255, d.data[i] * 1.8); d.data[i + 1] = Math.min(255, d.data[i + 1] * 1.8); d.data[i + 2] = Math.min(255, d.data[i + 2] * 1.8); } g.putImageData(d, 0, 0); return cv.toDataURL('image/jpeg', 0.8).split(',')[1] + '#' + 'x'.repeat(120000); };
})();
