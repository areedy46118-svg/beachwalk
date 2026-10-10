/* Stills of the lighthouse and the headland, muted. Not part of the game.
 *   await import('/tools/lhshot.js'); await __lhSetup(); __lhSheet([[x, y, z, lookX, lookY, lookZ, fov, label], ...], cols, w) */
(function () {
  window.__lhSetup = async () => {
    await import('/tools/audiowatch.js'); __awPatch();
    const b = window.__bw; try { b.beginGame(); } catch (e) { /* begun */ }
    await import('/tools/c13shot.js'); await import('/tools/shot.js');
    b.settings.devMode = true;
    b.loadFort && b.loadFort();
    for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 250)); __c13Step(1); if (b.fortState && b.fortState().ready) break; }
    return true;
  };
  window.__lhSheet = (spots, cols = 2, w = 560) => {
    const b = window.__bw; __sheet(cols, w);
    for (const [x, y, z, lx, ly, lz, fov, label] of spots) {
      b.camera.fov = fov || b.settings.fov; b.camera.updateProjectionMatrix();
      const yy = y === null ? Math.max(1.7, b.headlandAt(x, z) + 1.65) : y;
      for (let k = 0; k < 6; k++) { b.tp(x, yy, z); b.lookAt(lx, ly, lz); __c13Step(1); }
      b.tp(x, yy, z); b.lookAt(lx, ly, lz); b.camera.updateMatrixWorld(true);
      __sheetAdd(label || '');
    }
    return __sheetEnd();
  };
})();
