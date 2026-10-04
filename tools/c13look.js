/* Castle XIII as the player sees it, with the loop's own lights and air. Not part of the game.
 *   eval(await (await fetch('/tools/c13look.js')).text()); await __c13LookBoot()
 *   __c13Look([[lx, lz, yaw, pitch], ...])   wide stills; yaw is the game's own (lookEuler.y,
 *                                              forward = (-sin, -cos)); a few real frames are run
 *                                              at each spot so lamps, mist and mood settle */
(function () {
  const b = window.__bw;
  window.__c13LookBoot = async () => {
    let n = 0; while (n++ < 60 && !(b.c13State().ready)) await new Promise((r) => setTimeout(r, 500));
    window.__T = await import('three');
    b.beginGame(); b.settings.devMode = true;
    while (!b.fortWallsStep(1e9, b.C13_SITE));
    b.placeInC13();
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0, creep = 0;
    performance.now = () => base + off + (creep += 0.01);
    window.__c13Adv = (k) => { for (let i = 0; i < k; i++) { off += 16.7; b.frame(1); } };
    for (let i = 0; i < 900 && !(b.c13State().thrive && b.c13State().thrive.done); i++) __c13Adv(1);
    let m = 0; while ((b.frozen() || b.mutCut) && m++ < 600) __c13Adv(1);
    return b.c13State().thrive && b.c13State().thrive.done;
  };
  window.__c13Look = (shots, w = 480, settle = 20) => {
    const r = b.renderer, src = r.domElement, cam = b.camera, sz = new window.__T.Vector2(); r.getSize(sz);
    const h = Math.round(w * 9 / 16), asp = cam.aspect; r.setSize(w, h, false); cam.aspect = 16 / 9; cam.updateProjectionMatrix();
    const c = document.createElement('canvas'); c.width = w * 2; c.height = Math.ceil(shots.length / 2) * (h + 14);
    const g = c.getContext('2d'); g.font = '11px monospace';
    shots.forEach(([lx, lz, yaw, pitch], i) => {
      const x = b.C13_X + lx, z = b.C13_Z + lz;
      for (let k = 0; k < settle; k++) {
        cam.position.x = x; cam.position.z = z; b.camBaseY = cam.position.y;
        b.look(yaw, pitch || 0);
        b.frame(1);
      }
      cam.position.x = x; cam.position.z = z; b.look(yaw, pitch || 0); cam.updateMatrixWorld(true);
      r.render(b.scene, cam);
      const cx = (i % 2) * w, cy = Math.floor(i / 2) * (h + 14);
      g.drawImage(src, cx, cy, w, h); g.fillStyle = '#9f9'; g.fillText(`${lx.toFixed(1)},${lz.toFixed(1)} ${yaw.toFixed(2)}`, cx + 3, cy + h + 11);
    });
    r.setSize(sz.x, sz.y, false); cam.aspect = asp; cam.updateProjectionMatrix();
    return c.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
