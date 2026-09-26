import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Plastic water bottle — a half-litre supermarket bottle, still
 *  sealed and full. Found by the bed in the drain chamber.
 *
 *  Local frame:  +Y up, standing on its base at y = 0. ~0.21 m tall.
 *
 *  group.userData.setFill(t)   // 0 = empty, 1 = full
 *  group.userData.parts        // { water, cap, label }
 * ------------------------------------------------------------------ */

const H = 0.205;          // overall height
const R = 0.0325;         // body radius
const NECK_R = 0.0135;

// lathe a profile spun round +Y
function lathe(pts, seg = 16) {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

export function makeWaterBottle() {
  const b = new THREE.Group();
  b.name = 'waterBottle';

  const plastic = new THREE.MeshStandardMaterial({
    color: 0xdff0f4, roughness: 0.14, metalness: 0, transparent: true,
    opacity: 0.30, emissive: 0x0b1417, side: THREE.DoubleSide, depthWrite: false,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x7fb9c9, roughness: 0.06, metalness: 0, transparent: true,
    opacity: 0.62, emissive: 0x14343f,
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2f6fb8, roughness: 0.5, emissive: 0x081726 });
  /* THE LABEL IS FrontSide, AND THE TEXT IS WHY. A label wrapped round a
   * bottle only ever shows its outside, and at DoubleSide what the icon
   * rendered was the far wall's INSIDE through the glass — "SPRING WATER"
   * backwards. Measured both ways in the icon rig: DoubleSide mirrored,
   * FrontSide reads. It is also one less face to draw. */
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex(), roughness: 0.85, emissive: 0x14161a, side: THREE.FrontSide,
  });

  // ---- body: base, ribbed waist, shoulder, neck ---------------------
  const prof = [
    [0, 0], [R * 0.62, 0], [R * 0.95, 0.006], [R, 0.02],
    [R, 0.044], [R * 0.80, 0.056], [R, 0.068],       // grip ribs
    [R, 0.092], [R * 0.80, 0.104], [R, 0.116],
    [R, 0.132],
    [R * 0.82, 0.152], [R * 0.46, 0.172], [NECK_R + 0.003, 0.181],
    [NECK_R, 0.186], [NECK_R, H - 0.012],
  ];
  const shell = new THREE.Mesh(lathe(prof, 18), plastic);
  shell.renderOrder = 2;
  b.add(shell);

  // the moulded base dimple, so it doesn't read as a plain cylinder
  const base = new THREE.Mesh(lathe([[0, 0.009], [R * 0.4, 0.004], [R * 0.66, 0.0], [R * 0.62, 0.002]], 18), plastic);
  b.add(base);

  // screw threads on the neck
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(NECK_R + 0.0012, 0.0011, 4, 14), capMat);
    t.rotation.x = Math.PI / 2;
    t.position.y = H - 0.030 + i * 0.006;
    t.material = plastic;
    b.add(t);
  }

  // ---- cap + tamper ring -------------------------------------------
  const cap = new THREE.Group();
  const capBody = new THREE.Mesh(new THREE.CylinderGeometry(NECK_R + 0.0035, NECK_R + 0.0035, 0.017, 16), capMat);
  capBody.position.y = H - 0.0075;
  cap.add(capBody);
  // knurling
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.015, 0.0016), capMat);
    k.position.set(Math.cos(a) * (NECK_R + 0.0038), H - 0.0075, Math.sin(a) * (NECK_R + 0.0038));
    cap.add(k);
  }
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(NECK_R + 0.003, NECK_R + 0.003, 0.004, 16), capMat);
  ring.position.y = H - 0.019;
  cap.add(ring);
  b.add(cap);

  // ---- the water inside --------------------------------------------
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 18), waterMat);
  water.renderOrder = 1;
  b.add(water);

  // ---- printed label ------------------------------------------------
  const label = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0006, R + 0.0006, 0.062, 18, 1, true), labelMat);
  label.position.y = 0.082;
  b.add(label);

  // ---- fill -----------------------------------------------------------
  const TOP = 0.176;                       // where a "full" bottle sits
  b.userData.setFill = (t) => {
    t = Math.max(0, Math.min(1, t));
    const h = Math.max(0.0008, TOP * t);
    water.scale.set(R * 0.955, h, R * 0.955);
    water.position.y = h / 2 + 0.004;
    // the shoulder narrows, so pinch the column when it's nearly full
    water.scale.x = water.scale.z = R * 0.955 * (t > 0.86 ? 0.72 : 1);
    water.visible = t > 0.004;
  };
  water.name = 'water';                   // so a copy in the hand can be found and drained
  b.userData.parts = { water, cap, label };
  b.userData.setFill(0.94);
  return b;
}

// a plain blue-and-white supermarket label
function labelTex() {
  const w = 128, h = 64;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#e8eef2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, 13);
  g.fillStyle = '#2f7fc4'; g.fillRect(0, h - 16, w, 16);
  // a wave band
  g.strokeStyle = '#7fc0e4'; g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x <= w; x += 4) g.lineTo(x, 30 + Math.sin(x * 0.12) * 5);
  g.stroke();
  g.fillStyle = '#14446f';
  g.font = 'bold 13px Georgia, serif'; g.textAlign = 'center';
  g.fillText('SPRING', w * 0.25, 25);
  g.fillText('WATER', w * 0.25, 40);
  g.fillText('SPRING', w * 0.75, 25);
  g.fillText('WATER', w * 0.75, 40);
  g.fillStyle = 'rgba(120,110,90,0.30)';           // grubby
  for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 2, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.anisotropy = 1;
  return t;
}

export function makeWaterBottleIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  // body
  g.fillStyle = '#cfe6ee'; g.strokeStyle = '#8fa8b4'; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(18, 44); g.lineTo(18, 20); g.lineTo(21, 14); g.lineTo(21, 7);
  g.lineTo(27, 7); g.lineTo(27, 14); g.lineTo(30, 20); g.lineTo(30, 44);
  g.closePath(); g.fill(); g.stroke();
  // water
  g.fillStyle = '#6fb0c6'; g.fillRect(19, 19, 10, 24);
  // label
  g.fillStyle = '#2f7fc4'; g.fillRect(18, 26, 12, 9);
  g.fillStyle = '#e8eef2'; g.fillRect(18, 29, 12, 3);
  // cap
  g.fillStyle = '#2f6fb8'; g.fillRect(20, 3, 8, 5);
  return c.toDataURL();
}
