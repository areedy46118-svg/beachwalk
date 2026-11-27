/* THE GARRISON IN THE CASTLE (2026-11-16). Not part of the game. Run headless:
 *   PB_PORT=4241 sh tools/probe.sh 'evalFile&f=/tools/garrison.js&m=look' <out>
 * m=look   one man of each file stood in the street and drawn alone, front and side, at his idle; the console's errors;
 *          and per file the measured palm (the hand bone's own axis that faces the shaft), so `palm` can be set
 * m=fight  a natural fight standing still in the street, healed: every blow that hurt — the move, the tool's head
 *          on screen or not, its speed — the men's foot skate per clip, and one-frame pops of a hand off its body */
const Q = new URLSearchParams(location.search), M = Q.get('m') || 'look';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const V3 = b.camera.position.constructor;
const units = () => b.farmUnitsS();
const bn = (u, re) => { const k = '_bn' + re; if (u[k]) return u[k]; let o = null; u.model.traverse((x) => { if (!o && x.isBone && re.test(x.name)) o = x; }); return (u[k] = o); };
for (let i = 0; i < 400 && !(units().length >= 20 && units().every((u) => u.model)); i++) { w.__adv(2); await sleep(30); }
log('units', units().length, 'with models', units().filter((u) => u.model).length, 'errors', JSON.stringify(w.__fortErrs.slice(0, 6)));
const byFile = {}; for (const u of units()) if (u.model && !byFile[u.kind.file]) byFile[u.kind.file] = u;
log('files', Object.keys(byFile).join(' '));
if (M === 'look') {
  const cam = b.camera, C = cam.position, home = C.clone();
  const others = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) others.push(o); });
  for (const f in byFile) {
    const u = byFile[f], P = u.g.position;
    u.g.visible = true;
    // his palm: which of the hand bone's own axes points from the palm to where the handle is
    const hand = u.model.getObjectByName('mixamorigRightHand_' + f), mid = u.model.getObjectByName('mixamorigRightHandMiddle1_' + f);
    const th = u.model.getObjectByName('mixamorigRightHandThumb1_' + f);
    u.model.updateMatrixWorld(true);
    const hw = hand.getWorldPosition(new V3()), mw = mid.getWorldPosition(new V3()), tw = th.getWorldPosition(new V3());
    const fing = mw.clone().sub(hw).normalize(), side = tw.clone().sub(hw); side.addScaledVector(fing, -side.dot(fing)).normalize();
    const palmW = new V3().crossVectors(fing, side).normalize();   // one of the two normals: checked against the curl in the stills
    const q = hand.getWorldQuaternion(new u.g.quaternion.constructor()).invert();
    const pl = palmW.clone().applyQuaternion(q);
    log('PALM', f, 'cross(fing, thumb) in hand frame', pl.toArray().map((v) => v.toFixed(2)).join(','), 'tool', !!u.farmTool, 'h', u.kind.h, 'scale', u.model.scale.x.toFixed(3));
    for (const o of others) o.visible = false;
    u.g.traverse((o) => { if (o.isMesh) o.visible = true; });
    cam.fov = 30; cam.updateProjectionMatrix();
    const ry = u.g.rotation.y;
    for (const [nm, a] of [['front', 0], ['side', Math.PI / 2], ['q', 0.7]]) {
      C.set(P.x + Math.sin(ry + a) * 3.4, P.y + 1.0, P.z + Math.cos(ry + a) * 3.4); b.lookAt(P.x, P.y + 0.92, P.z); cam.updateMatrixWorld(true);
      shot('man_' + f + '_' + nm, 360, 3.2);
    }
    for (const o of others) o.visible = true;
    C.copy(home); cam.fov = 105; cam.updateProjectionMatrix();
  }
}
if (M === 'fight') {
  b.settings.devMode = false;
  const P = b.dkSlotS(); if (P.unit) { P.unit.st.awake = false; P.unit.g.visible = false; }
  const cam = b.camera.position, home = [cam.x, cam.z], N = +(Q.get('n') || 3600);
  const SW = {}, sk = {}, pops = { n: 0, f: 0 }, last = new Map();
  const tipNear = (u) => { if (!u.bones || !u.bones.tip) return null; const t = u.bones.tip.getWorldPosition(new V3()); const y = Math.max(cam.y - 1.2, Math.min(cam.y + 0.1, t.y)); return Math.hypot(t.x - cam.x, t.y - y, t.z - cam.z); };
  const onScr = (p) => { const q = p.clone().project(b.camera); return q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1; };
  let hurt = 0, hurtNoSwing = 0;
  for (let f = 0; f < N; f++) {
    const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
    let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if ((u.st.atk >= 0 ? d - 5 : d) < bd) { bd = u.st.atk >= 0 ? d - 5 : d; tgt = u; } }
    if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
    const hp0 = b.state().hp, hat = new Map(us.map((u) => [u, u.hitAt || 0]));
    w.__adv(1); cam.x = home[0]; cam.z = home[1];
    if (P.unit) P.unit.st.awake = false;
    for (const u of us) {
      const s = u.st, L = last.get(u) || {};
      if (s.atk >= 0 && !s.foe && !(L.atk >= 0 && s.atk >= L.atk - 0.02 && L.sw === s.swing)) { const r = SW[s.swing] || (SW[s.swing] = { n: 0, land: 0, near: [], dist: [], lead: [], eye: [] }); r.n++; L.cur = { r, near: 9, d0: Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z), landed: false }; }
      if (s.atk >= 0 && L.cur) { const tn = tipNear(u); if (tn != null) L.cur.near = Math.min(L.cur.near, tn); if ((u.hitAt || 0) !== hat.get(u)) L.cur.landed = true;
        // the edge: over the strike, the weapon's face (its +X) against the head's travel across the handle; and the head's nearest to your eye
        const A = u.atk[s.swing], tip = u.bones && u.bones.tip;
        if (tip && u.farmTool && A && s.atk > A.wind - 0.1 && s.atk < A.wind + A.strike) {
          const hp = tip.getWorldPosition(new V3());
          if (L.hp) { const vv = hp.clone().sub(L.hp), q = u.farmTool.getWorldQuaternion(new u.g.quaternion.constructor()), ax = new V3(0, 1, 0).applyQuaternion(q), fc = new V3(1, 0, 0).applyQuaternion(q);
            vv.addScaledVector(ax, -vv.dot(ax)); if (vv.length() > 0.004) { L.cur.lead = (L.cur.lead || 0) + vv.normalize().dot(fc); L.cur.leadN = (L.cur.leadN || 0) + 1; } }
          L.hp = hp; L.cur.eye = Math.min(L.cur.eye ?? 9, hp.distanceTo(cam));
        } else L.hp = null; }
      if (!(s.atk >= 0) && L.cur) { const c = L.cur; if (c.landed) c.r.land++; c.r.near.push(c.near); c.r.dist.push(c.d0); if (c.leadN) c.r.lead.push(c.lead / c.leadN); if (c.eye != null) c.r.eye.push(c.eye); L.cur = null; }
      // the planted foot's world speed on gait clips
      const nm = u.cur && u.cur.getClip ? u.cur.getClip().name : '-';
      if (/Walk|Run|Str|Side/.test(nm)) {
        const fl = bn(u, /LeftFoot_/), fr = bn(u, /RightFoot_/);
        const a = fl.getWorldPosition(new V3()), c2 = fr.getWorldPosition(new V3()), lo = a.y < c2.y ? a : c2;
        if (L.foot && L.fw === (a.y < c2.y) && lo.y < u.g.position.y + 0.12) { const K = sk[nm] || (sk[nm] = { s: 0, n: 0 }); K.s += Math.hypot(lo.x - L.foot.x, lo.z - L.foot.z) * 60; K.n++; }
        L.foot = lo; L.fw = a.y < c2.y;
      } else L.foot = null;
      // a hand jumping off his body in one frame
      const hb = bn(u, /RightHand_/), hip = bn(u, /Hips_/);
      const rel = hb.getWorldPosition(new V3()).sub(hip.getWorldPosition(new V3()));
      if (L.rel && rel.distanceTo(L.rel) > 0.32) pops.n++; pops.f++; L.rel = rel;
      L.atk = s.atk; L.sw = s.swing; last.set(u, L);
    }
    if (b.state().hp < hp0) { hurt++; if (!us.some((u) => u.st.atk >= 0)) hurtNoSwing++; if ((w.__hs = (w.__hs || 0)) < 8) { shot('hit_' + w.__hs++, 480, 1.7); } }
    b.heal();
  }
  log('hurt', hurt, 'with nobody swinging', hurtNoSwing);
  const med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1].toFixed(2) : '-'; };
  for (const k of Object.keys(SW).sort()) { const r = SW[k]; log('SWING', k.padEnd(9), 'thrown', r.n, 'landed', r.land, 'head to your axis', med(r.near), 'to your eye', med(r.eye), 'edge leads (1 = square)', med(r.lead), 'thrown from', med(r.dist)); }
  log('REACH Z per man', JSON.stringify(units().filter((u) => u.farmReachZ).slice(0, 4).map((u) => [u.kind.file, u.kind.tool, u.farmReachZ])));
  for (const k of Object.keys(sk).sort()) log('SKATE', k.padEnd(9), 'planted foot m/s', (sk[k].s / sk[k].n).toFixed(2), 'n', sk[k].n);
  log('POPS (hand > 0.32 m off his hips in a frame)', pops.n, 'of', pops.f, 'man-frames');
}
if (M === 'gait') {
  // why the feet slide: for every man on a gait clip, his body's ground velocity in his own frame against what the clip's
  // stride covers at the rate it is played (clipSpeed × timeScale, along the clip's own axis); and the planted foot's speed
  b.settings.devMode = false;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
  const cam = b.camera.position, home = [cam.x, cam.z], N = +(Q.get('n') || 2400), last = new Map(), R = {};
  for (let f = 0; f < N; f++) {
    const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
    let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
    if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
    w.__adv(1); cam.x = home[0]; cam.z = home[1]; if (P0.unit) P0.unit.st.awake = false; b.heal();
    for (const u of us) {
      const L = last.get(u) || {}, p = u.g.position, nm = u.cur && u.cur.getClip ? u.cur.getClip().name : '-';
      const fl = bn(u, /LeftToeBase_/), fr = bn(u, /RightToeBase_/), a = fl.getWorldPosition(new V3()), c = fr.getWorldPosition(new V3()), lo = a.y < c.y ? a : c;
      if (L.p && /Walk|Run|Str|Side/.test(nm) && u.st.atk < 0) {
        const vx = (p.x - L.p.x) * 60, vz = (p.z - L.p.z) * 60, h = u.g.rotation.y, fw = vx * Math.sin(h) + vz * Math.cos(h), rt = -(vx * Math.cos(h) - vz * Math.sin(h));
        const cs = (u.clipSpeed && u.clipSpeed[nm]) || 0, ts = u.cur.timeScale, turn = Math.abs(((h - L.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 60;
        const K = R[nm] || (R[nm] = { n: 0, body: 0, feet: 0, fw: 0, side: 0, slip: 0, slipN: 0, turn: 0, ts: 0, cs });
        K.n++; K.body += Math.hypot(vx, vz); K.feet += cs * Math.abs(ts); K.fw += fw; K.side += rt; K.turn += turn; K.ts += ts;
        // contact: a toe within 2 cm of the lowest that toe has been in his own frame (after the first second)
        u.g.updateMatrixWorld(true); const Ii = u.g.matrixWorld.clone().invert();
        for (const [k2, t] of [['l', a], ['r', c]]) {
          const y = t.clone().applyMatrix4(Ii).y; L['m' + k2] = Math.min(L['m' + k2] ?? 9, y);
          if (f > 60 && L['p' + k2] && y < L['m' + k2] + 0.02 && L['y' + k2] < L['m' + k2] + 0.02) { K.slip += Math.hypot(t.x - L['p' + k2].x, t.z - L['p' + k2].z) * 60; K.slipN++; }
        }
      }
      { u.g.updateMatrixWorld(true); const Ii = u.g.matrixWorld.clone().invert(); L.yl = a.clone().applyMatrix4(Ii).y; L.yr = c.clone().applyMatrix4(Ii).y; L.pl = a; L.pr = c; }
      L.p = p.clone(); L.h = u.g.rotation.y; L.lo = lo; L.lw = a.y < c.y; last.set(u, L);
    }
  }
  for (const k of Object.keys(R).sort()) { const K = R[k], n = K.n; log('GAIT', k.padEnd(8), 'n', n, 'body m/s', (K.body / n).toFixed(2), 'fwd', (K.fw / n).toFixed(2), 'right', (K.side / n).toFixed(2), '| clip stride', K.cs.toFixed(2), 'x rate', (K.ts / n).toFixed(2), '= feet', (K.feet / n).toFixed(2), '| turn rad/s', (K.turn / n).toFixed(2), '| planted toe slip', (K.slip / Math.max(1, K.slipN)).toFixed(2), 'n', K.slipN); }
}
if (M === 'trace') {
  b.settings.devMode = false;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
  const cam = b.camera.position, home = [cam.x, cam.z];
  let u = null, n = 0, prev = null;
  for (let f = 0; f < 3000 && n < 50; f++) {
    w.__adv(1); cam.x = home[0]; cam.z = home[1]; b.heal(); if (P0.unit) P0.unit.st.awake = false;
    if (!u) { u = units().find((x) => x.st.alive && x.farm && x.farm.out && x.cur && /mHWalk|mWalkC|mHRun/.test(x.cur.getClip().name) && x.st.atk < 0); if (!u) continue; }
    const nm = u.cur.getClip().name, p = u.g.position;
    const a = bn(u, /LeftToeBase_/).getWorldPosition(new V3()), c = bn(u, /RightToeBase_/).getWorldPosition(new V3());
    const mp = u.model.getWorldPosition(new V3()); u.g.updateMatrixWorld(true); const Ii = u.g.matrixWorld.clone().invert(); const aL = a.clone().applyMatrix4(Ii), cL = c.clone().applyMatrix4(Ii);
    log('T', f, nm, 't', u.cur.time.toFixed(3), 'ts', u.cur.timeScale.toFixed(2), 'w', u.cur.getEffectiveWeight().toFixed(2), 'root', p.x.toFixed(3), p.z.toFixed(3), 'model', (mp.x - p.x).toFixed(3), (mp.z - p.z).toFixed(3),
      'L', a.x.toFixed(3), a.y.toFixed(3), a.z.toFixed(3), 'R', c.x.toFixed(3), c.y.toFixed(3), c.z.toFixed(3), 'Lloc', aL.x.toFixed(3), aL.z.toFixed(3), 'Rloc', cL.x.toFixed(3), cL.z.toFixed(3), 'yaw', u.g.rotation.y.toFixed(3), 'gs', u.g.scale.x.toFixed(2), 'mixTS', u.mixer.timeScale);
    n++;
  }
}
if (M === 'stride') {
  // each gait clip's stride as the game holds it (u.clipSpeed) against the planted toe's travel in his own frame, scrubbed
  const u = units().find((x) => x.model && x.clips.mHWalk);
  log('unit', u.kind.file, '_gaitMeasured', u._gaitMeasured, 'parLate', !!u.parLate);
  const lt = bn(u, /LeftToeBase_/), rt = bn(u, /RightToeBase_/), I = new u.g.matrixWorld.constructor();
  const keep = []; for (const k in u.clips) { const a = u.clips[k]; keep.push([a, a.time, a.enabled, a.paused, a.getEffectiveWeight(), a.isRunning() || u.mixer._isActiveAction(a)]); }
  for (const nm of ['mHWalk', 'mWalkC', 'mHRun', 'mRunB', 'mRun', 'mHStrL', 'mHStrR', 'mStrL', 'mStrR', 'mStrL2', 'mStrR2']) {
    const a = u.clips[nm]; if (!a) { log(nm, 'missing'); continue; }
    for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
    const dur = a.getClip().duration; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
    let back = 0, pr = null, pl = null, last = null; const N = 120;
    for (let i = 0; i <= N; i++) { a.time = dur * i / N; u.mixer.update(0); u.g.updateMatrixWorld(true); I.copy(u.g.matrixWorld).invert();
      const A = rt.getWorldPosition(new V3()).applyMatrix4(I), B = lt.getWorldPosition(new V3()).applyMatrix4(I), lowR = A.y <= B.y, s = lowR ? 'R' : 'L';
      if (last === s && pr) { const c = lowR ? A : B, q = lowR ? pr : pl; back += Math.hypot(c.x - q.x, c.z - q.z); } last = s; pr = A; pl = B; }
    log('STRIDE', nm.padEnd(7), 'held', ((u.clipSpeed[nm]) || 0).toFixed(2), 'measured now (planted toe, 120 samples)', (back / dur).toFixed(2), 'dur', dur.toFixed(2), 'scale', u.model.scale.x.toFixed(3));
  }
  for (const [a, t, en, pa, wt, run] of keep) { if (run) a.play(); a.time = t; a.enabled = en; a.paused = pa; a.setEffectiveWeight(wt); }
}
if (M === 'floor') {
  // the metric's floor: one man walked dead straight at exactly his clip's measured stride × rate, every layer running
  const u = units().find((x) => x.model && x.clips.mHWalk);
  const lt = bn(u, /LeftToeBase_/), rt = bn(u, /RightToeBase_/);
  for (const [nm, rate] of [['mHWalk', 1], ['mHWalk', 0.75], ['mHRun', 1], ['mHStrR', 1]]) {
    for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
    const a = u.clips[nm]; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = false; a.timeScale = rate; u.cur = a;
    const v = u.clipSpeed[nm] * rate, h = u.g.rotation.y, side = /Str/.test(nm), dx = side ? -Math.cos(h) : Math.sin(h), dz = side ? Math.sin(h) : Math.cos(h);
    let prev = null, pw = null, slip = 0, n = 0, slipP = 0, nP = 0;
    for (let f = 0; f < 240; f++) {
      u.g.position.x += dx * v / 60; u.g.position.z += dz * v / 60;
      u.mixer.update(1 / 60); u.g.updateMatrixWorld(true);
      const A = lt.getWorldPosition(new V3()), B = rt.getWorldPosition(new V3()), lw = A.y < B.y, lo = lw ? A : B;
      if (prev && pw === lw) { const s = Math.hypot(lo.x - prev.x, lo.z - prev.z) * 60; slip += s; n++; if (lo.y < u.g.position.y + 0.06) { slipP += s; nP++; } }
      prev = lo; pw = lw;
    }
    log('FLOOR', nm, 'rate', rate, 'body', v.toFixed(2), 'lowest toe slip', (slip / n).toFixed(2), '| toe flat (< 6 cm) slip', (slipP / Math.max(1, nP)).toFixed(2), 'n', nP);
  }
}
if (M === 'contact') {
  // each gait clip scrubbed in his own frame: a foot is IN CONTACT within 1.5 cm of its own lowest; the contact phase's
  // ground speed (regressed per contact) is what the body must move at for that foot to stand still — against u.clipSpeed
  const u = units().find((x) => x.model && x.clips.mHWalk);
  const ft = { L: bn(u, /LeftToeBase_/), R: bn(u, /RightToeBase_/) }, I = new u.g.matrixWorld.constructor();
  const out = {};
  for (const nm of ['mHWalk', 'mWalkC', 'mHRun', 'mRunB', 'mRun', 'mHStrL', 'mHStrR', 'mStrL', 'mStrR', 'mStrL2', 'mStrR2']) {
    const a = u.clips[nm]; if (!a) continue;
    for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
    const dur = a.getClip().duration; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
    const S = { L: [], R: [] }, NN = 200;
    for (let i = 0; i <= NN; i++) { a.time = dur * i / NN; u.mixer.update(0); u.g.updateMatrixWorld(true); I.copy(u.g.matrixWorld).invert();
      for (const s of ['L', 'R']) { const p = ft[s].getWorldPosition(new V3()).applyMatrix4(I); S[s].push([a.time, p.x, p.y, p.z]); } }
    let vs = [], frac = 0, dX = 0, dZ = 0;
    for (const s of ['L', 'R']) {
      const lo = Math.min(...S[s].map((q) => q[2])), on = S[s].map((q) => q[2] < lo + 0.015);
      frac += on.filter(Boolean).length / on.length / 2;
      for (let i = 1; i < S[s].length; i++) if (on[i] && on[i - 1]) { const q = S[s][i], r = S[s][i - 1]; vs.push(Math.hypot(q[1] - r[1], q[3] - r[3]) / (q[0] - r[0])); dX += q[1] - r[1]; dZ += q[3] - r[3]; }
    }
    vs.sort((x, y) => x - y);
    if (!vs.length) { log('CONTACT', nm, 'no contact frames'); continue; }
    out[nm] = vs[vs.length >> 1];
    log('CONTACT', nm.padEnd(7), 'held stride', (u.clipSpeed[nm] || 0).toFixed(2), '| contact-phase ground speed median', vs[vs.length >> 1].toFixed(2), 'p25', vs[vs.length >> 2].toFixed(2), 'p75', vs[(vs.length * 3) >> 2].toFixed(2), '| contact fraction', frac.toFixed(2), '| planted foot goes (his frame) x', dX.toFixed(2), 'z', dZ.toFixed(2));
  }
}

if (M === 'hands') {
  // each man's right hand and tool, close, from his right-front, at his idle; and his whole figure from the eye of a man in front
  const cam = b.camera, C = cam.position, home = C.clone();
  const others = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) others.push(o); });
  for (const f in byFile) {
    const u = units().find((x) => x.kind.file === f && x.farmTool) || byFile[f];
    u.g.visible = true;
    for (const o of others) o.visible = false; u.g.traverse((o) => { if (o.isMesh) o.visible = true; });
    const hb = bn(u, /RightHand_/); u.model.updateMatrixWorld(true); const hp = hb.getWorldPosition(new V3()), ry = u.g.rotation.y;
    cam.fov = 30; cam.updateProjectionMatrix();
    C.set(hp.x + Math.sin(ry - 0.9) * 0.9, hp.y + 0.15, hp.z + Math.cos(ry - 0.9) * 0.9); b.lookAt(hp.x, hp.y, hp.z); cam.updateMatrixWorld(true); shot('hand_' + f + '_' + u.kind.tool, 300, 3.0);
    C.set(hp.x + Math.sin(ry + 0.6) * 0.9, hp.y + 0.1, hp.z + Math.cos(ry + 0.6) * 0.9); b.lookAt(hp.x, hp.y, hp.z); cam.updateMatrixWorld(true); shot('hand2_' + f + '_' + u.kind.tool, 300, 3.0);
    for (const o of others) o.visible = true; C.copy(home); cam.fov = 105; cam.updateProjectionMatrix();
  }
}

