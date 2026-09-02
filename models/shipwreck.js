import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 *  The wreck — a rusted coaster driven up the sand and lying across
 *  the beach, blocking the walk. Built to the Navagio reference: an
 *  orange-brown corroded hull with patches of the old blue-green paint
 *  still on it, graffiti along the topsides, an open cargo hold, and a
 *  bridge aft with the wheel still in it.
 *
 *  Local frame:  +X runs the ship's length (across the beach),
 *                +Z is the beam (the way the player walks),
 *                +Y up. Sand sits at y = 0; the keel is buried.
 *
 *  The player comes from +Z, walks in through the breach in the side,
 *  up the ladder stair to the deck, across it, and down the ramp of
 *  torn plating on the -Z side.
 *
 *  userData.nav    — walkable regions + hull footprint, for main.js
 *  userData.wheel  — { pivot, setPosition(i), positions } for the puzzle
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

const LEN = 24;                 // stem to transom, along X
const HALF = LEN / 2;
const BEAM = 6.6;               // widest, amidships
const DECK_Y = 3.25;            // walking surface on deck
const KEEL_Y = -1.5;            // buried
const RAIL_Y = DECK_Y + 0.75;   // top of the bulwark

// the hold you walk into
const HOLD_X0 = -6.0, HOLD_X1 = 6.0;
const HOLD_HZ = 2.8;
const HOLD_Y = 0.15;
// the hatch opening in the deck above it
// Narrower than the hold below it: the side decks either side of the hatch
// are the only way aft to the bridge, and at 2.4 they left half a metre.
const HATCH_X0 = 0.8, HATCH_X1 = 6.0, HATCH_HZ = 1.95;
// the breach you come in through
const BREACH_X0 = -2.4, BREACH_X1 = 2.4;
// the stair up out of the hold
// The stair sits on the SAME side you come in, so climbing it leaves you
// on open deck with a clear run across to the ramp. On the far side its
// well in the deck left only a 0.4 m ledge to edge past, which is no route.
const STAIR_X0 = -5.6, STAIR_X1 = -0.6, STAIR_Z0 = 1.3, STAIR_Z1 = 2.8;
// the ramp of torn plate down the far side
const RAMP_X0 = -2.6, RAMP_X1 = 0.4, RAMP_Z0 = -7.6, RAMP_Z1 = -3.0;
// the bridge
const BR_X0 = 7.0, BR_X1 = 11.0, BR_HZ = 2.5, BR_H = 2.7;

function rnd(seed) { const s = Math.sin(seed * 91.7) * 43758.5453; return s - Math.floor(s); }

// how wide the hull is at a given station, 0 at the stem, full amidships
function beamAt(x) {
  const u = x / HALF;                                   // -1 .. 1
  if (u > 0.62) {                                       // bow, fines away
    const t = (u - 0.62) / 0.38;
    return (BEAM / 2) * (1 - t * t * 0.96);
  }
  if (u < -0.72) {                                      // rounded transom
    const t = (-u - 0.72) / 0.28;
    return (BEAM / 2) * (1 - t * t * 0.55);
  }
  return (BEAM / 2) * (1 - 0.06 * u * u);
}
// the section: how far out the hull is at a given height, 0 = keel, 1 = deck
function sectionK(v) {
  return Math.pow(Math.min(1, v * 1.35), 0.62);         // slack bilge, firm topsides
}

