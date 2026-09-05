import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 *  The Limulus — a horseshoe-crabbing boat driven up the beach and
 *  left there. Timber hull, painted wheelhouse, her gear still aboard.
 *
 *  ONE SET OF NUMBERS. Everything below is generated from the constants
 *  in the next block, and main.js builds its collision from the SAME
 *  constants via userData.nav. Never restate a dimension in main.js.
 *
 *  INVARIANTS. Every one of these is here because breaking it shipped a
 *  bug that had to be found by walking her:
 *
 *   1. The deck is FLAT (DECK_Y). The sheer lives in the rail and the top
 *      edge of the planking, where you can see it. A deck whose height is
 *      a function of x means every collision test has to agree with a
 *      curve, and they do not.
 *   2. She sits UPRIGHT. Heeled, her low side goes under the sand plane
 *      and every floor test has to cross between her frame and the world.
 *   3. Geometry that carries a map needs a `uv` attribute. hullGeo,
 *      deckGeo and bulwarkGeo had none, so every mark on the texture was
 *      invisible and she read as one flat brown mass.
 *   4. CLOSE THE ENDS. beamAt never reaches zero, so without a stitched
 *      stem and transom she is an open trough.
 *   5. Tears need THICKNESS. A dropped quad leaves an edge one polygon
 *      thin and you see the far planking through it — holes cut in paper.
 *   6. Anything lining a curved hull is LOFTED off halfAtY, never boxed.
 *      Flat slabs pinned at a fixed z punch out through her sides.
 *   7. The hold lining must be CUT at the breach, or the hole you walk in
 *      through has a wall ten centimetres behind it.
 *   8. A wall with a doorway is FOUR pieces around the hole. A full-width
 *      slab as well plugs it — and because collision is a separate
 *      system it still lets you walk through, so it presents as "there is
 *      no door" while every movement test passes.
 *   9. Nothing on the centreline forward of the helm above deck height.
 *      The star puzzle is read out of that window.
 *  10. Nothing crosses the windscreen. Her name goes on her side.
 *  11. Two holes in the deck must never share an x AND a z.
 *  12. Every brace lands on something at BOTH ends. Use strut().
 *
 *  Local frame: +X her length, bow at -X. +Z is the side you walk in
 *  from. +Y up. Sand at y = 0.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

// ---- her -------------------------------------------------------------
const LEN = 26, HALF = LEN / 2;
/* BEAM. She lies across your path, so her beam is the distance you
 * actually have to traverse, and at 7.0 the side decks either side of the
 * wheelhouse came out under a metre once you take the player's radius off
 * — you were edging round her. 9.4 gives 2.2 m of side deck and puts her
 * length:beam at 2.8:1, which is what a beamy inshore crabber is. */
const BEAM = 9.4;
const KEEL_Y = -1.8;              // buried
const DECK_Y = 3.20;              // the walking deck. FLAT.
const BULWARK = 0.85;             // rail above the deck

// ---- the hold you walk into ------------------------------------------
/* HOLD_X1 runs aft to 7.2 so her crew space is part of the walk: below
 * the wheelhouse casing, at the after end of the same hold. */
const HOLD_X0 = -8.0, HOLD_X1 = 7.2;
const HOLD_HZ = 3.70;
const HOLD_Y = 0.25;

// ---- the stove-in side you get in through ----------------------------
const BREACH_X0 = -7.0, BREACH_X1 = -2.8, BREACH_TOP = 2.6;

// ---- the cargo hatch, coamed ----------------------------------------
const HATCH_X0 = -4.8, HATCH_X1 = -1.8, HATCH_HZ = 1.45;
const COAMING = 0.55;

// ---- the companion ladder out of the hold ---------------------------
// Short, steep, on the centreline, up through its own well just forward
// of the wheelhouse — with DECK in front of it when you surface.
const STAIR_X0 = -1.0, STAIR_X1 = 1.3;
const STAIR_Z0 = -1.05, STAIR_Z1 = 0.75;

/* ---- the way out of her: a locked shell door low in her -Z side -----
 * You come in through the breach on the +Z side, cross her hold, and this
 * is the ONLY way through to the far beach. It is locked, and the key is
 * in the captain's mouth — which you do not get until the wheel.
 *
 * There is no drop-off gap in the bulwark any more and no ladder. With a
 * door as the answer, a place you can simply step over the side is a way
 * to skip her, and a ladder up a side you can no longer get down to is
 * furniture pretending to be a route. Her rail runs unbroken. */
const DOOR_X = -0.6, DOOR_W = 1.30, DOOR_H = 2.05;

// ---- the wheelhouse --------------------------------------------------
const BR_X0 = 2.6, BR_X1 = 6.6;
const BR_HZ = 2.35;
const BR_STEP = 0.90;             // the casing it stands on
const BR_H = 2.65;
const BR_DOOR_C = 5.40, BR_DOOR_W = 1.10;
const BR_RUN = 0.80;              // the steps outside the door
const WHEEL_X = BR_X0 + 1.20;

// ---- the davit over the hatch ---------------------------------------
const GAFF_X = (HATCH_X0 + HATCH_X1) / 2;
const HOOK_Y = DECK_Y + 2.30;     // out of reach

// ---- her mast, on the centreline where a mast goes -------------------
const MAST_X = -9.5;

function rnd(seed) { const s = Math.sin(seed * 91.7) * 43758.5453; return s - Math.floor(s); }

/* Her lines. Bow at -X: fine, raked, flared. Transom rounded. The section
 * has a real turn of bilge — a power curve alone gives a wedge, which is
 * what read as blocky. */
function beamAt(x) {
  const u = -x / HALF;                                  // +1 at the bow
  if (u > 0.30) { const t = (u - 0.30) / 0.70; return (BEAM / 2) * (1 - Math.pow(t, 1.6) * 0.98); }
  if (u < -0.70) { const t = (-u - 0.70) / 0.30; return (BEAM / 2) * (1 - t * t * 0.55); }
  return (BEAM / 2) * (1 - 0.09 * u * u);
}
function sectionK(v) {
  const t = Math.min(1, Math.max(0, v));
  const bilge = Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, t * 1.5), 2)));
  return 0.80 * bilge + 0.20 * Math.pow(t, 0.30);
}
function flareAt(x, v) {
  const u = -x / HALF;
  return 1 + Math.pow(Math.max(0, (u - 0.05) / 0.95), 2) * 0.44 * Math.pow(v, 2.2);
}
/* Sheer lifts the RAIL, not the deck. */
function sheerAt(x) {
  const u = Math.max(-1, Math.min(1, -x / HALF));
  return 1.05 * Math.pow(Math.max(0, u), 2.0) + 0.30 * Math.pow(Math.max(0, -u), 2.2);
}
function rakeAt(x, v) {
  const u = -x / HALF;
  const fwd = Math.max(0, (u - 0.25) / 0.75), aft = Math.max(0, (-u - 0.45) / 0.55);
  return -(fwd * fwd * 1.9 * v * v) + aft * aft * 0.6 * (1 - v) * (1 - v);
}
const railY = (x) => DECK_Y + sheerAt(x) + BULWARK;
function halfAtY(x, y) {
  const xc = Math.max(-HALF, Math.min(HALF, x));
  const v = Math.max(0, Math.min(1, (y - KEEL_Y) / (railY(xc) - KEEL_Y)));
  return beamAt(xc) * sectionK(v) * flareAt(xc, v);
}
const deckHalf = (x) => halfAtY(x, DECK_Y) * 0.99;
// a point ON the planking, so nothing is ever placed off it (invariant 6)
function hullPt(x, y, sg, out = 0) {
  const xc = Math.max(-HALF, Math.min(HALF, x));
  const v = Math.max(0, Math.min(1, (y - KEEL_Y) / (railY(xc) - KEEL_Y)));
  return [x + rakeAt(xc, v), y, sg * (halfAtY(x, y) + out)];
}

function slab(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}
function cyl(r0, r1, h, seg, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}
/* A member between two points that LANDS AT BOTH ENDS (invariant 12).
 * Every floating stick this model has ever had was a slab placed at a
 * midpoint with a guessed rotation; this takes the endpoints instead. */
function strut(a, b, r, mat, seg = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize());
  return m;
}

/* Rot holes in her planking. Corrosion does not make ellipses: the radius
 * wobbles with the angle so the boundary is ragged, not a drawn shape. */
const HOLES = [
  { x: -11.2, v: 0.62, rx: 1.5, rv: 0.19, side: 1 },
  { x: -9.0, v: 0.34, rx: 1.0, rv: 0.13, side: -1 },
  { x: 5.4, v: 0.56, rx: 1.3, rv: 0.17, side: -1 },
  { x: 9.2, v: 0.44, rx: 1.1, rv: 0.14, side: 1 },
  { x: -0.4, v: 0.80, rx: 1.4, rv: 0.12, side: -1 },
  { x: 11.0, v: 0.66, rx: 1.2, rv: 0.15, side: -1 },
];
function holed(x, v, sg) {
  for (const h of HOLES) {
    if (h.side !== sg) continue;
    const dx = (x - h.x) / h.rx, dv = (v - h.v) / h.rv;
    const a = Math.atan2(dv, dx);
    const wob = 1 + 0.24 * Math.sin(a * 3 + h.x) + 0.16 * Math.sin(a * 5 - h.v * 9)
      + 0.10 * Math.sin(a * 9 + 2.1);
    if (dx * dx + dv * dv < wob * wob) return true;
  }
  return false;
}
/* The breach is a tear, not a doorway: it arches, closing to nothing at
 * both ends, and its top edge is broken. */
function breached(x, y) {
  if (x <= BREACH_X0 || x >= BREACH_X1) return false;
  const t = (x - BREACH_X0) / (BREACH_X1 - BREACH_X0);
  const arch = Math.pow(Math.sin(Math.PI * t), 0.55);
  const top = BREACH_TOP * (0.26 + 0.74 * arch)
    + 0.28 * Math.sin(x * 2.6) + 0.17 * Math.sin(x * 5.1 + 1.7);
  return y < top;
}
/* The shell door's opening, cut out of her -Z side and out of the hold
 * lining behind it — both, or the door has a wall ten centimetres back. */
function doorCut(x, y) {
  return Math.abs(x - DOOR_X) < DOOR_W / 2 + 0.02
    && y > HOLD_Y - 0.10 && y < HOLD_Y + DOOR_H;
}

// how high the tear reaches at a station, for laying trim along its edge
function breachTopAt(x) {
  if (!breached(x, 0.05)) return null;
  let lo = 0, hi = BREACH_TOP * 1.7;
  for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (breached(x, m)) lo = m; else hi = m; }
  return lo;
}

/* ---- the skin -------------------------------------------------------
 * Smooth-shaded and dense; flat shading on a curved hull is most of what
 * reads as faceted. Carries uv (3), closes both ends (4), and grows a
 * turned lip on every torn edge (5). */
