/* Walks the player into everything aboard the wreck and reports what the walk
 * did: await import('/tools/shipsweep.js'); __shipSweep('deck' | 'hold' | 'house', o)
 * Spots are a grid over the level in her own frame; a spot the walk pushes
 * the body off before it has moved is inside something and is skipped. From
 * every spot it walks 1.4 s in eight headings (jumping now and then) and
 * records: the worst single-frame move, frames over 0.2 m, walks that end
 * stuck, spots stuck in six headings or more (trapped), walks that end with
 * the feet a metre under the level they started on (fell through), and walks
 * that end outside her planking off the sand (floating beside her).
 * The ship is at SHIP_X/SHIP_Z with no rotation, so local = world - origin. */
(function () {
  const b = window.__bw;
  const _ray = new b.THREE.Raycaster(), _o = new b.THREE.Vector3(), _dn = new b.THREE.Vector3(0, -1, 0);
  window.__shipSweep = (lvl, o = {}) => {
    const { step = 0.7, frames = 84, jumpEvery = 3, x0 = -12, x1 = 12.5 } = o;
    const S = b.shipwreck, n = S.userData.nav, ox = S.position.x, oz = S.position.z;
    const p = b.camera.position, prev = p.clone();
    const feet0 = lvl === 'deck' ? n.DECK_Y : lvl === 'house' ? n.DECK_Y + n.BR_STEP : n.HOLD_Y;
    const spots = [];
    for (let x = x0; x <= x1; x += step) for (let z = -4.6; z <= 4.6; z += step) {
      const inHouse = x > n.BR_X0 + 0.25 && x < n.BR_X1 - 0.25 && Math.abs(z) < n.BR_HZ - 0.25;
      if (lvl === 'house' ? !inHouse : lvl === 'deck' ? inHouse : (x < -8 || x > 7.2 || Math.abs(z) > 3.6)) continue;
      if (Math.abs(z) > n.halfAtY(x, feet0 + 0.2) - 0.3) continue;
      const f = b.shipFloorAt(x, z, feet0);                  // start on real floor of that level, not in a hole in it
      if (f === null || Math.abs(f - feet0) > 0.05) continue;
      // and not inside a piece of her gear grown by the body's radius: a pocket
      // sealed by gear on every side is not a place a walk can start
      if ((n.props || []).some((q) => feet0 >= q[4] - 0.1 && feet0 <= q[5]
          && x > q[0] - 0.4 && x < q[2] + 0.4 && z > q[1] - 0.4 && z < q[3] + 0.4)) continue;
      spots.push([x, z]);
    }
    const r = { spots: spots.length, used: 0, walks: 0, worst: 0, worstAt: null, big: 0, stuck: 0, trapped: [], fell: [], outside: [], skipped: 0, skipWhy: [] };
    for (const s of spots) {
      let st = 0, used = false;
      for (let k = 0; k < 8; k++) {
        b.keys.KeyW = false; b.keys.Space = false;
        b.tp(ox, 1.7, oz + 25); b.step(1 / 60);         // off her first: onShip and inBridge are sticky, and a teleport is not a walk
        for (let j = 0; j < 2; j++) {                     // the walk carries momentum: let it die, then put the body back
          b.tp(s[0] + ox, feet0 + 1.7, s[1] + oz); b.groundY = feet0;
          for (let i = 0; i < (j ? 6 : 24); i++) b.step(1 / 60);
        }
        if (Math.hypot(p.x - ox - s[0], p.z - oz - s[1]) > 0.08 || Math.abs(p.y - (feet0 + 1.7)) > 0.35) { if (k === 0) { r.skipped++; if (r.skipWhy.length < 10) r.skipWhy.push([+s[0].toFixed(1), +s[1].toFixed(1), +(p.x - ox).toFixed(2), +(p.y - 1.7).toFixed(2), +(p.z - oz).toFixed(2)]); break; } continue; }
        used = true;
        const yaw = k * Math.PI / 4; b.look(yaw, -0.05);
        prev.copy(p); const start = p.clone(), jump = (k % jumpEvery) === 1;
        for (let i = 0; i < frames; i++) {
          b.keys.KeyW = true; b.keys.Space = jump && (i % 40 === 5);
          b.heal && b.heal(); b.step(1 / 60);
          const m = Math.hypot(p.x - prev.x, p.z - prev.z);
          if (m > r.worst) { r.worst = m; r.worstAt = [+(prev.x - ox).toFixed(2), +prev.y.toFixed(2), +(prev.z - oz).toFixed(2), k]; }
          if (m > 0.2) r.big++;
          prev.copy(p);
        }
        r.walks++;
        const lx = p.x - ox, lz = p.z - oz, feet = p.y - 1.7;
        if (Math.hypot(p.x - start.x, p.z - start.z) < 0.3) { r.stuck++; st++; }
        if (feet < feet0 - 1.0 && r.fell.length < 12) r.fell.push([+s[0].toFixed(1), +s[1].toFixed(1), k, +lx.toFixed(2), +feet.toFixed(2), +lz.toFixed(2)]);
        if (feet > 0.3 && b.state().onGround) {             // standing on something DRAWN, or on air? (not mid-fall)
          _ray.set(_o.set(p.x, feet + 0.6, p.z), _dn); _ray.far = 1.2;
          const h = _ray.intersectObject(S, true).find((q) => q.object.visible !== false);
          if ((!h || Math.abs(h.point.y - feet) > 0.32) && r.outside.length < 16) r.outside.push([+s[0].toFixed(1), +s[1].toFixed(1), k, +lx.toFixed(2), +feet.toFixed(2), +lz.toFixed(2), h ? +h.point.y.toFixed(2) : null]);
        }
      }
      if (used) r.used++;
      if (st >= 6) r.trapped.push([+s[0].toFixed(1), +s[1].toFixed(1), st]);
    }
    b.keys.KeyW = false; b.keys.Space = false;
    r.worst = +r.worst.toFixed(3);
    return r;
  };
})();

/* The whole ship in chunks, resumable: a lost WebGL context reloads the page
 * (main.js does that on purpose), so every chunk's result is kept in
 * localStorage['shipsweep'] and __shipSweepAll() carries on from the next one.
 * __shipSweepAll(true) starts over. Returns a promise; poll __swr. */
window.__shipSweepAll = async (fresh = false) => {
  const C = [];
  for (let a = -12; a < 12.6; a += 1.8) C.push(['deck', a, a + 0.9]);
  C.push(['house', 2.6, 6.6]);
  for (let a = -8; a < 7.3; a += 1.8) C.push(['hold', a, a + 0.9]);
  let got = [];
  try { got = fresh ? [] : JSON.parse(localStorage.shipsweep || '[]'); } catch (e) { got = []; }
  window.__swr = { done: false, parts: got, of: C.length };
  for (let i = got.length; i < C.length; i++) {
    const [lvl, a, z] = C[i];
    const r = window.__shipSweep(lvl, { step: 0.9, x0: a, x1: z });
    r.x = [lvl, +a.toFixed(1)];
    got.push(r);
    try { localStorage.shipsweep = JSON.stringify(got); } catch (e) {}
    await new Promise((res) => setTimeout(res, 0));
  }
  window.__swr.done = true;
};
