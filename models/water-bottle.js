import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  THE BOTTLE OF WATER IS A FIJI BOTTLE (2026-11-21, the owner: "use this as the water bottle model make it full of water
 *  and will slosh around when held or drank or inspected. make the fiji label face you when holding"). "Fiji Water Bottle"
 *  by Diego T. Yamaguchi (Sketchfab, CC-BY-4.0, credited in README), packed by `tools/fiji_bottle_pack.py` into
 *  `assets/fiji-bottle.glb`: standing up +Y, its base at y = 0, 0.205 m tall (the old bottle's height, so every hand, floor
 *  and box that held one holds this), the FIJI label facing +Z.
 *
 *  `makeWaterBottle()` hands back a group at once (it is asked for while the module is still loading, long before any model
 *  is in); it is filled when `setWaterBottleSource(scene)` is given the loaded model — every one made so far, and every one
 *  after at once. A copy taken (`clone`) of an empty one is empty: the hand's is made again (`holdable`'s `make`).
 *
 *  THE WATER is the bottle's own clear shell drawn a little inside itself, cut off above a level surface (a plane in the
 *  bottle's own frame, `uPlane`), its inner faces drawn as that surface. The surface is a spring: it wants to lie level
 *  under the scene's gravity (and under the bottle's own acceleration — swung, it lags and runs up the far wall, and
 *  stopped, it rocks back past level and settles), so tipping, turning, carrying, drinking and the inspect's drag all
 *  slosh it. Each copy keeps its OWN state and its own material (the first draw of a copy that shares one makes it its own:
 *  three only re-sends a material's values when the material changes from the last draw). The scene's gravity is asked of
 *  `setWaterGravity` (the hand's scene is drawn in the camera's frame).
 *
 *  group.userData.setFill(t)   // 0 = empty, 1 = full
 *  group.userData.parts        // { water } (and { cap, label } once filled)
 * ------------------------------------------------------------------ */

const H = 0.205;          // overall height (the pack's, and the old bottle's)
const FULL_Y = 0.168;     // the water's level at full, in the bottle's frame (below the shoulder)
const BASE_Y = 0.006;     // and at empty
let SRC = null;                                   // the loaded bottle (`setWaterBottleSource`)
const waiting = [];                               // groups made before it was in
let gravityOf = () => null;                       // (scene) => the down direction in that scene's frame, or null for -Y
export function setWaterGravity(fn) { gravityOf = fn; }
/* (AND IT SOUNDS, 2026-11-21, the owner: "give it subtle sloshing sounds": when the surface swings hard — the spring's own speed
 * past `SLOSH_HEARD`, rising — the game is told how hard (0..1), at most every `SLOSH_GAP` s a bottle; the game plays it) */
const SLOSH_HEARD = 2.2, SLOSH_GAP = 0.32;
let sloshHeard = () => {};
export function setWaterSloshSound(fn) { sloshHeard = fn; }

export function setWaterBottleSource(scene) {
  SRC = scene;
  for (const b of waiting.splice(0)) fill(b);
}

export function makeWaterBottle() {
  const b = new THREE.Group();
  b.name = 'waterBottle';
  const water = new THREE.Mesh(new THREE.BufferGeometry(), makeWaterMat());
  water.name = 'water'; water.renderOrder = 1; water.frustumCulled = false;
  /* (`bwKeepHidden` only until the bottle is in (`fill`): before that it is the one mesh of the group, and an icon taken then
   * is of nothing. After it, always drawn — an empty bottle is a plane under all of it, `slosh` — because the pack's and the
   * shop's renders of a thing leave a flagged part out, and the bottle came up empty there: 2026-11-21, the owner: "the water
   * should still be full in the pack and store like how it is on inspect") */
  water.userData.bwKeepHidden = true;
  b.add(water);
  b.userData.setFill = (t) => {
    t = Math.max(0, Math.min(1, t));
    water.userData.fill = t;
  };
  b.userData.parts = { water };
  b.userData.setFill(0.94);
  if (SRC) fill(b); else waiting.push(b);
  return b;
}

function fill(b) {
  if (b.userData.filled) return;
  b.userData.filled = true;
  const water = b.userData.parts.water;
  SRC.traverse((o) => {
    if (!o.isMesh) return;
    const m = new THREE.Mesh(o.geometry, o.material);
    m.name = 'fiji ' + o.name; m.renderOrder = /transparent/.test(o.name) ? 2 : 3;
    b.add(m);
  });
  water.userData.bwKeepHidden = false; water.visible = true;
  if (!water.geometry.attributes.position) water.geometry = waterShape().geo;   // (the shape stays off `userData`: a copy serialises that)
  b.userData.parts.label = b.getObjectByName('fiji fiji_label');
  b.userData.parts.cap = b.getObjectByName('fiji cap_bottle_cap');
}

/* THE WATER IS THE BOTTLE'S OWN INSIDE (2026-11-21, the owner: "the water is sloshing out of the bottle and when i turn it around
 * it gets less water ... let the water perfectly match the container"). Made once from the loaded model and shared by every
 * copy: from the bottle's axis, rays out level at RINGS heights x SEGS bearings, against the clear shell AND the label cards
 * (the shell has no plastic behind its labels), the nearest hit each — the inner wall, everywhere, the shoulder and the neck
 * with it — drawn in by the wall's thickness. Those rings, closed top and bottom, are the water's skin: it can never stand
 * outside the plastic. And a fixed cloud of points evenly filling that skin (`pts`) is its volume: the surface is put each
 * frame where the right share of them lies under it (`slosh`), so however the bottle is turned it holds the same water. */
const RINGS = 40, SEGS = 32, WALL = 0.0016, NPTS = 3000;
let SHAPE = null;
function waterShape() {
  if (SHAPE) return SHAPE;
  const hit = [];
  // (each part's geometry as it is, untransformed: `fill` draws them so)
  SRC.traverse((o) => { if (o.isMesh && /transparent[ _]bottle|label/.test(o.name)) { const m = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.updateMatrixWorld(true); hit.push(m); } });
  const bb = new THREE.Box3(); for (const m of hit) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox); }
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, rc = new THREE.Raycaster(), o = new THREE.Vector3(), d = new THREE.Vector3();
  const y0 = bb.min.y + 0.004, y1 = bb.max.y - 0.004, R = [];
  let top = -1;
  for (let j = 0; j < RINGS; j++) {
    const y = y0 + (y1 - y0) * j / (RINGS - 1), ring = [];
    for (let i = 0; i < SEGS; i++) {
      const a = i / SEGS * Math.PI * 2; o.set(cx, y, cz); d.set(Math.cos(a), 0, Math.sin(a));
      rc.set(o, d); rc.far = 0.2; const h = rc.intersectObjects(hit, false)[0];
      ring.push(h ? Math.max(0.002, h.distance - WALL) : -1);
    }
    if (ring.filter((r) => r < 0).length > SEGS / 4) { if (j > 2) break; else continue; }   // (past the mouth: the water stops under the cap)
    for (let i = 0; i < SEGS; i++) if (ring[i] < 0) { let k = 1; while (ring[(i + k) % SEGS] < 0 && ring[(i - k + SEGS) % SEGS] < 0) k++; ring[i] = Math.max(ring[(i + k) % SEGS], ring[(i - k + SEGS) % SEGS]); }
    R.push({ y, r: ring }); top = y;
  }
  // (smoothed round each ring and between rings: a ray through a seam between cards is not the wall)
  for (const q of R) { const r = q.r.slice(); for (let i = 0; i < SEGS; i++) q.r[i] = Math.min(r[i], (r[(i + 1) % SEGS] + r[(i - 1 + SEGS) % SEGS] + 2 * r[i]) / 4); }
  // the skin
  const P = [], I = [];
  for (const q of R) for (let i = 0; i < SEGS; i++) { const a = i / SEGS * Math.PI * 2; P.push(cx + Math.cos(a) * q.r[i], q.y, cz + Math.sin(a) * q.r[i]); }
  for (let j = 0; j < R.length - 1; j++) for (let i = 0; i < SEGS; i++) {
    const a = j * SEGS + i, b2 = j * SEGS + (i + 1) % SEGS, c = a + SEGS, e = b2 + SEGS; I.push(a, c, b2, b2, c, e);
  }
  const bot = P.length / 3; P.push(cx, R[0].y, cz); const tp = bot + 1; P.push(cx, top, cz);
  const L = (R.length - 1) * SEGS;
  for (let i = 0; i < SEGS; i++) { I.push(bot, i, (i + 1) % SEGS); I.push(tp, L + (i + 1) % SEGS, L + i); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
  // its volume: points evenly through it (a fixed seed, so every load is the same water)
  let sd = 1234567; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const rAt = (y, a) => {
    const fj = (y - R[0].y) / (top - R[0].y) * (R.length - 1); if (fj < 0 || fj > R.length - 1) return -1;
    const j = Math.min(R.length - 2, Math.floor(fj)), u = fj - j, fi = ((a / (Math.PI * 2)) % 1 + 1) % 1 * SEGS, i = Math.floor(fi) % SEGS, v = fi - Math.floor(fi), i2 = (i + 1) % SEGS;
    return (R[j].r[i] * (1 - v) + R[j].r[i2] * v) * (1 - u) + (R[j + 1].r[i] * (1 - v) + R[j + 1].r[i2] * v) * u;
  };
  let rmax = 0; for (const q of R) for (const r of q.r) rmax = Math.max(rmax, r);
  const pts = new Float32Array(NPTS * 3); let n = 0;
  while (n < NPTS) {
    const x = (rnd() * 2 - 1) * rmax, z = (rnd() * 2 - 1) * rmax, y = R[0].y + rnd() * (top - R[0].y);
    if (Math.hypot(x, z) > rAt(y, Math.atan2(z, x))) continue;
    pts[n * 3] = cx + x; pts[n * 3 + 1] = y; pts[n * 3 + 2] = cz + z; n++;
  }
  let under = 0; for (let k = 0; k < NPTS; k++) if (pts[k * 3 + 1] <= FULL_Y) under++;
  SHAPE = { geo, pts, full: under / NPTS, proj: new Float32Array(NPTS), y0: R[0].y, top };
  return SHAPE;
}
// the k-th smallest of `a` (it is reordered): the level the surface goes at
function kth(a, k) {
  let l = 0, r = a.length - 1;
  while (l < r) {
    const x = a[(l + r) >> 1]; let i = l, j = r;
    while (i <= j) { while (a[i] < x) i++; while (a[j] > x) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
    if (k <= j) r = j; else if (k >= i) l = i; else return a[k];
  }
  return a[k];
}

/* the water's own material: a clear blue, its back faces the surface; per copy (see above) */
function makeWaterMat() {
  const m = new THREE.MeshStandardMaterial({
    color: 0x3f93bd, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.74,
    emissive: 0x0f3f55, side: THREE.DoubleSide, depthWrite: false,
  });
  const U = { uPlane: { value: new THREE.Vector4(0, 1, 0, FULL_Y) } };
  WS.set(m, { U });   // (its state off the material's `userData`: a copy of the bottle serialises that, and the owner in it is circular)
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPlane = U.uPlane;
    sh.vertexShader = 'varying vec3 vWLocal;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWLocal = position;');
    sh.fragmentShader = 'uniform vec4 uPlane;\nvarying vec3 vWLocal;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (dot(vWLocal, uPlane.xyz) > uPlane.w) discard;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n  if (!gl_FrontFacing) { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.9, 0.98), 0.5); diffuseColor.a = min(1.0, diffuseColor.a + 0.15); }');
  };
  m.customProgramCacheKey = () => 'bwWater';
  m.onBeforeRender = (renderer, scene, camera, geometry, object) => slosh(m, scene, object);
  return m;
}

