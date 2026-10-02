/* Castle XIII stills for the preview pane.
 *   await import('/tools/c13shot.js')
 *   await __c13Go()                       into the east court, walls built
 *   __c13Sheet([[lx, lz, yaw, pitch, label], ...], cols, w)   local spots (castle frame)
 * rAF is frozen on import; frames are run by hand on a forward-only fake clock. */
(function () {
  const b = window.__bw;
  window.requestAnimationFrame = () => 0;
  const real = performance.now.bind(performance);
  let off = 0, creep = 0; const base = real();
  // it creeps forward on every read, or a loop that runs until 55 ms have passed never ends
  performance.now = () => base + off + (creep += 0.01);
  const step = (n) => { for (let i = 0; i < n; i++) { off += 16.7; b.frame(1); } };
  window.__c13Step = step;
  window.__c13Go = async () => {
    const s = b.c13State();
    if (!s.ready) return 'not ready';
    b.placeInC13();
    for (let i = 0; i < 400 && !b.c13State().walls; i++) step(1);
    step(30);
    return b.c13State();
  };
  const draw = () => {
    const r = b.renderer;
    r.render(b.scene, b.camera);
  };
  window.__c13Place = (lx, lz, yaw, pitch, ly) => {
    const X = b.C13_X, Z = b.C13_Z, Y = b.C13_Y;
    for (let k = 0; k < 4; k++) {
      b.camera.position.set(X + lx, Y + (ly ?? 0.3) + 1.7, Z + lz);
      b.look(yaw, pitch); step(1);
    }
    b.camera.position.set(X + lx, Y + (ly ?? 0.3) + 1.7, Z + lz); b.look(yaw, pitch);
  };
  window.__c13Sheet = (spots, cols, w) => {
    const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas');
    sh.width = cols * w; sh.height = Math.ceil(spots.length / cols) * (h + 14);
    const g = sh.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    spots.forEach((s, i) => {
      __c13Place(s[0], s[1], s[2], s[3], s[5]); draw();
      const cx = (i % cols) * w, cy = Math.floor(i / cols) * (h + 14);
      g.drawImage(src, cx, cy, w, h); g.fillStyle = '#9f9'; g.fillText(s[4] || '', cx + 3, cy + h + 11);
    });
    return sh.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
