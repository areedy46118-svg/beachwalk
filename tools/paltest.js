/* THE PALADIN, from the harness. Not part of the game.
 *   await import('/tools/paltest.js?' + Date.now());
 *   await __palBoot();          muted, past the intro, dev mode, in the first castle with the farmers' fight on
 *   await __palCut(ms)          a farmer out on the street, then his entrance; returns the take's log every 0.5 s
 *   __palStill([[x,y,z,tx,ty,tz,fov], ...]) is tools/still.js's `__still` */
const W = window, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mute = async () => {
  document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; });
  const c = W.__bw && W.__bw.audioCtx; if (c) { c.resume = () => Promise.resolve(); try { await c.suspend(); } catch (e) { /* */ } }
};
W.__palErrs = [];
W.addEventListener('error', (e) => W.__palErrs.push(String(e.message).slice(0, 200)));
W.__palBoot = async function () {
  for (let i = 0; i < 60 && !W.__bw; i++) await sleep(500);
  const b = W.__bw; await mute();
  for (let k = 0; k < 300 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) { /* */ } b.frame(3); await sleep(30); }
  b.settings.devMode = true;
  b.loadFort();
  for (let i = 0; i < 80 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.fortWallsStep(1e9); await sleep(400); }
  b.placeInFort();
  for (let i = 0; i < 30; i++) await sleep(100);
  for (let i = 0; i < 60 && !(b.paladinS().unit && b.paladinS().unit.texW && b.paladinS().unit.texW.compiled); i++) await sleep(250);
  await mute();
  return { intro: b.state().introDone, inFort: b.state().inFort, fight: b.farmFightS().started, pal: !!(b.paladinS().unit && b.paladinS().unit.model) };
};
W.__palCut = async function (ms = 20000) {
  const b = W.__bw, P = b.paladinS();
  for (let i = 0; i < 60; i++) { if (b.farmUnitsS().some((f) => f.farm.out && !f.farm.burst && f.st.alive)) break; await sleep(250); }
  await mute();
  b.palStartCut();
  const log = [], t0 = performance.now();
  while (performance.now() - t0 < ms) {
    await sleep(500);
    const C = P.cut, u = P.unit;
    if (!C) { log.push('END awake ' + u.st.awake + ' frozen ' + b.frozen() + ' swing ' + u.st.forceSwing); break; }
    const V = C.V;
    log.push(C.t.toFixed(1) + ':' + C.phase + ' d' + (V ? Math.hypot(V.g.position.x - u.g.position.x, V.g.position.z - u.g.position.z).toFixed(2) : '-')
      + ' V' + (V ? (V.st.alive ? 'A' : 'D') : '-') + ' fov' + b.camera.fov.toFixed(0));
  }
  return log;
};
/* his pose at moments of a clip, from a camera `d` metres off at bearing `az` (0 = in front of him): padded base64 */
W.__palPose = function (clips, n = 6, d = 5.5, az = 0.6, W0 = 300, H0 = 300) {
  const b = W.__bw, P = b.paladinS(), u = P.unit, r = b.renderer;
  P.out = true; u.g.visible = true; u.holdAnim = true;
  const p = u.g.position, yaw = u.g.rotation.y;
  const cam = new b.camera.constructor(40, W0 / H0, 0.05, 200);
  const cv = document.createElement('canvas'); cv.width = W0 * n; cv.height = H0 * clips.length; const g = cv.getContext('2d');
  const s0 = r.getSize(new p.constructor()); r.setSize(W0, H0, false);
  clips.forEach((name, row) => {
    const a = u.clips[name]; if (!a) return;
    for (const x of Object.values(u.clips)) x.stop();
    a.reset(); a.play(); a.paused = true; a.setEffectiveWeight(1);
    const dur = a.getClip().duration;
    for (let i = 0; i < n; i++) {
      a.time = dur * i / (n - 1) * 0.999; u.mixer.update(0); u.g.updateMatrixWorld(true);
      cam.position.set(p.x + Math.sin(yaw + az) * d, p.y + 1.6, p.z + Math.cos(yaw + az) * d); cam.lookAt(p.x, p.y + 1.3, p.z); cam.updateMatrixWorld();
      r.render(b.scene, cam); g.drawImage(r.domElement, i * W0, row * H0, W0, H0);
      g.fillStyle = '#9f9'; g.font = '12px monospace'; g.fillText(name + ' ' + (a.time).toFixed(2), i * W0 + 4, row * H0 + 14);
    }
  });
  r.setSize(s0.x, s0.y, false);
  return cv.toDataURL('image/jpeg', 0.85);
};
/* a sheet of [clip, t (0..1), label] cells, bright, from `az` off his front at `d` metres: padded data url */
W.__palCells = function (cells, cols = 6, az = 0.5, d = 5.5, W0 = 260, H0 = 300, gain = 2.0) {
  const b = W.__bw, P = b.paladinS(), u = P.unit, r = b.renderer, V = b.camera.position.constructor;
  P.out = true; u.g.visible = true; u.holdAnim = true;
  const cam0 = b.camera, fw = new V(); cam0.getWorldDirection(fw); fw.y = 0; fw.normalize();
  const x = cam0.position.x + fw.x * 6, z = cam0.position.z + fw.z * 6;
  u.g.position.set(x, b.fortCourtAt(x, z) ?? 0, z); u.g.rotation.y = Math.atan2(-fw.x, -fw.z);
  const cam = new cam0.constructor(40, W0 / H0, 0.05, 200);
  const rows = Math.ceil(cells.length / cols), cv = document.createElement('canvas'); cv.width = W0 * cols; cv.height = H0 * rows;
  const g = cv.getContext('2d'); g.filter = 'brightness(' + gain + ')';
  const s0 = r.getSize(new V()); r.setSize(W0, H0, false);
  cells.forEach(([name, t, lab, az2], i) => {
    for (const a of Object.values(u.clips)) a.stop();
    const a = u.clips[name]; if (!a) return;
    a.reset(); a.play(); a.paused = true; a.setEffectiveWeight(1); a.time = a.getClip().duration * t;
    u.mixer.update(0); if (u.model) u.model.rotation.y = 0; u.g.updateMatrixWorld(true);
    const p = u.g.position, yaw = u.g.rotation.y, A = az2 ?? az;
    cam.position.set(p.x + Math.sin(yaw + A) * d, p.y + 1.6, p.z + Math.cos(yaw + A) * d); cam.lookAt(p.x, p.y + 1.35, p.z); cam.updateMatrixWorld();
    r.render(b.scene, cam);
    const cx = (i % cols) * W0, cy = Math.floor(i / cols) * H0;
    g.filter = 'brightness(' + gain + ')'; g.drawImage(r.domElement, cx, cy, W0, H0);
    g.filter = 'none'; g.fillStyle = '#9f9'; g.font = '12px monospace'; g.fillText(lab || (name + ' ' + t), cx + 4, cy + 14);
  });
  r.setSize(s0.x, s0.y, false); u.holdAnim = false;
  return cv.toDataURL('image/jpeg', 0.82);
};
/* each swing thrown at a standing player from each distance: did it land, and how close the blade came in its window.
 * Needs the fake clock (`__clockOn`) and the castle (`__palBoot`). Returns { swing: { d: 'HIT 0.12' | 'miss 0.80' } } */
