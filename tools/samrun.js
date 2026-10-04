/* THE SAMURAI ON THE MOVE, from beside him. Not part of the game.
 *   eval(await (await fetch('/tools/contact.js')).text()); await __roomBoot('dojo', 'assets/samurai.glb');
 *   eval(await (await fetch('/tools/samrun.js')).text());
 *   __samRun(u, shots, every, yawDeg, dist)   puts you `away` metres off so he closes, and every `every`
 *                                            frames draws him from `yawDeg` round his own facing; the
 *                                            player camera is put back after each still, so the AI sees
 *                                            you where you stand. -> padded base64 jpeg, a caption per cell */
(function () {
  const b = window.__bw;
  window.__samRun = (u, shots = 8, every = 6, yawDeg = 90, dist = 3.4, away = 11, W = 220, H = 280, setup) => {
    const C = b.camera, R = b.renderer, src = R.domElement;
    const p0 = C.position.clone(), q0 = C.quaternion.clone(), f0 = C.fov, a0 = C.aspect, sz = new window.__T.Vector2();
    R.getSize(sz);
    const p = u.g.position, yaw = u.g.rotation.y;
    if (away) { C.position.set(p.x + Math.sin(yaw) * away, C.position.y, p.z + Math.cos(yaw) * away); }
    if (setup) setup();
    const home = C.position.clone(), hq = C.quaternion.clone();
    const cv = document.createElement('canvas'); cv.width = W * Math.min(shots, 6); cv.height = Math.ceil(shots / 6) * (H + 14);
    const g = cv.getContext('2d'); g.font = '10px monospace';
    R.setSize(W, H, false);
    for (let i = 0; i < shots; i++) {
      window.__cadv(every); b.heal && b.heal();
      C.position.copy(home);
      const ang = u.g.rotation.y + yawDeg * Math.PI / 180, q = u.g.position;
      C.position.set(q.x + Math.sin(ang) * dist, q.y + 1.45, q.z + Math.cos(ang) * dist);
      C.fov = 45; C.aspect = W / H; C.updateProjectionMatrix(); C.lookAt(q.x, q.y + 1.2, q.z); C.updateMatrixWorld();
      const hid = window.__samSolo ? b.scene.children.filter((o) => o.visible && !o.isLight && o !== u.g && !(() => { let x = u.g; while (x) { if (x === o) return true; x = x.parent; } return false; })()) : [];
      for (const o of hid) o.visible = false;
      R.render(b.scene, C);
      for (const o of hid) o.visible = true;
      const cx = (i % 6) * W, cy = Math.floor(i / 6) * (H + 14);
      g.filter = window.__samGain ? `brightness(${window.__samGain})` : 'none'; g.drawImage(src, cx, cy, W, H); g.filter = 'none';
      if (window.__samNote) { g.fillStyle = '#fd8'; g.fillText(window.__samNote(u), cx + 2, cy + 11); }
      const clip = u.cur && u.cur.getClip ? u.cur.getClip().name : '?';
      g.fillStyle = '#9f9'; g.fillText(`${clip.slice(0, 14)} g${u.samIK ? u.samIK.g.toFixed(2) : '-'} ${u.st.atk >= 0 ? u.st.swing : ''}`, cx + 2, cy + H + 11);
      C.position.copy(home); C.quaternion.copy(hq); C.fov = f0; C.aspect = a0; C.updateProjectionMatrix();
    }
    R.setSize(sz.x, sz.y, false);
    return cv.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
/* boot: the dojo, the samurai awake and revealed, a list of floor spots 9-11 m off him (`__spots`) */
window.__samRunBoot = async () => {
  const b = window.__bw;
  let i = 0; while (i++ < 160 && !(b.startGate().startReady)) { b.frame(1); await new Promise((r) => setTimeout(r, 250)); }
  window.__T = await import('three');
  eval(await (await fetch('/tools/contact.js')).text());
  const u = await window.__roomBoot('dojo', 'assets/samurai.glb'); if (!u) return 'no samurai';
  b.wakeSamurai();
  for (let k = 0; k < 300; k++) { window.__cadv(1); b.heal && b.heal(); }
  u.g.visible = true; u.st.awake = true; u.holdAnim = false;
  window.__u = u; window.__spotsFor();
  return window.__spots.length;
};
window.__spotsFor = () => {
  const b = window.__bw, u = window.__u, p = u.g.position.clone(), c0 = b.camera.position.clone(), out = [];
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; for (const d of [9, 10, 11]) {
    const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d; b.camera.position.x = x; b.camera.position.z = z; b.step(0.016);
    const c = b.camera.position; if (Math.hypot(c.x - x, c.z - z) < 0.05) out.push([x, z, d]); } }
  b.camera.position.copy(c0); out.sort((x, y) => y[2] - x[2]); window.__spots = out; return out.length;
};
/* clipping numbers for this frame, in his own frame: how far the blade and both fists sit from his
 * torso (the segment hips → neck), the torso's lean, and the elbow angles */
window.__samProbe = (u) => {
  const T = window.__T, B = {}; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; });
  const w = (n) => B[n].getWorldPosition(new T.Vector3());
  const hip = w('DEF-spine'), neck = w('DEF-spine004') , kat = (() => { let k; u.model.traverse((o) => { if (o.isBone && o.name === 'Katana') k = o; }); return k.getWorldPosition(new T.Vector3()); })(), tip = w('DEF-katana_tip');
  const segD = (p, a, c) => { const ab = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  let blade = 9; for (let i = 0; i <= 10; i++) blade = Math.min(blade, segD(kat.clone().lerp(tip, i / 10), hip, neck));
  const ang = (a, b2, c) => b2.clone().sub(a).normalize().angleTo(c.clone().sub(b2).normalize()) * 57.3;
  const up = neck.clone().sub(hip); const lean = Math.acos(up.y / up.length()) * 57.3;
  return { blade: +blade.toFixed(2), fistR: +segD(w('DEF-handR'), hip, neck).toFixed(2), fistL: +segD(w('DEF-handL'), hip, neck).toFixed(2), lean: +lean.toFixed(0),
    elbR: +ang(w('DEF-upper_armR'), w('DEF-forearmR'), w('DEF-handR')).toFixed(0), elbL: +ang(w('DEF-upper_armL'), w('DEF-forearmL'), w('DEF-handL')).toFixed(0) };
};
/* a hands-off fight, healed: per clip/swing, the worst clearance of the blade (beyond the fists) and of
 * each fist from his torso line, and how many frames each came inside `inR` (in the armour) */
window.__samClear = (N = 2400, inR = 0.24) => {
  const b = window.__bw, u = window.__u, home = b.camera.position.clone(), agg = {};
  const T = window.__T, B = {}; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; });
  let kat; u.model.traverse((o) => { if (o.isBone && o.name === 'Katana') kat = o; });
  const w = (o) => o.getWorldPosition(new T.Vector3());
  const segD = (p, a, c) => { const ab = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  for (let i = 0; i < N; i++) {
    b.camera.position.x = home.x; b.camera.position.z = home.z;
    window.__cadv(1); b.heal && b.heal();
    if (!u.st.alive) break;
    const hip = w(B['DEF-spine']), neck = w(B['DEF-spine004']), k0 = w(kat), tip = w(B['DEF-katana_tip']);
    let bl = 9; for (let j = 3; j <= 10; j++) bl = Math.min(bl, segD(k0.clone().lerp(tip, j / 10), hip, neck));
    const fr = segD(w(B['DEF-handR']), hip, neck), fl = segD(w(B['DEF-handL']), hip, neck);
    // behind his back: the sword fist behind the torso's frontal plane and not out at his side
    const ax = neck.clone().sub(hip).normalize(), ry = u.g.rotation.y + u.model.rotation.y;
    const fw = new T.Vector3(Math.sin(ry), 0, Math.cos(ry)); fw.addScaledVector(ax, -fw.dot(ax)).normalize();
    const sd = new T.Vector3().crossVectors(ax, fw);
    const hr = w(B['DEF-handR']).sub(hip); const fo = hr.dot(fw), la = Math.abs(hr.dot(sd));
    const back = fo < -0.05 && la < 0.4;
    const key = (u.cur && u.cur.getClip ? u.cur.getClip().name : '-') + (u.st.atk >= 0 ? '/' + u.st.swing : '');
    const A = agg[key] || (agg[key] = { n: 0, bl: 9, fr: 9, fl: 9, inB: 0, inR: 0, inL: 0, bk: 0 });
    if (back) A.bk++;
    A.n++; A.bl = Math.min(A.bl, bl); A.fr = Math.min(A.fr, fr); A.fl = Math.min(A.fl, fl);
    if (bl < inR) A.inB++; if (fr < inR) A.inR++; if (fl < inR) A.inL++;
  }
  return Object.entries(agg).sort((x, y) => y[1].n - x[1].n).map(([k, A]) => `${k} n${A.n} blade ${A.bl.toFixed(2)}(${A.inB}) R ${A.fr.toFixed(2)}(${A.inR}) L ${A.fl.toFixed(2)}(${A.inL}) back(${A.bk})`).join('\n');
};
/* stills of one swing as he plays it in the fight: waits (healed) until `name` starts, then a still every
 * `every` frames from `yawDeg` round his facing. Swing names: u.st.swing; 'sThrow' waits on the throw. */
