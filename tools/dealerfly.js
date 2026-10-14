/* HOW FAR THE DEALER FLIES ON THE KILL. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute();
 *   eval(await (await fetch('/tools/dealerfly.js')).text()); await __dealerBoot();
 *   __dealerKill(P, shots)   stands him in the bunker's open middle with 7.5 m of floor behind him, kills
 *                            him with a blow of power P from 1.6 m, and measures his hips for 3 s:
 *                            final / max distance and lift. `shots` > 0 also returns a side-on strip. */
(function () {
  const b = window.__bw;
  window.__dealerBoot = async () => {
    eval(await (await fetch('/tools/sgtest.js', { cache: 'no-store' })).text());
    await window.__sgBoot({ noGun: true });
    b.settings.devMode = true;
    const RB = b.ROOM_BACK.bunker; RB.load();
    for (let i = 0; i < 300 && !RB.ready(); i++) { window.__cadv(1); await new Promise((r) => setTimeout(r, 40)); }
    RB.place(); window.__cadv(60);
    window.__d = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/dealer.glb');
    return !!window.__d;
  };
  window.__dealerKill = (P = 0.6, shots = 0) => {
    const d = window.__d, R = b.bleedRigG().R, T = b.camera.position.constructor;
    const gx = R.position.x + 0.35, gz = R.position.z - 5.62, gy = d.g.position.y;
    d.g.position.set(gx, gy, gz + 2.0); d.st.atk = -1; d.g.rotation.y = 0;
    b.camera.position.set(gx, gy + 1.6, gz + 3.6); b.look(0, 0); window.__cadv(2);
    let hip = null; d.model.traverse((o) => { if (o.isBone && !hip && /hips|pelvis/i.test(o.name)) hip = o; });
    const p0 = hip.getWorldPosition(new T());
    d.st.killP = P; d.st.killOh = false; d.st.hpBefore = 1; d.st.hp = 1; b.killMutant(d);
    const W = 260, H = 200, cv = document.createElement('canvas'); cv.width = W * Math.max(1, shots); cv.height = H;
    const g = cv.getContext('2d'), src = b.renderer.domElement, C = b.camera;
    let mx = 0, up = 0, k = 0;
    for (let i = 0; i < 180; i++) {
      window.__cadv(1);
      const p = hip.getWorldPosition(new T());
      mx = Math.max(mx, Math.hypot(p.x - p0.x, p.z - p0.z)); up = Math.max(up, p.y - p0.y);
      if (shots && i % Math.ceil(60 / shots) === 0 && k < shots) {
        const cp = C.position.clone(), cq = C.quaternion.clone();
        C.position.set(gx + 5.5, gy + 1.4, gz - 1.5); C.lookAt(gx, gy + 0.8, gz - 1.5); C.updateMatrixWorld();
        b.renderer.render(b.scene, C); g.drawImage(src, k * W, 0, W, H); k++;
        C.position.copy(cp); C.quaternion.copy(cq);
      }
    }
    const p = hip.getWorldPosition(new T());
    const res = { final: +Math.hypot(p.x - p0.x, p.z - p0.z).toFixed(2), max: +mx.toFixed(2), lift: +up.toFixed(2) };
    return shots ? JSON.stringify(res) + '|' + cv.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000) : JSON.stringify(res);
  };
})();
