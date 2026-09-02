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

// How wide the hull is at a given station: fine at the stem, full amidships,
// tucking in again to a rounded transom.
function beamAt(x) {
  const u = x / HALF;                                   // -1 .. 1
  if (u > 0.34) {                                       // the bow fines away early
    const t = (u - 0.34) / 0.66;
    return (BEAM / 2) * (1 - Math.pow(t, 1.65) * 0.97);
  }
  if (u < -0.70) {                                      // rounded transom
    const t = (-u - 0.70) / 0.30;
    return (BEAM / 2) * (1 - t * t * 0.62);
  }
  return (BEAM / 2) * (1 - 0.09 * u * u);
}
// The section, keel (0) to deck (1): slack bilge, then flare in the topsides
// so she isn't a slab. The flare is strongest forward — see flareAt().
function sectionK(v) {
  return Math.pow(Math.min(1, v * 1.32), 0.58);
}
function flareAt(x, v) {
  const u = x / HALF;
  const fwd = Math.max(0, (u - 0.1) / 0.9);
  return 1 + fwd * fwd * 0.42 * Math.pow(v, 2.2);       // bow flare
}
// Sheer: the deck line lifts toward both ends, most of it forward. This is
// what stops a hull reading as a shoebox, so the walkable deck follows it
// too — see shipFloorAt() in main.js.
function sheerAt(x) {
  const u = THREE.MathUtils.clamp(x / HALF, -1, 1);
  return 0.62 * Math.pow(Math.max(0, u), 2.1) + 0.30 * Math.pow(Math.max(0, -u), 2.4);
}
// The stem rakes forward as it rises, and the transom tucks under.
function rakeAt(x, v) {
  const u = x / HALF;
  const fwd = Math.max(0, (u - 0.3) / 0.7);
  const aft = Math.max(0, (-u - 0.5) / 0.5);
  return fwd * fwd * 1.5 * v * v - aft * aft * 0.55 * (1 - v) * (1 - v);
}

