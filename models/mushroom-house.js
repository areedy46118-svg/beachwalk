import * as THREE from 'three';

/* The Bell Pavilion — La Jolla's "mushroom house" — built to the
 * photographs. A round concrete room on a single column at the foot of the
 * cliff; the underside of the room a deep flaring dish of radial ribs; a
 * band of steel-framed windows all the way round under a low roof with a
 * ribbed ceiling; below it a bunker of curved concrete walls on a raised
 * platform, an iron gate in the seaward wall, steps down to the sand. Inside
 * the column a spiral stair of pale concrete treads springing from a NEWEL
 * up the middle and running out to the wall, with the handrail on the wall.
 * The room is somebody's, abandoned: a curved sofa, two leather tub chairs
 * and a tulip table on a round rug with a hurricane lantern still burning on
 * it, an arc lamp, a credenza with a record player, a shelf of books, a dead
 * palm — and at the head of the stair, on a stand, a brass-and-glass casket
 * with an open ring box in it. Panes gone and broken, glass and sand on the
 * floor, damp stains, leaves.
 *
 * Local frame: the column's axis is the origin, +Y up, the SEA is -X and
 * the cliff is +X; nothing is rotated, so the colliders it hands back are
 * axis-aligned once offset. Angles are three's cylinder convention,
 * atan2(x, z), the one the game measures the player in. The stair goes UP
 * as the angle DECREASES — the lighthouse's convention.
 *
 * `MUSH` carries everything the walk needs (and `JEWEL`, where the ring
 * goes, and `LANTERN`, which the game flickers); models/ builds, main.js
 * walks. */

export const MUSH = {
  COL_R: 2.1, BORE: 1.8, H_ROOM: 5.2, ROOM_H: 2.6, R_ROOM: 5.6, SILL: 0.75,
  DOOR_ANG: -Math.PI / 2, DOOR_HALF: 0.32, DOOR_H: 2.1,
  TURNS: 1.5, TREADS: 20, PLAT_TOP: 0.4, WALL_R: 5.1, PLAT_R: 5.6, NEWEL: 0.2,
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
MUSH.DISH_Y0 = MUSH.H_ROOM - 2.1;
MUSH.GAP = 0.85;                                   // half the opening in the well rail, where the stair arrives: wide enough to see from across the room                 // where the column ends and the dish begins

// ------------------------------------------------------------ textures
/* THE PAVILION IS DRAWN LIKE A PHOTOGRAPH NOW, NOT LIKE A GAME FROM 1998.
 * The owner's word on the first build was that it looked like AI slop, and
 * the reasons were all in here: every map was 256-512 px, NEAREST-filtered and
 * crushed to fourteen levels, and every material was flat-shaded and lit
 * almost entirely off its own map — so a curved concrete drum rendered as a
 * set of grey facets at one brightness and a sofa as an orange shape. What a
 * real surface has, and none of these did, is RELIEF that the light moves
 * across. Every map below is drawn with a HEIGHT beside it, and the height is
 * differentiated into a normal map (`normalFrom`), so a board seam is a seam,
 * a tie hole is a hole, weave is weave; the maps are 1024 where a surface is
 * big, linear-filtered and anisotropic, and nothing is quantised. The game's
 * own retro downscale still happens — at the end, on the finished frame,
 * which is where it belongs. */
const smooth = (c, rep) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
};
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
// a canvas of heights (0 = deep, 255 = proud) into a tangent-space normal map
function normalFrom(hc, strength, rep) {
  const S = hc.width, g = hc.getContext('2d'), src = g.getImageData(0, 0, S, S).data;
  const out = document.createElement('canvas'); out.width = out.height = S;
  const og = out.getContext('2d'), img = og.createImageData(S, S), d = img.data;
  const h = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
const pair = (S) => {
  const c = document.createElement('canvas'), h = document.createElement('canvas');
  c.width = c.height = h.width = h.height = S;
  const hg = h.getContext('2d'); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  return [c, c.getContext('2d'), h, hg];
};
const blob = (g, x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
/* BOARD-FORMED CONCRETE, SIXTY YEARS ON THE SEA. What makes it read is not
 * the seams (the first build shouted them, and from the beach the house read
 * as a cage) but the WEATHERING: the pour is never one tone, rain has run
 * down it in long soft streaks, salt has dried pale where the water stopped,
 * the lower courses are darker with the damp they wick up, rust has bled a
 * little out of each tie hole, and the face is pitted all over. The board
 * seams are there, faint, and they are in the HEIGHT much more than the
 * colour — which is how a seam in real concrete looks: you see it where the
 * light rakes across it. */
function concreteSet(seed, tags) {
  const S = 1024, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = '#80848a'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {                          // the pour: broad, soft, never one tone
    const x = rnd() * S, y = rnd() * S, r = 60 + rnd() * 260, v = rnd();
    blob(g, x, y, r, v < 0.5 ? `rgba(150,154,158,${0.10 + rnd() * 0.16})` : `rgba(78,80,84,${0.08 + rnd() * 0.16})`);
  }
  for (let i = 0; i < 90; i++) {                           // a warmer cast here and there: iron in the sand it was mixed with
    blob(g, rnd() * S, rnd() * S, 40 + rnd() * 160, `rgba(128,112,92,${0.05 + rnd() * 0.07})`);
  }
  for (let i = 0; i < 26000; i++) {                        // fine aggregate and pits, colour and height together
    const x = rnd() * S, y = rnd() * S, sz = 0.6 + rnd() * 1.8, v = rnd();
    g.fillStyle = v < 0.55 ? `rgba(46,48,52,${0.12 + rnd() * 0.30})` : `rgba(196,198,200,${0.08 + rnd() * 0.20})`;
    g.fillRect(x, y, sz, sz);
    hg.fillStyle = v < 0.55 ? `rgba(40,40,40,${0.25 + rnd() * 0.4})` : `rgba(200,200,200,${0.15 + rnd() * 0.25})`;
    hg.fillRect(x, y, sz, sz);
  }
  const BOARD = 128;
  for (let y = 0; y < S; y += BOARD) {                     // board seams: faint in colour, clear in relief
    const j = rnd() * 4;
    g.strokeStyle = 'rgba(40,42,46,0.22)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(0, y + j); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + j + (rnd() - 0.5) * 2.2); g.stroke();
    hg.strokeStyle = 'rgba(20,20,20,0.9)'; hg.lineWidth = 3;
    hg.beginPath(); hg.moveTo(0, y + j); for (let x = 0; x <= S; x += 32) hg.lineTo(x, y + j + (rnd() - 0.5) * 2.2); hg.stroke();
    // the grain of the board itself, printed into the face: long faint streaks along each board
    for (let k = 0; k < 14; k++) {
      const yy = y + 6 + rnd() * (BOARD - 12), x0 = rnd() * S, len = 120 + rnd() * 500;
      hg.strokeStyle = `rgba(${rnd() < 0.5 ? 100 : 160},${rnd() < 0.5 ? 100 : 160},128,0.28)`; hg.lineWidth = 1 + rnd() * 2;
      hg.beginPath(); hg.moveTo(x0, yy); hg.lineTo(x0 + len, yy + (rnd() - 0.5) * 3); hg.stroke();
    }
    if (rnd() < 0.65) { const x = rnd() * S; hg.strokeStyle = 'rgba(40,40,40,0.6)'; hg.lineWidth = 2; hg.beginPath(); hg.moveTo(x, y + j); hg.lineTo(x + (rnd() - 0.5) * 3, y + j + BOARD); hg.stroke(); }
  }
  for (let y = 88; y < S; y += 256) for (let x = 60; x < S; x += 172) {   // tie holes, and the rust bled out of each
    const hx = x + rnd() * 10, hy = y + rnd() * 10;
    const gr = g.createLinearGradient(0, hy, 0, hy + 60 + rnd() * 90);
    gr.addColorStop(0, `rgba(118,70,38,${0.20 + rnd() * 0.14})`); gr.addColorStop(1, 'rgba(118,70,38,0)');
    g.fillStyle = gr; g.fillRect(hx - 2.5, hy, 5, 150);
    g.fillStyle = 'rgba(30,31,34,0.85)'; g.beginPath(); g.arc(hx, hy, 4.2, 0, 7); g.fill();
    hg.fillStyle = 'rgba(0,0,0,0.95)'; hg.beginPath(); hg.arc(hx, hy, 5, 0, 7); hg.fill();
  }
  for (let i = 0; i < 70; i++) {                           // rain: long soft streaks down the face
    const x = rnd() * S, y0 = rnd() * S * 0.6, len = 200 + rnd() * 600, w = 3 + rnd() * 16;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    const dk = rnd() < 0.7;
    gr.addColorStop(0, dk ? `rgba(40,42,44,${0.16 + rnd() * 0.18})` : `rgba(210,212,210,${0.10 + rnd() * 0.12})`);
    gr.addColorStop(1, 'rgba(40,42,44,0)');
    g.fillStyle = gr; g.fillRect(x, y0, w, len);
  }
  const damp = g.createLinearGradient(0, S * 0.55, 0, S);   // the damp the lower courses wick up
  damp.addColorStop(0, 'rgba(38,42,46,0)'); damp.addColorStop(1, 'rgba(38,42,46,0.28)');
  g.fillStyle = damp; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 18; i++) {                           // spalls: the face gone, the aggregate showing, in the height too
    const x = rnd() * S, y = rnd() * S, r = 10 + rnd() * 34;
    g.fillStyle = `rgba(100,96,90,${0.35 + rnd() * 0.25})`; hg.fillStyle = 'rgba(30,30,30,0.7)';
    for (const G of [g, hg]) {
      G.beginPath();
      for (let k = 0; k <= 11; k++) { const a = k / 11 * Math.PI * 2, rr = r * (0.55 + rnd() * 0.6); if (k) G.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else G.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      G.fill();
    }
  }
  if (tags) {                                              // old paint, sun-killed: faded and chalky, not neon
    const cols = ['rgba(150,72,58,', 'rgba(64,84,140,', 'rgba(40,40,42,', 'rgba(190,186,170,'];
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = cols[k % cols.length] + (0.20 + rnd() * 0.12) + ')'; g.lineWidth = 9 + rnd() * 12; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); let x = 80 + rnd() * 600, y = 260 + rnd() * 500; g.moveTo(x, y);
      for (let i = 0; i < 7; i++) { x += (rnd() - 0.35) * 150; y += (rnd() - 0.5) * 110; g.quadraticCurveTo(x - 30, y + 40, x, y); }
      g.stroke();
    }
  }
  return { map: smooth(c), normal: normalFrom(h, 3.2) };
}
/* FABRIC: a woven ground at the size a weave actually is, slubbed and worn,
 * the colour of forty years in a sunny window. The weave is almost all in the
 * normal map — which is the thing that stops a cushion looking like plastic. */
