/* MIXAMO CHECK: does a retargeted clip play the source's motion? Not part of the game.
 *   eval(await (await fetch('/tools/mixcheck.js')).text());
 *   await __mixSrc('orc'); __mixCheck(unit, 'mCut', 'orc', 'oCut', { raw: true })
 * The source skeleton is rebuilt from the moves file (each bone's world delta on its
 * rest offset); the target is the unit's own rig with the clip on its mixer. Both are
 * read in the BODY'S frame (up = hips to neck, right = left thigh to right thigh), so
 * facing and proportions drop out and what is compared is where each limb points.
 * Returns the mean and worst angle per segment over the clip, in degrees. */
(function () {
  const PAR = { Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck',
    LeftShoulder: 'Spine2', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
    RightShoulder: 'Spine2', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
    LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
    RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot' };
  const SEG = { spine: ['Hips', 'Neck'], head: ['Neck', 'Head'],
    armL: ['LeftArm', 'LeftForeArm'], foreL: ['LeftForeArm', 'LeftHand'], armR: ['RightArm', 'RightForeArm'], foreR: ['RightForeArm', 'RightHand'],
    thighL: ['LeftUpLeg', 'LeftLeg'], shinL: ['LeftLeg', 'LeftFoot'], thighR: ['RightUpLeg', 'RightLeg'], shinR: ['RightLeg', 'RightFoot'],
    footL: ['LeftFoot', 'LeftToeBase'], footR: ['RightFoot', 'RightToeBase'] };
  window.__mixData = window.__mixData || {};
  window.__mixSrc = async (pack) => { if (!__mixData[pack]) __mixData[pack] = await (await fetch('/assets/' + pack + '-moves.json')).json(); return Object.keys(__mixData[pack].clips); };
  const V = () => new __bw.camera.position.constructor();
  const Q = () => new __bw.camera.quaternion.constructor();
  function frameOf(P) {   // P: name -> Vector3; returns [right, up, fwd]
    const up = P.Neck.clone().sub(P.Hips).normalize();
    const r = P.RightUpLeg.clone().sub(P.LeftUpLeg); r.addScaledVector(up, -r.dot(up)).normalize();
    const f = r.clone().cross(up).normalize();
    return [r, up, f];
  }
  const inF = (F, v) => V().set(v.dot(F[0]), v.dot(F[1]), v.dot(F[2]));
  function srcPose(c, f) {
    const P = { Hips: V() };
    const order = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
      'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
    for (const b of order) {
      const p = PAR[b]; if (!c.restPos[b] || !c.restPos[p]) continue;
      const off = V().fromArray(c.restPos[b]).sub(V().fromArray(c.restPos[p]));
      const dq = c.d[p] ? Q().fromArray(c.d[p], Math.min(f, c.d[p].length / 4 - 1) * 4) : Q();
      P[b] = P[p].clone().add(off.applyQuaternion(dq));
    }
    return P;
  }
  window.__mixCheck = (u, clip, pack, srcClip, o = {}) => {
    const c = __mixData[pack].clips[srcClip]; if (!c) return 'no source ' + srcClip;
    const a = u.clips[clip]; if (!a) return 'no clip ' + clip;
    const rag = u.kind.rag || {};
    const B = {}; u.model.traverse((x) => { if (x.isBone) B[x.name] = x; });
    const tb = (n) => B[rag['Character1_' + n]] || B[n];
    const saved = u.mixer._actions.map((x) => [x, x.enabled, x.time, x.getEffectiveWeight(), x.isRunning()]);
    for (const x of u.mixer._actions) { x.stop(); x.enabled = false; }
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const dur = a.getClip().duration, N = o.n || 16;
    const acc = {}; for (const k in SEG) acc[k] = { s: 0, w: 0, n: 0 };
    const upd = (o.raw && u.mixer.rawUpdate) ? u.mixer.rawUpdate : u.mixer.update;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      a.time = dur * t * 0.999; upd.call(u.mixer, 0); u.model.updateMatrixWorld(true);
      const TP = {}; for (const n of Object.keys(PAR).concat('Hips')) { const bn = tb(n); if (bn) TP[n] = bn.getWorldPosition(V()); }
      const SP = srcPose(c, Math.round(t * (c.n - 1)));
      if (!TP.Hips || !TP.Neck || !TP.LeftUpLeg || !TP.RightUpLeg) return 'missing target bones';
      const FT = frameOf(TP), FS = frameOf(SP);
      for (const k in SEG) {
        const [p, q] = SEG[k]; if (!TP[p] || !TP[q] || !SP[p] || !SP[q]) continue;
        const dt = inF(FT, TP[q].clone().sub(TP[p]).normalize()), ds = inF(FS, SP[q].clone().sub(SP[p]).normalize());
        const ang = Math.acos(Math.max(-1, Math.min(1, dt.dot(ds)))) * 57.3;
        acc[k].s += ang; acc[k].w = Math.max(acc[k].w, ang); acc[k].n++;
      }
    }
    a.stop(); a.enabled = false;
    for (const [x, en, tm, w, run] of saved) { if (run) x.play(); x.enabled = en; x.time = tm; x.setEffectiveWeight(w); }
    const out = {}; for (const k in acc) if (acc[k].n) out[k] = [Math.round(acc[k].s / acc[k].n), Math.round(acc[k].w)];
    return out;
  };
})();
