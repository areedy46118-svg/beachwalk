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
 *  10. Nothing crosses the windscreen. She carries no name at all.
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

/* HER SOLE IS NOT FLAT, AND ANYTHING STANDING ON IT HAS TO KNOW THAT. She
 * came ashore hard: the boards are dished and buckled and run between 0.12
 * and 0.20, never at HOLD_Y itself. Everything dressed into her crew space
 * was placed at HOLD_Y + a height, so every one of it floated a hand's
 * width over the boards — a room full of furniture hovering, which is
 * exactly what it looked like. `soleY` is the one answer, and it is the
 * same expression the sole's own geometry is built from. */
const soleDip = (x, z) => 0.05 + 0.035 * Math.sin(x * 0.9 + 1.3) * Math.cos(z * 1.1)
  + 0.028 * Math.sin(x * 2.3 - z * 1.7) + 0.02 * Math.sin(z * 3.1 + x * 0.4);
const soleY = (x, z) => HOLD_Y - soleDip(x, z);

/* Her lines. Bow at -X: fine, raked, flared. Transom rounded. The section
 * has a real turn of bilge — a power curve alone gives a wedge, which is
 * what read as blocky. */
function beamAt(x) {
  const u = -x / HALF;                                  // +1 at the bow
  /* NEVER NEGATIVE. The deck takes its x from hullPt with the rake in it,
   * which forward is the best part of two metres, so this gets asked for
   * stations well beyond the stem — and there the curve runs straight
   * through zero: measured, -0.069 at lx -13.2 and -1.63 at -15. A
   * negative half-beam puts the port surface to starboard and the two
   * sides of her CROSS OVER each other, coincident along the centreline,
   * which is the shimmer down her stem. Clamped, she simply closes. */
  if (u > 0.30) { const t = (u - 0.30) / 0.70; return Math.max(0.02, (BEAM / 2) * (1 - Math.pow(t, 1.6) * 0.98)); }
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
    /* AND IT CLOSES AT HER ENDS. The rail is worn away in patches, which
     * is right amidships and wrong at the stem: forward the deck narrows,
     * `b < 0.42` took the rail out over the last two metres, and what was
     * left was open sea at deck height framed by planking — measured, a
     * ray through it leaves her and lands on the beach at lx -21.7. From
     * the foredeck that is a hole in her bow. A boat's bulwark closes at
     * the stem; the wear stays where you can see it is wear. */
    const nearEnd = Math.abs(x) > HALF - 2.4;
    const cut = b < 0.16
      || (!nearEnd && rnd(Math.floor(i / 12) * 4.3 + (sg > 0 ? 0 : 27)) < 0.16);
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
/* A HEIGHT FIELD INTO A NORMAL MAP. The one thing every surface on this
 * wreck was missing: she is lit by a single low moon and had no relief at
 * all, so a hull drawn with thirty plank seams on it rendered as one smooth
 * brown wall — the seams were a PICTURE of seams, and a picture does not
 * move when the light does. Drawn as height and differentiated, the same
 * seams catch the moon down her whole length. Sobel rather than a plain
 * difference so a single stray texel cannot become a spike. */
function heightToNormal(hc, strength = 3.0) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4];   // wraps, as the map does
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
             - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))
             - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * strength / 255, ny = -dy * strength / 255, nz = 1;
    const l = Math.hypot(nx, ny, nz) || 1;
    const o = (y * w + x) * 4;
    out[o] = (nx / l * 0.5 + 0.5) * 255;
    out[o + 1] = (ny / l * 0.5 + 0.5) * 255;
    out[o + 2] = (nz / l * 0.5 + 0.5) * 255;
    out[o + 3] = 255;
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* HER SIDE, DRAWN AS COLOUR AND AS RELIEF IN ONE PASS, so the seam that is
 * dark and the seam that is deep are the same seam. Two things were wrong
 * with the old one and both were about the retro downscale:
 *
 *  - THIRTY STRAKES OVER FIVE METRES IS SEVENTEEN CENTIMETRES A PLANK, and
 *    at any distance down a 28 m hull that is under a pixel. Eighteen, at
 *    28 cm, is a real plank on a boat this size and survives being looked
 *    at from the sand.
 *  - AND THE CONTRAST WAS TOO LOW TO SURVIVE THE EMISSIVE. Every mark on
 *    her sat at 0.3 alpha over mid-brown and was then lifted 20 % flat by
 *    the emissive map. The pavilion learned this about concrete: a map that
 *    carries no contrast cannot be given any by a material.
 *
 * `map` and `emissiveMap` used to be two SEPARATE CALLS to this function —
 * two different random draws of the same hull, so the lift never landed on
 * the marks it was meant to be lifting. They are cached and shared now. */
const _hullCache = new Map();
/* One draw, three slots: the colour, the lift tied to that same colour, and
 * the relief that makes the moon find it. */
