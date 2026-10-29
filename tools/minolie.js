/* THE MINOTAUR LYING DOWN, SOLVED. Not part of the game.
 *   await import('/tools/minotaur.js'); await __mnSpawn(); await import('/tools/minolie.js')
 *   __lieScore(pose, true)      what a lying pose measures: every vertex over the floor, the back/pelvis/shoulders ON it,
 *                               the head just off it, the left arm out of his body, the left palm on the crown of his
 *                               belly, the right hand and forearm on the stone
 *   __lieSolve(pose, ms, vars)  coordinate descent from `pose` for `ms` (keeps going from `__lieBest` across calls)
 *   (a pose may be a frame of one of his clips instead: { clip: 'mnFall', f: 0.6 })
 *   __lieShot(pose, angs)       renders of the pose in the studio, swords hidden: [jpeg base64]
 * A pose is `poseRig` keys on his idle's first frame (`u.minoAuthor.build`). The arm-in-body test casts a ray straight
 * up from each left-arm vertex through every triangle of the rest of him: odd crossings = inside (he lies on his back,
 * so "up" is out of his belly). */
(function () {
  const b = window.__bw, u = window.__mnU, m = u.mixer, V = b.camera.position.constructor;
  let body = null; u.model.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes.position.count === 3572) body = o; });
  const g = body.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, bs = body.skeleton.bones, n = P.count, idx = g.index.array;
  const dom = [];
  for (let i = 0; i < n; i++) { let best = -1, bw = 0; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > bw) { bw = w; best = SI.getComponent(i, k); } } dom.push(bs[best].name); }
  const all = [...Array(n).keys()], of = (re) => all.filter((i) => re.test(dom[i]));
  const isA = (i) => /^(UpperArmL|ForearmL|F\d+L|ShoulderL)$/.test(dom[i]);
  const tris = []; for (let t = 0; t < idx.length; t += 3) if (!isA(idx[t]) && !isA(idx[t + 1]) && !isA(idx[t + 2])) tris.push(idx[t], idx[t + 1], idx[t + 2]);
  const armL = of(/^(UpperArmL|ForearmL|F\d+L)$/), handR = of(/^F\d+R$/), foreR = of(/^ForearmR$/), palmL = of(/^F\d+L$/), belly = of(/^Spine2$/);
  const grp = {}; for (let i = 0; i < n; i++) { const k = dom[i].replace(/[LR]$/, '').replace(/^F\d+$/, 'F'); (grp[k] = grp[k] || []).push(i); }
  const pos = new Float32Array(n * 3), v = new V();
  const play = (Pz, name) => {
    const clip = u.minoAuthor.build(name, 1, [[0, Pz], [1, Pz]], false);
    for (const x of m._actions) { x.stop(); x.enabled = false; }
    const ac = m.clipAction(clip); ac.reset(); ac.enabled = true; ac.setEffectiveWeight(1); ac.play(); ac.paused = true; ac.time = 0; m.update(0);
    u.g.updateMatrixWorld(true);
    return () => { ac.stop(); m.uncacheClip(clip); };
  };
  const poseP = (Pz) => {
    let done;
    if (Pz && Pz.clip) {                                  // a frame of one of his clips: { clip: 'mnFall', f: 0.6 }
      const a = u.clips[Pz.clip]; for (const x of m._actions) { x.stop(); x.enabled = false; }
      a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true; a.time = a.getClip().duration * Pz.f; m.update(0);
      u.g.updateMatrixWorld(true); done = () => a.stop();
    } else done = play(Pz, 'lieT');
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); body.applyBoneTransform(i, v); v.applyMatrix4(body.matrixWorld); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
    done();
  };
  const depthIn = (i) => {
    const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2]; let cross = 0, first = 1e9;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3, bb = tris[t + 1] * 3, c = tris[t + 2] * 3;
      const ax = pos[a], az = pos[a + 2], bx = pos[bb], bz = pos[bb + 2], cx = pos[c], cz = pos[c + 2];
      if (px < Math.min(ax, bx, cx) || px > Math.max(ax, bx, cx) || pz < Math.min(az, bz, cz) || pz > Math.max(az, bz, cz)) continue;
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) continue;
      const w0 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d, w1 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const y = w0 * pos[a + 1] + w1 * pos[bb + 1] + w2 * pos[c + 1];
      if (y > py) { cross++; first = Math.min(first, y - py); }
    }
    return cross % 2 === 1 ? first : 0;
  };
  const low = (S) => { let mn = 1e9; for (const i of S) mn = Math.min(mn, pos[i * 3 + 1] - u.g.position.y); return mn; };
  window.__lieScore = (Pz, detail) => {
    poseP(Pz);
    const y0 = u.g.position.y; let under = 0;
    for (let i = 0; i < n; i++) { const y = pos[i * 3 + 1] - y0; if (y < -0.004) under = Math.max(under, -y); }
    const back = Math.min(low(grp.Spine4), low(grp.Spine5), low(grp.Chest)), pel = Math.min(low(grp.Pelvis), low(grp.Spine1));
    const sh = low(grp.Shoulder), hd = low(grp.Head), hr = low(handR), fr = low(foreR);
    let pc = 0, pd = 0; for (const i of armL) { const d = depthIn(i); if (d > 0.005) { pc++; pd = Math.max(pd, d); } }
    const hc = [0, 0, 0]; for (const i of palmL) { hc[0] += pos[i * 3]; hc[1] += pos[i * 3 + 1]; hc[2] += pos[i * 3 + 2]; }
    for (let k = 0; k < 3; k++) hc[k] /= palmL.length;
    let top = -1e9, bt = 0; for (const i of belly) if (pos[i * 3 + 1] > top) { top = pos[i * 3 + 1]; bt = i; }
    const bd = Math.hypot(hc[0] - pos[bt * 3], hc[1] - pos[bt * 3 + 1], hc[2] - pos[bt * 3 + 2]);
    const hu = (Pz.head && Pz.head.up) || 0, tl = (Pz.thighL && Pz.thighL.right) || 0;
    const hl = low(palmL);
    const s = under * under * 4000 + (under > 0 ? 0.2 : 0) + (back - 0.012) ** 2 * 400 + (pel - 0.012) ** 2 * 400 + Math.max(0, sh - 0.04) ** 2 * 300
      + Math.max(0, 0.02 - hd) ** 2 * 400 + Math.max(0, hd - 0.09) ** 2 * 300
      + pc * 0.03 + pd * pd * 3000 + bd * bd * 40 + Math.max(0, hr - 0.03) ** 2 * 800 + Math.max(0, fr - 0.08) ** 2 * 400
      + Math.max(0, Math.abs(hu) - 0.45) ** 2 * 50 + Math.max(0, -0.9 - tl) ** 2 * 50;
    if (!detail) return s;
    const r3 = (x) => +x.toFixed(3);
    return { s: +s.toFixed(4), under: r3(under), back: r3(back), pel: r3(pel), sh: r3(sh), hd: r3(hd), pc, pd: r3(pd), bd: r3(bd), hr: r3(hr), fr: r3(fr), hl: r3(hl), lo: r3(low(all)) };
  };
  const VARS = [['hip', 'right', 0.1], ['hip', 'fwd', 0.1], ['hipY', null, 0.05], ['hipF', null, 0.05], ['waist', 'right', 0.1], ['chest', 'right', 0.1],
    ['head', 'right', 0.15], ['head', 'up', 0.15], ['armL', 'right', 0.15], ['armL', 'fwd', 0.15], ['armL', 'up', 0.15], ['foreL', 'right', 0.15], ['foreL', 'up', 0.15],
    ['armR', 'right', 0.15], ['armR', 'fwd', 0.15], ['armR', 'up', 0.15], ['foreR', 'right', 0.15], ['thighL', 'right', 0.1], ['thighR', 'right', 0.1]];
  const get = (Pz, [j, ax]) => (ax ? ((Pz[j] && Pz[j][ax]) || 0) : (Pz[j] || 0));
  const set = (Pz, [j, ax], x) => { if (ax) { Pz[j] = Object.assign({}, Pz[j] || {}); Pz[j][ax] = x; } else Pz[j] = x; };
  window.__lieSolve = (start, ms = 38000, vars = VARS, score = window.__lieScore) => {
    let best = JSON.parse(JSON.stringify(start || window.__lieBest)), steps = window.__lieSteps && window.__lieSteps.length === vars.length ? window.__lieSteps : vars.map((x) => x[2]);
    let bsc = score(best); const t0 = performance.now(); let it = 0;
    while (performance.now() - t0 < ms) {
      let improved = false;
      for (let k = 0; k < vars.length; k++) for (const sg of [1, -1]) {
        const Pz = JSON.parse(JSON.stringify(best)); set(Pz, vars[k], get(best, vars[k]) + sg * steps[k]);
        const s = score(Pz); it++;
        if (s < bsc) { bsc = s; best = Pz; improved = true; steps[k] *= 1.3; break; }
      }
      if (!improved) steps = steps.map((x) => x * 0.5);
      if (Math.max(...steps) < 0.004) break;
    }
    window.__lieBest = best; window.__lieSteps = steps;
    return { it, d: score(best, true), best };
  };
  window.__lieShot = (Pz, angs = [[1.57, 2.4, 1.1], [0.0, 0.6, 2.4], [-1.3, 1.9, 0.9], [2.2, 2.0, 1.0]], W = 300) => {
    const done = play(Pz, 'lieS');
    const src = b.renderer.domElement, ST = b.knStudio(), out = [];
    u.g.visible = true;
    let sw = null; u.model.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes.position.count === 620) sw = o; });
    if (sw) sw.visible = false;
    const C = u.minoAuthor.J.waist.getWorldPosition(new V()), fov0 = b.camera.fov; b.camera.fov = 40; b.camera.updateProjectionMatrix();
    for (const [ang, d, hy] of angs) {
      const yy = u.g.rotation.y + ang;
      b.camera.position.set(C.x + Math.sin(yy) * d, u.g.position.y + hy, C.z + Math.cos(yy) * d); b.lookAt(C.x, u.g.position.y + 0.2, C.z); b.camera.updateMatrixWorld(true);
      b.renderer.render(ST.scene(u), b.camera);
      const c = document.createElement('canvas'); c.width = W; c.height = Math.round(W * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      out.push(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    }
    if (sw) sw.visible = true; ST.done(u); done(); b.camera.fov = fov0; b.camera.updateProjectionMatrix();
    return out;
  };
})();