function fabricSet(seed, base, dark, light) {
  const S = 512, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const P = 6;
  for (let y = 0; y < S; y += P) for (let x = 0; x < S; x += P) {
    const o = ((x / P + y / P) & 1);
    hg.fillStyle = o ? 'rgba(200,200,200,1)' : 'rgba(70,70,70,1)';
    hg.fillRect(x + (o ? 0 : 1), y + (o ? 1 : 0), o ? P : P - 2, o ? P - 2 : P);
    if (rnd() < 0.25) { g.fillStyle = rnd() < 0.5 ? dark : light; g.globalAlpha = 0.10 + rnd() * 0.10; g.fillRect(x, y, P, P); g.globalAlpha = 1; }
  }
  for (let i = 0; i < 90; i++) { const y = rnd() * S; g.strokeStyle = rnd() < 0.5 ? dark : light; g.globalAlpha = 0.10 + rnd() * 0.12; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (rnd() - 0.5) * 4); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 40; i++) blob(g, rnd() * S, rnd() * S, 30 + rnd() * 110, `rgba(120,108,90,${0.06 + rnd() * 0.08})`);   // dust, and where it was sat on
  return { map: smooth(c), normal: normalFrom(h, 1.6) };
}
function woodSet(seed, base) {
  const S = 1024, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {                          // grain: long, wavering, in colour and in height
    const y = rnd() * S, w = 0.6 + rnd() * 3.2, dark = rnd() < 0.62, ph = rnd() * 10, amp = 2 + rnd() * 7;
    g.strokeStyle = dark ? `rgba(40,20,8,${0.10 + rnd() * 0.26})` : `rgba(220,160,100,${0.06 + rnd() * 0.16})`;
    hg.strokeStyle = dark ? 'rgba(60,60,60,0.35)' : 'rgba(180,180,180,0.25)';
    for (const G of [g, hg]) { G.lineWidth = w; G.beginPath(); G.moveTo(0, y); for (let x = 0; x <= S; x += 24) G.lineTo(x, y + Math.sin(x * 0.006 + ph) * amp + Math.sin(x * 0.031 + ph * 2) * 1.2); G.stroke(); }
  }
  for (let i = 0; i < 5; i++) { const x = rnd() * S, y = rnd() * S; for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(44,22,8,${0.26 - k * 0.025})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, 5 + k * 6, 3 + k * 3.6, 0.1, 0, 7); g.stroke(); } }
  for (let i = 0; i < 60; i++) blob(g, rnd() * S, rnd() * S, 40 + rnd() * 160, `rgba(170,150,120,${0.04 + rnd() * 0.07})`);    // sun and dust on the finish
  return { map: smooth(c), normal: normalFrom(h, 1.2) };
}
function terrazzoSet(seed) {
  const S = 1024, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = '#9a968c'; g.fillRect(0, 0, S, S);
  const chips = ['#b8b2a2', '#77736a', '#a6805c', '#858b7c', '#c4bca6', '#63605a', '#d0cabb'];
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 9;
    g.fillStyle = chips[(rnd() * chips.length) | 0]; g.globalAlpha = 0.6 + rnd() * 0.4;
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI * 2, rr = r * (0.55 + rnd() * 0.65); if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
  g.globalAlpha = 1;
  // brass divider strips, in a grid a metre and a half across, and the dirt that collects along them
  for (let k = 0; k <= 2; k++) for (const vert of [0, 1]) {
    const p = k * S / 2 + 1;
    g.fillStyle = 'rgba(150,120,70,0.8)'; hg.fillStyle = 'rgba(200,200,200,1)';
    if (vert) { g.fillRect(p, 0, 3, S); hg.fillRect(p, 0, 3, S); } else { g.fillRect(0, p, S, 3); hg.fillRect(0, p, S, 3); }
  }
  for (let i = 0; i < 26000; i++) { hg.fillStyle = `rgba(${rnd() < 0.5 ? 60 : 190},${0},${0},0.3)`; hg.fillRect(rnd() * S, rnd() * S, 1, 1); }
  for (let i = 0; i < 120; i++) blob(g, rnd() * S, rnd() * S, 30 + rnd() * 140, `rgba(56,52,46,${0.06 + rnd() * 0.14})`);   // dust and scuffing
  for (let i = 0; i < 30; i++) {                           // hairline cracks, the building moving
    let x = rnd() * S, y = rnd() * S; g.strokeStyle = 'rgba(40,38,34,0.35)'; hg.strokeStyle = 'rgba(10,10,10,0.9)'; g.lineWidth = hg.lineWidth = 1;
    for (const G of [g, hg]) G.beginPath(), G.moveTo(x, y);
    for (let s = 0; s < 8; s++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y); hg.lineTo(x, y); }
    g.stroke(); hg.stroke();
  }
  return { map: smooth(c), normal: normalFrom(h, 1.4) };
}
function rugSet(seed) {
  const S = 1024, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = '#6a4232'; g.fillRect(0, 0, S, S);
  const cols = ['#6e4c3c', '#836046', '#8d7552', '#958a6e', '#8f8a7e', '#6c5140'];
  const cx = S / 2, cy = S / 2;
  for (let r = S * 0.72; r > 8; r -= S * 0.034) {
    g.strokeStyle = cols[(Math.round(r / (S * 0.034))) % cols.length]; g.lineWidth = S * 0.036; g.beginPath();
    for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2, rr = r * (1 + 0.09 * Math.sin(a * 3 + r * 0.02)); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 60000; i++) {                        // the pile: tufts, in colour and height
    const x = rnd() * S, y = rnd() * S, v = rnd();
    g.fillStyle = v < 0.5 ? `rgba(20,12,8,${0.05 + rnd() * 0.14})` : `rgba(230,210,180,${0.03 + rnd() * 0.09})`;
    g.fillRect(x, y, 1.5, 2.5);
    hg.fillStyle = `rgba(${v < 0.5 ? 60 : 210},0,0,0.5)`; hg.fillRect(x, y, 2, 2);
  }
  const dust = g.createRadialGradient(cx, cy, S * 0.15, cx, cy, S * 0.72);
  dust.addColorStop(0, 'rgba(60,54,44,0)'); dust.addColorStop(1, 'rgba(52,48,40,0.40)');
  g.fillStyle = dust; g.fillRect(0, 0, S, S);
  return { map: smooth(c), normal: normalFrom(h, 2.2) };
}
function sleeveTexture(seed) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rnd = lcg(seed);
  const bg = ['#26304a', '#5a2226', '#2e4a26', '#4a3616', '#4a2a46'][seed % 5];
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const fg = ['#d8a040', '#d8d0bc', '#c2562a', '#6aa8c0'][seed % 4];
  g.fillStyle = fg;
  const kind = seed % 3;
  if (kind === 0) { for (let k = 0; k < 5; k++) { g.globalAlpha = 0.85 - k * 0.12; g.beginPath(); g.arc(S / 2, S / 2, S * (0.42 - k * 0.075), 0, 7); g.fill(); } }
  else if (kind === 1) { for (let k = 0; k < 6; k++) { g.globalAlpha = 0.8; g.fillRect(24, 28 + k * 34, S - 48, 16 + (k % 2) * 8); } }
  else { g.globalAlpha = 0.85; g.beginPath(); g.moveTo(S / 2, 32); g.lineTo(S - 36, S - 40); g.lineTo(36, S - 40); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(220,210,190,${0.03 + rnd() * 0.09})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); }
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 6; g.strokeRect(3, 3, S - 6, S - 6);
  return smooth(c);
}
/* A BOX WITH ROUNDED EDGES. Nothing made has a knife-edge corner, and the
 * light running round a radius is most of what makes furniture read as a
 * made thing rather than a block: a rounded rectangle in plan, extruded, with
 * the extrusion's own bevel doing the top and bottom edges. Centred. */
function roundBox(w, h, d, r, seg = 3) {
  r = Math.max(0.002, Math.min(r, w / 2 - 0.004, h / 2 - 0.004, d / 2 - 0.004));
  const x = w / 2 - r, z = d / 2 - r, q = Math.max(0.001, Math.min(r * 0.8, x, z)), s = new THREE.Shape();
  s.moveTo(-x + q, -z); s.lineTo(x - q, -z); s.absarc(x - q, -z + q, q, -Math.PI / 2, 0, false);
  s.lineTo(x, z - q); s.absarc(x - q, z - q, q, 0, Math.PI / 2, false);
  s.lineTo(-x + q, z); s.absarc(-x + q, z - q, q, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -z + q); s.absarc(-x + q, -z + q, q, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 5 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, -(h - 2 * r) / 2, 0);
  return smoothNormals(geo);
}
/* SMOOTH NORMALS WITHOUT LOSING THE UVs. An extrusion comes out unindexed, so
 * three's own normals are per face and a rounded edge shows every bevel step;
 * merging vertices to smooth it would weld across UV seams and lose the map.
 * Average the face normals of every corner that shares a POSITION instead,
 * and leave everything else alone. */
