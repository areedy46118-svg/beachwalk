/* HARNESS: strips of the samurai's clips, with his katana pinned in his fist
 * the way `pinSamuraiSword` does it in the game. Not part of the game.
 *   eval(await (await fetch('/tools/samstrip.js')).text()); await __samSetup();
 *   __samStrip(['idle', 'gCutA'], 7, yawDeg, W, H, dist, t0, t1)  -> padded base64 jpeg */
window.__samSetup = async function () {
  const T = await import('three'); window.THREE = T;
  const b = window.__bw;
  for (let i = 0; i < 60 && !(b.dojoDebug.dojoReady && b.samurai && b.samurai.model); i++) { b.frame(1); await new Promise((r) => setTimeout(r, 250)); }
  const u = b.samurai;
  b.placeInDojo();
  window.requestAnimationFrame = () => 0;
  let kat = null, hand = null;
  u.model.traverse((o) => { if (o.isBone && o.name === 'Katana') kat = o; if (o.isBone && o.name === 'DEF-handR') hand = o; });
  for (const a of u.mixer._actions) { a.stop(); a.enabled = false; }
  // the grip offset is the CLIP's (a raw stamp, the life layer and its FK out of it): captured live it carries the FK's displacement
  const ia = u.clips.idle; ia.reset(); ia.enabled = true; ia.setEffectiveWeight(1); ia.play(); ia.time = 0.3; (u.mixer.rawUpdate || u.mixer.update).call(u.mixer, 0); u.model.updateMatrixWorld(true);
  window.__S = { T, b, u, R: b.renderer, C: b.camera, kat, hand, off: hand.matrixWorld.clone().invert().multiply(kat.matrixWorld) };
  ia.stop();
  u.g.position.set(b.DOJO_X + 1.5, b.DOJO_Y + 0.1, b.DOJO_Z + 3); u.g.rotation.y = 0;
  return !!u.samPicked;
};
window.__samStrip = function (names, n, yawDeg = 35, W = 180, H = 240, dist = 5.5, t0 = 0, t1 = 1, gain = 1.5) {
  const { T, b, u, R, C, kat, hand, off } = window.__S;
  u.g.visible = true;
  const cv = document.createElement('canvas'); cv.width = W * n; cv.height = H * names.length;
  const g = cv.getContext('2d');
  const rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
  const px = new Uint8Array(W * H * 4), img = g.createImageData(W, H);
  const p = u.g.position, ang = u.g.rotation.y + yawDeg * Math.PI / 180;
  C.position.set(p.x + Math.sin(ang) * dist, p.y + 1.6, p.z + Math.cos(ang) * dist);
  const f0 = C.fov; C.fov = 45; C.updateProjectionMatrix(); C.lookAt(p.x, p.y + 1.25, p.z); C.updateMatrixWorld();
  names.forEach((nm, row) => {
    const a = u.clips[nm]; if (!a) return;
    for (const x of u.mixer._actions) { x.stop(); x.enabled = false; }
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const d = a.getClip().duration;
    for (let i = 0; i < n; i++) {
      a.time = d * (t0 + (t1 - t0) * i / Math.max(1, n - 1)) * 0.999;
      u.mixer.update(0); u.model.updateMatrixWorld(true);
      const w = hand.matrixWorld.clone().multiply(off);
      kat.parent.matrixWorld.clone().invert().multiply(w).decompose(kat.position, kat.quaternion, kat.scale);
      kat.updateMatrixWorld(true);
      R.setRenderTarget(rt); R.render(b.scene, C); R.readRenderTargetPixels(rt, 0, 0, W, H, px); R.setRenderTarget(null);
      for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      for (let k = 0; k < img.data.length; k += 4) for (let c = 0; c < 3; c++) img.data[k + c] = Math.min(255, img.data[k + c] * gain);
      g.putImageData(img, i * W, row * H);
    }
    a.stop();
  });
  C.fov = f0; C.updateProjectionMatrix();
  return cv.toDataURL('image/jpeg', 0.8).split(',')[1] + '#' + 'x'.repeat(120000);
};
/* A hands-off fight on a fake clock, healed every frame:
 *   await __samFightSetup(); __samFight(1200)  -> swings, damage, throws, stars */
