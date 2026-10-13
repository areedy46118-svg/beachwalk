/* __isle.sheet with the game's own last pass on each view (the sharpen, the palette and the light shafts
 * — the rays live there, so a bare render has none). Not part of the game.
 *   eval(await (await fetch('/tools/isleshot2.js')).text()); __isle.sheetPost(views, W, H, cols) */
(function () {
  const b = window.__bw;
  window.__isle.sheetPost = (views, W = 480, H = 300, cols = 2) => {
    const cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Math.ceil(views.length / cols) * (H + 12);
    const g = cv.getContext('2d'); g.font = '10px monospace';
    views.forEach((v, k) => {
      if (v[3] === 'at') { b.camera.position.set(v[0], v[1], v[2]); b.camera.lookAt(v[4], v[5], v[6]); }
      else { b.camera.position.set(v[0], v[1], v[2]); b.look(v[3], v[4]); }
      b.camera.updateMatrixWorld();
      b.renderer.render(b.scene, b.camera);
      b.sharpenFrame();
      const x = (k % cols) * W, y = Math.floor(k / cols) * (H + 12);
      g.drawImage(b.renderer.domElement, x, y, W, H); g.fillStyle = '#9f9'; g.fillText(v[v.length - 1] || '', x + 2, y + H + 10);
    });
    return cv.toDataURL('image/jpeg', 0.85).split(',')[1] + ' '.repeat(60000);
  };
})();
