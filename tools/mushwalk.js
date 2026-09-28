/* PAVILION WALK TEST. Not part of the game.
 *   eval(await (await fetch('/tools/mushwalk.js')).text()); __mushWalk('up' | 'down' | 'room')
 * Drives the real update with the keys and the look, steering at points on
 * the spiral, and reports stalls, snaps and where it ended. */
(function () {
const b = window.__bw;
window.__mushWalk = function (dir = 'up', maxTicks = 4000) {
  window.requestAnimationFrame = () => 0;
  const M = b.MUSH, X = b.MUSH_X, Z = b.MUSH_Z, TAU = Math.PI * 2;
  const P = (a, r) => [X + Math.sin(a) * r, Z + Math.cos(a) * r];
  b.fallbackLook = true;
  if (!b.gateOpen) b.toggleGate();
  const route = [];
  if (dir === 'up') {
    route.push(P(M.DOOR_ANG, 3.4), P(M.DOOR_ANG, 1.4));
    for (let a = M.DOOR_ANG - 0.35; a > M.TOP_ANG - 0.05; a -= 0.3) route.push(P(a, 1.05));
    route.push(P(M.TOP_ANG - 0.25, 1.5), P(M.TOP_ANG - 0.35, 2.6));
    b.camera.position.set(X + Math.sin(M.DOOR_ANG) * 3.6, M.PLAT_TOP + 1.7, Z + Math.cos(M.DOOR_ANG) * 3.6);
    b.camBaseY = M.PLAT_TOP + 1.7; b.mushPut('out');
  } else if (dir === 'down') {
    route.push(P(M.TOP_ANG + 0.05, 1.4));
    for (let a = M.TOP_ANG + 0.3; a < M.DOOR_ANG - 0.3; a += 0.3) route.push(P(a, 1.05));
    route.push(P(M.DOOR_ANG - 0.2, 1.2), P(M.DOOR_ANG, 1.9), P(M.DOOR_ANG, 3.6));
    const s = P(M.TOP_ANG - 0.2, 2.5);
    b.camera.position.set(s[0], M.H_ROOM + 1.7, s[1]); b.camBaseY = M.H_ROOM + 1.7; b.mushPut('floor');
  } else {                                   // a lap of the room, round the well
    for (let k = 0; k <= 26; k++) route.push(P(M.TOP_ANG - 0.4 - k * TAU / 24, 2.35));
    const s = P(M.TOP_ANG - 0.4, 2.35);
    b.camera.position.set(s[0], M.H_ROOM + 1.7, s[1]); b.camBaseY = M.H_ROOM + 1.7; b.mushPut('floor');
  }
  let i = 0, t = 0, still = 0, worstStill = 0, maxDy = 0, lastY = b.camera.position.y, last = [b.camera.position.x, b.camera.position.z];
  const log = [];
  b.keys.KeyW = true;
  try {
    for (; t < maxTicks && i < route.length; t++) {
      const [tx, tz] = route[i], dx = tx - b.camera.position.x, dz = tz - b.camera.position.z;
      if (Math.hypot(dx, dz) < 0.3) { i++; continue; }
      b.look(Math.atan2(-dx, -dz), 0);
      b.step(1 / 60);
      const p = b.camera.position, mv = Math.hypot(p.x - last[0], p.z - last[1]);
      maxDy = Math.max(maxDy, Math.abs(p.y - lastY)); lastY = p.y; last = [p.x, p.z];
      if (mv < 0.004) { still++; worstStill = Math.max(worstStill, still); } else still = 0;
      if (t % 60 === 0) log.push([t, i, +p.y.toFixed(2), b.mushState().where, +Math.hypot(p.x - X, p.z - Z).toFixed(2)]);
      if (still > 90) break;
    }
  } finally { b.keys.KeyW = false; }
  const p = b.camera.position;
  return JSON.stringify({ dir, reached: i, of: route.length, ticks: t, worstStill, maxDy: +maxDy.toFixed(3), end: [+(p.x - X).toFixed(2), +p.y.toFixed(2), +(p.z - Z).toFixed(2)], where: b.mushState().where, log });
};
})();
