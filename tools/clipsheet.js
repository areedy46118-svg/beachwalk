/* A CREATURE'S CLIPS AS STRIPS. Not part of the game.
 *   eval(await (await fetch('/tools/clipsheet.js')).text()); __clipSheet(unit, ['kPunch', ...], 8)
 * Each clip is scrubbed at n evenly spaced times with every other action off,
 * rendered from the creature's side, one row per clip. */
(function () {
const b = window.__bw, R = b.renderer, T = b.THREE;
window.__clipSheet = function (u, names, n = 8, W = 200, H = 260, side = 1) {
  window.requestAnimationFrame = () => 0;
  const old = new T.Vector2(); R.getSize(old); const pr = R.getPixelRatio();
  R.setPixelRatio(1); R.setSize(W, H, false);
  const cam = new T.PerspectiveCamera(40, W / H, 0.1, 100);
  const g = u.g, p = g.position.clone();
  const fwd = new T.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
  const rgt = new T.Vector3(fwd.z, 0, -fwd.x).multiplyScalar(side);
  const h = u.kind.h || 2;
  cam.position.copy(p).addScaledVector(rgt, h * 2.4).addScaledVector(fwd, h * 0.6); cam.position.y += h * 0.55;
  cam.lookAt(p.x + fwd.x * h * 0.3, p.y + h * 0.5, p.z + fwd.z * h * 0.3);
  const sheet = document.createElement('canvas'); sheet.width = W * n + 60; sheet.height = H * names.length;
  const sg = sheet.getContext('2d'); sg.fillStyle = '#000'; sg.fillRect(0, 0, sheet.width, sheet.height);
  sg.fillStyle = '#fff'; sg.font = '11px monospace';
  const acts = u.mixer._actions, keep = acts.map((a) => [a, a.enabled, a.weight, a.time, a.paused, a.isRunning()]);
  const upd = u.mixer.update; const rawU = u.mixer.rawUpdate || upd;
  const light = new T.PointLight(0xffffff, 60, 30); light.position.copy(cam.position); b.scene.add(light);
  try {
    names.forEach((nm, row) => {
      const a = u.clips[nm]; sg.fillText(nm, 2, row * H + 12);
      if (!a) return;
      for (const x of acts) { x.stop(); x.enabled = false; }
      a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
      const d = a.getClip().duration;
      for (let i = 0; i < n; i++) {
        a.time = d * i / (n - 1);
        rawU.call(u.mixer, 0);
        g.updateMatrixWorld(true);
        R.render(b.scene, cam);
        sg.drawImage(R.domElement, 60 + i * W, row * H);
      }
      sg.fillText(d.toFixed(2) + 's', 2, row * H + 26);
    });
  } finally {
    b.scene.remove(light);
    for (const [a, en, w, tm, ps, run] of keep) { a.enabled = en; a.weight = w; a.time = tm; a.paused = ps; if (run) a.play(); else a.stop(); }
    R.setPixelRatio(pr); R.setSize(old.x, old.y, false);
  }
  return sheet.toDataURL('image/jpeg', 0.8) + '#' + 'x'.repeat(120000);
};
})();
