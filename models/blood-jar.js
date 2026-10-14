import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Jar of blue blood — an old bleeding-jar of horseshoe-crab
 *  haemolymph: moulded glass, a crimped foil seal, and a printed label
 *  that has been in the damp for years.
 *
 *  Local frame:  +Y up, origin at the base.  ~0.15 m tall.
 *
 *  group.userData.setFill(t)   // 0 = empty, 1 = brim-full (default ~0.86)
 *
 *  WHAT MAKES A PROP READ AS OLD IS THE RECORD OF HOW IT WAS MADE AND
 *  WHAT HAS HAPPENED TO IT SINCE. The first build was a clean lathe: one
 *  smooth surface of revolution, a cap turned on the same lathe, and a
 *  label that was four black boxes. Nothing on it said "bottle" rather
 *  than "shape", because a real bottle carries the two MOULD SEAMS it
 *  was blown in, a heel ring it stands on, and a lip that is not quite
 *  round — and nothing on it said "old", because wear is contrast and
 *  there was none. Every addition below is one of those two things:
 *  evidence of manufacture, or evidence of time.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

// a lathe profile [ [radius, y], ... ] → smooth surface of revolution
function lathe(points, seg = 40) {
  const v = points.map((p) => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(v, seg);
}

// one deterministic hash, so a jar is the same jar every time the beach is
// rebuilt from seed — a checkpoint load must not re-crumple the foil
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function canvasTex(w, h, draw, { repeat = null, transparent = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!transparent) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  /* NEAREST on the way up, mipped on the way down — the beach's own
   * `retroTex` rule. A jar is the one prop you hold at arm's length on the
   * examine screen, so the marks are drawn BIG: anything finer than a
   * millimetre of real jar is gone at the retro scale and is only costing
   * a texture fetch. */
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/* THE LABEL, AND THE MILLILITRES LIVE HERE NOW. The corner of the screen
 * counts jars, because that is what you hold; "120 mL" is a fact about one
 * crab and it belongs printed on the thing itself, where a number that
 * never changes is exactly right. LIMULUS is the wreck's own name — she is
 * a horseshoe-crabbing boat, which is why her catch is still in her hold —
 * so the jar and the boat say the same word and neither has to explain it. */
function labelTex() {
  return canvasTex(256, 84, (g, w, h) => {
    // aged paper: a warm base, then blotched unevenly so it is not a wash
    g.fillStyle = '#d8cdaa'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = hash(i * 3.1) * w, y = hash(i * 5.7 + 9) * h;
      const r = 4 + hash(i * 2.3) * 22;
      g.fillStyle = `rgba(${140 + hash(i) * 60 | 0},${120 + hash(i + 3) * 55 | 0},80,0.10)`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // foxing — the brown speckle damp paper gets, and the thing that most
    // says "this has been somewhere wet"
    for (let i = 0; i < 260; i++) {
      const x = hash(i * 7.3 + 1) * w, y = hash(i * 11.9 + 4) * h;
      const r = 0.6 + hash(i * 1.7) * 2.2;
      g.fillStyle = `rgba(${90 + hash(i * 4) * 50 | 0},60,28,${0.10 + hash(i * 6) * 0.30})`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // a ring where something wet stood on it
    g.strokeStyle = 'rgba(104,74,36,0.30)'; g.lineWidth = 3;
    g.beginPath(); g.arc(w * 0.80, h * 0.62, 20, 0, TAU); g.stroke();

    const ink = '#24252c';
    g.strokeStyle = ink; g.lineWidth = 2;
    g.strokeRect(9, 7, w - 18, h - 14);
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(9, 27); g.lineTo(w - 9, 27); g.stroke();

    g.fillStyle = ink;
    g.font = 'bold 15px "Courier New", monospace';
    g.textBaseline = 'middle';
    g.fillText('LIMULUS  ·  HAEMOLYMPH', 16, 18);
    g.font = '11px "Courier New", monospace';
    g.fillText('DRAWN AT SHORE', 16, 40);
    g.fillText('KEEP COLD  ·  DO NOT FREEZE', 16, 54);
    // the printed volume, with the fill rule beside it
    g.font = 'bold 13px "Courier New", monospace';
    g.fillText('120 mL', 16, 70);
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(74, 70); g.lineTo(w - 58, 70); g.stroke();

    // the batch, written on by hand in a different ink
    g.save();
    g.translate(w - 54, 52); g.rotate(-0.05);
    g.fillStyle = 'rgba(38,44,78,0.85)';
    g.font = 'italic 17px "Georgia", serif';
    g.fillText('№ 41', 0, 0);
    g.restore();

    // and the ink has run where the paper got wet
    g.globalAlpha = 0.5;
    for (let i = 0; i < 9; i++) {
      const x = 16 + hash(i * 13.3) * (w - 60), y = 34 + hash(i * 9.1) * 40;
      g.fillStyle = 'rgba(36,37,44,0.5)';
      g.fillRect(x, y, 1 + hash(i * 3) * 2, 4 + hash(i * 5) * 12);
    }
    g.globalAlpha = 1;

    // torn away at the edges — drawn as paper-coloured bites out of a
    // transparent surround would need alpha, so the tear is DARK here and
    // the alpha map below cuts the same shape
    g.fillStyle = 'rgba(0,0,0,0)';
  });
}

/* THE TEAR IS ALPHA, so the label ends on a ragged edge rather than on a
 * rectangle. Drawn as one white field eaten into from both short ends,
 * because a label peels from its ends first — the glue in the middle is
 * the last thing to go. */
function labelAlpha() {
  return canvasTex(256, 84, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#000';
    for (let i = 0; i < 26; i++) {
      const y = (i / 26) * h;
      const l = 4 + hash(i * 2.9) * 9;
      const r = 3 + hash(i * 6.1 + 2) * 12;
      g.fillRect(0, y, l, h / 26 + 1);
      g.fillRect(w - r, y, r, h / 26 + 1);
    }
    // and a bite out of one corner
    g.beginPath(); g.moveTo(w, 0); g.lineTo(w - 42, 0); g.lineTo(w, 26); g.closePath(); g.fill();
  }, { transparent: true });
}

/* THE GLASS IS NOT OPTICALLY CLEAN. Old bottle glass carries a film, a
 * wash-line where the contents have sat, and the faint vertical striae of
 * the mould — without them a transparent lathe is a shape with nothing on
 * it to catch the light, which is what made the first one read as plastic. */
function glassGrimeTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c9d8de'; g.fillRect(0, 0, w, h);
    // vertical striae, the drawn record of the blow
    for (let i = 0; i < 34; i++) {
      const x = hash(i * 4.4) * w;
      g.fillStyle = `rgba(255,255,255,${0.04 + hash(i) * 0.09})`;
      g.fillRect(x, 0, 1 + hash(i * 2) * 1.5, h);
    }
    // smears and dust, heavier toward the bottom
    for (let i = 0; i < 120; i++) {
      const x = hash(i * 3.7 + 5) * w, y = Math.pow(hash(i * 8.2), 0.6) * h;
      g.fillStyle = `rgba(150,160,150,${0.05 + hash(i * 5) * 0.16})`;
      g.beginPath(); g.ellipse(x, y, 2 + hash(i) * 9, 1 + hash(i * 7) * 4, hash(i * 2) * 3, 0, TAU); g.fill();
    }
    // the tide-mark: where it has stood full for a long time
    g.fillStyle = 'rgba(126,148,170,0.34)';
    g.fillRect(0, h * 0.34, w, 3);
  }, { repeat: [1, 1] });
}

