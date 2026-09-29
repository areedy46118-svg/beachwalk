/* THE TWO AT THE TABLE. Not part of the game.
 *   eval(await (await fetch('/tools/tavdrink.js')).text()); await __tavSetup();
 * Puts you in the tavern with the bar's scene held back (so the brawl does
 * not come through the shot), and gives:
 *   __legs(i)         where drinker i's hips, knees, feet and hand are, in his own frame [forward, up]
 *   __drinkShots(i)   a strip of him sitting and drinking, side-on and from across the table
 *   __capC / __sheetC capture helpers (the sheet is padded so it lands in a file). */
(function () {
  const b = window.__bw, V = b.camera.position.constructor;
  window.__capC = (W = 360, H = 300) => { const c = b.renderer.domElement; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(c, 0, 0, W, H); return cv; };
  window.__sheetC = (cvs, cols = 3) => { const W = cvs[0].width, H = cvs[0].height, rows = Math.ceil(cvs.length / cols); const o = document.createElement('canvas'); o.width = W * cols; o.height = H * rows; const x = o.getContext('2d'); cvs.forEach((c, i) => x.drawImage(c, (i % cols) * W, Math.floor(i / cols) * H)); return o.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000); };
  window.__tavSetup = async () => {
    b.beginGame && b.beginGame(); await new Promise((r) => setTimeout(r, 300));
    b.settings.devMode = true;
    b.loadKeep && b.loadKeep(); b.loadTavern();
    for (let n = 0; n < 60; n++) {
      await new Promise((r) => setTimeout(r, 400)); b.frame(1);
      try { b.placeInTavern(); } catch (e) { /* not in yet */ }
      if (b.tavDrinkers.length && b.tavDrinkers.every((u) => u.clips && u.clips.fSit && u.clips.mWalk)) break;
    }
    b.tavScene.phase = 9;                           // the bar's scene is held: nobody fights unless we start it
    for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 30)); b.frame(1); }
    return b.tavDrinkers.map((u) => u.cur && u.cur.getClip().name);
  };
  const bone = (u, n) => { let r = null; u.model.traverse((o) => { if (!r && o.isBone && o.name.startsWith('mixamorig' + n + '_')) r = o; }); return r; };
  window.__legs = (i = 0) => {
    const u = b.tavDrinkers[i]; u.model.updateMatrixWorld(true);
    const g = u.g.position, f = [Math.sin(u.g.rotation.y), Math.cos(u.g.rotation.y)];
    const rel = (n) => { const o = bone(u, n); if (!o) return null; const p = o.getWorldPosition(new V()); return [+((p.x - g.x) * f[0] + (p.z - g.z) * f[1]).toFixed(2), +(p.y - g.y).toFixed(2)]; };
    const out = {}; for (const n of ['Hips', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'Head', 'RightHand']) out[n] = rel(n);
    return out;
  };
  window.__view = (u, side, dist, h, pitch = -0.1) => {
    const g = u.g.position, a = u.g.rotation.y + side, cx = g.x + Math.sin(a) * dist, cz = g.z + Math.cos(a) * dist;
    b.camera.position.set(cx, g.y + h, cz); b.look(Math.atan2(-(g.x - cx), -(g.z - cz)), pitch);
    b.renderer.render(b.scene, b.camera); return __capC();
  };
  window.__drinkShots = (i = 0, at = [0.2, 0.9, 1.3, 2.2]) => {
    const u = b.tavDrinkers[i]; u.drink.next = 0; u.drink.drinking = 0;
    const shots = []; let t = 0;
    for (const T of at) { while (t < T) { b.step(1 / 60); t += 1 / 60; } shots.push(__view(u, Math.PI / 2, 2.3, 0.95)); }
    shots.push(__view(u, Math.PI, 2.6, 1.25, -0.2));
    return __sheetC(shots, 5);
  };
})();
