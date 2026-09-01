import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Jar of blue blood — an old glass milk-bottle style jar, filled
 *  with glowing pale-blue horseshoe-crab haemolymph and capped with a
 *  crimped foil disc. What you get when you combine the crab and the
 *  bleeding syringe.
 *
 *  Local frame:  +Y up, origin at the base.  ~0.15 m tall.
 *
 *  group.userData.setFill(t)   // 0 = empty, 1 = brim-full (default ~0.86)
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

// a lathe profile [ [radius, y], ... ] → smooth surface of revolution
function lathe(points, seg = 40) {
  const v = points.map((p) => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(v, seg);
}

export function makeBloodJar() {
  const jar = new THREE.Group();
  jar.name = 'bloodJar';

  const R = 0.043, H = 0.088;            // body radius / height
  const NECK_R = 0.021, NECK_Y = H + 0.026;

  const glass = new THREE.MeshStandardMaterial({ color: 0xdfeef2, roughness: 0.07, metalness: 0, transparent: true, opacity: 0.24, emissive: 0x0a1013, side: THREE.DoubleSide, depthWrite: false });
  const blood = new THREE.MeshStandardMaterial({ color: 0x357dff, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.92, emissive: 0x1a48d0 });
  const foam  = new THREE.MeshStandardMaterial({ color: 0xc6d8ff, roughness: 0.95, metalness: 0, transparent: true, opacity: 0.9, emissive: 0x2a3856 });
  const foil  = new THREE.MeshStandardMaterial({ color: 0xd9c98a, roughness: 0.32, metalness: 0.85, emissive: 0x1a1710 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xe9e0c8, roughness: 0.92, metalness: 0, emissive: 0x1e1c15, side: THREE.DoubleSide });
  const inkMat = new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.8 });

  // ---- glass body: base → straight wall → shoulder → neck → lip ----
  const body = new THREE.Mesh(lathe([
    [0.0, 0.0], [R * 0.55, 0.0], [R, 0.006],
    [R, H * 0.60], [R * 0.985, H * 0.78],
    [NECK_R + 0.008, H + 0.010], [NECK_R, H + 0.020],
    [NECK_R, NECK_Y], [NECK_R + 0.005, NECK_Y + 0.004], [NECK_R + 0.003, NECK_Y + 0.009],
  ], 44), glass);
  body.renderOrder = 3;
  jar.add(body);

  // ---- blood column (a lathe so the meniscus domes at the top) ----
  const bloodMesh = new THREE.Mesh(new THREE.BufferGeometry(), blood);
  bloodMesh.renderOrder = 1;
  jar.add(bloodMesh);
  const foamMesh = new THREE.Mesh(lathe([[0, 0], [R * 0.9, 0], [R * 0.94, 0.004], [0, 0.0075]], 36), foam);
  foamMesh.renderOrder = 2;
  jar.add(foamMesh);

  function rebuildBlood(level) {                       // level in metres from base
    const rr = R * 0.955;
    bloodMesh.geometry.dispose();
    bloodMesh.geometry = lathe([
      [0, 0.004], [rr * 0.6, 0.002], [rr, 0.006],
      [rr, level - 0.008], [rr * 0.8, level - 0.001], [rr * 0.4, level + 0.0015], [0, level + 0.002],
    ], 40);
    foamMesh.position.y = level - 0.003;
    foamMesh.visible = level > 0.01;
  }

  // ---- foil cap crimped down over the lip ----
  const cap = new THREE.Group();
  cap.name = 'jarCap';
  const capR = NECK_R + 0.004;
  const capMesh = new THREE.Mesh(lathe([
    [0, 0.011], [capR * 0.55, 0.012], [capR * 0.9, 0.009],
    [capR, 0.004], [capR, -0.009], [capR - 0.0015, -0.011], [capR - 0.003, -0.010],
  ], 32), foil);
  capMesh.position.y = NECK_Y + 0.003;
  cap.add(capMesh);
  const crimp = new THREE.Mesh(new THREE.TorusGeometry(capR - 0.0008, 0.0013, 5, 30), foil);
  crimp.rotation.x = Math.PI / 2;
  crimp.position.y = NECK_Y - 0.006;
  cap.add(crimp);
  jar.add(cap);

  // ---- paper label wrapped round the body ----
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.0004, R + 0.0004, H * 0.34, 40, 1, true, -1.1, 2.2), paper);
  label.position.y = H * 0.42;
  jar.add(label);
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.022 - i * 0.003, 0.0018, 0.0006), inkMat);
    line.position.set(0, H * 0.42 + 0.012 - i * 0.008, R + 0.0009);
    jar.add(line);
  }

  jar.userData.setFill = (t) => {
    t = Math.max(0, Math.min(1, t));
    rebuildBlood(0.006 + t * (H - 0.012));
  };
  jar.userData.parts = { cap, blood: bloodMesh, foam: foamMesh };
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
  // cap
  g.fillStyle = '#c2c6cc';
  g.fillRect(19, 3, 10, 4);
  // glass highlight
  g.strokeStyle = 'rgba(240,250,255,0.6)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(18, 22); g.lineTo(18, 40); g.stroke();
  return c.toDataURL();
}
