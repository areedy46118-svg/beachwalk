/* CONTACT HONESTY. Not part of the game. Does a creature's weapon touch you when its blow counts?
 *   eval(await (await fetch('/tools/contact.js')).text());
 *   await __orcBoot()        the tavern, the barman and the drunk out of it, the orc on you
 *   __contact(u, N)          N frames on a fake clock, healed: on every blow that takes your health,
 *                            the nearest point of the swinging chain (shoulder → elbow → wrist → tip)
 *                            to your torso (a segment 0.15-1.25 m under the eye). Returns stats. */
(function () {
  const b = window.__bw;
  const V = () => new b.camera.position.constructor();
  window.__orcBoot = async () => {
    b.beginGame(); b.settings.devMode = false;
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0, creep = 0;
    performance.now = () => base + off + (creep += 0.01);
    window.__cadv = (k) => { for (let i = 0; i < k; i++) { off += 16.7; b.frame(1); } };
    const RB = b.ROOM_BACK.tav; RB.load();
    for (let i = 0; i < 300 && !RB.ready(); i++) { __cadv(1); await new Promise((r) => setTimeout(r, 40)); }
    RB.place(); __cadv(30);
    const find = (g) => b.mutants.find((x) => x.kind && x.kind.glb === g);
    for (let i = 0; i < 300 && !(find('assets/orc.glb') && find('assets/orc.glb').model); i++) { __cadv(1); await new Promise((r) => setTimeout(r, 40)); }
    const orc = find('assets/orc.glb');
    for (const g of ['assets/drunk.glb', 'assets/wong.glb']) { const o = find(g); if (o) { o.st.alive = false; o.g.visible = false; o.g.position.y -= 50; } }
    for (const o of b.mutants) if (o !== orc && o.kind && o.kind.tav) { o.st.alive = false; o.g.visible = false; o.g.position.y -= 50; }
    if (orc.kind.provoke) orc.kind.provoke(orc, true);
    orc.st.foe = null; orc.st.mine = true; orc.st.awake = true;
    __cadv(90);
    window.__orc = orc;
    return !!orc.model;
  };
  /* any room and any creature in it: __roomBoot('thr', 'assets/umbra.glb') */
  window.__roomBoot = async (room, glb) => {
    b.beginGame(); b.settings.devMode = true;            // no deaths (a hit still lands and takes health down to one)
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0, creep = 0;
    performance.now = () => base + off + (creep += 0.01);
    window.__cadv = (k) => { for (let i = 0; i < k; i++) { off += 16.7; b.frame(1); } };
    const RB = b.ROOM_BACK[room]; RB.load();
    for (let i = 0; i < 300 && !RB.ready(); i++) { __cadv(1); await new Promise((r) => setTimeout(r, 40)); }
    RB.place(); __cadv(30);
    const find = () => b.mutants.find((x) => x.kind && x.kind.glb === glb && x.st.alive);
    for (let i = 0; i < 400 && !(find() && find().model); i++) { __cadv(1); await new Promise((r) => setTimeout(r, 40)); }
    const u = find(); if (!u) return null;
    let m = 0; while ((b.frozen() || b.mutCut) && m++ < 600) __cadv(1);
    // stand 2.5 m in front of him and wake him
    const p = u.g.position, yaw = u.g.rotation.y;
    b.camera.position.set(p.x + Math.sin(yaw) * 2.5, b.camera.position.y, p.z + Math.cos(yaw) * 2.5);
    u.st.awake = true; u.holdAnim = false; u.st.roar = 0;
    for (let i = 0; i < 120; i++) { __cadv(1); b.heal && b.heal(); }
    return u;
  };
  const segDist = (p, a, c) => { const ab = V().subVectors(c, a), t = Math.max(0, Math.min(1, V().subVectors(p, a).dot(ab) / (ab.lengthSq() || 1))); return p.distanceTo(V().copy(a).addScaledVector(ab, t)); };
  const segSeg = (a0, a1, b0, b1) => { let best = Infinity; for (let i = 0; i <= 8; i++) { const p = V().lerpVectors(a0, a1, i / 8); best = Math.min(best, segDist(p, b0, b1)); } for (let i = 0; i <= 8; i++) { const p = V().lerpVectors(b0, b1, i / 8); best = Math.min(best, segDist(p, a0, a1)); } return best; };
  window.__contact = (u, N = 3600, pin = true) => {
    const home = b.camera.position.clone(); const ds = [], swings = {}; let inSw = false, dmg = 0;
    for (let i = 0; i < N; i++) {
      if (pin) { b.camera.position.x = home.x; b.camera.position.z = home.z; }
      const hp0 = b.state().hp; __cadv(1);
      if (u.st.atk >= 0 && u.st.atk < 0.03) { if (!inSw) { swings[u.st.swing] = (swings[u.st.swing] || 0) + 1; inSw = true; } } else inSw = false;
      if (b.state().hp < hp0 && !(u.st.atk >= 0)) { window.__offHits = (window.__offHits || 0) + 1; }   // not a swing (a thrown star, a bleed): not a blow
      if (b.state().hp < hp0 && u.st.atk >= 0) {
        dmg += hp0 - b.state().hp;
        const B = u.bones, A = u.atk && u.atk[u.st.swing];
        // the chains the swing strikes with (`A.limbs`, indices into `u.limbs`), each run on past the fist by the bar
        const chains = (u.limbs && A && A.limbs) ? A.limbs.map((k) => u.limbs[k]).filter(Boolean) : [{ arm: B.arm, fore: B.fore, hand: B.hand, tip: B.tip }];
        const polys = chains.map((L) => { const p = [L.arm, L.fore, L.hand, L.tip].filter(Boolean).map((o) => o.getWorldPosition(V()));
          if (!L.tip && L.fore && L.hand && !/kick|stomp|sweep/i.test(u.st.swing) && (u.kind.barLen || 0) > 0 && p.length >= 2) { const d = V().subVectors(p[p.length - 1], p[p.length - 2]).normalize(); p.push(V().copy(p[p.length - 1]).addScaledVector(d, u.kind.barLen)); }
          return p; });
        const e = b.camera.position, t0 = V().set(e.x, e.y - 0.15, e.z), t1 = V().set(e.x, e.y - 1.25, e.z);
        let best = Infinity; for (const pts of polys) for (let k = 1; k < pts.length; k++) best = Math.min(best, segSeg(pts[k - 1], pts[k], t0, t1));
        ds.push([+best.toFixed(2), u.st.swing, +Math.hypot(u.g.position.x - e.x, u.g.position.z - e.z).toFixed(2)]);
      }
      b.heal && b.heal();
    }
    const d = ds.map((x) => x[0]).sort((x, y) => x - y), q = (f) => d.length ? d[Math.min(d.length - 1, Math.floor(d.length * f))] : null;
    return JSON.stringify({ sec: N / 60, swings, hits: ds.length, dmgMin: +(dmg * 3600 / N).toFixed(1), med: q(0.5), p90: q(0.9), max: q(1), over35: d.filter((x) => x > 0.35).length, standOff: ds.length ? +(ds.reduce((s, x) => s + x[2], 0) / ds.length).toFixed(2) : null, worst: ds.sort((x, y) => y[0] - x[0]).slice(0, 6) });
  };
})();
