/* THE MORNING AFTER THE CALL, as the player sees it. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute();
 *   eval(await (await fetch('/tools/wakeshot.js')).text()); __wakeBoot();
 *   __wakeSheet([t, ...], cols, w)   runs the take on a fake clock and draws it at each t (seconds),
 *                                    with the canvas's CSS blur/brightness and the blackout over it */
(function () {
  const b = window.__bw;
  window.__wakeBoot = () => {
    if (b.beginGame) b.beginGame();
    b.settings.devMode = true;
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0;
    performance.now = () => base + off;
    window.__wadv = (k) => { for (let i = 0; i < k; i++) { off += 33.3; b.frame(1); } };
    b.startWakeCut();
    return b.wakeS();
  };
  window.__wakeSheet = (times, cols = 4, w = 420) => {
    const cv = b.renderer.domElement, bo = document.getElementById('blackout');
    const h = Math.round(w * cv.height / cv.width), rows = Math.ceil(times.length / cols);
    const out = document.createElement('canvas'); out.width = cols * w; out.height = rows * (h + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    times.forEach((T, i) => {
      for (let n = 0; n < 4000 && b.wakeS().t >= 0 && b.wakeS().t < T; n++) window.__wadv(1);
      const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 14), f = cv.style.filter;
      g.filter = f ? f.replace(/blur\(([\d.]+)px\)/, (m, p) => `blur(${(+p * w / (cv.clientWidth || cv.width)).toFixed(2)}px)`) : 'none';
      g.drawImage(cv, x, y, w, h); g.filter = 'none';
      const a = +bo.style.opacity || 0; if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(x, y, w, h); }
      g.fillStyle = '#9f9'; g.fillText('t' + T + ' ' + f.slice(0, 40), x + 3, y + h + 11);
    });
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
