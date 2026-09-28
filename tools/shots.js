/* PREVIEW-PANE STILL SHEETS. Not part of the game.
 *   eval(await (await fetch('/tools/shots.js')).text());
 *   __sheet([{ p: [x, y, z], t: [x, y, z], n: 30, br: 1.8 }, ...], cols, w, h)
 * Each view: camera at p looking at t, `n` real frames run first (a fake clock,
 * never run backwards), grabbed through the game's own frame (post and all).
 * `pre(b)` runs before the frames. Returns 'INFO<json>' + a data URL padded so
 * the harness writes it to a file. */
(function(){
const b = window.__bw;
window.__sheet = function (views, cols = 2, W = 960, H = 540) {
  const T = b.THREE; window.requestAnimationFrame = () => 0;
  const base = performance.now; let fake = base.call(performance); performance.now = () => fake;
  const R = b.renderer, old = new T.Vector2(); R.getSize(old);
  const shots = [], info = [];
  try {
    for (const v of views) {
      if (v.pre) v.pre(b);
      const put = () => { b.camera.position.set(...v.p); b.camBaseY = v.p[1]; b.camera.lookAt(...v.t); b.camera.updateMatrixWorld(true); };
      for (let k = 0; k < (v.n || 20); k++) { fake += 16; put(); b.frame(1); }
      R.setSize(W, H, false); b.camera.aspect = W / H; b.camera.updateProjectionMatrix();
      put(); b.frame(1); put();
      if (v.raw) R.render(b.scene, b.camera);
      const c = R.domElement, cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
      const g = cv.getContext('2d'); if (v.br) g.filter = 'brightness(' + v.br + ')'; g.drawImage(c, 0, 0);
      shots.push(cv); info.push(v.note || '');
      R.setSize(old.x, old.y, false); b.camera.aspect = old.x / old.y; b.camera.updateProjectionMatrix();
    }
  } finally { const off = fake - base.call(performance); performance.now = () => base.call(performance) + off; }
  const w = shots[0].width, h = shots[0].height, rows = Math.ceil(shots.length / cols);
  const sheet = document.createElement('canvas'); sheet.width = w * cols; sheet.height = h * rows;
  const g = sheet.getContext('2d'); shots.forEach((c, k) => g.drawImage(c, (k % cols) * w, ((k / cols) | 0) * h));
  return 'INFO' + JSON.stringify(info) + 'ENDINFO' + sheet.toDataURL('image/jpeg', 0.92) + '#' + 'x'.repeat(120000);
};
})();
