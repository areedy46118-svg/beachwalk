/* Into the throne room for stills. Not part of the game.
 *   await import('/tools/thrgo.js'); await __thrGo()
 * Freezes rAF (c13shot), marks the walk's cutscenes passed (a teleport crosses
 * the horde's line and its take narrows the lens to 24 degrees), loads Castle
 * XIII and the throne room, and puts you in it. */
(function () {
  window.__thrGo = async () => {
    const b = window.__bw;
    try { b.beginGame && b.beginGame(); } catch (e) { /* already begun */ }
    await import('/tools/c13shot.js');
    await import('/tools/roomshot.js');
    b.settings.devMode = true;
    for (let i = 0; i < 40 && !b.c13State().ready; i++) { await new Promise((r) => setTimeout(r, 300)); __c13Step(2); }
    b.skipTakes();
    await __c13Go();
    b.skipTakes();
    b.startThrone(1);
    for (let k = 0; k < 80 && !b.c13Dbg().thrReady; k++) { __c13Step(5); await new Promise((r) => setTimeout(r, 100)); }
    if (!b.c13Dbg().thrReady) return 'throne not ready';
    b.placeInThrone(); b.skipTakes(); __c13Step(40);
    return { fov: +b.camera.fov.toFixed(1) };
  };
})();
