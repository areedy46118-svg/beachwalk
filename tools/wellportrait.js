/* THE WELL MAN'S PORTRAIT, from the test tab. Not part of the game.
 *   after __sgBoot({noGun:true}):  eval(await (await fetch('/tools/wellportrait.js')).text());
 *   __wp.studio(W, H, opts) -> a canvas: his scan, head and shoulders, front on, in a photographer's light
 *   (the model is lent to a scene of its own for the shot and put back) */
(function () {
  const b = window.__bw, T = b.THREE;
  window.__wp = {
    studio(W = 600, H = 800, o = {}) {
      const u = b.wellU(), g = u.g;
      const par = g.parent, keep = { p: g.position.clone(), r: g.rotation.y, v: g.visible };
      const S = new T.Scene();
      S.background = null;
      S.add(new T.HemisphereLight(0xffffff, 0x404040, o.hemi ?? 0.9));
      const key = new T.DirectionalLight(0xffffff, o.key ?? 2.2); key.position.set(-1.2, 2.2, 2.0); S.add(key);
      const fill = new T.DirectionalLight(0xffffff, o.fill ?? 0.5); fill.position.set(1.5, 0.8, 1.5); S.add(fill);
      const rim = new T.DirectionalLight(0xffffff, o.rim ?? 1.0); rim.position.set(0.5, 1.5, -2.0); S.add(rim);
      try { return this._shoot(u, g, S, W, H, o, par, keep); } finally { par.add(g); g.position.copy(keep.p); g.rotation.set(0, keep.r, 0); g.visible = keep.v; }
    },
    _shoot(u, g, S, W, H, o, par, keep) {
      S.add(g); g.position.set(0, 0, 0); g.rotation.set(0, o.yaw ?? 0, 0); g.visible = true;
      // the pose: a still from his idle
      if (u.mixer) {
        u.mixer.stopAllAction();
        const a = u.clips && u.clips[o.clip || 'idle01'];      // (the unit keeps ACTIONS under its clip names)
        if (a) { a.reset().play(); a.setEffectiveWeight(1); a.time = o.t ?? 0.4; a.paused = true; }
        u.mixer.update(0);
      }
      // the jaw shut (or nearly), turned on its own bone after the pose
      let jaw = null; g.traverse((q) => { if (q.name === 'jaw_019_17') jaw = q; });
      if (jaw && o.jaw) { jaw.rotation.x += o.jaw[0] || 0; jaw.rotation.y += o.jaw[1] || 0; jaw.rotation.z += o.jaw[2] || 0; }
      if (jaw && o.jawP) { jaw.position.x += o.jawP[0] || 0; jaw.position.y += o.jawP[1] || 0; jaw.position.z += o.jawP[2] || 0; }
      if (jaw && o.jawS) jaw.scale.multiplyScalar(o.jawS);
      // a smooth skin for the sitter: the scan's blotched hide swapped for clay (put back after the shot)
      const swaps = [];
      if (o.clay) g.traverse((q) => { if (q.isMesh) { swaps.push([q, q.material]); q.material = new T.MeshStandardMaterial({ color: o.clay, roughness: 0.78, metalness: 0, map: o.keepMap ? q.material.map : null }); } });
      this._swaps = swaps;
      g.updateMatrixWorld(true);
      let head = null; g.traverse((q) => { if (q.name === 'head_014_16') head = q; });
      const hp = head ? head.getWorldPosition(new T.Vector3()) : new T.Vector3(0, 1.7, 0);
      const cam = new T.PerspectiveCamera(o.fov ?? 24, W / H, 0.05, 50);
      const fwd = new T.Vector3(Math.sin(o.yaw ?? 0), 0, Math.cos(o.yaw ?? 0));
      cam.position.copy(hp).addScaledVector(fwd, o.dist ?? 1.9).add(new T.Vector3(o.dx ?? 0, o.dy ?? 0.02, 0));
      cam.lookAt(hp.x, hp.y - (o.drop ?? 0.22), hp.z);
      const R = b.renderer, size = R.getSize(new T.Vector2()), pr = R.getPixelRatio(), clr = R.getClearColor(new T.Color()), ca = R.getClearAlpha();
      R.setPixelRatio(1); R.setSize(W, H, false); R.setClearColor(0x000000, 0);
      R.render(S, cam);
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      out.getContext('2d').drawImage(R.domElement, 0, 0, W, H);
      R.setSize(size.x, size.y, false); R.setPixelRatio(pr); R.setClearColor(clr, ca);
      for (const [q, m] of swaps) q.material = m;
      // where his head is on the picture, for the painting over it
      const hs = hp.clone().project(cam);
      out.userData = { head: [(hs.x + 1) / 2 * W, (1 - hs.y) / 2 * H] };
      return out;
    },
    /* HIS HEAD ON A TAILORED BODY, IN ONE SHOT. The barman's scan (assets/wong.glb, a Character Creator body in
     * a white shirt, waistcoat and tie) with its head, eyes, brows and cap hidden and its arms brought down; the
     * well man stood in it, scaled so his head is a man's, his neck in the collar, his own arms and legs folded
     * away to nothing. Both lit by the same lights, so the collar sits round his neck as cloth does. */
    async sit2(W = 600, H = 800, o = {}) {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      if (!this._wong) this._wong = (await new GLTFLoader().loadAsync('/assets/wong.glb')).scene;
      const wong = this._wong;
      const hide = o.shirtOnly ? /Tongue|Skin_Head|Eyelash|Tearline|Occlusion|Teeth|Eye_|Cornea|Brow|Flat_Cap|FS_Tie|FS_waistcoat/ : /Tongue|Skin_Head|Eyelash|Tearline|Occlusion|Teeth|Eye_|Cornea|Brow|Flat_Cap/;
      wong.traverse((q) => { if (q.isMesh) { q.visible = !hide.test(q.material.name); q.frustumCulled = false; if (q.material.metalness !== undefined) q.material.metalness = 0; } });
      const bone = (root, n) => { let r = null; root.traverse((q) => { if (q.isBone && q.name === n) r = q; }); return r; };
      // the arms down at his sides (T-pose out of the pack)
      if (!wong.userData.posed) {
        wong.userData.posed = true;
        const L = bone(wong, 'CC_Base_L_Upperarm_052'), R = bone(wong, 'CC_Base_R_Upperarm_080');
        if (L) L.rotateOnAxis(new T.Vector3(...(o.armAxis || [0, 0, 1])), o.armL ?? -1.25);
        if (R) R.rotateOnAxis(new T.Vector3(...(o.armAxis || [0, 0, 1])), o.armR ?? 1.25);
      }
      const u = b.wellU(), g = u.g, par = g.parent, keep = { p: g.position.clone(), r: g.rotation.y, v: g.visible, s: g.scale.x };
      const S = new T.Scene();
      S.add(new T.HemisphereLight(0xffffff, 0x404040, o.hemi ?? 0.6));
      const key = new T.DirectionalLight(0xffffff, o.key ?? 2.8); key.position.set(-1.2, 2.2, 2.0); S.add(key);
      const fill = new T.DirectionalLight(0xffffff, o.fill ?? 0.3); fill.position.set(1.5, 0.8, 1.5); S.add(fill);
      const rim = new T.DirectionalLight(0xffffff, o.rim ?? 1.3); rim.position.set(0.5, 1.5, -2.0); S.add(rim);
      S.add(wong); wong.position.set(0, 0, 0); wong.rotation.set(0, 0, 0); wong.updateMatrixWorld(true);
      const swaps = [];
      try {
        S.add(g); g.rotation.set(0, 0, 0); g.visible = true; g.scale.setScalar(1);
        if (u.mixer) { u.mixer.stopAllAction(); const a = u.clips && u.clips.idle01; if (a) { a.reset().play(); a.time = 0.4; a.paused = true; } u.mixer.update(0); }
        const jaw = bone(g, 'jaw_019_17'); if (jaw) jaw.rotation.y += -0.55;
        // his arms and legs folded away
        for (const n of ['shoulder_R_06_36', 'shoulder_L_015_18', 'thigh_R_038_58', 'thigh_L_034_54']) { const q = bone(g, n); if (q) q.scale.setScalar(0.001); }
        if (o.chest) { const c = bone(g, 'chest_017_14'); if (c) c.scale.set(o.chest, 1, o.chest); const nk = bone(g, 'neck_013_15'); if (nk) nk.scale.set(1 / o.chest, 1, 1 / o.chest); }
        g.position.set(0, 0, 0); g.updateMatrixWorld(true);
        // scale him so his head is a man's head, and stand his neck in the collar
        const wHead = bone(wong, 'CC_Base_Head_038'), wNeck = bone(wong, 'CC_Base_NeckTwist01_036');
        const mHead = bone(g, 'head_014_16'), mNeck = bone(g, 'neck_013_15');
        const P = (q) => q.getWorldPosition(new T.Vector3());
        const k = (o.headK ?? 1) * P(wHead).distanceTo(P(wNeck)) / P(mHead).distanceTo(P(mNeck));
        g.scale.setScalar(k); g.updateMatrixWorld(true);
        // sitting up straight: his neck-to-head stood upright (the idle carries it forward), turned about the neck
        { const n0 = P(mNeck), v = P(mHead).sub(n0).normalize(), q = new T.Quaternion().setFromUnitVectors(v, new T.Vector3(0, 1, 0));
          if (o.upright !== false) { g.position.sub(n0).applyQuaternion(q).add(n0); g.quaternion.premultiply(q); g.updateMatrixWorld(true); } }
        const off = P(wNeck).sub(P(mNeck)).add(new T.Vector3(...(o.nudge || [0, 0, 0])));
        g.position.add(off); g.updateMatrixWorld(true);
        if (o.clay) g.traverse((q) => { if (q.isMesh) { swaps.push([q, q.material]); q.material = new T.MeshStandardMaterial({ color: o.clay, roughness: 0.72, metalness: 0, map: o.skin || null }); } });
        const hp = P(mHead);
        const cam = new T.PerspectiveCamera(o.fov ?? 24, W / H, 0.05, 50);
        cam.position.set(hp.x + (o.dx ?? 0), hp.y + (o.dy ?? 0), hp.z + (o.dist ?? 1.7));
        cam.lookAt(hp.x, hp.y - (o.drop ?? 0.25), hp.z);
        const R = b.renderer, size = R.getSize(new T.Vector2()), pr = R.getPixelRatio(), clr = R.getClearColor(new T.Color()), ca = R.getClearAlpha();
        R.setPixelRatio(1); R.setSize(W, H, false); R.setClearColor(0x000000, 0);
        R.render(S, cam);
        const out = document.createElement('canvas'); out.width = W; out.height = H;
        out.getContext('2d').drawImage(R.domElement, 0, 0, W, H);
        R.setSize(size.x, size.y, false); R.setPixelRatio(pr); R.setClearColor(clr, ca);
        const hs = hp.clone().project(cam);
        out.userData = { head: [(hs.x + 1) / 2 * W, (1 - hs.y) / 2 * H], k };
        return out;
      } finally {
        for (const [q, m] of swaps) q.material = m;
        for (const n of ['shoulder_R_06_36', 'shoulder_L_015_18', 'thigh_R_038_58', 'thigh_L_034_54', 'chest_017_14', 'neck_013_15']) { const q = bone(g, n); if (q) q.scale.setScalar(1); }
        par.add(g); g.position.copy(keep.p); g.quaternion.identity(); g.rotation.set(0, keep.r, 0); g.visible = keep.v; g.scale.setScalar(keep.s);
        S.remove(wong);
      }
    },
    // a tile of real skin for his face: a patch of the barman's forehead (his scan's map), mirrored so it tiles
    skinTile(rep = 6) {
      let m = null; this._wong.traverse((q) => { if (q.isMesh && q.material.name === 'Std_Skin_Head') m = q.material.map; });
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N * 2; const g = c.getContext('2d');
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.save(); g.translate(N, N); g.scale(sx, sy); g.drawImage(m.image, 420, 760, 190, 100, 0, 0, N, N); g.restore(); }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
      return t;
    },
    /* THE SITTING, PAINTED OVER THE SCAN. Everything below is in the frame of
     * `studio(600, 800, { clay: 0xc8b8a8, jaw: [0, -0.55, 0], dist: 1.65, drop: 0.02, fov: 24 })`
     * (`__wp.SIT`): his eyes at (255, 278) and (342, 278), the nose's tip at
     * (300, 332), the jaw shut on its hinge so the mouth is a slit from
     * (258, 366) to (352, 364) at y 372–378, the chin at 418. */
    compose(raw, o = {}) {
      /* `o.map` [k, ox, oy] carries those coordinates onto another shot (`sit2`: his head on the barman's body,
       * 900×1200, where the face is the same face 1.333 times the size); `o.body` keeps the shot's own body and
       * clothes and paints none */
      const W = raw.width, H = raw.height, rnd = this._rng(o.seed || 7);
      const [k, ox, oy] = o.map || [1, 0, 0], inv = (f) => (x, y) => f((x - ox) / k, (y - oy) / k), it = (n) => Math.round(n * k * k);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      // the studio's painted backdrop: a mottled cloud, lighter behind the head
      { const gr = g.createRadialGradient(300 * k + ox, 260 * k + oy, 40 * k, 300 * k + ox, 330 * k + oy, 560 * k); gr.addColorStop(0, '#b9b2a6'); gr.addColorStop(0.55, '#8a8378'); gr.addColorStop(1, '#4b4640'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * H, r = (20 + rnd() * 90) * k, a = 0.025 + rnd() * 0.04; const q = g.createRadialGradient(x, y, 0, x, y, r); const c = rnd() < 0.5 ? '255,250,240' : '30,26,22'; q.addColorStop(0, `rgba(${c},${a})`); q.addColorStop(1, `rgba(${c},0)`); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); } }
      // only his head and neck from the scan: below the collar he is what the tailor made
      if (o.body) g.drawImage(raw, 0, 0);
      else { g.save(); g.beginPath(); g.ellipse(300, 300, 118, 178, 0, 0, 7); g.rect(214, 380, 172, 110); g.clip(); g.drawImage(raw, 0, 0); g.restore(); }
      // ---- the mouth: the slit and the tears at its corners filled with the skin round them (diffused in from the edges)
      this._inpaint(g, inv((x, y) => ((x - 305) / 58) ** 2 + ((y - 372) / 13) ** 2 < 1), it(300));
      // the hollows under the cheekbones (the scan's cheeks are torn there) eased half way
      for (const [cx, cy] of [[262, 352], [348, 350]]) this._inpaint(g, inv((x, y) => ((x - cx) / 24) ** 2 + ((y - cy) / 18) ** 2 < 1), it(160), 0.55);
      // and the sockets: the hollows eased, so they are eyes in a gaunt face and not holes in a skull
      for (const ex of [255, 342]) this._inpaint(g, inv((x, y) => { const d = ((x - ex) / 34) ** 2 + ((y - 274) / 25) ** 2; return d < 1 && d > 0.16; }), it(180), 0.72);
      // the shadow under the jaw: a fold of dark, not a black bar
      if (!o.body) this._inpaint(g, inv((x, y) => ((x - 302) / 62) ** 2 + ((y - 432) / 16) ** 2 < 1), it(120), 0.5);
      else this._inpaint(g, inv((x, y) => ((x - 300) / 70) ** 2 + ((y - 436) / 18) ** 2 < 1), it(140), 0.55);   // the gap of black between his jaw and the collar
      // his face given the light the shirt has: a soft lift over the head, strongest on the brow and cheeks
      if (o.lift) { g.save(); g.globalCompositeOperation = 'screen'; const q = g.createRadialGradient(300 * k + ox, 320 * k + oy, 10 * k, 300 * k + ox, 320 * k + oy, 150 * k); q.addColorStop(0, `rgba(255,240,225,${o.lift})`); q.addColorStop(0.7, `rgba(255,240,225,${o.lift * 0.6})`); q.addColorStop(1, 'rgba(255,240,225,0)'); g.fillStyle = q; g.fillRect(0, 0, W, H); g.restore(); }
      // and the lower face made ONE surface: the scan's seams and the filled places softened together, feathered out
      this._soften(g, 303 * k + ox, 362 * k + oy, 92 * k, 82 * k, 5 * k);
      this._soften(g, 303 * k + ox, 362 * k + oy, 62 * k, 50 * k, 3 * k);
      // the skin's own grain back over it, so the softened part is not smoother than the rest
      { const X = Math.round(200 * k + ox), Y = Math.round(270 * k + oy), d = g.getImageData(X, Y, Math.round(210 * k), Math.round(180 * k)), a = d.data; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] < 10) continue; const n = (rnd() - 0.5) * 7; a[i] += n; a[i + 1] += n; a[i + 2] += n; } g.putImageData(d, X, Y); }
      g.save(); g.setTransform(k, 0, 0, k, ox, oy);    // the painting, in the first shot's coordinates
      // ---- ears, low on the sides of the skull, the way his would be
      for (const sd of [-1, 1]) {
        const x0 = 300 + sd * 99, y0 = 300;
        g.save(); g.translate(x0, y0); g.scale(sd, 1);
        g.beginPath(); g.moveTo(0, -26); g.bezierCurveTo(14, -36, 22, -14, 17, 4); g.bezierCurveTo(13, 20, 9, 30, 1, 34); g.bezierCurveTo(-3, 18, -2, -10, 0, -26); g.closePath();
        const eg = g.createLinearGradient(0, -30, 18, 30); eg.addColorStop(0, '#b4a594'); eg.addColorStop(1, '#8c7e70'); g.fillStyle = eg; g.fill();
        g.strokeStyle = 'rgba(60,50,42,0.55)'; g.lineWidth = 1.4; g.stroke();
        g.beginPath(); g.moveTo(4, -18); g.bezierCurveTo(13, -22, 15, -6, 11, 8); g.bezierCurveTo(9, 16, 6, 20, 4, 22); g.strokeStyle = 'rgba(70,58,48,0.6)'; g.lineWidth = 2; g.stroke();
        g.restore();
      }
      // ---- what hair he had: a close-cropped fringe round the back and over the ears, the dome bare
      for (let i = 0; i < 2600; i++) {
        const sd = rnd() < 0.5 ? -1 : 1, t = rnd();
        const ang = -0.15 + t * 1.25;                       // from above the ear round toward the back
        const rx = 104, ry = 150, cx = 300, cy = 300;
        const x = cx + sd * Math.cos(ang) * rx * (0.96 + rnd() * 0.06), y = cy - Math.sin(ang) * ry * 0.62 + 10 + rnd() * 26;
        if (y < 196 || Math.abs(x - 300) < 88) continue;
        const L = 3 + rnd() * 5, a = -Math.PI / 2 + sd * (0.5 + rnd() * 0.5);
        g.strokeStyle = `rgba(${40 + rnd() * 30 | 0},${34 + rnd() * 24 | 0},${28 + rnd() * 20 | 0},${0.25 + rnd() * 0.35})`; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
      }
      // ---- the brows: sparse, pale, lifted a little (he is pleased)
      for (const sd of [-1, 1]) for (let i = 0; i < 90; i++) {
        const t = rnd(), x = 300 + sd * (22 + t * 46), y = 247 - Math.sin(t * Math.PI) * 6 + t * 2 + (rnd() - 0.5) * 3;
        g.strokeStyle = `rgba(55,45,38,${0.25 + rnd() * 0.3})`; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + sd * (3 + rnd() * 3), y - 1 - rnd() * 1.5); g.stroke();
      }
      // ---- the eyes: lids over the balls the scan gave him, an iris, a catchlight, and the creases of a smile at the corners
      for (const sd of [-1, 1]) {
        const ex = 300 + sd * 43, ey = 277, w = 19, h = 7.5;
        const lid = () => { g.beginPath(); g.moveTo(ex - w, ey + 1); g.bezierCurveTo(ex - w * 0.5, ey - h * 1.25, ex + w * 0.5, ey - h * 1.25, ex + w, ey + 1); g.bezierCurveTo(ex + w * 0.5, ey + h * 0.85, ex - w * 0.5, ey + h * 0.85, ex - w, ey + 1); g.closePath(); };
        g.save(); lid(); g.clip();
        g.fillStyle = '#d8d2c8'; g.fillRect(ex - w, ey - h * 2, w * 2, h * 4);
        const ig = g.createRadialGradient(ex + sd * 1, ey, 0.5, ex + sd * 1, ey, 6.6); ig.addColorStop(0, '#2a2622'); ig.addColorStop(0.45, '#5c5650'); ig.addColorStop(0.85, '#3a3631'); ig.addColorStop(1, '#1e1b18');
        g.fillStyle = ig; g.beginPath(); g.arc(ex + sd * 1, ey, 6.6, 0, 7); g.fill();
        g.fillStyle = '#0c0a09'; g.beginPath(); g.arc(ex + sd * 1, ey, 2.6, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(ex + sd * 1 - 2, ey - 2.2, 1.3, 0, 7); g.fill();
        const sh = g.createLinearGradient(0, ey - h, 0, ey); sh.addColorStop(0, 'rgba(40,32,26,0.55)'); sh.addColorStop(1, 'rgba(40,32,26,0)'); g.fillStyle = sh; g.fillRect(ex - w, ey - h * 1.4, w * 2, h * 1.4);
        g.restore();
        lid(); g.strokeStyle = 'rgba(30,24,20,0.5)'; g.lineWidth = 1; g.stroke();
        g.beginPath(); g.moveTo(ex - w, ey + 1); g.bezierCurveTo(ex - w * 0.5, ey - h * 1.25, ex + w * 0.5, ey - h * 1.25, ex + w, ey + 1); g.strokeStyle = 'rgba(22,17,14,0.85)'; g.lineWidth = 2.4; g.stroke();   // the upper lid and its lashes
        g.beginPath(); g.moveTo(ex - w * 0.9, ey - h * 0.9); g.bezierCurveTo(ex - w * 0.4, ey - h * 2.3, ex + w * 0.5, ey - h * 2.2, ex + w * 1.05, ey - h * 0.6); g.strokeStyle = 'rgba(70,56,46,0.35)'; g.lineWidth = 1.3; g.stroke();   // the crease
        g.beginPath(); g.moveTo(ex - w * 0.8, ey + h * 0.95); g.quadraticCurveTo(ex, ey + h * 1.7, ex + w * 0.85, ey + h * 0.85); g.strokeStyle = 'rgba(80,64,52,0.3)'; g.lineWidth = 1.2; g.stroke();   // the lower lid, lifted by the smile
        for (let k = 0; k < 3; k++) { const ox = ex + sd * (w + 2), oy = ey - 2 + k * 4; g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + sd * 6, oy + (k - 1) * 2, ox + sd * 11, oy + (k - 1) * 4); g.strokeStyle = 'rgba(70,56,46,0.28)'; g.lineWidth = 1; g.stroke(); }   // crow's feet
      }
      // ---- the smile: the lips shut and drawn up at the corners, the folds from the nose deepened, the cheeks lifted
      { const cy = 376, L = 262, R = 349, C = 305;
        for (const sd of [-1, 1]) {   // the apples of the cheeks
          const ax = C + sd * 42 - 4, q = g.createRadialGradient(ax, 336, 2, ax, 336, 30); q.addColorStop(0, 'rgba(255,248,236,0.20)'); q.addColorStop(1, 'rgba(255,248,236,0)'); g.fillStyle = q; g.fillRect(ax - 30, 306, 60, 60);
          g.beginPath(); g.moveTo(300 + sd * 18, 342); g.bezierCurveTo(300 + sd * 32, 350, 300 + sd * 44, 358, C + sd * 50, 372); g.strokeStyle = 'rgba(60,48,40,0.26)'; g.lineWidth = 2.6; g.stroke();   // the fold
          g.beginPath(); g.moveTo(300 + sd * 19, 343); g.bezierCurveTo(300 + sd * 33, 351, 300 + sd * 45, 359, C + sd * 51, 373); g.strokeStyle = 'rgba(255,248,236,0.12)'; g.lineWidth = 2; g.stroke();
        }
        // the nose: lit down its bridge and on its tip, the nostrils and the wings in shadow
        { g.beginPath(); g.moveTo(297, 288); g.quadraticCurveTo(296, 310, 298, 326); g.strokeStyle = 'rgba(255,248,236,0.22)'; g.lineWidth = 4; g.stroke();
          const tq = g.createRadialGradient(299, 328, 1, 299, 328, 9); tq.addColorStop(0, 'rgba(255,248,236,0.3)'); tq.addColorStop(1, 'rgba(255,248,236,0)'); g.fillStyle = tq; g.fillRect(288, 318, 22, 22);
          for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(300 + sd * 8, 336, 3.6, 2, sd * 0.4, 0, 7); g.fillStyle = 'rgba(30,22,18,0.55)'; g.fill();
            g.beginPath(); g.moveTo(300 + sd * 6, 327); g.quadraticCurveTo(300 + sd * 15, 328, 300 + sd * 13, 337); g.strokeStyle = 'rgba(60,48,40,0.35)'; g.lineWidth = 1.6; g.stroke(); }
          g.beginPath(); g.moveTo(306, 292); g.quadraticCurveTo(309, 312, 308, 326); g.strokeStyle = 'rgba(40,32,26,0.16)'; g.lineWidth = 3; g.stroke(); }
        // the cheeks lit as the forehead is (the scan's hollows under them read as bruises)
        for (const sd of [-1, 1]) { const q = g.createRadialGradient(302 + sd * 46, 334, 4, 302 + sd * 46, 334, 46); q.addColorStop(0, 'rgba(255,248,236,0.16)'); q.addColorStop(1, 'rgba(255,248,236,0)'); g.fillStyle = q; g.fillRect(302 + sd * 46 - 46, 288, 92, 92); }
        // the light lifted on the lower face (the key fell short of it under the cheekbones)
        { const q = g.createRadialGradient(C, 372, 4, C, 372, 78); q.addColorStop(0, 'rgba(255,248,236,0.22)'); q.addColorStop(1, 'rgba(255,248,236,0)'); g.fillStyle = q; g.fillRect(C - 80, 292, 160, 160); }
        for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(C + sd * 4, cy - 14); g.lineTo(C + sd * 4, cy - 34); g.strokeStyle = 'rgba(70,56,46,0.14)'; g.lineWidth = 2; g.stroke(); }   // the philtrum
        // the smile, lips parted on the upper teeth: the mouth's shape first, dark
        const top = (t) => cy - 4 + Math.sin(t * Math.PI) * 3 - Math.pow(Math.abs(t - 0.5) * 2, 2.2) * 10;   // the upper lip's edge, t 0..1 corner to corner
        const bot = (t) => cy - 4 + Math.sin(t * Math.PI) * 13 - Math.pow(Math.abs(t - 0.5) * 2, 2.2) * 10;
        const X = (t) => L + (R - L) * t;
        g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; i ? g.lineTo(X(t), top(t)) : g.moveTo(X(t), top(t)); } for (let i = 24; i >= 0; i--) { const t = i / 24; g.lineTo(X(t), bot(t)); } g.closePath();
        g.fillStyle = 'rgba(28,20,16,0.92)'; g.fill();
        // the teeth: a pale band under the upper lip, darker toward the corners, the joins between them
        g.save(); g.clip();
        g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; i ? g.lineTo(X(t), top(t)) : g.moveTo(X(t), top(t)); } for (let i = 24; i >= 0; i--) { const t = i / 24; g.lineTo(X(t), top(t) + (bot(t) - top(t)) * 0.62); } g.closePath();
        const tg = g.createLinearGradient(L, 0, R, 0); tg.addColorStop(0, 'rgba(120,110,96,0.5)'); tg.addColorStop(0.3, 'rgba(222,214,198,0.95)'); tg.addColorStop(0.7, 'rgba(222,214,198,0.95)'); tg.addColorStop(1, 'rgba(120,110,96,0.5)'); g.fillStyle = tg; g.fill();
        for (let k = -3; k <= 3; k++) { const x = C + k * 8.5; g.beginPath(); g.moveTo(x, cy - 4); g.lineTo(x + k * 0.4, cy + 8); g.strokeStyle = 'rgba(70,60,50,0.35)'; g.lineWidth = 1; g.stroke(); }
        g.restore();
        // the upper lip over them, a shade dark; the lower lip under, lit on its swell
        g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; i ? g.lineTo(X(t), top(t)) : g.moveTo(X(t), top(t)); } for (let i = 24; i >= 0; i--) { const t = i / 24; g.lineTo(X(t), top(t) - 5 * Math.sin(t * Math.PI) - 1); } g.closePath();
        g.fillStyle = 'rgba(110,84,72,0.45)'; g.fill();
        g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; i ? g.lineTo(X(t), bot(t)) : g.moveTo(X(t), bot(t)); } for (let i = 24; i >= 0; i--) { const t = i / 24; g.lineTo(X(t), bot(t) + 7 * Math.sin(t * Math.PI)); } g.closePath();
        g.fillStyle = 'rgba(128,98,86,0.4)'; g.fill();
        g.beginPath(); g.moveTo(X(0.36), bot(0.36) + 3); g.quadraticCurveTo(C, bot(0.5) + 4.5, X(0.64), bot(0.64) + 3); g.strokeStyle = 'rgba(255,245,230,0.3)'; g.lineWidth = 1.8; g.stroke();
        g.beginPath(); g.moveTo(X(0.3), bot(0.3) + 9); g.quadraticCurveTo(C, bot(0.5) + 12, X(0.7), bot(0.7) + 9); g.strokeStyle = 'rgba(50,40,34,0.22)'; g.lineWidth = 3; g.stroke();
        for (const sd of [-1, 1]) { g.beginPath(); g.arc(C + sd * 47, cy - 10, 3, 0, 7); g.fillStyle = 'rgba(50,40,34,0.14)'; g.fill(); }   // the corners pressed in
      }
      // ---- his Sunday clothes: a wing collar, a dark tie, a waistcoat and a black coat
      g.restore();
      if (!o.body) this._clothes(g, rnd);
      return this._age(cv, rnd, o);
    },
    _clothes(g, rnd) {
      // the coat: from the shoulders down, black wool with its folds, the lapels rolled back to a low V
      g.save();
      const coat = new Path2D(); coat.moveTo(10, 800); coat.bezierCurveTo(14, 640, 24, 540, 70, 498); coat.bezierCurveTo(118, 470, 180, 452, 226, 436); coat.lineTo(300, 520); coat.lineTo(374, 436); coat.bezierCurveTo(420, 452, 482, 470, 530, 498); coat.bezierCurveTo(576, 540, 586, 640, 590, 800); coat.closePath();
      const cg = g.createLinearGradient(0, 470, 0, 800); cg.addColorStop(0, '#2c2826'); cg.addColorStop(1, '#141210'); g.fillStyle = cg; g.fill(coat);
      g.clip(coat);
      for (let i = 0; i < 40; i++) { const x = rnd() * 600, y = 500 + rnd() * 300; g.strokeStyle = `rgba(${rnd() < 0.5 ? '255,250,240' : '0,0,0'},${0.03 + rnd() * 0.05})`; g.lineWidth = 6 + rnd() * 14; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rnd() - 0.5) * 60, y + 60, x + (rnd() - 0.5) * 30, y + 160); g.stroke(); }
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(300 + sd * 222, 506); g.bezierCurveTo(300 + sd * 200, 580, 300 + sd * 196, 680, 300 + sd * 204, 800); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.stroke(); g.strokeStyle = 'rgba(255,250,240,0.06)'; g.lineWidth = 8; g.stroke(); }
      // the key light on the left shoulder
      { const q = g.createRadialGradient(120, 520, 10, 120, 520, 220); q.addColorStop(0, 'rgba(255,250,240,0.16)'); q.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = q; g.fillRect(0, 440, 400, 360); }
      g.restore();
      // the waistcoat in the V, a shade lighter, buttoned
      const vest = new Path2D(); vest.moveTo(244, 500); vest.lineTo(300, 520); vest.lineTo(356, 500); vest.lineTo(392, 800); vest.lineTo(208, 800); vest.closePath();
      g.fillStyle = '#3a3532'; g.fill(vest);
      for (let k = 0; k < 4; k++) { const y = 640 + k * 46; g.fillStyle = '#181514'; g.beginPath(); g.arc(300, y, 4.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,250,240,0.25)'; g.beginPath(); g.arc(299, y - 1.5, 1.6, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(300, 600); g.lineTo(300, 800); g.stroke();
      // the shirt front and the wing collar, starched white
      const shirt = new Path2D(); shirt.moveTo(250, 456); shirt.lineTo(300, 610); shirt.lineTo(350, 456); shirt.closePath();
      g.fillStyle = '#e6e1d8'; g.fill(shirt);
      for (const sd of [-1, 1]) {
        g.beginPath(); g.moveTo(300 + sd * 4, 466); g.lineTo(300 + sd * 70, 440); g.quadraticCurveTo(300 + sd * 76, 456, 300 + sd * 62, 480); g.lineTo(300 + sd * 12, 488); g.closePath();
        g.fillStyle = '#efebe3'; g.fill(); g.strokeStyle = 'rgba(80,70,60,0.5)'; g.lineWidth = 1.2; g.stroke();
        g.beginPath(); g.moveTo(300 + sd * 6, 468); g.lineTo(300 + sd * 22, 490); g.lineTo(300 + sd * 4, 488); g.closePath(); g.fillStyle = '#f4f1ea'; g.fill(); g.stroke();   // the wing
      }
      // the band of the collar round the neck behind
      g.beginPath(); g.moveTo(228, 462); g.quadraticCurveTo(300, 440, 372, 462); g.lineTo(374, 436); g.quadraticCurveTo(300, 414, 226, 436); g.closePath(); g.fillStyle = '#e9e5dc'; g.fill(); g.strokeStyle = 'rgba(80,70,60,0.45)'; g.stroke();
      // the tie: a dark knot and its fall into the waistcoat
      g.beginPath(); g.moveTo(287, 478); g.lineTo(313, 478); g.lineTo(308, 500); g.lineTo(292, 500); g.closePath(); g.fillStyle = '#1d1a19'; g.fill();
      g.beginPath(); g.moveTo(292, 500); g.lineTo(308, 500); g.lineTo(316, 590); g.lineTo(300, 604); g.lineTo(284, 590); g.closePath(); g.fillStyle = '#26221f'; g.fill();
      g.strokeStyle = 'rgba(255,250,240,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(296, 510); g.lineTo(292, 588); g.stroke();
      // the lapels: rolled back, a peak at the notch, lit along the roll
      for (const sd of [-1, 1]) {
        const lap = new Path2D(); lap.moveTo(300 + sd * 76, 436); lap.lineTo(300 + sd * 40, 500); lap.lineTo(300 + sd * 4, 690); lap.lineTo(300 + sd * 70, 640); lap.lineTo(300 + sd * 112, 512); lap.lineTo(300 + sd * 96, 470); lap.closePath();
        g.fillStyle = '#1e1b19'; g.fill(lap); g.strokeStyle = 'rgba(255,250,240,0.14)'; g.lineWidth = 1.4; g.stroke(lap);
        g.beginPath(); g.moveTo(300 + sd * 42, 500); g.lineTo(300 + sd * 6, 686); g.strokeStyle = 'rgba(255,250,240,0.1)'; g.lineWidth = 3; g.stroke();
      }
      // a watch chain across the waistcoat
      g.beginPath(); g.moveTo(300, 686); g.quadraticCurveTo(330, 712, 372, 700); g.strokeStyle = 'rgba(200,190,170,0.6)'; g.lineWidth = 1.6; g.setLineDash([2, 2]); g.stroke(); g.setLineDash([]);
    },
    /* AND A HUNDRED YEARS IN A DRAWER: silver and paper, the tone, the soft lens, the grain, the fading at the
     * edges, the foxing, the scratches and the dust, a crease, and the card mount with its corners worn */
    _age(src, rnd, o) {
      const W = 600, H = 800, M = 46, OW = W + M * 2, OH = H + M * 2 + 40;
      const out = document.createElement('canvas'); out.width = OW; out.height = OH;
      const g = out.getContext('2d');
      // the card: buff board, a gilt rule, the studio's name in its foot
      g.fillStyle = '#cdbf9f'; g.fillRect(0, 0, OW, OH);
      { const d = g.getImageData(0, 0, OW, OH), a = d.data; for (let i = 0; i < a.length; i += 4) { const n = (rnd() - 0.5) * 18; a[i] += n; a[i + 1] += n; a[i + 2] += n * 0.8; } g.putImageData(d, 0, 0); }
      g.strokeStyle = 'rgba(120,96,50,0.7)'; g.lineWidth = 2; g.strokeRect(M - 10, M - 10, W + 20, H + 20);
      g.fillStyle = 'rgba(70,55,35,0.75)'; g.font = 'italic 22px "Palatino Linotype", Palatino, Georgia, serif'; g.textAlign = 'center';
      g.fillText('J. Abernethy & Son  ·  Portraits', OW / 2, OH - 34);
      // the print: soft, then toned black and white
      const p = document.createElement('canvas'); p.width = W; p.height = H; const q = p.getContext('2d');
      const cr = o.crop || [45, 92, 510, 680]; q.filter = 'blur(1.1px)'; q.drawImage(src, cr[0], cr[1], cr[2], cr[3], 0, 0, W, H); q.filter = 'none';   // in close: head and shoulders
      const d = q.getImageData(0, 0, W, H), a = d.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        let l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255;
        l = 0.08 + 0.84 * Math.pow(l, 1.05);                                   // the blacks lifted and the whites dulled: a faded print
        const ex = Math.min(x, W - x, y, H - y);
        l = l * (0.78 + 0.22 * Math.min(1, ex / 120)) + (1 - Math.min(1, ex / 60)) * 0.06;   // dark toward the edges, a little bleached at them
        l += (rnd() - 0.5) * 0.07;                                               // grain
        a[i] = Math.min(255, l * 255 * 1.04); a[i + 1] = Math.min(255, l * 255 * 1.0); a[i + 2] = Math.min(255, l * 255 * 0.92);   // a little warmth in the silver
      }
      q.putImageData(d, 0, 0);
      // foxing and water marks
      for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, r = 2 + Math.pow(rnd(), 3) * 26; const gr = q.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(120,90,50,${0.12 + rnd() * 0.25})`); gr.addColorStop(1, 'rgba(120,90,50,0)'); q.fillStyle = gr; q.beginPath(); q.arc(x, y, r, 0, 7); q.fill(); }
      { const x = 470, y = 640, r = 120; q.strokeStyle = 'rgba(110,80,40,0.16)'; q.lineWidth = 3; q.beginPath(); for (let t = 0; t <= 6.3; t += 0.1) { const rr = r * (0.85 + 0.25 * Math.sin(t * 3 + 1) * Math.sin(t * 5)); t ? q.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr) : q.moveTo(x + rr, y); } q.stroke(); }
      // scratches and dust
      for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, L = 6 + rnd() * 70, a2 = rnd() * Math.PI; q.strokeStyle = `rgba(${rnd() < 0.7 ? '245,240,228' : '20,16,12'},${0.08 + rnd() * 0.18})`; q.lineWidth = 0.5 + rnd() * 0.6; q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + Math.cos(a2) * L * 0.5 + (rnd() - 0.5) * 8, y + Math.sin(a2) * L * 0.5, x + Math.cos(a2) * L, y + Math.sin(a2) * L); q.stroke(); }
      for (let i = 0; i < 160; i++) { q.fillStyle = `rgba(${rnd() < 0.6 ? '240,235,222' : '15,12,10'},${0.15 + rnd() * 0.4})`; q.beginPath(); q.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 1.3, 0, 7); q.fill(); }
      // the crease where it was folded once, corner to side, and the emulsion cracked along it
      q.strokeStyle = 'rgba(250,246,236,0.28)'; q.lineWidth = 1.6; q.beginPath(); q.moveTo(0, 590); q.bezierCurveTo(160, 610, 360, 690, 600, 760); q.stroke();
      q.strokeStyle = 'rgba(30,24,18,0.16)'; q.lineWidth = 1; q.beginPath(); q.moveTo(0, 593); q.bezierCurveTo(160, 613, 360, 693, 600, 763); q.stroke();
      g.drawImage(p, M, M);
      // the card's own wear: the corners rounded and grubby, an edge chipped
      g.globalCompositeOperation = 'destination-in';
      g.beginPath(); const rr = 22; g.moveTo(rr, 0); g.lineTo(OW - rr * 1.6, 0); g.quadraticCurveTo(OW, 0, OW, rr * 1.6); g.lineTo(OW, OH - rr); g.quadraticCurveTo(OW, OH, OW - rr, OH); g.lineTo(rr * 2.2, OH); g.quadraticCurveTo(0, OH, 0, OH - rr * 2.2); g.lineTo(0, rr); g.quadraticCurveTo(0, 0, rr, 0); g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-over';
      { const gr = g.createRadialGradient(OW / 2, OH / 2, OH * 0.35, OW / 2, OH / 2, OH * 0.75); gr.addColorStop(0, 'rgba(90,60,25,0)'); gr.addColorStop(1, 'rgba(90,60,25,0.32)'); g.fillStyle = gr; g.globalCompositeOperation = 'source-atop'; g.fillRect(0, 0, OW, OH); g.globalCompositeOperation = 'source-over'; }
      return out;
    },
    // blur an ellipse of the picture into itself, its edge feathered to nothing
    _soften(g, cx, cy, rx, ry, b) {
      const W = g.canvas.width, H = g.canvas.height, t = document.createElement('canvas'); t.width = W; t.height = H;
      const x = t.getContext('2d'); x.filter = `blur(${b}px)`; x.drawImage(g.canvas, 0, 0); x.filter = 'none';
      x.globalCompositeOperation = 'destination-in';
      x.save(); x.translate(cx, cy); x.scale(rx, ry);
      const gr = x.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore();
      g.drawImage(t, 0, 0);
    },
    // fill a region from its edges inward (Jacobi, on the pixels), blended over what was there by `k`
    _inpaint(g, inside, iters = 200, k = 1) {
      const W = g.canvas.width, H = g.canvas.height;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (inside(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      if (x1 < x0) return;
      x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(W - 1, x1 + 3); y1 = Math.min(H - 1, y1 + 3);
      const w = x1 - x0 + 1, h = y1 - y0 + 1, img = g.getImageData(x0, y0, w, h), a = img.data, orig = new Uint8ClampedArray(a);
      const m = new Uint8Array(w * h), f = new Float32Array(w * h * 3);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = y * w + x; m[j] = inside(x + x0, y + y0) ? 1 : 0; for (let c = 0; c < 3; c++) f[j * 3 + c] = a[j * 4 + c]; }
      for (let it = 0; it < iters; it++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const j = y * w + x; if (!m[j]) continue;
        for (let c = 0; c < 3; c++) f[j * 3 + c] = (f[(j - 1) * 3 + c] + f[(j + 1) * 3 + c] + f[(j - w) * 3 + c] + f[(j + w) * 3 + c]) / 4;
      }
      for (let j = 0; j < w * h; j++) if (m[j]) for (let c = 0; c < 3; c++) a[j * 4 + c] = orig[j * 4 + c] * (1 - k) + f[j * 3 + c] * k;
      g.putImageData(img, x0, y0);
    },
    _rng(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; },
    SIT: { clay: 0xc8b8a8, jaw: [0, -0.55, 0], dist: 1.65, drop: 0.02, fov: 24, key: 2.8, fill: 0.3, hemi: 0.6, rim: 1.3 },
    b64(cv, q = 0.9) { return cv.toDataURL('image/jpeg', q).split(',')[1] + ' '.repeat(60000); },
  };
})();
