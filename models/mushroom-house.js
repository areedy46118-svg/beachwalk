import * as THREE from 'three';

/* The Bell Pavilion — the La Jolla "mushroom house" — built to the
 * photographs: a round concrete room on a single column, its underside a
 * flaring dish of radial ribs, a band of wood-framed windows all the way
 * round under a low roof; below it a concrete bunker of curved walls on a
 * raised platform at the foot of the cliff, an iron gate in the seaward
 * wall, and inside the column a spiral stair with open treads winding round
 * an open well up into the room. Abandoned: half the panes gone, glass on
 * the floor, the concrete streaked, the gate hanging open.
 *
 * Local frame: the column's axis is the origin, +Y up, the SEA is -X and
 * the cliff is +X. Nothing is rotated, so the colliders it hands back are
 * axis-aligned in world space once offset. Angles are three's cylinder
 * convention, atan2(x, z) — the same one the game measures the player in.
 *
 * Everything the walk needs is in `MUSH`: the column and bore radii, the
 * room floor height and radius, the door's angle and half-width, and the
 * stair — rise per turn, treads per turn, how many turns, where it starts
 * (`A0`) and the angle it arrives at the top (`TOP_ANG`). The stair goes UP
 * as the angle DECREASES, the lighthouse's convention. */

export const MUSH = {
  COL_R: 2.0, BORE: 1.72, H_ROOM: 5.0, ROOM_H: 2.7, R_ROOM: 5.4,
  DOOR_ANG: -Math.PI / 2, DOOR_HALF: 0.30, DOOR_H: 2.1,
  TURNS: 1.5, TREADS: 20, PLAT_TOP: 0.4, WALL_R: 6.4, PLAT_R: 6.9,
};
MUSH.RISE = MUSH.H_ROOM / MUSH.TURNS;             // per full turn
MUSH.STEP = MUSH.RISE / MUSH.TREADS;              // per tread
MUSH.A0 = MUSH.DOOR_ANG - 0.55;                   // the first tread, just to the right of the door as you come in
MUSH.TOP_ANG = MUSH.A0 - MUSH.TURNS * Math.PI * 2;