window.__samFightSetup = async function () {
  await window.__samSetup();
  const b = window.__bw; b.settings.devMode = false; b.beginGame();
  const rn = performance.now.bind(performance); let off = 0; performance.now = () => rn() + off; window.__offRef = { add: (x) => { off += x; } };
  for (let i = 0; i < 30; i++) { window.__offRef.add(16.7); b.frame(1); }
  if (!b.dojoDebug.inDojo) b.placeInDojo();
  b.wakeSamurai();
  for (let i = 0; i < 120; i++) { window.__offRef.add(16.7); b.frame(1); b.heal(); }
  window.__F = null;
  return b.samurai.st.awake;
};
window.__samFight = function (N = 1200, act) {
  const b = window.__bw, u = b.samurai;
  const F = window.__F || (window.__F = { sw: {}, dmg: 0, sdmg: 0, thr: 0, stars: 0, frames: 0, thrOn: false, dsum: 0, _in: false, blocked: 0, parried: 0 });
  for (let i = 0; i < N; i++) {
    window.__offRef.add(16.7);
    if (act) act(F, i);
    const hp0 = b.state().hp, lb = b.shurikens.filter((s) => s.live && !s.back).length;
    b.frame(1);
    const la = b.shurikens.filter((s) => s.live && !s.back).length, hp1 = b.state().hp;
    if (hp1 < hp0) { F.dmg += hp0 - hp1; if (la < lb) F.sdmg += hp0 - hp1; }
    if (la > lb) F.stars += la - lb;
    b.heal(); F.frames++;
    if (u.st.atk >= 0 && u.st.atk < 0.03) { if (!F._in) { F.sw[u.st.swing] = (F.sw[u.st.swing] || 0) + 1; F._in = true; } } else F._in = false;
    if (u.thr && !F.thrOn) F.thr++;
    F.thrOn = !!u.thr;
    F.dsum += Math.hypot(u.g.position.x - b.camera.position.x, u.g.position.z - b.camera.position.z);
  }
  const min = F.frames / 3600;
  return JSON.stringify({ sec: (F.frames / 60).toFixed(0), sw: F.sw, swMin: (Object.values(F.sw).reduce((a, c) => a + c, 0) / min).toFixed(0),
    dmgMin: (F.dmg / min).toFixed(0), starDmg: F.sdmg, throws: F.thr, stars: F.stars, hp: u.st.hp, dAvg: (F.dsum / F.frames).toFixed(2) });
};
/* Where the blow is on the frame it takes your health: the blade's nearest
 * point to your chest (a kick: the nearer toe to your hips). */
window.__samContact = function (N = 3600) {
  const b = window.__bw, u = b.samurai, T = window.THREE;
  const bone = (n) => { let r = null; u.model.traverse((o) => { if (o.name === n) r = o; }); return r; };
  const tip = bone('DEF-katana_tip'), hand = bone('DEF-handR'), toe = bone('DEF-toeR'), toeL = bone('DEF-toeL');
  const res = {}, L = new T.Line3(), c = new T.Vector3();
  for (let i = 0; i < N; i++) {
    window.__offRef.add(16.7);
    const hp0 = b.state().hp; b.frame(1); const hp1 = b.state().hp;
    if (hp1 < hp0 && u.st.atk >= 0) {
      const k = u.st.swing; let dd;
      if (/sSpin|sStab/.test(k)) { const hip = b.camera.position.clone(); hip.y -= 0.9; dd = Math.min(toe.getWorldPosition(new T.Vector3()).distanceTo(hip), toeL.getWorldPosition(new T.Vector3()).distanceTo(hip)); }
      else { const chest = b.camera.position.clone(); chest.y -= 0.45; L.set(hand.getWorldPosition(new T.Vector3()), tip.getWorldPosition(new T.Vector3())); L.closestPointToPoint(chest, true, c); dd = c.distanceTo(chest); }
      (res[k] = res[k] || []).push(+dd.toFixed(2));
    }
    b.heal();
  }
  return JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { n: v.length, med: v.sort((a, bb) => a - bb)[v.length >> 1], max: v[v.length - 1] }])));
};
/* From the player's eye, in a live fight: for each swing type seen, three
 * frames — the tell (half the wind), the contact, and just after. */
window.__samPOV = function (maxTypes = 6, frames = 3000, W = 220) {
  const b = window.__bw, u = b.samurai, R = b.renderer, cv = R.domElement;
  const h = Math.round(W * cv.height / cv.width);
  const seen = {}, rows = [];
  let cur = null;
  for (let i = 0; i < frames && rows.length < maxTypes; i++) {
    window.__offRef.add(16.7);
    b.lookAt(u.g.position.x, u.g.position.y + 1.5, u.g.position.z);
    b.frame(1); b.heal();
    const st = u.st, A = u.atk && u.atk[st.swing];
    if (!(st.atk >= 0) || !A) { cur = null; continue; }
    if (!cur) { if (seen[st.swing]) continue; cur = { k: st.swing, shots: [], want: [A.wind * 0.5, A.wind, A.wind + A.strike + 0.12] }; seen[st.swing] = 1; }
    if (cur.shots.length < 3 && st.atk >= cur.want[cur.shots.length]) {
      const c = document.createElement('canvas'); c.width = W; c.height = h;
      const g = c.getContext('2d'); g.filter = 'brightness(1.7)'; g.drawImage(cv, 0, 0, W, h);
      cur.shots.push(c);
      if (cur.shots.length === 3) rows.push(cur);
    }
  }
  const out = document.createElement('canvas'); out.width = W * 3; out.height = h * rows.length;
  const g = out.getContext('2d'); g.font = '13px monospace'; g.fillStyle = '#ff0';
  rows.forEach((r, j) => { r.shots.forEach((c, i) => g.drawImage(c, i * W, j * h)); g.fillText(r.k, 4, j * h + 14); });
  return out.toDataURL('image/jpeg', 0.8).split(',')[1] + '#' + 'x'.repeat(120000);
};
