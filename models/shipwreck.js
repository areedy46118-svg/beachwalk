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

/* ---- the way out of her: a second tear, low in her -Z side ----------
 * You come in through the breach on the +Z side, cross her hold, and go
 * out through this onto the far beach. It was a locked shell door for a
 * while, with the captain's key as the answer; the owner took the door out
 * and tore her open on that side as well — the key opens the sea chest in
 * her quarters now, and the way through her is open from the start.
 * Same shape as the breach (`breached` takes the side), smaller, and
 * centred on the station the door stood at so the walk to it is the walk
 * it always was: past the foot of the companion ladder.
 *
 * There is no drop-off gap in the bulwark and no ladder. Her rail runs
 * unbroken; the two tears are the way through her. */
/* AND IT IS LOW: you go out of her on your hands and knees. The owner asked
 * for the way out to be a crouch, so the tear is wider than it was and only
 * 1.7 at its crown (1.45 over her sole), its top edge broken by a hand's
 * width rather than half a metre: a standing body (1.88) does not fit
 * anywhere in it and a crouched one (1.03) fits along its middle two metres,
 * which is the stretch main.js lets you through (`FAR_PX0..FAR_PX1`). */
const FAR_X0 = -2.6, FAR_X1 = 1.0, FAR_TOP = 1.7;

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
 * both ends, and its top edge is broken. `sg` is the side: +1 is the
 * breach you come in by, -1 the smaller tear you leave by. Each is cut out
 * of her skin AND the hold lining behind it, or the hole has a wall ten
 * centimetres back. The far one's ragged edge runs on its own phase, so
 * the two are not one hole drawn twice. */
function breached(x, y, sg = 1) {
  const x0 = sg > 0 ? BREACH_X0 : FAR_X0, x1 = sg > 0 ? BREACH_X1 : FAR_X1;
  if (x <= x0 || x >= x1) return false;
  const t = (x - x0) / (x1 - x0);
  const arch = Math.pow(Math.sin(Math.PI * t), 0.55);
  const top = (sg > 0 ? BREACH_TOP : FAR_TOP) * (0.26 + 0.74 * arch)
    + (sg > 0 ? 0.28 * Math.sin(x * 2.6) + 0.17 * Math.sin(x * 5.1 + 1.7)
              : 0.07 * Math.sin(x * 3.3 + 0.9) + 0.05 * Math.sin(x * 6.2 + 2.6));
  return y < top;
}

// how high a tear reaches at a station, for laying trim along its edge
function breachTopAt(x, sg = 1) {
  if (!breached(x, 0.05, sg)) return null;
  let lo = 0, hi = BREACH_TOP * 1.7;
  for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (breached(x, m, sg)) lo = m; else hi = m; }
  return lo;
}

/* ---- the skin -------------------------------------------------------
 * Smooth-shaded and dense; flat shading on a curved hull is most of what
 * reads as faceted. Carries uv (3), closes both ends (4), and grows a
 * turned lip on every torn edge (5). */
