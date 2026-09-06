import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* The underground bunker — Bohdan Lvov's "Underground Bunker" (Sketchfab,
 * CC-BY-4.0), packed by `tools/bunker_pack.py` into `assets/bunker.glb` as
 * an EXACT replica of the room: no decimation, every texture at its own
 * size, the one 400-frame clip intact. A control room 5.9 m wide, 11.3 m
 * long and 3.3 m high with a steel floor, two vault doors on the +x wall,
 * a ladder up to a hatch in the roof, a bank of CRTs and consoles at the -z
 * end, lockers and a world map, safes, tape shelves, two wall AC units, a
 * table. The scan is in metres and human scale — the doors are 2.38 m,
 * the ceiling 3.29 — so the player (eye 1.70) fits it as built.
 *
 * The group is returned at once and the model lands in it later. It sits
 * with its FLOOR AT y = 0 and the room centred on the origin, so placing
 * it is `position` + `rotation.y` and nothing else. Everything the walk
 * needs comes out of the GLB itself — the pack script writes it into the
 * root node's extras, so there is no second file and no numbers copied by
 * hand — and is exposed on `group.userData.bunker`:
 *
 *   nav.room    { x0, z0, x1, z1, h }      the walls, local metres (three axes)
 *   nav.doors   [{ x0, z0, x1, z1 }]        the two vault doors, in the +x wall
 *   nav.ladder  { x0, z0, x1, z1, top }     the ladder up to the hatch
 *   nav.lamps   [{ x, y, z, area }]         where the emissive map is bright
 *   blocked(lx, lz, r)                      does a disc of radius r meet furniture
 *   update(dt)                              runs the clip
 *   openHatch() / closeHatch()              the hatch's part of it, once, and held
 *
 * The grid behind `blocked` is every triangle between knee and head height
 * rasterised onto 0.1 m cells (in Blender, at pack time), which is what makes
 * the desks, the safes and the lockers solid without a box placed for each.
 *
 * Blender's axes are x, y across the floor and z up; three's are x, z across
 * and y up, with z = -y. The nav arrives in Blender's and is converted here,
 * once.
 */
/* Take the cells a named set of meshes laid down back out of the walk grid.
 * The rows are strings, so an affected row is rebuilt; the boxes are the
 * meshes' own, measured in the ROOT's frame, which is the frame the grid is
 * in. Returns what it cleared, for the record. */
const _cvB = new THREE.Box3(), _cvM = new THREE.Matrix4(), _cvI = new THREE.Matrix4();
function carveNav(n, root, re) {
  root.updateMatrixWorld(true);
  _cvI.copy(root.matrixWorld).invert();
  const rows = new Map(), out = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !re.test(o.name || '')) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _cvM.multiplyMatrices(_cvI, o.matrixWorld);
    _cvB.copy(o.geometry.boundingBox).applyMatrix4(_cvM);
    // three's local metres to the grid's Blender axes (y = -z), a cell of margin
    const m = n.cell;
    const x0 = _cvB.min.x - m, x1 = _cvB.max.x + m;
    const y0 = -_cvB.max.z - m, y1 = -_cvB.min.z + m;
    out.push({ name: o.name, x0, x1, y0, y1 });
    const i0 = Math.max(0, Math.floor((x0 - n.x0) / m)), i1 = Math.min(n.gw - 1, Math.floor((x1 - n.x0) / m));
    const j0 = Math.max(0, Math.floor((y0 - n.y0) / m)), j1 = Math.min(n.gh - 1, Math.floor((y1 - n.y0) / m));
    for (let j = j0; j <= j1; j++) {
      let r = rows.get(j); if (!r) { r = n.grid[j].split(''); rows.set(j, r); }
      for (let i = i0; i <= i1; i++) r[i] = '0';
    }
  });
  for (const [j, r] of rows) n.grid[j] = r.join('');
  return out;
}

