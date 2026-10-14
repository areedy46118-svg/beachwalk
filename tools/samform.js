/* THE SAMURAI'S FORM, measured. Not part of the game.
 *   await import('/tools/thrdante.js'); __tdMute();
 *   eval(await (await fetch('/tools/samform.js')).text()); await __samFormBoot();
 *   __samFilm(n, every, yawDeg, dist)   stills of him fighting (padded base64), dev mode off only inside
 *   __samMeasure(N)                     over N frames of fighting: elbow angles, upper arm to neck base
 *                                       ("coll"), elbow to his spine line ("armIn"), neck length — 5/50/95 %
 *   window.__samRaw = true              the post-mixer layers off (two hands, smoothing, keep-clear) */
(function () {
  const b = window.__bw;
  window.__samFormBoot = async () => {
    window.__T = await import('three');
    eval(await (await fetch('/tools/contact.js', { cache: 'no-store' })).text());
    await window.__roomBoot('dojo', 'assets/samurai.glb');
    b.settings.devMode = true;
    eval(await (await fetch('/tools/samrun.js', { cache: 'no-store' })).text());
    window.__u = b.mutants.find((x) => x.kind && x.kind.glb === 'assets/samurai.glb');
    const it = b.interactables.find((i) => /katana/i.test(i.label || ''));
    (it.data && it.data.onActivate || it.onActivate)();
    window.__cadv(240);
    window.__samGain = 1.7; window.__samSolo = true;
    return !!window.__u.model;
  };
  window.__samFilm = (n = 12, every = 7, yaw = 35, d = 3.0) => {
    b.settings.devMode = false;
    try { return window.__samRun(window.__u, n, every, yaw, d, 0, 300, 400); } finally { b.settings.devMode = true; b.heal(); }
  };
  window.__samMeasure = (N = 1200) => {
    const u = window.__u, B = {}, T = window.__T; u.model.traverse((o) => { if (o.isBone) B[o.name] = o; });
    const P = (n) => B[n].getWorldPosition(new T.Vector3());
    const home = b.camera.position.clone(); b.settings.devMode = false;
    const st = { elbL: [], elbR: [], neck: [], collL: [], collR: [], armInL: [], armInR: [] }, bad = {};
    try {
      for (let f = 0; f < N; f++) {
        b.camera.position.x = home.x; b.camera.position.z = home.z; window.__cadv(1); b.heal(); u.model.updateMatrixWorld(true);
        const A = P('DEF-spine'), C = P('DEF-spine004'), ab = C.clone().sub(A);
        for (const s of ['L', 'R']) {
          const a = P('DEF-upper_arm' + s), e = P('DEF-forearm' + s), h = P('DEF-hand' + s);
          const ang = a.clone().sub(e).angleTo(h.clone().sub(e)) * 57.3;
          st['elb' + s].push(ang); st['coll' + s].push(a.distanceTo(C));
          const t = Math.max(0, Math.min(1, e.clone().sub(A).dot(ab) / ab.lengthSq()));
          st['armIn' + s].push(e.distanceTo(A.clone().addScaledVector(ab, t)));
          if (ang < 40) { const c = (u.cur ? u.cur.getClip().name : '-') + s; bad[c] = (bad[c] || 0) + 1; }
        }
        st.neck.push(C.distanceTo(P('DEF-spine006')));
      }
    } finally { b.settings.devMode = true; b.heal(); }
    const q = (a) => { a = a.slice().sort((x, y) => x - y); return [a[a.length * 0.05 | 0], a[a.length * 0.5 | 0], a[a.length * 0.95 | 0]].map((v) => +v.toFixed(2)); };
    const out = {}; for (const k in st) out[k] = q(st[k]); out.elbowUnder40 = bad;
    return JSON.stringify(out);
  };
})();
