/* THE DOUBLE'S MOTION AS NUMBERS. Not part of the game. After tools/sgtest.js's __sgBoot():
 *   eval(await (await fetch('/tools/sgcurve.js')).text());
 *   __sgCurve(plan, frames)  runs `plan(f)` before each frame on the fake clock and records where the
 *                            muzzle and the grip are on the screen (NDC of the view model's camera) and
 *                            how far the gun turned that frame. Returns per-frame rows and the frames
 *                            whose ACCELERATION stands out — a snap is a jump in speed, not a big speed. */
(function () {
  const b = window.__bw, T = window.__T || null;
  window.__sgCurve = (plan, frames = 120, every = 1) => {
    const S = b.sgParts(), V = b.camera.position.constructor, Q = b.camera.quaternion.constructor;
    const mz = new V(), gp = new V(), bd = new V(), q = new Q();
    const rows = []; let prevQ = null;
    for (let f = 0; f < frames; f++) {
      if (plan) plan(f);
      window.__cadv(1);
      b.armRig.updateMatrixWorld(true);
      S.muzzle[0].getWorldPosition(mz); S.root.getWorldPosition(gp); S.root.getWorldQuaternion(q); S.bead.getWorldPosition(bd); const bn = bd.project(b.vmCamera);
      const m = mz.clone().project(b.vmCamera), g = gp.clone().project(b.vmCamera);
      const turn = prevQ ? 2 * Math.acos(Math.min(1, Math.abs(q.dot(prevQ)))) : 0; prevQ = q.clone();
      rows.push({ f, mx: m.x, my: m.y, gx: g.x, gy: g.y, bx: bn.x, by: bn.y, turn, rel: b.sgRel, aim: b.magAim, open: S.barrels.rotation.z });
    }
    // speeds and accelerations of the muzzle and grip on the screen, and of the turn
    const out = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i], p = rows[i - 1], pp = rows[i - 2];
      const vm = Math.hypot(r.mx - p.mx, r.my - p.my), vmp = Math.hypot(p.mx - pp.mx, p.my - pp.my);
      const am = Math.hypot((r.mx - p.mx) - (p.mx - pp.mx), (r.my - p.my) - (p.my - pp.my));
      const ag = Math.hypot((r.gx - p.gx) - (p.gx - pp.gx), (r.gy - p.gy) - (p.gy - pp.gy));
      const at = Math.abs(r.turn - p.turn);
      out.push({ f: r.f, vm, am, ag, at, turn: r.turn, rel: r.rel, aim: r.aim, open: r.open, mx: r.mx, my: r.my, bx: r.bx, by: r.by });
    }
    return out;
  };
  // a compact report: the curve every `step` frames, and the frames where something jumps
  window.__sgReport = (out, step = 3, top = 10) => {
    const line = (o) => `f${o.f} m(${o.mx.toFixed(2)},${o.my.toFixed(2)}) bead(${o.bx.toFixed(2)},${o.by.toFixed(2)}) v${o.vm.toFixed(3)} a${o.am.toFixed(3)} g${o.ag.toFixed(3)} turn${(o.turn * 57.3).toFixed(1)}° dT${(o.at * 57.3).toFixed(1)} rel${o.rel >= 0 ? o.rel.toFixed(2) : '-'} aim${o.aim.toFixed(2)} open${o.open.toFixed(2)}`;
    const jumps = [...out].sort((x, y) => (y.am + y.ag + y.at) - (x.am + x.ag + x.at)).slice(0, top).sort((x, y) => x.f - y.f);
    return out.filter((o, i) => i % step === 0).map(line).join('\n') + '\n== JUMPS ==\n' + jumps.map(line).join('\n');
  };
})();
