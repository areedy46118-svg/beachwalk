/* THE WELL'S AIR, from four places. Not part of the game.
 *   after __sgBoot({noGun:true}):  __wv.sheet([[dx, dz, eyeY, lookX, lookY, lookZ, label], ...], W, H, cols)
 *   offsets are from the well's centre; each view runs a few frames so the mood settles -> padded base64 */
(function () {
  const b = window.__bw;
  window.__wv = {
    sheet(views, W = 320, H = 200, cols = 2) {
      const R = b.renderer, src = R.domElement;
      const cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Math.ceil(views.length / cols) * (H + 12);
      const g = cv.getContext('2d'); g.font = '10px monospace';
      views.forEach((v, k) => {
        b.camera.position.set(b.WELL_X + v[0], v[2], b.WELL_Z + v[1]);
        window.__cadv(2); b.lookAt(b.WELL_X + v[3], v[4], b.WELL_Z + v[5]); window.__cadv(12);
        b.lookAt(b.WELL_X + v[3], v[4], b.WELL_Z + v[5]);
        R.render(b.scene, b.camera);
        const x = (k % cols) * W, y = Math.floor(k / cols) * (H + 12);
        g.drawImage(src, x, y, W, H); g.fillStyle = '#9f9'; g.fillText(v[6] || '', x + 2, y + H + 10);
      });
      return cv.toDataURL('image/jpeg', 0.82).split(',')[1] + ' '.repeat(60000);
    },
  };
})();
