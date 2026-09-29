import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  THE FISHERMAN'S ROD — what the Very Old Fisherman hands over when
 *  you give him back the leg he has been looking for. Built, like the
 *  katana and the lighthouse, because there is no scan of one here and
 *  a rod is four shapes and a lot of small repeated detail, which is
 *  exactly what a builder is good at and a photogrammetry scan is not.
 *
 *  Local frame: +Y up, the butt cap on y = 0, the tip ring at +ROD_LEN.
 *  1.72 m — a boat rod rather than a beach-caster, because a man who
 *  fishes off the end of his own pier is not casting a hundred yards.
 *
 *  WHAT MAKES IT READ AS A ROD rather than as a stick is not the blank,
 *  which is a dark taper a couple of centimetres across and nearly
 *  invisible at this scale: it is the FURNITURE. The two cork grips,
 *  the reel standing off the side, the ring of guides stepping down
 *  the taper and the line running through them are the whole
 *  silhouette, and every one of them is a hard shape against the sky.
 *
 *  AND THE VIEW-MODEL SCENE CARRIES NEARLY THREE UNITS OF LIGHT, which
 *  is the trap the katana paid for once and the peg paid for twice: a
 *  cork at its honest colour renders as bone in the fist. Everything
 *  here is mixed well down from the colour it "is", with each material
 *  carrying its own small emissive lift so it still reads on a beach
 *  under a quarter moon rather than going to a black cut-out.
 * ------------------------------------------------------------------ */

export const ROD_LEN = 1.72;
export const ROD_GRIP = 0.34;        // where a hand closes on it, up from the butt

const BUTT_R = 0.0130;               // the blank at the butt
const TIP_R = 0.0022;                // and at the tip: a real taper, not a dowel

/* the blank's radius at a height — two straight tapers with a step at the
 * ferrule, because a rod in sections is thicker above the joint than the
 * section below it finishes at */
const FERRULE = 0.86;
function blankR(y) {
  const t = y / ROD_LEN;
  const r = BUTT_R + (TIP_R - BUTT_R) * Math.pow(t, 0.78);
  return y > FERRULE ? r : r * 1.04;
}