function hullGeo() {
  const xs = 120, vs = 28;
  const pos = [], idx = [], uv = [];
  const at = (i, j) => {
    const x = -HALF + (i / xs) * LEN, v = j / vs;
    return { x, v, y: KEEL_Y + v * (railY(x) - KEEL_Y) };
  };
  const ring = {};

  for (const [sgi, sg] of [[0, 1], [1, -1]]) {
    const base = pos.length / 3;
    ring[sgi] = base;
    for (let i = 0; i <= xs; i++)
      for (let j = 0; j <= vs; j++) {
        const { x, y, v } = at(i, j);
        pos.push(...hullPt(x, y, sg));
        uv.push((x + HALF) / 5.2, v);        // v = keel 0 -> rail 1, once
      }
    const grid = [];
    for (let i = 0; i < xs; i++) {
      grid.push([]);
      for (let j = 0; j < vs; j++) {
        const xm = -HALF + ((i + 0.5) / xs) * LEN, vm = (j + 0.5) / vs;
        const ym = KEEL_Y + vm * (railY(xm) - KEEL_Y);
        const cut = (sg > 0 && breached(xm, ym)) || (sg < 0 && doorCut(xm, ym)) || holed(xm, vm, sg);
        grid[i].push(!cut);
        if (cut) continue;
        const a = base + i * (vs + 1) + j, b = base + (i + 1) * (vs + 1) + j;
        if (sg > 0) idx.push(a, b, b + 1, a, b + 1, a + 1);
        else idx.push(a, b + 1, b, a, a + 1, b + 1);
      }
    }
    const rim = (i0, j0, i1, j1, seed) => {
      const d = 0.10 + rnd(seed) * 0.16;
      const p0 = at(i0, j0), p1 = at(i1, j1);
      const o0 = hullPt(p0.x, p0.y, sg), o1 = hullPt(p1.x, p1.y, sg);
      const iv0 = hullPt(p0.x + (rnd(seed * 1.7) - 0.5) * 0.16, p0.y + (rnd(seed * 2.3) - 0.5) * 0.10, sg, -d);
      const iv1 = hullPt(p1.x + (rnd(seed * 3.1) - 0.5) * 0.16, p1.y + (rnd(seed * 4.9) - 0.5) * 0.10, sg, -d);
      const q = pos.length / 3;
      pos.push(...o0, ...o1, ...iv1, ...iv0);
      for (const pt of [p0, p1, p1, p0]) uv.push((pt.x + HALF) / 5.2, pt.v);
      idx.push(q, q + 1, q + 2, q, q + 2, q + 3);
      idx.push(q, q + 2, q + 1, q, q + 3, q + 2);   // a lip reads from both sides
    };
    for (let i = 0; i < xs; i++)
      for (let j = 0; j < vs; j++) {
        if (!grid[i][j]) continue;
        const seed = i * 7.3 + j * 3.1 + sgi * 41;
        if (i === 0 || !grid[i - 1][j]) rim(i, j, i, j + 1, seed);
        if (i === xs - 1 || !grid[i + 1][j]) rim(i + 1, j, i + 1, j + 1, seed + 0.5);
        if (j > 0 && !grid[i][j - 1]) rim(i, j, i + 1, j, seed + 1.1);
        if (j < vs - 1 && !grid[i][j + 1]) rim(i, j + 1, i + 1, j + 1, seed + 1.9);
      }
  }

  // stem and transom, stitched shut
  const P = (sgi, i, j) => ring[sgi] + i * (vs + 1) + j;
  for (const [i, flip] of [[0, false], [xs, true]])
    for (let j = 0; j < vs; j++) {
      const a = P(0, i, j), b = P(1, i, j), c = P(1, i, j + 1), d = P(0, i, j + 1);
      if (flip) idx.push(a, b, c, a, c, d);
      else idx.push(a, c, b, a, d, c);
    }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* The deck. FLAT, with the hatch and the ladder well cut out of it. */
function deckGeo() {
  const xs = 88, zs = 24;
  const pos = [], idx = [], uv = [];
  /* The deck edge takes its x from hullPt, RAKE INCLUDED. deckHalf is the
   * half-width at a station and says nothing about where that station's
   * planking actually is: forward she rakes nearly two metres, so a deck
   * laid on the raw station x stops short of the stem and leaves a gap
   * between the deck and her side that you can see straight through.
   * Aft of the bow the rake is under 3 cm, so the collision — which is
   * still indexed on the station — stays in agreement with it. */
  for (let i = 0; i <= xs; i++)
    for (let j = 0; j <= zs; j++) {
      const x = -HALF + (i / xs) * LEN;
      const edge = hullPt(x, DECK_Y, 1);
      const rx = edge[0], b = edge[2] * 0.995;
      const z = -b + (j / zs) * b * 2;
      pos.push(rx, DECK_Y, z);
      uv.push((x + HALF) / 3.0, (z + 4) / 3.0);
    }
  for (let i = 0; i < xs; i++)
    for (let j = 0; j < zs; j++) {
      const xm = -HALF + ((i + 0.5) / xs) * LEN, bm = deckHalf(xm);
      const zm = -bm + ((j + 0.5) / zs) * bm * 2;
      const inHatch = xm > HATCH_X0 && xm < HATCH_X1 && Math.abs(zm) < HATCH_HZ;
      const inWell = xm > STAIR_X0 && xm < STAIR_X1 && zm > STAIR_Z0 && zm < STAIR_Z1;
      if (inHatch || inWell) continue;
      const a = i * (zs + 1) + j, b = (i + 1) * (zs + 1) + j;
      idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* The bulwark: one lofted strip per side following the sheer, stretches
 * torn away, and the drop-off gap left open. */
function bulwarkGeo(sg) {
  const n = 170, pos = [], idx = [], uv = [];
  const keep = [];
  for (let i = 0; i <= n; i++) {
    const x = -HALF + (i / n) * LEN;
    const b = deckHalf(x);
    const wear = BULWARK + sheerAt(x) - Math.pow(rnd(i * 0.8 + (sg > 0 ? 0 : 61)), 2) * 0.5;
    const cut = b < 0.42
      || rnd(Math.floor(i / 12) * 4.3 + (sg > 0 ? 0 : 27)) < 0.16;
    keep.push(cut ? null : { x, z: sg * (b - 0.05), y0: DECK_Y, y1: DECK_Y + wear });
  }
  for (let i = 0; i < n; i++) {
    const a = keep[i], c = keep[i + 1];
    if (!a || !c) continue;
    const base = pos.length / 3;
    for (const off of [-0.06, 0.06]) {
      pos.push(a.x, a.y0, a.z + off * sg, a.x, a.y1, a.z + off * sg,
        c.x, c.y0, c.z + off * sg, c.x, c.y1, c.z + off * sg);
      // the rail is the TOP of the topsides, so it takes the top of the map
      const ua = (a.x + HALF) / 5.2, uc = (c.x + HALF) / 5.2;
      uv.push(ua, 0.88, ua, 1.0, uc, 0.88, uc, 1.0);
    }
    for (const q of [0, 4]) { const o = base + q; idx.push(o, o + 2, o + 3, o, o + 3, o + 1); }
    idx.push(base + 1, base + 3, base + 7, base + 1, base + 7, base + 5);
  }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---- a decal that follows the planking -------------------------------
 * A flat PlaneGeometry stuck on her side only touches in one place: she
 * is curved and, forward, raked hard, so a plane facing straight out sits
 * at an angle to the timber and reads as a window let into the hull
 * rather than paint on it. This lofts the strip over hullPt so it sits ON
 * her at every station. */
function hullDecalGeo(x0, x1, y0, y1, sg, out = 0.05) {
  const nx = 22, ny = 4, pos = [], idx = [], uv = [];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++) {
      const x = x0 + (i / nx) * (x1 - x0), y = y0 + (j / ny) * (y1 - y0);
      pos.push(...hullPt(x, y, sg, out));
      uv.push(sg > 0 ? i / nx : 1 - i / nx, j / ny);
    }
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const a = i * (ny + 1) + j, b = (i + 1) * (ny + 1) + j;
      if (sg > 0) idx.push(a, b, b + 1, a, b + 1, a + 1);
      else idx.push(a, b + 1, b, a, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function bakeGroup(group) {
  const byMat = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh || child.userData.noBake) continue;
    let g = child.geometry.clone();
    child.updateMatrix(); g.applyMatrix4(child.matrix);
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

/* ---- her paint, in one map that carries the waterline ---------------
 * v runs keel = 0 to rail = 1 up the side, so the texture is painted in
 * the bands she actually weathers in: worn timber up high, iron staining
 * from every fastening, a tarred boot top, weed below it. u tiles along
 * her length, so anything near an edge is drawn again a width over or
 * the seam shows as a hard stripe. */
function hullTex(rep = [1, 1], opts = {}) {
  const w = 512, h = 512;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const wrap = (fn) => { for (const dx of [-w, 0, w]) { g.save(); g.translate(dx, 0); fn(); g.restore(); } };

  const RAIL = 0.00, TOPS = 0.14, BOOT = 0.47, WET = 0.64;
  const band = g.createLinearGradient(0, 0, 0, h);
  band.addColorStop(RAIL, '#c2bbac');         // sun-bleached along the sheer
  band.addColorStop(TOPS, '#ada396');
  band.addColorStop(BOOT - 0.02, '#8e8271');
  band.addColorStop(BOOT + 0.02, '#6d4426');  // the rust and tar belt
  band.addColorStop(WET, '#40301f');
  band.addColorStop(1, '#221a14');
  g.fillStyle = band; g.fillRect(0, 0, w, h);

  /* PLANKING. She is timber: many fine seams running her length, not the
   * eight plate joins a steel hull gets. */
  for (let i = 1; i < 30; i++) {
    const y = (i / 30) * h + Math.sin(i * 2.3) * 1.5;
    g.strokeStyle = `rgba(38,26,16,${0.30 + (i % 3) * 0.10})`;
    g.lineWidth = 1 + (i % 4 === 0 ? 1 : 0);
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.013 + i) * 1.6);
    g.stroke();
    if (i % 2 === 0) {                        // caulking gone, iron weeping
      const gr = g.createLinearGradient(0, y, 0, y + 30);
      gr.addColorStop(0, 'rgba(120,62,26,0.26)'); gr.addColorStop(1, 'rgba(120,62,26,0)');
      g.fillStyle = gr; g.fillRect(0, y, w, 30);
    }
  }
  for (let x = 6; x < w; x += 26) {           // fastenings, in frame lines
    for (let i = 1; i < 30; i += 2) {
      const y = (i / 30) * h;
      g.fillStyle = 'rgba(30,18,10,0.46)'; g.fillRect(x, y - 2, 3, 3);
      const gr = g.createLinearGradient(0, y, 0, y + 22);
      gr.addColorStop(0, 'rgba(132,66,26,0.34)'); gr.addColorStop(1, 'rgba(132,66,26,0)');
      g.fillStyle = gr; g.fillRect(x - 1, y, 5, 22);
    }
  }
  g.fillStyle = 'rgba(44,28,16,0.16)';        // frames showing through
  for (let x = 0; x < w; x += 26) g.fillRect(x, h * TOPS, 4, h * (WET - TOPS));

  for (let i = 0; i < 200; i++) {             // weathering
    const x = Math.random() * w;
    const bias = Math.random() < 0.60 ? BOOT + (Math.random() - 0.45) * 0.26 : Math.random();
    const y = bias * h, r = 7 + Math.random() * 52;
    const pick = Math.random();
    const col = pick < 0.40 ? '138,66,26' : pick < 0.72 ? '92,44,20' : '176,108,50';
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${col},${0.14 + Math.random() * 0.36})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    });
  }
  for (let i = 0; i < 130; i++) {             // long runs down the topsides
    const x = Math.random() * w, top = h * (Math.random() * 0.44);
    const len = 60 + Math.random() * 200, wd = 1 + Math.random() * 3;
    const gr = g.createLinearGradient(0, top, 0, top + len);
    gr.addColorStop(0, 'rgba(108,50,20,0.46)');
    gr.addColorStop(0.35, 'rgba(126,60,24,0.28)');
    gr.addColorStop(1, 'rgba(108,50,20,0)');
    wrap(() => { g.fillStyle = gr; g.fillRect(x, top, wd, len); });
  }
  for (let i = 0; i < 18; i++) {              // sprung and replaced planks
    const x = Math.random() * w, y = h * (0.08 + Math.random() * 0.52);
    const pw = 30 + Math.random() * 90, ph = 9 + Math.random() * 16;
    wrap(() => {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(122,54,22,0.36)' : 'rgba(96,88,74,0.34)';
      g.fillRect(x, y, pw, ph);
      g.strokeStyle = 'rgba(32,20,11,0.5)'; g.lineWidth = 1.5;
      g.strokeRect(x, y, pw, ph);
    });
  }
  for (let i = 0; i < 24; i++) {              // flakes of her old green trim
    const x = Math.random() * w, y = h * (0.02 + Math.random() * 0.28), r = 10 + Math.random() * 34;
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(58,104,90,${0.20 + Math.random() * 0.26})`);
      gr.addColorStop(1, 'rgba(58,104,90,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    });
  }
  for (let i = 0; i < 44; i++) {              // weed and scum along the bottom
    const x = Math.random() * w, y = h * (WET + Math.random() * 0.34), r = 14 + Math.random() * 46;
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(34,46,32,${0.28 + Math.random() * 0.34})`);
      gr.addColorStop(1, 'rgba(34,46,32,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    });
  }

  if (opts.flat) {                            // the deck: no waterline
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(96,84,70,0.55)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }

  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(rep[0], rep[1]);
  return t;
}

/* Her upperworks: sea-green, blistered back to bare wood — the trim every
 * one of the reference boats carries. */
