import * as THREE from 'three';

/* The Bell Pavilion — La Jolla's "mushroom house" — built to the
 * photographs. A round concrete room on a single column at the foot of the
 * cliff; the underside of the room a deep flaring dish of radial ribs; a
 * band of steel-framed windows all the way round, each bay a tall pane over
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
MUSH.A0 = MUSH.DOOR_ANG - 0.6;                    // the first tread: 0.6 rad round from the doorway
MUSH.TOP_ANG = MUSH.A0 - MUSH.TURNS * Math.PI * 2;
/* THE DOORWAY IS BELOW THE FIRST TREAD, so the count is NEGATIVE there. Held
 * at zero from the door, the walk credited you with the 0.6 rad between the
 * two: every tread you climbed you stood a third of a metre above, and at
 * the top the height said you had arrived 0.6 rad before the top tread and
 * the gap in the rail actually were. The floor is flat over that stretch,
 * so a negative count costs nothing and the treads and the walk line up. */
MUSH.TURN_MIN = (MUSH.A0 - MUSH.DOOR_ANG - 0.4) / (Math.PI * 2);
MUSH.DISH_Y0 = MUSH.H_ROOM - 2.1;                 // where the column ends and the dish begins

// ------------------------------------------------------------ textures
const retro = (c) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
/* CONTRAST IS WHAT MAKES CONCRETE READ AS CONCRETE. The first map was a
 * narrow band of grey with a few lines on it, so under one directional
 * light at night the whole building came out as one flat tone and the
 * shapes — the ribs, the flare of the dish, the sill — did all the work on
 * their own. Board-formed concrete is not a colour, it is a RECORD of how
 * it was poured: every board leaves a dark seam with a pale lip under it
 * where the lift bled, the ties leave holes in a grid and the holes leave
 * rust running out of them, damp runs down from the sill and dries in
 * pale efflorescence, and the aggregate shows through where the face has
 * spalled. All of that is drawn, at 512 so the seams survive the retro
 * downscale, and the value range is nearly twice what it was. */
function concreteTexture(seed, tags) {
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const rnd = lcg(seed);
  g.fillStyle = '#7c828c'; g.fillRect(0, 0, S, S);
  // broad blotching: the pour is never one tone
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 120, v = rnd() < 0.5 ? 1 : -1;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, v > 0 ? 'rgba(176,182,192,0.30)' : 'rgba(52,57,66,0.28)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // aggregate: light and dark grit, the thing that stops it looking painted
  for (let i = 0; i < 5200; i++) {
    const v = rnd(); const sz = 1 + rnd() * 2.6;
    g.fillStyle = v < 0.5 ? `rgba(${36 + rnd() * 26},${39 + rnd() * 26},${46 + rnd() * 26},${0.16 + rnd() * 0.3})`
                          : `rgba(${188 + rnd() * 55},${192 + rnd() * 55},${200 + rnd() * 50},${0.13 + rnd() * 0.26})`;
    g.fillRect(rnd() * S, rnd() * S, sz, sz);
  }
  // BOARD FORM: a dark seam, and the pale lip of the lift bleeding under it
  for (let y = 0; y < S; y += 62) {
    const j = rnd() * 3;
    g.strokeStyle = 'rgba(26,29,35,0.62)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, y + j); g.lineTo(S, y + j + (rnd() - 0.5) * 3); g.stroke();
    g.strokeStyle = 'rgba(206,212,222,0.34)'; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(0, y + j + 3.4); g.lineTo(S, y + j + 3.4 + (rnd() - 0.5) * 3); g.stroke();
    // and the odd vertical butt joint between two boards
    if (rnd() < 0.7) { const x = rnd() * S; g.strokeStyle = 'rgba(30,34,40,0.4)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y + j); g.lineTo(x + (rnd() - 0.5) * 4, y + j + 62); g.stroke(); }
  }
  // damp running down, and pale salt drying where it stopped
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S, len = 90 + rnd() * 320, w = 2 + rnd() * 9, y0 = rnd() * 90;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, 'rgba(24,27,33,0.46)'); gr.addColorStop(0.72, 'rgba(28,32,38,0.16)'); gr.addColorStop(1, 'rgba(28,32,38,0)');
    g.fillStyle = gr; g.fillRect(x, y0, w, len);
    if (rnd() < 0.5) { const gr2 = g.createLinearGradient(0, y0 + len * 0.5, 0, y0 + len); gr2.addColorStop(0, 'rgba(216,222,230,0)'); gr2.addColorStop(1, 'rgba(216,222,230,0.34)'); g.fillStyle = gr2; g.fillRect(x - 2, y0 + len * 0.5, w + 4, len * 0.5); }
  }
  // the tie holes, and the rust that has run out of each one
  for (let y = 44; y < S; y += 124) for (let x = 30; x < S; x += 86) {
    const hx = x + rnd() * 8, hy = y + rnd() * 8;
    const gr = g.createLinearGradient(0, hy, 0, hy + 40 + rnd() * 40);
    gr.addColorStop(0, 'rgba(120,72,38,0.42)'); gr.addColorStop(1, 'rgba(120,72,38,0)');
    g.fillStyle = gr; g.fillRect(hx - 3, hy, 6, 80);
    g.fillStyle = 'rgba(206,212,220,0.5)'; g.beginPath(); g.arc(hx, hy - 1.5, 4.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(18,20,24,0.9)'; g.beginPath(); g.arc(hx, hy, 3.6, 0, 7); g.fill();
  }
  // spalled patches: the face off, the aggregate showing
  for (let i = 0; i < 10; i++) {
    const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 26;
    g.fillStyle = 'rgba(96,90,84,0.5)'; g.beginPath();
    for (let k = 0; k <= 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.6 + rnd() * 0.6); if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
    g.strokeStyle = 'rgba(210,214,222,0.3)'; g.lineWidth = 1.4; g.stroke();
  }
  if (tags) {
    const cols = ['#c8452f', '#2f56c8', '#d8bb1e', '#141414', '#dcdcdc'];
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = cols[k % cols.length]; g.globalAlpha = 0.42 + rnd() * 0.2; g.lineWidth = 7 + rnd() * 10; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); let x = 40 + rnd() * 300, y = 90 + rnd() * 300; g.moveTo(x, y);
      for (let i = 0; i < 6; i++) { x += (rnd() - 0.35) * 110; y += (rnd() - 0.5) * 90; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const img = g.getImageData(0, 0, S, S), d = img.data;
  // and pushed apart around the mid grey before the retro quantise, because
  // a map that carries no contrast cannot be given any by a material
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) {
    const v = 128 + (d[i + k] - 128) * 1.34;
    d[i + k] = Math.round(Math.max(0, Math.min(255, v)) / 14) * 14;
  }
  g.putImageData(img, 0, 0);
  return retro(c);
}
/* ---- THE SEVENTIES, IN A ROOM ON THE BEACH ------------------------------
 * The owner asked for the top floor furnished in seventies modern and sent
 * the references: burnt orange and mustard, teak, chrome, a globe chair, a
 * wave-pattern shag rug, bullseye paper. Everything below is drawn to
 * those. It has to survive two things this game does to a picture — the
 * retro downscale, which eats any pattern finer than a hand's breadth, and
 * a quarter moon, which eats any colour that is not carrying its own
 * light — so the patterns are BIG and the maps are lit off their own
 * emissive, the way every other night-lit thing here is. */