const WS = new WeakMap();                         // a water material → its slosh: { U, owner, t, p, v, n, nv }
export const waterPlaneOf = (m) => { const S = WS.get(m); return S ? S.U.uPlane.value : null; };
const _q = new THREE.Quaternion(), _g = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _n = new THREE.Vector3(), _s = new THREE.Vector3();
function slosh(m, scene, object) {
  const S = WS.get(m); if (!S) return;
  if (S.owner && S.owner !== object) { object.material = makeWaterMat(); return; }   // (a copy sharing this one: its own from the next draw)
  S.owner = object;
  const now = performance.now() / 1000, dt = Math.min(0.05, Math.max(1e-3, now - (S.t || now - 0.016))); S.t = now;
  object.updateWorldMatrix(true, false);
  object.matrixWorld.decompose(_p, _q, _s);
  // the bottle's acceleration in the scene, from where it was the last two draws
  if (!S.p) { S.p = _p.clone(); S.v = new THREE.Vector3(); S.n = null; S.nv = new THREE.Vector3(); }
  const v = _a.copy(_p).sub(S.p).divideScalar(dt); S.p.copy(_p);
  const acc = v.clone().sub(S.v).divideScalar(dt).clampLength(0, 30); S.v.copy(v);
  // what the water feels: gravity less the bottle's own acceleration, into the bottle's frame
  const down = gravityOf(scene) || _g.set(0, -1, 0);
  _g.copy(down).multiplyScalar(9.8).sub(acc.multiplyScalar(0.6));
  _g.applyQuaternion(_q.invert()).normalize();
  const want = _n.copy(_g).negate();                                   // the level surface's "up" in the bottle's frame
  if (!S.n) S.n = want.clone();
  // a spring toward it: it lags, runs past and rocks back
  S.nv.addScaledVector(want.clone().sub(S.n), 70 * dt).multiplyScalar(Math.exp(-3.2 * dt));
  S.n.addScaledVector(S.nv, dt).normalize();
  // the level: where the fill's share of the water's volume lies under the surface, turned however it is
  const f = object.userData.fill ?? 0.94, W = SHAPE && object.geometry === SHAPE.geo ? SHAPE : null;
  if (W) {
    const k = Math.round(Math.max(0, Math.min(1, f * W.full)) * (W.pts.length / 3 - 1)), P = W.pts, A = W.proj, nx = S.n.x, ny = S.n.y, nz = S.n.z;
    for (let i = 0, j = 0; i < A.length; i++, j += 3) A[i] = P[j] * nx + P[j + 1] * ny + P[j + 2] * nz;
    S.U.uPlane.value.set(nx, ny, nz, f <= 0.004 ? -1e3 : kth(A, k));
  } else { const y = BASE_Y + (FULL_Y - BASE_Y) * f; S.U.uPlane.value.set(S.n.x, S.n.y, S.n.z, S.n.y * y); }
  const spd = S.nv.length();                                      // how hard it is moving: heard past a line, on the way up
  if (spd > SLOSH_HEARD && !(S.spd > SLOSH_HEARD) && now - (S.heard || 0) > SLOSH_GAP && (object.userData.fill ?? 0.94) > 0.02) {
    S.heard = now; S.hits = (S.hits || 0) + 1; sloshHeard(Math.min(1, (spd - SLOSH_HEARD) / 5), object);
  }
  S.spd = spd;
}

