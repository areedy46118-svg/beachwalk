/* THE DOUBLE'S SIGHT PICTURE, SOLVED. Not part of the game. After tools/sgtest.js's __sgBoot():
 *   eval(await (await fetch('/tools/sgads.js')).text());
 *   __sgAdsSolve({ relief, drop, cant })  holds the right button, and moves SG_ADS (live, in place) until
 *        the barrels lie straight down the view axis, the rib's rear sits `drop` under the eye and `relief`
 *        in front of it, the gun is rolled by `cant`, and the bead pin has nothing left to correct.
 *        Returns the six numbers and the residuals.
 *   __sgAdsMeasure()  the same measurements, without changing anything */
(function () {
  const b = window.__bw;
  const T = () => b.camera.position.constructor;
  const meas = () => {
    const V = T(), Q = b.camera.quaternion.constructor;
    const S = b.sgParts(), cam = b.vmCamera;
    b.armRig.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const ci = cam.matrixWorldInverse, cq = cam.getWorldQuaternion(new Q()).invert();
    const gq = S.gun.getWorldQuaternion(new Q());
    const d = new V(1, 0, 0).applyQuaternion(gq).applyQuaternion(cq);
    const u = new V(0, 1, 0).applyQuaternion(gq).applyQuaternion(cq);
    const s = S.sight.getWorldPosition(new V()).applyMatrix4(ci);
    const e = S.bead.getWorldPosition(new V()).applyMatrix4(ci);
    // where the pose alone put the rig, and so how far the bead pin moved it
    const halfH = Math.tan(cam.fov * Math.PI / 360) * 0.62, halfW = halfH * cam.aspect;
    const P = b.SG_ADS;
    const exp = new V(halfW * (0.58 + P[5]), -halfH * 0.66 + P[1], -0.62 + P[4]);
    const pin = b.armRig.position.clone().sub(exp);
    return { d, u, s, e, pin, halfW };
  };
  window.__sgAdsMeasure = () => {
    b.mouseBtns = 2; window.__cadv(30);
    const m = meas();
    return JSON.stringify({ dir: [m.d.x, m.d.y, m.d.z].map((x) => +x.toFixed(4)), upX: +m.u.x.toFixed(4), sight: [m.s.x, m.s.y, m.s.z].map((x) => +x.toFixed(4)),
      bead: [m.e.x, m.e.y, m.e.z].map((x) => +x.toFixed(4)), pin: [m.pin.x, m.pin.y, m.pin.z].map((x) => +x.toFixed(4)), aim: b.magAim });
  };
  window.__sgAdsSolve = ({ relief = 0.26, drop = 0.045, cant = 0 } = {}) => {
    const P = b.SG_ADS;
    b.mouseBtns = 2; window.__cadv(30);
    const err = () => { window.__cadv(2); const m = meas(); return { m, E: [m.d.x, m.s.y + drop, m.u.x - Math.sin(cant)] }; };
    for (let it = 0; it < 40; it++) {
      // the turn: a 3x3 Newton step on pitch, yaw and roll
      const { m, E } = err();
      const J = [];
      for (const k of [0, 2, 3]) { P[k] += 0.004; const { E: E2 } = err(); P[k] -= 0.004; J.push(E2.map((x, i) => (x - E[i]) / 0.004)); }
      // J[col][row] -> solve A x = -E with A[row][col]
      const A = [0, 1, 2].map((r) => [0, 1, 2].map((c) => J[c][r]));
      const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
      const D = det(A);
      if (Math.abs(D) > 1e-9) {
        const x = [0, 1, 2].map((c) => { const Mc = A.map((row, r) => row.map((v, cc) => (cc === c ? -E[r] : v))); return det(Mc) / D; });
        [0, 2, 3].forEach((k, i) => { P[k] += THREE_CLAMP(x[i], -0.2, 0.2); });
      }
      // the place: take up whatever the pin was doing into the pose, and set the eye's distance
      const m2 = err().m;
      P[5] += m2.pin.x / m2.halfW;
      P[1] += m2.pin.y;
      P[4] += -(m2.s.z + relief);
      if (Math.abs(E[0]) + Math.abs(E[1]) + Math.abs(E[2]) < 1e-5 && m2.pin.length() < 1e-4 && Math.abs(m2.s.z + relief) < 1e-4) break;
    }
    const { m, E } = err();
    return JSON.stringify({ SG_ADS: P.map((x) => +x.toFixed(4)), resid: E.map((x) => +x.toExponential(1)), pin: +m.pin.length().toExponential(1),
      sight: [m.s.x, m.s.y, m.s.z].map((x) => +x.toFixed(4)), bead: [m.e.x, m.e.y, m.e.z].map((x) => +x.toFixed(4)) });
  };
  const THREE_CLAMP = (x, a, c) => Math.max(a, Math.min(c, x));
})();
