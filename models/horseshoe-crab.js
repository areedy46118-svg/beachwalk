import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Horseshoe crab (Limulus) — a detailed, smooth-shaded model.
 *
 *  The carapace is a Cartesian-grid dome (no pole → clean sculpting)
 *  with the cardiac + ophthalmic ridges, the raised margin and the
 *  articulation groove all sculpted into the height field. A wavy
 *  hinge bar, six movable spines per side, a triangular telson, six
 *  leg pairs and the full underside are added on top. Mottled shell
 *  texture. ~life-sized (~0.42 m across, ~0.6 m with the tail).
 *
 *  Local frame:  +Y up,  +Z = forward (rounded head end),
 *  -Z = the telson.  Underside sits at y ≈ 0, rests carapace-up.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function distToSeg(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - a[0]) * dx + (pz - a[1]) * dz) / L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}
function distToLine(px, pz, line) {
  let m = Infinity;
  for (let k = 0; k < line.length - 1; k++) m = Math.min(m, distToSeg(px, pz, line[k], line[k + 1]));
  return m;
}
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// smooth interpolated value noise
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

// A domed shell on a Cartesian grid — smooth, poleless, so ridges and the
// raised margin can be sculpted straight into the height field. Boundary
// verts snap onto the ellipse for a clean edge; a short skirt drops to y=0.
function domeField(rx, ry, rz, opts = {}) {
  const {
    cell = 0.0035, flat = 0.60, taperBack = 0,
    ridges = [], margin = 0, marginAt = 0.82, groove = null, bump = 0, lobes = [],
  } = opts;
  const nx = Math.ceil((2 * rx) / cell), nz = Math.ceil((2 * rz) / cell);
  const pos = [], uv = [], index = [], grid = [];
  let count = 0;

  const reshape = (x, z) => {
    let sx = x, sz = z;
    const zn = z / rz;
    if (taperBack) sx *= 1 - taperBack * Math.max(0, -zn);
    return [sx, sz];
  };
  const heightAt = (sx, sz) => {
    const e = (sx / rx) ** 2 + (sz / rz) ** 2;
    let y = ry * Math.pow(Math.max(0, 1 - e), flat);
    const inner = smoothstep(1.0, 0.55, e);           // 1 well inside → 0 at rim
    if (bump) y += (vnoise(sx * 26 + 40, sz * 26 + 40) - 0.5) * 2 * bump * inner;
    for (const rg of ridges) {
      const d = distToLine(sx, sz, rg.line);
      y += rg.h * Math.exp(-(d * d) / (rg.w * rg.w)) * inner;
    }
    for (const lb of lobes)
      y += lb.h * Math.exp(-(((sx - lb.x) / lb.wx) ** 2 + ((sz - lb.z) / lb.wz) ** 2)) * inner;
    if (margin)                                        // a raised welt just inside the edge
      y += margin * Math.exp(-((Math.sqrt(e) - marginAt) ** 2) / 0.006) * smoothstep(1.05, 0.45, e);
    if (groove) {                                      // sunken articulation line
      const d = distToLine(sx, sz, groove.line);
      y -= groove.d * Math.exp(-(d * d) / (groove.w * groove.w)) * inner;
    }
    return y;
  };

  for (let iz = 0; iz <= nz; iz++) {
    grid[iz] = [];
    for (let ix = 0; ix <= nx; ix++) {
      const [sx, sz] = reshape(-rx + (2 * rx * ix) / nx, -rz + (2 * rz * iz) / nz);
      if ((sx / rx) ** 2 + (sz / rz) ** 2 > 1) { grid[iz][ix] = -1; continue; }
      grid[iz][ix] = count++;
      pos.push(sx, heightAt(sx, sz), sz);
      uv.push((sx / rx + 1) / 2, (sz / rz + 1) / 2);
    }
  }
  // snap edge verts onto the ellipse
  const nbo = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let iz = 0; iz <= nz; iz++)
    for (let ix = 0; ix <= nx; ix++) {
      const vi = grid[iz][ix];
      if (vi < 0) continue;
      let edge = false;
      for (const [dx, dz] of nbo) { const row = grid[iz + dz]; const n = row ? row[ix + dx] : undefined; if (n === undefined || n < 0) { edge = true; break; } }
      if (!edge) continue;
      const sx = pos[vi * 3], sz = pos[vi * 3 + 2];
      const f = 1 / Math.sqrt((sx / rx) ** 2 + (sz / rz) ** 2 || 1);
      pos[vi * 3] = sx * f; pos[vi * 3 + 2] = sz * f; pos[vi * 3 + 1] = 0.004;
    }
  for (let iz = 0; iz < nz; iz++)
    for (let ix = 0; ix < nx; ix++) {
      const a = grid[iz][ix], b = grid[iz][ix + 1], c = grid[iz + 1][ix], d = grid[iz + 1][ix + 1];
      if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      index.push(a, c, b, b, c, d);
    }
  // skirt: every boundary edge straight down to y = 0
  const ec = new Map(), key = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  for (let t = 0; t < index.length; t += 3) {
    const tri = [index[t], index[t + 1], index[t + 2]];
    for (let e = 0; e < 3; e++) { const k = key(tri[e], tri[(e + 1) % 3]); ec.set(k, (ec.get(k) || 0) + 1); }
  }
  const rimBase = new Map();
  const baseOf = (vi) => { if (rimBase.has(vi)) return rimBase.get(vi); const ni = count++; pos.push(pos[vi * 3], 0, pos[vi * 3 + 2]); uv.push(0, 0); rimBase.set(vi, ni); return ni; };
  for (const [k, c] of ec) if (c === 1) { const [a, b] = k.split('_').map(Number); const a2 = baseOf(a), b2 = baseOf(b); index.push(a, a2, b, b, a2, b2); }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// smooth tapered tube along a Catmull-Rom curve (parallel-transport frame)
