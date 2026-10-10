/* The Artifact of the Flame on the katana, in the tavern, muted. Not part of the game.
 *   await import('/tools/flametest.js'); await __flSetup(); __flWind(marks) -> padded sheet */
(function () {
  window.__flSetup = async () => {
    await import('/tools/audiowatch.js'); __awPatch();
    const b = window.__bw; try { b.beginGame(); } catch (e) { /* begun */ }
    await import('/tools/c13shot.js'); await import('/tools/shot.js');
    b.settings.devMode = true; b.loadKeep && b.loadKeep(); b.loadTavern();
    for (let n = 0; n < 40; n++) { await new Promise((r) => setTimeout(r, 500)); __c13Step(1); if (b.tavState().ready) break; }
    b.placeInTavern(); __c13Step(30); __awTap();
    b.devGrantWeapons && b.devGrantWeapons();
    const K = b.katanaItem; b.addToInventory(b.flameArtItem);
    if (b.state().equipped !== K.name) b.toggleEquip(K);
    b.attachArtifact(b.flameArtItem, K); __c13Step(10);
    return !!b.flameWeapon();
  };
  window.__flWind = (marks = [0.6, 1.0, 1.3], swings = 3, yaw = Math.PI * 0.5, cols = 3, w = 420) => {
    const b = window.__bw; b.look(yaw, 0.05); b.startWind(); b.windOverhead = true; __sheet(cols, w);
    let i = 0, g = 0;
    while (i < marks.length && g++ < 300) { b.look(yaw, 0.05); if (b.windT >= marks[i]) { __sheetAddFrame('wind ' + b.windT.toFixed(2) + ' k ' + b.flame.k.toFixed(2)); i++; continue; } __c13Step(1); }
    b.releaseWind();
    for (let k = 0; k < swings; k++) { __c13Step(3); __sheetAddFrame('swing f' + (k * 3 + 3)); }
    return __sheetEnd();
  };
})();
