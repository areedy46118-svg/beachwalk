/* FARMER POSING HARNESS. Not part of the game.
 *   eval(await (await fetch('/tools/farmpose.js')).text()); await __farmLoad();
 *   __farmStrips([[name, dur, keys, n], ...], opts)  -> padded base64 of the strips
 * Composes EXACTLY the way `poseRig` does: the stance is put on the bind with
 * turns about the body's axes, parents first; that is the base; each joint's
 * axes are the body's axes AT THE STANCE, in its parent's frame, fixed there
 * (so a forearm's axis follows the upper arm); a key's turns are premultiplied
 * up, then right, then fwd; hipY is metres along the hip parent's up. */
(function () {
  const bw = window.__bw;
  const SFX = {
    wood: { Hips: '04', Spine: '05', Spine1: '06', Spine2: '07', Neck: '08', Head: '09', LeftShoulder: '011', LeftArm: '012', LeftForeArm: '013', LeftHand: '014', RightShoulder: '035', RightArm: '036', RightForeArm: '037', RightHand: '038', LeftUpLeg: '059', LeftLeg: '060', LeftFoot: '061', LeftToeBase: '062', RightUpLeg: '064', RightLeg: '065', RightFoot: '066', RightToeBase: '067' },
    farm: { Hips: '070', Spine: '071', Spine1: '072', Spine2: '073', Neck: '074', Head: '075', LeftShoulder: '077', LeftArm: '078', LeftForeArm: '079', LeftHand: '080', RightShoulder: '0100', RightArm: '0101', RightForeArm: '0102', RightHand: '0103', LeftUpLeg: '0121', LeftLeg: '0122', LeftFoot: '0123', LeftToeBase: '0124', RightUpLeg: '0126', RightLeg: '0128', RightFoot: '0129', RightToeBase: '0130' },
    work: { Hips: '0132', Spine: '0133', Spine1: '0134', Spine2: '0135', Neck: '0136', Head: '0137', LeftShoulder: '0139', LeftArm: '0127', LeftForeArm: '0140', LeftHand: '0141', RightShoulder: '0163', RightArm: '0164', RightForeArm: '0165', RightHand: '0166', LeftUpLeg: '0186', LeftLeg: '0187', LeftFoot: '0188', LeftToeBase: '0189', RightUpLeg: '0191', RightLeg: '0192', RightFoot: '0193', RightToeBase: '0194' },
  };
  const JN = { hip: 'Hips', waist: 'Spine', spine1: 'Spine1', chest: 'Spine2', neck: 'Neck', head: 'Head', clavL: 'LeftShoulder', clavR: 'RightShoulder',
    armL: 'LeftArm', armR: 'RightArm', foreL: 'LeftForeArm', foreR: 'RightForeArm', handL: 'LeftHand', handR: 'RightHand',
    thighL: 'LeftUpLeg', thighR: 'RightUpLeg', calfL: 'LeftLeg', calfR: 'RightLeg', footL: 'LeftFoot', footR: 'RightFoot' };
  const ORDER = Object.keys(JN);
  window.__FS = SFX; window.__FJN = JN;
  window.__farmLoad = async function () {
    const T = await import('three'); const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    window.THREE = T;
    window.requestAnimationFrame = () => 0;
    const L = new GLTFLoader(); const load = (u) => new Promise((res, rej) => L.load(u, res, undefined, rej));
    const g = new T.Group(); bw.scene.add(g); window.__fg = g;
    g.position.set(bw.camera.position.x - 30, 300, bw.camera.position.z);
    const F = [];
    for (const [i, key] of ['wood', 'farm', 'work'].entries()) {
      const gl = await load('assets/farmer-' + { wood: 'woodman', farm: 'farmman', work: 'workman' }[key] + '.glb');
      const s = gl.scene; const holder = new T.Group(); holder.add(s); holder.position.set((i - 1) * 1.6, 0, 0); g.add(holder);
      s.scale.setScalar(0.01);
      const J = {}; s.traverse((o) => { if (o.isBone) for (const k in JN) if (o.name === 'mixamorig' + JN[k] + '_' + SFX[key][JN[k]]) J[k] = o; });
      const bind = new Map(); s.traverse((o) => { if (o.isBone) bind.set(o, [o.quaternion.clone(), o.position.clone()]); });
      F.push({ key, s, J, bind, holder });
    }
    g.updateMatrixWorld(true);
    window.__farm = F;
    return F.map((f) => [f.key, Object.keys(f.J).length]);
  };
  const turnW = (b, axis, ang) => { const T = window.THREE; const pq = new T.Quaternion(); b.parent.getWorldQuaternion(pq).invert(); const a = axis.clone().applyQuaternion(pq).normalize(); b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(a, ang)); b.updateMatrixWorld(true); };
  // the stance on the bind, then the base and the fixed axes, as poseRig takes them
  window.__farmBase = function (f, stance) {
    const T = window.THREE;
    for (const [b, [q, p]] of f.bind) { b.quaternion.copy(q); b.position.copy(p); }
    f.s.updateMatrixWorld(true);
    const gq = new T.Quaternion(); f.s.getWorldQuaternion(gq);
    const U = new T.Vector3(0, 1, 0), R = new T.Vector3(1, 0, 0).applyQuaternion(gq), W = new T.Vector3(0, 0, 1).applyQuaternion(gq);
    for (const k of ORDER) { const a = stance[k]; const b = f.J[k]; if (!a || !b) continue; if (a.up) turnW(b, U, a.up); if (a.right) turnW(b, R, a.right); if (a.fwd) turnW(b, W, a.fwd); }
    f.s.updateMatrixWorld(true);
    f.base = new Map(); f.s.traverse((o) => { if (o.isBone) f.base.set(o, o.quaternion.clone()); });
    f.axes = {}; const pq = new T.Quaternion();
    for (const k in f.J) { const b = f.J[k]; (b.parent || b).getWorldQuaternion(pq).invert(); f.axes[k] = { up: U.clone().applyQuaternion(pq).normalize(), right: R.clone().applyQuaternion(pq).normalize(), fwd: W.clone().applyQuaternion(pq).normalize() }; }
    f.hipPos = f.J.hip.position.clone();
    const ps = new T.Vector3(); f.J.hip.parent.getWorldScale(ps); f.hipUp = f.axes.hip.up.clone().divideScalar(ps.y);
  };
  window.__farmSet = function (f, ang, hipY) {
    const T = window.THREE, tq = new T.Quaternion();
    for (const [b, q] of f.base) b.quaternion.copy(q);
    for (const k in f.J) {
      const a = ang[k]; if (!a) continue; const q = f.base.get(f.J[k]).clone(), X = f.axes[k];
      if (a.up) q.premultiply(tq.setFromAxisAngle(X.up, a.up)); if (a.right) q.premultiply(tq.setFromAxisAngle(X.right, a.right)); if (a.fwd) q.premultiply(tq.setFromAxisAngle(X.fwd, a.fwd));
      f.J[k].quaternion.copy(q);
    }
    f.J.hip.position.copy(f.hipPos).addScaledVector(f.hipUp, hipY || 0);
    f.s.updateMatrixWorld(true);
  };
  const sm = (x) => x * x * (3 - 2 * x);
  // the same sampling `build` does: every angle eased between the keys either side
  window.__farmSample = function (keys, t) {
    let k0 = keys[0], k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    const span = k1[0] - k0[0], s = span > 1e-6 ? sm(Math.min(1, Math.max(0, (t - k0[0]) / span))) : 1;
    const out = {}; const js = new Set([...Object.keys(k0[1]), ...Object.keys(k1[1])]);
    for (const j of js) { if (j === 'hipY') continue; const a = k0[1][j] || {}, b = k1[1][j] || {}; out[j] = {}; for (const ax of ['up', 'right', 'fwd']) out[j][ax] = (a[ax] || 0) + ((b[ax] || 0) - (a[ax] || 0)) * s; }
    return [out, (k0[1].hipY || 0) + ((k1[1].hipY || 0) - (k0[1].hipY || 0)) * s];
  };
  window.__farmShot = function (o) {
    const T = window.THREE; const f = window.__farm[o.who || 0];
    for (const F of window.__farm) F.holder.visible = F === f;
    const cam = new T.PerspectiveCamera(o.fov || 34, o.W / o.H, 0.05, 200);
    const a = (o.yaw || 0) * Math.PI / 180, gp = f.holder.getWorldPosition(new T.Vector3());
    cam.position.set(gp.x + Math.sin(a) * (o.dist || 4.2), gp.y + (o.h || 1.1), gp.z + Math.cos(a) * (o.dist || 4.2)); cam.lookAt(gp.x, gp.y + (o.look || 0.95), gp.z);
    const fog = bw.scene.fog; bw.scene.fog = null;
    const amb = new T.AmbientLight(0xffffff, 1.3); bw.scene.add(amb); const dl = new T.DirectionalLight(0xffffff, 2.2); dl.position.copy(cam.position).add(new T.Vector3(3, 5, 2)); bw.scene.add(dl);
    const R = bw.renderer; const rt = new T.WebGLRenderTarget(o.W, o.H, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
    R.setRenderTarget(rt); R.setClearColor(0x3a4450, 1); R.clear(); R.render(bw.scene, cam); const px = new Uint8Array(o.W * o.H * 4); R.readRenderTargetPixels(rt, 0, 0, o.W, o.H, px); R.setRenderTarget(null); rt.dispose();
    bw.scene.fog = fog; bw.scene.remove(amb); bw.scene.remove(dl);
    for (const F of window.__farm) F.holder.visible = true;
    const cv = document.createElement('canvas'); cv.width = o.W; cv.height = o.H; const ctx = cv.getContext('2d'); const im = ctx.createImageData(o.W, o.H);
    for (let y = 0; y < o.H; y++) im.data.set(px.subarray((o.H - 1 - y) * o.W * 4, (o.H - y) * o.W * 4), y * o.W * 4);
    ctx.putImageData(im, 0, 0); return cv;
  };
  /* rows of strips: [label, keys, n, {who, yaw, ...}] — keys in normalised time */
  window.__farmStrips = function (rows, base) {
    base = Object.assign({ W: 150, H: 220 }, base || {});
    const outs = [];
    for (const [label, keys, n, o0] of rows) {
      const o = Object.assign({}, base, o0 || {});
      const f = window.__farm[o.who || 0];
      const cells = [];
      for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0; const [ang, hy] = window.__farmSample(keys, t); window.__farmSet(f, ang, hy); cells.push(window.__farmShot(o)); }
      window.__farmSet(f, {}, 0);
      const cv = document.createElement('canvas'); cv.width = o.W * n; cv.height = o.H; const x = cv.getContext('2d');
      cells.forEach((c, i) => x.drawImage(c, i * o.W, 0)); x.fillStyle = '#ff0'; x.font = '13px monospace'; x.fillText(label, 4, 14);
      outs.push(cv);
    }
    const W = Math.max(...outs.map((c) => c.width)), H = outs.reduce((s, c) => s + c.height, 0);
    const out = document.createElement('canvas'); out.width = W; out.height = H; const x = out.getContext('2d');
    let y = 0; for (const c of outs) { x.drawImage(c, 0, y); y += c.height; }
    return out.toDataURL('image/jpeg', 0.8).split(',')[1] + '#' + 'x'.repeat(120000);
  };
  return 'farmpose ready';
})();
