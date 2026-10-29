/* THE MINOTAUR AT THE GATE. Not part of the game.
 *   await import('/tools/minotaur.js'); await __mnSpawn()      one of him in the studio, every clip laid
 *   __mnStrip(clip, n, w, side, ang, fov)   a strip of one clip, jpeg base64
 *   __mnContact(clips)                       each swing's contact (the right tip fastest) and its cock, off his own blade */
(function () {
  const b = window.__bw;
  window.__mnSpawn = async () => {
    try { b.beginGame && b.beginGame(); } catch (e) { /* begun */ }
    const c = b.camera.position;
    const u = window.__mnU = b.minoSpawnTest(c.x + 200, c.z, 0);
    for (let i = 0; i < 400 && !u.model; i++) await new Promise((r) => setTimeout(r, 50));
    for (let i = 0; i < 400 && u.minoLay && !b.minoPacksIn(); i++) await new Promise((r) => setTimeout(r, 50));
    if (u.minoLay) { const f = u.minoLay; u.minoLay = null; f(); }
    for (let i = 0; i < 600 && u.clipsPending > 0; i++) await new Promise((r) => setTimeout(r, 30));
    return { clips: Object.keys(u.clips).length, pending: u.clipsPending, blade: u.knBlade && +u.knBlade.toFixed(2), h: u.kind.h };
  };
  // the real one, at the first castle's gate: past the intro, the castle loaded, you standing on the sand `back` metres out from the gate
  window.__mnGate = async (back = 9) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // (the intro runs on the real clock: wait it out, up to a minute — a talk asked for before it ends is refused)
    for (let k = 0; k < 3000 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) { /* */ } b.frame(3); await sleep(20); }
    b.skipTakes(); b.settings.devMode = false;
    b.loadFort();
    for (let i = 0; i < 80 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.fortWallsStep(1e9); await sleep(300); }
    const M = b.MINO;
    const put = () => { const P = M.post || { x: 6.4, z: -1160 }; const x = P.x + 3.6, z = P.z + back; b.camera.position.set(x, b.beachGroundAt(x, z) + 1.7, z); b.camBaseY = b.camera.position.y; b.look(0, 0); };
    put();
    for (let i = 0; i < 400 && !(M.u && M.u.model && !(M.u.clipsPending > 0) && M.u.texW && M.u.texW.compiled); i++) { b.frame(1); put(); await sleep(50); }
    put(); b.skipTakes(); for (let i = 0; i < 10; i++) b.step(1 / 60);
    const u = M.u;
    return { stage: M.stage, post: M.post, at: u && u.g.position.toArray().map((v) => +v.toFixed(2)), vis: u && u.g.visible, clips: u && Object.keys(u.clips).length, me: b.camera.position.toArray().map((v) => +v.toFixed(2)) };
  };
  window.__mnStrip =(clip, n = 7, w = 220, side = 5.0, ang = 1.5708, fov = 42, tY = 1.3) => {
    const u = window.__mnU, m = u.mixer, P = u.g.position;
    const fov0 = b.camera.fov; b.camera.fov = fov; b.camera.updateProjectionMatrix();
    const ST = b.knStudio && b.knStudio();
    for (const a of m._actions) { a.stop(); a.enabled = false; }
    const a = u.clips[clip]; if (!a) return null;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    if (u.model) { u.model.rotation.y = 0; u.model.visible = true; }
    const dur = a.getClip().duration, yaw = u.g.rotation.y + ang, rx = Math.sin(yaw), rz = Math.cos(yaw);
    const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas'); sh.width = n * w; sh.height = h + 14;
    const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    for (let k = 0; k < n; k++) {
      a.time = dur * k / (n - 1); m.update(0);
      b.camera.position.set(P.x + rx * side, P.y + tY, P.z + rz * side); b.lookAt(P.x, P.y + tY - 0.1, P.z);
      b.camera.updateMatrixWorld(true); u.g.updateMatrixWorld(true);
      b.renderer.render(ST ? ST.scene(u) : b.scene, b.camera);
      g.drawImage(src, k * w, 0, w, h); g.fillStyle = '#9f9'; g.fillText(clip + ' ' + a.time.toFixed(2), k * w + 3, h + 11);
    }
    a.paused = false; a.stop(); b.camera.fov = fov0; b.camera.updateProjectionMatrix();
    if (ST) ST.done(u);
    return sh.toDataURL('image/jpeg', 0.85).split(',')[1];
  };
  // his face close up in the studio (the eyes), from each yaw offset in `angs`: [jpeg base64]
  window.__mnFace = (angs = [0, 0.55], d = 0.9, W = 360) => {
    const u = window.__mnU, V = b.camera.position.constructor, src = b.renderer.domElement, ST = b.knStudio(), out = [];
    let H = null; u.model.traverse((o) => { if (o.isBone && /^Head/.test(o.name)) H = o; });
    u.g.visible = true; u.g.updateMatrixWorld(true);
    const hp = H.getWorldPosition(new V()), fov0 = b.camera.fov; b.camera.fov = 30; b.camera.updateProjectionMatrix();
    for (const ang of angs) {
      const yy = u.g.rotation.y + ang;
      b.camera.position.set(hp.x + Math.sin(yy) * d, hp.y + 0.02, hp.z + Math.cos(yy) * d); b.lookAt(hp.x, hp.y - 0.02, hp.z); b.camera.updateMatrixWorld(true);
      b.renderer.render(ST.scene(u), b.camera);
      const c = document.createElement('canvas'); c.width = W; c.height = Math.round(W * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      out.push(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    }
    ST.done(u); b.camera.fov = fov0; b.camera.updateProjectionMatrix();
    return out;
  };
  window.__mnContact = (clips) => {
    const u = window.__mnU, m = u.mixer, tip = u.bones.tip, out = {};
    const V = b.camera.position.constructor;
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
      out[clip] = { dur: +dur.toFixed(2), hit: +(bk / N).toFixed(3), cockF: +(fk / bk).toFixed(2), speed: +(best * 60).toFixed(1), tipY: +L.y.toFixed(2), fwd: +fwd.toFixed(2) };
      a.stop();
    }
    return out;
  };
})();
/* THE GARGOYLES OF XIII'S EAST COURT (same file: they fight him too).
 *   __ggBoot()                 into XIII with them on their walls (runs in the background: poll `__ggBooted`)
 *   __ggShots(dist, dy, W)     each one from `dist` in front of its wall, models forced visible: [name, jpeg base64] */
