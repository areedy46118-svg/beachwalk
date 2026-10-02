/* Stills of any place, from world spots. Not part of the game.
 *   await import('/tools/c13shot.js')            (freezes rAF, gives __c13Step)
 *   await import('/tools/roomshot.js')
 *   __shot([[x, y, z, yaw, pitch, label], ...], cols, w)   -> padded base64 jpeg
 * y is the EYE height in world metres. Frames are run before each still so the
 * lamp pool and anything per-frame has settled; the camera is put back after
 * them, because the walk's clamps move a teleported camera. */
(function () {
  const b = window.__bw;
  const put = (s) => { b.camera.position.set(s[0], s[1], s[2]); b.look(s[3], s[4]); };
  window.__shotOne = (s, frames = 6) => {
    for (let k = 0; k < frames; k++) { put(s); __c13Step(1); }
    put(s); b.camera.updateMatrixWorld(true);
    b.renderer.render(b.scene, b.camera);
  };
  window.__shot = (spots, cols, w, frames = 6) => {
    const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas');
    sh.width = cols * w; sh.height = Math.ceil(spots.length / cols) * (h + 14);
    const g = sh.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    spots.forEach((s, i) => {
      __shotOne(s, frames);
      const cx = (i % cols) * w, cy = Math.floor(i / cols) * (h + 14);
      g.drawImage(src, cx, cy, w, h); g.fillStyle = '#9f9'; g.fillText(s[5] || '', cx + 3, cy + h + 11);
    });
    return sh.toDataURL('image/jpeg', 0.86).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
