import * as THREE from 'three';

/* The Bell Pavilion — La Jolla's "mushroom house" — built to the
 * photographs. A round concrete room on a single column at the foot of the
 * cliff; the underside of the room a deep flaring dish of radial ribs; a
 * band of wood-framed windows all the way round, each bay a tall pane over
 * a short one, under a low roof with a deeply ribbed ceiling; below it a
 * bunker of curved concrete walls on a raised platform, an iron gate hanging
 * open in the seaward wall, steps down to the sand; inside the column a
 * spiral stair of pale wedge treads cantilevered from the wall, winding up
 * round an open well with a slim rail, into the room. Inside: a curved
 * bench under the seaward windows, a round table and its tulip chairs, one
 * on its side, a dead pendant lamp. Abandoned: panes gone and broken, glass
 * on the floor, the concrete streaked and tagged.
 *
 * Local frame: the column's axis is the origin, +Y up, the SEA is -X and
 * the cliff is +X; nothing is rotated, so the colliders it hands back are
 * axis-aligned once offset. Angles are three's cylinder convention,
 * atan2(x, z), the one the game measures the player in. The stair goes UP
 * as the angle DECREASES — the lighthouse's convention.
 *
 * `MUSH` carries everything the walk needs; models/ builds, main.js walks. */

export const MUSH = {
  COL_R: 2.1, BORE: 1.8, H_ROOM: 5.2, ROOM_H: 2.6, R_ROOM: 5.6, SILL: 0.75,
  DOOR_ANG: -Math.PI / 2, DOOR_HALF: 0.32, DOOR_H: 2.1,
  TURNS: 1.5, TREADS: 20, PLAT_TOP: 0.4, WALL_R: 5.1, PLAT_R: 5.6,
};
MUSH.RISE = (MUSH.H_ROOM - MUSH.PLAT_TOP) / MUSH.TURNS;   // per full turn, from the platform to the floor
MUSH.STEP = MUSH.RISE / MUSH.TREADS;
MUSH.A0 = MUSH.DOOR_ANG - 0.6;
MUSH.TOP_ANG = MUSH.A0 - MUSH.TURNS * Math.PI * 2;
MUSH.DISH_Y0 = MUSH.H_ROOM - 2.1;                 // where the column ends and the dish begins