// a plain blue-and-white supermarket label
function labelTex() {
  const w = 128, h = 64;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#e8eef2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, 13);
  g.fillStyle = '#2f7fc4'; g.fillRect(0, h - 16, w, 16);
  // a wave band
  g.strokeStyle = '#7fc0e4'; g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x <= w; x += 4) g.lineTo(x, 30 + Math.sin(x * 0.12) * 5);
  g.stroke();
  g.fillStyle = '#14446f';
  g.font = 'bold 13px Georgia, serif'; g.textAlign = 'center';
  g.fillText('SPRING', w * 0.25, 25);
  g.fillText('WATER', w * 0.25, 40);
  g.fillText('SPRING', w * 0.75, 25);
  g.fillText('WATER', w * 0.75, 40);
  g.fillStyle = 'rgba(120,110,90,0.30)';           // grubby
  for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 2, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}

export function makeWaterBottleIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  // body
  g.fillStyle = '#cfe6ee'; g.strokeStyle = '#8fa8b4'; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(18, 44); g.lineTo(18, 20); g.lineTo(21, 14); g.lineTo(21, 7);
  g.lineTo(27, 7); g.lineTo(27, 14); g.lineTo(30, 20); g.lineTo(30, 44);
  g.closePath(); g.fill(); g.stroke();
  // water
  g.fillStyle = '#6fb0c6'; g.fillRect(19, 19, 10, 24);
  // label
  g.fillStyle = '#2f7fc4'; g.fillRect(18, 26, 12, 9);
  g.fillStyle = '#e8eef2'; g.fillRect(18, 29, 12, 3);
  // cap
  g.fillStyle = '#2f6fb8'; g.fillRect(20, 3, 8, 5);
  return c.toDataURL();
}