export function makeBloodJar() {
  const jar = new THREE.Group();
  jar.name = 'bloodJar';

  const R = 0.043, H = 0.088;            // body radius / height
  const NECK_R = 0.021, NECK_Y = H + 0.026;

  const grime = glassGrimeTex();
  const glass = new THREE.MeshStandardMaterial({
    color: 0xcfe2e8, map: grime, roughness: 0.22, metalness: 0,
    transparent: true, opacity: 0.30, emissive: 0x0b1114,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const blood = new THREE.MeshStandardMaterial({ color: 0x357dff, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.92, emissive: 0x1a48d0 });
  /* THE MENISCUS IS A RIM, NOT A LID. At opacity 0.9 the little dome on top
   * of the blood is a flat pale disc the whole width of the jar and it reads
   * as milk — the one thing that was worse than the old build. What a liquid
   * surface actually shows through glass is a bright RING where it climbs the
   * wall and almost nothing across the middle. */
  const foam  = new THREE.MeshStandardMaterial({ color: 0x9fb6e4, roughness: 0.95, metalness: 0, transparent: true, opacity: 0.42, emissive: 0x1b2438 });
  /* THE SEDIMENT IS WHAT SAYS IT HAS BEEN STANDING. Haemolymph settles;
   * a flat column of one blue is a glass of paint. */
  const silt  = new THREE.MeshStandardMaterial({ color: 0x14356e, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.95, emissive: 0x081a3a });
  const foil  = new THREE.MeshStandardMaterial({ color: 0x9d9174, roughness: 0.58, metalness: 0.72, emissive: 0x14120c });
  const crust = new THREE.MeshStandardMaterial({ color: 0x5d6f8e, roughness: 1.0, metalness: 0, emissive: 0x11182a });
  const paper = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: labelTex(), alphaMap: labelAlpha(),
    roughness: 0.95, metalness: 0, emissive: 0x201d14, emissiveMap: labelTex(),
    emissiveIntensity: 0.30, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide,
  });

  // ---- glass body: base → heel → straight wall → shoulder → neck → lip ----
  const body = new THREE.Mesh(lathe([
    [0.0, 0.004], [R * 0.52, 0.0015], [R * 0.90, 0.0],          // a punt: it stands on its heel
    [R * 0.995, 0.004], [R, 0.010],
    [R, H * 0.60], [R * 0.985, H * 0.78],
    [NECK_R + 0.008, H + 0.010], [NECK_R, H + 0.020],
    [NECK_R, NECK_Y], [NECK_R + 0.005, NECK_Y + 0.004], [NECK_R + 0.003, NECK_Y + 0.009],
  ], 44), glass);
  body.renderOrder = 3;
  jar.add(body);

  /* THE TWO MOULD SEAMS. A blown bottle carries the joint of the mould it
   * was made in, running up both sides from the heel to the shoulder — one
   * of the very few marks that says "bottle" from any distance, and the
   * cheapest detail on this model by a distance. */
  /* AND A SEAM IS NEVER UNDER THE LABEL. Both this geometry and the label's
   * arc are built in three's (sin, cos) convention, where theta 0 is +Z — so
   * seams at 0 and PI put one of them exactly down the middle of the printing,
   * which draws as a bright line across the words. They go on the flats, a
   * quarter turn round, which is where a two-piece mould actually joins and
   * why a label goes where it goes. */
  for (const sg of [Math.PI / 2, -Math.PI / 2]) {
    const seam = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.0006, R + 0.0006, H * 0.80, 3, 1, true, sg - 0.035, 0.07), glass);
    seam.position.y = H * 0.42;
    seam.renderOrder = 3;
    jar.add(seam);
  }
  // the heel ring it actually stands on
  const heel = new THREE.Mesh(new THREE.TorusGeometry(R * 0.93, 0.0022, 5, 26), glass);
  heel.rotation.x = Math.PI / 2; heel.position.y = 0.0022;
  heel.renderOrder = 3;
  jar.add(heel);

  // ---- blood column (a lathe so the meniscus domes at the top) ----
  const bloodMesh = new THREE.Mesh(new THREE.BufferGeometry(), blood);
  bloodMesh.renderOrder = 1;
  jar.add(bloodMesh);
  const siltMesh = new THREE.Mesh(lathe([[0, 0], [R * 0.9, 0], [R * 0.93, 0.0035], [0, 0.006]], 30), silt);
  siltMesh.position.y = 0.005;
  siltMesh.renderOrder = 1;
  jar.add(siltMesh);
  // a ring only: from 0.62 of the radius out to the wall, so the middle of
  // the surface is the blood itself and not a plate laid over it
  const foamMesh = new THREE.Mesh(lathe([[R * 0.62, 0.0], [R * 0.86, 0.0018], [R * 0.955, 0.005], [R * 0.955, 0.0]], 36), foam);
  foamMesh.renderOrder = 2;
  jar.add(foamMesh);

  /* AND BUBBLES CLING TO THE INSIDE. Eleven of them up one side, because
   * they collect where the glass was last disturbed, and they are the one
   * thing in here that tells you the contents are a LIQUID rather than a
   * blue solid poured into a bottle. */
  const bub = new THREE.Group();
  const bubMat = new THREE.MeshStandardMaterial({ color: 0xbcd4ff, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.55, emissive: 0x24406e });
  for (let i = 0; i < 11; i++) {
    const a = 0.5 + hash(i * 3.3) * 2.4, rr = 0.0009 + hash(i * 7.1) * 0.0016;
    const b = new THREE.Mesh(new THREE.SphereGeometry(rr, 6, 5), bubMat);
    b.position.set(Math.sin(a) * R * 0.93, 0.012 + hash(i * 5.5) * H * 0.62, Math.cos(a) * R * 0.93);
    bub.add(b);
  }
  jar.add(bub);

  function rebuildBlood(level) {                       // level in metres from base
    const rr = R * 0.955;
    bloodMesh.geometry.dispose();
    bloodMesh.geometry = lathe([
      [0, 0.004], [rr * 0.6, 0.002], [rr, 0.006],
      [rr, level - 0.008], [rr * 0.8, level - 0.001], [rr * 0.4, level + 0.0015], [0, level + 0.002],
    ], 40);
    foamMesh.position.y = level - 0.003;
    foamMesh.visible = level > 0.01;
    siltMesh.visible = level > 0.02;
    bub.visible = level > 0.02;
  }

  // ---- foil cap crimped down over the lip ----
  const cap = new THREE.Group();
  cap.name = 'jarCap';
  const capR = NECK_R + 0.004;
  const capGeo = lathe([
    [0, 0.011], [capR * 0.55, 0.012], [capR * 0.9, 0.009],
    [capR, 0.004], [capR, -0.009], [capR - 0.0015, -0.011], [capR - 0.003, -0.010],
  ], 30);
  /* CRIMPED, NOT TURNED. A lathe gives a perfect surface of revolution,
   * which is exactly what foil pressed down over a lip by hand is not: each
   * segment is pushed in or out a little so the highlight breaks up round
   * it. It is the same idea as the mounds' lumpy dome — every facet
   * catching the light differently is most of what reads as soft metal. */
  {
    const pos = capGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-5) continue;
      const a = Math.atan2(z, x);
      const k = 1 + (hash(Math.round(a * 8) * 2.7) - 0.5) * 0.10;
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    capGeo.computeVertexNormals();
  }
  const capMesh = new THREE.Mesh(capGeo, foil);
  capMesh.position.y = NECK_Y + 0.003;
  cap.add(capMesh);
  const crimp = new THREE.Mesh(new THREE.TorusGeometry(capR - 0.0008, 0.0013, 5, 30), foil);
  crimp.rotation.x = Math.PI / 2;
  crimp.position.y = NECK_Y - 0.006;
  cap.add(crimp);
  jar.add(cap);

  /* AND IT WAS FILLED IN A HURRY. A ring of dried haemolymph run down from
   * under the seal — the one mark that says somebody did this on a beach
   * and not in a laboratory. */
  const run = new THREE.Mesh(lathe([
    [NECK_R + 0.0012, 0], [NECK_R + 0.0022, -0.004], [NECK_R + 0.0012, -0.012],
  ], 22), crust);
  run.position.y = NECK_Y - 0.004;
  jar.add(run);

  // ---- paper label wrapped round the body, lifting at one end ----
  const labelGeo = new THREE.CylinderGeometry(R + 0.0004, R + 0.0004, H * 0.34, 44, 2, true, -1.1, 2.2);
  {
    // the last stretch of the wrap has let go of the glass
    const pos = labelGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const a = Math.atan2(x, z);                // 0 at the middle of the arc
      const t = Math.max(0, (a - 0.72) / 0.38);  // only the far end lifts
      if (t <= 0) continue;
      const k = 1 + t * t * 0.10;
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    labelGeo.computeVertexNormals();
  }
  const label = new THREE.Mesh(labelGeo, paper);
  label.position.y = H * 0.42;
  jar.add(label);

  jar.userData.setFill = (t) => {
    t = Math.max(0, Math.min(1, t));
    rebuildBlood(0.006 + t * (H - 0.012));
  };
  jar.userData.parts = { cap, blood: bloodMesh, foam: foamMesh, label };
  // what an EMPTY jar loses (`jarEmpty` in main.js): tagged here, because by colour the pale-blue glass
  // passes for blood in linear space and went with it, leaving a label and a cap in the air
  for (const o of [bloodMesh, siltMesh, foamMesh, ...bub.children]) o.userData.jarFluid = true;
  jar.userData.setFill(0.86);

  return jar;
}