// ------------------------------------------------------------ textures
function concreteTexture(seed, tags) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  g.fillStyle = '#8a8f96'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const v = 110 + rnd() * 60; g.fillStyle = `rgba(${v},${v + 3},${v + 8},${0.05 + rnd() * 0.1})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 5, 1 + rnd() * 5); }
  g.strokeStyle = 'rgba(50,54,60,0.4)'; g.lineWidth = 1;
  for (let y = 0; y < 256; y += 42) { g.beginPath(); g.moveTo(0, y + rnd() * 2); g.lineTo(256, y + rnd() * 2); g.stroke(); }
  for (let i = 0; i < 30; i++) { const x = rnd() * 256, len = 40 + rnd() * 180; const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(36,40,46,0.4)'); gr.addColorStop(1, 'rgba(36,40,46,0)'); g.fillStyle = gr; g.fillRect(x, rnd() * 30, 1 + rnd() * 2, len); }
  g.fillStyle = 'rgba(28,30,34,0.85)';
  for (let y = 36; y < 256; y += 84) for (let x = 20; x < 256; x += 56) { g.beginPath(); g.arc(x + rnd() * 6, y + rnd() * 6, 2.2, 0, 7); g.fill(); }
  if (tags) {
    const cols = ['#b83a3a', '#3b5fc0', '#cdb52a', '#2a2a2a', '#c8c8c8'];
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = cols[k % cols.length]; g.globalAlpha = 0.5; g.lineWidth = 4 + rnd() * 5; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); let x = 20 + rnd() * 140, y = 50 + rnd() * 140; g.moveTo(x, y);
      for (let i = 0; i < 6; i++) { x += (rnd() - 0.35) * 55; y += (rnd() - 0.5) * 45; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const img = g.getImageData(0, 0, 256, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(d[i] / 20) * 20; d[i + 1] = Math.round(d[i + 1] / 20) * 20; d[i + 2] = Math.round(d[i + 2] / 20) * 20; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeMushroomHouse() {
  const M = MUSH;
  const g = new THREE.Group();
  const colliders = [];
  const TAU = Math.PI * 2;

  // the game's palette is cold; the concrete is grey-blue and lifted off its
  // own map, the way every scan on the beach is, so the moon is not the only
  // thing carrying it. Flat shading, like everything built here.
  const concTex = concreteTexture(7, false), tagTex = concreteTexture(19, true);
  const conc = new THREE.MeshStandardMaterial({ map: concTex, color: 0x98a2b2, roughness: 1, metalness: 0, flatShading: true, emissive: 0x333b4a, emissiveMap: concTex, side: THREE.DoubleSide });
  const concTag = conc.clone(); concTag.map = tagTex; concTag.emissiveMap = tagTex;
  const pale = conc.clone(); pale.color.setHex(0xbcc2ce); pale.emissive.setHex(0x4c5566);   // lit enough to read in the well   // the stair, the ribs: the pale poured work in the photographs
  const wood = new THREE.MeshStandardMaterial({ color: 0x4e3323, roughness: 0.9, metalness: 0, flatShading: true, emissive: 0x170d07 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8fb0c8, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false, emissive: 0x16202e });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3f352d, roughness: 0.95, metalness: 0.1, flatShading: true, emissive: 0x100b07 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 1, metalness: 0, emissive: 0x040507 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.9, metalness: 0, flatShading: true, emissive: 0x2c2a26 });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const arcBand = (r, y0, y1, a0, a1, mat, n) => mesh(new THREE.CylinderGeometry(r, r, y1 - y0, n || Math.max(6, Math.round((a1 - a0) * 12)), 1, true, a0, a1 - a0), mat, 0, (y0 + y1) / 2, 0);
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // ---------------------------------------------------------- platform and steps
  mesh(new THREE.CylinderGeometry(M.PLAT_R, M.PLAT_R + 0.35, M.PLAT_TOP, 48), conc, 0, M.PLAT_TOP / 2, 0);
  colliders.push({ x: 0, z: 0, r: M.PLAT_R, top: M.PLAT_TOP, mat: 'rock' });
  for (const [dx, top] of [[-M.PLAT_R - 0.5, 0.27], [-M.PLAT_R - 1.1, 0.13]]) {
    mesh(new THREE.BoxGeometry(0.62, top, 2.6), conc, dx, top / 2, 0);
    colliders.push({ x0: dx - 0.31, x1: dx + 0.31, z0: -1.3, z1: 1.3, top, mat: 'rock' });
  }

  // ---------------------------------------------------------- the bunker wall
  const WALL_H = 2.3, WALL_T = 0.4, wallTop = M.PLAT_TOP + WALL_H;
  const arc0 = M.DOOR_ANG - 1.9, arc1 = M.DOOR_ANG + 1.9, gateHalf = 0.14;
  const wallArc = (a0, a1, mat) => {
    const ro = M.WALL_R + WALL_T / 2, ri = M.WALL_R - WALL_T / 2, n = Math.max(6, Math.round((a1 - a0) * 12));
    arcBand(ro, M.PLAT_TOP, wallTop, a0, a1, mat, n); arcBand(ri, M.PLAT_TOP, wallTop, a0, a1, mat, n);
    mesh(new THREE.RingGeometry(ri, ro, n, 1, a0, a1 - a0).rotateX(-Math.PI / 2), mat, 0, wallTop, 0);
    for (const a of [a0, a1]) { const e = mesh(new THREE.BoxGeometry(WALL_T, WALL_H, 0.04), mat, Math.sin(a) * M.WALL_R, M.PLAT_TOP + WALL_H / 2, Math.cos(a) * M.WALL_R); e.rotation.y = a; }
  };
  wallArc(arc0, M.DOOR_ANG - gateHalf, concTag);
  wallArc(M.DOOR_ANG + gateHalf, arc1, conc);
  for (let i = 0; i < 26; i++) {
    const a = arc0 + (i + 0.5) * (arc1 - arc0) / 26;
    if (Math.abs(a - M.DOOR_ANG) < gateHalf + 0.05) continue;
    colliders.push({ x: Math.sin(a) * M.WALL_R, z: Math.cos(a) * M.WALL_R, r: 0.45, top: wallTop, mat: 'rock' });
  }
  /* THE BACK IS A RETAINING WALL. The cliff is cut away inside the
   * footprint so the bluff does not run through the yard and the column,
   * and a cut through a one-sided bluff is a window onto the void behind it
   * — you could see the beach a kilometre off through the sand wall. So
   * the whole landward half is closed by a tall concrete retaining wall,
   * higher than the bluff, and the cut edge is behind it. */
  {
    const RET_R = M.PLAT_R + 0.15, RET_TOP = 4.55, r0 = arc1, r1 = arc0 + TAU;
    const n = 30;
    arcBand(RET_R + 0.2, M.PLAT_TOP - 0.3, RET_TOP, r0, r1, conc, n); arcBand(RET_R - 0.2, M.PLAT_TOP - 0.3, RET_TOP, r0, r1, conc, n);
    mesh(new THREE.RingGeometry(RET_R - 0.2, RET_R + 0.2, n, 1, r0, r1 - r0).rotateX(-Math.PI / 2), conc, 0, RET_TOP, 0);
    for (let i = 0; i < 34; i++) { const a = r0 + (i + 0.5) * (r1 - r0) / 34; colliders.push({ x: Math.sin(a) * RET_R, z: Math.cos(a) * RET_R, r: 0.5, top: RET_TOP, mat: 'rock' }); }
    // and it steps down to meet the bunker wall at each end
    for (const a of [arc0, arc1]) {
      const m = mesh(new THREE.BoxGeometry(RET_R - M.WALL_R + 0.6, RET_TOP - M.PLAT_TOP, WALL_T), conc, Math.sin(a) * (M.WALL_R + RET_R) / 2, (M.PLAT_TOP + RET_TOP) / 2, Math.cos(a) * (M.WALL_R + RET_R) / 2);
      m.rotation.y = a;
      colliders.push({ x: Math.sin(a) * (M.WALL_R + RET_R) / 2, z: Math.cos(a) * (M.WALL_R + RET_R) / 2, r: 0.5, top: RET_TOP, mat: 'rock' });
    }
  }
  // the gate: bars in a frame, hanging a third open on one post
  {
    const w = 1.35, h = 2.0, gate = new THREE.Group();
    for (let i = 0; i <= 8; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, h, 0.035), iron); b.position.set(0, h / 2, i * (w / 8)); gate.add(b); }
    for (const y of [0.12, h / 2, h - 0.12]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, w), iron); b.position.set(0, y, w / 2); gate.add(b); }
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP, Math.cos(M.DOOR_ANG) * M.WALL_R - w / 2 - 0.1);
    pivot.rotation.y = 1.05; pivot.add(gate); g.add(pivot);
    for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, WALL_H + 0.25, 0.5), conc, Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP + WALL_H / 2 + 0.12, Math.cos(M.DOOR_ANG) * M.WALL_R + sz * (w / 2 + 0.35));
  }

  // ---------------------------------------------------------- the column
  const lowerH = M.DOOR_H + 0.15, colTop = M.DISH_Y0, upperH = colTop - (M.PLAT_TOP + lowerH);
  const gapStart = M.DOOR_ANG + M.DOOR_HALF, gapLen = TAU - M.DOOR_HALF * 2;
  for (const r of [M.COL_R, M.BORE]) {
    mesh(new THREE.CylinderGeometry(r, r, lowerH, 40, 1, true, gapStart, gapLen), conc, 0, M.PLAT_TOP + lowerH / 2, 0);
    mesh(new THREE.CylinderGeometry(r, r, upperH, 40, 1, true), conc, 0, M.PLAT_TOP + lowerH + upperH / 2, 0);
  }
  mesh(new THREE.RingGeometry(M.BORE, M.COL_R, 40).rotateX(-Math.PI / 2), conc, 0, colTop, 0);   // the wall's top, under the dish
  for (const sg of [-1, 1]) {
    const a = M.DOOR_ANG + sg * M.DOOR_HALF, rm = (M.COL_R + M.BORE) / 2;
    const j = mesh(new THREE.BoxGeometry(M.COL_R - M.BORE + 0.02, M.DOOR_H, 0.14), conc, Math.sin(a) * rm, M.PLAT_TOP + M.DOOR_H / 2, Math.cos(a) * rm);
    j.rotation.y = a;
  }
  { const rm = (M.COL_R + M.BORE) / 2; const head = mesh(new THREE.BoxGeometry(M.COL_R - M.BORE + 0.02, 0.2, M.COL_R * M.DOOR_HALF * 2 + 0.24), conc, Math.sin(M.DOOR_ANG) * rm, M.PLAT_TOP + M.DOOR_H + 0.08, Math.cos(M.DOOR_ANG) * rm); head.rotation.y = M.DOOR_ANG; }
  mesh(new THREE.CircleGeometry(M.BORE, 40).rotateX(-Math.PI / 2), dark, 0, M.PLAT_TOP + 0.01, 0);

  // ---------------------------------------------------------- the cap: one solid piece
  // floor top from the well out to the rim, down the fascia, and back in
  // under the dish to the column: one lathe, so there is no seam and no gap
  const RIM = M.R_ROOM + 0.25, dishY1 = M.H_ROOM - 0.35;
  const dishPt = (t) => new THREE.Vector2(M.COL_R + (RIM - M.COL_R) * t, M.DISH_Y0 + (dishY1 - M.DISH_Y0) * Math.pow(t, 0.55));
  {
    const pts = [new THREE.Vector2(M.BORE, M.H_ROOM), new THREE.Vector2(RIM, M.H_ROOM), new THREE.Vector2(RIM, dishY1)];
    for (let i = 10; i >= 0; i--) pts.push(dishPt(i / 10));
    mesh(new THREE.LatheGeometry(pts, 56), conc);
  }
  // the well's lip, and the ribs under the dish: 24 of them, deep at the
  // column and thinning to the rim, each following the curve in pieces
  mesh(new THREE.CylinderGeometry(M.BORE, M.BORE, M.H_ROOM - dishY1 + 0.02, 40, 1, true), conc, 0, (M.H_ROOM + dishY1) / 2, 0);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU;
    for (let k = 0; k < 7; k++) {
      const t0 = k / 7, t1 = (k + 1) / 7, p0 = dishPt(t0), p1 = dishPt(t1);
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y), depth = 0.55 * (1 - 0.78 * (t0 + t1) / 2);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(len + 0.03, depth, 0.13), pale);
      const rm = (p0.x + p1.x) / 2, ym = (p0.y + p1.y) / 2 - depth / 2 + 0.02;
      rib.position.set(Math.sin(a) * rm, ym, Math.cos(a) * rm);
      rib.rotation.y = Math.PI / 2 - a;
      rib.rotateZ(Math.atan2(p1.y - p0.y, p1.x - p0.x));
      g.add(rib);
    }
  }

  // ---------------------------------------------------------- the room
  const winY = M.H_ROOM + M.SILL, roofY = M.H_ROOM + M.ROOM_H, WIN_H = roofY - winY;
  // sill wall, inside and out, and its cap
  arcBand(M.R_ROOM, M.H_ROOM, winY, 0, TAU, conc, 56); arcBand(M.R_ROOM - 0.18, M.H_ROOM, winY, 0, TAU, conc, 56);
  mesh(new THREE.RingGeometry(M.R_ROOM - 0.18, M.R_ROOM, 56).rotateX(-Math.PI / 2), wood, 0, winY, 0);
  // the windows: bays round the circle, each a tall pane over a short one,
  // the glass CURVED to the drum, the rails curved with it, the mullions
  // posts at the joints. Abandoned: two in five gone, one in five broken.
  const BAYS = 22, RG = M.R_ROOM - 0.06, split = winY + WIN_H * 0.3;
  const shardAt = [];
  for (const y of [winY + 0.05, split, roofY - 0.05]) arcBand(RG + 0.03, y - 0.05, y + 0.05, 0, TAU, wood, 56);
  for (let i = 0; i < BAYS; i++) {
    const a0 = i / BAYS * TAU, a1 = (i + 1) / BAYS * TAU;
    const post = mesh(new THREE.BoxGeometry(0.16, WIN_H, 0.16), wood, Math.sin(a0) * RG, winY + WIN_H / 2, Math.cos(a0) * RG);
    post.rotation.y = a0;
    const pad = 0.09 / RG;
    for (const [y0, y1] of [[winY + 0.1, split - 0.05], [split + 0.05, roofY - 0.1]]) {
      const state = rnd();
      if (state < 0.38) { shardAt.push((a0 + a1) / 2); continue; }                    // gone
      let ya = y0, yb = y1;
      if (state < 0.55) { yb = y0 + (y1 - y0) * (0.35 + rnd() * 0.3); shardAt.push((a0 + a1) / 2); }   // broken off short
      arcBand(RG, ya, yb, a0 + pad, a1 - pad, glass, 6);
    }
  }
  for (const am of shardAt) for (let k = 0; k < 4; k++) {
    const r = M.R_ROOM - 0.5 - rnd() * 1.4, a = am + (rnd() - 0.5) * 0.22;
    const sh = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.1 + rnd() * 0.16, 0, 0.02, 0.03, 0, 0.1 + rnd() * 0.13], 3)), glass);
    sh.geometry.computeVertexNormals(); sh.position.set(Math.sin(a) * r, M.H_ROOM + 0.005, Math.cos(a) * r); sh.rotation.y = rnd() * TAU; g.add(sh);
  }
  // the roof: fascia, a low dome, and the ceiling with its deep ribs
  arcBand(M.R_ROOM + 0.3, roofY - 0.02, roofY + 0.32, 0, TAU, conc, 56);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(M.R_ROOM + 0.3, roofY + 0.32), new THREE.Vector2(4.2, roofY + 0.5), new THREE.Vector2(2.0, roofY + 0.62), new THREE.Vector2(0, roofY + 0.7)], 56), conc);
  mesh(new THREE.CircleGeometry(M.R_ROOM, 56).rotateX(Math.PI / 2), conc, 0, roofY, 0);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, len = M.R_ROOM - 0.25;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.14), pale);
    const pos = rib.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); const s = 1 - 0.55 * ((x + len / 2) / len); pos.setY(k, pos.getY(k) * s); }
    rib.geometry.translate(len / 2, 0, 0);
    rib.position.set(0, roofY - 0.17, 0); rib.rotation.y = Math.PI / 2 - a;
    g.add(rib);
  }
  // what was left in it: a curved bench under the seaward windows, the
  // round table and its chairs (one on its side), the pendant lamp
  {
    const b0 = M.DOOR_ANG - 1.25, b1 = M.DOOR_ANG + 0.15, seatY = M.H_ROOM + 0.42;
    mesh(new THREE.RingGeometry(M.R_ROOM - 0.85, M.R_ROOM - 0.2, 18, 1, b0, b1 - b0).rotateX(-Math.PI / 2), cream, 0, seatY, 0);
    arcBand(M.R_ROOM - 0.85, M.H_ROOM, seatY, b0, b1, cream, 18);
    mesh(new THREE.RingGeometry(M.R_ROOM - 0.85, M.R_ROOM - 0.2, 18, 1, b0, b1 - b0).rotateX(Math.PI / 2), cream, 0, M.H_ROOM + 0.01, 0);
    // a cushion or two still on it
    const c1 = mesh(new THREE.BoxGeometry(0.6, 0.12, 0.5), dark, Math.sin(b0 + 0.4) * (M.R_ROOM - 0.52), seatY + 0.06, Math.cos(b0 + 0.4) * (M.R_ROOM - 0.52)); c1.rotation.y = b0 + 0.4;
    // the table: a pedestal and a round top, over by the far windows
    const tx = 2.6, tz = 1.4;
    mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 20), cream, tx, M.H_ROOM + 0.74, tz);
    mesh(new THREE.CylinderGeometry(0.07, 0.24, 0.72, 12), cream, tx, M.H_ROOM + 0.36, tz);
    const chair = (x, z, yaw, over) => {
      const c = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 0.42, 12), cream); base.position.y = 0.21; c.add(base);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.08, 14), cream); seat.position.y = 0.46; c.add(seat);
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.42, 14, 1, true, Math.PI * 0.62, Math.PI * 0.76), cream); back.position.y = 0.7; c.add(back);
      c.position.set(x, M.H_ROOM, z); c.rotation.y = yaw;
      if (over) { c.rotation.z = Math.PI / 2 - 0.15; c.position.y = M.H_ROOM + 0.27; }
      g.add(c);
    };
    chair(tx + 0.85, tz - 0.3, 0.6, false); chair(tx - 0.3, tz + 0.95, 2.3, false); chair(tx - 1.3, tz - 0.5, 1.0, true);
    mesh(new THREE.ConeGeometry(0.3, 0.34, 14, 1, true), dark, tx, roofY - 0.95, tz);
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.75, 6), dark, tx, roofY - 0.5, tz);
  }

  // ---------------------------------------------------------- the stair
  // pale wedge treads cantilevered from the column wall, winding up round an
  // open well; a slim rail on the well side on thin balusters
  const N = Math.round(M.TURNS * M.TREADS), stepA = TAU / M.TREADS;
  const tIn = 0.62, tOut = M.BORE - 0.02, half = stepA * 0.5 + 0.012;
  const treadShape = new THREE.Shape();
  treadShape.moveTo(Math.cos(-half) * tIn, Math.sin(-half) * tIn);
  treadShape.lineTo(Math.cos(-half) * tOut, Math.sin(-half) * tOut);
  for (let k = 1; k <= 6; k++) { const a = -half + (2 * half) * k / 6; treadShape.lineTo(Math.cos(a) * tOut, Math.sin(a) * tOut); }
  treadShape.lineTo(Math.cos(half) * tIn, Math.sin(half) * tIn);
  treadShape.closePath();
  const treadGeo = new THREE.ExtrudeGeometry(treadShape, { depth: 0.09, bevelEnabled: false });
  treadGeo.rotateX(Math.PI / 2);       // the shape was in XY; lay it flat, extruded downward
  const railPts = [];
  for (let i = 0; i <= N; i++) {
    const a = M.A0 - i * stepA, y = M.PLAT_TOP + i * M.STEP;
    // the shape's +X is the tread's centreline; three's angle a maps +X to (sin a, 0, cos a)
    const tr = new THREE.Mesh(treadGeo, pale);
    tr.position.set(0, y, 0); tr.rotation.y = Math.PI / 2 - a;
    g.add(tr);
    if (i % 2 === 0) { const b = mesh(new THREE.BoxGeometry(0.028, 0.92, 0.028), iron, Math.sin(a) * (tIn + 0.05), y + 0.46, Math.cos(a) * (tIn + 0.05)); b.rotation.y = a; }
    railPts.push(new THREE.Vector3(Math.sin(a) * (tIn + 0.05), y + 0.92, Math.cos(a) * (tIn + 0.05)));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), N * 4, 0.024, 6), iron);
  // the rail round the well in the room, open where the stair arrives
  {
    const pts = [], a0 = M.TOP_ANG + 0.5, a1 = M.TOP_ANG + TAU - 0.5;
    for (let i = 0; i <= 44; i++) { const a = a0 + (a1 - a0) * i / 44; pts.push(new THREE.Vector3(Math.sin(a) * (M.BORE + 0.12), M.H_ROOM + 0.95, Math.cos(a) * (M.BORE + 0.12))); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 66, 0.024, 6), iron);
    for (let i = 0; i <= 11; i++) { const a = a0 + (a1 - a0) * i / 11; const b = mesh(new THREE.BoxGeometry(0.028, 0.95, 0.028), iron, Math.sin(a) * (M.BORE + 0.12), M.H_ROOM + 0.475, Math.cos(a) * (M.BORE + 0.12)); b.rotation.y = a; }
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, colliders };
}
