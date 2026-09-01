import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Falchion — a heavy single-edged cleaver-bladed sword, here rusted
 *  and time-eaten: pitted iron mottled with orange corrosion, a
 *  nicked edge, a recurved quillon guard and figural helmet-head
 *  pommel gone dark green with verdigris, the wire grip half unravelled.
 *  Modelled after an 18th-c. figured hunting hanger.
 *
 *  Local frame:  +Z = toward the point,  -Z = the pommel,
 *  +Y = the spine (edge faces -Y).  Origin at the guard.
 *  ~0.83 m overall.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function hash1(n) { const s = Math.sin(n * 91.37) * 47453.13; return s - Math.floor(s); }
function vnoise3(x, y, z) {
  const s = Math.sin(x * 12.9 + y * 47.1 + z * 21.7) * 43758.5;
  const t = Math.sin(x * 3.7 - y * 9.4 + z * 6.1) * 21894.3;
  return ((s - Math.floor(s)) * 0.6 + (t - Math.floor(t)) * 0.4);
}

// smooth tapered tube along a Catmull-Rom curve
function tube(points, rFn, radial = 7, tubular = 24, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]))));
  const pos = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const P = curve.getPointAt(t);
    curve.getTangentAt(t, T).normalize();
    if (Math.abs(T.dot(up)) > 0.98) up.set(1, 0, 0);
    N.crossVectors(up, T).normalize();
    B.crossVectors(T, N).normalize();
    up.copy(B);
    const r = rFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU;
      d.copy(N).multiplyScalar(Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      pos.push(P.x + d.x, P.y + d.y, P.z + d.z);
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) { const p = i * (radial + 1) + j, q = p + radial + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

function lathe(pts, seg, mat) {
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  return new THREE.Mesh(g, mat);
}

// ---- the blade: a lofted cleaver silhouette with a rusty vertex-colour wash
function makeBlade(mats) {
  const L = 0.60;            // length along +Z
  const STA = 72, RING = 5;  // stations, cross-section points
  const nick = [0.30, 0.44, 0.63, 0.78];   // where the edge is chipped

  const spineY = (t) => 0.014 - 0.005 * t * t - 0.006 * smooth(0.88, 1, t);
  const width = (t) => {
    let w = 0.048;
    w += 0.036 * Math.pow(smooth(0.40, 0.82, t), 1.4);          // belly swells out
    w *= 1 - Math.pow(clamp01((t - 0.84) / 0.16), 1.7);         // ... then sweeps up to the point
    for (const n of nick) w -= (0.007 + hash1(n * 40) * 0.007) * Math.exp(-((t - n) * (t - n)) / 0.00013);
    return Math.max(0.0025, w);
  };
  const halfThick = (t) => (0.0042 - 0.0026 * t) * (1 - Math.pow(clamp01((t - 0.8) / 0.2), 2) * 0.7);

  const pos = [], col = [], idx = [];
  const cSteel = new THREE.Color(0x44423f), cRust = new THREE.Color(0x5f3620), cRust2 = new THREE.Color(0x7a4526), cPit = new THREE.Color(0x1c130f);
  const _c = new THREE.Color(), _c2 = new THREE.Color();
  for (let i = 0; i < STA; i++) {
    const t = i / (STA - 1);
    const z = 0.006 + L * t;
    const sy = spineY(t), ey = sy - width(t), mid = sy - width(t) * 0.34, th = halfThick(t);
    // ring: spine+ , face+ , edge , face- , spine-
    const ring = [
      [th * 0.5, sy], [th, mid], [0, ey], [-th, mid], [-th * 0.5, sy],
    ];
    for (let j = 0; j < RING; j++) {
      const [rz, ry] = ring[j];
      pos.push(rz, ry, z);
      // corrosion: broad rust field + scattered bright-orange scale + dark pits;
      // clean steel only survives in a few worn patches
      const big = vnoise3(z * 2.4, ry * 6, 3);
      let rust = 0.5 + 0.45 * vnoise3(rz * 34, ry * 34, z * 8) + 0.2 * big;
      const scale = Math.pow(clamp01(vnoise3(rz * 55, ry * 20, z * 14) * 1.5 - 0.55), 1.6);
      const pit = Math.pow(clamp01(vnoise3(rz * 90, ry * 40, z * 26) * 1.5 - 0.6), 2) * 1.8;
      const worn = Math.pow(clamp01(big * 1.7 - 1.0), 2);   // rare clean steel
      _c.copy(cSteel).lerp(cRust, clamp01(rust));
      _c.lerp(cRust2, scale * 0.7);
      _c.lerp(cPit, clamp01(pit));
      _c.lerp(_c2.copy(cSteel).multiplyScalar(1.15), worn);
      col.push(_c.r, _c.g, _c.b);
    }
  }
  for (let i = 0; i < STA - 1; i++)
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j, b = i * RING + (j + 1) % RING;
      const c = a + RING, d = b + RING;
      idx.push(a, c, b, b, c, d);
    }
  // cap the base and the tip
  const base0 = 0, tip0 = (STA - 1) * RING;
  idx.push(base0, base0 + 1, base0 + 4, base0 + 1, base0 + 3, base0 + 4, base0 + 1, base0 + 2, base0 + 3);
  idx.push(tip0, tip0 + 4, tip0 + 1, tip0 + 1, tip0 + 4, tip0 + 3, tip0 + 1, tip0 + 3, tip0 + 2);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mats.blade);
}