export function makeBloodJarIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  // jar outline
  g.fillStyle = 'rgba(210,228,234,0.5)';
  g.beginPath();
  g.moveTo(15, 44); g.lineTo(15, 20); g.quadraticCurveTo(15, 12, 20, 10);
  g.lineTo(20, 5); g.lineTo(28, 5); g.lineTo(28, 10);
  g.quadraticCurveTo(33, 12, 33, 20); g.lineTo(33, 44); g.closePath();
  g.fill();
  // blood
  g.fillStyle = '#2f7bff';
  g.fillRect(16, 18, 16, 25);
  g.fillStyle = 'rgba(188,210,255,0.9)';
  g.fillRect(16, 16, 16, 3);
  // the label band
  g.fillStyle = 'rgba(214,202,168,0.92)';
  g.fillRect(15, 26, 18, 9);
  g.fillStyle = 'rgba(40,42,52,0.75)';
  g.fillRect(17, 28, 13, 1); g.fillRect(17, 31, 9, 1);
  // cap
  g.fillStyle = '#9d9174';
  g.fillRect(19, 3, 10, 4);
  // glass highlight
  g.strokeStyle = 'rgba(240,250,255,0.6)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(18, 22); g.lineTo(18, 40); g.stroke();
  return c.toDataURL();
}