function slab(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// ---- the hull skin ------------------------------------------------------
function hullGeo(opts) {
  const { xs = 34, vs = 9, breach = true } = opts || {};
  const pos = [], idx = [];
  const ring = [];
  for (let i = 0; i <= xs; i++) {
    const x = -HALF + (i / xs) * LEN;
    const b = beamAt(x);
    const row = [];
    for (let j = 0; j <= vs; j++) {
      const v = j / vs;
      const y = KEEL_Y + v * (RAIL_Y - KEEL_Y);
      const z = b * sectionK(v);
      row.push([x, y, z]);
    }
    ring.push(row);
  }
  const push = (p) => { pos.push(p[0], p[1], p[2]); return pos.length / 3 - 1; };
  // two sides, mirrored in z
  for (const sg of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= xs; i++)
      for (let j = 0; j <= vs; j++) {
        const p = ring[i][j];
        push([p[0], p[1], sg * p[2]]);
      }
    for (let i = 0; i < xs; i++) {
      for (let j = 0; j < vs; j++) {
        const x0 = -HALF + (i / xs) * LEN, x1 = -HALF + ((i + 1) / xs) * LEN;
        const yv = KEEL_Y + (j / vs) * (RAIL_Y - KEEL_Y);
        // leave the doorway out of the +Z side
        if (breach && sg > 0 && x1 > BREACH_X0 && x0 < BREACH_X1 && yv < 2.35) continue;
        const a = base + i * (vs + 1) + j;
        const b2 = base + (i + 1) * (vs + 1) + j;
        if (sg > 0) idx.push(a, b2, b2 + 1, a, b2 + 1, a + 1);
        else idx.push(a, b2 + 1, b2, a, a + 1, b2 + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- surfaces -----------------------------------------------------------
function hullTex() {
  const w = 256, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#8a4a22'; g.fillRect(0, 0, w, h);                 // rust ground
  // broad corrosion mottle
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 46;
    const pick = Math.random();
    const col = pick < 0.34 ? '58,30,14' : pick < 0.7 ? '176,96,40' : '120,60,26';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${0.10 + Math.random() * 0.32})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // what's left of the old blue-green paint, in flaking patches
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w, y = h * (0.28 + Math.random() * 0.6);
    const r = 12 + Math.random() * 40;
    const teal = Math.random() < 0.5 ? '58,110,104' : '44,86,96';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${teal},${0.36 + Math.random() * 0.4})`);
    gr.addColorStop(0.75, `rgba(${teal},0.18)`);
    gr.addColorStop(1, `rgba(${teal},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // horizontal plate seams and weld lines
  g.strokeStyle = 'rgba(40,20,10,0.5)';
  for (let i = 1; i < 7; i++) {
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, (i / 7) * h); g.lineTo(w, (i / 7) * h); g.stroke();
  }
  g.strokeStyle = 'rgba(210,150,90,0.16)';
  for (let i = 1; i < 7; i++) {
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, (i / 7) * h + 2); g.lineTo(w, (i / 7) * h + 2); g.stroke();
  }
  // rivet lines
  g.fillStyle = 'rgba(50,26,12,0.5)';
  for (let i = 1; i < 7; i++)
    for (let x = 4; x < w; x += 9) g.fillRect(x, (i / 7) * h - 3, 2, 2);
  // rust running down from the seams
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w, top = Math.random() * h;
    const gr = g.createLinearGradient(0, top, 0, top + 50 + Math.random() * 70);
    gr.addColorStop(0, 'rgba(52,26,12,0.42)');
    gr.addColorStop(1, 'rgba(52,26,12,0)');
    g.fillStyle = gr; g.fillRect(x, top, 1 + Math.random() * 3, 120);
  }
  // graffiti
  const inks = ['#e8e2d6', '#3050a0', '#c03040', '#202020', '#d8b030'];
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = inks[(Math.random() * inks.length) | 0];
    g.globalAlpha = 0.4 + Math.random() * 0.35;
    g.lineWidth = 1.5 + Math.random() * 3;
    g.beginPath();
    let x = Math.random() * w, y = h * (0.3 + Math.random() * 0.5);
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) g.lineTo(x += (Math.random() - 0.4) * 30, y += (Math.random() - 0.5) * 20);
    g.stroke();
    g.globalAlpha = 1;
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}

function bakeGroup(group) {
  const byMat = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh || child.userData.noBake) continue;
    let g = child.geometry.clone();
    child.updateMatrix();
    g.applyMatrix4(child.matrix);
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv1'); g.deleteAttribute('uv2');
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
      else geos.forEach((g) => group.add(new THREE.Mesh(g, mat)));
    } catch (e) { geos.forEach((g) => group.add(new THREE.Mesh(g, mat))); }
  }
  return group;
}

