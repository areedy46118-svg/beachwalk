/* THE DARK KNIGHT AGAINST A PLAYER WHO MOVES (2026-10-29, the owner: "make the darkknight moveset better he misses every
 * hit hes bad and the animations suck hes sliding all over the place"). Not part of the game: `tools/probes.js dkMove*`.
 * His own choices, 30 s a mode, you looking at him and moving the way a player does:
 *   still  — stood 3 m off (the control)
 *   strafe — round him at the walk (3.4 m/s), turning back every 1.2–2.4 s
 *   back   — a quarter second after each swing starts, backs off at the walk for 0.45 s (1.5 m), then walks back in
 *   drift  — wandering 2.6 m/s, a new heading every half second, kept 1.8–4.5 m from him
 *   dodge  — stood 2.6 m off; 0.15 s before each of his contacts a side-step (5 m/s for 0.25 s): these SHOULD miss
 * Per contact: landed or not, the nearest the blade came to your upper body (eye −0.85 … +0.15) in its window, and how
 * far he stood from you. And his planted foot's speed over the paving, by what he was doing. */
export async function dkMove({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, V = C.constructor;
  const tip = u.bones.tip, hilt = u.model.getObjectByName('kn_hilt');
  const bl = u.model.getObjectByName('b_MF_Foot_L'), br = u.model.getObjectByName('b_MF_Foot_R');
  const H = new V(), T = new V(), Q = new V(), fl = new V(), fr = new V(), pl = new V(), pr = new V();
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const modes = (w.__mvModes || new URLSearchParams(location.search).get('modes') || 'still,strafe,back,drift,dodge').split(',');
  const SEC = w.__mvSec || +(new URLSearchParams(location.search).get('sec') || 30), dt = 1 / 60, WALK = 3.4;
  const allSk = {};
  for (const mode of modes) {
    // start each mode from 3 m in front of him, nothing in hand
    for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
    const yaw0 = u.g.rotation.y; const me = { x: P.x + Math.sin(yaw0) * 3, z: P.z + Math.cos(yaw0) * 3 };
    let sideDir = 1, sideT = 1.5, hd = rnd() * 6.28, hdT = 0, sw = null, lastAtk = -1, swStart = 0, dodgeT = 0, dodgeDir = 1, hitAt = u.hitAt || 0;
    const per = {}, contacts = [], sk = {}; let first = true, px0 = { x: P.x, z: P.z }, cur = null, frames = 0;
    for (let f = 0; f < 60 * SEC; f++) {
      frames++;
      const dx = me.x - P.x, dz = me.z - P.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;   // from him to you
      let vx = 0, vz = 0;
      const A = u.st.atk >= 0 ? u.atk[u.st.swing] : null, t = u.st.atk;
      if (mode === 'strafe') {
        sideT -= dt; if (sideT <= 0) { sideDir = -sideDir; sideT = 1.2 + rnd() * 1.2; }
        vx = -uz * sideDir * WALK; vz = ux * sideDir * WALK;
        if (d < 1.6) { vx += ux * 1.5; vz += uz * 1.5; } else if (d > 5) { vx -= ux * 2; vz -= uz * 2; }
      } else if (mode === 'back') {
        const since = A ? t : 9;
        if (A && since > 0.25 && since < 0.70) { vx = ux * WALK; vz = uz * WALK; }
        else if (!A && d > 3.0) { vx = -ux * 2.0; vz = -uz * 2.0; }
      } else if (mode === 'drift') {
        hdT -= dt; if (hdT <= 0) { hd = rnd() * 6.28; hdT = 0.5; }
        vx = Math.sin(hd) * 2.6; vz = Math.cos(hd) * 2.6;
        const rad = vx * ux + vz * uz;
        if ((d < 1.8 && rad < 0) || (d > 4.5 && rad > 0)) { vx -= 2 * rad * ux; vz -= 2 * rad * uz; }
      } else if (mode === 'dodge') {
        if (A && dodgeT <= 0) {
          const cs = [A.wind, ...(A.moreT || [])];
          if (cs.some((c) => t >= c - 0.15 && t < c - 0.15 + dt * 1.01)) { dodgeT = 0.25; dodgeDir = -dodgeDir; }
        }
        if (dodgeT > 0) { dodgeT -= dt; vx = -uz * dodgeDir * 5; vz = ux * dodgeDir * 5; }
        else if (!A) { const e = d - 2.6; vx = -ux * e * 2; vz = -uz * e * 2; }
      }
      me.x += vx * dt; me.z += vz * dt;
      C.x = me.x; C.z = me.z;
      b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = me.x; C.z = me.z;
      for (const g of b.farmUnitsS()) g.st.awake = false;
      // a new swing
      if (u.st.atk >= 0 && (sw !== u.st.swing || u.st.atk < lastAtk)) {
        const s = per[u.st.swing] || (per[u.st.swing] = { n: 0, cn: 0, land: 0 }); s.n++;
        const A2 = u.atk[u.st.swing]; cur = { k: u.st.swing, s, cs: [A2.wind, ...(A2.moreT || [])].map((c) => ({ t: c, best: 9, land: false, d: -1, strike: A2.strike })) };
        s.cn += cur.cs.length;
      }
      if (u.st.atk >= 0 && cur) {
        const t2 = u.st.atk;
        for (const c of cur.cs) if (t2 >= c.t - 0.02 && t2 <= c.t + c.strike + 0.06) {
          if (c.d < 0) c.d = Math.hypot(P.x - C.x, P.z - C.z);
          u.model.updateMatrixWorld(true); hilt.getWorldPosition(H); tip.getWorldPosition(T);
          for (let j = 0; j <= 8; j++) { Q.copy(H).lerp(T, j / 8); const y = Math.min(C.y + 0.15, Math.max(C.y - 0.85, Q.y)); const dd = Math.hypot(Q.x - C.x, Q.z - C.z, Q.y - y); if (dd < c.best) c.best = dd; }
        }
        if (u.hitAt && u.hitAt !== hitAt) { hitAt = u.hitAt; const c = cur.cs.reduce((a2, c2) => (Math.abs(t2 - c2.t) < Math.abs(t2 - a2.t) ? c2 : a2)); if (!c.land) { c.land = true; cur.s.land++; } }
      }
      if (u.st.atk < 0 && cur) { contacts.push(cur); cur = null; }
      if (u.st.atk >= 0 && cur && u.st.atk < lastAtk) { /* (a chained one starts its own above) */ }
      sw = u.st.atk >= 0 ? u.st.swing : null; lastAtk = u.st.atk;
      if (cur && (sw !== cur.k)) { contacts.push(cur); cur = null; }
      // the planted foot
      u.model.updateMatrixWorld(true); bl.getWorldPosition(fl); br.getWorldPosition(fr);
      if (!first) {
        const low = fl.y < fr.y ? [fl, pl] : [fr, pr], hy = low[0].y - P.y;
        const sp = Math.hypot(low[0].x - low[1].x, low[0].z - low[1].z) * 60, vy = Math.abs(low[0].y - low[1].y) * 60;
        const bm = Math.hypot(P.x - px0.x, P.z - px0.z) * 60;
        const k = u.st.atk >= 0 ? 'swing' : bm > 0.2 ? 'moving' : 'standing';
        if (hy < 0.345 && vy < 0.4) for (const key of [k, 'ALL']) for (const S of [sk, allSk]) { const s = S[key] || (S[key] = { n: 0, sum: 0, bad: 0, body: 0 }); s.n++; s.sum += sp; if (sp > 0.6) s.bad++; s.body += bm; }
      }
      first = false; pl.copy(fl); pr.copy(fr); px0.x = P.x; px0.z = P.z;
      b.heal();
    }
    if (cur) contacts.push(cur);
    let cn = 0, ln = 0, short = [], sw2 = 0, swL = 0; const miss = [];
    for (const c of contacts) { sw2++; let any = false; for (const k of c.cs) { if (k.d < 0) continue; cn++; if (k.land) { ln++; any = true; } else { short.push(k.best); miss.push(c.k + ':' + k.best.toFixed(2) + '@' + k.d.toFixed(1)); } } if (any) swL++; }
    short.sort((a, c) => a - c);
    log('MODE', mode.padEnd(6), 'swings', sw2, 'with a contact landed', swL, '| contacts', cn, 'landed', ln, '(' + Math.round(100 * ln / Math.max(1, cn)) + '%)', '| missed by median', short.length ? short[Math.floor(short.length / 2)].toFixed(2) : '-');
    log('   per swing', Object.entries(per).map(([k, s]) => `${k} ${s.land}/${s.cn}`).join(', '));
    log('   misses (swing:blade-gap@his distance)', miss.slice(0, 14).join(' '));
    log('   feet', Object.entries(sk).map(([k, s]) => `${k} ${(s.sum / s.n).toFixed(2)} m/s skating ${Math.round(100 * s.bad / s.n)}% (body ${(s.body / s.n).toFixed(2)})`).join(' | '));
  }
  log('FEET ALL', Object.entries(allSk).map(([k, s]) => `${k} ${(s.sum / s.n).toFixed(2)} m/s skating ${Math.round(100 * s.bad / s.n)}% (body ${(s.body / s.n).toFixed(2)}) n ${s.n}`).join(' | '));
}

// HIS STRIDES, BY HIS FEET: the gaits' `clipSpeed` (the retargeted root's travel over the clip) against what his feet
// measure (`measureGaits` on his foot bones — his rig has no toes, so it had never been asked), and the model's scale
export async function dkGait({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot())); w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u, G = ['sWalk', 'sRun', 'sStr1', 'sStr2', 'sWalkB', 'sRunB', 'sStr3', 'sStr4'];
  const cs = () => G.map((g) => g + ' ' + (u.clipSpeed[g] || 0).toFixed(2)).join(', ');
  log('model scale', u.model.scale.x.toFixed(3), 'g scale', u.g.scale.x.toFixed(3), 'gaitToes', JSON.stringify(u.kind.gaitToes || null), 'measured', !!u._gaitMeasured);
  log('clipSpeed now', cs());
  const T = u.clipTravel; for (const g of G) if (T[g]) { const e = T[g][T[g].length - 1]; log('  travel', g, 'fwd', e[1].toFixed(2), 'side', e[0].toFixed(2), 'dur', u.clips[g].getClip().duration.toFixed(2)); }
  u.kind.gaitToes = ['b_MF_Foot_L', 'b_MF_Foot_R']; u._gaitMeasured = false; u._gaitTries = 0;
  for (let i = 0; i < 30; i++) { w.__adv(1); b.heal(); }
  log('measured', !!u._gaitMeasured, 'clipSpeed by the feet', cs());
}