function rugTexture(seed) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rnd = lcg(seed);
  g.fillStyle = '#6d2f18'; g.fillRect(0, 0, S, S);
  // the wave: concentric bands off a centre, in the reference's own order
  const cols = ['#8c3a1a', '#c25a1e', '#e0902e', '#eec24a', '#d9d0b4', '#a8481d'];
  const cx = S / 2, cy = S / 2;
  for (let r = S * 0.72; r > 4; r -= S * 0.030) {
    g.strokeStyle = cols[(Math.round(r / (S * 0.030))) % cols.length];
    g.lineWidth = S * 0.034; g.beginPath();
    for (let k = 0; k <= 48; k++) {
      const a = k / 48 * Math.PI * 2, rr = r * (1 + 0.10 * Math.sin(a * 3 + r * 0.05));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (k) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  // shag: the pile is not smooth, and forty years of dust is not either
  for (let i = 0; i < 5000; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? `rgba(20,10,6,${0.05 + rnd() * 0.16})` : `rgba(240,224,190,${0.03 + rnd() * 0.11})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 2 + rnd() * 5); }
  const dust = g.createRadialGradient(cx, cy, S * 0.1, cx, cy, S * 0.75);
  dust.addColorStop(0, 'rgba(60,54,44,0)'); dust.addColorStop(1, 'rgba(48,44,38,0.42)');
  g.fillStyle = dust; g.fillRect(0, 0, S, S);
  return retro(c);
}
function woodTexture(seed) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rnd = lcg(seed);
  g.fillStyle = '#7a4a24'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 130; i++) {
    const y = rnd() * S, w = 0.6 + rnd() * 3.4, dark = rnd() < 0.6;
    g.strokeStyle = dark ? `rgba(48,26,10,${0.16 + rnd() * 0.4})` : `rgba(190,140,86,${0.10 + rnd() * 0.3})`;
    g.lineWidth = w; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= S; x += 16) g.lineTo(x, y + Math.sin(x * 0.045 + i) * 3.4 + (rnd() - 0.5) * 2);
    g.stroke();
  }
  for (let i = 0; i < 3; i++) { const x = rnd() * S, y = rnd() * S; for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(44,24,10,${0.34 - k * 0.05})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, 3 + k * 3.4, 2 + k * 2.1, 0.4, 0, 7); g.stroke(); } }
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 16) * 16;
  g.putImageData(img, 0, 0);
  return retro(c);
}
/* AND THE FLOOR OF A ROOM IS NOT THE SLAB IT WAS POURED ON. The room read
 * as a black ring round a lit rug, because the only thing under the
 * furniture was the same structural concrete as the outside of the
 * building. Terrazzo — the chips-in-cement floor of every civic room of
 * the period — is a pale ground with big aggregate in it, which is exactly
 * what a dim room needs: something that catches what light there is and
 * gives the eye a surface. */
function terrazzoTexture(seed) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rnd = lcg(seed);
  g.fillStyle = '#9a978c'; g.fillRect(0, 0, S, S);
  const chips = ['#e8e4d8', '#4a4640', '#c8703a', '#7e8a72', '#d8c8a0', '#2e2c28'];
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 7;
    g.fillStyle = chips[(rnd() * chips.length) | 0]; g.globalAlpha = 0.55 + rnd() * 0.45;
    g.beginPath();
    for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI * 2, rr = r * (0.55 + rnd() * 0.7); if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 60; i++) {                    // dust, and the scuffs of a room that was used
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(40,38,34,${0.10 + rnd() * 0.16})`); gr.addColorStop(1, 'rgba(40,38,34,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(Math.max(0, Math.min(255, 128 + (d[i + k] - 128) * 1.2)) / 14) * 14;
  g.putImageData(img, 0, 0);
  return retro(c);
}
function sleeveTexture(seed) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rnd = lcg(seed);
  const bg = ['#1d2540', '#4a1620', '#25401d', '#3a2a10', '#40203c'][seed % 5];
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const fg = ['#e0a02c', '#d8d0bc', '#c2461e', '#5fa8c8'][seed % 4];
  g.fillStyle = fg;
  const kind = seed % 3;
  if (kind === 0) { for (let k = 0; k < 5; k++) { g.globalAlpha = 0.85 - k * 0.12; g.beginPath(); g.arc(S / 2, S / 2, S * (0.42 - k * 0.075), 0, 7); g.fill(); } }
  else if (kind === 1) { for (let k = 0; k < 6; k++) { g.globalAlpha = 0.8; g.fillRect(12, 14 + k * 17, S - 24, 8 + (k % 2) * 4); } }
  else { g.globalAlpha = 0.85; g.beginPath(); g.moveTo(S / 2, 16); g.lineTo(S - 18, S - 20); g.lineTo(18, S - 20); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(220,210,190,${0.03 + rnd() * 0.09})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); }
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 5; g.strokeRect(2.5, 2.5, S - 5, S - 5);
  return retro(c);
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
  /* AND YOU WALK TOWARD THE MOON, so the pavilion is BACKLIT from every
   * approach: the one directional light contributes nothing to the face
   * you are looking at, and the whole building was a dark lump on a dark
   * beach until you were under it. The emissive off its own map is what
   * carries the concrete — the same thing the scanned rocks needed, for
   * the same reason — and with the map's own contrast now doing the work
   * the lift can be strong without flattening it. */
  const conc = new THREE.MeshStandardMaterial({ map: concTex, color: 0xa6b0c0, roughness: 1, metalness: 0, flatShading: true, emissive: 0x4e586c, emissiveMap: concTex, side: THREE.DoubleSide });
  const concTag = conc.clone(); concTag.map = tagTex; concTag.emissiveMap = tagTex;
  const pale = conc.clone(); pale.color.setHex(0xc8ced8); pale.emissive.setHex(0x69748a);   // lit enough to read in the well   // the stair, the ribs: the pale poured work in the photographs
  /* NOTHING IN HERE IS BROWN. The window frames were dark wood and the sill
   * was capped with it, and at eye height in a round room that is one
   * unbroken tan band all the way round you — the only warm thing on a cold
   * beach, and the first thing you look at. They are weathered grey steel
   * now, and the sill is capped in its own concrete. */
  const frame = new THREE.MeshStandardMaterial({ color: 0x5a6270, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x1a1f28 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8fb0c8, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false, emissive: 0x16202e });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3f352d, roughness: 0.95, metalness: 0.1, flatShading: true, emissive: 0x100b07 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 1, metalness: 0, emissive: 0x040507 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xb0b6c0, roughness: 0.9, metalness: 0, flatShading: true, emissive: 0x282d36 });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const arcBand = (r, y0, y1, a0, a1, mat, n) => mesh(new THREE.CylinderGeometry(r, r, y1 - y0, n || Math.max(6, Math.round((a1 - a0) * 12)), 1, true, a0, a1 - a0), mat, 0, (y0 + y1) / 2, 0);
  /* RINGGEOMETRY LIES ABOUT ITS ANGLE. Its theta runs (cos, sin) in XY, while
   * CylinderGeometry's runs (sin, cos) in XZ — the game's own convention — so
   * a ring laid flat with the same thetaStart as the arc it is meant to cap
   * comes out A QUARTER TURN ROUND, and laid face-down it comes out mirrored
   * as well. Every capped arc in here was built that way: the bench's seat
   * hovered 90 deg from its own front, a pale slab over nothing in the middle
   * of the room, and the walls' copings floated out over the yard and over
   * the gate with nothing under them. Lay one down with this and nothing
   * else. `down` faces it at the floor. */
  const ringArc = (r0, r1, a0, a1, mat, y, down) => {
    const n = Math.max(4, Math.round((a1 - a0) * 12));
    const t0 = down ? Math.PI / 2 - a1 : a0 - Math.PI / 2;
    return mesh(new THREE.RingGeometry(r0, r1, n, 1, t0, a1 - a0).rotateX(down ? Math.PI / 2 : -Math.PI / 2), mat, 0, y, 0);
  };
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // ---------------------------------------------------------- platform and steps
  mesh(new THREE.CylinderGeometry(M.PLAT_R, M.PLAT_R + 0.35, M.PLAT_TOP, 48), conc, 0, M.PLAT_TOP / 2, 0);
  colliders.push({ x: 0, z: 0, r: M.PLAT_R, top: M.PLAT_TOP, mat: 'rock' });
  for (const [dx, top] of [[-M.PLAT_R - 0.5, 0.27], [-M.PLAT_R - 1.1, 0.13]]) {
    mesh(new THREE.BoxGeometry(0.62, top, 2.6), conc, dx, top / 2, 0);
    colliders.push({ x0: dx - 0.31, x1: dx + 0.31, z0: -1.3, z1: 1.3, top, mat: 'rock' });
  }

  // ---------------------------------------------------------- the walls
  /* THE FRONT IS THE ONLY LOW WALL. The cliff is cut away inside the whole
   * footprint, and a cut through a one-sided bluff is a window onto the void
   * behind it — so every angle where the bluff stood has to be closed by
   * something TALLER than the bluff. The old arcs gave the seaward 218 deg
   * to a 2.3 m parapet, and the bluff on the +Z flank — the side you walk in
   * from — stood 3.6 m: from the beach you saw straight through the gap
   * between the sand wall and the house. The parapet keeps only the 128 deg
   * across the front, where there is nothing but flat talus to hold back,
   * and the retaining wall takes the whole of the rest. */
  const WALL_H = 2.3, WALL_T = 0.4, wallTop = M.PLAT_TOP + WALL_H;
  const arc0 = M.DOOR_ANG - 1.12, arc1 = M.DOOR_ANG + 1.12, gateHalf = 0.14;
  const RET_R = M.PLAT_R + 0.15, RET_T = 0.2, RET_TOP = 4.15;   // the cut in main.js lives inside RET_R - RET_T and below RET_TOP
  const wallArc = (a0, a1, mat) => {
    const ro = M.WALL_R + WALL_T / 2, ri = M.WALL_R - WALL_T / 2, n = Math.max(6, Math.round((a1 - a0) * 12));
    arcBand(ro, M.PLAT_TOP, wallTop, a0, a1, mat, n); arcBand(ri, M.PLAT_TOP, wallTop, a0, a1, mat, n);
    ringArc(ri, ro, a0, a1, mat, wallTop);
    // an end return closing the wall's thickness: with rotation.y = a - PI/2
    // local +X is RADIAL and +Z tangential (a is the mirror; see the treads)
    for (const a of [a0, a1]) { const e = mesh(new THREE.BoxGeometry(WALL_T, WALL_H, 0.04), mat, Math.sin(a) * M.WALL_R, M.PLAT_TOP + WALL_H / 2, Math.cos(a) * M.WALL_R); e.rotation.y = a - Math.PI / 2; }
  };
  wallArc(arc0, M.DOOR_ANG - gateHalf, concTag);
  wallArc(M.DOOR_ANG + gateHalf, arc1, conc);
  /* THE HOLE IN THE FRONT WALL WAS THREE AND A HALF METRES WIDE. The discs
   * were laid at 0.9 m of ARC apart — barely touching at r 0.45, so the ring
   * was a string of beads with the seams open — and the gateway skipped every
   * sample within 0.19 rad of the door, which at this radius threw away THREE
   * of them and left a 3.5 m gap in a wall whose gate is 1.4 m. You walked
   * through the front of the building. They are laid at half their own
   * diameter now, so consecutive discs overlap properly, and the opening is
   * measured in METRES off the gate's own width. */
  const GATE_W = 1.7;                                  // the clear opening, the gate's own
  {
    const step = 0.42 / M.WALL_R, n = Math.max(6, Math.ceil((arc1 - arc0) / step));
    for (let i = 0; i <= n; i++) {
      const a = arc0 + (arc1 - arc0) * i / n;
      if (Math.abs(a - M.DOOR_ANG) * M.WALL_R < GATE_W / 2) continue;
      colliders.push({ x: Math.sin(a) * M.WALL_R, z: Math.cos(a) * M.WALL_R, r: 0.42, top: wallTop, mat: 'rock' });
    }
  }
  {
    const r0 = arc1, r1 = arc0 + TAU, n = 40, y0 = -0.35;
    arcBand(RET_R + RET_T, y0, RET_TOP, r0, r1, conc, n); arcBand(RET_R - RET_T, y0, RET_TOP, r0, r1, conc, n);
    ringArc(RET_R - RET_T, RET_R + RET_T, r0, r1, conc, RET_TOP);
    const nc = Math.round((r1 - r0) * RET_R / 0.9);
    for (let i = 0; i < nc; i++) { const a = r0 + (i + 0.5) * (r1 - r0) / nc; colliders.push({ x: Math.sin(a) * RET_R, z: Math.cos(a) * RET_R, r: 0.5, top: RET_TOP, mat: 'rock' }); }
    // and at each end it steps down and in to meet the parapet
    for (const a of [arc0, arc1]) {
      const rm = (M.WALL_R + RET_R) / 2;
      const m = mesh(new THREE.BoxGeometry(RET_R - M.WALL_R + 0.6, RET_TOP - y0, WALL_T), conc, Math.sin(a) * rm, (y0 + RET_TOP) / 2, Math.cos(a) * rm);
      m.rotation.y = a - Math.PI / 2;
      colliders.push({ x: Math.sin(a) * rm, z: Math.cos(a) * rm, r: 0.5, top: RET_TOP, mat: 'rock' });
    }
  }
  /* THE GATE OPENS. It hung at a fixed angle and was scenery you walked
   * past; it is the only way into the yard and it should be a thing you
   * DO. It starts shut, and `MUSH.gate` hands the game everything it needs
   * to swing it: the pivot to turn, the two angles, and the collider discs
   * to carry round with the leaf so the iron is solid wherever it is
   * standing. Nothing here animates it — models/ builds, main.js drives. */
  const gateInfo = { pivot: null, shut: 0.03, open: 1.42, cols: [], w: 1.35, h: 2.0 };
  {
    const w = gateInfo.w, h = gateInfo.h, gate = new THREE.Group();
    for (let i = 0; i <= 8; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, h, 0.035), iron); b.position.set(0, h / 2, i * (w / 8)); gate.add(b); }
    for (const y of [0.12, h / 2, h - 0.12]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, w), iron); b.position.set(0, y, w / 2); gate.add(b); }
    const pivot = new THREE.Group();
    const px = Math.sin(M.DOOR_ANG) * M.WALL_R, pz = Math.cos(M.DOOR_ANG) * M.WALL_R - w / 2 - 0.1;
    pivot.position.set(px, M.PLAT_TOP, pz);
    /* AND A GATE THAT IS SOLID HAS TO BE OPEN ENOUGH TO WALK PAST. At the
     * third-open it hung at while it was scenery, its leaf lay across its
     * own doorway — harmless as a picture, a shut gate the moment the iron
     * was given colliders. It stands well back against the inside of the
     * wall now, which is where a gate nobody has closed in thirty years
     * would have ended up anyway. */
    pivot.rotation.y = gateInfo.shut; pivot.add(gate); g.add(pivot);
    gateInfo.pivot = pivot; gateInfo.x = px; gateInfo.z = pz;
    /* AND THE GATE IS IRON, NOT A PICTURE OF IT. You walked straight through
     * the bars. Its leaf carries discs down its length — kept on
     * `MUSH.gate.cols` so the swing can move them — and the two posts are
     * solid, which is what makes the opening a DOORWAY rather than a hole
     * with decoration beside it. */
    for (let i = 0; i <= 4; i++) {
      const t = i / 4 * w;
      const c = { x: px + Math.sin(gateInfo.shut) * t, z: pz + Math.cos(gateInfo.shut) * t, r: 0.12, top: M.PLAT_TOP + h, mat: 'wood', t };
      colliders.push(c); gateInfo.cols.push(c);
    }
    for (const sz of [-1, 1]) {
      const cz = Math.cos(M.DOOR_ANG) * M.WALL_R + sz * (w / 2 + 0.35);
      mesh(new THREE.BoxGeometry(0.5, WALL_H + 0.25, 0.5), conc, Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP + WALL_H / 2 + 0.12, cz);
      colliders.push({ x: Math.sin(M.DOOR_ANG) * M.WALL_R, z: cz, r: 0.34, top: wallTop, mat: 'rock' });
    }
  }

  // ---------------------------------------------------------- the column
  /* THE SHAFT IS WALLED THE WHOLE WAY UP. It used to stop at DISH_Y0 and
   * leave the last two metres of the climb standing in the open inside the
   * flare of the dish — from the room you looked down on the top third of
   * the stair hanging in mid-air, and from the stair there was nothing
   * beside you. It is one tube from the platform to the room floor now:
   * the door is a gap in the bottom of it, and its top edge is the lip of
   * the well, flush with the floor. */
  /* AND THE WALL OVER THE DOOR IS WALL. It was a straight box laid across a
   * curved opening: a chord through an arc stands 15 cm proud of the face at
   * each end, and lit on its top it read as a grey bar hanging in the air
   * over the gate rather than as a lintel. The door is a gap in the bottom
   * DOOR_H of the tube now and the concrete above it is the tube's own, with
   * a soffit closing the reveal. Nothing hangs. */
  const colTop = M.H_ROOM, doorTop = M.PLAT_TOP + M.DOOR_H;
  const gapStart = M.DOOR_ANG + M.DOOR_HALF, gapLen = TAU - M.DOOR_HALF * 2;
  for (const r of [M.COL_R, M.BORE]) {
    mesh(new THREE.CylinderGeometry(r, r, M.DOOR_H, 40, 1, true, gapStart, gapLen), conc, 0, M.PLAT_TOP + M.DOOR_H / 2, 0);
    mesh(new THREE.CylinderGeometry(r, r, colTop - doorTop, 40, 1, true), conc, 0, (doorTop + colTop) / 2, 0);
  }
  ringArc(M.BORE, M.COL_R, M.DOOR_ANG - M.DOOR_HALF, M.DOOR_ANG + M.DOOR_HALF, conc, doorTop, true);   // the soffit
  // the reveal's jambs: with rotation.y = a - PI/2 the box's +X is RADIAL, so
  // a jamb fills the wall's thickness instead of standing across the opening
  for (const sg of [-1, 1]) {
    const a = M.DOOR_ANG + sg * M.DOOR_HALF, rm = (M.COL_R + M.BORE) / 2;
    const j = mesh(new THREE.BoxGeometry(M.COL_R - M.BORE + 0.02, M.DOOR_H, 0.14), conc, Math.sin(a) * rm, M.PLAT_TOP + M.DOOR_H / 2, Math.cos(a) * rm);
    j.rotation.y = a - Math.PI / 2;
  }
  // the shaft's own floor: concrete, worn darker. It was the `dark` material
  // when the top of the shaft was open and this read as the bottom of a
  // void; walled and walked on, a black disc through the doorway is a hole
  const shaftFloor = conc.clone(); shaftFloor.color.setHex(0x6c7280); shaftFloor.emissive.setHex(0x232a36);
  mesh(new THREE.CircleGeometry(M.BORE, 40).rotateX(-Math.PI / 2), shaftFloor, 0, M.PLAT_TOP + 0.01, 0);

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
  // the ribs under the dish: 24 of them, deep at the column and thinning to
  // the rim, each following the curve in pieces. (The well's lip used to be
  // a band of its own here; the shaft is the lip now.)
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU;
    for (let k = 0; k < 7; k++) {
      const t0 = k / 7, t1 = (k + 1) / 7, p0 = dishPt(t0), p1 = dishPt(t1);
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y), depth = 0.55 * (1 - 0.78 * (t0 + t1) / 2);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(len + 0.03, depth, 0.13), pale);
      const rm = (p0.x + p1.x) / 2, ym = (p0.y + p1.y) / 2 - depth / 2 + 0.02;
      rib.position.set(Math.sin(a) * rm, ym, Math.cos(a) * rm);
      rib.rotation.y = a - Math.PI / 2;          // local +X -> (sin a, 0, cos a); π/2 - a mirrors it
      rib.rotateZ(-Math.atan2(p1.y - p0.y, p1.x - p0.x));
      g.add(rib);
    }
  }

  // ---------------------------------------------------------- the room
  const winY = M.H_ROOM + M.SILL, roofY = M.H_ROOM + M.ROOM_H, WIN_H = roofY - winY;
  // sill wall, inside and out, and its cap
  arcBand(M.R_ROOM, M.H_ROOM, winY, 0, TAU, conc, 56); arcBand(M.R_ROOM - 0.18, M.H_ROOM, winY, 0, TAU, conc, 56);
  mesh(new THREE.RingGeometry(M.R_ROOM - 0.18, M.R_ROOM, 56).rotateX(-Math.PI / 2), conc, 0, winY, 0);
  // the windows: bays round the circle, each a tall pane over a short one,
  // the glass CURVED to the drum, the rails curved with it, the mullions
  // posts at the joints. Abandoned: two in five gone, one in five broken.
  const BAYS = 22, RG = M.R_ROOM - 0.06, split = winY + WIN_H * 0.3;
  const shardAt = [];
  for (const y of [winY + 0.05, split, roofY - 0.05]) arcBand(RG + 0.03, y - 0.05, y + 0.05, 0, TAU, frame, 56);
  for (let i = 0; i < BAYS; i++) {
    const a0 = i / BAYS * TAU, a1 = (i + 1) / BAYS * TAU;
    const post = mesh(new THREE.BoxGeometry(0.16, WIN_H, 0.16), frame, Math.sin(a0) * RG, winY + WIN_H / 2, Math.cos(a0) * RG);
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
    sh.geometry.computeVertexNormals(); sh.position.set(Math.sin(a) * r, M.H_ROOM + 0.03, Math.cos(a) * r); sh.rotation.y = rnd() * TAU; g.add(sh);
  }
  // the roof: fascia, a low dome, and the ceiling with its deep ribs
  arcBand(M.R_ROOM + 0.3, roofY - 0.02, roofY + 0.32, 0, TAU, conc, 56);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(M.R_ROOM + 0.3, roofY + 0.32), new THREE.Vector2(4.2, roofY + 0.5), new THREE.Vector2(2.0, roofY + 0.62), new THREE.Vector2(0, roofY + 0.7)], 56), conc);
  mesh(new THREE.CircleGeometry(M.R_ROOM, 56).rotateX(Math.PI / 2), conc, 0, roofY, 0);
  /* THE CEILING MUST NOT BE THE BRIGHTEST THING IN THE ROOM. Twenty-four
   * ribs in the pale of the stair made a lit fan overhead that took the eye
   * off everything under it; the ceiling of a dark room is dark. */
  const ceil = pale.clone(); ceil.color.setHex(0x9aa2b0); ceil.emissive.setHex(0x394252);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, len = M.R_ROOM - 0.25;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.14), ceil);
    const pos = rib.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); const s = 1 - 0.55 * ((x + len / 2) / len); pos.setY(k, pos.getY(k) * s); }
    rib.geometry.translate(len / 2, 0, 0);
    rib.position.set(0, roofY - 0.17, 0); rib.rotation.y = a - Math.PI / 2;
    g.add(rib);
  }
  /* ------------------------------------------------------- the seventies
   * What was left in it. The brief is a room somebody LIVED in — brought
   * the sofa up that spiral stair, papered over the windows they did not
   * want, put a record on — and then walked out of and never came back to.
   * So nothing in here is ruined: it is dusty, sun-bleached down one side,
   * one chair is over and the records are off the shelf, and everything
   * else is exactly where it was left. Abandoned is a STATE, not a style;
   * the style is 1974. */
  /* AND THERE ARE NO LIGHTS IN HERE. There were five, and they were the
   * whole of "the game is lagging horribly". Measured: the room renders in
   * 4.1 ms and the lamps cost 0.14 of that, so it was never the drawing —
   * it is that EVERY LIGHT IN A SCENE IS A SHADER DEFINE. Five point lights
   * entering the scene changes `NUM_POINT_LIGHTS` for every material in the
   * game, and three then recompiles all of them: 193 ms in the room, 312 on
   * the beach, and again on the way back out, at 320 m — which is in the
   * middle of a walk, so it reads as the game randomly seizing up.
   *
   * Warming it only moves the bill; it does not cancel it. The answer is
   * the one the rocks and the creatures and the tall one already use, and
   * that this file already says twice about textures: DO IT IN THE MAP,
   * NOT WITH A LAMP. Every material in the room carries its own emissive
   * off its own map, hard enough to read under a quarter moon, and the
   * scene's light count never changes for the pavilion at all. */

  /* ------------------------------------------------------- the seventies
   * The brief is a room somebody LIVED in — brought the sofa up that
   * spiral stair, put a record on — and then walked out of and never came
   * back to. So nothing in here is ruined: it is dusty, sun-bleached down
   * one side, one chair is over and the records are off the shelf, and
   * everything else is exactly where it was left.
   *
   * AND THE GLASS GOES ALL THE WAY ROUND. Six bays on the cliff side were
   * papered over from the inside — bullseye paper, big and warm, with the
   * furniture that wants a wall standing against it — and it was the
   * wrong idea in a building whose whole argument is a drum of windows on
   * a column. A round room with a horizon in every direction does not want
   * a back; it wants everything in it kept BELOW THE SILL, so the band of
   * glass runs unbroken over the top of the furniture and the sea is
   * visible from anywhere you stand. Nothing in here now stands higher
   * than 0.75 m but the lamp, the palm and what hangs from the ceiling. */
  const rugTex = rugTexture(5);
  const rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, metalness: 0, emissive: 0xa86a2a, emissiveMap: rugTex, emissiveIntensity: 1.35, side: THREE.DoubleSide });
  const teakTex = woodTexture(9); teakTex.repeat.set(2.2, 2.2);
  const teak = new THREE.MeshStandardMaterial({ map: teakTex, color: 0xb08256, roughness: 0.72, metalness: 0, flatShading: true, emissive: 0x8e5a2e, emissiveMap: teakTex, emissiveIntensity: 1.5 });
  const rust = new THREE.MeshStandardMaterial({ color: 0xc85422, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0xa4451a });
  const rustDk = new THREE.MeshStandardMaterial({ color: 0x93381a, roughness: 0.98, metalness: 0, flatShading: true, emissive: 0x76300f });
  const mustard = new THREE.MeshStandardMaterial({ color: 0xdda832, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0xa87e26 });
  const olive = new THREE.MeshStandardMaterial({ color: 0x767c3a, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x4e5426 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xdccfb0, roughness: 0.9, metalness: 0, flatShading: true, emissive: 0x86806a });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb4bcc8, roughness: 0.34, metalness: 0.22, flatShading: true, emissive: 0x66707e });
  const gloss = new THREE.MeshStandardMaterial({ color: 0xe05e2c, roughness: 0.42, metalness: 0.05, flatShading: true, emissive: 0x94401c });
  const smoke = new THREE.MeshPhysicalMaterial({ color: 0x241d16, roughness: 0.42, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0e0b08 });
  const box = (w, h, d, mat, x, y, z, ry) => { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z); if (ry) m.rotation.y = ry; return m; };
  const cyl = (r0, r1, h, mat, x, y, z, n) => mesh(new THREE.CylinderGeometry(r0, r1, h, n || 12), mat, x, y, z);
  const F = M.H_ROOM;                                   // the room's floor
  // a collider that only exists UP HERE: `floorY` is the head-height gate the
  // push-out already reads, so a sofa five metres up is not a wall on the
  // sand under it. Nothing in the room is a floor — you walk round it.
  const room = (x, z, r, h) => colliders.push({ x, z, r, top: F + h, floorY: F - 0.8, mat: 'wood' });
  const at = (a, r) => [Math.sin(a) * r, Math.cos(a) * r];

  { // the terrazzo, laid right out to the glass
    const terTex = terrazzoTexture(21); terTex.repeat.set(7, 7);
    const ter = new THREE.MeshStandardMaterial({ map: terTex, roughness: 0.82, metalness: 0, emissive: 0x5a606c, emissiveMap: terTex, emissiveIntensity: 1.25, side: THREE.DoubleSide });
    mesh(new THREE.RingGeometry(M.BORE, M.R_ROOM - 0.02, 56).rotateX(-Math.PI / 2), ter, 0, F + 0.006, 0);
  }

  /* The rug: a SECTOR of the ring, not a disc. A disc big enough to matter
   * in an eleven-metre room lay straight over the open well in the middle
   * of it; a sector clears the well by construction and puts the wave
   * pattern's own rings concentric with the building, which is what a round
   * room does to a round rug anyway. */
  const RUG0 = M.DOOR_ANG - 2.10, RUG1 = M.DOOR_ANG + 1.15;
  {
    const r0 = M.BORE + 0.30, r1 = M.R_ROOM - 0.55;
    ringArc(r0, r1, RUG0, RUG1, rugMat, F + 0.03);
    arcBand(r1, F, F + 0.055, RUG0, RUG1, rugMat, 30);
  }

  /* THE SOFA IS CURVED, NOT CHOPPED. It was five boxes turned to the
   * tangent and laid round the arc, and boxes on a curve INTERPENETRATE —
   * every joint had one unit's corner buried in the next and the shading
   * tore along the seam, which is what the owner saw. A round room takes a
   * curved sofa: it is arcs of the drum, the same `arcBand` and `ringArc`
   * the building is made of, with the modules read as narrow gaps between
   * the cushions instead of as separate lumps of furniture. */
  // an arc of 1.9 rad at this radius is eight and a half metres of sofa —
  // a BANK of upholstery, not a piece of furniture. 1.2 seats four.
  const SOF0 = M.DOOR_ANG - 0.95, SOF1 = M.DOOR_ANG + 0.25;
  {
    const rIn = M.R_ROOM - 1.60, rOut = M.R_ROOM - 0.62;
    const seatY = F + 0.38, cushY = seatY + 0.20, backY = F + 0.92, armY = F + 0.62;
    const n = Math.round((SOF1 - SOF0) * 14);
    /* A SOFA IS A BOX WITH A BACK, NOT A LEDGE. The first curved one was a
     * plinth with flat plates laid on it: seen from standing height it read
     * as a red shelf with cushions painted on. The back stands 0.54 m over
     * the seat, the cushions are 0.20 thick with a finger's gap between,
     * and there are ARMS — which is most of what tells the eye how big a
     * piece of furniture is. */
    arcBand(rIn, F, seatY, SOF0, SOF1, rustDk, n);                        // the plinth
    ringArc(rIn, rOut, SOF0, SOF1, rustDk, seatY);
    arcBand(rOut, F, backY, SOF0, SOF1, rustDk, n);                       // the back, outside face
    arcBand(rOut - 0.26, seatY, backY, SOF0, SOF1, rustDk, n);            // and inside
    ringArc(rOut - 0.26, rOut, SOF0, SOF1, rustDk, backY);
    for (const [a, sg] of [[SOF0, -1], [SOF1, 1]]) {                      // the arms
      const [ax, az] = at(a + sg * 0.055, (rIn + rOut) / 2);
      const arm = mesh(new THREE.BoxGeometry(rOut - rIn, armY - F, 0.24), rustDk, ax, (F + armY) / 2, az);
      arm.rotation.y = a - Math.PI / 2;
      const [bx2, bz2] = at(a + sg * 0.055, (rIn + rOut) / 2);
      const top = mesh(new THREE.BoxGeometry(rOut - rIn, 0.10, 0.30), rust, bx2, armY + 0.03, bz2);
      top.rotation.y = a - Math.PI / 2;
    }
    // the cushions, sitting in the seat and up the back
    const UNITS = 3, gap = 0.045;
    for (let i = 0; i < UNITS; i++) {
      const a0 = SOF0 + 0.09 + (SOF1 - SOF0 - 0.18) * i / UNITS + gap;
      const a1 = SOF0 + 0.09 + (SOF1 - SOF0 - 0.18) * (i + 1) / UNITS - gap;
      const m2 = i === 1 ? mustard : rust;
      ringArc(rIn + 0.06, rOut - 0.30, a0, a1, m2, cushY);
      arcBand(rIn + 0.06, seatY, cushY, a0, a1, m2, 6);
      arcBand(rOut - 0.30, seatY, cushY, a0, a1, m2, 6);
      const bm = i === 1 ? rust : mustard;
      arcBand(rOut - 0.28, cushY - 0.02, backY - 0.04, a0, a1, bm, 6);
      ringArc(rOut - 0.28, rOut - 0.04, a0, a1, bm, backY - 0.04);
    }
    /* AND ITS COLLIDER REACHES THE GLASS. At the seat's own radius there was
     * a half-metre pocket left between the back of the sofa and the room's
     * outer clamp — no way in but through the furniture, and no way out of
     * it once a knockback or a teleport put you there. Measured: four spots
     * behind it could not be left in any of eight directions. The discs
     * cover the whole depth of it and stop a hand's breadth SHORT of the
     * room's own outer clamp — reach past that and the push-out and the
     * clamp fight over you every frame, which is the same trap wearing the
     * other hat. */
    for (let i = 0; i < 6; i++) room(...at(SOF0 + (SOF1 - SOF0) * i / 5, 4.45), 0.52, 0.95);
    for (const [aa, rr, mm] of [[SOF0 + 0.26, rOut - 0.44, mustard], [SOF1 - 0.28, rOut - 0.44, bone]]) {
      const [cx, cz] = at(aa, rr);
      const c2 = mesh(new THREE.BoxGeometry(0.32, 0.28, 0.13), mm, cx, cushY + 0.20, cz);
      c2.rotation.set(0.30, aa, 0.2);
    }
    const [fx, fz] = at(M.DOOR_ANG - 0.62, 3.1);
    const fc = mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), mustard, fx, F + 0.12, fz);
    fc.rotation.set(0, 0.7, 0.06);
  }

  /* THE GLOBE CHAIRS FACE SOMETHING. They were dropped in at whatever angle
   * their own position happened to give them, so two identical spheres sat
   * in a round room pointing at nothing and at each other — which is the
   * whole of "the furniture doesn't make sense". A chair faces the thing
   * the room is FOR: the pair flank the table across the rug from the sofa,
   * both turned in at it, so the four pieces make one conversation and the
   * sofa's own arc is the far side of it. `face` is the angle its mouth
   * looks along, and it is derived from where the chair stands and where
   * the table is, not chosen. */
  const TAB_A = M.DOOR_ANG - 0.42, TAB_R = 2.85;
  const [tabX, tabZ] = at(TAB_A, TAB_R);
  const ballChair = (a, r, tipped) => {
    const [x, z] = at(a, r);
    const grp = new THREE.Group();
    const R = 0.66, open = 2.0;              // the mouth, a good third of the sphere
    const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 22, 16, open / 2, Math.PI * 2 - open), gloss);
    shell.material = gloss.clone(); shell.material.side = THREE.DoubleSide;
    const lining = new THREE.Mesh(new THREE.SphereGeometry(R - 0.055, 20, 14, open / 2, Math.PI * 2 - open), bone);
    grp.add(shell, lining);
    /* AND A SPHERE WITH A WEDGE OUT OF IT OPENS ON -X, NOT -Z. Three's
     * `phiStart` runs from the -X axis, so the gap a `phiLength` short of a
     * full turn leaves is centred there — and a chair turned as if its
     * mouth were on -Z is a chair facing ninety degrees away from whatever
     * you pointed it at. Both of them were, which is why two chairs in a
     * round room stared past each other. Local -X goes to the world angle
     * `face` at `face + PI/2`, and that is the whole of it. */
    const face = Math.atan2(tabX - x, tabZ - z);
    grp.position.set(x, F + R + 0.30, z);
    grp.rotation.y = face + Math.PI / 2;
    if (!tipped) {
      const cush = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.56), olive);
      cush.position.set(-0.05, -R + 0.28, 0); grp.add(cush);
      cyl(0.30, 0.36, 0.06, chrome, x, F + 0.05, z, 16);
      cyl(0.09, 0.09, 0.34, chrome, x, F + 0.20, z, 12);
    } else {
      grp.rotation.z = 1.42;                                  // over on its side
      grp.position.y = F + R * 0.92;
      const [cx, cz] = at(a + 0.34, r - 0.5);
      const cu = mesh(new THREE.BoxGeometry(0.56, 0.15, 0.46), olive, cx, F + 0.12, cz);
      cu.rotation.set(0, face + 0.6, 0.1);
      const [px2, pz2] = at(a - 0.22, r + 0.30);              // and the pedestal it came off
      const pd = cyl(0.30, 0.36, 0.06, chrome, px2, F + 0.04, pz2, 16);
      pd.rotation.z = 0.5;
    }
    g.add(grp);
    room(x, z, 0.70, 1.4);
  };
  /* BOTH OF THEM ON THEIR FEET. One was over on its side on the rug, and a
   * globe chair lying down is a smooth orange sphere with its mouth in the
   * floor: from anywhere in the room it read as a beach ball somebody had
   * left, which is not what a chair is for. Upright and turned in at the
   * table they are unmistakably chairs, and the pair of them makes the
   * shape of the room's one good idea. */
  ballChair(TAB_A - 0.92, 3.55, false);
  ballChair(TAB_A + 0.86, 3.50, false);

  // the low table between them: smoked glass on a chrome drum, and what is
  // still on it after thirty years of nobody
  {
    cyl(0.30, 0.38, 0.36, chrome, tabX, F + 0.20, tabZ, 18);
    cyl(0.86, 0.86, 0.05, smoke, tabX, F + 0.40, tabZ, 26);
    // the rim is a BAND round the glass, not a plate laid over it
    mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.07, 26, 1, true), chrome, tabX, F + 0.405, tabZ);
    cyl(0.055, 0.075, 0.13, bone, tabX + 0.30, F + 0.49, tabZ - 0.12, 10);
    box(0.26, 0.03, 0.20, mustard, tabX - 0.22, F + 0.44, tabZ + 0.16, 0.5);
    box(0.24, 0.02, 0.19, olive, tabX - 0.18, F + 0.465, tabZ + 0.20, 0.9);
    cyl(0.11, 0.11, 0.07, gloss, tabX + 0.05, F + 0.46, tabZ + 0.30, 10);
    room(tabX, tabZ, 0.9, 0.45);
  }

  /* The credenza, low against the glass on the cliff side: teak on splayed
   * legs with the deck on it and the records that came off the shelf. Its
   * top is at 1.01 m, which is above the 0.75 m sill — the one thing in
   * the room that breaks the band, and it earns it, because this is the
   * corner that says a person was here. */
  {
    const a = 2.30, r = M.R_ROOM - 0.80, [cx, cz] = at(a, r), ry = a - Math.PI / 2;
    box(1.90, 0.62, 0.46, teak, cx, F + 0.68, cz, ry);
    box(1.94, 0.05, 0.50, teak, cx, F + 1.01, cz, ry);
    for (const t of [-0.78, -0.26, 0.26, 0.78]) {
      box(0.03, 0.16, 0.03, chrome, cx + Math.cos(ry) * t - Math.sin(ry) * 0.24, F + 0.72, cz - Math.sin(ry) * t - Math.cos(ry) * 0.24, ry);
    }
    for (const [sx2, sz2] of [[-0.84, 0.17], [0.84, 0.17], [-0.84, -0.17], [0.84, -0.17]]) {
      const lx = cx + Math.cos(ry) * sx2 + Math.sin(ry) * sz2, lz = cz - Math.sin(ry) * sx2 + Math.cos(ry) * sz2;
      const lg = cyl(0.028, 0.04, 0.37, teak, lx, F + 0.185, lz, 8); lg.rotation.z = sx2 > 0 ? -0.12 : 0.12;
    }
    box(0.60, 0.11, 0.42, teak, cx, F + 1.09, cz, ry);
    cyl(0.15, 0.15, 0.015, chrome, cx - Math.cos(ry) * 0.06, F + 1.155, cz + Math.sin(ry) * 0.06, 18);
    cyl(0.148, 0.148, 0.006, dark, cx - Math.cos(ry) * 0.06, F + 1.165, cz + Math.sin(ry) * 0.06, 18);
    const lid = mesh(new THREE.BoxGeometry(0.60, 0.015, 0.42), smoke, cx, F + 1.31, cz - 0.16);
    lid.rotation.set(-0.9, ry, 0);
    box(0.02, 0.02, 0.22, chrome, cx + Math.cos(ry) * 0.22, F + 1.18, cz - Math.sin(ry) * 0.22, ry + 0.5);
    for (let i = 0; i < 3; i++) {
      const tx2 = sleeveTexture(i + 1);
      const sl = new THREE.MeshStandardMaterial({ map: tx2, roughness: 1, emissive: 0x6e6248, emissiveMap: tx2, emissiveIntensity: 1.25, side: THREE.DoubleSide });
      const off = -0.55 + i * 0.14;
      const s2 = mesh(new THREE.BoxGeometry(0.31, 0.31, 0.012), sl, cx + Math.cos(ry) * off - Math.sin(ry) * 0.32, F + 0.17, cz - Math.sin(ry) * off - Math.cos(ry) * 0.32);
      s2.rotation.set(0.30, ry, 0);
    }
    for (let i = 0; i < 4; i++) {
      const tx2 = sleeveTexture(i + 4);
      const sl = new THREE.MeshStandardMaterial({ map: tx2, roughness: 1, emissive: 0x4a4030, emissiveMap: tx2, emissiveIntensity: 1.0, side: THREE.DoubleSide });
      const aa = a - 0.42 - i * 0.15, rr = M.R_ROOM - 1.6 - (i % 2) * 0.4;
      const s2 = mesh(new THREE.PlaneGeometry(0.31, 0.31).rotateX(-Math.PI / 2), sl, ...(([xx, zz]) => [xx, F + 0.012 + i * 0.004, zz])(at(aa, rr)));
      s2.rotation.y = aa * 1.7;
    }
    { const [dx2, dz2] = at(a - 0.86, M.R_ROOM - 2.1);
      cyl(0.145, 0.145, 0.004, dark, dx2, F + 0.014, dz2, 20);
      cyl(0.05, 0.05, 0.005, gloss, dx2, F + 0.017, dz2, 12); }
    room(cx, cz, 1.0, 1.1);
  }

  /* And a long low sideboard round the rest of the cliff side, where the
   * paper used to be: waist-high shelving in the same teak, open, with the
   * books gone soft and the plants that were somebody's kept on it. It
   * fills a wall that is now all glass without standing in front of any of
   * it — nothing on it reaches the sill. */
  {
    const a0 = 2.95, a1 = 4.15, rIn = M.R_ROOM - 0.62, rOut = M.R_ROOM - 0.18;
    const n = Math.round((a1 - a0) * 12);
    for (const y of [F + 0.02, F + 0.36, F + 0.70]) ringArc(rIn, rOut, a0, a1, teak, y);
    arcBand(rIn, F, F + 0.70, a0, a1, teak, n);
    for (let i = 0; i <= 4; i++) {                       // the uprights
      const aa = a0 + (a1 - a0) * i / 4, [ux, uz] = at(aa, (rIn + rOut) / 2);
      const u = mesh(new THREE.BoxGeometry(rOut - rIn, 0.70, 0.05), teak, ux, F + 0.35, uz);
      u.rotation.y = aa - Math.PI / 2;
    }
    for (let i = 0; i < 14; i++) {                       // books, leaning
      const aa = a0 + 0.10 + (a1 - a0 - 0.2) * (i / 14) + (i % 3) * 0.008;
      const [bx, bz] = at(aa, (rIn + rOut) / 2 + ((i % 2) ? 0.02 : -0.02));
      const bk = mesh(new THREE.BoxGeometry(0.16, 0.19 + (i % 4) * 0.03, 0.030 + (i % 3) * 0.008),
        [rust, mustard, olive, bone, teak][i % 5], bx, F + (i % 2 ? 0.47 : 0.13), bz);
      bk.rotation.set(0, aa - Math.PI / 2, i === 6 || i === 11 ? 0.42 : 0);
    }
    for (let i = 0; i < 5; i++) room(...at(a0 + (a1 - a0) * i / 4, (rIn + rOut) / 2), 0.42, 0.75);
  }

  // the set, on its own legs, low against the glass across from the sofa
  {
    const a = 0.30, r = M.R_ROOM - 1.15, [tx, tz] = at(a, r), ry = a - Math.PI / 2;
    box(0.86, 0.62, 0.52, teak, tx, F + 0.74, tz, ry);
    const scr = box(0.62, 0.44, 0.03, dark, tx - Math.sin(ry) * 0.27, F + 0.78, tz - Math.cos(ry) * 0.27, ry);
    scr.material = new THREE.MeshStandardMaterial({ color: 0x22282e, roughness: 0.28, metalness: 0.1, emissive: 0x0d1218 });
    box(0.10, 0.30, 0.03, bone, tx - Math.sin(ry) * 0.27 + Math.cos(ry) * 0.36, F + 0.78, tz - Math.cos(ry) * 0.27 - Math.sin(ry) * 0.36, ry);
    for (const [sx2, sz2] of [[-0.34, 0.19], [0.34, 0.19], [-0.34, -0.19], [0.34, -0.19]]) {
      const lx = tx + Math.cos(ry) * sx2 + Math.sin(ry) * sz2, lz = tz - Math.sin(ry) * sx2 + Math.cos(ry) * sz2;
      const lg = cyl(0.022, 0.03, 0.42, teak, lx, F + 0.21, lz, 8); lg.rotation.z = sx2 > 0 ? -0.16 : 0.16; lg.rotation.x = sz2 > 0 ? -0.1 : 0.1;
    }
    room(tx, tz, 0.55, 1.1);
  }

  // a dome lamp on a chrome stem, standing at the sofa's end
  {
    const a = SOF0 - 0.22, r = M.R_ROOM - 1.05, [lx, lz] = at(a, r);
    cyl(0.24, 0.30, 0.04, chrome, lx, F + 0.03, lz, 16);
    cyl(0.022, 0.022, 1.42, chrome, lx, F + 0.73, lz, 8);
    const shade = mesh(new THREE.SphereGeometry(0.30, 18, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), gloss, lx, F + 1.44, lz);
    shade.material = gloss.clone(); shade.material.side = THREE.DoubleSide;
  }

  // the pendant over the well, dead, and the ball nobody took down
  {
    cyl(0.012, 0.012, 0.62, iron, 0, roofY - 0.31, 0, 6);
    const sh = mesh(new THREE.CylinderGeometry(0.02, 0.26, 0.30, 20, 1, true), bone, 0, roofY - 0.76, 0);
    sh.material = bone.clone(); sh.material.side = THREE.DoubleSide;
    const [bx, bz] = at(M.DOOR_ANG - 0.7, 1.5);
    cyl(0.008, 0.008, 0.46, iron, bx, roofY - 0.23, bz, 6);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, roughness: 0.42, metalness: 0.16, flatShading: true, emissive: 0x3e4654 });
    mesh(new THREE.IcosahedronGeometry(0.20, 2), ballMat, bx, roofY - 0.62, bz);
  }

  // a pouffe, and the palm somebody kept alive up here for a while
  {
    const [px, pz] = at(M.DOOR_ANG - 1.05, 2.15);
    cyl(0.34, 0.36, 0.34, mustard, px, F + 0.17, pz, 14);
    room(px, pz, 0.38, 0.35);
    const [qx, qz] = at(0.95, M.R_ROOM - 0.85);
    cyl(0.26, 0.20, 0.42, teak, qx, F + 0.21, qz, 12);
    for (let i = 0; i < 7; i++) {
      const la = i / 7 * TAU, len = 0.5 + (i % 3) * 0.18;
      const lf = mesh(new THREE.BoxGeometry(len, 0.02, 0.10), olive, qx + Math.sin(la) * len * 0.42, F + 0.55 + (i % 2) * 0.12, qz + Math.cos(la) * len * 0.42);
      lf.rotation.set(0, la - Math.PI / 2, -0.55 - (i % 3) * 0.2);
      lf.material = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 1, flatShading: true, emissive: 0x201a0a });
    }
    room(qx, qz, 0.3, 0.6);
  }

  { /* the beach, coming in. A drift of sand under each bay whose panes are
     * gone, thinning inward — the one thing in the room that was not put
     * there by anybody. */
    const drift = new THREE.MeshStandardMaterial({ color: 0x8f9099, roughness: 1, metalness: 0, flatShading: true, emissive: 0x33373f });
    for (const am of shardAt.slice(0, 7)) {
      const [dx2, dz2] = at(am, M.R_ROOM - 0.42);
      const dr = mesh(new THREE.SphereGeometry(0.62, 12, 6, 0, TAU, 0, Math.PI / 2), drift, dx2, F + 0.005, dz2);
      dr.scale.set(1.5, 0.10, 0.62); dr.rotation.y = am;
    }
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
    /* THE SIGN THAT MIRRORED THE STAIR. rotation.y = π/2 - a put every tread
     * at angle π - a, so the treads you could see wound the opposite way
     * from the treads you could walk on and from the rail: you climbed
     * invisible steps beside the visible ones and could not find the way
     * down. a - π/2 is the rotation that sends the wedge's centreline to
     * (sin a, 0, cos a), the game's angle. */
    const tr = new THREE.Mesh(treadGeo, pale);
    tr.position.set(0, y, 0); tr.rotation.y = a - Math.PI / 2;
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
  return { group: g, colliders, gate: gateInfo };
}