export function makeShipwreck(opts = {}) {
  const S = new THREE.Group();
  S.name = 'shipwreck';

  const hullMap = hullTex();
  hullMap.repeat.set(7, 2);
  const deckMap = hullTex();
  deckMap.repeat.set(9, 3);

  const M = {
    hull:  new THREE.MeshStandardMaterial({ map: hullMap, color: 0xb0a294, roughness: 0.94, metalness: 0.14, emissive: 0x140a05, side: THREE.DoubleSide, flatShading: true }),
    deck:  new THREE.MeshStandardMaterial({ map: deckMap, color: 0x8f8478, roughness: 0.97, metalness: 0.12, emissive: 0x0f0803, side: THREE.DoubleSide, flatShading: true }),
    inner: new THREE.MeshStandardMaterial({ color: 0x3a2114, roughness: 1, metalness: 0.08, emissive: 0x0a0503, side: THREE.DoubleSide, flatShading: true }),
    steel: new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.8, metalness: 0.35, emissive: 0x0d0704, flatShading: true }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1, metalness: 0, emissive: 0x030202, side: THREE.DoubleSide }),
    wood:  new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1, metalness: 0, emissive: 0x100b06, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0x7a6330, roughness: 0.6, metalness: 0.6, emissive: 0x120e05, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0x2a3238, roughness: 0.3, metalness: 0.2, emissive: 0x080c10, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    sand:  opts.sandMat || new THREE.MeshStandardMaterial({ color: 0x6d7d99, roughness: 0.95, emissive: 0x27324a, flatShading: true }),
  };

  // ================= hull ================================================
  const HULL = new THREE.Group();
  S.add(HULL);
  HULL.add(new THREE.Mesh(hullGeo({}), M.hull));

  // deck plating, with the cargo hatch left open and a notch for the stair
  {
    const xs = 30, zs = 10;
    const pos = [], idx = [];
    for (let i = 0; i <= xs; i++)
      for (let j = 0; j <= zs; j++) {
        const x = -HALF + (i / xs) * LEN;
        const b = beamAt(x) * sectionK(1) * 0.985;
        pos.push(x, DECK_Y, -b + (j / zs) * b * 2);
      }
    for (let i = 0; i < xs; i++)
      for (let j = 0; j < zs; j++) {
        const x0 = -HALF + (i / xs) * LEN, x1 = -HALF + ((i + 1) / xs) * LEN;
        const bz = beamAt((x0 + x1) / 2) * sectionK(1) * 0.985;
        const z0 = -bz + (j / zs) * bz * 2, z1 = -bz + ((j + 1) / zs) * bz * 2;
        const inHatch = x1 > HATCH_X0 && x0 < HATCH_X1 && z1 > -HATCH_HZ && z0 < HATCH_HZ;
        const inStair = x1 > STAIR_X0 && x0 < STAIR_X1 && z1 > STAIR_Z0 && z0 < STAIR_Z1;
        if (inHatch || inStair) continue;
        const a = i * (zs + 1) + j, b2 = (i + 1) * (zs + 1) + j;
        idx.push(a, b2, b2 + 1, a, b2 + 1, a + 1);
      }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dg.setIndex(idx);
    dg.computeVertexNormals();
    HULL.add(new THREE.Mesh(dg, M.deck));
  }

  // hold floor, and the inside of the hold walls
  HULL.add(slab(HOLD_X1 - HOLD_X0 + 1.2, 0.25, HOLD_HZ * 2 + 0.4, M.inner,
    (HOLD_X0 + HOLD_X1) / 2, HOLD_Y - 0.125, 0));
  for (const sg of [-1, 1])
    HULL.add(slab(HOLD_X1 - HOLD_X0 + 1.2, DECK_Y - HOLD_Y + 0.3, 0.16, M.inner,
      (HOLD_X0 + HOLD_X1) / 2, (HOLD_Y + DECK_Y) / 2, sg * (HOLD_HZ + 0.08)));
  for (const sg of [-1, 1])
    HULL.add(slab(0.16, DECK_Y - HOLD_Y + 0.3, HOLD_HZ * 2, M.inner,
      sg > 0 ? HOLD_X1 + 0.08 : HOLD_X0 - 0.08, (HOLD_Y + DECK_Y) / 2, 0));

  // frames and beams showing inside the hold
  for (let i = 0; i < 11; i++) {
    const x = HOLD_X0 + 0.6 + i * ((HOLD_X1 - HOLD_X0 - 1.2) / 10);
    HULL.add(slab(0.13, DECK_Y - HOLD_Y, 0.13, M.steel, x, (HOLD_Y + DECK_Y) / 2, HOLD_HZ - 0.12));
    HULL.add(slab(0.13, DECK_Y - HOLD_Y, 0.13, M.steel, x, (HOLD_Y + DECK_Y) / 2, -HOLD_HZ + 0.12));
    if (i % 2 === 0) HULL.add(slab(0.11, 0.11, HOLD_HZ * 2, M.steel, x, DECK_Y - 0.18, 0));
  }
  // sand drifted into the hold
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), M.sand);
    m.scale.set(1.4 + rnd(i * 3.1) * 1.6, 0.16 + rnd(i * 5.2) * 0.14, 1.0 + rnd(i * 2.7));
    m.position.set(HOLD_X0 + rnd(i * 7.3) * (HOLD_X1 - HOLD_X0), HOLD_Y + 0.02,
      (rnd(i * 4.4) - 0.5) * HOLD_HZ * 1.7);
    m.rotation.y = rnd(i) * 3.1;
    HULL.add(m);
  }

  // the breach: torn plate edges round the hole you walk in through
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = BREACH_X0 + t * (BREACH_X1 - BREACH_X0);
    const b = beamAt(x) * sectionK(1);
    const hgt = 2.35 + Math.sin(t * Math.PI) * 0.45;
    HULL.add(slab(0.5, 0.16 + rnd(i * 2.2) * 0.22, 0.20, M.steel, x, hgt, b - 0.06,
      0, 0, (rnd(i * 3.3) - 0.5) * 0.5));
  }
  for (const sg of [0, 1]) {
    const x = sg ? BREACH_X1 : BREACH_X0;
    const b = beamAt(x) * sectionK(1);
    HULL.add(slab(0.18, 2.4, 0.22, M.steel, x, 1.2, b - 0.06));
  }

  // ================= the stair up out of the hold =========================
  {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = STAIR_X0 + 0.2 + t * (STAIR_X1 - STAIR_X0 - 0.4);
      const y = HOLD_Y + t * (DECK_Y - HOLD_Y);
      HULL.add(slab((STAIR_X1 - STAIR_X0) / n + 0.06, 0.09, STAIR_Z1 - STAIR_Z0 - 0.15,
        M.steel, x, y, (STAIR_Z0 + STAIR_Z1) / 2));
      if (i % 2 === 0)
        HULL.add(slab(0.07, y - HOLD_Y + 0.1, 0.07, M.steel, x, HOLD_Y + (y - HOLD_Y) / 2, STAIR_Z0 + 0.12));
    }
    // handrail
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = STAIR_X0 + 0.2 + t * (STAIR_X1 - STAIR_X0 - 0.4);
      const y = HOLD_Y + t * (DECK_Y - HOLD_Y);
      HULL.add(slab(0.06, 0.95, 0.06, M.steel, x, y + 0.5, STAIR_Z0 + 0.12));
    }
    const rail = slab(STAIR_X1 - STAIR_X0, 0.06, 0.06, M.steel,
      (STAIR_X0 + STAIR_X1) / 2, HOLD_Y + (DECK_Y - HOLD_Y) / 2 + 0.98, STAIR_Z0 + 0.12);
    rail.rotation.z = Math.atan2(DECK_Y - HOLD_Y, STAIR_X1 - STAIR_X0);
    HULL.add(rail);
  }

  // ================= the ramp of torn plate down the far side =============
  {
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const z = RAMP_Z1 - t * (RAMP_Z1 - RAMP_Z0);
      const y = DECK_Y * (1 - t) + 0.06;
      HULL.add(slab(RAMP_X1 - RAMP_X0, 0.10, (RAMP_Z1 - RAMP_Z0) / steps + 0.12, M.steel,
        (RAMP_X0 + RAMP_X1) / 2, y, z, 0, 0, 0));
      if (i % 3 === 0) for (const sg of [-1, 1])
        HULL.add(slab(0.07, 0.8, 0.07, M.steel, (RAMP_X0 + RAMP_X1) / 2 + sg * ((RAMP_X1 - RAMP_X0) / 2 - 0.1), y + 0.42, z));
    }
    // the plate it was torn from, hanging off the hull
    HULL.add(slab(RAMP_X1 - RAMP_X0 + 1.4, 0.12, 2.2, M.hull,
      (RAMP_X0 + RAMP_X1) / 2, DECK_Y - 0.5, RAMP_Z1 - 0.6, 0.5, 0, 0.06));
  }

  // ================= bulwark, rails, fittings =============================
  {
    const n = 46;
    for (let i = 0; i <= n; i++) {
      const x = -HALF + (i / n) * LEN;
      const b = beamAt(x) * sectionK(1);
      if (b < 0.35) continue;
      for (const sg of [-1, 1]) {
        // no bulwark where the ramp leaves the deck
        if (sg < 0 && x > RAMP_X0 - 0.3 && x < RAMP_X1 + 0.3) continue;
        HULL.add(slab(LEN / n + 0.05, 0.72, 0.13, M.hull, x, DECK_Y + 0.36, sg * (b - 0.05)));
      }
    }
  }
  // portholes along the topsides
  for (let i = 0; i < 12; i++) {
    const x = -HALF + 2.0 + (i / 11) * (LEN - 4.5);
    const b = beamAt(x) * sectionK(0.78);
    for (const sg of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 4, 10), M.steel);
      r.position.set(x, DECK_Y - 0.85, sg * (b + 0.02));
      r.rotation.y = Math.PI / 2;
      HULL.add(r);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), M.dark);
      gl.position.set(x, DECK_Y - 0.85, sg * (b + 0.01));
      gl.rotation.y = sg > 0 ? Math.PI / 2 : -Math.PI / 2;
      HULL.add(gl);
    }
  }

  // ================= the bridge ===========================================
  const BR = new THREE.Group();
  S.add(BR);
  {
    const w = BR_X1 - BR_X0, cx = (BR_X0 + BR_X1) / 2;
    // walls, with a doorway punched in the -X face
    BR.add(slab(w, 0.12, BR_HZ * 2, M.deck, cx, DECK_Y + BR_H, 0));          // roof
    for (const sg of [-1, 1])
      BR.add(slab(w, BR_H, 0.14, M.hull, cx, DECK_Y + BR_H / 2, sg * BR_HZ));
    BR.add(slab(0.14, BR_H, BR_HZ * 2, M.hull, BR_X1, DECK_Y + BR_H / 2, 0)); // aft wall
    // forward wall as three pieces around a doorway
    const DW = 0.55, DH = 2.05;
    BR.add(slab(0.14, BR_H, BR_HZ - DW, M.hull, BR_X0, DECK_Y + BR_H / 2, (BR_HZ + DW) / 2));
    BR.add(slab(0.14, BR_H, BR_HZ - DW, M.hull, BR_X0, DECK_Y + BR_H / 2, -(BR_HZ + DW) / 2));
    BR.add(slab(0.14, BR_H - DH, DW * 2, M.hull, BR_X0, DECK_Y + DH + (BR_H - DH) / 2, 0));
    // windows: long strips, most of the glass gone
    for (const sg of [-1, 1]) {
      BR.add(slab(w - 1.0, 0.72, 0.05, M.glass, cx, DECK_Y + 1.75, sg * (BR_HZ - 0.05)));
      for (let i = 0; i < 4; i++)
        BR.add(slab(0.09, 0.78, 0.1, M.steel, BR_X0 + 0.7 + i * ((w - 1.4) / 3), DECK_Y + 1.75, sg * (BR_HZ - 0.03)));
    }
    BR.add(slab(0.05, 0.72, BR_HZ * 1.5, M.glass, BR_X1 - 0.06, DECK_Y + 1.75, 0));
    // the bridge floor sits on the deck; a little console under the windows
    BR.add(slab(w - 1.2, 0.5, 0.4, M.steel, cx, DECK_Y + 0.9, -BR_HZ + 0.32));
  }

  // ---- the wheel -------------------------------------------------------
  const wheel = new THREE.Group();
  {
    const WX = BR_X0 + 1.5, WY = DECK_Y + 1.05, WZ = 0;
    // binnacle / pedestal
    BR.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.95, 8), M.steel)
      .translateX(WX).translateY(DECK_Y + 0.47).translateZ(WZ));
    BR.add(slab(0.3, 0.16, 0.3, M.brass, WX, DECK_Y + 1.0, WZ));
    wheel.position.set(WX, WY + 0.25, WZ);
    wheel.rotation.y = Math.PI / 2;          // faces along the ship
    BR.add(wheel);
    // rim, hub, spokes with the turned handles
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 5, 20), M.wood);
    wheel.add(rim);
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.10, 8), M.brass)
      .rotateX(Math.PI / 2));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.05), M.wood);
      spoke.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
      spoke.rotation.z = a - Math.PI / 2;
      wheel.add(spoke);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.20, 6), M.wood);
      grip.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0);
      grip.rotation.z = a - Math.PI / 2;
      wheel.add(grip);
    }
    wheel.userData.noBake = true;
  }

  // ================= mast, derrick, chain =================================
  {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 6.2, 7), M.steel);
    mast.position.set(-2.0, DECK_Y + 3.1, 0);
    mast.rotation.z = 0.10;
    S.add(mast);
    S.add(slab(0.08, 0.08, 2.2, M.steel, -2.3, DECK_Y + 5.1, 0));
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 6), M.steel);
    boom.position.set(-3.4, DECK_Y + 1.5, 0.5);
    boom.rotation.set(0, 0.3, 1.15);
    S.add(boom);
    // anchor chain out of the hawse, down into the sand
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const lk = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.032, 3, 7), M.steel);
      lk.position.set(HALF - 1.6 + t * 3.4, (DECK_Y - 1.2) * (1 - t * t) + 0.06, 1.4 + t * 0.9);
      lk.rotation.set(i % 2 ? 0 : Math.PI / 2, 0.4, 0.2);
      S.add(lk);
    }
  }

  // ================= sand banked against the hull =========================
  for (let i = 0; i < 30; i++) {
    const x = -HALF - 1 + rnd(i * 2.9) * (LEN + 2);
    const sg = i % 2 ? 1 : -1;
    const b = beamAt(Math.max(-HALF, Math.min(HALF, x))) * sectionK(0.35);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), M.sand);
    const hgt = 0.5 + rnd(i * 5.1) * 0.7;
    m.scale.set(1.4 + rnd(i * 3.3) * 1.8, hgt, 1.1 + rnd(i * 7.7) * 1.0);
    m.position.set(x, hgt * 0.1, sg * (b + 0.5 + rnd(i * 4.2) * 0.7));
    m.rotation.y = rnd(i) * 3.1;
    S.add(m);
  }

  bakeGroup(HULL);
  bakeGroup(BR);
  bakeGroup(S);

  S.userData.nav = {
    LEN, HALF, BEAM, DECK_Y, HOLD_Y, RAIL_Y,
    HOLD_X0, HOLD_X1, HOLD_HZ,
    HATCH_X0, HATCH_X1, HATCH_HZ,
    BREACH_X0, BREACH_X1,
    STAIR_X0, STAIR_X1, STAIR_Z0, STAIR_Z1,
    RAMP_X0, RAMP_X1, RAMP_Z0, RAMP_Z1,
    BR_X0, BR_X1, BR_HZ, BR_H,
    beamAt, sectionK,
  };
  S.userData.wheel = wheel;
  return S;
}
