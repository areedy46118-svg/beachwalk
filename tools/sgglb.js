/* THE SAWN-OFF SCAN, on its own. Not part of the game.
 *   await import('/tools/sgglb.js'); await __sgG.load();
 *   __sgG.sheet([[t, cx, cy, cz, lx, ly, lz, fov, label], ...], W, H, cols)   -> padded base64 jpeg
 *   __sgG.at(t) sets the clip time; __sgG.pos(name) world position of a node (metres, model scaled 0.01) */
(function () {
  const b = window.__bw;
  const G = window.__sgG = {};
  let THREE, GLTFLoader;
  G.ready = (async () => { THREE = await import('three'); ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')); G.THREE = THREE; })();
  G.load = async (url = '/assets/sawnoff.glb') => {
    await G.ready;
    const gltf = await new GLTFLoader().loadAsync(url);
    const sc = new THREE.Scene();
    sc.add(new THREE.AmbientLight(0x9fb0cc, 0.9));
    const k = new THREE.DirectionalLight(0xffe6c8, 1.15); k.position.set(-0.5, 1, 0.9); sc.add(k);
    const r = new THREE.DirectionalLight(0x6f8ec8, 0.55); r.position.set(1, 0.3, -0.6); sc.add(r);
    const root = gltf.scene; root.scale.setScalar(0.01); sc.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const act = mixer.clipAction(gltf.animations[0]); act.play();
    const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.01, 12);
    Object.assign(G, { gltf, sc, root, mixer, act, cam });
    G.names = []; root.traverse((o) => { if (o.name) G.names.push(o.name + (o.isMesh ? '*' : '') + (o.isSkinnedMesh ? 'S' : '')); });
    return { clips: gltf.animations.map((a) => a.name + ' ' + a.duration.toFixed(2)), nodes: G.names.length };
  };
  G.at = (t) => { G.act.time = t; G.mixer.update(0); G.root.updateMatrixWorld(true); };
  G.pos = (name) => { const o = G.root.getObjectByName(name); if (!o) return null; const v = new THREE.Vector3(); o.getWorldPosition(v); return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; };
  G.sheet = (plan, W = 320, H = 180, cols = 3) => {
    const R = b.renderer, cv = R.domElement;
    const pw = cv.width, ph = cv.height;
    R.setSize(W * 2, H * 2, false);
    const out = document.createElement('canvas'); out.width = W * cols; out.height = Math.ceil(plan.length / cols) * (H + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    plan.forEach((P, i) => {
      const [t, cx, cy, cz, lx, ly, lz, fov, label] = P;
      G.at(t);
      G.cam.aspect = W / H; G.cam.fov = fov || 70; G.cam.updateProjectionMatrix();
      G.cam.position.set(cx, cy, cz); G.cam.lookAt(lx, ly, lz);
      R.setClearColor(0x202830, 1); R.autoClear = true;
      R.render(G.sc, G.cam);
      const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 14);
      g.drawImage(cv, x, y, W, H);
      g.fillStyle = '#9f9'; g.fillText(label || ('t' + t), x + 3, y + H + 11);
    });
    if (pw && ph) R.setSize(pw, ph, false);
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