function paintTex() {
  const w = 256, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#4d7a6a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 5 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const bare = Math.random() < 0.6 ? '150,132,106' : '110,78,48';
    gr.addColorStop(0, `rgba(${bare},${0.32 + Math.random() * 0.44})`);
    gr.addColorStop(1, `rgba(${bare},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 1; i < 12; i++) {
    const y = (i / 12) * h;
    g.strokeStyle = 'rgba(28,40,34,0.42)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w, top = Math.random() * h;
    const gr = g.createLinearGradient(0, top, 0, top + 40);
    gr.addColorStop(0, 'rgba(126,62,24,0.40)'); gr.addColorStop(1, 'rgba(126,62,24,0)');
    g.fillStyle = gr; g.fillRect(x, top, 1 + Math.random() * 2, 40);
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(2, 1.4);
  return t;
}

/* ---- inside her ------------------------------------------------------
 * The lining, the sole and her timbers all ran on flat colours with no
 * map, which is the whole reason the bottom of her looked wrong: below
 * decks was the one place with no texture on anything. */
function innerTex() {
  const w = 256, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#4a3524'; g.fillRect(0, 0, w, h);
  for (let i = 1; i < 20; i++) {                 // ceiling boards
    const y = (i / 20) * h;
    g.strokeStyle = 'rgba(22,15,9,0.55)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    g.fillStyle = 'rgba(96,74,50,0.20)'; g.fillRect(0, y + 1.6, w, 2);
  }
  for (let x = 8; x < w; x += 30)                // frames behind the lining
    g.fillStyle = 'rgba(28,19,11,0.34)', g.fillRect(x, 0, 7, h);
  for (let i = 0; i < 70; i++) {                 // damp coming up from below
    const x = Math.random() * w, y = h - Math.random() * h * 0.55;
    const r = 14 + Math.random() * 52;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(20,26,20,${0.24 + Math.random() * 0.34})`);
    gr.addColorStop(1, 'rgba(20,26,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 60; i++) {                 // and iron staining down it
    const x = Math.random() * w, top = Math.random() * h * 0.7;
    const gr = g.createLinearGradient(0, top, 0, top + 60);
    gr.addColorStop(0, 'rgba(96,48,18,0.34)'); gr.addColorStop(1, 'rgba(96,48,18,0)');
    g.fillStyle = gr; g.fillRect(x, top, 1 + Math.random() * 3, 60);
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(4, 1.4);
  return t;
}

/* The sole of her hold: boards worn to the grain down the middle, sand
 * blown into the seams, standing water in the dished parts, and the
 * black of sixty years of fish and weed everywhere else. */
function soleTex() {
  const w = 256, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#5c4a35'; g.fillRect(0, 0, w, h);
  for (let i = 1; i < 16; i++) {                 // boards, fore and aft
    const y = (i / 16) * h;
    g.strokeStyle = 'rgba(18,12,7,0.62)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    g.fillStyle = 'rgba(140,116,84,0.16)'; g.fillRect(0, y + 2, w, 3);
    for (let x = 10; x < w; x += 46) {           // butt joins and fastenings
      g.fillStyle = 'rgba(22,15,9,0.5)'; g.fillRect(x, y - 6, 2, 12);
      g.fillStyle = 'rgba(80,44,20,0.5)'; g.fillRect(x + 12, y - 3, 3, 3);
    }
  }
  for (let i = 0; i < 80; i++) {                 // wear, sand, and the black
    const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 40;
    const pick = Math.random();
    const col = pick < 0.36 ? '150,134,104' : pick < 0.68 ? '26,22,16' : '84,62,36';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${0.18 + Math.random() * 0.40})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 16; i++) {                 // water still lying in it
    const x = Math.random() * w, y = Math.random() * h;
    const rx = 12 + Math.random() * 40, ry = 6 + Math.random() * 18;
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, 'rgba(38,52,62,0.52)');
    gr.addColorStop(0.7, 'rgba(38,52,62,0.26)');
    gr.addColorStop(1, 'rgba(38,52,62,0)');
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(3, 3);
  return t;
}

