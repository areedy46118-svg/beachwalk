/* THE ARTIFACT, rendered on its own from a few angles. Not part of the game.
 *   eval(await (await fetch('/tools/artshot.js')).text()); __artShots()  -> padded base64 jpeg */
(function () {
  const b = window.__bw;
  window.__artShots = (angles = [[0, 0], [0.55, -0.25], [-0.6, 0.3], [Math.PI, 0]], S = 420, dist = 0.2) => {
    const T = b.camera.constructor && window.THREE;
    const THREE_ = window.THREE;
    const sc = new THREE_.Scene(); sc.background = new THREE_.Color(0x07090d);
    sc.add(new THREE_.AmbientLight(0x9fb0cc, 0.55));
    const k = new THREE_.DirectionalLight(0xffe6c8, 2.2); k.position.set(-0.6, 1, 0.9); sc.add(k);
    const r = new THREE_.DirectionalLight(0x6f8ec8, 1.1); r.position.set(1, 0.3, -0.6); sc.add(r);
    const m = b.whaleArtItem.inspectModel.clone(true); sc.add(m);
    const cam = new THREE_.PerspectiveCamera(32, 1, 0.01, 10);
    const cv = document.createElement('canvas'); cv.width = S * angles.length; cv.height = S; const g = cv.getContext('2d');
    const R = b.renderer, rt = new THREE_.WebGLRenderTarget(S, S, { samples: 4 }); rt.texture.colorSpace = THREE_.SRGBColorSpace;
    const px = new Uint8Array(S * S * 4), im = g.createImageData(S, S);
    angles.forEach(([yaw, pitch], i) => {
      m.rotation.set(pitch, yaw, 0); m.updateMatrixWorld(true);
      cam.position.set(0, 0.004, dist); cam.lookAt(0, 0.004, 0);
      R.setRenderTarget(rt); R.render(sc, cam); R.readRenderTargetPixels(rt, 0, 0, S, S, px); R.setRenderTarget(null);
      for (let y = 0; y < S; y++) im.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
      g.putImageData(im, i * S, 0);
    });
    rt.dispose();
    return cv.toDataURL('image/jpeg', 0.86).split(',')[1] + '#' + 'x'.repeat(120000);
  };
  return 'artshot ready';
})();
