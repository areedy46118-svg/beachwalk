import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* THE UNDERCROFT — two tunnels and a church, forty metres under the beach.
 *
 * THREE SCANS, ALL OF THEM DRAWN. Ant leader's "3DRT-uderground for game"
 * (`assets/passage.glb`) is the way in, Aurelien Martel's "Old church
 * modeling - Interior Scene" (`assets/church.glb`) is the room at the bottom,
 * and Valsev's "Cave 5.0" (`assets/cave.glb`) is the way out behind the
 * altar — all Sketchfab, CC-BY-4.0, packed by `tools/undercroft_pack.py` with
 * THE WALK INSIDE THEM: each root carries `bw_walk`, a 0.2 m grid of floor
 * heights and a solid flag in the model's own metres.
 *
 * A pass of this file replaced the two caves with a tube it generated itself,
 * and the owner's word was plain: keep the models, improve crawling through
 * them. So the models ARE the cave, wearing their own maps and their own
 * grime; what is done to them is three things and every one is about WALKING
 * rather than about looking:
 *
 *   THE LINE IS FITTED TO THE ROCK THAT IS DRAWN. A cell grid over somebody
 *   else's low-poly tunnel is a minefield, so the grid is used once to find a
 *   centreline and the game walks a corridor round it — but that corridor's
 *   radius, roof and floor are measured off the GEOMETRY (every triangle
 *   sampled by area into a one-metre bin), not off the grid.
 *
 *   THE TUBE IS CARVED OUT OF THE MODEL. A scan of a cave has lumps that sit
 *   where the line has to go; every triangle whose middle falls inside the
 *   walk, between a hand over the floor and a hand under the roof, is dropped
 *   from the index. The bunker desk's `carveDesk`, on a cave.
 *
 *   AND THE HOLES IN THE MESH ARE CLOSED FROM BEHIND. The 3DRT tunnel has a
 *   two-metre gap in it eleven metres short of the church and never reached
 *   the door at all; a sleeve swept down the line at the measured wall plus a
 *   hand's breadth sits behind the model everywhere the model is there, and
 *   is the rock everywhere it is not. It wears a CLONE OF THE MODEL'S OWN
 *   MATERIAL, so the seam cannot be found.
 *
 * Everything is dark, dirty and dusty by construction: every material is
 * multiplied down, dust settles on whatever faces up, the lift that lets it
 * read comes off each map's own emissive, and motes drift in the air of all
 * three. The game adds the lamps (every light is a shader define, and they
 * belong in the group that is never hidden); NEITHER TUNNEL GETS ONE.
 *
 *   group.userData.undercroft:
 *     ready                    all three scans in and composed
 *     floorAt(lx, lz)          the walkable floor under a local point, or null
 *     blocked(lx, lz, r, feet) a disc of radius r about the point meets something a body cannot pass
 *     pushOut(p, r, feet)      move a local Vector3 out of whatever it is in (returns true if it moved)
 *     escape(p, r, feet)       the nearest clear spot, when the push cancels
 *     corridors                [{ pts, lo, hi }] the two tunnels' centrelines
 *     spots                    { entry, exit, lamps: [...] } — local metres and a yaw
 *     benches                  [{ mesh, box }] the church's pews, each its own mesh
 *     clearBench(n)            take a broken bench out of the walk
 *     update(dt)               the motes and the bulbs
 */
