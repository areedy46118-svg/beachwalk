/* WHAT A CREATURE'S MIXER IS DOING, frame by frame. Not part of the game.
 *   eval(await (await fetch('/tools/animlog.js')).text()); __animLog(unit, seconds, pinFn)
 * Runs whole frames on a fake clock (restored after), heals the player, and
 * returns the clip segments: which action carried the weight, for how long,
 * at what timeScale, and how fast the body was moving. */
(function () {
const b = window.__bw;
window.__animLog = function (u, secs = 20, pin) {
  window.requestAnimationFrame = () => 0;
  const base = performance.now; let fake = base.call(performance); performance.now = () => fake;
  const segs = []; let cur = null; let last = u.g.position.clone(), lastYaw = u.g.rotation.y;
  let maxTs = 0, switches = 0, yawMax = 0;
  try {
    for (let f = 0; f < secs * 60; f++) {
      fake += 1000 / 60;
      if (pin) pin();
      b.heal && b.heal();
      b.frame(1);
      let best = null, bw = 0;
      for (const a of u.mixer._actions) { const w = a.getEffectiveWeight(); if (w > bw) { bw = w; best = a; } }
      const name = best ? best.getClip().name : '-', ts = best ? best.timeScale : 0;
      const sp = u.g.position.distanceTo(last) * 60; last.copy(u.g.position);
      const dy = Math.abs(((u.g.rotation.y - lastYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 60; lastYaw = u.g.rotation.y;
      yawMax = Math.max(yawMax, dy);
      maxTs = Math.max(maxTs, Math.abs(ts));
      if (!cur || cur.n !== name) { if (cur) segs.push(cur); switches++; cur = { n: name, f: 0, ts: +ts.toFixed(2), sp: 0, atk: +(u.st.atk || 0).toFixed(2), sw: u.st.swing || '' }; }
      cur.f++; cur.sp += sp;
    }
  } finally {
    const off = fake - base.call(performance); performance.now = () => base.call(performance) + off;
  }
  if (cur) segs.push(cur);
  for (const s of segs) s.sp = +(s.sp / s.f).toFixed(2);
  return { switches, perSec: +(switches / secs).toFixed(2), maxTs: +maxTs.toFixed(2), yawMax: +yawMax.toFixed(1), segs };
};
})();
