import * as THREE from 'three';

/* A CD in its jewel case — "New Cd", the thing the second buried mound gives
 * up. Built to the real object in the photographs: a standard 142 x 125 x
 * 10 mm polystyrene case, clear lid over a black tray, the booklet showing
 * through the front and the tracklist through the back, and the disc itself
 * behind them.
 *
 * The sleeve is the OWNER'S OWN ARTWORK, photographed and rectified out of
 * the three reference shots by a four-point perspective transform (the
 * booklet is square, so the front maps to a square; the tray card is
 * wider than it is tall). `assets/cd-front.jpg`, `cd-back.jpg` and
 * `cd-spine.jpg`. They are photographs of a hand-held object, so they carry
 * their own light — which is why the inserts take a flat unlit material
 * rather than being lit twice.
 *
 * Metres, +Y up, +Z out of the front face. */

/* A CD case STANDS UP: 125 mm across by 142 mm tall by 10 mm thick. This
 * had them the other way round, which laid the whole thing on its side and
 * turned both faces of artwork through ninety degrees. */
const W = 0.125, H = 0.142, D = 0.0104;      // the real case, to the millimetre

// --------------------------------------------------------------- textures
const loader = new THREE.TextureLoader();
function art(url) {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// the disc: a mirror ring with a printed hub, drawn rather than shot — the
// photographs never show the disc itself
function discTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), w = 256, cx = 128, cy = 128;
  g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, w, w);
  const ring = g.createRadialGradient(cx, cy, w * 0.08, cx, cy, w * 0.5);
  ring.addColorStop(0.00, '#d8d8dc');
  ring.addColorStop(0.18, '#b9c6cf');
  ring.addColorStop(0.42, '#cfd6cb');
  ring.addColorStop(0.66, '#c2c8d6');
  ring.addColorStop(1.00, '#9aa0aa');
  g.fillStyle = ring;
  g.beginPath(); g.arc(cx, cy, w * 0.5, 0, 7); g.fill();
  g.fillStyle = '#d9d4c6';
  g.beginPath(); g.arc(cx, cy, w * 0.17, 0, 7); g.fill();
  g.fillStyle = '#0b0b0e';
  g.beginPath(); g.arc(cx, cy, w * 0.058, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCdCase() {
  const g = new THREE.Group();
  const t = D / 2;

  /* The lid is barely there on purpose. At opacity 0.30 with full clearcoat
   * the polystyrene threw a sheen over the whole front and the sleeve came
   * out chalk — the artwork is the point of this object, so the plastic
   * gets just enough highlight to read as a case and no more. */
  const clear = new THREE.MeshPhysicalMaterial({
    color: 0xaebcc8, roughness: 0.10, metalness: 0,
    transparent: true, opacity: 0.11,
    clearcoat: 0.55, clearcoatRoughness: 0.06, side: THREE.DoubleSide,
    depthWrite: false,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.62, metalness: 0 });

  /* The printed inserts, just inside each face. They are PHOTOGRAPHS, so
   * they already carry the light they were shot in — running them through
   * the scene's own lighting as well left the sleeve muddy at night and
   * washed out under the examine lamps. `MeshBasicMaterial` shows the
   * picture as it is, which is what you want of a thing held up to a face. */
  /* THE FRONT BOOKLET IS SQUARE — 120 x 120 mm — and the tray card behind
   * is taller than it is wide. Forcing both to the case's own portrait
   * shape stretched the cover by a twelfth, which is exactly enough to
   * see. Each plane is the real insert's own size. */
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.1185, 0.1185),
    new THREE.MeshBasicMaterial({ map: art('assets/cd-front.jpg') }));
  front.position.set(0.0016, 0.0055, t - 0.0011);
  g.add(front);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.1175, 0.1325),
    new THREE.MeshBasicMaterial({ map: art('assets/cd-back.jpg') }));
  back.position.set(-0.0016, 0.0018, -t + 0.0012); back.rotation.y = Math.PI;
  g.add(back);

  // --- the tray the disc sits in, seen through the clear lid -------------
  const tray = new THREE.Mesh(new THREE.BoxGeometry(W - 0.007, H - 0.007, D * 0.34), black);
  tray.position.z = -t * 0.34;
  g.add(tray);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.0595, 48),
    new THREE.MeshPhysicalMaterial({
      map: discTexture(), roughness: 0.12, metalness: 0.55,
      clearcoat: 1, clearcoatRoughness: 0.06,
    }));
  disc.position.z = -t * 0.34 + D * 0.175;
  g.add(disc);
  const hub = new THREE.Mesh(new THREE.TorusGeometry(0.0075, 0.0022, 8, 20), black);
  hub.position.z = disc.position.z - 0.0005;
  g.add(hub);

  // --- the shell: front lid, back half, and the four walls ---------------
  const lid = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.0011), clear);
  lid.position.z = t;
  g.add(lid);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.0011), clear);
  shell.position.z = -t;
  g.add(shell);
  for (const [w2, h2, x, y] of [
    [0.0012, H, W / 2, 0], [0.0012, H, -W / 2, 0],
    [W, 0.0012, 0, H / 2], [W, 0.0012, 0, -H / 2],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, D), clear);
    wall.position.set(x, y, 0);
    g.add(wall);
  }

  // --- the spine, with the hinge teeth down it ---------------------------
  const spineTex = art('assets/cd-spine.jpg');
  spineTex.center.set(0.5, 0.5); spineTex.rotation = Math.PI / 2;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.0022, H, D * 0.98),
    new THREE.MeshBasicMaterial({ map: spineTex }));
  spine.position.x = -W / 2 + 0.0011;
  g.add(spine);
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0072, D * 0.7), black);
    tooth.position.set(-W / 2 + 0.0012, -H / 2 + 0.013 + i * 0.0165, 0);
    g.add(tooth);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}

/* The pack icon. It is rendered from the model at pickup like every other
 * item (renderItemIcon), so this drawn fallback only shows in the moment
 * before the sleeve's JPEG has arrived over the network. */
export function makeCdCaseIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#d87f66'; g.fillRect(7, 5, 34, 38);
  g.fillStyle = '#2b5a94';
  g.beginPath(); g.moveTo(16, 18); g.lineTo(21, 20); g.lineTo(14, 42); g.lineTo(9, 40); g.fill();
  g.fillStyle = '#6f7699'; g.beginPath(); g.arc(16, 13, 6, 0, 7); g.fill();
  g.fillStyle = '#b02a17'; g.beginPath(); g.arc(28, 35, 6, 0, 7); g.fill();
  g.strokeStyle = '#cfd6e2'; g.lineWidth = 2; g.strokeRect(7, 5, 34, 38);
  g.fillStyle = '#15151a'; g.fillRect(5, 5, 3, 38);
  return c.toDataURL();
}
