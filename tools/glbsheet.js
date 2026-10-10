/* Any GLB on its own, any clip, any camera. Not part of the game.
 *   await import('/tools/glbsheet.js'); await __glb.load('/assets/wellman.glb')  -> { clips, size, min }
 *   __glb.sheet([[clip|null, t, cx, cy, cz, lx, ly, lz, fov, label], ...], W, H, cols)  -> padded base64 jpeg
 *   __glb.scale(k) sets the model scale; __glb.root is the loaded scene; __glb.bounds() skinned bounds */
(function () {
  const b = window.__bw;
  const G = window.__glb = {};
  let THREE, GLTFLoader;
  G.ready = (async () => { THREE = await import('three'); ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')); G.THREE = THREE; })();
  G.load = async (url, scale = 1) => {
    await G.ready;
    const gltf = await new GLTFLoader().loadAsync(url);
    const sc = new THREE.Scene();
    sc.add(new THREE.AmbientLight(0x9fb0cc, 1.1));
    const k = new THREE.DirectionalLight(0xffe6c8, 1.3); k.position.set(-0.5, 1, 0.9); sc.add(k);
    const r = new THREE.DirectionalLight(0x6f8ec8, 0.6); r.position.set(1, 0.3, -0.6); sc.add(r);
    const root = gltf.scene; root.scale.setScalar(scale); sc.add(root);
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material && o.material.metalness !== undefined) o.material.metalness = Math.min(o.material.metalness, 0.3); } });
    const mixer = new THREE.AnimationMixer(root);
    const acts = {}; for (const c of gltf.animations) acts[c.name] = mixer.clipAction(c);
    const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.01, 200);
    Object.assign(G, { gltf, sc, root, mixer, acts, cam, cur: null });
    const bb = G.bounds();
    return { clips: gltf.animations.map((a) => a.name + ' ' + a.duration.toFixed(2)), size: bb.size.toArray().map((v) => +v.toFixed(2)), min: bb.min.toArray().map((v) => +v.toFixed(2)), max: bb.max.toArray().map((v) => +v.toFixed(2)) };
  };
  G.bounds = () => {
    G.root.updateMatrixWorld(true);
    const box = new THREE.Box3(); box.makeEmpty(); const v = new THREE.Vector3();
    G.root.traverse((o) => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      if (o.isSkinnedMesh) { o.skeleton.update(); for (let i = 0; i < pos.count; i += 5) { v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); box.expandByPoint(v); } }
      else { for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); box.expandByPoint(v); } }
    });
    return { min: box.min.clone(), max: box.max.clone(), size: box.getSize(new THREE.Vector3()) };
  };
  G.at = (clip, t) => {
    if (clip) { if (G.cur !== G.acts[clip]) { G.mixer.stopAllAction(); G.cur = G.acts[clip]; G.cur.reset(); G.cur.play(); } G.cur.time = t; G.mixer.update(0); }
    G.root.updateMatrixWorld(true);
  };
  G.scale = (k) => { G.root.scale.setScalar(k); G.root.updateMatrixWorld(true); };
  G.sheet = (plan, W = 320, H = 180, cols = 4) => {
    const R = b.renderer, cv = R.domElement; const pw = cv.width, ph = cv.height;
    R.setSize(W * 2, H * 2, false);
    const out = document.createElement('canvas'); out.width = W * cols; out.height = Math.ceil(plan.length / cols) * (H + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    plan.forEach((P, i) => {
      const [clip, t, cx, cy, cz, lx, ly, lz, fov, label] = P;
      G.at(clip, t);
      G.cam.aspect = W / H; G.cam.fov = fov || 60; G.cam.updateProjectionMatrix();
      G.cam.position.set(cx, cy, cz); G.cam.lookAt(lx, ly, lz);
      R.setClearColor(0x202830, 1); R.autoClear = true; R.render(G.sc, G.cam);
      const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 14);
      g.drawImage(cv, x, y, W, H); g.fillStyle = '#9f9'; g.fillText(label || (clip + ' ' + t), x + 3, y + H + 11);
    });
    if (pw && ph) R.setSize(pw, ph, false);
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