export function makeUndercroft(opts = {}) {
  const group = new THREE.Group();
  const S = { group, ready: false, walks: [], bridges: [], benches: [], spots: null, mats: [], bulbs: [], motes: null,
              corridors: [], church: null, passage: null };
  group.userData.undercroft = S;
  const load = opts.load || ((url, cb) => new GLTFLoader().load(url, cb));

  // ---- one grid, in the frame of the model it came from, plus its offset in the group
  function parseWalk(root) {
    let raw = null;
    root.traverse((o) => { if (!raw && o.userData && o.userData.bw_walk) raw = o.userData.bw_walk; });
    if (!raw) return null;
    const w = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (w.sparse) {
      /* A LONG THIN TUNNEL IS NINETY-FIVE PER CENT EMPTY BOUNDING BOX. The
       * passage's grid is 1724 by 251 cells and 31,718 of them have a floor;
       * the packer writes only those and this puts the dense arrays back —
       * typed, so the four hundred thousand empty cells cost a byte or four
       * apiece and no JSON at all. */
      const F = [], C = [], Sd = [];
      for (let j = 0; j < w.gh; j++) { F.push(new Float32Array(w.gw).fill(-99)); C.push(new Float32Array(w.gw).fill(99)); Sd.push(new Uint8Array(w.gw)); }
      for (const [i, j, f, c, sol] of w.sparse) { F[j][i] = f; C[j][i] = c; Sd[j][i] = sol; }
      w.floor = F; w.floor0 = F; w.ceil = C; w.solid = Sd;
      delete w.sparse;
      /* AND THE CHANNEL IS WIDENED. A low-poly tube's floor is the strip
       * along its bottom that is flat enough to count and has a crouch of
       * roof over it, and where the 3DRT passage pinches that strip comes
       * out two or three cells wide — under a body. The owner's word was
       * that nothing may block the path, so the grid is dilated twice: an
       * empty cell with two or more floored neighbours becomes floor at
       * their mean height, with the roof they have. Forty centimetres of
       * rock a side that the walk treats as floor; the camera clips it
       * where the tube is that tight, which is the price. */
      /* and nothing in it is SOLID: the flag is "something in the body band
       * over this floor", which in a rough round tube is every cell where
       * the wall curves in over the floor's edge — and at the pinches that
       * left a rock in the middle of a three-cell channel that no disc could
       * pass. The floor itself still says where the tube is. */
      for (let j = 0; j < w.gh; j++) Sd[j].fill(0);
      /* and the ROOF is never under a crouch: where the tube's rough ceiling
       * dips below 1.15 m over its floor the walk refused the cell even
       * crouched, and one such dip across the whole channel is a wall. The
       * game's camera ducks under the drawn roof there (its backstop). */
      for (let j = 0; j < w.gh; j++) for (let i = 0; i < w.gw; i++) if (F[j][i] > -90 && C[j][i] - F[j][i] < 1.15) C[j][i] = F[j][i] + 1.15;
      w.dilate = (passes) => {
        for (let pass = 0; pass < passes; pass++) {
          const add = [];
          for (let j = 1; j < w.gh - 1; j++) for (let i = 1; i < w.gw - 1; i++) {
            if (F[j][i] > -90) continue;
            let n = 0, sf = 0, mc = -1e9;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const f = F[j + dj][i + di]; if (f > -90) { n++; sf += f; mc = Math.max(mc, C[j + dj][i + di]); } }
            if (n >= 2) add.push([i, j, sf / n, mc]);
          }
          for (const [i, j, f, c] of add) { F[j][i] = f; C[j][i] = c; Sd[j][i] = 0; }
        }
      };
      w.dilate(3);
      w.bodyR = 0.19;                 // and the body is a hand narrower in it
    } else {
      w.solid = w.solid.map((row) => Uint8Array.from(row, (c) => (c === '1' ? 1 : 0)));
    }
    w.off = new THREE.Vector3();
    return w;
  }
  const cellFloor = (w, i, j) => {
    if (i < 0 || j < 0 || i >= w.gw || j >= w.gh) return null;
    const f = w.floor[j][i];
    return f <= -90 ? null : f + w.off.y;
  };
  const cellSolid = (w, i, j) => (i < 0 || j < 0 || i >= w.gw || j >= w.gh) ? true : w.solid[j][i] === 1;
  // the floor of one grid under a local point: bilinear where all four
  // neighbours have one, the nearest that has one otherwise
  function gridFloor(w, lx, lz) {
    const gx = (lx - w.off.x - w.x0) / w.cell - 0.5, gz = (lz - w.off.z - w.z0) / w.cell - 0.5;
    const i0 = Math.floor(gx), j0 = Math.floor(gz), fx = gx - i0, fz = gz - j0;
    const a = cellFloor(w, i0, j0), b = cellFloor(w, i0 + 1, j0), c = cellFloor(w, i0, j0 + 1), d = cellFloor(w, i0 + 1, j0 + 1);
    if (a !== null && b !== null && c !== null && d !== null) {
      // a bench top beside the floor must not be averaged into the floor
      const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
      if (hi - lo < 0.5) return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
    }
    let best = null, bd = Infinity;
    for (const [v, di, dj] of [[a, 0, 0], [b, 1, 0], [c, 0, 1], [d, 1, 1]]) {
      if (v === null) continue;
      const dd = (di - fx) ** 2 + (dj - fz) ** 2;
      if (dd < bd) { bd = dd; best = v; }
    }
    return best;
  }
  function bridgeFloor(lx, lz) {
    for (const b of S.bridges) {
      if (lx < b.x0 || lx > b.x1 || lz < b.z0 || lz > b.z1) continue;
      const t = b.axis === 'z' ? (lz - b.z0) / Math.max(1e-6, b.z1 - b.z0) : (lx - b.x0) / Math.max(1e-6, b.x1 - b.x0);
      return b.y0 + (b.y1 - b.y0) * t;
    }
    return null;
  }
  /* The roof over a local point — the first surface above the floor the
   * grid chose — so the game can duck the camera under a low stretch of
   * tunnel instead of drawing it through the rock. 99 where there is none. */
  S.ceilAt = (lx, lz) => {
    const cc = corridorAt(lx, lz);
    if (cc && cc.d <= cc.r + 0.45) return cc.y + cc.h;
    /* A RAMP HAS ITS OWN ROOF. A bridge laid up a ledge climbs through cells
     * whose roof was measured over the floor BELOW it, so read against the
     * ramp's own height that roof was under a crouch and the walk refused
     * every step of the climb it had just been given. Over a bridge the
     * roof is the rock's or 1.6 m over the ramp, whichever is higher. */
    const bf = bridgeFloor(lx, lz);
    if (bf !== null) {
      let c = null;
      for (const w of S.walks) {
        if (!w.ceil) continue;
        const i = Math.floor((lx - w.off.x - w.x0) / w.cell), j = Math.floor((lz - w.off.z - w.z0) / w.cell);
        if (i < 0 || j < 0 || i >= w.gw || j >= w.gh || w.floor[j][i] <= -90) continue;
        const cc = w.ceil[j][i]; if (cc < 90) { c = cc + w.off.y; break; }
      }
      return c === null ? null : Math.max(c, bf + 1.6);
    }
    for (const w of S.walks) {
      if (!w.ceil) continue;
      const i = Math.floor((lx - w.off.x - w.x0) / w.cell), j = Math.floor((lz - w.off.z - w.z0) / w.cell);
      if (i < 0 || j < 0 || i >= w.gw || j >= w.gh) continue;
      if (w.floor[j][i] <= -90) continue;
      const c = w.ceil[j][i];
      return c >= 90 ? null : c + w.off.y;
    }
    return null;
  };
  S.floorAt = (lx, lz) => {
    const bf = bridgeFloor(lx, lz);
    if (bf !== null) return bf;
    const c = corridorAt(lx, lz);
    if (c && c.d <= c.r + 0.45) return c.y;
    for (const w of S.walks) {
      const f = gridFloor(w, lx, lz);
      if (f !== null) return f;
    }
    return null;
  };
  const STEP = 0.40, DROP = 1.3;   // a pew's seat is 0.45 up: a step you do not take
  /* Is this point somewhere a body with its feet at `feet` can stand: a
   * floor under it, nothing in the band above that floor, and the floor
   * within a step up or a drop down of where the feet already are. */
  S.walkable = (lx, lz, feet) => {
    const bf = bridgeFloor(lx, lz);
    if (bf !== null) return Math.abs(bf - feet) < 0.6;
    /* INSIDE THE TUBE AND NOWHERE ELSE. The corridor is the whole of the
     * passage's walk: within its radius you are on its floor, outside it
     * you are in rock. Nothing to clip into and no edge to fall off. */
    /* INSIDE THE TUBE you are on its floor; OUTSIDE it, ask the grids. An
     * early `return` here walled the church off: the corridor answers for
     * anything within a few metres of its line, and its last points stand
     * in the nave, so every cell round the doorway came back "not walkable"
     * and the walk ended a stride inside the church. */
    const c = corridorAt(lx, lz);
    if (c && c.d <= c.r) return Math.abs(c.y - feet) < 2.6;
    for (const w of S.walks) {
      const i = Math.floor((lx - w.off.x - w.x0) / w.cell), j = Math.floor((lz - w.off.z - w.z0) / w.cell);
      if (i < 0 || j < 0 || i >= w.gw || j >= w.gh) continue;
      const f = cellFloor(w, i, j);
      /* THREE GRIDS OVERLAP AT THE JOINS. The church's box runs two metres
       * past its apse wall, over the cave's mouth, and a grid with no floor
       * at a point used to answer "not walkable" for everyone — so the way
       * out was shut at the church's own bounding box. No floor here means
       * ask the next grid; a solid here is a wall. */
      if (f === null) continue;
      if (cellSolid(w, i, j)) return false;
      if (f - feet > (w.stepMax || STEP) || feet - f > (w.dropMax || DROP)) return false;
      return true;
    }
    return false;
  };
  /* ---- THE CORRIDOR, AND THE SLEEVE BEHIND IT.
   *
   * A cell grid over somebody else's low-poly tunnel is a minefield: its
   * floor strip has holes the sampler fell through, lumps of wall the grid
   * calls floor, ledges no step rule crosses and edges you slide off. So the
   * grid is used ONCE, at load, to find the tunnel's CENTRELINE — breadth
   * first from the entry cell to the mouth, resampled and smoothed — and the
   * game walks a TUBE round that line. Everything about that tube's shape is
   * then measured off the geometry the model actually draws (`fitCorridor`),
   * never off the grid.
   *
   * `makeBore` sweeps a section down a line. It is NOT the cave — the cave is
   * the scan — it is what stands BEHIND the scan to close the holes in it,
   * and it wears a clone of the scan's own material so the join cannot be
   * found. */
  function buildCorridor(w, s0, s1) {
    const cellOf = (x, z) => [Math.floor((x - w.off.x - w.x0) / w.cell), Math.floor((z - w.off.z - w.z0) / w.cell)];
    /* the grid is dilated to close the sampler's own holes — it is used ONLY
     * to find the line now, so a cell or two of slack costs nothing */
    const F = new Float32Array(w.gw * w.gh).fill(-99);
    for (let j = 0; j < w.gh; j++) for (let i = 0; i < w.gw; i++) F[j * w.gw + i] = w.floor[j][i];
    for (let pass = 0; pass < 4; pass++) {
      const add = [];
      for (let j = 1; j < w.gh - 1; j++) for (let i = 1; i < w.gw - 1; i++) {
        if (F[j * w.gw + i] > -90) continue;
        let n = 0, sf = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const f = F[(j + dj) * w.gw + i + di]; if (f > -90) { n++; sf += f; } }
        if (n >= 2) add.push([j * w.gw + i, sf / n]);
      }
      for (const [k, f] of add) F[k] = f;
    }
    const has = (i, j) => i >= 0 && j >= 0 && i < w.gw && j < w.gh && F[j * w.gw + i] > -90;
    const [ai, aj] = cellOf(s0.x, s0.z), [bi, bj] = cellOf(s1.x, s1.z);
    if (!has(ai, aj) || !has(bi, bj)) return null;
    const prev = new Int32Array(w.gw * w.gh).fill(-1);
    const start = aj * w.gw + ai, goal = bj * w.gw + bi;
    prev[start] = start;
    const q = [start];
    /* AND THE SEARCH LEAPS A GAP. The model's tunnel simply stops for two
     * metres at x = 172 — no floor at any z — and four passes of dilation
     * reach eighty centimetres, so the path ended eleven metres short of the
     * church and the last stretch of the walk was invented. A cell with no
     * ordinary neighbour left may jump up to four metres to any floored cell
     * within a metre and a half of its own height: a hole in somebody's
     * mesh is not a fork in the tunnel. */
    const LEAP = Math.round(4.0 / w.cell);
    for (let head = 0; head < q.length; head++) {
      const c = q[head];
      if (c === goal) break;
      const i = c % w.gw, j = (c - i) / w.gw;
      let any = false;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (!has(ii, jj)) continue;
        any = true;
        const k = jj * w.gw + ii;
        if (prev[k] !== -1) continue;
        prev[k] = c; q.push(k);
      }
      if (any) continue;
      const y0 = F[c];
      let best = -1, bd = 1e9;
      for (let d = 2; d <= LEAP; d++) for (const [di, dj] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [d, -d], [-d, d], [-d, -d]]) {
        const ii = i + di, jj = j + dj;
        if (!has(ii, jj)) continue;
        const k = jj * w.gw + ii;
        if (prev[k] !== -1 || Math.abs(F[k] - y0) > 1.5) continue;
        const dd = di * di + dj * dj;
        if (dd < bd) { bd = dd; best = k; }
      }
      if (best >= 0) { prev[best] = c; q.push(best); }
    }
    let goalC = goal;
    if (prev[goalC] === -1) {
      let best = -1, bx = -1e9;
      for (let k = 0; k < prev.length; k++) {
        if (prev[k] === -1) continue;
        const i = k % w.gw;
        const x = w.off.x + w.x0 + (i + 0.5) * w.cell;
        if (x > bx) { bx = x; best = k; }
      }
      if (best < 0) return null;
      goalC = best;
    }
    const cells = [];
    for (let c = goalC; c !== start; c = prev[c]) cells.push(c);
    cells.push(start); cells.reverse();
    const raw = cells.map((c) => {
      const i = c % w.gw, j = (c - i) / w.gw;
      return { x: w.off.x + w.x0 + (i + 0.5) * w.cell, z: w.off.z + w.z0 + (j + 0.5) * w.cell, y: F[j * w.gw + i] + w.off.y };
    });
    return smoothLine(raw, 2.0);
  }
  /* resample a run of points every `step` metres and smooth it hard. The
   * line no longer has to hug anybody's geometry — we build the rock round
   * it — so what it wants is to be SMOOTH, which is what a walk down a cave
   * should feel like. The grade is clamped too: the scan's floor heights
   * jump where the sampler found the outside of its own roof. */
  function smoothLine(raw, step) {
    const pts = [raw[0]]; let acc = 0;
    for (let k = 1; k < raw.length; k++) {
      acc += Math.hypot(raw[k].x - raw[k - 1].x, raw[k].z - raw[k - 1].z);
      if (acc >= step || k === raw.length - 1) { pts.push(raw[k]); acc = 0; }
    }
    for (let pass = 0; pass < 14; pass++) {
      for (let k = 1; k < pts.length - 1; k++) {
        pts[k] = { x: pts[k].x * 0.5 + (pts[k - 1].x + pts[k + 1].x) * 0.25,
                   z: pts[k].z * 0.5 + (pts[k - 1].z + pts[k + 1].z) * 0.25,
                   y: pts[k].y * 0.5 + (pts[k - 1].y + pts[k + 1].y) * 0.25 };
      }
    }
    for (let k = 1; k < pts.length; k++) {
      const d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z) || 1e-3;
      const dy = pts[k].y - pts[k - 1].y, m = d * 0.34;          // nineteen degrees, and no more
      if (dy > m) pts[k].y = pts[k - 1].y + m;
      else if (dy < -m) pts[k].y = pts[k - 1].y - m;
    }
    // the bore breathes: it pinches and opens on a slow count of its own
    for (let k = 0; k < pts.length; k++) {
      const t = k * 0.31;
      pts[k].r = 1.78 + 0.40 * Math.sin(t * 0.37) + 0.18 * Math.sin(t * 1.13 + 1.9);
      pts[k].h = 3.02 + 0.42 * Math.sin(t * 0.29 + 0.7) + 0.18 * Math.sin(t * 0.93);
    }
    return { pts, lo: [0, 0], hi: [0, 0] };
  }
  function corridorBox(C) {
    const P = C.pts;
    C.lo = [Math.min(...P.map((p) => p.x)), Math.min(...P.map((p) => p.z))];
    C.hi = [Math.max(...P.map((p) => p.x)), Math.max(...P.map((p) => p.z))];
    return C;
  }

  /* ---- THE BORE. A fourteen-point section swept down a centreline.
   * `u` runs across the section and `v` up from the floor, both as
   * fractions — of the station's radius and of its height — so a bore that
   * pinches pinches in proportion. The floor is FLAT and sits at or a
   * little BELOW the height the walk stands you at, so a foot is never
   * inside the rock; the roof is the station's height, which is never less
   * than two and a half metres, so there is no ducking, no head bump and
   * nothing to refuse a step. The walls carry two octaves of value noise
   * along their own outward normal — correlated from station to station, or
   * a tube of independent noise is static rather than stone.
   *
   * The uv is in METRES: u along the bore, v round the section. That is
   * what a scan cannot give you and is the whole reason the rock reads. */
  const PROFILE = [
    [ 1.00, 0.010], [ 1.05, 0.100], [ 1.09, 0.230], [ 1.11, 0.390], [ 1.09, 0.530],
    [ 1.02, 0.660], [ 0.91, 0.780], [ 0.75, 0.880], [ 0.55, 0.950], [ 0.32, 0.990],
    [ 0.10, 1.000],
    [-0.10, 1.000], [-0.32, 0.990], [-0.55, 0.950], [-0.75, 0.880], [-0.91, 0.780],
    [-1.02, 0.660], [-1.09, 0.530], [-1.11, 0.390], [-1.09, 0.230], [-1.05, 0.100],
    [-1.00, 0.010], [-0.78, -0.008], [-0.52, -0.014], [-0.26, -0.018],
    [ 0.00, -0.020], [ 0.26, -0.018], [ 0.52, -0.014], [ 0.78, -0.008],
  ];
  /* THE DISPLACEMENT IS IN WORLD SPACE, NOT IN (station, vertex). The first
   * bore took its noise off the two indices, which puts exactly one bump on
   * every vertex of every ring — a regular lattice, and what it rendered as
   * was SCALES. Noise sampled at the vertex's own POSITION has a size in
   * metres instead: a lump is a couple of metres long whatever the tube is
   * tessellated at, and it cannot seam where the ring closes. */
  function hash3(a, b, c) {
    const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function vnoise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (dz) => {
      const a = hash3(xi, yi, zi + dz), b = hash3(xi + 1, yi, zi + dz);
      const c = hash3(xi, yi + 1, zi + dz), d = hash3(xi + 1, yi + 1, zi + dz);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    return l(0) * (1 - w) + l(1) * w;
  }
  /* FOUR OCTAVES, AND THE LOW ONE ALONE IS NOT ROCK. The first build ran one
   * band at a wavelength of two and a half metres against a tube a metre and
   * a half across, so the whole section simply swelled and shrank and the
   * bore rendered as a smooth pipe — measured off the built vertices, every
   * point of a ring displaced the same way by the same amount. What reads as
   * stone is the metre and the half-metre. */
  /* AND NO OCTAVE FINER THAN THE MESH CAN CARRY IT. The second build ran a
   * band at eighteen centimetres against vertices a third of a metre apart,
   * which is not rock — it is one random bump per vertex, and what the tube
   * rendered as was SCALES. The finest band here is two thirds of a metre
   * against a section sampled every thirty centimetres and stations every
   * seventy; anything smaller than that is the normal map's job. */
  function rockNoise(x, y, z, amp) {
    return ((vnoise3(x * 0.26, y * 0.26, z * 0.26) - 0.5) * 1.00
          + (vnoise3(x * 0.70 + 9.1, y * 0.70, z * 0.70 + 4.3) - 0.5) * 0.55
          + (vnoise3(x * 1.55 + 2.7, y * 1.55, z * 1.55 + 7.9) - 0.5) * 0.20) * amp;
  }
  function makeBore(C, mat, opts = {}) {
    const NP = PROFILE.length;
    /* THE BORE IS TESSELLATED FINER THAN THE WALK IS. The line's stations are
     * two metres apart, which is the right grain for a corridor you walk and
     * far too coarse for rock you look at — a metre-wide lump sampled every
     * two metres is a zigzag. The sweep runs on its own dense resampling of
     * the same line; the walk keeps the coarse one. */
    const P = [];
    {
      const Q = C.pts, STEP = 0.70;
      for (let k = 0; k < Q.length - 1; k++) {
        const a = Q[k], b = Q[k + 1];
        const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / STEP));
        for (let i = 0; i < n; i++) {
          const t = i / n;
          P.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: a.y + (b.y - a.y) * t,
                   r: a.r + (b.r - a.r) * t, h: a.h + (b.h - a.h) * t, src: k });
        }
      }
      const L = Q[Q.length - 1]; P.push({ x: L.x, z: L.z, y: L.y, r: L.r, h: L.h, src: Q.length - 1 });
    }
    const pos = [], uvs = [], idx = [];
    let along = 0;
    const capAt = opts.cap === undefined ? [true, true] : opts.cap;   // [start, end]
    for (let k = 0; k < P.length; k++) {
      const p = P[k];
      const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const rx = tz, rz = -tx;                       // right = t x up
      if (k) along += Math.hypot(p.x - P[k - 1].x, p.z - P[k - 1].z);
      const grow = opts.grow || 0;
      const W = p.r + grow, H = p.h + grow * 0.8;
      const amp = (opts.rough === undefined ? 0.62 : opts.rough);
      let arc = 0, prevX = 0, prevY = 0, prevZ = 0;
      for (let i = 0; i < NP; i++) {
        const [fu, fv] = PROFILE[i];
        // the wall's outward direction in the section plane
        const nx2 = fu, ny2 = (fv - 0.45) * 0.9;
        const nl = Math.hypot(nx2, ny2) || 1;
        const u0 = fu * W, v0 = fv * H;
        const X0 = p.x + rx * u0, Y0 = p.y + v0, Z0 = p.z + rz * u0;
        let d = rockNoise(X0, Y0, Z0, amp);
        /* THE FLOOR ONLY EVER DIPS AND THE ROOF ONLY EVER LIFTS. The walk
         * stands you at the station's own height and refuses nothing under
         * the station's own headroom, so a lump of noise that raised the
         * drawn floor would bury your feet and one that lowered the drawn
         * roof would put your head through the rock — which is exactly what
         * the owner reported of the scan this replaces. Signed, not clamped
         * afterwards: the crown and the invert are the two places where
         * "seamless" is the same thing as "correct". */
        if (fv < 0.02) d = -Math.abs(d) * 0.12;
        else if (fv > 0.90) d = Math.abs(d) * 0.80;
        const u = u0 + (nx2 / nl) * d;
        let v = v0 + (ny2 / nl) * d * (fv < 0.02 ? 0.4 : 1);
        if (fv < 0.02) v = Math.min(v, v0) - grow * 0.6;    // a skin's invert is BELOW the floor it backs
        if (fv > 0.90) v = Math.max(v, v0);
        const X = p.x + rx * u, Y = p.y + v, Z = p.z + rz * u;
        if (i) arc += Math.hypot(X - prevX, Y - prevY, Z - prevZ);
        prevX = X; prevY = Y; prevZ = Z;
        pos.push(X, Y, Z);
        uvs.push(along * 0.40, arc * 0.40);          // one tile every two and a half metres
      }
    }
    for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < NP; i++) {
      const j = (i + 1) % NP;
      const a = k * NP + i, b = k * NP + j, c = (k + 1) * NP + j, d = (k + 1) * NP + i;
      idx.push(a, b, c, a, c, d);
    }
    for (const k of [0, P.length - 1]) {
      if (!capAt[k === 0 ? 0 : 1]) continue;
      const base = pos.length / 3;
      const p = P[k];
      pos.push(p.x, p.y + p.h * 0.45, p.z); uvs.push(0, 0);
      for (let i = 0; i < NP; i++) {
        const s = (k * NP + i) * 3;
        pos.push(pos[s], pos[s + 1], pos[s + 2]);
        uvs.push(Math.cos(i / NP * 6.283) * 1.4, Math.sin(i / NP * 6.283) * 1.4);
      }
      for (let i = 0; i < NP; i++) {
        const j = (i + 1) % NP;
        if (k === 0) idx.push(base, base + 1 + j, base + 1 + i);
        else idx.push(base, base + 1 + i, base + 1 + j);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    /* WHICH WAY THE SECTION WINDS IS NOT WORTH REASONING ABOUT. Take one
     * vertex, ask whether its normal points at the axis, and reverse the
     * whole index if it does not — a tube whose faces look outward is a
     * tube you stand inside and cannot see. */
    {
      const nrm = g.getAttribute('normal'), p0 = P[0];
      const vx = pos[0] - p0.x, vz = pos[2] - p0.z;
      if (nrm.getX(0) * vx + nrm.getZ(0) * vz > 0) {
        const a = g.index.array;
        for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
        g.index.needsUpdate = true; g.computeVertexNormals();
      }
    }
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    /* AND THE WALK IS MEASURED OFF THE BORE THAT WAS ACTUALLY BUILT. The
     * narrowest wall between the floor and head height at each station, less
     * a body's own margin: inside that you can never touch the rock, and the
     * rock is never anywhere you can walk. */
    if (opts.measure === false) return mesh;
    const wall = new Float32Array(C.pts.length).fill(1e9);
    for (let k = 0; k < P.length; k++) {
      let rw = 1e9;
      for (let i = 0; i < NP; i++) {
        const s = (k * NP + i) * 3;
        const dy = pos[s + 1] - P[k].y;
        if (dy < 0.05 || dy > 1.95) continue;
        const dx = pos[s] - P[k].x, dz = pos[s + 2] - P[k].z;
        rw = Math.min(rw, Math.hypot(dx, dz));
      }
      if (rw > 1e8) continue;
      for (const j of [P[k].src, Math.min(C.pts.length - 1, P[k].src + 1)]) wall[j] = Math.min(wall[j], rw);
    }
    for (let j = 0; j < C.pts.length; j++) C.pts[j].r = Math.max(0.55, (wall[j] > 1e8 ? C.pts[j].r : wall[j]) - 0.30);
    return mesh;
  }
  /* ---- FITTING THE LINE TO THE ROCK THAT IS ACTUALLY DRAWN.
   *
   * The cave you walk is the SCAN again — the owner's models, kept — and the
   * one thing a corridor round a scan has to be is honest about where that
   * scan's walls are, or you clip through them (which is what a radius taken
   * off the packer's 0.2 m grid gave: the grid calls the outside of a roof a
   * floor, falls through holes, and misses lumps of wall entirely).
   *
   * So the measurement is taken off the GEOMETRY. Every triangle of the
   * tunnel is sampled at its corners, its edge midpoints and its centroid
   * into a one-metre bin, and each station of the line then asks that bin,
   * in its own frame: what is under me, what is over me, and how far is the
   * rock on each side between my knee and my head. The point is recentred in
   * what it finds, the line is smoothed again, and the radius is the nearer
   * wall less a body's margin. Twenty-seven thousand points and a hundred
   * stations: it costs about as much as one raycast used to.
   *
   * A station that finds NO floor, NO wall or NO roof is not a station in a
   * tunnel — it is a HOLE IN THE MODEL, and there are two of them: a run of
   * two metres eleven metres short of the church where rays go clean through,
   * and the last stretch to the door which was never tunnel at all. Those
   * runs get a built sleeve in the same stone (`makeBore`), overlapping the
   * real rock at each end. The model is repaired, not replaced. */
  function surfaceBins(root, cell = 1.0) {
    const bins = new Map();
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), M = new THREE.Vector3();
    const E1 = new THREE.Vector3(), E2 = new THREE.Vector3();
    const put = (p) => {
      const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell) + ',' + Math.floor(p.z / cell);
      let a = bins.get(k); if (!a) bins.set(k, a = []);
      a.push(p.x, p.y, p.z);
    };
    /* IN THE GROUP'S FRAME, NOT THE WORLD'S. The corridor's points are local
     * metres and the undercroft stands at (3000, 400, 2400): binned in world
     * space every probe came back empty and every station of the tunnel was
     * reported as a hole in it. */
    group.updateMatrixWorld(true);
    root.updateMatrixWorld(true);
    const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const MM = new THREE.Matrix4();
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index;
      MM.multiplyMatrices(toLocal, o.matrixWorld);
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i + 2 < n; i += 3) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        A.fromBufferAttribute(pos, i0).applyMatrix4(MM);
        B.fromBufferAttribute(pos, i1).applyMatrix4(MM);
        C.fromBufferAttribute(pos, i2).applyMatrix4(MM);
        /* SAMPLED BY AREA, and that is the whole of whether any of this works.
         * This tunnel is 3848 triangles over a hundred and seventy metres —
         * faces a metre and more across — so seven points per triangle put
         * the samples half a metre apart, and a march that steps fifteen
         * centimetres and stops at the first gap then reported a wall inside
         * arm's reach down the whole passage. A barycentric grid at about
         * twelve centimetres is dense enough for the march to mean something. */
        E1.subVectors(B, A); E2.subVectors(C, A);
        const area = E1.cross(E2).length() * 0.5;
        const nn = Math.max(1, Math.min(12, Math.ceil(Math.sqrt(area) / 0.12)));
        for (let u = 0; u <= nn; u++) for (let v = 0; v + u <= nn; v++) {
          const fu = u / nn, fv = v / nn, fw = 1 - fu - fv;
          M.set(A.x * fw + B.x * fu + C.x * fv, A.y * fw + B.y * fu + C.y * fv, A.z * fw + B.z * fu + C.z * fv);
          put(M);
        }
      }
    });
    bins.cell = cell;
    return bins;
  }
  /* WHAT THE ROCK SAYS AT ONE STATION, in that station's own frame — and the
   * wall is measured by MARCHING THE FLOOR, not by asking for the nearest
   * surface. The first version took the nearest sample between knee and head
   * height on each side and the radius collapsed to its floor down the whole
   * tunnel: in a low-poly tube the floor itself curves up into the wall, so
   * the nearest thing at knee height is very often the ground you are
   * standing on. How far the FLOOR reaches is the question a walk is asking,
   * and the head-height rock only ever narrows the answer. */
  function probe(bins, p, tx, tz, R) {
    const nx = tz, nz = -tx;                 // right, as in the sweep
    const cell = bins.cell;
    const pts = [];                          // (along, across, dy) of everything near this station
    const i0 = Math.floor((p.x - R) / cell), i1 = Math.floor((p.x + R) / cell);
    const j0 = Math.floor((p.y - 3.5) / cell), j1 = Math.floor((p.y + 5.0) / cell);
    const k0 = Math.floor((p.z - R) / cell), k1 = Math.floor((p.z + R) / cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      const a = bins.get(i + ',' + j + ',' + k); if (!a) continue;
      for (let m = 0; m < a.length; m += 3) {
        const dx = a[m] - p.x, dy = a[m + 1] - p.y, dz = a[m + 2] - p.z;
        const along = dx * tx + dz * tz;
        if (Math.abs(along) > 0.75) continue;
        pts.push(dx * nx + dz * nz, dy);
      }
    }
    const out = { floor: null, roof: null, span: [0, 0], head: [9, 9] };
    for (let m = 0; m < pts.length; m += 2) {
      const across = pts[m], dy = pts[m + 1];
      if (Math.abs(across) < 0.55) {
        if (dy <= 0.55 && dy > -3.0 && (out.floor === null || dy > out.floor)) out.floor = dy;
        if (dy > 1.15 && dy < 5.0 && (out.roof === null || dy < out.roof)) out.roof = dy;
      }
    }
    if (out.floor === null) return out;
    // how far the floor reaches to each side, allowing the odd gap in it
    for (let si = 0; si < 2; si++) {
      const sg = si ? -1 : 1;
      let good = 0, miss = 0;
      for (let d = 0.15; d <= 2.6; d += 0.15) {
        let hit = false;
        for (let m = 0; m < pts.length; m += 2) {
          const across = pts[m] * sg, dy = pts[m + 1];
          if (across < d - 0.12 || across > d + 0.12) continue;
          if (dy > out.floor - 0.55 && dy < out.floor + 0.60) { hit = true; break; }
        }
        /* ONE MISS, NOT TWO. At two the march stepped clean over a wall and
         * reported floor half a metre inside the rock — measured at x = 176,
         * where the tunnel is 1.8 m wide, the walk was letting a body to
         * within 0.15 m of a wall it thought was 0.95 away. */
        if (hit) { good = d; miss = 0; } else if (++miss >= 1) break;
      }
      out.span[si] = good;
    }
    /* and the rock between knee and head only ever narrows it — but it must
     * stop BELOW THE ROOF. This tunnel's roof is often only a metre and a
     * half over its floor, so the ceiling's own samples pass right over the
     * centreline and were being read as a wall a hand's width away: measured,
     * `head` came back at 0.08 m down a passage whose floor is two metres
     * wide, and the walk collapsed to its minimum for the whole length. */
    const top = Math.min(1.35, (out.roof === null ? 9 : out.roof) - out.floor - 0.25);   // a crouched body, which is what this tunnel is for
    if (top > 0.60) for (let m = 0; m < pts.length; m += 2) {
      const across = pts[m], dy = pts[m + 1] - out.floor;
      if (dy < 0.55 || dy > top) continue;
      const i = across > 0 ? 0 : 1, v = Math.abs(across);
      if (v > 0.06 && v < out.head[i]) out.head[i] = v;
    }
    return out;
  }
  const BODY_MARGIN = 0.20;
  function fitCorridor(C, bins) {
    const P = C.pts, R = 3.2;
    const tang = (k) => {
      const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; return [tx / L, tz / L];
    };
    // one pass to recentre, smoothed, then one to measure
    const shift = new Float32Array(P.length);
    for (let k = 0; k < P.length; k++) {
      const [tx, tz] = tang(k), q = probe(bins, P[k], tx, tz, R);
      if (q.floor !== null) shift[k] = Math.max(-0.9, Math.min(0.9, (q.span[0] - q.span[1]) / 2));
    }
    for (let k = 1; k < P.length - 1; k++) shift[k] = shift[k] * 0.6 + (shift[k - 1] + shift[k + 1]) * 0.2;
    for (let k = 0; k < P.length; k++) {
      const [tx, tz] = tang(k);
      P[k].x += tz * shift[k]; P[k].z += -tx * shift[k];
    }
    const fy = new Float32Array(P.length);
    for (let k = 0; k < P.length; k++) {
      const [tx, tz] = tang(k), q = probe(bins, P[k], tx, tz, R);
      P[k].probe = q;
      fy[k] = q.floor === null ? 0 : q.floor;
      /* A STATION WITH NOTHING UNDER IT, NOTHING OVER IT OR NOTHING BESIDE IT
       * IS A HOLE IN THE MODEL, not a stretch of tunnel. */
      /* OPEN means the MODEL IS NOT THERE — no floor under the line, no roof
       * over it, or no floor to either side. A floor that runs out on ONE
       * side is not a hole, it is a wall, which is what a tunnel has. */
      /* OPEN means THE MODEL IS NOT THERE — nothing under the line and
       * nothing over it. A narrow span is a narrow tunnel, which this one
       * often is, and calling that a hole put sixty of a hundred stations
       * into the repair. */
      P[k].open = q.floor === null || q.roof === null;
    }
    // the floor the scan actually draws, lightly smoothed and grade-clamped
    for (let pass = 0; pass < 3; pass++)
      for (let k = 1; k < P.length - 1; k++) if (!P[k].open) fy[k] = fy[k] * 0.5 + (fy[k - 1] + fy[k + 1]) * 0.25;
    for (let k = 0; k < P.length; k++) P[k].y += fy[k];
    for (let k = 1; k < P.length; k++) {
      const d = Math.hypot(P[k].x - P[k - 1].x, P[k].z - P[k - 1].z) || 1e-3, m = d * 0.34;
      const dy = P[k].y - P[k - 1].y;
      if (dy > m) P[k].y = P[k - 1].y + m; else if (dy < -m) P[k].y = P[k - 1].y - m;
    }
    const wall = new Float32Array(P.length).fill(-1);
    for (let k = 0; k < P.length; k++) {
      const q = P[k].probe;
      if (P[k].open) continue;
      wall[k] = Math.min(q.span[0], q.span[1], q.head[0], q.head[1]);
      P[k].h = Math.max(1.15, Math.min(4.0, q.roof - q.floor - 0.05));
    }
    /* A STATION NARROWER THAN A BODY IS A MEASUREMENT, NOT A TUNNEL. The
     * march stops at the first gap in the samples, so a sparse patch of a
     * low-poly wall reads as rock a hand's width away; clamping that up to a
     * walkable minimum is the thing that lets a body stand inside the rock.
     * It is filled in from the stations either side of it instead, which is
     * what the tunnel there is actually like. */
    for (let k = 0; k < P.length; k++) {
      if (wall[k] >= 0.52 || P[k].open) continue;
      let a = k - 1, b = k + 1;
      while (a >= 0 && wall[a] < 0.52) a--;
      while (b < P.length && wall[b] < 0.52) b++;
      const va = a >= 0 ? wall[a] : -1, vb = b < P.length ? wall[b] : -1;
      wall[k] = va < 0 && vb < 0 ? 0.80 : va < 0 ? vb : vb < 0 ? va : Math.min(va, vb);
    }
    for (let k = 0; k < P.length; k++) {
      if (P[k].open) continue;
      P[k].wall = Math.max(0.52, Math.min(2.4, wall[k]));
      P[k].r = Math.max(0.32, Math.min(2.2, P[k].wall - BODY_MARGIN));
    }
    return C;
  }
  /* the runs of stations the model does not cover, each grown by one station
   * at each end so the sleeve starts and finishes inside real rock */
  function gapRuns(C) {
    const P = C.pts, runs = [];
    let a = -1;
    for (let k = 0; k < P.length; k++) {
      if (P[k].open) { if (a < 0) a = k; }
      else if (a >= 0) { runs.push([Math.max(0, a - 1), Math.min(P.length - 1, k)]); a = -1; }
    }
    if (a >= 0) runs.push([Math.max(0, a - 1), P.length - 1]);
    /* A SLEEVE IS THE SIZE OF THE TUNNEL IT REPAIRS, and it is swept a hand's
     * breadth OUTSIDE it. Built at the walk's own radius it showed as a step
     * in the wall wherever it met real rock, and — worse — a hole in the scan
     * BEYOND it still showed the void through the gap between the two. Outside
     * the rock it is hidden everywhere the model is there and is the only
     * thing there where the model is not. */
    for (const [i, j] of runs) {
      const w0 = P[i].wall ?? 1.2, w1 = P[j].wall ?? 1.2, h0 = P[i].h, h1 = P[j].h;
      for (let k = i + 1; k < j; k++) {
        if (!P[k].open) continue;
        const t = (k - i) / Math.max(1, j - i);
        P[k].wall = Math.max(0.95, w0 + (w1 - w0) * t);
        P[k].h = Math.max(2.10, h0 + (h1 - h0) * t);
        P[k].r = Math.max(0.55, P[k].wall - BODY_MARGIN);
      }
    }
    return runs;
  }

  /* ---- AND NOTHING OF THE MODEL MAY STAND IN THE WALK.
   *
   * A scan of a tunnel has lumps in it — a boulder modelled on the floor, a
   * strut, a shelf of rock, a stray island the trim left behind — and the
   * corridor cannot always measure its way round them: they sit where the
   * line has to go, and what the owner sees is his own head passing through
   * stone ("I shouldn't be phasing through anything"). Measured by walking
   * the finished tunnel and asking how near the rock was every tenth frame:
   * a hundred and thirty-seven contacts inside six centimetres, every one of
   * them the scan.
   *
   * So the tube is CARVED out of the model: every triangle whose middle
   * falls inside the corridor's own clear radius, between a hand above the
   * floor and a hand under the roof, is dropped from the index. The floor
   * survives (it is below the band), the walls survive (they are outside the
   * radius), and what goes is exactly what was in your way. It is the
   * bunker desk's `carveDesk` on a cave. */
  function carveTube(root, pad = 0.06) {
    let dropped = 0, kept = 0;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), M = new THREE.Vector3();
    const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert(), MM = new THREE.Matrix4();
    group.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.index) return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index;
      MM.multiplyMatrices(toLocal, o.matrixWorld);
      const keep = [];
      for (let i = 0; i + 2 < idx.count; i += 3) {
        const i0 = idx.getX(i), i1 = idx.getX(i + 1), i2 = idx.getX(i + 2);
        A.fromBufferAttribute(pos, i0).applyMatrix4(MM);
        B.fromBufferAttribute(pos, i1).applyMatrix4(MM);
        C.fromBufferAttribute(pos, i2).applyMatrix4(MM);
        M.copy(A).add(B).add(C).multiplyScalar(1 / 3);
        const c = corridorAt(M.x, M.z);
        if (c && c.d < c.r + pad && M.y > c.y + 0.14 && M.y < c.y + c.h - 0.10) { dropped++; continue; }
        keep.push(i0, i1, i2); kept += 1;
      }
      if (dropped) g.setIndex(keep);
    });
    return dropped;
  }

  /* the nearest point on the corridor: its height, its radius, how far off
   * the line you are. Scanned straight — a hundred and forty segments is
   * nothing beside what the grid it replaces was doing. */
  const _cq = { y: 0, r: 0, d: 1e9, h: 2.0 };
  function corridorAt(lx, lz) {
    if (!S.corridors.length) return null;
    let bd = 1e9, by = 0, br = 0, bh = 2.0, found = false;
    for (const C of S.corridors) {
      if (lx < C.lo[0] - 3 || lx > C.hi[0] + 3 || lz < C.lo[1] - 3 || lz > C.hi[1] + 3) continue;
      const P = C.pts;
      for (let k = 0; k < P.length - 1; k++) {
        const a = P[k], b = P[k + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const L2 = dx * dx + dz * dz || 1e-9;
        let t = ((lx - a.x) * dx + (lz - a.z) * dz) / L2;
        /* AND THE TUBE IS SHUT AT BOTH ENDS. Clamping t to the segment makes
         * the distance beyond the last point purely radial, so a body could
         * walk a whole radius past the dead end and stand inside the cap it
         * is looking at. Past an end the radius closes over half a metre. */
        let shut = 1;
        if (k === 0 && t < 0) shut = Math.max(0, 1 + t * Math.sqrt(L2) / 0.5);
        else if (k === P.length - 2 && t > 1) shut = Math.max(0, 1 - (t - 1) * Math.sqrt(L2) / 0.5);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a.x + dx * t, pz = a.z + dz * t;
        const d = (lx - px) * (lx - px) + (lz - pz) * (lz - pz);
        if (d < bd) { bd = d; found = true; by = a.y + (b.y - a.y) * t; br = (a.r + (b.r - a.r) * t) * shut; bh = a.h + (b.h - a.h) * t; }
      }
    }
    if (!found) return null;
    _cq.d = Math.sqrt(bd); _cq.y = by; _cq.r = br; _cq.h = bh;
    return _cq;
  }
  S.corridorAt = corridorAt;

  /* how wide a body is here: the passage says narrower */
  S.bodyR = (lx, lz) => {
    for (const w of S.walks) {
      if (!w.bodyR) continue;
      const b = w.bounds;
      if (lx >= b[0][0] + w.off.x && lx <= b[1][0] + w.off.x && lz >= b[0][2] + w.off.z && lz <= b[1][2] + w.off.z) return w.bodyR;
    }
    return 0.24;
  };
  /* how far along +x a crouched body can get from a spot, over the walk as
   * the game walks it — the harness's own flood, kept here so the compose
   * can ask it and widen the passage until it answers with the mouth */
  S.reach = (x0, z0, h = 1.03, limit = 400000) => {
    const seen = new Set(); const q = [[x0, z0]]; const key = (x, z) => Math.round(x * 5) + ',' + Math.round(z * 5);
    seen.add(key(x0, z0)); let best = -1e9, bestZ = z0, n = 0, head = 0;
    while (head < q.length && n < limit) {
      const [x, z] = q[head++]; n++;
      if (x > best) { best = x; bestZ = z; }
      for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (seen.has(k)) continue;
        const f0 = S.floorAt(x, z), f = S.floorAt(nx, nz);
        if (f === null || f0 === null) continue;
        if (S.blocked(nx, nz, S.bodyR(nx, nz), f0)) continue;
        const ce = S.ceilAt(nx, nz);
        if (ce !== null && ce - f < h + 0.06) continue;
        seen.add(k); q.push([nx, nz]);
      }
    }
    /* the FRONTIER: not the furthest cell along x — the tube snakes, and
     * where it runs back in z the furthest-x cell is nowhere near where the
     * flood is stopped — but the reached cell furthest along the tunnel
     * (by a plain floor-connectivity distance from the start, no step rules)
     * that has an unreached floor cell beside it */
    let fx = best, fz = bestZ;
    if (S._tubeDist) {
      let bd = -1;
      for (const k of seen) {
        const d = S._tubeDist.get(k); if (d === undefined || d <= bd) continue;
        const [kx, kz] = k.split(',').map(Number);
        const x = kx / 5, z = kz / 5;
        let open = false;
        for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) { if (!seen.has(key(x + dx, z + dz)) && S.floorAt(x + dx, z + dz) !== null) { open = true; break; } }
        if (open) { bd = d; fx = x; fz = z; }
      }
    }
    return { cells: seen.size, x: best, z: bestZ, seen, fx, fz };
  };
  /* floor connectivity from a spot, every cell's distance in steps, no step
   * or roof rule — how far along the tunnel a cell is */
  S.tubeDistances = (x0, z0, limit = 400000) => {
    const key = (x, z) => Math.round(x * 5) + ',' + Math.round(z * 5);
    const dist = new Map(); const q = [[x0, z0]]; dist.set(key(x0, z0), 0); let head = 0;
    while (head < q.length && head < limit) {
      const [x, z] = q[head++]; const d = dist.get(key(x, z));
      for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (dist.has(k) || S.floorAt(nx, nz) === null) continue;
        dist.set(k, d + 1); q.push([nx, nz]);
      }
    }
    S._tubeDist = dist;
    return dist;
  };
  S.blocked = (lx, lz, r, feet) => {
    // sample the disc: its centre and a ring — cheaper than walking two grids' cells
    if (!S.walkable(lx, lz, feet)) return true;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (!S.walkable(lx + Math.cos(a) * r, lz + Math.sin(a) * r, feet)) return true;
    }
    return false;
  };
  const _po = new THREE.Vector2();
  /* The push is the RESULTANT of every bad sample's push (the bunker's own
   * lesson: a nearest-face push stops you dead against a small thing),
   * a few rounds; and the last word is `escape`. */
  S.pushOut = (p, r, feet, rounds = 4) => {
    let moved = false;
    for (let it = 0; it < rounds; it++) {
      let sx = 0, sz = 0, n = 0;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
        if (S.walkable(p.x + cx * r, p.z + cz * r, feet)) continue;
        sx -= cx; sz -= cz; n++;
      }
      if (!n) break;
      const L = Math.hypot(sx, sz);
      if (L < 1e-6) break;
      p.x += (sx / L) * (r * 0.22); p.z += (sz / L) * (r * 0.22);
      moved = true;
    }
    return moved;
  };
  S.escape = (p, r, feet, maxR = 2.0) => {
    if (!S.blocked(p.x, p.z, r, feet)) return true;
    for (let rad = 0.15; rad <= maxR; rad += 0.15) {
      let best = null, bd = Infinity;
      const steps = Math.max(8, Math.round((2 * Math.PI * rad) / 0.14));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = p.x + Math.cos(a) * rad, z = p.z + Math.sin(a) * rad;
        if (S.blocked(x, z, r, feet)) continue;
        const d = (x - p.x) ** 2 + (z - p.z) ** 2;
        if (d < bd) { bd = d; best = [x, z]; }
      }
      if (best) { p.x = best[0]; p.z = best[1]; return true; }
    }
    return false;
  };

  /* ---- THE LOOK.
   * A PER-CHANNEL REMAP IS A COLOUR REMOVER and so is a pull toward
   * luminance: the first pass mixed 55 % of the way to grey and then
   * multiplied the lot by 0.56, and a church whose stone, timber, gilding
   * and glass are the whole reason it is here came out as one flat brown.
   * The owner's word was that the textures look nothing like the model,
   * and he was right — nothing about this look may touch HUE or CONTRAST.
   * So the dirt is a MULTIPLY, which scales every channel by the same
   * number and therefore leaves the map's own colour and its own relative
   * contrast exactly where the artist put them: dust settles where a
   * surface faces up, damp blotches it, and the level comes down. That is
   * all. The cave takes it hard — it is rock in the dark and the owner
   * wants the tunnel much darker — and the church takes barely any. */
  const LOOK = {
    /* nothing wears `cave` any more — both tunnels are bores with their own
     * material — but the default kind is still 'cave', so it stays as the
     * thing an unlabelled material would get. */
    cave:   { dust: 0.52, damp: 0.42, level: 0.46, emis: 0.14, tint: 0xa9a69c },
    church: { dust: 0.16, damp: 0.14, level: 0.92, emis: 0.52, tint: 0xc9c6c0 },
    /* the idol takes almost no dirt and a WARM lift: it stands in a ring of
     * candles and nothing else in this building is lit by a flame. */
    altar:  { dust: 0.08, damp: 0.05, level: 0.98, emis: 0.34, tint: 0xc7a97c },
  };
  S.look = LOOK;
  function grime(mat, kind) {
    if (!mat || mat.userData.bwGrime) return;
    mat.userData.bwGrime = true;
    mat.userData.bwKind = (kind === 'church' || kind === 'altar') ? kind : 'cave';
    const L = LOOK[kind] || LOOK.cave;
    mat.metalness = 0; mat.roughness = Math.max(0.82, mat.roughness || 1);
    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.anisotropy = 4;
      mat.map.minFilter = THREE.LinearMipmapLinearFilter;
      /* AND HALF THE CHURCH WAS SHIPPED UNLIT. Most of this scan's
       * materials arrive with `emissiveMap` ALREADY SET TO THE ALBEDO at
       * `emissiveIntensity` 1 — the walls, the arches, the altar, the
       * dais — which means the renderer adds the whole map on top of the
       * lighting and the surface is its own texture at full brightness
       * whatever the light is doing. No shading, no falloff, no shape:
       * one flat bright picture of stone, which is exactly what the owner
       * was looking at. The first pass here only touched a material that
       * had NO emissive map, so it walked straight past every one of
       * them. A map that is its own emissive is OURS to set: the lift is
       * a fraction of the map, which raises the level without touching
       * the picture. It used to be a cold 0x9fb0c8 besides, which is a
       * blue wash over stone that is not blue. */
      if (!mat.emissiveMap || mat.emissiveMap === mat.map) {
        mat.emissiveMap = mat.map; mat.emissive = new THREE.Color(L.tint); mat.emissiveIntensity = L.emis;
      } else {
        // a stained window in a buried church is not lit from outside
        mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 1, 0.14);
      }
    } else if (mat.emissiveMap) {
      mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 1, 0.14);
    }
    mat.side = THREE.DoubleSide;             // a scan is a shell; seen from inside, backfaces are the walls
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = function (sh, rndr) {
      if (prev) prev.call(this, sh, rndr);
      sh.uniforms.uUcDust = { value: L.dust };
      sh.uniforms.uUcDamp = { value: L.damp };
      sh.uniforms.uUcLevel = { value: L.level };
      sh.uniforms.uUcCut = CUT; sh.uniforms.uUcCutX = CUT_X;      // shared: set once, every material sees it
      sh.uniforms.uUcClipX = { value: mat.userData.bwClipX ?? -1e9 };   // the old cave's rock stops at the apse wall
      mat.userData.bwSh = sh;
      sh.vertexShader = 'varying vec3 vGrimeN; varying vec3 vGrimeP;\n' + sh.vertexShader
        .replace('#include <fog_vertex>', '#include <fog_vertex>\n  vGrimeN = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);\n  vGrimeP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vGrimeN; varying vec3 vGrimeP;\nuniform float uUcDust, uUcDamp, uUcLevel; uniform vec4 uUcCut; uniform float uUcCutX; uniform float uUcClipX;\n' + sh.fragmentShader
        /* THE WAY OUT IS CUT THROUGH THE APSE. A cylinder along x through the
         * back wall, WALLS ONLY — a floor or a vault inside the radius is
         * left alone, or the arch stands over a black disc — and the stone
         * falls into shadow over the last half metre to the break, the
         * breach's own lip. Radius zero is no cut, which is every material
         * until the cave has been placed. */
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  float ucCutEdge = 9.0;
  /* THE SCAN CARRIES NO NORMALS. The packer writes positions and uvs and
   * three flat-shades the rest, so objectNormal in the vertex shader is
   * the attribute's default — zero — and the world normal carried down
   * here was nothing: the dust never settled and the cut never cut, and
   * neither said a word. The face's normal is taken off the world
   * position's derivatives instead, which is exactly what flat shading
   * does for the lighting. */
  vec3 ucN = normalize(cross(dFdx(vGrimeP), dFdy(vGrimeP)));
  if (vGrimeP.x < uUcClipX) discard;
  if (uUcCut.w > 0.0 && abs(ucN.y) < 0.6 && abs(vGrimeP.x - uUcCut.x) < uUcCutX) {
    float cdy = vGrimeP.y - uUcCut.y, cdz = vGrimeP.z - uUcCut.z;
    float ca = atan(cdy, cdz);
    float cr = uUcCut.w * (0.92 + 0.08 * sin(ca * 3.0 + 0.9) + 0.05 * sin(ca * 7.0 - 1.3));
    float cd = length(vec2(cdy, cdz));
    if (cd < cr) discard;
    ucCutEdge = cd - cr;
  }`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.rgb *= mix(0.28, 1.0, smoothstep(0.0, 0.55, ucCutEdge));')
        .replace('#include <map_fragment>', `#include <map_fragment>
  {
    float up = clamp(ucN.y, 0.0, 1.0);
    float g1 = fract(sin(dot(floor(vGrimeP.xz * 6.0), vec2(12.9898, 78.233))) * 43758.5453);
    float g2 = fract(sin(dot(floor(vGrimeP.xy * 3.1 + vGrimeP.zz), vec2(39.3468, 11.135))) * 24634.6345);
    // dust on whatever faces up — grey-brown, MULTIPLIED, so the grain under it survives
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.78, 0.77, 0.71), up * (0.55 + 0.45 * g1) * uUcDust);
    // and damp in patches, which is a level change and nothing else
    diffuseColor.rgb *= 1.0 - uUcDamp * (0.35 + 0.65 * g2);
    diffuseColor.rgb *= uUcLevel;
  }`);
    };
    mat.needsUpdate = true;
    S.mats.push(mat);
  }
  /* Tunable live from the harness, because the only way to settle a look is
   * to look at it: `UC.setLook('cave', { level: 0.3 })`. */
  S.setLook = (kind, v) => {
    Object.assign(LOOK[kind], v);
    const L = LOOK[kind];
    for (const m of S.mats) {
      const sh = m.userData.bwSh;
      if (!sh || !sh.uniforms.uUcDust) continue;
      if ((m.userData.bwKind || 'cave') !== kind) continue;
      sh.uniforms.uUcDust.value = L.dust; sh.uniforms.uUcDamp.value = L.damp; sh.uniforms.uUcLevel.value = L.level;
      if (m.emissiveMap === m.map && !m.userData.bwFixedEmis) m.emissiveIntensity = L.emis;
    }
  };

  // ---- the church. It is the one scan left: both tunnels are built.
  function dress(root, kind) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = true;
      const m = o.material;
      if (!m) return;
      const name = m.name || '';
      if (kind === 'cave' && name === 'Material.002') {
        /* the bulbs on the posts. THE ONE MATERIAL IN EITHER CAVE WITH NO MAP
         * — it is a light fitting, not rock, which is why it has none, and
         * treating it as untextured stone was what made it read as black. */
        m.emissive = new THREE.Color(0xffc48a); m.emissiveIntensity = 1.6; m.color.setHex(0x604020);
        m.userData.bwGrime = true; S.bulbs.push(o);
        return;
      }
      if (kind === 'church' && name === 'ampoule') {
        m.emissive = new THREE.Color(0xffb070); m.emissiveIntensity = 0.9; m.transparent = false; m.opacity = 1; m.depthWrite = true;
        m.userData.bwGrime = true; S.bulbs.push(o);
        return;
      }
      grime(m, kind);
      /* THE WINDOWS, AND WHAT IS BEHIND THEM — which is EARTH. The scan
       * hangs a lit backdrop behind every window (`vitrail-fond*`) so the
       * glass reads against a daylight sky, and forty metres under a beach
       * that backdrop is six slabs of white burning through the sanctuary
       * wall: the blown-out patches round the apse windows. It is dropped
       * to almost nothing and given a cold cast — a memory of a sky, not a
       * sky — and the glass itself keeps a little of its own so the colour
       * survives being looked at. */
      if (kind === 'church' && /^vitrail-fond/.test(name)) {
        m.emissive = new THREE.Color(0x6d7f9c); m.emissiveIntensity = 0.035;
        m.color.setHex(0x1b2028); m.userData.bwFixedEmis = true;
      } else if (kind === 'church' && /vitrail|verre/.test(name)) {
        m.emissiveIntensity = 0.14; m.userData.bwFixedEmis = true;
      } else if (kind === 'church' && /-ext$/.test(name)) {
        // the OUTSIDE of the church, seen through the openings: it is in the ground
        m.color.setHex(0x141412); m.emissiveIntensity = 0.015; m.userData.bwFixedEmis = true;
      }
    });
  }
  /* ---- THE TWO CAVES ARE THE OWNER'S MODELS, WEARING THEIR OWN MAPS.
   * A pass of this file put the huge rock's granite on them instead, and the
   * owner's word was plain: stop changing the textures, keep the models I
   * gave you, improve crawling through them. So `dress` and the grime are
   * exactly what they were; the only thing done to a map is the PROJECTION
   * below, which is not a different texture, it is the same one applied in a
   * way that does not smear. */
  function passageTriplanar(root) {
    /* A GAME TUNNEL'S UVs RUN DOWN THE BORE, so stretched over a hundred and
     * seventy metres of scaled-up rock they draw as long smeared streaks.
     * The map goes on TRIPLANAR instead (the ring's own trick): sampled along
     * each world axis at a fixed size and blended by the face normal, which
     * the fragment derives itself because the packer ships none. */
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) triplanar(m);
    });
  }
  function triplanar(m) {
    if (!m || !m.map || m.userData.bwTri) return m;
    m.userData.bwTri = true;
    m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = function (sh, rndr) {
      if (prev) prev.call(this, sh, rndr);
      sh.uniforms.uTriScale = { value: 0.42 };      // metres per texture tile
      sh.fragmentShader = 'uniform float uTriScale;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `{
  vec3 tp = vGrimeP * uTriScale;
  vec3 tn = abs(normalize(cross(dFdx(vGrimeP), dFdy(vGrimeP))));
  tn = tn / max(1e-4, tn.x + tn.y + tn.z);
  vec4 tx = texture2D(map, tp.yz) * tn.x + texture2D(map, tp.xz) * tn.y + texture2D(map, tp.xy) * tn.z;
  diffuseColor *= tx;
}`);
    };
    m.needsUpdate = true;
    return m;
  }
  /* AND THE REPAIR WEARS THE SAME MAP AS THE THING IT REPAIRS. Where the
   * model has a hole in it, the patch behind it is a clone of that model's
   * OWN material — grimed and projected the same way — so the seam between
   * what the artist made and what closes its gaps cannot be found.
   * `Material.clone` drops `onBeforeCompile` and copies `userData`, so the
   * copy's userData is cleared and both passes put back on it. */
  function patchMat(src) {
    if (!src) return new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 });
    const m = src.clone();
    m.userData = {};
    m.name = (src.name || 'rock') + '-patch';
    m.side = THREE.DoubleSide;
    grime(m, 'cave');
    triplanar(m);
    return m;
  }
  const findMat = (root, want) => {
    let hit = null;
    root.traverse((o) => { if (!hit && o.isMesh && o.material && o.material.map && (!want || (o.material.name || '') === want)) hit = o.material; });
    return hit;
  };

  load(opts.passageUrl || 'assets/passage.glb', (gltf) => {
    const root = gltf.scene;
    const w = parseWalk(root);
    dress(root, 'cave');
    passageTriplanar(root);
    group.add(root);
    S.passage = { root, walk: w };
    compose();
  });
  load(opts.caveUrl || 'assets/cave.glb', (gltf) => {
    const root = gltf.scene;
    const w = parseWalk(root);
    dress(root, 'cave');
    group.add(root);
    S.cave = { root, walk: w };
    compose();
  });
  load(opts.churchUrl || 'assets/church.glb', (gltf) => {
    const root = gltf.scene;
    const w = parseWalk(root);
    dress(root, 'church');
    /* A PIECE IS CENTRED ON ITSELF — the tripod camera's lesson, before it
     * bites: the packer bakes every bench's vertices into the church's
     * frame, so the mesh's own position is the church's origin, which is
     * where a thrown body's test and a gib's pivot would put it. Each
     * bench's geometry is moved onto its own box centre and the mesh set
     * there, so the blade's ray, `ragSmash` and the break all agree. */
    root.traverse((o) => {
      if (o.isMesh && o.material && (o.material.name || '') === 'mur-bas.002') S.wallMat = o.material;
      if (!o.isMesh || !/^bench_\d+$/.test(o.name)) return;
      o.geometry.computeBoundingBox();
      const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
      o.geometry.translate(-c.x, -c.y, -c.z);
      o.geometry.computeBoundingBox(); o.geometry.computeBoundingSphere();
      o.position.copy(c);
      /* AND A BOX TO SWING AT. A pew is a plank, a back and two ends with air
       * between them, and the blade's ray through the middle of it found
       * the air — four swings, nothing. The prop's raycast walks the mesh's
       * children, so an invisible box the size of the bench rides inside
       * it: the same `hitProxy` every small prop on the beach carries. */
      const bb = o.geometry.boundingBox.getSize(new THREE.Vector3());
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(bb.x, bb.y, bb.z), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      proxy.name = 'hitProxy';
      o.add(proxy);
      S.benches.push({ mesh: o, box: null, n: +o.name.slice(6) });
    });
    S.benches.sort((a, b) => a.n - b.n);
    if (w && w.benches) for (const b of S.benches) b.box = w.benches[b.n] || null;
    group.add(root);
    S.church = { root, walk: w };
    compose();
  });

  /* THE JOIN. The cave's last floor cell along +x is its mouth; the church's
   * door is a box the packer wrote into its walk. The church is moved so the
   * door's floor sits `GAP` past the mouth at the mouth's own height and on
   * the mouth's own z, and a bridge strip answers for the floor between. The
   * church's doorway is already an opening in the scan, so it is FILLED with
   * one black panel that has the tunnel's silhouette cut out of it — see the
   * breach below, and why the box that used to do this job was the wrong
   * shape for the one direction that mattered. */
  const GAP = 0.9;
  function compose() {
    try { composeInner(); } catch (e) { console.error('[undercroft] compose failed', e); throw e; }
  }
  function composeInner() {
    if (!S.church || !S.passage || !S.cave || S.ready) return;
    const ch = S.church.walk, pw = S.passage.walk, cw = S.cave.walk;
    if (!ch || !pw || !cw) return;
    // the mouth: the column with the greatest x that has a floor, and where on it
    /* A column's floor is its LOW floor. The cave's roof has an outside,
     * and where the tunnel under it is too low to walk the grid's floor is
     * the top of the rock — so the cells within a metre of the column's
     * lowest floor are the tunnel, and the spot is the middle of those. */
    const colStats = (w, i) => {
      let zs = [];
      for (let j = 0; j < w.gh; j++) { const f = cellFloor(w, i, j); if (f !== null) zs.push([w.z0 + (j + 0.5) * w.cell, f]); }
      if (!zs.length) return null;
      const lo = Math.min(...zs.map((c) => c[1]));
      zs = zs.filter((c) => c[1] < lo + 1.0);
      zs.sort((a, b) => a[0] - b[0]);
      const mid = zs[Math.floor(zs.length / 2)];
      return { x: w.x0 + (i + 0.5) * w.cell, z: mid[0], y: mid[1], n: zs.length };
    };
    let low = null, high = null;
    for (let i = pw.gw - 1; i >= 0 && !low; i--) { const s = colStats(pw, i); if (s && s.n >= 4) low = s; }
    for (let i = 0; i < pw.gw && !high; i++) { const s = colStats(pw, i); if (s && s.n >= 4) high = s; }
    if (!low || !high) return;
    /* how big the passage's mouth is, for the breach to hug: the floor
     * cells of its last column and the roof over them */
    const mouthCol = { w: 0, h: 0 };
    {
      const i = Math.round((low.x - pw.x0) / pw.cell - 0.5);
      const zs = [];
      for (let j = 0; j < pw.gh; j++) { const f = cellFloor(pw, i, j); if (f !== null && f < low.y + 1.0) zs.push([pw.z0 + (j + 0.5) * pw.cell, pw.ceil[j][i]]); }
      if (zs.length) {
        mouthCol.w = zs[zs.length - 1][0] - zs[0][0] + pw.cell;
        mouthCol.h = Math.max(...zs.map((c) => (c[1] >= 90 ? 0 : c[1] - low.y)));
      }
    }
    // the door, in the church's own frame
    const D = ch.door;
    const doorX = (D[0] + D[3]) / 2, doorZ = (D[2] + D[5]) / 2;
    let doorFloor = null;
    for (let k = 1; k <= 8 && doorFloor === null; k++) doorFloor = gridFloor(ch, doorX + k * 0.25, doorZ);
    if (doorFloor === null) doorFloor = D[1] + 0.3;
    const off = new THREE.Vector3(low.x + GAP - doorX, low.y - doorFloor, low.z - doorZ);
    ch.off.copy(off);
    S.church.root.position.copy(off);
    /* THE PASSAGE IS WALKED AS A TUBE AND THE OTHER TWO AS GRIDS. The
     * passage's own grid is used ONCE, to find a centreline; what the walk
     * then uses is a corridor fitted to the tunnel's own drawn surface. */
    S.walks = [ch, cw];
    ch.stepMax = 0.40;                  // a pew's seat is 0.45 up, and that is not a step
    cw.stepMax = 1.2; cw.dropMax = 2.0;  // the old cave is rubble
    const inbound = buildCorridor(pw, { x: high.x + 2.0, z: high.z }, { x: low.x - 0.4, z: low.z });
    if (!inbound) { console.warn('[undercroft] the passage has no centreline'); return; }
    /* THE JOIN IS BLANKETED, not bridged with a hairline. The passage's
     * walkable floor and the church's are at the same height here (both
     * ~-10.88, measured) but they are separate grids and the flood would
     * not cross between them at the exact seam — the passage frontier sat
     * ten metres short of the door. A wide flat strip the walk answers for,
     * from well back in the tunnel to well inside the nave, is one floor
     * over the join and there is nothing to step across. */
    /* AND THE CORRIDOR GOES ALL THE WAY IN. Handing over to a bridge at the
     * tunnel's last floor cell put a flat strip at one height against a tube
     * climbing at another, and the two would not meet — the walk ended ten
     * metres short of the door. The tube simply CONTINUES instead: a
     * straight run of its own points from where the tunnel's floor gives out
     * to the church's doorway, at the doorway's height. One floor, no seam,
     * nothing to step across. */
    {
      /* THE FIT COMES FIRST. Laid before it, the straight run at the church
       * dragged the last real stations off the tunnel's centre when it was
       * smoothed into them — and those are the narrowest stations in the
       * model, where being a foot off centre is the difference between a
       * corridor and a wall. */
      fitCorridor(inbound, surfaceBins(S.passage.root));
      /* AND IT RUNS ALL THE WAY INTO THE NAVE. The last stations are laid
       * straight at the church's doorway at the doorway's own height and a
       * stride PAST its wall, so the bore's mouth is inside the breach and
       * there is no seam to see and nothing to step over. */
      const P = inbound.pts, CE = P[P.length - 1];
      const endX = low.x + GAP + 1.35;
      const dx = endX - CE.x, dz = low.z - CE.z, dy = low.y - CE.y;
      const n = Math.max(3, Math.ceil(Math.hypot(dx, dz) / 2.0));
      for (let k = 1; k <= n; k++) {
        const t = k / n, e = t * t * (3 - 2 * t);
        P.push({ x: CE.x + dx * e, z: CE.z + dz * e, y: CE.y + dy * e,
                 r: CE.r + (1.62 - CE.r) * e, h: CE.h + (2.95 - CE.h) * e });
      }
      // ease the run itself so its start is not a corner — and NOT the fitted
      // stations before it, which are the narrowest in the model
      for (let pass = 0; pass < 6; pass++) for (let k = P.length - n; k < P.length - 1; k++) {
        if (k < 1) continue;
        P[k] = { x: P[k].x * 0.5 + (P[k - 1].x + P[k + 1].x) * 0.25,
                 z: P[k].z * 0.5 + (P[k - 1].z + P[k + 1].z) * 0.25,
                 y: P[k].y * 0.5 + (P[k - 1].y + P[k + 1].y) * 0.25,
                 r: P[k].r, h: P[k].h };
      }
      for (let k = Math.max(0, P.length - n - 1); k < P.length; k++) P[k].open = true;   // the run into the nave was never tunnel floor
      /* AND THE REPAIR IS ONE CONTINUOUS SKIN, NOT A PATCH PER HOLE. Sleeves
       * over the runs the probe called open left black in the frame anyway:
       * "open" is measured on the CENTRELINE, and this model's holes are as
       * often a metre off to one side or a gap in the floor. A tube swept
       * down the whole line at the measured wall plus a hand's breadth sits
       * BEHIND the scan everywhere the scan is there — you never see it —
       * and is the rock everywhere it is not. The cave you look at is still
       * the owner's model; what is behind it is no longer the void. */
      gapRuns(inbound);
      group.add(makeBore({ pts: P.map((q) => ({ ...q, r: q.wall ?? q.r })) }, patchMat(findMat(S.passage.root)),
                         { cap: [true, false], rough: 0.22, grow: 0.45, measure: false }));
      corridorBox(inbound);
      S.corridors.push(inbound);
      mouthCol.w = P[P.length - 1].r * 2;
      mouthCol.h = P[P.length - 1].h;
    }
    /* THE BREACH. The church's front doorway is ALREADY AN OPENING in the
     * scan — four metres by five and a half — and the first two builds
     * closed it with black: a BackSide box eight metres deep whose far
     * face stood inside the nave (the black screen you walked into), then
     * a flat black panel with the tunnel's silhouette cut out of it, which
     * the owner read as a picture of a hole. What stands in the doorway
     * now is the CHURCH'S OWN WALL — a panel wearing the end wall's
     * material, its map tiled at the wall's own density — with a rough
     * arch broken out of it where the tunnel comes through, the stone
     * darkening into the break the way a recess shadows its own lip. From
     * the nave the front door has been walled up and something has come
     * through the bottom of it; from the tunnel the panel faces away and
     * is not drawn, so there is never anything between you and the nave.
     * The material is a CLONE of the wall's: the discard belongs to the
     * panel alone, and `Material.clone` drops `onBeforeCompile`, so the
     * grime is put back on it (its copied `userData` would refuse). */
    {
      const wallX = D[0] + off.x + 0.14;                 // the outer face of the end wall, a hand inside it
      const cz = low.z, cy = low.y;
      /* THE WALL'S MAP IS AN ATLAS, NOT A TILE. Tiling it over the panel
       * drew a grid of the scan's baked window bays — the first thing the
       * owner saw. So the panel is ASHLAR: a grid of half-metre blocks,
       * each mapped onto one of the plain-stone cells of the atlas (found
       * by scanning it for 64-px blocks of low variance at the wall's own
       * tone: u 0.375–0.5, v 0.31–0.63), a different cell per block and
       * each one turned a random quarter, so it is the wall's own stone
       * laid as courses, with the seams between blocks reading as joints. */
      const W = 10.8, H = 11.7, BX = 0.72, BY = 0.45, nx = Math.round(W / BX), ny = Math.round(H / BY);
      const P = [], N = [], UVs = [], I = [];
      const cellsU = [0.375, 0.4375], cellsV = [0.3125, 0.375, 0.4375, 0.5, 0.5625];
      let h = 7;
      const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x0 = -W / 2 + i * BX + (j % 2) * BX * 0.5, y0 = -H / 2 + j * BY;   // running bond
        const u0 = cellsU[(rnd() * cellsU.length) | 0], v0 = cellsV[(rnd() * cellsV.length) | 0], q = (rnd() * 4) | 0;
        const cu = [u0, u0 + 0.0625, u0 + 0.0625, u0], cv = [v0, v0, v0 + 0.0625, v0 + 0.0625];
        const base = P.length / 3;
        const corners = [[x0, y0], [x0 + BX, y0], [x0 + BX, y0 + BY], [x0, y0 + BY]];
        for (let k = 0; k < 4; k++) { P.push(corners[k][0], corners[k][1], 0); N.push(0, 0, 1); const kk = (k + q) % 4; UVs.push(cu[kk], cv[kk]); }
        I.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2));
      g.setIndex(I);
      let fm;
      if (S.wallMat) {
        fm = S.wallMat.clone(); fm.userData = {}; fm.name = 'breach';
        grime(fm, 'church');
      } else {
        fm = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
      }
      fm.side = THREE.FrontSide;
      const fill = new THREE.Mesh(g, fm);
      fill.rotation.y = Math.PI / 2;                     // +x normal: the nave sees it, the tunnel never does
      fill.position.set(wallX, cy + 3.2, cz);
      fill.renderOrder = -2;
      const prevC = fm.onBeforeCompile;
      fm.onBeforeCompile = function (sh, rndr) {
        if (prevC) prevC.call(this, sh, rndr);
        /* IN THE PANEL'S OWN FRAME. The first cut measured world space
         * against group-space numbers — three thousand metres apart — and
         * never discarded a pixel; what looked like an arch was the cave's
         * own mouth poking through the panel. Local: x across, y up. */
        // and it HUGS the mouth: cut wider than the cave's rock and the surplus is the void
        /* sized off the passage's own last column: half its floor width
         * with a hand over, and its roof — the cave's numbers (1.12 by 2.25)
         * were the cave's, and a panel cut for one tunnel and stood in
         * front of another is a gap or a wall. */
        /* IT HUGS THE BORE FROM INSIDE. The cut is a little narrower and a
         * little lower than the tunnel's own mouth, so the wall's stone
         * always overlaps the rock's edge; cut it wider and the surplus is
         * a strip of the void. */
        const hw = Math.max(0.9, mouthCol.w / 2 + 0.18), ht = Math.max(1.9, mouthCol.h - 0.10);
        sh.uniforms.uArch = { value: new THREE.Vector4(0, -3.2, hw, ht) };
        sh.uniforms.uArchS = { value: new THREE.Vector2(ht * 0.55, -1.20) };
        sh.vertexShader = 'varying vec3 vArchW;\n' + sh.vertexShader
          .replace('#include <fog_vertex>', '#include <fog_vertex>\n  vArchW = transformed;');
        sh.fragmentShader = 'varying vec3 vArchW; uniform vec4 uArch; uniform vec2 uArchS;\n' + sh.fragmentShader
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  float archEdge = 9.0;
  {
    float dz = vArchW.x - uArch.x, dy = vArchW.y - uArch.y;   // local x runs ACROSS the panel; its z is zero everywhere
    float t = clamp((dy - uArchS.x) / max(0.001, uArch.w - uArchS.x), 0.0, 1.0);
    float bw = uArch.z * (dy < uArchS.x ? 1.0 : sqrt(max(0.0, 1.0 - t * t)));
    bw *= 0.90 + 0.10 * sin(dy * 5.3 + 1.7) + 0.05 * sin(dy * 11.4 + 0.3);
    if (dy > uArchS.y && dy < uArch.w) {
      if (abs(dz) < bw) discard;
      archEdge = abs(dz) - bw;
    } else {
      archEdge = max(abs(dz) - bw, dy > uArch.w ? dy - uArch.w : 9.0);
    }
  }`)
          // the break's lip: the stone falls into shadow over the last half metre
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.rgb *= mix(0.30, 1.0, smoothstep(0.0, 0.55, archEdge));');
      };
      fm.needsUpdate = true;
      group.add(fill);
      S.doorFill = fill;
    }
    /* AND NOTHING OUTSIDE IT. Sixteen of fifteen hundred rays cast from
     * the middle of the nave hit no geometry at all — the scan has holes
     * in its vault and its walls, and through them you saw out into the
     * void, which forty metres under a beach is wrong twice. A black
     * BackSide box round both scans closes them. It is drawn FIRST and
     * WITHOUT writing depth (the hall's shell rendered the whole arena
     * black because it wrote depth and sorted late), so it can only ever
     * show where nothing else is drawn. */
    {
      const bb = new THREE.Box3();
      const pb = pw.bounds, hb = ch.bounds;
      bb.expandByPoint(new THREE.Vector3(pb[0][0], pb[0][1], pb[0][2])); bb.expandByPoint(new THREE.Vector3(pb[1][0], pb[1][1], pb[1][2]));
      bb.expandByPoint(new THREE.Vector3(hb[0][0] + off.x, hb[0][1] + off.y, hb[0][2] + off.z));
      bb.expandByPoint(new THREE.Vector3(hb[1][0] + off.x, hb[1][1] + off.y, hb[1][2] + off.z));
      // the exit cave is placed a few lines down; its box is added to the shell there
      S._shellBox = bb;
    }
    /* ---- THE WAY OUT: Valsev's cave, behind the altar.
     * The church's walk runs out a metre and a half short of the apse wall,
     * so the last free cell on the church's axis is the exit's threshold. The
     * cave — turned half round by the packer, its ragged mouth now at its -x
     * end — is put down with that mouth a step past the wall at the
     * threshold's own height, a bridge answers for the floor between, and the
     * WALL IS CUT: a cylinder along x through every church material (the
     * grime shader carries the uniform), walls only, or there is a black disc
     * in the floor under the arch. Its own rock covers the hole from behind
     * and is clipped in world x at the apse's face, so none of it stands in
     * the chancel.
     *
     * AND A COLLAR MAKES IT FLUSH. "The exit cave looks horrible" was two
     * things and neither was the model: one of its three materials carries NO
     * MAP AT ALL (the untextured black), which the projected stone fixes, and
     * a ragged photogrammetry mouth clipped flat against a flat wall is a cut
     * EDGE — so a short built sleeve in the same stone runs from inside the
     * wall out to where the cave's own tube begins, and what you walk into is
     * a piece of tunnel rather than a section through one. */
    let exitEdge = null, exitFloor = null;
    {
      const zc = off.z;
      let lastFree = null;
      /* the search starts BEHIND THE ALTAR. Started ten metres short of the
       * end wall it began on the altar's own plinth and put the way out six
       * metres short of the wall — the cave's rock stood in the chancel. */
      const A0 = findAltar();
      for (let x = (A0 ? A0.x1 + 1.0 : altarX0()); x < ch.bounds[1][0] + off.x; x += 0.1) {
        const f = S.floorAt(x, zc);
        if (f === null) break;
        if (S.blocked(x, zc, 0.24, f)) { if (lastFree !== null) break; else continue; }
        lastFree = x; exitFloor = f;
      }
      if (lastFree !== null) exitEdge = lastFree + 0.55;
    }
    let caveFar = null;
    if (exitEdge !== null) {
      let cm = null, cf = null;
      for (let i = 0; i < cw.gw && !cm; i++) { const st = colStats(cw, i); if (st && st.n >= 4) cm = st; }
      for (let i = cw.gw - 1; i >= 0 && !cf; i--) { const st = colStats(cw, i); if (st && st.n >= 4) cf = st; }
      if (cm && cf) {
        const coff = new THREE.Vector3(exitEdge + GAP - cm.x, exitFloor - cm.y, off.z - cm.z);
        cw.off.copy(coff);
        S.cave.root.position.copy(coff);
        S.bridges.push({ x0: exitEdge - 1.4, x1: exitEdge + GAP + 0.8, z0: off.z - 1.5, z1: off.z + 1.5, y0: exitFloor, y1: exitFloor });
        caveFar = { x: cf.x + coff.x, y: cf.y + coff.y, z: cf.z + coff.z };
        const cb = cw.bounds;
        S._shellBox.expandByPoint(new THREE.Vector3(cb[0][0] + coff.x, cb[0][1] + coff.y, cb[0][2] + coff.z));
        S._shellBox.expandByPoint(new THREE.Vector3(cb[1][0] + coff.x, cb[1][1] + coff.y, cb[1][2] + coff.z));
        group.updateMatrixWorld(true);
        const wc = group.localToWorld(new THREE.Vector3(exitEdge, exitFloor + 1.05, off.z));
        CUT.value.set(wc.x, wc.y, wc.z, 1.25);
        CUT_X.value = 1.3;
        const clipX = group.localToWorld(new THREE.Vector3(exitEdge + 0.12, 0, 0)).x;
        S.cave.root.traverse((o) => {
          if (!o.isMesh) return;
          for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
            m.userData.bwClipX = clipX;
            if (m.userData.bwSh && m.userData.bwSh.uniforms.uUcClipX) m.userData.bwSh.uniforms.uUcClipX.value = clipX;
          }
        });
        /* AND THE OLD CAVE IS WALKED AS A TUBE TOO. Its walkable channel,
         * measured off the packer's grid, is ONE CELL WIDE for most of its
         * length and wanders a metre sideways per metre along — which is a
         * corridor you can only follow by luck, and is the "glitchy" the
         * owner reported at this end as much as at the other. Its own
         * centreline, fitted to its own drawn rock, with a sleeve where the
         * scan has nothing: the same treatment as the passage, and the
         * COLLAR through the apse wall falls out of it for free, because
         * the run from inside the wall to the cave's mouth is a stretch the
         * model does not cover. */
        const outbound = buildCorridor(cw, { x: cm.x + coff.x + 0.5, z: cm.z + coff.z },
                                           { x: cf.x + coff.x - 0.5, z: cf.z + coff.z });
        if (outbound) {
          fitCorridor(outbound, surfaceBins(S.cave.root));
          const Q = outbound.pts, X0 = exitEdge - 1.1, F = Q[0];
          const np = Math.max(2, Math.ceil(Math.hypot(F.x - X0, F.z - off.z) / 1.2));
          const pre = [];
          for (let k = 0; k < np; k++) {
            const t = k / np;
            pre.push({ x: X0 + (F.x - X0) * t, z: off.z + (F.z - off.z) * t, y: exitFloor + (F.y - exitFloor) * t,
                       r: 1.22, h: 2.62, wall: 1.42, open: true });
          }
          Q.unshift(...pre);
          gapRuns(outbound);
          group.add(makeBore({ pts: Q.map((q) => ({ ...q, r: q.wall ?? q.r })) }, patchMat(findMat(S.cave.root, 'MaterialKEInGLANZ') || findMat(S.cave.root)),
                             { cap: [false, true], rough: 0.22, grow: 0.45, measure: false }));
          corridorBox(outbound);
          S.corridors.push(outbound);
          const E = Q[Q.length - 1];
          caveFar = { x: E.x, y: E.y, z: E.z };
        }
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2), new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 }));
        plate.rotation.x = -Math.PI / 2; plate.position.set(exitEdge + GAP * 0.4, exitFloor + 0.01, off.z);
        group.add(plate);
      }
    }
    {
      const bb = S._shellBox;
      const size = bb.getSize(new THREE.Vector3()).addScalar(6), c = bb.getCenter(new THREE.Vector3());
      const shell = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false, depthWrite: false }));
      shell.position.copy(c); shell.renderOrder = -5; shell.frustumCulled = false;
      group.add(shell);
    }
    // where things are: you arrive a metre in from the high end facing down the tunnel (+x);
    // the way out is behind the altar, at the far end of the nave
    const altarX = ch.bounds[1][0] - 3.2 + off.x;
    let altarFloor = S.floorAt(altarX, off.z) ?? (doorFloor + off.y);
    const exitSpot = caveFar ? { x: caveFar.x - 1.4, y: S.floorAt(caveFar.x - 1.4, caveFar.z) ?? caveFar.y, z: caveFar.z, yaw: Math.PI / 2 }
                             : { x: altarX, y: altarFloor, z: off.z, yaw: Math.PI / 2 };
    S.spots = {
      /* A FEW METRES IN, ON THE BORE'S OWN LINE. Set down at a typed offset
       * from the scan's first column the player stood a stride BEHIND the
       * tube's first station, where its radius is already closing into the
       * cap — the third station is inside the cave by construction. */
      entry: (() => { const p = inbound.pts[Math.min(2, inbound.pts.length - 1)];
                      return { x: p.x, y: p.y, z: p.z, yaw: Math.atan2(-(inbound.pts[Math.min(5, inbound.pts.length - 1)].x - p.x), -(inbound.pts[Math.min(5, inbound.pts.length - 1)].z - p.z)) }; })(),
      mouth: { x: low.x, y: low.y, z: low.z },
      exit: exitSpot,                                  // the far end of the old cave, behind the altar
      exitEdge: exitEdge === null ? altarX : exitEdge, // where the church ends and the way out begins
      lamps: [],
      passage: [],
    };
    /* AND NEITHER BORE HAS A LAMP IN IT. The owner's word twice over: it
     * should just be a cave, and the only light in it is what you carry. */
    /* A RAYCASTER READS matrixWorld, AND SO DOES A BOX: the church root was
     * moved a line ago and nothing has updated the matrices since, so the
     * bulbs measured in the scan's raw frame and the lamps went to the
     * wrong room. The tripod camera's lesson, with a group in it. */
    group.updateMatrixWorld(true);
    for (const b of S.bulbs) {
      const box = new THREE.Box3().setFromObject(b);
      const c = box.getCenter(new THREE.Vector3());
      group.worldToLocal(c);
      S.spots.lamps.push({ x: c.x, y: c.y, z: c.z, kind: b.material.name === 'ampoule' ? 'church' : 'cave' });
    }
    /* the model is carved back out of the walk — both tunnels, once both
     * corridors are in `S.corridors` */
    S.carved = carveTube(S.passage.root) + carveTube(S.cave.root);
    // the idol on the altar and the candles round it
    dressAltar();
    // dust in the air of both tunnels and the nave
    makeMotes(ch, cw);
    S.ready = true;
    if (opts.onReady) opts.onReady(S);
  }

  /* ---- THE ALTAR, THE IDOL, AND THE CANDLES ROUND IT.
   * The owner's own `SOL.fbx` — a robed figure in a gold sun mask holding a
   * bleeding heart with eight daggers through it — stands on the church's
   * altar in a ring of lit candles. Three things it takes:
   *
   *   THE ALTAR IS FOUND, NOT TYPED. The church's own walk grid already
   *   knows where it is: the chancel floor is a step up from the nave and
   *   the altar is a metre over THAT, so it is the one plateau in the
   *   chancel a body cannot step onto. Measured off the grid (top -0.21
   *   against a nave at -1.33), which costs nothing and cannot leave the
   *   idol standing in mid-air the day the scan is repacked.
   *
   *   THE CANDLES ARE TWO DRAW CALLS, NOT SIXTY. The wax is one
   *   InstancedMesh (a tapered cylinder scaled per candle) and every flame
   *   is a point in ONE `Points` batch, with the guttering injected into
   *   `PointsMaterial`'s own shader so each flame has its own irregular
   *   count — the bulbs' trick, on a light small enough to be a texture.
   *   Nothing here is a lamp: the two real lights the altar gets live in
   *   the game's own list, because a light entering a scene recompiles
   *   every material in it.
   *
   *   AND HE IS LIT BY A FLAME, WHICH NOTHING ELSE IN HERE IS. The grime
   *   pass takes a third `LOOK` — almost no dirt and a WARM lift — so the
   *   gold reads as gold in candlelight rather than as one more cold stone
   *   surface. */
  const CANDLES = { flames: null, seedAttr: null, mat: null };
  // where to start looking for the church's back edge: a little past the altar's own column
  function altarX0() { return S.church.walk.bounds[1][0] - 10 + S.church.walk.off.x; }
  /* THE EXIT'S CUT, shared by every church material through the grime shader:
   * a cylinder along x (xyz = centre in WORLD space, w = radius; CUT_X the
   * half-length), zero until the cave is placed. */
  const CUT = { value: new THREE.Vector4(0, 0, 0, 0) };
  const CUT_X = { value: 0 };
  function findAltar() {
    const w = S.church && S.church.walk;
    if (!w) return null;
    /* measured from where the CHURCH ends, not from the way out: the exit
     * spot is the far end of the old cave now, twenty metres past the apse,
     * and a window hung off that found no altar at all */
    const ex = w.bounds[1][0] + w.off.x - 1.0;                       // the church's own end, which is where a chancel is
    const dais = S.floorAt(ex - 6, w.off.z) ?? ((S.floorAt(ex - 9, w.off.z) ?? 0) + 0.34);
    /* AND THE CHANCEL IS NOT TWO PLATEAUX, IT IS A DOZEN. Bucketing the
     * cells by height alone gathered every surface in the apse that happens
     * to stand a metre off the dais — the altar, the reredos ledge, the
     * tops of the stalls, both sides of the sanctuary — into one blob
     * nineteen metres across, and the idol went up on whichever blob won.
     * They have to be FLOOD-FILLED: a plateau is a connected run of cells
     * at the same height, and the altar is the one that is table-shaped
     * (a metre or three both ways, where a ledge is one and a half deep by
     * nearly seven wide) and standing on the church's own axis. */
    const cand = new Map();      // j*gw+i -> y
    for (let j = 0; j < w.gh; j++) {
      for (let i = 0; i < w.gw; i++) {
        const f = w.floor[j][i];
        if (f <= -90) continue;
        const y = f + w.off.y;
        if (y < dais + 0.6 || y > dais + 1.7) continue;
        const x = w.off.x + w.x0 + (i + 0.5) * w.cell;
        if (x < ex - 13 || x > ex - 1.2) continue;
        cand.set(j * w.gw + i, y);
      }
    }
    const seen = new Set();
    let best = null, bs = -1;
    const fit = (v) => (v < 0.8 ? v / 0.8 : v > 3.4 ? 3.4 / v : 1);
    for (const start of cand.keys()) {
      if (seen.has(start)) continue;
      const stack = [start]; seen.add(start);
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, top = -1e9, n = 0;
      while (stack.length) {
        const c = stack.pop(), y = cand.get(c);
        const i = c % w.gw, j = (c - i) / w.gw;
        const x = w.off.x + w.x0 + (i + 0.5) * w.cell, z = w.off.z + w.z0 + (j + 0.5) * w.cell;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        top = Math.max(top, y); n++;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= w.gw || jj >= w.gh) continue;
          const k = jj * w.gw + ii;
          if (seen.has(k) || !cand.has(k)) continue;
          if (Math.abs(cand.get(k) - y) > 0.12) continue;
          seen.add(k); stack.push(k);
        }
      }
      if (n < 8) continue;
      const dx = x1 - x0 + w.cell, dz = z1 - z0 + w.cell;
      const zc = (z0 + z1) / 2;
      const score = n * fit(dx) * fit(dz) / (1 + Math.abs(zc - w.off.z) * 0.9);   // and it stands on the church's own axis (off.z: the door's z is the axis)
      if (score > bs) { bs = score; best = { x0, x1, z0, z1, y: top, n }; }
    }
    if (!best) return null;
    return { x: (best.x0 + best.x1) / 2, z: (best.z0 + best.z1) / 2, y: best.y,
             x0: best.x0, x1: best.x1, z0: best.z0, z1: best.z1, dais };
  }
  function flameTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const x = c.getContext('2d');
    // a teardrop, not a dot: hot and white at the wick, orange at the tip
    const g = x.createRadialGradient(24, 30, 0, 24, 30, 22);
    g.addColorStop(0.00, 'rgba(255,246,214,1)');
    g.addColorStop(0.22, 'rgba(255,196,104,0.92)');
    g.addColorStop(0.55, 'rgba(232,124,40,0.40)');
    g.addColorStop(1.00, 'rgba(120,40,0,0)');
    x.fillStyle = g;
    x.save(); x.translate(24, 30); x.scale(0.78, 1.25); x.beginPath(); x.arc(0, 0, 22, 0, 6.284); x.fill(); x.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function dressAltar() {
    const A = findAltar();
    if (!A) return;
    S.spots.altar = { x: A.x, y: A.y, z: A.z, dais: A.dais };

    /* where the candles stand: a horseshoe on the altar itself, open at the
     * back where the idol is, and a wider ring on the dais at its foot.
     * Nothing is placed at random about the room — a candle is somebody's
     * offering and they are set down where a person could reach. */
    let h = 19;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    const spots = [];
    const rx = Math.max(0.42, (A.x1 - A.x0) / 2 - 0.16), rz = Math.max(0.55, (A.z1 - A.z0) / 2 - 0.16);
    for (let k = 0; k < 13; k++) {
      const a = -Math.PI * 0.86 + (k / 12) * Math.PI * 1.72;    // the open side faces down the nave
      spots.push({ x: A.x + Math.cos(a) * rx * (0.86 + rnd() * 0.2),
                   z: A.z + Math.sin(a) * rz * (0.86 + rnd() * 0.2),
                   y: A.y, hgt: 0.13 + rnd() * 0.20, r: 0.026 + rnd() * 0.012 });
    }
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + rnd() * 0.12;
      const q = 0.9 + rnd() * 0.5;
      /* AND THE RING STANDS CLEAR OF THE PLINTH. The altar's step is a wall
       * to the walk (0.65 up against a 0.40 step) and the disc stops a body
       * 0.4 m short of it — right where the first ring stood, so "the
       * candles block me at the altar". Nothing here has ever had a
       * collider; they stand where you can walk through them now. */
      const x = A.x + Math.cos(a) * (A.x1 - A.x0 + 2.0) * 0.5 * q;
      const z = A.z + Math.sin(a) * (A.z1 - A.z0 + 2.2) * 0.5 * q;
      /* A CANDLE'S GROUND IS A LOOKUP, not the height of the thing it is
       * arranged around: the dais is a step and the ring reaches past its
       * front edge, so the ones at the bottom of it stood a third of a
       * metre in the air over the nave floor. The gibs learned this once. */
      const f = S.floorAt(x, z);
      spots.push({ x, z, y: f === null || Math.abs(f - A.dais) > 1.2 ? A.dais : f,
                   hgt: 0.16 + rnd() * 0.30, r: 0.030 + rnd() * 0.016 });
    }
    // a few burnt down to stubs, because a shrine is old
    for (const sp of spots) if (rnd() < 0.22) sp.hgt *= 0.32;

    const taper = new THREE.CylinderGeometry(0.82, 1.0, 1.0, 7, 1, false);
    taper.translate(0, 0.5, 0);                       // stand it on its own foot
    const waxMat = new THREE.MeshStandardMaterial({ color: 0xb9aa90, roughness: 0.86, metalness: 0,
                                                    emissive: 0x6b4520, emissiveIntensity: 0.50, flatShading: true });
    const wax = new THREE.InstancedMesh(taper, waxMat, spots.length);
    const pool = new THREE.CylinderGeometry(1.0, 1.15, 1.0, 8, 1, false);
    pool.translate(0, 0.5, 0);
    const pools = new THREE.InstancedMesh(pool, waxMat, spots.length);
    /* A FLAME THAT IS ONLY A POINT SPRITE CAN BE MISSED. At the retro scale a
     * point is a few pixels, and past ten metres it is one — so the owner's
     * word was "make the candles lit". Every flame has a BODY now: a small
     * lit cone on the wick, unlit by anything (`MeshBasicMaterial`, its own
     * colour), which is on screen from any distance, and the sprite breathes
     * over it. */
    const tongue = new THREE.ConeGeometry(0.018, 0.075, 6); tongue.translate(0, 0.0375, 0);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xffb75a, fog: true });
    const tongues = new THREE.InstancedMesh(tongue, tongueMat, spots.length);
    const m4 = new THREE.Matrix4(), qi = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
    const fpos = new Float32Array(spots.length * 3), fseed = new Float32Array(spots.length), fsize = new Float32Array(spots.length);
    spots.forEach((sp, k) => {
      const lean = (rnd() - 0.5) * 0.14;              // nothing hand-set is plumb
      qi.setFromEuler(new THREE.Euler(lean, rnd() * 3, (rnd() - 0.5) * 0.14));
      wax.setMatrixAt(k, m4.compose(pv.set(sp.x, sp.y, sp.z), qi, sv.set(sp.r, sp.hgt, sp.r)));
      pools.setMatrixAt(k, m4.compose(pv.set(sp.x, sp.y + 0.002, sp.z), new THREE.Quaternion(), sv.set(sp.r * 1.5, 0.018 + rnd() * 0.02, sp.r * 1.5)));
      fpos[k * 3] = sp.x; fpos[k * 3 + 1] = sp.y + sp.hgt + 0.045; fpos[k * 3 + 2] = sp.z;
      fseed[k] = rnd() * 90; fsize[k] = 0.16 + rnd() * 0.07;
      tongues.setMatrixAt(k, m4.compose(pv.set(sp.x, sp.y + sp.hgt - 0.005, sp.z), new THREE.Quaternion(), sv.set(1, 1, 1)));
    });
    wax.instanceMatrix.needsUpdate = true; pools.instanceMatrix.needsUpdate = true; tongues.instanceMatrix.needsUpdate = true;
    wax.frustumCulled = false; pools.frustumCulled = false; tongues.frustumCulled = false;
    group.add(wax, pools, tongues);

    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    fg.setAttribute('aSeed', new THREE.BufferAttribute(fseed, 1));
    fg.setAttribute('aSize', new THREE.BufferAttribute(fsize, 1));
    const fm = new THREE.PointsMaterial({ color: 0xffbe72, size: 1.0, sizeAttenuation: true, map: flameTexture(),
                                          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    /* PER-FLAME GUTTERING, IN THE STOCK POINTS SHADER. A flame that breathes
     * on the same count as every other flame is a string of fairy lights;
     * what says "candle" is that they are all out of step. `gl_PointSize` is
     * written by three's own `size` chunk with the resolution scale in it, so
     * the flicker MULTIPLIES what it wrote rather than replacing it — a
     * hand-rolled `300.0 / -mvPosition.z` is right at exactly one canvas
     * height and wrong at every other. */
    fm.onBeforeCompile = (sh) => {
      sh.uniforms.uFlameT = { value: 0 };
      CANDLES.mat = sh;
      sh.vertexShader = 'attribute float aSeed;\nattribute float aSize;\nuniform float uFlameT;\nvarying float vFlame;\n' + sh.vertexShader
        .replace('#include <fog_vertex>', `#include <fog_vertex>
  float fk = 0.62 + 0.30 * sin(uFlameT * 8.7 + aSeed * 6.1) + 0.22 * sin(uFlameT * 3.1 + aSeed * 2.7);
  fk = clamp(fk, 0.34, 1.15);
  vFlame = fk;
  gl_PointSize *= aSize * (0.80 + 0.20 * fk);
  /* AND A POINT SPRITE IS A QUAD THAT GROWS AS 1/z. Walk up to the altar and
   * the nearest flame was a hand-sized orange blob lying on the floor —
   * which is the one thing a candle must never be. A flame is a flame's
   * size; past a metre or so it simply stops getting bigger. */
  gl_PointSize = min(gl_PointSize, 22.0);`);
      sh.fragmentShader = 'varying float vFlame;\n' + sh.fragmentShader
        .replace('#include <premultiplied_alpha_fragment>', '  gl_FragColor.rgb *= vFlame;\n#include <premultiplied_alpha_fragment>');
    };
    const flames = new THREE.Points(fg, fm);
    flames.frustumCulled = false;
    flames.renderOrder = 3;
    group.add(flames);
    CANDLES.flames = flames;

    /* the idol. It arrives over the network long after the room is composed,
     * so the group is here from the start and the scan lands in it — the
     * captain's head's own arrangement. He faces DOWN THE NAVE (-x): the
     * model's own forward is +z, so that is a quarter turn back. */
    const idol = new THREE.Group();
    idol.position.set(A.x, A.y, A.z);
    idol.rotation.y = -Math.PI / 2;
    group.add(idol);
    S.idol = idol;
    load('assets/sol.glb', (g2) => {
      const m = g2.scene;
      m.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mm of mats) { grime(mm, 'altar'); S.mats.push(mm); }
      });
      idol.add(m);
    });
  }

  /* THE AIR IS FULL OF IT, AND THE OWNER ASKED FOR MORE. A thousand points
   * drifting very slowly, additive and faint, sized so the retro downscale
   * keeps them as single bright pixels that come and go — dense in the two
   * bores, where you are a metre from the rock and carrying the only light
   * in the world, thinner in the nave, which is big. It is the one thing
   * that says the air down here has not moved in a long time, and it is
   * SUBTLE on purpose: a fog of it reads as snow. */
  function makeMotes(ch, cw) {
    const N = 1100;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    const putGrid = (k, w, hi) => {
      for (let tries = 0; tries < 40; tries++) {
        const i = Math.floor(Math.random() * w.gw), j = Math.floor(Math.random() * w.gh);
        const f = cellFloor(w, i, j);
        if (f === null) continue;
        pos[k * 3] = w.off.x + w.x0 + (i + Math.random()) * w.cell;
        pos[k * 3 + 1] = f + 0.15 + Math.random() * hi;
        pos[k * 3 + 2] = w.off.z + w.z0 + (j + Math.random()) * w.cell;
        return true;
      }
      return false;
    };
    const putBore = (k) => {
      const C = S.corridors[(Math.random() * S.corridors.length) | 0];
      if (!C) return false;
      const P = C.pts, i = (Math.random() * (P.length - 1)) | 0, t = Math.random();
      const a = P[i], b = P[i + 1];
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t;
      const r = (a.r + (b.r - a.r) * t) * 0.92, th = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
      pos[k * 3] = x + Math.cos(th) * rr;
      pos[k * 3 + 1] = y + 0.1 + Math.random() * (a.h * 0.9);
      pos[k * 3 + 2] = z + Math.sin(th) * rr;
      return true;
    };
    for (let k = 0; k < N; k++) {
      if (k < N * 0.34) { if (!putBore(k)) putGrid(k, ch, 6.5); }
      else if (k < N * 0.46) { if (!putGrid(k, cw, 2.4)) putGrid(k, ch, 6.5); }
      else putGrid(k, ch, 6.5);
      seed[k] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // a soft dot, not a square: a point sprite is a quad, and up close a quad is a quad
    const dot = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 32, 32);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const m = new THREE.PointsMaterial({ color: 0xc9c2b4, size: 0.018, sizeAttenuation: true, transparent: true, opacity: 0.55,
                                         map: dot, alphaTest: 0.02, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    group.add(pts);
    S.motes = { pts, pos, seed, base: Float32Array.from(pos), t: 0 };
  }
  S.update = (dt) => {
    if (S.motes) {
      const M = S.motes; M.t += dt;
      const p = M.pos, b = M.base, s = M.seed, t = M.t;
      for (let k = 0; k < s.length; k++) {
        const q = s[k];
        p[k * 3] = b[k * 3] + Math.sin(t * 0.21 + q) * 0.22;
        p[k * 3 + 1] = b[k * 3 + 1] + Math.sin(t * 0.13 + q * 1.7) * 0.16 - ((t * 0.02 + q) % 1.0) * 0.4;
        p[k * 3 + 2] = b[k * 3 + 2] + Math.cos(t * 0.17 + q * 0.6) * 0.22;
      }
      M.pts.geometry.attributes.position.needsUpdate = true;
    }
    // the candles
    if (CANDLES.mat) CANDLES.mat.uniforms.uFlameT.value += dt;
    // the bulbs gutter, each on its own count
    const tt = performance.now() * 0.001;
    for (let k = 0; k < S.bulbs.length; k++) {
      const m = S.bulbs[k].material;
      const f = 0.55 + 0.45 * Math.max(0, Math.sin(tt * 7.3 + k * 1.9) * Math.sin(tt * 2.1 + k * 0.7) + 0.6);
      m.emissiveIntensity = (m.name === 'ampoule' ? 0.9 : 1.6) * f;
    }
  };
  S.clearBench = (n) => {
    const b = S.benches[n]; const w = S.church && S.church.walk;
    if (!b || !b.box || !w) return;
    const [x0, , z0, x1, , z1] = b.box;
    const i0 = Math.floor((x0 - 0.1 - w.x0) / w.cell), i1 = Math.floor((x1 + 0.1 - w.x0) / w.cell);
    const j0 = Math.floor((z0 - 0.1 - w.z0) / w.cell), j1 = Math.floor((z1 + 0.1 - w.z0) / w.cell);
    for (let j = Math.max(0, j0); j <= Math.min(w.gh - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(w.gw - 1, i1); i++) {
        w.floor[j][i] = w.floor0[j][i];
        w.solid[j][i] = 0;
      }
    }
  };
  return group;
}