(function () {
  const b = window.__bw;
  window.__ggBoot = () => { window.__ggBooted = false; (async () => {
    await window.__mnGate(4.5); try { await b.audioCtx.suspend(); } catch (e) { /* */ }
    await import('/tools/c13shot.js?' + Date.now()); await import('/tools/roomshot.js');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 120 && !b.c13State().ready; i++) { await sleep(300); window.__c13Step(2); }
    b.skipTakes(); await window.__c13Go(); b.skipTakes();
    for (let i = 0; i < 400 && !(b.GARG.units.length && b.GARG.units.every((u) => u.model)); i++) { window.__c13Step(1); await sleep(40); }
    window.__ggBooted = true;
  })(); return 'booting'; };
  window.__ggShots = (dist = 4.2, dy = -0.6, W = 480) => {
    const G = b.GARG, cam = b.camera.position, src = b.renderer.domElement, out = [];
    G.units.forEach((u, i) => {
      if (u.retired) return;
      const p = u.g.position, P = G.perches[i];
      cam.set(P.wx + P.nx * dist, p.y + dy, P.wz + P.nz * dist); b.lookAt(p.x, p.y + 0.9, p.z); b.camera.updateMatrixWorld(true);
      for (const v of G.units) if (v.model) v.model.visible = true;
      b.renderer.render(b.scene, b.camera);
      const c = document.createElement('canvas'); c.width = W; c.height = Math.round(W * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      out.push(['g' + i, c.toDataURL('image/jpeg', 0.85).split(',')[1]]);
    });
    return out;
  };
})();
