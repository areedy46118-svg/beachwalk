import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Bleeding syringe — a big glass hypodermic for drawing the pale blue
 *  haemolymph out of a horseshoe crab's hinge membrane.
 *
 *  Local frame:  needle points +Z,  plunger/thumb-rest extends -Z.
 *  Origin at the barrel centre. ~0.20 m long overall.
 *
 *  Combine hook:  the returned group carries
 *      group.userData.setFill(t)   // 0 = empty, 1 = full of blood
 *      group.userData.parts        // { rig, blood, needle, hub, cap, tipZ }
 *  so the game can animate the draw (slide the plunger back, grow the
 *  blue column) when the syringe is combined with the crab.
 *
 *  WHAT MAKES A PROP READ AS REAL IS THE RECORD OF HOW IT WAS MADE.
 *  The first build was a white tube, a torus per graduation and a cone:
 *  in the hand it was a white stick with an orange tip. Everything here
 *  is a thing a real glass syringe actually has — the glass has a WALL
 *  (one lathe up the outside, over the tip and back down the bore, so
 *  the rim and the shoulder are real thickness and the silhouette reads
 *  as glass rather than as a painted cylinder); the scale is PRINTED,
 *  on a canvas, with numerals and long-and-short ticks, because that is
 *  what covers a real barrel and no amount of geometry gets it; there
 *  is a luer LOCK collar with a knurl, a coloured needle hub, a real
 *  lancet bevel with the lumen showing, a two-rib rubber piston and a
 *  dished thumb rest. And it has been USED: dried haemolymph round the
 *  hub, a stain on the piston, and the print worn off the barrel where
 *  a thumb goes.
 *
 *  AND THE VIEW-MODEL SCENE CARRIES ITS OWN LIGHTS — an ambient at 0.9
 *  and two directionals at 1.15 and 0.55 — so nearly three units land
 *  on whatever is in your fist. Medical white (0xe9ecef) blows out to a
 *  flat white bar there, which is exactly how the old one read. Every
 *  light colour here is chosen against that, not against paper.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const BARREL_LEN = 0.098;
const BARREL_R = 0.0128;
const WALL = 0.0013;                 // the glass's own thickness
const NEEDLE_LEN = 0.062;

// a cylinder whose axis runs along +Z
function zCyl(rTop, rBot, len, seg = 20, open = false) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
}
// a lathe whose axis runs along +Z, from a [radius, z] profile
function zLathe(pts, seg = 24) {
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(1e-5, p[0]), p[1])), seg);
  g.rotateX(Math.PI / 2);
  return g;
}

/* THE SCALE IS PRINTED, NOT MODELLED. Six torus rings round a barrel is
 * six draw calls and reads as six rings; a real syringe is covered in
 * fine print — a long tick per unit, a short one between, numerals, and
 * a maker's line — and the only way to get that at this size is a
 * canvas. It goes on a sleeve a quarter of a millimetre proud of the
 * glass with its own alpha, so the barrel stays transparent everywhere
 * the print is not. Drawn three times round so it reads from any angle
 * the hand happens to hold it at. */
