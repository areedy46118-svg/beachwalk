/* THE SAMURAI'S SMOOTHNESS, measured. Not part of the game. After `__samRunBoot()` (tools/samrun.js):
 *   eval(await (await fetch('/tools/samsmooth.js')).text());
 *   __samFight(N)        hands-off at fighting range, healed, dev mode OFF (dev mode stops him swinging):
 *                        swings by name, damage, frames standing still, distances, clips on the mixer
 *   __samRate(N)         each swing's clip-time rate (clip seconds per game second) in 50 ms bins of `atk`
 *   __samLayers(N, th)   one-frame jumps of either fist / the head (relative to his hips) over `th` m,
 *                        with how far each post-mixer layer had carried it: mut / two / smooth / clear.
 *                        Needs the `window.__samDbg` hooks in `update()` (they cost nothing when unset).
 *   __samMiss(N)         per swing: thrown, landed, and how near the striking chain came to your torso
 *                        through its active window (9.00 = cut off before it)
 *   __samOnly(name, N, stop)  only that swing in his draw (and optionally its `stop`): per throw, the
 *                        nearest approach and where it was — fwd < 0 is SHORT of you, up > 0 over you */
(function () {
  const b = window.__bw;
  const bones = (u) => { const B = {}; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; }); return B; };
  window.__samFight = (N = 3600) => {
    const u = window.__u, home = b.camera.position.clone(); b.settings.devMode = false;
    const sw = {}, clips = {}, dists = []; let inS = false, dmg = 0, still = 0, pp = u.g.position.clone();
    for (let f = 0; f < N; f++) {
      b.camera.position.x = home.x; b.camera.position.z = home.z;
      const h0 = b.state().hp; window.__cadv(1); if (b.state().hp < h0) dmg += h0 - b.state().hp; b.heal();
      if (u.st.atk >= 0) { if (!inS) { sw[u.st.swing] = (sw[u.st.swing] || 0) + 1; inS = true; } } else inS = false;
      const p = u.g.position; if (Math.hypot(p.x - pp.x, p.z - pp.z) < 0.002 && u.st.atk < 0) still++; pp = p.clone();
      dists.push(Math.hypot(p.x - home.x, p.z - home.z));
      const c = u.cur ? u.cur.getClip().name : '-'; clips[c] = (clips[c] || 0) + 1;
    }
    dists.sort((x, y) => x - y);
    const n = Object.values(sw).reduce((x, y) => x + y, 0);
    return JSON.stringify({ swingsPerMin: +(n * 3600 / N).toFixed(1), dmgPerMin: +(dmg * 3600 / N).toFixed(1), sw, stillNoSwing: still,
      dist: [dists[N * 0.05 | 0], dists[N * 0.5 | 0], dists[N * 0.95 | 0]].map((d) => +d.toFixed(2)), clips });
  };
  window.__samRate = (N = 5000) => {
    const u = window.__u, home = b.camera.position.clone(); b.settings.devMode = false;
    const prof = {}; let pt = null, pa = null, psw = null;
    for (let f = 0; f < N; f++) {
      b.camera.position.x = home.x; b.camera.position.z = home.z; window.__cadv(1); b.heal();
      if (u.st.atk >= 0) {
        const t = u.cur ? u.cur.time : 0;
        if (psw === u.st.swing && pa !== null && u.st.atk > pa) {
          const P = prof[u.st.swing] || (prof[u.st.swing] = {}), bin = (Math.round(u.st.atk / 0.05) * 0.05).toFixed(2);
          (P[bin] = P[bin] || []).push((t - pt) / (u.st.atk - pa));
        }
        pt = t; pa = u.st.atk; psw = u.st.swing;
      } else { pa = null; psw = null; }
    }
    return Object.entries(prof).map(([s, P]) => { const A = u.atk[s];
      return `${s} wind${A.wind.toFixed(2)} str${A.strike.toFixed(2)} rec${A.recover.toFixed(2)}: ` +
        Object.keys(P).sort((x, y) => x - y).map((k) => `${k}:${(P[k].reduce((x, y) => x + y, 0) / P[k].length).toFixed(1)}`).join(' '); }).join('\n');
  };
  const V = () => new window.__T.Vector3();
  const segDist = (p, a, c) => { const ab = V().subVectors(c, a), t = Math.max(0, Math.min(1, V().subVectors(p, a).dot(ab) / (ab.lengthSq() || 1))); return p.distanceTo(V().copy(a).addScaledVector(ab, t)); };
  const chainPts = (u, A) => (A.limbs || [0]).map((k) => u.limbs && u.limbs[k]).filter(Boolean)
    .map((L) => [L.arm, L.fore, L.hand, L.tip].filter(Boolean).map((o) => o.getWorldPosition(V())));
  window.__samMiss = (N = 3600) => {
    const u = window.__u, home = b.camera.position.clone(); b.settings.devMode = false;
    const per = {}; let cur = null;
    const close = () => { if (!cur) return; const P = per[cur.s] || (per[cur.s] = { n: 0, land: 0, dmin: [] }); P.n++; if (cur.land) P.land++; P.dmin.push(cur.dmin); cur = null; };
    for (let f = 0; f < N; f++) {
      b.camera.position.x = home.x; b.camera.position.z = home.z;
      const h0 = b.state().hp; window.__cadv(1);
      if (u.st.atk >= 0) {
        if (!cur || cur.s !== u.st.swing || u.st.atk < cur.t) { close(); cur = { s: u.st.swing, land: false, dmin: 9, t: 0 }; }
        cur.t = u.st.atk; if (b.state().hp < h0) cur.land = true;
        const A = u.atk[u.st.swing];
        if (u.st.atk >= A.wind - 0.02 && u.st.atk <= A.wind + A.strike) {
          const e = b.camera.position, t0 = V().set(e.x, e.y - 0.15, e.z), t1 = V().set(e.x, e.y - 1.25, e.z);
          for (const pts of chainPts(u, A)) for (let i = 1; i < pts.length; i++) for (let j = 0; j <= 6; j++) cur.dmin = Math.min(cur.dmin, segDist(V().lerpVectors(pts[i - 1], pts[i], j / 6), t0, t1));
        }
      } else close();
      b.heal();
    }
    close();
    return Object.entries(per).map(([s, P]) => { P.dmin.sort((x, y) => x - y); return `${s} n${P.n} land${P.land} [${P.dmin.map((x) => x.toFixed(2)).join(' ')}]`; }).join('\n');
  };
  window.__samOnly = (name, N = 2400, stop) => {
    const u = window.__u, use0 = u.kind.use, st0 = u.atk[name].stop, home = b.camera.position.clone(); b.settings.devMode = false;
    if (stop !== undefined) u.atk[name].stop = stop;
    u.kind.use = Object.fromEntries(Object.keys(use0).map((k) => [k, k === name ? 1 : 0.0001]));
    const res = []; let cur = null;
    for (let f = 0; f < N; f++) {
      b.camera.position.x = home.x; b.camera.position.z = home.z;
      const h0 = b.state().hp; window.__cadv(1);
      if (u.st.atk >= 0 && u.st.swing === name) {
        if (!cur || u.st.atk < cur.t) { if (cur) res.push(cur); cur = { t: 0, land: false, best: 9, off: '' }; }
        cur.t = u.st.atk; if (b.state().hp < h0) cur.land = true;
        const A = u.atk[name];
        if (u.st.atk >= A.wind - 0.03 && u.st.atk <= A.wind + A.strike) {
          const e = b.camera.position, fx = e.x - u.g.position.x, fz = e.z - u.g.position.z, fl = Math.hypot(fx, fz);
          for (const pts of chainPts(u, A)) for (let i = 1; i < pts.length; i++) for (let j = 0; j <= 6; j++) {
            const p = V().lerpVectors(pts[i - 1], pts[i], j / 6), y = Math.max(e.y - 1.25, Math.min(e.y - 0.15, p.y));
            const d = Math.hypot(p.x - e.x, p.y - y, p.z - e.z);
            if (d < cur.best) { cur.best = d; const rx = p.x - e.x, rz = p.z - e.z; cur.off = `fwd${((rx * fx + rz * fz) / fl).toFixed(2)} side${((rx * fz - rz * fx) / fl).toFixed(2)} up${(p.y - y).toFixed(2)} stand${fl.toFixed(2)}`; }
          }
        }
      }
      b.heal();
    }
    if (cur) res.push(cur);
    u.kind.use = use0; u.atk[name].stop = st0;
    const n = res.filter((r) => r.best < 9);
    return `n${n.length} land${n.filter((r) => r.land).length}\n` + n.slice(0, 10).map((r) => `${r.best.toFixed(2)} ${r.off}`).join('\n');
  };
  window.__samLayers = (N = 4000, th = 0.3) => {
    const u = window.__u, T = window.__T, B = bones(u), W = (o) => o.getWorldPosition(new T.Vector3());
    const home = b.camera.position.clone(), far = window.__spots[0]; b.settings.devMode = false;
    let cur = {}, last = null, n = 0; const spikes = [], cnt = {}, all = { r: [], l: [], h: [] };
    window.__samDbg = (tag) => { const hp = W(B['DEF-spine']); cur[tag] = { r: W(B['DEF-handR']).sub(hp), l: W(B['DEF-handL']).sub(hp), h: W(B['DEF-spine006']).sub(hp) }; };
    for (let f = 0; f < N; f++) {
      const s = (Math.floor(f / 400) % 2) ? far : [home.x, home.z];
      b.camera.position.x = s[0]; b.camera.position.z = s[1];
      cur = {}; window.__cadv(1); b.heal();
      if (last && cur.clear && last.clear) for (const k of ['r', 'l', 'h']) {
        const d = cur.clear[k].distanceTo(last.clear[k]); all[k].push(d);
        if (d > th) {
          n++;
          const st = ['mut', 'two', 'smooth', 'clear'].map((t) => cur[t] ? cur[t][k].distanceTo(last.clear[k]).toFixed(2) : '-').join('/');
          const key = (u.cur ? u.cur.getClip().name : '-') + (u.st.atk >= 0 ? '/' + u.st.swing : '');
          cnt[key] = (cnt[key] || 0) + 1;
          if (spikes.length < 12) spikes.push(`${k} ${d.toFixed(2)} ${st} ${key} atk${u.st.atk.toFixed(2)}`);
        }
      }
      last = cur;
    }
    window.__samDbg = null;
    const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return +(s[Math.floor(s.length * f)] || 0).toFixed(3); };
    const pc = (k) => [q(all[k], 0.5), q(all[k], 0.99), q(all[k], 0.999), +Math.max(0, ...all[k]).toFixed(3)];
    return JSON.stringify({ over: n, perMin: +(n * 3600 / N).toFixed(1), R: pc('r'), L: pc('l'), head: pc('h'), cnt, spikes });
  };
})();