// WHERE HIS FEET TAKE HIM IN EACH SWING CLIP: every attack clip scrubbed on him, paused, in his own frame; the lower foot
// while it stays the lower foot (and near the floor) is planted, and what it slides backwards is the ground the clip walks.
// Against the recorded root travel where there is one (`clipTravel`, the pack's), and the pelvis's own wander.
export async function dkClipFeet({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  log('boot', JSON.stringify(await w.__palBoot())); w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u, V = u.g.position.constructor, M = new (u.g.matrixWorld.constructor)();
  const FL = u.model.getObjectByName('b_MF_Foot_L'), FR = u.model.getObjectByName('b_MF_Foot_R'), PV = u.model.getObjectByName('b_MF_Pelvis');
  const a0 = new V(), b0 = new V(), c0 = new V();
  const names = (w.__clipList || new URLSearchParams(location.search).get('clips') || '').split(',').filter(Boolean);
  const yawOf = () => { const q = new (u.g.quaternion.constructor)(); u.model.getObjectByName('b_MF_Spine_03').getWorldQuaternion(q); const v = new V(0, 0, 1).applyQuaternion(q); const v2 = new V(1, 0, 0).applyQuaternion(q); const v3 = new V(0, 1, 0).applyQuaternion(q); return [Math.atan2(v.x, v.z), Math.atan2(v2.x, v2.z), Math.atan2(v3.x, v3.z)].map((x) => (x * 57.3).toFixed(0)).join('/'); };
  const list = names.length ? names : [...new Set(Object.keys(u.atk).filter((k) => /^dk/.test(k)).map((k) => u.atk[k].clip)), 'sWalk', 'sIdle'];
  for (const k in u.clips) { const a = u.clips[k]; a.stop(); a.enabled = false; a.setEffectiveWeight(0); }
  u.model.rotation.y = 0;
  for (const nm of list) {
    const a = u.clips[nm]; if (!a) { log(nm, 'none'); continue; }
    const dur = a.getClip().duration, N = Math.max(40, Math.round(dur * 60));
    a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
    let pr = null, pl = null, last = null, tx = 0, tz = 0, pmin = [9, 9], pmax = [-9, -9], air = 0; const curve = [], pcur = [];
    let ymin = 9; for (let i = 0; i <= N; i++) { a.time = dur * i / N; u.mixer.update(0); u.g.updateMatrixWorld(true); M.copy(u.g.matrixWorld).invert(); FL.getWorldPosition(a0).applyMatrix4(M); FR.getWorldPosition(b0).applyMatrix4(M); ymin = Math.min(ymin, a0.y, b0.y); }
    for (let i = 0; i <= N; i++) {
      a.time = dur * i / N; u.mixer.update(0); u.g.updateMatrixWorld(true); M.copy(u.g.matrixWorld).invert();
      FL.getWorldPosition(a0).applyMatrix4(M); FR.getWorldPosition(b0).applyMatrix4(M); PV.getWorldPosition(c0).applyMatrix4(M);
      pmin[0] = Math.min(pmin[0], c0.x); pmin[1] = Math.min(pmin[1], c0.z); pmax[0] = Math.max(pmax[0], c0.x); pmax[1] = Math.max(pmax[1], c0.z);
      const lowL = a0.y <= b0.y, low = lowL ? a0 : b0, side = lowL ? 'L' : 'R';
      if (low.y - ymin > 0.25) { air++; last = null; }
      else { if (last === side) { const q = lowL ? pl : pr; tx -= low.x - q.x; tz -= low.z - q.z; } last = side; }
      pl = a0.clone(); pr = b0.clone();
      curve.push([tx, tz]); pcur.push([c0.x, c0.z]);
    }
    const ks = Object.keys(u.atk).filter((k) => u.atk[k].clip === nm), A = ks.length ? u.atk[ks[0]] : null;
    const at = (f) => curve[Math.min(N, Math.round(f * N))];
    const T = u.clipTravel[nm], e = T && T[T.length - 1];
    log(nm.padEnd(8), (ks.join('/') || '-').padEnd(10), 'dur', dur.toFixed(2), 'feet travel fwd', tz.toFixed(2), 'side', (-tx).toFixed(2),
      A ? 'to hit ' + A.hit.toFixed(2) + ': fwd ' + at(A.hit)[1].toFixed(2) + ' side ' + (-at(A.hit)[0]).toFixed(2) : '',
      '| recorded', e ? 'fwd ' + e[1].toFixed(2) + ' side ' + e[0].toFixed(2) : 'none', '| pelvis wander x', (pmax[0] - pmin[0]).toFixed(2), 'z', (pmax[1] - pmin[1]).toFixed(2), '| airborne', air + '/' + (N + 1));
    log('   along', curve.filter((_, i) => i % Math.ceil(N / 12) === 0).map((c) => c[1].toFixed(2) + '/' + (-c[0]).toFixed(2)).join(' '));
    a.time = 0; u.mixer.update(0); u.g.updateMatrixWorld(true); const y0 = yawOf(); a.time = dur * 0.5; u.mixer.update(0); u.g.updateMatrixWorld(true); const y1 = yawOf(); a.time = dur; u.mixer.update(0); u.g.updateMatrixWorld(true); log('   chest yaw (3 axes) start', y0, 'mid', y1, 'end', yawOf());
    log('   pelvis', pcur.filter((_, i) => i % Math.ceil(N / 12) === 0).map((c) => c[1].toFixed(2) + '/' + (-c[0]).toFixed(2)).join(' '), 'end', pcur[N][1].toFixed(2) + '/' + (-pcur[N][0]).toFixed(2));
    a.stop(); a.enabled = false; a.setEffectiveWeight(0);
  }
}

// EACH SWING FORCED FROM THE NEAR END, THE MIDDLE AND THE FAR END OF WHERE IT MAY BE THROWN FROM (`A.rmFrom`), you
// standing: contacts landed, and at each contact his distance against the stand-off it wanted (`A.rmStop`), the warp
// (`dkRM.k`), and the blade's nearest pass to your upper body. `__dkKeys` / `&keys=` for some only; `&mv=back|strafe`
// moves you through it (backing off at the walk 0.25-0.7 s into it, or strafing at the walk).
export async function dkWarp({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const Q = new URLSearchParams(location.search), mv = Q.get('mv') || '';
  const C = b.camera.position, P = u.g.position, V = C.constructor, H = new V(), T = new V(), X = new V();
  const tip = u.bones.tip, hilt = u.model.getObjectByName('kn_hilt');
  const keys = (Q.get('keys') || w.__dkKeys || Object.keys(u.kind.use).join(',')).split(',').filter((k) => u.atk[k]);
  let land = 0, tot = 0;
  for (const k of keys) {
    const A = u.atk[k], out = [];
    log(k.padEnd(8), 'clip', A.clip, 'wind', A.wind.toFixed(2), 'contacts', [A.wind, ...(A.moreT || [])].map((x) => x.toFixed(2)).join('/'), 'stops', (A.rmStop || []).map((x) => x.toFixed(2)).join('/'), 'yaw', (A.rmYaw || []).map((x) => x.toFixed(2)).join('/'), 'from', (A.rmFrom || []).map((x) => x.toFixed(2)).join('-'), 'travel to hit', u.clipTravel[A.clip] ? (() => { const L = u.clipTravel[A.clip], e = L[Math.round(A.hit * (L.length - 1))]; return e[1].toFixed(2) + '/' + e[0].toFixed(2); })() : '-');
    const R = A.rmFrom || [A.stop, A.stop];
    for (const D of [R[0] + 0.1, (R[0] + R[1]) / 2, R[1] - 0.1]) {
      for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
      const yaw = u.g.rotation.y; const me = { x: P.x + Math.sin(yaw) * D, z: P.z + Math.cos(yaw) * D };
      for (let i = 0; i < 15; i++) { C.x = me.x; C.z = me.z; b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); b.heal(); for (const g of b.farmUnitsS()) g.st.awake = false; }
      u.st.forceSwing = k; u.st.cool = 0;
      let started = false, h0 = u.hitAt || 0, sd = 1; const cs = [A.wind, ...(A.moreT || [])].map((t) => ({ t, d: -1, best: 9, land: false, kk: 0 }));
      for (let i = 0; i < 700; i++) {
        const live0 = u.st.atk >= 0 && u.st.swing === k, t0 = u.st.atk;
        if (live0 && mv) { const dx = me.x - P.x, dz = me.z - P.z, dl = Math.hypot(dx, dz) || 1;
          if (mv === 'back' && t0 > 0.25 && t0 < 0.7) { me.x += dx / dl * 3.4 / 60; me.z += dz / dl * 3.4 / 60; }
          if (mv === 'strafe') { if (i % 90 === 0) sd = -sd; me.x += -dz / dl * sd * 3.4 / 60; me.z += dx / dl * sd * 3.4 / 60; } }
        C.x = me.x; C.z = me.z; b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); C.x = me.x; C.z = me.z; for (const g of b.farmUnitsS()) g.st.awake = false;
        const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
        if (!live) continue;
        const t = u.st.atk;
        for (const c of cs) if (t >= c.t - 0.02 && t <= c.t + A.strike + 0.06) {
          if (c.d < 0) { c.d = Math.hypot(P.x - C.x, P.z - C.z); c.kk = u.dkRM ? u.dkRM.k : -1; }
          u.model.updateMatrixWorld(true); hilt.getWorldPosition(H); tip.getWorldPosition(T);
          for (let j = 0; j <= 8; j++) { X.copy(H).lerp(T, j / 8); const y = Math.min(C.y + 0.15, Math.max(C.y - 0.85, X.y)); const dd = Math.hypot(X.x - C.x, X.z - C.z, X.y - y); if (dd < c.best) c.best = dd; }
        }
        if (u.hitAt && u.hitAt !== h0) { h0 = u.hitAt; const c = cs.reduce((a2, c2) => (Math.abs(t - c2.t) < Math.abs(t - a2.t) ? c2 : a2)); c.land = true; }
        b.heal();
      }
      for (const c of cs) { if (c.d < 0) continue; tot++; if (c.land) land++; }
      out.push(D.toFixed(1) + ':' + (started ? cs.map((c) => (c.land ? 'L' : 'm') + c.best.toFixed(2) + '@' + c.d.toFixed(2) + 'k' + c.kk.toFixed(2)).join('+') : 'never'));
    }
    log('    ', out.join('  '));
  }
  log('contacts landed', land, 'of', tot);
}