W.__palCal = function (swings, dists, reps = 1) {
  const b = W.__bw, P = b.paladinS(), u = P.unit, V = b.camera.position.constructor, cam = b.camera.position;
  b.settings.devMode = false; P.out = true; u.g.visible = true; u.holdAnim = false;
  const me = [cam.x, cam.z], fw = new V(); b.camera.getWorldDirection(fw); fw.y = 0; fw.normalize();
  const out = {};
  for (const sw of swings) {
    out[sw] = {};
    for (const d of dists) {
      let hits = 0, best = 1e9;
      for (let r = 0; r < reps; r++) {
        u.st.atk = -1; u.st.cool = 0; u.st.stun = 0; u.st.roar = 0; u.st.awake = true; u.st.chainAt = -1; u.st.chained = false;
        const x = me[0] + fw.x * d, z = me[1] + fw.z * d;
        u.g.position.set(x, b.fortCourtAt(x, z) ?? 0, z); u.g.rotation.y = Math.atan2(me[0] - x, me[1] - z); if (u.model) u.model.rotation.y = 0;
        u.st.forceSwing = sw;
        let started = false, hp0 = b.state().hp, hit = false;
        for (let k = 0; k < 400; k++) {
          W.__adv(1);
          for (const f of b.farmUnitsS()) if (f.st.alive) f.st.awake = false;
          cam.x = me[0]; cam.z = me[1];
          if (b.state().hp < hp0) hit = true;
          b.heal(); hp0 = b.state().hp;
          const A = u.st.atk >= 0 ? u.atk[u.st.swing] : null;
          if (!A) { if (started) break; continue; }
          if (u.st.swing !== sw) { u.st.chainAt = -1; continue; }
          started = true; u.st.chainAt = -1;                      // (no chaining on: one blow at a time)
          if (u.st.atk >= A.wind && u.st.atk < A.wind + A.strike) {
            const tip = u.palTip.getWorldPosition(new V()), hil = u.palHilt.getWorldPosition(new V());
            for (let j = 0; j <= 10; j++) {
              const p = hil.clone().lerp(tip, 0.25 + 0.75 * j / 10);
              const dh = Math.hypot(p.x - cam.x, p.z - cam.z), vy = Math.max(0, (cam.y - 1.5) - p.y, p.y - (cam.y + 0.05));
              best = Math.min(best, Math.hypot(dh, vy));
            }
          }
        }
        if (hit) hits++;
      }
      out[sw][d] = (hits ? 'HIT' + hits : 'miss') + ' ' + best.toFixed(2);
    }
  }
  return out;
};
/* fair? each swing from `d`, three ways: you stand, you step back 1.6 m as the blow comes, you step aside 1.6 m. */
W.__palFair = function (swings, d = 2.2, lead = 0.2) {
  const b = W.__bw, P = b.paladinS(), u = P.unit, V = b.camera.position.constructor, cam = b.camera.position;
  b.settings.devMode = false; P.out = true; u.g.visible = true; u.holdAnim = false;
  const me = [cam.x, cam.z], fw = new V(); b.camera.getWorldDirection(fw); fw.y = 0; fw.normalize();
  const out = {};
  for (const sw of swings) {
    const row = [];
    for (const mode of ['stand', 'back', 'side']) {
      u.st.atk = -1; u.st.cool = 0; u.st.stun = 0; u.st.awake = true; u.palRM = null;
      const x = me[0] + fw.x * d, z = me[1] + fw.z * d;
      u.g.position.set(x, b.fortCourtAt(x, z) ?? 0, z); u.g.rotation.y = Math.atan2(me[0] - x, me[1] - z); if (u.model) u.model.rotation.y = 0;
      u.st.forceSwing = sw;
      let px = me[0], pz = me[1], moved = false, started = false, hit = false, hp0 = b.state().hp;
      for (let k = 0; k < 400; k++) {
        W.__adv(1);
        for (const f of b.farmUnitsS()) if (f.st.alive) f.st.awake = false;
        const A = u.st.atk >= 0 ? u.atk[u.st.swing] : null;
        if (A && u.st.swing === sw) { started = true; u.st.chainAt = -1; if (!moved && u.st.atk >= A.wind - lead) moved = true; } else if (started) break;
        if (moved && mode !== 'stand') {
          const tx = mode === 'back' ? me[0] - fw.x * 1.6 : me[0] + fw.z * 1.6, tz = mode === 'back' ? me[1] - fw.z * 1.6 : me[1] - fw.x * 1.6;
          px += (tx - px) * 0.25; pz += (tz - pz) * 0.25;
        }
        cam.x = px; cam.z = pz;
        if (b.state().hp < hp0) hit = true;
        b.heal(); hp0 = b.state().hp;
      }
      row.push(mode + ':' + (started ? (hit ? 'HIT' : 'miss') : 'none'));
    }
    out[sw] = row.join(' ');
  }
  cam.x = me[0]; cam.z = me[1];
  return out;
};
/* a real fight for `sec` seconds against a player who stands (`dodge` false) or steps back 1.6 m as each blow comes
 * (true) and comes back after: how many of his blows land. */
