/* Wide (16:9) stills of the world for the preview pane. Not part of the game.
 *   eval(await (await fetch('/tools/widestill.js')).text())
 *   await __wideBoot()            skip the intro, dev mode, castle walls built, rAF frozen
 *   __wide([[x, z, yaw, pitch, y?], ...])   a two-column sheet; returns padded base64
 * The return is padded so the harness writes it to a file (decode in the shell). */
(function () {
  const b = window.__bw;
  window.__wideBoot = async () => {
    window.__T = await import('three');
    b.beginGame(); b.settings.devMode = true;
    while (!b.fortWallsStep(1e9));
    window.requestAnimationFrame = () => 0;
    return true;
  };
  window.__wide = (shots) => {
    const r = b.renderer, src = r.domElement, cam = b.camera, sz = new window.__T.Vector2(); r.getSize(sz);
    const asp = cam.aspect; r.setSize(480, 270, false); cam.aspect = 16 / 9; cam.updateProjectionMatrix();
    const c = document.createElement('canvas'); c.width = 960; c.height = Math.ceil(shots.length / 2) * 284;
    const g = c.getContext('2d'); g.font = '11px monospace';
    shots.forEach(([x, z, yaw, pitch, y], i) => {
      cam.position.set(x, y ?? 1.7, z); b.look(yaw, pitch); cam.updateMatrixWorld(true);
      if (b.fortWorld()) b.fortWorld().visible = true;
      r.render(b.scene, cam);
      const cx = (i % 2) * 480, cy = Math.floor(i / 2) * 284;
      g.drawImage(src, cx, cy, 480, 270); g.fillStyle = '#9f9'; g.fillText(`${x},${z} ${(yaw * 57.3) | 0}`, cx + 3, cy + 281);
    });
    r.setSize(sz.x, sz.y, false); cam.aspect = asp; cam.updateProjectionMatrix();
    return c.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
