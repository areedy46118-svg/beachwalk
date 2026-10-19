/* THE GAME IN A SILENT FRAME. Not part of the game. Open a same-origin page with no game on it (/README.md), then:
 *   await import('/tools/silentframe.js');
 *   await __sfLoad(() => sessionStorage.setItem('beachwalk.load', 'checkpoint'))   // (re)load the game in an iframe
 *   __sfW()                       // the frame's window (its __bw)
 *   __sfLevels()                  // 'startMusic=0.012,startSamScore=0.07,...' — what reaches the speakers, by who connected it
 * Every connect(destination) in the frame is caught before the module runs and goes into an analyser instead, and
 * every media element plays muted: nothing is heard. Session storage is shared with the frame; so is localStorage —
 * back up `beachwalk.save` before anything that saves (it is the owner's checkpoint). */
(function () {
  const W = window;
  W.__sfDests = [];
  W.__sfLvl = (an) => { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); return +m.toFixed(4); };
  W.__sfLevels = () => W.__sfDests.map((d) => d.who + '=' + W.__sfLvl(d.an)).join(',');
  W.__sfW = () => { const f = document.querySelector('iframe#sf'); return f && f.contentWindow; };
  W.__sfLoad = async (setup, timeout = 15000) => {
    let f = document.querySelector('iframe#sf');
    if (!f) { f = document.createElement('iframe'); f.id = 'sf'; f.style.cssText = 'width:960px;height:600px;border:0'; document.body.appendChild(f); }
    try { const b = f.contentWindow.__bw; if (b && b.audioCtx) await b.audioCtx.close(); } catch (e) { /* */ }
    W.__sfDests.length = 0;
    f.src = 'about:blank'; await new Promise((r) => setTimeout(r, 300));
    if (setup) setup();
    W.__sfT0 = performance.now();
    f.src = '/index.html';
    return new Promise((res) => {
      const iv = setInterval(() => {
        try {
          const w = f.contentWindow;
          if (!(w && w.location.href.includes('index.html') && !w.__bw && !w.__tapped && w.AudioNode)) return;
          const oc = w.AudioNode.prototype.connect;
          w.AudioNode.prototype.connect = function (d, ...a) {
            if (d instanceof w.AudioDestinationNode) {
              const an = this.context.createAnalyser(); an.fftSize = 2048;
              W.__sfDests.push({ n: this, an, who: ((new Error().stack || '').split('\n')[2] || '').trim().replace(/^at /, '').split(' ')[0] });
              oc.call(this, an); return an;
            }
            return oc.call(this, d, ...a);
          };
          const play = w.HTMLMediaElement.prototype.play;
          w.HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this); };
          w.__tapped = true; clearInterval(iv); res(true);
        } catch (e) { /* not there yet */ }
      }, 1);
      setTimeout(() => { clearInterval(iv); res(false); }, timeout);
    });
  };
})();
