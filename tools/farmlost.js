/* THE LOST FARMER. Not part of the game. Plays the farmer fight through, killing the
 * nearest one out every few seconds while the player walks the street, and logs any
 * farmer who is out and alive but has not come near for a long time — the one that
 * kept the back door barred.
 *   eval(await (await fetch('/tools/farmlost.js')).text()); await __flBoot()
 *   __flStep(20)    twenty seconds of fight; call until it reports done */
(function () {
  const b = window.__bw;
  window.__flBoot = async () => {
    b.beginGame(); b.settings.devMode = true;
    while (!b.fortWallsStep(1e9));
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); window.__off = 0;
    let creep = 0;                                   // it creeps on every read, or a loop that waits on the clock never ends
    performance.now = () => base + window.__off + (creep += 0.01);
    window.__adv = (n) => { for (let i = 0; i < n; i++) { window.__off += 16.7; b.frame(1); } };
    b.placeInFort(); __adv(4);
    let n = 0; while ((b.frozen() || b.mutCut) && n++ < 600) __adv(1);
    for (let k = 0; k < 400 && !(b.FORT_SITE._main && b.FORT_SITE._main.done); k++) __adv(1);
    const um = b.mutants.find((u) => u.kindName === 'umbra'); if (um) { um.st.alive = false; um.g.position.y -= 200; }
    window.__fl = { t: 0, kills: 0, next: 2, spots: [], last: new Map(), log: [] };
    // walk spots: the street's own cells, every 40th of the courts' floor at street level
    const S = b.FORT_SITE, W = S.walk; let i = 0;
    for (const [k, f] of S._main.set) if (f < 1.5 && (i++ % 400) === 0) __fl.spots.push([S.X + W.x0 + (k % W.gw + 0.5) * W.cell, S.Z + W.z0 + (Math.floor(k / W.gw) + 0.5) * W.cell]);
    return __fl.spots.length;
  };
  window.__flStep = (sec = 20, killEvery = 2.5) => {
    const F = __fl;
    for (let i = 0; i < 60 * sec; i++) {
      __adv(1); F.t += 1 / 60; b.heal && b.heal();
      if (Math.floor(F.t / 6) !== Math.floor((F.t - 1 / 60) / 6)) {        // a new spot every six seconds
        const s = F.spots[Math.floor(Math.random() * F.spots.length)];
        b.camera.position.x = s[0]; b.camera.position.z = s[1];
      }
      const me = b.camera.position;
      for (const u of b.farmUnits) {
        if (!u.st.alive || !u.farm.out || u.farm.burst) { F.last.delete(u); continue; }
        const d = Math.hypot(u.g.position.x - me.x, u.g.position.z - me.z);
        const L = F.last.get(u) || { t0: F.t, near: F.t };
        if (d < 7) L.near = F.t;
        F.last.set(u, L);
      }
      if (F.t >= F.next) {
        F.next += killEvery;
        const out = b.farmUnits.filter((u) => u.st.alive && u.farm.out && !u.farm.burst && Math.hypot(u.g.position.x - me.x, u.g.position.z - me.z) < 9);
        if (out.length) { b.hurtMutant(out[0], 99, 1); F.kills++; }
      }
      if (b.farmFight.done) break;
    }
    const lost = [];
    for (const [u, L] of F.last) if (F.t - L.near > 25) {
      const p = u.g.position;
      lost.push({ i: b.farmUnits.indexOf(u), away: +(F.t - L.near).toFixed(0), at: [+p.x.toFixed(1), +p.y.toFixed(2), +p.z.toFixed(1)], vis: u.g.visible, awake: u.st.awake, court: b.fortCourtAt(p.x, p.z), dist: +Math.hypot(p.x - b.camera.position.x, p.z - b.camera.position.z).toFixed(1) });
    }
    const alive = b.farmUnits.filter((u) => u.st.alive);
    return JSON.stringify({ t: +F.t.toFixed(0), kills: F.kills, done: b.farmFight.done, sent: b.farmFight.sent, alive: alive.length, out: alive.filter((u) => u.farm.out).length, lost });
  };
})();
