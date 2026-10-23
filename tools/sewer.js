/* THE SEWER'S HARNESS KIT (2026-10-22). In the preview pane:
 *
 *   await import('/tools/sewer.js?' + Date.now());
 *   await __sw.boot();                 // begin, past the title, into the sewer at its ladder
 *   await __sw.go(lx, lz, yaw, pitch); // put the eye somewhere in the sewer's own frame and run frames
 *   __sw.lum();                        // the frame's mean brightness (0-255), read straight after a frame
 *   __sw.light(true);                  // a debug ambient for looking at geometry (false to take it out)
 *   await __sw.walk(['KeyW'], 2.0);    // hold real keys for that many seconds of game time, frame by frame
 *   await __sw.route(points);          // walk to each [lx, lz] in turn by the keys, reporting where it got stuck
 *
 * `boot` waits for the boot's warms (`beginGame` returns early until they are done, and until it has run the title
 * camera owns the camera). Frames are driven by `__bw.frame(1)`: the pane throttles rAF, and freezing it kills it. */
const b = window.__bw;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
let amb = null;
window.__sw = {
  async boot() {
    // the boot's warms run a step a frame and the pane's own frames are few: drive them, then begin
    const t0 = performance.now();
    for (let i = 0; performance.now() - t0 < 60000 && b.bootLeft().nWarm > 0; i++) { b.frame(1); if (i % 3 === 0) await sleep(0); }
    for (let i = 0; i < 160 && document.getElementById('overlay').className !== 'hidden'; i++) { b.beginGame(); if (document.getElementById('overlay').className !== 'hidden') { b.frame(1); await sleep(100); } }
    b.introDone = true; b.started = true;
    b.loadSewer();
    for (let i = 0; i < 120 && !b.sewS().ready; i++) await sleep(250);
    const dc = document.getElementById('deathcard'); if (dc) dc.style.display = 'none';   // (a load after a death waits on its card's Restart)
    const ov = document.getElementById('overlay'); if (ov) { ov.style.transition = 'none'; ov.style.opacity = '0'; }   // (its fade runs for seconds in the pane)
    b.sewRestore({});
    b.placeInSewer();
    await this.run(6);
    return b.sewS();
  },
  async run(k) { for (let i = 0; i < k; i++) { b.frame(1); await sleep(16); } },
  async go(lx, lz, yaw, pitch = 0, k = 12) { b.sewSet(lx, lz, yaw, pitch); await this.run(k); return b.sewS(); },
  lum() {
    const gl = b.renderer.getContext(); b.frame(1);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let s = 0, n = 0; for (let i = 0; i < px.length; i += 16) { s += 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; n++; }
    return +(s / n).toFixed(2);
  },
  light(on) {
    if (on && !amb) { amb = new b.THREE.AmbientLight(0xffffff, 2.2); b.scene.add(amb); }
    if (!on && amb) { b.scene.remove(amb); amb = null; }
  },
  // hold keys for `sec` seconds of game time, one 1/60 frame at a time
  async walk(codes, sec) {
    for (const c of codes) key(c, true);
    try { for (let i = 0; i < Math.round(sec * 60); i++) { b.frame(1); if (i % 4 === 0) await sleep(0); } }
    finally { for (const c of codes) key(c, false); }
    return b.sewS();
  },
  /* walk to each point by turning toward it and holding W; a leg that stops making headway short of its point is
   * reported (that is an invisible wall, or a snag) and the walk goes on from where it got to */
  async route(points, { tol = 0.35, maxSec = 20 } = {}) {
    const out = [];
    for (const [tx, tz] of points) {
      let s = b.sewS(), best = Infinity, still = 0, t = 0;
      key('KeyW', true);
      try {
        while (t < maxSec) {
          s = b.sewS();
          const dx = tx - s.lx, dz = tz - s.lz, d = Math.hypot(dx, dz);
          if (d < tol) break;
          b.look(Math.atan2(-dx, -dz), 0);
          for (let i = 0; i < 6; i++) b.frame(1);
          t += 0.1; await sleep(0);
          if (d < best - 0.02) { best = d; still = 0; } else if ((still += 0.1) > 1.2) break;
        }
      } finally { key('KeyW', false); }
      s = b.sewS();
      const d = Math.hypot(tx - s.lx, tz - s.lz);
      out.push({ to: [tx, tz], at: [s.lx, s.lz], miss: +d.toFixed(2), ok: d < tol + 0.05 });
    }
    return out;
  },
};