export function makeFalchion() {
  const s = new THREE.Group();
  s.name = 'falchion';

  const mats = {
    blade:  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.35, emissive: 0x161009, flatShading: false }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x6b5732, roughness: 0.66, metalness: 0.62, emissive: 0x1c160c }),
    verd:   new THREE.MeshStandardMaterial({ color: 0x4a6349, roughness: 0.95, metalness: 0.06, emissive: 0x18221a }),
    wire:   new THREE.MeshStandardMaterial({ color: 0x4a4128, roughness: 0.8, metalness: 0.35, emissive: 0x120f08 }),
    grip:   new THREE.MeshStandardMaterial({ color: 0x2b2419, roughness: 0.95, metalness: 0.05, emissive: 0x0b0906 }),
    stamp:  new THREE.MeshStandardMaterial({ color: 0x140f0c, roughness: 1.0, metalness: 0.1 }),
  };

  // ---- blade ----
  s.add(makeBlade(mats));
  // a corroded maker's stamp sunk into the ricasso
  const stamp = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.010, 0.014), mats.stamp);
  stamp.position.set(0.0034, 0.003, 0.055);
  s.add(stamp);

  // ---- guard: a recurved cross with scrolled tips + a forward branch ----
  const boss = lathe([[0, -0.016], [0.010, -0.016], [0.013, -0.006], [0.013, 0.010], [0.009, 0.017], [0, 0.017]], 12, mats.bronze);
  boss.scale.z = 0.62;
  s.add(boss);
  const qR = (t) => 0.0075 * (1 - t * 0.7) + 0.0012;
  // quillon sweeping toward the point, ending in a scroll
  s.add(tube([
    [0.006, 0.002, 0.004], [0.055, -0.004, 0.018], [0.085, 0.006, 0.030],
    [0.092, 0.020, 0.024], [0.083, 0.028, 0.012], [0.076, 0.022, 0.006],
  ], qR, 7, 26, mats.bronze));
  // quillon sweeping back toward the pommel, ending in a scroll
  s.add(tube([
    [-0.006, 0.002, -0.004], [-0.055, -0.002, -0.020], [-0.085, -0.014, -0.030],
    [-0.093, -0.030, -0.022], [-0.084, -0.038, -0.008], [-0.077, -0.030, -0.002],
  ], qR, 7, 26, mats.bronze));
  // small forward finger-branch curl
  s.add(tube([
    [0.010, -0.006, 0.010], [0.028, -0.024, 0.020], [0.030, -0.040, 0.010], [0.020, -0.044, -0.002],
  ], (t) => 0.004 * (1 - t) + 0.001, 6, 16, mats.bronze));

  // ---- grip: a slightly waisted barrel with a corroded wire wrap ----
  const grip = lathe([
    [0, -0.020], [0.010, -0.020], [0.0115, -0.010], [0.0100, 0.030], [0.0120, 0.070], [0.0105, 0.088], [0, 0.090],
  ], 14, mats.grip);
  grip.position.z = -0.001;
  grip.rotation.x = -Math.PI / 2;                 // lathe Y-axis → run the grip along -Z
  grip.position.z = -0.020;
  grip.scale.z = -1;                              // point it toward the pommel (-Z)
  s.add(grip);
  // helical wire — a few turns missing where it has rotted through
  const turns = 8, wpts = [];
  for (let i = 0; i <= turns * 8; i++) {
    const u = i / (turns * 8);
    const gz = -0.024 - u * 0.066;
    const rr = 0.0116 - Math.abs(u - 0.5) * 0.003;
    const a = u * turns * TAU;
    wpts.push([Math.cos(a) * rr, Math.sin(a) * rr, gz]);
  }
  const wire = tube(wpts, () => 0.0016, 5, wpts.length - 1, mats.wire);
  s.add(wire);

  // ---- pommel: a cast helmeted head in profile, worn smooth and green ----
  const P = new THREE.Group();
  P.position.set(0, 0.001, -0.108);
  s.add(P);
  const neck = lathe([[0, -0.014], [0.011, -0.014], [0.012, -0.004], [0.009, 0.004], [0, 0.005]], 12, mats.bronze);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = 0.012;
  P.add(neck);
  // the head (faces -X, i.e. the "profile" looks along -X)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.016, 20, 16), mats.bronze);
  head.scale.set(1.0, 1.1, 0.78);
  P.add(head);
  // jaw / chin
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), mats.bronze);
  jaw.scale.set(1.1, 0.7, 0.8);
  jaw.position.set(-0.009, -0.012, 0);
  P.add(jaw);
  // brow ridge + nose, jutting forward on the -X side
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.005, 0.010), mats.bronze);
  brow.position.set(-0.014, 0.004, 0); brow.rotation.z = -0.25;
  P.add(brow);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.009, 6), mats.bronze);
  nose.rotation.z = -Math.PI / 2 - 0.2;
  nose.position.set(-0.019, -0.001, 0);
  P.add(nose);
  // helmet dome over the crown + a swept crest fin
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12, 0, TAU, 0, Math.PI * 0.62), mats.bronze);
  helm.scale.set(1.06, 0.95, 0.82);
  helm.position.set(0.001, 0.006, 0);
  P.add(helm);
  const crest = tube([
    [0.006, 0.020, 0], [0.001, 0.028, 0], [-0.009, 0.024, 0], [-0.016, 0.012, 0], [-0.019, 0.0, 0],
  ], (t) => 0.007 * Math.sin(Math.PI * clamp01(t * 0.9 + 0.05)) + 0.0012, 4, 20, mats.bronze);
  crest.scale.z = 0.4;
  P.add(crest);
  // neck-guard flare at the back of the helmet
  const flare = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.016), mats.bronze);
  flare.position.set(0.014, -0.004, 0); flare.rotation.z = 0.4;
  P.add(flare);
  // top rivet where it caps the tang
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 6), mats.bronze);
  rivet.position.set(0.004, 0.020, 0);
  P.add(rivet);

  // ---- verdigris blotches stuck to the fittings ----
  const blotchGeo = new THREE.SphereGeometry(1, 7, 5);
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(blotchGeo, mats.verd);
    const pick = hash1(i * 3 + 1);
    const r = 0.003 + hash1(i * 7) * 0.005;
    b.scale.set(r, r * 0.4, r);
    if (pick < 0.4) b.position.set((hash1(i) - 0.5) * 0.16, 0.006 + hash1(i + 9) * 0.01, (hash1(i + 2) - 0.5) * 0.05);
    else if (pick < 0.75) b.position.set((hash1(i) - 0.5) * 0.02, -0.015 + hash1(i + 4) * 0.03, -0.02 - hash1(i + 5) * 0.06);
    else b.position.set((hash1(i) - 0.5) * 0.03, hash1(i + 1) * 0.02 - 0.004, -0.10 - hash1(i + 6) * 0.035);
    b.rotation.set(hash1(i) * 3, hash1(i + 1) * 3, hash1(i + 2) * 3);
    s.add(b);
  }

  return s;
}

