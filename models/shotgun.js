import * as THREE from 'three';

/* THE DOUBLE — a side-by-side 12-bore boxlock, BUILT, the way the katana and the
 * lighthouse are built: a scan of a gun is a picture of a gun, and this one has
 * to break open on its own hinge, swing its own top lever and take two shells
 * into two chambers you can see down. Metres, the barrels along +X, up +Y, the
 * gun's RIGHT on +Z (forward x up), and the origin where the right hand closes
 * on the wrist — a tool hangs from where it pivots.
 *
 * What makes it read as a shotgun from the first frame is the two muzzles side
 * by side and the rib between them running back to the action, so those are
 * where the detail went: real bores (a dark tube inside each barrel, so the
 * muzzles are holes and not discs), a matted rib with a brass bead, a coin-
 * finished action with scroll engraving on it, and walnut with figure in it and
 * checkering where the hands go. Everything a hand moves is its own part:
 *
 *   sg.barrels   the barrels, rib, fore-end and the two chambered shells,
 *                      on a pivot at the hinge pin — rotation.z < 0 breaks it open
 *   sg.lever     the top lever, on its own pin — rotation.y < 0 opens it
 *   sg.chambers  [right, left]: { live, spent, mouth } in the barrels' frame
 *
 * and the named markers the game reads: `sgSight` (the rear of the rib),
 * `sgBead`, `sgMuzzleR`, `sgMuzzleL`. */

export const SG_BORE_Z = 0.0119;            // each bore's centre off the gun's centre line
export const SG_BORE_Y = 0.0225;            // and its height over the origin's frame (before the grip shift)
export const SG_BARREL = 0.71;              // 28 inches
export const SG_OPEN = -0.66;               // how far it breaks (radians about the hinge)
export const SG_HINGE_X = 0.150, SG_HINGE_Y = -0.004;   // the hinge pin, in the gun's drawn frame
export const SG_BREECH_X = 0.112;           // the breech face, where a seated shell's rim sits
export const SHELL_R = 0.0101, SHELL_L = 0.0690, SHELL_HEAD = 0.0145;

const tex = (w, h, draw, rep) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};
let _seed = 1;
const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };

/* WALNUT: a dark ground, grain running the length of the wood with a slow
 * wander in it, a few darker streaks of figure, and — in the panels given —
 * checkering, which is a diamond cross-hatch with a border, the thing that says
 * "the hand goes here" on every real stock. The panels are rounded polygons in
 * the texture's own 0..1 frame. */
function walnutTex(w, h, panels, seed) {
  _seed = seed;
  return tex(w, h, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#5b341c'); bg.addColorStop(0.5, '#4a2915'); bg.addColorStop(1, '#3a200f');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // the grain: long wavering lines, light and dark
    for (let i = 0; i < 150; i++) {
      const y0 = rnd() * h, amp = 2 + rnd() * 7, f = 0.004 + rnd() * 0.012, ph = rnd() * 6;
      g.strokeStyle = rnd() < 0.55 ? `rgba(24,10,4,${0.10 + rnd() * 0.28})` : `rgba(140,82,40,${0.06 + rnd() * 0.16})`;
      g.lineWidth = 0.6 + rnd() * 1.8;
      g.beginPath();
      for (let x = 0; x <= w; x += 6) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.25; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    // figure: a few dark swirls, the part of a stock you buy it for
    for (let i = 0; i < 6; i++) {
      const cx = rnd() * w, cy = rnd() * h, rx = 20 + rnd() * 60, ry = 4 + rnd() * 10;
      g.strokeStyle = `rgba(20,8,3,${0.18 + rnd() * 0.2})`; g.lineWidth = 1 + rnd() * 2;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx, cy, rx * (1 - k * 0.16), ry * (1 - k * 0.16), (rnd() - 0.5) * 0.3, 0, Math.PI * 2); g.stroke(); }
    }
    // a little dirt and wear: darker at the edges of the frame, lighter specks of handling
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '15,6,2' : '120,75,40'},${0.05 + rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1); }
    for (const P of panels || []) {
      g.save();
      g.beginPath();
      P.forEach(([u, v], i) => (i ? g.lineTo(u * w, (1 - v) * h) : g.moveTo(u * w, (1 - v) * h)));
      g.closePath();
      g.clip();
      g.fillStyle = 'rgba(30,14,6,0.35)'; g.fillRect(0, 0, w, h);
      g.lineWidth = 1;
      const step = Math.max(3, Math.round(w / 110));
      for (let s = -h; s < w + h; s += step) {
        g.strokeStyle = 'rgba(12,5,2,0.75)'; g.beginPath(); g.moveTo(s, 0); g.lineTo(s + h * 0.62, h); g.stroke();
        g.beginPath(); g.moveTo(s, h); g.lineTo(s + h * 0.62, 0); g.stroke();
        g.strokeStyle = 'rgba(150,96,52,0.22)'; g.beginPath(); g.moveTo(s + 1, 0); g.lineTo(s + 1 + h * 0.62, h); g.stroke();
      }
      g.restore();
      // the border of the panel, cut a little deeper
      g.strokeStyle = 'rgba(10,4,2,0.8)'; g.lineWidth = 2;
      g.beginPath();
      P.forEach(([u, v], i) => (i ? g.lineTo(u * w, (1 - v) * h) : g.moveTo(u * w, (1 - v) * h)));
      g.closePath(); g.stroke();
    }
  });
}

/* THE ACTION: coin finish — bright, slightly brushed steel — with scroll
 * engraving cut into it and a gold line inlaid round each panel. At night and
 * at this size the engraving is what makes the action read as an object rather
 * than a grey box: a pattern of dark curls on a pale ground.
 *
 * (It was one square tile laid over the side by its x and y — and over the TOP
 * by the same x and y, which on a face of constant y is one row of the texture
 * smeared across it: the top strap you look along when you aim was a set of
 * stripes. Each face is mapped on its own axes now (`triUV`), the side panel
 * gets a texture drawn to its own outline, and the strap gets its own.) */
