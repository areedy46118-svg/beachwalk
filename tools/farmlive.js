/* FARMER LOOK HARNESS. Not part of the game.
 *   eval(await (await fetch('/tools/farmlive.js')).text()); __studio(unit, ['mHWalk', ...], 7)
 * Each clip scrubbed in a lit studio with nothing else in the scene: two
 * directional lights (a pooled point light lights nothing here). */
(function () {
const b = window.__bw, R = b.renderer, T = b.THREE;
window.__studio = function (u, names, n = 7, W = 170, H = 230, yaw = 0.7) {
  window.requestAnimationFrame = () => 0;
  const sc = new T.Scene(); sc.background = new T.Color(0x2a2e36);
  sc.add(new T.HemisphereLight(0xc8d0e0, 0x302820, 1.6));
  const d1 = new T.DirectionalLight(0xffffff, 2.2); d1.position.set(3, 5, 4); sc.add(d1);
  const d2 = new T.DirectionalLight(0xffc890, 1.0); d2.position.set(-4, 2, -2); sc.add(d2);
  const g = u.g, par = g.parent, pos = g.position.clone(), rot = g.rotation.y, vis = g.visible;
  sc.add(g); g.position.set(0, 0, 0); g.rotation.y = yaw; g.visible = true;
  const old = new T.Vector2(); R.getSize(old); const pr = R.getPixelRatio();
  R.setPixelRatio(1); R.setSize(W, H, false);
  const h = u.kind.h || 1.8, cam = new T.PerspectiveCamera(34, W / H, 0.1, 100);
  cam.position.set(0, h * 0.6, h * 2.9); cam.lookAt(0, h * 0.5, 0);
  const sheet = document.createElement('canvas'); sheet.width = W * n + 60; sheet.height = H * names.length;
  const sg = sheet.getContext('2d'); sg.fillStyle = '#000'; sg.fillRect(0, 0, sheet.width, sheet.height);
  sg.fillStyle = '#fff'; sg.font = '11px monospace';
  const acts = u.mixer._actions, keep = acts.map((a) => [a, a.enabled, a.weight, a.time, a.paused, a.isRunning()]);
  const rawU = u.mixer.rawUpdate || u.mixer.update;
  try {
    names.forEach((nm, row) => {
      const a = u.clips[nm]; sg.fillText(nm, 2, row * H + 12);
      if (!a) return;
      for (const x of acts) { x.stop(); x.enabled = false; }
      a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
      const d = a.getClip().duration;
      for (let i = 0; i < n; i++) {
        a.time = d * i / (n - 1); rawU.call(u.mixer, 0);
        if (u.mixer.update !== rawU) { /* the life layer on top, as in the game */ }
        g.updateMatrixWorld(true); R.render(sc, cam); sg.drawImage(R.domElement, 60 + i * W, row * H);
      }
      sg.fillText(d.toFixed(2) + 's', 2, row * H + 26);
    });
  } finally {
    for (const [a, en, w, tm, ps, run] of keep) { a.enabled = en; a.weight = w; a.time = tm; a.paused = ps; if (run) a.play(); else a.stop(); }
    R.setPixelRatio(pr); R.setSize(old.x, old.y, false);
    par.add(g); g.position.copy(pos); g.rotation.y = rot; g.visible = vis;
  }
  return sheet.toDataURL('image/jpeg', 0.8) + '#' + 'x'.repeat(120000);
};
})();