export function makeUndergroundBunker(opts = {}) {
  const group = new THREE.Group();
  group.name = 'undergroundBunker';
  const S = {
    ready: false, nav: null, mixer: null, ambient: null, hatch: null, lights: [], root: null,
    blocked: () => false,
    update: (dt) => { if (S.mixer) S.mixer.update(dt); },
    openHatch: () => { if (S.hatch) { if (S.hatchClose) S.hatchClose.stop(); S.hatch.reset(); S.hatch.play(); } },
    closeHatch: () => { if (S.hatchClose) { S.hatch.stop(); S.hatchClose.reset(); S.hatchClose.play(); } },
  };
  group.userData.bunker = S;

  new GLTFLoader().load(opts.url || 'assets/bunker.glb', (gltf) => {
    const root = gltf.scene;
    S.root = root;
    let raw = null;
    root.traverse((o) => { if (!raw && o.userData && o.userData.bw_nav) raw = o.userData.bw_nav; });
    if (raw) S.nav = convertNav(typeof raw === 'string' ? JSON.parse(raw) : raw);
    /* A CHAIR IS NOT A WALL. The grid is every triangle in the room between
     * knee and head height, which is exactly right for a console bank and
     * exactly wrong for the three swivel chairs: legs, a splayed base and a
     * back, all of it solid, arranged so that walking into one puts you
     * between the legs where the push-out's resultant cancels. `S.escape`
     * gets you back out — but the honest answer is that a person shoulders
     * a chair aside and does not stop for it, and the worst second in this
     * game to lose is the one in the middle of the fight. Their cells come
     * out of the grid, so you walk through them. Nothing else does. */
    /* AND THE LADDER GOES. It stands in the middle of the only clear run in
     * the room, it is the one thing you are forever walking round, and the
     * way out was never really it — the way out is the hatch above it. The
     * mesh is hidden and its cells come out of the walk grid with the
     * chairs', so that corner of the floor is simply floor. */
    root.traverse((o) => { if (o.isMesh && /^Ladder[_.]/.test(o.name || '')) o.visible = false; });
    if (S.nav) S.walkThrough = carveNav(S.nav, root, opts.walkThrough || /^(Chair\d*|Ladder)[_.]/);

    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = true;
      const m = o.material;
      if (!m) return;
      /* Four of the materials are alpha-blended and GLTFLoader turns depth
       * writes OFF for those — right for glass, wrong for the 94 lamp
       * housings, boots and cable runs that share the "LightNTransparency"
       * map and are opaque over nearly all of it. Without the depth write
       * they sorted against each other by centre and the far one drew over
       * the near one. Alpha-tested with the write back on, the glass stays
       * see-through where the map is clear and everything else is solid. */
      if (m.transparent && m.name !== 'Shadows') {
        m.depthWrite = true;
        m.alphaTest = 0.02;
      }
      if (m.name === 'Shadows') {
        // a contact-shadow decal laid a hair off the floor and walls
        m.depthWrite = false;
        m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2;
      }
      if (m.emissiveMap) {
        // the lamps and the screens are the room's own light; a touch brighter than authored
        m.emissiveIntensity = opts.emissive ?? 1.35;
      }
      m.needsUpdate = true;
    });

    /* One clip carries two things: the room's LIFE (screens flicking, panel
     * lights, reels and rotors turning, vent handles) which should run for
     * ever, and the HATCH — its cover and the two cogs of its gate — which
     * should open once, when asked. Split by target. */
    if (gltf.animations.length) {
      const clip = gltf.animations[0];
      const isHatch = (t) => /^(HatchControl|GateCOg)/.test(t.name);
      const amb = new THREE.AnimationClip(clip.name + '.ambient', clip.duration, clip.tracks.filter(t => !isHatch(t)));
      const hat = new THREE.AnimationClip(clip.name + '.hatch', clip.duration, clip.tracks.filter(isHatch));
      S.mixer = new THREE.AnimationMixer(root);
      if (amb.tracks.length) { S.ambient = S.mixer.clipAction(amb); S.ambient.play(); }
      if (hat.tracks.length) {
        /* The scan's hatch swings open over the first ten seconds and shut
         * again over the last seven; what the game wants is a hatch that
         * opens and STAYS open. The cover's turn peaks at frame 236 of 400
         * (94 degrees, found by scanning its quaternion track), so the clip
         * is cut there: the front half is `openHatch()`, the back half
         * `closeHatch()`, each played once and held. */
        const q = hat.tracks.find(t => /^HatchControl\.quaternion/.test(t.name));
        let pk = Math.round(hat.duration * 24 * 0.59);
        if (q) { let best = 0; for (let k = 0; k < q.times.length; k++) { const a = Math.acos(Math.min(1, Math.abs(q.values[k * 4 + 3]))); if (a > best) { best = a; pk = k; } } }
        const once = (c) => { const a = S.mixer.clipAction(c); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; return a; };
        S.hatch = once(THREE.AnimationUtils.subclip(hat, 'hatch.open', 0, pk, 24));
        S.hatchClose = once(THREE.AnimationUtils.subclip(hat, 'hatch.close', pk, Math.round(hat.duration * 24), 24));
        S.hatchPeak = pk;
      }
      S.clipInfo = { duration: clip.duration, ambient: amb.tracks.length, hatch: hat.tracks.length, peak: S.hatchPeak, targets: [...new Set(clip.tracks.map(t => t.name.split('.')[0]))] };
    }

    // the lamps light the room: a point light at every bright cluster of the lamp mesh
    if (S.nav && opts.lights !== false) {
      for (const L of S.nav.lamps) {
        const panel = L.y < 2.4;      // the console's light board and the siren are small and coloured
        const light = new THREE.PointLight(panel ? 0x9fb8ff : 0xfff1c8, panel ? 3 : 9, panel ? 4 : 7.5, 1.7);
        light.position.set(L.x, L.y - 0.12, L.z);
        group.add(light); S.lights.push(light);
      }
    }
    group.add(root);
    S.ready = true;
    if (opts.onLoad) opts.onLoad(S, group);
  }, undefined, (err) => console.error('bunker failed to load', err));

  /* Furniture test in local three metres: a disc of radius r about (lx, lz)
   * meets a blocked cell. Cells are looked up in Blender's axes (y = -z). */
  S.blocked = (lx, lz, r = 0.28) => {
    const n = S.nav; if (!n) return false;
    const by = -lz;
    const i0 = Math.floor((lx - r - n.x0) / n.cell), i1 = Math.floor((lx + r - n.x0) / n.cell);
    const j0 = Math.floor((by - r - n.y0) / n.cell), j1 = Math.floor((by + r - n.y0) / n.cell);
    for (let j = Math.max(0, j0); j <= Math.min(n.gh - 1, j1); j++) {
      const row = n.grid[j];
      for (let i = Math.max(0, i0); i <= Math.min(n.gw - 1, i1); i++) {
        if (row.charCodeAt(i) !== 49) continue;               // '1'
        // nearest point of the cell to the disc centre
        const cx = Math.min(Math.max(lx, n.x0 + i * n.cell), n.x0 + (i + 1) * n.cell);
        const cy = Math.min(Math.max(by, n.y0 + j * n.cell), n.y0 + (j + 1) * n.cell);
        if ((cx - lx) ** 2 + (cy - by) ** 2 < r * r) return true;
      }
    }
    return false;
  };
  /* AND THE FLOOR IS NOT ALL ONE PIECE. Flooding the free cells finds THREE
   * regions: the room, 31.6 m of it, and two pockets of about two square
   * metres each, behind furniture, that nothing his size can walk out of.
   * They are not a bug in the grid — they are real gaps between a desk and a
   * wall — but a body shoved into one is a boss who has left the fight. The
   * biggest region is worked out once, and `mainRegion` gives the nearest
   * cell in it, so there is always a way back to where the fight is. */
  S.mainRegion = (lx, lz) => {
    const n = S.nav; if (!n) return null;
    if (!S._main) {
      const W = n.gw, H = n.gh, N = W * H, cxf = (i) => n.x0 + (i + 0.5) * n.cell, cyf = (j) => n.y0 + (j + 0.5) * n.cell;
      const free = new Uint8Array(N);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!S.blocked(cxf(i), -cyf(j), 0.32)) free[j * W + i] = 1;
      const comp = new Int32Array(N).fill(-1);
      let best = -1, bestSize = -1, c = 0;
      const DI = [1, -1, 0, 0], DJ = [0, 0, 1, -1];
      for (let s0 = 0; s0 < N; s0++) {
        if (!free[s0] || comp[s0] >= 0) continue;
        const q = [s0]; comp[s0] = c; let sz = 0;
        while (q.length) {
          const cur = q.pop(); sz++;
          const i = cur % W, j = (cur / W) | 0;
          for (let k = 0; k < 4; k++) {
            const a = i + DI[k], b = j + DJ[k];
            if (a < 0 || b < 0 || a >= W || b >= H) continue;
            const id = b * W + a;
            if (free[id] && comp[id] < 0) { comp[id] = c; q.push(id); }
          }
        }
        if (sz > bestSize) { bestSize = sz; best = c; }
        c++;
      }
      S._main = { comp, id: best, W, H, cxf, cyf };
    }
    const M = S._main;
    let bd = Infinity, bx = null, bz = null;
    for (let id = 0; id < M.comp.length; id++) {
      if (M.comp[id] !== M.id) continue;
      const x = M.cxf(id % M.W), y = M.cyf((id / M.W) | 0);
      const dx = x - lx, dz = -y - lz, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bx = x; bz = -y; }
    }
    return bx === null ? null : { x: bx, z: bz, d: Math.sqrt(bd) };
  };
  /* AND A WAY ROUND, WHICH A FAN OF HEADINGS IS NOT. Steering by "the
   * nearest clear direction" is a greedy walk, and a greedy walk cannot
   * leave a pocket: between the table and the wall every heading that points
   * at the player is blocked, the nearest clear one points further in, and
   * the push-out cancels the step — so he "found a way" every frame for four
   * seconds while his position changed by two centimetres. A breadth-first
   * search over the free cells is the whole answer and the grid is 59 by 113,
   * which is nothing. `route` returns a list of waypoints in local metres,
   * thinned to the corners: anywhere reachable in this room, it finds the way
   * there, and if it returns null there is genuinely no way.
   *
   * Free is tested at the disc's own radius, so a route is one a BODY fits
   * through, not a line a point could follow. */
  S.route = (fx, fz, tx, tz, r = 0.32) => {
    const n = S.nav; if (!n) return null;
    const ci = (x) => Math.floor((x - n.x0) / n.cell);
    const cj = (y) => Math.floor((y - n.y0) / n.cell);
    const cx = (i) => n.x0 + (i + 0.5) * n.cell;
    const cy = (j) => n.y0 + (j + 0.5) * n.cell;
    const free = (i, j) => i >= 0 && j >= 0 && i < n.gw && j < n.gh && !S.blocked(cx(i), -cy(j), r);
    const si = ci(fx), sj = cj(-fz), gi = ci(tx), gj = cj(-tz);
    if (si === gi && sj === gj) return [];
    const W = n.gw, N = W * n.gh;
    const prev = new Int32Array(N).fill(-1);
    const seen = new Uint8Array(N);
    // the goal may be inside something (you, standing against a desk); walk
    // out from it to the nearest cell a body fits in
    let goal = -1;
    for (let rad = 0; rad <= 26 && goal < 0; rad++)
      for (let dj = -rad; dj <= rad && goal < 0; dj++)
        for (let di = -rad; di <= rad && goal < 0; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
          if (free(gi + di, gj + dj)) goal = (gj + dj) * W + (gi + di);
        }
    if (goal < 0) return null;
    const q = new Int32Array(N); let head = 0, tail = 0;
    // and so may he be, so the search starts from wherever he can stand
    let start = -1;
    for (let rad = 0; rad <= 26 && start < 0; rad++)
      for (let dj = -rad; dj <= rad && start < 0; dj++)
        for (let di = -rad; di <= rad && start < 0; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
          if (free(si + di, sj + dj)) start = (sj + dj) * W + (si + di);
        }
    if (start < 0) return null;
    q[tail++] = start; seen[start] = 1;
    while (head < tail) {
      const cur = q[head++];
      if (cur === goal) break;
      const i = cur % W, j = (cur / W) | 0;
      for (let k = 0; k < 8; k++) {
        const di = (k < 4 ? [1, -1, 0, 0][k] : [1, 1, -1, -1][k - 4]);
        const dj = (k < 4 ? [0, 0, 1, -1][k] : [1, -1, 1, -1][k - 4]);
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= W || b >= n.gh) continue;
        const id = b * W + a;
        if (seen[id] || !free(a, b)) continue;
        // a diagonal may not cut a corner a body would not fit through
        if (k >= 4 && (!free(i + di, j) || !free(i, j + dj))) continue;
        seen[id] = 1; prev[id] = cur; q[tail++] = id;
      }
    }
    /* AND IF THERE IS NO WAY ALL THE WAY, THERE IS STILL A WAY CLOSER. A
     * player can stand in a nook a bigger body does not fit into, and the
     * honest answer there is not "no route" — which drops him back on the
     * greedy fan that got him stuck — but the reachable cell NEAREST to
     * where you are. He comes as far as the room lets him and waits at the
     * mouth of it, which is what a man does. The search has already visited
     * every cell he can reach, so this costs one pass over what it found. */
    let end = goal;
    if (!seen[goal]) {
      const gx = cx(goal % W), gy = cy((goal / W) | 0);
      let bestD = Infinity; end = -1;
      for (let id = 0; id < N; id++) {
        if (!seen[id]) continue;
        const dx = cx(id % W) - gx, dy = cy((id / W) | 0) - gy;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; end = id; }
      }
      if (end < 0) return null;
    }
    const cells = [];
    for (let c = end; c !== -1 && c !== start; c = prev[c]) cells.push(c);
    cells.reverse();
    // thin it to the corners: a straight run needs one waypoint, not forty
    const out = []; let lastDx = 99, lastDz = 99, pi = start % W, pj = (start / W) | 0;
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k] % W, j = (cells[k] / W) | 0;
      const dx = Math.sign(i - pi), dz = Math.sign(j - pj);
      if (dx !== lastDx || dz !== lastDz) { out.push({ x: cx(i), z: -cy(j) }); lastDx = dx; lastDz = dz; }
      pi = i; pj = j;
    }
    const gI = end % W, gJ = (end / W) | 0;
    out.push({ x: cx(gI), z: -cy(gJ) });
    return out;
  };
  /* Push a disc out of the blocked cells it overlaps. Each round, every
   * blocked cell inside the disc pushes it along the line from the cell's
   * nearest point by the depth of the overlap; a few rounds settle a corner.
   * `p` is a Vector3 in local three metres and is moved in place. */
  S.pushOut = (p, r = 0.28, rounds = 4) => {
    /* THE PUSH IS THE RESULTANT, NOT THE NEAREST FACE. The grid is square
     * cells, so a round bin is a small square and its face is flat: walk
     * straight at it and the nearest-point push is exactly against your
     * motion — you stop dead against a bin a step wide, which is the owner's
     * "stuck by the trash can". Summing the push from EVERY overlapping cell
     * makes a small object shove you toward whichever side of it you are
     * already on (its cells fan out round you), while a long desk front,
     * whose cells all push the same way, still behaves as a wall. */
    const n = S.nav; if (!n) return false;
    let moved = false;
    for (let it = 0; it < rounds; it++) {
      let sx = 0, sz = 0, deepest = 0, any = false;
      const by = -p.z;
      const i0 = Math.floor((p.x - r - n.x0) / n.cell), i1 = Math.floor((p.x + r - n.x0) / n.cell);
      const j0 = Math.floor((by - r - n.y0) / n.cell), j1 = Math.floor((by + r - n.y0) / n.cell);
      for (let j = Math.max(0, j0); j <= Math.min(n.gh - 1, j1); j++) {
        const row = n.grid[j];
        for (let i = Math.max(0, i0); i <= Math.min(n.gw - 1, i1); i++) {
          if (row.charCodeAt(i) !== 49) continue;
          const cx0 = n.x0 + i * n.cell, cy0 = n.y0 + j * n.cell;
          const cx = Math.min(Math.max(p.x, cx0), cx0 + n.cell);
          const cy = Math.min(Math.max(by, cy0), cy0 + n.cell);
          let dx = p.x - cx, dy = by - cy;
          let d = Math.hypot(dx, dy);
          if (d >= r) continue;
          if (d < 1e-4) {                           // centre inside the cell: out by the cell's centre
            dx = p.x - (cx0 + n.cell / 2); dy = by - (cy0 + n.cell / 2); d = Math.hypot(dx, dy) || 1e-3;
            dx /= d; dy /= d; d = 0;
          } else { dx /= d; dy /= d; }
          const pen = r - d;
          sx += dx * pen; sz += dy * pen;
          if (pen > deepest) deepest = pen;
          any = true;
        }
      }
      if (!any) break;
      const L = Math.hypot(sx, sz);
      if (L < 1e-6) break;
      p.x += (sx / L) * (deepest + 0.002);
      p.z -= (sz / L) * (deepest + 0.002);          // grid y is -z in three
      moved = true;
    }
    return moved;
  };
  /* THE NEAREST WAY OUT. `pushOut` sums the push from every overlapping
   * cell, and inside something that surrounds you — between a chair's legs,
   * in the well of a desk — those pushes CANCEL: the resultant is zero, the
   * body does not move, and you are stuck for as long as you hold the key.
   * This is the answer to that case and to every other one: rings of
   * candidate spots at widening radius, the nearest clear one wins. It is
   * the last word, so nothing in this room can hold anything for ever. */
  S.escape = (p, r = 0.28, maxR = 2.4) => {
    const n = S.nav; if (!n || !S.blocked(p.x, p.z, r)) return true;
    for (let rad = n.cell; rad <= maxR; rad += n.cell) {
      let best = null, bd = Infinity;
      const steps = Math.max(8, Math.round((2 * Math.PI * rad) / (n.cell * 0.9)));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = p.x + Math.cos(a) * rad, z = p.z + Math.sin(a) * rad;
        if (x < n.room.x0 + r || x > n.room.x1 - r || z < n.room.z0 + r || z > n.room.z1 - r) continue;
        if (S.blocked(x, z, r)) continue;
        const d = (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z);
        if (d < bd) { bd = d; best = [x, z]; }
      }
      if (best) { p.x = best[0]; p.z = best[1]; return true; }
    }
    return false;
  };
  /* Is the way ahead clear — a disc of radius r walked `dist` metres along
   * (dx, dz) from (lx, lz), in local three metres. What a creature needs to
   * know before it sets off into a desk. */
  S.clearAhead = (lx, lz, dx, dz, dist, r = 0.34) => {
    const n = S.nav; if (!n) return true;
    const L = Math.hypot(dx, dz) || 1;
    const ux = dx / L, uz = dz / L;
    const steps = Math.max(2, Math.ceil(dist / (n.cell * 0.8)));
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * dist;
      if (S.blocked(lx + ux * t, lz + uz * t, r)) return false;
    }
    return true;
  };
  return group;
}

// Blender (x, y floor, z up) → three (x, y up, z = -y)
function convertNav(b) {
  const box = (a) => ({ x0: a[0], z0: -a[4], x1: a[3], z1: -a[1], y0: a[2], y1: a[5] });
  return {
    cell: b.cell, gw: b.gw, gh: b.gh, x0: b.x0, y0: b.y0, grid: b.grid, band: b.band,
    room: { x0: b.room.x0, z0: -b.room.y1, x1: b.room.x1, z1: -b.room.y0, h: b.room.z1 },
    doors: b.doors.map(box),
    ladder: b.ladder ? { ...box(b.ladder), top: b.ladder[5] } : null,
    lamps: b.lamps.map(l => ({ x: l[0], y: l[2], z: -l[1], area: l[3] })),
  };
}
