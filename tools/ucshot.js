// harness: stand in the undercroft with the glowstick and render stills by hand (__ucSetup, __uc2, __col)
window.__ucSetup = function () {
  const b = window.__bw, gl = b.renderer.getContext();
  for (const id of ['menu', 'overlay']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  b.beginGame(); for (let i = 0; i < 5; i++) b.frame(1);
  b.placeInUndercroft('entry');
  b.addToInventory(b.glowstickItem); if (b.state().equipped !== 'Glowstick') b.toggleEquip(b.glowstickItem);
  for (let i = 0; i < 40; i++) b.frame(1);
  window.requestAnimationFrame = () => 0;
  window.__uc2 = (x, y, z, lx, ly, lz) => {
    const X = b.UC_X, Y = b.UC_Y, Z = b.UC_Z;
    for (let i = 0; i < 3; i++) { b.camera.position.set(X + x, Y + y, Z + z); b.camBaseY = b.camera.position.y; b.lookAt(X + lx, Y + ly, Z + lz); b.frame(1); }
    b.camera.position.set(X + x, Y + y, Z + z); b.lookAt(X + lx, Y + ly, Z + lz); b.camera.updateMatrixWorld(true);
    b.renderer.render(b.scene, b.camera); return 'ok';
  };
  window.__col = (x0, y0, x1, y1) => {
    const cw = gl.drawingBufferWidth, chh = gl.drawingBufferHeight;
    const X0 = Math.round(x0 * cw), Y0 = Math.round((1 - y1) * chh), w = Math.max(1, Math.round((x1 - x0) * cw)), h = Math.max(1, Math.round((y1 - y0) * chh));
    const px = new Uint8Array(w * h * 4); gl.readPixels(X0, Y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let r = 0, g = 0, bb = 0; for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; bb += px[i + 2]; }
    const n = w * h; return [r / n, g / n, bb / n].map((v) => +v.toFixed(1));
  };
  return b.state().equipped;
};
