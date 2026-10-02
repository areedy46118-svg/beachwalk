/* Solving the marauder's throne poses on his own rig. Not part of the game.
 *   await import('/tools/umbrasit.js'); __usInit(); __usSolve(targets, iters) -> angles
 * Every angle is composed onto his stance exactly as `poseRig`'s `build`
 * composes it (base, then up, right, fwd about the body's axes in each bone's
 * parent frame), the hip moved by hipY (up) and hipF (forward) in metres, and
 * what is measured is each joint in the GROUP's own frame: x his left, y up
 * off his feet, z his front. */
(function () {
  const b = window.__bw;
  let S = null;
  window.__usInit = () => {
    const u = b.umbraU(), m = u.model;
    const stance = u.clips.uStance.getClip();
    // stopped, but ENABLED: `poseRig` plays the stance with `a.play()`, which stamps nothing on a disabled action
    for (const a of u.mixer._actions) { a.stop(); a.enabled = true; }
    // the base the GAME builds on is the clips alone: the life layer goes on later
    const wrapped = u.mixer.update; if (u.mixer.rawUpdate) u.mixer.update = u.mixer.rawUpdate;
    const R = b.poseRig(u, m, stance, Object.assign({}, b.UMBRA_JOINTS, {
      handL: 'Hand1L_47', handR: 'Hand1R_95',
      clavL2: 'Shoulder2L_27', armL2: 'lowerbicep2L_25', foreL2: 'forearm2L_24', handL2: 'Hand2L_22',
      clavR2: 'Shoulder2R_75', armR2: 'lowerbicep2R_73', foreR2: 'forearm2R_72', handR2: 'Hand2R_70',
    }), {});
    u.mixer.update = wrapped;
    const by = {}; m.traverse((o) => { if (o.isBone) by[o.name] = o; });
    const V = b.camera.position.constructor, Q = b.camera.quaternion.constructor;
    const gq = new Q(); m.getWorldQuaternion(gq);
    const pq = new Q(); (R.J.hip.parent).getWorldQuaternion(pq).invert();
    const ps = new V(); R.J.hip.parent.getWorldScale(ps);
    const hipFwd = new V(0, 0, 1).applyQuaternion(gq).applyQuaternion(pq).normalize().divideScalar(ps.y);
    S = { u, m, R, by, V, hipFwd };
    return Object.keys(R.J).filter((k) => R.J[k]);
  };
  const apply = (ang) => {
    const { m, R, hipFwd, u } = S;
    for (const bn of R.bones) bn.quaternion.copy(R.base.get(bn));
    for (const k in ang) if (k !== 'hipY' && k !== 'hipF' && R.J[k]) R.J[k].quaternion.copy(R.compose(k, ang[k]));
    R.J.hip.position.copy(R.hipPos).addScaledVector(R.hipUp, ang.hipY || 0).addScaledVector(hipFwd, ang.hipF || 0);
    u.g.updateMatrixWorld(true);
  };
  const where = (name) => {
    const { u, by, V } = S;
    const v = new V(); by[name].getWorldPosition(v);
    return v.applyMatrix4(u.g.matrixWorld.clone().invert());
  };
  window.__usWhere = (ang, names) => { apply(ang); const o = {}; for (const n of names) o[n] = where(n).toArray().map((x) => +x.toFixed(3)); return o; };
  /* params: [[joint, axis, lo, hi], ...]; targets: [[boneName, [x,y,z], weight], ...] */
  window.__usSolve = (start, params, targets, iters = 60, reg = 0.02) => {
    const ang = JSON.parse(JSON.stringify(start || {}));
    const get = (j, ax) => j === 'hipY' || j === 'hipF' ? (ang[j] || 0) : ((ang[j] && ang[j][ax]) || 0);
    const set = (j, ax, v) => { if (j === 'hipY' || j === 'hipF') ang[j] = v; else { (ang[j] || (ang[j] = {}))[ax] = v; } };
    const cost = () => {
      apply(ang);
      let c = 0;
      for (const [n, t, w] of targets) { const p = where(n); c += w * ((p.x - t[0]) ** 2 + (p.y - t[1]) ** 2 + (p.z - t[2]) ** 2); }
      for (const [j, ax] of params) c += reg * get(j, ax) ** 2;
      return c;
    };
    let best = cost(), step = 0.25;
    for (let it = 0; it < iters; it++) {
      let moved = false;
      for (const [j, ax, lo, hi] of params) {
        const v0 = get(j, ax);
        for (const d of [step, -step]) {
          const v = Math.min(hi, Math.max(lo, v0 + d));
          set(j, ax, v);
          const c = cost();
          if (c < best - 1e-7) { best = c; moved = true; break; }
          set(j, ax, v0);
        }
      }
      if (!moved) { step *= 0.5; if (step < 0.004) break; }
    }
    apply(ang);
    const res = {};
    for (const [n, t] of targets) { const p = where(n); res[n] = +Math.hypot(p.x - t[0], p.y - t[1], p.z - t[2]).toFixed(3); }
    const round = JSON.parse(JSON.stringify(ang, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
    return { cost: +best.toFixed(4), err: res, ang: round };
  };
})();