window.__samSwing = (name, shots = 12, every = 3, yawDeg = 70, dist = 2.8, W = 220, H = 300, maxWait = 5400) => {
  const b = window.__bw, u = window.__u, C = b.camera, home = C.position.clone();
  const isOn = () => name === 'sThrow' ? !!(u.thr) : (u.st.atk >= 0 && u.st.swing === name && u.st.atk < 0.08);
  let k = 0; while (k++ < maxWait && !isOn()) { C.position.x = home.x; C.position.z = home.z; window.__cadv(1); b.heal && b.heal(); }
  if (!isOn()) return 'never';
  return window.__samRun(u, shots, every, yawDeg, dist, 0, W, H);
};
/* the RAW clip at clip-fractions `fs` (the mixer's stamp, every other action off, the katana pinned off the
 * clip's own grip the way `pinSamuraiSword` does), then everything put back. -> blade dir + fist clearance */
window.__samRaw = (name, fs) => {
  const T = window.__T, u = window.__u, out = [];
  const B = {}; let kat; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; if (o.isBone && o.name === 'Katana') kat = o; });
  const hand = B['DEF-handR'], W = (o) => o.getWorldPosition(new T.Vector3());
  const segD = (p, a, c) => { const ab = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  const saved = [], my = u.model.rotation.y;
  for (const k in u.clips) { const a = u.clips[k]; saved.push([a, a.time, a.enabled, a.paused, a.getEffectiveWeight(), a.isRunning() || u.mixer._isActiveAction(a)]); }
  const ia = u.clips.idle;
  const stamp = (a, t) => { for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); } a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = t; u.mixer.rawUpdate(0); u.model.rotation.y = 0; u.model.updateMatrixWorld(true); };
  stamp(ia, 0.3); const off = hand.matrixWorld.clone().invert().multiply(kat.matrixWorld);
  const a = u.clips[name], d = a.getClip().duration;
  for (const f of fs) {
    stamp(a, d * f);
    const w = hand.matrixWorld.clone().multiply(off); kat.parent.matrixWorld.clone().invert().multiply(w).decompose(kat.position, kat.quaternion, kat.scale); kat.updateMatrixWorld(true);
    if (window.__samRawEach) window.__samRawEach(f);
    const inv = new T.Matrix4().copy(u.g.matrixWorld).invert(), k0 = W(kat).applyMatrix4(inv), tp = W(B['DEF-katana_tip']).applyMatrix4(inv), dd = tp.sub(k0).normalize();
    const hip = W(B['DEF-spine']), nk = W(B['DEF-spine004']);
    const rel = (n) => { const v = W(B[n]).applyMatrix4(inv).sub(W(B['DEF-spine003']).applyMatrix4(inv)); return `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; };
    out.push(`${f.toFixed(2)} d${dd.x.toFixed(1)},${dd.y.toFixed(1)},${dd.z.toFixed(1)} R${segD(W(hand), hip, nk).toFixed(2)} L${segD(W(B['DEF-handL']), hip, nk).toFixed(2)}` + (window.__samRel ? ' ' + window.__samRel.map((n) => n.replace('DEF-', '') + ' ' + rel(n)).join(' ') : ''));
  }
  for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
  for (const [x, t, en, pa, w, run] of saved) { if (run) x.play(); x.time = t; x.enabled = en; x.paused = pa; x.setEffectiveWeight(w); }
  u.model.rotation.y = my; u.mixer.update(0); u.model.updateMatrixWorld(true);
  return out.join('\n');
};
/* the same numbers on the live frame */
window.__samLive = () => {
  const T = window.__T, u = window.__u, B = {}; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; });
  const W = (o) => o.getWorldPosition(new T.Vector3()), inv = new T.Matrix4().copy(u.g.matrixWorld).invert();
  const rel = (n) => { const v = W(B[n]).applyMatrix4(inv).sub(W(B['DEF-spine003']).applyMatrix4(inv)); return `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; };
  const c = u.cur; return `clip${c ? (c.time / c.getClip().duration).toFixed(2) : '-'} ` + (window.__samRel || []).map((n) => n.replace('DEF-', '') + ' ' + rel(n)).join(' ');
};
/* the RAW clip's contact: the clip fraction where the blade (hilt → tip) passes nearest a chest `ahead`
 * metres in front of him at `chestY` over his feet. -> best fraction, distance, and the curve */