// ------------------------------------------------------------ materials
function concreteTexture(seed, graffiti) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  g.fillStyle = '#8d8f8c'; g.fillRect(0, 0, 256, 256);
  // board-form lines and pour joints
  g.strokeStyle = 'rgba(60,62,60,0.35)'; g.lineWidth = 1;
  for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y + rnd() * 3); g.lineTo(256, y + rnd() * 3); g.stroke(); }
  // stains and mottle
  for (let i = 0; i < 900; i++) {
    const v = 110 + rnd() * 60, a = 0.05 + rnd() * 0.12;
    g.fillStyle = `rgba(${v},${v + 2},${v - 2},${a})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 6, 1 + rnd() * 6);
  }
  // rain streaks running down from the top and from the tie holes
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 256, len = 40 + rnd() * 160;
    const gr = g.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, 'rgba(40,44,44,0.35)'); gr.addColorStop(1, 'rgba(40,44,44,0)');
    g.fillStyle = gr; g.fillRect(x, rnd() * 40, 1 + rnd() * 2, len);
  }
  // form-tie holes in rows
  g.fillStyle = 'rgba(30,32,32,0.8)';
  for (let y = 40; y < 256; y += 96) for (let x = 24; x < 256; x += 64) { g.beginPath(); g.arc(x + rnd() * 6, y + rnd() * 6, 2.2, 0, 7); g.fill(); }
  if (graffiti) {
    // a couple of spray tags, faded
    const cols = ['#c53a3a', '#3b62c4', '#d6c02b', '#2f2f2f'];
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = cols[k % cols.length]; g.globalAlpha = 0.55; g.lineWidth = 5 + rnd() * 4; g.lineCap = 'round';
      g.beginPath(); let x = 30 + rnd() * 120, y = 60 + rnd() * 120; g.moveTo(x, y);
      for (let i = 0; i < 5; i++) { x += (rnd() - 0.4) * 60; y += (rnd() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  // quantise, the retro way
  const img = g.getImageData(0, 0, 256, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(d[i] / 24) * 24; d[i + 1] = Math.round(d[i + 1] / 24) * 24; d[i + 2] = Math.round(d[i + 2] / 24) * 24; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeMushroomHouse() {
  const M = MUSH;
  const g = new THREE.Group();
  const colliders = [];                                  // local-space, axis-aligned, {x0,z0,x1,z1,top,mat} or {x,z,r,top,mat}

  const concTex = concreteTexture(7, false), concTagTex = concreteTexture(19, true);
  const conc = new THREE.MeshStandardMaterial({ map: concTex, color: 0xa8aeb6, roughness: 1, metalness: 0, flatShading: true, emissive: 0x434a58, emissiveMap: concTex, side: THREE.DoubleSide });
  const concTag = conc.clone(); concTag.map = concTagTex; concTag.emissiveMap = concTagTex;
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.9, metalness: 0, flatShading: true, emissive: 0x1a1008 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb8cc, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, emissive: 0x1a2636 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x4a3d33, roughness: 0.95, metalness: 0.15, flatShading: true, emissive: 0x120d08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 1, metalness: 0, emissive: 0x040506 });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };

  // ---------------------------------------------------------- the platform
  // a raised concrete apron the bunker stands on, with two steps down at the gate
  mesh(new THREE.CylinderGeometry(M.PLAT_R, M.PLAT_R + 0.3, M.PLAT_TOP, 40), conc, 0, M.PLAT_TOP / 2, 0);
  colliders.push({ x: 0, z: 0, r: M.PLAT_R, top: M.PLAT_TOP, mat: 'rock' });
  for (const [dx, top] of [[-M.PLAT_R - 0.55, 0.27], [-M.PLAT_R - 1.2, 0.13]]) {
    mesh(new THREE.BoxGeometry(0.7, top, 2.4), conc, dx, top / 2, 0);
    colliders.push({ x0: dx - 0.35, x1: dx + 0.35, z0: -1.2, z1: 1.2, top, mat: 'rock' });
  }

  // ---------------------------------------------------------- the bunker wall
  // a curved wall round the seaward half, with the gate opening at the front
  const WALL_H = 2.3, WALL_T = 0.4, wallTop = M.PLAT_TOP + WALL_H;
  const arc0 = M.DOOR_ANG - 1.95, arc1 = M.DOOR_ANG + 1.95;
  const gateHalf = 0.11;
  /* A CURVED WALL IS ARCS, NOT BOXES. Twenty-two rotated boxes overlapped
   * into a curve, but every box top is a rectangle at its own angle, so the
   * parapet was a sawtooth and the wall read as a row of concrete posts. Two
   * arcs of cylinder either side of the gate — outer face, inner face, a
   * ring on top — are one wall. The colliders stay a row of cylinders along
   * the arc: an axis-aligned box cannot turn a corner. */
  const wallArc = (a0, a1, mat) => {
    const len = a1 - a0, ro = M.WALL_R + WALL_T / 2, ri = M.WALL_R - WALL_T / 2, n = Math.max(6, Math.round(len * 10));
    mesh(new THREE.CylinderGeometry(ro, ro, WALL_H, n, 1, true, a0, len), mat, 0, M.PLAT_TOP + WALL_H / 2, 0);
    mesh(new THREE.CylinderGeometry(ri, ri, WALL_H, n, 1, true, a0, len), mat, 0, M.PLAT_TOP + WALL_H / 2, 0);
    mesh(new THREE.RingGeometry(ri, ro, n, 1, a0, len).rotateX(-Math.PI / 2), mat, 0, wallTop, 0);
    // the ends, closed
    for (const a of [a0, a1]) { const e = mesh(new THREE.BoxGeometry(WALL_T, WALL_H, 0.04), mat, Math.sin(a) * M.WALL_R, M.PLAT_TOP + WALL_H / 2, Math.cos(a) * M.WALL_R); e.rotation.y = a; }
  };
  wallArc(arc0, M.DOOR_ANG - gateHalf, concTag);
  wallArc(M.DOOR_ANG + gateHalf, arc1, conc);
  for (let i = 0; i < 24; i++) {
    const a = arc0 + (i + 0.5) * (arc1 - arc0) / 24;
    if (Math.abs(a - M.DOOR_ANG) < gateHalf + 0.06) continue;
    colliders.push({ x: Math.sin(a) * M.WALL_R, z: Math.cos(a) * M.WALL_R, r: 0.5, top: wallTop, mat: 'rock' });
  }
  // the wall returns into the cliff on both ends
  for (const a of [arc0, arc1]) {
    const x = Math.sin(a) * M.WALL_R, z = Math.cos(a) * M.WALL_R;
    mesh(new THREE.BoxGeometry(4.5, WALL_H, WALL_T), conc, x + 2.2, M.PLAT_TOP + WALL_H / 2, z);
    for (let k = 0; k < 5; k++) colliders.push({ x: x + 0.4 + k * 0.95, z, r: 0.5, top: wallTop, mat: 'rock' });
  }
  // the gate: iron bars in a frame, hanging open
  {
    const gate = new THREE.Group();
    const w = 1.3, h = 2.0;
    for (let i = 0; i <= 8; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, h, 0.035), iron); b.position.set(0, h / 2, -w / 2 + i * (w / 8)); gate.add(b); }
    for (const y of [0.15, h - 0.15, h / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, w), iron); b.position.set(0, y, 0); gate.add(b); }
    // hinged on one jamb, swung a third open
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP, Math.cos(M.DOOR_ANG) * M.WALL_R + w / 2 + 0.05);
    gate.position.z = -w / 2;
    pivot.rotation.y = -1.0;
    pivot.add(gate); g.add(pivot);
    // gate posts
    for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, WALL_H + 0.2, 0.5), conc, Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP + WALL_H / 2 + 0.1, Math.cos(M.DOOR_ANG) * M.WALL_R + sz * (w / 2 + 0.3));
  }

  // ---------------------------------------------------------- the column
  // the lower drum has the doorway cut out of it; the upper drum is whole
  const lowerH = M.DOOR_H + 0.1, upperH = M.H_ROOM - 0.8 - lowerH;
  const gapStart = M.DOOR_ANG + M.DOOR_HALF, gapLen = Math.PI * 2 - M.DOOR_HALF * 2;
  for (const r of [M.COL_R, M.BORE]) {
    mesh(new THREE.CylinderGeometry(r, r, lowerH, 32, 1, true, gapStart, gapLen), conc, 0, M.PLAT_TOP + lowerH / 2, 0);
    mesh(new THREE.CylinderGeometry(r, r, upperH, 32, 1, true), conc, 0, M.PLAT_TOP + lowerH + upperH / 2, 0);
  }
  // the door reveal: two jambs and a head, so the wall has a thickness
  for (const sg of [-1, 1]) {
    const a = M.DOOR_ANG + sg * M.DOOR_HALF, rm = (M.COL_R + M.BORE) / 2;
    const j = mesh(new THREE.BoxGeometry(M.COL_R - M.BORE + 0.02, M.DOOR_H, 0.12), conc, Math.sin(a) * rm, M.PLAT_TOP + M.DOOR_H / 2, Math.cos(a) * rm);
    j.rotation.y = a;
  }
  {
    const rm = (M.COL_R + M.BORE) / 2, a = M.DOOR_ANG;
    const head = mesh(new THREE.BoxGeometry(M.COL_R - M.BORE + 0.02, 0.2, M.COL_R * M.DOOR_HALF * 2 + 0.2), conc, Math.sin(a) * rm, M.PLAT_TOP + M.DOOR_H + 0.05, Math.cos(a) * rm);
    head.rotation.y = a;
  }
  // the column's inside floor
  mesh(new THREE.CircleGeometry(M.BORE, 32).rotateX(-Math.PI / 2), dark, 0, M.PLAT_TOP + 0.01, 0);

  // ---------------------------------------------------------- the dish and its ribs
  // the underside flares from the column out to the rim: a lathe, then 28
  // ribs lying on it, deep at the column and thinning to the edge — the gills
  const dishY0 = M.PLAT_TOP + lowerH + upperH, dishY1 = M.H_ROOM - 0.25;
  {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; const r = M.COL_R + (M.R_ROOM - M.COL_R) * t; const y = dishY0 + (dishY1 - dishY0) * Math.pow(t, 0.7); pts.push(new THREE.Vector2(r, y)); }
    mesh(new THREE.LatheGeometry(pts, 48), conc);
    const RIBS = 28, len = Math.hypot(M.R_ROOM - M.COL_R, dishY1 - dishY0);
    for (let i = 0; i < RIBS; i++) {
      const a = i / RIBS * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.42, 0.14), conc);
      // taper: deeper at the column
      rib.geometry.translate(len / 2, 0, 0);
      const pos = rib.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); const s = 1 - 0.75 * (x / len); pos.setY(k, pos.getY(k) * s - 0.1); }
      rib.position.set(Math.sin(a) * M.COL_R, dishY0, Math.cos(a) * M.COL_R);
      rib.rotation.y = Math.PI / 2 - a;             // local +X -> world (sin a, 0, cos a): outward along the radius
      rib.rotateZ(Math.atan2(dishY1 - dishY0, M.R_ROOM - M.COL_R));   // and tipped up the dish's slope
      g.add(rib);
    }
  }
  // rim fascia
  mesh(new THREE.CylinderGeometry(M.R_ROOM + 0.05, M.R_ROOM + 0.05, 0.55, 48, 1, true), conc, 0, dishY1 + 0.15, 0);

  // ---------------------------------------------------------- the room
  // the floor is a ring round the open well the stair comes up through
  mesh(new THREE.RingGeometry(M.BORE, M.R_ROOM, 48).rotateX(-Math.PI / 2), conc, 0, M.H_ROOM, 0);
  mesh(new THREE.RingGeometry(M.BORE, M.R_ROOM, 48).rotateX(Math.PI / 2), conc, 0, M.H_ROOM - 0.24, 0);
  // the well's lip
  mesh(new THREE.CylinderGeometry(M.BORE, M.BORE, 0.26, 32, 1, true), conc, 0, M.H_ROOM - 0.12, 0);
  // sill wall under the windows
  const SILL = 0.72;
  mesh(new THREE.CylinderGeometry(M.R_ROOM, M.R_ROOM, SILL, 48, 1, true), conc, 0, M.H_ROOM + SILL / 2, 0);
  // the windows: 26 bays of wood mullions and glass, half of them gone
  const WIN_H = M.ROOM_H - SILL - 0.3, winY = M.H_ROOM + SILL, BAYS = 26;
  let seed = 3; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const shardSpots = [];
  for (let i = 0; i < BAYS; i++) {
    const a0 = i / BAYS * Math.PI * 2, a1 = (i + 1) / BAYS * Math.PI * 2, am = (a0 + a1) / 2;
    const mull = mesh(new THREE.BoxGeometry(0.16, WIN_H, 0.16), wood, Math.sin(a0) * M.R_ROOM, winY + WIN_H / 2, Math.cos(a0) * M.R_ROOM);
    mull.rotation.y = a0;
    const bayW = M.R_ROOM * (a1 - a0) - 0.16;
    // head and sill rails
    for (const y of [winY + 0.06, winY + WIN_H - 0.06]) { const r = mesh(new THREE.BoxGeometry(0.12, 0.12, bayW), wood, Math.sin(am) * M.R_ROOM, y, Math.cos(am) * M.R_ROOM); r.rotation.y = am; }
    const state = rnd();
    if (state < 0.42) { shardSpots.push(am); continue; }             // gone
    // a pane, whole or with a corner out
    const pane = mesh(new THREE.BoxGeometry(0.02, WIN_H - 0.24, bayW - 0.04), glass, Math.sin(am) * M.R_ROOM, winY + WIN_H / 2, Math.cos(am) * M.R_ROOM);
    pane.rotation.y = am;
    if (state < 0.62) { pane.scale.y = 0.55; pane.position.y = winY + 0.12 + (WIN_H - 0.24) * 0.275; shardSpots.push(am); }
  }
  // glass on the floor under the broken bays
  for (const am of shardSpots) {
    for (let k = 0; k < 5; k++) {
      const r = M.R_ROOM - 0.4 - rnd() * 1.6, a = am + (rnd() - 0.5) * 0.25;
      const sh = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.12 + rnd() * 0.15, 0, 0.02, 0.03, 0, 0.11 + rnd() * 0.12], 3)), glass);
      sh.geometry.computeVertexNormals();
      sh.position.set(Math.sin(a) * r, M.H_ROOM + 0.005, Math.cos(a) * r); sh.rotation.y = rnd() * 6.3;
      g.add(sh);
    }
  }
  // the roof: a low dish over it all, with a fascia, and a ribbed ceiling inside
  const roofY = winY + WIN_H;
  mesh(new THREE.CylinderGeometry(M.R_ROOM + 0.35, M.R_ROOM + 0.35, 0.3, 48, 1, true), conc, 0, roofY + 0.15, 0);
  {
    const pts = [new THREE.Vector2(0, roofY + 0.75), new THREE.Vector2(2.5, roofY + 0.62), new THREE.Vector2(4.5, roofY + 0.42), new THREE.Vector2(M.R_ROOM + 0.35, roofY + 0.3)];
    mesh(new THREE.LatheGeometry(pts, 48), conc);
  }
  mesh(new THREE.CircleGeometry(M.R_ROOM, 48).rotateX(Math.PI / 2), conc, 0, roofY + 0.02, 0);   // the ceiling
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2, len = M.R_ROOM - 0.3;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 0.12), conc);
    rib.geometry.translate(len / 2, 0, 0);
    rib.position.set(0, roofY - 0.1, 0); rib.rotation.y = Math.PI / 2 - a;
    g.add(rib);
  }
  // a dead pendant lamp over where the table was, and the table's stump
  mesh(new THREE.ConeGeometry(0.28, 0.32, 12, 1, true), dark, 2.2, roofY - 0.9, 1.4);
  mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 6), dark, 2.2, roofY - 0.45, 1.4);

  // ---------------------------------------------------------- the stair
  // open treads cantilevered from the column wall, winding up round an open
  // well, a rail on the well side. Up is the angle decreasing.
  const N = Math.round(M.TURNS * M.TREADS), stepA = Math.PI * 2 / M.TREADS;
  const treadIn = 0.5, treadOut = M.BORE - 0.05;
  const treadGeo = new THREE.BoxGeometry(treadOut - treadIn, 0.07, 0.62);
  treadGeo.translate((treadOut + treadIn) / 2, 0, 0);
  const railPts = [];
  for (let i = 0; i <= N; i++) {
    const a = M.A0 - i * stepA, y = M.PLAT_TOP + i * M.STEP;
    const tr = new THREE.Mesh(treadGeo, conc);
    tr.position.set(0, y, 0); tr.rotation.y = Math.PI / 2 - a;
    g.add(tr);
    // baluster every other tread, on the well side
    if (i % 2 === 0) {
      const b = mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), iron, Math.sin(a) * (treadIn + 0.06), y + 0.45, Math.cos(a) * (treadIn + 0.06));
      b.rotation.y = a;
    }
    railPts.push(new THREE.Vector3(Math.sin(a) * (treadIn + 0.06), y + 0.9, Math.cos(a) * (treadIn + 0.06)));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), N * 3, 0.025, 6), iron);
  // and a rail round the well in the room, open where the stair arrives
  {
    const pts = [];
    const a0 = M.TOP_ANG + 0.55, a1 = M.TOP_ANG + Math.PI * 2 - 0.55;
    for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; pts.push(new THREE.Vector3(Math.sin(a) * (M.BORE + 0.12), M.H_ROOM + 0.95, Math.cos(a) * (M.BORE + 0.12))); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.025, 6), iron);
    for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; const b = mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), iron, Math.sin(a) * (M.BORE + 0.12), M.H_ROOM + 0.475, Math.cos(a) * (M.BORE + 0.12)); b.rotation.y = a; }
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, colliders };
}