export function makeFalchionIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  g.save();
  g.translate(24, 24); g.rotate(-Math.PI / 4); g.translate(-24, -24);
  // blade
  const grd = g.createLinearGradient(24, 4, 24, 34);
  grd.addColorStop(0, '#7a4326'); grd.addColorStop(0.5, '#5a4a44'); grd.addColorStop(1, '#6e3b22');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(21, 4); g.lineTo(27, 4); g.lineTo(29, 22);
  g.quadraticCurveTo(30, 30, 24, 33); g.quadraticCurveTo(20, 30, 21, 22); g.closePath();
  g.fill();
  // pits
  g.fillStyle = 'rgba(20,12,10,0.6)';
  for (let i = 0; i < 6; i++) g.fillRect(21 + Math.random() * 7, 6 + Math.random() * 24, 1.5, 1.5);
  // guard
  g.fillStyle = '#54462a';
  g.fillRect(17, 34, 14, 3);
  g.beginPath(); g.arc(16, 35, 2, 0, Math.PI * 2); g.arc(32, 35, 2, 0, Math.PI * 2); g.fill();
  // grip + pommel
  g.fillStyle = '#3f3826'; g.fillRect(22, 37, 4, 7);
  g.fillStyle = '#41573f'; g.beginPath(); g.arc(24, 45, 3, 0, Math.PI * 2); g.fill();
  g.restore();
  return c.toDataURL();
}
