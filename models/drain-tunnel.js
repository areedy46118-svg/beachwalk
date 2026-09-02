import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Storm drain outfall — the concrete pipe that comes out of the dune
 *  behind you, and what somebody has made of the chamber at the end.
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
const BORE_LEN = 11.4;          // mouth → door
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

export function makeDrainTunnel() {
  const T = new THREE.Group();
  T.name = 'drainTunnel';

  const boreTex = concreteTex(128, 128, { base: '#575a5b', damp: 0.6, graffiti: true });
  boreTex.repeat.set(6, 2);
  const wallTex = concreteTex(128, 128, { base: '#4e5052', damp: 0.5 });
  wallTex.repeat.set(3, 2);
  const brick = brickTex(); brick.repeat.set(3, 1.4);

  const M = {
    bore:    new THREE.MeshStandardMaterial({ map: boreTex, color: 0x9aa0a2, roughness: 0.95, metalness: 0.02, emissive: 0x0a0d10, side: THREE.DoubleSide, flatShading: true }),
    rock:    new THREE.MeshStandardMaterial({ color: 0x6a6560, roughness: 1, metalness: 0, emissive: 0x1b1f26, flatShading: true, side: THREE.DoubleSide }),
    conc:    new THREE.MeshStandardMaterial({ map: wallTex, color: 0x8e9294, roughness: 0.98, metalness: 0.02, emissive: 0x0a0d11, flatShading: true }),
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
    cloth:   new THREE.MeshStandardMaterial({ color: 0x6d685c, roughness: 1, metalness: 0, emissive: 0x131210, flatShading: true, side: THREE.DoubleSide }),
    blanket: new THREE.MeshStandardMaterial({ color: 0x3d3a44, roughness: 1, metalness: 0, emissive: 0x0d0c10, flatShading: true }),
    glow:    new THREE.MeshBasicMaterial({ color: 0xffe4b0, fog: false }),
    seaweed: new THREE.MeshStandardMaterial({ color: 0x2b3226, roughness: 1, metalness: 0, emissive: 0x0a0d08, flatShading: true }),
    stain:   new THREE.MeshStandardMaterial({ map: rustStainTex(), transparent: true, roughness: 1, metalness: 0, emissive: 0x0b0602, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    wetsand: new THREE.MeshStandardMaterial({ color: 0x3c404b, roughness: 0.85, metalness: 0.05, emissive: 0x11141c, flatShading: true, side: THREE.DoubleSide }),
    drysand: new THREE.MeshStandardMaterial({ color: 0x53555f, roughness: 1, metalness: 0, emissive: 0x1b1e28, flatShading: true }),
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
      const ring = new THREE.Mesh(new THREE.TorusGeometry(BORE_R - 0.035, 0.055, 5, 20), M.bore);
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
    // mounted up near the springline, alternating sides down the bore
    const TH = 0.84;                       // angle from the crown
    for (let i = 0; i < 4; i++) {
      const x = 2.0 + i * 2.95, sg = i % 2 ? 1 : -1;
      const y = PIPE_CY + (BORE_R - 0.08) * Math.cos(TH);
      const z = sg * (BORE_R - 0.08) * Math.sin(TH);
      const dead = i % 2 === 1;             // half of them have gone
      const L = new THREE.Group();
      L.position.set(x, y, z);
      L.rotation.x = -sg * (Math.PI / 2 - TH);
      T.add(L);
      L.add(slab(0.2, 0.1, 0.16, M.rust, 0, 0.05, 0));                 // backplate
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6),
        dead ? M.dark : M.glow);
      lens.scale.set(1, 0.7, 1); lens.position.y = -0.03;
      L.add(lens);
      // wire guard
      for (let k = 0; k < 3; k++) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.082 - k * 0.006, 0.006, 3, 10, Math.PI), M.rust);
        hoop.rotation.set(Math.PI / 2, 0, k * 0.7);
        hoop.position.y = -0.03;
        L.add(hoop);
      }
      if (!dead) {
        const pl = new THREE.PointLight(0xffd2a0, 1.8, 9.5, 1.6);
        pl.position.set(x, y - 0.2, z * 0.86);
        T.add(pl);
        boreLights.push(pl);
      }
      // the conduit feeding it, running along the pipe
      L.add(slab(2.9, 0.03, 0.03, M.rust, 1.4, 0.08, 0));
    }
  }

  // ---- a smaller line joining the bore partway down ---------------------
  // Built *proud* of the pipe wall rather than cut into it: a recess would
  // need a hole punching in the tube, the same problem as the headwall.
  {
    const SX = 8.6, ang = 0.62;                    // where, and how far round
    const S = new THREE.Group();
    S.position.set(SX, PIPE_CY + (BORE_R - 0.12) * Math.cos(ang),
                   -(BORE_R - 0.12) * Math.sin(ang));
    S.rotation.x = Math.PI / 2 - ang;
    T.add(S);
    const surround = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.10, 5, 14), M.conc);
    surround.rotation.x = Math.PI / 2;
    S.add(surround);
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 12, 1, true), M.dark);
    mouth.position.y = 0.45;
    S.add(mouth);
    S.add(new THREE.Mesh(new THREE.CircleGeometry(0.26, 12), M.dark)
      .rotateX(Math.PI / 2).translateZ(-0.88));
    for (let i = 0; i < 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.56), M.frame);
      bar.position.set(-0.14 + i * 0.28, -0.02, 0);
      S.add(bar);
    }
    // the stain it has run down the pipe wall ever since
    const run = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.5), M.stain);
    run.position.set(SX, PIPE_CY - 0.28, -(BORE_R - 0.16));
    run.rotation.y = 0.16;
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
  }

  // ---- the outfall channel the water has cut down the beach --------------
  // Everything here has to sit just *above* y = 0: the beach sand is a flat
  // plane recentred on the player, so a trench dug below it would be covered.
  // The depth reads from the berms heaped either side instead.
  {
    const N = 26;
    const centre = (t) => ({
      x: -0.7 - t * 11.6,
      z: Math.sin(t * 3.4) * 1.0 + Math.sin(t * 8.1) * 0.28,
      w: 0.48 + t * 2.0,
    });
    // the wet bed, a shallow V so the middle catches the light differently
    const pos = [], idx = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), c = centre(t);
      pos.push(c.x, 0.014, c.z - c.w,  c.x, 0.006, c.z,  c.x, 0.014, c.z + c.w);
    }
    for (let i = 0; i < N - 1; i++) {
      const a = i * 3, b = (i + 1) * 3;
      idx.push(a, a + 1, b + 1, a, b + 1, b, a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
    }
    const bed = new THREE.BufferGeometry();
    bed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bed.setIndex(idx);
    bed.computeVertexNormals();
    T.add(new THREE.Mesh(bed, M.wetsand));

    // the thread of water still running out of it
    const wp = [], wi = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), c = centre(t), hw = c.w * (0.16 + t * 0.2);
      wp.push(c.x, 0.019, c.z - hw, c.x, 0.019, c.z + hw);
    }
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2, b = (i + 1) * 2;
      wi.push(a, a + 1, b + 1, a, b + 1, b);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.setIndex(wi);
    wg.computeVertexNormals();
    const stream = new THREE.Mesh(wg, M.water);
    T.add(stream);

    // sand heaped up along both banks — this is what sells the cut
    for (let i = 0; i < 34; i++) {
      const t = rnd(i * 2.3), c = centre(t), sg = i % 2 ? 1 : -1;
      const h = 0.10 + rnd(i * 5.7) * 0.26 * (1 - t * 0.4);
      const b = slab(0.7 + rnd(i * 3.1) * 1.3, h, 0.35 + rnd(i * 7.9) * 0.6,
        i % 3 === 0 ? M.wetsand : M.drysand,
        c.x + (rnd(i * 9.2) - 0.5) * 0.8, h / 2,
        c.z + sg * (c.w + 0.18 + rnd(i * 4.5) * 0.5),
        (rnd(i) - 0.5) * 0.2, rnd(i * 1.7) * 1.2, (rnd(i * 2.9) - 0.5) * 0.18);
      T.add(b);
    }
    // cobbles and shingle washed out and left along the channel
    for (let i = 0; i < 44; i++) {
      const t = rnd(i * 6.1), c = centre(t);
      const r = 0.05 + rnd(i * 3.7) * (0.12 + t * 0.16);
      const k = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.cobble);
      k.position.set(c.x + (rnd(i * 8.3) - 0.5) * 1.6, r * 0.45,
        c.z + (rnd(i * 4.9) - 0.5) * (c.w * 2.2));
      k.scale.y = 0.6 + rnd(i * 2.2) * 0.4;
      k.rotation.set(rnd(i) * 3, rnd(i + 3) * 3, rnd(i + 7) * 3);
      T.add(k);
    }
    // a few bigger blocks fallen off the headwall (photo B)
    for (let i = 0; i < 7; i++) {
      const s = rnd(i * 11.7);
      const r = 0.32 + s * 0.42;
      const k = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.rock);
      k.position.set(-1.4 - rnd(i * 3.3) * 4.2, r * 0.42,
        (i % 2 ? 1 : -1) * (1.9 + rnd(i * 5.5) * 2.6));
      k.scale.set(1, 0.62 + s * 0.3, 0.86);
      k.rotation.set((s - 0.5) * 0.5, s * 3, (rnd(i) - 0.5) * 0.4);
      T.add(k);
    }
    // the scour pool the outflow has dug right at the lip
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 14), M.water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-1.5, 0.018, 0);
    pool.scale.set(1, 1, 0.72);
    T.add(pool);
    // undercut sand slumped away from the foot of the concrete
    for (let i = 0; i < 9; i++) {
      const s = rnd(i * 8.8), sg = i % 2 ? 1 : -1;
      T.add(slab(0.5 + s * 0.7, 0.12 + s * 0.3, 0.5 + s * 0.8, M.wetsand,
        -0.5 - s * 0.9, 0.07 + s * 0.1, sg * (1.5 + s * 2.4),
        (s - 0.5) * 0.3, s * 2, (s - 0.5) * 0.25));
    }
  }

  // ---- seaweed and wrack piled at the mouth (photo 1) --------------------
  for (let i = 0; i < 16; i++) {
    const a = (rnd(i * 4.7) - 0.5) * 3.2;
    const w = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + rnd(i * 2.4) * 0.2, 0), M.seaweed);
    w.position.set(-0.35 - rnd(i * 5.5) * 1.3, 0.05, a);
    w.scale.set(1.6, 0.28, 1.0);
    w.rotation.y = rnd(i) * 3;
    T.add(w);
  }

  // ================= the threshold — a steel door standing open ===========
  const DOOR = new THREE.Group();
  DOOR.position.set(DOOR_X, FLOOR_Y, 0);
  T.add(DOOR);
  {
    // The bulkhead is built as four slabs *around* the opening — there is
    // deliberately no full-width slab, or it would plug the doorway.
    const OW = 1.0, OH = 2.12;   // half-width / height of the doorway
    const WW = 5.0, TH = 0.52;   // wall width / thickness
    const side = (WW - OW * 2) / 2;
    DOOR.add(slab(TH, 3.4, side, M.conc, 0.2, 1.55, OW + side / 2));
    DOOR.add(slab(TH, 3.4, side, M.conc, 0.2, 1.55, -OW - side / 2));
    DOOR.add(slab(TH, 3.4 - OH, OW * 2, M.conc, 0.2, OH + (3.4 - OH) / 2, 0));
    // floor across the threshold — the bore invert stops short of the room
    DOOR.add(slab(1.15, 0.2, 2.3, M.conc, 0.24, -0.1, 0));
    DOOR.add(slab(0.62, 0.05, OW * 2, M.steel, 0.2, 0.02, 0));      // sill plate

    // steel frame + the heavy leaf swung right back out of the way (photo 8)
    DOOR.add(slab(0.16, OH + 0.1, 0.12, M.steel, 0.02, OH / 2, OW + 0.06));
    DOOR.add(slab(0.16, OH + 0.1, 0.12, M.steel, 0.02, OH / 2, -OW - 0.06));
    DOOR.add(slab(0.16, 0.12, OW * 2 + 0.24, M.steel, 0.02, OH + 0.05, 0));
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
    // spalled concrete round the opening, and rust bled off the frame
    for (let i = 0; i < 7; i++) {
      const s = rnd(i * 6.1), sg = i % 2 ? 1 : -1;
      DOOR.add(slab(0.1, 0.12 + s * 0.2, 0.1 + s * 0.22, M.dark,
        -0.05, 0.25 + s * 1.8, sg * (OW + 0.02)));
    }
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
    R.add(slab(0.25, ROOM_H + 0.4, ROOM_HZ * 2 + 0.5, M.brickM, ROOM_X1 + 0.12, ROOM_H / 2, 0)); // back wall
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
      // render panel the frame is bolted to, set back into the brick
      F.add(slab(0.98, 0.98, 0.06, M.conc, 0, 0, -0.035));
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
      // the pipe itself: a bright lip, then a bore that goes properly dark
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 5, 16), M.conc);
      lip.position.z = -0.01;
      F.add(lip);
      // the bore recedes back into the wall and goes properly dark
      const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.62, 16, 1, true), M.dark);
      throat.rotation.x = Math.PI / 2;
      throat.position.z = -0.34;
      F.add(throat);
      F.add(new THREE.Mesh(new THREE.CircleGeometry(0.31, 16), M.dark).translateZ(-0.65));
      // three bars sagging across the mouth, proud of the bore so they read
      for (let i = 0; i < 3; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.026, FW * 2, 0.024), M.frame);
        bar.position.set(-0.2 + i * 0.2, 0, 0.015);
        bar.rotation.z = (rnd(i * 4.4) - 0.5) * 0.16;
        F.add(bar);
      }
      // the bleed running down the wall below it
      const bleed = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.65), M.stain);
      bleed.position.set(ROOM_X1 - 0.06, OY - 1.0, OZ);
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

    // a rag hung off the joists (photo 5)
    R.add(slab(0.02, 0.75, 0.5, M.cloth, ROOM_X1 - 2.6, ROOM_H - 0.6, ROOM_HZ - 0.9, 0, 0.2, 0.06));
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
  // cold spill at the mouth so the first few metres read
  const mouthLight = new THREE.PointLight(0x9fb6dc, 1.1, 7.5, 1.5);
  mouthLight.position.set(0.6, PIPE_CY, 0);
  T.add(mouthLight);

  T.userData.nav = {
    BORE_R, PIPE_CY, BORE_LEN, DOOR_X, ROOM_X0, ROOM_X1, ROOM_HZ, ROOM_H, FLOOR_Y,
    doorHalfZ: 1.0, doorH: 2.12,
  };
  T.userData.lights = { lamp, lamp2, mouthLight, tube, bore: boreLights };
  // where drips fall from — local points along the crown of the bore
  T.userData.drips = [
    [1.9, PIPE_CY + BORE_R - 0.1, 0.2], [4.1, PIPE_CY + BORE_R - 0.1, -0.3],
    [6.9, PIPE_CY + BORE_R - 0.1, 0.15], [9.4, PIPE_CY + BORE_R - 0.1, -0.2],
    [ROOM_X0 + 2.0, ROOM_H - 0.3, 1.4], [ROOM_X1 - 1.0, ROOM_H - 0.3, -1.7],
  ];
  return T;
}
