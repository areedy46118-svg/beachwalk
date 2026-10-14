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
    stain:   new THREE.MeshStandardMaterial({ map: rustStainTex(), transparent: true, roughness: 1, metalness: 0, emissive: 0x0b0602, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    // The berms have to read as the same sand as the beach, so the game hands
    // in its own sand material; a bespoke flat colour reads as pale slabs.
    wetsand: opts.wetSandMat || new THREE.MeshStandardMaterial({ color: 0x5a6478, roughness: 0.9, metalness: 0.04, emissive: 0x1e2537, flatShading: true, side: THREE.DoubleSide }),
    drysand: opts.sandMat || new THREE.MeshStandardMaterial({ color: 0x6d7d99, roughness: 0.95, metalness: 0, emissive: 0x27324a, flatShading: true }),
    cobble:  new THREE.MeshStandardMaterial({ color: 0x55565e, roughness: 1, metalness: 0, emissive: 0x14161c, flatShading: true }),
  };

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
        const pl = new THREE.PointLight(0xffd2a0, 1.8, 9.5, 1.6);
        pl.position.set(x, y - 0.22, z * 0.85);
        T.add(pl);
        boreLights.push(pl);
      }
      // conduit feeding it: thin, and tucked right against the pipe wall
      L.add(slab(2.6, 0.022, 0.022, M.rust, 1.3, 0.012, 0));
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
        x, FLOOR_Y - 0.012, (rnd(i * 3.9) - 0.5) * 0.5);
      IN.add(patch);
    }
    // slime creeping up the pipe walls at the waterline
    for (const s of [-1, 1])
      for (let i = 0; i < 14; i++) {
        const x = 0.3 + rnd(i * 8.2 + s) * (BORE_LEN - 0.6);
        const h = 0.12 + rnd(i * 4.4) * 0.3;
        IN.add(slab(0.5 + rnd(i) * 0.7, h, 0.05, M.slime, x, FLOOR_Y + h / 2, s * 1.02, 0, 0, 0));
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
    DOOR.add(slab(0.16, OH + 0.1, 0.12, M.steel, 0.05, OH / 2, OW + 0.06));
    DOOR.add(slab(0.16, OH + 0.1, 0.12, M.steel, 0.05, OH / 2, -OW - 0.06));
    DOOR.add(slab(0.16, 0.12, OW * 2 + 0.24, M.steel, 0.05, OH + 0.05, 0));
    // frame bolts
    for (const sg of [-1, 1]) for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 6), M.rust);
      b.rotation.z = Math.PI / 2;
      b.position.set(-0.07, 0.18 + i * 0.47, sg * (OW + 0.06));
      DOOR.add(b);
    }
    // the leaf sits back at z -2.15 so it stays clear of the walking line
    const LZ = -2.15, LA = -0.42;
    DOOR.add(slab(0.10, OH - 0.06, 1.9, M.steel, 0.62, OH / 2 - 0.02, LZ, 0, LA, 0));
    DOOR.add(slab(0.03, 0.5, 1.7, M.rust, 0.69, 0.26, LZ, 0, LA, 0));     // kick plate
    for (let i = 0; i < 3; i++)                                            // locking dogs
      DOOR.add(slab(0.16, 0.09, 0.28, M.rust, 0.66, 0.45 + i * 0.7, LZ + 0.7, 0, LA, 0));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 5, 14), M.rust);
    wheel.position.set(0.7, OH / 2, LZ - 0.35); wheel.rotation.set(0, LA, Math.PI / 2);
    DOOR.add(wheel);
    // hinges, still on the frame the leaf swung off
    for (let i = 0; i < 3; i++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.17, 6), M.rust);
      h.position.set(0.05, 0.3 + i * 0.78, -OW - 0.12);
      DOOR.add(h);
    }
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
    R.add(slab(rlen, 0.2, ROOM_HZ * 2 + 0.4, M.conc, rcx, -0.1, 0));                     // floor
    R.add(slab(rlen, ROOM_H + 0.4, 0.25, M.brickM, rcx, ROOM_H / 2, ROOM_HZ + 0.12));    // side walls
    R.add(slab(rlen, ROOM_H + 0.4, 0.25, M.brickM, rcx, ROOM_H / 2, -ROOM_HZ - 0.12));
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
    R.add(slab(rlen + 0.6, 0.22, ROOM_HZ * 2 + 0.5, M.conc, rcx, ROOM_H + 0.11, 0));     // ceiling slab

    // exposed joists + conduit under the ceiling (photo 5)
    for (let i = 0; i < 9; i++) {
      const x = ROOM_X0 + 0.5 + i * (rlen - 1.0) / 8;
      R.add(slab(0.14, 0.24, ROOM_HZ * 2, M.wood, x, ROOM_H - 0.13, 0));
    }
    for (const z of [-1.6, -1.25, 1.9]) {
      const pipe = xCyl(0.06, 0.06, rlen - 0.4, 8, z > 0 ? M.rust : M.steel);
      pipe.position.set(rcx, ROOM_H - 0.34, z);
      R.add(pipe);
    }
    // a fat soil pipe dropping into the corner and turning along the wall
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 9), M.rust);
    drop.position.set(ROOM_X1 - 0.5, ROOM_H - 0.9, -ROOM_HZ + 0.35);
    R.add(drop);

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
      const panel = new THREE.Mesh(new THREE.RingGeometry(0.302, 0.62, 20, 1), M.conc);
      panel.position.z = -0.02;
      F.add(panel);
      // the square frame, four rusted angles
      const FW = 0.44, FT = 0.075;
      for (const [dx, dy, w, h] of [[0, FW, FW * 2 + FT, FT], [0, -FW, FW * 2 + FT, FT],
                                    [FW, 0, FT, FW * 2 + FT], [-FW, 0, FT, FW * 2 + FT]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), M.frame);
        m.position.set(dx, dy, 0.025);
        F.add(m);
      }
      // corner bolts
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 6), M.frame);
        b.rotation.x = Math.PI / 2;
        b.position.set(sx * (FW - 0.02), sy * (FW - 0.02), 0.06);
        F.add(b);
      }
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
      for (let i = 0; i < 4; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.032, FW * 1.8, 0.030), M.frame);
        bar.position.set(-0.24 + i * 0.16, 0, 0.015);
        bar.rotation.z = (rnd(i * 4.4) - 0.5) * 0.10;
        F.add(bar);
      }
      for (let i = 0; i < 2; i++) {
        const flat = new THREE.Mesh(new THREE.BoxGeometry(FW * 1.7, 0.030, 0.022), M.frame);
        flat.position.set(0, -0.16 + i * 0.32, -0.01);
        F.add(flat);
      }
      // weld blobs where the bars meet the flats
      for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) {
        const wd = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), M.frame);
        wd.position.set(-0.24 + i * 0.16, -0.16 + k * 0.32, 0.008);
        wd.scale.set(1, 1, 0.6);
        F.add(wd);
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
      // the bleed running down the wall below it
      const bleed = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), M.stain);
      bleed.position.set(ROOM_X1 - 0.06, OY - 1.02, OZ);
      bleed.rotation.y = -Math.PI / 2;
      R.add(bleed);
      // and a wet patch where it lands
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 10), M.water);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(ROOM_X1 - 0.45, 0.014, OZ);
      R.add(pool);
    }

    // damp blooms + puddles on the floor (photo 5)
    for (let i = 0; i < 9; i++) {
      const s = 0.5 + rnd(i * 3.7) * 1.5;
      const p = new THREE.Mesh(new THREE.CircleGeometry(s * 0.5, 9), M.water);
      p.rotation.x = -Math.PI / 2;
      p.position.set(ROOM_X0 + 0.6 + rnd(i * 9.1) * (rlen - 1.2), 0.012, (rnd(i * 5.3) - 0.5) * (ROOM_HZ * 1.7));
      R.add(p);
    }
    // damp running down the side walls
    for (let i = 0; i < 8; i++) {
      const s = i % 2 ? 1 : -1;
      R.add(slab(0.3 + rnd(i * 2.9) * 0.7, 1.1 + rnd(i * 4.1) * 1.3, 0.03, M.dark,
        ROOM_X0 + 0.6 + rnd(i * 8.8) * (rlen - 1.2),
        0.6 + rnd(i * 5.2) * 0.7, s * (ROOM_HZ - 0.015)));
    }
  }

  // ---- somebody's home ---------------------------------------------------
  {
    const bx = ROOM_X1 - 1.5;
    // pallet bed with a mattress and a heaped blanket
    R.add(slab(1.9, 0.12, 1.0, M.wood, bx, 0.06, -ROOM_HZ + 0.75));
    R.add(slab(1.8, 0.16, 0.92, M.cloth, bx, 0.2, -ROOM_HZ + 0.75));
    R.add(slab(1.1, 0.16, 0.86, M.blanket, bx + 0.3, 0.33, -ROOM_HZ + 0.72, 0.04, 0.06, 0.02));
    R.add(slab(0.42, 0.16, 0.34, M.cloth, bx - 0.68, 0.34, -ROOM_HZ + 0.7, 0, 0.2, 0.05));

    // crate table with a lamp, a can and a bottle
    R.add(slab(0.72, 0.62, 0.62, M.wood, ROOM_X1 - 1.2, 0.31, ROOM_HZ - 1.0, 0, 0.14, 0));
    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.16, 8), M.rust);
    lampBody.position.set(ROOM_X1 - 1.2, 0.70, ROOM_HZ - 1.0);
    R.add(lampBody);
    const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 8), M.glow);
    lampGlass.position.set(ROOM_X1 - 1.2, 0.86, ROOM_HZ - 1.0);
    R.add(lampGlass);
    const lampCap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 8), M.rust);
    lampCap.position.set(ROOM_X1 - 1.2, 0.99, ROOM_HZ - 1.0);
    R.add(lampCap);
    for (let i = 0; i < 5; i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 7), M.rust);
      can.position.set(ROOM_X1 - 1.6 + rnd(i * 2.1) * 0.9, 0.05, ROOM_HZ - 1.5 + rnd(i * 4.5) * 0.9);
      can.rotation.z = rnd(i) < 0.4 ? Math.PI / 2 : 0;
      R.add(can);
    }

    // steel shelving against the wall (photo 6)
    const shX = ROOM_X0 + 1.5;
    for (let s = 0; s < 4; s++)
      R.add(slab(1.5, 0.04, 0.42, M.steel, shX, 0.25 + s * 0.55, ROOM_HZ - 0.3));
    for (const dx of [-0.72, 0.72]) for (const dz of [-0.19, 0.19])
      R.add(slab(0.05, 1.9, 0.05, M.steel, shX + dx, 0.95, ROOM_HZ - 0.3 + dz));
    for (let i = 0; i < 6; i++)
      R.add(slab(0.2 + rnd(i) * 0.2, 0.22, 0.2, M.wood, shX - 0.6 + rnd(i * 3.4) * 1.2, 0.38 + ((i % 3) * 0.55), ROOM_HZ - 0.3, 0, rnd(i) * 0.6, 0));

    // a barrel and a couple of crates by the door
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.86, 10), M.rust);
    barrel.position.set(ROOM_X0 + 0.7, 0.43, -ROOM_HZ + 0.6);
    R.add(barrel);
    R.add(slab(0.55, 0.5, 0.55, M.wood, ROOM_X0 + 1.5, 0.25, -ROOM_HZ + 0.55, 0, 0.3, 0));
    R.add(slab(0.5, 0.44, 0.5, M.wood, ROOM_X0 + 1.5, 0.72, -ROOM_HZ + 0.5, 0.03, -0.2, 0.02));

    // a bucket left under the worst of the ceiling drips
    const bkt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.26, 10, 1, true), M.steel);
    bkt.position.set(ROOM_X0 + 2.0, 0.13, 1.42);
    R.add(bkt);
    R.add(new THREE.Mesh(new THREE.CircleGeometry(0.155, 10), M.water)
      .rotateX(-Math.PI / 2).translateY(0.0).translateZ(0).translateX(0));
    const bw = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), M.water);
    bw.rotation.x = -Math.PI / 2; bw.position.set(ROOM_X0 + 2.0, 0.19, 1.42);
    R.add(bw);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 3, 10, Math.PI), M.rust);
    handle.position.set(ROOM_X0 + 2.0, 0.26, 1.42);
    R.add(handle);

    // boots and a book by the bed
    for (let i = 0; i < 2; i++) {
      R.add(slab(0.26, 0.11, 0.11, M.wood, bx - 1.15, 0.055, -ROOM_HZ + 0.45 + i * 0.17, 0, 0.2 - i * 0.4, 0));
      R.add(slab(0.11, 0.16, 0.10, M.wood, bx - 1.26, 0.13, -ROOM_HZ + 0.45 + i * 0.17, 0, 0.2 - i * 0.4, 0));
    }
    R.add(slab(0.17, 0.035, 0.24, M.cloth, bx + 0.9, 0.14, -ROOM_HZ + 0.55, 0, 0.5, 0));

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
    }
    // tally scratched by the bed
    for (let i = 0; i < 11; i++)
      R.add(slab(0.012, 0.2, 0.016, M.dark, bx - 0.7 + i * 0.055, 1.35, -ROOM_HZ + 0.02, 0, 0, i % 5 === 4 ? 0.9 : 0));
  }

  // ---- lights ------------------------------------------------------------
  // the single dim tube over the room (photo 6)
  const tube = slab(0.9, 0.05, 0.09, M.glow, rcx + 0.4, ROOM_H - 0.42, 0.4);
  R.add(tube);
  const lamp = new THREE.PointLight(0xffcf8e, 2.4, 9.5, 1.6);
  lamp.position.set(rcx + 0.4, ROOM_H - 0.55, 0.4);
  R.add(lamp);
  // a warm scrap from the crate lantern
  const lamp2 = new THREE.PointLight(0xffb367, 0.9, 3.4, 1.8);
  lamp2.position.set(ROOM_X1 - 1.2, 0.9, ROOM_HZ - 1.0);
  R.add(lamp2);
  // The mouth used to have its own cold spill. The first bore lamp sits 2 m
  // in and covers it, and every light in the scene is a per-fragment cost
  // for everything, so it's one fewer.
  const mouthLight = null;

  // Solid props, as local-space AABBs [x0, z0, x1, z1] — the game pushes the
  // player out of these so you can't walk through the bed or the shelving.
  const bedX = ROOM_X1 - 1.5, shX = ROOM_X0 + 1.5;
  // Collapse the static shells by material as well. Nested Groups (the lamps,
  // the side connection, the outlet, the beacon) are left alone, so anything
  // that animates or needs its own raycast target survives.
  bakeScatter(HW);
  bakeScatter(BORE);
  bakeScatter(DOOR);
  bakeScatter(R);
  bakeScatter(T);

  T.userData.nav = {
    BORE_R, PIPE_CY, BORE_LEN, DOOR_X, ROOM_X0, ROOM_X1, ROOM_HZ, ROOM_H, FLOOR_Y,
    doorHalfZ: 1.0, doorH: 2.12,
    props: [
      [bedX - 0.95, -ROOM_HZ + 0.25, bedX + 0.95, -ROOM_HZ + 1.25],   // pallet bed
      [ROOM_X1 - 1.56, ROOM_HZ - 1.31, ROOM_X1 - 0.84, ROOM_HZ - 0.69], // crate table
      [shX - 0.78, ROOM_HZ - 0.53, shX + 0.78, ROOM_HZ - 0.07],       // shelving
      [ROOM_X0 + 0.41, -ROOM_HZ + 0.31, ROOM_X0 + 0.99, -ROOM_HZ + 0.89], // barrel
      [ROOM_X0 + 1.22, -ROOM_HZ + 0.25, ROOM_X0 + 1.78, -ROOM_HZ + 0.85], // crates
      [ROOM_X0 + 1.82, 1.24, ROOM_X0 + 2.18, 1.60],                   // bucket
    ],
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
