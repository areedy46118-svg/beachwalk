/* THE DEEP, from the harness. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute();
 *   eval(await (await fetch('/tools/deepshot.js')).text()); __dpBoot();
 *   __dpHook(z)                 rod in hand at the waterline by the tree, the float in the glow, and it takes
 *   __dpTo(ph, t)               runs frames until the deep's clock reads phase `ph` at `t` seconds (or gives up)
 *   __dpShot(w)                 the current frame as padded base64
 *   __dpSheet([[ph, t], ...], cols)   one frame per (phase, time), labelled */
(function () {
  const b = window.__bw;
  window.__dpBoot = () => {
    b.beginGame(); b.settings.devMode = true;
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0;
    performance.now = () => base + (off += 0.002);   // creeps on every read: a frozen clock hangs the title's warm loop
    window.__adv = (k, ms = 16.7) => { for (let i = 0; i < k; i++) { off += ms; b.frame(1); } };
    window.__adv(5);
    return 'ok';
  };
  window.__dpHook = (z = -846) => {
    if (!b.inventory.includes(b.fishingRodItem)) b.addToInventory(b.fishingRodItem);
    if (b.state().equipped !== b.fishingRodItem) b.toggleEquip(b.fishingRodItem);
    b.camera.position.set(-1.6, 1.7, z); b.look(Math.PI / 2, -0.12); window.__adv(20);
    const R = b.rodState(); R.st = 'down'; R.wet = true; R.pos.set(-19, -0.3, z + 1); b.rodFloat.visible = true;
    b.startDeepHook(); window.__adv(2);
    return b.deepS().ph;
  };
  const order = ['hook', 'pull', 'plunge', 'descent', 'silence', 'fight', 'after', 'drown', 'black', 'wash'];
  window.__dpTo = (ph, t = 0, max = 6000) => {
    for (let n = 0; n < max; n++) {
      const D = b.deepS();
      if (!D.ph) return 'ended';
      if (order.indexOf(D.ph) > order.indexOf(ph) || (D.ph === ph && D.t >= t)) return D.ph + ' ' + D.t.toFixed(2);
      window.__adv(1);
    }
    return 'gave up at ' + b.deepS().ph + ' ' + b.deepS().t.toFixed(2);
  };
  window.__dpShot = (w = 640) => {
    const cv = b.renderer.domElement, h = Math.round(w * cv.height / cv.width);
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    o.getContext('2d').drawImage(cv, 0, 0, w, h);
    return o.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
  window.__dpSheet = (shots, cols = 3, w = 360) => {
    const cv = b.renderer.domElement, h = Math.round(w * cv.height / cv.width), rows = Math.ceil(shots.length / cols);
    const out = document.createElement('canvas'); out.width = cols * w; out.height = rows * (h + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    shots.forEach(([ph, t], i) => {
      const r = window.__dpTo(ph, t);
      const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 14);
      g.drawImage(cv, x, y, w, h);
      const D = b.deepS(), c = b.camera.position;
      g.fillStyle = '#9f9'; g.fillText(`${r} y${c.y.toFixed(1)} x${c.x.toFixed(1)}`, x + 3, y + h + 11);
    });
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