function makeScaleTexture() {
  const W = 768, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  /* canvas x runs AROUND the barrel, y runs along it. A TICK IS SHORT.
   * The first build drew each one 148 px of 768 wide — nineteen per cent
   * of the circumference, which is a 69-degree ARC, and twenty-one of
   * those in three columns rendered as a comb of white bands spiralling
   * up the glass. A real graduation is a few degrees of arc. */
  const ink = 'rgba(228,238,244,0.90)', faint = 'rgba(228,238,244,0.5)';
  for (let slot = 0; slot < 2; slot++) {
    const cx = 150 + slot * 384;
    for (let i = 0; i <= 20; i++) {
      const major = i % 2 === 0;
      const y = H * 0.09 + (H * 0.80) * (i / 20);
      // the print is worn off where a thumb rides the barrel
      const worn = slot === 0 && i > 7 && i < 12;
      g.strokeStyle = worn ? 'rgba(228,238,244,0.14)' : (major ? ink : faint);
      g.lineWidth = major ? 4 : 2.5;
      g.beginPath();
      g.moveTo(cx - (major ? 23 : 12), y);
      g.lineTo(cx + (major ? 23 : 12), y);
      g.stroke();
      if (major && i > 0) {
        g.fillStyle = worn ? 'rgba(228,238,244,0.18)' : ink;
        g.font = 'bold 26px Helvetica, Arial, sans-serif';
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(String(i / 2), cx + 31, y);
      }
    }
    // maker's line down the barrel, tiny and half-legible, as printed things are
    g.save();
    g.translate(cx - 34, H * 0.5);
    g.rotate(-Math.PI / 2);
    g.fillStyle = 'rgba(228,238,244,0.34)';
    g.font = '17px Helvetica, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('10 mL  ·  LUER LOCK', 0, 0);
    g.restore();
  }
  // a few scratches, because a tool that has been in a pocket has some
  g.strokeStyle = 'rgba(214,232,240,0.10)';
  g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) {
    const x = (i * 149) % W, y = (i * 233) % H, l = 12 + (i * 37) % 34;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * 0.5, y + l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/* A REAL LANCET BEVEL, NOT A CONE ON THE END. The tip is cut by a PLANE
 * — so the opening is an ellipse and the lumen shows in it — which is
 * the one thing that says "needle" rather than "wire". The front ring of
 * an open tube is displaced along z by k·x, eased in over the last fifth
 * so the shaft behind it stays round. */
function bevelTube(rOut, len, k, seg = 16) {
  const g = zCyl(rOut, rOut * 1.06, len, seg, 6);
  const p = g.attributes.position;
  const half = len / 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const t = (z + half) / len;
    if (t > 0.78) p.setZ(i, z + k * x * ((t - 0.78) / 0.22));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export function makeSyringe() {
  const s = new THREE.Group();
  s.name = 'syringe';

  /* Every one of these is measured against the view-model scene's own
   * three units of light — see the note at the top of the file. */
  const glass = new THREE.MeshStandardMaterial({
    color: 0xa8b4b8, roughness: 0.05, metalness: 0.0, transparent: true,
    opacity: 0.19, emissive: 0x0a1014, side: THREE.DoubleSide, depthWrite: false,
  });
  const printMat = new THREE.MeshBasicMaterial({
    map: makeScaleTexture(), transparent: true, opacity: 0.9,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.46, metalness: 0.0, emissive: 0x121417 });
  /* the luer collar is the one piece of hardware on it, and at 0x5c636a it
   * was the most saturated thing on the prop: under this scene's blue
   * ambient it read as a bright blue band round the barrel and took the eye
   * off the glass. A neutral grey reads as the fitting it is. */
  const darkPl = new THREE.MeshStandardMaterial({ color: 0x64676a, roughness: 0.5, metalness: 0.08 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.86, metalness: 0.0 });
  const blood = new THREE.MeshStandardMaterial({ color: 0x2f7bff, roughness: 0.22, metalness: 0.0, transparent: true, opacity: 0.84, emissive: 0x123bb0 });
  // METALNESS IS A TRAP: no environment map here, so steel is a bright
  // rough dielectric or it renders as a dark rod with two pinpoints.
  const steel = new THREE.MeshStandardMaterial({ color: 0xa8b1ba, roughness: 0.28, metalness: 0.14, emissive: 0x15181c });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x6f7b74, roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.94, emissive: 0x0e1210 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xa85c11, roughness: 0.55, metalness: 0.03, emissive: 0x1d1003 });
  // dried haemolymph — what is left round a hub that has been used
  const dried = new THREE.MeshStandardMaterial({ color: 0x1b2634, roughness: 0.82, metalness: 0.0, transparent: true, opacity: 0.5 });

  const frontZ = BARREL_LEN / 2;
  const backZ = -BARREL_LEN / 2;
  const TIP_R = 0.0024;                       // the luer cone's mouth
  const conePeak = frontZ + 0.021;

  // ---- the glass: ONE shell, up the outside and back down the bore ---
  const gi = BARREL_R - WALL;
  const body = new THREE.Mesh(zLathe([
    [BARREL_R, backZ - 0.0016],               // back rim, outside
    [BARREL_R, frontZ - 0.002],
    [BARREL_R * 0.99, frontZ + 0.001],
    [0.0062, conePeak - 0.004],               // shoulder tapering to the luer cone
    [0.0052, conePeak],
    [TIP_R, conePeak],                        // the mouth
    [TIP_R * 0.62, conePeak - 0.0015],        // and back down the bore
    [0.0034, conePeak - 0.006],
    [gi * 0.92, frontZ - 0.001],
    [gi, frontZ - 0.006],
    [gi, backZ - 0.0016],
    [BARREL_R, backZ - 0.0016],
  ], 28), glass);
  body.renderOrder = 3;
  s.add(body);
  // a rolled bead at the back rim, which is how a glass barrel is finished
  const bead = new THREE.Mesh(new THREE.TorusGeometry(BARREL_R + 0.0002, 0.0011, 6, 26), glass);
  bead.position.z = backZ - 0.0016;
  bead.renderOrder = 3;
  s.add(bead);

  // ---- the printed scale, on its own sleeve --------------------------
  const print = new THREE.Mesh(zCyl(BARREL_R + 0.00028, BARREL_R + 0.00028, BARREL_LEN * 0.92, 28, true), printMat);
  print.position.z = -0.002;
  print.renderOrder = 4;
  s.add(print);

  // ---- finger flange: a disc with a rolled rim, not a slab -----------
  const fl = 0.0255;
  const flange = new THREE.Mesh(zLathe([
    [BARREL_R + 0.0012, backZ + 0.0015],
    [fl - 0.0016, backZ + 0.0012],
    [fl, backZ],
    [fl - 0.0016, backZ - 0.0035],
    [BARREL_R + 0.0012, backZ - 0.0038],
    [BARREL_R + 0.0012, backZ + 0.0015],
  ], 26), plastic);
  flange.scale.set(1, 0.42, 1);               // ears out to the sides, thin top and bottom
  s.add(flange);
  const collar = new THREE.Mesh(zLathe([
    [BARREL_R + 0.0014, backZ + 0.0095],
    [BARREL_R + 0.0019, backZ + 0.008],
    [BARREL_R + 0.0019, backZ - 0.0034],
    [BARREL_R + 0.0008, backZ - 0.0034],
    [BARREL_R + 0.0008, backZ + 0.0095],
    [BARREL_R + 0.0014, backZ + 0.0095],
  ], 26), plastic);
  s.add(collar);

  // ---- luer LOCK collar: a knurled ring round the cone ---------------
  const lockR = 0.0072;
  const lock = new THREE.Mesh(zLathe([
    [0.0056, frontZ + 0.0035],
    [lockR, frontZ + 0.005],
    [lockR, conePeak - 0.0015],
    [lockR - 0.0013, conePeak + 0.0005],
    [0.0048, conePeak + 0.0005],
    [0.0048, frontZ + 0.0035],
    [0.0056, frontZ + 0.0035],
  ], 22), darkPl);
  s.add(lock);
  // the knurl: eight shallow flutes down the collar, which is what your
  // fingers actually see of a luer lock
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.0011, 0.0011, 0.0125), darkPl);
    flute.position.set(Math.cos(a) * lockR, Math.sin(a) * lockR, frontZ + 0.0105);
    flute.rotation.z = a;
    s.add(flute);
  }

  // ---- needle hub, coloured the way a big-bore one is ---------------
  const hub = new THREE.Mesh(zLathe([
    [0.0028, conePeak + 0.0005],
    [0.0050, conePeak + 0.0012],
    [0.0050, conePeak + 0.0075],
    [0.0038, conePeak + 0.0125],
    [0.0022, conePeak + 0.0135],
    [0.0013, conePeak + 0.0135],
    [0.0013, conePeak + 0.0005],
    [0.0028, conePeak + 0.0005],
  ], 20), hubMat);
  s.add(hub);
  // dried haemolymph in the crease behind the hub
  const crust = new THREE.Mesh(new THREE.TorusGeometry(0.0046, 0.0009, 5, 18), dried);
  crust.position.z = conePeak + 0.0028;
  s.add(crust);

  // ---- the needle, with a real bevel --------------------------------
  const nZ0 = conePeak + 0.0125;
  const needle = new THREE.Mesh(bevelTube(0.0014, NEEDLE_LEN, 0.62, 16), steel);
  needle.position.z = nZ0 + NEEDLE_LEN / 2;
  s.add(needle);
  const tipZ = nZ0 + NEEDLE_LEN + 0.0009;
  // the lumen: the bore showing in the mouth of the bevel
  const lumen = new THREE.Mesh(new THREE.CircleGeometry(0.00092, 14),
    new THREE.MeshBasicMaterial({ color: 0x0b0e12, side: THREE.DoubleSide }));
  lumen.position.set(0, 0, tipZ - 0.0016);
  lumen.rotation.x = 0.55;
  lumen.scale.set(1, 1 / Math.cos(0.55), 1);
  s.add(lumen);

  // ---- removable safety cap ----------------------------------------
  const cap = new THREE.Group();
  cap.name = 'needleCap';
  const capLen = NEEDLE_LEN - 0.002;
  cap.add(new THREE.Mesh(zLathe([
    [0.0042, nZ0 + 0.001],
    [0.0042, nZ0 + 0.006],
    [0.0034, nZ0 + 0.010],
    [0.0031, nZ0 + capLen - 0.004],
    [0.0022, nZ0 + capLen],
    [0, nZ0 + capLen + 0.0014],
  ], 16), capMat));
  // the ridge a thumb pushes against
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.0044, 0.0007, 5, 16), capMat);
  capRing.position.z = nZ0 + 0.004;
  cap.add(capRing);
  s.add(cap);

  // ---- plunger rig (slides in Z with the fill level) ----------------
  const rig = new THREE.Group();
  s.add(rig);
  const rodLen = BARREL_LEN + 0.030;
  // a cross-section rod, tapering toward the piston the way a moulded one does
  for (let a = 0; a < 2; a++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(a ? 0.0018 : 0.0102, a ? 0.0102 : 0.0018, rodLen), plastic);
    fin.position.z = -rodLen / 2 - 0.0035;
    rig.add(fin);
  }
  // a stop collar partway down it — what a plunger hits at full draw
  const stop = new THREE.Mesh(zLathe([
    [0.0055, -rodLen + 0.014],
    [0.0082, -rodLen + 0.016],
    [0.0082, -rodLen + 0.0185],
    [0.0055, -rodLen + 0.0205],
    [0.0055, -rodLen + 0.014],
  ], 18), plastic);
  rig.add(stop);
  // dished thumb rest with a rolled rim
  const thumb = new THREE.Mesh(zLathe([
    [0, -rodLen - 0.0002],
    [0.0092, -rodLen - 0.0012],
    [0.0128, -rodLen - 0.0032],
    [0.0132, -rodLen - 0.0052],
    [0.0118, -rodLen - 0.0062],
    [0.0060, -rodLen - 0.0058],
    [0, -rodLen - 0.0050],
  ], 26), plastic);
  rig.add(thumb);
  /* the piston: black rubber with TWO sealing ribs, which is what a real
   * one has and is most of why it reads as rubber and not as a plug */
  const piston = new THREE.Mesh(zLathe([
    [0, 0.0062],
    [BARREL_R - WALL - 0.0016, 0.0058],
    [BARREL_R - WALL - 0.0002, 0.0035],      // front rib
    [BARREL_R - WALL - 0.0016, 0.0012],
    [BARREL_R - WALL - 0.0002, -0.0016],     // back rib
    [BARREL_R - WALL - 0.0020, -0.0042],
    [0.0030, -0.0050],
    [0, -0.0050],
  ], 22), rubber);
  rig.add(piston);
  rig.userData.pistonHalf = 0.0062;
  // a stain on the rubber: this one has drawn blood before
  const stain = new THREE.Mesh(zCyl(BARREL_R - WALL - 0.0007, BARREL_R - WALL - 0.0007, 0.0008, 18, true), dried);
  stain.position.z = 0.0052;
  rig.add(stain);

  // ---- blood column inside the barrel ------------------------------
  const bloodCol = new THREE.Mesh(zCyl(gi * 0.965, gi * 0.965, 1, 22), blood);
  bloodCol.renderOrder = 2;
  s.add(bloodCol);

  // ---- fill control -------------------------------------------------
  const emptyPistonZ = frontZ - 0.008;              // t = 0 : piston near the shoulder
  const fullPistonZ = backZ + 0.014;                // t = 1 : piston pulled right back
  s.userData.setFill = (t) => {
    t = Math.max(0, Math.min(1, t));
    const pz = THREE.MathUtils.lerp(emptyPistonZ, fullPistonZ, t);
    rig.position.z = pz;
    /* THE COLUMN STARTS AT THE PISTON'S FRONT FACE, AND THAT IS A PLUS.
     * Written as `pz - pistonHalf` it measured from the piston's BACK, so an
     * empty syringe carried eleven millimetres of blood sitting just behind
     * the shoulder — which nothing noticed while `visible` was hiding it, and
     * which `holdable`'s builder then switched straight back on, because that
     * loop forces every child of the clone visible to undo whatever the WORLD
     * hid. In the hand it was a bright blue band round an empty barrel. Both
     * halves are fixed: the arithmetic, and `bwKeepHidden`, which is the flag
     * that loop honours. */
    const colFront = frontZ - 0.003;
    const len = Math.max(0.0004, colFront - (pz + rig.userData.pistonHalf));
    bloodCol.scale.z = len;
    bloodCol.position.z = colFront - len / 2;
    bloodCol.visible = t > 0.001;
    bloodCol.userData.bwKeepHidden = !bloodCol.visible;
  };
  s.userData.parts = { rig, blood: bloodCol, needle, hub, cap, tipZ };
  s.userData.setFill(0);

  return s;
}