const coinGround = (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#b8bcc3'); bg.addColorStop(0.5, '#a0a5ad'); bg.addColorStop(1, '#8a8f97');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(255,255,255,${0.03 + rnd() * 0.06})`; g.lineWidth = 1; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (rnd() - 0.5) * 4); g.stroke(); }
};
// scrolls: little spirals with leaves off them, the English "rose and scroll"
const scroll = (g, x, y, r, dir) => {
  g.beginPath();
  for (let a = 0; a < 9.5; a += 0.2) { const rr = r * (1 - a / 11); const px = x + Math.cos(a * dir) * rr, py = y + Math.sin(a * dir) * rr; a ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke();
  for (let k = 0; k < 3; k++) { const a = rnd() * 6.3, l = r * (0.5 + rnd() * 0.7); g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.quadraticCurveTo(x + Math.cos(a + 0.5) * (r + l), y + Math.sin(a + 0.5) * (r + l), x + Math.cos(a + 0.9) * (r + l * 1.3), y + Math.sin(a + 0.9) * (r + l * 1.3)); g.stroke(); }
};
/* a gold line laid `inset` pixels inside the outline `path` — a wide gold stroke
 * with a narrower one cut out of it, on its own layer, clipped to the shape */
function goldInset(g, w, h, path, inset, lw) {
  const L = document.createElement('canvas'); L.width = w; L.height = h;
  const q = L.getContext('2d');
  q.lineJoin = 'round';
  path(q); q.lineWidth = (inset + lw / 2) * 2; q.strokeStyle = '#e6c06a'; q.stroke();
  q.globalCompositeOperation = 'destination-out';
  path(q); q.lineWidth = Math.max(0.5, (inset - lw / 2) * 2); q.stroke();
  q.globalCompositeOperation = 'source-over';
  g.save(); path(g); g.clip(); g.drawImage(L, 0, 0); g.restore();
}
// the side panel, drawn to its own outline (`poly` in the texture's pixels)
function actionSideTex(poly, seed) {
  _seed = seed;
  return tex(512, 210, (g, w, h) => {
    coinGround(g, w, h);
    const path = (c) => { c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
    g.save(); path(g); g.clip();
    g.strokeStyle = 'rgba(28,30,36,0.82)'; g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) scroll(g, rnd() * w, rnd() * h, 5 + rnd() * 9, rnd() < 0.5 ? 1 : -1);
    g.restore();
    goldInset(g, w, h, path, 9, 2.2);
    // a dark cut outside the gold, and the panel's edge darkened where a hand has not polished it
    g.save(); path(g); g.clip(); path(g); g.lineWidth = 5; g.strokeStyle = 'rgba(20,22,28,0.55)'; g.stroke(); g.restore();
  });
}
// the top strap, the breech face and the bar: u along the gun, v across it
function actionWallTex(seed) {
  _seed = seed;
  return tex(512, 128, (g, w, h) => {
    coinGround(g, w, h);
    g.strokeStyle = 'rgba(28,30,36,0.80)'; g.lineWidth = 1.1;
    for (let i = 0; i < 34; i++) scroll(g, 20 + rnd() * (w - 40), h * 0.28 + rnd() * h * 0.44, 4 + rnd() * 6, rnd() < 0.5 ? 1 : -1);
    // gold lines down both edges of the strap, a dark cut either side of each
    for (const y of [h * 0.17, h * 0.83]) {
      g.fillStyle = 'rgba(20,22,28,0.6)'; g.fillRect(0, y - 3, w, 6);
      g.fillStyle = '#e6c06a'; g.fillRect(0, y - 1.2, w, 2.4);
    }
  });
}
// the top lever: coin steel, a gold line round it, and the thumbpiece checkered where the thumb pushes it over
function leverTex() {
  _seed = 41;
  return tex(256, 64, (g, w, h) => {
    coinGround(g, w, h);
    g.save(); g.beginPath(); g.rect(0, 0, w * 0.30, h); g.clip();
    g.strokeStyle = 'rgba(20,22,28,0.85)'; g.lineWidth = 1;
    for (let s = -h; s < w; s += 4) { g.beginPath(); g.moveTo(s, 0); g.lineTo(s + h, h); g.stroke(); g.beginPath(); g.moveTo(s + h, 0); g.lineTo(s, h); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(28,30,36,0.8)'; g.lineWidth = 1.1;
    for (let i = 0; i < 8; i++) scroll(g, w * 0.38 + rnd() * w * 0.55, h * 0.3 + rnd() * h * 0.4, 4 + rnd() * 4, rnd() < 0.5 ? 1 : -1);
    g.strokeStyle = '#e6c06a'; g.lineWidth = 2; g.strokeRect(5, 5, w - 10, h - 10);
  });
}
// lettering, gold in a dark cut: the maker on the rib, SAFE on the tang
function letterTex(text, w, h, px) {
  return tex(w, h, (g) => {
    g.fillStyle = '#15181d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c46e'; g.font = `bold ${px}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  });
}
/* EACH FACE MAPPED ON ITS OWN AXES. ExtrudeGeometry is unindexed, so a
 * triangle's three vertices are its own and can be given whatever uv its
 * face's normal asks for. `fn(p, n)` -> [u, v]; `from`/`to` limit it to a group. */
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tc = new THREE.Vector3(), _tn = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
function triUV(geo, fn, from = 0, to = Infinity) {
  const P = geo.attributes.position, U = geo.attributes.uv;
  const end = Math.min(P.count, to);
  for (let i = from; i + 2 < end; i += 3) {
    _ta.fromBufferAttribute(P, i); _tb.fromBufferAttribute(P, i + 1); _tc.fromBufferAttribute(P, i + 2);
    _tn.crossVectors(_t1.subVectors(_tb, _ta), _t2.subVectors(_tc, _ta)).normalize();
    for (const [k, p] of [[i, _ta], [i + 1, _tb], [i + 2, _tc]]) { const [u, v] = fn(p, _tn); U.setXY(k, u, v); }
  }
  U.needsUpdate = true;
}

/* BLUED STEEL. Nearly black with a cold blue in it, and the long polish lines a
 * barrel gets from being drawn through a cloth — which is what a highlight runs
 * along. Mapped on the lathe, u round the barrel and v along it. */
const blueTex = () => { _seed = 77; return tex(64, 512, (g, w, h) => {
  g.fillStyle = '#20252d'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,84,104' : '8,10,14'},${0.10 + rnd() * 0.20})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(110,90,70,${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 4, 2 + rnd() * 10); }   // wear, where the bluing has gone brown
}); };
const matTex = () => tex(64, 256, (g, w, h) => {      // the rib's matting: fine cross-cut lines
  g.fillStyle = '#1a1e24'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,92,110,0.5)'; g.lineWidth = 1;
  for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
});
const rubberTex = () => tex(64, 64, (g, w, h) => {
  g.fillStyle = '#16120f'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(70,58,48,0.6)';
  for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 2);
});

export function shotgunMats() {
  return {
    blue: new THREE.MeshStandardMaterial({ color: 0xffffff, map: blueTex(), roughness: 0.34, metalness: 0.05, emissive: 0x0b0e13, emissiveIntensity: 1 }),
    bore: new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9, metalness: 0, side: THREE.BackSide }),
    rib: new THREE.MeshStandardMaterial({ color: 0xffffff, map: matTex(), roughness: 0.6, metalness: 0.05 }),
    action: new THREE.MeshStandardMaterial({ color: 0xffffff, map: actionWallTex(5), roughness: 0.38, metalness: 0.08, emissive: 0x15161a, emissiveIntensity: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe6c06a, roughness: 0.28, metalness: 0.1, emissive: 0x4a3510, emissiveIntensity: 0.9 }),
    horn: new THREE.MeshStandardMaterial({ color: 0x1b1612, roughness: 0.35, metalness: 0, emissive: 0x060403, emissiveIntensity: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.42, metalness: 0.06, emissive: 0x08090b, emissiveIntensity: 1 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.30, metalness: 0.08, emissive: 0x1c1d22, emissiveIntensity: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xe0b85c, roughness: 0.28, metalness: 0.1, emissive: 0x4a3510, emissiveIntensity: 0.8 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0xffffff, map: rubberTex(), roughness: 0.92, metalness: 0 }),
    spacer: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 }),
  };
}

/* A 12-BORE SHELL. Red plastic hull with the long ribs a hull has, a brass head
 * with its rim and a primer in the middle of it, and the six-point star crimp
 * folded over the top — or, SPENT, the crimp blown open into a ragged mouth,
 * the inside of the hull scorched, the primer dented. Nose (the crimp) up +Y. */
const SHELL_MATS = {};
function shellMats() {
  if (SHELL_MATS.hull) return SHELL_MATS;
  SHELL_MATS.hull = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, emissive: 0x2a0606, emissiveIntensity: 1,
    map: tex(128, 64, (g, w, h) => {
      g.fillStyle = '#a3170f'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(60,4,2,0.45)'; g.fillRect(x, 0, 1, h); g.fillStyle = 'rgba(230,80,60,0.18)'; g.fillRect(x + 2, 0, 1, h); }
      // the printing, a band of it running round the hull
      g.fillStyle = 'rgba(245,235,220,0.85)'; g.font = 'bold 11px Georgia, serif'; g.textBaseline = 'middle';
      g.save(); g.translate(w * 0.5, h * 0.55); g.fillText('12 GA  00 BUCK', -48, 0); g.restore();
    }) });
  SHELL_MATS.inside = new THREE.MeshStandardMaterial({ color: 0x1a0d0a, roughness: 0.9, side: THREE.BackSide });
  SHELL_MATS.brass = new THREE.MeshStandardMaterial({ color: 0xd9b258, roughness: 0.30, metalness: 0.1, emissive: 0x3c2a0c, emissiveIntensity: 0.8 });
  SHELL_MATS.primer = new THREE.MeshStandardMaterial({ color: 0xc0c4ca, roughness: 0.35, metalness: 0.08, emissive: 0x2a2c30, emissiveIntensity: 0.6 });
  SHELL_MATS.crimp = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x220505, emissiveIntensity: 1,
    map: tex(64, 64, (g, w, h) => {
      g.fillStyle = '#a3170f'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(40,2,2,0.9)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w * 0.5, h / 2 + Math.sin(a) * h * 0.5); g.stroke(); }
      g.fillStyle = 'rgba(40,2,2,0.9)'; g.beginPath(); g.arc(w / 2, h / 2, 3, 0, 7); g.fill();
    }) });
  return SHELL_MATS;
}
export function makeShell(spent = false) {
  const M = shellMats(), g = new THREE.Group();
  const V = (x, y) => new THREE.Vector2(x, y);
  // the brass head: rim, a step, and the body of the head
  const head = new THREE.Mesh(new THREE.LatheGeometry([V(0, 0), V(SHELL_R + 0.0012, 0), V(SHELL_R + 0.0012, 0.0016), V(SHELL_R + 0.0002, 0.0019),
    V(SHELL_R + 0.0002, SHELL_HEAD), V(SHELL_R - 0.0003, SHELL_HEAD + 0.0004)], 24), M.brass);
  g.add(head);
  const pr = new THREE.Mesh(new THREE.CircleGeometry(0.0029, 16), M.primer);
  pr.rotation.x = Math.PI / 2; pr.position.y = spent ? 0.0003 : -0.0001; g.add(pr);
  if (spent) { const dent = new THREE.Mesh(new THREE.CircleGeometry(0.0009, 10), M.inside); dent.rotation.x = -Math.PI / 2; dent.position.y = -0.0002; g.add(dent); }
  const top = spent ? SHELL_L + 0.004 : SHELL_L;
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(SHELL_R - 0.0001, SHELL_R, top - SHELL_HEAD + 0.0005, 24, 1, true), M.hull);
  hull.position.y = SHELL_HEAD + (top - SHELL_HEAD) / 2 - 0.0002; g.add(hull);
  if (spent) {
    // the crimp blown open: six petals splayed out round a black mouth
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.0095, 0.0085), M.hull);
      const a = i / 6 * Math.PI * 2 + 0.26;
      p.position.set(Math.cos(a) * SHELL_R * 0.92, top + 0.0028, Math.sin(a) * SHELL_R * 0.92);
      p.lookAt(p.position.x * 3, top + 0.003, p.position.z * 3); p.rotateX(-0.45);
      p.material = M.hull; p.material.side = THREE.DoubleSide;
      g.add(p);
    }
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(SHELL_R - 0.0006, SHELL_R - 0.0006, top - SHELL_HEAD, 18, 1, true), M.inside);
    ins.position.y = SHELL_HEAD + (top - SHELL_HEAD) / 2; g.add(ins);
  } else {
    const cr = new THREE.Mesh(new THREE.CircleGeometry(SHELL_R - 0.0001, 24), M.crimp);
    cr.rotation.x = -Math.PI / 2; cr.position.y = top; g.add(cr);
  }
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return g;
}

/* THE WRIST'S TOP LINE, from the action's tang back to the nose of the comb —
 * the stock is drawn on it and the top tang lies along it. The wood's real
 * surface is `STOCK_BEVEL` above this line (the extrusion's bevel). */
const WRIST = [[0.016, 0.0258], [0.004, 0.024], [-0.032, 0.004], [-0.074, -0.005]];
const STOCK_BEVEL = 0.0070;
function wristTop(x) {
  const B = (t, i) => { const u = 1 - t; return u * u * u * WRIST[0][i] + 3 * u * u * t * WRIST[1][i] + 3 * u * t * t * WRIST[2][i] + t * t * t * WRIST[3][i]; };
  let lo = 0, hi = 1;
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (B(m, 0) > x) lo = m; else hi = m; }   // x falls along the curve
  return B((lo + hi) / 2, 1) + STOCK_BEVEL;
}

/* lay a mesh whose geometry was drawn along +Y onto +X (a lathe) */
const alongX = (m) => { m.rotation.z = -Math.PI / 2; return m; };

export function makeShotgun() {
  const M = shotgunMats();
  const root = new THREE.Group();
  root.name = 'shotgun';
  const gun = new THREE.Group();          // drawn in its own frame; the grip shift is applied to this at the end
  root.add(gun);
  const add = (m, parent = gun) => { m.castShadow = false; parent.add(m); return m; };
  const box = (sx, sy, sz, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); return add(m, parent); };
  const cyl = (r0, r1, h, mat, seg = 16, open = false) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat);

  /* ---- the barrels, on the hinge ---------------------------------------- */
  const HINGE = new THREE.Vector3(SG_HINGE_X, SG_HINGE_Y, 0);
  const BREECH_X = SG_BREECH_X;
  const barrels = new THREE.Group(); barrels.name = 'sgBarrels';
  barrels.position.copy(HINGE);
  gun.add(barrels);
  const bx = (x) => x - HINGE.x, by = (y) => y - HINGE.y;   // gun frame -> the barrels' frame
  const V = (x, y) => new THREE.Vector2(x, y);
  // each barrel a lathe: the chamber swell, a long taper, a hair of a lip at the muzzle
  const Rb = 0.0093;
  const prof = [V(Rb, 0), V(0.0131, 0), V(0.0133, 0.004), V(0.0131, 0.075), V(0.0124, 0.16), V(0.0116, 0.42), V(0.0110, 0.69), V(0.0113, 0.700), V(0.0112, SG_BARREL), V(Rb, SG_BARREL)];
  const chambers = [];
  for (const sz of [1, -1]) {            // +Z is the RIGHT barrel
    const z = sz * SG_BORE_Z;
    const tube = alongX(new THREE.Mesh(new THREE.LatheGeometry(prof, 28), M.blue));
    tube.position.set(bx(BREECH_X), by(SG_BORE_Y), z);
    add(tube, barrels);
    const bore = alongX(cyl(Rb, Rb, SG_BARREL - 0.002, M.bore, 20, true));
    bore.position.set(bx(BREECH_X) + SG_BARREL / 2, by(SG_BORE_Y), z);
    add(bore, barrels);
    // the extractor's half-moon at the breech, a lighter steel
    const ex = alongX(cyl(0.0136, 0.0136, 0.0022, M.silver, 20));
    ex.position.set(bx(BREECH_X) + 0.0011, by(SG_BORE_Y), z);
    ex.scale.set(1, 1, 1);
    add(ex, barrels);
    // the shells in this chamber: rim flush with the breech face, nose down the bore (+X)
    const mk = (spent) => { const s = makeShell(spent); s.rotation.z = -Math.PI / 2; s.position.set(bx(BREECH_X) - 0.0003, by(SG_BORE_Y), z); s.visible = false; s.userData.bwKeepHidden = true; return add(s, barrels); };
    const live = mk(false), spent = mk(true);
    live.name = sz > 0 ? 'sgLiveR' : 'sgLiveL'; spent.name = sz > 0 ? 'sgSpentR' : 'sgSpentL';
    const mouth = new THREE.Object3D(); mouth.name = sz > 0 ? 'sgMuzzleR' : 'sgMuzzleL';
    mouth.position.set(bx(BREECH_X) + SG_BARREL + 0.012, by(SG_BORE_Y), z);
    barrels.add(mouth);
    chambers.push({ live, spent, at: new THREE.Vector3(bx(BREECH_X), by(SG_BORE_Y), z) });
  }
  // the bores' own extractor cut, a slot between the half-moons where the leg runs
  box(0.004, 0.006, 0.006, M.dark, bx(BREECH_X) + 0.002, by(SG_BORE_Y - 0.012), 0, barrels);
  // the rib on top: a matted strip, and the bead at its front
  const ribY = SG_BORE_Y + 0.0118;
  /* the rib follows the barrels down: they taper 2 mm over their length, and a
   * rib laid level stood clear of them at the muzzle */
  const RIB_DROP = 0.0019;
  const follow = (m) => {
    const P = m.geometry.attributes.position, L = SG_BARREL - 0.004;
    for (let i = 0; i < P.count; i++) P.setY(i, P.getY(i) - (P.getX(i) / L + 0.5) * RIB_DROP);
    m.geometry.computeVertexNormals();
    return m;
  };
  follow(box(SG_BARREL - 0.004, 0.0032, 0.0105, M.rib, bx(BREECH_X) + SG_BARREL / 2, by(ribY), 0, barrels));
  for (const s of [-1, 1]) follow(box(SG_BARREL - 0.004, 0.004, 0.0016, M.blue, bx(BREECH_X) + SG_BARREL / 2, by(ribY - 0.0018), s * 0.0058, barrels));   // the rib's flanks
  /* THE BEADS. The front one is what you put on the thing, so it is a little
   * larger than it was and glows like polished brass under the moon; a small
   * silver one halfway down the rib, so down the sights the two make the
   * figure-eight a shotgunner checks his mount by. */
  const ribTop = (x) => by(ribY + 0.0016 - (x / SG_BARREL) * RIB_DROP);   // the rib's top, at x along it from the breech
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0030, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf0d27a, roughness: 0.22, metalness: 0.1, emissive: 0x6a4c14, emissiveIntensity: 1 }));
  bead.position.set(bx(BREECH_X) + SG_BARREL - 0.008, ribTop(SG_BARREL - 0.008) + 0.0018, 0); bead.name = 'sgBead';
  add(bead, barrels);
  const mid = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 10, 8), M.silver);
  mid.position.set(bx(BREECH_X) + SG_BARREL * 0.5, ribTop(SG_BARREL * 0.5) + 0.0008, 0);
  add(mid, barrels);
  // the maker on the rib's breech end, gold in the matting, read along it
  const lt = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.0068), new THREE.MeshStandardMaterial({ map: letterTex('W. HOLLOWAY & SON  ·  LONDON', 512, 48, 30), roughness: 0.5, emissive: 0x2a1e08, emissiveIntensity: 0.6, transparent: false }));
  lt.rotation.x = -Math.PI / 2;
  lt.position.set(bx(BREECH_X) + 0.050, ribTop(0.050) + 0.00015, 0);
  add(lt, barrels);
  const sight = new THREE.Object3D(); sight.name = 'sgSight';
  sight.position.set(bx(BREECH_X) + 0.004, by(ribY + 0.0030), 0);
  barrels.add(sight);
  // the bottom rib, between them underneath
  box(SG_BARREL - 0.18, 0.004, 0.006, M.blue, bx(BREECH_X) + SG_BARREL / 2 + 0.08, by(SG_BORE_Y - 0.0122), 0, barrels);
  // the lump under the breech, hooking round the hinge pin
  box(0.034, 0.016, 0.019, M.blue, bx(BREECH_X) + 0.019, by(0.006), 0, barrels);
  const hook = cyl(0.0085, 0.0085, 0.0185, M.blue, 16); hook.rotation.x = Math.PI / 2; hook.position.set(0, 0, 0); add(hook, barrels);
  // the muzzle ends: a ring of brighter steel where the bluing has worn off the crown
  for (const sz of [1, -1]) {
    const crown = alongX(new THREE.Mesh(new THREE.RingGeometry(Rb, 0.0112, 24), M.dark));
    crown.rotation.set(0, Math.PI / 2, 0);
    crown.position.set(bx(BREECH_X) + SG_BARREL + 0.0002, by(SG_BORE_Y), sz * SG_BORE_Z);
    add(crown, barrels);
  }

  /* ---- the fore-end, on the barrels -------------------------------------- */
  {
    const L = 0.215, W = 0.050, H = 0.030;
    const sh = new THREE.Shape();
    const r = 0.010;
    sh.moveTo(-W / 2 + r, -H / 2); sh.lineTo(W / 2 - r, -H / 2); sh.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
    sh.lineTo(W / 2 * 0.86, H / 2); sh.lineTo(-W / 2 * 0.86, H / 2); sh.lineTo(-W / 2, -H / 2 + r); sh.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.004, bevelSegments: 4, curveSegments: 6 });
    // taper the front end in, the way a splinter fore-end narrows to its tip
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const zz = P.getZ(i); const k = 1 - Math.max(0, (zz - L * 0.55) / (L * 0.45)) * 0.30; P.setX(i, P.getX(i) * k); P.setY(i, P.getY(i) * (0.9 + 0.1 * k)); }
    // planar uv down its length so the grain runs with the wood
    const uv = geo.attributes.uv;
    for (let i = 0; i < P.count; i++) uv.setXY(i, P.getZ(i) / L, (P.getX(i) + P.getY(i) * 0.3) / W + 0.5);
    geo.computeVertexNormals();
    const fmap = walnutTex(256, 128, [[[0.18, 0.12], [0.80, 0.12], [0.84, 0.88], [0.14, 0.88]]], 33);
    const fore = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: fmap, roughness: 0.55, metalness: 0, emissive: 0x120804, emissiveIntensity: 1 }));
    fore.rotation.y = Math.PI / 2;          // its depth (+Z) down the barrels (+X)
    fore.position.set(bx(0.160), by(0.0045), 0);
    add(fore, barrels);
    // the fore-end iron: the steel at its back that latches to the knuckle
    box(0.020, 0.012, 0.040, M.action, bx(0.153), by(0.001), 0, barrels);
    // and its sling swivel
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0013, 6, 14), M.dark); sw.position.set(bx(0.40), by(-0.004), 0); sw.rotation.y = Math.PI / 2; add(sw, barrels);
    // the nose: a cap of black horn on the splinter's tip, and under it the latch you pull to take the fore-end off
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), M.horn);
    tip.scale.set(0.0085, 0.0132, 0.0160); tip.position.set(bx(0.160 + L + 0.0075), by(0.0040), 0); add(tip, barrels);
    box(0.014, 0.0026, 0.0090, M.silver, bx(0.352), by(-0.0152), 0, barrels);
    box(0.0030, 0.0030, 0.0060, M.dark, bx(0.3585), by(-0.0150), 0, barrels);
    // and the fore-end iron's escutcheon screw, each side
    for (const s of [-1, 1]) { const es = cyl(0.0022, 0.0022, 0.0008, M.silver, 10); es.rotation.x = Math.PI / 2; es.position.set(bx(0.150), by(0.001), s * 0.0204); add(es, barrels); }
  }

  /* ---- the action (fixed) ------------------------------------------------- */
  {
    // its side profile, extruded across the gun: the standing breech at the back
    // of the bores, the bar running forward under them to the rounded knuckle
    const sh = new THREE.Shape();
    sh.moveTo(0.020, -0.016);
    sh.lineTo(0.104, -0.016);
    sh.lineTo(0.112, -0.012);
    sh.lineTo(0.146, -0.012);
    sh.absarc(HINGE.x, HINGE.y, 0.0095, -Math.PI * 0.5, Math.PI * 0.45, false);
    sh.lineTo(0.118, 0.006);
    sh.lineTo(0.112, 0.008);
    sh.lineTo(0.112, 0.0345);
    sh.quadraticCurveTo(0.109, 0.0372, 0.100, 0.0372);   // the top of the action flush with the rib
    sh.lineTo(0.032, 0.0366);
    sh.quadraticCurveTo(0.019, 0.0335, 0.020, 0.020);
    sh.lineTo(0.020, -0.016);
    const W = 0.046;
    const geo = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.0025, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -W / 2);
    // the side panels on the side texture, drawn to this very outline; everything else on the strap's
    const SX0 = 0.014, SX1 = 0.162, SY0 = -0.021, SY1 = 0.040, TW = 512, TH = 210;
    const sideUV = (x, y) => [(x - SX0) / (SX1 - SX0), (y - SY0) / (SY1 - SY0)];
    const poly = sh.getPoints(10).map((p) => { const [u, v] = sideUV(p.x, p.y); return [u * TW, (1 - v) * TH]; });
    const caps = geo.groups[0], walls = geo.groups[1];
    triUV(geo, (p) => sideUV(p.x, p.y), caps.start, caps.start + caps.count);
    triUV(geo, (p, n) => Math.abs(n.x) > 0.7
      ? [(p.z + 0.026) / 0.052 * 0.2, (p.y - SY0) / (SY1 - SY0)]          // the breech face and the back of the action: plain
      : [(p.x - SX0) / (SX1 - SX0), (p.z + 0.026) / 0.052], walls.start, walls.start + walls.count);
    geo.computeVertexNormals();
    const sideMat = M.action.clone(); sideMat.map = actionSideTex(poly, 7);
    add(new THREE.Mesh(geo, [sideMat, M.action]));
    // the hinge pin, its head showing on the side of the knuckle, a slot cut across it
    /* (The extrusion's bevel pushes every WALL 2.5 mm out past the outline — the
     * breech face is at 0.1145, the strap's top at 0.0397 — while the side faces
     * stay at ±(W/2 + 0.003). Whatever sits on a surface is placed on these.) */
    const BEV = 0.0025, BFACE = SG_BREECH_X + BEV, SIDE = W / 2 + 0.003, STRAP = 0.0372 + BEV, TABLE = 0.006 + BEV;
    const pin = cyl(0.0042, 0.0042, SIDE * 2 + 0.0008, M.silver, 14); pin.rotation.x = Math.PI / 2; pin.position.copy(HINGE); add(pin);
    for (const s of [-1, 1]) box(0.0068, 0.0007, 0.0004, M.dark, HINGE.x, HINGE.y, s * (SIDE + 0.0005));
    // screw heads and pins on the side panel, each with its slot
    for (const [x, y] of [[0.040, 0.010], [0.078, -0.004], [0.090, 0.026]]) for (const s of [-1, 1]) {
      const sc = cyl(0.0028, 0.0028, 0.0012, M.silver, 12); sc.rotation.x = Math.PI / 2; sc.position.set(x, y, s * (W / 2 + 0.0028)); add(sc);
      box(0.0045, 0.0006, 0.0004, M.dark, x, y, s * (W / 2 + 0.0036));
    }
    /* THE FENCES: the two domed shoulders either side of the top of the
     * standing breech, which on every good side-by-side is where the engraver
     * spends himself, and which sit just proud of the barrels' breech ends. */
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.0134, 20, 14, 0, Math.PI), M.action);
      f.rotation.y = -Math.PI / 2;             // the dome faces back; its flat face is the breech face
      f.scale.set(1.0, 0.95, 0.9);
      f.position.set(BFACE, 0.0270, s * 0.0172);
      add(f);
    }
    /* THE BREECH FACE, seen only with the gun broken: a firing-pin bushing in
     * front of each bore with the pin's hole in it, and the water table under
     * the barrels with the slot the lumps drop into and the two cocking dogs
     * standing up at the knuckle. */
    for (const s of [-1, 1]) {
      const bu = new THREE.Mesh(new THREE.CircleGeometry(0.0044, 18), M.silver); bu.rotation.y = Math.PI / 2; bu.position.set(BFACE + 0.0002, SG_BORE_Y, s * SG_BORE_Z); add(bu);
      const ho = new THREE.Mesh(new THREE.CircleGeometry(0.0011, 10), new THREE.MeshBasicMaterial({ color: 0x050506 })); ho.rotation.y = Math.PI / 2; ho.position.set(BFACE + 0.0004, SG_BORE_Y, s * SG_BORE_Z); add(ho);
      box(0.0060, 0.0030, 0.0040, M.silver, 0.143, TABLE + 0.0014, s * 0.0085);   // the cocking dogs
    }
    box(0.022, 0.0006, 0.019, M.dark, 0.131, TABLE + 0.0002, 0);                  // the bites' slot in the water table
    // the cocking indicators: two gold pins on the top strap behind the fences, which you see down the rib
    for (const s of [-1, 1]) { const ci = cyl(0.0013, 0.0013, 0.0008, M.gold, 10); ci.position.set(0.084, STRAP + 0.0003, s * 0.0105); add(ci); }
  }
  // the top lever, on its pin in the top strap: the blade runs back and to the right
  const lever = new THREE.Group(); lever.name = 'sgLever';
  lever.position.set(0.094, 0.0405, 0);
  gun.add(lever);
  {
    /* a blade that swells into the thumbpiece at its tail, the tail turned up a
     * little so a thumb finds it, checkered there and engraved along the rest */
    const sh = new THREE.Shape();
    sh.moveTo(0.005, -0.0068);
    sh.bezierCurveTo(-0.012, -0.0060, -0.026, -0.0040, -0.036, -0.0062);
    sh.quadraticCurveTo(-0.048, -0.0072, -0.047, 0.0012);
    sh.quadraticCurveTo(-0.045, 0.0080, -0.034, 0.0064);
    sh.bezierCurveTo(-0.024, 0.0050, -0.012, 0.0062, 0.005, 0.0068);
    sh.lineTo(0.005, -0.0068);
    const g2 = new THREE.ExtrudeGeometry(sh, { depth: 0.0042, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0009, bevelSegments: 3, curveSegments: 10 });
    const P2 = g2.attributes.position, U2 = g2.attributes.uv;
    for (let i = 0; i < P2.count; i++) U2.setXY(i, (P2.getX(i) + 0.049) / 0.055, (P2.getY(i) + 0.009) / 0.018);
    // the tail turned up: lift the thumbpiece's vertices as they go back
    for (let i = 0; i < P2.count; i++) { const x = P2.getX(i); if (x < -0.030) P2.setZ(i, P2.getZ(i) - Math.pow((-0.030 - x) / 0.019, 2) * 0.0024); }
    g2.rotateX(Math.PI / 2);   // lay it flat on the strap (its depth goes DOWN, so the lifted tail rises)
    g2.computeVertexNormals();
    const lm = M.action.clone(); lm.map = leverTex();
    const m = new THREE.Mesh(g2, lm);
    m.position.y = 0.0042;
    m.rotation.y = 0.18;       // it rests angled a little to the right (+Z), as top levers do
    lever.add(m);
    const pv = cyl(0.0058, 0.0058, 0.0062, M.silver, 18); pv.position.y = 0.0028; lever.add(pv);
    box(0.0090, 0.0006, 0.0007, M.dark, 0, 0.0060, 0, lever);           // the spindle's slot
  }
  /* THE TOP TANG: the strap carried back off the action over the top of the
   * wrist, let into the wood and screwed down through it, with the safety on
   * it — a slide grooved for the thumb, and SAFE in gold behind it where you
   * read it as you shoulder the gun. (The top lever's tail used to come down on
   * the safety: there was no tang for the safety to sit on but the lever's.) */
  {
    const actTop = (x) => {                       // the action's own top, round its rear corner
      if (x >= 0.032) return 0.0372 + 0.0025;
      const t = Math.max(0, Math.min(1, (0.032 - x) / 0.012));
      return (1 - t) * (1 - t) * 0.0366 + 2 * (1 - t) * t * 0.0335 + t * t * 0.020 + 0.0025;
    };
    const topAt = (x) => Math.max(actTop(x), x < 0.024 ? wristTop(x) : -1);
    const xs = []; for (let x = 0.036; x >= -0.016; x -= 0.002) xs.push(x);
    const ts = new THREE.Shape();
    xs.forEach((x, i) => (i ? ts.lineTo(x, topAt(x) + 0.0007) : ts.moveTo(x, topAt(x) + 0.0007)));
    ts.quadraticCurveTo(-0.020, topAt(-0.016) - 0.0004, -0.016, topAt(-0.016) - 0.0016);
    for (let i = xs.length - 1; i >= 0; i--) ts.lineTo(xs[i], topAt(xs[i]) - 0.0016);
    const TWD = 0.0105;
    const tg = new THREE.ExtrudeGeometry(ts, { depth: TWD, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0004, bevelSegments: 2 });
    tg.translate(0, 0, -TWD / 2);
    triUV(tg, (q) => [(q.x + 0.02) / 0.06 * 0.12 + 0.02, (q.z + 0.006) / 0.012]);
    tg.computeVertexNormals();
    add(new THREE.Mesh(tg, M.action));
    const T = (x) => topAt(x) + 0.0007;
    box(0.010, 0.0026, 0.0068, M.silver, 0.010, T(0.010) + 0.0012, 0);
    for (let k = 0; k < 4; k++) box(0.0008, 0.0006, 0.0070, M.dark, 0.0064 + k * 0.0024, T(0.010) + 0.0026, 0);
    const sf = new THREE.Mesh(new THREE.PlaneGeometry(0.0095, 0.0036), new THREE.MeshStandardMaterial({ map: letterTex('SAFE', 128, 48, 36), roughness: 0.5, emissive: 0x2a1e08, emissiveIntensity: 0.6 }));
    sf.rotation.x = -Math.PI / 2; sf.rotation.z = -Math.PI / 2;  // read from behind, by the man holding it: left to right across the tang
    sf.position.set(-0.001, T(-0.001) + 0.0002, 0);
    add(sf);
    // and the tang's screw, at its tail
    const tsc = cyl(0.0022, 0.0022, 0.0008, M.silver, 12); tsc.position.set(-0.010, T(-0.010) + 0.0001, 0); add(tsc);
    box(0.0036, 0.0004, 0.0005, M.dark, -0.010, T(-0.010) + 0.0005, 0);
  }

  /* ---- the trigger guard and the two triggers ---------------------------- */
  {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.100, -0.016, 0), new THREE.Vector3(0.098, -0.030, 0), new THREE.Vector3(0.082, -0.042, 0),
      new THREE.Vector3(0.056, -0.043, 0), new THREE.Vector3(0.036, -0.036, 0), new THREE.Vector3(0.026, -0.024, 0),
      new THREE.Vector3(0.012, -0.022, 0), new THREE.Vector3(-0.030, -0.034, 0),
    ]);
    const gd = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.0028, 8, false), M.dark);
    gd.scale.z = 1.9; add(gd);
    for (const [x, y0] of [[0.076, 0], [0.060, 0]]) {   // the FRONT trigger fires the right barrel
      const tc = new THREE.CatmullRomCurve3([new THREE.Vector3(x, -0.016, 0), new THREE.Vector3(x - 0.003, -0.026, 0), new THREE.Vector3(x - 0.010, -0.033 + y0, 0)]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(tc, 12, 0.0022, 6, false), M.silver); t.scale.z = 1.6; add(t);
    }
  }

  /* ---- the stock ---------------------------------------------------------- */
  /* A SHOTGUN STOCK DROPS. It was drawn like a rifle's — the comb barely a
   * centimetre and a half under the rib and the heel ABOVE it — and the moment
   * the gun was shouldered properly, rib on the eye, the top of the wrist was a
   * slab of walnut filling the bottom of the view. A game gun's comb sits about
   * four centimetres under the line of the rib and its heel six: the eye rides
   * over the comb, and the wood falls away out of the sight picture. */
  {
    const sh = new THREE.Shape();
    sh.moveTo(WRIST[0][0], WRIST[0][1]);
    sh.bezierCurveTo(WRIST[1][0], WRIST[1][1], WRIST[2][0], WRIST[2][1], WRIST[3][0], WRIST[3][1]);   // the wrist, falling from the tang to the nose of the comb
    sh.bezierCurveTo(-0.150, -0.012, -0.262, -0.021, -0.350, -0.029);  // the comb, dropping to the heel
    sh.quadraticCurveTo(-0.360, -0.030, -0.361, -0.035);               // the heel's corner, rounded
    sh.lineTo(-0.373, -0.141);                                          // the butt, heel to toe
    sh.quadraticCurveTo(-0.372, -0.149, -0.363, -0.148);               // the toe
    sh.bezierCurveTo(-0.270, -0.120, -0.172, -0.092, -0.114, -0.075);  // the belly running forward
    sh.bezierCurveTo(-0.094, -0.070, -0.080, -0.078, -0.071, -0.090);  // into the grip
    sh.lineTo(-0.054, -0.097);                                          // the grip cap
    sh.bezierCurveTo(-0.040, -0.080, -0.018, -0.050, 0.004, -0.030);   // the front of the grip, up to the guard
    sh.lineTo(0.022, -0.016);
    sh.lineTo(0.022, 0.014);
    /* the head's top corner ROUNDED into the wrist: the bevel pushes a sharp
     * corner out along its bisector, and this one stood a spike of walnut 1.7 cm
     * over the tang, square in the sight picture */
    sh.quadraticCurveTo(0.022, 0.0245, WRIST[0][0], WRIST[0][1]);
    const D = 0.030, BT = 0.0075;
    const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: STOCK_BEVEL, bevelSegments: 5, curveSegments: 20 });
    geo.translate(0, 0, -D / 2);
    /* THE CROSS-SECTION IS AN OVAL, NOT A PLANK: the half-width follows the
     * stock along its length (narrow at the wrist, fullest at the butt) and is
     * taken in toward the top and bottom of the section at every station, so
     * the sides are crowned the way a stock maker shapes them. */
    const outline = sh.getPoints(30);
    const spanAt = (x) => {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < outline.length; i++) {
        const A = outline[i], B = outline[(i + 1) % outline.length];
        if ((A.x - x) * (B.x - x) > 0 || A.x === B.x) continue;
        const y = A.y + (B.y - A.y) * (x - A.x) / (B.x - A.x);
        lo = Math.min(lo, y); hi = Math.max(hi, y);
      }
      return lo < hi ? [lo, hi] : [-0.02, 0.02];
    };
    const widthK = (x) => x > -0.02 ? 0.86 : x > -0.12 ? 0.86 + (-0.02 - x) / 0.10 * 0.08 : 0.94 + Math.min(0.06, (-0.12 - x) / 0.22 * 0.06);
    const crown = (x, y) => { const [lo, hi] = spanAt(Math.max(-0.37, Math.min(0.021, x))); const t = Math.max(-1, Math.min(1, (y - (lo + hi) / 2) / ((hi - lo) / 2 + 1e-6))); return widthK(x) * (1 - 0.24 * t * t); };
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) * crown(P.getX(i), P.getY(i)));
    // the sides on the drawn panel, the top and the belly with the grain running down them, the butt across
    const X0 = -0.385, X1 = 0.035, Y0 = -0.155, Y1 = 0.045;
    const u = (x) => (x - X0) / (X1 - X0), v = (y) => (y - Y0) / (Y1 - Y0);
    triUV(geo, (p, n) => Math.abs(n.z) > 0.55 ? [u(p.x), v(p.y)]
      : Math.abs(n.x) > 0.8 ? [0.02 + (p.z + 0.03) / 0.06 * 0.1, v(p.y)]
      : [u(p.x), 0.40 + p.z / 0.06 * 0.2]);
    geo.computeVertexNormals();
    /* the checkering: one panel each side of the wrist, pointed fore and aft
     * along it, where the right hand closes */
    const grip = [[0.014, 0.016], [-0.006, 0.010], [-0.036, -0.002], [-0.064, -0.016], [-0.084, -0.038], [-0.082, -0.056], [-0.066, -0.070],
                  [-0.046, -0.070], [-0.026, -0.054], [-0.006, -0.034], [0.010, -0.018], [0.018, 0.002]].map(([x, y]) => [u(x), v(y)]);
    const smap = walnutTex(512, 244, [grip], 11);
    const stock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: smap, roughness: 0.55, metalness: 0, emissive: 0x120804, emissiveIntensity: 1 }));
    add(stock);
    // the butt pad: a white-line spacer and a ribbed rubber pad along the butt's own line
    const H0 = new THREE.Vector2(-0.361, -0.033), T0 = new THREE.Vector2(-0.373, -0.144);
    const ang = Math.atan2(T0.y - H0.y, T0.x - H0.x);
    const bl = H0.distanceTo(T0);
    const midP = new THREE.Vector3((H0.x + T0.x) / 2, (H0.y + T0.y) / 2, 0);
    const nrm = new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0);   // out of the butt
    const zb = (D / 2 + BT) * widthK(-0.37);
    // (the walls stand `bevelSize` out from the outline: the butt's face is 7 mm behind the line drawn above)
    const sp = box(0.003, bl + 0.012, zb * 2 * 0.97, M.spacer, 0, 0, 0); sp.position.copy(midP).addScaledVector(nrm, 0.0085); sp.rotation.z = ang + Math.PI / 2;
    const pad = box(0.016, bl + 0.016, zb * 2 * 1.0, M.rubber, 0, 0, 0); pad.position.copy(midP).addScaledVector(nrm, 0.0180); pad.rotation.z = ang + Math.PI / 2;
    // the grip cap, steel, laid on the cap's own line and on the bevelled surface under it
    const cap = cyl(0.0115, 0.0115, 0.0035, M.dark, 18); cap.position.set(-0.0657, -0.1013, 0); cap.rotation.z = -0.39; add(cap);
    // the stock oval: a gold escutcheon let into the right side, under the comb, for the owner's initials
    const zs = (D / 2 + BT) * crown(-0.170, -0.050);
    const ov = cyl(0.0105, 0.0105, 0.0010, M.gold, 22); ov.rotation.x = Math.PI / 2; ov.scale.set(1, 1, 0.62); ov.position.set(-0.170, -0.050, zs + 0.0002); add(ov);
    // the sling swivel on the belly
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0013, 6, 14), M.dark); sw.position.set(-0.27, -0.124, 0); sw.rotation.y = Math.PI / 2; add(sw);
  }

  /* THE TWO SHELLS THE RELOAD FEEDS IN. In the gun's own frame — the frame the
   * barrels' hinge is in — hidden until a reload carries them up into the open
   * chambers; the game works out their path off the barrels' angle each frame. */
  for (const nm of ['sgFeedR', 'sgFeedL']) { const s = makeShell(false); s.name = nm; s.visible = false; s.userData.bwKeepHidden = true; add(s); }

  /* THE GRIP IS THE ORIGIN. Where the right hand closes on the wrist, behind
   * the triggers — so every pose turns the gun about the hand that holds it. */
  const GRIP = new THREE.Vector3(-0.028, -0.030, 0);
  gun.position.copy(GRIP).negate();
  root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  root.sg = { barrels, lever, chambers, hinge: HINGE.clone().sub(GRIP) };   // NOT userData: clone() copies userData through JSON.stringify
  return root;
}

/* the pack's drawn picture, for the frames before the render of the real thing lands */
export function makeShotgunIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#7a4a2a'; g.lineWidth = 7; g.beginPath(); g.moveTo(5, 33); g.lineTo(16, 27); g.stroke();   // stock
  g.strokeStyle = '#a7acb4'; g.lineWidth = 6; g.beginPath(); g.moveTo(16, 26); g.lineTo(22, 24); g.stroke();   // action
  g.strokeStyle = '#3c434e'; g.lineWidth = 4; g.beginPath(); g.moveTo(21, 22); g.lineTo(44, 13); g.stroke();
  g.beginPath(); g.moveTo(21, 26); g.lineTo(44, 17); g.stroke();                                              // two barrels
  return c.toDataURL();
}