function taperedTube(points, rFn, radial = 8, tubular = 22) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]))));
  const pos = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const T = new THREE.Vector3(), Nr = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const P = curve.getPointAt(t);
    curve.getTangentAt(t, T).normalize();
    if (Math.abs(T.dot(up)) > 0.98) up.set(1, 0, 0);
    Nr.crossVectors(up, T).normalize();
    B.crossVectors(T, Nr).normalize();
    up.copy(B);
    const r = rFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU;
      d.copy(Nr).multiplyScalar(Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      pos.push(P.x + d.x, P.y + d.y, P.z + d.z);
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function lens(w, dep, thick) { const g = new THREE.SphereGeometry(1, 22, 10); g.scale(w, thick, dep); return g; }
function bellyPlug(rx, rz) { const g = new THREE.SphereGeometry(1, 40, 16, 0, TAU, 0, Math.PI / 2); g.scale(rx, 0.03, rz); g.rotateX(Math.PI); return g; }
function rimBead(rx, rz, tube) { const g = new THREE.TorusGeometry(1, tube, 8, 120); g.rotateX(Math.PI / 2); g.scale(rx, 1, rz); return g; }

export function makeHorseshoeCrab() {
  const crab = new THREE.Group();
  crab.name = 'horseshoeCrab';

  const shell    = new THREE.MeshStandardMaterial({ color: 0x7c6f50, roughness: 0.62, metalness: 0.05, emissive: 0x171821, side: THREE.DoubleSide, flatShading: false });
  const shellIn  = new THREE.MeshStandardMaterial({ color: 0x2b261d, roughness: 0.9, metalness: 0.02, emissive: 0x0b0c10, side: THREE.DoubleSide });
  const hingeMat = new THREE.MeshStandardMaterial({ color: 0x413622, roughness: 0.55, metalness: 0.12, emissive: 0x120f0a });
  const spineMat = new THREE.MeshStandardMaterial({ color: 0x5a4d33, roughness: 0.45, metalness: 0.14, emissive: 0x130f0a });
  const legMat   = new THREE.MeshStandardMaterial({ color: 0x3b3327, roughness: 0.55, metalness: 0.08, emissive: 0x0c0d11 });
  const gillMat  = new THREE.MeshStandardMaterial({ color: 0x99906f, roughness: 0.92, metalness: 0, emissive: 0x1f1e18, side: THREE.DoubleSide });
  const operMat  = new THREE.MeshStandardMaterial({ color: 0x51482f, roughness: 0.8, metalness: 0.03, emissive: 0x121109 });
  const eyeMat   = new THREE.MeshStandardMaterial({ color: 0x120d08, roughness: 0.18, metalness: 0.35 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1c1710, roughness: 0.7 });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const HINGE_Z = -0.118;

  // ---- head shield: broad rounded dome with sculpted ridges + margin ----
  const ophR = [[0.012, 0.070], [0.036, 0.030], [0.062, -0.014], [0.082, -0.052], [0.092, -0.088]];
  const prosoma = new THREE.Mesh(domeField(0.214, 0.052, 0.166, {
    flat: 0.5, taperBack: 0.05, bump: 0.0016,
    margin: 0.011, marginAt: 0.9,
    ridges: [
      { line: [[0, 0.030], [0, -0.03], [0, -0.092]], h: 0.016, w: 0.015 },         // cardiac
      { line: ophR, h: 0.011, w: 0.013 },                                          // ophthalmic R
      { line: ophR.map(([x, z]) => [-x, z]), h: 0.011, w: 0.013 },                 // ophthalmic L
    ],
    groove: { line: [[-0.17, -0.10], [0, -0.086], [0.17, -0.10]], d: 0.010, w: 0.011 },
  }), shell);
  crab.add(prosoma);
  const prosomaBelly = new THREE.Mesh(bellyPlug(0.208, 0.162), shellIn);
  prosomaBelly.position.y = 0.012;
  crab.add(prosomaBelly);
  const prosomaRim = new THREE.Mesh(rimBead(0.212, 0.164, 0.0045), shell);
  prosomaRim.position.y = 0.004;
  crab.add(prosomaRim);

  // ---- rear plate: smaller dome, lengthwise lobes, tucked under the hinge --
  const opistho = new THREE.Mesh(domeField(0.132, 0.030, 0.110, {
    flat: 0.62, taperBack: 0.34, bump: 0.0016, margin: 0.006, marginAt: 0.8,
    lobes: [
      { x: 0, z: -0.02, wx: 0.03, wz: 0.07, h: 0.012 },
      { x: 0.052, z: -0.02, wx: 0.024, wz: 0.06, h: 0.009 },
      { x: -0.052, z: -0.02, wx: 0.024, wz: 0.06, h: 0.009 },
    ],
  }), shell);
  opistho.position.set(0, -0.014, -0.150);
  crab.add(opistho);
  const opisthoBelly = new THREE.Mesh(bellyPlug(0.128, 0.106), shellIn);
  opisthoBelly.position.set(0, 0.0, -0.150);
  crab.add(opisthoBelly);
  const opisthoRim = new THREE.Mesh(rimBead(0.130, 0.108, 0.0038), shell);
  opisthoRim.position.set(0, -0.014, -0.150);
  crab.add(opisthoRim);

  // ---- the wavy hinge bar between the two plates ------------------------
  crab.add(new THREE.Mesh(taperedTube([
    V(-0.150, 0.030, HINGE_Z - 0.006), V(-0.075, 0.041, HINGE_Z + 0.004),
    V(0, 0.044, HINGE_Z - 0.004), V(0.075, 0.041, HINGE_Z + 0.004),
    V(0.150, 0.030, HINGE_Z - 0.006),
  ], (t) => 0.009 * (0.7 + 0.3 * Math.sin(t * 12)) + 0.002, 8, 40), hingeMat));

  crab.updateMatrixWorld(true);
  const _ray = new THREE.Raycaster();
  const _down = new THREE.Vector3(0, -1, 0);
  const seat = (x, z, off = 0) => {
    _ray.set(new THREE.Vector3(x, 3, z), _down);
    let y = -1;
    for (const t of [prosoma, opistho]) { const h = _ray.intersectObject(t, false)[0]; if (h && h.point.y > y) y = h.point.y; }
    return (y < 0 ? 0.02 : y) + off;
  };

  // ---- compound eyes: small glossy bumps on the ophthalmic ridges
  for (const side of [-1, 1]) {
    const ex = side * 0.086, ez = -0.050;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), eyeMat);
    eye.scale.set(0.0075, 0.0055, 0.014);
    eye.position.set(ex, seat(ex, ez, -0.0015), ez);
    eye.rotation.set(0.1, side * 0.55, side * 0.4);
    crab.add(eye);
  }
  // median ocelli — two tiny dots up front on the cardiac ridge
  for (const side of [-1, 1]) {
    const oc = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), eyeMat);
    oc.position.set(side * 0.006, seat(side * 0.006, 0.060, 0.0), 0.060);
    crab.add(oc);
  }

  // ---- genal spines: the shield's rear corners drawn into flat points ---
  for (const side of [-1, 1]) {
    const y0 = seat(side * 0.150, -0.086, -0.006);
    crab.add(new THREE.Mesh(taperedTube([
      V(side * 0.150, y0, -0.086),
      V(side * 0.154, y0 * 0.7 + 0.004, -0.146),
      V(side * 0.146, y0 * 0.42 + 0.003, -0.208),
      V(side * 0.124, y0 * 0.2 + 0.002, -0.256),
    ], (t) => 0.013 * (1 - t) + 0.001, 8, 20), spineMat));
  }

  // ---- six movable spines per side along the rear-plate margin ---------
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const bx = side * (0.120 - t * 0.052), bz = -0.100 - t * 0.116;
      const by = seat(bx, bz, -0.003);
      crab.add(new THREE.Mesh(taperedTube([
        V(bx, by, bz),
        V(bx + side * 0.010, by * 0.7 + 0.004, bz - 0.014),
        V(bx + side * 0.016, by * 0.4 + 0.003, bz - 0.034 - t * 0.010),
      ], (u) => (0.0085 - t * 0.0022) * (1 - u) + 0.0007, 6, 10), spineMat));
    }

  // ---- telson: a long triangular spike, trailing low -----------------
  crab.add(new THREE.Mesh(taperedTube([
    V(0, 0.020, -0.238), V(0, 0.022, -0.340),
    V(0, 0.024, -0.460), V(0, 0.026, -0.590),
  ], (t) => 0.019 * Math.pow(1 - t, 1.05) + 0.0016, 3, 44), spineMat));

  // ---- six pairs of smooth swept legs on the underside --------------
  function buildLeg(x0, z0, dir, len, kind) {
    const g = new THREE.Group();
    const drop = kind === 'pusher' ? 0.8 : 1.0;
    const path = [
      V(x0, -0.005, z0),
      V(x0 + dir * 0.040 * len, -0.022, z0 + 0.003),
      V(x0 + dir * 0.078 * len, -0.048 * drop, z0 - 0.004),
      V(x0 + dir * 0.066 * len, -0.082 * drop, z0 - 0.012),
      V(x0 + dir * 0.042 * len, -0.110 * drop, z0 - 0.004),
    ];
    const r0 = kind === 'chelicera' ? 0.0072 : 0.0115;
    g.add(new THREE.Mesh(taperedTube(path, (t) => r0 * (1 - t * 0.7) + 0.0026, 8, 20), legMat));
    const knee = new THREE.Mesh(new THREE.SphereGeometry(r0 * 0.82, 9, 7), legMat);
    knee.position.copy(path[2]); g.add(knee);
    const tip = path[4], into = tip.clone().sub(path[3]).normalize();
    if (kind === 'pusher') {
      const leaf = new THREE.Mesh(lens(0.026, 0.04, 0.004), legMat);
      leaf.position.copy(tip).addScaledVector(into, 0.021);
      leaf.quaternion.setFromUnitVectors(V(0, 0, 1), into); g.add(leaf);
      for (let f = -1; f <= 1; f++)
        g.add(new THREE.Mesh(taperedTube([
          tip, tip.clone().addScaledVector(into, 0.022).add(V(f * 0.010, -0.004, 0)),
          tip.clone().addScaledVector(into, 0.042).add(V(f * 0.016, -0.010, 0)),
        ], (t) => 0.0026 * (1 - t) + 0.0006, 5, 8), legMat));
    } else {
      const span = kind === 'chelicera' ? 0.012 : 0.021;
      for (const s of [-1, 1])
        g.add(new THREE.Mesh(taperedTube([
          tip, tip.clone().addScaledVector(into, span * 0.55).add(V(s * span * 0.42, -0.003, 0)),
          tip.clone().addScaledVector(into, span).add(V(s * span * 0.1, -0.001, 0)),
        ], (t) => 0.0034 * (1 - t) + 0.0007, 6, 9), legMat));
    }
    return g;
  }
  const legRows = [
    { z: 0.078, out: 0.50, len: 0.78, kind: 'chelicera' },
    { z: 0.048, out: 0.80, len: 0.92, kind: 'walk' },
    { z: 0.016, out: 0.92, len: 1.02, kind: 'walk' },
    { z: -0.016, out: 0.94, len: 1.02, kind: 'walk' },
    { z: -0.048, out: 0.86, len: 0.92, kind: 'walk' },
    { z: -0.076, out: 0.72, len: 0.84, kind: 'pusher' },
  ];
  for (const r of legRows)
    for (const side of [-1, 1]) crab.add(buildLeg(side * 0.020, r.z, side * r.out, r.len, r.kind));

  // ---- mouth, operculum, book gills ---------------------------------
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), mouthMat);
  mouth.scale.set(1, 0.4, 1.5); mouth.position.set(0, -0.009, 0.016);
  crab.add(mouth);
  const oper = new THREE.Mesh(lens(0.06, 0.042, 0.005), operMat);
  oper.rotation.x = -0.24; oper.position.set(0, -0.013, -0.100);
  crab.add(oper);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const gill = new THREE.Mesh(lens(0.064 - t * 0.02, 0.025, 0.003), gillMat);
    gill.rotation.x = -0.44 - t * 0.04;
    gill.position.set(0, -0.012 - t * 0.0034, -0.140 - t * 0.024);
    crab.add(gill);
  }

  return crab;
}

export function makeHorseshoeCrabIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 4, 0, 40);
  grd.addColorStop(0, '#8b7c58'); grd.addColorStop(1, '#5a4e39');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(24, 4);
  g.bezierCurveTo(42, 5, 44, 21, 38, 29);
  g.lineTo(34, 26);
  g.bezierCurveTo(36, 33, 31, 37, 24, 37);
  g.bezierCurveTo(17, 37, 12, 33, 14, 26);
  g.lineTo(10, 29);
  g.bezierCurveTo(4, 21, 6, 5, 24, 4);
  g.fill();
  g.strokeStyle = '#40371f'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(24, 12); g.lineTo(24, 30); g.stroke();
  g.strokeStyle = '#463c22'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(24, 33); g.lineTo(24, 47); g.stroke();
  return c.toDataURL();
}