// ONE SWING, FRAME BY FRAME: his body's step along his facing against what `dkWalkSwing` walked (its curve × k)
export async function dkTrace({ w, b, log, sleep }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const Q = new URLSearchParams(location.search), k = Q.get('k') || 'dkS6', D = +(Q.get('d') || 2.4);
  const C = b.camera.position, P = u.g.position;
  for (let i = 0; i < 400 && u.st.atk >= 0; i++) { w.__adv(1); b.heal(); }
  const yaw = u.g.rotation.y, me = { x: P.x + Math.sin(yaw) * D, z: P.z + Math.cos(yaw) * D };
  for (let i = 0; i < 15; i++) { C.x = me.x; C.z = me.z; b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); b.heal(); }
  u.st.forceSwing = k; u.st.cool = 0;
  const PVb = u.model.getObjectByName('b_MF_Pelvis'), V = P.constructor, q = new V(); const rel = (o) => { u.model.updateMatrixWorld(true); o.getWorldPosition(q); const y = u.g.rotation.y; return ((q.x - P.x) * Math.sin(y) + (q.z - P.z) * Math.cos(y)).toFixed(2) + '/' + ((q.x - P.x) * Math.cos(y) - (q.z - P.z) * Math.sin(y)).toFixed(2) + '/' + (q.y - P.y).toFixed(2); }; const pv = () => rel(PVb), tp = () => rel(u.bones.tip);
  let started = false, px = P.x, pz = P.z, ry = null, sumB = 0, sumR = 0; const rows = [];
  for (let i = 0; i < 500; i++) {
    C.x = me.x; C.z = me.z; b.lookAt(P.x, C.y - 0.15, P.z); w.__adv(1); C.x = me.x; C.z = me.z;
    const live = u.st.atk >= 0 && u.st.swing === k; if (live) started = true; else if (started) break;
    const y = u.g.rotation.y, df = (P.x - px) * Math.sin(y) + (P.z - pz) * Math.cos(y); px = P.x; pz = P.z;
    if (!live) continue;
    const R = u.dkRM; const dr = R && ry !== null ? (R.y - ry) * R.k : 0; ry = R ? R.y : null;
    sumB += df; sumR += dr;
    if (i % 6 === 0) rows.push(`${u.st.atk.toFixed(2)} f${R ? R.f.toFixed(2) : '-'} ty${R ? R.y.toFixed(2) : '-'} k${R ? R.k.toFixed(2) : '-'} body${sumB.toFixed(2)} root${sumR.toFixed(2)} d${Math.hypot(P.x - C.x, P.z - C.z).toFixed(2)} cur ${u.cur && u.cur.getClip().name} pelvisFwd ${pv()} tipFwd ${tp()}`);
  }
  for (const r of rows) log(r);
}