W.__palBout = function (sec = 30, dodge = false, far = 1.6) {
  const b = W.__bw, P = b.paladinS(), u = P.unit, V = b.camera.position.constructor, cam = b.camera.position;
  b.settings.devMode = false; P.out = true; u.g.visible = true; u.holdAnim = false; u.st.awake = true;
  const home = [cam.x, cam.z]; let px = home[0], pz = home[1], blows = 0, hits = 0, prev = -1, pend = 0, hp0 = b.state().hp, back = 0;
  for (let i = 0; i < sec * 60; i++) {
    W.__adv(1);
    for (const f of b.farmUnitsS()) if (f.st.alive) f.st.awake = false;
    const A = u.st.atk >= 0 ? u.atk[u.st.swing] : null;
    if (A && prev < A.wind - 0.2 && u.st.atk >= A.wind - 0.2) { blows++; pend = Math.round((0.2 + A.strike + 0.1) * 60); if (dodge) back = far; }
    prev = A ? u.st.atk : -1;
    // away from him, and back to where you were once his blow is done
    const dx = home[0] - u.g.position.x, dz = home[1] - u.g.position.z, dl = Math.hypot(dx, dz) || 1;
    const tx = home[0] + dx / dl * back, tz = home[1] + dz / dl * back;
    px += (tx - px) * 0.25; pz += (tz - pz) * 0.25;
    if (pend > 0 && --pend === 0) back = 0;
    cam.x = px; cam.z = pz;
    if (b.state().hp < hp0 && pend > 0) { hits++; pend = 0; back = 0; }
    b.heal(); hp0 = b.state().hp;
  }
  cam.x = home[0]; cam.z = home[1];
  return { blows, hits, pct: blows ? Math.round(100 * hits / blows) : 0 };
};
/* HOW NEAR EACH BLOW COMES (round 6): `__palNear(sec, mode)` — mode 'still', 'circle' (you walk round him at 2 m/s),
 * 'back' (1.6 m back as each blow is drawn) — returns per blow its swing and the closest the blade's outer three
 * quarters came to the axis of your body between your feet and your eye over its strike, and whether it hurt. */
