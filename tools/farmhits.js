/* DOES A FARMER'S BLOW VISIBLY CONNECT. Not part of the game.
 *   (after tools/farmfight.js)  __fightStart(); __hitsRun(30)
 * Runs the fight hands-off (the player pinned, healed, looking at whoever is
 * nearest) and, for every swing's active window, records how near the thing
 * it strikes with (the tool's head, the fist, the boot, the forehead) came to
 * the player's torso — the segment from the hips to the head — the distance
 * at the frame the game scored it, where that was on screen, and whether it
 * counted. A blow that counted with the weapon half a metre off you is a hit
 * that did not visibly connect; one that passed through you and did not
 * count is the other half of "the hitboxes are awful". */
(function () {
  const b = window.__bw, V = b.camera.position.constructor;
  const tmp = new V(), tmp2 = new V(), ndc = new V();
  const torsoD = (p) => {
    const c = b.camera.position, top = c.y + 0.15, bot = c.y - 1.15;
    const y = Math.max(bot, Math.min(top, p.y));
    return Math.hypot(p.x - c.x, p.z - c.z, p.y - y);
  };
  // the striking ends of the chains this swing names
  const ends = (u, A) => {
    const all = b.mutLimbs ? b.mutLimbs(u) : [];
    const ids = (A.limbs && A.limbs.length) ? A.limbs : all.map((_, i) => i);
    const out = [];
    for (const i of ids) {
      const L = all[i]; if (!L) continue;
      const pts = [];
      for (const bn of [L.fore, L.hand, L.tip]) if (bn) pts.push(bn.getWorldPosition(new V()));
      if (!L.tip && (u.kind.barLen || 0) > 0 && L.fore && L.hand) {
        const f = L.fore.getWorldPosition(new V()), h = L.hand.getWorldPosition(new V());
        pts.push(h.clone().addScaledVector(h.clone().sub(f).normalize(), u.kind.barLen));
      }
      out.push(pts);
    }
    return out;
  };
  const nearest = (u, A) => {
    let best = Infinity, bp = null;
    for (const pts of ends(u, A)) {
      for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 4; k++) {
        tmp.lerpVectors(pts[i - 1], pts[i], k / 4);
        const d = torsoD(tmp); if (d < best) { best = d; bp = tmp.clone(); }
      }
    }
    return { d: best, p: bp };
  };
  window.__hitsRun = (sec = 30, opts = {}) => {
    const F = window.__fs, spot = F.spot;
    const rec = [], live = new Map();
    let hurt = 0, frames = 0;
    for (let f = 0; f < 60 * sec; f++) {
      const hp0 = b.state().hp;
      window.__off += 16.7; b.frame(1); frames++;
      if (b.state().hp < hp0) hurt += hp0 - b.state().hp;
      b.heal();
      // the player is NOT pinned: a blow's knockback is part of where the next one lands.
      // Only a drift of more than three metres is put back (and the grace for it waits a second).
      const cp = b.camera.position;
      if (Math.hypot(cp.x - spot[0], cp.z - spot[1]) > 3) { cp.x = spot[0]; cp.z = spot[1]; }
      const me = [cp.x, cp.z];
      const out = b.farmUnits.filter((u) => u.farm.out && u.st.alive && !u.farm.burst);
      // look at the nearest, the way a player fighting would
      if (out.length) {
        const u = out.slice().sort((p, q) => Math.hypot(p.g.position.x - me[0], p.g.position.z - me[1]) - Math.hypot(q.g.position.x - me[0], q.g.position.z - me[1]))[0];
        b.look(Math.atan2(-(u.g.position.x - me[0]), -(u.g.position.z - me[1])), -0.05);
      }
      for (const u of out) {
        const st = u.st; const A = st.atk >= 0 ? u.atk[st.swing] : null;
        let L = live.get(u);
        if (A && st.atk >= A.wind && st.atk < A.wind + A.strike + 0.05) {
          if (!L || L.swing !== st.swing || L.done) { L = { swing: st.swing, min: Infinity, atLand: null, scr: null, landed: false, done: false, dist: Math.hypot(u.g.position.x - me[0], u.g.position.z - me[1]) }; live.set(u, L); }
          const n = nearest(u, A);
          if (n.d < L.min) L.min = n.d;
          if (st.landed && !L.landed) {
            L.landed = true; L.atLand = n.d;
            if (n.p) { ndc.copy(n.p).project(b.camera); L.scr = [+ndc.x.toFixed(2), +ndc.y.toFixed(2)]; }
            const fw = new V(); b.camera.getWorldDirection(fw);
            const dx = u.g.position.x - me[0], dz = u.g.position.z - me[1];
            L.bear = +(Math.acos(Math.max(-1, Math.min(1, (dx * fw.x + dz * fw.z) / (Math.hypot(dx, dz) * Math.hypot(fw.x, fw.z) || 1)))) * 57.3).toFixed(0);
            L.dAt = +Math.hypot(dx, dz).toFixed(2);
          }
        } else if (L && !L.done) { L.done = true; rec.push(L); }
      }
    }
    for (const L of live.values()) if (!L.done) rec.push(L);
    const landed = rec.filter((r) => r.landed), missed = rec.filter((r) => !r.landed);
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(2) : null; };
    const onScr = landed.filter((r) => r.scr && Math.abs(r.scr[0]) <= 1 && Math.abs(r.scr[1]) <= 1).length;
    const bySwing = {};
    for (const r of rec) { const o = bySwing[r.swing] || (bySwing[r.swing] = { n: 0, landed: 0, atLand: [], min: [] }); o.n++; if (r.landed) { o.landed++; o.atLand.push(r.atLand); } o.min.push(r.min); }
    for (const k in bySwing) { const o = bySwing[k]; o.atLand = med(o.atLand); o.min = med(o.min); }
    return {
      sec, swings: rec.length, landed: landed.length, dmgPerMin: +(hurt * 60 / sec).toFixed(1),
      landedFar: landed.filter((r) => r.atLand > 0.35).length,         // counted, with the weapon more than a hand off you
      missedThrough: missed.filter((r) => r.min < 0.2).length,        // went through you and did not count
      atLandMed: med(landed.map((r) => r.atLand)), minMed: med(rec.map((r) => r.min)),
      onScreen: onScr + '/' + landed.length, bySwing, lands: landed.map((r) => [r.swing, r.atLand, r.scr, r.bear, r.dAt]),
    };
  };
})();
