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
function wallpaperTexture(seed) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rnd = lcg(seed);
  g.fillStyle = '#3a1c12'; g.fillRect(0, 0, S, S);
  for (let ry = 0; ry < 2; ry++) for (let rx = 0; rx < 2; rx++) {
    const cx = rx * S / 2 + S / 4, cy = ry * S / 2 + S / 4;
    const cols = ['#c2521c', '#e08a2a', '#efc043', '#8f2f16'];
    for (let k = 0; k < 4; k++) { g.fillStyle = cols[k]; g.beginPath(); g.arc(cx, cy, S / 4 * (1 - k * 0.22), 0, 7); g.fill(); }
    g.fillStyle = '#2a1109'; g.beginPath(); g.arc(cx + 6, cy - 4, S / 26, 0, 7); g.fill();
  }
  // sun-bleached down one side, and the grime of a long time shut up
  const bl = g.createLinearGradient(0, 0, S, 0);
  bl.addColorStop(0, 'rgba(230,226,208,0.30)'); bl.addColorStop(0.55, 'rgba(230,226,208,0.04)'); bl.addColorStop(1, 'rgba(20,14,10,0.22)');
  g.fillStyle = bl; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(30,20,14,${0.03 + rnd() * 0.1})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 4, 1 + rnd() * 4); }
  return retro(c);
}
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
  // the gate: bars in a frame, hanging a third open on one post
  {
    const w = 1.35, h = 2.0, gate = new THREE.Group();
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
    pivot.rotation.y = 1.35; pivot.add(gate); g.add(pivot);
    /* AND THE GATE IS IRON, NOT A PICTURE OF IT. It hung a third open across
     * the way in and you walked straight through the bars. Its leaf carries
     * discs down its length in the world it actually swung to, and the two
     * posts are solid — which is what makes the opening a DOORWAY rather
     * than a hole with decoration beside it. */
    for (let i = 0; i <= 4; i++) {
      const t = i / 4 * w;
      colliders.push({ x: px + Math.sin(1.35) * t, z: pz + Math.cos(1.35) * t, r: 0.12, top: M.PLAT_TOP + h, mat: 'wood' });
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
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, len = M.R_ROOM - 0.25;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.14), pale);
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
  /* AND A ROOM WITH NO LIGHT IN IT IS NOT A ROOM. Everything up here was
   * built and then could not be seen: one directional moon outside a band
   * of glass leaves an interior that renders as a black drum, and no amount
   * of colour on a sofa survives that. Four lamps, all COLD and all weak,
   * hung under the ceiling round the ring — they are the moon coming
   * through the missing panes and bouncing off a pale concrete dish, which
   * is what it would actually do, and they are inside the group so the far
   * cull switches them off with everything else. The one warm one is over
   * the credenza and is what makes the corner read as somebody's room
   * rather than a ruin. */
  /* THREE, NOT TEN. Every light in a scene is a shader define, and a group
   * that switches ten of them on as you walk up to it makes three
   * recompile every material in the game at the worst possible moment.
   * Three round the ceiling at a long range do what ten did. */
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + 0.5;
    const L = new THREE.PointLight(0x9fbde8, 7.0, 20, 2);
    L.position.set(Math.sin(a) * 3.3, roofY - 0.75, Math.cos(a) * 3.3);
    g.add(L);
  }
  { const L = new THREE.PointLight(0x7d99c4, 2.6, 13, 2); L.position.set(Math.sin(4.6) * 4.3, M.H_ROOM + 1.05, Math.cos(4.6) * 4.3); g.add(L); }
  { const L = new THREE.PointLight(0xe8a860, 1.7, 9, 2); L.position.set(Math.sin(2.7) * 4.0, M.H_ROOM + 1.6, Math.cos(2.7) * 4.0); g.add(L); }
  { const L = new THREE.PointLight(0x86a6d8, 1.1, 10, 2); L.position.set(0, M.H_ROOM + 1.1, 0); g.add(L); }
  /* AND A PATTERN HAS TO BE TOLD HOW BIG IT IS. Hung with the stock 0..1
   * uv, the paper's four bullseyes stretched over fifteen metres of wall
   * and came out as an orange smear — the drawing was there and none of it
   * could be seen. Every map in here carries a `repeat` worked out from the
   * real size of the thing it is on, so a bullseye is about a metre across
   * and reads from the other side of the room. */
  const paperTex = wallpaperTexture(3); paperTex.repeat.set(4.2, 0.8);
  const paper = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 1, metalness: 0, emissive: 0x7a5430, emissiveMap: paperTex, emissiveIntensity: 0.75, side: THREE.DoubleSide });
  const rugTex = rugTexture(5);
  const rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, metalness: 0, emissive: 0x6e4220, emissiveMap: rugTex, emissiveIntensity: 0.85, side: THREE.DoubleSide });
  const teakTex = woodTexture(9); teakTex.repeat.set(2.2, 2.2);
  const teak = new THREE.MeshStandardMaterial({ map: teakTex, color: 0xb08256, roughness: 0.72, metalness: 0, flatShading: true, emissive: 0x50301a, emissiveMap: teakTex, emissiveIntensity: 1.0 });
  const rust = new THREE.MeshStandardMaterial({ color: 0xb84c1e, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x54200c });
  const mustard = new THREE.MeshStandardMaterial({ color: 0xd09a28, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x584010 });
  const olive = new THREE.MeshStandardMaterial({ color: 0x767c3a, roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x2e3416 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xdccfb0, roughness: 0.9, metalness: 0, flatShading: true, emissive: 0x565040 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb4bcc8, roughness: 0.34, metalness: 0.22, flatShading: true, emissive: 0x424b58 });
  const gloss = new THREE.MeshStandardMaterial({ color: 0xe05e2c, roughness: 0.42, metalness: 0.05, flatShading: true, emissive: 0x5c2410 });
  const smoke = new THREE.MeshPhysicalMaterial({ color: 0x241d16, roughness: 0.42, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0e0b08 });
  const box = (w, h, d, mat, x, y, z, ry) => { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z); if (ry) m.rotation.y = ry; return m; };
  const cyl = (r0, r1, h, mat, x, y, z, n) => mesh(new THREE.CylinderGeometry(r0, r1, h, n || 12), mat, x, y, z);
  const F = M.H_ROOM;                                   // the room's floor
  // a collider that only exists UP HERE: `floorY` is the head-height gate the
  // push-out already reads, so a sofa five metres up is not a wall on the
  // sand under it. Nothing in the room is a floor — you walk round it.
  const room = (x, z, r, h) => colliders.push({ x, z, r, top: F + h, floorY: F - 0.8, mat: 'wood' });

  { // the terrazzo, laid right out to the glass and up over the sill's edge
    const terTex = terrazzoTexture(21); terTex.repeat.set(7, 7);
    const ter = new THREE.MeshStandardMaterial({ map: terTex, roughness: 0.82, metalness: 0, emissive: 0x3c4048, emissiveMap: terTex, emissiveIntensity: 0.95, side: THREE.DoubleSide });
    mesh(new THREE.RingGeometry(M.BORE, M.R_ROOM - 0.02, 56).rotateX(-Math.PI / 2), ter, 0, F + 0.006, 0);
  }
  /* PAPERED OVER, ON THE CLIFF SIDE. The windows face a sand wall a metre
   * away on the +X arc: there was never anything to look at, so that is
   * where the paper went and where the furniture that wants a wall stands.
   * It also gives the room the one thing a drum of glass cannot — a BACK. */
  const pap0 = 1.35, pap1 = 4.05;
  arcBand(M.R_ROOM - 0.10, F + 0.02, roofY - 0.06, pap0, pap1, paper, 26);
  for (let i = 0; i <= 5; i++) {                        // battens at the joins
    const a = pap0 + (pap1 - pap0) * i / 5;
    const bt = mesh(new THREE.BoxGeometry(0.05, roofY - F - 0.08, 0.05), teak, Math.sin(a) * (M.R_ROOM - 0.14), (F + roofY) / 2, Math.cos(a) * (M.R_ROOM - 0.14));
    bt.rotation.y = a;
  }
  { // one length peeled off the top and hanging forward
    const a = pap0 + 0.62;
    const pl = mesh(new THREE.PlaneGeometry(0.5, 1.1), paper, Math.sin(a) * (M.R_ROOM - 0.30), roofY - 0.62, Math.cos(a) * (M.R_ROOM - 0.30));
    pl.rotation.set(-0.42, a + Math.PI, 0);
  }

  /* The rug: a SECTOR of the ring, not a disc. A disc big enough to matter
   * in an eleven-metre room lay straight over the open well in the middle
   * of it, floating across the hole you climb up through; a sector clears
   * the well by construction, follows the room the way everything else in
   * here does, and puts the wave pattern's own rings concentric with the
   * building — which is what a round room does to a round rug anyway. */
  {
    const r0 = M.BORE + 0.30, r1 = M.R_ROOM - 0.55;
    ringArc(r0, r1, M.DOOR_ANG - 2.10, M.DOOR_ANG + 1.15, rugMat, F + 0.03);
    // the pile has an edge you can see across the room
    arcBand(r1, F, F + 0.055, M.DOOR_ANG - 2.10, M.DOOR_ANG + 1.15, rugMat, 30);
  }

  /* The sofa: a MODULAR arc, which is what the seventies did with a curved
   * room — four boxy units in burnt orange run round the seaward glass,
   * facing in at the well, with the cushions gone soft and one on the
   * floor. It replaces the pale concrete bench that used to sit here and
   * that nobody could tell from the building. */
  {
    const b0 = M.DOOR_ANG - 1.30, b1 = M.DOOR_ANG + 0.62, units = 5;
    const rMid = M.R_ROOM - 1.02, seatH = 0.40;
    for (let i = 0; i < units; i++) {
      const a = b0 + (b1 - b0) * (i + 0.5) / units;
      const sx = Math.sin(a), cz = Math.cos(a);
      const wUnit = (b1 - b0) / units * rMid + 0.06;
      box(0.98, seatH, wUnit, rust, sx * rMid, F + seatH / 2 + 0.06, cz * rMid, a - Math.PI / 2);          // the base
      box(0.92, 0.20, wUnit - 0.10, i === 2 ? mustard : rust, sx * rMid, F + seatH + 0.16, cz * rMid, a - Math.PI / 2);   // the seat cushion
      box(0.30, 0.66, wUnit, rust, sx * (rMid + 0.40), F + 0.52, cz * (rMid + 0.40), a - Math.PI / 2);      // the back
      if (i === 1 || i === 3) box(0.30, 0.30, 0.34, i === 1 ? mustard : bone, sx * (rMid + 0.16), F + 0.74, cz * (rMid + 0.16), a - Math.PI / 2 + 0.4);   // a scatter cushion
      room(sx * rMid, cz * rMid, 0.56, 0.7);
    }
    // and one cushion on the rug, where it fell
    const fa = M.DOOR_ANG - 0.5;
    box(0.42, 0.16, 0.42, mustard, Math.sin(fa) * 2.6, F + 0.14, Math.cos(fa) * 2.6, 0.8);
  }

  /* The globe chair — the one piece everybody pictures when they hear the
   * decade. Two of them: one square on its pedestal facing the sea, one
   * over on its side on the rug with the pedestal off it. */
  const ballChair = (x, z, face, tipped) => {
    const grp = new THREE.Group();
    const R = 0.66, open = 2.0;              // the mouth, a good third of the sphere
    const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 22, 16, open / 2, Math.PI * 2 - open), gloss);
    const lining = new THREE.Mesh(new THREE.SphereGeometry(R - 0.055, 20, 14, open / 2, Math.PI * 2 - open), bone);
    shell.material.side = THREE.DoubleSide;
    grp.add(shell, lining);
    if (!tipped) { const cush = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.15, 0.46), olive); cush.position.set(0, -R + 0.28, 0.04); grp.add(cush); }
    grp.position.set(x, F + R + 0.30, z);
    grp.rotation.y = face;
    if (tipped) {
      grp.rotation.z = 1.5; grp.position.y = F + R * 0.90;
      // and its cushion is out on the rug where it fell
      const cu = mesh(new THREE.BoxGeometry(0.56, 0.15, 0.46), olive, x + Math.sin(face) * 0.85, F + 0.12, z + Math.cos(face) * 0.85);
      cu.rotation.set(0, face + 0.6, 0.12);
    } else {
      cyl(0.30, 0.36, 0.06, chrome, x, F + 0.05, z, 16);
      cyl(0.09, 0.09, 0.34, chrome, x, F + 0.20, z, 12);
    }
    g.add(grp);
    room(x, z, 0.72, 1.4);
    return grp;
  };
  /* THE ROOM IS LAID OUT SO NOTHING STANDS IN ANYTHING ELSE, and the head
   * of the stair (`TOP_ANG`, about 1.98 rad) is left clear — you arrive in
   * a room, not in the back of a sofa. Going round: the set at 0.3, the
   * palm at 0.85, the stair at 1.98, the credenza at 2.7, the lamp at 3.3,
   * the sofa's arc from 3.4 to 5.3, and the two globe chairs seaward of it,
   * one on its pedestal and one over on the rug. */
  ballChair(Math.sin(5.62) * 3.35, Math.cos(5.62) * 3.35, 5.62 + Math.PI + 0.5, false);
  ballChair(Math.sin(0.55) * 3.30, Math.cos(0.55) * 3.30, 0.55 + 2.3, true);

  // the low table: smoked glass on a chrome drum, and what is still on it
  {
    const a = M.DOOR_ANG - 0.30, r = 2.35, tx = Math.sin(a) * r, tz = Math.cos(a) * r;
    cyl(0.30, 0.38, 0.36, chrome, tx, F + 0.20, tz, 18);
    cyl(0.86, 0.86, 0.05, smoke, tx, F + 0.40, tz, 26);
    // the rim is a BAND round the glass, not a plate laid over it — as a
    // disc it hid the smoked top under a metre of bright chrome
    mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.07, 26, 1, true), chrome, tx, F + 0.405, tz);
    cyl(0.055, 0.075, 0.13, bone, tx + 0.30, F + 0.49, tz - 0.12, 10);          // a cup, still there
    box(0.26, 0.03, 0.20, mustard, tx - 0.22, F + 0.44, tz + 0.16, 0.5);        // a magazine
    box(0.24, 0.02, 0.19, olive, tx - 0.18, F + 0.465, tz + 0.20, 0.9);
    cyl(0.11, 0.11, 0.07, gloss, tx + 0.05, F + 0.46, tz + 0.30, 10);           // and the ashtray
    room(tx, tz, 0.9, 0.45);
  }

  /* The credenza, against the paper: teak, on splayed legs, with the deck
   * on it and the records that came off the shelf when somebody left in a
   * hurry. This is the corner that says a person was here. */
  {
    const a = 2.7, r = M.R_ROOM - 0.78, cx = Math.sin(a) * r, cz = Math.cos(a) * r, ry = a - Math.PI / 2;
    box(1.90, 0.62, 0.46, teak, cx, F + 0.68, cz, ry);
    box(1.94, 0.05, 0.50, teak, cx, F + 1.01, cz, ry);                          // the top
    for (const t of [-0.78, -0.26, 0.26, 0.78]) {                               // the sliding door pulls
      const lx = cx + Math.sin(ry) * 0 + Math.cos(ry) * t, lz = cz - Math.sin(ry) * t;
      box(0.03, 0.16, 0.03, chrome, lx, F + 0.72, lz + Math.cos(ry) * 0.24, ry);
    }
    for (const [sx2, sz2] of [[-0.84, 0.17], [0.84, 0.17], [-0.84, -0.17], [0.84, -0.17]]) {
      const lx = cx + Math.cos(ry) * sx2 + Math.sin(ry) * sz2, lz = cz - Math.sin(ry) * sx2 + Math.cos(ry) * sz2;
      const lg = cyl(0.028, 0.04, 0.37, teak, lx, F + 0.185, lz, 8); lg.rotation.z = sx2 > 0 ? -0.12 : 0.12;
    }
    // the deck: a plinth, a smoked lid up on its hinge, a platter and an arm
    box(0.60, 0.11, 0.42, teak, cx, F + 1.09, cz, ry);
    cyl(0.15, 0.15, 0.015, chrome, cx - Math.cos(ry) * 0.06, F + 1.155, cz + Math.sin(ry) * 0.06, 18);
    cyl(0.148, 0.148, 0.006, dark, cx - Math.cos(ry) * 0.06, F + 1.165, cz + Math.sin(ry) * 0.06, 18);
    const lid = mesh(new THREE.BoxGeometry(0.60, 0.015, 0.42), smoke, cx, F + 1.31, cz - 0.16);
    lid.rotation.set(-0.9, ry, 0);
    const arm = box(0.02, 0.02, 0.22, chrome, cx + Math.cos(ry) * 0.22, F + 1.18, cz - Math.sin(ry) * 0.22, ry + 0.5);
    // records: three leaning against it, four fanned on the floor
    for (let i = 0; i < 3; i++) {
      const sl = new THREE.MeshStandardMaterial({ map: sleeveTexture(i + 1), roughness: 1, emissive: 0x4a4030, emissiveMap: sleeveTexture(i + 1), emissiveIntensity: 1.0, side: THREE.DoubleSide });
      const off = -0.55 + i * 0.14;
      const s2 = mesh(new THREE.BoxGeometry(0.31, 0.31, 0.012), sl, cx + Math.cos(ry) * off - Math.sin(ry) * 0.32, F + 0.17, cz - Math.sin(ry) * off - Math.cos(ry) * 0.32);
      s2.rotation.set(0.30, ry, 0);
    }
    for (let i = 0; i < 4; i++) {
      const sl = new THREE.MeshStandardMaterial({ map: sleeveTexture(i + 4), roughness: 1, emissive: 0x4a4030, emissiveMap: sleeveTexture(i + 4), emissiveIntensity: 1.0, side: THREE.DoubleSide });
      const aa = a - 0.45 - i * 0.16, rr = M.R_ROOM - 1.5 - (i % 2) * 0.35;
      const s2 = mesh(new THREE.PlaneGeometry(0.31, 0.31).rotateX(-Math.PI / 2), sl, Math.sin(aa) * rr, F + 0.012 + i * 0.004, Math.cos(aa) * rr);
      s2.rotation.y = aa * 1.7;
    }
    { const aa = a - 0.9;                                                        // and one disc out of its sleeve
      cyl(0.145, 0.145, 0.004, dark, Math.sin(aa) * (M.R_ROOM - 2.0), F + 0.014, Math.cos(aa) * (M.R_ROOM - 2.0), 20);
      cyl(0.05, 0.05, 0.005, gloss, Math.sin(aa) * (M.R_ROOM - 2.0), F + 0.017, Math.cos(aa) * (M.R_ROOM - 2.0), 12); }
    room(cx, cz, 1.0, 1.1);
  }

  // the set, on its own legs, facing the sofa across the rug
  {
    const a = 0.30, r = M.R_ROOM - 1.15, tx = Math.sin(a) * r, tz = Math.cos(a) * r, ry = a - Math.PI / 2;
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

  // a dome lamp on a chrome stem, and a mushroom lamp on the credenza end
  {
    const a = 3.30, r = M.R_ROOM - 0.95, lx = Math.sin(a) * r, lz = Math.cos(a) * r;
    cyl(0.24, 0.30, 0.04, chrome, lx, F + 0.03, lz, 16);
    cyl(0.022, 0.022, 1.42, chrome, lx, F + 0.73, lz, 8);
    // the dome: half a sphere, mouth down, in the orange everything else is
    const shade = mesh(new THREE.SphereGeometry(0.30, 18, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), gloss, lx, F + 1.44, lz);
    shade.material = shade.material.clone(); shade.material.side = THREE.DoubleSide;
  }

  // the pendant over the well, dead, and the ball nobody took down
  {
    cyl(0.012, 0.012, 0.62, iron, 0, roofY - 0.31, 0, 6);
    const sh = mesh(new THREE.CylinderGeometry(0.02, 0.26, 0.30, 20, 1, true), bone, 0, roofY - 0.76, 0);
    sh.material.side = THREE.DoubleSide;
    const a = M.DOOR_ANG - 0.7;
    cyl(0.008, 0.008, 0.46, iron, Math.sin(a) * 1.5, roofY - 0.23, Math.cos(a) * 1.5, 6);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, roughness: 0.42, metalness: 0.16, flatShading: true, emissive: 0x3e4654 });
    mesh(new THREE.IcosahedronGeometry(0.20, 2), ballMat, Math.sin(a) * 1.5, roofY - 0.62, Math.cos(a) * 1.5);
  }

  // a pouffe, a dead palm in its pot, and the drift of sand that has come
  // in through the missing panes — the room is open to the weather now
  {
    const a = M.DOOR_ANG - 0.95;
    cyl(0.34, 0.36, 0.34, mustard, Math.sin(a) * 2.0, F + 0.17, Math.cos(a) * 2.0, 14);
    room(Math.sin(a) * 2.0, Math.cos(a) * 2.0, 0.38, 0.35);
    const pa = 0.85, pr = M.R_ROOM - 0.9, px = Math.sin(pa) * pr, pz = Math.cos(pa) * pr;
    cyl(0.26, 0.20, 0.42, teak, px, F + 0.21, pz, 12);
    for (let i = 0; i < 7; i++) {
      const la = i / 7 * Math.PI * 2, len = 0.5 + (i % 3) * 0.18;
      const lf = mesh(new THREE.BoxGeometry(len, 0.02, 0.10), olive, px + Math.sin(la) * len * 0.42, F + 0.55 + (i % 2) * 0.12, pz + Math.cos(la) * len * 0.42);
      lf.rotation.set(0, la - Math.PI / 2, -0.55 - (i % 3) * 0.2);
      lf.material = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 1, flatShading: true, emissive: 0x201a0a });
    }
    room(px, pz, 0.3, 0.6);
  }
  /* AND THE THINGS THAT SAY A PERSON LIVED HERE. A room with furniture in
   * it is a showroom; what makes it somebody's is the small stuff nobody
   * would ever choose to put in a game — a clock that stopped, a poster
   * they liked, a shelf of paperbacks gone to nothing. And then the beach
   * coming in through the panes that are gone, which is the other half of
   * the sentence: this WAS a home. */
  { // the sunburst clock, over the credenza, stopped
    const a = 2.32, r = M.R_ROOM - 0.22, cx = Math.sin(a) * r, cy = F + 1.95, cz = Math.cos(a) * r;
    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.5, metalness: 0.2, flatShading: true, emissive: 0x453214 });
    for (let i = 0; i < 16; i++) {
      const ra = i / 16 * TAU, len = 0.20 + (i % 2) * 0.13;
      const ry2 = mesh(new THREE.BoxGeometry(len, 0.022, 0.022), brass, cx, cy, cz);
      ry2.rotation.set(0, a, ra);
      ry2.position.x += Math.cos(ra) * (len / 2 + 0.12) * Math.cos(a);
      ry2.position.z -= Math.cos(ra) * (len / 2 + 0.12) * Math.sin(a);
      ry2.position.y += Math.sin(ra) * (len / 2 + 0.12);
    }
    const face = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 18), teak, cx, cy, cz);
    face.rotation.set(Math.PI / 2, 0, a);
    for (const [ln, aa] of [[0.10, 1.1], [0.13, 3.9]]) {
      const h = mesh(new THREE.BoxGeometry(ln, 0.012, 0.012), brass, cx - Math.sin(a) * 0.03, cy, cz - Math.cos(a) * 0.03);
      h.rotation.set(0, a, aa); h.position.x += Math.cos(aa) * ln / 2 * Math.cos(a); h.position.z -= Math.cos(aa) * ln / 2 * Math.sin(a); h.position.y += Math.sin(aa) * ln / 2;
    }
  }
  { // a poster, gone soft at one corner
    const a = 3.62, r = M.R_ROOM - 0.14;
    const pm = new THREE.MeshStandardMaterial({ map: sleeveTexture(2), roughness: 1, emissive: 0x4a4030, emissiveMap: sleeveTexture(2), emissiveIntensity: 1.0, side: THREE.DoubleSide });
    const po = mesh(new THREE.PlaneGeometry(0.86, 1.15), pm, Math.sin(a) * r, F + 1.75, Math.cos(a) * r);
    po.rotation.set(0.04, a + Math.PI, 0.05);
  }
  { // the shelf on the paper, and what is still standing on it
    const a = 3.12, r = M.R_ROOM - 0.30, sx = Math.sin(a) * r, sz = Math.cos(a) * r, ry = a - Math.PI / 2;
    box(1.30, 0.04, 0.24, teak, sx, F + 1.28, sz, ry);
    box(1.30, 0.04, 0.24, teak, sx, F + 1.72, sz, ry);
    for (const [sh, n] of [[1.34, 9], [1.78, 6]]) for (let i = 0; i < n; i++) {
      const t = -0.52 + i * 0.115 + (i % 3) * 0.01, lean = (i === n - 1) ? 0.5 : 0;
      const bk = mesh(new THREE.BoxGeometry(0.028 + (i % 3) * 0.008, 0.20 + (i % 4) * 0.03, 0.15),
        [rust, mustard, olive, bone, teak][i % 5], sx + Math.cos(ry) * t, F + sh + 0.11, sz - Math.sin(ry) * t);
      bk.rotation.set(0, ry, lean);
    }
  }
  { /* the beach, coming in. A drift of sand under each bay whose panes are
     * gone, thinning inward — the one thing in the room that was not put
     * there by anybody. */
    const drift = new THREE.MeshStandardMaterial({ color: 0x8f9099, roughness: 1, metalness: 0, flatShading: true, emissive: 0x33373f });
    for (const am of shardAt.slice(0, 7)) {
      const dr = mesh(new THREE.SphereGeometry(0.62, 12, 6, 0, TAU, 0, Math.PI / 2), drift,
        Math.sin(am) * (M.R_ROOM - 0.42), F + 0.005, Math.cos(am) * (M.R_ROOM - 0.42));
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
  return { group: g, colliders };
}