function smoothNormals(geo) {
  const p = geo.attributes.position, n = p.count, acc = new Map(), fn = new Float32Array(n * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const key = (i) => `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
  const idx = geo.index ? geo.index.array : null, tri = idx ? idx.length : n;
  for (let t = 0; t < tri; t += 3) {
    const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);            // area-weighted
    for (const i of [i0, i1, i2]) { const k = key(i); const v = acc.get(k) || [0, 0, 0]; v[0] += e1.x; v[1] += e1.y; v[2] += e1.z; acc.set(k, v); }
  }
  for (let i = 0; i < n; i++) { const v = acc.get(key(i)), l = Math.hypot(v[0], v[1], v[2]) || 1; fn[i * 3] = v[0] / l; fn[i * 3 + 1] = v[1] / l; fn[i * 3 + 2] = v[2] / l; }
  geo.setAttribute('normal', new THREE.BufferAttribute(fn, 3));
  return geo;
}

// ------------------------------------------------------------ the room
/* LEATHER, CRACKED WHERE IT BENDS. Most of what reads as leather is the
 * crazing in the height and a sheen, not the colour. */
function leatherSet(seed, base) {
  const S = 512, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S, y = rnd() * S, l = 6 + rnd() * 22, a = rnd() * Math.PI;
    hg.strokeStyle = 'rgba(40,40,40,0.55)'; hg.lineWidth = 1;
    hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); hg.stroke();
    if (rnd() < 0.3) { g.strokeStyle = 'rgba(20,10,4,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
  for (let i = 0; i < 50; i++) blob(g, rnd() * S, rnd() * S, 30 + rnd() * 120, `rgba(${rnd() < 0.5 ? '30,16,8' : '190,140,100'},${0.06 + rnd() * 0.10})`);
  return { map: smooth(c), normal: normalFrom(h, 1.4) };
}
function sandSet(seed) {
  const S = 256, [c, g, h, hg] = pair(S), rnd = lcg(seed);
  g.fillStyle = '#8a8474'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const x = rnd() * S, y = rnd() * S, v = rnd(); g.fillStyle = `rgba(${v < 0.5 ? '60,56,48' : '190,184,166'},0.25)`; g.fillRect(x, y, 1, 1); hg.fillStyle = `rgba(${v < 0.5 ? 70 : 190},0,0,0.4)`; hg.fillRect(x, y, 1, 1); }
  return { map: smooth(c), normal: normalFrom(h, 1.0) };
}
// a soft dark blotch with a torn edge, for damp and for dust
function stainTex(seed) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), rnd = lcg(seed);
  for (let i = 0; i < 26; i++) blob(g, S / 2 + (rnd() - 0.5) * S * 0.45, S / 2 + (rnd() - 0.5) * S * 0.45, 20 + rnd() * 60, `rgba(0,0,0,${0.10 + rnd() * 0.14})`);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.beginPath();                 // the tide mark round the edge
  for (let k = 0; k <= 60; k++) { const a = k / 60 * Math.PI * 2, r = S * (0.32 + 0.08 * Math.sin(a * 5 + seed) + rnd() * 0.02); if (k) g.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); else g.moveTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* A PROFILE IN (r, y), ROUNDED, WOUND ANTICLOCKWISE, for a lathe. The house
 * is round and so is everything that follows its walls: a curved sofa is a
 * lathe of the sofa's own section over the arc it covers — no boxes on a
 * curve, nothing to interpenetrate. `skew` leans it (r grows with y). */
function rrProf(r0, r1, y0, y1, rad, skew = 0) {
  rad = Math.min(rad, (r1 - r0) / 2 - 0.001, (y1 - y0) / 2 - 0.001);
  const pts = [], seg = 4;
  for (const [cx, cy, a0, a1] of [[r1 - rad, y0 + rad, -Math.PI / 2, 0], [r1 - rad, y1 - rad, 0, Math.PI / 2],
    [r0 + rad, y1 - rad, Math.PI / 2, Math.PI], [r0 + rad, y0 + rad, Math.PI, Math.PI * 1.5]]) {
    for (let k = 0; k <= seg; k++) { const a = a0 + (a1 - a0) * k / seg, y = cy + Math.sin(a) * rad; pts.push(new THREE.Vector2(cx + Math.cos(a) * rad + skew * (y - y0), y)); }
  }
  pts.push(pts[0].clone());
  return pts;
}
/* Box mapping in the mesh's OWN frame, at a size in metres: a board's grain
 * runs along the board, the weave of a cushion is the size of a weave. */
function boxUV(geo, tile) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function buildInterior(K) {
  const { g, M, mesh, at, rnd, colliders, shardAt, glass } = K;
  const F = M.H_ROOM, TAU = Math.PI * 2;
  const room = (x, z, r, h) => colliders.push({ x, z, r, top: F + h, floorY: F - 0.8, mat: 'wood' });
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0, side: THREE.DoubleSide }, o));
  const setMat = (S, color, rough, lift) => std({ map: S.map, normalMap: S.normal, color, roughness: rough, emissive: lift, emissiveMap: S.map });

  /* THE LIGHT IN THE ROOM IS REAL LIGHT. The first interior carried every
   * surface on its own emissive at nearly its own colour, so a sofa was an
   * orange shape at one brightness wherever you stood. The lift here is a
   * breath — enough that the far side of the room is not a hole — and what
   * models the furniture is lamps: the moon through the glass, cold, from
   * the sea side; a hurricane lantern somebody left burning on the table,
   * warm, low, with a steep falloff so the dark comes back between them.
   * Every point light is pooled by the game, so the room costs nothing
   * while you are anywhere else. */
  const terr = terrazzoSet(21), velv = fabricSet(3, '#7a4230', '#3a1c0f', '#a4684a'), must = fabricSet(5, '#9c7c3c', '#584014', '#c29e58');
  const leath = leatherSet(8, '#5e3119'), teakS = woodSet(9, '#5e3a22'), teakD = woodSet(13, '#40271a'), rugS = rugSet(17), sandS = sandSet(4);
  const velvRed = fabricSet(41, '#561019', '#260509', '#7a2331');
  const floorM = setMat(terr, 0xb4b0a6, 0.46, 0x1e2024);
  const sofaM = setMat(velv, 0xffffff, 0.96, 0x1e1210);
  const mustM = setMat(must, 0xffffff, 0.95, 0x1e170c);
  const leathM = setMat(leath, 0xffffff, 0.55, 0x1a100a);
  const teakM = setMat(teakS, 0xffffff, 0.58, 0x1a110a);
  const teakDM = setMat(teakD, 0xffffff, 0.62, 0x140d08);
  const rugM = setMat(rugS, 0x9c8e84, 1.0, 0x120e0b);
  const sandM = setMat(sandS, 0xbab4a2, 1.0, 0x222220);
  const velvRedM = setMat(velvRed, 0xffffff, 1.0, 0x0c0204);
  const brass = std({ color: 0xa8844a, roughness: 0.36, metalness: 0.25, emissive: 0x140e06 });
  const steel = std({ color: 0x8e949a, roughness: 0.32, metalness: 0.30, emissive: 0x0a0c0e });
  const shadeM = std({ color: 0xcfc6ae, roughness: 0.92, emissive: 0x100e0a });
  const potM = std({ color: 0x7c4430, roughness: 0.94, emissive: 0x0a0504 });
  const deadM = std({ color: 0x5a4a2c, roughness: 1.0, emissive: 0x070604 });
  const blackM = std({ color: 0x141414, roughness: 0.55 });
  const clear = glass.clone(); clear.opacity = 0.14; clear.roughness = 0.04; clear.map = null; clear.emissiveMap = null; clear.color.setHex(0xdfe8ee);
  const bookCols = [0x6a2a22, 0x2c3a52, 0x4a5a34, 0x8a7a54, 0x3a2a3a, 0x9a8a70, 0x222222];
  const bookMs = bookCols.map((c) => std({ color: c, roughness: 0.85, emissive: 0x050505 }));
  const tiled = (m, t) => { m.userData.tile = t; return m; };

  const lathe = (prof, a0, a1, mat, cap = true, n) => {
    const seg = n || Math.max(6, Math.round((a1 - a0) * 22));
    const m = tiled(mesh(smoothNormals(new THREE.LatheGeometry(prof, seg, a0, a1 - a0)), mat), 0.5);
    if (cap) for (const a of [a0, a1]) {
      const c = tiled(mesh(new THREE.ShapeGeometry(new THREE.Shape(prof)), mat), 0.5);
      c.rotation.y = a - Math.PI / 2;
    }
    return m;
  };
  const part = (grp, geo, mat, x, y, z, tile) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (tile) m.userData.tile = tile; grp.add(m); return m; };

  // ---- the floor, laid right out to the wall, and mapped in metres
  {
    const geo = new THREE.RingGeometry(M.BORE, M.R_ROOM - 0.17, 96, 4).rotateX(-Math.PI / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.6, p.getZ(i) / 1.6);
    geo.computeVertexNormals();
    mesh(geo, floorM, 0, F + 0.006, 0);
    // a skirting where the floor meets the wall, the one line that says the wall is built on it
    mesh(new THREE.CylinderGeometry(M.R_ROOM - 0.19, M.R_ROOM - 0.19, 0.09, 96, 1, true), K.inside, 0, F + 0.045, 0);
  }

  // ---- the lounge: one conversation, sofa, rug, table and two chairs round it
  const LA = M.DOOR_ANG - 0.48;                          // the middle of it, toward the sea and a little round
  const [tabX, tabZ] = at(LA, 3.2);
  {
    const [rx, rz] = at(LA, 3.5);
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.31, 0.012, 72, 1), rugM);
    rug.position.set(rx, F + 0.012, rz); rug.rotation.y = 0.4; g.add(rug);
  }
  /* THE SOFA, curved to the wall. A lathe of its own section — base, back,
   * arms, three seat cushions and three back cushions, each its own piece
   * with a finger's gap — on short tapered teak legs. */
  const S0 = LA - 0.46, S1 = LA + 0.46, rIn = 4.02, rOut = 5.06;
  {
    lathe(rrProf(rIn, rOut, F + 0.12, F + 0.37, 0.05), S0, S1, sofaM);
    lathe(rrProf(rOut - 0.28, rOut, F + 0.37, F + 0.84, 0.09), S0, S1, sofaM);
    for (const [a0, a1] of [[S0 - 0.075, S0], [S1, S1 + 0.075]]) lathe(rrProf(rIn + 0.02, rOut, F + 0.12, F + 0.63, 0.08), a0, a1, sofaM);
    const U = 3, gp = 0.006;
    for (let i = 0; i < U; i++) {
      const a0 = S0 + (S1 - S0) * i / U + gp, a1 = S0 + (S1 - S0) * (i + 1) / U - gp;
      lathe(rrProf(rIn + 0.03, rOut - 0.27, F + 0.36, F + 0.55, 0.07), a0, a1, i === 1 ? sofaM : sofaM);
      lathe(rrProf(rOut - 0.47, rOut - 0.27, F + 0.52, F + 0.86, 0.08, 0.14), a0, a1, sofaM);
    }
    // the cushion in the middle has been sat in for forty years: squashed, and dusty where nobody sat
    for (const [a, r, y, rx, ry, rz, mm] of [[S0 + 0.12, 4.52, F + 0.66, 0.35, 0, 0.25, mustM], [S1 - 0.18, 4.45, F + 0.62, 0.95, 0, -0.3, mustM]]) {
      const [x, z] = at(a, r);
      const pw = mesh(roundBox(0.42, 0.13, 0.40, 0.06), mm, x, y, z);
      pw.rotation.set(rx, a + 0.4, rz); tiled(pw, 0.4);
    }
    for (let i = 0; i < 6; i++) {
      const a = S0 - 0.02 + (S1 - S0 + 0.04) * (i % 3) / 2, r = i < 3 ? rIn + 0.1 : rOut - 0.1;
      const [x, z] = at(a, r);
      mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.12, 8), teakDM, x, F + 0.06, z);
    }
    for (let i = 0; i <= 7; i++) room(...at(S0 - 0.05 + (S1 - S0 + 0.1) * i / 7, 4.58), 0.44, 0.9);
  }
  /* THE TABLE: a teak drum on a tulip foot, low, with the things on it that
   * say somebody was here — the lantern still burning, an ashtray, two
   * paperbacks, a glass with a ring dried in it. */
  {
    const top = new THREE.Group(); top.position.set(tabX, F, tabZ); g.add(top);
    part(top, smoothNormals(new THREE.LatheGeometry(rrProf(0, 0.52, 0.38, 0.425, 0.018), 48)), teakM, 0, 0, 0, 0.6);
    part(top, smoothNormals(new THREE.LatheGeometry([new THREE.Vector2(0, 0.005), new THREE.Vector2(0.28, 0.005), new THREE.Vector2(0.27, 0.03), new THREE.Vector2(0.1, 0.07), new THREE.Vector2(0.055, 0.2), new THREE.Vector2(0.06, 0.34), new THREE.Vector2(0.14, 0.38), new THREE.Vector2(0, 0.38)], 36)), K.frame, 0, 0, 0);
    // the lantern: brass fount, glass chimney, a burning wick
    const lan = new THREE.Group(); lan.position.set(0.12, 0.425, -0.08); top.add(lan);
    part(lan, smoothNormals(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.075, 0), new THREE.Vector2(0.08, 0.02), new THREE.Vector2(0.07, 0.06), new THREE.Vector2(0.04, 0.08), new THREE.Vector2(0.04, 0.095), new THREE.Vector2(0, 0.095)], 24)), brass, 0, 0, 0);
    part(lan, new THREE.LatheGeometry([new THREE.Vector2(0.035, 0.095), new THREE.Vector2(0.06, 0.13), new THREE.Vector2(0.066, 0.18), new THREE.Vector2(0.05, 0.25), new THREE.Vector2(0.032, 0.30), new THREE.Vector2(0.03, 0.33)], 24), clear, 0, 0, 0);
    for (const s of [-1, 1]) { const w = part(lan, new THREE.TorusGeometry(0.085, 0.003, 4, 20, Math.PI), brass, 0, 0.2, 0); w.rotation.y = s > 0 ? 0 : Math.PI; }
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc27a }));
    flame.scale.set(1, 2.3, 1); flame.position.set(0, 0.125, 0); flame.name = 'lanternFlame'; lan.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff9a40, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(1, 1.7, 1); glow.position.copy(flame.position); glow.name = 'lanternGlow'; lan.add(glow);
    /* THE LANTERN IS OUT (the owner's word): the room is the moon's. The lamp
     * stays in the file at nothing, so turning it back on is a number. */
    const lamp = new THREE.PointLight(0xffa150, 0, 8.5, 1.6);
    lamp.position.set(0.12, 0.56, -0.08); top.add(lamp);
    flame.visible = false; glow.visible = false;
    M.LANTERN = { light: lamp, flame, glow, base: 0 };
    // an ashtray, the books, a tumbler
    part(top, new THREE.CylinderGeometry(0.06, 0.055, 0.02, 20), std({ color: 0x46505a, roughness: 0.3, emissive: 0x05060a }), -0.2, 0.435, 0.1);
    for (const [x, z, ry, y, c] of [[-0.12, -0.2, 0.3, 0.44, 1], [-0.1, -0.2, 0.52, 0.462, 3]]) { const b = part(top, roundBox(0.13, 0.022, 0.19, 0.004), bookMs[c], x, y, z); b.rotation.y = ry; }
    part(top, new THREE.CylinderGeometry(0.035, 0.03, 0.09, 16, 1, true), clear, 0.27, 0.47, 0.18);
    room(tabX, tabZ, 0.56, 0.5);
    M.TABLE = { x: tabX, y: F + 0.425, z: tabZ, r: 0.52 };     // its top, for what the game stands on it (the well man's photograph)
  }
  /* TWO LOUNGE CHAIRS in cracked leather, on swivel feet, turned in at the
   * table across the rug from the sofa. A tub is a lathe with the front
   * left out of it; the gap faces +Z in the chair's own frame, and the chair
   * is turned so +Z points at the table. */
  const chair = (a, r) => {
    const [x, z] = at(a, r);
    const c = new THREE.Group(); c.position.set(x, F, z); c.rotation.y = Math.atan2(tabX - x, tabZ - z); g.add(c);
    const open = 1.7;
    const shell = [new THREE.Vector2(0.24, 0.26), new THREE.Vector2(0.38, 0.30), new THREE.Vector2(0.43, 0.48), new THREE.Vector2(0.44, 0.74), new THREE.Vector2(0.40, 0.78), new THREE.Vector2(0.36, 0.72), new THREE.Vector2(0.34, 0.46), new THREE.Vector2(0.22, 0.34), new THREE.Vector2(0.24, 0.26)];
    part(c, smoothNormals(new THREE.LatheGeometry(shell, 30, open / 2, TAU - open)), leathM, 0, 0, 0, 0.35);
    for (const s of [open / 2, TAU - open / 2]) { const e = part(c, new THREE.ShapeGeometry(new THREE.Shape(shell)), leathM, 0, 0, 0, 0.35); e.rotation.y = s - Math.PI / 2; }
    part(c, smoothNormals(new THREE.LatheGeometry(rrProf(0, 0.37, 0.30, 0.44, 0.06), 30)), leathM, 0.0, 0, 0.03, 0.35);
    part(c, new THREE.CylinderGeometry(0.035, 0.05, 0.24, 12), steel, 0, 0.13, 0);
    for (let k = 0; k < 4; k++) { const f = part(c, roundBox(0.34, 0.03, 0.05, 0.012), steel, 0, 0.025, 0); f.rotation.y = k * Math.PI / 2 + 0.4; f.geometry.translate(0.17, 0, 0); }
    room(x, z, 0.46, 0.8);
  };
  chair(LA - 0.5, 3.2); chair(LA + 0.5, 3.2);
  /* THE ARC LAMP from behind the sofa's end, reaching over the table. It is
   * dead — the owner of this room ran it off a mains that went with them. */
  {
    const [bx, bz] = at(S0 - 0.2, 4.7);
    mesh(roundBox(0.34, 0.08, 0.34, 0.02), std({ color: 0xcfcac0, roughness: 0.35, emissive: 0x0b0b0b }), bx, F + 0.04, bz);
    const up = new THREE.Vector3(bx, F + 0.08, bz), end = new THREE.Vector3(tabX, F + 1.72, tabZ);
    const mid = new THREE.Vector3((bx + tabX) / 2, F + 2.25, (bz + tabZ) / 2);
    const curve = new THREE.QuadraticBezierCurve3(up, new THREE.Vector3(bx, F + 2.3, bz).lerp(mid, 0.5), end);
    mesh(new THREE.TubeGeometry(curve, 40, 0.014, 8), steel);
    mesh(smoothNormals(new THREE.LatheGeometry([new THREE.Vector2(0.02, 0.2), new THREE.Vector2(0.12, 0.17), new THREE.Vector2(0.21, 0.07), new THREE.Vector2(0.23, 0.0), new THREE.Vector2(0.225, -0.005), new THREE.Vector2(0.2, 0.06), new THREE.Vector2(0.115, 0.155), new THREE.Vector2(0.018, 0.19)], 32)), steel, tabX, F + 1.52, tabZ);
    room(bx, bz, 0.24, 1.8);
  }

  /* THE CREDENZA on the cliff side, against the wall under the sill: teak,
   * sliding doors, a record player on it and the records out of their
   * sleeves. Its DEPTH points at the wall — `rotation.y = a` sends local +Z
   * radially — and its length runs round the room. */
  {
    const a = 2.2, r = 4.92, [x, z] = at(a, r);
    const cr = new THREE.Group(); cr.position.set(x, F, z); cr.rotation.y = a; g.add(cr);
    part(cr, roundBox(1.9, 0.5, 0.46, 0.02), teakM, 0, 0.42, 0, 0.8);
    for (const sx of [-0.47, 0.47]) part(cr, roundBox(0.92, 0.42, 0.02, 0.006), teakDM, sx, 0.42, -0.235, 0.8);
    for (const [sx, sz] of [[-0.85, -0.17], [0.85, -0.17], [-0.85, 0.17], [0.85, 0.17]]) { const l = part(cr, new THREE.CylinderGeometry(0.02, 0.013, 0.17, 8), teakDM, sx, 0.085, sz); l.rotation.z = sx > 0 ? -0.08 : 0.08; }
    // the record player: plinth, platter, a record on it, the arm
    part(cr, roundBox(0.46, 0.09, 0.36, 0.015), teakDM, -0.45, 0.715, 0.02, 0.5);
    part(cr, new THREE.CylinderGeometry(0.15, 0.15, 0.018, 40), steel, -0.5, 0.769, 0.02);
    part(cr, new THREE.CylinderGeometry(0.148, 0.148, 0.004, 40), blackM, -0.5, 0.78, 0.02);
    part(cr, new THREE.CylinderGeometry(0.05, 0.05, 0.005, 20), std({ color: 0x9a3a28, roughness: 0.8, emissive: 0x080302 }), -0.5, 0.782, 0.02);
    const arm = part(cr, new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6), steel, -0.33, 0.8, 0.02); arm.rotation.set(Math.PI / 2, 0, 0.5);
    // sleeves leaning against the front, their covers faded
    for (let i = 0; i < 3; i++) {
      const sl = std({ map: sleeveTexture(i + 2), roughness: 0.9, emissive: 0x060606 });
      const s = part(cr, new THREE.BoxGeometry(0.31, 0.31, 0.004), sl, 0.2 + i * 0.03, 0.16, -0.27 - i * 0.012);
      s.rotation.x = -0.22;
    }
    // a vase of stems that died in it, and a ceramic bowl
    part(cr, smoothNormals(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0.0), new THREE.Vector2(0.08, 0.08), new THREE.Vector2(0.05, 0.22), new THREE.Vector2(0.035, 0.28), new THREE.Vector2(0.04, 0.3)], 24)), std({ color: 0x3e5a62, roughness: 0.35, emissive: 0x040607 }), 0.55, 0.67, 0.05);
    for (let k = 0; k < 7; k++) { const st = part(cr, new THREE.CylinderGeometry(0.003, 0.004, 0.42 + rnd() * 0.2, 4), deadM, 0.55, 0.9, 0.05); st.rotation.set((rnd() - 0.5) * 0.7, 0, (rnd() - 0.5) * 0.7); }
    part(cr, smoothNormals(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.09, 0.0), new THREE.Vector2(0.13, 0.06), new THREE.Vector2(0.125, 0.065), new THREE.Vector2(0.085, 0.01), new THREE.Vector2(0, 0.012)], 28)), std({ color: 0xc8c0b0, roughness: 0.4, emissive: 0x0a0a09 }), 0.18, 0.67, 0.02);
    for (const t of [-0.7, -0.24, 0.24, 0.7]) room(x + Math.cos(a) * t - Math.sin(a) * 0.1, z - Math.sin(a) * t - Math.cos(a) * 0.1, 0.3, 0.8);
  }
  /* A LOW SHELF of books round the landward wall, under the sill. */
  {
    const a = -0.95, r = 5.0, [x, z] = at(a, r);
    const sh = new THREE.Group(); sh.position.set(x, F, z); sh.rotation.y = a; g.add(sh);
    for (const y of [0.02, 0.33, 0.64]) part(sh, roundBox(1.5, 0.025, 0.32, 0.006), teakM, 0, y, 0, 0.8);
    for (const sx of [-0.74, 0, 0.74]) part(sh, roundBox(0.025, 0.64, 0.32, 0.006), teakM, sx, 0.33, 0, 0.8);
    for (const y of [0.035, 0.345]) {
      let bx = -0.72;
      while (bx < 0.7) {
        const w = 0.025 + rnd() * 0.035, hgt = 0.2 + rnd() * 0.07;
        if (rnd() < 0.12) { bx += 0.08; continue; }                         // a gap where one was taken
        const lean = bx > 0.5 && rnd() < 0.6 ? 0.35 : 0;
        const b = part(sh, roundBox(w, hgt, 0.2 + rnd() * 0.05, 0.004), bookMs[(rnd() * bookMs.length) | 0], bx + w / 2, y + hgt / 2 + 0.001, 0.02);
        b.rotation.z = -lean; bx += w + 0.002;
      }
    }
    const shell = part(sh, new THREE.SphereGeometry(0.07, 14, 10), std({ color: 0xd8c8b0, roughness: 0.6, emissive: 0x0a0907 }), 0.35, 0.69, 0.0); shell.scale.set(1.3, 0.6, 0.9);
    const fr = part(sh, roundBox(0.18, 0.012, 0.22, 0.004), teakDM, -0.4, 0.66, 0.0); fr.rotation.y = 0.2;   // a frame, face down
    for (const t of [-0.52, 0, 0.52]) room(x + Math.cos(a) * t - Math.sin(a) * 0.05, z - Math.sin(a) * t - Math.cos(a) * 0.05, 0.28, 0.72);
  }
  /* A PALM THAT DIED IN ITS POT by the glass on the cliff side. */
  {
    const [x, z] = at(2.95, 4.75);
    mesh(smoothNormals(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0), new THREE.Vector2(0.24, 0.36), new THREE.Vector2(0.26, 0.4), new THREE.Vector2(0.235, 0.4), new THREE.Vector2(0.22, 0.37), new THREE.Vector2(0, 0.35)], 28)), potM, x, F, z);
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * TAU + rnd() * 0.4, len = 0.55 + rnd() * 0.45, droop = 0.6 + rnd() * 0.9;
      const pts = []; for (let s = 0; s <= 6; s++) { const t = s / 6; pts.push(new THREE.Vector3(Math.sin(a) * t * len * 0.8, 0.35 + t * 0.7 - t * t * droop * 0.8, Math.cos(a) * t * len * 0.8)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.006, 4), deadM, x, F, z);
      for (let s = 1; s < 6; s++) { const p = pts[s]; const lf = mesh(new THREE.PlaneGeometry(0.28 * (1 - s / 8), 0.035), deadM, x + p.x, F + p.y - 0.02, z + p.z); lf.rotation.set(0.9 + rnd() * 0.5, a + (s % 2 ? 1 : -1) * 0.9, 0.5); }
    }
    room(x, z, 0.3, 0.5);
  }

  /* THE RING'S CASE. A small brass-and-glass casket, lid thrown back on its
   * hinge, on a slender teak stand at the head of the stair — the first
   * thing you see as you come up out of the well, and the thing you climbed
   * for. Inside it on red velvet, a ring box, open, with a slot in its
   * cushion. The ring goes in the slot from the game: the box writes down
   * where it is. A little light inside the case catches the brass and the
   * glass and leaves everything round it dark. */
  {
    const a = M.TOP_ANG - 0.62, r = 3.05, [x, z] = at(a, r);
    const st = new THREE.Group(); st.position.set(x, F, z);
    // it faces back toward where you come up
    const [sx, sz] = at(M.TOP_ANG, 1.4); st.rotation.y = Math.atan2(sx - x, sz - z); g.add(st);
    part(st, roundBox(0.44, 0.04, 0.34, 0.012), teakM, 0, 0.84, 0, 0.5);
    part(st, roundBox(0.38, 0.018, 0.28, 0.006), teakM, 0, 0.26, 0, 0.5);
    for (const [lx, lz] of [[-0.18, -0.13], [0.18, -0.13], [-0.18, 0.13], [0.18, 0.13]]) { const l = part(st, new THREE.CylinderGeometry(0.018, 0.012, 0.82, 10), teakDM, lx, 0.41, lz); l.rotation.set(lz * 0.25, 0, -lx * 0.25); }
    const cs = new THREE.Group(); cs.position.set(0, 0.86, -0.01); st.add(cs);
    const W = 0.30, D = 0.20, H = 0.13, e = 0.008;
    part(cs, roundBox(W + 0.02, 0.018, D + 0.02, 0.005), brass, 0, 0.009, 0);                          // the plinth of the case
    part(cs, roundBox(W - 0.01, 0.012, D - 0.01, 0.003), velvRedM, 0, 0.024, 0, 0.1);                   // the lining
    for (const [px, pz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) part(cs, roundBox(e, H, e, 0.002), brass, px, 0.018 + H / 2, pz);
    for (const [px, pz, w, d] of [[0, -D / 2, W, e], [0, D / 2, W, e], [-W / 2, 0, e, D], [W / 2, 0, e, D]]) part(cs, roundBox(w, e, d, 0.002), brass, px, 0.018 + H, pz);
    for (const [px, pz, w, d] of [[0, -D / 2, W, 0.002], [0, D / 2, W, 0.002], [-W / 2, 0, 0.002, D], [W / 2, 0, 0.002, D]]) part(cs, new THREE.BoxGeometry(w, H, d), clear, px, 0.018 + H / 2, pz);
    // the lid, open past upright on its back hinge
    // hinged at the BACK (the case's front, +Z, faces the stair), swung up past upright
    const hinge = new THREE.Group(); hinge.position.set(0, 0.018 + H, -D / 2); hinge.rotation.x = -1.86; cs.add(hinge);
    for (const [px, pz, w, d] of [[0, D, W, e], [0, 0, W, e], [-W / 2, D / 2, e, D], [W / 2, D / 2, e, D]]) part(hinge, roundBox(w, e, d, 0.002), brass, px, 0, pz);
    part(hinge, new THREE.BoxGeometry(W, 0.002, D), clear, 0, 0, D / 2);
    // the ring box, open, on the velvet
    const rb = new THREE.Group(); rb.position.set(0, 0.03, -0.01); cs.add(rb);
    part(rb, roundBox(0.075, 0.042, 0.065, 0.008), velvRedM, 0, 0.021, 0, 0.05);
    // an ivory satin cushion with the slot in it: gold and a green stone read against pale, not against red
    const cu = part(rb, roundBox(0.062, 0.016, 0.05, 0.007), std({ color: 0xd6ccbc, roughness: 0.55, emissive: 0x151210 }), 0, 0.045, 0.0);
    part(rb, new THREE.BoxGeometry(0.004, 0.004, 0.05), std({ color: 0x3a3028, roughness: 0.8 }), 0, 0.0535, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.042, -0.032); lid.rotation.x = -1.9; rb.add(lid);
    part(lid, roundBox(0.075, 0.03, 0.065, 0.008), velvRedM, 0, 0.015, 0.032, 0.05);
    part(lid, roundBox(0.062, 0.004, 0.052, 0.002), std({ color: 0xd6ccbc, roughness: 0.55, emissive: 0x151210 }), 0, 0.001, 0.032);
    const inL = new THREE.PointLight(0xffe0b0, 0.38, 1.3, 2); inL.position.set(0, 0.12, -0.03); cs.add(inL); inL.userData.lpAlways = 7;
    st.updateMatrixWorld(true);
    const J = new THREE.Vector3(0, 0.012, 0); cu.localToWorld(J); g.worldToLocal(J);
    M.JEWEL = { x: J.x, y: J.y, z: J.z, ry: st.rotation.y };
    room(x, z, 0.3, 1.0);
  }

  /* THE MOON THROUGH THE GLASS: cold fills on the sea side, where the panes
   * face the light, low enough that they model the furniture from the side. */
  for (const [a, r, y, i] of [[M.DOOR_ANG - 0.4, 4.4, 2.1, 2.4], [M.DOOR_ANG + 0.55, 4.4, 2.2, 1.9], [M.TOP_ANG - 0.9, 4.2, 2.3, 1.6], [2.3, 4.0, 2.2, 1.8], [3.0 - TAU, 4.2, 2.2, 1.3]]) {
    const L = new THREE.PointLight(0x8aa2cc, i, 7.5, 1.4);
    const [x, z] = at(a, r); L.position.set(x, F + y, z); L.userData.lpAlways = 16; g.add(L);
  }
  /* AND THE STAIR IS NOT A BLACK HOLE. Moon comes in at the door at the foot
   * of it and down the well from the room; two dim cold fills in the bore
   * are what that looks like, enough to see the next tread by. */
  for (const [a, y, i] of [[M.DOOR_ANG + 0.3, 1.5, 1.4], [M.DOOR_ANG + 2.6, 3.7, 1.2]]) {
    const L = new THREE.PointLight(0x8aa2cc, i, 6.0, 1.3);
    const [x, z] = at(a, 1.0); L.position.set(x, y, z); L.userData.lpAlways = 7; g.add(L);
  }

  /* WHAT THE WEATHER BROUGHT IN: sand drifted under the panes that are gone,
   * damp dried into stains on the floor, leaves blown into the corners. */
  const seenA = new Set();
  for (const am of shardAt) {
    const key = Math.round(am * 3); if (seenA.has(key)) continue; seenA.add(key);
    const [x, z] = at(am, M.R_ROOM - 0.55);
    const d = mesh(new THREE.SphereGeometry(1, 28, 10, 0, TAU, 0, Math.PI / 2), sandM, x, F - 0.005, z);
    d.scale.set(0.95 + rnd() * 0.5, 0.05 + rnd() * 0.04, 0.35 + rnd() * 0.2); d.rotation.y = am; tiled(d, 0.8);
    const sm = new THREE.Mesh(new THREE.CircleGeometry(0.9 + rnd() * 0.5, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: stainTex(key + 20), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0x000000 }));
    const [sx2, sz2] = at(am + (rnd() - 0.5) * 0.2, M.R_ROOM - 1.2 - rnd() * 0.6);
    sm.position.set(sx2, F + 0.008, sz2); sm.rotation.y = rnd() * TAU; sm.renderOrder = 1; g.add(sm);
  }
  for (let k = 0; k < 40; k++) {
    const a = rnd() * TAU, r = M.R_ROOM - 0.3 - Math.pow(rnd(), 2) * 2.4, [x, z] = at(a, r);
    const lf = mesh(new THREE.PlaneGeometry(0.06, 0.035).rotateX(-Math.PI / 2), deadM, x, F + 0.012 + rnd() * 0.004, z);
    lf.rotation.set((rnd() - 0.5) * 0.4, rnd() * TAU, (rnd() - 0.5) * 0.4);
  }

  // box-map every piece that asked for it, in its own frame
  const done = new Set();
  g.traverse((o) => {
    if (!o.isMesh || o.userData.tile === undefined || done.has(o.geometry)) return;
    done.add(o.geometry); if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    boxUV(o.geometry, o.userData.tile);
  });
}

export function makeMushroomHouse() {
  const M = MUSH;
  const g = new THREE.Group();
  const colliders = [];
  const TAU = Math.PI * 2;
  const V = new THREE.Vector3();

  /* ---------------------------------------------------------- materials
   * SMOOTH, and lit by LIGHT. Every material here used to be flat-shaded and
   * carried by its own emissive map at nearly its own brightness, so nothing
   * had form. The concrete keeps a modest lift off its map (the building is
   * backlit from every approach — you walk toward the moon — and the one
   * directional light does nothing for the face you look at); indoors it is
   * a breath, and the rest is the normal maps and real lamps. */
  const CS = concreteSet(7, false), CT = concreteSet(19, true), CP = concreteSet(31, false);
  const concOf = (S, color, emis, k) => new THREE.MeshStandardMaterial({
    map: S.map, normalMap: S.normal, normalScale: new THREE.Vector2(k, k), color, roughness: 0.93, metalness: 0,
    emissive: emis, emissiveMap: S.map, emissiveIntensity: 1.0, side: THREE.DoubleSide });
  const conc = concOf(CS, 0xb6bac0, 0x7c8591, 1.0);
  const concTag = concOf(CT, 0xb6bac0, 0x7c8591, 1.0);
  const pale = concOf(CP, 0xc8ccd2, 0x656c77, 0.8);          // the stair, the ribs: the paler poured work
  const inside = concOf(CS, 0xa8adb4, 0x23272e, 0.9);         // the room's own walls and ceiling: lit by its lamps, not its map
  const CONC = new Set([conc, concTag, pale, inside]);
  const TILE = 3.2;                                           // metres of concrete in one repeat of the map
  for (const S of [CS, CT, CP]) { S.map.repeat.set(1 / TILE, 1 / TILE); S.normal.repeat.set(1 / TILE, 1 / TILE); }

  /* STEEL THAT HAS BEEN PAINTED AND GIVEN UP. The window frames, the rails and
   * the gate: a dark green-grey paint, flaking, with rust through it at every
   * joint and edge — the thing sixty years of salt does to a steel frame. */
  const steelSet = (() => {
    const S = 512, [c, gx, h, hg] = pair(S), rnd = lcg(55);
    gx.fillStyle = '#3c4644'; gx.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) blob(gx, rnd() * S, rnd() * S, 20 + rnd() * 90, `rgba(${90 + rnd() * 30},${54 + rnd() * 20},${30},${0.10 + rnd() * 0.25})`);
    for (let i = 0; i < 700; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 5;
      gx.fillStyle = `rgba(${110 + rnd() * 40},${62 + rnd() * 20},${34},${0.3 + rnd() * 0.4})`; gx.beginPath(); gx.arc(x, y, r, 0, 7); gx.fill();
      hg.fillStyle = 'rgba(40,40,40,0.8)'; hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill();
    }
    return { map: smooth(c), normal: normalFrom(h, 2.0) };
  })();
  const frame = new THREE.MeshStandardMaterial({ map: steelSet.map, normalMap: steelSet.normal, color: 0x9aa2a0, roughness: 0.82, metalness: 0.25, emissive: 0x0c1012, emissiveMap: steelSet.map });
  const iron = frame.clone(); iron.color.setHex(0x8a8680);
  /* GLASS THAT HAS STOOD IN SALT AIR: dark and reflective where it is clean,
   * hazed with dried salt toward its edges, with runs down it. */
  const glassTex = (() => {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const gx = c.getContext('2d'), rnd = lcg(77);
    gx.fillStyle = 'rgba(40,52,62,1)'; gx.fillRect(0, 0, S, S);
    const edge = gx.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.75);
    edge.addColorStop(0, 'rgba(160,170,176,0)'); edge.addColorStop(1, 'rgba(170,176,180,0.55)');
    gx.fillStyle = edge; gx.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) { const x = rnd() * S, y = rnd() * S * 0.4; gx.fillStyle = 'rgba(180,186,190,0.18)'; gx.fillRect(x, y, 1.5 + rnd() * 3, 40 + rnd() * 160); }
    return smooth(c);
  })();
  const glass = new THREE.MeshStandardMaterial({ map: glassTex, color: 0xb8c4cc, roughness: 0.10, metalness: 0.0, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a1016, emissiveMap: glassTex });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 1, metalness: 0 });

  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const arcBand = (r, y0, y1, a0, a1, mat, n) => mesh(new THREE.CylinderGeometry(r, r, y1 - y0, n || Math.max(8, Math.round((a1 - a0) * 16)), 1, true, a0, a1 - a0), mat, 0, (y0 + y1) / 2, 0);
  /* RINGGEOMETRY LIES ABOUT ITS ANGLE (see the note in the first build): its
   * theta runs (cos, sin) in XY while the cylinder's runs (sin, cos) in XZ, so
   * a ring capping an arc has to be laid with this and nothing else. */
  const ringArc = (r0, r1, a0, a1, mat, y, down) => {
    const n = Math.max(6, Math.round((a1 - a0) * 16));
    const t0 = down ? Math.PI / 2 - a1 : a0 - Math.PI / 2;
    return mesh(new THREE.RingGeometry(r0, r1, n, 1, t0, a1 - a0).rotateX(down ? Math.PI / 2 : -Math.PI / 2), mat, 0, y, 0);
  };
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const at = (a, r) => [Math.sin(a) * r, Math.cos(a) * r];

  // ---------------------------------------------------------- platform and steps
  mesh(new THREE.CylinderGeometry(M.PLAT_R, M.PLAT_R + 0.35, M.PLAT_TOP, 64), conc, 0, M.PLAT_TOP / 2, 0);
  colliders.push({ x: 0, z: 0, r: M.PLAT_R, top: M.PLAT_TOP, mat: 'rock' });
  /* THE STEPS UP TO THE PLATFORM are three shallow risers of a comfortable
   * height, the full width of the gate and a little over, with a worn nosing
   * — two tall boxes were a thing you hopped up rather than climbed. */
  for (const [dx, top] of [[-M.PLAT_R - 0.35, 0.30], [-M.PLAT_R - 0.75, 0.20], [-M.PLAT_R - 1.15, 0.10]]) {
    mesh(roundBox(0.46, top, 2.9, 0.03), conc, dx, top / 2, 0);
    colliders.push({ x0: dx - 0.23, x1: dx + 0.23, z0: -1.45, z1: 1.45, top, mat: 'rock' });
  }

  // ---------------------------------------------------------- the walls
  const WALL_H = 2.3, WALL_T = 0.4, wallTop = M.PLAT_TOP + WALL_H;
  const arc0 = M.DOOR_ANG - 1.12, arc1 = M.DOOR_ANG + 1.12, gateHalf = 0.14;
  const RET_R = M.PLAT_R + 0.15, RET_T = 0.2, RET_TOP = 4.15;   // the cut in main.js lives inside RET_R - RET_T and below RET_TOP
  const wallArc = (a0, a1, mat) => {
    const ro = M.WALL_R + WALL_T / 2, ri = M.WALL_R - WALL_T / 2, n = Math.max(8, Math.round((a1 - a0) * 16));
    arcBand(ro, M.PLAT_TOP, wallTop, a0, a1, mat, n); arcBand(ri, M.PLAT_TOP, wallTop, a0, a1, mat, n);
    // a rounded coping, a little proud of both faces: the one detail that makes a wall a built thing
    const cp = [new THREE.Vector2(ri - 0.03, wallTop), new THREE.Vector2(ri - 0.03, wallTop + 0.05), new THREE.Vector2(M.WALL_R, wallTop + 0.09), new THREE.Vector2(ro + 0.03, wallTop + 0.05), new THREE.Vector2(ro + 0.03, wallTop)];
    mesh(new THREE.LatheGeometry(cp, n, a0, a1 - a0), mat);
    for (const a of [a0, a1]) { const e = mesh(new THREE.BoxGeometry(WALL_T, WALL_H, 0.04), mat, Math.sin(a) * M.WALL_R, M.PLAT_TOP + WALL_H / 2, Math.cos(a) * M.WALL_R); e.rotation.y = a - Math.PI / 2; }
  };
  wallArc(arc0, M.DOOR_ANG - gateHalf, concTag);
  wallArc(M.DOOR_ANG + gateHalf, arc1, conc);
  const GATE_W = 1.7;
  {
    const step = 0.42 / M.WALL_R, n = Math.max(6, Math.ceil((arc1 - arc0) / step));
    for (let i = 0; i <= n; i++) {
      const a = arc0 + (arc1 - arc0) * i / n;
      if (Math.abs(a - M.DOOR_ANG) * M.WALL_R < GATE_W / 2) continue;
      colliders.push({ x: Math.sin(a) * M.WALL_R, z: Math.cos(a) * M.WALL_R, r: 0.42, top: wallTop, mat: 'rock' });
    }
  }
  {
    const r0 = arc1, r1 = arc0 + TAU, n = 56, y0 = -0.35;
    arcBand(RET_R + RET_T, y0, RET_TOP, r0, r1, conc, n); arcBand(RET_R - RET_T, y0, RET_TOP, r0, r1, conc, n);
    ringArc(RET_R - RET_T, RET_R + RET_T, r0, r1, conc, RET_TOP);
    const nc = Math.round((r1 - r0) * RET_R / 0.9);
    for (let i = 0; i < nc; i++) { const a = r0 + (i + 0.5) * (r1 - r0) / nc; colliders.push({ x: Math.sin(a) * RET_R, z: Math.cos(a) * RET_R, r: 0.5, top: RET_TOP, mat: 'rock' }); }
    for (const a of [arc0, arc1]) {
      const rm = (M.WALL_R + RET_R) / 2;
      const m = mesh(new THREE.BoxGeometry(RET_R - M.WALL_R + 0.6, RET_TOP - y0, WALL_T), conc, Math.sin(a) * rm, (y0 + RET_TOP) / 2, Math.cos(a) * rm);
      m.rotation.y = a - Math.PI / 2;
      colliders.push({ x: Math.sin(a) * rm, z: Math.cos(a) * rm, r: 0.5, top: RET_TOP, mat: 'rock' });
    }
  }
  // the gate: a real one — flat-bar frame, round bars, a rail top and bottom, rusted through the paint
  const gateInfo = { pivot: null, shut: 0.03, open: 1.42, cols: [], w: 1.35, h: 2.0 };
  {
    const w = gateInfo.w, h = gateInfo.h, gate = new THREE.Group();
    const bar = new THREE.CylinderGeometry(0.014, 0.014, h - 0.2, 8);
    for (let i = 1; i < 11; i++) { const b = new THREE.Mesh(bar, iron); b.position.set(0, h / 2, i * (w / 11)); gate.add(b); }
    for (const y of [0.08, h - 0.08]) { const b = new THREE.Mesh(roundBox(0.05, 0.07, w, 0.012), iron); b.position.set(0, y, w / 2); gate.add(b); }
    for (const z of [0.03, w - 0.03]) { const b = new THREE.Mesh(roundBox(0.05, h, 0.06, 0.012), iron); b.position.set(0, h / 2, z); gate.add(b); }
    for (let i = 1; i < 11; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), iron); f.position.set(0, h - 0.02 + 0.045, i * (w / 11)); gate.add(f); }
    const pivot = new THREE.Group();
    const px = Math.sin(M.DOOR_ANG) * M.WALL_R, pz = Math.cos(M.DOOR_ANG) * M.WALL_R - w / 2 - 0.1;
    pivot.position.set(px, M.PLAT_TOP, pz);
    pivot.rotation.y = gateInfo.shut; pivot.add(gate); g.add(pivot);
    gateInfo.pivot = pivot; gateInfo.x = px; gateInfo.z = pz;
    for (let i = 0; i <= 4; i++) {
      const t = i / 4 * w;
      const c = { x: px + Math.sin(gateInfo.shut) * t, z: pz + Math.cos(gateInfo.shut) * t, r: 0.12, top: M.PLAT_TOP + h, mat: 'wood', t };
      colliders.push(c); gateInfo.cols.push(c);
    }
    for (const sz of [-1, 1]) {
      const cz = Math.cos(M.DOOR_ANG) * M.WALL_R + sz * (w / 2 + 0.35);
      mesh(roundBox(0.5, WALL_H + 0.25, 0.5, 0.03), conc, Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP + (WALL_H + 0.25) / 2, cz);
      mesh(roundBox(0.58, 0.08, 0.58, 0.02), conc, Math.sin(M.DOOR_ANG) * M.WALL_R, M.PLAT_TOP + WALL_H + 0.29, cz);
      colliders.push({ x: Math.sin(M.DOOR_ANG) * M.WALL_R, z: cz, r: 0.34, top: wallTop, mat: 'rock' });
    }
  }

  // ---------------------------------------------------------- the column
  const colTop = M.H_ROOM, doorTop = M.PLAT_TOP + M.DOOR_H;
  const gapStart = M.DOOR_ANG + M.DOOR_HALF, gapLen = TAU - M.DOOR_HALF * 2;
  for (const [r, mat] of [[M.COL_R, conc], [M.BORE, inside]]) {
    mesh(new THREE.CylinderGeometry(r, r, M.DOOR_H, 56, 1, true, gapStart, gapLen), mat, 0, M.PLAT_TOP + M.DOOR_H / 2, 0);
    mesh(new THREE.CylinderGeometry(r, r, colTop - doorTop, 56, 1, true), mat, 0, (doorTop + colTop) / 2, 0);
  }
  ringArc(M.BORE, M.COL_R, M.DOOR_ANG - M.DOOR_HALF, M.DOOR_ANG + M.DOOR_HALF, conc, doorTop, true);   // the soffit
  for (const sg of [-1, 1]) {
    const a = M.DOOR_ANG + sg * M.DOOR_HALF, rm = (M.COL_R + M.BORE) / 2;
    const j = mesh(new THREE.BoxGeometry(M.COL_R - M.BORE + 0.02, M.DOOR_H, 0.14), conc, Math.sin(a) * rm, M.PLAT_TOP + M.DOOR_H / 2, Math.cos(a) * rm);
    j.rotation.y = a - Math.PI / 2;
  }
  mesh(new THREE.CircleGeometry(M.BORE, 48).rotateX(-Math.PI / 2), inside, 0, M.PLAT_TOP + 0.01, 0);

  // ---------------------------------------------------------- the cap
  const RIM = M.R_ROOM + 0.25, dishY1 = M.H_ROOM - 0.35;
  const dishPt = (t) => new THREE.Vector2(M.COL_R + (RIM - M.COL_R) * t, M.DISH_Y0 + (dishY1 - M.DISH_Y0) * Math.pow(t, 0.55));
  {
    const pts = [new THREE.Vector2(M.BORE, M.H_ROOM), new THREE.Vector2(RIM, M.H_ROOM), new THREE.Vector2(RIM, dishY1)];
    for (let i = 14; i >= 0; i--) pts.push(dishPt(i / 14));
    mesh(new THREE.LatheGeometry(pts, 72), conc);
  }
  // the ribs under the dish: each ONE swept piece following the curve, deep at the column and thinning to the rim
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, shape = [];
    const K = 12;
    for (let k = 0; k <= K; k++) { const t = k / K, p = dishPt(t); shape.push([p.x, p.y + 0.01]); }
    for (let k = K; k >= 0; k--) { const t = k / K, p = dishPt(t), d = 0.55 * (1 - 0.78 * t); shape.push([p.x, p.y - d]); }
    const s = new THREE.Shape(shape.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    geo.translate(0, 0, -0.065);
    const rib = mesh(smoothNormals(geo), pale);
    rib.rotation.y = a - Math.PI / 2;
  }

  // ---------------------------------------------------------- the room shell
  const winY = M.H_ROOM + M.SILL, roofY = M.H_ROOM + M.ROOM_H, WIN_H = roofY - winY;
  arcBand(M.R_ROOM, M.H_ROOM, winY, 0, TAU, conc, 72); arcBand(M.R_ROOM - 0.18, M.H_ROOM, winY, 0, TAU, inside, 72);
  mesh(new THREE.RingGeometry(M.R_ROOM - 0.22, M.R_ROOM + 0.04, 72).rotateX(-Math.PI / 2), conc, 0, winY, 0);   // the sill, a little proud
  const BAYS = 22, RG = M.R_ROOM - 0.06, split = winY + WIN_H * 0.3;
  const shardAt = [];
  for (const y of [winY + 0.04, split, roofY - 0.04]) arcBand(RG + 0.035, y - 0.04, y + 0.04, 0, TAU, frame, 88);
  for (let i = 0; i < BAYS; i++) {
    const a0 = i / BAYS * TAU, a1 = (i + 1) / BAYS * TAU;
    const post = mesh(roundBox(0.09, WIN_H, 0.12, 0.012), frame, Math.sin(a0) * RG, winY + WIN_H / 2, Math.cos(a0) * RG);
    post.rotation.y = a0;
    const pad = 0.05 / RG;
    for (const [y0, y1] of [[winY + 0.08, split - 0.04], [split + 0.04, roofY - 0.08]]) {
      const state = rnd();
      if (state < 0.30) { shardAt.push((a0 + a1) / 2); continue; }                    // gone
      let yb = y1;
      if (state < 0.46) { yb = y0 + (y1 - y0) * (0.35 + rnd() * 0.3); shardAt.push((a0 + a1) / 2); }   // broken off short
      arcBand(RG, y0, yb, a0 + pad, a1 - pad, glass, 6);
    }
  }
  // what came down: shards, mostly small, all near the glass they came out of
  const shardGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.12, 0, 0.02, 0.03, 0, 0.1], 3));
  shardGeo.computeVertexNormals();
  for (const am of shardAt) for (let k = 0; k < 5; k++) {
    const r = M.R_ROOM - 0.35 - Math.pow(rnd(), 1.6) * 1.4, a = am + (rnd() - 0.5) * 0.22;
    const sh = new THREE.Mesh(shardGeo, glass);
    sh.position.set(Math.sin(a) * r, M.H_ROOM + 0.012, Math.cos(a) * r); sh.rotation.y = rnd() * TAU; sh.scale.setScalar(0.5 + rnd() * 1.2); g.add(sh);
  }
  // the roof: fascia, a low dome, and the ceiling with its ribs
  arcBand(M.R_ROOM + 0.3, roofY - 0.02, roofY + 0.32, 0, TAU, conc, 72);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(M.R_ROOM + 0.3, roofY + 0.32), new THREE.Vector2(4.2, roofY + 0.5), new THREE.Vector2(2.0, roofY + 0.62), new THREE.Vector2(0, roofY + 0.7)], 72), conc);
  mesh(new THREE.CircleGeometry(M.R_ROOM, 72).rotateX(Math.PI / 2), inside, 0, roofY, 0);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, len = M.R_ROOM - 0.25;
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, -0.14), new THREE.Vector2(0, -0.34)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    geo.translate(0, 0, -0.06);
    const rib = mesh(smoothNormals(geo), inside, 0, roofY, 0);
    rib.rotation.y = a - Math.PI / 2;
  }

  // ---------------------------------------------------------- the stair
  /* A STAIR YOU CAN ACTUALLY WALK DOWN. It was pale wedges cantilevered from
   * the wall round an open well, 1.16 m of tread from a rail at 0.67 m to the
   * wall — and the walk's inner clamp sat INSIDE the rail, so you could walk
   * through the balusters, and the walkable band was barely a body wide.
   * The well is closed now: the treads spring from a NEWEL, a concrete post
   * up the middle, and run out to the wall, so the whole bore is stair; the
   * handrail is on the WALL, where your hand is when you are going down a
   * spiral. Each tread is a slab with a rounded nosing, the pale poured
   * concrete of the rest of the stair. */
  const N = Math.round(M.TURNS * M.TREADS), stepA = TAU / M.TREADS;
  const NEWEL = M.NEWEL, tIn = NEWEL - 0.02, tOut = M.BORE - 0.015, half = stepA * 0.5 + 0.012;
  const treadShape = new THREE.Shape();
  treadShape.moveTo(Math.cos(-half) * tIn, Math.sin(-half) * tIn);
  treadShape.lineTo(Math.cos(-half) * tOut, Math.sin(-half) * tOut);
  for (let k = 1; k <= 8; k++) { const a = -half + (2 * half) * k / 8; treadShape.lineTo(Math.cos(a) * tOut, Math.sin(a) * tOut); }
  treadShape.lineTo(Math.cos(half) * tIn, Math.sin(half) * tIn);
  treadShape.closePath();
  const treadGeo = smoothNormals(new THREE.ExtrudeGeometry(treadShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }));
  treadGeo.rotateX(Math.PI / 2);
  mesh(new THREE.CylinderGeometry(NEWEL, NEWEL, M.H_ROOM + 1.0 - M.PLAT_TOP, 24), pale, 0, (M.PLAT_TOP + M.H_ROOM + 1.0) / 2, 0);
  mesh(new THREE.SphereGeometry(NEWEL + 0.02, 20, 12), pale, 0, M.H_ROOM + 1.0, 0);
  const railPts = [], RR = M.BORE - 0.09;
  let railEnd = null;
  for (let i = 0; i <= N; i++) {
    const a = M.A0 - i * stepA, y = M.PLAT_TOP + i * M.STEP;
    const tr = new THREE.Mesh(treadGeo, pale);
    tr.position.set(0, y, 0); tr.rotation.y = a - Math.PI / 2;
    g.add(tr);
    /* the wall-side handrail stops short of the head of the stair: carried on
     * to the top tread it ran across the mouth of the well at waist height, and
     * from the room the way down read as railed off.
     * AND IT STOPS BELOW THE ROOM'S FLOOR, WHICH IS WHERE ITS WALL STOPS. The
     * bore is a tube that ends at the floor; a rail 0.9 m over the treads rises
     * out of it over the last few steps, and those points stood in the open
     * mouth of the well with nothing behind them — the floating piece of
     * railing, seen from the room. `RAIL_TOP` is the last height it may reach,
     * and the end is turned back into the wall below. */
    const RAIL_TOP = M.H_ROOM - 0.08;
    if (a > M.TOP_ANG + M.GAP + 0.1 && y + 0.9 <= RAIL_TOP) {
      railPts.push(new THREE.Vector3(Math.sin(a) * RR, y + 0.9, Math.cos(a) * RR));
      railEnd = { a, y: y + 0.9 };
    }
    if (i % 3 === 0 && y + 0.86 <= RAIL_TOP && a > M.TOP_ANG + M.GAP + 0.1) {   // a bracket into the wall every third tread, only where there is rail and wall
      const [bx, bz] = at(a, M.BORE - 0.04);
      const br = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), iron, bx, y + 0.86, bz);
      br.rotation.z = Math.PI / 2; br.rotation.y = a;
    }
  }
  // the end turns back into the wall — a return, so it never ends in the air
  if (railEnd) {
    const e = railEnd, a2 = e.a - stepA * 0.35;
    railPts.push(new THREE.Vector3(Math.sin(a2) * (RR + 0.05), e.y - 0.02, Math.cos(a2) * (RR + 0.05)));
    railPts.push(new THREE.Vector3(Math.sin(a2 - 0.05) * (M.BORE + 0.06), e.y - 0.04, Math.cos(a2 - 0.05) * (M.BORE + 0.06)));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), N * 4, 0.022, 8), iron);
  // the rail round the well in the room, open where the stair arrives
  {
    const pts = [], a0 = M.TOP_ANG + M.GAP, a1 = M.TOP_ANG + TAU - M.GAP;
    for (let i = 0; i <= 44; i++) { const a = a0 + (a1 - a0) * i / 44; pts.push(new THREE.Vector3(Math.sin(a) * (M.BORE + 0.08), M.H_ROOM + 0.95, Math.cos(a) * (M.BORE + 0.08))); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 66, 0.022, 8), iron);
    for (let i = 0; i <= 11; i++) { const a = a0 + (a1 - a0) * i / 11; mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), iron, Math.sin(a) * (M.BORE + 0.08), M.H_ROOM + 0.475, Math.cos(a) * (M.BORE + 0.08)); }
    for (let i = 0; i <= 22; i++) { const a = a0 + (a1 - a0) * i / 22; mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.8, 5), iron, Math.sin(a) * (M.BORE + 0.08), M.H_ROOM + 0.5, Math.cos(a) * (M.BORE + 0.08)); }
    const p2 = pts.map((p) => new THREE.Vector3(p.x, M.H_ROOM + 0.12, p.z));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p2), 66, 0.012, 6), iron);
  }

  buildInterior({ g, M, mesh, arcBand, ringArc, at, rnd, colliders, shardAt, conc, inside, frame, iron, glass, dark, roofY });

  /* EVERY CONCRETE SURFACE IS MAPPED IN METRES. A cylinder's own UVs stretch
   * one map round a 32-metre drum and a 30-centimetre jamb alike, which is
   * most of why the old building's texture looked smeared in one place and
   * crowded in the next. In the house's own frame: anything facing up or down
   * is mapped in plan, anything standing is mapped by its arc length round
   * the axis and its height — so the board seams are level and the same size
   * on every wall, and they run straight across the joins between pieces. */
  g.updateMatrixWorld(true);
  const seen = new Map();
  g.traverse((o) => {
    if (!o.isMesh || !CONC.has(o.material)) return;
    let geo = o.geometry;
    if (seen.has(geo)) { geo = geo.clone(); o.geometry = geo; }
    seen.set(geo, true);
    const p = geo.attributes.position, n = geo.attributes.normal; if (!n) return;
    const uv = new Float32Array(p.count * 2), nm = new THREE.Matrix3().getNormalMatrix(o.matrix), N3 = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      V.fromBufferAttribute(p, i).applyMatrix4(o.matrix);
      N3.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      if (Math.abs(N3.y) > 0.7) { uv[i * 2] = V.x; uv[i * 2 + 1] = V.z; }
      else { const r = Math.max(0.6, Math.hypot(V.x, V.z)); uv[i * 2] = Math.atan2(V.x, V.z) * r; uv[i * 2 + 1] = V.y; }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  });

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, colliders, gate: gateInfo };
}
