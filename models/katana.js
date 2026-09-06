import * as THREE from 'three';

/* THE KATANA — BUILT, NOT SCANNED.
 *
 * brandon_grey's "Gothic Katana Sword" stood here first and was dropped in
 * Sep 2026, for the same three reasons the scanned lighthouse was: it was
 * 1.81 m long (a katana is 100–105 cm, and at that length it filled the
 * frame and read as a plank), its blade was a plate of CONSTANT thickness
 * with no edge on it at all — measured: 4.3–4.7 mm right across the width,
 * so nothing on it could ever catch a highlight — and its baked map was a
 * pale wash that went grey under this moon. Every one of those is a property
 * of the file, and none of them can be fixed from outside it.
 *
 * Built, the shape is exact and the reference is Oskar Wetterbrandt's
 * Battlefield V first-person katana: a dark blade, a bright RED wrapped
 * tsuka, an iron tsuba, and a moderate sori.
 *
 * THE FRAME IS THE HAND'S. The grip sits at the origin — the fist closes on
 * (0, 0, 0) — the blade runs down -Y with the tip at `KAT_TIP`, the flat
 * faces ±Z (so the cut happens in the plane of the screen, which is the
 * whole difference between a cut and a stab) and the EDGE is on -X. Authored
 * that way, the model needs no grip slide: the sword turns about the hands
 * because the hands are where the model's origin is.
 *
 * THE SHINE IS GEOMETRY, NOT GLOSS. There is no environment map in this game
 * and metalness is a trap — a metal has no diffuse term and renders as a
 * black slab with one pinpoint on it. What makes a blade read as steel here
 * is the SHINOGI: the ridge line down each face where the flat turns toward
 * the edge. It catches the one directional light as a hard line running the
 * length of the sword, and it moves as the blade turns, which is exactly
 * what a polished edge does. The material only has to stay out of its way —
 * a bright rough dielectric with a cold emissive lift, and a narrower, much
 * smoother strip along the edge itself so the ha is the brightest thing on
 * it. Subtle, because the whole beach is.
 */

export const KAT_TIP = -0.755;          // where the point is, in the grip's frame
export const KAT_POMMEL = 0.275;        // and the butt of the tsuka: 103 cm overall

const BLADE_Y0 = -0.045;                // the habaki, just past the guard
const BLADE_Y1 = KAT_TIP;
const SORI = 0.021;                     // the curve, at its deepest
const KISSAKI = 0.062;                  // the point section, past the yokote

/* The blade's own curve. A katana is an arc, not a bent stick: the sori is
 * deepest about two thirds of the way to the tip and runs out to nothing at
 * the habaki, and the EDGE is on the outside of it. Returned as the offset
 * of the blade's centreline along X at a given height. */
function bow(t) {                        // t: 0 at the habaki, 1 at the tip
  return -SORI * Math.sin(Math.pow(t, 0.86) * Math.PI * 0.82);
}
// how wide the blade is, machi to kissaki — it narrows, and quickly at the point
function widthAt(t) {
  const w = 0.0315 - 0.0075 * t;
  const k = 1 - Math.max(0, (t - (1 - KISSAKI / (BLADE_Y0 - BLADE_Y1))) / (KISSAKI / (BLADE_Y0 - BLADE_Y1)));
  return w * (0.35 + 0.65 * Math.min(1, k + 0.55));
}
// and how thick, spine to shinogi — it thins toward the point
function thickAt(t) { return 0.0068 - 0.0026 * t; }

/* THE SECTION IS SHINOGI-ZUKURI, which is the shape that makes the light
 * work. Six points round the section: the edge itself (a real line, not a
 * face), the two shinogi ridges where the flats break, and the spine — flat
 * across the back, because a katana's mune is a roof and not a round. */
function section(t) {
  const w = widthAt(t), th = thickAt(t), c = bow(t);
  const xe = c - w * 0.5;              // the edge, on -X
  const xs = c + w * 0.5;              // the spine, on +X
  const xr = c + w * 0.5 - w * 0.30;   // where the flats break: the shinogi ridge
  return [
    [xe, 0],                            // the ha — the edge
    [xr, th * 0.5],                     // shinogi, near face
    [xs, th * 0.34],                    // the mune's near shoulder
    [xs, -th * 0.34],                   // and its far one
    [xr, -th * 0.5],                    // shinogi, far face
  ];
}

