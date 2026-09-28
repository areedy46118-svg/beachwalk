// hands-off belly fight sampler. __bellyRun(frames) -> per-unit stats
window.__bellyRun = function (N = 1500, opts = {}) {
  const b = window.__bw; b.settings.devMode = false;
  window.requestAnimationFrame = () => 0;
  if (!window.__realNow) window.__realNow = performance.now.bind(performance);
  if (window.__off === undefined) window.__off = 0;
  performance.now = () => window.__realNow() + window.__off;
  const units = [...b.demonUnits, ...b.parasiteUnits];
  const P0 = { x: 15000 + (opts.lx || 0), z: 15000 - 64 };
  const stats = new Map(), prev = new Map();
  let dmg = 0, swings0 = new Map(units.map(u => [u, u.st.swings || 0]));
  for (let f = 0; f < N; f++) {
    window.__off += 16.7;
    const hp = b.state().hp;
    b.camera.position.x = P0.x; b.camera.position.z = P0.z;
    b.frame(1);
    const hp2 = b.state().hp; if (hp2 < hp) dmg += hp - hp2;
    b.heal();
    for (const u of units) {
      if (!u.st.alive || !u.st.awake) continue;
      const p = u.g.position, q = prev.get(u); prev.set(u, p.clone()); if (!q) continue;
      const sp = Math.hypot(p.x - q.x, p.z - q.z) / 0.0167;
      let S = stats.get(u); if (!S) { S = { n: 0, lowW: 0, slide: 0, still: 0, clips: {}, atkF: 0, slipSum: 0, slipN: 0, slipBad: 0 }; stats.set(u, S); }
      if (!u.__feet) { let fl = null, fr = null; u.model.traverse(o => { if (!o.isBone) return; if (/LeftToeBase/.test(o.name) && !fl) fl = o; if (/RightToeBase/.test(o.name) && !fr) fr = o; }); u.__feet = [fl, fr]; }
      if (u.__feet[0] && u.__feet[1]) {
        const L = u.__feet[0].getWorldPosition(new p.constructor()), R = u.__feet[1].getWorldPosition(new p.constructor());
        const low = L.y < R.y ? 0 : 1, F = low ? R : L;
        if (u.__pl === low && u.__pf && u.st.atk < 0 && sp > 0.3) { const slip = Math.hypot(F.x - u.__pf.x, F.z - u.__pf.z) / 0.0167; S.slipSum += slip; S.slipN++; if (slip > 0.9) S.slipBad++; }
        u.__pl = low; u.__pf = F;
      }
      S.n++;
      let w = 0; for (const a of u.mixer._actions) if (a.enabled && (a.isRunning() || a.paused)) w += a.getEffectiveWeight(); if (w < 0.85) S.lowW++;
      const nm = u.cur ? u.cur.getClip().name : 'none'; S.clips[nm] = (S.clips[nm] || 0) + 1;
      if (u.st.atk >= 0) S.atkF++;
      if (sp > 0.5 && /idle|kIdle|roar/i.test(nm)) S.slide++;
      if (sp < 0.02 && u.st.atk < 0) S.still++;
    }
  }
  return { dmg, list: [...stats].map(([u, S]) => ({ k: u.kind.glb.split('/').pop().slice(0, 4) + u.kind.h, n: S.n, lowW: S.lowW, slide: S.slide, still: S.still, atk: S.atkF, sw: (u.st.swings || 0) - swings0.get(u), hp: u.st.hp,
    slip: S.slipN ? +(S.slipSum / S.slipN).toFixed(2) : 0, slipBad: S.slipBad, top: Object.entries(S.clips).sort((a, c) => c[1] - a[1]).slice(0, 5).map(e => e[0] + ':' + e[1]).join(' ') })) };
};
