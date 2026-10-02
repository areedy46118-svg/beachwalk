/* THE IMMOBILIZE, on a fake clock. Not part of the game.
 *   eval(await (await fetch('/tools/immob.js')).text()); __immSetup('pale'); __immRun([0.03, 0.12, 0.3, 0.8, 1.6], {hitAt: 1.2})
 * Puts the named creature 3.2 m in front of you on the beach, holds it, and
 * captures the frames at the given seconds after the hold takes. */
(function () {
  const b = window.__bw, V = b.camera.position.constructor;
  const rn = performance.now.bind(performance); const base0 = rn(); let off = 0;
  performance.now = () => base0 + off;
  window.__immStep = (n = 1) => { for (let i = 0; i < n; i++) { off += 16.7; b.frame(1); } };
  window.__immSetup = (name = 'pale') => {
    window.requestAnimationFrame = () => 0;
    const u = b.mutants.find((q) => (q.kindName || q.kind.name) === name && q.model);
    const c = b.camera.position;
    b.camera.position.set(c.x, c.y, c.z);
    b.look(0, -0.02);
    const put = () => { u.g.position.set(c.x, b.beachGroundAt ? b.beachGroundAt(c.x, c.z - 3.2) : 0, c.z - 3.2); u.g.rotation.y = 0; u.g.visible = true; };
    try { Object.defineProperty(u.g, 'visible', { get: () => true, set: () => {}, configurable: true }); } catch (e) {}
    put(); u.st.awake = true; u.st.atk = -1; u.st.cool = 9; window.__immU = u;
    for (let i = 0; i < 20; i++) { put(); __immStep(1); u.st.atk = -1; u.st.cool = 9; }
    return name;
  };
  window.__cap = (W = 560, H = 420) => { const c = b.renderer.domElement; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(c, 0, 0, W, H); return cv; };
  window.__sheet = (cvs, cols = 3) => { const W = cvs[0].width, H = cvs[0].height, rows = Math.ceil(cvs.length / cols); const o = document.createElement('canvas'); o.width = W * cols; o.height = H * rows; const x = o.getContext('2d'); cvs.forEach((cv, i) => x.drawImage(cv, (i % cols) * W, Math.floor(i / cols) * H)); return o.toDataURL('image/jpeg', 0.82).split(',')[1] + '#' + 'x'.repeat(120000); };
  window.__immRun = (times, o = {}) => {
    const u = window.__immU; b.artImmobilize(u);
    const shots = []; let t = 0, hit = false;
    for (const T of times) {
      while (t < T) { __immStep(1); t += 1 / 60; if (o.hitAt && !hit && t >= o.hitAt) { hit = true; b.hurtMutant(u, 1, 0.3); } }
      shots.push(window.__cap());
    }
    return window.__sheet(shots, 3);
  };
  return 'immob ready';
})();
