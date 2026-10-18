import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 *  The drainage tunnel home — the concrete outfall that comes out of the
 *  dune behind you, and what somebody has made of the chamber at the end.
 *
 *  Distinct from the tunnel in the sand wall further down the beach: that
 *  one is a dug corridor (TUN_* in main.js), this is a storm drain.
 *
 *  Local frame:  the bore runs +X into the land, mouth face at x = 0,
 *  +Y up, Z across.  The walkable invert sits at y ≈ NAV.floorY.
 *
 *  userData.nav    — the numbers main.js needs for collision
 *  userData.lights — { lamp, mouth } so the game can flicker / cull them
 *  userData.drips  — world-ish local points to seed drip sounds from
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

const BORE_R = 1.42;            // clear inside radius of the pipe
const PIPE_CY = 1.16;           // height of the pipe axis above the invert
const BORE_LEN = 17.6;          // mouth → door
const DOOR_X = BORE_LEN;
const ROOM_X0 = BORE_LEN + 0.55;
const ROOM_X1 = ROOM_X0 + 7.2;
const ROOM_HZ = 3.15;           // room half-width
const BUCKET_X = ROOM_X0 + 2.65, BUCKET_Z = ROOM_HZ - 0.38;   // the drip bucket, against the side wall past the shelving
const ROOM_H = 2.85;
const FLOOR_Y = 0.05;           // the silted invert you actually walk on

function rnd(seed) { const s = Math.sin(seed * 91.7) * 43758.5453; return s - Math.floor(s); }

// a box helper — most of this build is slabs
function slab(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}
// a cylinder whose axis runs along +X
function xCyl(rt, rb, len, seg, mat, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1, open);
  g.rotateZ(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

// Batch the decorative scatter. Hundreds of little meshes cost a draw call
// each and all have to be uploaded the frame the structure first comes into
// view, which is what made turning round hitch. Merged by material, they
// collapse to a handful of meshes. Only used on things nothing else touches.
function bakeScatter(group) {
  const byMat = new Map();
  const keep = [];
  for (const child of [...group.children]) {
    if (!child.isMesh || child.userData.noBake) { keep.push(child); continue; }
    // Normalise first, or the merge refuses the batch: the polyhedra come out
    // non-indexed while boxes are indexed, and the hand-built channel strips
    // carry no uv at all.
    let g = child.geometry.clone();
    child.updateMatrix();
    g.applyMatrix4(child.matrix);
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv1');
    g.deleteAttribute('uv2');
    if (!g.getAttribute('uv')) {
      const n = g.getAttribute('position').count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!byMat.has(child.material)) byMat.set(child.material, []);
    byMat.get(child.material).push(g);
    group.remove(child);
  }
  for (const [mat, geos] of byMat) {
    if (geos.length === 1) { group.add(new THREE.Mesh(geos[0], mat)); continue; }
    try {
      const merged = mergeGeometries(geos, false);
      if (merged) group.add(new THREE.Mesh(merged, mat));
      else geos.forEach(g => group.add(new THREE.Mesh(g, mat)));
    } catch (e) {
      geos.forEach(g => group.add(new THREE.Mesh(g, mat)));
    }
  }
  return group;
}

// ---- procedural surfaces --------------------------------------------------
// wet, stained concrete: grey base, ochre/rust washes, dark damp at the bottom
function concreteTex(w = 128, h = 128, opts = {}) {
  const { base = '#5a5c5e', damp = 0.55, graffiti = false } = opts;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  // broad mottling
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 34;
    const v = Math.random() < 0.5 ? '20,22,24' : '132,128,116';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${0.05 + Math.random() * 0.16})`);
    gr.addColorStop(1, `rgba(${v},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // rust / ochre streaks running down
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * w, wd = 1 + Math.random() * 4;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(122,84,40,0.30)');
    gr.addColorStop(0.6, 'rgba(96,66,34,0.16)');
    gr.addColorStop(1, 'rgba(60,44,26,0)');
    g.fillStyle = gr; g.fillRect(x, 0, wd, h * (0.4 + Math.random() * 0.6));
  }
  // damp rising up from the bottom edge
  const dp = g.createLinearGradient(0, h, 0, h * (1 - damp));
  dp.addColorStop(0, 'rgba(12,16,14,0.72)');
  dp.addColorStop(1, 'rgba(12,16,14,0)');
  g.fillStyle = dp; g.fillRect(0, 0, w, h);
  // grit
  for (let i = 0; i < 1400; i++) {
    const v = 40 + Math.random() * 90;
    g.fillStyle = `rgba(${v | 0},${(v - 2) | 0},${(v - 6) | 0},0.35)`;
    g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 1);
  }
  if (opts.weathered) {
    // salt bloom and pale leaching high up, algae and damp low down
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, y = Math.random() * h * 0.7, r = 5 + Math.random() * 22;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(196,196,186,${0.06 + Math.random() * 0.16})`);
      gr.addColorStop(1, 'rgba(196,196,186,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w, y = h * (0.45 + Math.random() * 0.55), r = 6 + Math.random() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${58 + Math.random() * 40 | 0},${76 + Math.random() * 40 | 0},44,${0.10 + Math.random() * 0.22})`);
      gr.addColorStop(1, 'rgba(58,76,44,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // hairline cracks
    g.strokeStyle = 'rgba(26,24,22,0.5)';
    for (let i = 0; i < 10; i++) {
      g.lineWidth = 0.6 + Math.random();
      g.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) g.lineTo(x += (Math.random() - 0.5) * 20, y += Math.random() * 16);
      g.stroke();
    }
  }
  if (graffiti) {
    const cols = ['#8e2f3a', '#2f4f8e', '#c8b03a', '#3a7a4a', '#101010'];
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = cols[(Math.random() * cols.length) | 0];
      g.globalAlpha = 0.35 + Math.random() * 0.3;
      g.lineWidth = 2 + Math.random() * 3;
      g.beginPath();
      let x = Math.random() * w, y = h * (0.25 + Math.random() * 0.4);
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo(x += (Math.random() - 0.4) * 26, y += (Math.random() - 0.5) * 22);
      g.stroke();
      g.globalAlpha = 1;
    }
  }
  // quantise for the retro palette
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}
// old brick for the chamber
function brickTex() {
  const w = 128, h = 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#3b332b'; g.fillRect(0, 0, w, h);      // mortar
  const rows = 8, bh = h / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 16;
    for (let bx = -32; bx < w + 32; bx += 32) {
      const v = rnd(r * 13 + bx) ;
      const rr = 74 + v * 34, gg = 50 + v * 26, bb = 40 + v * 20;
      g.fillStyle = `rgb(${rr | 0},${gg | 0},${bb | 0})`;
      g.fillRect(bx + off + 1, r * bh + 1, 30, bh - 2);
    }
  }
  // soot + damp
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(14,12,10,${0.1 + Math.random() * 0.3})`);
    gr.addColorStop(1, 'rgba(14,12,10,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  const dp = g.createLinearGradient(0, h, 0, h * 0.35);
  dp.addColorStop(0, 'rgba(10,14,12,0.6)'); dp.addColorStop(1, 'rgba(10,14,12,0)');
  g.fillStyle = dp; g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}

// the ochre bleed that runs down a wall under a rusting outlet
/* The throat's own surface. The gate is the one place in the game you stand
 * still and STARE at a wall, and a flat dark cylinder gives the eye nothing
 * to hold — so this is drawn to the photograph of a real storm drain: poured
 * concrete going green-black with wet, the mineral bloom that creeps down
 * from every construction joint, rust bleeding out of the reinforcement, and
 * a darker band along the invert where the water runs. u wraps the pipe and
 * v runs its length, so the joints come out as rings round the bore.
 */
function throatTex() {
  const W = 256, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const R = (n) => Math.random() * n;
  g.fillStyle = '#3c3f3a'; g.fillRect(0, 0, W, H);                  // wet concrete
  for (let i = 0; i < 140; i++) {                                   // broad blotching
    const x = R(W), y = R(H), r = 10 + R(60);
    const p = Math.random();
    const col = p < 0.4 ? '22,26,22' : p < 0.72 ? '86,92,80' : '54,62,50';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${0.10 + R(0.28)})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // the joints between pipe sections: a dark line, a pale mineral crust under
  // it, and rust bleeding on down out of the reinforcement
  for (let k = 0; k < 4; k++) {
    const y = (k + 0.5) * (H / 4) + (R(10) - 5);
    g.fillStyle = 'rgba(10,12,10,0.75)'; g.fillRect(0, y, W, 2.5);
    g.fillStyle = 'rgba(196,198,176,0.30)'; g.fillRect(0, y + 2.5, W, 1.6);
    for (let i = 0; i < 26; i++) {
      const x = R(W), w = 3 + R(16), h = 4 + R(20);
      g.fillStyle = `rgba(206,208,188,${0.06 + R(0.16)})`;
      g.beginPath(); g.ellipse(x, y + 3 + R(6), w, h, 0, 0, TAU); g.fill();
    }
    for (let i = 0; i < 14; i++) {
      const x = R(W);
      const gr = g.createLinearGradient(0, y, 0, y + 30 + R(40));
      gr.addColorStop(0, 'rgba(96,52,24,0.40)');
      gr.addColorStop(1, 'rgba(96,52,24,0)');
      g.fillStyle = gr; g.fillRect(x, y, 1 + R(3.5), 70);
    }
  }
  for (let i = 0; i < 220; i++) {                                   // algae, low down
    const x = R(W), y = R(H);
    const wet = 1 - Math.abs(0.5 - (x / W)) * 2;
    if (Math.random() > 0.25 + wet * 0.75) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, 4 + R(16));
    gr.addColorStop(0, `rgba(30,46,28,${0.14 + R(0.3)})`);
    gr.addColorStop(1, 'rgba(30,46,28,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
  }
  const inv = g.createLinearGradient(W * 0.36, 0, W * 0.64, 0);     // the invert band
  inv.addColorStop(0, 'rgba(8,12,12,0)');
  inv.addColorStop(0.5, 'rgba(8,12,12,0.55)');
  inv.addColorStop(1, 'rgba(8,12,12,0)');
  g.fillStyle = inv; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {                                  // grit
    const v = 30 + R(90) | 0;
    g.fillStyle = `rgba(${v},${v + 4},${v - 2},0.5)`;
    g.fillRect(R(W) | 0, R(H) | 0, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}

function rustStainTex() {
  const w = 96, h = 160;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const cols = ['196,104,32', '168,86,26', '148,74,22', '206,132,48', '120,96,34'];
  for (let i = 0; i < 46; i++) {
    const x = 4 + Math.random() * (w - 8);
    const wd = 1 + Math.random() * 6;
    const top = Math.random() * h * 0.14;
    const len = h * (0.32 + Math.random() * 0.68);
    const col = cols[(Math.random() * cols.length) | 0];
    const gr = g.createLinearGradient(0, top, 0, top + len);
    gr.addColorStop(0, `rgba(${col},${0.5 + Math.random() * 0.4})`);
    gr.addColorStop(0.45, `rgba(${col},${0.3 + Math.random() * 0.3})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x, top, wd, len);
  }
  // a couple of green algal runs in with the rust
  for (let i = 0; i < 4; i++) {
    const x = 8 + Math.random() * (w - 16);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(96,116,44,0.45)');
    gr.addColorStop(1, 'rgba(70,90,36,0)');
    g.fillStyle = gr; g.fillRect(x, 0, 2 + Math.random() * 4, h * 0.8);
  }
  // heavier pooling right under the outlet
  const cap = g.createLinearGradient(0, 0, 0, h * 0.2);
  cap.addColorStop(0, 'rgba(150,74,20,0.6)');
  cap.addColorStop(1, 'rgba(150,74,20,0)');
  g.fillStyle = cap; g.fillRect(0, 0, w, h * 0.2);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}
/* WET RUST ON BRICK DARKENS IT (the owner, 2026-10-16: "the grate and the
 * wall behind it have weird textures"). `rustStainTex` is drawn for grey
 * concrete, where an ochre run is darker than the wall; over a red-brown
 * brick the same orange at half opacity LIGHTENS it, and under the outlet it
 * read as a pale curtain hung on the wall with square edges. This is what
 * water out of an iron grate leaves on brick: a dark wet fan, widest at the
 * foot, ragged at its edges, a green-black skin under the lip, and thin rust
 * runs down the middle of it. Its own alpha does the fade, nothing square. */
function brickBleedTex() {
  const w = 96, h = 160;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  // the fan: a stack of rows, each a little wider and fainter, its edges wandering
  for (let y = 0; y < h; y++) {
    const v = y / h, half = w * (0.18 + 0.24 * Math.pow(v, 0.7));
    const cx = w / 2 + Math.sin(y * 0.11) * 2.5;
    const jl = (Math.sin(y * 0.37) + Math.sin(y * 0.93 + 1.7)) * 2.6, jr = (Math.sin(y * 0.41 + 0.6) + Math.sin(y * 0.87 + 2.9)) * 2.6;
    const a = 0.62 * (1 - Math.pow(v, 1.6));
    for (let x = Math.max(0, Math.floor(cx - half + jl)); x < Math.min(w, Math.ceil(cx + half + jr)); x++) {
      const e = Math.min(x - (cx - half + jl), cx + half + jr - x) / 6;           // feathered sides
      g.fillStyle = `rgba(${26 + Math.round(Math.random() * 8)},${16 + Math.round(Math.random() * 6)},10,${(a * Math.min(1, e) * (0.85 + Math.random() * 0.15)).toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  // the runs: thin, darker, a few of them rust-brown
  for (let i = 0; i < 22; i++) {
    const x = w * 0.3 + Math.random() * w * 0.4, wd = 1 + Math.random() * 2, len = h * (0.3 + Math.random() * 0.65);
    const col = Math.random() < 0.35 ? '92,44,16' : '20,12,8';
    const gr = g.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, `rgba(${col},${0.45 + Math.random() * 0.3})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x, 0, wd, len);
  }
  // and the slime skin under the lip
  const cap = g.createLinearGradient(0, 0, 0, h * 0.12);
  cap.addColorStop(0, 'rgba(22,30,14,0.7)'); cap.addColorStop(1, 'rgba(22,30,14,0)');
  g.fillStyle = cap; g.fillRect(w * 0.3, 0, w * 0.4, h * 0.12);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}


/* ---- THE SECOND PASS: SOMEBODY LIVES HERE -------------------------------
 * The owner, as with the wreck: keep the geometry, change how it looks, so it
 * fits the game as it has grown — lived in, and still dirty. Everything below
 * was flat colour or a 128 px wash; each surface now gets its own painted map
 * (`paint`, quantised and nearest-filtered like every texture in the game),
 * and each interior material is lit off its OWN map (`liftOff`), because no
 * moon reaches down here and an unlifted surface is a black shape. */
