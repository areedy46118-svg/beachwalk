/* HENRY ON THE JETTY, AND THE EAGLE, from the harness. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute();
 *   eval(await (await fetch('/tools/hjshot.js')).text()); await __hjBoot();
 *   __hjTalk()                  stands you 4 m behind him on the jetty and opens his conversation
 *   __hjClick()                 one click on the dialog box (finishes the typing, or goes on / ends it)
 *   __hjChoose(i)               picks choice i
 *   __hjSheet([t, ...], cols)   runs the take on the fake clock and draws the player's view at each t (s) -> padded base64
 *   __hjTrack(dt)               runs the take to its end and returns its track: [t, phase, eagle xyz, henry pelvis xyz, cam dist] */
(function () {
  const b = window.__bw;
  window.__hjBoot = async () => {
    b.beginGame(); b.settings.devMode = true;
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0;
    performance.now = () => base + off;
    window.__adv = (k, ms = 16.7) => { for (let i = 0; i < k; i++) { off += ms; b.frame(1); } };
    b.loadIsle();
    for (let i = 0; i < 200 && !b.isleS().ready; i++) { window.__adv(1); await new Promise((r) => setTimeout(r, 120)); }
    b.setHenryFree(2);
    window.__hjStand();
    for (let i = 0; i < 200 && !(b.hjS().loaded && b.hjS().eagle); i++) { window.__adv(1); await new Promise((r) => setTimeout(r, 120)); }
    window.__hjStand(); window.__adv(20);
    return b.hjS();
  };
  window.__hjStand = (x = -24.2, z = -1156.4) => {
    b.isleReset(); b.camera.position.set(x, 0.41 + 1.6, z); b.isleRestoreAt(x, 0.41 + 1.6, z); b.look(0, 0); window.__adv(2);
    return b.camera.position.toArray().map((v) => +v.toFixed(2));
  };
  window.__hjTalk = () => { window.__hjStand(); b.hjTalk(); window.__adv(30); return b.hjS(); };
  window.__hjClick = () => { document.getElementById('dialog').click(); window.__adv(2); return b.hjS(); };
  window.__hjChoose = (i = 0) => { const c = document.querySelectorAll('#dialog .choice'); if (c[i]) c[i].click(); window.__adv(2); return b.hjS(); };
  window.__hjSheet = (times, cols = 4, w = 360) => {
    const cv = b.renderer.domElement, h = Math.round(w * cv.height / cv.width), rows = Math.ceil(times.length / cols);
    const out = document.createElement('canvas'); out.width = cols * w; out.height = rows * (h + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    times.forEach((T, i) => {
      for (let n = 0; n < 3000 && b.hjS().cut && b.hjS().t < T; n++) window.__adv(1);
      const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 14);
      g.drawImage(cv, x, y, w, h);
      const s = b.hjS(); g.fillStyle = '#9f9'; g.fillText(`t${T} ${s.cut || '-'} ${b.hjG().hj ? b.hjG().hj.mode : ''} fov${b.camera.fov.toFixed(0)}`, x + 3, y + h + 11);
    });
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
  window.__hjTrack = (step = 0.25) => {
    const T = []; const V = b.camera.position.constructor; let next = 0;
    for (let n = 0; n < 6000 && b.hjS().cut; n++) {
      window.__adv(1);
      const s = b.hjS(); if (!s.cut || s.t < next) continue; next += step;
      const G = b.hjG(), e = G.eagle.g.position, hp = G.hj.B.CC_Base_Pelvis.getWorldPosition(new V());
      T.push([s.t, s.cut, G.hj.mode, ...e.toArray().map((v) => +v.toFixed(1)), ...hp.toArray().map((v) => +v.toFixed(1)), +hp.distanceTo(b.camera.position).toFixed(0)]);
    }
    return T;
  };
})();
