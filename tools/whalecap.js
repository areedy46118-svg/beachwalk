/* THE WHALE ON THE SAND: a swallow, captured. Not part of the game.
 *   eval(await (await fetch('/tools/whalecap.js')).text()); __swallowSheet([0.6, 1.3, ...])
 * Stands you in front of its mouth, presses Enter, and runs whole frames on a
 * fake clock (the swallow is on the wall clock), grabbing the canvas at each
 * time. Returns 'INFO<json>ENDINFO' + a padded data URL. */
(function () {
const b = window.__bw;
window.__swallowSheet = function (at = [0.6, 1.3, 1.9, 2.4, 2.9, 3.3, 4.6, 6.8], br = 1.5, W0 = 640, H0 = 360) {
  const W = b.wbGet(), G = W.G, T = b.THREE;
  b.settings.devMode = true; b.fallbackLook = true;
  window.requestAnimationFrame = () => 0;
  const base = performance.now; let fake = base.call(performance); performance.now = () => fake;
  const R = b.renderer, old = new T.Vector2(); R.getSize(old);
  const shots = [], info = [];
  try {
    const sn = G.position, dir = new T.Vector3(1, 0, 0.12).normalize();
    b.camera.position.set(Math.min(13.6, sn.x + dir.x * 4.2), 1.7, sn.z + dir.z * 4.2); b.camBaseY = 1.7;
    const m = G.localToWorld(new T.Vector3(0, 1.0, -1.5)); b.lookAt(m.x, m.y, m.z);
    for (let i = 0; i < 20; i++) { fake += 16; b.frame(1); }
    info.push('hover ' + JSON.stringify(b.state().hovered));
    R.setSize(W0, H0, false); b.camera.aspect = W0 / H0; b.camera.updateProjectionMatrix();
    const grab = (note) => {
      const c = R.domElement, cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
      const g = cv.getContext('2d'); g.filter = 'brightness(' + br + ')'; g.drawImage(c, 0, 0); shots.push(cv);
      info.push(note + ' blk=' + document.getElementById('blackout').style.opacity + ' jaw=' + W.jaw.toFixed(2) + ' cam=' + b.camera.position.toArray().map((v) => v.toFixed(2)).join(','));
    };
    b.startSwallow();
    let t = 0;
    for (const target of at) { while (t < target) { fake += 16; t += 0.016; b.frame(1); } grab('t' + target); }
  } finally {
    const off = fake - base.call(performance); performance.now = () => base.call(performance) + off;
    R.setSize(old.x, old.y, false); b.camera.aspect = old.x / old.y; b.camera.updateProjectionMatrix();
  }
  const w = shots[0].width, h = shots[0].height, rows = Math.ceil(shots.length / 2);
  const sheet = document.createElement('canvas'); sheet.width = w * 2; sheet.height = h * rows;
  const g = sheet.getContext('2d'); shots.forEach((c, k) => g.drawImage(c, (k % 2) * w, ((k / 2) | 0) * h));
  return 'INFO' + JSON.stringify(info) + 'ENDINFO' + sheet.toDataURL('image/jpeg', 0.9) + '#' + 'x'.repeat(120000);
};
})();