export function makeSyringeIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  g.save();
  // draw it along the diagonal so the full length fits the square
  g.translate(24, 24); g.rotate(-Math.PI / 4); g.translate(-24, -24);

  const cy = 24, top = cy - 3.5, h = 7;      // slim barrel, not a fat stub
  // plunger rod + thumb rest, pushed home at the back
  g.fillStyle = '#b9bec6';
  g.fillRect(2, cy - 0.9, 8, 1.8);
  g.fillRect(1, cy - 5, 2.5, 10);            // thumb rest
  // finger flange
  g.fillStyle = '#d5dade';
  g.fillRect(9, cy - 6, 2.5, 12);
  // glass barrel
  g.fillStyle = 'rgba(226,238,242,0.92)';
  g.fillRect(11, top, 22, h);
  g.strokeStyle = '#7d858c'; g.lineWidth = 1;
  g.strokeRect(11.5, top + 0.5, 21, h - 1);
  // graduation marks
  g.strokeStyle = 'rgba(90,100,110,0.85)'; g.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const x = 13 + i * 4;
    g.beginPath(); g.moveTo(x, top + 1); g.lineTo(x, top + (i % 2 ? 3 : 4.5)); g.stroke();
  }
  // shoulder tapering to the hub
  g.fillStyle = '#d5dade';
  g.beginPath();
  g.moveTo(33, top); g.lineTo(36, cy - 1.6);
  g.lineTo(36, cy + 1.6); g.lineTo(33, top + h);
  g.closePath(); g.fill();
  // luer hub
  g.fillStyle = '#aab0b6';
  g.fillRect(36, cy - 1.8, 3, 3.6);
  // needle
  g.strokeStyle = '#cfd5dd'; g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(39, cy); g.lineTo(46.5, cy); g.stroke();
  g.strokeStyle = '#8f979f'; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(44.5, cy); g.lineTo(46.5, cy - 1); g.stroke();
  g.restore();
  return c.toDataURL();
}