window.__samContact = (name, ahead = 1.45, chestY = 1.42, f0 = 0, f1 = 1, n = 60) => {
  const T = window.__T, u = window.__u, B = {}; let kat; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; if (o.isBone && o.name === 'Katana') kat = o; });
  const fs = []; for (let i = 0; i <= n; i++) fs.push(f0 + (f1 - f0) * i / n);
  const P = new T.Vector3(0, chestY, ahead).applyMatrix4(u.g.matrixWorld), ds = [];
  window.__samRawEach = (f) => { const k0 = kat.getWorldPosition(new T.Vector3()), tp = B['DEF-katana_tip'].getWorldPosition(new T.Vector3()); let best = 9; for (let j = 0; j <= 10; j++) best = Math.min(best, k0.clone().lerp(tp, j / 10).distanceTo(P)); ds.push([f, best]); };
  window.__samRaw(name, fs); window.__samRawEach = null;
  ds.sort((a, b) => a[1] - b[1]);
  return ds.slice(0, 5).map((x) => `${x[0].toFixed(3)}:${x[1].toFixed(2)}`).join(' ');
};
/* pops: per-frame movement of head and fists relative to his hips (world metres), alternating near and far
 * from him so he runs too; the biggest jumps with their context */
window.__samPops = (N = 3600) => {
  const b = window.__bw, u = window.__u, T = window.__T, B = {}; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; });
  const W = (o) => o.getWorldPosition(new T.Vector3()), far = window.__spots[0], home = b.camera.position.clone();
  let prev = null; const D = { h: [], l: [], r: [] }, big = [];
  for (let f = 0; f < N; f++) {
    const s = (Math.floor(f / 400) % 2) ? far : [home.x, home.z];
    b.camera.position.x = s[0]; b.camera.position.z = s[1];
    window.__cadv(1); b.heal();
    const hp = W(B['DEF-spine']); const cur = { h: W(B['DEF-spine006']).sub(hp), l: W(B['DEF-handL']).sub(hp), r: W(B['DEF-handR']).sub(hp) };
    if (prev) {
      for (const k of ['h', 'l', 'r']) D[k].push(cur[k].distanceTo(prev[k]));
      const m = Math.max(cur.l.distanceTo(prev.l), cur.r.distanceTo(prev.r));
      if (m > 0.3) { const c = u.cur, kc = u.samKC || {}; big.push(`${m.toFixed(2)} ${c ? c.getClip().name : '-'} atk${u.st.atk.toFixed(2)} sm${u.sp ? u.sp.t.toFixed(2) : ''} aim${(u.aimW || 0).toFixed(2)} kcF${(kc.fist || 0).toFixed(2)} kcB${(kc.blade || 0).toFixed(2)} g${u.samIK.g.toFixed(2)}`); }
    }
    prev = cur;
  }
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length * f)].toFixed(3); };
  return JSON.stringify({ head: [q(D.h, 0.5), q(D.h, 0.99), +Math.max(...D.h).toFixed(3)], L: [q(D.l, 0.5), q(D.l, 0.99), +Math.max(...D.l).toFixed(3)], R: [q(D.r, 0.5), q(D.r, 0.99), +Math.max(...D.r).toFixed(3)], nBig: big.length, big: big.sort().reverse().slice(0, 8) });
};
/* GLITCHES, not speed: a fist (relative to his hips) that jumps more than `th` m in one frame and comes back
 * the next (the two moves point opposite ways). Fast cuts do not count; a one-frame flick does. */