function lathe(pts, seg = 14) {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

/* cork that has been held for forty years: a base tone with the pits drawn
 * in, quantised and nearest-filtered like every other canvas in this game */
function corkTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6b5334'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 128, y = Math.random() * 128, r = 0.7 + Math.random() * 2.3;
    const d = Math.random();
    g.fillStyle = d < 0.55 ? 'rgba(42,30,17,0.55)' : d < 0.85 ? 'rgba(126,102,68,0.45)' : 'rgba(24,16,8,0.6)';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // the dirt of a working grip, toward the butt
  const grd = g.createLinearGradient(0, 128, 0, 60);
  grd.addColorStop(0, 'rgba(18,13,7,0.5)'); grd.addColorStop(1, 'rgba(18,13,7,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeFishingRod() {
  const R = new THREE.Group();
  R.name = 'fishingRod';

  const cork = new THREE.MeshStandardMaterial({
    map: corkTex(), color: 0x6d6459, roughness: 0.95, metalness: 0,
    emissive: 0xffffff, emissiveIntensity: 0.10,
  });
  cork.emissiveMap = cork.map;
  const blankMat = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.34, metalness: 0, emissive: 0x0a0c10, emissiveIntensity: 1 });
  const whip = new THREE.MeshStandardMaterial({ color: 0x4a2d22, roughness: 0.8, emissive: 0x100806 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6d747c, roughness: 0.42, metalness: 0.18, emissive: 0x0d1013 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x6a5a34, roughness: 0.52, metalness: 0.12, emissive: 0x100c05 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x8f9aa2, roughness: 0.4, emissive: 0x161a1e });
  R.userData.mats = { cork, blankMat, whip, steel, brass, lineMat };

  // ---- the blank, in two tapers with a ferrule between them ---------
  const seg = (y0, y1, rad) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(blankR(y1), blankR(y0), y1 - y0, rad, 1, true), blankMat);
    m.position.y = (y0 + y1) / 2;
    return m;
  };
  R.add(seg(0.045, FERRULE, 10), seg(FERRULE, ROD_LEN, 8));
  // the ferrule itself: a whipped collar where the sections meet
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(blankR(FERRULE) * 1.28, blankR(FERRULE) * 1.34, 0.052, 10), whip);
  fer.position.y = FERRULE; R.add(fer);

  // ---- the butt: a rubber cap, the fore and rear cork grips ---------
  const cap = new THREE.Mesh(lathe([[0, 0], [0.0175, 0.002], [0.0190, 0.012], [0.0178, 0.045], [blankR(0.045), 0.047], [0, 0.047]], 14), whip);
  R.add(cap);
  const grip = (y0, y1, bulge) => {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = y0 + (y1 - y0) * t;
      // a grip swells in the middle and is turned down to the blank at each end
      const r = blankR(y) + bulge * (0.35 + 0.65 * Math.sin(Math.PI * t));
      pts.push([i === 0 || i === n ? blankR(y) + 0.001 : r, y]);
    }
    const m = new THREE.Mesh(lathe(pts, 14), cork);
    m.geometry.attributes.uv && m.geometry.setAttribute('uv', m.geometry.attributes.uv);
    return m;
  };
  R.add(grip(0.047, 0.205, 0.0135));      // the butt grip, under the elbow
  R.add(grip(0.315, 0.470, 0.0120));      // and the fore grip, where the hand goes

  // ---- the reel seat, and the reel standing off the side ------------
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(blankR(0.255) + 0.009, blankR(0.215) + 0.010, 0.108, 12), brass);
  seat.position.y = 0.262; R.add(seat);
  for (const y of [0.216, 0.306]) {                       // the two locking rings
    const ring = new THREE.Mesh(new THREE.TorusGeometry(blankR(y) + 0.011, 0.0035, 5, 12), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = y; R.add(ring);
  }
  /* The reel hangs UNDER the rod (local -Z) because that is the side the
   * guides are on and a reel above its own line is a reel nobody has used. */
  /* A REEL IS READ BY ITS BANDING, NOT BY ITS OUTLINE. The first one was a
   * single barrel lathe in the steel, and measured on screen it is 48 px by
   * 39 — big enough to see and, as one uniform pale capsule, completely
   * unreadable: the owner's picture of it is a white blob beside the cork.
   * What says "reel" at that size is the section a centrepin actually has —
   * a bright FLANGE, a dark pack of LINE, a bright flange again — so the
   * drum is three pieces and the middle one is the line's own colour.
   * The pillar and the handle are what break the circle. */
  const reel = new THREE.Group();
  reel.name = 'reel';                      // the game turns it while the line is paying out or coming in
  reel.position.set(0, 0.262, -0.052);
  const flange = (x) => {
    const f = new THREE.Mesh(lathe([
      [0, 0], [0.034, 0], [0.039, 0.003], [0.039, 0.007], [0.030, 0.009], [0, 0.009],
    ], 18), steel);
    f.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2;   // both rims facing out
    f.position.x = x;
    return f;
  };
  reel.add(flange(0.021), flange(-0.021));
  const pack = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.036, 18), lineMat);
  pack.rotation.z = Math.PI / 2; reel.add(pack);         // the line on the spool, dark between the rims
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.062, 8), brass);
  spindle.rotation.z = Math.PI / 2; reel.add(spindle);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.076), brass);
  foot.position.set(0, 0.006, 0.032); reel.add(foot);
  /* the handle stands off the near flange and OUT, so the silhouette has a
   * spoke in it — a disc with nothing sticking out of it is a wheel */
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.007, 0.007), brass);
  arm.position.set(0.045, -0.014, 0); arm.rotation.z = 0.42; reel.add(arm);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0040, 0.0040, 0.026, 6), brass);
  handle.rotation.z = Math.PI / 2; handle.position.set(0.058, -0.031, 0); reel.add(handle);
  const knob = new THREE.Mesh(lathe([[0, -0.012], [0.0090, -0.008], [0.0090, 0.008], [0, 0.012]], 10), whip);
  knob.rotation.z = Math.PI / 2; knob.position.set(0.072, -0.031, 0); reel.add(knob);
  R.add(reel);

  /* ---- the guides, and the line through them ----------------------
   * Stepping down the blank and getting smaller with it, each on a whipped
   * foot: this is the detail that says "rod" in silhouette, so it is the one
   * thing here that is not simplified away. */
  const GY = [0.56, 0.74, 0.92, 1.09, 1.25, 1.40, 1.54, 1.655];
  const path = [new THREE.Vector3(0, 0.262, -0.090)];        // off the spool
  for (let i = 0; i < GY.length; i++) {
    const y = GY[i];
    const last = i === GY.length - 1;
    const gr = (last ? 0.0085 : 0.0175 - 0.0013 * i);        // the ring's own radius
    const stand = blankR(y) + gr + 0.0035;                   // how far it stands off the blank
    const ring = new THREE.Mesh(new THREE.TorusGeometry(gr, last ? 0.0016 : 0.0013, 4, 12), steel);
    ring.position.set(0, y, -stand + gr * 0.15);
    ring.rotation.y = Math.PI / 2;                            // the ring faces along the rod
    R.add(ring);
    if (!last) {                                              // the whipping that holds it on
      for (const dy of [-0.016, 0.016]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(blankR(y) * 1.5, blankR(y) * 1.5, 0.013, 8), whip);
        w.position.set(0, y + dy, 0); R.add(w);
      }
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.020, stand - gr), steel);
      leg.position.set(0, y - 0.010, -(stand - gr) / 2); R.add(leg);
    } else {
      const tipw = new THREE.Mesh(new THREE.CylinderGeometry(blankR(y) * 1.9, blankR(y) * 1.9, 0.020, 8), whip);
      tipw.position.y = y - 0.014; R.add(tipw);
    }
    path.push(new THREE.Vector3(0, y, -stand + gr * 0.15));
  }
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 30, 0.0011, 4, false), lineMat);
  R.add(line);

  /* AND A TOOL HANGS FROM WHERE IT PIVOTS — the katana's rule, and the reason
   * the peg needed no grip slide. Built from the butt, the origin is 34 cm
   * below the hand, so every pose in the hand had to carry that offset in its
   * own numbers and the rod swung about a point in mid-air. Everything is
   * shifted down by `ROD_GRIP` instead, so y = 0 is where a fist closes and
   * the rod turns about the hand. */
  for (const o of R.children) { o.castShadow = false; o.receiveShadow = false; o.position.y -= ROD_GRIP; }
  R.traverse((o) => { if (o.isMesh) o.material.flatShading = false; });
  return R;
}

/* The pack's fallback drawing, until the render of the real thing lands:
 * a rod on the diagonal with the reel on it, which is the one silhouette
 * nothing else in the pack has. */
export function makeFishingRodIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d'); g.lineCap = 'round';
  g.strokeStyle = '#2b2e33'; g.lineWidth = 3.2;
  g.beginPath(); g.moveTo(9, 41); g.lineTo(39, 8); g.stroke();      // the blank
  g.strokeStyle = '#6b5334'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(9, 41); g.lineTo(17, 32); g.stroke();     // the cork
  g.strokeStyle = '#6a5a34'; g.lineWidth = 2;
  g.beginPath(); g.arc(20, 31, 4.6, 0, 7); g.stroke();              // the reel
  g.strokeStyle = '#8f9aa2'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(21, 35); g.lineTo(31, 22); g.lineTo(38, 9); g.stroke();
  for (const [x, y, r] of [[27, 22, 2.4], [33, 15, 1.9]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
  return c.toDataURL();
}