function hullSet(rep, opts) {
  const { map, normal } = hullMaps(rep, opts);
  return { map, emissiveMap: map, normalMap: normal };
}
function hullMaps(rep = [1, 1], opts = {}) {
  const key = `${rep[0]}:${rep[1]}:${opts.flat ? 1 : 0}`;
  const hit = _hullCache.get(key);
  if (hit) return hit;
  const w = 512, h = 512;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
  const hg = hc.getContext('2d');
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, w, h);          // mid grey is flat
  const wrap = (fn, ctx = g) => { for (const dx of [-w, 0, w]) { ctx.save(); ctx.translate(dx, 0); fn(ctx); ctx.restore(); } };

  const RAIL = 0.00, TOPS = 0.14, BOOT = 0.47, WET = 0.64;
  const band = g.createLinearGradient(0, 0, 0, h);
  /* SHE WAS PAINTED, AND THE REFERENCE BOATS ARE WHITE. Every one of them
   * — Point Reyes, the Corpach wreck — is a pale hull with the paint
   * failing off it in patches and rust running out of every fastening, and
   * the eye reads that contrast from a long way off. This ran from a warm
   * pale grey straight into mid-brown over the top eighth, so from the sand
   * she was one flat brown wall and none of the drawing on her could be
   * seen. The pale band holds most of the way down to the boot top now, and
   * what breaks it up is the paint LOSS below rather than the gradient. */
  band.addColorStop(RAIL, '#e9e4d8');         // the old white, sun-bleached
  band.addColorStop(0.08, '#ded7c8');
  band.addColorStop(TOPS, '#d0c8b6');
  band.addColorStop(0.33, '#bdb39e');
  band.addColorStop(BOOT - 0.015, '#8d7f6a');
  band.addColorStop(BOOT + 0.005, '#33240f');  // the boot top, and it is a HARD edge
  band.addColorStop(BOOT + 0.03, '#7a4522');   // the rust belt under it
  band.addColorStop(WET, '#33241a');
  band.addColorStop(1, '#191410');
  g.fillStyle = band; g.fillRect(0, 0, w, h);

  /* PLANKING, as colour and as a lapped edge. She is timber: seams running
   * her length, each plank standing a hair proud of the one under it. */
  const N = opts.flat ? 22 : 18;
  for (let i = 1; i < N; i++) {
    const y = (i / N) * h + Math.sin(i * 2.3) * 1.5;
    const wob = (x) => y + Math.sin(x * 0.013 + i) * 1.8;
    // the seam: dark, and deep
    g.strokeStyle = `rgba(26,17,10,${0.62 + (i % 3) * 0.10})`;
    g.lineWidth = 2 + (i % 4 === 0 ? 1 : 0);
    g.beginPath(); g.moveTo(0, wob(0));
    for (let x = 0; x <= w; x += 24) g.lineTo(x, wob(x));
    g.stroke();
    hg.strokeStyle = 'rgba(0,0,0,0.85)'; hg.lineWidth = 3;
    hg.beginPath(); hg.moveTo(0, wob(0));
    for (let x = 0; x <= w; x += 24) hg.lineTo(x, wob(x));
    hg.stroke();
    // and the plank below it rounds away from the light
    const lip = hg.createLinearGradient(0, y, 0, y + h / N);
    lip.addColorStop(0, 'rgba(255,255,255,0.55)');
    lip.addColorStop(0.45, 'rgba(128,128,128,0)');
    lip.addColorStop(1, 'rgba(0,0,0,0.30)');
    hg.fillStyle = lip; hg.fillRect(0, y, w, h / N);
    // the pale lip catching the moon, in colour too
    g.strokeStyle = 'rgba(214,203,182,0.30)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, wob(0) + 3);
    for (let x = 0; x <= w; x += 24) g.lineTo(x, wob(x) + 3);
    g.stroke();
    if (i % 2 === 0) {                        // caulking gone, iron weeping
      const gr = g.createLinearGradient(0, y, 0, y + 34);
      gr.addColorStop(0, 'rgba(126,62,24,0.42)'); gr.addColorStop(1, 'rgba(126,62,24,0)');
      g.fillStyle = gr; g.fillRect(0, y, w, 34);
    }
  }
  /* FRAMES AND FASTENINGS. The frames stand the planking out in a faint
   * vertical corduroy, which is most of what says "built" rather than
   * "extruded" when you walk along her. */
  for (let x = 0; x < w; x += 26) {
    const fr = hg.createLinearGradient(x - 3, 0, x + 6, 0);
    fr.addColorStop(0, 'rgba(128,128,128,0)');
    fr.addColorStop(0.4, 'rgba(190,190,190,0.55)');
    fr.addColorStop(1, 'rgba(128,128,128,0)');
    hg.fillStyle = fr; hg.fillRect(x - 3, h * TOPS, 10, h * (WET - TOPS));
    g.fillStyle = 'rgba(44,28,16,0.20)'; g.fillRect(x, h * TOPS, 4, h * (WET - TOPS));
  }
  for (let x = 6; x < w; x += 26) {
    for (let i = 1; i < N; i += 1) {
      const y = (i / N) * h;
      g.fillStyle = 'rgba(24,14,8,0.60)'; g.fillRect(x, y - 3, 4, 4);
      hg.fillStyle = 'rgba(48,48,48,0.85)'; hg.fillRect(x, y - 3, 4, 4);
      const gr = g.createLinearGradient(0, y, 0, y + 26);
      gr.addColorStop(0, 'rgba(146,74,28,0.46)'); gr.addColorStop(1, 'rgba(146,74,28,0)');
      g.fillStyle = gr; g.fillRect(x - 1, y, 6, 26);
    }
  }

  for (let i = 0; i < 200; i++) {             // weathering
    const x = Math.random() * w;
    const bias = Math.random() < 0.60 ? BOOT + (Math.random() - 0.45) * 0.26 : Math.random();
    const y = bias * h, r = 7 + Math.random() * 52;
    const pick = Math.random();
    const col = pick < 0.40 ? '148,70,26' : pick < 0.72 ? '86,40,18' : '190,118,54';
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${col},${0.18 + Math.random() * 0.42})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    });
  }
  for (let i = 0; i < 130; i++) {             // long runs down the topsides
    const x = Math.random() * w, top = h * (Math.random() * 0.44);
    const len = 60 + Math.random() * 200, wd = 2 + Math.random() * 5;
    const gr = g.createLinearGradient(0, top, 0, top + len);
    gr.addColorStop(0, 'rgba(118,54,20,0.62)');
    gr.addColorStop(0.35, 'rgba(138,66,26,0.38)');
    gr.addColorStop(1, 'rgba(118,54,20,0)');
    wrap(() => { g.fillStyle = gr; g.fillRect(x, top, wd, len); });
  }
  for (let i = 0; i < 18; i++) {              // sprung and replaced planks
    const x = Math.random() * w, y = h * (0.08 + Math.random() * 0.52);
    const pw = 40 + Math.random() * 110, ph = 10 + Math.random() * 16;
    const proud = Math.random() < 0.5;
    wrap(() => {
      g.fillStyle = proud ? 'rgba(132,60,24,0.44)' : 'rgba(102,94,78,0.42)';
      g.fillRect(x, y, pw, ph);
      g.strokeStyle = 'rgba(26,16,9,0.70)'; g.lineWidth = 2;
      g.strokeRect(x, y, pw, ph);
    });
    wrap((cx) => {
      cx.fillStyle = proud ? 'rgba(196,196,196,0.55)' : 'rgba(64,64,64,0.55)';
      cx.fillRect(x, y, pw, ph);
      cx.strokeStyle = 'rgba(0,0,0,0.7)'; cx.lineWidth = 2; cx.strokeRect(x, y, pw, ph);
    }, hg);
  }
  for (let i = 0; i < 24; i++) {              // flakes of her old green trim
    const x = Math.random() * w, y = h * (0.02 + Math.random() * 0.28), r = 10 + Math.random() * 34;
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(58,104,90,${0.24 + Math.random() * 0.30})`);
      gr.addColorStop(1, 'rgba(58,104,90,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    });
  }
  /* AND THE PAINT IS OFF HER IN PATCHES. This is the thing that makes the
   * reference hulls read at any distance: not a gradient but hard-edged
   * islands where the white has gone and the bare grey timber is showing,
   * each one weeping rust out of its bottom edge. Ragged by construction —
   * a rectangle of bare wood reads as a decal, and paint does not fail in
   * rectangles. */
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w, y = h * (0.02 + Math.random() * 0.40);
    const pw = 30 + Math.random() * 96, ph = 14 + Math.random() * 66;
    wrap((cx) => {
      cx.save();
      cx.beginPath();
      const n = 12;
      cx.moveTo(x, y);
      for (let k = 0; k <= n; k++) { const t = k / n; cx.lineTo(x + t * pw, y + Math.sin(t * 7.3 + i * 2.1) * 6); }
      for (let k = n; k >= 0; k--) { const t = k / n; cx.lineTo(x + t * pw, y + ph + Math.sin(t * 5.7 + i) * 7); }
      cx.closePath(); cx.clip();
      cx.fillStyle = `rgba(120,106,84,${0.52 + Math.random() * 0.30})`;
      cx.fillRect(x - 12, y - 12, pw + 24, ph + 24);
      cx.strokeStyle = 'rgba(56,42,26,0.40)'; cx.lineWidth = 1;
      for (let k = 0; k < 9; k++) {
        const yy = y + (k / 9) * ph;
        cx.beginPath(); cx.moveTo(x - 12, yy); cx.lineTo(x + pw + 12, yy + Math.sin(k + i) * 2); cx.stroke();
      }
      cx.restore();
      const gr = cx.createLinearGradient(0, y + ph, 0, y + ph + 54);
      gr.addColorStop(0, 'rgba(134,66,24,0.52)'); gr.addColorStop(1, 'rgba(134,66,24,0)');
      cx.fillStyle = gr; cx.fillRect(x, y + ph, pw, 54);
    });
  }
  for (let i = 0; i < 44; i++) {              // weed and scum along the bottom
    const x = Math.random() * w, y = h * (WET + Math.random() * 0.34), r = 14 + Math.random() * 46;
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(30,44,28,${0.34 + Math.random() * 0.38})`);
      gr.addColorStop(1, 'rgba(30,44,28,0)');
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
  t.repeat.set(rep[0], rep[1]);
  const n = heightToNormal(hc, opts.flat ? 2.2 : 3.4);
  n.repeat.set(rep[0], rep[1]);
  /* AND SHE IS TWENTY-EIGHT METRES LONG, SO ANISOTROPY IS NOT OPTIONAL.
   * Nearest filtering with anisotropy 1 is right for a 256 canvas on a flat
   * prop and catastrophic on a hull you walk the length of: at a glancing
   * angle three picks the mip level off the worst derivative and averages
   * the whole map away, which is why every mark drawn above was invisible
   * from the sand. */
  for (const tx of [t, n]) { tx.anisotropy = 16; tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearMipmapLinearFilter; }
  const out = { map: t, normal: n };
  _hullCache.set(key, out);
  return out;
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
  // her lining gets the sole's treatment: a tone a board, and knots
  for (let i = 0; i < 20; i++) {
    const y0 = (i / 20) * h, bh = h / 20 + 1;
    const v = 0.74 + Math.random() * 0.58;
    g.fillStyle = `rgb(${74 * v | 0},${53 * v | 0},${36 * v | 0})`;
    g.fillRect(0, y0, w, bh);
    if (Math.random() < 0.45) {                  // a knot, with the grain round it
      const kx = Math.random() * w, ky = y0 + bh * 0.5, kr = 2 + Math.random() * 3;
      for (let r = kr * 2.6; r > 0; r -= 1.4) {
        g.strokeStyle = `rgba(26,17,10,${0.10 + 0.16 * (1 - r / (kr * 2.6))})`;
        g.lineWidth = 1;
        g.beginPath(); g.ellipse(kx, ky, r, r * 0.42, 0, 0, TAU); g.stroke();
      }
      g.fillStyle = 'rgba(22,14,8,0.7)';
      g.beginPath(); g.ellipse(kx, ky, kr, kr * 0.42, 0, 0, TAU); g.fill();
    }
  }
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
  /* EVERY BOARD ITS OWN TONE. One fill with lines ruled across it is a
   * drawing of a floor: sixteen identical stripes, and at this texel count
   * the eye reads the repeat immediately. Real laid boards came off
   * different trees and have worn differently, so each gets its own value
   * and a little of its own hue before anything is drawn on top — which is
   * most of what "more variation" actually is, and it costs one fillRect
   * a board. A few are noticeably darker: those are the wet ones. */
  for (let i = 0; i < 16; i++) {
    const y0 = (i / 16) * h, bh = h / 16 + 1;
    const t = Math.random();
    const v = t < 0.18 ? 0.62 : t < 0.34 ? 1.22 : 0.82 + Math.random() * 0.46;
    const warm = 0.9 + Math.random() * 0.3;
    g.fillStyle = `rgb(${Math.min(255, 92 * v * warm | 0)},${Math.min(255, 74 * v | 0)},${Math.min(255, 53 * v / warm | 0)})`;
    g.fillRect(0, y0, w, bh);
  }
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
  /* WARM, NOT BLUE. This is what you see through every gouge in her sole,
   * and at 0x3c4152 under a 0x6e7382 material it read as standing WATER —
   * bright blue pools let into a brown wooden floor, which is the single
   * thing in her that everybody reports as a texture bug. The beach's own
   * sand is blue because it is lit by a quarter moon in the open; three
   * metres inside a timber hull, surrounded by warm brown, the same blue is
   * the only cold thing in the frame and the eye reads it as liquid. Damp
   * sand in shadow is a warm grey-brown, and the shell grit stays pale
   * because that is what catches what little light gets down here. */
  g.fillStyle = '#453f39'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 22;
    const pick = Math.random();
    const col = pick < 0.34 ? '32,28,24' : pick < 0.64 ? '92,84,72' : pick < 0.86 ? '62,58,48' : '78,66,52';
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
   * happened when this was a plain emissive colour turned up.
   *
   * AND SHE WAS THE DARKEST PLACE IN THE GAME. Measured as mean screen
   * luminance: the open beach reads 19, her hold read 12.5 and HER DECK
   * READ 10.7 — you climb aboard a wreck and find the darkest ground on the
   * walk, and the hold, which is where the head and the way through both
   * are, was a black box you felt your way across. One global multiplier
   * cannot fix it: at the factor that brings the hold up the deck is still
   * dark, and at the factor that brings the deck up the hold goes flat. So
   * the lifts are per material — the interior most, her deck next, her side
   * least, because her side was the one surface already catching the
   * moon. */
  const M = {
    /* THE MAP AND THE EMISSIVE MAP ARE THE SAME TEXTURE. They used to be two
     * separate calls — two different random draws of the same hull — so the
     * lift never landed on the marks it was meant to be lifting, and half
     * of what was drawn on her was cancelled by a highlight somewhere else.
     * And every one of them carries its own NORMAL MAP now: she is lit by
     * one low moon, and without relief a hull drawn with eighteen strakes
     * on it is a smooth brown wall. */
    hull: new THREE.MeshStandardMaterial(Object.assign({ color: 0xbdb6ab, roughness: 0.94, metalness: 0.06, emissive: 0x8d8478, emissiveIntensity: 0.23, side: THREE.DoubleSide }, hullSet([1, 1]))),
    deck: new THREE.MeshStandardMaterial(Object.assign({ color: 0xa89e92, roughness: 0.97, metalness: 0.05, emissive: 0x7d7468, emissiveIntensity: 0.34, side: THREE.DoubleSide }, hullSet([1, 1], { flat: true }))),
    plank: new THREE.MeshStandardMaterial(Object.assign({ color: 0x9a9184, roughness: 0.95, metalness: 0.05, emissive: 0x6c6459, emissiveIntensity: 0.28, side: THREE.DoubleSide, flatShading: true }, hullSet([2, 1.4]))),
    paint: new THREE.MeshStandardMaterial({ map: paintTex(), color: 0xa8b0a6, roughness: 0.93, metalness: 0.06, emissive: 0x5c6b60, emissiveIntensity: 0.30, emissiveMap: paintTex(), side: THREE.DoubleSide, flatShading: true }),
    inner: new THREE.MeshStandardMaterial({ map: innerTex(), color: 0xa89684, roughness: 1, metalness: 0.04, emissive: 0x6e5c44, emissiveIntensity: 0.86, emissiveMap: innerTex(), side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ map: metalTex(), color: 0x8c8078, roughness: 0.86, metalness: 0.30, emissive: 0x3a2e22, emissiveIntensity: 0.46, emissiveMap: metalTex(), flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ map: innerTex(), color: 0x5c5248, roughness: 1, metalness: 0, emissive: 0x332c22, emissiveIntensity: 0.70, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex(), color: 0x8a7a62, roughness: 1, metalness: 0, emissive: 0x4c412e, emissiveIntensity: 0.46, emissiveMap: woodTex(), flatShading: true }),
    rope: new THREE.MeshStandardMaterial({ map: woodTex(), color: 0x6e6449, roughness: 1, metalness: 0, emissive: 0x2e2a1e, emissiveIntensity: 0.30, flatShading: true }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x22201e, roughness: 1, metalness: 0, emissive: 0x0c0b0a, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8c7238, roughness: 0.55, metalness: 0.62, emissive: 0x2a2010, flatShading: true }),
    // kept polished where a hand has been on it for forty years
    gold: new THREE.MeshStandardMaterial({ color: 0xd9ab46, roughness: 0.34, metalness: 0.78, emissive: 0x6a4f16, emissiveIntensity: 0.65, flatShading: true }),
    /* GLASS WRITES NO DEPTH. The panes are merged into one mesh whose sort
     * position is the ship's origin, not the window, so it can draw BEFORE the
     * stars 190 m out — and with depth written it then hid them: from the helm
     * the three stars the wheel puzzle is about read 81-103 in brightness
     * through the windscreen against 164-554 without it. */
    glass: new THREE.MeshStandardMaterial({ color: 0x2c363e, roughness: 0.26, metalness: 0.22, emissive: 0x0a1014, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    flesh: new THREE.MeshStandardMaterial({ color: 0x6e6152, roughness: 1, metalness: 0, emissive: 0x1a150f, flatShading: true }),
    gore: new THREE.MeshStandardMaterial({ color: 0x4a1c18, roughness: 0.75, metalness: 0, emissive: 0x1a0808, flatShading: true }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a221a, roughness: 1, metalness: 0, emissive: 0x0a0806, flatShading: true }),
    // he is held close in the end, so his materials have to separate
    bone: new THREE.MeshStandardMaterial({ color: 0x9a927e, roughness: 0.86, metalness: 0, emissive: 0x26241c, flatShading: true }),
    tooth: new THREE.MeshStandardMaterial({ color: 0xa8a08a, roughness: 0.62, metalness: 0, emissive: 0x2a2820, flatShading: true }),
    eye: new THREE.MeshStandardMaterial({ color: 0x4c4a42, roughness: 0.42, metalness: 0, emissive: 0x14140f }),
    bruise: new THREE.MeshStandardMaterial({ color: 0x3e2c34, roughness: 1, metalness: 0, emissive: 0x120c10, flatShading: true }),
    sole: new THREE.MeshStandardMaterial({ map: soleTex(), color: 0xa2968a, roughness: 1, metalness: 0, emissive: 0x6e6050, emissiveIntensity: 0.54, emissiveMap: soleTex(), side: THREE.DoubleSide }),
    reg: new THREE.MeshStandardMaterial({ map: regTex(), roughness: 1, emissive: 0x121416, transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    sand: opts.sandMat || new THREE.MeshStandardMaterial({ color: 0x6d7d99, roughness: 0.95, emissive: 0x27324a, flatShading: true }),
    /* What shows through the stove-in sole. NOT the beach material: that
     * one is lit for open moonlight and inside a dark hold it reads as a
     * pool of glowing blue rather than the wet sand she is aground on. */
    /* DOUBLE-SIDED, LIKE THE SOLE — and this is the blue in her floor.
     * The sand under her boards is built on the same grid as the sole and
     * that grid's triangles are wound DOWNWARD: `M.sole` gets away with it
     * because it is DoubleSide, and this did not, so the one surface whose
     * entire job is to be what you see through the gouges was invisible
     * from above. What you saw instead was the beach's own plane at y = 0
     * — open moonlit sand, blue, framed by brown boards, which reads as
     * standing water. Measured both ways at the big gouge: from above, the
     * beach at 0.000; from below, this layer at 0.120, present all along. */
    /* AND IT HAS TO BE LIT LIKE THE BOARDS BESIDE IT. Nothing down here is
     * reached by the moon, so every interior material carries its own
     * emissive lift off its own map, and this one was at 0x2f2b24 x 0.40
     * against the sole's 0x6e6050 x 0.54 — a third of its neighbour. With
     * the winding fixed the sand was finally visible and every gouge read
     * as a BLACK hole instead of a blue one. A shade under the boards and a
     * little cooler, which is what damp sand in shadow next to dry timber
     * actually is. */
    wetsand: new THREE.MeshStandardMaterial({ map: wetTex(), color: 0x94897b, roughness: 1, metalness: 0, emissive: 0x6a6255, emissiveIntensity: 0.55, emissiveMap: wetTex(), flatShading: true, side: THREE.DoubleSide }),
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
      const dip = soleDip;
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
      /* 0.07, NOT 0.18 — AND THE DIP IS WHY. The rule above is right and
       * the number was wrong. Every vertex here is `HOLD_Y - yOff - dip`,
       * and `dip` reaches 0.133 where she is most stove in, so at yOff 0.18
       * this layer ran from +0.02 down to -0.06: under the beach plane at
       * y = 0 over the deepest part of every dish. And the sole is TORN in
       * exactly those places, because that is where she struck — so through
       * the biggest gouges you were looking past this layer at open
       * moonlit beach, which is the bright blue pool in the floor.
       * Measured: 58 of 888 points in her hold answered with the beach's
       * own sand. At 0.07 the layer runs 0.047..0.13, always clear of the
       * plane and always a hand's width under the boards. */
      build(0.07, M.wetsand, false, true);   // the beach she is aground on

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
        /* AND NONE ACROSS THE SHELL DOOR. Two of these land at x = -1.28
         * and -0.40 against a doorway spanning -1.25 to 0.05, so one stood
         * dead in the middle of the only way through her and the other on
         * its edge — the timber in front of the door. Her frames already
         * skip the breach for exactly this reason; the door is the other
         * hole in her side. */
        if (sg < 0 && x > DOOR_X - DOOR_W / 2 - 0.30 && x < DOOR_X + DOOR_W / 2 + 0.30) continue;
        const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y) - 0.10) - 0.10;
        HULL.add(slab(0.13, DECK_Y - HOLD_Y, 0.13, M.wood, x, (HOLD_Y + DECK_Y) / 2, sg * hz));
      }
      /* AND NO BEAM ACROSS THE COMPANION WELL. Two of these landed at
       * x = -0.4 and x = 1.35, straight over the ladder — measured, 1.89 m
       * of headroom on the tread below one — so from the hold the way up
       * was a flight of steps with a timber lying across it at chest
       * height. It reads as barred even though you walk under it. A real
       * boat frames an opening with carlings and puts no beam through it,
       * which is the same reason the frames already skip the breach. */
      if (i % 2 === 0 && !(x > STAIR_X0 - 0.35 && x < STAIR_X1 + 0.35)) {
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
    const CX0 = 3.4;   // CX1 (6.9) went with the stove — it's STOVE_X now
    const wall = (x) => Math.min(HOLD_HZ, halfAtY(x, HOLD_Y + 0.9)) - 0.10;
    // a bulkhead with a doorway through it, four pieces round the hole
    {
      const bx = CX0 - 0.35, hz = Math.min(HOLD_HZ, halfAtY(bx, DECK_Y) - 0.10);
      /* WIDENED TO 1.45 m. At 1.10 the doorway plus a body's radius left
       * 0.35 m to pass through, the tightest point in the whole room — the
       * owner asked for the quarters to stop feeling like a trap, and a
       * hole this narrow is most of what a trap IS. The barricade that
       * fills it while it stands is refit to match, below. */
      const dz0 = -0.725, dz1 = 0.725, dh = 1.95;
      for (const [z0, z1] of [[-hz, dz0], [dz1, hz]])
        HULL.add(slab(0.10, DECK_Y - HOLD_Y, z1 - z0, M.plank, bx, (HOLD_Y + DECK_Y) / 2, (z0 + z1) / 2));
      HULL.add(slab(0.10, DECK_Y - HOLD_Y - dh, dz1 - dz0, M.plank, bx,
        HOLD_Y + dh + (DECK_Y - HOLD_Y - dh) / 2, (dz0 + dz1) / 2));
      for (const d of [-1, 1])                       // jambs and head
        HULL.add(slab(0.14, dh, 0.12, M.wood, bx, HOLD_Y + dh / 2, d * dz1));
      HULL.add(slab(0.14, 0.12, dz1 - dz0 + 0.24, M.wood, bx, HOLD_Y + dh, 0));
      HULL.add(slab(0.14, 0.06, dz1 - dz0, M.wood, bx, HOLD_Y + 0.03, 0));   // step over
      /* AND IT IS A WALL, SO IT IS SOLID. It was drawn and never collided:
       * measured by walking her, from the hold at lz +-2.0 you passed
       * straight through this bulkhead and fetched up at lx 6.8, in the
       * middle of the crew space, while the DOORWAY itself was blocked by
       * the mess table's own box — exactly inverted. One box per side of
       * the hole; the head over the door is at 1.95 and you walk under it. */
      for (const [z0, z1] of [[-hz, dz0], [dz1, hz]])
        solidLow(bx, (z0 + z1) / 2, 0.22, z1 - z0);
    }

    /* HER BERTHS ARE A REAL BUNK BED NOW, twice, one against each side —
     * see HER FURNITURE below. What stood here was four slab berths: a
     * board, a lee board, a box for a mattress and two stanchions each.
     * A blanket shoved down the end of the lower one goes with them,
     * because a blob of `M.rope` on a bunk that is no longer there is a
     * lump lying in mid-air. */

    /* the stove, aft to PORT now, in the corner by the table — moved off
     * starboard (where it stood on its own, away from everything) to sit
     * with the mess instead: same wall as the table, continuing past the
     * chairs to the true aft corner, so cooking and eating are the one job
     * they actually are on a boat this size. Checked against the table,
     * the bench, both chairs and the athwartships bunk with a flood-fill
     * of the real floor: clear of all four, nothing stranded.
     * STOVE_X/STOVE_Z are the only numbers that move; everything about the
     * stove itself is relative to them. Pulled off the port planking and
     * in a little further (was -3.15): it sat jammed against the hull with
     * its back to the wall; now it stands in the open floor between that
     * wall and the athwartship bunk on the centreline, clear of both by a
     * real gap rather than touching one of them. */
    const STOVE_X = 6.75, STOVE_Z = -2.30;
    HULL.add(slab(0.62, 0.72, 0.56, M.steel, STOVE_X, HOLD_Y + 0.36, STOVE_Z));
    HULL.add(slab(0.70, 0.07, 0.64, M.steel, STOVE_X, HOLD_Y + 0.74, STOVE_Z));
    HULL.add(cyl(0.09, 0.09, 1.9, 7, M.steel, STOVE_X, HOLD_Y + 1.72, STOVE_Z));
    HULL.add(slab(0.26, 0.22, 0.03, M.dark, STOVE_X - 0.31, HOLD_Y + 0.36, STOVE_Z));   // its door
    HULL.add(cyl(0.13, 0.11, 0.16, 8, M.steel, STOVE_X, HOLD_Y + 0.86, STOVE_Z + 0.16));  // kettle
    solidLow(STOVE_X, STOVE_Z, 0.75, 0.7);

    /* ---- THE BARRICADE ACROSS THE QUARTERS DOOR --------------------
     * The mess table and its two stools are not standing in the middle of
     * the crew space any more: they are dragged across the doorway and
     * jammed there, the way a room is shut from the INSIDE by people
     * keeping something out. So it is built aft of the bulkhead, which is
     * the side the hands were on, and you meet it through the opening.
     *
     * It is its OWN GROUP, never baked: `bakeGroup` merges direct mesh
     * children by material and skips Groups, so this survives whole and
     * main.js can break it into the pieces it is made of — the coat
     * stand's rule, and the work table's. Every piece carries a `part`
     * tag, which is what staggers the collapse.
     *
     * Dimensions are stated in their FINAL extents rather than built at
     * the table's old orientation and rotated into place: a slab turned
     * through a right angle and then tilted is three numbers nobody can
     * read, and the doorway is 1.45 m wide, so what matters is that
     * the table top is WIDER than the hole it is wedged across. */
    const BARRICADE = new THREE.Group();
    const bpart = (m, tag) => { m.userData.part = tag; BARRICADE.add(m); return m; };
    {
      /* IT HAS TO FILL THE HOLE, AND THE HOLE IS BIGGER NOW. The doorway
       * is 1.45 m wide and 1.95 m tall — widened from the 1.10 m it shipped
       * at, because a body's radius either side of that left 0.35 m to pass
       * through, and every dimension across the opening here is scaled by
       * the same 1.45/1.10 the doorway grew by, so the pile still fills
       * exactly what it always filled: the whole hole, with margin. A
       * barricade is a PILE: the table jammed across the middle, boards
       * nailed over the gaps above and below it, and the stools wedged in
       * at the foot holding the whole thing up. Every board is wider than
       * the hole, because that is why it cannot be pushed through. */
      const bx2 = CX0 - 0.35 + 0.17;                 // in the opening, just inside
      // the mess table, on edge, jammed across the middle of the door
      bpart(slab(0.08, 0.66, 1.77, M.wood, bx2, HOLD_Y + 1.02, 0.02, 0.09, 0, 0.14), 'top');
      // its legs, still on it, jutting back into the hold
      for (const sy of [-1, 1]) for (const sz of [-1, 1])
        bpart(slab(0.08, 0.70, 0.08, M.wood, bx2 - 0.30, HOLD_Y + 1.02 + sy * 0.24,
          sz * 0.61, 0.2 * sz, 0, 1.30 + sy * 0.16), 'leg');
      // boards nailed over what the table does not cover
      const BOARDS = [
        [1.66, 1.71, -0.16, -0.06],
        [1.90, 1.61, 0.13, 0.05],
        [0.52, 1.74, 0.10, -0.03],
        [0.26, 1.66, -0.07, 0.04],
      ];
      for (const [y, wz, rz, dz] of BOARDS)
        bpart(slab(0.05, 0.16, wz, M.plank, bx2 - 0.13, HOLD_Y + y, dz, 0, 0, rz), 'plank');
      // the two stools, wedged in at the foot holding it up
      for (const sz of [-1, 1]) {
        bpart(cyl(0.17, 0.15, 0.06, 8, M.wood, bx2 - 0.10, HOLD_Y + 0.70, sz * 0.45, 0, 0, sz * 0.55), 'stool');
        bpart(cyl(0.05, 0.05, 0.48, 6, M.wood, bx2 - 0.10, HOLD_Y + 0.44, sz * 0.45, 0, 0, sz * 0.55), 'stool');
      }
      BARRICADE.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      /* AND `bakeStatic` MUST NOT LOOK AT IT EITHER. The note above says
       * "never baked" and names `bakeGroup`, which skips Groups — but
       * main.js merges the whole wreck by material as well, and THAT one
       * traverses, takes every unnamed mesh and re-parents the result.
       * Measured in the game: the barricade's thirteen slabs came out
       * orphaned and its group empty, so `smashBarricade` iterated nothing
       * — the collision was spliced out of PROPS, the boards never left,
       * and what you got for breaking the door was a barricade you could
       * walk through and could still see. `noBake` on the group is the one
       * flag both merges read. */
      BARRICADE.userData.noBake = true;
      S.add(BARRICADE);
      /* Solid while it stands. main.js splices this exact array out of
       * PROPS when it comes down, so the doorway opens the moment the
       * last board does. */
      const bbox = [bx2 - 0.34, -0.87, bx2 + 0.20, 0.87, HOLD_Y - 0.4, HOLD_Y + 2.4];
      PROPS.push(bbox);
      S.userData.barricade = { group: BARRICADE, box: bbox, x: bx2 };
    }
    // the mug and the lamp went on the deck when the table was dragged
    HULL.add(cyl(0.055, 0.05, 0.09, 8, M.plank, 4.42, soleY(4.42, 0.62) + 0.028, 0.62, 1.4, 0, 0));
    HULL.add(slab(0.12, 0.20, 0.12, M.glass, 4.86, soleY(4.86, -0.34) + 0.075, -0.34, 0, 0.4, 1.2));
    HULL.add(cyl(0.08, 0.09, 0.06, 7, M.steel, 4.86, soleY(4.86, -0.34) + 0.03, -0.34));

    /* ---- AND IT HAS TO LOOK LIVED IN ---------------------------------
     * Taking the mess table out to the door left the middle of her crew
     * space an empty floor, and the first attempt to fill it was wrong in
     * a way worth writing down: a dozen TINY things — playing cards, coal,
     * a spilled tin, blobs of cloth — scattered over the boards. At this
     * texel count and in this light none of them reads as the object it is
     * meant to be; they read as small pale lumps lying about, which is
     * exactly "floating geometry that looks bad". Litter is detail you add
     * to a room that already has furniture in it, not a substitute for it.
     *
     * So: FEWER THINGS, EACH BIG ENOUGH TO BE WHAT IT IS. A table you can
     * tell is a table, a chest with bands and a hasp, a bench, a bucket.
     * Everything stands on `soleY` — her boards are dished and run 0.12 to
     * 0.20, never at HOLD_Y, which is what had the first pass hovering. */
    {
      /* The mess table and the bench are `table_3` and `bench_4` out of
       * the furniture set now — see HER FURNITURE. What stands on the
       * table is still built, because a mug and a lamp are not in that
       * set and a table with nothing on it is not a table anybody used.
       * Their height is the MODEL'S top (0.825) and not the slab's own
       * 0.72, or they float a hand's width over it.
       *
       * TX/TZ MUST MATCH `table_3`'s OWN PLAN ENTRY. They are a second copy
       * of the same number by necessity — the table is built in one place
       * and dressed in another, seconds apart in the file — and the last
       * time the table moved this pair did not move with it: the candle
       * and the cup went on standing where the table USED to be, which is
       * open floor now, while the table itself sat three metres away with
       * nothing on it. */
      const TX = 4.75, TZ = -3.05, TOP = 0.825, ty = soleY(TX, TZ) - 0.02;
      HULL.add(cyl(0.055, 0.05, 0.10, 8, M.plank, TX - 0.36, ty + TOP + 0.05, TZ + 0.14));
      HULL.add(slab(0.13, 0.21, 0.13, M.glass, TX + 0.32, ty + TOP + 0.14, TZ - 0.12));
      HULL.add(cyl(0.085, 0.095, 0.06, 7, M.steel, TX + 0.32, ty + TOP + 0.055, TZ - 0.12));
      HULL.add(cyl(0.02, 0.02, 0.13, 6, M.steel, TX + 0.32, ty + TOP + 0.30, TZ - 0.12));

      /* ---- a sea chest, IN FRONT OF THE KEG, and it opens --------------
       * IT IS THE OWNER'S OWN MODEL NOW (`assets/chest.glb`, out of
       * tools/chest_pack.py), and the useful thing about the delivered file
       * is that the artist modelled it in THREE PIECES — a body, a lid and a
       * padlock — so the lid was already its own mesh and could be hung on a
       * real hinge rather than carved out of a solid. What stood here before
       * was ten boxes with a slab for a lid.
       *
       * The hinge is MEASURED, not typed: the packer writes the body's own
       * rim height and its back edge into the file's extras and `dressChest`
       * hangs the lid on those, so repacking the chest cannot leave the lid
       * swinging about a line that is no longer where the wood is.
       *
       * The scan lands over the network long after this file has run, so
       * what is built here is the ARRANGEMENT — a group at the spot, a pivot
       * at the hinge, a collision box and an invisible proxy for the
       * crosshair — and `S.userData.dressChest(root)` fills it when the
       * download arrives. The proxy is why it has to be built empty rather
       * than added later: an interactable's meshes are snapshotted ONCE, at
       * registration, so a group that is empty at that moment is a group the
       * crosshair can never find again.
       *
       * IT STANDS IN FRONT OF THE KEG (barrel_2 in HER FURNITURE, just aft
       * of it in the same starboard nook) with its lock facing into the
       * room, so the lid opens away from you and toward the barrel — which
       * is why the swing is capped where it is, in main.js. */
      const KX = 6.50, KZ = 2.22, ky = soleY(KX, KZ);
      const CHEST = new THREE.Group();
      CHEST.position.set(KX, ky, KZ);
      CHEST.rotation.y = Math.PI;              // the model's lock is on its +z; the room is on -z from here
      const chestLid = new THREE.Group();      // the hinge, filled in by dressChest
      CHEST.add(chestLid);
      {   // the crosshair's own target, sized to the chest and never drawn
        const g = new THREE.BoxGeometry(0.98, 0.68, 0.70);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        m.name = 'hitProxy'; m.visible = false; m.position.y = 0.34;
        CHEST.add(m);
      }
      CHEST.userData.noBake = true;            // the barricade's own reason: it must survive whole
      S.add(CHEST);
      const cbox = [KX - 0.52, KZ - 0.38, KX + 0.52, KZ + 0.38, HOLD_Y - 0.4, HOLD_Y + 1.0];
      PROPS.push(cbox);
      S.userData.chest = { group: CHEST, lid: chestLid, box: cbox, x: KX, z: KZ };
      /* AND IT IS DRESSED WHEN THE MODEL LANDS. The lid is re-parented onto
       * the hinge with the hinge's own offset taken back out of it, so it
       * keeps the pose the artist drew and turns about the right line; the
       * padlock rides the BODY, because a chest you have unlocked has its
       * lock hanging on the staple and not swinging about in the air. */
      S.userData.dressChest = (root) => {
        const ex = (root.userData && root.userData.bw_chest) || {};
        const hinge = ex.hinge || [0.3464, -0.321];
        chestLid.position.set(0, hinge[0], hinge[1]);
        root.updateMatrixWorld(true);
        const parts = [];
        root.traverse((o) => { if (o.isMesh) parts.push(o); });
        /* AND IT IS LIT LIKE EVERYTHING ELSE DOWN HERE. No moon reaches the
         * inside of her, so every interior material in this file carries its
         * own emissive lift off its own map — an unlifted PBR chest below
         * decks is a black box with a lock on it. Cloned once, because the
         * same material is on all three pieces. */
        const seen = new Map();
        const lift = (m) => {
          if (!m) return m;
          if (seen.has(m)) return seen.get(m);
          const c = m.clone();
          c.emissive = new THREE.Color(0xffffff);
          c.emissiveMap = c.map;
          c.emissiveIntensity = 0.42;
          c.metalness = 0;                       // METALNESS IS A TRAP: no environment map here
          c.roughness = Math.max(0.5, c.roughness || 0.8);
          seen.set(m, c);
          return c;
        };
        for (const o of parts) {
          const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
          const mesh = new THREE.Mesh(geo, lift(o.material));
          mesh.castShadow = mesh.receiveShadow = false;
          if (/lid/i.test(o.name)) {
            mesh.position.set(0, -hinge[0], -hinge[1]);
            chestLid.add(mesh);
          } else CHEST.add(mesh);
        }
        return CHEST;
      };

      // ---- a bucket, and a coil of line by it
      HULL.add(cyl(0.16, 0.13, 0.28, 9, M.steel, 6.15, soleY(6.15, 1.05) + 0.14, 1.05));
      HULL.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 4, 11), M.rope)
        .translateX(5.70).translateY(soleY(5.70, 1.35) + 0.05).translateZ(1.35).rotateX(Math.PI / 2));

      /* NO SHELF. There was one here, and its comment called it "a shelf on
       * the after bulkhead" — it was at z = -1.35 against a side at -3.60
       * and an after bulkhead at lx 7.2, which is to say it was bolted to
       * nothing and hung in the middle of the room with five tins and a
       * bottle standing in mid-air on it. A FIXTURE'S COMMENT IS NOT ITS
       * POSITION: anything described as being ON a wall has to take that
       * wall's own coordinate (`wall(x)` here, as the oilskin hooks below
       * do), never a number typed beside it. */

      // ---- oilskins on hooks, and a dead lamp off a beam
      for (const [hx, sg2] of [[5.4, -1], [6.0, -1], [4.2, 1]]) {
        const wzh = wall(hx);
        HULL.add(slab(0.05, 0.06, 0.05, M.steel, hx, HOLD_Y + 1.70, sg2 * (wzh - 0.12)));
        const coat = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), M.rope);
        coat.scale.set(0.5, 1.35, 0.45);
        coat.position.set(hx, HOLD_Y + 1.22, sg2 * (wzh - 0.18));
        coat.rotation.y = rnd(hx) * 3; HULL.add(coat);
      }
      HULL.add(cyl(0.02, 0.02, 0.22, 5, M.steel, 5.0, DECK_Y - 0.34, 0.7));
      HULL.add(slab(0.15, 0.23, 0.15, M.glass, 5.0, DECK_Y - 0.57, 0.7));
      HULL.add(cyl(0.10, 0.11, 0.06, 7, M.steel, 5.0, DECK_Y - 0.45, 0.7));

      // ---- a chart and a photograph pinned to the forward bulkhead
      HULL.add(slab(0.03, 0.34, 0.46, M.plank, CX0 - 0.28, HOLD_Y + 1.42, -1.55));
      HULL.add(slab(0.03, 0.16, 0.13, M.plank, CX0 - 0.28, HOLD_Y + 1.06, -1.02));
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
    /* NO COLLIDER ON THE BOARDS. They are four 6 cm boards laid flat —
     * 26 cm of stacked timber, which is a thing you step over, not a
     * wall. As a solid they stood across the port waist a hand's breadth
     * from the coaming and closed the only way forward on that side. The
     * beach's rocks have carried this rule since they went in: anything
     * whose crown lands under a step gets no collider at all. */
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

  /* ---- SHE HAS NO NAME ON HER ----------------------------------------
   * She carried LIMULUS in foot-high paint across her topsides and on a
   * board on the wheelhouse, and the owner's word is that both come off.
   * They are removed rather than worn away: paint eaten to nothing is
   * still a rectangle of different weathering on the planking, and what
   * is wanted is a hull that never told you what she was called. Her
   * REGISTRATION stays on the bow — that is a number, not a name, and
   * every working boat the references show carries one. */

  /* ---- the wheelhouse -------------------------------------------------
   * A glasshouse on a raised casing: glass right round the front and both
   * sides, a door in the +Z side with steps up to it. FOUR pieces round
   * the doorway and no full-width slab as well (8). */
  const BR = new THREE.Group(); S.add(BR);
  const F = DECK_Y + BR_STEP, T = F + BR_H;
  const WIN0 = F + 0.95, WIN1 = F + 2.28;      // your eye at the helm is F + 1.72
  {
    const cx = (BR_X0 + BR_X1) / 2, w = BR_X1 - BR_X0, POST = 0.16, zc = BR_HZ;

    /* HER SOLE AND THE CASING UNDER IT MUST NOT SHARE A PLANE. The casing
     * ran the full BR_STEP, so its top face sat at exactly F; the sole is
     * laid on top of it and ITS top face is also exactly F. Two surfaces,
     * two materials, one plane — measured, 103 coplanar pairs at gap
     * 0.0000 across the whole wheelhouse floor, which is every bit of the
     * flicker in there. The casing now stops INSIDE the boards: its top is
     * at F - 0.06 and the sole spans F - 0.12 to F, so the join is buried
     * and nothing is left sharing a plane with anything. */
    /* AND ITS UNDERSIDE MUST NOT LIE ON THE DECK EITHER. Fixing the sole
     * above moved the casing's TOP out of the boards and left its BOTTOM
     * exactly on DECK_Y — the same plane the deck itself is on. Seen from
     * below that is her whole ceiling over the crew space flickering
     * between planking and green paint, which is the glitch in the ceiling:
     * measured from inside the hold, 110 coplanar pairs at gap 0.0000, and
     * the count is exactly the number of sample rays that fall inside the
     * wheelhouse footprint. Three centimetres of lift is invisible at this
     * texel density and there is nothing left sharing a plane. */
    BR.add(slab(w + 0.26, BR_STEP - 0.09, zc * 2 + 0.26, M.paint, cx, DECK_Y + 0.03 + (BR_STEP - 0.09) / 2, 0));
    BR.add(slab(w, 0.12, zc * 2, M.deck, cx, F - 0.06, 0));
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
    // (the small pane that stood here is gone: the fish plaque hangs on bare
    // boards, and the pane read as a grey card behind him)
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
    /* SHE HAS TO BE WALKABLE PAST HER OWN DAVIT. At HATCH_HZ + 0.75 the
     * king post's bedplate stood 0.75 m off the coaming — less than a
     * body with the coaming's own margin either side of it — so the
     * starboard waist was shut and the fore deck could not be reached
     * from the stair at all. Out at the rail it leaves 0.92 m inboard
     * and 1.03 outboard, and a davit swings a load over the side
     * anyway; the boom is parametric, so it simply gets longer. */
    const postZ = HATCH_HZ + 1.75, POST_H = 3.2, ARM_Y = 3.05;

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
    solid(GAFF_X, postZ, 0.62, 0.62);

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
    /* NOTHING STANDS IN EITHER WAIST. The route through her is breach →
     * hold → stair → deck → wheelhouse, and the only way from the stair
     * head to the wheelhouse door is down one side of the house. The
     * waist there is 1.70 m of walkable deck (the house at 2.35, the rail
     * at 4.31) and a stowed basket stack is 1.32 of it with a body's
     * radius round it — so gear in the waist is not clutter, it is a
     * 0.38 m slot at the rail, and the walk test could not find it at
     * all. Her gear goes forward of the stair and aft of the house
     * instead, which is where a working boat would stow it anyway. */
    const stacks = [[-3.0, -3.45], [-1.4, -3.50], [9.2, -3.00], [10.6, -2.90], [0.2, -3.50]];
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

    for (const [x, z, r] of [[-7.2, 2.6, 0.34], [-5.3, 2.90, 0.30], [8.2, 0.90, 0.32]]) {
      const b = new THREE.Group(); b.position.set(x, DECK_Y, z);
      b.add(cyl(r, r * 0.92, 0.82, 9, M.wood, 0, 0.41, 0));
      for (const yy of [0.14, 0.68])
        b.add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.015, 0.024, 4, 11), M.steel)
          .translateY(yy).rotateX(Math.PI / 2));
      S.add(bakeGroup(b));
      solid(x, z, r * 2 + 0.1, r * 2 + 0.1);
    }

    S.add(slab(0.85, 0.55, 0.62, M.wood, -1.9, DECK_Y + 0.28, 3.45, 0, 0.22, 0));   // crate
    S.add(slab(0.52, 0.26, 0.30, M.steel, -1.9, DECK_Y + 0.68, 3.45, 0, 0.22, 0));  // toolbox
    solid(-1.9, 3.45, 0.95, 0.75);
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
    S.add(coil(-3.6, 3.60, 0.42));
    S.add(coil(8.4, -3.30, 0.36));
    solid(-3.6, 3.60, 0.9, 0.9);

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

  /* ---- HER FURNITURE, WHICH IS A REAL SET AND NOT BOXES ---------------
   * The owner's wooden-asset set through `tools/furniture_pack.py`:
   * tables, chairs, benches, barrels and a bunk bed, one named node each
   * in `assets/furniture.glb`. What was here before was slabs — a table
   * was five boxes, a bunk was four — and at this texel count a box with
   * a wood map on it reads as a box with a wood map on it.
   *
   * THE PLAN IS SYNCHRONOUS AND THE MESHES ARE NOT. `makeShipwreck` runs
   * at module time and the glb lands over the network seconds later, so
   * the two are separated: the SOLID BOXES go into PROPS here, from the
   * plan, and `S.userData.furnish(scene)` stands the pieces when they
   * arrive. Collision is therefore right on the first frame whether the
   * download has finished or not — which is the same arrangement the
   * captain's head and the boat key already use.
   *
   * AND NOTHING FLOATS. Her boards are dished and run 0.14 to 0.24 across
   * one room; a rigid table put down at `soleY` of its own centre stands a
   * corner up to five centimetres off them. Every piece takes the LOWEST
   * board under its own footprint instead, so a leg is buried rather than
   * hanging — which is what a hundredweight of oak sitting on a buckled
   * sole for sixty years actually does.
   *
   * THE BARRICADE IS NOT TOUCHED. It is the door you have to break to get
   * into her quarters, it is measured against a 1.45 by 1.95 hole, and its
   * crosshair meshes are snapshotted by `addInteractable` at registration
   * — a piece that lands later would be invisible to the blade. */
  {
    /* the lowest board anywhere under a footprint, so a corner cannot hang */
    const soleUnder = (x, z, w, d) => {
      let lo = Infinity;
      for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++)
        lo = Math.min(lo, soleY(x + (i / 3 - 0.5) * w, z + (j / 3 - 0.5) * d));
      return lo;
    };
    /* [piece, x, z, yaw, {w,d} its footprint for PROPS, opts]
     *   deck: stand it on the weather deck instead of the sole
     *   loose: no collision box — small enough to walk over, or lying down
     *   tilt: it has been lying in a wreck for sixty years */
    const PLAN = [
      // ---- her quarters, aft of the barricaded door -------------------
      /* MESS AND STOVE TOGETHER TO PORT, THE STORES TO STARBOARD. The
       * stove stood on its own down the starboard side for a while and it
       * read as a second, disconnected room; moved to port it sits with
       * the table instead, in the aft corner past the chairs — cooking and
       * eating are the one job they are on a boat this size, and the true
       * corner (against both the hull and the aft bulkhead) is where a
       * stove actually goes, not stranded mid-wall. A straight bunk stands
       * forward to starboard, where the four slab berths used to be; the
       * second is turned ATHWARTSHIPS across the aft end, on the
       * centreline, which is what a berth built into a transom always is
       * and what keeps the two halves of the room apart without a wall —
       * clear of the mess, the stove and both stores by a flood-fill of
       * the actual floor, not eyeballed. The model's long axis is its own
       * Z: the quarter turn on the straight bunk lays that fore-and-aft,
       * and no turn at all on the aft one leaves it athwartships. Still
       * four berths, still two bunk_bed pieces. */
      ['bunk_bed', 4.30, 2.95, Math.PI / 2, 2.06, 1.14],
      ['bunk_bed', 6.55, 0.00, 0, 1.14, 2.06],
      /* The mess table, hard against the port planking with a bench drawn
       * up to it on the aisle side and a chair at each end — the door is
       * 1.45 m wide now, so this can sit close to it without narrowing the
       * doorway's own clearance the way it did when the door was 1.10.
       * The stove itself is built with the hull, above (`STOVE_X/STOVE_Z`)
       * — it is not a furniture piece, it is riveted to her. */
      ['table_3', 4.75, -3.05, 0, 1.44, 0.96],
      ['bench_4', 4.75, -2.33, 0, 1.62, 0.44],
      ['chair_2', 3.55, -2.70, Math.PI, 0.50, 0.56],
      ['chair_3', 5.95, -2.70, Math.PI * 0.86, 0.50, 0.56],
      /* `chair_4` is not here. It is a footstool 0.45 m across and 0.50
       * tall, and tipped over on her boards at this texel count it reads as
       * a flat slab lying on the floor — the crew space's own lesson about
       * litter, which is that a thing too small to be what it is reads as a
       * small pale lump. */
      /* THE STORES, TO STARBOARD, IN THE POCKET BETWEEN THE TWO BUNKS. One
       * of them (`barrel_2`) is the keg the sea chest stands in front of —
       * see the chest, above, which fronts it by name in its own comment.
       * The other is stacked in beside them, tight against the same
       * stretch of hull. Checked clear of both bunks, the chest and each
       * other with the same flood-fill the rest of the room is. */
      ['barrel_2', 6.50, 3.05, 0.9, 0.62, 0.62],
      ['barrel_4', 5.75, 3.15, 2.1, 0.80, 0.80],
      // ---- the bow of her hold, forward of the breach ------------------
      ['barrel_5', -7.30, -2.45, 0.4, 0.88, 0.88],
      ['barrel_4', -6.45, -2.84, 2.6, 0.80, 0.80],
      ['barrel_2', -5.70, -3.12, 1.7, 0.62, 0.62],
      // one of them staved in, lying where it came adrift
      ['barrel_3', -7.10, -1.15, 0.3, 1.40, 1.44],
      ['barrel_1', -7.50, 2.55, 2.8, 0.96, 0.84],
      // ---- her hold: the bench she was worked over --------------------
      ['table_1', -4.20, -2.58, 0, 2.14, 1.20],
      ['chair_5', -2.75, -2.60, 1.9, 0.70, 0.70],
      // and a long bench down the side you come in from, aft of the hole
      ['bench_3', -1.10, 2.94, 0, 3.38, 0.50],
      // ---- her afterdeck, where a working boat stows ------------------
      ['barrel_5', 9.42, 2.46, 0.6, 0.88, 0.88, { deck: true }],
      ['barrel_2', 10.06, 2.08, 2.2, 0.62, 0.62, { deck: true }],
    ];
    for (const [, x, z, , w, d, o] of PLAN) {
      if (!w || (o && o.loose)) continue;
      if (o && o.deck) solid(x, z, w, d);
      else solidLow(x, z, w, d);
    }
    /* Stand them the moment the download lands. Every piece is CLONED —
     * `barrel_2` and `barrel_4` are each used twice and a mesh has one
     * parent — and the material is cloned once per SET, because nothing
     * down here is reached by the moon and every interior surface in this
     * file carries its own emissive lift off its own map. */
    S.userData.furnish = (root) => {
      const G = new THREE.Group(); G.name = 'shipFurniture';
      const byName = new Map();
      root.traverse((o) => { if (o.isMesh) byName.set(o.name, o); });
      /* AND IT IS LIT LIKE EVERYTHING ELSE DOWN HERE, WHICH IS A NUMBER
       * AND NOT A TASTE. No moon reaches the inside of her, so every
       * interior material in this file carries its own emissive lift off
       * its own map — and these maps are a game-ready oak albedo shot for
       * a studio, far brighter than anything she is built of. Measured on
       * screen in her crew space, each set on its own against her boards
       * (which read 20.2) and her lining (16.8): table 49.7, bench 53.1,
       * chair 40.3, barrel 40.5, bunk 23.3 — the first four two and a
       * half times the floor they stand on, which is what "the furniture
       * glows" looks like.
       *
       * ONE SCALAR PER SET, ON LUMINANCE, so each keeps its own colour: a
       * per-channel pull is a colour remover, which this file has paid
       * for twice. Swept to land them all at about 24 — a shade over her
       * boards, because oak catches what light there is and a sixty-year
       * sole does not. The response is not linear (ACES), so these came
       * out of two measured points each and not out of arithmetic. */
      const K = { table: 0.402, bench: 0.380, chair: 0.550, barrel: 0.557, bunk: 1.00 };
      const mats = new Map();
      const dress = (m) => {
        let out = mats.get(m);
        if (!out) {
          const k = K[m.name] === undefined ? 0.5 : K[m.name];
          out = m.clone();
          out.color.setScalar(k);
          out.emissive = new THREE.Color(0xffffff);
          out.emissiveMap = out.map;
          out.emissiveIntensity = 0.30 * k;
          out.roughness = 1;
          out.metalness = 0;
          out.side = THREE.FrontSide;
          mats.set(m, out);
        }
        return out;
      };
      for (const [name, x, z, ry, w, d, o] of PLAN) {
        const src = byName.get(name);
        if (!src) { console.warn('shipwreck: no furniture piece named ' + name); continue; }
        const m = new THREE.Mesh(src.geometry, dress(src.material));
        m.name = '';                     // merged by bakeStatic, not held by anybody
        // its own box, turned, is what decides how much floor it covers
        src.geometry.computeBoundingBox();
        const bb = src.geometry.boundingBox;
        const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
        const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z;
        const fw = sx * c + sz * s, fd = sx * s + sz * c;
        /* HER DECK IS AT `DECK_Y`, FLAT — measured by raycast at the two
         * stations these stand on: 3.200, not the 3.255 of the breasthook
         * up forward, which is what this was written to and which left both
         * casks floating five and a half centimetres over the planking. */
        const y = (o && o.deck) ? DECK_Y : soleUnder(x, z, fw, fd);
        m.position.set(x, y, z);
        m.rotation.set(o && o.tilt ? o.tilt : 0, ry, o && o.roll ? o.roll : 0);
        G.add(m);
      }
      S.add(G);
      return G;
    };
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
    /* CLEAR OF HER GEAR. At HOLD_X0 + 2.4 / -1.7 he was sitting INSIDE one
     * of her stowed baskets — you saw the pickup's glow through the slats
     * and not the animal. Searched her sole for boards with nothing within
     * 0.85 m and took the roomiest: 2.72 m of clearance, and his belly on
     * the boards rather than floating over a dish in them. */
    crabSpot: [-4.8, 0.25, 1.8],
    lanternSpot: [0.4, DECK_Y + 0.22, 2.85],
    beamAt, sectionK, flareAt, sheerAt, rakeAt, halfAtY, deckHalf, hullPt,   // rakeAt: the walk inverts it for the deck edge
  };
  return S;
}
