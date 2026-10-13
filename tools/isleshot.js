/* THE LIGHTHOUSE ISLAND, from the test tab. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute(); eval(await (await fetch('/tools/sgtest.js')).text());
 *   eval(await (await fetch('/tools/isleshot.js')).text()); await __isle.boot();
 *   __isle.sheet([[x, y, z, yaw, pitch, label] | [x, y, z, 'at', lx, ly, lz, label]...], W, H, cols) -> padded base64
 *   __isle.walk(yaw, seconds) presses forward on the fake clock and returns where you got to
 *   __isle.track(x, z, secs) walks to a point and tallies the eye's stutter in __isle.trk */
(function () {
  const b = window.__bw;
  window.__isle = {
    async boot() {
      await __sgBoot({ noGun: true });
      b.camera.position.set(8, 1.6, -1100); b.loadIsle();
      for (let i = 0; i < 480 && !b.isleS().ready; i++) { __cadv(1); await new Promise((r) => setTimeout(r, 250)); }
      b.placeOnIsle(); for (let i = 0; i < 30; i++) __cadv(1);
      for (let i = 0; i < 60 && !b.isleS().walls; i++) { __cadv(2); await new Promise((r) => setTimeout(r, 50)); }
      return b.isleS();
    },
    sheet(views, W = 320, H = 200, cols = 2) {
      const cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Math.ceil(views.length / cols) * (H + 12);
      const g = cv.getContext('2d'); g.font = '10px monospace';
      views.forEach((v, k) => {
        if (v[3] === 'at') { b.camera.position.set(v[0], v[1], v[2]); b.camera.lookAt(v[4], v[5], v[6]); b.camera.updateMatrixWorld(); }
        else { b.camera.position.set(v[0], v[1], v[2]); b.look(v[3], v[4]); b.camera.updateMatrixWorld(); }
        b.renderer.render(b.scene, b.camera);
        const x = (k % cols) * W, y = Math.floor(k / cols) * (H + 12);
        g.drawImage(b.renderer.domElement, x, y, W, H); g.fillStyle = '#9f9'; g.fillText(v[v.length - 1] || '', x + 2, y + H + 10);
      });
      return cv.toDataURL('image/jpeg', 0.82).split(',')[1] + ' '.repeat(60000);
    },
    // walk toward a point on the fake clock, steering every frame; returns where it stopped and why
    goto(x, z, secs = 20) {
      const p = b.camera.position; let stuck = 0, last = null;
      b.keys.KeyW = true;
      for (let i = 0; i < secs * 60; i++) {
        const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.5) break;
        b.look(Math.atan2(-dx, -dz), 0); __cadv(1);
        if (i % 30 === 0) { if (last && Math.hypot(p.x - last[0], p.z - last[1]) < 0.15) { if (++stuck > 3) break; } else stuck = 0; last = [p.x, p.z]; }
      }
      b.keys.KeyW = false; __cadv(2);
      return [p.x.toFixed(2), (p.y - 1.7).toFixed(2), p.z.toFixed(2), 'd=' + Math.hypot(x - p.x, z - p.z).toFixed(2), JSON.stringify(b.isleS())].join(' ');
    },
    /* walk to a point on the fake clock steering every frame, counting how
     * the eye's vertical speed changes frame to frame (a riser snapped is a
     * jump in it): __isle.trk = { n, big (>3 cm/frame change), huge (>7), max, drops } */
    trk: { n: 0, big: 0, huge: 0, max: 0, drops: [] },
    track(x, z, secs = 25) {
      const p = b.camera.position, T = this.trk; let stuck = 0, last = null;
      if (this._py === undefined) { this._py = p.y; this._pd = 0; }
      b.keys.KeyW = true;
      for (let i = 0; i < secs * 60; i++) {
        const dx = x - p.x, dz = z - p.z; if (Math.hypot(dx, dz) < 0.45) break;
        b.look(Math.atan2(-dx, -dz), 0); __cadv(1);
        const dy = p.y - this._py; this._py = p.y; const a = Math.abs(dy - this._pd); this._pd = dy;
        T.n++; if (a > 0.03) T.big++; if (a > 0.07) { T.huge++; if (T.drops.length < 16) T.drops.push([p.x.toFixed(1), p.z.toFixed(1), (p.y - 1.7).toFixed(2), dy.toFixed(3)].join(',')); }
        T.max = Math.max(T.max, a);
        if (i % 30 === 0) { if (last && Math.hypot(p.x - last[0], p.z - last[1]) < 0.12) { if (++stuck > 3) break; } else stuck = 0; last = [p.x, p.z]; }
      }
      b.keys.KeyW = false; __cadv(2); this._py = p.y; this._pd = 0;
      return [p.x.toFixed(2), (p.y - 1.7).toFixed(2), p.z.toFixed(2), 'd=' + Math.hypot(x - p.x, z - p.z).toFixed(2)].join(' ');
    },
    walk(yaw, secs, run = false) {
      b.look(yaw, 0); const k = b.keys || window.keys;
      const set = (v) => { try { b.setKey ? b.setKey('KeyW', v) : (b.keys.KeyW = v); } catch (e) {} };
      set(true); const n = Math.round(secs * 60); for (let i = 0; i < n; i++) { b.look(yaw, 0); __cadv(1); } set(false);
      const p = b.camera.position; return [p.x.toFixed(2), (p.y).toFixed(2), p.z.toFixed(2), JSON.stringify(b.isleS())].join(' ');
    },
  };
})();