if (M === 'palm') {
  for (const f in byFile) {
    const u = byFile[f]; u.model.updateMatrixWorld(true);
    const out = [];
    for (const side of ['Right', 'Left']) {
      const hand = bn(u, new RegExp(side + 'Hand_')), mid = bn(u, new RegExp(side + 'HandMiddle1_')), th = bn(u, new RegExp(side + 'HandThumb1_'));
      const hw = hand.getWorldPosition(new V3()), fing = mid.getWorldPosition(new V3()).sub(hw).normalize(), t = th.getWorldPosition(new V3()).sub(hw);
      t.addScaledVector(fing, -t.dot(fing)).normalize();
      const pw = new V3().crossVectors(fing, t).normalize().multiplyScalar(side === 'Right' ? -1 : 1);   // the palm
      const q = hand.getWorldQuaternion(new u.g.quaternion.constructor()).invert();
      out.push(side + ' palm (hand frame) ' + pw.applyQuaternion(q).toArray().map((v) => v.toFixed(2)).join(','));
    }
    log('PALM', f, out.join(' | '));
  }
}

if (M === 'keyed') {
  // his hand-keyed clips (built on the stance), each at a few points, solo from the front-right
  const cam = b.camera, C = cam.position, home = C.clone();
  const others = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) others.push(o); });
  const u = units().find((x) => x.kind.file === (Q.get('file') || 'hd')) ; u.g.visible = true;
  for (const nm of ['idle', 'rBeat', 'rCry', 'bCharge', 'bKick']) {
    const a = u.clips[nm]; if (!a) { log('no clip', nm); continue; }
    for (const t of [0.15, 0.5, 0.85]) {
      for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
      a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * t; u.mixer.update(0); u.model.updateMatrixWorld(true);
      for (const o of others) o.visible = false; u.g.traverse((o) => { if (o.isMesh) o.visible = true; });
      const P = u.g.position, ry = u.g.rotation.y + 0.5; cam.fov = 32; cam.updateProjectionMatrix();
      C.set(P.x + Math.sin(ry) * 4.4, P.y + 1.0, P.z + Math.cos(ry) * 4.4); b.lookAt(P.x, P.y + 0.9, P.z); cam.updateMatrixWorld(true);
      shot('key_' + nm + '_' + t, 240, 3.0);
      for (const o of others) o.visible = true; C.copy(home); cam.fov = 105; cam.updateProjectionMatrix();
    }
  }
}

