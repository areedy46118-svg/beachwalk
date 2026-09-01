import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Bleeding syringe — a large glass hypodermic for drawing the pale
 *  blue haemolymph out of a horseshoe crab's hinge membrane.
 *
 *  Local frame:  needle points +Z,  plunger/thumb-rest extends -Z.
 *  Origin at the barrel centre. ~0.19 m long overall.
 *
 *  Combine hook:  the returned group carries
 *      group.userData.setFill(t)   // 0 = empty, 1 = full of blood
 *      group.userData.parts        // { rig, blood, needle, hub, tipZ }
 *  so the game can animate the draw (slide the plunger back, grow the
 *  blue column) when the syringe is combined with the crab.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const BARREL_LEN = 0.10;
const BARREL_R = 0.0115;

// a cylinder whose axis runs along +Z (length = geometry, then scale.z)
function zCyl(rTop, rBot, len, seg = 20, open = false) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
}

export function makeSyringe() {
  const s = new THREE.Group();
  s.name = 'syringe';

  const glass  = new THREE.MeshStandardMaterial({ color: 0xd6ecf2, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.22, emissive: 0x0a1216, side: THREE.DoubleSide, depthWrite: false });
  const grad   = new THREE.MeshStandardMaterial({ color: 0x8b9298, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.6 });
  const plastic= new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5, metalness: 0.0, emissive: 0x1c1e22 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.75, metalness: 0.0 });
  const blood  = new THREE.MeshStandardMaterial({ color: 0x2f7bff, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.82, emissive: 0x123bb0 });
  const steel  = new THREE.MeshStandardMaterial({ color: 0xcdd2da, roughness: 0.22, metalness: 0.92 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.85, emissive: 0x14161a });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xe6821c, roughness: 0.55, metalness: 0.05, emissive: 0x2a1503 });

  const frontZ = BARREL_LEN / 2;
  const backZ = -BARREL_LEN / 2;

  // ---- barrel ------------------------------------------------------
  const barrel = new THREE.Mesh(zCyl(BARREL_R, BARREL_R, BARREL_LEN, 24, true), glass);
  barrel.renderOrder = 2;
  s.add(barrel);

  // fine graduation marks
  for (let i = 1; i <= 6; i++) {
    const major = i % 2 === 0;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(BARREL_R + 0.0003, major ? 0.00022 : 0.00014, 4, major ? 20 : 14, major ? TAU : Math.PI * 0.7), grad);
    ring.position.z = backZ + (BARREL_LEN * 0.86) * (i / 7) + 0.006;
    s.add(ring);
  }

  // front shoulder tapering into the luer hub
  const shoulder = new THREE.Mesh(zCyl(0.004, BARREL_R, 0.012, 20), glass);
  shoulder.position.z = frontZ + 0.006;
  s.add(shoulder);

  // ---- finger flange at the back (small rounded ears) -------------
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.004, 24), plastic);
  flange.scale.set(0.023, 1, 0.009);
  flange.position.z = backZ - 0.001;
  s.add(flange);
  const collar = new THREE.Mesh(zCyl(BARREL_R + 0.0015, BARREL_R + 0.0015, 0.008, 20), plastic);
  collar.position.z = backZ + 0.003;
  s.add(collar);

  // ---- luer hub + needle ----------------------------------------
  const hub = new THREE.Mesh(zCyl(0.0032, 0.0052, 0.014, 16), hubMat);
  hub.position.z = frontZ + 0.019;
  s.add(hub);
  const NEEDLE_LEN = 0.055;
  const needle = new THREE.Mesh(zCyl(0.00085, 0.0011, NEEDLE_LEN, 12), steel);
  const tipZ = frontZ + 0.026 + NEEDLE_LEN;
  needle.position.z = frontZ + 0.026 + NEEDLE_LEN / 2;
  s.add(needle);
  // bevelled tip
  const bevel = new THREE.Mesh(new THREE.CylinderGeometry(0.00085, 0.0, 0.004, 12), steel);
  bevel.rotation.x = Math.PI / 2 + 0.5;
  bevel.position.set(0.0004, 0, tipZ - 0.001);
  s.add(bevel);

  // removable orange safety cap — covers most of the needle, hub shows
  const cap = new THREE.Group();
  cap.name = 'needleCap';
  const capLen = NEEDLE_LEN - 0.004;
  const capBody = new THREE.Mesh(zCyl(0.0027, 0.0034, capLen, 12), capMat);
  capBody.position.z = frontZ + 0.030 + capLen / 2;
  cap.add(capBody);
  cap.add(new THREE.Mesh(new THREE.SphereGeometry(0.0033, 10, 8), capMat).translateZ(frontZ + 0.030 + capLen));
  s.add(cap);

  // ---- plunger rig (slides in Z with the fill level) -----------
  const rig = new THREE.Group();
  s.add(rig);
  // slim cross-section rod
  const rodLen = BARREL_LEN + 0.028;
  for (let a = 0; a < 2; a++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(a ? 0.0016 : 0.0085, a ? 0.0085 : 0.0016, rodLen), plastic);
    fin.position.z = -rodLen / 2 - 0.003;
    rig.add(fin);
  }
  // small thumb rest
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.0035, 24), plastic);
  thumb.scale.set(0.0125, 1, 0.0125);
  thumb.position.z = -rodLen - 0.003;
  rig.add(thumb);
  // rubber piston (front of the rig, rides inside the barrel)
  const piston = new THREE.Mesh(zCyl(BARREL_R * 0.94, BARREL_R * 0.94, 0.008, 20), rubber);
  piston.position.z = 0;
  rig.add(piston);
  rig.userData.pistonHalf = 0.004;

  // ---- blood column inside the barrel ------------------------
  const bloodCol = new THREE.Mesh(zCyl(BARREL_R * 0.9, BARREL_R * 0.9, 1, 20), blood);
  bloodCol.renderOrder = 1;
  s.add(bloodCol);

  // ---- fill control -----------------------------------------
  const emptyPistonZ = frontZ - 0.006;              // t = 0 : piston near the tip
  const fullPistonZ = backZ + 0.012;                // t = 1 : piston pulled right back
  s.userData.setFill = (t) => {
    t = Math.max(0, Math.min(1, t));
    const pz = THREE.MathUtils.lerp(emptyPistonZ, fullPistonZ, t);
    rig.position.z = pz;
    const colFront = frontZ - 0.002;
    const len = Math.max(0.0004, colFront - (pz - rig.userData.pistonHalf));
    bloodCol.scale.z = len;
    bloodCol.position.z = colFront - len / 2;
    bloodCol.visible = t > 0.001;
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
  g.translate(24, 24); g.rotate(-Math.PI / 4); g.translate(-24, -24);
  // barrel
  g.fillStyle = '#dfe6ea'; g.fillRect(14, 20, 20, 8);
  g.strokeStyle = '#8a9096'; g.lineWidth = 1; g.strokeRect(14, 20, 20, 8);
  // blood
  g.fillStyle = '#2f7bff'; g.fillRect(15, 21, 11, 6);
  // plunger
  g.fillStyle = '#c9ced3'; g.fillRect(4, 22.5, 12, 3);
  g.fillRect(2, 19, 3, 10);
  // flange
  g.fillRect(32, 17, 3, 14);
  // needle
  g.strokeStyle = '#b9bec6'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(35, 24); g.lineTo(46, 24); g.stroke();
  g.restore();
  return c.toDataURL();
}
