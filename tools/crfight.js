/* A PLAYED FIGHT AGAINST THE FLAIL KNIGHT. Not part of the game.
 *   (after __crBoot)  await import('/tools/crfight.js'); __crPlay(seconds)  -> report
 *   __crShots()  -> padded base64 sheet of the moments it captured
 * A bot on the game's own inputs: the guard (parry timed off his wind-up, with
 * a human's reaction error), the katana's light cut and charged heavy, the
 * dodge step, and WASD to hold its distance. Nothing is healed. */
(function () {
  const b = window.__bw;
  const kn = () => b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb');
  const shots = [];
  const snap = (label) => {
    if (shots.length >= 12) return;
    b.renderer.render(b.scene, b.camera);
    const src = b.renderer.domElement, W = 360, h = Math.round(W * src.height / src.width);
    const c = document.createElement('canvas'); c.width = W; c.height = h;
    const g = c.getContext('2d'); g.filter = 'brightness(1.35)'; g.drawImage(src, 0, 0, W, h);
    shots.push({ c, label });
  };
  window.__crShots = () => {
    if (!shots.length) return 'none';
    const W = shots[0].c.width, h = shots[0].c.height, cols = 4;
    const sh = document.createElement('canvas'); sh.width = cols * W; sh.height = Math.ceil(shots.length / cols) * (h + 14);
    const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    shots.forEach((s, i) => { const x = (i % cols) * W, y = Math.floor(i / cols) * (h + 14); g.drawImage(s.c, x, y); g.fillStyle = '#9f9'; g.fillText(s.label, x + 3, y + h + 11); });
    return sh.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
  window.__crSetup = () => {
    const u = kn();
    b.settings.devMode = true; b.devGrantWeapons(); b.settings.devMode = false;
    if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem);
    // in the square, eight metres in front of him, through the arch
    const yaw = u.g.rotation.y, d = 8;
    b.camera.position.set(u.g.position.x + Math.sin(yaw) * d, u.g.position.y + 1.7, u.g.position.z + Math.cos(yaw) * d);
    b.camBaseY = u.g.position.y + 1.7;
    for (let i = 0; i < 20; i++) { b.lookAt(u.g.position.x, u.g.position.y + 1.5, u.g.position.z); __c13Step(1); }
    shots.length = 0;
    return { equipped: b.state().equipped, hp: b.state().hp, knightHp: u.st.hp };
  };
  const R = { t: 0, frames: 0, parries: 0, blocks: 0, hitsTaken: 0, dmgTaken: 0, cuts: 0, heavies: 0, landed: 0, dodges: 0, swingsSeen: 0, rage: false, end: null };
  window.__crR = R;
  let guardFor = -1, lastSwingT = -1, heavyHold = 0, seenSwing = false, jitter = 0, dodgeCD = 0;
  window.__crHuman = { err: 0.0, miss: 0.0, greed: 0.0 };   // a person: reaction error (s), unread tells, swings thrown into his wind-up
  window.__crPlay = function (seconds = 30) {
    const H = window.__crHuman;
    const u = kn(), K = b.keys;
    const N = Math.round(seconds * 60);
    for (let f = 0; f < N; f++) {
      if (!u.st.alive) { R.end = R.end || 'knight dead at ' + R.t.toFixed(1) + ' s'; break; }
      const st = b.state();
      if (st.dying || st.hp <= 0) { R.end = R.end || 'player dead at ' + R.t.toFixed(1) + ' s'; break; }
      const p = u.g.position, c = b.camera.position;
      const dx = p.x - c.x, dz = p.z - c.z, dist = Math.hypot(dx, dz);
      b.lookAt(p.x, p.y + 1.45, p.z);
      // ---- reading him
      const A = u.atk && u.atk[u.st.swing], t = u.st.atk;
      const winding = A && t >= 0 && t < A.wind, striking = A && t >= A.wind && t < A.wind + A.strike, recovering = A && t >= A.wind + A.strike;
      if (winding && !seenSwing) { seenSwing = true; R.swingsSeen++; jitter = (Math.random() - 0.5) * 0.12 + (Math.random() - 0.5) * 2 * H.err; R._miss = Math.random() < H.miss; R._greed = Math.random() < H.greed; }
      if (!(t >= 0)) seenSwing = false;
      // ---- the guard: raised ~0.13 s before contact (a parry), with a human's error
      let wantGuard = false;
      if (winding || striking) {
        const tc = A.wind - t;
        if (!R._miss && (tc < 0.13 + jitter || (striking && jitter > -0.05))) wantGuard = true;
        // tired: step back out of it instead
        if (st.stamina < 0.3 && tc < 0.25 && dodgeCD <= 0) { K.KeyS = true; K.Space = true; R.dodges++; dodgeCD = 1.2; }
      }
      if (wantGuard !== b.blocking) b.blocking = wantGuard;
      // ---- punishing: in his recovery, or while he reels
      const open = recovering || (u.st.stun > 0) || (u.st.recoil > 0) || (R._greed && winding && t < A.wind * 0.5);
      if (heavyHold > 0) { heavyHold -= 1 / 60; if (heavyHold <= 0) { b.releaseWind(); R.heavies++; } }
      else if (!wantGuard && open && dist < 2.7 && st.digT === 0) {
        if (u.st.stun > 0.6) { b.startWind(); heavyHold = 0.55; }
        else { b.attackAction(); R.cuts++; }
      }
      // ---- footing: hold about two metres
      K.KeyW = !wantGuard && dist > (open ? 1.9 : 2.6);
      K.KeyS = dist < 1.5 || (K.KeyS && dodgeCD > 0.9);
      K.KeyA = !wantGuard && !open && dist < 3.2 && (Math.floor(R.t / 2.3) % 2 === 0);
      dodgeCD -= 1 / 60;
      const spaceWas = K.Space;
      const hp0 = st.hp, kh0 = u.st.hp;
      __c13Step(1);
      R.t += 1 / 60; R.frames++;
      if (spaceWas) K.Space = false;
      const hp1 = b.state().hp;
      if (hp1 < hp0) { R.hitsTaken++; R.dmgTaken += hp0 - hp1; if (R.hitsTaken <= 2) snap('hit taken ' + R.t.toFixed(1) + 's'); }
      if (u.st.hp < kh0) { R.landed++; if (R.landed === 1 || R.landed === 6) snap('cut lands ' + R.t.toFixed(1) + 's'); }
      if (u.st.stun > 0 && !R._stunned) { R.parries++; R._stunned = true; if (R.parries <= 2) snap('parry ' + R.t.toFixed(1) + 's'); } else if (!(u.st.stun > 0)) R._stunned = false;
      if (winding && A && t > A.wind * 0.6 && t < A.wind * 0.6 + 0.02 && shots.length < 6) snap('tell: ' + u.st.swing + ' ' + R.t.toFixed(1) + 's');
      if (!R.rage && u.kind !== b.mutants && u.st.raged) { R.rage = true; snap('second wind ' + R.t.toFixed(1) + 's'); }
    }
    K.KeyW = K.KeyS = K.KeyA = false; b.blocking = false;
    if (!u.st.alive && !R.deathShot) { R.deathShot = true; for (let i = 0; i < 90; i++) __c13Step(1); snap('down ' + R.t.toFixed(1) + 's'); }
    return JSON.stringify({ t: R.t.toFixed(1), end: R.end, playerHp: b.state().hp, knightHp: u.st.hp, swingsSeen: R.swingsSeen, parries: R.parries, hitsTaken: R.hitsTaken, dmgTaken: R.dmgTaken, cuts: R.cuts, heavies: R.heavies, landed: R.landed, dodges: R.dodges, stamina: b.state().stamina });
  };
})();
