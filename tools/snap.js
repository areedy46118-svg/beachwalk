/* A frame grabber for the preview pane: renders the world and the view model
 * and hands back a JPEG that is big enough the harness writes it to a file.
 *   await import('/tools/snap.js')
 *   __at(px, pz, lx, ly, lz, uTime)   stand and look, with a few real frames
 *   __sheet([{label, setup}], cols, w) a contact sheet
 * rAF is frozen on import: the pane's own loop runs between tool calls. */
(function () {
  const b = window.__bw;
  window.requestAnimationFrame = () => 0;
  const draw = () => {
    const r = b.renderer;
    r.render(b.scene, b.camera);
    if (b.viewmodel.visible) { r.autoClear = false; r.clearDepth(); r.render(b.vmScene, b.vmCamera); r.autoClear = true; }
  };
  window.__at = (px, pz, lx, ly, lz, tt, py = 1.7) => {
    for (let i = 0; i < 3; i++) { b.camera.position.set(px, py, pz); b.lookAt(lx, ly, lz); b.frame(1); }
    b.camera.position.set(px, py, pz); b.lookAt(lx, ly, lz);
    if (tt !== undefined) b.oceanUniforms.uTime.value = tt;
  };
  window.__sheet = (frames, cols, w) => {
    const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas');
    sh.width = cols * w; sh.height = Math.ceil(frames.length / cols) * (h + 14);
    const g = sh.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    frames.forEach((f, i) => {
      f.setup(); draw();
      const cx = (i % cols) * w, cy = Math.floor(i / cols) * (h + 14);
      g.drawImage(src, cx, cy, w, h); g.fillStyle = '#9f9'; g.fillText(f.label || '', cx + 3, cy + h + 11);
    });
    return sh.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
