/* THE TWO SWORDSMEN IN CASTLE XIII'S WEST COURT. Not part of the game.
 *   await import('/tools/swordknights.js'); await __knGo()     into the court, both loaded
 *   __knStrip(i, clip, n, w, side, ang)   a strip of one clip on knight i (0 the man-at-arms, 1 the iron knight), jpeg base64
 *   __knContact(i)                         every swing: the contact fraction (the tip fastest) and the cock (the tip furthest from it)
 * Runs on c13shot's frozen rAF and fake clock. */
(function () {
  const b = window.__bw;
  const kn = (i) => b.knUnitsS()[i];
  window.__knGo = async () => {
    try { b.beginGame && b.beginGame(); } catch (e) { /* begun */ }
    await import('/tools/c13shot.js');
    await import('/tools/roomshot.js');
    b.settings.devMode = false;
    for (let i = 0; i < 60 && !b.c13State().ready; i++) { await new Promise((r) => setTimeout(r, 300)); __c13Step(2); }
    b.skipTakes(); await __c13Go(); b.skipTakes();
    for (let i = 0; i < 400 && !(b.knUnitsS().length === 2 && b.knUnitsS().every((u) => u.model && !(u.clipsPending > 0))); i++) { __c13Step(1); await new Promise((r) => setTimeout(r, 60)); }
    for (let i = 0; i < 40; i++) { __c13Step(1); await new Promise((r) => setTimeout(r, 20)); }
    return b.knUnitsS().map((u) => ({ kind: u.kind.glb, pos: u.g.position.toArray().map((v) => +v.toFixed(2)), clips: Object.keys(u.clips).length, blade: u.knBlade && +u.knBlade.toFixed(2), vis: u.g.visible }));
  };
  // a studio of its own to draw him in: grey floor, a key and a fill, nothing of the court in the way
  let studio = null;
  const studioOf = () => {
    if (studio) return studio;
    const S = new b.scene.constructor(), T = b.THREE_ || null;
    const L = b.scene.children.find((o) => o.isHemisphereLight);
    studio = { S };
    return studio;
  };
  window.__knStrip = (i, clip, n = 7, w = 220, side = 4.0, ang = 1.5708, fov = 42) => {
    const u = kn(i), m = u.mixer, P = u.g.position;
    const fov0 = b.camera.fov; b.camera.fov = fov; b.camera.updateProjectionMatrix();
    const ST = b.knStudio && b.knStudio();
    for (const a of m._actions) { a.stop(); a.enabled = false; }
    const a = u.clips[clip]; if (!a) return null;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    if (u.model) u.model.rotation.y = 0;
    const dur = a.getClip().duration, yaw = u.g.rotation.y + ang, rx = Math.sin(yaw), rz = Math.cos(yaw);
    const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas'); sh.width = n * w; sh.height = h + 14;
    const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    for (let k = 0; k < n; k++) {
      a.time = dur * k / (n - 1); m.update(0);
      if (window.__knFree) { u.knFree = undefined; u.st.atk = -1; b.knFreeHand(u, 1); }
      b.camera.position.set(P.x + rx * side, P.y + 1.3, P.z + rz * side); b.lookAt(P.x, P.y + 1.1, P.z);
      b.camera.updateMatrixWorld(true); u.g.updateMatrixWorld(true);
      b.renderer.render(ST ? ST.scene(u) : b.scene, b.camera);
      g.drawImage(src, k * w, 0, w, h); g.fillStyle = '#9f9'; g.fillText(clip + ' ' + a.time.toFixed(2), k * w + 3, h + 11);
    }
    a.paused = false; a.stop(); b.camera.fov = fov0; b.camera.updateProjectionMatrix();
    if (ST) ST.done(u);
    return sh.toDataURL('image/jpeg', 0.85).split(',')[1];
  };
  // the contact frame of each swing off the blade itself: where the tip moves fastest; and the cock: the frame before it
  // where the tip is furthest from where it lands
  window.__knContact = (i, clips) => {
    const u = kn(i), m = u.mixer, tip = u.bones.tip, out = {};
    const V = b.camera.position.constructor, p = new V(), q = new V(), at = new V();
    for (const clip of clips) {
      const a = u.clips[clip]; if (!a) continue;
      for (const x of m._actions) { x.stop(); x.enabled = false; }
      a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
      if (u.model) u.model.rotation.y = 0;
      const dur = a.getClip().duration, N = Math.round(dur * 60), pos = [];
      for (let k = 0; k <= N; k++) { a.time = dur * k / N; m.update(0); u.g.updateMatrixWorld(true); pos.push(tip.getWorldPosition(new V()).sub(u.g.position)); }
      let best = 0, bk = 0;
      for (let k = 2; k < N - 1; k++) { const s = pos[k].distanceTo(pos[k - 1]); if (s > best) { best = s; bk = k; } }
      let far = 0, fk = 0; for (let k = 0; k < bk; k++) { const d = pos[k].distanceTo(pos[bk]); if (d > far) { far = d; fk = k; } }
      const L = pos[bk]; const fwd = Math.cos(u.g.rotation.y) * L.z + Math.sin(u.g.rotation.y) * L.x;
      out[clip] = { dur: +dur.toFixed(2), hit: +(bk / N).toFixed(3), cockF: +(fk / bk).toFixed(2), speed: +(best * 60).toFixed(1), tipY: +L.y.toFixed(2), reach: +Math.hypot(L.x, L.z).toFixed(2), fwd: +fwd.toFixed(2) };
      a.stop();
    }
    return out;
  };
})();