if (M === 'kill') {
  b.settings.devMode = false;
  const cam = b.camera, C = cam.position;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
  // let them come out, then put one of each file in a row 3 m ahead and cut each down with a heavy blow
  for (let i = 0; i < 900 && units().filter((u) => u.farm && u.farm.out && u.st.alive).length < 8; i++) { w.__adv(1); b.heal(); }
  const fx = Math.sin(b.state().yaw || 0), row = [];
  const seen = {};
  for (const u of units()) if (u.farm && u.farm.out && u.st.alive && !seen[u.kind.file]) { seen[u.kind.file] = 1; row.push(u); }
  log('killing', row.map((u) => u.kind.file).join(' '));
  const errs0 = w.__fortErrs.length;
  row.forEach((u, i) => { try { b.hurtMutant(u, 99, 1.0); } catch (e) { log('hurt threw', e.message); } if (u.st.alive) { try { b.killMutant(u); } catch (e) { log('kill threw', e.message); } } });
  for (let i = 0; i < 180; i++) { w.__adv(1); b.heal(); }
  log('dead', row.filter((u) => !u.st.alive).length, 'of', row.length, 'ragdolls', row.filter((u) => u.rag).length, 'new errors', JSON.stringify(w.__fortErrs.slice(errs0, errs0 + 4)));
  for (const [k, u] of row.entries()) {
    const hip = bn(u, /Hips_/); const hp = hip.getWorldPosition(new V3());
    const others = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite) && o.visible) others.push(o); });
    cam.fov = 45; cam.updateProjectionMatrix(); C.set(hp.x + 2.2, hp.y + 2.0, hp.z + 1.6); b.lookAt(hp.x, hp.y - 0.3, hp.z); cam.updateMatrixWorld(true);
    shot('dead_' + u.kind.file, 360, 2.2);
    cam.fov = 105; cam.updateProjectionMatrix();
  }
}

