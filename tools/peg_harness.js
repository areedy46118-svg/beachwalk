/* THE PEG'S OWN BENCH — load it in the preview and every measurement in the
 * spare peg's notes can be taken again. `tools/sheet.js` is the same idea for
 * the crawler; this one knows about the thrust.
 *
 *   await import('/tools/peg_harness.js')     (the pane dies often; re-import)
 *   __eval(tbl)    one jab, read at the cock and the contact
 *   __trace(o)     every frame of a swing or of the whole string
 *   __sheet(o)     a contact sheet into __lastSheet, then __grab()
 *
 * The rules this file already paid for: render in the SAME call that grabs
 * (there is no preserveDrawingBuffer), judge frames UNBRIGHTENED, and drive
 * the game with `step` rather than a frame loop — `animate()` takes its dt
 * off the wall clock, so a sheet built from it is not reproducible. */
(function () {
  const bw = window.__bw, V = bw.camera.position.constructor;
  const H = window.__peg = {};

  H.rafOff = () => { if (!H._raf) { H._raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; } };
  H.rafOn = () => { if (H._raf) { window.requestAnimationFrame = H._raf; H._raf = null; bw.animate(); } };
  /* `state().equipped` comes back as a copy, so the honest test of what is in
   * the hand is whether that tool's own view model is the one being drawn. */
  H.equip = () => { let n = 0; while (!bw.pegItem.viewmodel.visible && n++ < 4) bw.toggleEquip(bw.pegItem); return bw.pegItem.viewmodel.visible; };
  /* The renderer's own frame, without animate()'s clock: the world, then the
   * view model over it with the depth cleared, which is the one thing a bare
   * `renderer.render(scene, camera)` leaves out. */
  H.draw = () => {
    const r = bw.renderer;
    r.render(bw.scene, bw.camera);
    r.autoClear = false;
    if (bw.viewmodel.visible) { r.clearDepth(); r.render(bw.vmScene, bw.vmCamera); }
    r.autoClear = true;
  };
  // big steps: a swing is driven by digT += dt/swingSecs, so this ends it fast
  H.reset = () => { bw.windHeld = false; for (let i = 0; i < 40 && (bw.digT > 0 || bw.pegStage !== 0); i++) bw.step(0.25); };
  H.ready = () => bw.pegItem.inspectModel.children.length > 0;

  /* Where the two ends of the peg are, in the view model camera's own frame
   * and on the screen. The SPAN is the honest measure of "is it on screen" —
   * counting how many sample points land inside NDC says 86 % of a shaft that
   * is pointing away from the lens and drawn as a stub. */
  H.probe = () => {
    const vm = bw.pegItem.viewmodel, C = bw.vmCamera;
    vm.updateWorldMatrix(true, true); C.updateMatrixWorld(true);
    const G = new V(0, 0, 0).applyMatrix4(vm.matrixWorld);
    const T = new V(0, -0.650, 0).applyMatrix4(vm.matrixWorld);
    const gC = G.clone().applyMatrix4(C.matrixWorldInverse);
    const tC = T.clone().applyMatrix4(C.matrixWorldInverse);
    const d = tC.clone().sub(gC).normalize();
    const g = G.clone().project(C), t = T.clone().project(C);
    return {
      t: +bw.digT.toFixed(3), s: bw.pegStage, oh: bw.digOverhead ? 1 : 0,
      g: [+g.x.toFixed(2), +g.y.toFixed(2)], T: [+t.x.toFixed(2), +t.y.toFixed(2)],
      sp: +Math.hypot(g.x - t.x, g.y - t.y).toFixed(2),
      ax: +(Math.acos(Math.max(-1, Math.min(1, -d.z))) * 57.2958).toFixed(0),
      gz: +gC.z.toFixed(2), tz: +tC.z.toFixed(2),
    };
  };

  /* AND THE HANDS HAVE TO BE STILL BEFORE THE SWING IS MEASURED. The arm
   * carries a look-lag and a landing spring, and both are live for a good
   * fraction of a second: a swing thrown on the frame after `look()` was
   * measured against a hand that was still settling, and the SAME pose table
   * read 0.74 NDC apart on two runs. Twenty frames of nothing, then press. */
  H.begin = (o = {}) => {
    H.rafOff(); bw.addToInventory(bw.pegItem); H.equip(); H.reset();
    bw.look(0, o.pitch === undefined ? -0.03 : o.pitch);
    for (let i = 0; i < 22; i++) bw.step(1 / 60);
    bw.windHeld = !!o.hold; bw.attackAction();
  };

  H.trace = (o = {}) => {
    const { dt = 1 / 60, max = 200 } = o;
    H.begin(o);
    const rows = [];
    for (let i = 0; i < max; i++) {
      rows.push(Object.assign({ i }, H.probe()));
      bw.step(dt);
      if (bw.digT === 0 && bw.pegStage === 0 && i > 3) break;
      if (o.until !== undefined && bw.digT > o.until) break;
    }
    bw.windHeld = false;
    return rows;
  };

  /* One jab, read at the two poses that decide whether it reads: the COCK,
   * which is a pose you hold and so has to be on screen, and the CONTACT,
   * which is the frame the blow lands on. */
  H.eval = (tbl) => {
    if (tbl) bw.pegStab = tbl.map((r) => r.slice());
    const rows = H.trace({ max: 26, until: 0.52 });
    const at = (tt) => rows.reduce((a, b) => (Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a));
    const on = (p) => Math.abs(p[0]) <= 0.98 && Math.abs(p[1]) <= 0.98;
    const w = rows.filter((x) => x.t > 0.02);
    return {
      cock: at(0.34), hit: at(0.47),
      bothOn: +(w.filter((x) => on(x.g) && on(x.T)).length / Math.max(1, w.length)).toFixed(2),
    };
  };

  H.sheet = (o = {}) => {
    const { frames = 18, dt = 1 / 60, cols = 6, w = 420, skip = 0 } = o;
    H.begin(o);
    const src = bw.renderer.domElement, h = Math.round(w * src.height / src.width);
    const sh = document.createElement('canvas');
    sh.width = cols * w; sh.height = Math.ceil(frames / cols) * (h + 14);
    const sg = sh.getContext('2d');
    sg.fillStyle = '#000'; sg.fillRect(0, 0, sh.width, sh.height);
    sg.font = '12px monospace'; sg.textBaseline = 'top';
    let shot = 0, i = 0;
    while (shot < frames && i < 900) {
      H.draw();
      if (i % (skip + 1) === 0) {
        const cx = (shot % cols) * w, cy = Math.floor(shot / cols) * (h + 14);
        sg.drawImage(src, cx, cy, w, h);
        sg.fillStyle = '#9f9';
        sg.fillText(`${i} t=${bw.digT.toFixed(3)} s=${bw.pegStage}${bw.digOverhead ? ' OH' : ''}`, cx + 3, cy + h + 1);
        shot++;
      }
      bw.step(dt); i++;
    }
    bw.windHeld = false;
    H.lastSheet = sh;
    return shot;
  };
  H.grab = (q = 0.85) => H.lastSheet.toDataURL('image/jpeg', q).split(',')[1];

  window.__eval = H.eval; window.__trace = H.trace; window.__sheet = H.sheet; window.__grab = H.grab;
})();
