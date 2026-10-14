/* THE DUNGEON BEHIND THE PAVILION, from the harness. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute();
 *   eval(await (await fetch('/tools/dunshot.js')).text()); await __dunBoot();
 *   __dunEnter()          through the yard door, on a fake clock, to the far side of the black
 *   __dunLeave()          and back out
 *   __dunSheet(views)     [[label, [x,y,z] room-local eye, [x,y,z] room-local target]] -> padded base64
 *   __adv(n)              n frames on the fake clock */
(function () {
  const b = window.__bw;
  window.__dunBoot = async () => {
    b.beginGame(); b.settings.devMode = true;
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0;
    performance.now = () => base + off;
    window.__adv = (k) => { for (let i = 0; i < k; i++) { off += 16.7; b.frame(1); } };
    b.camera.position.set(19.4, 2.1, -479.8); b.look(-1.54, 0);
    for (let i = 0; i < 120 && !(b.dunS().door && b.dunS().henry); i++) { window.__adv(2); await new Promise((r) => setTimeout(r, 60)); }
    return b.dunS();
  };
  window.__dunEnter = () => { b.startDungeon(1); window.__adv(150); return b.dunS(); };
  window.__dunLeave = () => { b.startDungeon(-1); window.__adv(150); return b.dunS(); };
  window.__dunSheet = (views, cols = 3, w = 420) => {
    const C = b.camera, R = b.renderer, T = C.position.constructor;
    R.setSize(1200, 700, false); C.aspect = 1200 / 700; C.updateProjectionMatrix();
    const out = document.createElement('canvas'), h = Math.round(w * 700 / 1200), rows = Math.ceil(views.length / cols);
    out.width = cols * w; out.height = rows * (h + 14);
    const g = out.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height); g.font = '11px monospace';
    const p0 = C.position.clone(), q0 = C.quaternion.clone();
    views.forEach(([label, e, t, world], i) => {
      const o = world ? [0, 0, 0] : [b.DUN_X, b.DUN_Y, b.DUN_Z];
      C.position.set(o[0] + e[0], o[1] + e[1], o[2] + e[2]); C.up.set(0, 1, 0);
      C.lookAt(new T(o[0] + t[0], o[1] + t[1], o[2] + t[2])); C.updateMatrixWorld(true);
      R.render(b.scene, C);
      const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 14);
      g.drawImage(R.domElement, x, y, w, h); g.fillStyle = '#9f9'; g.fillText(label, x + 3, y + h + 11);
    });
    C.position.copy(p0); C.quaternion.copy(q0);
    return out.toDataURL('image/jpeg', 0.85) + '#' + 'x'.repeat(120000);
  };
})();
