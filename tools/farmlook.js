/* THE FARMERS LINED UP IN FRONT OF YOU IN THE COURTYARD. Not part of the game.
 *   await eval(await (await fetch('/tools/farmfight.js')).text()); eval(await (await fetch('/tools/farmlook.js')).text());
 *   __sheet([__farmLine([3, 4, 5], 2.3)], 1) */
(function () {
  const b = window.__bw, V = b.camera.position.constructor;
  window.__farmLine = (ids = [0, 1, 2], dist = 3.2, W = 760, H = 480, pitch = 0.06, side = 0) => {
    b.placeInFort(); __adv(2);
    const c = b.camera.position, yaw = side; b.look(yaw, pitch);
    const fwd = new V(-Math.sin(yaw), 0, -Math.cos(yaw)), right = new V(Math.cos(yaw), 0, -Math.sin(yaw));
    const put = () => ids.forEach((id, k) => { const u = b.farmUnits[id]; const off = (k - (ids.length - 1) / 2) * 1.15;
      u.farm.out = true; u.g.visible = true; u.st.awake = false; u.st.atk = -1;
      u.g.position.set(c.x + fwd.x * dist + right.x * off, u.g.position.y, c.z + fwd.z * dist + right.z * off);
      u.g.rotation.y = Math.atan2(c.x - u.g.position.x, c.z - u.g.position.z); });
    put(); for (let i = 0; i < 6; i++) { window.__off += 16.7; b.frame(1); put(); b.look(yaw, pitch); }
    return __cap(W, H);
  };
  return 'farmlook ready';
})();
