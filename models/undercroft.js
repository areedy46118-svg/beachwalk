import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* THE UNDERCROFT — the cave under the beach and the church at the bottom of
 * it. Valsev's "Cave 5.0" (`assets/cave.glb`) and Aurélien Martel's "Old
 * church modeling - Interior Scene" (`assets/church.glb`), both Sketchfab,
 * CC-BY-4.0, packed by `tools/undercroft_pack.py` with THE WALK INSIDE THEM:
 * each GLB's root carries `bw_walk` — a 0.2 m grid of floor heights and a
 * solid flag, in the model's own metres, Y up — so nothing here is a box
 * placed by hand.
 *
 * The cave is an 18 m tunnel that drops four metres end to end. Its HIGH end
 * is where you come in (the hole in the sand wall); its LOW end is put
 * against the church's end wall so the tunnel mouth IS the church's front
 * door: the church is translated at load so that its door sits a step past
 * the cave's last floor cell at the same height, and a `bridge` — a strip
 * of floor the walk answers for — spans the half metre between the ragged
 * mouth and the flat wall. The door plane is dropped by the packer and the
 * wall is CUT by a discard in its own material over the door's rectangle,
 * so you walk through the wall's picture of a doorway into the nave.
 *
 * Everything is dark, dirty and dusty by construction: every material is
 * multiplied down and desaturated, dust settles on whatever faces up (a
 * pale grey mixed in by the world normal's y, grained so it is not a wash),
 * the lift that lets it read at all comes off each map's own emissive, and
 * motes drift in the air of both rooms. The game adds the lamps (every
 * light is a shader define, and they belong in the group that is never
 * hidden); this module says where they go.
 *
 *   group.userData.undercroft:
 *     ready                    both scans in and composed
 *     floorAt(lx, lz)          the walkable floor under a local point, or null
 *     blocked(lx, lz, r, feet) a disc of radius r about the point meets something a body cannot pass
 *     pushOut(p, r, feet)      move a local Vector3 out of whatever it is in (returns true if it moved)
 *     escape(p, r, feet)       the nearest clear spot, when the push cancels
 *     spots                    { entry, exit, lamps: [...] } — local metres and a yaw
 *     benches                  [{ mesh, box }] the church's pews, each its own mesh
 *     clearBench(n)            take a broken bench out of the walk
 *     update(dt)               the motes and the bulbs
 */
export function makeUndercroft(opts = {}) {
  const group = new THREE.Group();
  const S = { group, ready: false, walks: [], bridges: [], benches: [], spots: null, mats: [], bulbs: [], motes: null,
              cave: null, church: null };
  group.userData.undercroft = S;
  const load = opts.load || ((url, cb) => new GLTFLoader().load(url, cb));

  // ---- one grid, in the frame of the model it came from, plus its offset in the group
  function parseWalk(root) {
    let raw = null;
    root.traverse((o) => { if (!raw && o.userData && o.userData.bw_walk) raw = o.userData.bw_walk; });
    if (!raw) return null;
    const w = typeof raw === 'string' ? JSON.parse(raw) : raw;
    w.solid = w.solid.map((row) => Uint8Array.from(row, (c) => (c === '1' ? 1 : 0)));
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
      const t = (lx - b.x0) / Math.max(1e-6, b.x1 - b.x0);
      return b.y0 + (b.y1 - b.y0) * t;
    }
    return null;
  }
  /* The roof over a local point — the first surface above the floor the
   * grid chose — so the game can duck the camera under a low stretch of
   * tunnel instead of drawing it through the rock. 99 where there is none. */
  S.ceilAt = (lx, lz) => {
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
    for (const w of S.walks) {
      const i = Math.floor((lx - w.off.x - w.x0) / w.cell), j = Math.floor((lz - w.off.z - w.z0) / w.cell);
      if (i < 0 || j < 0 || i >= w.gw || j >= w.gh) continue;
      const f = cellFloor(w, i, j);
      if (f === null || cellSolid(w, i, j)) return false;
      if (f - feet > (w.stepMax || STEP) || feet - f > DROP) return false;
      return true;
    }
    return false;
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
    cave:   { dust: 0.42, damp: 0.34, level: 0.62, emis: 0.20, tint: 0xb9b4a8 },
    church: { dust: 0.16, damp: 0.14, level: 0.92, emis: 0.52, tint: 0xc9c6c0 },
  };
  S.look = LOOK;
  function grime(mat, kind) {
    if (!mat || mat.userData.bwGrime) return;
    mat.userData.bwGrime = true;
    mat.userData.bwKind = kind === 'church' ? 'church' : 'cave';
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
      mat.userData.bwSh = sh;
      sh.vertexShader = 'varying vec3 vGrimeN; varying vec3 vGrimeP;\n' + sh.vertexShader
        .replace('#include <fog_vertex>', '#include <fog_vertex>\n  vGrimeN = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);\n  vGrimeP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vGrimeN; varying vec3 vGrimeP;\nuniform float uUcDust, uUcDamp, uUcLevel;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
  {
    float up = clamp(vGrimeN.y, 0.0, 1.0);
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

  // ---- the two scans
  function dress(root, kind) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = true;
      const m = o.material;
      if (!m) return;
      const name = m.name || '';
      if (kind === 'cave' && name === 'Material.002') {
        // the bulbs on the posts: the tunnel's own light, and it is failing
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
    if (!S.cave || !S.church || S.ready) return;
    const cw = S.cave.walk, ch = S.church.walk;
    if (!cw || !ch) return;
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
    for (let i = cw.gw - 1; i >= 0 && !low; i--) { const s = colStats(cw, i); if (s && s.n >= 4) low = s; }
    for (let i = 0; i < cw.gw && !high; i++) { const s = colStats(cw, i); if (s && s.n >= 4) high = s; }
    if (!low || !high) return;
    // the door, in the church's own frame
    const D = ch.door;
    const doorX = (D[0] + D[3]) / 2, doorZ = (D[2] + D[5]) / 2;
    let doorFloor = null;
    for (let k = 1; k <= 8 && doorFloor === null; k++) doorFloor = gridFloor(ch, doorX + k * 0.25, doorZ);
    if (doorFloor === null) doorFloor = D[1] + 0.3;
    const off = new THREE.Vector3(low.x + GAP - doorX, low.y - doorFloor, low.z - doorZ);
    ch.off.copy(off);
    S.church.root.position.copy(off);
    S.walks = [cw, ch];
    cw.stepMax = 0.62;                  // a cave floor is rubble: a knee-high lip is a step, not a wall
    ch.stepMax = 0.40;                  // a pew's seat is 0.45 up, and that is not a step
    S.bridges.push({ x0: low.x - 0.8, x1: low.x + GAP + 0.6, z0: low.z - 1.7, z1: low.z + 1.7, y0: low.y, y1: low.y });
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
      const W = 7.2, H = 9.0, BX = 0.72, BY = 0.45, nx = Math.round(W / BX), ny = Math.round(H / BY);
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
        sh.uniforms.uArch = { value: new THREE.Vector4(0, -3.2, 1.12, 2.25) };
        sh.uniforms.uArchS = { value: new THREE.Vector2(1.15, -1.20) };
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
      const cb = cw.bounds, hb = ch.bounds;
      bb.expandByPoint(new THREE.Vector3(cb[0][0], cb[0][1], cb[0][2])); bb.expandByPoint(new THREE.Vector3(cb[1][0], cb[1][1], cb[1][2]));
      bb.expandByPoint(new THREE.Vector3(hb[0][0] + off.x, hb[0][1] + off.y, hb[0][2] + off.z));
      bb.expandByPoint(new THREE.Vector3(hb[1][0] + off.x, hb[1][1] + off.y, hb[1][2] + off.z));
      const size = bb.getSize(new THREE.Vector3()).addScalar(6), c = bb.getCenter(new THREE.Vector3());
      const shell = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false, depthWrite: false }));
      shell.position.copy(c); shell.renderOrder = -5; shell.frustumCulled = false;
      group.add(shell);
    }
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.6), new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 }));
    plate.rotation.x = -Math.PI / 2; plate.position.set(low.x + GAP * 0.25, low.y + 0.01, low.z);
    grime(plate.material, 'cave');
    group.add(plate);
    // and a cap on the entrance end, so the hole you crawled in through is black behind you
    const cap = new THREE.Mesh(new THREE.BoxGeometry(3.0, 8.0, 8.0), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false }));
    cap.position.set(high.x - 1.6, high.y + 2.5, high.z);
    group.add(cap);
    // where things are: you arrive a metre in from the high end facing down the tunnel (+x);
    // the way out is behind the altar, at the far end of the nave
    const altarX = ch.bounds[1][0] - 3.2 + off.x;
    let altarFloor = S.floorAt(altarX, off.z) ?? (doorFloor + off.y);
    S.spots = {
      entry: { x: high.x + 2.2, y: S.floorAt(high.x + 2.2, high.z) ?? high.y, z: high.z, yaw: -Math.PI / 2 },   // two metres in: the very mouth is a crawl
      mouth: { x: low.x, y: low.y, z: low.z },
      exit: { x: altarX, y: altarFloor, z: off.z, yaw: Math.PI / 2 },
      lamps: [],
    };
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
    // dust in the air of both rooms
    makeMotes(cw, ch);
    S.ready = true;
    if (opts.onReady) opts.onReady(S);
  }

  /* THE AIR IS FULL OF IT. A few hundred points drifting slowly in each
   * room, additive and faint, sized so the retro downscale keeps them as
   * single bright pixels that come and go. It is the one thing that says
   * the air has not moved in a long time. */
  function makeMotes(cw, ch) {
    const N = 700;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    const put = (k, w) => {
      // a random cell with a floor, and a height above it
      for (let tries = 0; tries < 40; tries++) {
        const i = Math.floor(Math.random() * w.gw), j = Math.floor(Math.random() * w.gh);
        const f = cellFloor(w, i, j);
        if (f === null) continue;
        pos[k * 3] = w.off.x + w.x0 + (i + Math.random()) * w.cell;
        pos[k * 3 + 1] = f + 0.2 + Math.random() * (w === cw ? 2.6 : 6.5);
        pos[k * 3 + 2] = w.off.z + w.z0 + (j + Math.random()) * w.cell;
        return;
      }
    };
    for (let k = 0; k < N; k++) { put(k, k < N * 0.35 ? cw : ch); seed[k] = Math.random() * 100; }
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
