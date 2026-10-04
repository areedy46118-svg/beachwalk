/* THE FLAIL KNIGHT IN CASTLE XIII. Not part of the game.
 *   await import('/tools/crusader.js'); await __crGo()        into the west court, the knight loaded
 *   __crStrip('cA1', 8, 700)      a strip of one clip from the side, padded base64
 *   __crContact()                 every swing: where the striking end is on the contact frame
 *   __crFight(seconds)            hands-off at fighting range, healed: swings, hits, damage, on-screen
 * Runs on c13shot's frozen rAF and fake clock. */
(function () {
  const b = window.__bw;
  const T = () => b.THREE || window.THREE;
  const kn = () => b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb');
  window.__crGo = async () => {
    try { b.beginGame && b.beginGame(); } catch (e) { /* begun */ }
    await import('/tools/c13shot.js');
    await import('/tools/roomshot.js');
    b.settings.devMode = false;
    for (let i = 0; i < 40 && !b.c13State().ready; i++) { await new Promise((r) => setTimeout(r, 300)); __c13Step(2); }
    b.skipTakes(); await __c13Go(); b.skipTakes();
    for (let i = 0; i < 200 && !(kn() && kn().model); i++) { __c13Step(1); await new Promise((r) => setTimeout(r, 80)); }
    for (let i = 0; i < 40; i++) { __c13Step(1); await new Promise((r) => setTimeout(r, 30)); }
    const u = kn(); if (!u || !u.model) return 'no knight';
    return { pos: u.g.position.toArray().map((v) => +v.toFixed(2)), clips: Object.keys(u.clips).length };
  };
  // the player a given distance in front of him, looking at him
  window.__crFace = (d = 2.2) => {
    const u = kn(), p = u.g.position, yaw = u.g.rotation.y;
    const x = p.x + Math.sin(yaw) * d, z = p.z + Math.cos(yaw) * d;
    b.camera.position.set(x, p.y + 1.7, z); b.camBaseY = p.y + 1.7;
    b.lookAt(p.x, p.y + 1.4, p.z);
  };
  window.__crStrip = (clip, n = 8, w = 260, side = 4.2, fov = 42, ang = 1.5708) => {
    const u = kn(), m = u.mixer, P = u.g.position;
    const fov0 = b.camera.fov; b.camera.fov = fov; b.camera.updateProjectionMatrix();
    for (const a of m._actions) { a.stop(); a.enabled = false; }
    const a = u.clips[clip]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const dur = a.getClip().duration, yaw = u.g.rotation.y + ang;
    const rx = Math.sin(yaw), rz = Math.cos(yaw);
    const spots = [];
    const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas'); sh.width = n * w; sh.height = h + 14;
    const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    for (let i = 0; i < n; i++) {
      a.time = dur * i / (n - 1); m.update(0);
      u.chain && (u.chain.k = 0);
      b.camera.position.set(P.x + rx * side, P.y + 1.4, P.z + rz * side); b.lookAt(P.x, P.y + 1.2, P.z);
      b.camera.updateMatrixWorld(true);
      b.renderer.render(b.scene, b.camera);
      g.drawImage(src, i * w, 0, w, h); g.fillStyle = '#9f9'; g.fillText(clip + ' ' + a.time.toFixed(2), i * w + 3, h + 11);
    }
    a.paused = false; b.camera.fov = fov0; b.camera.updateProjectionMatrix();
    return sh.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
/* one big still of him as he stands, from an angle round him (radians off his front) */
window.__crStill = (ang = 0.6, d = 3.0, fov = 45, y = 1.3) => {
  const b = window.__bw, u = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb'), P = u.g.position;
  const fov0 = b.camera.fov; b.camera.fov = fov; b.camera.updateProjectionMatrix();
  const yaw = u.g.rotation.y + ang;
  b.camera.position.set(P.x + Math.sin(yaw) * d, P.y + y, P.z + Math.cos(yaw) * d); b.lookAt(P.x, P.y + 1.1, P.z);
  b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera);
  const s = b.renderer.domElement.toDataURL('image/jpeg', 0.88).split(',')[1];
  b.camera.fov = fov0; b.camera.updateProjectionMatrix();
  return s + '#' + 'x'.repeat(120000);
};
/* hands-off at fighting range, healed every frame: swings begun, damage, and on
 * the frame each blow takes health, where the striking end is against your chest
 * (the ball for the flail, the shield's edge for the bash, the toe for the kick)
 * and whether it is in the picture. */
window.__crFight = function (N = 1800, pin = true) {
  const b = window.__bw, T = window.THREE || b.THREE, u = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb');
  const V = b.camera.position.constructor;
  const B = u.bones, toe = (() => { let r = null; u.model.traverse((o) => { if (o.name === 'Crusader_tank_RightToeBase') r = o; }); return r; })();
  const home = b.camera.position.clone();
  const F = { sw: {}, dmg: 0, hits: 0, frames: 0, contact: {}, onScreen: 0, still: 0, _in: false, dsum: 0 };
  let last = u.g.position.clone();
  const a = new V(), c = new V(), d = new V(), chest = new V(), p = new V();
  const seg = (A, Bp, P) => { d.subVectors(Bp, A); const t = Math.max(0, Math.min(1, d.dot(p.subVectors(P, A)) / Math.max(1e-6, d.lengthSq()))); return A.clone().addScaledVector(d, t).distanceTo(P); };
  for (let i = 0; i < N; i++) {
    if (pin) { b.camera.position.x = home.x; b.camera.position.z = home.z; }
    b.lookAt(u.g.position.x, u.g.position.y + 1.4, u.g.position.z);
    const hp0 = b.state().hp; __c13Step(1); const hp1 = b.state().hp;
    if (u.st.atk >= 0 && u.st.atk < 0.03) { if (!F._in) { F.sw[u.st.swing] = (F.sw[u.st.swing] || 0) + 1; F._in = true; } } else F._in = false;
    if (hp1 < hp0) {
      F.dmg += hp0 - hp1; F.hits++;
      chest.copy(b.camera.position); chest.y -= 0.45;
      const k = u.st.swing; let dd, end;
      if (k === 'cBash') { B.foreL.getWorldPosition(a); B.tipL.getWorldPosition(c); dd = seg(a, c, chest); end = c.clone(); }
      else if (k === 'sKick') { toe.getWorldPosition(c); const hip = b.camera.position.clone(); hip.y -= 0.9; dd = c.distanceTo(hip); end = c.clone(); }
      else { B.hand.getWorldPosition(a); B.tip.getWorldPosition(c); dd = seg(a, c, chest); end = c.clone(); }
      (F.contact[k] = F.contact[k] || []).push(+dd.toFixed(2));
      const s = end.clone().project(b.camera); if (Math.abs(s.x) < 1 && Math.abs(s.y) < 1 && s.z < 1) F.onScreen++;
      (F.ndc = F.ndc || []).push(k + ' ' + s.x.toFixed(2) + ',' + s.y.toFixed(2) + (s.z < 1 ? '' : ' behind') + ' fw' + (() => { const f = new V(); b.camera.getWorldDirection(f); return end.clone().sub(b.camera.position).dot(f).toFixed(2); })());
    }
    b.heal && b.heal(); F.frames++;
    if (u.g.position.distanceTo(last) < 0.001 && u.st.atk < 0) F.still++;
    last.copy(u.g.position);
    F.dsum += Math.hypot(u.g.position.x - b.camera.position.x, u.g.position.z - b.camera.position.z);
  }
  const min = F.frames / 3600;
  const con = Object.fromEntries(Object.entries(F.contact).map(([k, v]) => { v.sort((x, y) => x - y); return [k, { n: v.length, med: v[v.length >> 1], max: v[v.length - 1] }]; }));
  return JSON.stringify({ sec: (F.frames / 60).toFixed(0), sw: F.sw, swMin: (Object.values(F.sw).reduce((x, y) => x + y, 0) / min).toFixed(0), dmgMin: (F.dmg / min).toFixed(0), hits: F.hits, onScreen: F.onScreen, stillPct: (100 * F.still / F.frames).toFixed(0), dAvg: (F.dsum / F.frames).toFixed(2), hp: u.st.hp, con, ndc: F.ndc });
};
/* from your eye in a live fight: per swing type, the tell (half the wind), a
 * beat before contact, and the contact frame */
window.__crPOV = function (maxTypes = 6, frames = 3000, W = 230, bright = 1.6) {
  const b = window.__bw, u = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb'), cv = b.renderer.domElement;
  const h = Math.round(W * cv.height / cv.width), seen = {}, rows = [];
  const home = b.camera.position.clone();
  let cur = null;
  for (let i = 0; i < frames && rows.length < maxTypes; i++) {
    b.camera.position.x = home.x; b.camera.position.z = home.z;
    b.lookAt(u.g.position.x, u.g.position.y + 1.45, u.g.position.z);
    __c13Step(1); b.heal && b.heal();
    const st = u.st, A = u.atk && u.atk[st.swing];
    if (!(st.atk >= 0) || !A) { cur = null; continue; }
    if (!cur) { if (seen[st.swing]) continue; cur = { k: st.swing, shots: [], want: [A.wind * 0.5, A.wind - 0.07, A.wind] }; seen[st.swing] = 1; }
    if (cur.shots.length < 3 && st.atk >= cur.want[cur.shots.length]) {
      b.renderer.render(b.scene, b.camera);
      const c = document.createElement('canvas'); c.width = W; c.height = h;
      const g = c.getContext('2d'); g.filter = 'brightness(' + bright + ')'; g.drawImage(cv, 0, 0, W, h);
      cur.shots.push(c);
      if (cur.shots.length === 3) rows.push(cur);
    }
  }
  const sh = document.createElement('canvas'); sh.width = 3 * W; sh.height = rows.length * (h + 14);
  const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
  rows.forEach((r, j) => r.shots.forEach((c, i) => { g.drawImage(c, i * W, j * (h + 14)); g.fillStyle = '#9f9'; g.fillText(r.k + ' ' + ['tell', '-0.07', 'contact'][i], i * W + 3, j * (h + 14) + h + 11); }));
  return sh.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
};
/* the whole way in, in the background: sessionStorage['beachwalk.skipIntro']
 * must have been set before the reload. Poll window.__crStatus. */
window.__crBoot = function () {
  const b = window.__bw; window.__crStatus = 'starting';
  (async () => {
    let n = 0; while (!b.state().started && n++ < 60) { try { b.beginGame(); } catch (e) { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); }
    await import('/tools/c13shot.js?' + Date.now()); await import('/tools/roomshot.js');
    b.settings.devMode = false; window.__crStatus = 'c13 load';
    for (let i = 0; i < 60 && !b.c13State().ready; i++) { await new Promise((r) => setTimeout(r, 300)); __c13Step(2); }
    window.__crStatus = 'c13 go'; await new Promise((r) => setTimeout(r, 20));
    b.skipTakes(); await __c13Go(); b.skipTakes();
    const kn = () => b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb');
    window.__crStatus = 'knight';
    for (let i = 0; i < 900 && !(kn() && kn().model); i++) { __c13Step(1); await new Promise((r) => setTimeout(r, 40)); }
    for (let i = 0; i < 20; i++) __c13Step(1);
    window.__crStatus = kn() && kn().model ? 'ready' : 'no knight';
  })().catch((e) => { window.__crStatus = 'error ' + e; });
  return 'booting';
};
/* several clips, one row each, brightened so a dark figure can be read */
window.__crStrips = (clips, n = 6, w = 200, ang = 0.9, side = 3.6, bright = 2.0) => {
  const b = window.__bw, u = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb'), m = u.mixer, P = u.g.position;
  const fov0 = b.camera.fov; b.camera.fov = 42; b.camera.updateProjectionMatrix();
  const src = b.renderer.domElement, h = Math.round(w * src.height / src.width);
  const sh = document.createElement('canvas'); sh.width = n * w; sh.height = clips.length * (h + 14);
  const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
  clips.forEach((clip, j) => {
    for (const a of m._actions) { a.stop(); }
    const a = u.clips[clip]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const dur = a.getClip().duration, yaw = u.g.rotation.y + ang, rx = Math.sin(yaw), rz = Math.cos(yaw);
    for (let i = 0; i < n; i++) {
      a.time = dur * i / (n - 1); m.update(0); u.chain && (u.chain.k = 0); u.model.updateMatrixWorld(true);
      b.crusaderShieldTick && b.crusaderShieldTick(u);
      b.camera.position.set(P.x + rx * side, P.y + 1.4, P.z + rz * side); b.lookAt(P.x, P.y + 1.15, P.z); b.camera.updateMatrixWorld(true);
      b.renderer.render(b.scene, b.camera);
      g.filter = 'brightness(' + bright + ')'; g.drawImage(src, i * w, j * (h + 14), w, h); g.filter = 'none';
      g.fillStyle = '#9f9'; g.fillText(clip + ' ' + a.time.toFixed(2), i * w + 3, j * (h + 14) + h + 11);
    }
  });
  b.camera.fov = fov0; b.camera.updateProjectionMatrix();
  return sh.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
};