window.__samFlicks = (N = 5400, th = 0.2) => {
  const b = window.__bw, u = window.__u, T = window.__T, B = {}; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; });
  const W = (o) => o.getWorldPosition(new T.Vector3()), far = window.__spots[0], home = b.camera.position.clone();
  let p1 = null, p2 = null; const ex = []; let n = 0;
  for (let f = 0; f < N; f++) {
    const s = (Math.floor(f / 400) % 2) ? far : [home.x, home.z];
    b.camera.position.x = s[0]; b.camera.position.z = s[1];
    window.__cadv(1); b.heal();
    const hp = W(B['DEF-spine']); const cur = [W(B['DEF-handL']).sub(hp), W(B['DEF-handR']).sub(hp), W(B['DEF-spine006']).sub(hp)];
    if (p1 && p2) for (let i = 0; i < 3; i++) {
      const a = p1[i].clone().sub(p2[i]), c = cur[i].clone().sub(p1[i]);
      if (a.length() > th && c.length() > th && a.normalize().dot(c.normalize()) < -0.5) { n++; if (ex.length < 8) { const k = u.cur; ex.push(`${['L', 'R', 'head'][i]} ${k ? k.getClip().name : '-'} atk${u.st.atk.toFixed(2)} sm${u.sp ? u.sp.t.toFixed(2) : ''}`); } }
    }
    p2 = p1; p1 = cur;
  }
  return JSON.stringify({ perMin: +(n * 3600 / N).toFixed(1), ex });
};