if (M === 'duel') {
  // one weapon at a time: everyone out who does not carry it is cut down, until the man who does has thrown `k` blows at you
  b.settings.devMode = false;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
  const cam = b.camera.position, home = [cam.x, cam.z], K = +(Q.get('k') || 14);
  for (const tool of (Q.get('tools') || 'sword,axe,hammer,rake').split(',')) {
    const R = {}; let got = 0, f = 0, last = new Map();
    for (f = 0; f < 60 * 140 && got < K; f++) {
      for (const u of units()) if (u.st.alive && u.farm && u.farm.out && u.kind.tool !== tool) { try { b.hurtMutant(u, 99, 0.2); } catch (e) {} }
      const me = units().find((u) => u.st.alive && u.farm && u.farm.out && u.kind.tool === tool);
      if (me) { b.lookAt(me.g.position.x, cam.y - 0.15, me.g.position.z); me.st.foe = null; me.st.swFoe = null; }
      if (P0.unit) { P0.unit.g.position.y = -500; }
      w.__adv(1); cam.x = home[0]; cam.z = home[1]; b.heal(); if (P0.unit) P0.unit.st.awake = false;
      if (!me || !me.st.alive) continue;
      if (Q.get('why') && f % 90 === 0) { const A0 = me.atk[me.st.swing]; log('WHY', (f / 60).toFixed(1), me.kind.p || '', 'd', Math.hypot(me.g.position.x - cam.x, me.g.position.z - cam.z).toFixed(2), 'atk', me.st.atk.toFixed(2), 'swing', me.st.swing, 'stop', A0 && A0.stop, 'reach', A0 && A0.reach && A0.reach.toFixed(2), 'maxR', me.maxReach && me.maxReach.toFixed(2), 'ring', me.ring && me.ring.toFixed(2), 'cool', (me.st.cool || 0).toFixed(2), 'wait', (me.st.wait || 0).toFixed(2), 'side', me.st.side, 'back', me.st.back, 'foe', !!me.st.foe, 'clip', me.cur && me.cur.getClip().name, 'out', me.farm && me.farm.out, 'press', me.farm && me.farm.press); }
      const s = me.st, L = last.get(me) || {}, A = s.atk >= 0 ? me.atk[s.swing] : null, tip = me.bones && me.bones.tip;
      if (A && !s.foe && !(L.atk >= 0 && s.atk >= L.atk - 0.02 && L.sw === s.swing)) { L.cur = { k: s.swing, eye: 9, lead: 0, n: 0, land: false, hat: me.hitAt || 0, d0: Math.hypot(me.g.position.x - cam.x, me.g.position.z - cam.z) }; }
      if (A && L.cur && tip && Q.get('where') && L.cur.k === Q.get('where') && !L.cur.logged && s.atk >= A.wind) {
        L.cur.logged = true; const hp = tip.getWorldPosition(new V3()), dx = hp.x - cam.x, dz = hp.z - cam.z, mx = me.g.position.x - cam.x, mz = me.g.position.z - cam.z, ml = Math.hypot(mx, mz) || 1;
        const fwd = (dx * mx + dz * mz) / ml, lat = (dx * mz - dz * mx) / ml;
        // and through the whole stroke: the head's lowest and where it passes eye height
        log('WHERE', L.cur.k, 'man at', ml.toFixed(2), 'stop', me.atk[L.cur.k].stop.toFixed(2), '| head at the contact: in front', fwd.toFixed(2), 'beside', lat.toFixed(2), 'above your eye', (hp.y - cam.y).toFixed(2), '| t', s.atk.toFixed(2), 'wind', A.wind.toFixed(2), 'hit', A.hit);
      }
      if (A && L.cur && tip && Q.get('where') && L.cur.k === Q.get('where')) { const hp = tip.getWorldPosition(new V3()); L.cur.path = L.cur.path || []; if (L.cur.path.length < 200) L.cur.path.push([s.atk - A.wind, hp.distanceTo(cam), hp.y - cam.y]); }
      if (!A && L.cur && L.cur.path && L.cur.path.length) { const P2 = L.cur.path.filter((q) => q[0] > -0.4 && q[0] < 0.25); log('PATH', P2.filter((_, i) => i % 3 === 0).map((q) => q[0].toFixed(2) + ':' + q[1].toFixed(2) + '/' + q[2].toFixed(2)).join(' ')); }
      if (A && L.cur && tip) {
        const hp = tip.getWorldPosition(new V3());
        if (s.atk > A.wind - 0.1 && s.atk < A.wind + A.strike) {
          L.cur.eye = Math.min(L.cur.eye, hp.distanceTo(cam));
          if (L.hp && me.farmTool) { const vv = hp.clone().sub(L.hp), q = me.farmTool.getWorldQuaternion(new me.g.quaternion.constructor()), ax = new V3(0, 1, 0).applyQuaternion(q), fc = new V3(1, 0, 0).applyQuaternion(q);
            vv.addScaledVector(ax, -vv.dot(ax)); if (vv.length() > 0.006) { const dd = vv.normalize().dot(fc); L.cur.lead += dd; L.cur.alead = (L.cur.alead || 0) + Math.abs(dd); L.cur.n++; if (s.atk <= A.wind + 0.01 && s.atk > A.wind - 0.12 && !(b.hitstop > 0)) { L.cur.ap = (L.cur.ap || 0) + Math.abs(dd); L.cur.apn = (L.cur.apn || 0) + 1; } } }
        }
        if ((me.hitAt || 0) !== L.cur.hat) L.cur.land = true;
        L.hp = hp;
      } else L.hp = null;
      if (Q.get('trace') && A && tip && me.farmTool && L.hp0) { const hp = tip.getWorldPosition(new V3()), vv = hp.clone().sub(L.hp0), q = me.farmTool.getWorldQuaternion(new me.g.quaternion.constructor()), ax = new V3(0, 1, 0).applyQuaternion(q), fc = new V3(1, 0, 0).applyQuaternion(q), along = vv.dot(ax); vv.addScaledVector(ax, -along);
        if (got < 3) log('TR', s.swing, 't-wind', (s.atk - A.wind).toFixed(3), 'perp m/s', (vv.length() * 60).toFixed(2), 'along m/s', (along * 60).toFixed(2), 'lead', vv.length() > 1e-4 ? vv.clone().normalize().dot(fc).toFixed(2) : '-', 'roll', (me.farmRoll ? me.farmRoll.ang : 0).toFixed(2), 'eye', hp.distanceTo(cam).toFixed(2)); }
      if (tip) L.hp0 = tip.getWorldPosition(new V3());
      if (!A && L.cur) { const c = L.cur, r = R[c.k] || (R[c.k] = { n: 0, land: 0, eye: [], lead: [], d: [] }); r.n++; if (c.land) r.land++; if (c.eye < 9) r.eye.push(c.eye); if (c.apn) (r.ap || (r.ap = [])).push(c.ap / c.apn); if (c.n) { r.lead.push(c.lead / c.n); (r.alead || (r.alead = [])).push(c.alead / c.n); } r.d.push(c.d0); got++; L.cur = null; }
      L.atk = s.atk; L.sw = s.swing; last.set(me, L);
    }
    const med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1].toFixed(2) : '-'; };
    log('DUEL', tool, 'blows', got, 'in', (f / 60).toFixed(0), 's');
    for (const k of Object.keys(R).sort()) { const r = R[k]; log('  ', k.padEnd(9), 'n', r.n, 'landed', r.land, '| EDGE-FIRST COMING IN', r.ap ? med(r.ap) : '-', '| head to eye median', med(r.eye), 'min', r.eye.length ? Math.min(...r.eye).toFixed(2) : '-', '| edge leads', med(r.lead), 'either edge', med(r.alead || []), 'after its first', med(r.lead.slice(1)), '| from', med(r.d)); }
    const me = units().find((u) => u.kind.tool === tool && u.farmReachZ); if (me) log('   Z', JSON.stringify(me.farmReachZ));
  }
}
if (M === 'film') {
  // one weapon at a time (the duel's arrangement): its man's hand close at his idle from three sides, then his first
  // three blows at you filmed from his right side every 3 frames, solo, big
  b.settings.devMode = false;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
  const C = b.camera.position, home = [C.x, C.z], tool = Q.get('tool') || 'sword';
  const soloShot = (u, name, px, py, pz, tx, ty, tz, fov = 30, W = 340) => {
    const sv = C.clone(), sq = b.camera.quaternion.clone(), f0 = b.camera.fov, hid = [];
    b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isLineSegments) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } });
    b.camera.fov = fov; b.camera.updateProjectionMatrix(); C.set(px, py, pz); b.lookAt(tx, ty, tz); b.camera.updateMatrixWorld(true);
    shot(name, W, 2.4);
    for (const o of hid) o.visible = true; C.copy(sv); b.camera.quaternion.copy(sq); b.camera.fov = f0; b.camera.updateProjectionMatrix();
  };
  let me = null, blows = 0, fr = 0, handDone = false, inSw = false;
  for (let f = 0; f < 60 * 120 && blows < 3; f++) {
    for (const u of units()) if (u.st.alive && u.farm && u.farm.out && u.kind.tool !== tool) { try { b.hurtMutant(u, 99, 0.2); } catch (e) {} }
    me = units().find((u) => u.st.alive && u.farm && u.farm.out && u.kind.tool === tool);
    if (me) { b.lookAt(me.g.position.x, C.y - 0.15, me.g.position.z); me.st.foe = null; me.st.swFoe = null; }
    w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal();
    if (!me || !me.st.alive) continue;
    const P = me.g.position, ry = me.g.rotation.y, hb = bn(me, /RightHand_/);
    if (!handDone && me.st.atk < 0 && Math.hypot(P.x - C.x, P.z - C.z) < 6) {
      handDone = true; me.model.updateMatrixWorld(true); const h = hb.getWorldPosition(new V3());
      for (const [nm, a] of [['R', -Math.PI / 2], ['F', 0], ['B', Math.PI * 0.75]]) soloShot(me, 'hand_' + tool + '_' + nm, h.x + Math.sin(ry + a) * 0.8, h.y + 0.2, h.z + Math.cos(ry + a) * 0.8, h.x, h.y, h.z);
      soloShot(me, 'idle_' + tool, P.x + Math.sin(ry - 1.2) * 4, P.y + 1.2, P.z + Math.cos(ry - 1.2) * 4, P.x, P.y + 1.0, P.z, 34);
    }
    const A = me.st.atk >= 0 ? me.atk[me.st.swing] : null;
    if (A && !inSw) { inSw = true; fr = 0; }
    if (A && inSw && blows < 3) {
      if (fr % 3 === 0 && fr < 60) soloShot(me, 'sw' + blows + '_' + me.st.swing + '_' + String(fr).padStart(2, '0') + (me.st.atk >= A.wind ? 'X' : ''), P.x + Math.sin(ry - Math.PI / 2 + 0.5) * 2.7, P.y + 1.4, P.z + Math.cos(ry - Math.PI / 2 + 0.5) * 2.7, P.x, P.y + 1.15, P.z, 52, 300);
      fr++;
    }
    if (!A && inSw) { inSw = false; blows++; }
  }
  log('FILM', tool, 'blows', blows);
}
if (M === 'seat') {
  // the duel's arrangement for one tool; when its man is out and calm: the seat measured, then each of his strokes forced
  // from his stand-off at you and filmed close from his right (every 2 frames) and from your eye at the contact
  b.settings.devMode = false;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
  const C = b.camera.position, home = new V3(C.x, C.y, C.z), tool = Q.get('tool') || 'sword';
  const soloShot = (u, name, px, py, pz, tx, ty, tz, fov = 40, W = 300) => {
    const sv = C.clone(), sq = b.camera.quaternion.clone(), f0 = b.camera.fov, hid = [];
    b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isLineSegments) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } });
    b.camera.fov = fov; b.camera.updateProjectionMatrix(); C.set(px, py, pz); b.lookAt(tx, ty, tz); b.camera.updateMatrixWorld(true);
    shot(name, W, 2.2);
    for (const o of hid) o.visible = true; C.copy(sv); b.camera.quaternion.copy(sq); b.camera.fov = f0; b.camera.updateProjectionMatrix();
  };
  let me = null;
  for (let f = 0; f < 60 * 120; f++) {
    for (const u of units()) if (u.st.alive && u.farm && u.farm.out && u.kind.tool !== tool) { try { b.hurtMutant(u, 99, 0.2); } catch (e) {} }
    me = units().find((u) => u.st.alive && u.farm && u.farm.out && u.kind.tool === tool && u.farmRollK);
    w.__adv(1); C.x = home.x; C.z = home.z; b.heal();
    if (me && Math.hypot(me.g.position.x - C.x, me.g.position.z - C.z) < 7 && me.st.atk < 0) break;
  }
  if (!me) { log('no man with', tool); return; }
  // the seat, at his idle
  const T = me.farmTool, hand = bn(me, /RightHand_/), fore = bn(me, /RightForeArm_/), mid = bn(me, /RightHandMiddle1_/), th = bn(me, /RightHandThumb1_/);
  const seat = () => {
    me.model.updateMatrixWorld(true);
    const q = T.getWorldQuaternion(new me.g.quaternion.constructor()), ax = new V3(0, 1, 0).applyQuaternion(q), edge = new V3(1, 0, 0).applyQuaternion(q);
    const hw = hand.getWorldPosition(new V3()), fw = fore.getWorldPosition(new V3()), mw = mid.getWorldPosition(new V3()), tw = th.getWorldPosition(new V3());
    const fist = hw.clone().lerp(mw, 0.7), gp = new V3(0, me.farmGrip ? me.farmGrip.y : 0, 0).applyMatrix4(T.matrixWorld);
    const toFist = fist.clone().sub(gp), off = toFist.clone().addScaledVector(ax, -toFist.dot(ax)).length();
    const forearm = hw.clone().sub(fw).normalize(), fing = mw.clone().sub(hw).normalize(), thumb = tw.clone().sub(hw).normalize();
    return { handleToFist: +off.toFixed(3), handleVsForearm: +(Math.acos(Math.abs(ax.dot(forearm))) * 57.3).toFixed(0), headTowardThumb: +ax.dot(thumb).toFixed(2), edgeVsFingers: +(Math.acos(Math.max(-1, Math.min(1, edge.dot(fing)))) * 57.3).toFixed(0), roll: +((me.farmRoll && me.farmRoll.ang) || 0).toFixed(2) };
  };
  log('SEAT idle', tool, JSON.stringify(seat()));
  const P = me.g.position;
  // each stroke he owns that is not a kick, forced at you from his stand-off
  const ks = Object.keys(me.kind.use).filter((k) => me.atk[k] && !(me.atk[k].limbs && me.atk[k].limbs.some((i) => i >= 2)) && !me.atk[k].minDist).slice(0, 4);
  for (const k of ks) {
    const A = me.atk[k];
    for (let i = 0; i < 90; i++) { w.__adv(1); b.heal(); if (me.st.atk < 0 && i > 20) break; }
    const ry = Math.atan2(C.x - P.x, C.z - P.z); P.x = C.x - Math.sin(ry) * A.stop; P.z = C.z - Math.cos(ry) * A.stop; me.g.rotation.y = ry;
    me.st.swing = k; me.st.atk = 0; me.st.chained = false; me.st.chainAt = -1; me.st.cool = 0;
    let fr = 0, rollMin = 9, rollMax = -9, contact = null;
    while (me.st.atk >= 0 && me.st.swing === k && fr < 150) {
      b.lookAt(P.x, C.y - 0.2, P.z);
      w.__adv(1); C.x = home.x; C.z = home.z; b.heal(); fr++;
      const r = (me.farmRoll && me.farmRoll.ang) || 0; rollMin = Math.min(rollMin, r); rollMax = Math.max(rollMax, r);
      const ry2 = me.g.rotation.y;
      if (fr % 2 === 0 && fr <= 64) soloShot(me, 'st_' + k + '_' + String(fr).padStart(2, '0') + (me.st.atk >= A.wind && me.st.atk < A.wind + A.strike ? 'X' : ''), P.x + Math.sin(ry2 - Math.PI / 2) * 2.8, P.y + 1.3, P.z + Math.cos(ry2 - Math.PI / 2) * 2.8, P.x, P.y + 1.1, P.z, 50, 240);
      if (!contact && me.st.atk >= A.wind) { contact = seat(); b.renderer.render(b.scene, b.camera); shot('eye_' + k, 420, 1.8); }
    }
    log('STROKE', k, 'frames', fr, 'roll over the stroke', rollMin.toFixed(2), '..', rollMax.toFixed(2), 'at contact', JSON.stringify(contact));
  }
}
if (M === 'grip') {
  // every man's right hand and weapon, alone, lit by a lamp at the camera, from four sides — big
  const C = b.camera.position, home = C.clone();
  const T3 = await w.eval("import('three')");
  const lamp = new T3.PointLight(0xffffff, 6, 3, 1); b.scene.add(lamp);
  const done = {};
  for (const u of units()) {
    const key = u.kind.file + '_' + u.kind.tool; if (done[key] || !u.farmTool) continue; done[key] = 1;
    u.g.visible = true; u.model.updateMatrixWorld(true);
    const hb = bn(u, /RightHand_/), mid = bn(u, /RightHandMiddle1_/), h = hb.getWorldPosition(new V3()).lerp(mid.getWorldPosition(new V3()), 0.5), ry = u.g.rotation.y;
    const hid = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isLineSegments) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } });
    b.camera.fov = 40; b.camera.updateProjectionMatrix();
    for (const [nm, a, dy] of [['out', -Math.PI / 2, 0.05], ['front', 0, 0.05], ['in', Math.PI / 2 + 0.3, 0.05], ['top', -0.8, 0.35]]) {
      C.set(h.x + Math.sin(ry + a) * 0.42, h.y + dy, h.z + Math.cos(ry + a) * 0.42); b.lookAt(h.x, h.y, h.z); b.camera.updateMatrixWorld(true); lamp.position.copy(C);
      shot('grip_' + key + '_' + nm, 260, 1.4);
    }
    for (const o of hid) o.visible = true;
  }
  b.scene.remove(lamp); C.copy(home); b.camera.fov = 105; b.camera.updateProjectionMatrix();
  log('GRIP shots', Object.keys(done).join(' '));
}
if (M === 'inhand') {
  // is the handle IN the drawn hand? The body's vertices owned by the right hand's bones, skinned as drawn: their middle
  // against the handle's line, and whether the palm and the fingertips lie on opposite sides of the handle (a wrap)
  // measured on men who are OUT in the street (a man in his house is not animated at all — his fingers never close),
  // every half second through a fight, between swings and in them, by file and weapon
  b.settings.devMode = false;
  const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
  const C0 = b.camera.position, home0 = [C0.x, C0.z], AGG = {};
  const skinOf = (mesh, i, out) => { mesh.getVertexPosition(i, out); return out.applyMatrix4(mesh.matrixWorld); };   // (getVertexPosition already skins a SkinnedMesh in r160)
  const measure = (u) => {
    const key = u.kind.file + '_' + u.kind.tool + (u.st.atk >= 0 ? ' swing' : ' still');
    u.model.updateMatrixWorld(true);
    let body = null; u.model.traverse((o) => { if (o.isSkinnedMesh && !body) body = o; });
    const bones = body.skeleton.bones, idx = (re) => bones.map((b, i) => re.test(b.name) ? i : -1).filter((i) => i >= 0);
    const palmB = new Set(idx(/RightHand_/)), tipB = new Set(idx(/RightHandMiddle3_/)), fingB = new Set(idx(/RightHandMiddle[123]_/)), thumbB = new Set(idx(/RightHandThumb/));
    const g = body.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, n = g.attributes.position.count;
    const P = [], F = [], H = [], v = new V3();
    for (let i = 0; i < n; i++) {
      let best = -1, bw = 0; for (let k = 0; k < 4; k++) { const wt = SW.getComponent(i, k); if (wt > bw) { bw = wt; best = SI.getComponent(i, k); } }
      if (bw < 0.5) continue;
      if (palmB.has(best)) P.push(skinOf(body, i, new V3()).clone());
      if (tipB.has(best)) F.push(skinOf(body, i, new V3()).clone());
      if (palmB.has(best) || fingB.has(best) || thumbB.has(best)) H.push(skinOf(body, i, new V3()).clone());
    }
    const mean = (A) => A.reduce((s, x) => s.add(x), new V3()).multiplyScalar(1 / Math.max(1, A.length));
    const T = u.farmTool, q = T.getWorldQuaternion(new u.g.quaternion.constructor()), ax = new V3(0, 1, 0).applyQuaternion(q);
    const gp = new V3(0, u.farmGrip.y, 0).applyMatrix4(T.matrixWorld);
    const perp = (p) => { const d = p.clone().sub(gp); return d.addScaledVector(ax, -d.dot(ax)); };
    const ch = mean(H), cp = mean(P), cf = mean(F), dh = perp(ch), dp = perp(cp), df = perp(cf);
    let ext = 0; for (const p of H) ext = Math.max(ext, perp(p).length());
    const wrap = dp.length() > 1e-4 && df.length() > 1e-4 ? Math.acos(Math.max(-1, Math.min(1, dp.clone().normalize().dot(df.clone().normalize())))) * 57.3 : -1;
    const A = AGG[key] || (AGG[key] = { n: 0, mid: [], tips: [], wrap: [] }); A.n++; A.mid.push(dh.length()); A.tips.push(df.length()); A.wrap.push(wrap);
  };
  for (let f = 0; f < +(Q.get('n') || 2400); f++) {
    w.__adv(1); C0.x = home0[0]; C0.z = home0[1]; b.heal(); if (P0.unit) P0.unit.st.awake = false;
    if (f % 30 === 0) for (const u of units()) if (u.st.alive && u.farm && u.farm.out && u.g.visible && u.farmTool) measure(u);
  }
  const med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1].toFixed(3) : '-'; };
  for (const k of Object.keys(AGG).sort()) { const A = AGG[k]; log('INHAND', k.padEnd(16), 'n', A.n, '| handle to the hand middle', med(A.mid), '| fingertips off the handle', med(A.tips), '| palm-vs-tips round the handle', med(A.wrap), '(180 = wrapped)'); }
}
if (M === 'fingers') {
  for (const u of units()) u.g.visible = true;
  for (let i = 0; i < 6; i++) { for (const u of units()) u.g.visible = true; w.__adv(1); }
  const u = units().find((x) => x.kind.tool === 'sword' && x.kind.file === 'kn') || units().find((x) => x.farmTool);
  const S = u.life;
  log('man', u.kind.file, u.kind.tool, 'claws', u.kind.claws, 'grip', JSON.stringify(S && S.grip), 'fingers', S && S.fingers.length);
  for (const f of (S ? S.fingers : [])) log('  F', f.b.name, 'R', f.R, 'k', f.k, 'sign', f.sign, 'ax', f.ax ? f.ax.toArray().map((x) => x.toFixed(2)).join(',') : 'null', 'kids', f.b.children.filter((c) => c.isBone).map((c) => c.name).join('|'));
  // how far each right-hand finger bone has turned from the bind (what the mixer + life leave on it)
  let body = null; u.model.traverse((o) => { if (o.isSkinnedMesh && !body) body = o; });
  const sk = body.skeleton;
  for (const nm of ['RightHandMiddle1_', 'RightHandMiddle2_', 'RightHandMiddle3_', 'RightHandThumb1_']) {
    const i = sk.bones.findIndex((x) => x.name.includes(nm)); if (i < 0) { log('no', nm); continue; }
    const bb = sk.bones[i], bindLocal = sk.boneInverses[i].clone().invert(); // bind world
    log('  B', bb.name, 'in skeleton', i, 'local q', bb.quaternion.toArray().map((x) => x.toFixed(2)).join(','));
  }
  // weights: how many body vertices are owned (>0.5) by each right-hand bone
  const g = body.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, cnt = {};
  for (let i = 0; i < g.attributes.position.count; i++) for (let k = 0; k < 4; k++) { const wt = SW.getComponent(i, k); if (wt > 0.5) { const nm = sk.bones[SI.getComponent(i, k)].name; if (/RightHand/.test(nm)) cnt[nm] = (cnt[nm] || 0) + 1; } }
  log('  WEIGHTS', JSON.stringify(cnt));
}
if (M === 'chopclip') {
  // the chop clip posed on one man of each weapon: the head's forward reach and height through the back half of the stroke
  for (const tool of ['hammer', 'axe', 'sword']) {
    const u = units().find((x) => x.kind.tool === tool && x.clips && x.bones && x.bones.tip && x.atk && Object.keys(x.atk).some((k) => x.atk[k].clip === 'mChop'));
    if (!u) { log('no', tool); continue; }
    const k = Object.keys(u.atk).find((kk) => u.atk[kk].clip === 'mChop'), A = u.atk[k], a = u.clips[k] || u.clips.mChop;
    for (const x of Object.values(u.clips)) { x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
    a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; const rot = u.model.rotation.y; u.model.rotation.y = 0;
    const dur = a.getClip().duration, inv = new u.g.matrixWorld.constructor(), out = [];
    for (let f = 0.60; f <= 0.96; f += 0.03) { a.time = dur * f; u.mixer.update(0); u.g.updateMatrixWorld(true); const v = u.bones.tip.getWorldPosition(new V3()).applyMatrix4(inv.copy(u.g.matrixWorld).invert()); out.push(f.toFixed(2) + ':z' + v.z.toFixed(2) + '/y' + v.y.toFixed(2)); }
    u.model.rotation.y = rot;
    log('CHOP', tool, k, 'hit', A.hit, 'dur', dur.toFixed(2), 'h', u.kind.h, '|', out.join(' '));
  }
}