W.__palNear = function (sec = 20, mode = 'still') {
  const b = W.__bw, P = b.paladinS(), u = P.unit, cam = b.camera.position, V = cam.constructor;
  b.settings.devMode = false; P.out = true; u.g.visible = true; u.holdAnim = false; u.st.awake = true;
  const home = [cam.x, cam.z], H = new V(), T = new V(), Q = new V();
  const out = []; let cur = null, prevAtk = -1, hp0 = b.state().hp, ang = 0;
  for (let i = 0; i < sec * 60; i++) {
    W.__adv(1);
    for (const f of b.farmUnitsS()) if (f.st.alive) f.st.awake = false;
    const st = u.st, A = st.atk >= 0 ? u.atk[st.swing] : null;
    if (A && (st.atk < prevAtk || !cur)) { cur = { sw: st.swing, near: 99, hit: false, d0: +Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z).toFixed(2) }; out.push(cur); }
    if (!A) cur = null;
    prevAtk = A ? st.atk : -1;
    if (A && cur && st.atk >= A.wind - 0.05 && st.atk <= A.wind + A.strike + 0.1 && u.palTip && u.palHilt) {
      u.palHilt.getWorldPosition(H); u.palTip.getWorldPosition(T);
      for (let k = 0; k <= 8; k++) { Q.copy(H).lerp(T, 0.25 + 0.75 * k / 8); if (Q.y > cam.y - 1.75 && Q.y < cam.y + 0.2) cur.near = Math.min(cur.near, Math.hypot(Q.x - cam.x, Q.z - cam.z)); }
    }
    if (mode === 'circle') { ang += 2 / 3.2 / 60; const r = 3.2, cx = u.g.position.x, cz = u.g.position.z; const d = Math.hypot(cam.x - cx, cam.z - cz) || 1; const a0 = Math.atan2(cam.x - cx, cam.z - cz) + 2 / 60 / Math.max(1.5, d); cam.x += ((cx + Math.sin(a0) * r) - cam.x) * 0.2; cam.z += ((cz + Math.cos(a0) * r) - cam.z) * 0.2; }
    if (mode === 'back' && A && st.atk > A.wind - 0.35 && st.atk < A.wind) { const dx = cam.x - u.g.position.x, dz = cam.z - u.g.position.z, dl = Math.hypot(dx, dz) || 1; cam.x += dx / dl * 1.6 / 0.35 / 60; cam.z += dz / dl * 1.6 / 0.35 / 60; }
    if (mode === 'still') { cam.x = home[0]; cam.z = home[1]; }
    if (b.state().hp < hp0 && cur) cur.hit = true;
    b.heal(); hp0 = b.state().hp;
  }
  cam.x = home[0]; cam.z = home[1];
  const n = out.length, hits = out.filter((o) => o.hit).length;
  return { n, hits, near: out.map((o) => o.sw.slice(1) + ':' + o.near.toFixed(2) + (o.hit ? '*' : '') + '@' + o.d0) };
};
/* EACH BLOW ON ITS OWN (round 7): `__palEach(reps, mode)` forces every swing he owns `reps` times ('still' or 'circle')
 * and returns, per swing, the blade's closest pass to your body axis over its strike (m) and how many hurt. */
