/* PREVIEW-PANE SHEET TOOL for a creature's clips. Not part of the game.
 * Load in the pane:  eval(await (await fetch('/tools/sheet.js')).text())
 * then  __sheetFor(__bw.crawlerUnit); __sheet('idle', 6, {dist: 4, yaw: 35});
 * renders n frames of a clip into a strip overlaid top-left, from a camera
 * `dist` metres off at `yaw` degrees round from the creature's front. The
 * loop is never frozen: the strip is a canvas over the game. */
(function () {
  const bw = window.__bw, T = bw.THREE;
  let u = null;
  window.__sheetFor = (unit) => { u = unit; u.kind.wakeAt = 0; return u.kind.glb; };
  window.__sheet = function (clip, n, o) {
    o = Object.assign({ dist: 4, yaw: 30, h: 1.2, lookY: 0.7, fov: 40, w: 220, hh: 260, lookX: 0, lookZ: 0, t0: 0, t1: 1, row: 0 }, o || {});
    const r = bw.renderer, sc = bw.scene, cam = bw.camera;
    const a = u.clips[clip]; if (!a) return 'no clip ' + clip; const dur = a.getClip().duration;
    const saved = { pos: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov, times: {} };
    for (const k in u.clips) saved.times[k] = [u.clips[k].isRunning(), u.clips[k].time, u.clips[k].weight, u.clips[k].enabled, u.clips[k].paused];
    const rt = new T.WebGLRenderTarget(o.w, o.hh, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
    let cv = document.getElementById('__sheet');
    if (!cv) { cv = document.createElement('canvas'); cv.id = '__sheet'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000'; document.body.appendChild(cv); cv.width = 1; cv.height = 1; }
    const needW = o.w * n, needH = o.hh * (o.row + 1);
    if (cv.width < needW || cv.height < needH || o.row === 0) { const keep = o.row > 0 ? cv.getContext('2d').getImageData(0, 0, cv.width, cv.height) : null; cv.width = Math.max(cv.width, needW); cv.height = Math.max(o.row === 0 ? 0 : cv.height, needH); if (keep) cv.getContext('2d').putImageData(keep, 0, 0); }
    const ctx = cv.getContext('2d'); const px = new Uint8Array(o.w * o.hh * 4); const img = ctx.createImageData(o.w, o.hh);
    const p = u.g.position, yaw = u.g.rotation.y + (u.model ? u.model.rotation.y : 0);
    const ang = yaw + o.yaw * Math.PI / 180;
    cam.position.set(p.x + Math.sin(ang) * o.dist + o.lookX, p.y + o.h, p.z + Math.cos(ang) * o.dist + o.lookZ); cam.fov = o.fov; cam.updateProjectionMatrix();
    cam.lookAt(p.x + o.lookX, p.y + o.lookY, p.z + o.lookZ);
    u.g.visible = true; if (u.model) u.model.visible = true;
    for (const k in u.clips) u.clips[k].enabled = false;
    a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
    const prevAuto = r.autoClear;
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : 0; a.time = Math.min(dur - 1e-4, dur * (o.t0 + (o.t1 - o.t0) * f)); u.mixer.update(0);
      r.setRenderTarget(rt); r.setClearColor(0x101418, 1); r.autoClear = true; r.render(sc, cam); r.readRenderTargetPixels(rt, 0, 0, o.w, o.hh, px);
      for (let y = 0; y < o.hh; y++) img.data.set(px.subarray((o.hh - 1 - y) * o.w * 4, (o.hh - y) * o.w * 4), y * o.w * 4);
      ctx.putImageData(img, i * o.w, o.row * o.hh); ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(clip + ' ' + a.time.toFixed(2), i * o.w + 3, o.row * o.hh + 12);
    }
    r.setRenderTarget(null); r.autoClear = prevAuto; rt.dispose();
    for (const k in u.clips) { const s = saved.times[k]; u.clips[k].enabled = s[3]; u.clips[k].time = s[1]; u.clips[k].setEffectiveWeight(s[2]); u.clips[k].paused = s[4]; if (!s[0]) u.clips[k].stop(); }
    cam.position.copy(saved.pos); cam.quaternion.copy(saved.q); cam.fov = saved.fov; cam.updateProjectionMatrix();
    return 'ok ' + n + ' frames of ' + clip + ' dur ' + dur.toFixed(2);
  };
  window.__sheetOff = () => { const c = document.getElementById('__sheet'); if (c) c.remove(); };
  /* body-axis probe: where a bone's own Y (the bone) and its bind +Z (the face, on the head) point, in the model's frame */
  window.__axes = function (name) {
    let sk = null; u.model.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
    const bones = sk.skeleton.bones, inv = sk.skeleton.boneInverses; const i = bones.findIndex((b) => b.name === name);
    const rb = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().copy(inv[i]));
    const faceL = new T.Vector3(0, 0, 1).applyQuaternion(rb), upL = new T.Vector3(0, 1, 0).applyQuaternion(rb);
    const wq = new T.Quaternion(); bones[i].getWorldQuaternion(wq); const mq = new T.Quaternion(); u.model.getWorldQuaternion(mq);
    const rel = mq.clone().invert().multiply(wq); const wp = new T.Vector3(); bones[i].getWorldPosition(wp); wp.sub(u.g.position);
    const f3 = (v) => v.toArray().map((x) => +x.toFixed(2));
    return { face: f3(faceL.applyQuaternion(rel)), up: f3(upL.applyQuaternion(rel)), pos: f3(wp) };
  };
  /* hold one clip at time t (fraction) so __axes can read it; __release() puts the mixer back */
  window.__hold = function (clip, f) { const a = u.clips[clip]; for (const k in u.clips) u.clips[k].enabled = false; a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true; a.time = Math.min(a.getClip().duration - 1e-4, a.getClip().duration * f); u.mixer.update(0); u.model.updateMatrixWorld(true); return a.time; };
  window.__release = function () { for (const k in u.clips) u.clips[k].enabled = true; };
  return 'sheet tool ready';
})();
/* __pose(angles, hipY, col, row, cam): hold the crawl's first frame, compose body-axis angles on top
 * the way `poseRig` does (rotations about the WORLD up/right/fwd at the stance, in each bone's parent
 * frame), and render one frame into the strip. For finding a stance without a reload per guess. */