function makeBlade(mat) {
  const N = 44, M = 5;
  const pos = [], col = [], idx = [];
  /* DARK STEEL, AND THE SHINE IS A LINE AND NOT A SHEET. The first pass ran
     * the hamon up to 0xd7dee8 over a 0x7d8794 body, and a blade that pale
     * fills a night frame like a bone: the owner asked for SUBTLE. And the
     * numbers have to go much darker than they look on paper, because the
     * view-model scene carries its OWN lights — an ambient at 0.9 and two
     * directionals at 1.15 and 0.55, tuned for a skin-toned hand — so an
     * albedo that reads as gunmetal in the abstract renders as bone in the
     * hand. The body is near-black steel, the temper line lifts it a third
     * of the way up, the mune is darker still, and what you actually SEE
     * moving is the specular running along the shinogi ridge. */
    const c0 = new THREE.Color(0x2e343d), c1 = new THREE.Color(0x6a7b90), c2 = new THREE.Color(0x1b1f26);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = BLADE_Y0 + (BLADE_Y1 - BLADE_Y0) * t;
    const s = section(t);
    for (let j = 0; j < M; j++) {
      pos.push(s[j][0], y, s[j][1]);
      /* THE HAMON, IN VERTEX COLOUR. The temper line on a real blade is a
       * band of harder, brighter steel along the edge with a wandering
       * boundary; drawn as a hard stripe it looks printed on, so it is a
       * gradient that is brightest at the ha and gone by the shinogi, with
       * the boundary wobbling the way a real one does. The spine stays
       * dark: that is the soft steel, and the contrast between the two is
       * most of what says "sword" at a glance. */
      const edgeness = j === 0 ? 0.9 : (j === 1 || j === 4) ? 0.26 : 0;
      const wobble = 0.5 + 0.5 * Math.sin(t * 26 + Math.sin(t * 11) * 2);
      const c = new THREE.Color().copy(c0)
        .lerp(c1, edgeness * (0.55 + 0.45 * wobble))
        .lerp(c2, j === 2 || j === 3 ? 0.5 : 0);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j, b = i * M + (j + 1) % M;
      idx.push(a, b, a + M, b, b + M, a + M);
    }
  }
  // the point closes on itself, and the habaki end is capped flat
  const tipI = (pos.length / 3);
  pos.push(bow(1) - widthAt(1) * 0.5, BLADE_Y1, 0); col.push(0.30, 0.34, 0.40);
  for (let j = 0; j < M; j++) idx.push(N * M + j, N * M + (j + 1) % M, tipI);
  const capI = tipI + 1;
  pos.push(bow(0), BLADE_Y0, 0); col.push(0.12, 0.13, 0.16);
  for (let j = 0; j < M; j++) idx.push(capI, (j + 1) % M, j);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/* THE WRAP IS DRAWN. The ito crosses over itself in diamonds down the tsuka
 * with the same-ito showing through at each opening, and that lattice is the
 * one thing that says this is a sword's handle and not a stick painted red.
 * A canvas at 64x256, nearest-filtered like everything else here. */
function wrapTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1516'; g.fillRect(0, 0, 64, 256);           // the samegawa, under it
  g.fillStyle = '#0d0a0b';
  for (let i = 0; i < 260; i++) {                                // ray skin: pale nodes
    const x = Math.random() * 64, y = Math.random() * 256, r = 0.6 + Math.random() * 1.1;
    g.fillStyle = `rgba(196,190,184,${0.10 + Math.random() * 0.22})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // the ito itself: two opposed helices of flat braid, crossing in diamonds
  const band = (dir) => {
    for (let k = -10; k < 22; k++) {
      g.save();
      g.beginPath();
      const step = 22;
      for (let s = 0; s <= 1; s += 0.05) {
        const x = dir > 0 ? s * 64 : 64 - s * 64;
        const y = k * step + s * step;
        if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.lineWidth = 9.5;
      g.strokeStyle = '#8e1b18';
      g.stroke();
      g.lineWidth = 7.0;
      g.strokeStyle = dir > 0 ? '#b4262117' : '#00000022';
      g.stroke();
      g.restore();
    }
  };
  band(1); band(-1);
  // the braid's own grain, and a little wear on the high points
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 64, y = Math.random() * 256;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,8,8' : '214,120,104'},${0.05 + Math.random() * 0.16})`;
    g.fillRect(x, y, 1 + Math.random() * 2, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* An oval section, which is what a tsuka and a tsuba both are — never round.
 * `n` points round, `rx` across the flats, `rz` across the thickness. */
function ovalPts(n, rx, rz) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * rz));
  }
  return p;
}