function paint(w, h, draw, quant = 0xF0) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, w, h);
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= quant; px[i + 1] &= quant; px[i + 2] &= quant; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}
const R01 = (n) => Math.random() * n;
function blot(g, x, y, r, rgb, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function grit(g, w, h, n, lo, span, a = 0.4) {
  for (let i = 0; i < n; i++) { const v = lo + R01(span) | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},${a})`; g.fillRect(R01(w) | 0, R01(h) | 0, 1, 1); }
}
// the pipe: wet poured concrete, mineral bloom and rust weeping out of it, green-black where the water sits
function pipeTex() {
  /* On the bore this wraps with x AROUND the pipe and y ALONG it, so
   * anything that runs down the wall is painted along x, not y. */
  return paint(256, 256, (g, w, h) => {
    g.fillStyle = '#464a46'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const p = Math.random(); blot(g, R01(w), R01(h), 8 + R01(30), p < 0.5 ? '22,26,24' : p < 0.75 ? '78,82,74' : '48,58,44', 0.06 + R01(0.14)); }
    const run = (x0, y, L, th, rgb, a) => {                          // a stain running round the wall
      const gr = g.createLinearGradient(x0, 0, x0 + L, 0);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(Math.min(x0, x0 + L), y, Math.abs(L), th);
    };
    for (let i = 0; i < 30; i++) run(R01(w), R01(h), (Math.random() < 0.5 ? 1 : -1) * (14 + R01(40)), 2 + R01(6), '176,178,162', 0.10 + R01(0.12));   // mineral bloom
    for (let i = 0; i < 22; i++) run(R01(w), R01(h), (Math.random() < 0.5 ? 1 : -1) * (20 + R01(70)), 1 + R01(3), '118,62,24', 0.35 + R01(0.2));     // rust out of the reinforcement
    for (let i = 0; i < 70; i++) blot(g, R01(w), R01(h), 3 + R01(10), '30,44,28', 0.08 + R01(0.2));   // wet growth
    g.strokeStyle = 'rgba(18,18,16,0.55)';                          // hairline cracks
    for (let i = 0; i < 9; i++) { g.lineWidth = 0.6 + R01(0.8); g.beginPath(); let x = R01(w), y = R01(h); g.moveTo(x, y); for (let k = 0; k < 7; k++) g.lineTo(x += R01(14) - 4, y += R01(22) - 11); g.stroke(); }
    grit(g, w, h, 4200, 28, 90);
  });
}
// the chamber's brick: old, sooted over the lamp, damp at the foot, salt where the wet comes through
function brickTex2() {
  return paint(256, 256, (g, w, h) => {
    g.fillStyle = '#2c2621'; g.fillRect(0, 0, w, h);                // mortar, gone dark
    const rows = 12, bh = h / rows, bw = 42;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw / 2;
      for (let bx = -bw; bx < w + bw; bx += bw) {
        const v = Math.random(), burnt = Math.random() < 0.12;
        const rr = burnt ? 44 + v * 18 : 92 + v * 40, gg = burnt ? 34 + v * 12 : 58 + v * 26, bb = burnt ? 30 + v * 10 : 44 + v * 18;
        g.fillStyle = `rgb(${rr | 0},${gg | 0},${bb | 0})`;
        g.fillRect(bx + off + 1.5, r * bh + 1.5, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,240,220,0.06)'; g.fillRect(bx + off + 1.5, r * bh + 1.5, bw - 3, 1.5);   // a worn top edge
        if (Math.random() < 0.18) blot(g, bx + off + R01(bw), r * bh + R01(bh), 3 + R01(6), '20,16,14', 0.35);  // a chip out of it
      }
    }
    const soot = g.createLinearGradient(0, 0, 0, h * 0.55);        // years of a lamp under the ceiling
    soot.addColorStop(0, 'rgba(10,8,6,0.62)'); soot.addColorStop(1, 'rgba(10,8,6,0)');
    g.fillStyle = soot; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {                                  // salt coming through the joints
      const x = R01(w), y = h * 0.3 + R01(h * 0.6);
      for (let k = 0; k < 5; k++) blot(g, x + R01(10) - 5, y + k * 4, 3 + R01(7), '206,204,190', 0.08 + R01(0.12));
    }
    const dp = g.createLinearGradient(0, h, 0, h * 0.6);
    dp.addColorStop(0, 'rgba(10,14,10,0.6)'); dp.addColorStop(1, 'rgba(10,14,10,0)');
    g.fillStyle = dp; g.fillRect(0, 0, w, h);
    grit(g, w, h, 2400, 30, 80, 0.3);
  });
}
// the floor: poured concrete under a skin of silt, stained, and worn pale where somebody walks every day
function floorTex() {
  return paint(256, 256, (g, w, h) => {
    g.fillStyle = '#48443d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) blot(g, R01(w), R01(h), 10 + R01(50), Math.random() < 0.5 ? '30,28,24' : '96,88,72', 0.08 + R01(0.18));
    for (let i = 0; i < 40; i++) blot(g, R01(w), R01(h), 14 + R01(34), '92,74,50', 0.10 + R01(0.2));      // silt drifts
    for (let i = 0; i < 5; i++) {                                   // rings where water stood and dried
      const x = R01(w), y = R01(h), r = 8 + R01(26);
      g.strokeStyle = `rgba(26,22,18,${0.10 + R01(0.12)})`; g.lineWidth = 1 + R01(1.5);
      g.beginPath(); g.ellipse(x, y, r, r * (0.6 + R01(0.4)), R01(3), 0, TAU); g.stroke();
    }
    const worn = g.createLinearGradient(0, h * 0.35, 0, h * 0.65);  // a path worn pale down the middle
    worn.addColorStop(0, 'rgba(150,140,120,0)'); worn.addColorStop(0.5, 'rgba(150,140,120,0.12)'); worn.addColorStop(1, 'rgba(150,140,120,0)');
    g.fillStyle = worn; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(16,14,12,0.6)';
    for (let i = 0; i < 7; i++) { g.lineWidth = 0.6 + R01(1); g.beginPath(); let x = R01(w), y = R01(h); g.moveTo(x, y); for (let k = 0; k < 8; k++) g.lineTo(x += R01(26) - 13, y += R01(26) - 13); g.stroke(); }
    grit(g, w, h, 4000, 34, 80, 0.45);
  });
}
// planks: grain, a knot or two, nail heads gone to rust, grime in the gaps
function woodTex() {
  return paint(128, 256, (g, w, h) => {
    const planks = 4, pw = w / planks;
    for (let p = 0; p < planks; p++) {
      const v = Math.random();
      g.fillStyle = `rgb(${70 + v * 26 | 0},${54 + v * 18 | 0},${36 + v * 12 | 0})`; g.fillRect(p * pw, 0, pw, h);
      for (let k = 0; k < 14; k++) {                                // grain
        const x = p * pw + R01(pw); g.strokeStyle = `rgba(30,20,12,${0.18 + R01(0.25)})`; g.lineWidth = 0.6 + R01(1);
        g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + k) * 1.6, y); g.stroke();
      }
      if (Math.random() < 0.6) { const ky = R01(h); g.fillStyle = 'rgba(30,18,10,0.6)'; g.beginPath(); g.ellipse(p * pw + pw / 2, ky, 3, 6, 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(12,8,6,0.75)'; g.fillRect(p * pw, 0, 1.5, h);   // the gap
      for (const y of [12, h - 14]) { g.fillStyle = 'rgba(110,60,28,0.85)'; g.fillRect(p * pw + pw / 2 - 1.5, y, 3, 3); }
    }
    for (let i = 0; i < 30; i++) blot(g, R01(w), R01(h), 6 + R01(20), '16,12,8', 0.12 + R01(0.2));
    grit(g, w, h, 900, 30, 60, 0.3);
  });
}
// the mattress: ticking stripes gone grey, a tide-mark of stains, the quilting buttons
function mattressTex() {
  return paint(256, 128, (g, w, h) => {
    g.fillStyle = '#9c968a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(52,64,86,0.55)'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(52,64,86,0.25)'; g.fillRect(x + 7, 0, 1.5, h); }
    for (let i = 0; i < 9; i++) {                                   // stains with tide-marks
      const x = R01(w), y = R01(h), r = 10 + R01(26);
      blot(g, x, y, r, '120,96,52', 0.25 + R01(0.25));
      g.strokeStyle = 'rgba(92,70,36,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, r * 0.8, r * 0.6, R01(3), 0, TAU); g.stroke();
    }
    for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.fillStyle = 'rgba(40,40,40,0.5)'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    blot(g, w * 0.25, h * 0.5, 50, '40,36,30', 0.35);               // where he sleeps
    grit(g, w, h, 1200, 60, 80, 0.25);
  });
}
// the linen and the rags: off-white gone grey, a weave you can just see, the dirt in it
function linenTex() {
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = '#8a857a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 16; i++) blot(g, R01(w), R01(h), 6 + R01(20), '70,58,40', 0.15 + R01(0.25));
    grit(g, w, h, 500, 50, 70, 0.25);
  });
}
// the blanket: a wool check in wine and brown, bobbled and worn thin in the middle
function blanketTex() {
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = '#4a2a2a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 32) { g.fillStyle = 'rgba(30,26,22,0.55)'; g.fillRect(i, 0, 12, h); g.fillRect(0, i, w, 12); }
    for (let i = 0; i < w; i += 32) { g.fillStyle = 'rgba(150,120,80,0.25)'; g.fillRect(i + 20, 0, 2, h); g.fillRect(0, i + 20, w, 2); }
    blot(g, w / 2, h / 2, 40, '90,70,60', 0.2);
    grit(g, w, h, 1600, 40, 70, 0.35);
  });
}
// rust: orange-brown and black, pitted
function rustTex() {
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = '#5e3a22'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const p = Math.random(); blot(g, R01(w), R01(h), 4 + R01(20), p < 0.4 ? '140,74,30' : p < 0.7 ? '28,18,12' : '96,90,80', 0.15 + R01(0.3)); }
    for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(14,8,6,0.6)'; g.fillRect(R01(w) | 0, R01(h) | 0, 1 + (R01(2) | 0), 1); }
  });
}
// cast and wrought iron gone to scale: near-black, blistered with rust, pitted — mottled, never grained
function ironTex() {
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = '#2c2420'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const p = Math.random(); blot(g, R01(w), R01(h), 3 + R01(16), p < 0.45 ? '118,58,26' : p < 0.7 ? '74,44,28' : '16,12,10', 0.25 + R01(0.4)); }
    for (let i = 0; i < 40; i++) blot(g, R01(w), R01(h), 1.5 + R01(3), '150,80,36', 0.6);          // fresh rust in the pits
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(8,6,5,0.7)'; g.fillRect(R01(w) | 0, R01(h) | 0, 1 + (R01(2) | 0), 1 + (R01(2) | 0)); }
  });
}
// silt and mud: soft brown-grey with ripples where the last flow left it
function siltTex() {
  /* wet mud, not planks: a dark grey-brown with clots and pocks and a sheen
   * where water stands in it — no running lines (stretched, they were grain) */
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = '#35322c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) blot(g, R01(w), R01(h), 4 + R01(16), Math.random() < 0.5 ? '22,20,17' : '78,70,56', 0.15 + R01(0.25));
    for (let i = 0; i < 14; i++) blot(g, R01(w), R01(h), 3 + R01(7), '120,124,118', 0.18);            // wet shine
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(12,10,8,0.6)'; g.beginPath(); g.arc(R01(w), R01(h), 0.6 + R01(1.4), 0, TAU); g.fill(); }
    grit(g, w, h, 900, 30, 70, 0.4);
  });
}
// growth: dark wet moss, never the neon of a sign
function mossTex() {
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = '#2a3322'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) blot(g, R01(w), R01(h), 3 + R01(12), Math.random() < 0.5 ? '18,24,14' : '64,80,44', 0.15 + R01(0.3));
    grit(g, w, h, 700, 20, 60, 0.4);
  });
}
// the rug in front of the bed: a cheap woven runner, its pattern almost walked out of it
function rugTex() {
  return paint(256, 160, (g, w, h) => {
    g.fillStyle = '#5a2f2a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(176,140,90,0.55)'; g.lineWidth = 5; g.strokeRect(12, 12, w - 24, h - 24);
    g.strokeStyle = 'rgba(40,52,70,0.6)'; g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44);
    for (let k = 0; k < 4; k++) {                                   // a row of diamonds
      const cx = 44 + k * ((w - 88) / 3), cy = h / 2;
      g.fillStyle = k % 2 ? 'rgba(176,140,90,0.5)' : 'rgba(40,52,70,0.55)';
      g.beginPath(); g.moveTo(cx, cy - 34); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 34); g.lineTo(cx - 22, cy); g.closePath(); g.fill();
    }
    for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(190,170,140,0.6)'; g.fillRect(x, 0, 2, 6); g.fillRect(x, h - 6, 2, 6); }   // fringe
    blot(g, w * 0.55, h * 0.5, 70, '30,24,20', 0.45);               // walked out of it
    for (let i = 0; i < 10; i++) blot(g, R01(w), R01(h), 8 + R01(20), '30,22,16', 0.2 + R01(0.2));
    grit(g, w, h, 2400, 40, 80, 0.3);
  });
}
// a photograph gone yellow: two figures on a beach, the sea behind them, a corner torn off
function photoTex() {
  return paint(64, 80, (g, w, h) => {
    g.fillStyle = '#d8d0b6'; g.fillRect(0, 0, w, h);                // the white border
    const sky = g.createLinearGradient(0, 6, 0, 46); sky.addColorStop(0, '#8e9a96'); sky.addColorStop(1, '#b4ae92');
    g.fillStyle = sky; g.fillRect(5, 5, w - 10, 34);
    g.fillStyle = '#5d6c70'; g.fillRect(5, 39, w - 10, 8);          // the sea
    g.fillStyle = '#b8a47e'; g.fillRect(5, 47, w - 10, 13);         // the sand
    g.fillStyle = '#2a2420';                                        // the two of them
    for (const [x, s] of [[24, 1], [36, 0.82]]) { g.fillRect(x, 54 - 18 * s, 5 * s, 18 * s); g.beginPath(); g.arc(x + 2.5 * s, 51 - 18 * s, 3 * s, 0, TAU); g.fill(); }
    blot(g, 48, 20, 22, '150,120,60', 0.35);                        // gone yellow
    g.fillStyle = '#1a1714'; g.beginPath(); g.moveTo(w, h); g.lineTo(w - 14, h); g.lineTo(w, h - 12); g.closePath(); g.fill();   // torn
    g.fillStyle = '#3a3a3a'; g.fillRect(w / 2 - 1, 1, 2, 2);        // the pin
  }, 0xF8);
}
// a drawing on a torn-out page: the lighthouse and the moon, in pencil and something red
function drawingTex() {
  return paint(96, 96, (g, w, h) => {
    g.fillStyle = '#c8c0a8'; g.fillRect(0, 0, w, h);
    for (let y = 14; y < h; y += 9) { g.fillStyle = 'rgba(80,100,140,0.35)'; g.fillRect(0, y, w, 1); }   // ruled lines
    g.strokeStyle = 'rgba(40,36,34,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(40, 82); g.lineTo(46, 30); g.lineTo(54, 30); g.lineTo(60, 82); g.stroke();   // the tower
    g.strokeRect(44, 22, 12, 8);
    g.beginPath(); g.moveTo(42, 22); g.lineTo(50, 14); g.lineTo(58, 22); g.stroke();
    g.strokeStyle = 'rgba(150,40,30,0.8)'; g.beginPath(); g.moveTo(56, 26); g.lineTo(88, 20); g.moveTo(56, 26); g.lineTo(88, 32); g.stroke();   // its beam, in red
    g.strokeStyle = 'rgba(40,36,34,0.7)'; g.beginPath(); g.arc(20, 22, 9, 0, TAU); g.stroke();             // the moon
    g.beginPath(); for (let x = 4; x < w - 4; x += 6) g.lineTo(x, 84 + Math.sin(x * 0.5) * 2); g.stroke();  // the sea
    g.fillStyle = '#1a1714'; g.fillRect(0, 0, 4, h);                // torn out of something
    for (let y = 0; y < h; y += 6) g.fillRect(4, y, 2, 3);
  }, 0xF8);
}
// chalk on the pipe wall: the way in
function chalkTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 64);
  g.strokeStyle = 'rgba(220,218,206,0.75)'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(10, 32); g.lineTo(70, 32); g.moveTo(56, 20); g.lineTo(72, 32); g.lineTo(56, 44); g.stroke();   // an arrow, in
  // (the days' tally that stood beside it is gone — 2026-10-17, the owner: "take the tallys in the sewer drain away")
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.anisotropy = 1;
  return t;
}
// a puddle: wet floor darkening out from a glassy middle, a ragged edge, not a disc cut in the floor
function puddleTex() {
  return paint(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const a = R01(TAU), d = R01(26);
      blot(g, w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 20 + R01(22), '14,18,18', 0.35 + R01(0.25));
    }
    blot(g, w / 2, h / 2, 34, '34,38,36', 0.55);                   // the standing water itself
    for (let i = 0; i < 5; i++) blot(g, w / 2 + R01(30) - 15, h / 2 + R01(30) - 15, 4 + R01(8), '92,96,90', 0.14);   // the sheen
  }, 0xF8);
}
// damp running down a wall from the joists: dark, ragged at the bottom, never a painted-on slab
function dampTex() {
  return paint(64, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const x = 8 + R01(w - 16), L = h * (0.4 + R01(0.55)), wd = 4 + R01(12);
      const gr = g.createLinearGradient(0, 0, 0, L);
      gr.addColorStop(0, 'rgba(14,16,14,0.55)'); gr.addColorStop(0.7, 'rgba(18,20,16,0.35)'); gr.addColorStop(1, 'rgba(18,20,16,0)');
      g.fillStyle = gr; g.fillRect(x - wd / 2, 0, wd, L);
      blot(g, x, L * 0.92, wd * 0.7, '30,28,20', 0.3);              // the tide-mark where it stops
    }
    const top = g.createLinearGradient(0, 0, 0, 24);                  // and the soak along the top
    top.addColorStop(0, 'rgba(12,14,12,0.6)'); top.addColorStop(1, 'rgba(12,14,12,0)');
    g.fillStyle = top; g.fillRect(0, 0, w, 24);
  }, 0xF8);
}
// a row of paperbacks seen spine-on: swollen, sun-faded colours, the odd title
function spinesTex() {
  return paint(128, 64, (g, w, h) => {
    g.fillStyle = '#1a1612'; g.fillRect(0, 0, w, h);
    const cols = ['112,48,40', '52,70,92', '150,132,92', '60,84,58', '120,96,60', '84,60,80', '170,160,140'];
    let x = 0;
    while (x < w) {
      const bw = 6 + R01(12), top = R01(14), c = cols[(R01(cols.length)) | 0];
      g.fillStyle = `rgb(${c})`; g.fillRect(x, top, bw - 1, h - top);
      g.fillStyle = 'rgba(230,220,190,0.35)'; g.fillRect(x + 1, top + 8 + R01(10), bw - 3, 2);   // a title band
      blot(g, x + bw / 2, h - 6, bw, '20,16,12', 0.4);              // the damp has got into the bottoms
      x += bw;
    }
    grit(g, w, h, 500, 20, 60, 0.25);
  });
}
// tins: a paper label gone soft and faded, the steel rusting through above and below it
function tinTex() {
  return paint(64, 64, (g, w, h) => {
    g.fillStyle = '#7a7c78'; g.fillRect(0, 0, w, h);
    const bands = ['150,60,44', '196,180,140', '70,96,120', '170,120,50'];
    for (let i = 0; i < 4; i++) { g.fillStyle = `rgb(${bands[i]})`; g.fillRect(i * 16, 10, 16, h - 20); }
    g.fillStyle = 'rgba(240,230,200,0.5)'; for (let i = 0; i < 4; i++) g.fillRect(i * 16 + 3, 26, 10, 6);
    for (let i = 0; i < 18; i++) blot(g, R01(w), R01(h), 3 + R01(8), Math.random() < 0.5 ? '110,60,26' : '40,30,20', 0.3);
    for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(30,30,30,0.3)'; g.fillRect(x, 4, 1, 2); g.fillRect(x, h - 6, 1, 2); }   // the ribs
  });
}
// an interior surface lit off its own map: no moon reaches down here
/* RELIEF OUT OF THE PICTURE. Every surface down here was a flat colour lit
 * by its own glow, which is what reads as plastic (the owner's word). Each
 * map now carries a normal map made from its own light and dark — a mortar
 * joint is a groove, a crack is a crack, grit stands up — so the lamps rake
 * across something. Sobel over the canvas's luminance, wrapped at the edges
 * so it tiles, and it shares its map's repeat and offset. */
const _nmCache = new Map();
function normalFrom(map, k = 2.2) {
  if (_nmCache.has(map)) return _nmCache.get(map);
  const im = map.image; if (!im || !im.getContext) return null;
  const w = im.width, h = im.height;
  const src = im.getContext('2d').getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), out = g.createImageData(w, h), o = out.data;
  const at = (x, y) => L[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * k, ny = dy * k, nz = 1; const n = Math.hypot(nx, ny, nz); nx /= n; ny /= n; nz /= n;
    const i = (y * w + x) * 4;
    o[i] = (nx * 0.5 + 0.5) * 255; o[i + 1] = (ny * 0.5 + 0.5) * 255; o[i + 2] = (nz * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.repeat = map.repeat; t.offset = map.offset;     // shared, so it can never drift off its picture
  _nmCache.set(map, t);
  return t;
}
/* AND DARKER (the owner: too bright). The glow every surface is lit by is
 * cut by DIM across the board; what light there is comes from the lamps,
 * spread softer and further so it fills the space rather than pooling. */
/* 0.6 was the first pass's "darker"; the owner, again: "still too bright — lit
 * faintly by a few lights and lanterns". The lift is what lit the walls where
 * no lamp reaches, so it goes most of the way: what you see by now is the
 * lanterns, the candles and the odd bulb in the pipe. */
const DIM = 0.22;
function liftOff(m, map, k, tint = 0xffffff, rep = null, bump = 1.0) {
  m.map = map; m.emissiveMap = map; m.emissive = new THREE.Color(tint); m.emissiveIntensity = k * DIM;
  if (rep) map.repeat.set(rep[0], rep[1]);
  const nm = bump > 0 ? normalFrom(map) : null;
  if (nm) { m.normalMap = nm; m.normalScale = new THREE.Vector2(bump, bump); }
  m.metalness = 0;                                // no environment map here: a metal has no diffuse
  m.needsUpdate = true;
  return m;
}
/* STANDING WATER, NOT A SHEET OF PLASTIC: dark, near-black, glossy, and
 * broken by a ripple normal map the game slides along (`waterMat`), so the
 * lamps' highlights run and shiver on it. */
function rippleNormalTex() {
  const w = 128, h = 128, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), o = img.data;
  const H = (x, y) => {
    const u = x / w * Math.PI * 2, v = y / h * Math.PI * 2;
    return Math.sin(u * 3 + Math.sin(v * 2) * 1.3) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin(u * 7 - v * 4 + 1.1) * 0.18 + Math.sin(u * 11 + v * 9) * 0.08;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1);
    let nx = -dx * 2.2, ny = -dy * 2.2, nz = 1; const n = Math.hypot(nx, ny, nz);
    const i = (y * w + x) * 4;
    o[i] = (nx / n * 0.5 + 0.5) * 255; o[i + 1] = (ny / n * 0.5 + 0.5) * 255; o[i + 2] = (nz / n * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2);
  return t;
}

export function makeDrainageTunnelHome(opts = {}) {
  const T = new THREE.Group();
  T.name = 'drainageTunnelHome';

  const boreTex = concreteTex(128, 128, { base: '#575a5b', damp: 0.6, graffiti: true });
  boreTex.repeat.set(6, 2);
  const wallTex = concreteTex(128, 128, { base: '#4e5052', damp: 0.5 });
  wallTex.repeat.set(3, 2);
  const brick = brickTex(); brick.repeat.set(3, 1.4);
  // the headwall takes the weather off the sea: salt bloom, damp, algae, rust
  const rockTex = concreteTex(128, 128, { base: '#4c4a46', damp: 0.72, weathered: true });
  rockTex.repeat.set(9, 6);      // the headwall is big; a loose repeat just smears

  const M = {
    bore:    new THREE.MeshStandardMaterial({ map: boreTex, color: 0x9aa0a2, roughness: 0.95, metalness: 0.02, emissive: 0x0a0d10, side: THREE.DoubleSide, flatShading: true }),
    rock:    new THREE.MeshStandardMaterial({ map: rockTex, color: 0x7e7b74, roughness: 1, metalness: 0, emissive: 0x141821, flatShading: true, side: THREE.DoubleSide }),
    conc:    new THREE.MeshStandardMaterial({ map: wallTex, color: 0x8e9294, roughness: 0.98, metalness: 0.02, emissive: 0x0a0d11, flatShading: true }),
    throat:  new THREE.MeshStandardMaterial({ color: 0x191c20, roughness: 1, metalness: 0, emissive: 0x05070a, side: THREE.BackSide }),
    void:    new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1, metalness: 0, emissive: 0x000000, side: THREE.BackSide }),
    dark:    new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 1, metalness: 0, emissive: 0x05070a, flatShading: true }),
    silt:    new THREE.MeshStandardMaterial({ color: 0x3f3c34, roughness: 1, metalness: 0, emissive: 0x0e0d09, flatShading: true }),
    // there's no env map to reflect, so a "wet" look has to come from a pale
    // sheen — a near-black puddle just reads as a hole in the floor
    water:   new THREE.MeshStandardMaterial({ color: 0x39434a, roughness: 0.12, metalness: 0.45, emissive: 0x141b21 }),
    algae:   new THREE.MeshStandardMaterial({ color: 0x416624, roughness: 0.55, metalness: 0, emissive: 0x0e1f08 }),
    slime:   new THREE.MeshStandardMaterial({ color: 0x2e4426, roughness: 0.75, metalness: 0, emissive: 0x0d1a0a }),
    rust:    new THREE.MeshStandardMaterial({ color: 0x6a4025, roughness: 0.85, metalness: 0.25, emissive: 0x140c06, flatShading: true }),
    web:     new THREE.MeshStandardMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.13, roughness: 1, depthWrite: false, side: THREE.DoubleSide }),
    frame:   new THREE.MeshStandardMaterial({ color: 0xa4652c, roughness: 0.9, metalness: 0.2, emissive: 0x2a1508, flatShading: true }),
    steel:   new THREE.MeshStandardMaterial({ color: 0x5b6064, roughness: 0.6, metalness: 0.6, emissive: 0x0c0e10, flatShading: true }),
    brickM:  new THREE.MeshStandardMaterial({ map: brick, color: 0xa08c7c, roughness: 1, metalness: 0, emissive: 0x0b0908, flatShading: true }),
    wood:    new THREE.MeshStandardMaterial({ color: 0x4c3f2c, roughness: 1, metalness: 0, emissive: 0x100c07, flatShading: true }),
    cloth:   new THREE.MeshStandardMaterial({ color: 0x8b8578, roughness: 1, metalness: 0, emissive: 0x1e1c18, flatShading: true, side: THREE.DoubleSide }),
    blanket: new THREE.MeshStandardMaterial({ color: 0x3d3a44, roughness: 1, metalness: 0, emissive: 0x0d0c10, flatShading: true }),
    glow:    new THREE.MeshBasicMaterial({ color: 0xffe4b0, fog: false }),
    beaconOn:   new THREE.MeshBasicMaterial({ color: 0xff2418, fog: false }),
    beaconHalo: new THREE.MeshBasicMaterial({ color: 0xff2a12, fog: false, transparent: true, opacity: 0.26, depthWrite: false }),
    seaweed: new THREE.MeshStandardMaterial({ color: 0x2b3226, roughness: 1, metalness: 0, emissive: 0x0a0d08, flatShading: true }),
    stain:   new THREE.MeshStandardMaterial({ map: rustStainTex(), transparent: true, roughness: 1, metalness: 0, emissive: 0x0b0602, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    bleed:   new THREE.MeshStandardMaterial({ map: brickBleedTex(), transparent: true, roughness: 0.55, metalness: 0, opacity: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    // The berms have to read as the same sand as the beach, so the game hands
    // in its own sand material; a bespoke flat colour reads as pale slabs.
    wetsand: opts.wetSandMat || new THREE.MeshStandardMaterial({ color: 0x5a6478, roughness: 0.9, metalness: 0.04, emissive: 0x1e2537, flatShading: true, side: THREE.DoubleSide }),
    drysand: opts.sandMat || new THREE.MeshStandardMaterial({ color: 0x6d7d99, roughness: 0.95, metalness: 0, emissive: 0x27324a, flatShading: true }),
    cobble:  new THREE.MeshStandardMaterial({ color: 0x55565e, roughness: 1, metalness: 0, emissive: 0x14161c, flatShading: true }),
  };

  /* the second pass's maps on the first pass's materials: the colours below
   * are what the map is multiplied by, and the lift is what reads in the dark */
  liftOff(M.bore, pipeTex(), 0.30, 0xc8d0c8, [4, 6]); M.bore.color.set(0xb4b8b0);
  // the collars and lips round the bore are outside under the moon as much as in: weathered concrete, barely lifted
  liftOff(M.conc, pipeTex(), 0.08, 0xb8c0b8, [2, 1]); M.conc.color.set(0x8e9290);
  // the chamber's own floor and ceiling: lived on, and lit off their own map
  M.roomConc = liftOff(new THREE.MeshStandardMaterial({ roughness: 0.98, flatShading: true }), floorTex(), 0.26, 0xd0c8b8, [2, 2]);
  M.roomConc.color.set(0xa8a298);
  /* the brick's uv is laid in METRES by the game-side pass below (`brickUV`), one
   * tile to 3.45 m by 2.7 — so the repeat is 1 and every wall, pier and patch
   * round the outlet shows bricks the same size and continuous across seams */
  liftOff(M.brickM, brickTex2(), 0.30, 0xffe4cc, [1, 1], 1.4); M.brickM.color.set(0xa89888);
  liftOff(M.wood, woodTex(), 0.30, 0xffe0c0); M.wood.color.set(0xb09878);
  liftOff(M.cloth, linenTex(), 0.22, 0xfff0dc); M.cloth.color.set(0xa8a294);
  liftOff(M.blanket, blanketTex(), 0.34, 0xffd8c8); M.blanket.color.set(0xb89a90);
  liftOff(M.rust, rustTex(), 0.26, 0xffd0a8); M.rust.color.set(0xb08868);
  liftOff(M.steel, rustTex(), 0.18, 0xc0c8d0); M.steel.color.set(0x8a8e92); M.steel.roughness = 0.75;
  // the shelves are 18 m by 0.7: square the tile, or it stretches into planks
  liftOff(M.silt, siltTex(), 0.2, 0xc8c4b8, [24, 1], 1.6); M.silt.color.set(0x7c766a); M.silt.roughness = 0.6;
  liftOff(M.algae, mossTex(), 0.16, 0xa0b890); M.algae.color.set(0x6a7a58); M.algae.roughness = 0.8;
  liftOff(M.slime, mossTex(), 0.14, 0x98ac88); M.slime.color.set(0x5a6a4c);
  // the grate's own iron, darker than the rust patches on it, and the precast round the hole
  M.iron = liftOff(new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), ironTex(), 0.22, 0xffd0b0, [3, 3], 1.8);
  M.iron.color.set(0x9a8070);
  liftOff(M.frame, ironTex(), 0.22, 0xffd0b0, [3, 3], 1.8); M.frame.color.set(0x9a8070); M.frame.roughness = 0.8;   // every bit of old iron down here, the same scale
  M.surround = liftOff(new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), pipeTex(), 0.22, 0xc8ccc4, null, 1.2);
  M.surround.color.set(0x8c908a);
  M.mattress = liftOff(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), mattressTex(), 0.36, 0xfff0dc);
  M.mattress.color.set(0xc4beb0);
  // water that has stood a long time: dark, a little sheen, and never the blue of a hole in the floor
  // (metalness 0: with no env map any metal goes black, and a black puddle is a hole in the floor)
  M.water.color.set(0x141a1c); M.water.emissive.set(0x070b0c); M.water.metalness = 0; M.water.roughness = 0.08;
  M.water.normalMap = rippleNormalTex(); M.water.normalScale = new THREE.Vector2(0.55, 0.55); M.water.needsUpdate = true;
  T.userData.waterMat = M.water;
  // decals — floor puddles and wall damp — feathered, so they sit IN the surface rather than on it
  const decal = (map, color, emissive, rough) => new THREE.MeshStandardMaterial({ map, color, emissive, emissiveMap: map, emissiveIntensity: 0.5,
    roughness: rough, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.puddle = decal(puddleTex(), 0xffffff, 0x6e7470, 0.08);
  M.damp = decal(dampTex(), 0xffffff, 0x000000, 1);
  // the things on the shelves and the floor
  M.spines = liftOff(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), spinesTex(), 0.3, 0xfff0dc);
  M.tin = liftOff(new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), tinTex(), 0.22, 0xfff0dc);
  M.jar = new THREE.MeshStandardMaterial({ color: 0x6a7a62, roughness: 0.22, metalness: 0, emissive: 0x1c2618, flatShading: true });
  M.bottle = new THREE.MeshStandardMaterial({ color: 0x2c4a34, roughness: 0.2, metalness: 0, emissive: 0x0e1a10, flatShading: true });
  M.leather = new THREE.MeshStandardMaterial({ color: 0x6a4c34, roughness: 0.8, metalness: 0, emissive: 0x22160c, flatShading: true });
  M.coat = liftOff(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), linenTex(), 0.14, 0xc8d0b8);
  M.coat.color.set(0x4a5238);
  M.jug = new THREE.MeshStandardMaterial({ color: 0x8e9a98, roughness: 0.5, metalness: 0, emissive: 0x1c2222, flatShading: true });
  M.fairy = new THREE.MeshBasicMaterial({ color: 0xffb56a, fog: false });
  M.wire = new THREE.MeshStandardMaterial({ color: 0x1c1c1a, roughness: 0.9, metalness: 0, emissive: 0x060606 });

  // ================= headwall — the weathered mass round the mouth =========
  // a chunky, rounded concrete/rock buttress the pipe pokes out of
  // NOTE: it has to be a *shell*, not a solid — a solid block would plug the
  // bore. Open-ended cylinder buried in the dune + a ring plate with the hole
  // in it for the face you actually walk up to.
  const HW = new THREE.Group();
  T.add(HW);
  {
    const shell = xCyl(3.6, 3.2, 4.7, 11, M.rock, true);
    shell.position.set(2.3, PIPE_CY, 0);
    HW.add(shell);
    // the weathered face, with the pipe hole punched through it
    const faceG = new THREE.RingGeometry(BORE_R + 0.02, 3.52, 22, 2);
    const fp = faceG.attributes.position;
    for (let i = 0; i < fp.count; i++) {      // rough it up so it isn't a disc
      const x = fp.getX(i), y = fp.getY(i), rr = Math.hypot(x, y);
      const k = (rr - BORE_R) / (3.52 - BORE_R);
      fp.setZ(i, (rnd(i * 1.7) - 0.5) * 0.34 * k * k - 0.22 * k);
    }
    faceG.computeVertexNormals();
    faceG.rotateY(-Math.PI / 2);
    const face = new THREE.Mesh(faceG, M.rock);
    face.material = M.rock;
    face.position.set(-0.04, PIPE_CY, 0);
    HW.add(face);
    // the raised concrete rim round the mouth
    const collar = new THREE.Mesh(new THREE.TorusGeometry(BORE_R + 0.22, 0.26, 6, 18), M.conc);
    collar.position.set(-0.02, PIPE_CY, 0);
    collar.rotation.y = Math.PI / 2;
    HW.add(collar);
    // Weathering on the face. Everything here is placed in polar coordinates
    // about the bore axis and kept outside BORE_R — put at an arbitrary small
    // radius it ends up floating inside the pipe mouth, which is exactly what
    // it looked like: debris hanging in the opening.
    for (let i = 0; i < 10; i++) {
      const a = rnd(i * 3.7) * TAU;
      const rad = BORE_R + 0.45 + rnd(i * 5.1) * 1.2;
      const py = PIPE_CY + rad * Math.cos(a);
      if (py < 0.25) continue;                 // not below the sand
      const pz = rad * Math.sin(a);
      const px = -0.06 - rnd(i * 2.9) * 0.08;  // just proud of the face plate
      const spall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + rnd(i * 6.3) * 0.26, 0), M.dark);
      spall.scale.set(0.30, 1, 1);
      spall.position.set(px, py, pz);
      HW.add(spall);
      if (i % 3 === 0) {                       // a bar of rebar hanging out
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 4), M.frame);
        bar.position.set(px - 0.16, py, pz);
        bar.rotation.set(0, 0, Math.PI / 2 - 0.4 + rnd(i) * 0.8);
        HW.add(bar);
      }
    }
    // a broken lip where the sea has had at the top edge, on the shell itself
    for (let i = 0; i < 7; i++) {
      const a = (rnd(i * 9.1) - 0.5) * 1.5, s = rnd(i * 4.2);
      const rad = 3.2 + s * 0.3;
      HW.add(slab(0.5 + s * 0.7, 0.3 + s * 0.5, 0.5 + s * 0.8, M.rock,
        0.5 + s * 1.7, PIPE_CY + rad * Math.cos(a), rad * Math.sin(a),
        (s - 0.5) * 0.4, a, (s - 0.5) * 0.35));
    }

    // ---- the beacon: a red lamp so you can find it from down the beach ----
    // Emissive only, no PointLight — it has to be visible from a long way off
    // and the scene is already carrying a lot of lights.
    // Sits clear above the top edge, so it reads against the sky rather than
    // against the concrete, and it has to be big enough to survive the retro
    // downscale from thirty-odd metres away.
    const beacon = new THREE.Group();
    beacon.position.set(-0.30, 5.05, 0);
    HW.add(beacon);
    beacon.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.32, 7), M.rust));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.155, 9, 7), M.beaconOn);
    bulb.position.y = 0.26;
    beacon.add(bulb);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.50, 9, 7), M.beaconHalo);
    halo.position.y = 0.26;
    beacon.add(halo);
    // a little cage over it
    for (let k = 0; k < 3; k++) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.010, 3, 10), M.rust);
      hoop.position.y = 0.26;
      hoop.rotation.set(Math.PI / 2, 0, k * 1.05);
      beacon.add(hoop);
    }
    // the mast down onto the headwall, with a brace
    beacon.add(slab(0.07, 1.9, 0.07, M.rust, 0.04, -1.10, 0));
    beacon.add(slab(0.05, 0.7, 0.05, M.rust, 0.30, -1.45, 0, 0, 0, 0.5));
    T.userData.beacon = { bulb, halo };
    beacon.userData.noBake = true;

    // wing walls running off either side, and rubble shelving to the sand.
    // Everything here sits clear of the walking line down the middle.
    HW.add(slab(3.2, 3.0, 3.0, M.rock, 2.1, 1.35, 4.4, 0, 0.06, 0.02));
    HW.add(slab(2.6, 2.4, 2.6, M.rock, 1.7, 1.0, -4.3, 0, -0.09, -0.03));
    for (let i = 0; i < 6; i++) {
      const s = rnd(i * 3.3), sg = i % 2 ? 1 : -1;
      HW.add(slab(1.3 + s * 1.4, 0.34 + s * 0.3, 1.4 + s * 1.2, M.rock,
        -1.5 + s * 1.3, 0.14 + (i % 3) * 0.13, sg * (2.4 + s * 1.9),
        (s - 0.5) * 0.16, s * 0.7, (s - 0.5) * 0.14));
    }
  }

  // ================= the bore ============================================
  const BORE = new THREE.Group();
  BORE.position.y = PIPE_CY;
  T.add(BORE);
  {
    // the pipe itself — an open tube you stand inside
    const pipe = xCyl(BORE_R, BORE_R, BORE_LEN, 20, M.bore, true);
    pipe.position.x = BORE_LEN / 2;
    BORE.add(pipe);
    // ring joints every couple of metres (photos 2–4)
    for (let x = 1.7; x < BORE_LEN - 0.3; x += 1.85) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(BORE_R - 0.075, 0.055, 5, 20), M.bore);
      ring.position.x = x; ring.rotation.y = Math.PI / 2;
      BORE.add(ring);
    }
    // a heavier collar partway down, like the second portal in photo 4
    const mid = xCyl(BORE_R - 0.008, BORE_R - 0.008, 0.5, 20, M.dark, true);
    mid.position.x = 6.3;
    BORE.add(mid);
    const midLip = new THREE.Mesh(new THREE.TorusGeometry(BORE_R - 0.10, 0.13, 6, 20), M.conc);
    midLip.position.x = 6.05; midLip.rotation.y = Math.PI / 2;
    BORE.add(midLip);
  }

  // ---- caged bulkhead lamps: the last few still burning (photo 7) --------
  const boreLights = [];
  {
    // Mounted near the springline, alternating sides down the bore.
    // The fixture's +Y has to point radially *outward* or the whole thing —
    // conduit included — swings out into the middle of the pipe.
    const TH = 0.84;                       // angle from the crown
    const RR = BORE_R - 0.04;
    const N = Math.max(4, Math.round((BORE_LEN - 3.0) / 2.95));
    for (let i = 0; i < N; i++) {
      const x = 2.0 + i * ((BORE_LEN - 3.4) / (N - 1)), sg = i % 2 ? 1 : -1;
      const y = PIPE_CY + RR * Math.cos(TH);
      const z = sg * RR * Math.sin(TH);
      const dead = i % 2 === 1;             // half of them have gone
      const L = new THREE.Group();
      L.position.set(x, y, z);
      L.rotation.x = sg * TH;               // +Y now points into the wall
      T.add(L);
      L.add(slab(0.2, 0.08, 0.16, M.rust, 0, 0.02, 0));                // backplate
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
        dead ? M.dark : M.glow);
      lens.scale.set(1, 0.7, 1); lens.position.y = -0.06;
      L.add(lens);
      // wire guard
      for (let k = 0; k < 3; k++) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.078 - k * 0.006, 0.005, 3, 10, Math.PI), M.rust);
        hoop.rotation.set(Math.PI / 2, 0, k * 0.7);
        hoop.position.y = -0.06;
        L.add(hoop);
      }
      if (!dead) {
        const pl = new THREE.PointLight(0xffc890, 0.46, 9, 1.1);      // a bulb in a pipe: a pool round it, and a softer fall-off into the murk between (2026-10-17: "more ambient")
        pl.position.set(x, y - 0.22, z * 0.85);
        T.add(pl);
        boreLights.push(pl);
      }
      /* conduit feeding it: thin, and tucked right against the pipe wall —
       * and it STOPS in the bulkhead: 2.6 m off the last lamp (x 16.2) ran it
       * on through the door's wall and 1.2 m into the room in the air, the
       * owner's "little stick hanging out of the wall for no reason" */
      const CL = Math.min(2.6, BORE_LEN - x);
      L.add(slab(CL, 0.022, 0.022, M.rust, CL / 2, 0.012, 0));
    }
  }

  // ---- a smaller line joining the bore partway down ---------------------
  // Built proud of the pipe wall rather than cut into it — a recess would need
  // a hole punching in the tube. Same rule as the lamps: the group's +Y must
  // point radially *outward*, or the stub sticks out into the middle instead.
  {
    const SX = 11.4, ang = 0.62, sg = -1;
    const RR = BORE_R - 0.06;
    const S = new THREE.Group();
    S.position.set(SX, PIPE_CY + RR * Math.cos(ang), sg * RR * Math.sin(ang));
    S.rotation.x = sg * ang;
    T.add(S);
    const surround = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.09, 5, 14), M.conc);
    surround.rotation.x = Math.PI / 2;
    S.add(surround);
    // the stub runs back out of the bore, into the ground
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.95, 12, 1, true), M.throat);
    mouth.position.y = 0.46;
    S.add(mouth);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.26, 12), M.void);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = 0.93;
    S.add(cap);
    for (let i = 0; i < 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.52), M.frame);
      bar.position.set(-0.13 + i * 0.26, 0.02, 0);
      S.add(bar);
    }
    // the stain it has run down the pipe wall ever since. A flat plane would
    // cut through a round pipe, so this is a slice of cylinder at wall radius.
    // After rotateZ, a point at theta sits at (y, z) = (sin t, cos t) * r, so
    // the outlet's own angle is atan2 of its direction, and theta increases
    // down the wall toward the invert.
    const thOut = Math.atan2(Math.cos(ang), sg * Math.sin(ang));
    const rg = new THREE.CylinderGeometry(BORE_R - 0.015, BORE_R - 0.015, 0.62, 6, 1, true,
      thOut, 1.45);
    rg.rotateZ(Math.PI / 2);                          // lay it along the bore
    const run = new THREE.Mesh(rg, M.stain);
    run.position.set(SX, PIPE_CY, 0);
    T.add(run);
  }

  // ---- a string of bulbs he has hung for the last few metres ------------
  // Hooked up near the crown and sagging between the hooks, a third of them
  // gone. Emissive only — no light of their own; the bore lamps do the lighting.
  {
    const TH = 0.5, RR = BORE_R - 0.07, x0 = BORE_LEN - 7.2, x1 = BORE_LEN - 0.4;
    const hy = PIPE_CY + RR * Math.cos(TH), hz = RR * Math.sin(TH);
    const pts = [];
    for (let x = x0; x <= x1 + 1e-3; x += 0.15) {
      const f = ((x - x0) % 1.2) / 1.2;                               // a hook every 1.2 m
      pts.push(new THREE.Vector3(x, hy - Math.sin(f * Math.PI) * 0.14, hz - Math.sin(f * Math.PI) * 0.05));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    T.add(new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, 0.006, 3, false), M.wire));
    for (let i = 0; i < 22; i++) {
      const p = curve.getPointAt((i + 0.5) / 22);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), rnd(i * 7.7) < 0.33 ? M.dark : M.fairy);
      bulb.scale.y = 1.4; bulb.position.set(p.x, p.y - 0.03, p.z);
      T.add(bulb);
    }
    for (let x = x0; x <= x1 + 1e-3; x += 1.2) T.add(slab(0.03, 0.05, 0.03, M.rust, x, hy + 0.02, hz + 0.01));   // the hooks
  }

  // ---- the invert: silted flat floor with a wet channel down the middle ---
  {
    const IN = new THREE.Group();
    T.add(IN);
    // silt shelf either side of the channel
    for (const s of [-1, 1]) {
      const shelf = slab(BORE_LEN + 0.4, 0.1, 0.72, M.silt, BORE_LEN / 2 - 0.1, FLOOR_Y - 0.05, s * 0.72);
      IN.add(shelf);
    }
    // the channel bed, a touch lower
    IN.add(slab(BORE_LEN + 0.4, 0.08, 0.74, M.dark, BORE_LEN / 2 - 0.1, FLOOR_Y - 0.075, 0));
    // standing water + the green algae running down it (photo 4)
    const water = slab(BORE_LEN + 0.3, 0.012, 0.70, M.water, BORE_LEN / 2 - 0.1, FLOOR_Y - 0.022, 0);
    IN.add(water);
    for (let i = 0; i < 26; i++) {
      const x = 0.2 + rnd(i * 5.1) * (BORE_LEN - 0.4);
      const w = 0.25 + rnd(i * 2.7) * 0.9;
      const patch = slab(w, 0.006, 0.16 + rnd(i * 7.3) * 0.5, M.algae,
        x, FLOOR_Y - 0.012 + i * 0.0003, (rnd(i * 3.9) - 0.5) * 0.5);   // each its own height (all under the silt's top): overlapping at one, their tops fought
      IN.add(patch);
    }
    // slime creeping up the pipe walls at the waterline: slices of cylinder at
    // wall radius (a flat slab in a round pipe stands off the wall as a panel).
    // Same angle rule as the stain run below: (y, z) = (sin t, cos t) * r.
    const tFloor = Math.asin((FLOOR_Y - PIPE_CY) / BORE_R);           // where the silt meets the wall
    for (const s of [-1, 1])
      for (let i = 0; i < 14; i++) {
        const x = 0.3 + rnd(i * 8.2 + s) * (BORE_LEN - 0.6), len = 0.5 + rnd(i) * 0.9;
        const tTop = Math.asin((FLOOR_Y + 0.14 + rnd(i * 4.4) * 0.3 - PIPE_CY) / BORE_R);
        const a0 = s > 0 ? tFloor : Math.PI - tTop, span = tTop - tFloor;
        const sg = new THREE.CylinderGeometry(BORE_R - 0.012, BORE_R - 0.012, len, 4, 1, true, a0, span);
        sg.rotateZ(Math.PI / 2);
        const sl = new THREE.Mesh(sg, M.slime);
        sl.position.set(x, PIPE_CY, 0);
        IN.add(sl);
      }
    // He has laid a dry way in over the wet for the last stretch: old boards
    // two abreast on cross cleats, each length a little off true. Flat on the
    // silt, so it is walked over, not around.
    for (let x = 7.4, k = 0; x < BORE_LEN - 0.9; x += 1.26, k++) {
      const yaw = (rnd(k * 3.3) - 0.5) * 0.06, zc = (rnd(k * 1.9) - 0.5) * 0.08;
      for (const dz of [-0.13, 0.13]) IN.add(slab(1.18, 0.025, 0.2, M.wood, x + 0.6, FLOOR_Y + 0.03, zc + dz, 0, yaw, (rnd(k + dz) - 0.5) * 0.02));
      for (const dx of [0.12, 1.08]) IN.add(slab(0.07, 0.03, 0.62, M.wood, x + dx, FLOOR_Y + 0.003, zc, 0, yaw, 0));
    }
    // grit, pebbles and a stranded bit of driftwood on the shelves
    for (let i = 0; i < 22; i++) {
      const s = rnd(i * 11.1) < 0.5 ? -1 : 1;
      const r = 0.03 + rnd(i * 2.2) * 0.06;
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.silt);
      p.position.set(0.3 + rnd(i * 6.6) * (BORE_LEN - 0.6), FLOOR_Y + r * 0.4, s * (0.5 + rnd(i * 3.1) * 0.6));
      p.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, rnd(i + 2) * 3);
      IN.add(p);
    }
    const stick = slab(0.9, 0.05, 0.07, M.wood, 2.4, FLOOR_Y + 0.03, -0.85, 0, 0.5, 0.04);
    IN.add(stick);
    /* WHAT THE FLOW HAS DUMPED: a tyre half in the silt, broken brick, bottles,
     * a rag caught on a joint, a sodden board — things the water brought in
     * and left where it slackened, against the walls and the joints. */
    {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 8, 16), M.dark);
      tyre.position.set(5.2, FLOOR_Y + 0.3, 1.02); tyre.rotation.set(-Math.PI / 2 + 0.95, 0, 0.15); IN.add(tyre);   // leant up the curve of the wall, out of the walk
      for (let i = 0; i < 9; i++) {
        const bk = slab(0.2, 0.06, 0.1, M.brickM, 1.5 + rnd(i * 7.3) * 14, FLOOR_Y + 0.03, (rnd(i * 2.1) < 0.5 ? -1 : 1) * (0.55 + rnd(i * 5.5) * 0.3),
          rnd(i) * 0.4, rnd(i * 3.1) * TAU, rnd(i * 4.2) * 0.3);
        IN.add(bk);
      }
      for (let i = 0; i < 4; i++) {
        const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.22, 7), M.water);
        bt.position.set(3 + i * 3.4 + rnd(i) * 1.2, FLOOR_Y + 0.035, (rnd(i * 6.6) - 0.5) * 1.3);
        bt.rotation.set(Math.PI / 2, rnd(i * 2.5) * TAU, 0); IN.add(bt);
      }
      for (const x of [3.55, 9.1]) IN.add(slab(0.32, 0.012, 0.22, M.cloth, x, FLOOR_Y + 0.01, (x > 5 ? -1 : 1) * 0.62, 0, 0.6, 0.05));
      IN.add(slab(1.3, 0.035, 0.22, M.wood, 12.6, FLOOR_Y + 0.02, -0.7, 0, -0.35, 0.03));
    }
    bakeScatter(IN);
  }

  const ER = new THREE.Group();
  T.add(ER);
  // ---- the outfall channel the water has cut down the beach --------------
  // Everything here sits just *above* y = 0: the beach sand is a flat plane
  // recentred on the player, so a trench dug below it would be covered over.
  // Keep it quiet — real scour is a damp shallow dip and some shifted gravel,
  // not a brown path. The read comes from low berms in the beach's own sand.
  {
    const N = 24;
    // The width has to feather to nothing at the seaward end. Left blunt, the
    // strip stops on a hard straight edge and reads as a plank lying on the
    // sand rather than a channel petering out.
    const centre = (t) => {
      const fade = 1 - Math.pow(Math.max(0, (t - 0.78) / 0.22), 1.8);
      return {
        x: -0.9 - t * 12.4,
        z: Math.sin(t * 3.1) * 1.15 + Math.sin(t * 7.7) * 0.3,
        w: (0.55 + t * 2.3) * fade,
      };
    };
    // a damp dip, barely darker than the beach and with soft edges
    const pos = [], idx = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), c = centre(t);
      pos.push(c.x, 0.010, c.z - c.w,  c.x, 0.004, c.z,  c.x, 0.010, c.z + c.w);
    }
    for (let i = 0; i < N - 1; i++) {
      const a = i * 3, b = (i + 1) * 3;
      idx.push(a, a + 1, b + 1, a, b + 1, b, a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
    }
    const bed = new THREE.BufferGeometry();
    bed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bed.setIndex(idx);
    bed.computeVertexNormals();
    ER.add(new THREE.Mesh(bed, M.wetsand));

    // the last thread of water, only near the mouth where it still runs
    const wp = [], wi = [], WN = 10;
    for (let i = 0; i < WN; i++) {
      const t = (i / (WN - 1)) * 0.42, c = centre(t), hw = 0.07 + t * 0.22;
      wp.push(c.x, 0.014, c.z - hw, c.x, 0.014, c.z + hw);
    }
    for (let i = 0; i < WN - 1; i++) {
      const a = i * 2, b = (i + 1) * 2;
      wi.push(a, a + 1, b + 1, a, b + 1, b);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.setIndex(wi);
    wg.computeVertexNormals();
    ER.add(new THREE.Mesh(wg, M.water));

    // Low banks along both edges. Boxes read as flat plates dropped on the
    // beach, so these are squashed low-poly lumps in the beach's own sand.
    const mound = (w, h, d, mat, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      m.rotation.set(0, ry, 0);
      return m;
    };
    for (let i = 0; i < 30; i++) {
      const t = rnd(i * 2.3), c = centre(t), sg = i % 2 ? 1 : -1;
      const h = 0.10 + rnd(i * 5.7) * 0.16 * (1 - t * 0.4);
      ER.add(mound(1.5 + rnd(i * 3.1) * 2.4, h, 0.8 + rnd(i * 7.9) * 1.3, M.drysand,
        c.x + (rnd(i * 9.2) - 0.5) * 1.2, h * 0.16,
        c.z + sg * (c.w + 0.2 + rnd(i * 4.5) * 0.8),
        rnd(i * 1.7) * 3.1));
    }
    // gravel the flow has sorted out along the edges
    for (let i = 0; i < 40; i++) {
      const t = rnd(i * 6.1), c = centre(t);
      const r = 0.04 + rnd(i * 3.7) * (0.07 + t * 0.10);
      const k = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.cobble);
      k.position.set(c.x + (rnd(i * 8.3) - 0.5) * 1.8, r * 0.35,
        c.z + (rnd(i * 4.9) - 0.5) * (c.w * 2.3));
      k.scale.y = 0.45 + rnd(i * 2.2) * 0.3;
      k.rotation.set(rnd(i) * 3, rnd(i + 3) * 3, rnd(i + 7) * 3);
      ER.add(k);
    }
    // a few blocks fallen off the headwall, close in where they'd actually be
    for (let i = 0; i < 6; i++) {
      const s = rnd(i * 11.7);
      const r = 0.26 + s * 0.34;
      const k = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.rock);
      k.position.set(-1.3 - rnd(i * 3.3) * 3.0, r * 0.34,
        (i % 2 ? 1 : -1) * (2.1 + rnd(i * 5.5) * 2.2));
      k.scale.set(1, 0.55 + s * 0.25, 0.88);
      k.rotation.set((s - 0.5) * 0.4, s * 3, (rnd(i) - 0.5) * 0.3);
      ER.add(k);
    }
    // the scour pool at the lip, shallow and soft
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 14), M.water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-1.6, 0.012, 0);
    pool.scale.set(1, 1, 0.66);
    ER.add(pool);
    // Braided side channels: the flow has wandered and left older, drier
    // courses either side of the live one. Cheap, and it's what actually
    // makes a scour read as scour rather than as one drawn line.
    for (const sg of [-1, 1]) {
      const bp = [], bi = [], BN = 14;
      for (let i = 0; i < BN; i++) {
        const t = 0.18 + (i / (BN - 1)) * 0.8, c = centre(t);
        const off = sg * (c.w * 0.72 + 0.35 + Math.sin(t * 5.2 + sg) * 0.5);
        const hw = 0.18 + t * 0.55;
        bp.push(c.x, 0.008, c.z + off - hw, c.x, 0.008, c.z + off + hw);
      }
      for (let i = 0; i < BN - 1; i++) {
        const a = i * 2, b2 = (i + 1) * 2;
        bi.push(a, a + 1, b2 + 1, a, b2 + 1, b2);
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
      bg.setIndex(bi);
      bg.computeVertexNormals();
      ER.add(new THREE.Mesh(bg, M.wetsand));
    }
    // rills running off the banks into the main channel
    for (let i = 0; i < 14; i++) {
      const t = 0.1 + rnd(i * 4.8) * 0.85, c = centre(t), sg = i % 2 ? 1 : -1;
      const len = 0.5 + rnd(i * 2.6) * 1.1;
      ER.add(slab(len, 0.006, 0.10 + rnd(i * 6.2) * 0.12, M.wetsand,
        c.x + (rnd(i * 3.9) - 0.5) * 0.9, 0.009,
        c.z + sg * (c.w + 0.3 + rnd(i * 7.4) * 0.9),
        0, sg * (0.5 + rnd(i) * 0.7), 0));
    }
    // a low scarp where the bank has been undercut and slumped
    for (let i = 0; i < 12; i++) {
      const t = rnd(i * 5.4), c = centre(t), sg = i % 2 ? 1 : -1;
      const h = 0.07 + rnd(i * 2.8) * 0.12;
      ER.add(mound(0.7 + rnd(i * 3.6) * 1.0, h, 0.3 + rnd(i * 8.1) * 0.5, M.drysand,
        c.x + (rnd(i * 9.7) - 0.5) * 0.7, h * 0.2,
        c.z + sg * (c.w + 0.05), rnd(i * 2.2) * 3.1));
    }
    // coarser lag gravel left where the flow dropped it, out toward the sea
    for (let i = 0; i < 22; i++) {
      const t = 0.45 + rnd(i * 7.7) * 0.55, c = centre(t);
      const r = 0.05 + rnd(i * 4.3) * 0.09;
      const k = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.cobble);
      k.position.set(c.x + (rnd(i * 6.9) - 0.5) * 2.4, r * 0.3,
        c.z + (rnd(i * 3.1) - 0.5) * (c.w * 2.6));
      k.scale.y = 0.4 + rnd(i * 5.5) * 0.25;
      k.rotation.set(rnd(i) * 3, rnd(i + 2) * 3, rnd(i + 5) * 3);
      ER.add(k);
    }

    // sand slumped away from the foot of the concrete
    for (let i = 0; i < 9; i++) {
      const s = rnd(i * 8.8), sg = i % 2 ? 1 : -1;
      ER.add(mound(0.9 + s * 1.2, 0.14 + s * 0.2, 0.9 + s * 1.3, M.drysand,
        -0.7 - s * 1.0, 0.02 + s * 0.03, sg * (1.7 + s * 2.3), s * 3.1));
    }
  }

  // ---- seaweed and wrack piled at the mouth (photo 1) --------------------
  for (let i = 0; i < 16; i++) {
    const a = (rnd(i * 4.7) - 0.5) * 3.2;
    const w = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + rnd(i * 2.4) * 0.2, 0), M.seaweed);
    w.position.set(-0.35 - rnd(i * 5.5) * 1.3, 0.05, a);
    w.scale.set(1.6, 0.28, 1.0);
    w.rotation.y = rnd(i) * 3;
    ER.add(w);
  }

  bakeScatter(ER);

  // ================= the threshold — a steel door standing open ===========
  const DOOR = new THREE.Group();
  DOOR.position.set(DOOR_X, FLOOR_Y, 0);
  T.add(DOOR);
  {
    // The bulkhead is built as four slabs *around* the opening — there is
    // deliberately no full-width slab, or it would plug the doorway.
    const OW = 1.0, OH = 2.12;   // half-width / height of the doorway
    // WW must span the *room*, not just the pipe — anything narrower leaves
    // an open gap at each front corner that you can see the sky through
    const WW = ROOM_HZ * 2 + 0.5, TH = 0.52;   // wall width / thickness
    const side = (WW - OW * 2) / 2;
    DOOR.add(slab(TH, 3.4, side, M.conc, 0.2, 1.55, OW + side / 2));
    DOOR.add(slab(TH, 3.4, side, M.conc, 0.2, 1.55, -OW - side / 2));
    DOOR.add(slab(TH, 3.4 - OH, OW * 2, M.conc, 0.2, OH + (3.4 - OH) / 2, 0));
    // floor across the threshold — the bore invert stops short of the room
    // dropped 5 mm: its top used to be exactly level with both the bore invert
    // and the room floor, and the coplanar faces flickered
    DOOR.add(slab(1.15, 0.2, 2.3, M.conc, 0.24, -0.105, 0));
    DOOR.add(slab(0.62, 0.05, OW * 2, M.steel, 0.2, 0.014, 0));     // sill plate

    // steel frame + the heavy leaf swung right back out of the way (photo 8)
    // x 0.05 not 0.02: at 0.02 the frame's back face landed exactly on the
    // wall's front face (both at -0.06) and the two z-fought
    // and the jambs stand 1 cm proud into the opening: at OW + 0.06 their inner faces were the wall's own (z = ±OW)
    DOOR.add(slab(0.16, OH + 0.1, 0.12, M.steel, 0.05, OH / 2, OW + 0.05));
    DOOR.add(slab(0.16, OH + 0.1, 0.12, M.steel, 0.05, OH / 2, -OW - 0.05));
    DOOR.add(slab(0.16, 0.12, OW * 2 + 0.24, M.steel, 0.05, OH + 0.05, 0));
    // frame bolts
    for (const sg of [-1, 1]) for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 6), M.rust);
      b.rotation.z = Math.PI / 2;
      b.position.set(-0.07, 0.18 + i * 0.47, sg * (OW + 0.06));
      DOOR.add(b);
    }
    /* THE LEAF, BUILT IN ITS OWN FRAME. Its kick plate, locking dogs and wheel
     * were placed at offsets in the DOOR's axes and then turned about their
     * own centres, so on a leaf standing at an angle they hung off it in the
     * air (the owner's "the door has geometry floating"). Now the leaf is a
     * frame turned once, every fitting is set on its face in that frame, and
     * the whole is handed to DOOR with the turn baked in (so it still bakes). */
    /* AND IT HANGS ON THE ROOM SIDE, OPEN AGAINST THE WALL (the owner,
     * 2026-10-16: "the door is colliding through the wall"). It stood at 24
     * degrees with its hinge end 23 cm inside the bulkhead (x 0.23 against a
     * wall from -0.06 to 0.46), on hinges that were on the TUNNEL side of the
     * frame. Now the hinge line is on the room side at the jamb (z -1.06), the
     * leaf swung right round and resting ajar off the room's front wall
     * (`LA` 0.12 rad), its fittings on the face you see, the dogs and the wheel
     * at the latch edge, which is the free one.
     * AND IT IS ON ITS HINGES (the owner, 2026-10-17: "the door is off its
     * hinges"). The hinge line stood 18 cm out from the wall with nothing
     * between, a leaf leaning in the air. The opening has a steel frame on the
     * room side now (the wall's room face is at x 0.484 in this frame,
     * measured), the pin is at that frame's corner, the knuckles are strapped
     * to the frame on one side and across the leaf on the other, and the leaf
     * rests open against its own frame, nearly flat to the wall. */
    const WF = 0.484, PF = 0.08;                                            // the wall's room face; the frame's depth off it
    for (const s of [-1, 1]) DOOR.add(slab(PF, OH + 0.1, 0.12, M.steel, WF + PF / 2, OH / 2 + 0.05, s * (OW + 0.06)));   // room-side jambs
    DOOR.add(slab(PF, 0.12, OW * 2 + 0.24, M.steel, WF + PF / 2, OH + 0.1, 0));                                       // and its head
    {
      const TH = 0.10, LW = 1.9, LH = OH - 0.06, LA = 0.03;
      const HX = WF + PF + 0.09, HZ = -OW - 0.03, D = LW / 2 + 0.03;        // the pin: off the frame by the fittings on the leaf's back
      const L = new THREE.Group(); L.rotation.y = LA;
      L.position.set(HX - D * Math.sin(LA), 0, HZ - D * Math.cos(LA));
      L.add(slab(TH, LH, LW, M.steel, 0, LH / 2, 0));
      // a lip round the edge, the way a watertight door is pressed
      for (const s of [-1, 1]) L.add(slab(TH + 0.03, LH, 0.05, M.steel, 0, LH / 2, s * (LW / 2 - 0.025)));
      L.add(slab(TH + 0.03, 0.05, LW, M.steel, 0, LH - 0.025, 0));
      L.add(slab(TH + 0.03, 0.05, LW, M.steel, 0, 0.025, 0));
      for (const side of [-1, 1]) {
        const fx = side * (TH / 2 + 0.008);
        L.add(slab(0.016, 0.48, LW - 0.2, M.rust, fx, 0.3, 0));                          // kick plate, both faces
        for (let i = 0; i < 3; i++) L.add(slab(0.03, 0.2, 0.09, M.rust, fx + side * 0.012, 0.45 + i * 0.7, -LW / 2 + 0.12));  // dogs on the latch edge
        for (let i = 0; i < 2; i++) L.add(slab(0.02, 0.05, LW - 0.4, M.rust, fx, 0.75 + i * 0.6, 0));    // stiffeners
      }
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.026, 6, 16), M.rust);
      wheel.rotation.y = Math.PI / 2; wheel.position.set(TH / 2 + 0.09, OH / 2, -0.35); L.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8), M.rust);
      hub.rotation.z = Math.PI / 2; hub.position.set(TH / 2 + 0.05, OH / 2, -0.35); L.add(hub);
      for (let i = 0; i < 3; i++) { const sp = slab(0.02, 0.38, 0.02, M.rust, TH / 2 + 0.09, OH / 2, -0.35, i * Math.PI / 3, 0, 0); L.add(sp); }
      // the knuckles on the pin, a strap across the leaf from each and a leaf of it back onto the frame
      for (let i = 0; i < 3; i++) {
        const y = 0.3 + i * 0.78;
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.17, 8), M.rust);
        h.position.set(0, y, D); L.add(h);
        L.add(slab(0.014, 0.08, 0.5, M.rust, TH / 2 + 0.012, y, D - 0.25));            // strap over the leaf's face
        L.add(slab(0.11, 0.08, 0.014, M.rust, -0.055, y, D + 0.035));                     // and back to the frame
      }
      L.updateMatrix();
      for (const c of [...L.children]) { c.applyMatrix4(L.matrix); DOOR.add(c); }
    }
    // (its hinges are on the leaf, on the room-side frame)
    // No spall chunks on the jamb: sitting proud of the wall with nothing
    // behind them they just read as debris floating in the doorway.
  }

  // ================= the chamber somebody lives in =======================
  const R = new THREE.Group();
  R.position.y = FLOOR_Y;          // the room floor is the same level as the invert
  T.add(R);
  const rcx = (ROOM_X0 + ROOM_X1) / 2, rlen = ROOM_X1 - ROOM_X0;
  {
    // shell — brick walls, concrete floor and a joisted ceiling
    // floor and side walls run back 9 cm past ROOM_X0 to the bulkhead's face
    // (DOOR_X + 0.46), or a slit opens along the foot and up both corners
    const fx0 = DOOR_X + 0.44, flen = ROOM_X1 - fx0, fcx = (fx0 + ROOM_X1) / 2;
    R.add(slab(flen, 0.2, ROOM_HZ * 2 + 0.4, M.roomConc, fcx, -0.1, 0));                 // floor
    R.add(slab(flen, ROOM_H + 0.4, 0.25, M.brickM, fcx, ROOM_H / 2, ROOM_HZ + 0.12));    // side walls
    R.add(slab(flen, ROOM_H + 0.4, 0.25, M.brickM, fcx, ROOM_H / 2, -ROOM_HZ - 0.12));
    // Back wall, built around a real opening for the outlet — a solid slab
    // leaves the pipe with no hole in it, just a dark ring pasted on brick.
    {
      const oy = 1.62, oz = 0.55, oh = 0.34;          // outlet centre / half-size
      const y0 = -0.2, y1 = ROOM_H + 0.2;
      const z0 = -(ROOM_HZ + 0.25), z1 = ROOM_HZ + 0.25;
      const bw = (yc, hh, zc, dd) =>
        R.add(slab(0.25, hh, dd, M.brickM, ROOM_X1 + 0.12, yc, zc));
      bw((y0 + y1) / 2, y1 - y0, (z0 + oz - oh) / 2, (oz - oh) - z0);      // left of it
      bw((y0 + y1) / 2, y1 - y0, (oz + oh + z1) / 2, z1 - (oz + oh));      // right of it
      bw((y0 + oy - oh) / 2, (oy - oh) - y0, oz, oh * 2);                  // under it
      bw((oy + oh + y1) / 2, y1 - (oy + oh), oz, oh * 2);                  // over it
      /* A closed box behind the hole, so the bore has somewhere dark to go —
       * and it is set a long way back, because the point of the outlet is
       * that you can look down it. Everything past the back wall is empty:
       * the cliff is a single plane 23 m seaward of here, so the shaft runs
       * into nothing at all. The box has to be there or the sky dome, which
       * is centred on the player, shows through the open end of the throat. */
      R.add(slab(2.0, 1.5, 1.5, M.void, ROOM_X1 + 8.7, oy, oz));
    }
    R.add(slab(rlen + 0.6, 0.22, ROOM_HZ * 2 + 0.5, M.roomConc, rcx, ROOM_H + 0.11, 0)); // ceiling slab
    // The bulkhead's room side is the door's concrete, built for the pipe and
    // dark as the pipe: from inside it read as a black fourth wall. Faced in
    // the room's brick, its uv cut down so the courses match the side walls'
    // (a box maps its whole texture onto every face, whatever the face's size).
    {
      const fx = DOOR_X + 0.46 + 0.012, OW = 1.0, OH = 2.12, sideW = ROOM_H + 0.4;
      const veneer = (w, h, y, z) => {
        const m = slab(0.024, h, w, M.brickM, fx, y, z);
        const uv = m.geometry.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / rlen, uv.getY(i) * h / sideW);
        R.add(m);
      };
      for (const s of [-1, 1]) veneer(ROOM_HZ - OW, ROOM_H, ROOM_H / 2, s * (OW + (ROOM_HZ - OW) / 2));
      veneer(OW * 2, ROOM_H - OH - 0.11, (ROOM_H + OH + 0.11) / 2, 0);
    }

    // exposed joists + conduit under the ceiling (photo 5)
    for (let i = 0; i < 9; i++) {
      const x = ROOM_X0 + 0.5 + i * (rlen - 1.0) / 8;
      R.add(slab(0.14, 0.24, ROOM_HZ * 2, M.wood, x, ROOM_H - 0.13, 0));
    }
    /* the conduit runs tight under the joists, strapped to each one it
     * crosses — it hung a few centimetres clear of them, on nothing */
    for (const z of [-1.6, -1.25, 1.9]) {
      const pipe = xCyl(0.06, 0.06, rlen - 0.4, 8, z > 0 ? M.rust : M.steel);
      pipe.position.set(rcx, ROOM_H - 0.31, z);
      R.add(pipe);
      for (let i = 0; i < 9; i++) {
        const x = ROOM_X0 + 0.5 + i * (rlen - 1.0) / 8;
        R.add(slab(0.05, 0.03, 0.15, M.steel, x, ROOM_H - 0.385, z));          // the strap under it
        for (const s of [-1, 1]) R.add(slab(0.05, 0.13, 0.012, M.steel, x, ROOM_H - 0.31, z + s * 0.068));
      }
    }
    /* a fat soil pipe down the back corner from the ceiling to the floor,
     * collared at its joints and bracketed to the wall, going into the floor
     * through a cast shoe — it used to stop in mid-air at 1.2 m */
    {
      const sx = ROOM_X1 - 0.24, sz = -ROOM_HZ + 0.24;
      R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, ROOM_H, 10), M.rust).translateX(sx).translateY(ROOM_H / 2).translateZ(sz));
      for (const y of [0.12, 1.15, 2.2]) R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.09, 10), M.rust).translateX(sx).translateY(y).translateZ(sz));
      for (const y of [0.7, 1.8]) {
        R.add(slab(0.04, 0.05, 0.26, M.steel, sx + 0.12, y, sz));                // to the back wall
        R.add(slab(0.26, 0.05, 0.04, M.steel, sx, y, sz - 0.12));                // and the side wall
      }
    }

    // ---- the outlet in the back wall, bleeding rust down the brick -------
    // (square rusted frame, round bore behind bars, ochre run below)
    {
      // +Z of this group points *into the room*, so anything set into the
      // wall needs a negative z — a positive one leaves the pipe sticking out.
      const OX = ROOM_X1 - 0.005, OY = 1.62, OZ = 0.55;   // on the back wall
      const F = new THREE.Group();
      F.position.set(OX, OY, OZ);
      F.rotation.y = -Math.PI / 2;                        // face into the room
      R.add(F);
      // render panel the frame is bolted to, with the bore hole in it
      // Round hole, and wide enough to cover the corners of the square opening
      // cut in the brick — otherwise the hole reads square.
      /* a precast concrete surround set in the brick: a square slab with the
       * round bore through it, standing a little proud of the wall, so the
       * square cut in the brick never shows and the hole has an edge with depth
       * (the flat ring it replaces read as a sticker on the wall) */
      {
        const sh = new THREE.Shape();
        sh.moveTo(-0.5, -0.5); sh.lineTo(0.5, -0.5); sh.lineTo(0.5, 0.5); sh.lineTo(-0.5, 0.5); sh.closePath();
        const hole = new THREE.Path(); hole.absarc(0, 0, 0.30, 0, Math.PI * 2, true); sh.holes.push(hole);
        const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 20 });
        const uv = sg.getAttribute('uv');                       // the extrude's uv is in metres already: one tile a metre
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * 0.6);
        const panel = new THREE.Mesh(sg, M.surround);
        panel.position.z = -0.065;
        F.add(panel);
      }
      /* THE GRATE COMES OFF NOW (the owner's word, 2026-10-15): its frame is
       * held to the panel by four screws, one in each corner, and with the
       * screwdriver they come out and the whole grate — frame, bars, flats
       * and welds — lifts away as one piece. So it is its own group, `G`, and
       * the screws are not built here: the game puts them on the spots in
       * `grateScrews` (F's own frame, heads facing +Z, into the room), where
       * the corner bolts used to be. */
      const G = new THREE.Group();
      G.name = 'grate';
      G.userData.noBake = true;          // it moves: main.js's `bakeStatic` would melt it into the wall
      F.add(G);
      /* the square frame: four lengths of angle iron, a flange to the front
       * and a web back into the hole, mitred at the corners, in rusted iron */
      const FW = 0.44, FT = 0.075;
      for (const [dx, dy, w, h] of [[0, FW, FW * 2 + FT, FT], [0, -FW, FW * 2 + FT, FT],
                                    [FW, 0, FT, FW * 2 + FT], [-FW, 0, FT, FW * 2 + FT]]) {
        G.add(slab(w, h, 0.014, M.iron, dx, dy, 0.052));                                  // the flange
        const web = w > h ? slab(w - FT, 0.014, 0.07, M.iron, dx, dy - Math.sign(dy) * (FT / 2 - 0.007), 0.017)
                          : slab(0.014, h - FT, 0.07, M.iron, dx - Math.sign(dx) * (FT / 2 - 0.007), dy, 0.017);
        G.add(web);
      }
      T.userData.grateScrews = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) T.userData.grateScrews.push([sx * (FW - 0.02), sy * (FW - 0.02), 0.059]);
      // the bore: a lip, then a shaft running back into the dark
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.04, 5, 16), M.conc);
      lip.position.z = -0.01;
      F.add(lip);
      /* The shaft. Five metres of it, running back into the hill — long
       * enough that looking down it reads as a tunnel rather than a recess,
       * which is the whole of what the gate is for. Its material is BackSide,
       * so from anywhere but the bore itself it does not draw at all. */
      const THROAT_LEN = 8.0;
      /* AND YOU CANNOT SEE THE END OF IT. Everything down the bore is darkened
       * by its distance from the eye, after lighting, so the joints and the
       * water run away into black a few metres in and the cap never shows:
       * at the peek's 0.78 m back, 3 m down reads a quarter, 6 m a twentieth,
       * the far end nothing. A pipe with a visible end is a recess. */
      const PIPE_MURK = 0.62, PIPE_CLEAR = 1.3;
      const murk = (m) => {
        m.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
            '#include <opaque_fragment>\n  gl_FragColor.rgb *= exp(-max(0.0, length(vViewPosition) - ' +
            PIPE_CLEAR.toFixed(2) + ') * ' + PIPE_MURK.toFixed(2) + ');');
        };
        m.customProgramCacheKey = () => 'pipeMurk';
        return m;
      };
      const thTex = throatTex();
      thTex.repeat.set(1, THROAT_LEN / 2.0);         // a joint ring every ~0.5 m
      const throatMat = new THREE.MeshStandardMaterial({
        map: thTex, color: 0x3a4048, roughness: 0.82, metalness: 0.05,
        emissive: 0x080b0e, emissiveMap: thTex, side: THREE.BackSide,
      });
      murk(throatMat);
      const throat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.30, THROAT_LEN, 24, 6, true), throatMat);
      throat.rotation.x = Math.PI / 2;
      throat.position.z = -(THROAT_LEN / 2 + 0.02);
      F.add(throat);
      /* Slime hanging off the crown. Seven thin dark tongues at irregular
       * spacing: they break the pipe's perfect circle, they carry the eye
       * down its length, and they are what makes it read as somewhere nobody
       * has been for a very long time. */
      // dark and short, not green and spiky: at M.slime's colour and twice
      // this length they read as spikes growing out of the pipe
      const drool = new THREE.MeshStandardMaterial({
        color: 0x1d2a20, roughness: 1, metalness: 0, emissive: 0x080d0a, flatShading: true });
      murk(drool);
      const ribMat = murk(M.dark.clone());
      for (let i = 0; i < 9; i++) {
        const z = -(0.5 + rnd(i * 5.1) * (THROAT_LEN - 1.2));
        const a = (rnd(i * 2.3) - 0.5) * 2.2;                 // near the crown
        const len = 0.025 + rnd(i * 7.7) * 0.055;
        const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.006, len, 4), drool);
        tongue.position.set(Math.sin(a) * 0.293, Math.cos(a) * 0.293 - len / 2, z);
        tongue.rotation.z = -a;
        F.add(tongue);
      }
      /* Ribs down the shaft. Without them the bore is a smooth dark tube with
       * no scale in it and the far end could be one metre away or twenty;
       * the rings are what let the eye read depth, exactly as the joints do
       * in a real brick sewer. */
      for (let i = 1; i <= 11; i++) {
        const rz = -(0.35 + i * 0.72);
        if (-rz > THROAT_LEN) break;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.292, 0.016, 4, 18), ribMat);
        rib.position.z = rz;
        F.add(rib);
      }
      /* Standing water along the invert. This is the depth cue that does the
       * most work — it is the one continuous thing running away from you —
       * but it has to stay NARROW and DIM: full bore width it climbs over
       * the ribs and the whole shaft reads as a flight of stairs. */
      const invert = new THREE.Mesh(new THREE.PlaneGeometry(0.20, THROAT_LEN - 0.2),
        murk(new THREE.MeshStandardMaterial({
          color: 0x16202a, roughness: 0.12, metalness: 0.35, emissive: 0x0b1219,
        })));
      invert.rotation.x = -Math.PI / 2;
      invert.position.set(0, -0.262, -(THROAT_LEN / 2 + 0.02));
      F.add(invert);
      // the grille: heavy bars in a welded frame, plus cross-flats behind.
      // This is the thing you try to get through and can't.
      // round bars, a hair out of true, eaten thin in places
      for (let i = 0; i < 4; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, FW * 1.84, 8), M.iron);
        bar.position.set(-0.24 + i * 0.16, 0, 0.02);
        bar.rotation.z = (rnd(i * 4.4) - 0.5) * 0.05;
        G.add(bar);
        const scab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.022, 0), M.rust);   // a blister of rust on it
        scab.position.set(-0.24 + i * 0.16, (rnd(i * 2.9) - 0.5) * 0.6, 0.025); scab.scale.set(0.9, 1.6, 0.7);
        G.add(scab);
      }
      // two flats across behind them, riveted where they cross
      for (let i = 0; i < 2; i++) {
        G.add(slab(FW * 1.84, 0.04, 0.012, M.iron, 0, -0.16 + i * 0.32, -0.002));
        for (let k = 0; k < 4; k++) {
          const rv = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.iron);
          rv.rotation.x = Math.PI / 2; rv.position.set(-0.24 + k * 0.16, -0.16 + i * 0.32, 0.038);
          G.add(rv);
        }
      }
      // silt and scum caught against the bars at the bottom of the bore
      for (let i = 0; i < 5; i++) {
        const g2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03 + rnd(i * 3.3) * 0.04, 0), M.slime);
        g2.position.set(-0.2 + rnd(i * 7.1) * 0.4, -0.22 - rnd(i * 2.2) * 0.05, -0.02);
        F.add(g2);
      }
      // a trickle still coming through
      const trickle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.012), M.water);
      trickle.position.set(0.03, -0.30, 0.02);
      F.add(trickle);
      // The crosshair threads straight between the bars and on down the open
      // bore, hitting nothing, so the grille needs an invisible face to catch
      // the raycast — same trick as the tiny props elsewhere in the game.
      const proxy = new THREE.Mesh(new THREE.CircleGeometry(0.46, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      proxy.name = 'hitProxy';
      proxy.position.z = 0.05;
      F.add(proxy);
      T.userData.outlet = F;
      T.userData.grate = G;
      // the bleed running down the wall below it
      const bleed = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), M.bleed);
      bleed.position.set(ROOM_X1 - 0.012, OY - 1.02, OZ);           // ON the wall: at 0.06 it hung five centimetres off it
      bleed.rotation.y = -Math.PI / 2;
      R.add(bleed);
      // and a wet patch where it lands
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), M.puddle);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(ROOM_X1 - 0.5, 0.007, OZ);
      R.add(pool);
    }

    // damp blooms + puddles on the floor (photo 5)
    // Feathered decals now, not discs: a flat dark polygon on a lit floor
    // reads as a hole cut through it. Kept off the rug and out from under
    // the furniture, so each one is somewhere water would actually stand.
    for (let i = 0; i < 9; i++) {
      const s = 0.7 + rnd(i * 3.7) * 1.3;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s * (0.7 + rnd(i * 2.1) * 0.5)), M.puddle);
      p.rotation.set(-Math.PI / 2, 0, rnd(i * 6.1) * TAU);
      p.position.set(ROOM_X0 + 0.9 + rnd(i * 9.1) * (rlen - 1.8), 0.006, (rnd(i * 5.3) - 0.5) * (ROOM_HZ * 1.3));
      R.add(p);
    }
    // damp running down the side walls from the joists
    for (let i = 0; i < 8; i++) {
      const s = i % 2 ? 1 : -1, w = 0.6 + rnd(i * 2.9) * 0.9, h = 1.3 + rnd(i * 4.1) * 1.0;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.damp);
      d.position.set(ROOM_X0 + 0.6 + rnd(i * 8.8) * (rlen - 1.2), ROOM_H - 0.25 - h / 2, s * (ROOM_HZ - 0.006));
      d.rotation.y = s > 0 ? Math.PI : 0;
      R.add(d);
    }
  }

  // ---- somebody's home ---------------------------------------------------
  // Built from parts, the way he would have: boards with gaps, posts, hoops.
  // Everything goes straight into R so bakeScatter folds it down by material;
  // `turned` builds a piece square in its own frame and hands each part to R
  // with the turn baked in (a nested Group would escape the merge).
  {
    const turned = (x, y, z, ry, build) => {
      const F = new THREE.Group(); F.position.set(x, y, z); F.rotation.y = ry; build(F);
      F.updateMatrix();
      for (const c of [...F.children]) { c.applyMatrix4(F.matrix); R.add(c); }
    };
    const cyl = (rt, rb, h, seg, mat, x, y, z, open = false) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
      m.position.set(x, y, z); return m;
    };
    // a packing crate: a core with battens proud of it round every face and a brace across the sides
    const crate = (F, w, h, d) => {
      F.add(slab(w - 0.03, h - 0.03, d - 0.03, M.wood, 0, h / 2, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.add(slab(0.05, h, 0.05, M.wood, sx * (w / 2 - 0.025), h / 2, sz * (d / 2 - 0.025)));
      for (const y of [0.03, h - 0.03]) for (const sz of [-1, 1]) F.add(slab(w, 0.05, 0.02, M.wood, 0, y, sz * (d / 2 - 0.005)));
      for (const sz of [-1, 1]) F.add(slab(Math.hypot(w - 0.1, h - 0.1), 0.05, 0.02, M.wood, 0, h / 2, sz * (d / 2 - 0.005), 0, 0, sz * Math.atan2(h - 0.1, w - 0.1)));
    };

    const bx = ROOM_X1 - 1.5, bz = -ROOM_HZ + 0.75;
    // the pallet: blocks, stringers, and the top boards with the gaps between them
    for (const dx of [-0.85, 0, 0.85]) for (const dz of [-0.42, 0, 0.42])
      R.add(slab(0.12, 0.07, 0.12, M.wood, bx + dx, 0.035, bz + dz));
    for (const dz of [-0.42, 0, 0.42]) R.add(slab(1.9, 0.025, 0.12, M.wood, bx, 0.082, bz + dz));
    for (let i = 0; i < 9; i++) R.add(slab(0.15, 0.022, 1.0, M.wood, bx - 0.86 + i * 0.215, 0.106, bz, 0, (rnd(i * 1.7) - 0.5) * 0.04, 0));
    // the mattress, sagged where he lies; a pillow; the blanket thrown back and hanging off the side
    R.add(slab(1.8, 0.16, 0.92, M.mattress, bx, 0.2, bz));
    /* the head to the back wall (the owner's word): pillow at +X, the blanket
     * thrown down toward the foot */
    R.add(slab(0.7, 0.02, 0.7, M.mattress, bx + 0.1, 0.275, bz, 0, -0.1, 0));
    R.add(slab(0.44, 0.1, 0.58, M.cloth, bx + 0.64, 0.33, bz - 0.02, 0, -0.12, -0.08));
    R.add(slab(0.34, 0.06, 0.46, M.cloth, bx + 0.65, 0.38, bz - 0.02, 0, -0.16, -0.1));
    R.add(slab(1.0, 0.1, 0.86, M.blanket, bx - 0.36, 0.32, bz - 0.03, 0.04, -0.06, -0.02));
    R.add(slab(0.42, 0.07, 0.82, M.blanket, bx + 0.1, 0.33, bz + 0.01, 0.03, 0.05, 0.2));     // the turned-back fold
    R.add(slab(0.95, 0.26, 0.03, M.blanket, bx - 0.34, 0.24, bz + 0.47, -0.16, -0.05, 0));    // over the edge
    // a book left face-down by the pillow
    R.add(slab(0.17, 0.03, 0.24, M.spines, bx + 0.3, 0.295, bz + 0.22, 0, 0.5, 0));

    // the crate he eats off: slatted, dark inside between the slats
    const cx0 = ROOM_X1 - 1.2, cz0 = ROOM_HZ - 1.0;
    turned(cx0, 0, cz0, 0.14, (F) => {
      F.add(slab(0.64, 0.56, 0.54, M.dark, 0, 0.3, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.add(slab(0.06, 0.6, 0.06, M.wood, sx * 0.33, 0.3, sz * 0.28));
      for (let k = 0; k < 3; k++) {
        const y = 0.1 + k * 0.2;
        for (const sz of [-1, 1]) F.add(slab(0.72, 0.13, 0.02, M.wood, 0, y, sz * 0.31));
        for (const sx of [-1, 1]) F.add(slab(0.02, 0.13, 0.62, M.wood, sx * 0.36, y, 0));
      }
      for (let k = 0; k < 4; k++) F.add(slab(0.17, 0.025, 0.66, M.wood, -0.27 + k * 0.18, 0.612, 0));
      // what is on it: a tin plate and spoon, a mug, a bottle
      F.add(cyl(0.11, 0.09, 0.014, 10, M.steel, -0.14, 0.632, -0.12));
      F.add(slab(0.14, 0.008, 0.02, M.steel, -0.1, 0.643, -0.1, 0, 0.6, 0));
      F.add(cyl(0.036, 0.032, 0.085, 8, M.steel, -0.24, 0.667, 0.12));
      const mh = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 3, 8), M.steel); mh.position.set(-0.28, 0.67, 0.12); F.add(mh);
      F.add(cyl(0.032, 0.034, 0.16, 8, M.bottle, 0.2, 0.705, 0.17));
      F.add(cyl(0.012, 0.03, 0.06, 8, M.bottle, 0.2, 0.815, 0.17));
    });
    // a hurricane lantern: tank, the glass, wire guards, the cap and its bail
    {
      const lx = cx0, lz = cz0, y0 = 0.625;
      R.add(cyl(0.085, 0.095, 0.06, 10, M.rust, lx, y0 + 0.03, lz));
      const gp = [new THREE.Vector2(0.05, 0), new THREE.Vector2(0.075, 0.05), new THREE.Vector2(0.072, 0.1), new THREE.Vector2(0.045, 0.15)];
      const glass = new THREE.Mesh(new THREE.LatheGeometry(gp, 8), M.glow);
      glass.position.set(lx, y0 + 0.06, lz); R.add(glass);
      for (let k = 0; k < 4; k++) {
        const a = k * TAU / 4 + 0.4;
        R.add(slab(0.008, 0.17, 0.008, M.rust, lx + Math.cos(a) * 0.082, y0 + 0.14, lz + Math.sin(a) * 0.082));
      }
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 10), M.rust);
      cap.position.set(lx, y0 + 0.24, lz); R.add(cap);
      R.add(cyl(0.02, 0.02, 0.03, 6, M.rust, lx, y0 + 0.28, lz));
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.005, 3, 12, Math.PI), M.rust);
      bail.position.set(lx, y0 + 0.2, lz); bail.rotation.y = 0.5; R.add(bail);
    }
    // the cans he has emptied, kicked under the table
    for (let i = 0; i < 5; i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 8), M.tin);
      const lying = rnd(i) < 0.4;
      can.position.set(ROOM_X1 - 1.6 + rnd(i * 2.1) * 0.9, lying ? 0.036 : 0.05, ROOM_HZ - 1.5 + rnd(i * 4.5) * 0.9);
      can.rotation.set(0, rnd(i * 3.1) * TAU, lying ? Math.PI / 2 : 0);
      R.add(can);
    }
    // a kitchen chair pulled up to the crate
    turned(cx0 - 0.78, 0, cz0 - 0.2, 0.5, (F) => {
      F.add(slab(0.42, 0.035, 0.4, M.wood, 0, 0.44, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.add(slab(0.035, 0.44, 0.035, M.wood, sx * 0.18, 0.22, sz * 0.17));
      for (const sz of [-1, 1]) F.add(slab(0.36, 0.025, 0.025, M.wood, 0, 0.14, sz * 0.17));
      for (const sz of [-1, 1]) F.add(slab(0.035, 0.46, 0.035, M.wood, -0.18, 0.69, sz * 0.17));
      for (const y of [0.72, 0.86]) F.add(slab(0.025, 0.06, 0.38, M.wood, -0.18, y, 0));
      F.add(slab(0.4, 0.012, 0.38, M.coat, 0.02, 0.464, 0, 0, 0, 0.03));   // a folded jumper for a cushion
    });
    // the stove in the corner behind it: a gas ring on a can of gas, the kettle on it
    {
      const sx = ROOM_X1 - 0.45, sz = ROOM_HZ - 0.45;
      R.add(cyl(0.11, 0.11, 0.22, 10, M.tin, sx, 0.11, sz));
      R.add(cyl(0.1, 0.1, 0.03, 10, M.rust, sx, 0.235, sz));
      for (let k = 0; k < 3; k++) { const a = k * TAU / 3; R.add(slab(0.11, 0.015, 0.015, M.rust, sx + Math.cos(a) * 0.06, 0.255, sz + Math.sin(a) * 0.06, 0, -a, 0)); }
      const kp = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.1, 0.06), new THREE.Vector2(0.08, 0.13), new THREE.Vector2(0.03, 0.16), new THREE.Vector2(0.001, 0.165)];
      const kettle = new THREE.Mesh(new THREE.LatheGeometry(kp, 10), M.steel);
      kettle.position.set(sx, 0.263, sz); R.add(kettle);
      const spout = cyl(0.012, 0.02, 0.12, 6, M.steel, sx - 0.1, 0.34, sz - 0.02);
      spout.rotation.z = 0.9; R.add(spout);
      const kh = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 3, 10, Math.PI), M.leather);
      kh.position.set(sx, 0.43, sz); kh.rotation.y = 0.3; R.add(kh);
    }

    // steel shelving against the wall (photo 6): angle-iron uprights, lipped shelves, an X-brace behind
    const shX = ROOM_X0 + 1.5, shZ = ROOM_HZ - 0.3;
    for (let s = 0; s < 4; s++) {
      const y = 0.25 + s * 0.55;
      R.add(slab(1.5, 0.03, 0.42, M.steel, shX, y, shZ));
      R.add(slab(1.5, 0.05, 0.012, M.steel, shX, y + 0.01, shZ - 0.21));
    }
    for (const dx of [-0.72, 0.72]) for (const dz of [-0.19, 0.19]) {
      R.add(slab(0.05, 1.95, 0.012, M.steel, shX + dx, 0.975, shZ + dz));
      R.add(slab(0.012, 1.95, 0.05, M.steel, shX + dx - Math.sign(dx) * 0.019, 0.975, shZ + dz - Math.sign(dz) * 0.019));
    }
    for (const sg of [-1, 1]) R.add(slab(Math.hypot(1.44, 1.65), 0.025, 0.008, M.steel, shX, 1.075, shZ + 0.205, 0, 0, sg * Math.atan2(1.65, 1.44)));
    // what he keeps on it
    {
      const top = (s) => 0.265 + s * 0.55;
      // bottom: a water jug and a folded tarp
      R.add(cyl(0.11, 0.11, 0.3, 8, M.jug, shX - 0.45, top(0) + 0.15, shZ));
      R.add(cyl(0.025, 0.025, 0.04, 6, M.jug, shX - 0.45, top(0) + 0.32, shZ));
      R.add(slab(0.04, 0.1, 0.03, M.jug, shX - 0.36, top(0) + 0.27, shZ));
      for (let k = 0; k < 3; k++) R.add(slab(0.5 - k * 0.04, 0.05, 0.34, k % 2 ? M.blanket : M.coat, shX + 0.25, top(0) + 0.025 + k * 0.05, shZ, 0, (rnd(k * 2.2) - 0.5) * 0.15, 0));
      // second: tins in a row and jars of something
      for (let k = 0; k < 7; k++) {
        const t = cyl(0.038, 0.038, 0.11, 8, M.tin, shX - 0.6 + k * 0.09, top(1) + 0.055, shZ - 0.06 + (k % 2) * 0.1);
        t.rotation.y = rnd(k * 5.5) * TAU; R.add(t);
      }
      for (let k = 0; k < 3; k++) {
        R.add(cyl(0.05, 0.05, 0.14, 8, M.jar, shX + 0.2 + k * 0.14, top(1) + 0.07, shZ));
        R.add(cyl(0.052, 0.052, 0.025, 8, M.rust, shX + 0.2 + k * 0.14, top(1) + 0.152, shZ));
      }
      // third: the books, and a radio with its aerial up
      R.add(slab(0.62, 0.22, 0.16, M.spines, shX - 0.36, top(2) + 0.11, shZ - 0.05));
      R.add(slab(0.2, 0.05, 0.15, M.spines, shX - 0.36 + 0.3, top(2) + 0.025, shZ - 0.05, 0, 0.2, 0));
      R.add(slab(0.3, 0.17, 0.11, M.leather, shX + 0.35, top(2) + 0.085, shZ - 0.04));
      R.add(slab(0.12, 0.1, 0.01, M.steel, shX + 0.3, top(2) + 0.09, shZ - 0.096));
      R.add(cyl(0.02, 0.02, 0.012, 8, M.steel, shX + 0.43, top(2) + 0.09, shZ - 0.1).rotateX(Math.PI / 2));
      const aer = cyl(0.004, 0.004, 0.36, 4, M.steel, shX + 0.42, top(2) + 0.32, shZ - 0.02); aer.rotation.z = -0.35; R.add(aer);
      // top: a crate of odds and ends and a coil of rope
      turned(shX - 0.3, top(3), shZ, 0.08, (F) => crate(F, 0.42, 0.24, 0.32));
      const rope = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 5, 12), M.cloth);
      rope.rotation.x = Math.PI / 2; rope.position.set(shX + 0.35, top(3) + 0.035, shZ); R.add(rope);
    }

    // a barrel and a couple of crates by the door
    {
      const bpx = ROOM_X0 + 0.7, bpz = -ROOM_HZ + 0.6;
      const bp = [];
      for (let k = 0; k <= 6; k++) { const t = k / 6; bp.push(new THREE.Vector2(0.26 + Math.sin(t * Math.PI) * 0.035, t * 0.86)); }
      const barrel = new THREE.Mesh(new THREE.LatheGeometry(bp, 12), M.rust);
      barrel.position.set(bpx, 0, bpz); R.add(barrel);
      const lid = new THREE.Mesh(new THREE.CircleGeometry(0.255, 12), M.rust);
      lid.rotation.x = -Math.PI / 2; lid.position.set(bpx, 0.845, bpz); R.add(lid);
      for (const y of [0.1, 0.32, 0.54, 0.76]) {
        const r = 0.26 + Math.sin((y / 0.86) * Math.PI) * 0.035 + 0.006;
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 3, 14), M.steel);
        hoop.rotation.x = Math.PI / 2; hoop.position.set(bpx, y, bpz); R.add(hoop);
      }
      R.add(cyl(0.03, 0.03, 0.015, 8, M.steel, bpx + 0.12, 0.86, bpz + 0.06));   // the bung
    }
    turned(ROOM_X0 + 1.5, 0, -ROOM_HZ + 0.55, 0.3, (F) => crate(F, 0.55, 0.5, 0.55));
    turned(ROOM_X0 + 1.5, 0.5, -ROOM_HZ + 0.5, -0.2, (F) => crate(F, 0.5, 0.44, 0.5));

    // a bucket left under the worst of the ceiling drips, a rim rolled round its top — against the wall past the
    // shelves, out of the way in (it stood two metres in from the door, beside its line, and the owner walked into it)
    {
      const kx = BUCKET_X, kz = BUCKET_Z;
      R.add(cyl(0.17, 0.13, 0.26, 10, M.steel, kx, 0.13, kz, true));
      const base = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), M.steel);
      base.rotation.x = -Math.PI / 2; base.position.set(kx, 0.005, kz); R.add(base);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.01, 3, 12), M.steel);
      rim.rotation.x = Math.PI / 2; rim.position.set(kx, 0.26, kz); R.add(rim);
      const bw = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), M.water);
      bw.rotation.x = -Math.PI / 2; bw.position.set(kx, 0.19, kz);
      R.add(bw);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 3, 10, Math.PI), M.rust);
      handle.position.set(kx, 0.26, kz); handle.rotation.y = 0.4;
      R.add(handle);
    }

    // (his boots by the bed are gone, 2026-10-17, the owner: "get rid of shoes by the bed in sewer drain")

    // his coat on a peg by the door, against the bulkhead's own face (DOOR_X + 0.46, not ROOM_X0)
    const wx = DOOR_X + 0.46;
    R.add(slab(0.09, 0.03, 0.03, M.rust, wx + 0.045, 1.8, 1.55));
    R.add(slab(0.06, 0.62, 0.42, M.coat, wx + 0.04, 1.44, 1.55, 0, 0, -0.03));
    R.add(slab(0.05, 0.5, 0.11, M.coat, wx + 0.07, 1.38, 1.29, 0.08, 0, -0.04));   // a sleeve
    R.add(slab(0.05, 0.5, 0.11, M.coat, wx + 0.07, 1.38, 1.81, -0.08, 0, -0.04));
    R.add(slab(0.08, 0.08, 0.24, M.coat, wx + 0.05, 1.77, 1.55));                  // the collar

    // cobwebs strung across the corners
    for (let i = 0; i < 4; i++) {
      const sg = i % 2 ? 1 : -1, ex = i < 2 ? ROOM_X0 + 0.25 : ROOM_X1 - 0.25;
      const web = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), M.web);
      web.position.set(ex, ROOM_H - 0.28, sg * (ROOM_HZ - 0.28));
      web.rotation.set(-Math.PI / 4, 0, sg * Math.PI / 4);
      R.add(web);
    }

    // a rag over a line strung between the joists (photo 5) — without the
    // line it just reads as a dark slab floating in the air
    {
      const rx = ROOM_X1 - 2.6, rz = ROOM_HZ - 0.9;
      const line = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.012, 0.012), M.rust);
      line.position.set(rx, ROOM_H - 0.20, rz);
      R.add(line);
      R.add(slab(0.30, 0.42, 0.02, M.cloth, rx - 0.16, ROOM_H - 0.42, rz, 0, 0.12, 0.05));
      R.add(slab(0.24, 0.34, 0.02, M.cloth, rx + 0.34, ROOM_H - 0.38, rz, 0, -0.08, -0.04));
      R.add(slab(0.2, 0.3, 0.02, M.coat, rx - 0.55, ROOM_H - 0.36, rz, 0, 0.05, 0.03));     // and a pair of socks' worth
    }
    // (the tally scratched by the bed is gone, 2026-10-17)

    /* ---- AND THE THINGS THAT MAKE IT SOMEBODY'S: a rug walked thin in front
     * of the bed, a photograph and a drawing pinned over it, candles on the
     * crate he eats off, and chalk on the pipe wall that says which way home
     * is and how long. All of it thin — planes and stubs — and none of it
     * solid: it lies on or against what is already there. */
    {
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0),
        liftOff(new THREE.MeshStandardMaterial({ roughness: 1 }), rugTex(), 0.34, 0xffe0cc));
      rug.material.color.set(0xb8a090);
      rug.rotation.x = -Math.PI / 2; rug.rotation.z = 0.06;
      rug.position.set(bx - 0.1, 0.012, -ROOM_HZ + 1.85);
      R.add(rug);
      const pin = (tex, w, h, x, y, rz) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          liftOff(new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), tex, 0.26, 0xfff4e0));
        m.position.set(x, y, -ROOM_HZ + 0.012); m.rotation.z = rz;
        R.add(m);
      };
      pin(photoTex(), 0.16, 0.2, bx - 0.2, 1.55, 0.07);
      pin(drawingTex(), 0.3, 0.3, bx + 0.32, 1.62, -0.05);
      // three candles stuck in their own wax on the crate, and the light off them
      const cx0 = ROOM_X1 - 1.2, cz0 = ROOM_HZ - 1.0;
      const wax = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.9, emissive: 0x3a2a14, flatShading: true });
      for (let i = 0; i < 3; i++) {
        const hgt = 0.06 + rnd(i * 4.1) * 0.08, cx = cx0 + 0.16 + i * 0.07, cz = cz0 - 0.12 + rnd(i * 2.3) * 0.08;
        const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, hgt, 6), wax);
        cd.position.set(cx, 0.62 + hgt / 2, cz); R.add(cd);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 4), M.glow);
        fl.position.set(cx, 0.62 + hgt + 0.018, cz); R.add(fl);
      }
      const candle = new THREE.PointLight(0xff9a4a, 0.55, 3.0, 1.6);
      candle.position.set(cx0 + 0.24, 0.85, cz0 - 0.08);
      candle.userData.lpAlways = 9;               // seen lit from the door, not only from beside it (main.js `lampReach`)
      R.add(candle);
      // chalk on the pipe wall, a few metres short of the door
      const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45),
        new THREE.MeshStandardMaterial({ map: chalkTex(), transparent: true, depthWrite: false, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.18 }));
      chalk.material.emissiveMap = chalk.material.map;
      chalk.position.set(BORE_LEN - 3.2, PIPE_CY - 0.05, BORE_R - 0.04);
      chalk.rotation.y = Math.PI;
      T.add(chalk);
    }
  }

  // ---- lights ------------------------------------------------------------
  // the tube over the room (photo 6) — dead now: the room is his lanterns'
  const tube = slab(0.9, 0.05, 0.09, M.dark, rcx + 0.4, ROOM_H - 0.42, 0.4);
  R.add(tube);
  /* and what holds it up: a steel batten over the tube, end caps, and two
   * rods to the ceiling — it hung in the air on nothing */
  R.add(slab(1.0, 0.05, 0.15, M.steel, rcx + 0.4, ROOM_H - 0.37, 0.4));
  for (const s of [-1, 1]) {
    R.add(slab(0.03, 0.08, 0.13, M.steel, rcx + 0.4 + s * 0.47, ROOM_H - 0.41, 0.4));
    R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 5), M.steel).translateX(rcx + 0.4 + s * 0.4).translateY(ROOM_H - 0.17).translateZ(0.4));
  }
  /* A HURRICANE LANTERN ON A JOIST, the room's main light now: a screw-eye in
   * the joist, a wire, the bail, the cap and chimney, a warm globe in its
   * wire guard, the fuel font. Hung above head height (its foot at 2.05 m,
   * the eye at 1.7) so walking under it never puts the lens in it. */
  const LX = ROOM_X0 + 0.5 + 4 * (rlen - 1.0) / 8, LZ = 0.3, JB = ROOM_H - 0.25;
  {
    const lglass = new THREE.MeshBasicMaterial({ color: 0xffa858, fog: false });
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 4, 8), M.steel);
    eye.position.set(LX, JB - 0.02, LZ); R.add(eye);
    R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), M.steel).translateX(LX).translateY(JB - 0.13).translateZ(LZ));
    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.005, 4, 12, Math.PI), M.rust);
    bail.position.set(LX, JB - 0.29, LZ); R.add(bail);
    R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.06, 7), M.rust).translateX(LX).translateY(JB - 0.29).translateZ(LZ));   // chimney
    R.add(new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.05, 8), M.rust).translateX(LX).translateY(JB - 0.33).translateZ(LZ));             // cap
    R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.13, 8), lglass).translateX(LX).translateY(JB - 0.425).translateZ(LZ));  // globe
    for (let i = 0; i < 4; i++) {                                                                                                         // guard
      const a = i * Math.PI / 2 + 0.4;
      R.add(slab(0.006, 0.15, 0.006, M.rust, LX + Math.cos(a) * 0.066, JB - 0.425, LZ + Math.sin(a) * 0.066));
    }
    R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.055, 8), M.rust).translateX(LX).translateY(JB - 0.52).translateZ(LZ));  // font
  }
  const lamp = new THREE.PointLight(0xffa458, 0.8, 9.5, 1.2);
  lamp.position.set(LX, JB - 0.43, LZ);
  R.add(lamp);
  // a warm scrap from the crate lantern
  const lamp2 = new THREE.PointLight(0xffb367, 0.6, 6, 1.3);
  lamp2.position.set(ROOM_X1 - 1.2, 0.9, ROOM_HZ - 1.0);
  R.add(lamp2);
  // The mouth used to have its own cold spill. The first bore lamp sits 2 m
  // in and covers it, and every light in the scene is a per-fragment cost
  // for everything, so it's one fewer.
  const mouthLight = null;

  /* ================= past the grate: the overflow culvert =================
   * The owner's (2026-10-15): the grate in the back wall comes off, and what
   * the pipe behind it runs to is somewhere new. It is built here, in the
   * tunnel's own frame, behind the room and past the end of the throat — a
   * Victorian storm-overflow culvert, a brick barrel vault over a sunk channel
   * with a raised walk either side — and it is reached by a cut (the pipe is
   * sixty centimetres across: you crawl it behind black), so the game handles
   * it the way it handles the room: `updateDrain` keeps you on its walks.
   *
   * IT STAYS UNDER THE CLIFF. The cliff's top is 3.2 m and the culvert runs
   * in under it, so the crown of the vault is 3.05: nothing of it shows on the
   * sand above. And the water stays above y = 0 — the beach's sand plane is
   * drawn there wherever you stand, and a channel dug below it would be a
   * channel full of sand — so it is the WALKS that are raised (`CIS_WALK`),
   * not the channel that is sunk. */
  const C = new THREE.Group();
  C.name = 'culvert';
  T.add(C);
  const CIS_X0 = ROOM_X1 + 10.2, CIS_LEN = 17.0, CIS_X1 = CIS_X0 + CIS_LEN;
  const CIS_HZ = 3.0, CIS_WALK = FLOOR_Y + 0.35, CIS_SPRING = 2.2, CIS_CROWN = 3.05;
  const CH_Z0 = -1.9, CH_Z1 = -0.6;                       // the channel, off-centre: the pipe comes in over the wide walk
  const CIS_BRX = CIS_X0 + 9.6, CIS_BRW = 1.3;            // the plank bridge over it
  const ccx = (CIS_X0 + CIS_X1) / 2;
  {
    /* Brick tiled to the room's own brick: a box maps its whole texture onto
     * every face whatever the face's size, so each face's uv is cut to its
     * own metres — the room's side wall is 7.6 m by 3.25 under 2.2 by 1.2. */
    const tile = (m, su, sv) => {
      const uv = m.geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      return m;
    };
    const brick = (w, h, d, x, y, z, su, sv) => C.add(tile(slab(w, h, d, M.brickM, x, y, z), su, sv));
    const conc = (w, h, d, x, y, z, mat = M.roomConc) => C.add(tile(slab(w, h, d, mat, x, y, z), w / 7.6, d / 6.7));

    // the walks, and the channel's bed between them
    conc(CIS_LEN, CIS_WALK + 0.2, CH_Z0 + CIS_HZ, ccx, (CIS_WALK - 0.2) / 2, (CH_Z0 - CIS_HZ) / 2);   // the narrow walk
    conc(CIS_LEN, CIS_WALK + 0.2, CIS_HZ - CH_Z1, ccx, (CIS_WALK - 0.2) / 2, (CH_Z1 + CIS_HZ) / 2);   // the wide walk
    C.add(tile(slab(CIS_LEN, 0.2, CH_Z1 - CH_Z0, M.silt, ccx, -0.09, (CH_Z0 + CH_Z1) / 2), CIS_LEN / 2, 1));
    const water = slab(CIS_LEN - 0.02, 0.012, CH_Z1 - CH_Z0 - 0.02, M.water, ccx, 0.03, (CH_Z0 + CH_Z1) / 2);
    C.add(water);
    // stone kerbs along both lips of the channel, worn round
    for (const z of [CH_Z0 + 0.06, CH_Z1 - 0.06]) conc(CIS_LEN, 0.06, 0.12, ccx, CIS_WALK - 0.02, z, M.conc);
    // walls up to the springing, and the ends
    brick(CIS_LEN, CIS_SPRING + 0.4, 0.3, ccx, CIS_SPRING / 2, CIS_HZ + 0.15, CIS_LEN / 7.6, (CIS_SPRING + 0.4) / 3.25);
    brick(CIS_LEN, CIS_SPRING + 0.4, 0.3, ccx, CIS_SPRING / 2, -CIS_HZ - 0.15, CIS_LEN / 7.6, (CIS_SPRING + 0.4) / 3.25);
    // the far end whole; the near end built round the pipe's opening, the room's own back-wall rule
    brick(0.3, CIS_CROWN + 0.3, CIS_HZ * 2 + 0.6, CIS_X1 + 0.15, CIS_CROWN / 2 - 0.05, 0, (CIS_HZ * 2 + 0.6) / 7.6, (CIS_CROWN + 0.3) / 3.25);
    {
      const oz = 0.55, oy = FLOOR_Y + 1.62, oh = 0.35, y0 = -0.2, y1 = CIS_CROWN + 0.1, z0 = -CIS_HZ - 0.3, z1 = CIS_HZ + 0.3;
      const ww = (yc, hh, zc, dd) => brick(0.3, hh, dd, CIS_X0 - 0.15, yc, zc, dd / 7.6, hh / 3.25);
      ww((y0 + y1) / 2, y1 - y0, (z0 + oz - oh) / 2, (oz - oh) - z0);
      ww((y0 + y1) / 2, y1 - y0, (oz + oh + z1) / 2, z1 - (oz + oh));
      ww((y0 + oy - oh) / 2, (oy - oh) - y0, oz, oh * 2);
      ww((oy + oh + y1) / 2, y1 - (oy + oh), oz, oh * 2);
      // and a rendered ring over the square cut, so the hole reads round
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.30, 0.6, 20, 1), M.conc);
      ring.position.set(CIS_X0 + 0.006, oy, oz); ring.rotation.y = Math.PI / 2; C.add(ring);
    }
    /* THE VAULT: a segment of one cylinder from wall to wall, springing at
     * 2.2 and rising to the crown at 3.05. After rotateZ a point at angle t
     * sits at (y, z) = (sin t, cos t) * r, so the arc over the top is centred
     * on t = pi/2 (the slime's and the stain's rule). */
    const rise = CIS_CROWN - CIS_SPRING, VR = (CIS_HZ * CIS_HZ + rise * rise) / (2 * rise), vcy = CIS_CROWN - VR;
    const half = Math.asin(CIS_HZ / VR);
    const vg = new THREE.CylinderGeometry(VR, VR, CIS_LEN, 18, 1, true, Math.PI / 2 - half, half * 2);
    vg.rotateZ(Math.PI / 2);
    /* seen from INSIDE the cylinder, so its brick is drawn on the back face */
    if (!M.brickIn) { M.brickIn = M.brickM.clone(); M.brickIn.side = THREE.BackSide; }
    const vault = tile(new THREE.Mesh(vg, M.brickIn), (VR * half * 2) / 3.8 * 2.2, CIS_LEN / 1.6 * 1.2);   // measured: at the walls' rate the vault's bricks came out twice the size
    vault.position.set(ccx, vcy, 0);
    C.add(vault);
    // brick ribs under it every few metres, a hand proud of the vault, down the walls to the walk
    for (let x = CIS_X0 + 1.7; x < CIS_X1 - 1.0; x += 3.4) {
      const rg = new THREE.CylinderGeometry(VR - 0.06, VR - 0.06, 0.32, 18, 1, true, Math.PI / 2 - half, half * 2);
      rg.rotateZ(Math.PI / 2);
      const rib = tile(new THREE.Mesh(rg, M.brickIn), 1.4 * 2.2, 0.2 * 1.2);
      rib.position.set(x, vcy, 0); C.add(rib);
      for (const s of [-1, 1]) brick(0.32, CIS_SPRING - CIS_WALK, 0.1, x, (CIS_SPRING + CIS_WALK) / 2, s * (CIS_HZ - 0.05), 0.05, 0.6);
    }
    // the damp: down the walls and pooled on the walks
    for (let i = 0; i < 12; i++) {
      const s = i % 2 ? 1 : -1, w = 0.7 + rnd(i * 3.1) * 1.1, h = 1.1 + rnd(i * 5.7) * 0.7;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.damp);
      d.position.set(CIS_X0 + 0.8 + rnd(i * 8.3) * (CIS_LEN - 1.6), CIS_SPRING - h / 2 - 0.05, s * (CIS_HZ - 0.006));
      d.rotation.y = s > 0 ? Math.PI : 0;
      C.add(d);
    }
    for (let i = 0; i < 8; i++) {
      const sz = 0.6 + rnd(i * 4.9) * 1.0;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz * 0.8), M.puddle);
      p.rotation.set(-Math.PI / 2, 0, rnd(i * 2.2) * TAU);
      p.position.set(CIS_X0 + 1.0 + rnd(i * 7.7) * (CIS_LEN - 2.0), CIS_WALK + 0.004, 0.2 + rnd(i * 1.3) * 2.2);
      C.add(p);
    }
    // silt banked against the kerbs and scum where the water stands
    for (let i = 0; i < 26; i++) {
      const r = 0.04 + rnd(i * 2.9) * 0.09;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.silt);
      st.position.set(CIS_X0 + 0.4 + rnd(i * 6.1) * (CIS_LEN - 0.8), 0.04, rnd(i) < 0.5 ? CH_Z0 + 0.1 : CH_Z1 - 0.1);
      st.scale.y = 0.5; C.add(st);
    }
    for (let i = 0; i < 9; i++)
      C.add(slab(0.4 + rnd(i * 3.3) * 1.2, 0.006, 0.12 + rnd(i * 1.9) * 0.4, M.algae,
        CIS_X0 + 0.5 + rnd(i * 4.4) * (CIS_LEN - 1.0), 0.04 + i * 0.0015, CH_Z0 + 0.2 + rnd(i * 2.6) * 0.9));   // each its own height, as the bore's

    /* THE PIPE YOU CAME IN BY, on the west wall at the height it left the
     * room, a concrete collar round it and a slope of silt washed out of it
     * down onto the walk — the way you got down, and the way back up. */
    const PIN = [CIS_X0, FLOOR_Y + 1.62, 0.55];
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 6, 18), M.conc);
    collar.position.set(PIN[0] + 0.02, PIN[1], PIN[2]); collar.rotation.y = Math.PI / 2; C.add(collar);
    const mouth = xCyl(0.30, 0.30, 0.5, 18, M.throat, true);
    mouth.position.set(PIN[0] - 0.23, PIN[1], PIN[2]); C.add(mouth);
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.30, 18), M.void);    // BackSide: it faces away, and is seen from the culvert
    back.position.set(PIN[0] - 0.45, PIN[1], PIN[2]); back.rotation.y = -Math.PI / 2; C.add(back);
    for (let i = 0; i < 7; i++) {
      const r = 0.12 + rnd(i * 3.7) * 0.16;
      const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.silt);
      lump.position.set(PIN[0] + 0.25 + i * 0.12 + rnd(i) * 0.08, CIS_WALK + 0.55 - i * 0.08, PIN[2] + (rnd(i * 2.1) - 0.5) * 0.5);
      lump.scale.y = 0.55; C.add(lump);
    }
    const run = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.1), M.stain);
    run.position.set(PIN[0] + 0.012, PIN[1] - 0.75, PIN[2]); run.rotation.y = Math.PI / 2; C.add(run);
    // the hit target for the way back: the open end of the pipe
    const pproxy = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    pproxy.name = 'hitProxy';
    const PIPE = new THREE.Group(); PIPE.position.set(PIN[0] + 0.05, PIN[1], PIN[2]); PIPE.rotation.y = Math.PI / 2;
    PIPE.add(pproxy); C.add(PIPE);
    T.userData.culvertPipe = PIPE;

    /* THE BRIDGE: three planks laid over the channel on two bearers, one of
     * them gone at the end and patched with a fourth. */
    for (const dx of [-0.42, 0.42]) C.add(slab(0.14, 0.12, CH_Z1 - CH_Z0 + 0.5, M.wood, CIS_BRX + dx, CIS_WALK - 0.07, (CH_Z0 + CH_Z1) / 2));
    for (let i = 0; i < 4; i++)
      C.add(slab(0.29, 0.04, CH_Z1 - CH_Z0 + 0.46, M.wood, CIS_BRX - 0.45 + i * 0.30, CIS_WALK + 0.012, (CH_Z0 + CH_Z1) / 2, 0, (rnd(i * 6.6) - 0.5) * 0.05, 0));

    /* THE SLUICE AT THE FAR END: the culvert's own gate, iron in an iron frame
     * across the channel's mouth, its wheel on a post on the wide walk. It is
     * shut, and rusted shut; what is behind it is for another day. */
    const SX = CIS_X1 - 0.12;
    C.add(slab(0.18, CIS_SPRING - 0.1, 0.16, M.rust, SX, (CIS_SPRING - 0.1) / 2, CH_Z0 - 0.12));
    C.add(slab(0.18, CIS_SPRING - 0.1, 0.16, M.rust, SX, (CIS_SPRING - 0.1) / 2, CH_Z1 + 0.12));
    C.add(slab(0.18, 0.16, CH_Z1 - CH_Z0 + 0.4, M.rust, SX, CIS_SPRING - 0.15, (CH_Z0 + CH_Z1) / 2));
    C.add(slab(0.06, CIS_SPRING - 0.6, CH_Z1 - CH_Z0, M.steel, SX - 0.06, (CIS_SPRING - 0.6) / 2 + 0.05, (CH_Z0 + CH_Z1) / 2));
    for (let i = 0; i < 4; i++) C.add(slab(0.04, 0.06, CH_Z1 - CH_Z0 - 0.06, M.rust, SX - 0.1, 0.35 + i * 0.4, (CH_Z0 + CH_Z1) / 2));
    const WHL = new THREE.Group();
    WHL.position.set(CIS_X1 - 0.75, 0, CH_Z1 + 1.0);         // a stride off the channel's lip, so the walk goes by it
    WHL.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.0, 8), M.rust).translateY(CIS_WALK + 0.5));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 5, 16), M.rust);
    wheel.position.y = CIS_WALK + 1.02; wheel.rotation.x = Math.PI / 2; WHL.add(wheel);
    for (let i = 0; i < 3; i++) {
      const sp = slab(0.46, 0.022, 0.022, M.rust, 0, CIS_WALK + 1.02, 0, 0, i * Math.PI / 3, 0); WHL.add(sp);
    }
    const wproxy = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    wproxy.name = 'hitProxy'; wproxy.position.y = CIS_WALK + 0.95; WHL.add(wproxy);
    C.add(WHL);
    T.userData.culvertWheel = WHL;

    /* WHAT IS DOWN HERE: a crate gone soft, bottles, a length of chain off a
     * ring in the vault — and, at the dark end, a little heap of small bones
     * and grey feathers picked clean. Something comes and goes by the pipe. */
    C.add(slab(0.6, 0.48, 0.5, M.wood, CIS_X0 + 3.2, CIS_WALK + 0.24, CIS_HZ - 0.45, 0.02, 0.3, 0.05));
    C.add(slab(0.62, 0.05, 0.52, M.dark, CIS_X0 + 3.2, CIS_WALK + 0.49, CIS_HZ - 0.45, 0.0, 0.3, 0.08));
    for (let i = 0; i < 5; i++) {
      const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.2, 7), M.water);
      const lying = rnd(i * 3.3) < 0.6;
      bt.position.set(CIS_X0 + 2.4 + rnd(i * 9.2) * 1.6, CIS_WALK + (lying ? 0.034 : 0.1), CIS_HZ - 0.4 - rnd(i * 4.1) * 0.9);
      bt.rotation.set(lying ? Math.PI / 2 : 0, rnd(i) * TAU, 0);
      C.add(bt);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10), M.rust);
    ring.position.set(CIS_X0 + 6.8, CIS_CROWN - 0.04, 0.6); ring.rotation.x = Math.PI / 2; C.add(ring);
    for (let i = 0; i < 6; i++) {                 // short of your head: the walk is raised and the vault is low
      const lk = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.010, 3, 8), M.rust);
      lk.position.set(CIS_X0 + 6.8, CIS_CROWN - 0.12 - i * 0.065, 0.6);
      lk.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0); C.add(lk);
    }
    const BX = CIS_X1 - 2.3, BZ = CIS_HZ - 0.8;
    for (let i = 0; i < 14; i++) {
      const a = rnd(i * 2.7) * TAU, d = rnd(i * 5.1) * 0.32;
      const bn = slab(0.09 + rnd(i * 1.7) * 0.12, 0.014, 0.014, M.cloth, BX + Math.cos(a) * d, CIS_WALK + 0.012 + i * 0.002, BZ + Math.sin(a) * d, 0, rnd(i * 3.9) * TAU, 0);
      C.add(bn);
    }
    for (let i = 0; i < 6; i++) {
      const fe = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.13), M.web);
      fe.rotation.set(-Math.PI / 2, 0, rnd(i * 8.1) * TAU);
      fe.position.set(BX + (rnd(i * 4.3) - 0.5) * 0.9, CIS_WALK + 0.008, BZ + (rnd(i * 6.3) - 0.5) * 0.7);
      C.add(fe);
    }
    // chalk on the wall by the pipe: his arrow, pointing back the way he came, and a line through it
    const chalk2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4),
      new THREE.MeshStandardMaterial({ map: chalkTex(), transparent: true, depthWrite: false, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.16 }));
    chalk2.material.emissiveMap = chalk2.material.map;
    chalk2.position.set(CIS_X0 + 1.6, 1.25, CIS_HZ - 0.012); chalk2.rotation.y = Math.PI;
    chalk2.scale.x = -1;                      // the arrow points west, at the pipe home
    chalk2.userData.noBake = true;            // a mirrored mesh merged flat would turn its face away
    C.add(chalk2);

    /* THE LIGHT: two gratings in the crown to the dune above, with the moon
     * coming through them in cold shafts (emissive only, additive, no cost
     * but their own pixels), and ONE pooled lamp under the nearer one to
     * light the walks by. The far end is left dark. */
    /* soft, not a glass tube: bright under the grating and gone by the floor,
     * and the pool it makes on the walk feathered out to nothing */
    const fade = (radial) => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = radial ? g.createRadialGradient(32, 32, 2, 32, 32, 32) : g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(radial ? 0.45 : 0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    };
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x8fb0d4, map: fade(false), transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });   // front only: stood in, it is not a sheet over half the view
    const poolMat = new THREE.MeshBasicMaterial({ color: 0x8fb0d4, map: fade(true), transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const gridMat = M.rust;
    for (const gx of [CIS_X0 + 5.0, CIS_X0 + 12.4]) {
      const gz = 0.8;
      C.add(slab(0.7, 0.05, 0.7, M.dark, gx, CIS_CROWN - 0.035, gz));
      for (let i = 0; i < 5; i++) C.add(slab(0.03, 0.04, 0.62, gridMat, gx - 0.24 + i * 0.12, CIS_CROWN - 0.07, gz));
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.75, CIS_CROWN - CIS_WALK, 10, 1, true), shaftMat);
      sh.position.set(gx, (CIS_CROWN + CIS_WALK) / 2, gz); sh.raycast = () => {};
      sh.userData.noBake = true;              // and stays its own mesh, so it keeps not being hit by a blade
      C.add(sh);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), poolMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(gx, CIS_WALK + 0.006, gz); C.add(pool);
    }
    const cisLamp = new THREE.PointLight(0x9ab8dc, 0.6, 8.0, 1.4);
    cisLamp.position.set(CIS_X0 + 5.0, CIS_CROWN - 0.4, 0.8);
    cisLamp.userData.lpAlways = 12;
    C.add(cisLamp);
    const cisLamp2 = new THREE.PointLight(0x8aa8cc, 0.45, 7.0, 1.4);
    cisLamp2.position.set(CIS_X0 + 12.4, CIS_CROWN - 0.4, 0.8);
    cisLamp2.userData.lpAlways = 10;
    C.add(cisLamp2);
    T.userData.culvertLights = [cisLamp, cisLamp2];
    T.userData.culvertIn = [CIS_X0 + 1.15, PIN[2] + 0.35];   // where you are put down out of the pipe
  }

  // Solid props, as local-space AABBs [x0, z0, x1, z1] — the game pushes the
  // player out of these so you can't walk through the bed or the shelving.
  const bedX = ROOM_X1 - 1.5, shX = ROOM_X0 + 1.5;
  // Collapse the static shells by material as well. Nested Groups (the lamps,
  // the side connection, the outlet, the beacon) are left alone, so anything
  // that animates or needs its own raycast target survives.
  /* BRICK IN METRES. A box maps its whole texture onto each face whatever the
   * face's size, so the narrow piers left and right of the outlet and the
   * strips over and under it came out with bricks a third the size of the
   * wall's (the owner's "weird textures" round the grate). Every brick box is
   * box-mapped here from its own corners in the tunnel's frame: the face's
   * two in-plane axes, in metres, over one tile of 3.45 m by 2.7 — so every
   * course runs straight on from one piece into the next. */
  {
    T.updateMatrixWorld(true);
    const p = new THREE.Vector3(), nrm = new THREE.Vector3(), nm3 = new THREE.Matrix3();
    T.traverse((o) => {
      if (!o.isMesh || o.material !== M.brickM || o.geometry.type !== 'BoxGeometry') return;
      const g = o.geometry, pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv');
      nm3.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        nrm.fromBufferAttribute(nor, i).applyMatrix3(nm3);
        const ax = Math.abs(nrm.x), ay = Math.abs(nrm.y), az = Math.abs(nrm.z);
        let u, v;
        if (ax >= ay && ax >= az) { u = p.z; v = p.y; } else if (az >= ay) { u = p.x; v = p.y; } else { u = p.x; v = p.z; }
        uv.setXY(i, u / 3.45, v / 2.7);
      }
      uv.needsUpdate = true;
    });
  }
  bakeScatter(HW);
  bakeScatter(BORE);
  bakeScatter(DOOR);
  bakeScatter(R);
  bakeScatter(C);
  bakeScatter(T);

  /* ---- THE AIR (the owner, 2026-10-17: "add some mist/fog in the sewer
   * tunnel and ... make the lights more ambient and more ray traced feeling
   * of a real nasty sewer"). The murk itself is the fog chunk's — the beach's
   * ground mist laid on this floor and the scene's fog closed in and tinted
   * sewer-green while you are in here (main.js `drainAir`) — so nothing here
   * is a card of mist to walk through. What is here is the LIGHT IN IT:
   *   - a soft halo round every lamp that burns, the bulb seen through wet air;
   *   - a beam falling from each, a cone of lit air feathered at its edges by
   *     the angle you see it at (a hard-edged cone is a lampshade) and gone by
   *     the floor, so it never draws a line where it meets anything;
   *   - dust and spray hanging in the pipe, lit by whichever lamp is nearest
   *     and dark between them — a mote is only seen where the light is.
   * All additive, unfogged (they fade with distance themselves), never hit by
   * a ray, never baked. Each follows its lamp's flicker (`T.userData.air`). */
  {
    T.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(T.matrixWorld).invert();
    const at = (o) => { o.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv); };
    const soft = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const beamVS = `varying float vV; varying vec3 vN; varying vec3 vView;
      void main() { vV = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vView = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
    const beamFS = `uniform vec3 uCol; uniform float uK; varying float vV; varying vec3 vN; varying vec3 vView;
      void main() {
        float f = abs(dot(normalize(vN), normalize(vView)));
        float a = pow(f, 2.2) * pow(vV, 1.6) * uK * exp(-length(vView) * 0.075);
        gl_FragColor = vec4(uCol * a, 1.0);
      }`;
    const air = [];
    const UP = new THREE.Vector3(0, 1, 0);
    const lightUp = (pl, halo, beam) => {
      const p = at(pl);
      const col = pl.color.clone();
      const hm = new THREE.SpriteMaterial({ map: soft, color: col.clone().multiplyScalar(halo.k), blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false, fog: false });
      const h = new THREE.Sprite(hm); h.scale.setScalar(halo.s); h.position.copy(p).add(halo.off || new THREE.Vector3());
      h.raycast = () => {}; h.userData.noBake = true; h.name = 'drainHalo'; T.add(h);
      let bm = null;
      if (beam) {
        const foot = beam.foot, dir = new THREE.Vector3().subVectors(p, foot), len = dir.length();
        bm = new THREE.ShaderMaterial({ uniforms: { uCol: { value: col.clone() }, uK: { value: beam.k } }, vertexShader: beamVS, fragmentShader: beamFS,
          blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.FrontSide });
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(beam.r0, beam.r1, len, 16, 1, true), bm);
        cone.position.copy(p).add(foot).multiplyScalar(0.5);
        cone.quaternion.setFromUnitVectors(UP, dir.normalize());
        cone.raycast = () => {}; cone.userData.noBake = true; cone.name = 'drainBeam'; T.add(cone);
      }
      air.push({ light: pl, base: pl.intensity, halo: hm, haloK: halo.k, col, beam: bm, beamK: beam ? beam.k : 0 });
      return p;
    };
    const lampsAt = [];
    for (const pl of boreLights) {
      const p = at(pl);
      // the bulb is on the springline: its light falls down and out across the pipe, onto the invert
      lampsAt.push(lightUp(pl, { s: 0.62, k: 0.42, off: new THREE.Vector3(0, 0.16, Math.sign(p.z) * 0.12) },
        { foot: new THREE.Vector3(p.x + 0.15, FLOOR_Y + 0.05, -p.z * 0.25), r0: 0.07, r1: 0.95, k: 0.075 }));
    }
    // the hurricane lantern hung in the room: light all round it, the pool under it
    lampsAt.push(lightUp(lamp, { s: 0.95, k: 0.36 }, { foot: (() => { const q = at(lamp); q.y = FLOOR_Y + 0.02; return q; })(), r0: 0.09, r1: 1.7, k: 0.05 }));
    lampsAt.push(lightUp(lamp2, { s: 0.7, k: 0.3 }, null));
    // the dust: hanging in the bore and the room, lit only near a lamp
    const N = 520, P = new Float32Array(N * 3), S = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (i < 380) {
        x = 0.6 + rnd(i * 1.13) * (BORE_LEN - 0.8);
        const a = rnd(i * 2.71) * Math.PI * 2, r = Math.sqrt(rnd(i * 3.37)) * (BORE_R - 0.25);
        y = Math.max(FLOOR_Y + 0.08, PIPE_CY + Math.sin(a) * r); z = Math.cos(a) * r;
      } else {
        x = ROOM_X0 + 0.3 + rnd(i * 1.13) * (ROOM_X1 - ROOM_X0 - 0.6);
        y = FLOOR_Y + 0.1 + rnd(i * 2.71) * (ROOM_H - 0.4); z = (rnd(i * 3.37) - 0.5) * (ROOM_HZ * 2 - 0.6);
      }
      P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; S[i] = rnd(i * 7.77);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    dg.setAttribute('aS', new THREE.BufferAttribute(S, 1));
    const NL = 8, uL = [], uLC = [];
    for (let k = 0; k < NL; k++) {
      const e = air[k];
      uL.push(e ? lampsAt[k].clone() : new THREE.Vector3(0, -99, 0));
      uLC.push(e ? e.col.clone().multiplyScalar(e.base) : new THREE.Vector3());
    }
    const dustMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uL: { value: uL }, uLC: { value: uLC.map((c) => c.isColor ? new THREE.Vector3(c.r, c.g, c.b) : c) } },
      vertexShader: `uniform float uT; uniform vec3 uL[${NL}]; uniform vec3 uLC[${NL}]; attribute float aS; varying vec3 vC;
        void main() {
          vec3 p = position;
          p.x += sin(uT * 0.11 + aS * 6.28) * 0.22;
          p.y += sin(uT * 0.17 + aS * 11.0) * 0.12 + mod(uT * 0.012 * (0.5 + aS), 0.3) - 0.15;
          p.z += cos(uT * 0.13 + aS * 4.1) * 0.18;
          vec3 c = vec3(0.0);
          for (int i = 0; i < ${NL}; i++) { float d = distance(p, uL[i]); c += uLC[i] / (1.0 + d * d * 2.4); }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          vC = c * exp(-dist * 0.09) * (0.6 + 0.4 * sin(uT * 1.7 + aS * 40.0));
          gl_PointSize = clamp(4.5 / dist, 1.0, 4.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vC;
        void main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(vC * (1.0 - r) * 0.55, 1.0); }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    });
    const dust = new THREE.Points(dg, dustMat);
    dust.raycast = () => {}; dust.userData.noBake = true; dust.name = 'drainDust'; dust.frustumCulled = false;
    T.add(dust);
    T.userData.air = { lamps: air, dust: dustMat };
  }

  T.userData.nav = {
    BORE_R, PIPE_CY, BORE_LEN, DOOR_X, ROOM_X0, ROOM_X1, ROOM_HZ, ROOM_H, FLOOR_Y,
    doorHalfZ: 1.0, doorH: 2.12,
    props: [
      [bedX - 0.95, -ROOM_HZ + 0.25, bedX + 0.95, -ROOM_HZ + 1.25],   // pallet bed
      [ROOM_X1 - 1.56, ROOM_HZ - 1.31, ROOM_X1 - 0.84, ROOM_HZ - 0.69], // crate table
      [shX - 0.78, ROOM_HZ - 0.53, shX + 0.78, ROOM_HZ - 0.07],       // shelving
      [ROOM_X0 + 0.41, -ROOM_HZ + 0.31, ROOM_X0 + 0.99, -ROOM_HZ + 0.89], // barrel
      [ROOM_X0 + 1.22, -ROOM_HZ + 0.25, ROOM_X0 + 1.78, -ROOM_HZ + 0.85], // crates
      [BUCKET_X - 0.18, BUCKET_Z - 0.18, BUCKET_X + 0.18, BUCKET_Z + 0.18], // bucket
      [ROOM_X1 - 2.25, ROOM_HZ - 1.47, ROOM_X1 - 1.71, ROOM_HZ - 0.93], // the chair at the crate
      [ROOM_X1 - 0.6, ROOM_HZ - 0.6, ROOM_X1 - 0.3, ROOM_HZ - 0.3],    // the stove
      [ROOM_X0, -3.0, ROOM_X0 + 0.42, -1.08],                         // the door leaf, open against the front wall (doorway half-width 1.0)
    ],
    /* the culvert past the grate: its walks, the channel between them, the
     * bridge over it and what stands on the walks (`updateDrain`) */
    cis: {
      X0: CIS_X0, X1: CIS_X1, HZ: CIS_HZ, WALK: CIS_WALK, CH_Z0, CH_Z1, BRX: CIS_BRX, BRW: CIS_BRW,
      props: [
        [CIS_X0 + 2.85, CIS_HZ - 0.8, CIS_X0 + 3.55, CIS_HZ - 0.1],     // the soft crate
        [CIS_X1 - 0.95, CH_Z1 + 0.8, CIS_X1 - 0.55, CH_Z1 + 1.2],       // the sluice's wheel post
      ],
    },
  };
  T.userData.lights = { lamp, lamp2, tube, bore: boreLights };
  // where drips fall from — local points along the crown of the bore
  T.userData.drips = [];
  for (let i = 0; i < 6; i++)
    T.userData.drips.push([2.0 + i * ((BORE_LEN - 3.4) / 5),
      PIPE_CY + BORE_R - 0.1, (rnd(i * 5.3) - 0.5) * 0.7]);
  T.userData.drips.push([ROOM_X0 + 2.0, ROOM_H - 0.3, 1.42]);
  T.userData.drips.push([ROOM_X1 - 1.0, ROOM_H - 0.3, -1.7]);
  return T;
}