function slab(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// ---- the hull skin ------------------------------------------------------
// Torn openings, over and above the breach you walk through — she has been
// on the sand a long time and the plating has gone in places.
const HOLES = [
  { x: -9.2, v: 0.62, rx: 1.5, rv: 0.20, side: 1 },
  { x: -7.4, v: 0.34, rx: 0.9, rv: 0.13, side: -1 },
  { x: 4.6, v: 0.55, rx: 1.2, rv: 0.16, side: -1 },
  { x: 8.4, v: 0.44, rx: 1.0, rv: 0.14, side: 1 },
  { x: -4.0, v: 0.78, rx: 1.7, rv: 0.14, side: -1 },
];
function holedAt(x, v, sg) {
  for (const h of HOLES) {
    if (h.side !== sg) continue;
    const dx = (x - h.x) / h.rx, dv = (v - h.v) / h.rv;
    if (dx * dx + dv * dv < 1) return true;
  }
  return false;
}

/* The skin. It is lofted from the station functions above and, since the
 * rebuild, carries UVs — u along her length, v from keel to rail. It did not
 * before, and without them a texture samples one texel everywhere: for a
 * long while the rust map was in the material and the hull drew as a single
 * flat brown, which is most of why she read as a cut-out. */
function hullGeo() {
  const xs = 44, vs = 11;
  const pos = [], uv = [], idx = [];
  const P = (i, j, sg) => {
    const t = i / xs;
    const x0 = -HALF + t * LEN;
    const v = j / vs;
    const deckTop = DECK_Y + sheerAt(x0) + 0.75;        // top of the bulwark
    const y = KEEL_Y + v * (deckTop - KEEL_Y);
    const b = beamAt(x0) * sectionK(v) * flareAt(x0, v);
    return [x0 + rakeAt(x0, v), y, sg * b];
  };
  for (const sg of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= xs; i++)
      for (let j = 0; j <= vs; j++) { const p = P(i, j, sg); pos.push(p[0], p[1], p[2]); uv.push(i / xs, j / vs); }
    for (let i = 0; i < xs; i++)
      for (let j = 0; j < vs; j++) {
        const x0 = -HALF + (i / xs) * LEN, x1 = -HALF + ((i + 1) / xs) * LEN;
        const xm = (x0 + x1) / 2, vm = (j + 0.5) / vs;
        const yv = KEEL_Y + vm * (DECK_Y + sheerAt(xm) + 0.75 - KEEL_Y);
        // the doorway you walk in through
        if (sg > 0 && x1 > BREACH_X0 && x0 < BREACH_X1 && yv < 2.35) continue;
        if (holedAt(xm, vm, sg)) continue;
        const a = base + i * (vs + 1) + j;
        const b2 = base + (i + 1) * (vs + 1) + j;
        if (sg > 0) idx.push(a, b2, b2 + 1, a, b2 + 1, a + 1);
        else idx.push(a, b2 + 1, b2, a, a + 1, b2 + 1);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- surfaces -----------------------------------------------------------
function hullTex() {
  const w = 256, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  /* Rust seen by moonlight is brown, not orange: the ground and the mottle
   * are pulled well toward grey, and the colour comes back under the warm
   * emissive. The old ground was #8a4a22 — a rust that only exists at noon. */
  g.fillStyle = '#5e4635'; g.fillRect(0, 0, w, h);                 // rust ground
  // broad corrosion mottle
  for (let i = 0; i < 170; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 46;
    const pick = Math.random();
    const col = pick < 0.34 ? '42,28,20' : pick < 0.7 ? '132,84,52' : '92,58,36';
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
  /* The weed line. She has stood in the wash for years, so from the sand up
   * to about a metre above it she is black-green with growth, with a pale
   * crust of barnacle where the spray reaches. v = 0 is the keel and the sand
   * sits at v ≈ 0.27, so the band lives at canvas y 0.58–0.76 and fades up.
   * This is the single thing that says "wreck" rather than "boat on a beach". */
  {
    const band = g.createLinearGradient(0, h * 0.55, 0, h * 0.78);
    band.addColorStop(0, 'rgba(22,34,28,0)');
    band.addColorStop(0.35, 'rgba(22,34,28,0.55)');
    band.addColorStop(1, 'rgba(14,22,18,0.92)');
    g.fillStyle = band; g.fillRect(0, h * 0.55, w, h * 0.45);
    for (let i = 0; i < 900; i++) {                                  // barnacle crust
      const x = Math.random() * w, y = h * (0.52 + Math.random() * 0.2);
      g.fillStyle = `rgba(${160 + Math.random() * 40 | 0},${150 + Math.random() * 30 | 0},${130 + Math.random() * 30 | 0},${0.25 + Math.random() * 0.5})`;
      g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
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
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = inks[(Math.random() * inks.length) | 0];
    g.globalAlpha = 0.22 + Math.random() * 0.22;
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
  hullMap.repeat.set(6, 1);               // ONE repeat keel to rail, or the weed line appears twice
  const deckMap = hullTex();
  deckMap.repeat.set(9, 3);

  const M = {
    // Smooth-shaded: a 44-station loft under flat shading is a row of slabs,
    // and slabs are what made her read as a box. Lifted like everything else
    // on the beach, off her own map, so she is a rusted hull in moonlight and
    // not a black cut-out against the water.
    hull:  new THREE.MeshStandardMaterial({ map: hullMap, color: 0xd6cabe, roughness: 0.9, metalness: 0.18, emissive: 0x4a3628, emissiveMap: hullMap, side: THREE.DoubleSide }),
    deck:  new THREE.MeshStandardMaterial({ map: deckMap, color: 0xb0a89e, roughness: 0.96, metalness: 0.12, emissive: 0x2e241c, emissiveMap: deckMap, side: THREE.DoubleSide, flatShading: true }),
    inner: new THREE.MeshStandardMaterial({ color: 0x3a2114, roughness: 1, metalness: 0.08, emissive: 0x0a0503, side: THREE.DoubleSide, flatShading: true }),
    steel: new THREE.MeshStandardMaterial({ color: 0x74604e, roughness: 0.78, metalness: 0.4, emissive: 0x1a120c, flatShading: true }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1, metalness: 0, emissive: 0x030202, side: THREE.DoubleSide }),
    wood:  new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1, metalness: 0, emissive: 0x100b06, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0x7a6330, roughness: 0.6, metalness: 0.6, emissive: 0x120e05, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0x2a3238, roughness: 0.3, metalness: 0.2, emissive: 0x080c10, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    shell: new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 1, metalness: 0, emissive: 0x14100a, flatShading: true }),
    sand:  opts.sandMat || new THREE.MeshStandardMaterial({ color: 0x6d7d99, roughness: 0.95, emissive: 0x27324a, flatShading: true }),
  };

  // ================= hull ================================================
  const HULL = new THREE.Group();
  S.add(HULL);
  HULL.add(new THREE.Mesh(hullGeo({}), M.hull));

  // deck plating, with the cargo hatch left open and a notch for the stair
  {
    const xs = 30, zs = 10;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= xs; i++)
      for (let j = 0; j <= zs; j++) {
        const x = -HALF + (i / xs) * LEN;
        const b = beamAt(x) * sectionK(1) * flareAt(x, 1) * 0.985;
        pos.push(x, DECK_Y + sheerAt(x), -b + (j / zs) * b * 2);
        uv.push(i / xs, j / zs);
      }
    for (let i = 0; i < xs; i++)
      for (let j = 0; j < zs; j++) {
        const x0 = -HALF + (i / xs) * LEN, x1 = -HALF + ((i + 1) / xs) * LEN;
        const bz = beamAt((x0 + x1) / 2) * sectionK(1) * 0.985;
        const z0 = -bz + (j / zs) * bz * 2, z1 = -bz + ((j + 1) / zs) * bz * 2;
        const inHatch = x1 > HATCH_X0 && x0 < HATCH_X1 && z1 > -HATCH_HZ && z0 < HATCH_HZ;
        const inStair = x1 > STAIR_X0 && x0 < STAIR_X1 && z1 > STAIR_Z0 && z0 < STAIR_Z1;
        // a stretch of plating gone forward, frames showing through
        const zm = (z0 + z1) / 2, xm = (x0 + x1) / 2;
        const collapsed = xm > -11.0 && xm < -7.4 && zm > 0.2 && zm < 2.6;
        if (inHatch || inStair || collapsed) continue;
        const a = i * (zs + 1) + j, b2 = (i + 1) * (zs + 1) + j;
        idx.push(a, b2, b2 + 1, a, b2 + 1, a + 1);
      }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
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
      const b = beamAt(x) * sectionK(1) * flareAt(x, 1);
      if (b < 0.35) continue;
      for (const sg of [-1, 1]) {
        // no bulwark where the ramp leaves the deck
        if (sg < 0 && x > RAMP_X0 - 0.3 && x < RAMP_X1 + 0.3) continue;
        // and stretches of it torn away or folded flat
        if (rnd(i * 5.7 + (sg > 0 ? 0 : 40)) < 0.22) continue;
        const lean = (rnd(i * 3.1 + sg) - 0.5) * 0.5;
        HULL.add(slab(LEN / n + 0.05, 0.72, 0.13, M.hull, x,
          DECK_Y + sheerAt(x) + 0.36, sg * (b - 0.05), lean, 0, 0));
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
    BR.position.y = sheerAt(cx);          // she carries sheer aft too
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
    mast.position.set(-2.0, DECK_Y + sheerAt(-2.0) + 3.1, 0);
    mast.rotation.z = 0.10;
    S.add(mast);
    S.add(slab(0.08, 0.08, 2.2, M.steel, -2.3, DECK_Y + sheerAt(-2.3) + 5.1, 0));
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 6), M.steel);
    boom.position.set(-3.4, DECK_Y + sheerAt(-3.4) + 1.5, 0.5);
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

  // ================= what she was working =================================
  // A horseshoe crabber: culling boards to sort the catch on, stacked wire
  // baskets, the davit and winch that swung them inboard, and the shells
  // still lying in the hold decades later.
  {
    const dy = (x) => DECK_Y + sheerAt(x);

    // culling table, port side aft of the hatch
    const TX = -1.6, TZ = -2.2;
    S.add(slab(3.4, 0.08, 1.15, M.wood, TX, dy(TX) + 0.85, TZ));
    for (const dx of [-1.5, 1.5]) for (const dz of [-0.45, 0.45])
      S.add(slab(0.09, 0.85, 0.09, M.steel, TX + dx, dy(TX) + 0.42, TZ + dz));
    S.add(slab(3.4, 0.13, 0.06, M.wood, TX, dy(TX) + 0.95, TZ - 0.55));   // lip

    // stacked wire baskets — open crates, some tipped
    const basket = (x, y, z, ry, tip) => {
      const g2 = new THREE.Group();
      g2.position.set(x, y, z); g2.rotation.set(tip, ry, tip * 0.6);
      const w = 0.62, h = 0.34;
      g2.add(slab(w, 0.05, w, M.steel, 0, -h / 2, 0));
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (let k = 0; k < 4; k++) {
          const o = -w / 2 + 0.06 + k * (w - 0.12) / 3;
          g2.add(slab(ax ? 0.035 : 0.035, h, az ? 0.035 : 0.035, M.steel,
            ax ? ax * w / 2 : o, 0, az ? az * w / 2 : o));
        }
        g2.add(slab(ax ? 0.05 : w, 0.05, az ? 0.05 : w, M.steel, ax * w / 2, h / 2, az * w / 2));
      }
      // bake here: these are Groups, and the bake at the end only collapses
      // direct Mesh children, so eleven of them would add ~230 draw calls
      return bakeGroup(g2);
    };
    for (let i = 0; i < 7; i++) {
      const x = -6.4 + rnd(i * 3.7) * 3.0;
      const z = 2.15 + rnd(i * 5.1) * 0.5;
      S.add(basket(x, dy(x) + 0.2 + (i % 3) * 0.36, z, rnd(i) * 1.2, (rnd(i * 2.2) - 0.5) * 0.25));
    }
    for (let i = 0; i < 4; i++) {          // and some spilled into the hold
      const x = HOLD_X0 + 1.0 + rnd(i * 7.7) * (HOLD_X1 - HOLD_X0 - 2);
      S.add(basket(x, HOLD_Y + 0.2, (rnd(i * 4.4) - 0.5) * 3.4, rnd(i) * 2, (rnd(i * 6) - 0.5) * 0.6));
    }

    // davit and hand winch at the hatch coaming
    const DX = 6.6;
    const davit = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 2.6, 6), M.steel);
    davit.position.set(DX, dy(DX) + 1.3, 2.3);
    S.add(davit);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6), M.steel);
    arm.position.set(DX - 0.55, dy(DX) + 2.5, 1.9);
    arm.rotation.set(0.5, 0, 1.15);
    S.add(arm);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.42, 9), M.steel);
    drum.position.set(DX + 0.05, dy(DX) + 0.55, 2.55);
    drum.rotation.z = Math.PI / 2;
    S.add(drum);
    const crank = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 3, 9), M.steel);
    crank.position.set(DX + 0.32, dy(DX) + 0.55, 2.55);
    crank.rotation.y = Math.PI / 2;
    S.add(crank);
    // the fall, hanging slack off the arm
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      S.add(slab(0.03, 0.22, 0.03, M.steel, DX - 1.0 - t * 0.08,
        dy(DX) + 2.35 - t * 2.0, 1.55 + t * 0.06, 0, 0, 0.05));
    }

    // the catch that never got landed, still in the hold
    for (let i = 0; i < 16; i++) {
      const x = HOLD_X0 + 0.7 + rnd(i * 2.6) * (HOLD_X1 - HOLD_X0 - 1.4);
      const z = (rnd(i * 8.1) - 0.5) * HOLD_HZ * 1.6;
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 5, 0, TAU, 0, Math.PI / 2), M.shell);
      sh.scale.set(1, 0.34, 1.18);
      sh.position.set(x, HOLD_Y + 0.03, z);
      sh.rotation.set(rnd(i) < 0.3 ? Math.PI : 0, rnd(i * 3.3) * TAU, 0);
      S.add(sh);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 0.42, 4), M.shell);
      const a = rnd(i * 3.3) * TAU;
      tail.position.set(x - Math.sin(a) * 0.4, HOLD_Y + 0.03, z - Math.cos(a) * 0.4);
      tail.rotation.set(Math.PI / 2, 0, -a);
      S.add(tail);
    }

    // her name, on a board still bolted to the bridge front
    const nameTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#2f2a22'; g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#c8bda6';
      g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center';
      g.fillText('LIMULUS', 128, 34);
      g.font = '17px Georgia, serif';
      g.fillText('DELAWARE BAY', 128, 55);
      for (let i = 0; i < 600; i++) {            // rusted through
        g.fillStyle = `rgba(${120 + Math.random() * 70 | 0},${50 + Math.random() * 40 | 0},20,${Math.random() * 0.55})`;
        g.fillRect(Math.random() * 256 | 0, Math.random() * 64 | 0, 3, 2);
      }
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
      return t;
    })();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48),
      new THREE.MeshStandardMaterial({ map: nameTex, roughness: 1, emissive: 0x161210, side: THREE.DoubleSide }));
    board.position.set(BR_X0 - 0.09, dy(BR_X0) + 2.35, 0);
    board.rotation.y = -Math.PI / 2;
    S.add(board);
  }

  // ================= stern gear, funnel, anchor ===========================
  /* The parts of a ship that a silhouette is recognised by. A hull alone is
   * a shape; a hull with a propeller half out of the sand, a rudder behind
   * it, a stack on the bridge and an anchor at the hawse is a SHIP. */
  {
    // rudder: a plate hung off the sternpost, its heel in the sand
    // aft of the transom, not at it: this hull carries full beam down to the
    // keel, so gear placed at x > -HALF is inside the plating and never seen
    const rud = slab(0.14, 2.6, 1.15, M.hull, -HALF - 1.35, 0.55, 0, 0, 0, 0.08);
    S.add(rud);
    S.add(slab(0.2, 3.0, 0.2, M.steel, -HALF - 0.62, 0.6, 0));                    // sternpost
    // propeller: hub, shaft, three blades — bronze, the one thing on her the
    // sea has not turned brown
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 9), M.brass);
    hub.rotation.z = Math.PI / 2; hub.position.set(-HALF - 0.95, 0.62, 0);
    S.add(hub);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 7), M.steel);
    shaft.rotation.z = Math.PI / 2; shaft.position.set(-HALF + 0.2, 0.62, 0);
    S.add(shaft);
    for (let i = 0; i < 3; i++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.5), M.brass);
      bl.geometry.translate(0, 0.62, 0);
      bl.position.set(-HALF - 0.95, 0.62, 0);
      bl.rotation.set(0.42, 0, 0);                    // pitch
      const carrier = new THREE.Group();
      carrier.rotation.x = (i / 3) * TAU + 0.6;
      carrier.position.copy(bl.position); bl.position.set(0, 0, 0);
      carrier.add(bl);
      S.add(carrier);
    }
    // funnel on the bridge roof, its cap gone, streaked black inside
    const fx = (BR_X0 + BR_X1) / 2 + 0.7, fy = DECK_Y + sheerAt(fx) + BR_H;
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.9, 10, 1, true), M.hull);
    fun.position.set(fx, fy + 0.95, 0.7);
    S.add(fun);
    const funIn = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 1.6, 10, 1, true), M.dark);
    funIn.position.set(fx, fy + 1.0, 0.7);
    S.add(funIn);
    S.add(slab(0.06, 1.2, 0.06, M.steel, fx + 0.9, fy + 0.6, 0.7, 0, 0, -0.45));  // its stay
    // the anchor, hanging from the hawse at the bow, flukes in the sand
    const ax = HALF - 2.2, az = beamAt(HALF - 2.2) * sectionK(0.75) + 0.25;
    S.add(slab(0.14, 2.3, 0.14, M.steel, ax, 1.55, az, 0, 0, 0.12));            // shank
    S.add(slab(1.3, 0.12, 0.12, M.steel, ax, 2.55, az));                        // stock
    S.add(slab(0.14, 0.14, 1.5, M.steel, ax - 0.05, 0.42, az));                 // crown arms
    for (const sg of [-1, 1]) S.add(slab(0.16, 0.45, 0.28, M.steel, ax - 0.05, 0.62, az + sg * 0.7, 0, 0, sg * 0.5));
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
    beamAt, sectionK, flareAt, sheerAt,
  };
  S.userData.wheel = wheel;
  return S;
}
