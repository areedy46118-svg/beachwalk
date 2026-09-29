/* CASTLE WALK TEST. Not part of the game.
 *   eval(await (await fetch('/tools/fortwalk.js')).text()); await __fortSetup(); __fortClip(16, 360)
 * Drives the real update with the keys and the look from the courtyard's
 * middle (and from a few other spots) in every direction, jumping now and
 * then, and reports any frame the body ended inside drawn stone, off the
 * paving, or moving more than a stride in a tick. */
(function () {
const b = window.__bw;
window.__fortSetup = async function () {
  window.requestAnimationFrame = () => 0;
  b.fallbackLook = true;
  b.loadFort();
  for (let i = 0; i < 80 && !b.fortState().ready; i++) { b.frame(1); await new Promise((r) => setTimeout(r, 150)); }
  while (!b.fortWallsStep(1e9)) {}
  b.placeInFort();
  return b.fortState();
};
window.__fortClip = function (dirs = 16, ticks = 360, spots = null) {
  const S = b.FORT_SITE, st0 = b.fortState();
  const K = b.FORT_K || 1, starts = spots || [st0.spot, b.fortW(-6.5 * K, 16 * K), b.fortW(-2.0 * K, -8 * K), b.fortW(0.4 * K, -13.5 * K), b.fortW(-8.4 * K, 22.5 * K)];
  let frames = 0, inStone = 0, worstDepth = 0, offPave = 0, bigStep = 0, worstStep = 0, stalls = 0;
  const bad = [];
  for (const s0 of starts) {
    for (let d = 0; d < dirs; d++) {
      b.placeInFort({ x: s0.x, z: s0.z, yaw: 0 });
      const yaw = d / dirs * Math.PI * 2;
      b.keys.KeyW = true;
      let last = [b.camera.position.x, b.camera.position.z];
      for (let t = 0; t < ticks; t++) {
        b.look(yaw + Math.sin(t * 0.05) * 0.4, 0);
        if (t % 70 === 35) b.keys.Space = true; else if (t % 70 === 40) b.keys.Space = false;
        b.step(1 / 60); frames++;
        const p = b.camera.position, feet = b.camBaseY - 1.7;
        const w = b.keepWallNear(p.x, p.z, 0.26, feet + 0.46, feet + 1.75, S);
        if (w && w.depth > 0.12) { inStone++; worstDepth = Math.max(worstDepth, w.depth); if (bad.length < 12) bad.push(['stone', +p.x.toFixed(2), +p.z.toFixed(2), +w.depth.toFixed(2)]); }
        if (!b.fortMaskAt(p.x, p.z)) { offPave++; if (bad.length < 12) bad.push(['off', +p.x.toFixed(2), +p.z.toFixed(2)]); }
        const mv = Math.hypot(p.x - last[0], p.z - last[1]);
        worstStep = Math.max(worstStep, mv); if (mv > 0.2) bigStep++;
        last = [p.x, p.z];
      }
      b.keys.KeyW = false; b.keys.Space = false;
    }
  }
  return JSON.stringify({ frames, inStone, worstDepth: +worstDepth.toFixed(3), offPave, bigStep, worstStep: +worstStep.toFixed(3), inFort: b.fortState().inFort, bad });
};
/* From the beach: walk at the castle from every side it can be reached from
 * and check nothing ever gets inside its footprint. */
window.__fortOutside = function (ticks = 420) {
  const starts = [];
  for (let x = -1; x <= 13; x += 2) starts.push([x, b.FORT_Z + b.FORT_GATE.z + 9], [x, -1135]);
  let frames = 0, inside = 0, trig = 0; const bad = [];
  for (const [x, z] of starts) {
    for (const yaw of [0, Math.PI, 0.5, -0.5, Math.PI - 0.5, Math.PI + 0.5]) {
      b.placeOutOfFort(z > b.FORT_Z ? 'gate' : 'back');
      b.camera.position.set(x, 1.7, z); b.camBaseY = 1.7; b.groundY = 0;
      b.keys.KeyW = true;
      for (let t = 0; t < ticks; t++) {
        b.look(yaw, 0); b.step(1 / 60); frames++;
        if (b.fortState().busy) { trig++; break; }
        const p = b.camera.position;
        if (b.fortMaskAt(p.x, p.z)) { inside++; if (bad.length < 10) bad.push([+p.x.toFixed(2), +p.z.toFixed(2)]); }
      }
      b.keys.KeyW = false;
      if (b.fortState().busy) { const rn = performance.now; let o = 0; performance.now = () => rn.call(performance) + o; for (let i = 0; i < 140; i++) { o += 16.7; b.frame(1); } performance.now = () => rn.call(performance) + o; }
    }
  }
  return JSON.stringify({ frames, inside, trig, bad });
};
})();
