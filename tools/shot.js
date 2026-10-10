/* A still of the current frame as base64 for the harness, padded so the tool
 * result is written to a file. Not part of the game.
 *   await import('/tools/shot.js'); __shot(w) */
(function () {
  window.__shot = (w = 900) => {
    const b = window.__bw, cv = b.renderer.domElement;
    // a hidden pane lays the canvas out at nothing: give it a size of its own
    if (!cv.width || !cv.height) { b.renderer.setSize(1280, 760, false); b.camera.aspect = 1280 / 760; b.camera.updateProjectionMatrix(); }
    b.renderer.render(b.scene, b.camera);
    const h = Math.round(w * cv.height / cv.width), c = document.createElement('canvas');
    c.width = w; c.height = h; c.getContext('2d').drawImage(cv, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
/* a contact sheet of frames as they are run: __sheet(cols, w); __sheetAdd('label'); __sheetEnd() */
(function () {
  let S = null;
  window.__sheet = (cols = 3, w = 420) => { S = window.__sheetState = { cols, w, shots: [] }; };
  window.__sheetAdd = (label) => {
    const b = window.__bw, cv = b.renderer.domElement;
    if (!cv.width || !cv.height) { b.renderer.setSize(1280, 760, false); b.camera.aspect = 1280 / 760; b.camera.updateProjectionMatrix(); }
    b.renderer.render(b.scene, b.camera);
    const h = Math.round(S.w * cv.height / cv.width), c = document.createElement('canvas');
    c.width = S.w; c.height = h; c.getContext('2d').drawImage(cv, 0, 0, S.w, h);
    S.shots.push({ c, label: label || '' }); S.h = h;
  };
  window.__sheetEnd = () => {
    S = window.__sheetState;
    const { cols, w, h, shots } = S, rows = Math.ceil(shots.length / cols);
    const out = document.createElement('canvas'); out.width = cols * w; out.height = rows * (h + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    shots.forEach((s, i) => { const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 14); g.drawImage(s.c, x, y); g.fillStyle = '#9f9'; g.fillText(s.label, x + 3, y + h + 11); });
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
/* the whole frame as the game draws it (world and the hand), one stepped frame: __sheetAddFrame('label') */
window.__sheetAddFrame = (label) => {
  const b = window.__bw, cv = b.renderer.domElement;
  if (!cv.width || !cv.height) { b.renderer.setSize(1280, 760, false); b.camera.aspect = 1280 / 760; b.camera.updateProjectionMatrix(); }
  __c13Step(1);
  const S = window.__sheetState;
  const h = Math.round(S.w * cv.height / cv.width), c = document.createElement('canvas');
  c.width = S.w; c.height = h; c.getContext('2d').drawImage(cv, 0, 0, S.w, h);
  S.shots.push({ c, label: label || '' }); S.h = h;
};
