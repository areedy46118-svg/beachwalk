/* The flail knight's swings from a side camera in a live fight. Not part of the game.
 *   await import('/tools/crusader.js'); __crBoot() ... then
 *   eval(await (await fetch('/tools/crlive.js')).text()); await __crLive(skip, swings, every, ang)
 * The player stands where __crFace put him; a second camera renders. Padded base64. */
window.__crLive = async (skip = 1, swings = 2, every = 4, ang = 0.9, dist = 3.4) => {
  const b = __bw, T = await import('three'); const u = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/crusader.glb');
  if (!window.__crHome) { __crFace(2.4); window.__crHome = b.camera.position.clone(); }
  const home = window.__crHome;
  const cam = new T.PerspectiveCamera(50, 4 / 3, 0.05, 200); const r = b.renderer, src = r.domElement; const sz = new T.Vector2(); r.getSize(sz);
  const W = 240, H = 180, shots = []; let n = 0, prev = -1;
  for (let i = 0; i < 4000 && n < skip + swings; i++) {
    b.camera.position.x = home.x; b.camera.position.z = home.z; b.lookAt(u.g.position.x, u.g.position.y + 1.45, u.g.position.z);
    __c13Step(1); b.heal && b.heal();
    const st = u.st, atk = st.atk;
    if (atk >= 0 && prev < 0) n++;
    prev = atk;
    if (n > skip && n <= skip + swings && atk >= 0 && i % every === 0) {
      const P = u.g.position, yaw = u.g.rotation.y + ang; cam.position.set(P.x + Math.sin(yaw) * dist, P.y + 1.5, P.z + Math.cos(yaw) * dist); cam.lookAt(P.x, P.y + 1.3, P.z); cam.updateMatrixWorld(true);
      r.setSize(W * 2, H * 2, false); r.render(b.scene, cam);
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.filter = 'brightness(1.9)'; g.drawImage(src, 0, 0, W, H); g.filter = 'none';
      g.fillStyle = '#9f9'; g.font = '11px monospace'; g.fillText(`${st.swing} ${atk.toFixed(2)} wk${(u.whirl ? u.whirl.k : 0).toFixed(1)}`, 2, 11); shots.push(c); r.setSize(sz.x, sz.y, false);
    }
  }
  const cols = 6, sh = document.createElement('canvas'); sh.width = cols * W; sh.height = Math.ceil(shots.length / cols) * H; const g = sh.getContext('2d'); shots.forEach((c, i) => g.drawImage(c, (i % cols) * W, Math.floor(i / cols) * H));
  return sh.toDataURL('image/jpeg', 0.8).split(',')[1] + '#' + 'x'.repeat(120000);
};
