/* WHICH WAY EACH PACK WEAPON'S EDGE FACES IN ITS OWN FRAME (2026-11-25, the owner: "the blade of the axe it turned to the left it should be
 * facing right at the player"). `farmToolRoll`/`farmSeatTool` take the edge as the weapon's local +X about its haft (+Y): read it off the
 * geometry. For a single bit, the direction (in XZ) of the head's farthest vertex from the haft and the head's centroid; for a two-edged
 * blade, its widest axis.   PB_PORT=4243 sh tools/probe.sh 'evalFile&f=/tools/edgedir.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 200 && !Object.keys(b.FARM_TOOLS).some((k) => /^Axe_/.test(k)); i++) { w.__adv(2); await sleep(30); }
for (const k of Object.keys(b.FARM_TOOLS).sort()) {
  const T = b.FARM_TOOLS[k], p = T.g.attributes.position, hi = T.hi || 1;
  let far = 0, fx = 0, fz = 0, cx = 0, cz = 0, n = 0, sxx = 0, szz = 0, sxz = 0, ylo = 9, yhi = -9;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); ylo = Math.min(ylo, y); yhi = Math.max(yhi, y); }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < ylo + (yhi - ylo) * (T.two ? 0.35 : 0.6)) continue;
    const r = Math.hypot(x, z); if (r > far) { far = r; fx = x; fz = z; } cx += x; cz += z; n++; sxx += x * x; szz += z * z; sxz += x * z;
  }
  // 3D: the head's (a sword's blade's) covariance — its THINNEST axis is the flat's normal; the edge is square to it and the haft
  let mx = 0, my = 0, mz = 0, m = 0; const H = [];
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < ylo + (yhi - ylo) * (T.two && !/^Axe/.test(k) ? 0.35 : 0.6)) continue; H.push([p.getX(i), y, p.getZ(i)]); mx += p.getX(i); my += y; mz += p.getZ(i); m++; }
  mx /= m; my /= m; mz /= m; const Cv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const v of H) { const d = [v[0] - mx, v[1] - my, v[2] - mz]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) Cv[r][c] += d[r] * d[c] / m; }
  // the smallest eigenvector, by inverse iteration on Cv + eps
  const inv = (M) => { const [a, b2, c] = M[0], [d, e, f] = M[1], [g, h, i2] = M[2]; const A = e * i2 - f * h, B = -(d * i2 - f * g), Cc = d * h - e * g, det = a * A + b2 * B + c * Cc;
    return [[A / det, -(b2 * i2 - c * h) / det, (b2 * f - c * e) / det], [B / det, (a * i2 - c * g) / det, -(a * f - c * d) / det], [Cc / det, -(a * h - b2 * g) / det, (a * e - b2 * d) / det]]; };
  const Mi = inv(Cv.map((r, ri) => r.map((x, ci) => x + (ri === ci ? 1e-7 : 0))));
  let nv = [0.3, 0.1, 0.9]; for (let it = 0; it < 40; it++) { const q = Mi.map((r) => r[0] * nv[0] + r[1] * nv[1] + r[2] * nv[2]); const l = Math.hypot(...q); nv = q.map((x) => x / l); }
  log('FLAT', k.padEnd(10), 'flat normal (local)', nv.map((x) => x.toFixed(2)).join(','), '| extents along x,y,z', ['x', 'y', 'z'].map((_, j) => (Math.max(...H.map((v) => v[j])) - Math.min(...H.map((v) => v[j]))).toFixed(3)).join(','));
  const pca = 0.5 * Math.atan2(2 * sxz, sxx - szz) * 57.3;
  log('EDGE', k.padEnd(10), 'two', !!T.two, 'edge', !!T.edge, 'y', ylo.toFixed(2), yhi.toFixed(2), '| farthest from haft at', (Math.atan2(-fz, fx) * 57.3).toFixed(0) + '°', far.toFixed(3), 'm | head centroid at', (Math.atan2(-cz / n, cx / n) * 57.3).toFixed(0) + '°', Math.hypot(cx / n, cz / n).toFixed(3), '| widest axis', (-pca).toFixed(0) + '°');
}
