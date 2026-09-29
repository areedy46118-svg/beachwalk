/* THE RAPIER'S BENCH. Load after the game, with the peg in hand:
 *   await import('/tools/rapier.js')
 * __rp.measure(pose, rot)   where the fist and the point land for a pose
 * __rp.solve(target, seed)  coordinate descent onto screen targets
 * __rp.sheet(o)             a contact sheet of a swing / the string
 * Poses are evaluated through the game's own updateViewmodel at dt 0 with the
 * guard set to the trial pose, so nothing here re-implements the rig. */
(function () {
  const bw = window.__bw, V = bw.camera.position.constructor;
  const R = window.__rp = {};
  R.rafOff = () => { if (!R._raf) { R._raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; } };
  R.rafOn = () => { if (R._raf) { window.requestAnimationFrame = R._raf; R._raf = null; bw.animate(); } };
  R.equip = () => { bw.addToInventory(bw.pegItem); let n = 0; while (!bw.pegItem.viewmodel.visible && n++ < 4) { bw.toggleEquip(bw.pegItem); bw.updateViewmodel(0); } return bw.pegItem.viewmodel.visible; };
  const TIP = -0.650, TOP = 0.158;
  R.pts = () => {
    const vm = bw.pegItem.viewmodel, C = bw.vmCamera;
    vm.updateWorldMatrix(true, true); C.updateMatrixWorld(true);
    const out = {};
    for (const [k, y] of [['g', 0], ['t', TIP], ['b', TOP]]) {
      const w = new V(0, y, 0).applyMatrix4(vm.matrixWorld);
      const c = w.clone().applyMatrix4(C.matrixWorldInverse);
      const n = w.clone().project(C);
      out[k] = { x: n.x, y: n.y, z: -c.z, c };
    }
    const d = out.t.c.clone().sub(out.g.c).normalize();
    out.ax = Math.acos(Math.max(-1, Math.min(1, -d.z))) * 57.2958;   // shaft off the view axis, degrees
    return out;
  };
  R.measure = (pose, rot) => {
    window.__pegStill = true;
    const g0 = bw.pegGuard, r0 = bw.pegGuardRot;
    bw.pegGuard = pose; bw.pegGuardRot = rot;
    bw.updateViewmodel(0);
    const m = R.pts();
    bw.pegGuard = g0; bw.pegGuardRot = r0;
    return m;
  };
  const fmt = (m) => ({ g: [+m.g.x.toFixed(2), +m.g.y.toFixed(2), +m.g.z.toFixed(2)], t: [+m.t.x.toFixed(2), +m.t.y.toFixed(2), +m.t.z.toFixed(2)], b: [+m.b.x.toFixed(2), +m.b.y.toFixed(2)], ax: +m.ax.toFixed(0) });
  R.fmt = fmt;
  /* target: { g:[x,y], t:[x,y], tz: depth of the point, ax: degrees off the axis,
   *           w: weights, ref: [pose,rot] to stay near } */
  R.cost = (x, T) => {
    const m = R.measure(x.slice(0, 6), x.slice(6, 9));
    const W = T.w || {};
    let c = 0;
    if (T.g) c += (W.g ?? 1) * ((m.g.x - T.g[0]) ** 2 + (m.g.y - T.g[1]) ** 2);
    if (T.t) c += (W.t ?? 3) * ((m.t.x - T.t[0]) ** 2 + (m.t.y - T.t[1]) ** 2);
    if (T.tz !== undefined) c += (W.tz ?? 1) * (m.t.z - T.tz) ** 2;
    if (T.ax !== undefined) c += (W.ax ?? 0.0004) * (m.ax - T.ax) ** 2;
    if (T.gz !== undefined) c += (W.gz ?? 1) * (m.g.z - T.gz) ** 2;
    if (T.b) c += (W.b ?? 0.5) * ((m.b.x - T.b[0]) ** 2 + (m.b.y - T.b[1]) ** 2);
    if (T.ref) for (let i = 0; i < 9; i++) c += (W.ref ?? 0.02) * (x[i] - T.ref[i]) ** 2;
    return c;
  };
  R.solve = (T, seed, iters = 60) => {
    let x = seed.slice(), c = R.cost(x, T), h = 0.08;
    for (let it = 0; it < iters; it++) {
      let imp = false;
      for (let i = 0; i < 9; i++) {
        for (const s of [1, -1]) {
          const y = x.slice(); y[i] += s * h * (i === 1 || i === 4 || i === 5 ? 0.5 : 1);
          const cy = R.cost(y, T);
          if (cy < c) { x = y; c = cy; imp = true; break; }
        }
      }
      if (!imp) { h *= 0.5; if (h < 0.002) break; }
    }
    return { x: x.map((v) => +v.toFixed(3)), c: +c.toFixed(5), m: fmt(R.measure(x.slice(0, 6), x.slice(6, 9))) };
  };
  R.draw = () => {
    const r = bw.renderer;
    r.render(bw.scene, bw.camera);
    r.autoClear = false;
    if (bw.viewmodel.visible) { r.clearDepth(); r.render(bw.vmScene, bw.vmCamera); }
    r.autoClear = true;
  };
  /* frames of a swing (stage s, held or tapped) or of the whole string */
  R.sheet = (o = {}) => {
    const { frames = 24, dt = 1 / 60, cols = 6, w = 300, hold = false, skip = 0, tapAt = [], pick = null } = o;
    window.__pegStill = true;
    for (let i = 0; i < 30 && (bw.digT > 0 || bw.pegStage); i++) bw.step(0.25);
    bw.look(o.yaw ?? bw.state().yaw ?? 0, o.pitch ?? -0.03);
    for (let i = 0; i < 20; i++) bw.step(1 / 60);
    bw.windHeld = hold; bw.attackAction();
    const src = bw.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas');
    sh.width = cols * w; sh.height = Math.ceil(frames / cols) * (h + 14);
    const sg = sh.getContext('2d');
    sg.fillStyle = '#000'; sg.fillRect(0, 0, sh.width, sh.height);
    sg.font = '11px monospace'; sg.textBaseline = 'top';
    let shot = 0, i = 0; const rows = [];
    while (shot < frames && i < 900) {
      if (tapAt.includes(i)) bw.attackAction();
      R.draw();
      const m = R.pts();
      rows.push({ i, t: +bw.digT.toFixed(3), s: bw.pegStage, ...fmt(m) });
      if (pick ? pick.includes(i) : i % (skip + 1) === 0) {
        const cx = (shot % cols) * w, cy = Math.floor(shot / cols) * (h + 14);
        sg.drawImage(src, cx, cy, w, h);
        sg.strokeStyle = 'rgba(255,80,80,0.6)'; sg.beginPath(); sg.moveTo(cx + w / 2 - 5, cy + h / 2); sg.lineTo(cx + w / 2 + 5, cy + h / 2); sg.moveTo(cx + w / 2, cy + h / 2 - 5); sg.lineTo(cx + w / 2, cy + h / 2 + 5); sg.stroke();
        sg.fillStyle = '#9f9';
        sg.fillText(`${i} t=${bw.digT.toFixed(2)} s=${bw.pegStage}`, cx + 3, cy + h + 1);
        shot++;
      }
      bw.step(dt); i++;
    }
    bw.windHeld = false;
    R.last = sh; R.rows = rows;
    return shot;
  };
  R.grab = (q = 0.8) => R.last.toDataURL('image/jpeg', q).split(',')[1] + '#' + 'x'.repeat(120000);
})();
