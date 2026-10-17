/* THE PEG'S TEST BENCH. Load after the game:
 *   await import('/tools/pegtest.js'); await __pt.setup()
 * __pt.setup()              wait for the boot, begin, peg in hand, dev mode (no deaths, no swings back)
 * __pt.hit(d, ang, held)    a creature d metres out at `ang` radians off the line (+ is left);
 *                           one press (held = false) or the held string; returns [d, ang, damage, stages]
 * __pt.press(frames, shift) a real pointerdown on the canvas held for `frames` 60 Hz frames, then
 *                           the release and its click; returns the stages that ran ('4' = the lunge)
 * Everything waits 650 ms between swings so the string's combo window has closed. */
(function () {
  const b = window.__bw, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const P = window.__pt = {};
  P.setup = async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 30000 && !b.startGate().startReady) { b.frame(1); await sleep(0); }
    if (!b.state().introDone) { b.beginGame(); for (let i = 0; i < 30; i++) b.frame(1); }
    (typeof b.settings === 'function' ? b.settings() : b.settings).devMode = true;
    b.addToInventory(b.pegItem);
    for (let n = 0; n < 4 && !b.pegItem.viewmodel.visible; n++) { b.toggleEquip(b.pegItem); b.updateViewmodel(0); }
    if (!P._heal) P._heal = setInterval(() => { try { b.heal(); } catch (e) {} }, 150);
    b.fallbackLook = true;                 // the pane cannot lock: a press only swings with the lock or on the fallback
    const u = P.u = b.mutants[0];          // the pale one off the beach pack
    Object.defineProperty(u.g, 'visible', { get: () => true, set: () => {}, configurable: true });
    return !!b.pegItem.viewmodel.visible;
  };
  const settle = async () => {
    for (let i = 0; i < 40 && (b.digT > 0 || b.pegStage || b.winding); i++) b.step(0.1);
    await sleep(650);
  };
  P.hit = async (d, ang = 0, held = false) => {
    const u = P.u, cam = b.camera;
    await settle();
    Object.assign(u.st, { hp: 30, alive: true, awake: false, atk: -1, stun: 0, struck: false, poise: 99 });
    b.look(0, 0); for (let i = 0; i < 5; i++) b.step(1 / 60);
    const dx = -Math.sin(ang) * d, dz = -Math.cos(ang) * d;
    const put = () => u.g.position.set(cam.position.x + dx, 0, cam.position.z + dz);
    put(); u.g.updateMatrixWorld(true);
    const h0 = u.st.hp, st = [];
    b.windHeld = held; b.attackAction();
    for (let i = 0; i < 140; i++) {
      b.step(1 / 60); put();
      if (b.pegStage && !st.includes(b.pegStage)) st.push(b.pegStage);
      if (b.digT <= 0 && i > 3) break;
    }
    b.windHeld = false;
    return [d, ang, h0 - u.st.hp, st.join('')];
  };
  const ev = (t) => new PointerEvent(t, { button: 0, buttons: t === 'pointerup' ? 0 : 1, clientX: 400, clientY: 300, bubbles: true, pointerId: 1 });
  P.press = async (frames, shift = false) => {
    const cv = b.renderer.domElement;
    await settle();
    b.keys.ShiftLeft = shift;
    cv.dispatchEvent(ev('pointerdown'));
    const seen = [];
    const note = () => { if (b.pegStage && !seen.includes(b.pegStage)) seen.push(b.pegStage); };
    for (let i = 0; i < frames; i++) { b.step(1 / 60); note(); if (shift && i === 2) await sleep(1100); }   // the charge latch runs on a timer
    window.dispatchEvent(ev('pointerup'));
    cv.dispatchEvent(new MouseEvent('click', { button: 0, clientX: 400, clientY: 300, bubbles: true }));
    for (let i = 0; i < 100; i++) { b.step(1 / 60); note(); }
    b.keys.ShiftLeft = false;
    return seen.join('') || '-';
  };
})();