W.__palEach = function (reps = 3, mode = 'still') {
  const b = W.__bw, P = b.paladinS(), u = P.unit, cam = b.camera.position, V = cam.constructor;
  b.settings.devMode = false; P.out = true; u.g.visible = true; u.holdAnim = false; u.st.awake = true;
  const home = [cam.x, cam.z], H = new V(), T = new V(), Q = new V(), res = {};
  for (const k of Object.keys(u.kind.use)) {
    const R = res[k] = { near: [], hits: 0, n: 0 };
    for (let r = 0; r < reps; r++) {
      cam.x = home[0]; cam.z = home[1];
      // wait for him to be free, then make it this one
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { W.__adv(1); b.heal(); for (const f of b.farmUnitsS()) f.st.awake = false; }
      u.st.forceSwing = k; let near = 99, hit = false, started = false, hp0 = b.state().hp, ang = 0;
      for (let i = 0; i < 360; i++) {
        W.__adv(1);
        for (const f of b.farmUnitsS()) f.st.awake = false;
        const st = u.st, A = st.atk >= 0 && st.swing === k ? u.atk[k] : null;
        if (A) started = true; else if (started) break;
        if (A && st.atk >= A.wind - 0.05 && st.atk <= A.wind + A.strike + 0.1) {
          u.palHilt.getWorldPosition(H); u.palTip.getWorldPosition(T);
          for (let j = 0; j <= 8; j++) { Q.copy(H).lerp(T, 0.25 + 0.75 * j / 8); if (Q.y > cam.y - 1.75 && Q.y < cam.y + 0.2) near = Math.min(near, Math.hypot(Q.x - cam.x, Q.z - cam.z)); }
        }
        if (mode === 'circle') { const cx = u.g.position.x, cz = u.g.position.z, d = Math.hypot(cam.x - cx, cam.z - cz) || 1, a0 = Math.atan2(cam.x - cx, cam.z - cz) + 2 / 60 / Math.max(1.5, d); cam.x = cx + Math.sin(a0) * d; cam.z = cz + Math.cos(a0) * d; }
        if (b.state().hp < hp0) hit = true;
        b.heal(); hp0 = b.state().hp;
      }
      if (started) { R.n++; R.near.push(+near.toFixed(2)); if (hit) R.hits++; }
    }
  }
  cam.x = home[0]; cam.z = home[1];
  return res;
};