function hullGeo() {
  const xs = 120, vs = 28;
  const pos = [], idx = [], uv = [];
  /* FROM THE KEEL TO THE DECK, NOT TO THE RAIL: above the deck her side is
   * `bulwarkGeo`, with a thickness. `v` stays the rail-relative one the map
   * and the holes are drawn in, so nothing painted on her moves. */
  const at = (i, j) => {
    const x = -HALF + (i / xs) * LEN, y = KEEL_Y + (j / vs) * (DECK_Y - KEEL_Y);
    return { x, v: (y - KEEL_Y) / (railY(x) - KEEL_Y), y };
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
        const xm = -HALF + ((i + 0.5) / xs) * LEN, ym = KEEL_Y + ((j + 0.5) / vs) * (DECK_Y - KEEL_Y);
        const vm = (ym - KEEL_Y) / (railY(xm) - KEEL_Y);
        const cut = breached(xm, ym, sg) || holed(xm, vm, sg);
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
      /* (the inner edge a lip's depth on from the outer, at the skin's own scale: it took the outer's uv, and every lip
       * round every rot hole drew one row of the map smeared through its 10-26 cm — `wreckTexel`, 2026-11-23) */
      const du = i0 === i1 ? d / 5.2 : 0, dv = i0 === i1 ? 0 : d / (railY(p0.x) - KEEL_Y);
      uv.push((p0.x + HALF) / 5.2, p0.v, (p1.x + HALF) / 5.2, p1.v, (p1.x + HALF) / 5.2 + du, p1.v + dv, (p0.x + HALF) / 5.2 + du, p0.v + dv);
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

  /* stem and transom, stitched shut — ON THEIR OWN CORNERS (2026-11-23). They were stitched between the two sides' own
   * vertices, whose u is her length `(x + HALF) / 5.2`: the same at every corner of her flat stern, so its 57 m² drew one
   * column of the hull map smeared across it (`wreckTexel`: zero area in uv) and took its shading from the sides. Now u
   * runs ACROSS her (z, at the sides' 5.2 m a tile) and v is the sides' own, so the stern's weed line and boot top meet
   * the sides' at her quarters. */
  const P = (sgi, i, j) => ring[sgi] + i * (vs + 1) + j;
  const own = (k) => { const o = pos.length / 3; pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); uv.push(0.5 + pos[k * 3 + 2] / 5.2, uv[k * 2 + 1]); return o; };
  for (const [i, flip] of [[0, false], [xs, true]])
    for (let j = 0; j < vs; j++) {
      const a = own(P(0, i, j)), b = own(P(1, i, j)), c = own(P(1, i, j + 1)), d = own(P(0, i, j + 1));
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
 * torn away, and the drop-off gap left open.
 * BROKEN BY THE PLANK, NOT BY THE VERTEX (the owner, 2026-10-16: "paper
 * thin"). The wear was a random dip at every 15 cm station, which drew the
 * top of her rail as a saw blade — a torn sheet, not timber. Planks break a
 * course at a time: `bulwarkWear` takes whole 0.17 m courses out of a 1.45 m
 * stretch, the upper ones over a wider span than the lower (the break steps
 * down into a notch, the way boards let go), and the full gaps are now a
 * stub of a course or two, since you cannot step through them anyway. Each
 * station is a box with its own top and an end-grain face wherever the
 * next one is lower, so every edge you can see has the 12 cm of timber. */
const COURSE = 0.17;
function bulwarkWear(x, sg) {
  if (Math.abs(x) > HALF - 2.4) return 0;               // whole at her stem and her transom
  const S = 1.45, k = Math.floor((x + HALF) / S), x0 = -HALF + k * S, o = sg > 0 ? 0 : 61;
  const r = rnd(k * 3.7 + o), cut = rnd(k * 4.3 + (sg > 0 ? 0 : 27)) < 0.16;
  const n = cut ? 3 + (r < 0.5 ? 0 : 1) : r < 0.5 ? 0 : r < 0.78 ? 1 : r < 0.92 ? 2 : 3;
  let miss = 0;
  for (let j = 0; j < n; j++) {                          // course j from the top: each narrower than the one above
    const a = x0 + 0.08 + j * (0.12 + rnd(k * 5.1 + j * 1.7 + o) * 0.22);
    const c = x0 + S - 0.08 - j * (0.12 + rnd(k * 6.3 + j * 2.9 + o) * 0.22);
    if (x >= a && x <= c) miss = j + 1; else break;
  }
  return miss * COURSE;
}
/* AND THE BULWARK IS HER TOPSIDES, NOT A FENCE INSIDE THEM (the owner,
 * 2026-10-16: "the sides still need to be thickened, especially the sides and
 * back where it is just paper-thin texture"). Her skin ran from the keel to
 * the rail as one sheet and this stood inboard of it at the deck's edge: from
 * the deck you looked over it at the skin's bare edge, and where planks were
 * broken out of it the full-height skin stood in front of the gap like paper.
 * Now the skin stops at the deck (`hullGeo`) and this IS her side above it:
 * lofted on her own lines (`hullPt`, flare and rake and all), `TOPSIDE_T`
 * thick, the outer face in her hull paint carrying on from the skin below,
 * the inner face, the top and the end grain at every break in her planking.
 * Returns the two faces apart, for their two materials. */
const TOPSIDE_T = 0.13;
// the plank map (`plankMaps`: 1024x256, 18 courses, repeat 2 x 1.4) in metres: a course is a COURSE, the texels square (84 px/m)
const PLANK_VM = 18 * COURSE * 1.4, PLANK_UM = 1024 * 2 * (18 * COURSE) / 256;
function quadOut(pos, idx, uv, p0, p1, p2, p3, uvs, n) {
  // four corners in order round the face, wound so the face looks along n
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p3[0] - p0[0], by = p3[1] - p0[1], bz = p3[2] - p0[2];
  const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
  const o = pos.length / 3;
  pos.push(...p0, ...p1, ...p2, ...p3); uv.push(...uvs);
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  else idx.push(o, o + 2, o + 1, o, o + 3, o + 2);
}
function bulwarkGeo(sg) {
  const n = 260, ROWS = 3, T = TOPSIDE_T;
  const st = [];
  for (let i = 0; i < n; i++) {
    const xa = -HALF + (i / n) * LEN, xc = -HALF + ((i + 1) / n) * LEN, xm = (xa + xc) / 2;
    /* (the rot holes stay in the skin below the deck: two of them reach half
     * a metre over it, and cut through the whole of her side there they read
     * as a doorway in her bow — a gap you cannot walk through)
     * AND EVERY STATION IS BUILT, TO THE STEM (the owner, 2026-10-17: "now
     * there is a gap in the middle of the front of the ship"). The ones
     * narrower than her own thickness were skipped, which left a slot of sea
     * where her two sides should meet; now they are built with the inside
     * face drawn in to her centreline (`In`), so the two sides close. */
    st.push({ xa, xc, h: BULWARK - bulwarkWear(xm, sg) });
  }
  const O = { pos: [], idx: [], uv: [] }, I = { pos: [], idx: [], uv: [] };
  const top = (x, h) => DECK_Y + h + sheerAt(x);
  /* the inside face: at the stem, a hair PAST her centreline (4 mm), so the two sides overlap where they meet — stopped
   * 3 mm short of it they left a 6 mm slit up the middle of her bow (measured: rays straight ahead at 1.4 m escaped) */
  const In = (x, y) => hullPt(x, y, sg, -Math.min(T, halfAtY(x, y) + 0.004));
  const Vh = (x, y) => (y - KEEL_Y) / (railY(x) - KEEL_Y);               // the hull map's own v
  /* THE PLANK MAP IN METRES (2026-11-23, the owner's screenshot: "these areas that just look like a stretched texture").
   * The inside face took the map's v 0.88..1 over its 0.85 m — 50 map px a metre up it against 394 along it, so every
   * grain line and stain stood 7.8x tall. Now a course of the map is a `COURSE` (18 to a tile: 3.06 m a tile up, at the
   * map's 1.4) counted up from her deck line on the sheer, so the courses follow her sheer and the ones `bulwarkWear`
   * takes out are whole courses of the map; and along her the same 84 px a metre (`PLANK_UM`). */
  const Vp = (y, x) => (y - DECK_Y - sheerAt(x)) / PLANK_VM;
  const out = [0, 0, sg], inn = [0, 0, -sg], up = [0, 1, 0];
  for (let i = 0; i < n; i++) {
    const s = st[i]; if (!s) continue;
    const ua = (s.xa + HALF) / 5.2, uc = (s.xc + HALF) / 5.2, pa = (s.xa + HALF) / PLANK_UM, pc = (s.xc + HALF) / PLANK_UM;
    const ta = top(s.xa, s.h), tc = top(s.xc, s.h);
    for (let k = 0; k < ROWS; k++) {
      const ya0 = DECK_Y + (ta - DECK_Y) * k / ROWS, ya1 = DECK_Y + (ta - DECK_Y) * (k + 1) / ROWS;
      const yc0 = DECK_Y + (tc - DECK_Y) * k / ROWS, yc1 = DECK_Y + (tc - DECK_Y) * (k + 1) / ROWS;
      quadOut(O.pos, O.idx, O.uv, hullPt(s.xa, ya0, sg), hullPt(s.xc, yc0, sg), hullPt(s.xc, yc1, sg), hullPt(s.xa, ya1, sg),
        [ua, Vh(s.xa, ya0), uc, Vh(s.xc, yc0), uc, Vh(s.xc, yc1), ua, Vh(s.xa, ya1)], out);
      quadOut(I.pos, I.idx, I.uv, In(s.xa, ya0), In(s.xc, yc0), In(s.xc, yc1), In(s.xa, ya1),
        [pa, Vp(ya0, s.xa), pc, Vp(yc0, s.xc), pc, Vp(yc1, s.xc), pa, Vp(ya1, s.xa)], inn);
    }
    // the top of her side: along her as the face under it, across it her 13 cm
    quadOut(I.pos, I.idx, I.uv, hullPt(s.xa, ta, sg), hullPt(s.xc, tc, sg), In(s.xc, tc), In(s.xa, ta),
      [pa, 0, pc, 0, pc, T / PLANK_VM, pa, T / PLANK_VM], up);
    // end grain wherever the next station stands lower, or is not there
    for (const [nb, x, t, dir] of [[st[i - 1], s.xa, ta, -1], [st[i + 1], s.xc, tc, 1]]) {
      if (nb && nb.h >= s.h - 1e-4) continue;
      const lo = nb ? top(x, nb.h) : DECK_Y, u = (x + HALF) / PLANK_UM, du = T / PLANK_UM;   // (the end grain: its 13 cm at the same scale)
      quadOut(I.pos, I.idx, I.uv, hullPt(x, lo, sg), In(x, lo), In(x, t), hullPt(x, t, sg),
        [u, Vp(lo, x), u + du, Vp(lo, x), u + du, Vp(t, x), u, Vp(t, x)], [dir, 0, 0]);
    }
  }
  const geo = (B) => {
    if (!B.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    g.setIndex(B.idx); g.computeVertexNormals();
    return g;
  };
  return { outer: geo(O), inner: geo(I) };
}
const RAIL_H = 0.07, RAIL_OVER = 0.035;
function capRailGeo(sg) {
  const n = 260, B = { pos: [], idx: [], uv: [] }, T = TOPSIDE_T;
  const whole = [];
  for (let i = 0; i < n; i++) {
    const xa = -HALF + (i / n) * LEN, xc = -HALF + ((i + 1) / n) * LEN;
    whole.push(!bulwarkWear(xa, sg) && !bulwarkWear(xc, sg) && !bulwarkWear((xa + xc) / 2, sg) ? { xa, xc } : null);
  }
  const P = (x, dy, off) => { const p = hullPt(x, railY(x), sg, off); p[1] += dy; return p; };
  const inOff = (x) => -Math.min(T + RAIL_OVER, halfAtY(x, railY(x)) + 0.004);   // over her centreline at the stem, as the side
  const u = (x) => (x + HALF) / 5.2;
  for (let i = 0; i < n; i++) {
    const s = whole[i]; if (!s) continue;
    const { xa, xc } = s, ia = inOff(xa), ic = inOff(xc);
    const oa0 = P(xa, 0, RAIL_OVER), oc0 = P(xc, 0, RAIL_OVER), oa1 = P(xa, RAIL_H, RAIL_OVER), oc1 = P(xc, RAIL_H, RAIL_OVER);
    const na0 = P(xa, 0, ia), nc0 = P(xc, 0, ic), na1 = P(xa, RAIL_H, ia), nc1 = P(xc, RAIL_H, ic);
    const U = [u(xa), 0.90, u(xc), 0.90, u(xc), 0.93, u(xa), 0.93];
    quadOut(B.pos, B.idx, B.uv, oa1, oc1, nc1, na1, U, [0, 1, 0]);          // its top
    quadOut(B.pos, B.idx, B.uv, oa0, oc0, oc1, oa1, U, [0, 0, sg]);         // its outer edge
    quadOut(B.pos, B.idx, B.uv, na0, nc0, nc1, na1, U, [0, 0, -sg]);        // its inner edge
    quadOut(B.pos, B.idx, B.uv, oa0, oc0, nc0, na0, U, [0, -1, 0]);         // and under its overhang
    for (const [nb, o0, o1, n0, n1, dir] of [[whole[i - 1], oa0, oa1, na0, na1, -1], [whole[i + 1], oc0, oc1, nc0, nc1, 1]])
      if (!nb) quadOut(B.pos, B.idx, B.uv, o0, n0, n1, o1, [0, 0.9, 0.03, 0.9, 0.03, 0.93, 0, 0.93], [dir, 0, 0]);   // end grain
  }
  if (!B.idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
  g.setIndex(B.idx); g.computeVertexNormals();
  return g;
}
/* HER TRANSOM ABOVE THE DECK, the same thickness and the same two faces: the
 * skin's stitch across her stern stops at the deck now too. */
function transomTopGeo() {
  const T = TOPSIDE_T, ZS = 10, ROWS = 3, x0 = HALF;
  const O = { pos: [], idx: [], uv: [] }, I = { pos: [], idx: [], uv: [] };
  const yTop = railY(x0);
  const P = (t, y, inset) => {               // t -1..1 across her stern
    const v = Math.max(0, Math.min(1, (y - KEEL_Y) / (railY(x0) - KEEL_Y)));
    const hz = halfAtY(x0, y) - (inset > 0 ? Math.min(inset, T) : 0);   // inward only: the rail's overhang outboard keeps her width
    return [x0 + rakeAt(x0, v) - inset, y, t * hz];
  };
  for (let j = 0; j < ZS; j++) {
    const t0 = -1 + 2 * j / ZS, t1 = -1 + 2 * (j + 1) / ZS;
    for (let k = 0; k < ROWS; k++) {
      const y0 = DECK_Y + (yTop - DECK_Y) * k / ROWS, y1 = DECK_Y + (yTop - DECK_Y) * (k + 1) / ROWS;
      const v0 = (y0 - KEEL_Y) / (yTop - KEEL_Y), v1 = (y1 - KEEL_Y) / (yTop - KEEL_Y);
      quadOut(O.pos, O.idx, O.uv, P(t0, y0, 0), P(t1, y0, 0), P(t1, y1, 0), P(t0, y1, 0), [t0, v0, t1, v0, t1, v1, t0, v1], [1, 0, 0]);
      quadOut(I.pos, I.idx, I.uv, P(t0, y0, T), P(t1, y0, T), P(t1, y1, T), P(t0, y1, T),
        [t0, 0.88 + 0.12 * k / ROWS, t1, 0.88 + 0.12 * k / ROWS, t1, 0.88 + 0.12 * (k + 1) / ROWS, t0, 0.88 + 0.12 * (k + 1) / ROWS], [-1, 0, 0]);
    }
    quadOut(I.pos, I.idx, I.uv, P(t0, yTop, 0), P(t1, yTop, 0), P(t1, yTop, T), P(t0, yTop, T), [t0, 0.995, t1, 0.995, t1, 1, t0, 1], [0, 1, 0]);
    // and the cap rail across her stern, the sides' own section
    const R = (t, dy, inset) => { const p = P(t, yTop, inset); p[1] += dy; return p; };
    const Ur = [t0, 0.90, t1, 0.90, t1, 0.93, t0, 0.93];
    quadOut(I.pos, I.idx, I.uv, R(t0, RAIL_H, -RAIL_OVER), R(t1, RAIL_H, -RAIL_OVER), R(t1, RAIL_H, T + RAIL_OVER), R(t0, RAIL_H, T + RAIL_OVER), Ur, [0, 1, 0]);
    quadOut(I.pos, I.idx, I.uv, R(t0, 0, -RAIL_OVER), R(t1, 0, -RAIL_OVER), R(t1, RAIL_H, -RAIL_OVER), R(t0, RAIL_H, -RAIL_OVER), Ur, [1, 0, 0]);
    quadOut(I.pos, I.idx, I.uv, R(t0, 0, T + RAIL_OVER), R(t1, 0, T + RAIL_OVER), R(t1, RAIL_H, T + RAIL_OVER), R(t0, RAIL_H, T + RAIL_OVER), Ur, [-1, 0, 0]);
    quadOut(I.pos, I.idx, I.uv, R(t0, 0, -RAIL_OVER), R(t1, 0, -RAIL_OVER), R(t1, 0, T + RAIL_OVER), R(t0, 0, T + RAIL_OVER), Ur, [0, -1, 0]);
  }
  const geo = (B) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    g.setIndex(B.idx); g.computeVertexNormals();
    return g;
  };
  return { outer: geo(O), inner: geo(I) };
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

/* EVERY FACE IN METRES (2026-11-23, the owner: "these areas that just look like a stretched texture"). Measured
 * (`tools/probes.js` `wreckTexel`: map px per metre along u and along v on every triangle), her boxes, beams, rails and
 * fittings wore their map ONCE per face whatever the face's size (BoxGeometry's own uvs): the timber 9.5x, the iron
 * 6.2x, the hold's dark gear 10.4x, the rope 6x, the wheelhouse 3x, the lining 1.9x — a 3 m beam and its 10 cm end both
 * one whole tile. So after the merge, every triangle of these materials is laid again by where it is, in her own metres
 * and one density a material (`D`, map px a metre, both ways):
 *   'grain'   — the face's two own axes, u along the LONGER side of the face (a timber's grain, a rope's lay, along it);
 *   'upright' — a standing face: v straight up from `base` (courses level, boards upright, the lining's tide line at the
 *               one height all round the hold), u along it; a lying face: u along her, v across.
 * A mesh marked `uvLaid` laid its own (the bulwark follows her sheer); a geometry two meshes share is copied first. */
function layInMetres(root, rules) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), rel = new THREE.Matrix4(), byMat = new Map(rules.map((r) => [r[0], r]));
  const seen = new Set(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  let tris = 0;
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.uvLaid) return;
    const R = byMat.get(o.material); if (!R) return;
    const [mat, mode, D, base = 0] = R, mp = mat.map;
    const px = mp && (mp.userData.px || (mp.image && [mp.image.width, mp.image.height]));   // (a loaded map says its size before it has loaded)
    if (!px) return;
    let g = o.geometry;
    if (seen.has(g)) g = o.geometry = g.clone();
    if (g.index) g = o.geometry = g.toNonIndexed();
    seen.add(g);
    const ku = D / (px[0] * mp.repeat.x), kv = D / (px[1] * mp.repeat.y);
    rel.multiplyMatrices(inv, o.matrixWorld);
    const P = g.attributes.position, uv = new Float32Array(P.count * 2), V = [a, b, c];
    for (let i = 0; i + 2 < P.count; i += 3) {
      a.fromBufferAttribute(P, i).applyMatrix4(rel); b.fromBufferAttribute(P, i + 1).applyMatrix4(rel); c.fromBufferAttribute(P, i + 2).applyMatrix4(rel);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      let A, B;                                              // the axes for u and v: 0 x (along her), 1 y (up), 2 z (across)
      if (ay >= ax && ay >= az) { A = 0; B = 2; } else if (ax >= az) { A = 2; B = 1; } else { A = 0; B = 1; }
      const ext = (k) => Math.max(a.getComponent(k), b.getComponent(k), c.getComponent(k)) - Math.min(a.getComponent(k), b.getComponent(k), c.getComponent(k));
      /* (a lying 'upright' face that runs ACROSS her — a coaming's top, a stairwell's lip — has its boards across her too: laid
       * along her they were piano keys. Only a face plainly longer across: the cap rail's lofted stations are short, not across) */
      const lying = B === 2;
      if (mode === 'grain' ? ext(B) > ext(A) * 1.0001 : lying && ext(2) > 0.3 && ext(2) > ext(0) * 2.2) { const t = A; A = B; B = t; }
      for (let k = 0; k < 3; k++) {
        uv[(i + k) * 2] = V[k].getComponent(A) * ku;
        uv[(i + k) * 2 + 1] = (V[k].getComponent(B) - (B === 1 ? base : 0)) * kv;
      }
      tris++;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  });
  return tris;
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
/* A HEIGHT FIELD INTO A NORMAL MAP is still the one thing every surface on
 * this wreck needs: she is lit by a single low moon, and a seam that is only
 * dark is a picture of a seam. It is done now in `surface().paint`, straight
 * from the float height each map draws beside its colour (Sobel, wrapped). */

/* ==================================================================== *
 *  HER SURFACES, REDRAWN (2026-10-10).
 *
 *  The owner's word on her was "AI slop", and he was right about why even
 *  though nothing about her shape was wrong: every surface was drawn the
 *  same way — a flat fill, then dozens of soft RADIAL GRADIENTS laid over
 *  it for "weathering", "damp", "wear", then crushed to sixteen levels. A
 *  soft round smudge is the one mark nothing real makes, and a surface made
 *  of them reads as noise wearing a colour. Her hull map was 512 px tiling
 *  every 5.2 m, so the same smudges walked down her side five times; her
 *  deck borrowed the HULL'S banded gradient and showed a light and a dark
 *  stripe every three metres across it; her wheelhouse drew its map and its
 *  emissive map as two different random draws.
 *
 *  What replaced it is drawn from things that are actually on old boats,
 *  each with a HARD EDGE: planks laid in courses with butt joints staggered
 *  between them and a tone of their own; paint that fails in ragged islands
 *  (a threshold of tileable noise, with a dark lip where it broke) rather
 *  than fading; a boot-top stripe and faded antifouling under it; iron nails
 *  in rows at every frame, and rust running out of them in thin streaks; a
 *  salt line where the tide stands; barnacles and weed below it; caulking
 *  gone from some seams. Every map is drawn ONCE and shared by `map`,
 *  `emissiveMap` and a normal map differentiated from a height drawn in the
 *  same pass, so the seam that is dark is the seam that is deep.
 *
 *  Deterministic (`srng`), so she is the same boat on every load.
 * ==================================================================== */
function srng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* Tileable value noise on an integer lattice: `px`, `py` are its periods, so
 * a field built from it wraps exactly at the edges of the tile it fills. */
function vnoise(seed) {
  const h = (x, y) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y, px, py) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const a = h(x0, y0), b = h(x1, y0), c = h(x0, y1), d = h(x1, y1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
/* fbm over the tile: u, v in 0..1, `cx`, `cy` cells at the base octave. */
function fbm(n, u, v, cx, cy, oct = 4) {
  let s = 0, a = 0.5, t = 0;
  for (let o = 0; o < oct; o++) { const f = 1 << o; s += a * n(u * cx * f, v * cy * f, cx * f, cy * f); t += a; a *= 0.5; }
  return s / t;
}
/* A noise FIELD at a lower resolution than the map, sampled bilinearly per
 * pixel: a 2048-wide hull at four octaves per pixel is a quarter of a second
 * of load; at a quarter of the resolution it is fifteen milliseconds and the
 * thresholds drawn from it are just as crisp, because the edge is cut at the
 * map's own resolution. */
function field(n, fw, fh, cx, cy, oct) {
  const f = new Float32Array(fw * fh);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) f[y * fw + x] = fbm(n, x / fw, y / fh, cx, cy, oct);
  return (u, v) => {   // u, v in 0..1, wrapping
    let x = u * fw, y = v * fh;
    x -= Math.floor(x / fw) * fw; y -= Math.floor(y / fh) * fh;
    const x0 = x | 0, y0 = y | 0, tx = x - x0, ty = y - y0;
    const x1 = x0 + 1 >= fw ? 0 : x0 + 1, y1 = y0 + 1 >= fh ? 0 : y0 + 1, r0 = y0 * fw, r1 = y1 * fw;
    const a = f[r0 + x0], b = f[r0 + x1], c = f[r1 + x0], d = f[r1 + x1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/* a sine from a table: the grain is three sines a pixel over three million
 * pixels, and `Math.sin` there was a third of her load time */
const _SIN = new Float32Array(4096);
for (let i = 0; i < 4096; i++) _SIN[i] = Math.sin((i / 4096) * TAU);
const fsin = (a) => _SIN[((a * 651.8986469) | 0) & 4095];
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/* The canvas pair every map is drawn on: colour as floats, height as floats,
 * written out once at the end (quantised to 32 levels — the retro look, but
 * twice as fine as the old sixteen, which is what made her blocky). */
/* ONE PAIR OF BUFFERS for every map, reused and let go when the last map is
 * painted: allocating sixteen megabytes of floats a map put a garbage
 * collection inside the next step, and measured on the boot that was the
 * difference between 80 ms a map and 225. */
let _poolC = null, _poolH = null, _mapsLeft = 0, _poolOwner = null;
function surface(w, h, owner) {
  /* A map is painted over several warm steps and keeps its buffers between
   * them, so the pool belongs to ONE map until that map is written out. They
   * are queued back to back; if anything ever runs two at once, the second
   * gets buffers of its own rather than painting over the first. */
  let col, hgt;
  if (_poolOwner && _poolOwner !== owner) { col = new Float32Array(w * h * 3); hgt = new Float32Array(w * h).fill(0.5); }
  else {
    if (!_poolC || _poolC.length < w * h * 3) { _poolC = new Float32Array(w * h * 3); _poolH = new Float32Array(w * h); }
    col = _poolC.subarray(0, w * h * 3).fill(0); hgt = _poolH.subarray(0, w * h).fill(0.5); _poolOwner = owner;
  }
  const S = {
    w, h, col, hgt,
    set(i, r, g, b) { col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b; },
    mix(i, r, g, b, a) { const k = i * 3; col[k] += (r - col[k]) * a; col[k + 1] += (g - col[k + 1]) * a; col[k + 2] += (b - col[k + 2]) * a; },
    mul(i, m) { const k = i * 3; col[k] *= m; col[k + 1] *= m; col[k + 2] *= m; },
    /* a thin crisp mark: a streak of `len` px down from (x, y), `wd` wide,
     * fading toward its end — rust out of a nail, grime off a rail */
    streak(x, y, len, wd, r, g, b, a, dh = 0) {
      const x0 = Math.round(x);
      for (let yy = 0; yy < len; yy++) {
        const py = Math.round(y) + yy; if (py < 0 || py >= h) continue;
        const k = 1 - yy / len, al = a * k * k;
        const wob = Math.round(Math.sin(yy * 0.21 + x) * 0.6);
        for (let xx = 0; xx < wd; xx++) {
          const px = (x0 + xx + wob + w) % w, i = py * w + px;
          S.mix(i, r, g, b, al * (xx === 0 || xx === wd - 1 ? 0.6 : 1));
          hgt[i] += dh * k;
        }
      }
    },
    /* a nail head: dark iron, a pixel of rust round it, standing proud */
    nail(x, y, s = 2) {
      for (let yy = -s; yy <= s; yy++) for (let xx = -s; xx <= s; xx++) {
        const px = (Math.round(x) + xx + w) % w, py = Math.round(y) + yy; if (py < 0 || py >= h) continue;
        const i = py * w + px, d = Math.max(Math.abs(xx), Math.abs(yy));
        if (d < s) { S.set(i, 44, 34, 28); hgt[i] += 0.30; } else { S.mix(i, 120, 60, 30, 0.55); hgt[i] += 0.08; }
      }
    },
    disc(x, y, r, cr, cg, cb, a, dh) {
      for (let yy = -Math.ceil(r); yy <= Math.ceil(r); yy++) for (let xx = -Math.ceil(r); xx <= Math.ceil(r); xx++) {
        const d = Math.hypot(xx, yy); if (d > r) continue;
        const px = (Math.round(x) + xx + w) % w, py = Math.round(y) + yy; if (py < 0 || py >= h) continue;
        const i = py * w + px, e = 1 - d / r;
        S.mix(i, cr, cg, cb, a); hgt[i] += dh * Math.sqrt(e);
      }
    },
    /* written out once at the end: the colour quantised to 32 levels (the
     * retro look, but twice as fine as the old sixteen, which is what made her
     * blocky), and the normal differentiated straight from the float height —
     * no height canvas, no read back. */
    paint(g, ng, normalK) { S.paintColor(g); S.paintNormal(ng, normalK, 0, h); },
    /* AND IN PIECES FOR THE BIG ONE. Her side is 2048 x 512, a million
     * pixels written out twice, and in one warm step it was the longest
     * frame of the whole boot after the mound's relics: 914 ms, measured.
     * `defineMap` hands a big map's write-out over as the colour and then
     * the normal in bands of rows, one warm step each. */
    paintColor(g) {
      const img = g.createImageData(w, h), px = img.data;
      for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        px[o] = Math.max(0, Math.min(255, col[i * 3])) & 0xF8;
        px[o + 1] = Math.max(0, Math.min(255, col[i * 3 + 1])) & 0xF8;
        px[o + 2] = Math.max(0, Math.min(255, col[i * 3 + 2])) & 0xF8;
        px[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    },
    paintNormal(ng, normalK, y0, y1) {
      const nimg = S._nimg || (S._nimg = ng.createImageData(w, h)), np = nimg.data, H = hgt, k = normalK;
      const xm = new Int32Array(w), xp = new Int32Array(w);
      for (let x = 0; x < w; x++) { xm[x] = (x - 1 + w) % w; xp[x] = (x + 1) % w; }
      for (let y = y0; y < y1; y++) {
        const rm = ((y - 1 + h) % h) * w, r0 = y * w, rp = ((y + 1) % h) * w;
        for (let x = 0; x < w; x++) {
          const a = xm[x], c = xp[x];
          const dx = (H[rm + c] + 2 * H[r0 + c] + H[rp + c]) - (H[rm + a] + 2 * H[r0 + a] + H[rp + a]);
          const dy = (H[rp + a] + 2 * H[rp + x] + H[rp + c]) - (H[rm + a] + 2 * H[rm + x] + H[rm + c]);
          const nx = -dx * k, ny = -dy * k, l = 1 / Math.sqrt(nx * nx + ny * ny + 1), o = (r0 + x) * 4;
          np[o] = (nx * l * 0.5 + 0.5) * 255; np[o + 1] = (ny * l * 0.5 + 0.5) * 255; np[o + 2] = (l * 0.5 + 0.5) * 255; np[o + 3] = 255;
        }
      }
      if (y1 >= h) { ng.putImageData(nimg, 0, 0); S._nimg = null; }
    },
  };
  return S;
}
/* Lay boards in courses: `rows` courses across the tile (along y), each
 * cut into boards of `minL`..`maxL` px with the joints staggered, every board
 * its own tone. Calls back per pixel with the board's facts. */
function courses(S, rows, minL, maxL, R) {
  const { w, h } = S;
  const boards = [];
  for (let r = 0; r < rows; r++) {
    const y0 = Math.round((r / rows) * h), y1 = Math.round(((r + 1) / rows) * h);
    /* a random phase, so joints never line up from course to course — and the
     * course ends exactly a tile on from where it began, so the board that
     * runs off the right edge is the one that comes in at the left */
    const ph = Math.floor(R() * maxL);
    let x = ph;
    const row = [];
    while (x < ph + w) {
      let L = minL + Math.floor(R() * (maxL - minL));
      if (x + L > ph + w - minL * 0.5) L = ph + w - x;
      row.push({ x0: x, x1: x + L, y0, y1, tone: 0.86 + R() * 0.28, warm: 0.95 + R() * 0.1, grainSeed: R() * 1000, odd: R() });
      x += L;
    }
    // which board every column of the course is in, looked up rather than searched
    row.idx = new Uint16Array(w);
    row.forEach((b, bi) => { for (let xx = b.x0; xx < b.x1; xx++) row.idx[xx % w] = bi; });
    boards.push(row);
  }
  boards.rowOf = new Uint16Array(h);
  for (let y = 0; y < h; y++) boards.rowOf[y] = Math.min(rows - 1, Math.floor((y / h) * rows));
  return boards;
}
const boardAt = (boards, rows, h, w, x, y) => { const row = boards[boards.rowOf[y]]; return row[row.idx[x]]; };
/* the board's own grain: fine streaks along it, from a cheap sine sum keyed
 * to the board so the next board's grain does not run on */
const grain = (b, x, y) => 0.5 + 0.18 * fsin(y * 1.9 + b.grainSeed + fsin(x * 0.013 + b.grainSeed) * 2.4)
  + 0.12 * fsin(y * 5.3 + b.grainSeed * 2.1 + x * 0.004);

/* ALLOCATED NOW, PAINTED LATER. Drawing all of this is most of a second of
 * JavaScript, and `makeShipwreck` runs while the module loads — so in the game
 * (`opts.deferPaint`) every map is created at once as a blank canvas in its
 * own average tone (the textures exist from the first frame, so no material
 * is ever recompiled for gaining one), and the painting is handed to the boot's
 * warm chain one map a step (`wreckPaintJobs`), behind the loading screen. The
 * model viewer paints at once. */
/* ---- ROT AND RUST, OVER EVERY TIMBER (the owner, 2026-10-16: "the textures
 * are lazy, they need to be realistic and rusted with rot") ------------------
 * One pass laid over a wooden map after it is painted and before it is
 * written out: soft dark rot along the grain, sunk into the height so it
 * reads as soft wood under the lamps, crumbling at its heart and furred with
 * pale mould at its edge; iron fastenings gone to scale, each bleeding rust
 * down the grain toward the keel; and worm holes. Seeded per map, so it is
 * the same ship every load. */
function rotPass(S, { k = 1, rust = 1, seed = 7 } = {}) {
  const { w, h, hgt } = S, R = srng(seed * 977 + w * 3 + h);
  const area = (w * h) / 65536;
  /* THE ROT IS A FIELD DRAWN OUT ALONG THE GRAIN, NOT SPOTS (2026-11-24). It was some nine soft ellipses to a tile, and from
   * any distance her deck, her paint and her sides were all spotted like a dog. Two wrapped noise fields, much longer along
   * the grain than across it (down it, on the upright boards of the wheelhouse), and only their crests. */
  {
    const up = w === h, q = vnoise(seed * 31 + 5), aw = Math.min(256, w), ah = Math.min(256, h);
    const F = up ? field(q, aw, ah, 22, 6, 4) : field(q, aw, ah, 8 * Math.max(1, Math.round(w / h / 2)), 22, 4), D = field(vnoise(seed * 17 + 3), 256, 256, up ? 60 : 24, up ? 24 : 60, 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const f = F(x / w, y / h) * 0.66 + D(x / w, y / h) * 0.34, e = clamp01((f - (0.655 - 0.02 * k)) / 0.10);
      if (e <= 0) continue;
      const i = y * w + x;
      S.mix(i, 30, 25, 19, e * e * (3 - 2 * e) * 0.74);
      hgt[i] -= 0.16 * e + (R() < 0.2 * e ? 0.10 : 0);
    }
  }
  const nRust = Math.round(13 * area * rust);
  for (let n = 0; n < nRust; n++) {
    const x = R() * w, y = R() * h * 0.88;
    S.disc(x, y, 1.6 + R() * 1.2, 46, 30, 20, 0.9, 0.25);
    S.streak(x - 1, y + 2, 18 + R() * 70, 2 + Math.floor(R() * 3), 130, 62, 24, 0.5 + R() * 0.25, -0.02);
  }
  for (let n = 0; n < Math.round(260 * area * k); n++) { const i = Math.floor(R() * w * h); S.mul(i, 0.3); hgt[i] -= 0.22; }
}
const _texCache = new Map(), _paintJobs = [];
let _deferPaint = false;
function defineMap(key, w, h, rep, normalK, opts, base, draw, steps = 1) {
  if (_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const nc = document.createElement('canvas'); nc.width = w; nc.height = h;
  const ng = nc.getContext('2d'); ng.fillStyle = 'rgb(128,128,255)'; ng.fillRect(0, 0, w, h);
  const map = new THREE.CanvasTexture(c), normal = new THREE.CanvasTexture(nc);
  /* LONG THINGS GET LINEAR AND ANISOTROPY; small things stay chunky up close
   * (nearest magnification — the retro look) but are filtered when they are
   * far, or a 256 map of nails sparkles at a glance. */
  for (const t of [map, normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
    t.magFilter = opts.smooth ? THREE.LinearFilter : THREE.NearestFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = opts.smooth ? 16 : 4;
  }
  const pair = { map, normal };
  _texCache.set(key, pair);
  // `steps` draws, each `draw(S, step)`, then the write-out: one warm step each
  let S = null;
  const jobs = [];
  for (let k = 0; k < steps; k++) jobs.push(() => { if (!S) S = surface(w, h, key); draw(S, k); });
  if (opts.rot) jobs.push(() => rotPass(S, opts.rot));            // the rot over it, before it is written out
  _mapsLeft++;
  const finish = () => {
    S = null; map.needsUpdate = true; normal.needsUpdate = true;
    if (_poolOwner === key) _poolOwner = null;
    if (--_mapsLeft === 0) _poolC = _poolH = null;
  };
  if (w * h > 400000) {                  // a big map writes out in four steps (see `paintColor`)
    jobs.push(() => S.paintColor(g));
    for (let b = 0; b < 3; b++) jobs.push(() => {
      S.paintNormal(ng, normalK, Math.floor((b * h) / 3), Math.floor(((b + 1) * h) / 3));
      if (b === 2) finish();
    });
  } else jobs.push(() => { S.paint(g, ng, normalK); finish(); });
  if (_deferPaint) jobs.forEach((j, k) => _paintJobs.push([key + ' ' + k, j])); else jobs.forEach((j) => j());
  return pair;
}
export function wreckPaintJobs() { return _paintJobs.splice(0); }

/* ---- HER SIDE ---------------------------------------------------------
 * 2048 x 512 laid over 21 m of her (the hull's u runs a tile every 5.2 m,
 * so `repeat.x` 0.25): almost no repeat down a 26 m side, at the same
 * density the old 512 had. Rail at the top of the canvas, keel at the
 * bottom; the sand cuts her at about 0.69 of the way down. */
function hullMaps() {
  /* In FIVE steps — four bands of rows, then the seams, nails and streaks —
   * because a third of a second in one frame is a hitch even behind a
   * loading screen; what the steps share is kept on `S.hu`. */
  return defineMap('hull', 2048, 512, [0.25, 1], 3.2, { smooth: true, rot: { k: 1.1, rust: 1.2, seed: 11 } }, '#8f897d', (S, step) => {
    const w = S.w, h = S.h;
    if (!S.hu) {
      const R = srng(2916), N = vnoise(11), N2 = vnoise(23);
      const fineF = field(N2, 512, 128, 96, 18, 3);
      const WET = 0.635, saltY = new Float32Array(w);
      for (let x = 0; x < w; x++) saltY[x] = WET - 0.012 + (fineF((x / w) * 4, 0.3) - 0.5) * 0.02;
      S.hu = {
        R, fineF, saltY, BOOT: 0.47, WET, ROWS: 18,
        paintF: field(N, 512, 128, 24, 4, 4),        // where the paint holds (fineF is its ragged edge)
        algaeF: field(N2, 256, 64, 40, 8, 3),
        boards: courses(S, 18, 330, 640, R),
      };
    }
    const { R, fineF, saltY, BOOT, WET, ROWS, paintF, algaeF, boards } = S.hu;
    if (step < 4) for (let y = (step * h) >> 2; y < ((step + 1) * h) >> 2; y++) {
      const f = y / h;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, u = x / w;
        const b = boardAt(boards, ROWS, h, w, x, y);
        const inB = (y - b.y0) / (b.y1 - b.y0);           // 0 at the plank's upper edge
        // bare weathered timber: silver-grey, its own tone, its own grain
        const gr = grain(b, x, y);
        let r = 108 * b.tone * b.warm, g = 102 * b.tone, bl = 92 * b.tone / b.warm;
        const gk = 0.86 + gr * 0.26;
        r *= gk; g *= gk; bl *= gk;
        S.set(i, r, g, bl);
        // each plank rounds away from the light, and is lapped onto the one below
        S.hgt[i] = 0.50 + 0.10 * Math.sin(inB * Math.PI) + (gr - 0.5) * 0.05;
        const m = paintF(u, f) * 0.75 + fineF(u, f) * 0.25;
        if (f < BOOT) {
          // THE PAINT: a sun-bleached white that fails in islands, more of it gone low and toward the ends
          const lose = 0.43 + 0.16 * sstep(0.10, BOOT, f) + (b.odd < 0.08 ? 0.5 : 0);   // a replaced plank never got painted
          if (m > lose) {
            const dirt = 0.92 - 0.10 * f / BOOT + (fineF(u * 3, f * 2) - 0.5) * 0.10;
            S.set(i, 204 * dirt, 199 * dirt, 186 * dirt);
            S.hgt[i] += 0.05;
            if (m < lose + 0.018) { S.mul(i, 0.62); S.hgt[i] += 0.06; }   // the broken lip of it
          }
        } else if (f < WET) {
          // the boot-top stripe, then faded antifouling, chalky, with the timber showing through
          if (f < BOOT + 0.012) { S.set(i, 30, 30, 32); S.hgt[i] += 0.03; }
          else if (m > 0.40) {
            const ch = 0.85 + fineF(u * 2, f * 3) * 0.3;
            S.set(i, 104 * ch, 46 * ch, 34 * ch); S.hgt[i] += 0.04;
            if (m < 0.418) S.mul(i, 0.7);
          }
        } else {
          // under the tide: dark, slimed, the weed taking it
          const a = algaeF(u, f);
          const dk = 0.55 - 0.25 * sstep(WET, 0.85, f);
          S.mul(i, dk);
          if (a > 0.46) { S.mix(i, 34, 48, 34, 0.75); S.hgt[i] += (a - 0.46) * 0.6; }
        }
        // the salt line: chalk left where the tide stands, a ragged band
        const salt = saltY[x];
        if (Math.abs(f - salt) < 0.008) S.mix(i, 190, 192, 186, 0.7);
        else if (f > salt && f < salt + 0.05) S.mix(i, 150, 152, 146, 0.25 * (1 - (f - salt) / 0.05));
      }
    }
    if (step < 4) return;
    // SEAMS, and caulking: dark and deep, pale where the oakum still is, open where it has gone
    for (let r = 1; r < ROWS; r++) {
      const y0 = Math.round((r / ROWS) * h);
      for (let x = 0; x < w; x++) {
        const caulk = Math.sin(x * 0.0071 + r * 1.7) + Math.sin(x * 0.019 + r) * 0.5;
        for (const [dy, a, dh] of [[-1, 0.55, -0.22], [0, 0.85, -0.40], [1, 0.35, -0.10]]) {
          const i = (y0 + dy) * w + x;
          if (dy === 0 && caulk > 1.0) { S.mix(i, 150, 140, 118, 0.45); S.hgt[i] -= 0.15; continue; }
          S.mix(i, 20, 16, 13, a); S.hgt[i] += dh;
        }
      }
    }
    // BUTT JOINTS, and the four fastenings in each
    for (const row of boards) for (const b of row) {
      const x = ((b.x0 % w) + w) % w;
      for (let y = b.y0 + 1; y < b.y1 - 1; y++) { const i = y * w + x; S.mix(i, 20, 16, 13, 0.8); S.hgt[i] -= 0.35; }
      for (const dx of [-5, 5]) for (const fy of [0.3, 0.7]) S.nail(x + dx, b.y0 + (b.y1 - b.y0) * fy, 1);
    }
    /* FRAMES AND THEIR NAILS. She is fastened to a frame every 0.55 m (54 px)
     * — two nails a plank — and it is the rust out of these, running down
     * white paint, that every reference boat is recognised by from a distance. */
    for (let fx = 22; fx < w; fx += 54) {
      for (let r = 0; r < ROWS; r++) {
        const y0 = (r / ROWS) * h, y1 = ((r + 1) / ROWS) * h;
        for (const fy of [0.32, 0.70]) {
          const x = fx + (R() - 0.5) * 2, y = y0 + (y1 - y0) * fy;
          S.nail(x, y, 1);
          const f = y / h;
          if (f < 0.66 && R() < (f < BOOT ? 0.42 : 0.25)) {
            S.streak(x, y + 2, 8 + R() * (f < BOOT ? 70 : 30), 1 + (R() < 0.3 ? 1 : 0), 132, 62, 26, 0.55 + R() * 0.25);
          }
        }
      }
    }
    // grime run down off the rail and the scuppers: long, faint, grey
    for (let k = 0; k < 90; k++) S.streak(R() * w, R() * 8, 40 + R() * 150, 1 + Math.floor(R() * 3), 70, 66, 60, 0.18 + R() * 0.14);
    for (let k = 0; k < 9; k++) S.streak(R() * w, 2, 110 + R() * 90, 4 + Math.floor(R() * 4), 118, 60, 30, 0.35);   // the big ones, under a fitting
    // BARNACLES: clusters along the tide line and below it
    for (let k = 0; k < 160; k++) {
      const cx = R() * w, cy = h * (WET + 0.005 + R() * 0.06), n = 3 + Math.floor(R() * 9);
      for (let j = 0; j < n; j++) {
        const x = cx + (R() - 0.5) * 22, y = cy + (R() - 0.5) * 10, r = 1.2 + R() * 2.4;
        S.disc(x, y, r, 176, 172, 160, 0.9, 0.35);
        S.disc(x, y, r * 0.4, 40, 38, 34, 0.9, -0.25);
      }
    }
    // WEED hanging off the hull below the tide: short dark strands
    for (let k = 0; k < 420; k++) S.streak(R() * w, h * (WET + 0.01 + R() * 0.12), 6 + R() * 22, 1, 26, 40, 28, 0.6, 0.05);
    // a few split planks: a dark crack along the grain
    for (let k = 0; k < 14; k++) {
      const r = Math.floor(R() * ROWS * 0.6), y = (r + 0.3 + R() * 0.4) * (h / ROWS), x0 = R() * w, L = 40 + R() * 160;
      for (let x = 0; x < L; x++) { const yy = Math.round(y + Math.sin(x * 0.08) * 1.5), i = yy * w + ((Math.round(x0 + x)) % w); S.mix(i, 18, 14, 11, 0.85); S.hgt[i] -= 0.3; }
    }
  }, 5);
}

/* ---- HER DECK ---------------------------------------------------------
 * Its u runs a tile every 3 m along her and v a tile every 3 m across; this
 * tile is 6 m by 3 m (`repeat` 0.5, 1). Planks fore and aft, 15 cm, pitch in
 * the seams, a pair of nails at every beam, salt and sand. */
function deckMaps() {
  return defineMap('deck', 1024, 512, [0.5, 1], 2.4, { smooth: true, rot: { k: 1.0, rust: 0.9, seed: 13 } }, '#6e6a62', (S) => {
    const w = S.w, h = S.h, R = srng(1931);
    const N = vnoise(41), saltF = field(N, 256, 128, 16, 8, 4), wetF = field(vnoise(43), 256, 128, 8, 4, 3);
    const ROWS = 20, boards = courses(S, ROWS, 280, 720, R);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, u = x / w, v = y / h;
      const b = boardAt(boards, ROWS, h, w, x, y), inB = (y - b.y0) / (b.y1 - b.y0);
      const gr = grain(b, x, y), gk = 0.84 + gr * 0.30;
      // decks go SILVER: salt and sun take the brown out of exposed timber
      S.set(i, 116 * b.tone * gk * b.warm, 112 * b.tone * gk, 104 * b.tone * gk / b.warm);
      S.hgt[i] = 0.5 + 0.06 * Math.sin(inB * Math.PI) + (gr - 0.5) * 0.06;
      if (b.odd < 0.10) S.mul(i, 0.74);                    // the odd board that holds water and has gone dark
      const s = saltF(u, v);
      if (s > 0.62) S.mix(i, 176, 178, 172, 0.30 + (s - 0.62) * 1.4);   // salt crust
      const wt = wetF(u, v);
      if (wt > 0.66) S.mul(i, 0.80 - (wt - 0.66) * 0.8);   // and where it lies wet
    }
    for (let r = 0; r <= ROWS; r++) {                      // pitch in the seams
      const y0 = Math.round((r / ROWS) * h) % h;
      for (let x = 0; x < w; x++) for (const [dy, a] of [[-1, 0.5], [0, 0.95], [1, 0.45]]) {
        const y = (y0 + dy + h) % h, i = y * w + x;
        S.mix(i, 16, 15, 14, a); S.hgt[i] -= dy === 0 ? 0.35 : 0.12;
        if (dy === 0 && Math.sin(x * 0.05 + r * 3.1) > 0.92) S.mix(i, 160, 150, 128, 0.7);   // sand blown into the seam
      }
    }
    for (const row of boards) for (const b of row) {
      const x = ((b.x0 % w) + w) % w;
      for (let y = b.y0 + 1; y < b.y1 - 1; y++) { const i = y * w + x; S.mix(i, 16, 15, 14, 0.85); S.hgt[i] -= 0.3; }
    }
    for (let bx = 30; bx < w; bx += 86) for (let r = 0; r < ROWS; r++) {   // a beam under every 0.5 m
      const y0 = (r / ROWS) * h, y1 = ((r + 1) / ROWS) * h;
      for (const fy of [0.3, 0.7]) {
        const x = bx + (R() - 0.5) * 3, y = y0 + (y1 - y0) * fy;
        S.nail(x, y, 1);
        if (R() < 0.18) S.disc(x, y, 3 + R() * 4, 110, 54, 26, 0.35, 0);   // rust stain round it
      }
    }
    for (let k = 0; k < 60; k++) S.disc(R() * w, R() * h, 1 + R() * 2.5, 206, 204, 196, 0.8, 0.05);   // gulls
    for (let k = 0; k < 24; k++) S.streak(R() * w, R() * h, 10 + R() * 30, 2, 30, 26, 22, 0.5);         // tar drips
  });
}

/* ---- HER BULWARKS AND RAILS -------------------------------------------
 * The bulwark samples a thin band of whatever map it wears (v 0.88..1 at a
 * repeat of 1.4), so the planking here is UNIFORM — eighteen courses evenly
 * spaced — and any band of it is planks. Painted like her side. */
function plankMaps() {
  return defineMap('plank', 1024, 256, [2, 1.4], 2.6, { rot: { k: 0.9, rust: 1.0, seed: 17 } }, '#8a8578', (S) => {
    const w = S.w, h = S.h, R = srng(707);
    const paintF = field(vnoise(71), 256, 128, 20, 18, 4), fineF = field(vnoise(73), 256, 128, 80, 72, 3);
    const ROWS = 18, boards = courses(S, ROWS, 240, 560, R);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, u = x / w, v = y / h;
      const b = boardAt(boards, ROWS, h, w, x, y), inB = (y - b.y0) / (b.y1 - b.y0);
      const gk = 0.86 + grain(b, x, y) * 0.26;
      S.set(i, 104 * b.tone * gk, 99 * b.tone * gk, 90 * b.tone * gk);
      S.hgt[i] = 0.5 + 0.10 * Math.sin(inB * Math.PI);
      const m = paintF(u, v) * 0.72 + fineF(u, v) * 0.28;
      if (m > 0.47 && b.odd > 0.10) {
        S.set(i, 198, 194, 182); S.hgt[i] += 0.05;
        if (m < 0.488) { S.mul(i, 0.62); S.hgt[i] += 0.05; }
      }
    }
    for (let r = 0; r <= ROWS; r++) {
      const y0 = Math.round((r / ROWS) * h) % h;
      for (let x = 0; x < w; x++) for (const [dy, a, dh] of [[0, 0.85, -0.4], [1, 0.4, -0.1]]) { const i = ((y0 + dy) % h) * w + x; S.mix(i, 22, 18, 15, a); S.hgt[i] += dh; }
    }
    for (const row of boards) for (const b of row) {
      const x = ((b.x0 % w) + w) % w;
      for (let y = b.y0 + 1; y < b.y1 - 1; y++) { const i = y * w + x; S.mix(i, 22, 18, 15, 0.8); S.hgt[i] -= 0.3; }
    }
    for (let fx = 14; fx < w; fx += 46) for (let r = 0; r < ROWS; r++) {
      const y = ((r + 0.5) / ROWS) * h; S.nail(fx, y, 1);
      if (R() < 0.35) S.streak(fx, y + 2, 6 + R() * 22, 1, 132, 62, 26, 0.6);
    }
  });
}

/* ---- HER WHEELHOUSE ---------------------------------------------------
 * Tongue-and-groove boards standing upright, in the sea-green every one of
 * the reference boats wears, chalked by the sun and blistered back to grey
 * timber; rust out of the window corners and the screws. */
function paintMaps() {
  return defineMap('paint', 512, 512, [2, 1.4], 2.6, { rot: { k: 0.7, rust: 1.3, seed: 19 } }, '#56786a', (S) => {
    const w = S.w, h = S.h, R = srng(4477);
    const paintF = field(vnoise(91), 128, 128, 6, 6, 4), fineF = field(vnoise(93), 128, 128, 28, 28, 3);
    const COLS = 8;
    const tone = Array.from({ length: COLS }, () => 0.88 + R() * 0.24);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, u = x / w, v = y / h;
      const c = Math.floor(u * COLS), inC = u * COLS - c, t = tone[c];
      const gr = 0.5 + 0.2 * Math.sin(x * 2.3 + c * 7 + Math.sin(y * 0.02 + c) * 3);
      S.set(i, 100 * t * (0.88 + gr * 0.24), 96 * t * (0.88 + gr * 0.24), 86 * t * (0.88 + gr * 0.24));
      S.hgt[i] = 0.5 + 0.08 * Math.sin(inC * Math.PI);
      const m = paintF(u, v) * 0.7 + fineF(u, v) * 0.3;
      const chalk = fineF(u * 2, v * 2);
      if (m > 0.40) {
        S.set(i, (66 + chalk * 26) * t, (106 + chalk * 22) * t, (92 + chalk * 18) * t); S.hgt[i] += 0.05;
        if (m < 0.418) { S.mul(i, 0.6); S.hgt[i] += 0.05; }
      }
      /* (the grime at the foot of every board is gone, 2026-11-23: laid in metres a tile is 0.96 m up the wall, and a
       * band in the tile came round mid-wall) */
    }
    for (let c = 0; c <= COLS; c++) {                       // the grooves between the boards
      const x0 = Math.round((c / COLS) * w) % w;
      for (let y = 0; y < h; y++) for (const [dx, a, dh] of [[0, 0.85, -0.45], [1, 0.45, -0.15]]) { const i = y * w + ((x0 + dx) % w); S.mix(i, 20, 26, 24, a); S.hgt[i] += dh; }
    }
    for (let k = 0; k < 26; k++) {
      const x = R() * w, y = R() * h * 0.5;
      S.nail(x, y, 1);
      S.streak(x, y + 2, 20 + R() * 90, 1 + (R() < 0.4 ? 1 : 0), 130, 62, 28, 0.6);
    }
    for (let k = 0; k < 30; k++) S.streak(R() * w, 0, 30 + R() * 120, 1 + Math.floor(R() * 2), 50, 58, 54, 0.22);
  });
}

/* ---- INSIDE HER: THE LINING --------------------------------------------
 * The ceiling planks of the hold, tarred dark; every board its own tone;
 * nails in rows at the frames; and the TIDE has been in here — a hard salt
 * line a third of the way up, wet and green under it, white crust on it. */
/* AND IT IS A PHOTOGRAPH NOW (2026-11-24, the owner: the hold's wood redone to match the iron). Her lining, her sole and her
 * loose timber were drawn here — sines for grain, one orange brown, a cream line for the tide — and beside photographed rust
 * they were a cartoon of wood. `tools/timber_pack.html` cuts all three, board by board, from the weathered planking in the
 * owner's own furniture set. Her lining and sole: 2048 x 1024 over 5.9 x 2.95 m (347 px/m; they had 173). Her timber: 1024 x
 * 512 over 2 x 1 m, grain along it (512; it had 340). */
const innerMaps = () => loadedMap('inner', 'assets/wreck-inner.jpg', 'assets/wreck-inner-n.jpg', [2048, 1024]);
const soleMaps = () => loadedMap('sole', 'assets/wreck-sole.jpg', 'assets/wreck-sole-n.jpg', [2048, 1024]);
const woodMaps = () => loadedMap('wood', 'assets/wreck-wood.jpg', 'assets/wreck-wood-n.jpg', [1024, 512]);

/* ---- IRON: her rails, stays, fittings ----------------------------------
 * Not a brown smudge: rust SCALE. Layers of it lifting off, each with an
 * orange edge where it broke from the metal under it, pitting, and here
 * and there a little of the old black paint still on. */
function metalMaps() {
  /* RUSTED IRON FROM THE OWNER'S SCANS (2026-11-23, the owner: "used these textures on parts of the ship that are
   * applicable as metal areas with rust" — two Substance smart materials, MS_Collection_metal_84 / _98). A smart
   * material's colour is procedural and needs Substance; what they carry is their grayscale grunge scans, and six of
   * those (pitting, streaks, cracks, scratches, mottle, smudge) are composed by `tools/rust_pack.html` into one 512 px
   * tile, a metre of iron (old black paint scratched through to the steel, a third of it gone to scale, rust running
   * down from it), with its normal: `assets/wreck-rust.jpg`, `assets/wreck-rust-n.jpg`. Every `M.steel` part wears it —
   * the stove, the rails and stanchions, the stays, the gaff and its hook and chain, the bow roller, the pots — laid in
   * metres (`layInMetres`, 'upright': the runs run down). Loaded, not painted: nothing in the paint chain waits on it, and
   * it is in long before the card lifts. `userData.px` is its size for the metres pass, read before it has loaded. */
  return loadedMap('metal', 'assets/wreck-rust.jpg', 'assets/wreck-rust-n.jpg', 512);
}
/* Maps that are files: LINEAR, like her timber's (2026-11-24: at nearest the photographed iron was blocks beside the smooth
 * planking it is bolted to). `mirror`: mirrored up the tile, for a map with a head and a foot. */
function loadedMap(key, url, nurl, px, mirror) {
  if (_texCache.has(key)) return _texCache.get(key);
  const ld = new THREE.TextureLoader();
  const mk = (u) => {
    const t = ld.load(u);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
    t.userData.px = Array.isArray(px) ? px : [px, px];
    return t;
  };
  const pair = { map: mk(url), normal: nurl ? mk(nurl) : null };
  _texCache.set(key, pair);
  return pair;
}
/* HER IRON PLATE (2026-11-24, the owner: "use this material at some parts too") — "Rusting Metal Material" by
 * RBG_illustrations (CC-BY-4.0, `tools/plate_pack.html`): bare grey iron rusting up from its foot. A tile is `PLATE_T`
 * metres, so it is only laid where the iron is about that tall: the stove, the wheel's pedestal, and `plating`. */
const PLATE_T = 0.9625;                 // four of them are the sole to the wheelhouse floor (3.85), so both start on a foot
const plateMaps = () => loadedMap('plate', 'assets/wreck-plate.jpg', 'assets/wreck-plate-n.jpg', 1024, true);
const wearMap = () => loadedMap('wear', 'assets/wreck-wear.jpg', null, 256).map;   // for what had no map at all: her brass, gilt, rubber, glass
/* HER IRON'S TINT (linear), and the levels it is worn at, BALANCED ON SCREEN AGAINST EACH OTHER: the game's light and grade
 * push a warm grey to pink and a red to crimson — at white the sheets' bare iron read lilac — and one tint for all three went
 * mint on the plate, whose grey is neutral. So the rust maps are cooled and the plate hardly, and the plate, whose map is
 * twice as bright, is worn at little over half the rest. */
const IRON = [0.81, 0.95, 0.74], PLATE_C = [0.97, 0.94, 0.77];
const ironCol = (k, c = IRON) => new THREE.Color(c[0] * k, c[1] * k, c[2] * k);

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

/* A painted board over a way through her: the owner asked for the quarters
 * and the deck to be signed. Pale paint on dark oak, the letters chipped back
 * to the wood and the whole thing quantised like every map she carries, with
 * a little arrow either side when it points somewhere (`up`). Its own lift
 * (emissive off its own map) because nothing in the hold is moonlit. */
function signMat(text, up = false) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 26; i++) {                         // grain, along the board
    g.fillStyle = `rgba(${i % 2 ? '28,20,14' : '104,84,60'},${0.18 + Math.random() * 0.3})`;
    g.fillRect(0, Math.random() * 64 | 0, 256, 1 + (Math.random() * 2 | 0));
  }
  g.strokeStyle = 'rgba(20,14,10,0.9)'; g.lineWidth = 3; g.strokeRect(4, 4, 248, 56);
  g.fillStyle = 'rgba(204,192,164,0.82)'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34, up ? 170 : 226);
  if (up) for (const ax of [26, 230]) {
    g.beginPath(); g.moveTo(ax, 14); g.lineTo(ax + 11, 30); g.lineTo(ax + 4, 30); g.lineTo(ax + 4, 50);
    g.lineTo(ax - 4, 50); g.lineTo(ax - 4, 30); g.lineTo(ax - 11, 30); g.closePath(); g.fill();
  }
  /* OLD AND FADED (the owner, 2026-10-16: "make all the signs old and
   * slightly faded"). Years of sun and salt on it: the paint bleached toward
   * the wood, flaked off in patches as well as specks, a grime line where the
   * wet sits along the bottom, a split along the grain, a few mould spots. */
  for (let i = 0; i < 620; i++) {                        // paint gone back to the wood, specks
    g.fillStyle = `rgba(74,58,42,${0.5 + Math.random() * 0.5})`;
    g.fillRect(Math.random() * 256 | 0, Math.random() * 64 | 0, 1 + (Math.random() * 3 | 0), 1 + (Math.random() * 2 | 0));
  }
  for (let i = 0; i < 14; i++) {                         // and flakes
    const fx = Math.random() * 256, fy = 8 + Math.random() * 48, fw = 6 + Math.random() * 16, fh = 3 + Math.random() * 7;
    g.fillStyle = `rgba(${70 + Math.random() * 14 | 0},56,40,${0.7 + Math.random() * 0.3})`;
    g.beginPath(); g.ellipse(fx, fy, fw / 2, fh / 2, (Math.random() - 0.5) * 0.6, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(176,164,140,0.16)'; g.fillRect(0, 0, 256, 64);             // the sun's bleach over all of it
  const grime = g.createLinearGradient(0, 40, 0, 64);
  grime.addColorStop(0, 'rgba(24,20,14,0)'); grime.addColorStop(1, 'rgba(24,20,14,0.55)');
  g.fillStyle = grime; g.fillRect(0, 40, 256, 24);
  g.strokeStyle = 'rgba(16,12,8,0.8)'; g.lineWidth = 1;                         // a split along the grain
  g.beginPath(); const sy = 18 + Math.random() * 28; g.moveTo(0, sy);
  for (let x = 0; x < 150; x += 10) g.lineTo(x, sy + (Math.random() - 0.5) * 2);
  g.stroke();
  for (let i = 0; i < 9; i++) {                          // mould
    g.fillStyle = `rgba(44,56,34,${0.3 + Math.random() * 0.3})`;
    g.beginPath(); g.arc(Math.random() * 256, 44 + Math.random() * 20, 1 + Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  const img = g.getImageData(0, 0, 256, 64), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff,
    emissiveIntensity: 0.24, color: 0xa8a092, roughness: 1, metalness: 0 });
}
/* the board, facing -X (toward the hold, which is where you read both from):
 * a slab of her own oak and the painted face a hair in front of it */
function signBoard(group, mat, wood, x, y, z, w, h) {
  group.add(slab(0.05, h + 0.04, w + 0.04, wood, x + 0.025, y, z));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.set(x - 0.003, y, z); face.rotation.y = -Math.PI / 2;
  group.add(face);
}

/* the same board facing +Z or -Z (`sz`), for a wall that runs fore and aft */
function signBoardZ(group, mat, wood, x, y, z, w, h, sz) {
  group.add(slab(w + 0.04, h + 0.04, 0.04, wood, x, y, z + sz * 0.02));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.set(x, y, z + sz * 0.043); face.rotation.y = sz > 0 ? 0 : Math.PI;
  group.add(face);
}

/* One draw, three slots: the colour, the lift tied to that same colour, and
 * the relief that makes the moon find it. */
const drawn = ({ map, normal }) => ({ map, emissiveMap: map, normalMap: normal });

export function makeShipwreck(opts = {}) {
  _deferPaint = !!opts.deferPaint;
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
    hull: new THREE.MeshStandardMaterial(Object.assign({ color: 0xbdb6ab, roughness: 0.94, metalness: 0.06, emissive: 0x8d8478, emissiveIntensity: 0.23, side: THREE.DoubleSide }, drawn(hullMaps()))),
    deck: new THREE.MeshStandardMaterial(Object.assign({ color: 0xa89e92, roughness: 0.97, metalness: 0.05, emissive: 0x7d7468, emissiveIntensity: 0.25, side: THREE.DoubleSide }, drawn(deckMaps()))),
    plank: new THREE.MeshStandardMaterial(Object.assign({ color: 0x9a9184, roughness: 0.95, metalness: 0.05, emissive: 0x6c6459, emissiveIntensity: 0.22, side: THREE.DoubleSide, flatShading: true }, drawn(plankMaps()))),
    paint: new THREE.MeshStandardMaterial(Object.assign({ color: 0xa8b0a6, roughness: 0.93, metalness: 0.06, emissive: 0x5c6b60, emissiveIntensity: 0.25, side: THREE.DoubleSide, flatShading: true }, drawn(paintMaps()))),
    inner: new THREE.MeshStandardMaterial(Object.assign({ color: 0xb4aca0, roughness: 0.96, metalness: 0, emissive: 0x8a8274, emissiveIntensity: 0.52, side: THREE.DoubleSide }, drawn(innerMaps()))),
    /* (the rusted iron, 2026-11-23: metalness 0.30 → 0 — no environment to reflect, so it only darkened her iron to black
     * and the rust in the owner's scans never showed — and lifted off its own map like her timber, `emissive` x map) */
    steel: new THREE.MeshStandardMaterial(Object.assign({ color: ironCol(0.46), roughness: 0.84, metalness: 0, emissive: ironCol(0.058), flatShading: true }, drawn(metalMaps()))),
    plate: new THREE.MeshStandardMaterial(Object.assign({ color: ironCol(0.27, PLATE_C), roughness: 0.82, metalness: 0, emissive: ironCol(0.044, PLATE_C), side: THREE.DoubleSide }, drawn(plateMaps()))),
    dark: new THREE.MeshStandardMaterial({ map: innerMaps().map, color: 0x6c665e, roughness: 1, metalness: 0, emissive: 0x2c2822, emissiveMap: innerMaps().map, emissiveIntensity: 0.9, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial(Object.assign({ color: 0x948c80, roughness: 0.98, metalness: 0, emissive: 0x5c554a, emissiveIntensity: 0.58, flatShading: true }, drawn(woodMaps()))),
    rope: new THREE.MeshStandardMaterial({ map: woodMaps().map, emissiveMap: woodMaps().map, color: 0x9a9078, roughness: 1, metalness: 0, emissive: 0x6a6250, emissiveIntensity: 0.30, flatShading: true }),
    rubber: new THREE.MeshStandardMaterial({ map: wearMap(), color: 0x2a2825, roughness: 1, metalness: 0, emissive: 0x0c0b0a, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ map: wearMap(), bumpMap: wearMap(), bumpScale: 0.6, color: 0x9a8558, roughness: 0.55, metalness: 0.62, emissive: 0x2a2010, flatShading: true }),
    // kept polished where a hand has been on it for forty years
    gold: new THREE.MeshStandardMaterial({ map: wearMap(), emissiveMap: wearMap(), bumpMap: wearMap(), bumpScale: 0.5, color: 0xcfaa66, roughness: 0.34, metalness: 0.78, emissive: 0x5a4c30, emissiveIntensity: 0.42, flatShading: true }),
    /* GLASS WRITES NO DEPTH. The panes are merged into one mesh whose sort
     * position is the ship's origin, not the window, so it can draw BEFORE the
     * stars 190 m out — and with depth written it then hid them: from the helm
     * the three stars the wheel puzzle is about read 81-103 in brightness
     * through the windscreen against 164-554 without it. */
    glass: new THREE.MeshStandardMaterial({ map: wearMap(), color: 0x7f8c92, roughness: 0.26, metalness: 0.22, emissive: 0x0a1014, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
    flesh: new THREE.MeshStandardMaterial({ color: 0x6e6152, roughness: 1, metalness: 0, emissive: 0x1a150f, flatShading: true }),
    gore: new THREE.MeshStandardMaterial({ color: 0x4a1c18, roughness: 0.75, metalness: 0, emissive: 0x1a0808, flatShading: true }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a221a, roughness: 1, metalness: 0, emissive: 0x0a0806, flatShading: true }),
    // he is held close in the end, so his materials have to separate
    bone: new THREE.MeshStandardMaterial({ color: 0x9a927e, roughness: 0.86, metalness: 0, emissive: 0x26241c, flatShading: true }),
    tooth: new THREE.MeshStandardMaterial({ color: 0xa8a08a, roughness: 0.62, metalness: 0, emissive: 0x2a2820, flatShading: true }),
    eye: new THREE.MeshStandardMaterial({ color: 0x4c4a42, roughness: 0.42, metalness: 0, emissive: 0x14140f }),
    bruise: new THREE.MeshStandardMaterial({ color: 0x3e2c34, roughness: 1, metalness: 0, emissive: 0x120c10, flatShading: true }),
    sole: new THREE.MeshStandardMaterial(Object.assign({ color: 0xa8a094, roughness: 0.97, metalness: 0, emissive: 0x7a7264, emissiveIntensity: 0.44, side: THREE.DoubleSide }, drawn(soleMaps()))),
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
  for (const k of Object.keys(M)) if (!M[k].name) M[k].name = 'wreck.' + k;   // (named, so a probe can say which: `wreckTexel`)

  /* Solid gear: local [x0, z0, x1, z1, yLo, yHi] boxes.
   *
   * The height band is load-bearing. Without it these were flat 2D
   * footprints, so a bunk down in the hold and a barrel on the deck above
   * it read as the same obstruction, and — worse — main.js only applied
   * them in its on-deck branch, which meant none of the furniture below
   * decks was solid at all. */
  const PROPS = [];
  // what can be smashed: [{ kind, x, z, ry, floor, deck, box (its PROPS entry), group or names }] — main.js `shipBreakables`
  const BREAKABLE = [];
  /* [x0, z0, x1, z1, lo, hi, top]: lo..hi is the body's (a column you
   * cannot climb, whatever it is), `top` where the thing really stops — what
   * a gull brought down lands on (main.js `rdCollide`). No `top` and it is a
   * column to it as well: the mast, the gaff's post. */
  const solid = (x, z, w, d, lo = DECK_Y - 0.4, hi = DECK_Y + 2.2, top) => {
    const q = [x - w / 2, z - d / 2, x + w / 2, z + d / 2, lo, hi];
    if (top !== undefined) q.push(top);
    PROPS.push(q);
  };
  const solidLow = (x, z, w, d, top) => solid(x, z, w, d, HOLD_Y - 0.4, HOLD_Y + 2.4, top);

  // ---- shell ---------------------------------------------------------
  const HULL = new THREE.Group(); S.add(HULL);
  for (const [geo, mat] of [[hullGeo(), M.hull], [deckGeo(), M.deck]]) {
    const m = new THREE.Mesh(geo, mat); m.userData.noBake = true; HULL.add(m);
  }
  /* HER DECK HAS AN UNDERSIDE OF ITS OWN, 2.5 cm down. It was one sheet,
   * double-sided, so from the hold its underside WAS the walking surface —
   * and everything standing on the deck has its bottom face in that plane:
   * looking up from below, every crate, pot, bitt and cleat flickered
   * through her ceiling. The plank's thickness is what keeps them apart. */
  { const g = deckGeo(); g.translate(0, -0.025, 0); const m = new THREE.Mesh(g, M.deck); m.userData.noBake = true; HULL.add(m); }
  for (const sg of [1, -1]) {
    const bg = bulwarkGeo(sg);
    for (const [g, mat] of [[bg.outer, M.hull], [bg.inner, M.plank]])
      if (g) { const m = new THREE.Mesh(g, mat); m.userData.noBake = true; m.userData.uvLaid = mat === M.plank; HULL.add(m); }
  }
  {
    const tg = transomTopGeo();
    for (const [g, mat] of [[tg.outer, M.hull], [tg.inner, M.plank]]) { const m = new THREE.Mesh(g, mat); m.userData.noBake = true; HULL.add(m); }
  }
  /* Capping rail along the top of the bulwark. Placed with hullPt, not
   * raw deckHalf: deckHalf is the half-width at a STATION and takes no
   * account of rake, and forward she rakes nearly two metres, so a rail
   * pinned to the station z hangs outboard of planking that has already
   * moved forward — walls standing off her side at the bow. Invariant 6
   * applies to the rail as much as to anything else. */
  /* AND IT IS ONE RAIL, NOT A ROW OF BOXES (the owner, 2026-10-17: "the
   * railings are sideways blocks that look strange and not connected"). It
   * was 84 axis-aligned slabs, each square to the world while her side curves
   * in plan and climbs with the sheer — round the quarters and the bow they
   * stood out as a staircase of loose blocks. Now it is lofted along her own
   * line (`capRailGeo`), on the top of her side and a hand over each face,
   * running wherever the planking under it is whole and ending in its own end
   * grain where a stretch is broken out. */
  for (const sg of [1, -1]) {
    const g = capRailGeo(sg);
    if (g) { const m = new THREE.Mesh(g, M.plank); m.userData.noBake = true; HULL.add(m); }
  }

  /* ---- HER TIMBERS: DEPTH WHERE SHE WAS PAPER (the owner, 2026-10-16) ----
   * Her sides were one skin and her deck one sheet: true to her lines, and
   * thin as paper wherever you could see an edge or look along them. So she
   * gets the structure a wooden coaster is actually made of, every piece laid
   * off the same lines as the skin (invariant 6) and cut where she is torn:
   *   - stanchions standing up behind the bulwark, carrying the cap rail;
   *   - two wales, heavy timbers proud of her side, running her length;
   *   - frames up the inside of the hold, a rib every 0.9 m;
   *   - beams under the deck, and the deck's own thickness round the hatch
   *     and the ladder well, with carlins along the hatch's sides. */
  {
    // stanchions: inside the bulwark, every metre or so where the bulwark stands
    for (const sg of [1, -1])
      for (let i = 2; i < 168; i += 7) {
        const x = -HALF + (i / 170) * LEN, b = deckHalf(x);
        if (b < 0.6 || Math.abs(x) > HALF - 1.2) continue;
        /* they outlive the planking: where the courses are gone the
         * stanchion stands on, and now and then it went too, snapped off
         * above the highest board left */
        const w = bulwarkWear(x, sg);
        const top = (w && rnd(i * 2.3 + sg) < 0.45) ? Math.max(BULWARK - w + 0.08, (BULWARK - 0.12) * (0.45 + rnd(i * 1.9) * 0.3)) + sheerAt(x)
          : BULWARK + sheerAt(x) - (w ? 0.05 : 0.12);
        // against the inside of her side, leaning with its flare
        const p0 = hullPt(x, DECK_Y, sg, -TOPSIDE_T - 0.046), p1 = hullPt(x, DECK_Y + top, sg, -TOPSIDE_T - 0.046);
        const len = Math.hypot(p1[1] - p0[1], p1[2] - p0[2]);
        HULL.add(slab(0.09, len, 0.09, M.wood, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, Math.atan2(p1[2] - p0[2], p1[1] - p0[1]), 0, 0));
      }
    // two wales along her outside, a hand proud of the skin, cut where she is open
    const wale = (sg, yOf, hgt, outK) => {
      const pos = [], idx = [], uv = [];
      const n = 110;
      let run = null;
      const flush = () => {
        if (!run || run.length < 2) { run = null; return; }
        for (let k = 0; k < run.length; k++) {
          const { x, y } = run[k];
          const o0 = hullPt(x, y, sg, 0.005), o1 = hullPt(x, y, sg, outK), t1 = hullPt(x, y + hgt, sg, outK), t0 = hullPt(x, y + hgt, sg, 0.005);
          pos.push(...o0, ...o1, ...t1, ...t0);
          const u = (x + HALF) / 2.2; uv.push(u, 0, u, 0.15, u, 0.85, u, 1);
        }
        const base = pos.length / 3 - run.length * 4;
        for (let k = 0; k < run.length - 1; k++) {
          const a = base + k * 4, b = a + 4;
          // bottom (o0-o1), face (o1-t1), top (t1-t0)
          for (const [p, q] of [[0, 1], [1, 2], [2, 3]]) {
            if (sg > 0) idx.push(a + p, b + p, b + q, a + p, b + q, a + q);
            else idx.push(a + p, b + q, b + p, a + p, a + q, b + q);
          }
        }
        run = null;
      };
      for (let i = 0; i <= n; i++) {
        const x = -HALF + 0.4 + (i / n) * (LEN - 0.8), y = yOf(x);
        if (breached(x, y + hgt / 2, sg) || holed(x, (y - KEEL_Y) / (railY(x) - KEEL_Y), sg)) { flush(); continue; }
        (run || (run = [])).push({ x, y });
      }
      flush();
      if (!idx.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.wood); m.userData.noBake = true; HULL.add(m);
    };
    for (const sg of [1, -1]) {
      wale(sg, (x) => DECK_Y - 0.32 + sheerAt(x) * 0.6, 0.2, 0.09);            // the main wale, just under her deck
      wale(sg, (x) => DECK_Y - 1.45 + sheerAt(x) * 0.3, 0.14, 0.07);           // and a rubbing strake lower down
    }
    // frames up the inside of the hold, ahead of her quarters, on the lining's face
    for (const sg of [1, -1])
      for (let x = HOLD_X0 + 0.45; x < 2.9; x += 0.9) {
        if (x > STAIR_X0 - 0.3 && x < STAIR_X1 + 0.3 && sg < 0) continue;       // not across the foot of the ladder
        const N = 7;
        for (let j = 0; j < N; j++) {
          const y0 = HOLD_Y + (j / N) * (DECK_Y - 0.24 - HOLD_Y), y1 = HOLD_Y + ((j + 1) / N) * (DECK_Y - 0.24 - HOLD_Y);
          if (breached(x, (y0 + y1) / 2, sg)) continue;
          const z0 = sg * (Math.min(HOLD_HZ, halfAtY(x, y0) - 0.10) - 0.055), z1 = sg * (Math.min(HOLD_HZ, halfAtY(x, y1) - 0.10) - 0.055);
          const len = Math.hypot(y1 - y0, z1 - z0) + 0.02;
          // a box stood along the segment: about X, (0,1,0) turns to (0, cos t, sin t)
          // every other segment 4 mm slimmer: they overlap 2 cm at each joint, and of one section their sides were coplanar there
          const thin = (j % 2) * 0.004;
          const fr = slab(0.12 - thin, len, 0.11 - thin, M.wood, x, (y0 + y1) / 2, (z0 + z1) / 2, Math.atan2(z1 - z0, y1 - y0), 0, 0);
          HULL.add(fr);
        }
      }
    // beams under the deck, across the hold, clear of the hatch and the ladder well
    for (let x = HOLD_X0 + 0.5; x < HOLD_X1 - 0.3; x += 1.3) {
      if (x > HATCH_X0 - 0.15 && x < HATCH_X1 + 0.15) continue;
      if (x > STAIR_X0 - 0.15 && x < STAIR_X1 + 0.15) continue;
      const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y - 0.15) - 0.10);
      HULL.add(slab(0.16, 0.2, hz * 2, M.wood, x, DECK_Y - 0.12, 0));
    }
    // the deck's thickness round the hatch and the ladder well, and carlins along the hatch
    const edge = (x0, x1, z0, z1) => {
      // their tops 1.5 cm under the planking: flush with it they were coplanar with the deck and flickered round the hatch
      /* and at each corner the two pieces filled the same 7 cm cube, so its faces were each other's: the
       * end pieces are a hair thinner, shorter and lower, every face of theirs inside the side pieces */
      for (const x of [x0, x1]) HULL.add(slab(0.064, 0.214, z1 - z0 + 0.06, M.wood, x, DECK_Y - 0.125, (z0 + z1) / 2));
      for (const z of [z0, z1]) HULL.add(slab(x1 - x0 + 0.07, 0.22, 0.07, M.wood, (x0 + x1) / 2, DECK_Y - 0.125, z));
    };
    edge(HATCH_X0, HATCH_X1, -HATCH_HZ, HATCH_HZ);
    edge(STAIR_X0, STAIR_X1, STAIR_Z0, STAIR_Z1);
    for (const sg of [1, -1]) HULL.add(slab(HATCH_X1 - HATCH_X0 + 2.4, 0.18, 0.14, M.wood, (HATCH_X0 + HATCH_X1) / 2, DECK_Y - 0.12, sg * (HATCH_HZ + 0.12)));
  }

  /* ---- the hold ------------------------------------------------------
   * Lining LOFTED off halfAtY (6) and CUT at the breach (7). */
  {
    const holdSide = (sg) => {
      /* 0.1 m cells, not a third of a metre: the lining is cut by its cells'
       * centres, and at 48 x 10 the cut round the far tear — which you crawl
       * up to — was a staircase of 0.33 m steps with her painted plating
       * showing pale through every one. */
      const n = 152, rows = 33, pos = [], idx = [], uv = [];
      /* UP TO THE UNDERSIDE OF HER DECK, NOT THROUGH IT. It was lofted to
       * DECK_Y + 0.35, and since it stands inboard of her side (at most
       * HOLD_HZ, 3.7 m out) it came up through the planking as a low wall
       * the length of the hold on both sides — the owner's "random strip of
       * wood sticking out of the ground on each side of the deck". */
      const yAt = (j) => (HOLD_Y - 0.1) + (j / rows) * (DECK_Y - 0.01 - (HOLD_Y - 0.1));
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
          if (breached(xm, ym, sg)) continue;
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
      /* never narrower than a hand: forward, where she pinches in to her stem,
       * `halfAtY - 0.02` went NEGATIVE and the grid crossed itself, the sole
       * folded back over itself along her centreline (the flicker in the floor) */
      const zAt = (x, t) => {
        const hz = Math.max(0.05, Math.min(HOLD_HZ + 0.2, halfAtY(x, HOLD_Y) - 0.02));
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

      /* ---- SAND BLOWN IN THROUGH THE FAR TEAR, AND THE MOON WITH IT ------
       * The way out of her is a crawl-hole low in her -Z side, behind the
       * foot of the companion ladder, and from the hold it was a dark gap in
       * a dark wall. Two things say "out" from across the room now, both of
       * them true of a hole in a wreck on a beach:
       *  - a FAN OF SAND the wind has pushed in through it, spreading over her
       *    boards and pointing at the hole, which outside is the ramp you
       *    walk down to the beach (the walk's own apron, so the feet and the
       *    sand agree);
       *  - and a POOL OF MOONLIGHT on the floor inside it. The moon is down
       *    the beach, at -Z: the side this hole faces, so it shines in,
       *    low, and travels on into the hold a little toward +X.
       * One height function for both (`spill`), and the light lies on
       * the SAND, and only where the sand lies thick enough to be a surface
       * of its own over her boards: there is a gouge torn in the boards just
       * inside the hole, and light laid on the floor hung in the air over it
       * and ended on its cut edge in a hard straight line. The sand fills the
       * gouge the way blown sand does (wherever it shows it is above the
       * boards), so light on the sand is light on one unbroken surface. The
       * spill's own edges are buried under the boards (and the beach) rather
       * than drawn as a rim. Inside her it is her own wet sand, the same as
       * the drifts further in (the beach's pale sand glowed in the dark of
       * the hold), and it is the moon on it that says where it came from.
       * The light is per-vertex colour, not a map, so it is smooth at the
       * beach's pixel size, and it is a cold wash, not a lamp. */
      {
        const XC = (FAR_X0 + FAR_X1) / 2 + 0.05;          // the middle of the way through
        const zEdge = (x) => -Math.min(HOLD_HZ + 0.2, halfAtY(x, HOLD_Y) - 0.02);   // where her boards stop (as built above)
        // the walk's own apron out through the hole (main.js `shipFloorAt`), mirrored
        const holdHZ = (x) => Math.min(HOLD_HZ, halfAtY(x, HOLD_Y) - 0.02);
        const outerZ = (x) => -Math.max(Math.min(HOLD_HZ - 0.25, holdHZ(x) - 0.02) + 0.8, halfAtY(x, HOLD_Y) + 1.1);
        const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
        const IN = 2.5;                                     // how far in over her boards it reaches
        const spill = (x, z) => {
          const ze = zEdge(x), zo = outerZ(x);
          let F, base, m;
          if (z >= ze) {                                    // in over her boards
            const along = (z - ze) / IN, hw = 1.3 * (1 - 0.5 * Math.min(1, along));
            const ac = Math.abs(x - XC) / hw;
            F = Math.pow(Math.max(0, 1 - along), 1.2) * Math.max(0, 1 - ac * ac);
            base = soleY(x, z);
            m = 0.10 * Math.pow(F, 0.8);
          } else {                                          // out through her side and down to the beach
            const ao = Math.min(1, (ze - z) / Math.max(0.1, ze - zo)), hw = 1.3 + 0.6 * ao;
            const ac = Math.abs(x - XC) / hw;
            F = Math.max(0, 1 - ac * ac);
            base = soleY(x, ze) + (-0.06 - soleY(x, ze)) * ao;
            m = (0.10 * (1 - ao) + 0.05 * ao) * F;
          }
          m += 0.008 * Math.sin(z * 13 + Math.sin(x * 2.1) * 1.5) * F;      // ripples, across the way it blew
          return { h: base + m - 0.14 * (1 - smooth(0, 0.15, F)), F };
        };
        const x0 = XC - 2.3, x1 = XC + 2.3, NX = 46;
        const grid = (zA, zB, NZ, inside) => {
          const pos = [], uv = [], idx = [], col = [], lpos = [];
          for (let i = 0; i <= NX; i++) {
            const x = x0 + (i / NX) * (x1 - x0);
            const ze = zEdge(x), za = inside ? ze : zA(x), zb = inside ? zB : ze;
            for (let j = 0; j <= NZ; j++) {
              const z = za + (j / NZ) * (zb - za);
              const S = spill(x, z);
              pos.push(x, S.h, z);
              uv.push((x + HALF) / 2.2, (z + 5) / 2.2);
              if (!inside) continue;
              // the moon on the floor: in through the hole and on in, drifting a little toward +X
              const d = z - ze, xl = XC + 0.28 * d, ac = Math.abs(x - xl) / 1.05;
              // only on the sand, and only where it lies over the boards (F > 0.15 is above them: see `spill`)
              const L = smooth(0, 0.3, d) * (1 - smooth(0.6, 3.0, d)) * (1 - smooth(0.55, 1.0, ac)) * smooth(0.2, 0.45, S.F);
              lpos.push(x, S.h + 0.012, z);
              col.push(0.075 * L, 0.09 * L, 0.135 * L);
            }
          }
          for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
            const a = i * (NZ + 1) + j, b = (i + 1) * (NZ + 1) + j;
            idx.push(a, a + 1, b + 1, a, b + 1, b);
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          g.setIndex(idx); g.computeVertexNormals();
          let light = null;
          if (inside) {
            light = new THREE.BufferGeometry();
            light.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
            light.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
            light.setIndex(idx.slice());
          }
          return { g, light };
        };
        const outside = grid((x) => outerZ(x) - 0.3, null, 18, false);
        const inner = grid(null, -3.9 + IN + 0.1, 26, true);
        const sOut = new THREE.Mesh(outside.g, M.sand); sOut.name = 'farSpillOut'; sOut.userData.noBake = true;
        const sIn = new THREE.Mesh(inner.g, M.wetsand); sIn.name = 'farSpillIn'; sIn.userData.noBake = true;
        const moon = new THREE.Mesh(inner.light, new THREE.MeshBasicMaterial({
          vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          fog: false,          // fogged, an ADDED colour adds the fog's own: the dark of it would show as a pale sheet from far off
          polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
        moon.name = 'farMoonPool'; moon.userData.noBake = true; moon.renderOrder = 1;
        for (const m of [sOut, sIn, moon]) { m.castShadow = false; m.receiveShadow = false; HULL.add(m); }
      }

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
      for (let k = 0; k < 6; k++) {          // (six, not fourteen: see the drifts below)
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

    /* Bulkheads — sunk a quarter-metre into the sole and STOPPING UNDER THE
     * DECK. They were drawn a quarter-metre proud at both ends, so a ridge
     * 0.25 m high ran right across her deck abaft the wheelhouse that
     * nothing collided with: you walked through it to the knee (found by
     * the sweep's "standing on something not under you", 2026-10-14). */
    for (const x of [HOLD_X1 + 0.1, HOLD_X0 - 0.1]) {
      const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y) - 0.10);
      const y0 = HOLD_Y - 0.25, y1 = DECK_Y - 0.03;
      HULL.add(slab(0.18, y1 - y0, hz * 2, M.inner, x, (y0 + y1) / 2, 0));
    }
    /* Frames and deck beams, each cut to the planking at its own station,
     * and NONE standing across the opening you walk in through — fifteen
     * of these once read as bars over the breach. */
    for (let i = 0; i < 17; i++) {
      const x = HOLD_X0 + 0.6 + i * ((HOLD_X1 - HOLD_X0 - 1.2) / 16);
      for (const sg of [-1, 1]) {
        if (sg > 0 && x > BREACH_X0 - 0.35 && x < BREACH_X1 + 0.35) continue;
        /* AND NONE ACROSS THE FAR TEAR. Two of these land at x = -1.28
         * and -0.40, which is the middle of the only way out of her — the
         * timber in front of the shell door, when it was a door, and the
         * same posts standing in the hole now it is a tear. */
        if (sg < 0 && x > FAR_X0 - 0.35 && x < FAR_X1 + 0.35) continue;
        const hz = Math.min(HOLD_HZ, halfAtY(x, DECK_Y) - 0.10) - 0.10;
        // their tops stop 2 cm under the deck: flush with DECK_Y they were 13 cm
        // squares in the walking surface's own plane, fighting it (the owner's flicker)
        HULL.add(slab(0.13, DECK_Y - 0.02 - HOLD_Y, 0.13, M.wood, x, (HOLD_Y + DECK_Y - 0.02) / 2, sg * hz));
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
    /* SAND DRIFTED IN — WHERE IT CAN COME IN, AND FEW (the owner, 2026-11-24: "what are those like rags on the floor? dont
     * have so many laying around the place"). Sixteen flat-shaded icosahedra were strewn the length of her, the quarters
     * too, and lit from inside at night each read as a dropped cloth. Five low smooth mounds now, by the two tears and
     * nowhere else, their rims sunk under her sole so none has an edge. */
    const moundMat = new THREE.MeshStandardMaterial({ map: M.wetsand.map, emissiveMap: M.wetsand.map, color: M.wetsand.color.clone(), roughness: 1, metalness: 0, emissive: M.wetsand.emissive.clone(), emissiveIntensity: M.wetsand.emissiveIntensity });
    moundMat.name = 'wreck.wetsand';
    S.userData.moundMat = moundMat;
    const moundGeo = new THREE.SphereGeometry(0.5, 18, 6, 0, TAU, 0, Math.PI / 2);
    { const P = moundGeo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), a = Math.atan2(z, x), r = 1 + 0.12 * Math.sin(a * 3 + 1.1) + 0.07 * Math.sin(a * 5 + 2.3); P.setXYZ(i, x * r, P.getY(i), z * r); } moundGeo.computeVertexNormals(); }
    for (const [x, z, sx, sz, ry, hgt] of [[-1.3, -2.55, 1.9, 1.1, 0.25, 0.30], [0.25, -2.85, 1.3, 0.8, -0.4, 0.24], [-5.3, 2.75, 1.7, 0.9, 0.5, 0.28], [-3.5, 3.05, 1.2, 0.7, -0.2, 0.22], [-6.6, 2.1, 1.0, 0.7, 0.9, 0.20]]) {
      const m = new THREE.Mesh(moundGeo, moundMat);
      m.scale.set(sx, hgt, sz); m.rotation.y = ry;
      m.position.set(x, soleY(x, z) - 0.06, z);
      m.userData.noBake = true; HULL.add(m);
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
        HULL.add(slab(0.10, DECK_Y - 0.02 - HOLD_Y, z1 - z0, M.plank, bx, (HOLD_Y + DECK_Y - 0.02) / 2, (z0 + z1) / 2));   // 2 cm under the deck, not in its plane
      HULL.add(slab(0.10, DECK_Y - 0.02 - HOLD_Y - dh, dz1 - dz0, M.plank, bx,
        HOLD_Y + dh + (DECK_Y - 0.02 - HOLD_Y - dh) / 2, (dz0 + dz1) / 2));
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
      // and its name over it, on the hold side, over the head of the door
      signBoard(HULL, signMat('QUARTERS'), M.wood, bx - 0.10, HOLD_Y + dh + 0.30, 0, 1.10, 0.30);
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
    HULL.add(slab(0.62, 0.72, 0.56, M.plate, STOVE_X, HOLD_Y + 0.36, STOVE_Z));
    HULL.add(slab(0.70, 0.07, 0.64, M.plate, STOVE_X, HOLD_Y + 0.74, STOVE_Z));
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
      // (in a group of their own and not baked: they go over when the table is broken — main.js `smashShipStore`)
      const TT = new THREE.Group(); TT.name = 'messTop'; TT.userData.noBake = true; HULL.add(TT);
      TT.add(cyl(0.055, 0.05, 0.10, 8, M.plank, TX - 0.36, ty + TOP + 0.05, TZ + 0.14));
      TT.add(slab(0.13, 0.21, 0.13, M.glass, TX + 0.32, ty + TOP + 0.14, TZ - 0.12));
      TT.add(cyl(0.085, 0.095, 0.06, 7, M.steel, TX + 0.32, ty + TOP + 0.055, TZ - 0.12));
      TT.add(cyl(0.02, 0.02, 0.13, 6, M.steel, TX + 0.32, ty + TOP + 0.30, TZ - 0.12));
      S.userData.messTop = TT;

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
          c.emissiveIntensity = 0.26;   // (0.42 read 49 on screen, sat 0.62, against her walls' 37: `wreckTones`, 2026-11-24)
          c.color.multiply(new THREE.Color(0.86, 0.92, 1.0));
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
        /* AND IT GLOWS A LITTLE, SO IT IS SEEN THROUGH THE BOARDS. The owner:
         * the chest should light up a little for the player to see through the
         * barricade. A warm lift on its own maps (the brass and the wood take
         * it, the shadows keep theirs) and a small lamp just over the lid that
         * lays a pool on the boards round it — so from the hold, between the
         * planks nailed across the doorway, there is a lit thing in the dark
         * room beyond. main.js breathes both (`chestGlow`). The lamp is pooled
         * like every point light in the game: it costs nothing until you are
         * near enough for it to be one of the six that reach you. */
        const mats = [...seen.values()];
        for (const m of mats) { m.emissive = new THREE.Color(0xffd9a8); m.emissiveIntensity = 0.62; }
        const lamp = new THREE.PointLight(0xffb066, 1.3, 3.4, 2);
        lamp.position.set(0, 0.95, 0.15);
        lamp.userData.lpAlways = 11;             // it lights a thing you look at from the hold: it keeps a slot from there (main.js `lampReach`)
        CHEST.add(lamp);
        S.userData.chestGlow = { mats, lamp, base: 0.62, lampBase: 1.3 };
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

  /* ---- HER FLOOR HAS A THICKNESS, AND SHE IS SITTING IN THE BEACH (2026-11-14, the owner, from the sand looking into
   * her hold: "make this wood floor look less like a flat hovering texture make it thicker and connect with the ground
   * like a real crashed boat would"). Both tears are cut down to the sand, and through them the sole was a sheet of
   * paper a quarter of a metre up with daylight under it. Along the foot of each tear now: the broken ends of her floor
   * — plank ends and the joists under them, a hand and more thick, running down into the sand; a frame end sprung out
   * here and there; and the beach drifted up against it, so she is IN the sand, not on it. */
  for (const [sg, x0, x1] of [[1, BREACH_X0, BREACH_X1], [-1, FAR_X0, FAR_X1]]) {
    const n = Math.round((x1 - x0) / 0.15);
    for (let i = 0; i <= n; i++) {
      const x = x0 + 0.05 + (i / n) * (x1 - x0 - 0.1);
      const hz = Math.max(0.05, Math.min(HOLD_HZ + 0.2, halfAtY(x, HOLD_Y) - 0.02));
      const top = soleY(x, sg * hz) + 0.01 + rnd(i * 3.7 + sg) * 0.035, bot = -0.32;
      const d = 0.26 + rnd(i * 1.3 + sg * 2) * 0.12;                   // how far the broken end runs out past her line
      // the plank ends and the joist under them, down into the sand
      HULL.add(slab(0.13 + rnd(i * 2.9) * 0.05, top - bot, d, M.wood, x, (top + bot) / 2, sg * (hz - 0.10 + d / 2 - 0.12),
        (rnd(i * 4.1) - 0.5) * 0.06, (rnd(i * 5.3) - 0.5) * 0.12, 0));
      // and a board's end splintered off the top of it, now and then
      if (i % 3 === 1) HULL.add(slab(0.11, 0.035, 0.22 + rnd(i * 6.1) * 0.2, M.sole, x + (rnd(i) - 0.5) * 0.05, top + 0.01,
        sg * (hz + 0.08), (rnd(i * 7.7) - 0.5) * 0.18 * sg + 0.08 * sg, (rnd(i * 8.3) - 0.5) * 0.4, 0));
      // a frame end sprung out of her bottom, low
      if (i % 5 === 2) HULL.add(slab(0.14, 0.16, 0.42 + rnd(i * 9.1) * 0.25, M.wood, x, 0.06 + rnd(i * 2.3) * 0.08, sg * (hz + 0.12),
        sg * (0.10 + rnd(i * 3.9) * 0.18), (rnd(i * 4.4) - 0.5) * 0.35, 0));
    }
    // the beach drifted up against her: from over the foot of the broken floor out to the beach a metre and more off
    {
      const nx = Math.round((x1 - x0) / 0.12), nz = 8, pos = [], idx = [], uv = [];
      for (let i = 0; i <= nx; i++)
        for (let j = 0; j <= nz; j++) {
          const x = x0 - 0.3 + (i / nx) * (x1 - x0 + 0.6), t = j / nz;
          const hz = Math.max(0.05, Math.min(HOLD_HZ + 0.2, halfAtY(x, HOLD_Y) - 0.02));
          const end = Math.min(1, Math.min(i, nx - i) / 4);                   // (it tapers into the beach at each end)
          // (banked up to just under her floor at the foot, 0.15 until 2026-11-15, so the broken ends stand IN the sand)
          const out = 0.04 + t * (1.25 + 0.35 * Math.sin(x * 1.7 + sg));
          const y = (0.24 + 0.04 * Math.sin(x * 3.1)) * (1 - Math.pow(t, 0.7)) * end - 0.06 + 0.012 * Math.sin(x * 9 + t * 7);
          pos.push(x, y, sg * (hz + out));
          uv.push(x / 1.6, out / 1.6);
        }
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          const a = i * (nz + 1) + j, b = (i + 1) * (nz + 1) + j;
          if (sg > 0) idx.push(a, b + 1, b, a, a + 1, b + 1); else idx.push(a, b, b + 1, a, b + 1, a + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      /* THE BEACH'S OWN SAND, NOT HER WET SAND (2026-11-15, the owner, from her floor at the breach looking out: "make this
       * part where the boat connects to sand look better"). In `M.wetsand` (warm grey, lit from inside) the drift was a
       * brown heap on the moon's blue beach with a hard edge where it went under — the join drawn, not hidden. In the
       * beach's material (every apron's way) it is the beach, risen against her. */
      const m = new THREE.Mesh(g, M.sand); m.name = 'tearDrift'; m.userData.noBake = true; HULL.add(m);
    }
  }
  // ---- torn planking along the ACTUAL edge of each tear ----------------
  for (const [sg, x0, x1, n] of [[1, BREACH_X0, BREACH_X1, 30]])
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * (x1 - x0);
    const top = breachTopAt(x, sg);
    if (top === null) continue;
    const p = hullPt(x, top, sg, -0.04);
    HULL.add(slab(0.30, 0.13 + rnd(i * 2.2) * 0.24, 0.18, M.wood, p[0], p[1], p[2],
      0, 0, (rnd(i * 3.3) - 0.5) * 0.7));
    if (i % 3 === 0) {                       // a plank sprung, but only just
      /* These used to stand half a metre off her with a full radian of
       * random tilt, which from the beach is a row of boards sticking out
       * of her side rather than a torn edge. */
      const q = hullPt(x, top + 0.10, sg, 0.04);
      HULL.add(slab(0.18, 0.20 + rnd(i * 5.1) * 0.18, 0.05, M.plank, q[0], q[1], q[2],
        (rnd(i * 1.9) - 0.5) * 0.5, 0, (rnd(i * 4.7) - 0.5) * 0.45));
    }
    /* NO broken frame ends here either. They were 1.4 m wooden posts set
     * on a curving surface at the mouth of the breach, and from outside
     * they stood off her as pillars. The tear reads from its own torn
     * edge and the lip the hull geometry grows; it does not need poles. */
  }
  /* THE FAR TEAR'S EDGE IS LAID ROUND, NOT ACROSS. It is low and you crawl
   * right up to it, and with its trim at even steps of x the steep ends of
   * the arch got two or three planks each: between them the lip the hull
   * grows on a cut showed as pale stair-steps — her painted plating, cut on
   * the hull's own grid. So the planks go by ARC LENGTH round the whole edge,
   * up each end from the sand and over the top, deep enough through her
   * side to cover the lip from the hold, and thin, so none hangs more than a
   * few centimetres into the space you crawl through (`FAR_ROOF` in main.js
   * reads the edge itself). */
  {
    const xa = FAR_X0 + 0.01, xb = FAR_X1 - 0.01;
    const ta = breachTopAt(xa, -1), tb = breachTopAt(xb, -1);
    const pts = [];
    if (ta !== null) for (let y = -0.05; y < ta; y += 0.04) pts.push([xa, y]);
    for (let i = 0; i <= 240; i++) {
      const x = xa + (i / 240) * (xb - xa), t = breachTopAt(x, -1);
      if (t !== null) pts.push([x, t]);
    }
    if (tb !== null) for (let y = tb; y > -0.05; y -= 0.04) pts.push([xb, y]);
    let acc = 0, k = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      acc += Math.hypot(x1 - x0, y1 - y0);
      if (acc < 0.14) continue;
      acc = 0; k++;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const p = hullPt(x1, y1, -1, -0.12);
      HULL.add(slab(0.24, 0.08 + rnd(k * 2.2) * 0.08, 0.30, M.wood, p[0], p[1], p[2],
        0, 0, ang + (rnd(k * 3.3) - 0.5) * 0.3));
      if (k % 4 === 0) {                     // and now and then one sprung, but only just
        const q = hullPt(x1, y1 + 0.06, -1, 0.04);
        HULL.add(slab(0.16, 0.14 + rnd(k * 5.1) * 0.12, 0.05, M.plank, q[0], q[1], q[2],
          (rnd(k * 1.9) - 0.5) * 0.4, 0, ang + (rnd(k * 4.7) - 0.5) * 0.4));
      }
    }
    /* AND THE HOLE HAS A THICKNESS. Her lining stands 0.7 m inside her
     * plating amidships (HOLD_HZ against her beam), and both are cut, so the
     * hole was two outlines with nothing between them: through the gap you
     * saw the inside face of her painted plating, pale. A strip of her own
     * inner timber now runs round the edge from the lining to the plating —
     * the torn thickness of her side — following the same line (`pts`). */
    {
      const rp = [], ri = [], ru = [];
      let arc = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (i) arc += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
        const zl = -Math.min(HOLD_HZ, halfAtY(x, y) - 0.10), o = hullPt(x, y, -1, 0.01);
        rp.push(x, y, zl, o[0], y, o[2]);
        ru.push(arc / 1.2, 0, arc / 1.2, (zl - o[2]) / 1.2);
        if (i) { const a = (i - 1) * 2, b = i * 2; ri.push(a, a + 1, b + 1, a, b + 1, b); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2));
      g.setIndex(ri); g.computeVertexNormals();
      const reveal = new THREE.Mesh(g, M.inner);         // double-sided, and lit by its own lift like the lining
      reveal.name = 'farReveal'; reveal.userData.noBake = true;
      HULL.add(reveal);
    }
  }

  /* (The shell door that stood here went when the owner opened her far
   * side as a second tear — see `FAR_X0`. Its leaf, frame and lock are
   * gone with it; the key from the captain's mouth opens the chest.) */

  // ---- coaming round the hatch ---------------------------------------
  {
    const cx = (HATCH_X0 + HATCH_X1) / 2, w = HATCH_X1 - HATCH_X0;
    for (const sg of [-1, 1])
      HULL.add(slab(w + 0.24, COAMING + 0.03, 0.12, M.plank, cx, DECK_Y + (COAMING - 0.03) / 2, sg * HATCH_HZ));   // its foot 3 cm down through the deck: flush, it fought the planking
    for (const sg of [-1, 1])
      HULL.add(slab(0.12, COAMING + 0.03, HATCH_HZ * 2, M.plank,
        sg > 0 ? HATCH_X1 + 0.06 : HATCH_X0 - 0.06, DECK_Y + (COAMING - 0.03) / 2, 0));
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
    /* And DECK, hung under the planking at the foot of the ladder on two
     * short irons, facing the hold — read from the hold floor as you come
     * to the treads, 2.4 m up and clear of your head as you go under it. */
    {
      const sx = STAIR_X0 - 0.10, sy = DECK_Y - 0.44;
      signBoard(HULL, signMat('DECK', true), M.wood, sx, sy, zc, 0.84, 0.24);
      for (const d of [-1, 1])
        HULL.add(slab(0.03, 0.30, 0.03, M.steel, sx + 0.025, DECK_Y - 0.18, zc + d * 0.32));
    }
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
        /* (the deck's own scale and phase, 2026-11-24: v was 0..1 across whatever width she had there, so a tile of deck was
         * squeezed into each station, the boards fanned to the stem and every triangle bent them — the zigzag) */
        pos.push(e[0], DECK_Y + 0.055, -b2, e[0], DECK_Y + 0.055, b2);
        uv.push((x + HALF) / 3, (4 - b2) / 3, (x + HALF) / 3, (4 + b2) / 3);
      }
      for (let i = 0; i < n; i++) { const o = i * 2; idx.push(o, o + 2, o + 3, o, o + 3, o + 1); }
      {                                             // and its after edge, on vertices of its own: it was a sheet 5.5 cm off the deck
        const o = n * 2, q = pos.length / 3, x = pos[o * 3], b2 = pos[o * 3 + 5], u = uv[o * 2];
        pos.push(x, DECK_Y, -b2, x, DECK_Y, b2, x, DECK_Y + 0.055, b2, x, DECK_Y + 0.055, -b2);
        uv.push(u + 0.018, (4 - b2) / 3, u + 0.018, (4 + b2) / 3, u, (4 + b2) / 3, u, (4 - b2) / 3);
        idx.push(q, q + 2, q + 1, q, q + 3, q + 2);
        HULL.add(slab(0.14, 0.085, b2 * 2, M.wood, x, DECK_Y + 0.03, 0));   // a timber along the step: bare, the boards jogged at it (its riser, seen slantwise)
      }
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
      // the riser stops 2 cm up inside its tread and 1 cm off the deck: flush, its top shared the tread's plane and its foot the deck's
      BR.add(slab(BR_DOOR_W + 0.34, BR_STEP * t1 - 0.03, 0.06, M.paint,
        BR_DOOR_C, DECK_Y + 0.01 + (BR_STEP * t1 - 0.03) / 2, z0));
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

    // the glass runs 2 cm into the sill and the head: cut to them, its ends were in the sill's top and the head's underside
    const glassBand = (ww, dd, x, z) =>
      BR.add(slab(ww, WIN1 - WIN0 + 0.04, dd, M.glass, x, (WIN0 + WIN1) / 2, z));

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
    /* ---- THE CONSOLE, REBUILT (2026-11-24, the owner: "update the models in there to be better and more detailed ... use
     * textures ive provided and look online at real pictures"). An old dragger's wheelhouse (the references: a radar set
     * at one end, the radio, the engine's gauges in the panel facing the helm, the throttle by the wheel): a timber
     * cabinet with a plinth and a moulded top, its face to the helm the owner's rusting PLATE with the gauges let into
     * it — dial faces drawn (`gaugeTex`), glass over, brass bezels — the radar at its port end, the throttle quadrant to
     * starboard of the wheel, the VHF at the starboard end. Its middle stays low: the stars are read over it (9). */
    S.userData.whMats = [];   // (every material made for the wheelhouse, lit by `holdLit` below)
    const cwZ = zc * 1.5, cX0 = BR_X0 + 0.44;
    BR.add(slab(0.62, 0.80, cwZ, M.wood, cX0, F + 0.46, 0));                         // the cabinet
    BR.add(slab(0.66, 0.06, cwZ + 0.04, M.wood, cX0 + 0.01, F + 0.89, 0));           // its top, a lip over each side
    BR.add(slab(0.64, 0.07, cwZ + 0.02, M.wood, cX0, F + 0.035, 0));                 // its plinth
    BR.add(slab(0.012, 0.66, cwZ - 0.10, M.plate, cX0 + 0.316, F + 0.47, 0));        // the plate let into its face
    for (const z of [-cwZ / 2 + 0.02, cwZ / 2 - 0.02]) BR.add(slab(0.03, 0.76, 0.04, M.wood, cX0 + 0.32, F + 0.46, z));   // and its stiles
    const gaugeTex = (() => {
      const W = 512, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const names = [['RPM', 0, 30], ['OIL', 0, 8], ['TEMP', 40, 120], ['AMP', -30, 30]];
      names.forEach(([nm, lo, hi], k) => {
        const cx = k * 128 + 64, cy = 64, r = 58;
        g.fillStyle = '#d9d2bf'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        const st = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r); st.addColorStop(0, 'rgba(0,0,0,0)'); st.addColorStop(1, 'rgba(70,50,20,0.35)'); g.fillStyle = st; g.fill();
        g.strokeStyle = '#1c1a17'; g.fillStyle = '#1c1a17'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center';
        for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 1.5 * i / 10); g.lineWidth = i % 5 ? 1 : 2.4; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.80, cy + Math.sin(a) * r * 0.80); g.lineTo(cx + Math.cos(a) * r * (i % 5 ? 0.88 : 0.92), cy + Math.sin(a) * r * (i % 5 ? 0.88 : 0.92)); g.stroke();
          if (i % 5 === 0) g.fillText(String(Math.round(lo + (hi - lo) * i / 10)), cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62 + 4); }
        g.font = '10px sans-serif'; g.fillText(nm, cx, cy + r * 0.42);
        const a = Math.PI * (0.78 + 0.25 * k);       // dead: each needle where it stopped
        g.lineWidth = 2.2; g.strokeStyle = '#7a1c12'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78); g.stroke();
        g.fillStyle = '#222'; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
      });
      const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
    })();
    const dialM = new THREE.MeshStandardMaterial({ map: gaugeTex, emissiveMap: gaugeTex, color: 0x9a968c, emissive: 0x5a564c, emissiveIntensity: 0.32, roughness: 0.6, metalness: 0 });
    dialM.name = 'wreck.dial';
    [-0.75, -0.25, 0.25, 0.75].forEach((z, k) => {
      const geo = new THREE.CircleGeometry(0.058, 24), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 4);
      const face = new THREE.Mesh(geo, dialM); face.rotation.y = Math.PI / 2; face.position.set(cX0 + 0.324, F + 0.64, z); BR.add(face);
      const bez = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.012, 6, 20), M.brass); bez.rotation.y = Math.PI / 2; bez.position.set(cX0 + 0.328, F + 0.64, z); BR.add(bez);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), M.glass); gl.rotation.y = Math.PI / 2; gl.position.set(cX0 + 0.33, F + 0.64, z); BR.add(gl);
    });
    for (const z of [-0.5, 0, 0.5]) BR.add(cyl(0.012, 0.012, 0.02, 8, M.steel, cX0 + 0.33, F + 0.40, z, 0, 0, Math.PI / 2));   // switches under the gauges
    // the radar, at the port end: its cabinet in her plate, a hood over its tube, the tube dead
    { const rz = -cwZ / 2 + 0.24, rx = cX0 + 0.02, ry = F + 0.92;
      BR.add(slab(0.34, 0.26, 0.36, M.plate, rx, ry + 0.13, rz));
      BR.add(slab(0.16, 0.025, 0.34, M.plate, rx + 0.24, ry + 0.25, rz));
      for (const s of [-1, 1]) BR.add(slab(0.16, 0.20, 0.02, M.plate, rx + 0.24, ry + 0.15, rz + s * 0.16));
      BR.add(cyl(0.11, 0.11, 0.02, 20, M.glass, rx + 0.175, ry + 0.14, rz, 0, 0, Math.PI / 2));
      for (const dz of [-0.11, 0.11]) BR.add(cyl(0.015, 0.015, 0.025, 8, M.rubber, rx + 0.18, ry + 0.03, rz + dz, 0, 0, Math.PI / 2)); }
    // the throttle and the gear, to starboard of the wheel
    { const tz = 0.62, tx = cX0 + 0.18, ty = F + 0.92;
      BR.add(slab(0.16, 0.08, 0.20, M.plate, tx, ty + 0.04, tz));
      for (const [dz, a] of [[-0.05, 0.35], [0.05, -0.15]]) {
        const top = [tx + 0.04 + Math.sin(a) * 0.22, ty + 0.08 + Math.cos(a) * 0.22, tz + dz];
        BR.add(strut([tx + 0.04, ty + 0.08, tz + dz], top, 0.009, M.steel, 5));
        BR.add(new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), M.rubber).translateX(top[0]).translateY(top[1]).translateZ(top[2]));
      } }
    // the chart table: a drawer, a fiddle rail to keep the chart on it, steel legs
    { const tx = BR_X1 - 0.55, tz = -zc + 0.46, ty = F + 0.80;
      BR.add(slab(0.50, 0.05, 0.62, M.wood, tx, ty, tz));
      BR.add(slab(0.46, 0.12, 0.58, M.wood, tx, ty - 0.085, tz));                             // the drawer's box
      BR.add(slab(0.012, 0.09, 0.40, M.wood, tx - 0.236, ty - 0.085, tz));                     // its front
      BR.add(cyl(0.012, 0.012, 0.03, 8, M.brass, tx - 0.25, ty - 0.085, tz, 0, 0, Math.PI / 2));   // its pull
      for (const [w, d, x, z] of [[0.52, 0.02, 0, -0.31], [0.52, 0.02, 0, 0.31], [0.02, 0.62, 0.25, 0], [0.02, 0.62, -0.25, 0]]) BR.add(slab(w, 0.025, d, M.wood, tx + x, ty + 0.035, tz + z));
      for (const dx of [-0.21, 0.21]) for (const dz of [-0.27, 0.27]) BR.add(slab(0.04, 0.72, 0.04, M.steel, tx + dx, F + 0.39, tz + dz));
      solid(tx, tz, 0.56, 0.68, F - 0.1, F + 1.0); }
    // the wheel's pedestal and the console are solid too: nothing in here is a ghost (the owner)
    solid(cX0, 0, 0.70, cwZ + 0.08, F - 0.1, F + 1.3);
    solid(WHEEL_X, 0, 0.36, 0.36, F - 0.1, F + 1.2);
    /* a clock and a barometer either side of the fish on her after bulkhead, flush on its boards, and the fire
     * extinguisher on its bracket by the door */
    { const clockTex = (() => { const S = 256, c = document.createElement('canvas'); c.width = S * 2; c.height = S; const g = c.getContext('2d');
        for (const k of [0, 1]) { const cx = k * S + S / 2, cy = S / 2, r = S * 0.46; g.fillStyle = '#ddd5c0'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#1a1814'; g.strokeStyle = '#1a1814'; g.textAlign = 'center';
          if (!k) { g.font = 'bold 24px serif'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(['I','II','III','IIII','V','VI','VII','VIII','IX','X','XI','XII'][i - 1], cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78 + 8); }
            g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * 0.42 * Math.cos(-2.1), cy + r * 0.42 * Math.sin(-2.1)); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * 0.66 * Math.cos(0.55), cy + r * 0.66 * Math.sin(0.55)); g.stroke(); }
          else { g.font = 'bold 18px serif'; [['STORMY', Math.PI * 0.85], ['RAIN', Math.PI * 1.15], ['CHANGE', Math.PI * 1.5], ['FAIR', Math.PI * 1.85], ['DRY', Math.PI * 2.15]].forEach(([t, a]) => g.fillText(t, cx + Math.cos(a) * r * 0.70, cy + Math.sin(a) * r * 0.70 + 6));
            for (let i = 0; i <= 40; i++) { const a = Math.PI * (0.75 + 1.5 * i / 40); g.lineWidth = i % 5 ? 1 : 2.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86); g.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94); g.stroke(); }
            g.lineWidth = 3; g.strokeStyle = '#2a2a30'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(Math.PI * 0.95) * r * 0.8, cy + Math.sin(Math.PI * 0.95) * r * 0.8); g.stroke(); }
          g.fillStyle = '#222'; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill(); }
        const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; })();
      const faceM = new THREE.MeshStandardMaterial({ map: clockTex, emissiveMap: clockTex, color: 0x9a968c, emissive: 0x5a564c, emissiveIntensity: 0.30, roughness: 0.6, metalness: 0 });
      faceM.name = 'wreck.clock';
      S.userData.whMats.push(dialM, faceM);
      const wx = BR_X1 - 0.075;
      [[-0.95, 0], [0.95, 1]].forEach(([z, k]) => {
        BR.add(cyl(0.125, 0.13, 0.05, 24, M.brass, wx - 0.025, F + 1.60, z, 0, 0, Math.PI / 2));
        const geo = new THREE.CircleGeometry(0.105, 28), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 2);
        const f = new THREE.Mesh(geo, faceM); f.rotation.y = -Math.PI / 2; f.position.set(wx - 0.051, F + 1.60, z); BR.add(f);
        const gl = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), M.glass); gl.rotation.y = -Math.PI / 2; gl.position.set(wx - 0.056, F + 1.60, z); BR.add(gl);
      });
      const red = new THREE.MeshStandardMaterial({ map: wearMap(), emissiveMap: wearMap(), color: 0x8a2a1e, emissive: 0x3a120c, emissiveIntensity: 0.5, roughness: 0.7, metalness: 0 });
      red.name = 'wreck.extinguisher'; S.userData.whMats.push(red);
      const ex = BR_DOOR_C - BR_DOOR_W / 2 - 0.42, ez = zc - 0.17;
      BR.add(cyl(0.075, 0.075, 0.46, 16, red, ex, F + 0.40, ez));
      BR.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), red).translateX(ex).translateY(F + 0.63).translateZ(ez));
      BR.add(cyl(0.02, 0.025, 0.07, 8, M.steel, ex, F + 0.72, ez));
      BR.add(slab(0.12, 0.012, 0.04, M.rubber, ex - 0.03, F + 0.75, ez));
      BR.add(slab(0.18, 0.05, 0.02, M.steel, ex, F + 0.50, zc - 0.075));                // the bracket
      solid(ex, ez, 0.2, 0.2, F - 0.1, F + 0.8); }
    /* ---- AND FURNISHED (2026-11-24, the owner: "up in the wheel house it looks very bare"). What a skipper leaves on a
     * working boat, kept off the centreline forward of the wheel and clear of the glass (invariants 9 and 10): the chart he
     * was on, held down by a mug and the dividers; the logbook and the binoculars at the port end of the console, the VHF
     * set at its starboard end; a stool at the chart table; the oil lamp hung aft, cold; a coil of line in the after
     * corner. The chart is drawn here (`chartTex`): old paper, a coast in ink, depths, a pencilled course to nowhere. */
    {
      const chartTex = (() => {
        const W = 512, H = 640, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
        const R = srng(9917), N = field(vnoise(97), 128, 160, 6, 7, 5), Nf = field(vnoise(98), 128, 160, 40, 50, 3);
        const im = g.createImageData(W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const u = x / W, v = y / H, n = N(u, v), f = Nf(u, v), o = (y * W + x) * 4;
          const sea = n < 0.52, k = 0.86 + f * 0.12 - Math.max(0, n - 0.72) * 0.6;            // yellowed, foxed where it lay wet
          const col = sea ? [206, 200, 176] : [198, 184, 150];
          im.data[o] = col[0] * k; im.data[o + 1] = col[1] * k; im.data[o + 2] = col[2] * k; im.data[o + 3] = 255;
          if (Math.abs(n - 0.52) < 0.0045) { im.data[o] = 70; im.data[o + 1] = 62; im.data[o + 2] = 54; }                // the coast, inked
          else if (sea && Math.abs(((n * 9) % 1) - 0.5) < 0.012) { im.data[o] *= 0.82; im.data[o + 1] *= 0.86; im.data[o + 2] *= 0.95; }   // contours
        }
        g.putImageData(im, 0, 0);
        g.strokeStyle = 'rgba(60,70,90,0.35)'; g.lineWidth = 1;
        for (let x = 32; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        for (let y = 40; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.fillStyle = 'rgba(40,40,46,0.75)'; g.font = '11px serif';
        for (let k = 0; k < 70; k++) { const x = R() * W, y = R() * H; if (N(x / W, y / H) < 0.5) g.fillText(String(2 + Math.floor(R() * 38)), x, y); }
        g.strokeStyle = 'rgba(50,50,56,0.8)'; g.lineWidth = 1.5; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(W * 0.15, H * 0.82); g.lineTo(W * 0.48, H * 0.55); g.lineTo(W * 0.80, H * 0.18); g.stroke(); g.setLineDash([]);
        g.font = 'italic 18px serif'; g.fillStyle = 'rgba(40,36,30,0.8)'; g.fillText('No. 2207', W * 0.62, H * 0.95);
        const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
      })();
      const paper = new THREE.MeshStandardMaterial({ map: chartTex, emissiveMap: chartTex, color: 0xa8a294, emissive: 0x6a665c, emissiveIntensity: 0.30, roughness: 1, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
      const leather = new THREE.MeshStandardMaterial({ map: woodMaps().map, color: 0x3a2a22, emissive: 0x24180f, emissiveMap: woodMaps().map, emissiveIntensity: 0.5, roughness: 0.9, metalness: 0 });
      paper.name = 'wreck.chart'; leather.name = 'wreck.leather';
      S.userData.whMats.push(paper, leather);
      const ctX = BR_X1 - 0.55, ctZ = -zc + 0.46, ctY = F + 0.825;
      const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.56), paper); chart.rotation.set(-Math.PI / 2, 0, 0.12); chart.position.set(ctX, ctY + 0.002, ctZ); BR.add(chart);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.10, 12, 1, true), M.plate); mug.position.set(ctX + 0.15, ctY + 0.05, ctZ + 0.20); BR.add(mug);
      BR.add(cyl(0.038, 0.038, 0.006, 12, M.steel, ctX + 0.15, ctY + 0.004, ctZ + 0.20));
      BR.add(strut([ctX - 0.12, ctY + 0.006, ctZ - 0.10], [ctX + 0.02, ctY + 0.006, ctZ - 0.20], 0.003, M.brass, 4));   // the dividers
      BR.add(strut([ctX - 0.12, ctY + 0.006, ctZ - 0.10], [ctX - 0.02, ctY + 0.006, ctZ - 0.24], 0.003, M.brass, 4));
      // a stool at the chart table
      const stX = ctX - 0.05, stZ = ctZ + 0.62;
      BR.add(cyl(0.17, 0.16, 0.04, 12, M.wood, stX, F + 0.62, stZ));
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.4; BR.add(strut([stX + Math.cos(a) * 0.12, F + 0.61, stZ + Math.sin(a) * 0.12], [stX + Math.cos(a) * 0.19, F + 0.005, stZ + Math.sin(a) * 0.19], 0.016, M.wood, 5)); }
      solid(stX, stZ, 0.36, 0.36, F - 0.1, F + 0.7);
      // the console's ends: logbook and binoculars to port, the VHF to starboard (its middle is the star puzzle's view)
      const cX = BR_X0 + 0.44, cY = F + 0.92;
      // (the logbook on the chart, the binoculars between the throttle and the set: the radar has the console's port end)
      BR.add(slab(0.16, 0.035, 0.23, leather, ctX + 0.10, ctY + 0.02, ctZ - 0.14, 0, 0.5, 0));
      BR.add(slab(0.15, 0.028, 0.22, paper, ctX + 0.10, ctY + 0.019, ctZ - 0.14, 0, 0.5, 0));
      for (const dz of [-0.035, 0.035]) BR.add(cyl(0.024, 0.026, 0.13, 10, M.rubber, cX + 0.10, cY + 0.026, 0.98 + dz, 0, 0, Math.PI / 2 - 0.05));
      BR.add(slab(0.03, 0.03, 0.05, M.rubber, cX + 0.10, cY + 0.03, 0.98));
      BR.add(slab(0.26, 0.17, 0.30, M.plate, cX + 0.03, cY + 0.085, 1.35, 0, -0.08, 0));      // the VHF
      BR.add(slab(0.005, 0.07, 0.17, M.glass, cX - 0.10, cY + 0.11, 1.34, 0, -0.08, 0));
      for (const dz of [-0.09, 0.0, 0.09]) BR.add(cyl(0.014, 0.014, 0.02, 8, M.rubber, cX - 0.105, cY + 0.04, 1.35 + dz, 0, 0, Math.PI / 2));
      BR.add(strut([cX + 0.10, cY + 0.17, 1.46], [cX + 0.12, cY + 0.62, 1.50], 0.004, M.steel, 4));   // its whip
      BR.add(cyl(0.04, 0.04, 0.015, 8, M.rubber, cX - 0.02, cY + 0.18, 1.20, 0, 0, 0));               // the handset on its hook
      // the oil lamp hung aft, cold
      const lX = BR_X1 - 1.15, lZ = 0.75;
      BR.add(strut([lX, T - 0.01, lZ], [lX, T - 0.30, lZ], 0.004, M.steel, 4));
      BR.add(cyl(0.05, 0.065, 0.03, 10, M.brass, lX, T - 0.32, lZ));
      BR.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.14, 12, 1, true), M.glass).translateX(lX).translateY(T - 0.41).translateZ(lZ));
      BR.add(cyl(0.07, 0.06, 0.04, 10, M.brass, lX, T - 0.50, lZ));
      // a coil of line in the after corner, flat on her boards
      for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.21 - k * 0.035, 0.018, 5, 18), M.rope); r.rotation.x = Math.PI / 2; r.position.set(BR_X1 - 0.42, F + 0.018 + (k % 2) * 0.012, zc - 0.62); BR.add(r); }
    }
    BR.add(cyl(0.09, 0.10, 0.85, 7, M.steel, BR_X1 - 0.7, T + 0.50, 0.9));
    BR.add(cyl(0.13, 0.13, 0.10, 7, M.steel, BR_X1 - 0.7, T + 0.95, 0.9));
    BR.add(slab(0.14, 0.16, 0.14, M.steel, BR_DOOR_C, F + 2.20, zc + 0.10));   // dead lamp
    /* and her name over the door, on the outside (the owner: "a little sign
     * above the wheelhouse door so the players know"), between the dead lamp
     * and the roof's edge, on the wall's outer face */
    signBoardZ(BR, signMat('WHEELHOUSE'), M.wood, BR_DOOR_C, F + 2.43, zc + 0.07, 1.16, 0.22, 1);
  }

  /* ---- the wheel ------------------------------------------------------
   * Hub at waist height so you look OVER it, not through it, and a marked
   * king spoke so midships is readable at a glance — the star puzzle asks
   * you to read this wheel. */
  const wheel = new THREE.Group();
  {
    BR.add(cyl(0.17, 0.26, 0.62, 12, M.plate, WHEEL_X, F + 0.31, 0));
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
    /* the king spoke — the one you point at the stars — in the hub's own gold (2026-11-14, the owner: "make this lighter
     * part of the steering wheel you point at the stars gold like the center of the steering wheel"; it was brass) */
    wheel.add(cyl(0.048, 0.042, 0.30, 6, M.gold, 0, 0.575, 0));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.020, 4, 10), M.gold)
      .translateY(0.44).rotateY(Math.PI / 2));
    wheel.add(new THREE.Mesh(new THREE.SphereGeometry(0.050, 7, 6), M.gold).translateY(0.72));
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
    /* the chain runs from the block to the hook's eye and STOPS there: nine
     * links ran on down through the hook and out under its bowl, which read
     * as loose bits stuck across it. Three reach the eye (0.25 over the hook's
     * origin) and the last threads it. */
    const NL = Math.max(1, Math.floor(((ARM_Y - 0.32) - (HOOK_Y - DECK_Y + 0.25)) / 0.092) + 1);
    for (let i = 0; i < NL; i++) {
      const lk = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.015, 6, 10), M.steel);
      lk.position.set(0, ARM_Y - 0.32 - i * 0.092, 0);
      lk.rotation.set(i % 2 ? 0 : Math.PI / 2, 0, 0);
      gaff.add(lk);
    }
    solid(GAFF_X, postZ, 0.38, 0.38);     // the post, not its base plate: a 9 cm plate is stepped on (the owner, 2026-10-17: "I can't walk freely … around the pole")

    const hook = new THREE.Group();
    hook.position.set(0, HOOK_Y - DECK_Y, 0);
    gaff.add(hook);
    /* A FORGED CARGO HOOK (the owner, 2026-10-16: "a real hook, not random
     * bits put together, so it holds up on inspection"). It was nine boxes
     * set round most of a circle. Now: the eye in the hook's own plane under
     * the last link, a collar, the shank swinging out to one side and down,
     * and the bowl coming round under the EYE — a hook carries its load
     * plumb under where it hangs, which is why the shank is offset — then
     * rising to a point that leans back in. One tube along that line,
     * thickened through the bowl where a hook takes its load and drawn down
     * to the point; the bowl's bottom is where it always was (0.23 m under
     * the origin), so the key on it (main.js `KEY_HANG`) did not move. */
    hook.add(new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.013, 6, 14), M.steel).translateY(0.21).rotateY(Math.PI / 2));
    hook.add(cyl(0.027, 0.024, 0.035, 8, M.steel, 0, 0.165, 0));                     // the collar under the eye
    {
      const P = [[0.17, 0], [0.12, -0.022], [0.04, -0.066], [-0.08, -0.076], [-0.17, -0.056],
        [-0.225, 0], [-0.19, 0.062], [-0.11, 0.086], [-0.035, 0.074]];
      const curve = new THREE.CatmullRomCurve3(P.map(([y, z]) => new THREE.Vector3(0, y, z)));
      const TS = 48, RS = 8, R0 = 0.019;
      const tg = new THREE.TubeGeometry(curve, TS, R0, RS, false);
      const pos = tg.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
      const sm = (a, b, t) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
      for (let i = 0; i <= TS; i++) {
        const t = i / TS;
        const k = 1 + 0.38 * sm(0.25, 0.6, t) - 0.38 * sm(0.6, 0.75, t) - 0.72 * sm(0.72, 1.0, t);   // shank, bowl, point
        curve.getPointAt(t, c);
        for (let j = 0; j <= RS; j++) {
          const n = i * (RS + 1) + j;
          v.fromBufferAttribute(pos, n).sub(c).multiplyScalar(k).add(c);
          pos.setXYZ(n, v.x, v.y, v.z);
        }
      }
      tg.computeVertexNormals();
      hook.add(new THREE.Mesh(tg, M.steel));
      const tip = curve.getPointAt(1);
      hook.add(new THREE.Mesh(new THREE.SphereGeometry(R0 * 0.3, 6, 4), M.steel).translateY(tip.y).translateZ(tip.z));   // the point, closed
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
    /* (Her stowed gear — the basket stacks down the port side, the casks,
     * the crate on the starboard waist — is the owner's pirate-ship set now,
     * stood where it stood and solid where it was solid: see PIRATE, with
     * HER FURNITURE below.) */
    /* AND SOME DOWN IN THE HOLD — LAID, NOT ROLLED. They were three rolls of
     * `rnd`, and two came up on the same spot, (-3.31, -0.57): two baskets
     * standing inside each other half a metre from where the captain lands
     * when the wheel lets him go, so he hit the boards beside them. The
     * first stands square under the hook now and catches him
     * (`userData.catchBasket`, which main.js lands him in). Each stands on
     * the LOWEST board under its own footprint — her sole is dished, and at
     * HOLD_Y + a height they floated — and each is solid in the hold. */
    const HOLD_BASKETS = [[GAFF_X, 0, 0.35, true]];      // the other two are crates and sacks now (PIRATE)
    for (const [x, z, ry, isCatch] of HOLD_BASKETS) {
      let lo = Infinity;
      for (const dx of [-0.31, 0, 0.31]) for (const dz of [-0.31, 0, 0.31]) lo = Math.min(lo, soleY(x + dx, z + dz));
      const y = lo + 0.18;                                  // its base (0.195 under the middle) a hair into the board
      const bk = basket(x, y, z, ry);
      HULL.add(bk);
      const span = 0.64 * (Math.abs(Math.cos(ry)) + Math.abs(Math.sin(ry)));
      solidLow(x, z, span, span);
      if (isCatch) {
        bk.name = 'catchBasket'; bk.userData.noBake = true;   // it rocks when he lands in it
        S.userData.catchBasket = { group: bk, x, z, ry, floor: y - 0.145, lo, box: PROPS[PROPS.length - 1] };   // the top of its base
      }
    }

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
    // (the coil is walked over: 25 cm of rope at the gaff post's foot was a 0.9 m wall in the one gap round the pole)

    /* BUT HER POTS STAY HER POTS. She is a crab boat, and the steel pots
     * stacked down her port side are what says so — the set has nothing
     * like them — so three of the five stacks are still pots, with the
     * pirate set's crates stowed between them (PIRATE, below): [x, z, pots high]. */
    /* AND THEY BREAK (the owner, 2026-10-17: "make a bunch of the models and
     * props at the shipwreck breakable"). Each stack is one group kept out of
     * the wreck's merge — one draw a stack — and goes into BREAKABLE with its
     * solid box, which main.js splices out of PROPS when the stack comes apart. */
    for (const [x, z, n] of [[-1.4, -3.50, 3], [0.2, -3.50, 2], [9.2, -3.00, 2]]) {
      const stack = new THREE.Group(); stack.name = 'potStack'; stack.userData.noBake = true;
      for (let i = 0; i < n; i++) {
        const bk = basket(x + (rnd(x * 2.2 + i) - 0.5) * 0.10, DECK_Y + 0.20 + i * 0.36, z, rnd(z + x + i) * 1.2);
        bk.updateMatrix();
        for (const m of [...bk.children]) { m.geometry = m.geometry.clone().applyMatrix4(bk.matrix); stack.add(m); }
      }
      S.add(bakeGroup(stack));
      solid(x, z, 0.8, 0.8, undefined, undefined, DECK_Y + 0.03 + n * 0.36);
      BREAKABLE.push({ kind: 'pot', group: stack, box: PROPS[PROPS.length - 1], x, z, ry: 0, floor: DECK_Y, deck: true });
    }

    /* NO FENDERS. Tyres hung over her side are a 0.4 m torus that has to
     * project to be a fender at all, and however they were seated they
     * read as black rings poking out of her. Cut, not adjusted. */

    /* NO NETTING, NO FLOATS (2026-10-17, the owner, standing among them at
     * the port rail: "get rid of these circle things and let me walk here").
     * Five bundles of net and a row of four floats, and the two boxes that
     * made them solid out to the bulwark, are cut: that stretch of rail is
     * open deck now. */

    for (const dz of [-0.10, 0.12]) {      // his boots, still there
      S.add(slab(0.16, 0.30, 0.13, M.rubber, 3.4, DECK_Y + 0.15, -1.9 + dz, 0.1, 0.3, 0));
      S.add(slab(0.16, 0.10, 0.24, M.rubber, 3.44, DECK_Y + 0.05, -1.96 + dz, 0, 0.3, 0));
    }

    // (the deck lantern is gone: the owner, 2026-10-17, "it is unnecessary" — main.js wires one only if it is here)
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
       * and a half turn on the aft one leaves it athwartships. Still
       * four berths, still two bunk_bed pieces.
       * THE LADDER IS ON THE MODEL'S +X FACE (measured: its rungs are the
       * only geometry at x > 0.3 between z = -0.8 and -0.6), so the open
       * side of a berth is wherever its +X goes. The quarter turn sends the
       * starboard one's into the room; the aft one stood at no turn and
       * climbed into the transom — turned the half way, it faces forward
       * into her quarters with the other. */
      ['bunk_bed', 4.30, 2.95, Math.PI / 2, 2.06, 1.14],
      ['bunk_bed', 6.55, 0.00, Math.PI, 1.14, 2.06],
      /* The mess table, hard against the port planking with a bench drawn
       * up to it on the aisle side and a chair at each end — the door is
       * 1.45 m wide now, so this can sit close to it without narrowing the
       * doorway's own clearance the way it did when the door was 1.10.
       * The stove itself is built with the hull, above (`STOVE_X/STOVE_Z`)
       * — it is not a furniture piece, it is riveted to her. */
      ['table_3', 4.75, -3.05, 0, 1.44, 0.96],
      ['bench_4', 4.75, -2.33, 0, 1.62, 0.44],
      /* A CHAIR FACES ITS OWN +Z (its back is the only thing over 0.7 m
       * and it stands at z = -0.22), so each is turned to put its +Z on
       * the middle of the table: atan2 of the run to the table's centre. */
      ['chair_2', 3.55, -2.70, Math.atan2(4.75 - 3.55, -3.05 + 2.70), 0.56, 0.50],
      ['chair_3', 5.95, -2.70, Math.atan2(4.75 - 5.95, -3.05 + 2.70), 0.56, 0.50],
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
      // ---- her hold: the bench she was worked over --------------------
      ['table_1', -4.20, -2.58, 0, 2.14, 1.20],
      ['chair_5', -2.75, -2.60, 1.9, 0.70, 0.70],
      // and a long bench down the side you come in from, aft of the hole
      ['bench_3', -1.10, 2.94, 0, 3.38, 0.50],
    ];
    for (const e of PLAN) {
      const [, x, z, , w, d, o] = e;
      if (!w || (o && o.loose)) continue;
      if (o && o.deck) solid(x, z, w, d);
      else solidLow(x, z, w, d);
      e.box = PROPS[PROPS.length - 1];
    }
    /* ---- HER STORES: THE OWNER'S PIRATE-SHIP SET ----------------------
     * "Pirate Ship Assets" by Liaval (CC-BY-4.0, `tools/pirate_pack.py`):
     * barrels, crates, sacks and a pallet, one named node each in
     * `assets/pirate-props.glb`. They replace every stowed thing she had that
     * was a box or a cylinder drawn here — the casks of the furniture set,
     * the deck's own casks and its crate, two of the pot stacks down the
     * port side and the two loose baskets in the hold — and each stands WHERE THE
     * THING IT REPLACES STOOD and is solid where that was solid, so the walk
     * she was swept for is the walk she still has. (The catch basket stays:
     * the captain lands in it. So do her sea chest and her wheel, which are
     * the owner's own and the puzzles' own.) SHE IS A CRAB BOAT, by the
     * owner's word: nothing of the set that says pirate — no cannon, no shot,
     * no cutlass, no treasure chest, no stocked anchor — only the stores a
     * working boat carries.
     *
     * [piece, x, z, yaw, w, d (the solid box; 0 for none), opts]
     *   s: scale · deck: on the weather deck, not the sole · on: stood on
     *   the thing below it at this height · lie: a barrel on its side */
    const PIRATE = [
      // ---- the bow of her hold, forward of the breach: her stores
      ['barrel', -7.30, -2.45, 0.4, 0.88, 0.88, { s: 1.22 }],
      ['barrel_open', -6.45, -2.84, 2.6, 0.80, 0.80, { s: 1.12 }],
      ['crate_small', -5.70, -3.12, 1.7, 0.62, 0.62, { s: 1.12 }],
      // one adrift, lying on its side where it rolled
      ['barrel', -7.10, -1.15, 1.9, 0.92, 0.90, { s: 1.1, lie: true }],
      ['sacks', -7.50, 2.55, Math.PI / 2 + 0.12, 1.02, 0.80, { s: 0.74 }],
      // where the two loose baskets stood
      ['crate_open', -6.0, -1.3, 0.12, 0.62, 0.92, { s: 1.0 }],
      // (the lone sack that lay here is gone: cloth that does not break, flat on the sole, and you caught on it —
      // the owner, 2026-10-17: "take this out I get stuck on it")
      // ---- her quarters: the keg the sea chest stands in front of, and a crate by it
      ['barrel', 6.50, 3.05, 0.9, 0.62, 0.62, { s: 0.9 }],
      ['crate', 5.75, 3.15, 2.1, 0.80, 0.80, { s: 0.95 }],
      // ---- her deck: casks where her casks stood, the crate on the starboard waist
      ['barrel', -7.2, deckHalf(-7.2) - 0.70, 0.5, 0.78, 0.78, { s: 1.0, deck: true }],     // (against the rail: the starboard waist is the walk)
      ['barrel_open', -5.3, deckHalf(-5.3) - 0.64, 1.3, 0.70, 0.70, { s: 0.92, deck: true }],
      ['barrel', 8.75, 2.95, 2.4, 0.74, 0.74, { s: 0.95, deck: true }],     // (with the afterdeck's others, against her rail: it stood alone mid-deck — the owner, 2026-11-24: "less sporadic")
      ['crate', -0.9, 3.45, Math.PI / 2 + 0.22, 0.95, 0.75, { s: 1.08, deck: true }],     // (a metre aft of where it stood: the gaff post can be walked round now)
      ['crate_small', -0.94, 3.42, 0.55, 0, 0, { s: 0.78, deck: true, on: 0.477 * 1.08 }],
      // the port side's stowed gear, where the basket stacks stood
      ['crate', -3.0, -3.45, Math.PI / 2 + 0.1, 0.8, 0.8, { s: 0.95, deck: true }],
      ['crate_small', -3.02, -3.47, 0.4, 0, 0, { s: 0.82, deck: true, on: 0.477 * 0.95 }],
      ['crate', 10.6, -2.90, Math.PI / 2 + 0.2, 0.8, 0.8, { s: 0.95, deck: true }],
      ['crate', 10.62, -2.92, Math.PI / 2 - 0.12, 0, 0, { s: 0.9, deck: true, on: 0.477 * 0.95 }],
      // ---- her afterdeck, where a working boat stows
      ['barrel', 9.42, 2.46, 0.6, 0.88, 0.88, { s: 1.22, deck: true }],
      ['barrel_lantern', 10.06, 2.08, 2.2, 0.62, 0.62, { s: 0.9, deck: true }],
    ];
    // each piece's height in the set, at a scale of one: the top of what stands there
    const PH = { barrel: 0.736, barrel_open: 0.736, barrel_lantern: 0.992, crate: 0.477, crate_open: 0.444,
      crate_small: 0.515, crate_lid: 0.049, sacks: 0.614, sack: 0.31, pallet: 0.08, plank: 0.05 };
    const pieceTop = ([name, , , , , , o]) => (o.on || 0) + (o.lie ? 0.675 : PH[name] || 0.5) * (o.s || 1);
    for (const e of PIRATE) {
      const [, x, z, , w, d, o] = e;
      if (!w) continue;
      let top = pieceTop(e);
      for (const f of PIRATE) if (!f[4] && Math.hypot(f[1] - x, f[2] - z) < 0.2) top = Math.max(top, pieceTop(f));
      if (o && o.deck) solid(x, z, w, d, undefined, undefined, DECK_Y + top);
      else solidLow(x, z, w, d, HOLD_Y + top);
      e.box = PROPS[PROPS.length - 1];
    }
    /* THE BARRELS AND CRATES BREAK. Sacks are cloth and stay. A piece with
     * no box of its own is stood ON the one below it (`on`) and goes with it.
     * Each unit's pieces are found again after the bake by `unit` (main.js
     * `shipBreakables` lifts its triangles out of the merged stores). */
    for (let k = 0; k < PIRATE.length; k++) {
      const e = PIRATE[k], [name, x, z, ry, w] = e, o = e[6] || {};
      if (!/^(barrel|crate)/.test(name) || !w) continue;
      const u = { kind: /^barrel/.test(name) ? 'barrel' : 'crate', x, z, ry, deck: !!o.deck, lie: !!o.lie, box: e.box, pieces: [], floor: null };
      e.unit = u;
      for (const f of PIRATE) if (!f[4] && f !== e && Math.hypot(f[1] - x, f[2] - z) < 0.2) f.unit = u;
      BREAKABLE.push(u);
    }
    /* AND THE TABLES AND THE CATCH BASKET (2026-10-17, the owner: "make tables in the shipwreck break too but keep
     * their textures"; "make the basket to catch the key breakable when hit and when walked through"). The tables'
     * pieces are the furniture set's own meshes (`src: 'furniture'`, lifted out of its merge like the stores, UVs
     * and all); the mess table takes its mug, cup and lamp with it (`top`). The basket is its own group (`group`),
     * like a pot stack, and breaks when you walk into it (`walk`). Appended LAST: a save's unit numbers stay. */
    for (const name of ['table_3', 'table_1']) {
      const e = PLAN.find((f) => f[0] === name); if (!e || !e.box) continue;
      const [, x, z, ry, , , o] = e;
      const u = { kind: 'table', src: 'furniture', x, z, ry, deck: !!(o && o.deck), lie: false, box: e.box, pieces: [], floor: soleY(x, z) - 0.02,
                  top: name === 'table_3' ? S.userData.messTop : null };
      e.unit = u;
      BREAKABLE.push(u);
    }
    if (S.userData.catchBasket) {
      const cb = S.userData.catchBasket;
      cb.unit = { kind: 'basket', group: cb.group, x: cb.x, z: cb.z, ry: cb.ry, deck: false, lie: false, box: cb.box, pieces: [], floor: cb.lo, walk: true };
      BREAKABLE.push(cb.unit);
    }
    /* AND THE BENCHES AND THE CHAIRS (2026-11-14, the owner, with a picture of the quarters: "make this wood bench and
     * chairs break as well"): the mess bench and its two chairs, and the hold's long bench and its chair — the tables'
     * own way (`src: 'furniture'`, their own meshes, kind 'table' for the wood's break). Appended after the basket, so a
     * save's unit numbers stay. */
    for (const name of ['bench_4', 'chair_2', 'chair_3', 'bench_3', 'chair_5']) {
      const e = PLAN.find((f) => f[0] === name); if (!e || !e.box || e.unit) continue;
      const [, x, z, ry, , , o] = e;
      const u = { kind: 'table', src: 'furniture', x, z, ry, deck: !!(o && o.deck), lie: false, box: e.box, pieces: [], floor: soleY(x, z) - 0.02, top: null };
      e.unit = u;
      BREAKABLE.push(u);
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
      const K = { table: 0.50, bench: 0.40, chair: 0.55, barrel: 0.557, bunk: 1.00 };   // (table 0.402 -> 0.50, 2026-11-24: 16 against her sole's 26)
      const mats = new Map();
      const dress = (m) => {
        let out = mats.get(m);
        if (!out) {
          const k = K[m.name] === undefined ? 0.5 : K[m.name];
          out = m.clone();
          /* (and cooled, 2026-11-24: the set is an orange oak, and beside her own timber — now a photograph of grey boards —
           * it was the one warm thing in the room) */
          const t = m.name === 'bunk' ? [1, 1, 1] : [0.70, 0.88, 1.04];
          out.color.setRGB(k * t[0], k * t[1], k * t[2]);
          out.emissive = new THREE.Color(...t);
          out.emissiveMap = out.map;
          out.emissiveIntensity = 0.30 * k;
          out.roughness = 1;
          out.metalness = 0;
          out.side = THREE.FrontSide;
          S.userData.holdLight.lit(out);
          mats.set(m, out);
        }
        return out;
      };
      for (const e of PLAN) {
        const [name, x, z, ry, w, d, o] = e;
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
        if (e.unit) e.unit.pieces.push(m);
      }
      S.add(G);
      return G;
    };
    /* And the pirate set, the same way: solid already, stood when it lands.
     * One lift per material, on luminance, like the furniture's — the set is
     * a bright stylised studio texture and this is a dead boat at night. */
    S.userData.dressPirate = (root) => {
      const G = new THREE.Group(); G.name = 'shipStores';
      const byName = new Map();
      root.traverse((o) => { if (o.isMesh || (o.isGroup && o.children.length)) if (!byName.has(o.name)) byName.set(o.name, o); });
      /* MEASURED ON SCREEN AGAINST HER OWN BOARDS: at the furniture's lifts
       * the set's stylised wood came out a saturated orange that stood off
       * the grey, salt-bleached boat like painted toys. Its wood takes less
       * light and a cold cast (`TINT`) toward her own weathered timber; the
       * lantern's iron takes more, or it is a hole on a dark deck. */
      /* AND THEY WEAR HER OWN TIMBER AND IRON (2026-11-24, the owner). Tinting only made the toys grey: the set's trim sheet
       * is a painted one. Its UVs are kept and the SHEET is ours, band for band (`tools/timber_pack.html`): the photographed
       * boards, her rust, a laid rope; the sacks' tartan is burlap. */
      const K = { TileSheet: 0.62, Tilesheet2: 0.24, Material: 0.72, Metal: 0.75 };
      const TINT = { TileSheet: [0.84, 0.94, 1.0], Tilesheet2: [0.62, 0.72, 0.80], Material: [0.90, 0.94, 0.92] };   // (cooled: sRGB-decoded, they read sat 0.55 against her 0.35)
      const SKIN = {
        TileSheet: loadedMap('stores', 'assets/wreck-stores.jpg', 'assets/wreck-stores-n.jpg', 1024),
        Material: loadedMap('sack', 'assets/wreck-sack.jpg', 'assets/wreck-sack-n.jpg', 512),
      };
      for (const k of Object.keys(SKIN)) for (const t of [SKIN[k].map, SKIN[k].normal]) { t.flipY = false; if (t.image) t.needsUpdate = true; }   // (a glTF's uv: v down)
      // and decoded as the set's own colour maps are (sRGB): the wreck's own maps are not, and these were tuned beside the set
      for (const k of Object.keys(SKIN)) SKIN[k].map.colorSpace = THREE.SRGBColorSpace;
      /* 1.2 m2 of the set was mapped to a point (the undersides and the insides of its boards): those triangles are laid on
       * the sheet's plain boards, by where they are, at the rest's 1.47 m a tile */
      const unpoint = (g) => {
        const q = g.index ? g.toNonIndexed() : g.clone(), P = q.attributes.position, U = q.attributes.uv, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3(), f = new THREE.Vector3();
        let hit = false;
        for (let i = 0; i + 2 < P.count; i += 3) {
          A.fromBufferAttribute(P, i); B.fromBufferAttribute(P, i + 1); C.fromBufferAttribute(P, i + 2);
          n.crossVectors(e.subVectors(B, A), f.subVectors(C, A));
          const area = n.length() / 2, ua = Math.abs((U.getX(i + 1) - U.getX(i)) * (U.getY(i + 2) - U.getY(i)) - (U.getX(i + 2) - U.getX(i)) * (U.getY(i + 1) - U.getY(i))) / 2;
          if (area < 1e-7 || ua / area > 0.02) continue;
          hit = true;
          const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), uA = ax > ay && ax > az ? 2 : 0, vA = ay > ax && ay > az ? 2 : 1;
          const V = [A, B, C], v0 = Math.min(...V.map((p) => p.getComponent(vA))), vs = Math.min(1 / 1.47, 0.22 / Math.max(1e-3, Math.max(...V.map((p) => p.getComponent(vA))) - v0));
          V.forEach((p, k) => U.setXY(i + k, p.getComponent(uA) / 1.47, 0.768 + (p.getComponent(vA) - v0) * vs));
        }
        return hit ? q : g;
      };
      const unpointed = new Map();
      const fixed = (g) => { let q = unpointed.get(g); if (!q) unpointed.set(g, q = unpoint(g)); return q; };
      /* and BELOW her deck nothing is moonlit: what is seen down there is its
       * own lift, so a piece in the hold or the quarters takes twice the
       * deck's (the furniture's own level, measured against her sole) */
      const mats = new Map();
      const dress = (m, below) => {
        const key = m.uuid + (below ? ':h' : ':d');
        let out = mats.get(key);
        if (!out) {
          const k = K[m.name] === undefined ? 0.35 : K[m.name];
          const t = TINT[m.name] || [1, 1, 1];
          out = m.clone();
          out.color.setRGB(k * t[0], k * t[1], k * t[2]);
          out.emissive = new THREE.Color(t[0], t[1], t[2]);
          if (SKIN[m.name]) { out.map = SKIN[m.name].map; out.normalMap = SKIN[m.name].normal; }
          out.emissiveMap = out.map;
          out.emissiveIntensity = (below ? 0.50 : 0.46) * k;
          out.roughness = 1; out.metalness = 0;
          out.metalnessMap = null; out.roughnessMap = null;
          out.side = THREE.FrontSide;
          if (below) S.userData.holdLight.lit(out);
          mats.set(key, out);
        }
        return out;
      };
      for (const [name, x, z, ry, w, d, o = {}] of PIRATE) {
        const src = byName.get(name);
        if (!src) { console.warn('shipwreck: no pirate piece named ' + name); continue; }
        const piece = new THREE.Group();
        // a multi-material piece arrives as a group of meshes: copy each, dressed
        const meshes = [];
        if (src.isMesh) meshes.push(src); else src.traverse((c) => { if (c.isMesh) meshes.push(c); });
        const sc = o.s || 1;
        const inner = new THREE.Group();
        for (const sm of meshes) {
          const m = new THREE.Mesh(sm.material.name === 'TileSheet' ? fixed(sm.geometry) : sm.geometry, dress(sm.material, !o.deck));
          m.position.copy(sm.position); m.quaternion.copy(sm.quaternion); m.scale.copy(sm.scale);
          inner.add(m);
        }
        inner.scale.setScalar(sc);
        if (o.lie) {
          // on its side: its axis laid along local z, resting on its round
          const bb = new THREE.Box3().setFromObject(inner);
          const r = (bb.max.x - bb.min.x) / 2, h = bb.max.y - bb.min.y;
          inner.rotation.x = Math.PI / 2;
          inner.position.set(0, r * 0.94, -h / 2);
        }
        piece.add(inner);
        // the lowest board under its own footprint, or her deck, or what it is stood on
        const fw = Math.max(w, 0.4), fd = Math.max(d, 0.4);
        let y = o.deck ? DECK_Y : soleUnder(x, z, fw, fd);
        if (o.on) y += o.on;
        piece.position.set(x, y, z);
        piece.rotation.y = ry;
        G.add(piece);
        const u = PIRATE.find((f) => f[0] === name && f[1] === x && f[2] === z).unit;
        if (u) { u.pieces.push(piece); if (u.floor === null) u.floor = y; }
      }
      S.add(G);
      return G;
    };
    /* ---- HER PLATING: riveted iron plate, bent onto what it covers as the sheets are (below). Each plate is its own
     * piece of the tile (u starts anywhere, v at its own foot, where the rust is), 12 mm thick with its edges turned, its
     * rivets 7 cm in from them in `M.steel`. Merged here into two meshes: `uvLaid`, so the metres pass leaves them. */
    {
      const PP = [], PU = [], PI = [], riv = [], TH = 0.012;
      const plate = (at, u0, u1, w0, w1, seed) => {
        const nu = Math.max(2, Math.ceil((u1 - u0) / 0.16)), nw = Math.max(2, Math.ceil((w1 - w0) / 0.2)), off = rnd(seed) * 4, b0 = PP.length / 3;
        const V = (i, j, t) => { const u = u0 + (u1 - u0) * i / nu, w = w0 + (w1 - w0) * j / nw; PP.push(...at(u, w, t)); PU.push((u - u0) / PLATE_T + off, (w - w0) / PLATE_T); };
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nw; j++) V(i, j, TH);
        for (let i = 0; i < nu; i++) for (let j = 0; j < nw; j++) { const o = b0 + i * (nw + 1) + j, q = o + nw + 1; PI.push(o, q, q + 1, o, q + 1, o + 1); }
        // the edges: the rim again, and the rim let in to the wall
        const ring = []; for (let i = 0; i <= nu; i++) ring.push([i, 0]); for (let j = 1; j <= nw; j++) ring.push([nu, j]); for (let i = nu - 1; i >= 0; i--) ring.push([i, nw]); for (let j = nw - 1; j >= 0; j--) ring.push([0, j]);
        for (let k = 0; k + 1 < ring.length; k++) { const o = PP.length / 3; V(...ring[k], TH); V(...ring[k + 1], TH); V(...ring[k + 1], -0.02); V(...ring[k], -0.02); const up1 = ring[k][0] === ring[k + 1][0] ? 1 : 0, e = 0.032 / PLATE_T; PU[PU.length - 3 - up1] += e; PU[PU.length - 1 - up1] += e; PI.push(o, o + 1, o + 2, o, o + 2, o + 3); }
        const spot = (u, w) => { const p = at(u, w, TH), q = at(u, w, TH + 0.1); riv.push([p, [q[0] - p[0], q[1] - p[1], q[2] - p[2]]]); };
        const ku = Math.max(1, Math.round((u1 - u0 - 0.14) / 0.24)), kw = Math.max(1, Math.round((w1 - w0 - 0.14) / 0.24));
        for (let i = 0; i <= ku; i++) for (const w of [w0 + 0.07, w1 - 0.07]) spot(u0 + 0.07 + (u1 - u0 - 0.14) * i / ku, w);
        for (let j = 1; j < kw; j++) for (const u of [u0 + 0.07, u1 - 0.07]) spot(u, w0 + 0.07 + (w1 - w0 - 0.14) * j / kw);
      };
      // a run of them, butted with a finger between
      const run = (at, u0, u1, w0, w1, n, seed) => { for (let k = 0, a = u0; k < n; k++) { const b = k === n - 1 ? u1 : u0 + (u1 - u0) * (k + 1 + (rnd(seed + k * 3.1) - 0.5) * 0.24) / n; plate(at, a + 0.004, b - 0.004, w0, w1, seed + k * 1.7); a = b; } };
      // round the foot of the wheelhouse (its casing is 0.13 proud of the walls), open at the door's steps
      const cx = (BR_X0 + BR_X1) / 2, cw = (BR_X1 - BR_X0 + 0.26) / 2 + 0.002, cz = BR_HZ + 0.132, lo = DECK_Y + 0.045, hi = DECK_Y + BR_STEP - 0.075;
      run((u, w, t) => [u, w, -(cz + t)], cx - cw, cx + cw, lo, hi, 4, 3.3);
      run((u, w, t) => [u, w, cz + t], cx - cw, BR_DOOR_C - BR_DOOR_W / 2 - 0.20, lo, hi, 2, 8.9);
      run((u, w, t) => [cx - cw - t, w, u], -cz, cz, lo, hi, 5, 14.1);
      run((u, w, t) => [cx + cw + t, w, u], -cz, cz, lo, hi, 5, 21.7);
      // the foot of the quarters' bulkhead, from the hold, either side of its door
      const bz = Math.min(HOLD_HZ, halfAtY(3.0, HOLD_Y + 0.5) - 0.10) - 0.12;
      for (const sg of [-1, 1]) run((u, w, t) => [3.0 - 0.002 - t, w, sg * u], 0.80, bz, HOLD_Y + 0.0, HOLD_Y + 0.86, 3, 31 + sg * 3);
      // and her bow, both sides, between the wales: where she took the rocks
      for (const sg of [-1, 1]) run((u, w, t) => hullPt(u, w, sg, 0.012 + t), -12.3 + (sg > 0 ? 2.6 : 0), -8.0 - (sg > 0 ? 1.5 : 0), 1.93, 2.80, sg > 0 ? 1 : 4, 41 + sg * 5);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(PP, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(PU, 2)); g.setIndex(PI); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.plate); m.name = 'shipPlating'; m.userData.noBake = m.userData.uvLaid = true; S.add(m);
      // the rivets: low domes, baked with the rest of her iron
      const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), dome = new THREE.CylinderGeometry(0.009, 0.019, 0.012, 6);
      for (const [p, n] of riv) { const r = new THREE.Mesh(dome, M.steel); r.position.set(...p); r.quaternion.setFromUnitVectors(up, d.set(...n).normalize()); r.position.addScaledVector(d, 0.004); HULL.add(r); }
    }
    /* ---- HER RUSTED SHEETS (2026-11-24, the owner: "use some of these rusted sheet models to add to the ship") -----------
     * "Rusted Sheet Metal" by George Hager (CC-BY-4.0, `tools/sheet_pack.py`): twenty corrugated sheets, `sheet_0..19` in
     * `assets/rusted-sheet.glb` (0-4 and 10-14 rusted through, 5-9 and 15-19 half gone; 10 up are bent). At 8x a sheet is
     * 0.86 x 1.7 m and its corrugations 7 cm, the real thing. They are what somebody patched her with: over the ribs of her
     * hold, under her deck, across the holes in her sole, over her broken rail, on the wheelhouse and down her sides.
     * EACH IS BENT ONTO WHAT IT IS NAILED TO (invariant 6): its own vertices are the (u, w) of a surface and its thickness
     * the way out of it, so nothing hangs off her curve or is buried in it. All of them lie within a hand of something solid
     * already, except the one leaned on the bulkhead, which has a box of its own.
     *   [sheet, where, u, w, opts] — h: lying on its long side · a: turned in its plane · s: scale · o: pushed further out
     *   · c: one corner curled off */
    const SK = 8, RIB = 0.118;
    const wallIn = (sg, off) => (u, w, t) => [u, w, sg * (Math.min(HOLD_HZ, halfAtY(u, w) - 0.10) - off - t)];
    const sideOut = (sg) => (u, w, t) => hullPt(u, w, sg, 0.10 + t);          // over the wales, which are 9 cm proud
    const railIn = (sg) => (u, w, t) => hullPt(u, w, sg, -TOPSIDE_T - 0.10 - t);   // on the stanchions
    const flat = (y) => (u, w, t) => [u, y + t * 0.45, w];
    const onSand = (u, w, t) => [u, HOLD_Y - 0.07 - soleDip(u, w) + 0.012 + t * 0.45, w];   // (the sand under her sole: `build(0.07, M.wetsand)`)
    const SHT = [0.72, 0.98, 0.80];   // (browner than her iron's: on screen their rust read hue 14, crimson, against her 30-35 — `wreckTones`)
    const bxB = 3.4 - 0.35 - 0.05, aftX = BR_X1 + 0.085, WF = DECK_Y + BR_STEP;
    const SHEETS = [
      // ---- her hold: both walls, over the ribs
      [10, wallIn(-1, RIB), -6.75, 1.92, { a: 0.03, c: 0.10 }],
      [5, wallIn(-1, RIB + 0.02), -5.95, 1.80, { a: -0.05 }],
      [1, wallIn(-1, RIB), -3.62, 2.28, { h: 1, a: 0.04, c: 0.08 }],
      [3, wallIn(1, RIB), -1.65, 2.10, { h: 1, a: -0.03 }],
      [16, wallIn(1, RIB + 0.02), -0.20, 1.98, { h: 1, a: 0.06, c: 0.12 }],
      // under her deck, on the beams forward
      [12, flat(DECK_Y - 0.275), -6.85, 1.75, { h: 1, a: 0.05, below: 1 }],
      [8, flat(DECK_Y - 0.275), -6.80, -1.55, { h: 1, a: -0.09, below: 1 }],
      // leaned on the quarters' bulkhead, in the corner
      [14, (u, w, t) => [bxB - 0.03 - t - 0.36 * (1 - (w - HOLD_Y) / 1.72), w, u], 2.35, HOLD_Y + 0.72, { below: 1 }],
      // laid over the holes in her sole
      // fallen through the holes in her sole and lying on the sand she sits on (`GOUGE`; a hole is wider than a sheet is
      // long, so one laid across it at the boards' height would have been floating)
      [2, onSand, 1.42, 0.92, { a: 0.35, below: 1 }],
      [6, onSand, -6.15, 0.72, { a: -0.25, below: 1 }],
      // ---- the wheelhouse: its after wall, its blind side, and two sliding off the back of its roof
      [0, (u, w, t) => [aftX + t, w, u], -1.35, WF + 0.98, { a: 0.02, deck: 1 }],
      [17, (u, w, t) => [aftX + 0.02 + t, w, u], -0.58, WF + 0.93, { a: -0.04, c: 0.10, deck: 1 }],
      [4, (u, w, t) => [aftX + t, w, u], 1.55, WF + 1.00, { a: 0.05, deck: 1 }],
      [13, (u, w, t) => [u, w, -(BR_HZ + 0.085 + t)], 3.65, WF + 0.46, { h: 1, deck: 1 }],
      [9, (u, w, t) => [u, w, -(BR_HZ + 0.105 + t)], 5.15, WF + 0.45, { h: 1, a: 0.02, deck: 1 }],
      [11, flat(WF + BR_H + 0.135), BR_X1 - 0.25, -1.45, { h: 1, a: 0.06, deck: 1 }],
      [15, flat(WF + BR_H + 0.155), BR_X1 - 0.10, -0.62, { h: 1, a: -0.10, deck: 1 }],
      // (none lying loose on her open deck: two did, for no reason a man would leave one there)
      // ---- her sides, over the rot
      [10, sideOut(1), -8.75, 2.15, { a: 0.04, c: 0.12, deck: 1 }],
      [6, sideOut(1), 1.9, 2.30, { h: 1, a: -0.03, deck: 1 }],
      [14, sideOut(1), 3.5, 2.25, { h: 1, a: 0.05, c: 0.10, deck: 1 }],
      [3, sideOut(1), 8.75, 1.45, { a: -0.06, deck: 1 }],
      [12, sideOut(-1), 5.05, 1.60, { a: 0.05, c: 0.10, deck: 1 }],
      [18, sideOut(-1), -4.6, 2.30, { h: 1, deck: 1 }],
      [2, sideOut(-1), 10.35, 2.15, { a: 0.03, deck: 1 }],
    ];
    // and along her rail, wherever two courses or more are gone, on the stanchions inside
    {
      const pick = [0, 15, 4, 8, 11, 19];
      let n = 0;
      for (const sg of [1, -1])
        for (let x = -8.2, last = -99, k = 0; x < 10.4 && k < 3; x += 0.1) {
          if (x - last < 4.2 || bulwarkWear(x, sg) < COURSE * 1.9) continue;
          SHEETS.push([pick[n++ % pick.length], railIn(sg), x + 0.45, DECK_Y + 0.40 + sheerAt(x + 0.45), { h: 1, s: 0.8, a: (k % 2 ? 0.05 : -0.04), c: 0.06, deck: 1 }]);
          last = x; k++;
        }
    }
    solidLow(bxB - 0.18, 2.35, 0.36, 0.86, HOLD_Y + 1.7);
    S.userData.dressSheets = (root) => {
      const G = new THREE.Group(); G.name = 'shipSheets';
      const src = new Map();
      root.traverse((o) => { if (o.isMesh) src.set(o.name, o); });
      let mD = null, mB = null;
      const v = new THREE.Vector3();
      for (const [id, at, cu, cw, o = {}] of SHEETS) {
        const m = src.get('sheet_' + id);
        if (!m) { console.warn('shipwreck: no rusted sheet ' + id); continue; }
        if (!mD) {
          const base = m.material;
          for (const t of [base.map, base.normalMap]) if (t) { t.magFilter = THREE.LinearFilter; t.anisotropy = 8; }
          const mk = (lift) => {
            const q = base.clone();
            q.color.setRGB(...SHT.map((k) => k * 0.92)); q.roughness = 0.9; q.metalness = 0; q.roughnessMap = q.metalnessMap = null;
            q.emissive = new THREE.Color(...SHT); q.emissiveMap = q.map; q.emissiveIntensity = lift; q.side = THREE.DoubleSide; q.transparent = false;
            return q;
          };
          mD = mk(0.19); mD.name = 'wreck.sheetDeck';
          mB = mk(0.22); mB.name = 'wreck.sheetHold'; S.userData.holdLight.lit(mB);
        }
        const g = new THREE.BufferGeometry(), P = m.geometry.attributes.position, bb = new THREE.Box3().setFromBufferAttribute(P);
        const mx = (bb.min.x + bb.max.x) / 2, mz = (bb.min.z + bb.max.z) / 2, K = SK * (o.s || 1), ca = Math.cos(o.a || 0), sa = Math.sin(o.a || 0);
        const hx = (bb.max.x - bb.min.x) / 2, hl = (bb.max.z - bb.min.z) / 2, pos = new Float32Array(P.count * 3);
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i);
          const a = (v.x - mx) * K, l = (v.z - mz) * K;
          let t = (v.y - bb.min.y) * K;
          if (o.c) { const q = Math.max(0, (v.x - mx) / hx + (v.z - mz) / hl - 0.75) / 1.25; t += o.c * q * q; }   // a corner let go
          const u0 = o.h ? l : a, w0 = o.h ? a : l;
          const p = at(cu + u0 * ca - w0 * sa, cw + u0 * sa + w0 * ca, t);
          pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
        }
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('uv', m.geometry.attributes.uv.clone());
        g.setIndex(m.geometry.index.clone()); g.computeVertexNormals();
        G.add(new THREE.Mesh(g, o.deck ? mD : mB));
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
  /* A HEAP, NOT A GEM. These were twenty-faced icosahedra — at two to three
   * metres across, lit by one low moon, every one of them read as a crude
   * faceted slab with a white facet on it lying at her foot, which is the
   * opposite of drifted sand. A drift is a dome that falls away PAST its own
   * rim, so the edge is buried under the beach instead of drawn across it
   * (`makeApron`'s own profile), knocked a little out of round so thirty-four
   * of them are not one shape turned. Base radius 0.5 so the old scales hold. */
  const heap = (() => {
    const NR = 9, NA = 20, pos = [], idx = [];
    pos.push(0, 0.56, 0);
    for (let r = 1; r <= NR; r++) {
      const d = (r / NR) * 1.3;
      for (let a = 0; a < NA; a++) {
        const th = (a / NA) * Math.PI * 2;
        const wob = 1 + 0.10 * Math.sin(th * 2 + 0.7) + 0.06 * Math.sin(th * 3 + 2.1);
        const dd = Math.min(1, d);
        const y = 0.56 * Math.cos(dd * Math.PI * 0.5) ** 1.6 - (d > 0.9 ? (d - 0.9) * 0.55 : 0);
        pos.push(Math.cos(th) * d * 0.5 * wob, y, Math.sin(th) * d * 0.5 * wob);
      }
    }
    for (let a = 0; a < NA; a++) idx.push(0, 1 + (a + 1) % NA, 1 + a);
    for (let r = 1; r < NR; r++) for (let a = 0; a < NA; a++) {
      const i0 = 1 + (r - 1) * NA + a, i1 = 1 + (r - 1) * NA + (a + 1) % NA;
      const j0 = i0 + NA, j1 = i1 + NA;
      idx.push(i0, i1, j0, i1, j1, j0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  for (let i = 0; i < 34; i++) {
    const x = -HALF - 1 + rnd(i * 2.9) * (LEN + 2);
    const sg = i % 2 ? 1 : -1;
    const sx = 1.6 + rnd(i * 3.3) * 2.0;
    let hgt = 0.7 + rnd(i * 5.1) * 0.9;
    const sz = 1.2 + rnd(i * 7.7) * 1.1;
    /* NOT A DUNE ACROSS THE WAY OUT. Six of these land on her -Z side over
     * the far tear, one 3.5 m wide right on its middle and up to 1.6 tall —
     * a wall of sand standing in front of the hole you leave by. Over the
     * tear they are kept to a spill: what ran out of her, ankle deep. */
    if (sg < 0 && x + sx * 0.5 > FAR_X0 - 0.4 && x - sx * 0.5 < FAR_X1 + 0.4) hgt = Math.min(hgt, 0.32);
    /* AND IT IS TURNED, so what reaches toward her is its LONGEST side, not
     * `sz`: spaced off by `sz / 2` and spun to a random angle, the long side
     * of a 3.6 m drift came round into her planking (the owner, 2026-10-16:
     * "the sand is clipping through the ship in other places"). The radius
     * that clears her is the dome's above-ground reach at its widest
     * wobble, whichever way it ends up facing. */
    const rEff = 0.5 * 1.16 * Math.max(sx, sz);
    let b = 0;
    for (let k = -1; k <= 1; k += 0.125) {
      const xx = Math.max(-HALF, Math.min(HALF, x + k * rEff));
      for (let y = 0; y <= 1.2; y += 0.3) b = Math.max(b, halfAtY(xx, y));
    }
    const m = new THREE.Mesh(heap, M.sand);
    m.scale.set(sx, hgt, sz);
    m.position.set(x, 0, sg * (b + rEff + 0.1 + rnd(i * 4.2) * 0.4));
    m.rotation.y = rnd(i) * 3.1;
    S.add(m);
  }

  bakeGroup(HULL);
  bakeGroup(BR);
  bakeGroup(S);
  /* every face of these in her own metres (`layInMetres`): the density each map was drawn for — the lining's 13 courses
   * sole to deckhead (`HOLD_Y` to `DECK_Y`, 174 px/m, so its tide line stands where it did), the wheelhouse's eight
   * upright boards to 0.96 m (533), the planking's 0.17 m courses (84, as the bulwark's), the timber's grain at 0.75 m a
   * tile (340), the rope's lay (400), the rusted iron's metre a tile, standing (512: its runs run down) */
  const _lay0 = performance.now();
  S.userData.uvLaidTris = layInMetres(S, [
    [M.wood, 'grain', 512], [M.rope, 'grain', 620], [M.steel, 'upright', 512], [M.plate, 'upright', 1024 / PLATE_T, HOLD_Y],
    [M.brass, 'upright', 900], [M.gold, 'upright', 900], [M.rubber, 'upright', 700], [M.glass, 'upright', 200],
    [M.plank, 'upright', 256 / (18 * COURSE), DECK_Y], [M.paint, 'upright', 533, DECK_Y],
    [M.inner, 'upright', 1024 / (DECK_Y - HOLD_Y), HOLD_Y], [M.dark, 'upright', 1024 / (DECK_Y - HOLD_Y), HOLD_Y],
    [M.sole, 'upright', 1024 / 2.95, HOLD_Y],
  ]);
  S.userData.uvLaidMs = performance.now() - _lay0;

  /* ---- LIGHT IN HER HOLD (2026-11-24, the owner: "make all the lighting cinematic, especially inside of the ship") -----
   * Every surface down here lit itself evenly (its emissive lift), so the hold had no light in it, only visibility. Now the
   * light comes from where it can: the MOON, low on the -Z side (main.js `MOON_DIR`, 7 degrees up), through the far tear
   * (which faces it), traced per pixel through its real outline — its arch laid long across her sole and up the far side —
   * and nothing else: the quarters' bulkhead shadows it except through its door, and the hatch and the ladder well, which
   * the moon cannot reach over her bulwark (they lit the deckhead as a pane of light until that was worked out), let down
   * cold SKY. The even lift is taken down toward her corners and her bow. Shafts and dust (`HOLD_SHAFTS`) hang in the same rays. One GLSL (`WL`), put on
   * every material below decks by `holdLit` (the stores, the furniture and the sheets as they land). */
  const zTear = halfAtY((FAR_X0 + FAR_X1) / 2, 0.9);
  const f3 = (v) => (+v).toFixed(4);
  const WL = `
    uniform mat4 uShipInv; uniform vec3 uMoonL; uniform float uMoonK;
    float wlEdge(float a, float k) { return smoothstep(0.0, k, a); }
    // the far tear's outline (shipwreck.js \`breached\`, sg -1) at its station, as a soft mask
    float wlTear(vec3 Q) {
      float t = (Q.x - ${f3(FAR_X0)}) / ${f3(FAR_X1 - FAR_X0)};
      if (t <= 0.0 || t >= 1.0) return 0.0;
      float top = ${f3(FAR_TOP)} * (0.26 + 0.74 * pow(sin(3.14159 * t), 0.55)) + 0.07 * sin(Q.x * 3.3 + 0.9) + 0.05 * sin(Q.x * 6.2 + 2.6);
      return wlEdge(top - Q.y, 0.14) * wlEdge(min(t, 1.0 - t) * ${f3(FAR_X1 - FAR_X0)}, 0.25) * wlEdge(Q.y - ${f3(HOLD_Y - 0.1)}, 0.1);
    }
    float wlRect(vec2 q, vec2 a, vec2 b, float k) { return wlEdge(min(min(q.x - a.x, b.x - q.x), min(q.y - a.y, b.y - q.y)), k); }
    // the quarters' bulkhead: a ray from aft of it reaches the moon only through its door
    float wlBulk(vec3 P, vec3 d, float tOpen) {
      if (P.x <= 3.0 || d.x >= 0.0) return 1.0;
      float tb = (3.0 - P.x) / d.x;
      if (tb >= tOpen) return 1.0;
      vec3 B = P + d * tb;
      return wlEdge(0.725 - abs(B.z), 0.08) * wlEdge(${f3(HOLD_Y + 1.95)} - B.y, 0.08);
    }
    // how much moon reaches P (her frame)
    float wlMoon(vec3 P) {
      vec3 d = uMoonL; float m = 0.0;
      if (d.z < -0.01 && P.z > -${f3(zTear)}) { float t = (-${f3(zTear)} - P.z) / d.z; vec3 Q = P + d * t; if (Q.y < ${f3(DECK_Y - 0.05)}) m = max(m, wlTear(Q) * wlBulk(P, d, t)); }
      /* (not through the hatch or the ladder well: at seven degrees the moon clears her bulwark only from a metre or more
       * outboard of it, so what comes down those is sky: wlSky) */
      return m;
    }
    // the wheelhouse: the moon in through its port windows and its front, the frames between the panes standing in it
    bool wlInHouse(vec3 P) { return P.x > ${f3(BR_X0 + 0.02)} && P.x < ${f3(BR_X1 - 0.02)} && P.y > ${f3(DECK_Y + BR_STEP - 0.15)} && P.y < ${f3(DECK_Y + BR_STEP + BR_H)} && abs(P.z) < ${f3(BR_HZ - 0.02)}; }
    float wlPanes(float u, float a, float b, float m1, float m2) { return wlEdge(min(u - a, b - u), 0.03) * wlEdge(abs(u - m1) - 0.04, 0.025) * wlEdge(abs(u - m2) - 0.04, 0.025); }
    float wlWin(vec3 P) {
      vec3 d = uMoonL; float m = 0.0, y0 = ${f3(DECK_Y + BR_STEP + 0.95)}, y1 = ${f3(DECK_Y + BR_STEP + 2.28)};
      if (d.z < -0.01) { float t = (-${f3(BR_HZ)} - P.z) / d.z; vec3 Q = P + d * t;
        m = max(m, wlPanes(Q.x, ${f3(BR_X0 + 0.10)}, ${f3(BR_X1 - 0.10)}, ${f3(BR_X0 + (BR_X1 - BR_X0) * 0.34)}, ${f3(BR_X0 + (BR_X1 - BR_X0) * 0.68)}) * wlEdge(min(Q.y - y0, y1 - Q.y), 0.03)); }
      if (d.x < -0.01) { float t = (${f3(BR_X0)} - P.x) / d.x; vec3 Q = P + d * t;
        m = max(m, wlPanes(Q.z, ${f3(-BR_HZ + 0.03)}, ${f3(BR_HZ - 0.03)}, ${f3(-BR_HZ * 0.44)}, ${f3(BR_HZ * 0.44)}) * wlEdge(min(Q.y - y0, y1 - Q.y), 0.03)); }
      return m;
    }
    float wlMoonAll(vec3 P) { return wlInHouse(P) ? wlWin(P) : wlMoon(P); }
    bool wlInHold(vec3 P) { return P.y < ${f3(DECK_Y - 0.03)} && P.x > ${f3(HOLD_X0 - 0.6)} && P.x < ${f3(HOLD_X1 + 0.3)} && abs(P.z) < 4.8; }
    // the even lift, taken down away from where light comes in: her bow, her corners
    float wlAmb(vec3 P) {
      vec2 tear = vec2(clamp(P.x, ${f3(FAR_X0)}, ${f3(FAR_X1)}), -${f3(zTear)}), hatch = vec2(clamp(P.x, ${f3(HATCH_X0)}, ${f3(HATCH_X1)}), clamp(P.z, ${f3(-HATCH_HZ)}, ${f3(HATCH_HZ)}));
      float near = max(exp(-distance(P.xz, tear) / 4.5), exp(-distance(P.xz, hatch) / 3.5));
      float quarters = smoothstep(2.9, 3.4, P.x);
      float corner = smoothstep(0.0, 0.7, ${f3(DECK_Y)} - P.y) * (0.82 + 0.18 * smoothstep(0.0, 0.9, P.y - ${f3(HOLD_Y)}));
      return mix(0.50 + 0.40 * near, 0.80, quarters) * mix(0.78, 1.0, corner);
    }
    /* THE SKY DOWN THE HATCH (2026-11-24, the owner: "add cinematic lighting to the hole with the hook"). The moon cannot
     * reach it, but the whole night sky can: what an opening lets down from a sky is a pool under it whose edge softens as
     * it falls (its penumbra grows with the depth), and a column of it standing in the damp air. wlSkyCol is that shape —
     * the opening's rectangle, widened by how far below the deck — the hatch's and, smaller, the ladder well's. */
    float wlSkySoft(vec2 q, vec2 a, vec2 b, float m) { vec2 d = max(max(a - q, q - b), vec2(0.0)); return 1.0 - smoothstep(0.0, m, length(d)); }
    float wlSkyCol(vec3 P) {
      if (P.y > ${f3(DECK_Y)}) return 0.0;
      float dep = ${f3(DECK_Y)} - P.y;
      float h = wlSkySoft(P.xz, vec2(${f3(HATCH_X0)}, ${f3(-HATCH_HZ)}), vec2(${f3(HATCH_X1)}, ${f3(HATCH_HZ)}), 0.18 + dep * 0.30);
      float w = wlSkySoft(P.xz, vec2(${f3(STAIR_X0)}, ${f3(STAIR_Z0)}), vec2(${f3(STAIR_X1)}, ${f3(STAIR_Z1)}), 0.15 + dep * 0.28) * 0.45;
      return max(h, w) / (1.0 + dep * 0.12);
    }
    vec3 wlSky(vec3 P) {
      vec2 hatch = vec2(clamp(P.x, ${f3(HATCH_X0)}, ${f3(HATCH_X1)}), clamp(P.z, ${f3(-HATCH_HZ)}, ${f3(HATCH_HZ)}));
      vec2 well = vec2(clamp(P.x, ${f3(STAIR_X0)}, ${f3(STAIR_X1)}), clamp(P.z, ${f3(STAIR_Z0)}, ${f3(STAIR_Z1)}));
      float k = exp(-distance(P.xz, hatch) / 1.8) + 0.7 * exp(-distance(P.xz, well) / 1.4);
      return vec3(0.34, 0.42, 0.60) * k * (0.55 + 0.45 * smoothstep(${f3(HOLD_Y)}, ${f3(DECK_Y - 0.4)}, P.y));
    }`;
  const LU = { uShipInv: { value: new THREE.Matrix4() }, uMoonL: { value: new THREE.Vector3(-0.27, 0.117, -0.96) }, uMoonK: { value: 1.15 }, uTime: { value: 0 } };
  const holdLit = (mat) => {
    if (!mat || mat.userData.holdLit) return mat;
    mat.userData.holdLit = true;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, { uShipInv: LU.uShipInv, uMoonL: LU.uMoonL, uMoonK: LU.uMoonK });
      sh.vertexShader = 'varying vec3 vWlW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  { vec4 wlT = vec4(transformed, 1.0);\n  #ifdef USE_INSTANCING\n  wlT = instanceMatrix * wlT;\n  #endif\n  vWlW = (modelMatrix * wlT).xyz; }');
      sh.fragmentShader = 'varying vec3 vWlW;\n' + WL + '\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 wlP = (uShipInv * vec4(vWlW, 1.0)).xyz;
    if (wlInHold(wlP)) {
      vec3 wlN = normalize(mat3(uShipInv) * (vec4(normal, 0.0) * viewMatrix).xyz);
      float wlM = wlMoon(wlP), wlL = max(dot(wlN, uMoonL), 0.0);   // (^0.35 below: a 7-degree moon only grazes her sole, and a film would cheat it a pool)
      totalEmissiveRadiance *= wlAmb(wlP);
      totalEmissiveRadiance += diffuseColor.rgb * (vec3(0.62, 0.74, 1.0) * uMoonK * wlM * pow(wlL, 0.35) + wlSky(wlP) * (0.25 + 0.75 * max(wlN.y, 0.0)) * 0.55
        + vec3(0.42, 0.52, 0.78) * wlSkyCol(wlP) * (0.12 + 0.88 * max(wlN.y, 0.0)) * 0.62);   /* the hatch's pool, on what faces up to it (at 1.15 it lit the whole hold) */
    } else if (wlInHouse(wlP)) {
      vec3 wlN = normalize(mat3(uShipInv) * (vec4(normal, 0.0) * viewMatrix).xyz);
      float wlM = wlWin(wlP), wlL = max(dot(wlN, uMoonL), 0.0);
      totalEmissiveRadiance *= 0.58;
      totalEmissiveRadiance += diffuseColor.rgb * vec3(0.62, 0.74, 1.0) * uMoonK * 0.62 * wlM * pow(wlL, 0.5);   // (at 1.15 the panes' light blew her sea-green paint out to white)
    }
  }`).replace('#include <fog_fragment>', `#include <fog_fragment>
  {
    /* THE AIR DOWN HERE IS DAMP (the owner, 2026-11-24: "like a slight fog or mist in the air"): what is far off in her
     * hold is seen through a cold haze, so the dark has depth and the shafts stand in something */
    vec3 wlP2 = (uShipInv * vec4(vWlW, 1.0)).xyz;
    bool wlH = wlInHold(wlP2), wlW = wlInHouse(wlP2);
    if (wlH || wlW) {
      float wlD = distance(vWlW, cameraPosition), wlF = (1.0 - exp(-wlD * (wlH ? 0.11 : 0.05))) * 0.85;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.040, 0.046, 0.058) + (wlH ? wlSky(wlP2) * 0.05 : vec3(0.0)), wlF);
      /* AND THE MIST CATCHES THE MOON: eight steps along the eye's ray, each asking whether the moon reaches it, dithered per
       * pixel so the steps do not band — the beam stands in the air wherever it really passes, not only on what it lands on */
      vec3 wlC = (uShipInv * vec4(cameraPosition, 1.0)).xyz; float wlS = 0.0, wlJ = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float wlK = 0.0;
      for (int i = 0; i < 8; i++) { vec3 Q = mix(wlC, wlP2, (float(i) + wlJ) / 8.0); if (wlInHold(Q) || wlInHouse(Q)) { wlS += wlMoonAll(Q); wlK += wlSkyCol(Q); } }
      gl_FragColor.rgb += vec3(0.50, 0.60, 0.82) * (wlS / 8.0) * (1.0 - exp(-wlD * 0.35)) * (wlH ? 0.75 : 0.16);
      gl_FragColor.rgb += vec3(0.34, 0.42, 0.62) * (wlK / 8.0) * (1.0 - exp(-wlD * 0.35)) * 0.20;   /* and the hatch's column of sky, in the mist */
    }
  }`);
    };
    mat.customProgramCacheKey = ((k) => () => (k ? k() : '') + '|holdLit')(mat.customProgramCacheKey && mat.customProgramCacheKey.bind(mat));
    mat.needsUpdate = true;
    return mat;
  };
  for (const k of ['inner', 'sole', 'wood', 'deck', 'plank', 'steel', 'plate', 'dark', 'wetsand', 'rope', 'paint', 'brass', 'rubber', 'gold']) holdLit(M[k]);
  holdLit(S.userData.moundMat);
  /* GLASS THAT IS GLASS (2026-11-24, the owner: "less tinted and more realistic and reflective like real glass"). It was
   * a grey-blue film at 38 %: now nearly clear (14 %) and it REFLECTS — Fresnel (Schlick, 4 % face on, all of it at a
   * graze), of the night it stands in: the sky dark to its zenith and paler to the horizon, the sea below it, the moon
   * where the moon is (her frame, `uMoonL`), and the salt and fingermarks on it (`wearMap`) taking the reflection down
   * where they lie. More opaque where it reflects, as glass is. */
  {
    const prev = M.glass.onBeforeCompile;
    M.glass.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, { uShipInv: LU.uShipInv, uMoonL: LU.uMoonL });
      sh.vertexShader = 'varying vec3 vGlW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vGlW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vGlW;\nuniform mat4 uShipInv; uniform vec3 uMoonL;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
  {
    vec3 V = normalize(cameraPosition - vGlW), Nw = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
    if (dot(Nw, V) < 0.0) Nw = -Nw;
    float F = 0.04 + 0.96 * pow(1.0 - clamp(dot(Nw, V), 0.0, 1.0), 5.0);
    vec3 R = mat3(uShipInv) * reflect(-V, Nw);
    vec3 env = R.y > 0.0 ? mix(vec3(0.075, 0.095, 0.15), vec3(0.012, 0.018, 0.04), smoothstep(0.0, 0.55, R.y)) : vec3(0.02, 0.035, 0.06) * (1.0 + 0.6 * smoothstep(-0.25, 0.0, R.y));
    float mu = max(dot(R, uMoonL), 0.0);
    env += vec3(1.0, 0.97, 0.9) * (pow(mu, 900.0) * 2.4 + pow(mu, 30.0) * 0.10);
    float smudge = texture2D(map, vMapUv).r;
    gl_FragColor.rgb += env * F * (0.55 + 0.45 * smudge) * 1.6;
    gl_FragColor.a = clamp(gl_FragColor.a + F * 0.65, 0.0, 0.95);
  }`);
    };
    M.glass.customProgramCacheKey = () => 'wreckGlass';
    M.glass.needsUpdate = true;
  }
  if (S.userData.whMats) for (const m of S.userData.whMats) holdLit(m);
  /* the shafts: the tear's outline and the hatch's, run along the light into her and cut where it stops (her sole, her far
   * side, the bulkhead, the deck), additive, brightest seen square on and fading along their length; and dust that only
   * shows in them */
  const HOLD_SHAFTS = new THREE.Group(); HOLD_SHAFTS.name = 'holdShafts'; HOLD_SHAFTS.userData.noBake = true;
  {
    const prism = (ring, len) => {      // ring: points round an opening; extruded along the light (-uMoonL, set in the shader)
      const pos = [], at = [], idx = [], n = ring.length;
      for (let i = 0; i < n; i++) { pos.push(...ring[i], ...ring[i]); at.push(0, len); }
      for (let i = 0; i < n; i++) { const a = i * 2, b = ((i + 1) % n) * 2; idx.push(a, b, b + 1, a, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1)); g.setIndex(idx); return g;
    };
    const shaftMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uK: { value: 1.25 } }, LU), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `attribute float aT; uniform vec3 uMoonL; varying vec3 vP; varying float vT; varying vec3 vN; varying vec3 vV;
        void main() { vec3 p = position - uMoonL * aT; vP = p; vT = aT; vec4 w = modelMatrix * vec4(p, 1.0); vV = w.xyz; vN = vec3(0.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: WL + `
        uniform float uK, uTime; varying vec3 vP; varying float vT; varying vec3 vN; varying vec3 vV;
        float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main() {
          vec3 P = vP;
          if (P.y < ${f3(HOLD_Y - 0.06)} || P.y > ${f3(DECK_Y - 0.02)} || abs(P.z) > 4.3 || P.x > 3.0 || P.x < ${f3(HOLD_X0)}) discard;
          float m = wlMoon(P); if (m < 0.01) discard;
          /* as thick as the light you look through: a face of the prism seen square on is a thin sheet of it, one seen edge on
           * is the whole depth of the beam (seen square on, the hatch's top face lay under the ceiling as a pane of light) */
          vec3 fn = normalize(cross(dFdx(vV), dFdy(vV))), vd = normalize(cameraPosition - vV);
          float thick = 0.30 + 0.70 * pow(1.0 - abs(dot(fn, vd)), 1.4);
          float k = uK * m * thick * exp(-vT / 10.0) * (0.45 + 1.0 * n3(P * 1.3 + vec3(uTime * 0.05, uTime * 0.02, 0.0)) * (0.6 + 0.4 * n3(P * 0.45 - vec3(0.0, uTime * 0.015, uTime * 0.03))));
          gl_FragColor = vec4(vec3(0.60, 0.72, 1.0) * k, 1.0);
        }` });
    shaftMat.name = 'wreck.shaft';
    // the tear's outline at its station, sampled
    const ring = [];
    for (let i = 0; i <= 18; i++) { const x = FAR_X0 + 0.05 + (FAR_X1 - FAR_X0 - 0.1) * i / 18; let lo = 0, hi = FAR_TOP * 1.3; for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (breached(x, m, -1)) lo = m; else hi = m; } ring.push([x, Math.max(HOLD_Y - 0.05, lo), -zTear + 0.02]); }
    ring.push([FAR_X1 - 0.05, HOLD_Y - 0.05, -zTear + 0.02], [FAR_X0 + 0.05, HOLD_Y - 0.05, -zTear + 0.02]);
    HOLD_SHAFTS.add(new THREE.Mesh(prism(ring, 13), shaftMat));
    const rect = (x0, z0, x1, z1) => [[x0, DECK_Y - 0.01, z0], [x1, DECK_Y - 0.01, z0], [x1, DECK_Y - 0.01, z1], [x0, DECK_Y - 0.01, z1]];
    // dust: four hundred motes drifting in the hold, lit only where the moon is
    const DN = 900, dp = new Float32Array(DN * 3), ds = new Float32Array(DN);
    for (let i = 0; i < DN; i++) { dp[i * 3] = HOLD_X0 + 0.3 + rnd(i * 1.3) * (3.0 - HOLD_X0 - 0.3); dp[i * 3 + 1] = HOLD_Y + 0.1 + rnd(i * 2.9) * (DECK_Y - HOLD_Y - 0.2); dp[i * 3 + 2] = (rnd(i * 4.7) - 0.5) * 7.0; ds[i] = rnd(i * 7.1); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
    const dustMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, LU), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: WL + `
        attribute float aS; uniform float uTime; varying float vA;
        void main() { vec3 p = position + vec3(sin(uTime * 0.11 + aS * 40.0) * 0.35, sin(uTime * 0.07 + aS * 23.0) * 0.22 - mod(uTime * 0.012 + aS * 3.0, 0.6), cos(uTime * 0.09 + aS * 31.0) * 0.35);
          vA = max(wlMoon(p), wlSkyCol(p) * 0.35) * (0.4 + 0.6 * fract(aS * 7.3)); /* in the moon's beam and the hatch's column */ vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = min(2.2, (1.0 + 1.2 * fract(aS * 13.1)) * (2.0 / -mv.z)); vA *= smoothstep(0.4, 1.6, -mv.z); /* specks, never flakes: a mote a hand from the eye is not drawn the size of a coin */ gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main() { if (vA < 0.02) discard; vec2 c = gl_PointCoord - 0.5; gl_FragColor = vec4(vec3(0.62, 0.72, 0.92) * vA * 0.95 * (1.0 - smoothstep(0.2, 0.5, length(c))), 1.0); }` });
    dustMat.name = 'wreck.dust';
    const dust = new THREE.Points(dg, dustMat); dust.frustumCulled = false; HOLD_SHAFTS.add(dust);
    HOLD_SHAFTS.children[0].onBeforeRender = () => { LU.uTime.value = performance.now() / 1000; };
    for (const c of HOLD_SHAFTS.children) c.renderOrder = 3;
  }
  S.add(HOLD_SHAFTS);
  /* main.js puts her in the world and says where the moon is (in her frame): `holdLight.place` */
  S.userData.holdLight = { U: LU, lit: holdLit, place: (ship, moonDirWorld) => {
    ship.updateMatrixWorld(true); LU.uShipInv.value.copy(ship.matrixWorld).invert();
    LU.uMoonL.value.copy(moonDirWorld).transformDirection(LU.uShipInv.value).normalize();
  } };

  S.userData.wheel = wheel;
  S.userData.nav = {
    LEN, HALF, BEAM, KEEL_Y, DECK_Y, BULWARK,
    HOLD_X0, HOLD_X1, HOLD_HZ, HOLD_Y,
    BREACH_X0, BREACH_X1, BREACH_TOP,
    HATCH_X0, HATCH_X1, HATCH_HZ, COAMING,
    STAIR_X0, STAIR_X1, STAIR_Z0, STAIR_Z1,
    BR_X0, BR_X1, BR_HZ, BR_STEP, BR_H, BR_DOOR_C, BR_DOOR_W, BR_RUN, WHEEL_X,
    GAFF_X, HOOK_Y, MAST_X, FAR_X0, FAR_X1, FAR_TOP, breachTopAt,
    props: PROPS,
    breakable: BREAKABLE,
    /* CLEAR OF HER GEAR. At HOLD_X0 + 2.4 / -1.7 he was sitting INSIDE one
     * of her stowed baskets — you saw the pickup's glow through the slats
     * and not the animal. Searched her sole for boards with nothing within
     * 0.85 m and took the roomiest: 2.72 m of clearance, and his belly on
     * the boards rather than floating over a dish in them. */
    crabSpot: [-4.8, 0.25, 1.8],
    lanternSpot: [0.4, DECK_Y + 0.22, 2.85],
    beamAt, sectionK, flareAt, sheerAt, rakeAt, halfAtY, deckHalf, hullPt,   // rakeAt: the walk inverts it for the deck edge
    soleY,   // (her sole's own boards, dished: what a piece of a broken store lies on, main.js `debris`)
  };
  return S;
}