export function makeKatana() {
  const g = new THREE.Group();
  g.name = 'katana';

  const steel = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true,
    metalness: 0.16, roughness: 0.28,
    emissive: new THREE.Color(0x06080c), emissiveIntensity: 1,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: 0x2b2f36, metalness: 0.18, roughness: 0.62,
    emissive: new THREE.Color(0x090b0f), flatShading: false,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0x8f7642, metalness: 0.20, roughness: 0.44,
    emissive: new THREE.Color(0x110d06),
  });
  const wrap = new THREE.MeshStandardMaterial({
    map: wrapTexture(), color: 0xffffff, metalness: 0.0, roughness: 0.82,
    emissive: new THREE.Color(0x0b0405),
  });

  g.add(makeBlade(steel));

  /* THE HABAKI — the brass collar that wedges the blade into the guard. It
   * is small and it is the only warm thing on the whole sword, which is why
   * it reads from across a room. */
  {
    const shape = new THREE.Shape(ovalPts(16, 0.0215, 0.0080));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.031, bevelEnabled: true, bevelSize: 0.0016, bevelThickness: 0.0012, bevelSegments: 1, steps: 1 }), brass);
    m.rotation.x = -Math.PI / 2;
    m.position.set(bow(0.01), -0.041, 0);
    g.add(m);
  }

  /* THE TSUBA. An oval iron plate, canted a little the way a real one sits
   * on the blade, with a rim and the blade's own slot through it. */
  {
    const shape = new THREE.Shape(ovalPts(24, 0.0385, 0.0345));
    const hole = new THREE.Path(ovalPts(12, 0.0135, 0.0052));
    shape.holes.push(hole);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.0055, bevelEnabled: true, bevelSize: 0.0022, bevelThickness: 0.0018, bevelSegments: 2, steps: 1 }), iron);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.0075, 0.00275);
    g.add(m);
  }

  /* THE TSUKA. An oval taper — thicker at the guard, narrowing at the butt —
   * wrapped, with the fuchi and kashira closing each end and a menuki under
   * the palm. */
  {
    const N = 10;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = -0.004 + t * (KAT_POMMEL - -0.004);
      const rx = 0.0182 - 0.0022 * t, rz = 0.0128 - 0.0016 * t;
      pts.push({ y, rx, rz });
    }
    const pos = [], uv = [], idx = [], M = 14;
    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      for (let j = 0; j <= M; j++) {
        const a = (j / M) * Math.PI * 2;
        pos.push(Math.cos(a) * p.rx, p.y, Math.sin(a) * p.rz);
        uv.push(j / M, i / N * 3.2);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + 1, c = a + (M + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    tg.setIndex(idx); tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, wrap));
    // fuchi and kashira: the two iron collars
    for (const [y, r, h] of [[0.002, 0.0190, 0.011], [KAT_POMMEL - 0.007, 0.0166, 0.014]]) {
      const shape = new THREE.Shape(ovalPts(16, r, r * 0.71));
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0010, bevelSegments: 1, steps: 1 }), iron);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, y, 0);
      g.add(m);
    }
    // the menuki, under the fingers
    for (const s of [1, -1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 7, 5), brass);
      m.scale.set(1.9, 2.6, 0.55);
      m.position.set(0, 0.115, s * 0.0126);
      g.add(m);
    }
  }
  return g;
}