(function () {
  const bw = window.__bw, T = bw.THREE;
  const JOINTS = { hip: 'DEF-spine', waist: 'DEF-spine001', chest: 'DEF-spine003', neck: 'DEF-spine005', head: 'DEF-spine006',
    clavL: 'DEF-shoulderL', clavR: 'DEF-shoulderR', armL: 'DEF-upper_armL', armR: 'DEF-upper_armR', foreL: 'DEF-forearmL', foreR: 'DEF-forearmR',
    handL: 'DEF-handL', handR: 'DEF-handR', thighL: 'DEF-thighL', thighR: 'DEF-thighR', calfL: 'DEF-shinL', calfR: 'DEF-shinR', footL: 'DEF-footL', footR: 'DEF-footR', jaw: 'DEF-jaw_master' };
  window.__pose = function (angles, hipY, o) {
    const u = bw.crawlerUnit; o = Object.assign({ dist: 4, yaw: 30, h: 1.2, lookY: 0.7, fov: 40, w: 220, hh: 260, lookX: 0, lookZ: 0, col: 0, row: 0, base: 'crawl', t: 0, label: '' }, o || {});
    const m = u.model, r = bw.renderer, sc = bw.scene, cam = bw.camera;
    const bones = []; m.traverse((b) => { if (b.isBone) bones.push(b); });
    const J = {}; for (const k in JOINTS) J[k] = bones.find((b) => b.name === JOINTS[k]) || null;
    // the stance: the base clip's frame t
    const saved = { pos: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov, times: {} };
    for (const k in u.clips) saved.times[k] = [u.clips[k].isRunning(), u.clips[k].time, u.clips[k].weight, u.clips[k].enabled, u.clips[k].paused];
    const a = u.clips[o.base]; for (const k in u.clips) u.clips[k].enabled = false; a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true; a.time = Math.min(a.getClip().duration - 1e-4, a.getClip().duration * o.t); u.mixer.update(0);
    m.updateMatrixWorld(true);
    const gq = new T.Quaternion(); m.getWorldQuaternion(gq);
    const W = { up: new T.Vector3(0, 1, 0), right: new T.Vector3(1, 0, 0).applyQuaternion(gq), fwd: new T.Vector3(0, 0, 1).applyQuaternion(gq) };
    const pq = new T.Quaternion(), tq = new T.Quaternion();
    const hold = new Map(); for (const b of bones) hold.set(b, [b.quaternion.clone(), b.position.clone()]);
    for (const k in angles) {
      const b = J[k]; if (!b) { console.warn('no joint', k); continue; }
      (b.parent || b).getWorldQuaternion(pq).invert();
      const ax = { up: W.up.clone().applyQuaternion(pq).normalize(), right: W.right.clone().applyQuaternion(pq).normalize(), fwd: W.fwd.clone().applyQuaternion(pq).normalize() };
      const ang = angles[k]; const q = b.quaternion;
      if (ang.up) q.premultiply(tq.setFromAxisAngle(ax.up, ang.up));
      if (ang.right) q.premultiply(tq.setFromAxisAngle(ax.right, ang.right));
      if (ang.fwd) q.premultiply(tq.setFromAxisAngle(ax.fwd, ang.fwd));
    }
    if (hipY && J.hip) { (J.hip.parent || J.hip).getWorldQuaternion(pq).invert(); const ps = new T.Vector3(); (J.hip.parent || J.hip).getWorldScale(ps); const hu = W.up.clone().applyQuaternion(pq).normalize().divideScalar(Math.max(1e-6, ps.y)); J.hip.position.addScaledVector(hu, hipY); }
    m.updateMatrixWorld(true);
    // where did the parts land (model frame, metres over his feet)
    const P = (k) => { const v = new T.Vector3(); J[k].getWorldPosition(v); v.sub(u.g.position); return v.toArray().map((x) => +x.toFixed(2)); };
    const where = { hip: P('hip'), chest: P('chest'), head: P('head'), handR: P('handR'), handL: P('handL'), footR: P('footR'), footL: P('footL'), kneeR: P('calfR'), kneeL: P('calfL') };
    // render
    const rt = new T.WebGLRenderTarget(o.w, o.hh, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
    let cv = document.getElementById('__sheet');
    if (!cv) { cv = document.createElement('canvas'); cv.id = '__sheet'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000'; document.body.appendChild(cv); cv.width = 1; cv.height = 1; }
    const needW = o.w * (o.col + 1), needH = o.hh * (o.row + 1);
    if (cv.width < needW || cv.height < needH) { const keep = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); cv.width = Math.max(cv.width, needW); cv.height = Math.max(cv.height, needH); cv.getContext('2d').putImageData(keep, 0, 0); }
    const ctx = cv.getContext('2d'); const px = new Uint8Array(o.w * o.hh * 4); const img = ctx.createImageData(o.w, o.hh);
    const p = u.g.position, yaw = u.g.rotation.y + (m ? m.rotation.y : 0), ang = yaw + o.yaw * Math.PI / 180;
    cam.position.set(p.x + Math.sin(ang) * o.dist + o.lookX, p.y + o.h, p.z + Math.cos(ang) * o.dist + o.lookZ); cam.fov = o.fov; cam.updateProjectionMatrix(); cam.lookAt(p.x + o.lookX, p.y + o.lookY, p.z + o.lookZ);
    u.g.visible = true; m.visible = true; const prevAuto = r.autoClear;
    r.setRenderTarget(rt); r.setClearColor(0x101418, 1); r.autoClear = true; r.render(sc, cam); r.readRenderTargetPixels(rt, 0, 0, o.w, o.hh, px);
    for (let y = 0; y < o.hh; y++) img.data.set(px.subarray((o.hh - 1 - y) * o.w * 4, (o.hh - y) * o.w * 4), y * o.w * 4);
    ctx.putImageData(img, o.col * o.w, o.row * o.hh); ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(o.label, o.col * o.w + 3, o.row * o.hh + 12);
    r.setRenderTarget(null); r.autoClear = prevAuto; rt.dispose();
    for (const b of bones) { const h = hold.get(b); b.quaternion.copy(h[0]); b.position.copy(h[1]); }
    for (const k in u.clips) { const s = saved.times[k]; u.clips[k].enabled = s[3]; u.clips[k].time = s[1]; u.clips[k].setEffectiveWeight(s[2]); u.clips[k].paused = s[4]; if (!s[0]) u.clips[k].stop(); }
    cam.position.copy(saved.pos); cam.quaternion.copy(saved.q); cam.fov = saved.fov; cam.updateProjectionMatrix();
    return where;
  };
  window.__clear = () => { const c = document.getElementById('__sheet'); if (c) { c.width = 1; c.height = 1; } };
})();
/* SURVEY A PACKED ROOM: __loadGlb(url, [x,y,z]) adds it to the scene under a group at that spot and returns
 * {G, walk, byMat}; __view([px,py,pz],[lx,ly,lz], o) renders the scene from a camera in the GROUP's frame
 * into the strip, unfogged and lit flat, so a dark room can be read. */
(function () {
  const bw = window.__bw, T = bw.THREE;
  window.__loadGlb = async function (url, at) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new Promise((res, rej) => new GLTFLoader().load(url + '?' + Date.now(), res, undefined, rej));
    const G = new T.Group(); G.position.set(at[0], at[1], at[2]); G.add(gltf.scene); bw.scene.add(G); G.updateMatrixWorld(true);
    let walk = null; gltf.scene.traverse((o) => { if (!walk && o.userData && o.userData.bw_walk) walk = o.userData.bw_walk; });
    walk = typeof walk === 'string' ? JSON.parse(walk) : walk;
    const byMat = {};
    gltf.scene.traverse((o) => { if (!o.isMesh) return; const n = o.material.name; const b = new T.Box3().setFromObject(o); b.min.sub(G.position); b.max.sub(G.position); const e = byMat[n] || (byMat[n] = { n: 0, boxes: [] }); e.n++; e.boxes.push([+b.min.x.toFixed(2), +b.min.y.toFixed(2), +b.min.z.toFixed(2), +b.max.x.toFixed(2), +b.max.y.toFixed(2), +b.max.z.toFixed(2)]); });
    window.__surv = { G, walk, byMat, at };
    return { walk: walk && { x0: walk.x0, z0: walk.z0, gw: walk.gw, gh: walk.gh, cells: walk.cells && walk.cells.length }, mats: Object.keys(byMat) };
  };
  window.__view = function (p, l, o) {
    o = Object.assign({ w: 400, hh: 300, fov: 50, col: 0, row: 0, label: '', light: 2.5 }, o || {});
    const S = window.__surv, at = S ? S.at : [0, 0, 0], G = S ? S.G : null;
    const r = bw.renderer, sc = bw.scene; const cam = new T.PerspectiveCamera(o.fov, o.w / o.hh, 0.1, 500);
    cam.position.set(p[0] + at[0], p[1] + at[1], p[2] + at[2]); cam.lookAt(l[0] + at[0], l[1] + at[1], l[2] + at[2]); cam.updateMatrixWorld();
    const rt = new T.WebGLRenderTarget(o.w, o.hh, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
    let cv = document.getElementById('__sheet'); if (!cv) { cv = document.createElement('canvas'); cv.id = '__sheet'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000'; document.body.appendChild(cv); cv.width = 1; cv.height = 1; }
    const needW = o.w * (o.col + 1), needH = o.hh * (o.row + 1);
    if (cv.width < needW || cv.height < needH) { const keep = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); cv.width = Math.max(cv.width, needW); cv.height = Math.max(cv.height, needH); cv.getContext('2d').putImageData(keep, 0, 0); }
    const ctx = cv.getContext('2d'); const px = new Uint8Array(o.w * o.hh * 4); const img = ctx.createImageData(o.w, o.hh);
    if (G) G.visible = true; const fogD = sc.fog.density; sc.fog.density = 0.0; const amb = o.light ? new T.AmbientLight(0xffffff, o.light) : null; if (amb) sc.add(amb);
    r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.render(sc, cam); r.readRenderTargetPixels(rt, 0, 0, o.w, o.hh, px); if (amb) sc.remove(amb); sc.fog.density = fogD;
    for (let y = 0; y < o.hh; y++) img.data.set(px.subarray((o.hh - 1 - y) * o.w * 4, (o.hh - y) * o.w * 4), y * o.w * 4);
    ctx.putImageData(img, o.col * o.w, o.row * o.hh); ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(o.label, o.col * o.w + 3, o.row * o.hh + 12); r.setRenderTarget(null); rt.dispose(); return 'ok';
  };
})();

/* AND A PROP IS A SHEET TOO. `__sheetObj(obj, angles, px, fill)` renders any
 * Object3D from a list of [yaw, pitch, dist, offsetAlongX] against the VIEW
 * MODEL SCENE'S OWN LIGHTS — an ambient at 0.9 and two directionals at 1.15
 * and 0.55 — because that is what lands on a thing in your fist and it is
 * three times what the beach gives it. Returns the strip as bare base64, big
 * enough that the harness writes it to a file. */
(function () {
  const bw = window.__bw;
  window.__sheetObj = async function (obj, angles, px, fill) {
    const T = await import('three');
    const r = bw.renderer, c = r.domElement;
    const sc = new T.Scene(); sc.background = new T.Color(0x14171b);
    sc.add(new T.AmbientLight(0x9fb0cc, 0.9));
    const k = new T.DirectionalLight(0xffe6c8, 1.15); k.position.set(-0.5, 1, 0.9); sc.add(k);
    const f = new T.DirectionalLight(0x6f8ec8, 0.55); f.position.set(1, 0.3, -0.6); sc.add(f);
    const m = obj.clone(true);
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1);
    m.traverse((o) => { if (o.isSprite) o.removeFromParent(); else o.visible = true; });
    if (fill !== undefined && m.userData.setFill) m.userData.setFill(fill);
    sc.add(m);
    const box = new T.Box3().setFromObject(m);
    const ctr = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3()).length();
    const cam = new T.PerspectiveCamera(30, 1, 0.001, 10);
    const out = document.createElement('canvas');
    out.width = px * angles.length; out.height = px;
    const g = out.getContext('2d');
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i], d = sz * a[2], ox = a[3] || 0;
      cam.position.set(ctr.x + Math.sin(a[0]) * Math.cos(a[1]) * d + ox, ctr.y + Math.sin(a[1]) * d, ctr.z + Math.cos(a[0]) * Math.cos(a[1]) * d);
      cam.lookAt(ctr.x + ox, ctr.y, ctr.z);
      cam.aspect = 1; cam.updateProjectionMatrix();
      r.setRenderTarget(null); r.setScissorTest(false); r.setViewport(0, 0, px, px);
      r.clear(); r.render(sc, cam);
      // the viewport's origin is the canvas's BOTTOM-left
      g.drawImage(c, 0, c.height - px, px, px, i * px, 0, px, px);
    }
    r.setViewport(0, 0, c.width, c.height);
    return out.toDataURL('image/jpeg', 0.94).split(',')[1];
  };
})();
