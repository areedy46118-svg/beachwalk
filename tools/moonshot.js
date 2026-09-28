/* A/B stills of the moonlit beach. Not part of the game.
 *   eval(await (await fetch('/tools/moonshot.js')).text()); __moonShots()
 * Fixed clock, fixed views, 960x540 each, returned as one padded data URL. */
(function () {
const b = window.__bw, R = b.renderer;
window.__moonShots = function (T = 123456) {
  window.requestAnimationFrame = () => 0;
  const base = performance.now; performance.now = () => T;
  const old = new b.THREE.Vector2(); R.getSize(old);
  const W = 960, H = 540; R.setSize(W, H, false); b.camera.aspect = W / H; b.camera.updateProjectionMatrix();
  const views = [
    [[9, 1.7, -60], [-40, 12, -200]],     // toward the moon over the surf
    [[11, 1.7, -120], [0, 0, -150]],      // down onto the wet sand, moon side
    [[8, 1.7, -20], [-60, 30, -220]],     // the sky and the moon, high
    [[12, 1.7, -40], [12, 0.2, -80]],     // along the dry sand, cloud shadows
  ];
  const shots = [];
  try {
    for (const [p, l] of views) {
      for (let i = 0; i < 12; i++) { b.camera.position.set(...p); b.camBaseY = p[1]; b.lookAt(...l); b.frame(1); }
      const c = R.domElement, cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
      cv.getContext('2d').drawImage(c, 0, 0); shots.push(cv);
    }
  } finally {
    performance.now = base;
    R.setSize(old.x, old.y, false); b.camera.aspect = old.x / old.y; b.camera.updateProjectionMatrix();
  }
  const sheet = document.createElement('canvas'); sheet.width = W * 2; sheet.height = H * 2;
  const g = sheet.getContext('2d'); shots.forEach((c, k) => g.drawImage(c, (k % 2) * W, ((k / 2) | 0) * H));
  return sheet.toDataURL('image/png') + '#' + 'x'.repeat(120000);
};
})();
