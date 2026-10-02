/* Close stills of Castle XIII's dressing. Not part of the game.
 *   await import('/tools/c13detail.js'); __c13Detail(w)  -> padded base64 sheet
 * Each still is framed off the thing's own measured spot. */
(function () {
  const b = window.__bw;
  const V = () => new (b.camera.position.constructor)();
  const shoot = (eye, tgt, fov) => {
    const fov0 = b.camera.fov; b.camera.fov = fov; b.camera.updateProjectionMatrix();
    const dx = tgt.x - eye.x, dy = tgt.y - eye.y, dz = tgt.z - eye.z;
    for (let k = 0; k < 3; k++) { b.camera.position.set(eye.x, eye.y, eye.z); b.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); __c13Step(1); }
    b.camera.position.set(eye.x, eye.y, eye.z); b.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
    b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera);
    b.camera.fov = fov0; b.camera.updateProjectionMatrix();
  };
  window.__c13Spots = () => {
    const T = b.c13Thrive(), X = b.C13_X, Z = b.C13_Z, Y = window.__c13FloorY || (b.C13_Y + 0.69);
    const out = [];
    const st = T.stalls[0];
    if (st) { const fx = Math.sin(st.yaw), fz = Math.cos(st.yaw); out.push(['stall', { x: X + st.x + fx * 3.4 + fz * 1.0, y: Y + 1.65, z: Z + st.z + fz * 3.4 - fx * 1.0 }, { x: X + st.x, y: Y + 1.1, z: Z + st.z }, 50]); }
    const F = T.fountain;
    if (F) out.push(['fountain', { x: X + F.x + 4.2, y: Y + 1.9, z: Z + F.z + 1.5 }, { x: X + F.x, y: Y + 0.6, z: Z + F.z }, 50]);
    const t = T.torchAt[3] || T.torchAt[0];
    if (t) { const yy = b.camera.position.y; out.push(['torch', { x: X + t.x + t.nx * 2.2 + t.nz * 0.8, y: Y + 2.2, z: Z + t.z + t.nz * 2.2 - t.nx * 0.8 }, { x: X + t.x, y: Y + 2.3, z: Z + t.z }, 45]); }
    const bn = T.banners[1] || T.banners[0];
    if (bn) { const p = bn.getWorldPosition(V()); const q = new (b.camera.quaternion.constructor)(); bn.getWorldQuaternion(q); const n = V().set(0, 0, 1).applyQuaternion(q); out.push(['banner', { x: p.x + n.x * 4.5, y: Y + 1.9, z: p.z + n.z * 4.5 }, { x: p.x, y: p.y - 1.2, z: p.z }, 50]); }
    const w = T.windows.find((q) => q.y1 < 6) || T.windows[0];
    if (w) out.push(['window box', { x: X + w.x + w.nx * 2.6, y: Y + 1.9, z: Z + w.z + w.nz * 2.6 }, { x: X + w.x, y: b.C13_Y + w.y0, z: Z + w.z }, 45]);
    const L = T.lanterns[2] || T.lanterns[0];
    if (L) { const p = (L.p || L.pos || L.g && L.g.position || L); const lp = V().set(X + p.x, b.C13_Y + p.y, Z + p.z); out.push(['lanterns', { x: lp.x + 3, y: Y + 1.7, z: lp.z + 3 }, lp, 55]); }
    const tw = T.towers[0];
    if (tw) out.push(['flag', { x: X + tw.x - 14, y: Y + 1.7, z: Z + tw.z + 6 }, { x: X + tw.x, y: b.C13_Y + tw.top + 2, z: Z + tw.z }, 40]);
    if (T.door) { const D = T.door; out.push(['throne door', { x: X + D.x + D.nx * 5, y: Y + 1.7, z: Z + D.z + D.nz * 5 }, { x: X + D.x, y: Y + 1.6, z: Z + D.z }, 55]); }
    return out;
  };
  window.__c13Detail = (W = 400, cols = 4, only, bright = 1.0) => {
    let spots = __c13Spots(); if (only) spots = spots.filter((s) => only.includes(s[0]));
    const src = b.renderer.domElement, h = Math.round(W * src.height / src.width);
    const sh = document.createElement('canvas'); sh.width = cols * W; sh.height = Math.ceil(spots.length / cols) * (h + 14);
    const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
    spots.forEach((s, i) => {
      shoot(s[1], s[2], s[3]);
      const cx = (i % cols) * W, cy = Math.floor(i / cols) * (h + 14);
      g.filter = 'brightness(' + bright + ')'; g.drawImage(src, cx, cy, W, h); g.filter = 'none';
      g.fillStyle = '#9f9'; g.fillText(s[0], cx + 3, cy + h + 11);
    });
    return sh.toDataURL('image/jpeg', 0.86).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
/* the courts from where a player stands, at the game's own brightness */
window.__c13Wide = (W = 400, bright = 1.0) => {
  const b = window.__bw, T = b.c13Thrive(), X = b.C13_X, Z = b.C13_Z, Y = window.__c13FloorY || (b.C13_Y + 0.3), A = b.C13_ARCH, F = T.fountain, D = T.door;
  const at = (lx, lz, tx, tz, ty = 1.4) => [{ x: X + lx, y: Y + 1.7, z: Z + lz }, { x: X + tx, y: Y + ty, z: Z + tz }];
  const spots = [
    ['through the arch', ...at(A.x - 2.5, A.z + 0.3, F.x, F.z, 1.2)],
    ['the market', ...at(F.x + 9, F.z - 4, F.x, F.z + 2, 1.0)],
    ['to the throne door', ...at(D.x + D.nx * 6, D.z + D.nz * 6, D.x + D.nx * 1.5, D.z + D.nz * 1.5, 0.6)],
    ['east court', ...at(b.C13_SPAWN ? b.C13_SPAWN.x : 42, b.C13_SPAWN ? b.C13_SPAWN.z : -12, A.x, A.z, 3.0)],
    ['up at the walls', ...at(F.x + 5, F.z - 1, F.x - 6, F.z - 8, 8.0)],
    ['stall close', ...at(T.stalls[1].x + Math.sin(T.stalls[1].yaw) * 3.2, T.stalls[1].z + Math.cos(T.stalls[1].yaw) * 3.2, T.stalls[1].x, T.stalls[1].z, 1.1)],
  ];
  const src = b.renderer.domElement, h = Math.round(W * src.height / src.width), cols = 3;
  const sh = document.createElement('canvas'); sh.width = cols * W; sh.height = Math.ceil(spots.length / cols) * (h + 14);
  const g = sh.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sh.width, sh.height); g.font = '11px monospace';
  spots.forEach((s, i) => {
    const [nm, e, t] = s, dx = t.x - e.x, dy = t.y - e.y, dz = t.z - e.z;
    for (let k = 0; k < 4; k++) { b.camera.position.set(e.x, e.y, e.z); b.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); __c13Step(1); }
    b.camera.position.set(e.x, e.y, e.z); b.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera);
    const cx = (i % cols) * W, cy = Math.floor(i / cols) * (h + 14);
    g.filter = 'brightness(' + bright + ')'; g.drawImage(src, cx, cy, W, h); g.filter = 'none'; g.fillStyle = '#9f9'; g.fillText(nm, cx + 3, cy + h + 11);
  });
  return sh.toDataURL('image/jpeg', 0.86).split(',')[1] + '#' + 'x'.repeat(120000);
};
