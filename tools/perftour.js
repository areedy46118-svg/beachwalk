/* PERF TOUR. Not part of the game. One area per page load (reload between):
 *   sessionStorage.setItem('beachwalk.skipIntro','1'); location.reload()
 *   eval(await (await fetch('/tools/perftour.js')).text()); await __tour('fort' | 'beach:-600' | ...)
 * Loads the room (ROOM_BACK), places you, settles 120 frames, then times 360 real frames
 * with the GPU synced each frame (a one-pixel read), at a 1920x1080 buffer. Returns ms stats. */
(function () {
  const b = window.__bw;
  window.__tour = async (where, N = 360) => {
    b.beginGame(); b.settings.devMode = true;
    window.requestAnimationFrame = () => 0;
    const R = b.renderer, gl = R.getContext(), px = new Uint8Array(4);
    R.setSize(1920, 1080, false); b.camera.aspect = 16 / 9; b.camera.updateProjectionMatrix();
    const step = () => { b.frame(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    if (where.startsWith('beach:')) {
      const z = +where.split(':')[1];
      b.camera.position.set(4, 1.7, z); b.camBaseY = 1.7;
    } else {
      const RB = b.ROOM_BACK[where]; if (!RB) return 'no room ' + where;
      RB.load();
      for (let i = 0; i < 200 && !RB.ready(); i++) { step(); await new Promise((r) => setTimeout(r, 50)); }
      if (!RB.ready()) return 'not ready';
      RB.place();
    }
    for (let i = 0; i < 120; i++) { step(); if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0)); }
    const ms = [];
    for (let i = 0; i < N; i++) {
      const t0 = performance.now(); step(); ms.push(performance.now() - t0);
      b.look(b.camera.rotation ? (i / N) * Math.PI * 2 : 0, 0);           // turn a full circle while timing
    }
    R.info.autoReset = false; R.info.reset(); R.render(b.scene, b.camera); const calls = R.info.render.calls, tris = R.info.render.triangles; R.info.autoReset = true;
    const s = ms.slice().sort((x, y) => x - y), q = (f) => +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(1);
    return JSON.stringify({ where, med: q(0.5), p95: q(0.95), max: q(1), over33: ms.filter((x) => x > 33).length, calls, tris, programs: R.info.programs ? R.info.programs.length : null });
  };
})();