/* Bare timber for her frames, beams, ladders and gear. */
function woodTex() {
  const w = 128, h = 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#6a5030'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 34; i++) {                 // grain
    const y = Math.random() * h;
    g.strokeStyle = `rgba(${30 + Math.random() * 40 | 0},${20 + Math.random() * 26 | 0},12,${0.20 + Math.random() * 0.32})`;
    g.lineWidth = 0.8 + Math.random() * 2;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.09 + i) * 2.4);
    g.stroke();
  }
  for (let i = 0; i < 26; i++) {                 // wear and salt bleaching
    const x = Math.random() * w, y = Math.random() * h, r = 5 + Math.random() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const col = Math.random() < 0.5 ? '148,130,100' : '36,24,14';
    gr.addColorStop(0, `rgba(${col},${0.16 + Math.random() * 0.30})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(2, 2);
  return t;
}

/* Her ironwork: pitted, scaled, dark. It was a flat colour with a strong
 * emissive and no map, which is why every rail, stringer and stay came
 * out as a pale bar laid over the timber instead of iron bolted to it. */
function metalTex() {
  const w = 128, h = 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 3 + Math.random() * 18;
    const pick = Math.random();
    const col = pick < 0.42 ? '96,50,22' : pick < 0.74 ? '30,22,16' : '120,74,36';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${0.24 + Math.random() * 0.44})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 260; i++) {          // pitting
    g.fillStyle = `rgba(22,16,11,${0.20 + Math.random() * 0.45})`;
    g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(2, 2);
  return t;
}

/* The wet beach showing through where her sole is stove in. */
function wetTex() {
  const w = 128, h = 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#3c4152'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 22;
    const pick = Math.random();
    const col = pick < 0.4 ? '26,30,40' : pick < 0.75 ? '74,80,96' : '46,56,50';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${0.22 + Math.random() * 0.40})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 220; i++) {                // shell grit
    g.fillStyle = `rgba(170,176,186,${0.16 + Math.random() * 0.4})`;
    g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + Math.random() * 2, 1);
  }
  const img = g.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1; t.repeat.set(4, 4);
  return t;
}

function nameTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#3a322a'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#d6cbb2'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center';
  g.fillText('LIMULUS', 128, 34);
  g.font = '17px Georgia, serif'; g.fillText('DELAWARE BAY', 128, 55);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(${140 + Math.random() * 70 | 0},${58 + Math.random() * 44 | 0},22,${Math.random() * 0.58})`;
    g.fillRect(Math.random() * 256 | 0, Math.random() * 64 | 0, 3, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}
/* Her registration, on the bow — the numbers every one of the reference
 * boats carries up forward. */
function regTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1c2226'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center';
  g.fillText('DE 2916', 128, 46);
  for (let i = 0; i < 1100; i++) g.clearRect(Math.random() * 256 | 0, Math.random() * 64 | 0, 3, 2);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}

/* Her name, big, for the side you walk up from. Transparent ground: this
 * is paint eaten off timber, so what is left is only the letters. */
function nameBigTex() {
  const w = 1024, h = 160;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = 'bold 116px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#e4dccb'; g.fillText('LIMULUS', w / 2, h / 2 - 6);
  g.lineWidth = 3; g.strokeStyle = '#2b2118'; g.strokeText('LIMULUS', w / 2, h / 2 - 6);
  g.font = '40px Georgia, serif'; g.fillStyle = '#cfc4ae';
  g.fillText('DELAWARE BAY', w / 2, h / 2 + 58);
  // sixty years of it coming off
  for (let i = 0; i < 5200; i++)
    g.clearRect(Math.random() * w | 0, Math.random() * h | 0, 2 + Math.random() * 5, 2 + Math.random() * 4);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 12 + Math.random() * 48;
    g.save(); g.globalCompositeOperation = 'destination-out';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}

export function makeShipwreck(opts = {}) {
  const S = new THREE.Group();
  S.name = 'shipwreck';

  /* EVERY material used below is defined here. An undefined material makes
   * three fall back to flat white, which is how the wheelhouse once turned
   * into a white box bolted to a wrecked boat.
   *
   * EMISSIVE CARRIES HER AT NIGHT, and the INTERIOR needs roughly twice
   * what her topsides do: outside she at least catches the moon, but the
   * hold has no light reaching it at all, so anything lit for the open
   * beach is a black hole once you are inside her.
   *
   * The beach is lit by a low moon and
   * almost nothing else, so unlit timber is a black shape and every mark
   * on these maps might as well not exist. emissiveMap ties the lift to
   * the paint instead of washing the whole surface flat — which is what
   * happened when this was a plain emissive colour turned up. */
  const M = {
    hull: new THREE.MeshStandardMaterial({ map: hullTex([1, 1]), color: 0xbdb6ab, roughness: 0.94, metalness: 0.06, emissive: 0x8d8478, emissiveIntensity: 0.20, emissiveMap: hullTex([1, 1]), side: THREE.DoubleSide }),
    deck: new THREE.MeshStandardMaterial({ map: hullTex([1, 1], { flat: true }), color: 0xa89e92, roughness: 0.97, metalness: 0.05, emissive: 0x7d7468, emissiveIntensity: 0.17, emissiveMap: hullTex([1, 1], { flat: true }), side: THREE.DoubleSide }),
    plank: new THREE.MeshStandardMaterial({ map: hullTex([2, 1.4]), color: 0x9a9184, roughness: 0.95, metalness: 0.05, emissive: 0x6c6459, emissiveIntensity: 0.17, emissiveMap: hullTex([2, 1.4]), side: THREE.DoubleSide, flatShading: true }),
    paint: new THREE.MeshStandardMaterial({ map: paintTex(), color: 0xa8b0a6, roughness: 0.93, metalness: 0.06, emissive: 0x5c6b60, emissiveIntensity: 0.22, emissiveMap: paintTex(), side: THREE.DoubleSide, flatShading: true }),
    inner: new THREE.MeshStandardMaterial({ map: innerTex(), color: 0xa89684, roughness: 1, metalness: 0.04, emissive: 0x6e5c44, emissiveIntensity: 0.55, emissiveMap: innerTex(), side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ map: metalTex(), color: 0x8c8078, roughness: 0.86, metalness: 0.30, emissive: 0x3a2e22, emissiveIntensity: 0.34, emissiveMap: metalTex(), flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ map: innerTex(), color: 0x5c5248, roughness: 1, metalness: 0, emissive: 0x332c22, emissiveIntensity: 0.44, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex(), color: 0x8a7a62, roughness: 1, metalness: 0, emissive: 0x4c412e, emissiveIntensity: 0.34, emissiveMap: woodTex(), flatShading: true }),
    rope: new THREE.MeshStandardMaterial({ map: woodTex(), color: 0x6e6449, roughness: 1, metalness: 0, emissive: 0x2e2a1e, emissiveIntensity: 0.30, flatShading: true }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x22201e, roughness: 1, metalness: 0, emissive: 0x0c0b0a, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8c7238, roughness: 0.55, metalness: 0.62, emissive: 0x2a2010, flatShading: true }),
    // kept polished where a hand has been on it for forty years
    gold: new THREE.MeshStandardMaterial({ color: 0xd9ab46, roughness: 0.34, metalness: 0.78, emissive: 0x6a4f16, emissiveIntensity: 0.65, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0x2c363e, roughness: 0.26, metalness: 0.22, emissive: 0x0a1014, transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
    flesh: new THREE.MeshStandardMaterial({ color: 0x6e6152, roughness: 1, metalness: 0, emissive: 0x1a150f, flatShading: true }),
    gore: new THREE.MeshStandardMaterial({ color: 0x4a1c18, roughness: 0.75, metalness: 0, emissive: 0x1a0808, flatShading: true }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a221a, roughness: 1, metalness: 0, emissive: 0x0a0806, flatShading: true }),
    // he is held close in the end, so his materials have to separate
    bone: new THREE.MeshStandardMaterial({ color: 0x9a927e, roughness: 0.86, metalness: 0, emissive: 0x26241c, flatShading: true }),
    tooth: new THREE.MeshStandardMaterial({ color: 0xa8a08a, roughness: 0.62, metalness: 0, emissive: 0x2a2820, flatShading: true }),
    eye: new THREE.MeshStandardMaterial({ color: 0x4c4a42, roughness: 0.42, metalness: 0, emissive: 0x14140f }),
    bruise: new THREE.MeshStandardMaterial({ color: 0x3e2c34, roughness: 1, metalness: 0, emissive: 0x120c10, flatShading: true }),
    sole: new THREE.MeshStandardMaterial({ map: soleTex(), color: 0xa2968a, roughness: 1, metalness: 0, emissive: 0x6e6050, emissiveIntensity: 0.54, emissiveMap: soleTex(), side: THREE.DoubleSide }),
    name: new THREE.MeshStandardMaterial({ map: nameTex(), roughness: 1, emissive: 0x241c16, side: THREE.DoubleSide }),
    reg: new THREE.MeshStandardMaterial({ map: regTex(), roughness: 1, emissive: 0x121416, transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    nameBig: new THREE.MeshStandardMaterial({ map: nameBigTex(), roughness: 1, color: 0xcfc8bb, emissive: 0x6a6255, emissiveIntensity: 0.30, emissiveMap: nameBigTex(), transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    sand: opts.sandMat || new THREE.MeshStandardMaterial({ color: 0x6d7d99, roughness: 0.95, emissive: 0x27324a, flatShading: true }),
    /* What shows through the stove-in sole. NOT the beach material: that
     * one is lit for open moonlight and inside a dark hold it reads as a
     * pool of glowing blue rather than the wet sand she is aground on. */
    wetsand: new THREE.MeshStandardMaterial({ map: wetTex(), color: 0x6e7382, roughness: 1, metalness: 0, emissive: 0x3a4252, emissiveIntensity: 0.46, emissiveMap: wetTex(), flatShading: true }),
  };

  /* Solid gear: local [x0, z0, x1, z1, yLo, yHi] boxes.
   *
   * The height band is load-bearing. Without it these were flat 2D
   * footprints, so a bunk down in the hold and a barrel on the deck above
   * it read as the same obstruction, and — worse — main.js only applied
   * them in its on-deck branch, which meant none of the furniture below
   * decks was solid at all. */
  const PROPS = [];
  const solid = (x, z, w, d, lo = DECK_Y - 0.4, hi = DECK_Y + 2.2) =>
    PROPS.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, lo, hi]);
  const solidLow = (x, z, w, d) => solid(x, z, w, d, HOLD_Y - 0.4, HOLD_Y + 2.4);

  // ---- shell ---------------------------------------------------------
  const HULL = new THREE.Group(); S.add(HULL);
  for (const [geo, mat] of [[hullGeo(), M.hull], [deckGeo(), M.deck]]) {
    const m = new THREE.Mesh(geo, mat); m.userData.noBake = true; HULL.add(m);
  }
  for (const sg of [1, -1]) {
    const bg = bulwarkGeo(sg);
    if (bg) { const m = new THREE.Mesh(bg, M.plank); m.userData.noBake = true; HULL.add(m); }
  }
  /* Capping rail along the top of the bulwark. Placed with hullPt, not
   * raw deckHalf: deckHalf is the half-width at a STATION and takes no
   * account of rake, and forward she rakes nearly two metres, so a rail
   * pinned to the station z hangs outboard of planking that has already
   * moved forward — walls standing off her side at the bow. Invariant 6
   * applies to the rail as much as to anything else. */
  for (const sg of [1, -1])
    for (let i = 0; i < 84; i++) {
      const x = -HALF + (i / 84) * LEN, b = deckHalf(x);
      if (b < 0.55) continue;
      if (rnd(Math.floor(i / 6) * 4.3 + (sg > 0 ? 0 : 27)) < 0.16) continue;
      const y = DECK_Y + BULWARK + sheerAt(x) - 0.16;
      const p = hullPt(x, y, sg, -0.05);
      HULL.add(slab(LEN / 84 + 0.04, 0.07, 0.22, M.plank, p[0], p[1], p[2]));
    }

  /* ---- the hold ------------------------------------------------------
   * Lining LOFTED off halfAtY (6) and CUT at the breach (7). */
  {
    const holdSide = (sg) => {
      const n = 48, rows = 10, pos = [], idx = [], uv = [];
      const yAt = (j) => (HOLD_Y - 0.1) + (j / rows) * (DECK_Y + 0.35 - HOLD_Y);
      for (let i = 0; i <= n; i++) {
        const x = HOLD_X0 + (i / n) * (HOLD_X1 - HOLD_X0);
        for (let j = 0; j <= rows; j++) {
          const y = yAt(j);
          pos.push(x, y, sg * Math.min(HOLD_HZ, halfAtY(x, y) - 0.10));
          uv.push((x - HOLD_X0) / (HOLD_X1 - HOLD_X0), j / rows);   // or the map never shows
        }
      }
      for (let i = 0; i < n; i++)
        for (let j = 0; j < rows; j++) {
          const xm = HOLD_X0 + ((i + 0.5) / n) * (HOLD_X1 - HOLD_X0);
          const ym = (yAt(j) + yAt(j + 1)) / 2;
          if (sg > 0 && breached(xm, ym)) continue;
          if (sg < 0 && doorCut(xm, ym)) continue;
          const o = i * (rows + 1) + j, q = (i + 1) * (rows + 1) + j;
          if (sg > 0) idx.push(o, q, q + 1, o, q + 1, o + 1);
          else idx.push(o, q + 1, q, o, o + 1, q + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      return new THREE.Mesh(g, M.inner);
    };
    for (const sg of [1, -1]) { const m = holdSide(sg); m.userData.noBake = true; HULL.add(m); }

    /* ---- her ceiling boards, stove in ---------------------------------
     * This was one flat plane and read as a brown floor painted in. She
     * came ashore hard: the sole is dished and buckled, torn through in
     * places, and what you see through the holes is the beach she is
     * sitting on. It only ever dips BELOW HOLD_Y, never above, so the
     * flat collision floor stays the high point and you never clip it. */
    {
      const nx = 76, nz = 20;
      const zAt = (x, t) => {
        const hz = Math.min(HOLD_HZ + 0.2, halfAtY(x, HOLD_Y) - 0.02);
        return -hz + t * hz * 2;
      };
      // how far the sole is stove in at a point, and where it is gone
      const dip = (x, z) => 0.05 + 0.035 * Math.sin(x * 0.9 + 1.3) * Math.cos(z * 1.1)
        + 0.028 * Math.sin(x * 2.3 - z * 1.7) + 0.02 * Math.sin(z * 3.1 + x * 0.4);
      const GOUGE = [
        { x: -6.2, z: 0.7, rx: 1.5, rz: 1.0 },
        { x: -1.9, z: -1.5, rx: 1.2, rz: 0.9 },
        { x: 1.4, z: 0.9, rx: 1.0, rz: 0.8 },
        { x: -4.0, z: -2.2, rx: 0.9, rz: 0.7 },
      ];
      const torn = (x, z) => {
        for (const h of GOUGE) {
          const dx = (x - h.x) / h.rx, dz = (z - h.z) / h.rz;
          const a = Math.atan2(dz, dx);
          const wob = 1 + 0.26 * Math.sin(a * 3 + h.x) + 0.17 * Math.sin(a * 5 - h.z * 4);
          if (dx * dx + dz * dz < wob * wob) return true;
        }
        return false;
      };
      const build = (yOff, mat, cut, noBake) => {
        const pos = [], idx = [], uv = [];
        for (let i = 0; i <= nx; i++)
          for (let j = 0; j <= nz; j++) {
            const x = HOLD_X0 - 0.4 + (i / nx) * (HOLD_X1 - HOLD_X0 + 0.8);
            const z = zAt(x, j / nz);
            pos.push(x, HOLD_Y - yOff - dip(x, z), z);
            uv.push((x + HALF) / 2.2, (z + 5) / 2.2);
          }
        for (let i = 0; i < nx; i++)
          for (let j = 0; j < nz; j++) {
            const xm = HOLD_X0 - 0.4 + ((i + 0.5) / nx) * (HOLD_X1 - HOLD_X0 + 0.8);
            const zm = zAt(xm, (j + 0.5) / nz);
            if (cut && torn(xm, zm)) continue;
            const a = i * (nz + 1) + j, b = (i + 1) * (nz + 1) + j;
            idx.push(a, b, b + 1, a, b + 1, a + 1);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat); m.userData.noBake = noBake; HULL.add(m);
      };
      build(0, M.sole, true, true);          // the boards, torn through
      /* 0.18, not 0.62. The beach is a flat plane at y = 0 and the hold
       * sole is at 0.25, so anything I put lower than that is BEHIND the
       * beach and you look through the gouges at the open-moonlight sand
       * instead — which is why the holes read as bright blue pools. This
       * layer has to sit above y = 0 to be the thing you see. */
      build(0.18, M.wetsand, false, true);   // the beach she is aground on

      // broken board ends and frame stubs round each gouge
      for (const h of GOUGE) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * TAU;
          const wob = 1 + 0.26 * Math.sin(a * 3 + h.x) + 0.17 * Math.sin(a * 5 - h.z * 4);
          const x = h.x + Math.cos(a) * h.rx * wob, z = h.z + Math.sin(a) * h.rz * wob;
          if (Math.abs(z) > halfAtY(x, HOLD_Y) - 0.25) continue;
          HULL.add(slab(0.30 + rnd(k * 2.1) * 0.24, 0.05, 0.16, M.sole,
            x, HOLD_Y - 0.10 - rnd(k * 3.3) * 0.10, z,
            (rnd(k * 1.7) - 0.5) * 0.7, a, (rnd(k * 4.9) - 0.5) * 0.6));
        }
        HULL.add(slab(0.12, 0.30, 0.12, M.wood, h.x + h.rx * 0.4, HOLD_Y - 0.10, h.z,
          0, 0, (rnd(h.x) - 0.5) * 0.5));
      }
      // and what has washed into them
      for (let k = 0; k < 14; k++) {
        const h = GOUGE[k % GOUGE.length];
        const x = h.x + (rnd(k * 5.3) - 0.5) * h.rx * 1.4;
        const z = h.z + (rnd(k * 7.1) - 0.5) * h.rz * 1.4;
        const w = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), M.wetsand);
        w.scale.set(1.1 + rnd(k) * 0.9, 0.35, 0.9 + rnd(k * 2.2) * 0.7);
        w.position.set(x, HOLD_Y - 0.12, z);
        w.rotation.y = rnd(k * 3.7) * 3.1;
        HULL.add(w);
      }
    }

    for (const x of [HOLD_X1 + 0.1, HOLD_X0 - 0.1]) {         // bulkheads
      const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y) - 0.10);
      HULL.add(slab(0.18, DECK_Y - HOLD_Y + 0.5, hz * 2, M.inner, x, (HOLD_Y + DECK_Y) / 2, 0));
    }
    /* Frames and deck beams, each cut to the planking at its own station,
     * and NONE standing across the opening you walk in through — fifteen
     * of these once read as bars over the breach. */
    for (let i = 0; i < 17; i++) {
      const x = HOLD_X0 + 0.6 + i * ((HOLD_X1 - HOLD_X0 - 1.2) / 16);
      for (const sg of [-1, 1]) {
        if (sg > 0 && x > BREACH_X0 - 0.35 && x < BREACH_X1 + 0.35) continue;
        const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y) - 0.10) - 0.10;
        HULL.add(slab(0.13, DECK_Y - HOLD_Y, 0.13, M.wood, x, (HOLD_Y + DECK_Y) / 2, sg * hz));
      }
      if (i % 2 === 0) {
        const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y) - 0.10);
        HULL.add(slab(0.12, 0.14, hz * 2, M.wood, x, DECK_Y - 0.22, 0));
      }
    }
    for (let i = 0; i < 16; i++) {          // sand drifted in
      const x = HOLD_X0 + 0.8 + rnd(i * 7.3) * (HOLD_X1 - HOLD_X0 - 1.6);
      /* Clamped so the drift's OWN half-extent stays inside her. The
       * placement used to be (rnd - 0.5) * room * 1.4, which put the
       * centre beyond `room`, and then the body reached out from there —
       * sand coming through her planking from the inside. */
      const wall = Math.min(HOLD_HZ, halfAtY(x, HOLD_Y + 0.2)) - 0.15;
      const sz = Math.min(1.1, Math.max(0.3, wall - 0.4));
      const room = wall - sz * 0.5;
      if (room < 0.15) continue;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), M.wetsand);
      m.scale.set(1.2 + rnd(i * 3.1) * 1.4, 0.18 + rnd(i * 5.2) * 0.16, sz);
      m.position.set(x, HOLD_Y + 0.03, (rnd(i * 4.4) - 0.5) * 2 * room);
      m.rotation.y = rnd(i) * 3.1;
      HULL.add(m);
    }
  }

  /* ---- her ends, closed in --------------------------------------------
   * The hold only runs -8.0 to 3.0. Everywhere else her inside was open
   * space, and the beach is a flat plane at y = 0 that passes straight
   * through her — so through any rot hole forward or aft you were looking
   * at sand cutting across the inside of the hull. That is the ground
   * coming through the floor at the back. Both ends get a lofted sole and
   * lining, high enough that the sand plane is always behind them. */
  for (const [x0, x1] of [[-HALF + 0.4, HOLD_X0 + 0.1], [HOLD_X1 - 0.1, HALF - 0.4]]) {
    const n = 26, SOLE = 0.85;
    { // the sole
      const pos = [], idx = [], uv = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + (i / n) * (x1 - x0);
        const hz = Math.max(0.05, halfAtY(x, SOLE) - 0.06);
        pos.push(x, SOLE, -hz, x, SOLE, hz);
        uv.push((x + HALF) / 2.2, 0, (x + HALF) / 2.2, 1);
      }
      for (let i = 0; i < n; i++) { const o = i * 2; idx.push(o, o + 2, o + 3, o, o + 3, o + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.dark); m.userData.noBake = true; HULL.add(m);
    }
    for (const sg of [1, -1]) {   // and the lining above it
      const rows = 6, pos = [], idx = [], uv = [];
      const yAt = (j) => SOLE + (j / rows) * (DECK_Y + 0.3 - SOLE);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (i / n) * (x1 - x0);
        for (let j = 0; j <= rows; j++) {
          const y = yAt(j);
          pos.push(x, y, sg * Math.max(0.05, halfAtY(x, y) - 0.08));
          uv.push((x + HALF) / 4.0, j / rows);
        }
      }
      for (let i = 0; i < n; i++)
        for (let j = 0; j < rows; j++) {
          const o = i * (rows + 1) + j, q = (i + 1) * (rows + 1) + j;
          if (sg > 0) idx.push(o, q, q + 1, o, q + 1, o + 1);
          else idx.push(o, q + 1, q, o, o + 1, q + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.inner); m.userData.noBake = true; HULL.add(m);
    }
  }

  /* ---- her crew space, right aft in the hold -------------------------
   * Four bunks, a stove, a mess table and their lockers, under the
   * wheelhouse. Everything here is placed off halfAtY at its own station
   * so it sits against her side rather than through it, and everything
   * you can walk into is in PROPS. */
  {
    const CX0 = 3.4, CX1 = 6.9;
    const wall = (x) => Math.min(HOLD_HZ, halfAtY(x, HOLD_Y + 0.9)) - 0.10;
    // a bulkhead with a doorway through it, four pieces round the hole
    {
      const bx = CX0 - 0.35, hz = Math.min(HOLD_HZ, halfAtY(bx, DECK_Y) - 0.10);
      const dz0 = -0.55, dz1 = 0.55, dh = 1.95;
      for (const [z0, z1] of [[-hz, dz0], [dz1, hz]])
        HULL.add(slab(0.10, DECK_Y - HOLD_Y, z1 - z0, M.plank, bx, (HOLD_Y + DECK_Y) / 2, (z0 + z1) / 2));
      HULL.add(slab(0.10, DECK_Y - HOLD_Y - dh, dz1 - dz0, M.plank, bx,
        HOLD_Y + dh + (DECK_Y - HOLD_Y - dh) / 2, (dz0 + dz1) / 2));
      for (const d of [-1, 1])                       // jambs and head
        HULL.add(slab(0.14, dh, 0.12, M.wood, bx, HOLD_Y + dh / 2, d * dz1));
      HULL.add(slab(0.14, 0.12, dz1 - dz0 + 0.24, M.wood, bx, HOLD_Y + dh, 0));
      HULL.add(slab(0.14, 0.06, dz1 - dz0, M.wood, bx, HOLD_Y + 0.03, 0));   // step over
    }

    for (const sg of [-1, 1]) {                      // bunks, two high
      const wz = wall(4.9);
      for (let t = 0; t < 2; t++) {
        const y = HOLD_Y + 0.42 + t * 0.86;
        HULL.add(slab(2.0, 0.07, 0.78, M.wood, 4.7, y, sg * (wz - 0.42)));      // bottom board
        HULL.add(slab(2.0, 0.16, 0.10, M.wood, 4.7, y + 0.10, sg * (wz - 0.80))); // lee board
        HULL.add(slab(1.85, 0.13, 0.66, M.plank, 4.7, y + 0.10, sg * (wz - 0.44))); // mattress
        for (const dx of [-0.98, 0.98])              // stanchions
          HULL.add(slab(0.09, 0.86, 0.09, M.wood, 4.7 + dx, y + 0.43, sg * (wz - 0.42)));
      }
      HULL.add(slab(2.0, 0.05, 0.80, M.wood, 4.7, HOLD_Y + 2.16, sg * (wz - 0.42)));
      // a blanket shoved down the end of the lower one
      const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), M.rope);
      bl.scale.set(1.5, 0.5, 1.1);
      bl.position.set(4.7 + (sg > 0 ? 0.7 : -0.7), HOLD_Y + 0.58, sg * (wz - 0.44));
      HULL.add(bl);
      solidLow(4.7, sg * (wz - 0.42), 2.1, 0.9);
    }

    // the stove, right aft on the centreline, and its pipe
    HULL.add(slab(0.62, 0.72, 0.56, M.steel, CX1 - 0.45, HOLD_Y + 0.36, 0));
    HULL.add(slab(0.70, 0.07, 0.64, M.steel, CX1 - 0.45, HOLD_Y + 0.74, 0));
    HULL.add(cyl(0.09, 0.09, 1.9, 7, M.steel, CX1 - 0.45, HOLD_Y + 1.72, 0));
    HULL.add(slab(0.26, 0.22, 0.03, M.dark, CX1 - 0.76, HOLD_Y + 0.36, 0));   // its door
    HULL.add(cyl(0.13, 0.11, 0.16, 8, M.steel, CX1 - 0.45, HOLD_Y + 0.86, 0.16));  // kettle
    solidLow(CX1 - 0.45, 0, 0.75, 0.7);

    // mess table and two stools
    HULL.add(slab(1.25, 0.07, 0.66, M.wood, 3.95, HOLD_Y + 0.74, 0));
    for (const dx of [-0.52, 0.52]) for (const dz of [-0.24, 0.24])
      HULL.add(slab(0.08, 0.74, 0.08, M.wood, 3.95 + dx, HOLD_Y + 0.37, dz));
    for (const dz of [-0.62, 0.62]) {
      HULL.add(cyl(0.17, 0.15, 0.06, 8, M.wood, 3.95, HOLD_Y + 0.45, dz));
      HULL.add(cyl(0.05, 0.05, 0.45, 6, M.wood, 3.95, HOLD_Y + 0.22, dz));
    }
    solidLow(3.95, 0, 1.4, 0.8);
    // an enamel mug and a lamp left on it
    HULL.add(cyl(0.055, 0.05, 0.09, 8, M.plank, 3.7, HOLD_Y + 0.82, 0.12));
    HULL.add(slab(0.12, 0.20, 0.12, M.glass, 4.3, HOLD_Y + 0.87, -0.10));
    HULL.add(cyl(0.08, 0.09, 0.06, 7, M.steel, 4.3, HOLD_Y + 0.79, -0.10));

    // lockers under the lower bunks, and oilskins on a hook
    for (const sg of [-1, 1]) {
      const wz = wall(6.5);
      HULL.add(slab(0.9, 0.52, 0.46, M.wood, 6.5, HOLD_Y + 0.26, sg * (wz - 0.30)));
      for (let i = 0; i < 2; i++)
        HULL.add(slab(0.03, 0.30, 0.05, M.brass, 6.06, HOLD_Y + 0.26, sg * (wz - 0.30) + (i ? 0.14 : -0.14)));
      solidLow(6.5, sg * (wz - 0.30), 1.0, 0.55);
    }
    {
      const wz = wall(3.8);
      HULL.add(slab(0.05, 0.06, 0.05, M.steel, 3.8, HOLD_Y + 1.72, -(wz - 0.12)));
      const coat = new THREE.Mesh(new THREE.IcosahedronGeometry(0.30, 0), M.paint);
      coat.scale.set(0.55, 1.5, 0.5);
      coat.position.set(3.8, HOLD_Y + 1.24, -(wz - 0.18));
      HULL.add(coat);
    }
  }

  // ---- torn planking along the ACTUAL edge of the breach --------------
  for (let i = 0; i <= 30; i++) {
    const x = BREACH_X0 + (i / 30) * (BREACH_X1 - BREACH_X0);
    const top = breachTopAt(x);
    if (top === null) continue;
    const p = hullPt(x, top, 1, -0.04);
    HULL.add(slab(0.30, 0.13 + rnd(i * 2.2) * 0.24, 0.18, M.wood, p[0], p[1], p[2],
      0, 0, (rnd(i * 3.3) - 0.5) * 0.7));
    if (i % 3 === 0) {                       // a plank sprung, but only just
      /* These used to stand half a metre off her with a full radian of
       * random tilt, which from the beach is a row of boards sticking out
       * of her side rather than a torn edge. */
      const q = hullPt(x, top + 0.10, 1, 0.04);
      HULL.add(slab(0.18, 0.20 + rnd(i * 5.1) * 0.18, 0.05, M.plank, q[0], q[1], q[2],
        (rnd(i * 1.9) - 0.5) * 0.5, 0, (rnd(i * 4.7) - 0.5) * 0.45));
    }
    /* NO broken frame ends here either. They were 1.4 m wooden posts set
     * on a curving surface at the mouth of the breach, and from outside
     * they stood off her as pillars. The tear reads from its own torn
     * edge and the lip the hull geometry grows; it does not need poles. */
  }

  /* ---- the shell door in her -Z side ---------------------------------
   * FOUR pieces round the opening and no full-width slab as well — that
   * is invariant 8, and it is what made the wheelhouse read as having no
   * door at all while every movement test passed. The leaf hangs on its
   * own pivot group so main.js can swing it. */
  const holdDoor = new THREE.Group();
  {
    const y0 = HOLD_Y, y1 = HOLD_Y + DOOR_H;
    const zAt = (y) => -Math.min(HOLD_HZ, halfAtY(DOOR_X, y) - 0.10);
    const zm = zAt((y0 + y1) / 2);
    // jambs, head, sill
    for (const d of [-1, 1])
      HULL.add(slab(0.13, DOOR_H + 0.16, 0.30, M.steel,
        DOOR_X + d * (DOOR_W / 2 + 0.06), (y0 + y1) / 2, zm));
    HULL.add(slab(DOOR_W + 0.38, 0.14, 0.30, M.steel, DOOR_X, y1 + 0.07, zm));
    HULL.add(slab(DOOR_W + 0.38, 0.12, 0.34, M.steel, DOOR_X, y0 - 0.04, zm));  // sill
    // a lintel plate above it, riveted
    HULL.add(slab(DOOR_W + 0.6, 0.24, 0.10, M.plank, DOOR_X, y1 + 0.24, zm + 0.06));
    for (let i = 0; i < 7; i++)
      HULL.add(slab(0.05, 0.05, 0.05, M.steel, DOOR_X - 0.5 + i * 0.17, y1 + 0.24, zm + 0.02));

    /* The leaf. Its pivot sits on the after jamb so it swings out onto the
     * beach; the leaf itself is offset half its width from that pivot,
     * which is the whole trick to a hinged door in a scene graph. */
    holdDoor.position.set(DOOR_X + DOOR_W / 2, (y0 + y1) / 2, zm - 0.02);
    HULL.add(holdDoor);
    const L = new THREE.Group();
    L.position.set(-DOOR_W / 2, 0, 0);
    holdDoor.add(L);
    L.add(slab(DOOR_W - 0.04, DOOR_H - 0.06, 0.09, M.steel, 0, 0, 0));
    for (const dy of [-0.6, 0, 0.6])                 // stiffeners
      L.add(slab(DOOR_W - 0.12, 0.09, 0.13, M.plank, 0, dy, 0.02));
    for (const dy of [-0.72, 0.72])                  // dogs
      L.add(slab(0.30, 0.08, 0.16, M.steel, -DOOR_W / 2 + 0.30, dy, -0.10));
    L.add(cyl(0.045, 0.045, 0.34, 6, M.brass, -DOOR_W / 2 + 0.26, 0, -0.14, Math.PI / 2));
    L.add(new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.028, 4, 10), M.brass)
      .translateX(-DOOR_W / 2 + 0.26).translateZ(-0.20));
    // the lock, with a keyhole you can see
    L.add(slab(0.22, 0.30, 0.06, M.brass, -DOOR_W / 2 + 0.26, -0.30, -0.09));
    L.add(slab(0.05, 0.09, 0.04, M.dark, -DOOR_W / 2 + 0.26, -0.30, -0.13));
    holdDoor.userData.noBake = true;
  }

  // ---- coaming round the hatch ---------------------------------------
  {
    const cx = (HATCH_X0 + HATCH_X1) / 2, w = HATCH_X1 - HATCH_X0;
    for (const sg of [-1, 1])
      HULL.add(slab(w + 0.24, COAMING, 0.12, M.plank, cx, DECK_Y + COAMING / 2, sg * HATCH_HZ));
    for (const sg of [-1, 1])
      HULL.add(slab(0.12, COAMING, HATCH_HZ * 2, M.plank,
        sg > 0 ? HATCH_X1 + 0.06 : HATCH_X0 - 0.06, DECK_Y + COAMING / 2, 0));
    for (const sg of [-1, 1])
      HULL.add(slab(w + 0.28, 0.07, 0.20, M.wood, cx, DECK_Y + COAMING, sg * HATCH_HZ));
    for (let i = 0; i < 4; i++)              // her hatch boards, stacked off
      HULL.add(slab(1.5, 0.06, 0.42, M.wood, HATCH_X0 + 1.0, DECK_Y + 0.04 + i * 0.065,
        -HATCH_HZ - 0.52 - rnd(i) * 0.06, 0, rnd(i * 3.3) * 0.10, 0));
    solid(HATCH_X0 + 1.0, -HATCH_HZ - 0.62, 1.6, 0.5);
  }

  /* ---- the companion ladder ------------------------------------------
   * Steep and short. NO rail across the head of it: a bar straight over a
   * ladder well reads as something barring your way up. */
  {
    const n = 11, zc = (STAIR_Z0 + STAIR_Z1) / 2, wz = STAIR_Z1 - STAIR_Z0;
    const run = STAIR_X1 - STAIR_X0;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = STAIR_X0 + t * run, y = HOLD_Y + t * (DECK_Y - HOLD_Y);
      HULL.add(slab(run / n * 0.92, 0.08, wz - 0.16, M.wood, x, y, zc));
      HULL.add(slab(0.05, (DECK_Y - HOLD_Y) / n, wz - 0.16, M.plank,
        x - run / n * 0.46, y - (DECK_Y - HOLD_Y) / n / 2, zc));
    }
    for (const sg of [-1, 1]) {
      const z = zc + sg * (wz / 2 - 0.06);
      HULL.add(strut([STAIR_X0, HOLD_Y - 0.10, z], [STAIR_X1, DECK_Y - 0.10, z], 0.055, M.wood));
      HULL.add(strut([STAIR_X0, HOLD_Y + 0.92, z], [STAIR_X1, DECK_Y + 0.92, z], 0.035, M.steel, 4));
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        HULL.add(slab(0.05, 1.02, 0.05, M.steel,
          STAIR_X0 + t * run, HOLD_Y + t * (DECK_Y - HOLD_Y) + 0.51, z));
      }
      HULL.add(slab(0.05, 0.95, 0.05, M.steel, STAIR_X1 - 0.10, DECK_Y + 0.47, z));
    }
    /* A low lip round the well: you have to walk INTO this one, so it is
     * not in the collision, and anything taller is a kerb you pass
     * visibly through. */
    for (const sg of [-1, 1])
      HULL.add(slab(run + 0.2, 0.12, 0.10, M.plank, STAIR_X0 + run / 2, DECK_Y + 0.06, zc + sg * wz / 2));
    HULL.add(slab(0.10, 0.12, wz, M.plank, STAIR_X0 - 0.05, DECK_Y + 0.06, zc));
  }

  /* (No ladder on her far side any more: with the shell door as the way
   * through, a ladder up a side you cannot get down to is furniture
   * pretending to be a route, and it read as one.) */

  /* ---- the bow -------------------------------------------------------
   * The breasthook is LOFTED, following deckHalf. It used to be nine
   * boxes stepping across a curve that narrows from 1.0 m to 0.2 m in
   * three metres: the steps read as a pixelated join where the deck meets
   * the stem, and the wide ones stood proud of her sides — the walls
   * sticking out. Every fitting up here takes its z from deckHalf at its
   * OWN station for the same reason. */
  {
    {
      const n = 26, pos = [], idx = [], uv = [];
      for (let i = 0; i <= n; i++) {
        const x = -HALF + 0.06 + (i / n) * 3.4;
        const e = hullPt(x, DECK_Y, 1);
        const b2 = e[2] - 0.04;
        pos.push(e[0], DECK_Y + 0.055, -b2, e[0], DECK_Y + 0.055, b2);
        uv.push((x + HALF) / 3, 0, (x + HALF) / 3, 1);
      }
      for (let i = 0; i < n; i++) { const o = i * 2; idx.push(o, o + 2, o + 3, o, o + 3, o + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.deck); m.userData.noBake = true; HULL.add(m);
    }
    // the king plank down her centreline, forward
    HULL.add(slab(3.4, 0.05, 0.22, M.wood, -HALF + 1.76, DECK_Y + 0.10, 0));
    HULL.add(slab(0.24, 1.5, 0.30, M.wood, -HALF + 0.10, DECK_Y + 0.55, 0, 0, 0, -0.14));
    HULL.add(slab(0.30, 0.16, 0.42, M.steel, -HALF + 0.22, DECK_Y + 1.28, 0));   // bow roller
    for (const sg of [-1, 1]) {                   // pulpit rail, on hullPt
      const pts = [];
      for (let i = 0; i <= 5; i++) {
        const x = -HALF + 0.5 + i * 0.66;
        const y = DECK_Y + 0.92 + sheerAt(x) * 0.5;
        pts.push(hullPt(x, y, sg, -0.14));
      }
      for (let i = 0; i < pts.length - 1; i++) HULL.add(strut(pts[i], pts[i + 1], 0.035, M.steel, 4));
      for (let i = 0; i < pts.length; i += 2)
        HULL.add(slab(0.05, pts[i][1] - DECK_Y, 0.05, M.steel,
          pts[i][0], (DECK_Y + pts[i][1]) / 2, pts[i][2]));
    }
    /* Her ground tackle, pushed right over against the rail and NOT given
     * a collision box. It sat across the middle of a foredeck that is
     * only a couple of metres wide, so the push-out had nowhere to put
     * you and you got wedged on it. Nothing up here needs to be solid. */
    const az = Math.max(0.6, deckHalf(-11.3) - 0.85);
    HULL.add(slab(0.10, 0.10, 0.9, M.steel, -11.3, DECK_Y + 0.14, az, 0.2, 0, 0));
    HULL.add(slab(0.55, 0.09, 0.12, M.steel, -11.6, DECK_Y + 0.14, az + 0.26));
    for (let i = 0; i < 12; i++)
      HULL.add(new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.017, 3, 6), M.steel)
        .translateX(-10.9 + i * 0.10).translateY(DECK_Y + 0.08).translateZ(az - 0.10 - i * 0.02)
        .rotateX(i % 2 ? 0 : Math.PI / 2));
    // her numbers, painted ON the planking rather than hung off it
    for (const sg of [-1, 1])
      S.add(new THREE.Mesh(hullDecalGeo(-11.3, -9.1, DECK_Y - 0.30, DECK_Y + 0.24, sg), M.reg));
  }

  /* ---- her name, big, on the side you come up from ------------------
   * The +Z topsides, right where you meet her — the first thing you read
   * off the wreck. Lofted onto the planking, not a plane stuck to it. */
  S.add(new THREE.Mesh(hullDecalGeo(-2.4, 3.4, DECK_Y - 0.62, DECK_Y + 0.30, 1), M.nameBig));

  /* ---- the wheelhouse -------------------------------------------------
   * A glasshouse on a raised casing: glass right round the front and both
   * sides, a door in the +Z side with steps up to it. FOUR pieces round
   * the doorway and no full-width slab as well (8). */
  const BR = new THREE.Group(); S.add(BR);
  const F = DECK_Y + BR_STEP, T = F + BR_H;
  const WIN0 = F + 0.95, WIN1 = F + 2.28;      // your eye at the helm is F + 1.72
  {
    const cx = (BR_X0 + BR_X1) / 2, w = BR_X1 - BR_X0, POST = 0.16, zc = BR_HZ;

    BR.add(slab(w + 0.26, BR_STEP, zc * 2 + 0.26, M.paint, cx, DECK_Y + BR_STEP / 2, 0));
    BR.add(slab(w, 0.09, zc * 2, M.deck, cx, F - 0.045, 0));
    for (let i = 0; i < 3; i++) {               // the steps up to her door
      const t0 = i / 3, t1 = (i + 1) / 3;
      const z0 = zc + BR_RUN * (1 - t1), z1 = zc + BR_RUN * (1 - t0);
      BR.add(slab(BR_DOOR_W + 0.34, 0.07, z1 - z0, M.wood,
        BR_DOOR_C, DECK_Y + BR_STEP * t1 - 0.035, (z0 + z1) / 2));
      BR.add(slab(BR_DOOR_W + 0.34, BR_STEP * t1, 0.06, M.paint,
        BR_DOOR_C, DECK_Y + BR_STEP * t1 / 2, z0));
    }
    for (const d of [-1, 1]) {                  // rails that FOLLOW the run
      const x = BR_DOOR_C + d * (BR_DOOR_W / 2 + 0.16);
      BR.add(strut([x, DECK_Y + 0.95, zc + BR_RUN], [x, F + 0.95, zc], 0.028, M.steel, 4));
      for (const [t, h] of [[0.08, 0.95], [0.92, 0.95]])
        BR.add(slab(0.05, h, 0.05, M.steel, x, DECK_Y + BR_STEP * (1 - t) + h / 2, zc + BR_RUN * t));
    }
    BR.add(slab(w + 0.34, 0.12, zc * 2 + 0.34, M.deck, cx, T + 0.06, 0));
    for (const sg of [-1, 1])
      BR.add(slab(w + 0.42, 0.10, 0.09, M.steel, cx, T + 0.16, sg * (zc + 0.19)));

    const glassBand = (ww, dd, x, z) =>
      BR.add(slab(ww, WIN1 - WIN0, dd, M.glass, x, (WIN0 + WIN1) / 2, z));

    // front (-X), looking forward over the hatch and the bow
    BR.add(slab(0.15, WIN0 - F, zc * 2, M.paint, BR_X0, (F + WIN0) / 2, 0));
    BR.add(slab(0.15, T - WIN1, zc * 2, M.paint, BR_X0, (WIN1 + T) / 2, 0));
    glassBand(0.05, zc * 2 - 0.06, BR_X0 + 0.02, 0);
    for (let i = 0; i < 2; i++)
      BR.add(slab(0.16, WIN1 - WIN0, 0.08, M.paint, BR_X0, (WIN0 + WIN1) / 2, -zc * 0.44 + i * zc * 0.88));
    // aft (+X): boarded, with one small window
    BR.add(slab(0.15, BR_H, zc * 2, M.paint, BR_X1, F + BR_H / 2, 0));
    BR.add(slab(0.06, 0.62, 1.15, M.glass, BR_X1 - 0.05, WIN0 + 0.5, 0));
    for (const sx of [BR_X0, BR_X1]) for (const sz of [-zc, zc])
      BR.add(slab(POST, BR_H, POST, M.paint, sx, F + BR_H / 2, sz));

    for (const sg of [-1, 1]) {
      const z = sg * zc;
      if (sg < 0) {
        // full width is only safe on the BLIND side
        BR.add(slab(w, WIN0 - F, 0.14, M.paint, cx, (F + WIN0) / 2, z));
        BR.add(slab(w, T - WIN1, 0.14, M.paint, cx, (WIN1 + T) / 2, z));
        glassBand(w - 0.2, 0.05, cx, z + 0.03);
        for (let i = 0; i < 2; i++)
          BR.add(slab(0.08, WIN1 - WIN0, 0.15, M.paint, BR_X0 + w * (0.34 + i * 0.34), (WIN0 + WIN1) / 2, z));
      } else {
        const d0 = BR_DOOR_C - BR_DOOR_W / 2, d1 = BR_DOOR_C + BR_DOOR_W / 2;
        const DTOP = F + 2.02;
        for (const [s0, s1] of [[BR_X0, d0], [d1, BR_X1]]) {
          if (s1 - s0 < 0.02) continue;
          glassBand(s1 - s0 - 0.16, 0.05, (s0 + s1) / 2, z - 0.03);
          BR.add(slab(s1 - s0, WIN0 - F, 0.14, M.paint, (s0 + s1) / 2, (F + WIN0) / 2, z));
          BR.add(slab(s1 - s0, T - WIN1, 0.14, M.paint, (s0 + s1) / 2, (WIN1 + T) / 2, z));
        }
        BR.add(slab(BR_DOOR_W + 0.2, T - DTOP, 0.14, M.paint, BR_DOOR_C, (DTOP + T) / 2, z));
        for (const d of [-1, 1])
          BR.add(slab(0.10, DTOP - F, 0.20, M.wood, BR_DOOR_C + d * (BR_DOOR_W / 2), (F + DTOP) / 2, z));
        BR.add(slab(BR_DOOR_W + 0.20, 0.10, 0.20, M.wood, BR_DOOR_C, DTOP, z));
        BR.add(slab(BR_DOOR_W, 0.05, 0.24, M.wood, BR_DOOR_C, F + 0.02, z));
        // the door, standing FLAT against the wall beside its opening
        BR.add(slab(BR_DOOR_W, DTOP - F - 0.06, 0.05, M.paint,
          BR_DOOR_C - BR_DOOR_W - 0.06, (F + DTOP) / 2, z + 0.10));
        for (const dy of [-0.55, 0.55])
          BR.add(slab(0.16, 0.09, 0.09, M.steel, BR_DOOR_C - BR_DOOR_W / 2 - 0.06,
            (F + DTOP) / 2 + dy, z + 0.09));
      }
    }

    // console under the front glass, chart table, stove pipe on the roof
    BR.add(slab(0.62, 0.86, zc * 1.5, M.wood, BR_X0 + 0.44, F + 0.43, 0));
    BR.add(slab(0.66, 0.06, zc * 1.5, M.wood, BR_X0 + 0.44, F + 0.89, 0));
    for (let i = 0; i < 3; i++)
      BR.add(new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.017, 4, 10), M.brass)
        .translateX(BR_X0 + 0.76).translateY(F + 0.63).translateZ(-0.5 + i * 0.5).rotateY(Math.PI / 2));
    BR.add(slab(0.50, 0.05, 0.62, M.wood, BR_X1 - 0.55, F + 0.80, -zc + 0.46));
    for (const dz of [-0.25, 0.25])
      BR.add(slab(0.06, 0.80, 0.06, M.steel, BR_X1 - 0.55, F + 0.40, -zc + 0.46 + dz));
    BR.add(cyl(0.09, 0.10, 0.85, 7, M.steel, BR_X1 - 0.7, T + 0.50, 0.9));
    BR.add(cyl(0.13, 0.13, 0.10, 7, M.steel, BR_X1 - 0.7, T + 0.95, 0.9));
    BR.add(slab(0.14, 0.16, 0.14, M.steel, BR_DOOR_C, F + 2.20, zc + 0.10));   // dead lamp

    /* Her name on the FLAT side of the wheelhouse. It is not going back on
     * the windscreen: that is what was blocking the view out (10). */
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.52), M.name);
    board.position.set(cx, F + 0.52, -zc - 0.09);
    board.rotation.y = Math.PI;
    BR.add(board);
  }

  /* ---- the wheel ------------------------------------------------------
   * Hub at waist height so you look OVER it, not through it, and a marked
   * king spoke so midships is readable at a glance — the star puzzle asks
   * you to read this wheel. */
  const wheel = new THREE.Group();
  {
    BR.add(cyl(0.17, 0.26, 0.62, 8, M.steel, WHEEL_X, F + 0.31, 0));
    BR.add(slab(0.30, 0.16, 0.30, M.brass, WHEEL_X, F + 0.62, 0));
    BR.add(slab(0.05, 0.16, 0.05, M.brass, WHEEL_X, F + 0.72, 0));   // lubber's mark
    wheel.position.set(WHEEL_X, F + 0.95, 0);
    wheel.rotation.y = Math.PI / 2;
    BR.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.046, 5, 22), M.wood));
    /* The centre cap, in polished brass and proud of the spokes — you
     * read midships off this and the king spoke together, so it has to be
     * the brightest thing on the wheel. */
    wheel.add(cyl(0.145, 0.145, 0.16, 10, M.gold, 0, 0, 0, Math.PI / 2));
    wheel.add(cyl(0.165, 0.125, 0.05, 10, M.gold, 0, 0, 0.09, Math.PI / 2));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.022, 5, 14), M.gold));
    wheel.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), M.gold).translateZ(0.13));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.05), M.wood);
      sp.position.set(Math.cos(a) * 0.23, Math.sin(a) * 0.23, 0); sp.rotation.z = a - Math.PI / 2;
      wheel.add(sp);
      const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.03, 0.21, 6), M.wood);
      gr.position.set(Math.cos(a) * 0.575, Math.sin(a) * 0.575, 0); gr.rotation.z = a - Math.PI / 2;
      wheel.add(gr);
    }
    wheel.add(cyl(0.048, 0.042, 0.30, 6, M.brass, 0, 0.575, 0));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.020, 4, 10), M.brass)
      .translateY(0.44).rotateY(Math.PI / 2));
    wheel.add(new THREE.Mesh(new THREE.SphereGeometry(0.050, 7, 6), M.brass).translateY(0.72));
    wheel.userData.noBake = true;
  }

  /* ---- the davit over the hatch, and the captain on it ---------------
   * A crab davit: bedplate, braced king post, a boom with a knee UNDER
   * it, a sheave block, chain, hook. Every brace lands at both ends (12)
   * — the old one had a stay that started in mid air. */
  const gaff = new THREE.Group();
  {
    gaff.position.set(GAFF_X, DECK_Y, 0);
    S.add(gaff);
    const postZ = HATCH_HZ + 0.75, POST_H = 3.2, ARM_Y = 3.05;

    gaff.add(slab(0.62, 0.09, 0.62, M.steel, 0, 0.045, postZ));
    gaff.add(slab(0.44, 0.10, 0.44, M.steel, 0, 0.13, postZ));
    for (const dx of [-0.24, 0.24]) for (const dz of [-0.24, 0.24])
      gaff.add(slab(0.07, 0.06, 0.07, M.steel, dx, 0.10, postZ + dz));
    gaff.add(cyl(0.095, 0.135, POST_H, 8, M.steel, 0, POST_H / 2 + 0.16, postZ));
    gaff.add(new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.028, 4, 10), M.steel)
      .translateY(2.42).translateZ(postZ).rotateX(Math.PI / 2));
    gaff.add(cyl(0.070, 0.092, postZ + 0.26, 7, M.steel, 0, ARM_Y, (postZ + 0.26) / 2 - 0.13, Math.PI / 2));
    // the knee: post -> boom, both ends landed, gusset at each
    gaff.add(strut([0, 2.18, postZ - 0.10], [0, ARM_Y - 0.05, postZ - 1.05], 0.048, M.steel));
    gaff.add(slab(0.10, 0.16, 0.10, M.steel, 0, 2.18, postZ - 0.10));
    gaff.add(slab(0.10, 0.16, 0.10, M.steel, 0, ARM_Y - 0.05, postZ - 1.05));
    // a stay from the masthead down to a pad on the deck, also landed
    gaff.add(strut([0.02, POST_H + 0.05, postZ], [0.02, 0.10, postZ - 1.5], 0.022, M.steel, 4));
    gaff.add(slab(0.22, 0.08, 0.22, M.steel, 0.02, 0.06, postZ - 1.5));
    gaff.add(slab(0.16, 0.26, 0.20, M.steel, 0, ARM_Y - 0.14, 0));           // sheave block
    gaff.add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 4, 10), M.brass)
      .translateY(ARM_Y - 0.20).rotateY(Math.PI / 2));
    for (let i = 0; i < 9; i++) {
      const lk = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.015, 3, 7), M.steel);
      lk.position.set(0, ARM_Y - 0.32 - i * 0.092, 0);
      lk.rotation.set(i % 2 ? 0 : Math.PI / 2, 0, 0);
      gaff.add(lk);
    }
    solid(GAFF_X, postZ, 0.7, 0.7);

    const hook = new THREE.Group();
    hook.position.set(0, HOOK_Y - DECK_Y, 0);
    gaff.add(hook);
    hook.add(cyl(0.024, 0.024, 0.20, 5, M.steel, 0, 0.11, 0));
    hook.add(new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.014, 4, 9), M.steel).translateY(0.21));
    for (let i = 0; i < 9; i++) {
      const ang = -0.40 + (i / 8) * 3.7;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.072), M.steel);
      seg.position.set(0, -0.09 + Math.cos(ang) * 0.14, Math.sin(ang) * 0.14);
      seg.rotation.x = -ang;
      hook.add(seg);
    }
    hook.userData.noBake = true;
    gaff.userData.hook = hook;

    /* ---- him ----------------------------------------------------------
     * He is held at arm's length in the examine view, filling the screen,
     * so he gets built like a head and not like a ball with two dots on
     * it: a skull that is longer than it is wide, a brow with a bridge
     * under it, cheekbones, a jaw hung below the cranium rather than
     * merged into it, teeth in a curve, and the cut through his neck with
     * the spine showing in it. Then the part that makes it read at all —
     * he has been on a hook in the salt air for years, so the flesh is
     * gone at the temple and the cheek and drawn tight everywhere else. */
    const head = new THREE.Group();
    head.position.set(0, -0.40, 0);
    head.rotation.set(0.22, 0.4, 0.14);
    hook.add(head);

    // cranium: longer fore-and-aft than across, flattened at the back
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.145, 2), M.flesh);
    skull.scale.set(1.02, 1.04, 0.90);
    head.add(skull);
    const occ = new THREE.Mesh(new THREE.IcosahedronGeometry(0.10, 1), M.flesh);
    occ.scale.set(0.70, 0.86, 0.80); occ.position.set(-0.075, -0.015, 0);
    head.add(occ);
    // temple, worn through to the bone on one side
    const temple = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), M.bone);
    temple.scale.set(0.7, 1.0, 0.5); temple.position.set(0.028, 0.052, 0.118);
    head.add(temple);

    // brow, and the bridge running down off it
    head.add(slab(0.085, 0.040, 0.205, M.flesh, 0.100, 0.080, 0));
    head.add(slab(0.045, 0.075, 0.048, M.flesh, 0.118, 0.030, 0));
    for (const sg of [-1, 1]) {
      // socket, and what is left in it
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.047, 8, 7), M.gore);
      socket.scale.set(0.72, 0.86, 0.74);
      socket.position.set(0.086, 0.033, sg * 0.060);
      head.add(socket);
      head.add(new THREE.Mesh(new THREE.SphereGeometry(0.031, 7, 6), M.eye)
        .translateX(0.098).translateY(0.033).translateZ(sg * 0.060));
      head.add(new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), M.dark)
        .translateX(0.120).translateY(0.031).translateZ(sg * 0.060));
      // cheekbone, and the hollow under it
      head.add(slab(0.075, 0.034, 0.062, M.flesh, 0.088, -0.020, sg * 0.078));
      const hollow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.040, 1), M.gore);
      hollow.scale.set(0.8, 0.9, 0.5); hollow.position.set(0.072, -0.055, sg * 0.086);
      head.add(hollow);
      // ear, folded
      const ear = new THREE.Mesh(new THREE.IcosahedronGeometry(0.032, 1), M.flesh);
      ear.scale.set(0.42, 1.0, 0.66); ear.position.set(-0.018, -0.008, sg * 0.128);
      ear.rotation.x = sg * 0.3; head.add(ear);
      head.add(new THREE.Mesh(new THREE.TorusGeometry(0.020, 0.006, 4, 9), M.flesh)
        .translateX(-0.014).translateY(-0.008).translateZ(sg * 0.134).rotateY(Math.PI / 2));
    }
    // nose: bridge, then the opening where the cartilage has gone
    head.add(slab(0.055, 0.030, 0.036, M.flesh, 0.132, 0.004, 0));
    head.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.026, 1), M.gore)
      .translateX(0.140).translateY(-0.030));

    // jaw, hung below the cranium, with the teeth in a curve in it
    const jaw = new THREE.Mesh(new THREE.IcosahedronGeometry(0.098, 1), M.flesh);
    jaw.scale.set(0.86, 0.52, 0.80); jaw.position.set(0.022, -0.118, 0);
    head.add(jaw);
    head.add(slab(0.030, 0.055, 0.150, M.flesh, 0.052, -0.104, 0));      // chin
    for (const sg of [-1, 1])                                             // ramus
      head.add(slab(0.030, 0.085, 0.030, M.flesh, -0.030, -0.082, sg * 0.088));
    for (let i = 0; i < 9; i++) {
      const t = (i / 8 - 0.5) * 1.5;                 // -0.75 .. 0.75 rad
      const gone = i === 2 || i === 6;               // two of them missing
      if (gone) continue;
      const r = 0.072;
      head.add(slab(0.016, 0.026, 0.014, M.tooth,
        0.052 + Math.cos(t) * r * 0.55, -0.086, Math.sin(t) * r));
    }
    head.add(slab(0.070, 0.014, 0.115, M.gore, 0.040, -0.098, 0));        // the gum line

    // the cut, and his spine in it
    head.add(cyl(0.082, 0.098, 0.115, 9, M.flesh, 0, -0.196, 0));
    const cutf = new THREE.Mesh(new THREE.CircleGeometry(0.094, 10), M.gore);
    cutf.rotation.x = Math.PI / 2; cutf.position.y = -0.252; head.add(cutf);
    head.add(cyl(0.026, 0.026, 0.030, 7, M.bone, 0.004, -0.246, -0.004));
    for (const sg of [-1, 1])
      head.add(slab(0.020, 0.016, 0.020, M.bone, 0.004, -0.246, sg * 0.030));
    for (let i = 0; i < 7; i++) {                     // what is hanging out of it
      const a2 = rnd(i * 4.1) * TAU, r = 0.030 + rnd(i * 2.7) * 0.050;
      const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.020, 0), M.gore);
      t.scale.set(0.8, 1.4 + rnd(i) * 1.4, 0.8);
      t.position.set(Math.cos(a2) * r, -0.268 - rnd(i * 3.3) * 0.035, Math.sin(a2) * r);
      head.add(t);
    }

    // a tear down the cheek, and a bruise round it
    const tear = new THREE.Mesh(new THREE.IcosahedronGeometry(0.048, 1), M.gore);
    tear.scale.set(0.5, 1.1, 0.35);
    tear.position.set(0.062, -0.030, -0.108); tear.rotation.z = 0.4;
    head.add(tear);
    const bruise = new THREE.Mesh(new THREE.IcosahedronGeometry(0.062, 1), M.bruise);
    bruise.scale.set(0.6, 0.8, 0.42); bruise.position.set(0.030, 0.062, -0.112);
    head.add(bruise);

    // hair, thinned and matted, only where hair is
    for (let i = 0; i < 42; i++) {
      const a2 = rnd(i * 5.3) * TAU, r = 0.055 + rnd(i * 2.1) * 0.085;
      const px2 = Math.cos(a2) * r * 0.8 - 0.02, pz2 = Math.sin(a2) * r;
      if (px2 > 0.075) continue;                      // not on his forehead
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.07 + rnd(i) * 0.10, 0.016), M.hair);
      hh.position.set(px2, 0.095 + rnd(i * 3.7) * 0.055, pz2);
      hh.rotation.set(rnd(i) * 0.9 - 0.45, a2, rnd(i * 1.3) * 0.9 - 0.45);
      head.add(hh);
    }
    // stubble on the jaw
    for (let i = 0; i < 26; i++) {
      const t = (rnd(i * 7.7) - 0.5) * 1.6;
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.022, 0.010), M.hair);
      hh.position.set(0.030 + Math.cos(t) * 0.052, -0.128 + rnd(i * 2.3) * 0.048, Math.sin(t) * 0.082);
      hh.rotation.set(rnd(i) * 0.5, t, 0);
      head.add(hh);
    }
    head.userData.noBake = true;
    S.userData.head = head;
  }
  S.userData.gaff = gaff;

  /* ---- her mast, ON THE CENTRELINE where a mast goes -----------------
   * Far enough forward to be a line rather than a bar in the one sightline
   * the helm has (9), with shrouds that land on the rail at both ends. */
  {
    const MH = 6.6;
    S.add(cyl(0.11, 0.19, MH, 8, M.wood, MAST_X, DECK_Y + MH / 2, 0, 0, 0, 0.05));
    S.add(slab(0.44, 0.20, 0.44, M.wood, MAST_X, DECK_Y + 0.10, 0));
    S.add(slab(0.09, 0.09, 2.4, M.wood, MAST_X - 0.28, DECK_Y + 5.0, 0));       // yard
    S.add(cyl(0.05, 0.05, 0.9, 6, M.steel, MAST_X - 0.30, DECK_Y + MH - 0.1, 0));
    for (const sg of [-1, 1]) {
      const foot = [MAST_X + 1.6, DECK_Y + 0.5, sg * (deckHalf(MAST_X + 1.6) - 0.15)];
      S.add(strut(foot, [MAST_X, DECK_Y + MH - 0.5, 0], 0.022, M.steel, 4));
      const foot2 = [MAST_X - 1.4, DECK_Y + 0.5, sg * (deckHalf(MAST_X - 1.4) - 0.15)];
      S.add(strut(foot2, [MAST_X, DECK_Y + MH - 0.8, 0], 0.022, M.steel, 4));
      S.add(slab(0.10, 0.30, 0.10, M.steel, foot[0], DECK_Y + 0.15, foot[2]));
    }
    S.add(slab(0.13, 0.18, 0.13, M.steel, MAST_X - 0.28, DECK_Y + 4.85, 0.9));  // dead light
    solid(MAST_X, 0, 0.55, 0.55);
  }

  /* ---- her gear ------------------------------------------------------
   * She was worked hard and then she sat here a long time. Everything
   * placed here goes into PROPS, so you walk into it, not through it. */
  {
    const basket = (x, y, z, ry) => {
      const g2 = new THREE.Group(); g2.position.set(x, y, z); g2.rotation.y = ry;
      const w = 0.62, h = 0.34;
      g2.add(slab(w, 0.05, w, M.steel, 0, -h / 2, 0));
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (let k = 0; k < 4; k++) {
          const o = -w / 2 + 0.06 + k * (w - 0.12) / 3;
          g2.add(slab(0.035, h, 0.035, M.steel, ax ? ax * w / 2 : o, 0, az ? az * w / 2 : o));
        }
        g2.add(slab(ax ? 0.05 : w, 0.05, az ? 0.05 : w, M.steel, ax * w / 2, h / 2, az * w / 2));
      }
      return bakeGroup(g2);
    };
    const stacks = [[-3.0, -3.00], [-1.4, -3.05], [1.9, 3.00], [3.2, -2.90], [0.2, -3.05]];
    for (let s = 0; s < stacks.length; s++) {
      const [x, z] = stacks[s];
      const n = 1 + Math.floor(rnd(s * 3.1) * 3);
      for (let i = 0; i < n; i++)
        S.add(basket(x + rnd(s * 2.2 + i) * 0.10, DECK_Y + 0.20 + i * 0.36, z, rnd(s + i) * 1.2));
      solid(x, z, 0.8, 0.8);
    }
    for (let i = 0; i < 3; i++)          // and some down in the hold
      HULL.add(basket(HOLD_X0 + 2.0 + rnd(i * 7.7) * 3, HOLD_Y + 0.20,
        (rnd(i * 4.4) - 0.5) * 2.6, rnd(i) * 2));

    for (const [x, z, r] of [[-7.2, 2.6, 0.34], [-5.3, 2.90, 0.30], [4.4, 3.05, 0.32]]) {
      const b = new THREE.Group(); b.position.set(x, DECK_Y, z);
      b.add(cyl(r, r * 0.92, 0.82, 9, M.wood, 0, 0.41, 0));
      for (const yy of [0.14, 0.68])
        b.add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.015, 0.024, 4, 11), M.steel)
          .translateY(yy).rotateX(Math.PI / 2));
      S.add(bakeGroup(b));
      solid(x, z, r * 2 + 0.1, r * 2 + 0.1);
    }

    S.add(slab(0.85, 0.55, 0.62, M.wood, -1.9, DECK_Y + 0.28, 2.95, 0, 0.22, 0));   // crate
    S.add(slab(0.52, 0.26, 0.30, M.steel, -1.9, DECK_Y + 0.68, 2.95, 0, 0.22, 0));  // toolbox
    solid(-1.9, 2.95, 0.95, 0.75);
    S.add(cyl(0.17, 0.13, 0.30, 8, M.steel, -8.6, DECK_Y + 0.15, -2.0));            // bucket
    S.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 3, 9), M.steel)
      .translateX(-8.6).translateY(DECK_Y + 0.30).translateZ(-2.0).rotateY(Math.PI / 2));

    const coil = (x, z, r0) => {
      const c2 = new THREE.Group(); c2.position.set(x, DECK_Y + 0.04, z);
      for (let i = 0; i < 4; i++)
        c2.add(new THREE.Mesh(new THREE.TorusGeometry(r0 - i * 0.055, 0.038, 4, 12), M.rope)
          .translateY(i * 0.055).rotateX(Math.PI / 2));
      return bakeGroup(c2);
    };
    S.add(coil(-3.6, 3.05, 0.42));
    S.add(coil(2.9, -3.00, 0.36));
    solid(-3.6, 3.05, 0.9, 0.9);

    /* NO FENDERS. Tyres hung over her side are a 0.4 m torus that has to
     * project to be a fender at all, and however they were seated they
     * read as black rings poking out of her. Cut, not adjusted. */

    for (let i = 0; i < 5; i++) {          // netting bundled at the rail
      const x = -7.4 + i * 0.5;
      const n = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), M.rope);
      n.scale.set(1.1, 0.7, 0.9);
      n.position.set(x, DECK_Y + 0.20, -deckHalf(x) + 0.55);
      n.rotation.set(rnd(i) * 2, rnd(i * 3) * 3, rnd(i * 5) * 2);
      S.add(n);
    }
    solid(-6.4, -3.1, 3.0, 0.9);
    for (let i = 0; i < 4; i++)            // floats
      S.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), M.paint)
        .translateX(-5.2 + i * 0.42).translateY(DECK_Y + 0.34).translateZ(-deckHalf(-5) + 0.5));

    for (const dz of [-0.10, 0.12]) {      // his boots, still there
      S.add(slab(0.16, 0.30, 0.13, M.rubber, 3.4, DECK_Y + 0.15, -1.9 + dz, 0.1, 0.3, 0));
      S.add(slab(0.16, 0.10, 0.24, M.rubber, 3.44, DECK_Y + 0.05, -1.96 + dz, 0, 0.3, 0));
    }

    // a deck lantern, takeable — main.js wires it from userData.lantern
    const lantern = new THREE.Group();
    lantern.position.set(0.4, DECK_Y + 0.22, 2.85);
    lantern.add(cyl(0.10, 0.12, 0.10, 7, M.steel, 0, -0.16, 0));
    lantern.add(slab(0.15, 0.22, 0.15, M.glass, 0, 0, 0));
    for (const dx of [-0.075, 0.075]) for (const dz of [-0.075, 0.075])
      lantern.add(slab(0.022, 0.24, 0.022, M.steel, dx, 0, dz));
    lantern.add(cyl(0.11, 0.06, 0.10, 7, M.steel, 0, 0.16, 0));
    lantern.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 3, 9), M.steel).translateY(0.24));
    lantern.userData.noBake = true;
    S.add(lantern);
    S.userData.lantern = lantern;
  }

  /* ---- sand banked up her sides --------------------------------------
   * Clear of her at every station the drift actually covers. Taking the
   * half-width at the drift's CENTRE put its ends inside the planking
   * wherever she changes width quickly — which is both ends, and is how
   * the land came through her at the stern. */
  for (let i = 0; i < 34; i++) {
    const x = -HALF - 1 + rnd(i * 2.9) * (LEN + 2);
    const sg = i % 2 ? 1 : -1;
    const sx = 1.6 + rnd(i * 3.3) * 2.0, hgt = 0.7 + rnd(i * 5.1) * 0.9;
    const sz = 1.2 + rnd(i * 7.7) * 1.1;
    let b = 0;
    for (let k = -1; k <= 1; k += 0.25) {
      const xx = Math.max(-HALF, Math.min(HALF, x + k * sx * 0.5));
      for (let y = 0; y <= 1.2; y += 0.3) b = Math.max(b, halfAtY(xx, y));
    }
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), M.sand);
    m.scale.set(sx, hgt, sz);
    m.position.set(x, hgt * 0.08, sg * (b + sz * 0.5 + 0.15 + rnd(i * 4.2) * 0.5));
    m.rotation.y = rnd(i) * 3.1;
    S.add(m);
  }

  bakeGroup(HULL);
  bakeGroup(BR);
  bakeGroup(S);

  S.userData.wheel = wheel;
  S.userData.holdDoor = holdDoor;
  S.userData.nav = {
    LEN, HALF, BEAM, KEEL_Y, DECK_Y, BULWARK,
    HOLD_X0, HOLD_X1, HOLD_HZ, HOLD_Y,
    BREACH_X0, BREACH_X1, BREACH_TOP,
    HATCH_X0, HATCH_X1, HATCH_HZ, COAMING,
    STAIR_X0, STAIR_X1, STAIR_Z0, STAIR_Z1,
    BR_X0, BR_X1, BR_HZ, BR_STEP, BR_H, BR_DOOR_C, BR_DOOR_W, BR_RUN, WHEEL_X,
    GAFF_X, HOOK_Y, MAST_X, DOOR_X, DOOR_W, DOOR_H,
    props: PROPS,
    crabSpot: [HOLD_X0 + 2.4, HOLD_Y + 0.03, -1.7],
    lanternSpot: [0.4, DECK_Y + 0.22, 2.85],
    beamAt, sectionK, flareAt, sheerAt, rakeAt, halfAtY, deckHalf, hullPt,   // rakeAt: the walk inverts it for the deck edge
  };
  return S;
}
