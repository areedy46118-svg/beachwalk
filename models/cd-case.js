import * as THREE from 'three';

/* A CD in its jewel case — "New Cd", the thing the second buried mound gives
 * up. Built to the real object in the photographs: a standard 142 x 125 x
 * 10 mm polystyrene case, clear lid over a black tray, the booklet showing
 * through the front and the tracklist through the back, and the disc itself
 * behind them.
 *
 * THE ARTWORK IS PAINTED HERE, not copied. The case is a generic industrial
 * shape and is modelled exactly; the sleeve on a real album is somebody's
 * copyrighted drawing, and this repository is public, so what goes on the
 * insert is an original painting in the same family as the reference — the
 * salmon ground, the crowds of small heads, the blue diagonal, the block
 * lettering down the back — rather than a reproduction of it.
 *
 * Metres, +Y up, +Z out of the front face. Smooth-shaded like the other
 * hero props, because you hold this one up to your face. */

const W = 0.142, H = 0.125, D = 0.0104;      // the real case, to the millimetre

// --------------------------------------------------------------- textures
function paper(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  // print grain: the reference is a photocopied drawing, not a clean render
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// a crowd of little heads, the motif that fills the corners of the sleeve
function crowd(g, cx, cy, rx, ry, n, body, ink) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const s = 7 + Math.random() * 5;
    g.fillStyle = body;
    g.beginPath(); g.ellipse(x, y, s, s * 1.15, Math.random() * 0.6 - 0.3, 0, 7); g.fill();
    g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke();
    // two eyes and a mouth, scratched in
    g.fillStyle = ink;
    g.fillRect(x - s * 0.42, y - s * 0.2, 1.6, 1.6);
    g.fillRect(x + s * 0.24, y - s * 0.2, 1.6, 1.6);
    g.beginPath(); g.moveTo(x - s * 0.3, y + s * 0.4); g.lineTo(x + s * 0.3, y + s * 0.4); g.stroke();
  }
}

function frontArt() {
  return paper(512, 512, (g, w, h) => {
    g.fillStyle = '#d87f66'; g.fillRect(0, 0, w, h);            // salmon ground
    // the blue diagonal sweeping down the left
    g.save();
    g.fillStyle = '#2b5a94';
    g.beginPath();
    g.moveTo(w * 0.30, h * 0.36); g.lineTo(w * 0.40, h * 0.40);
    g.lineTo(w * 0.24, h * 0.99); g.lineTo(w * 0.11, h * 0.95);
    g.closePath(); g.fill();
    g.restore();
    // a flame of orange at its foot
    g.fillStyle = '#c1360f';
    g.beginPath(); g.ellipse(w * 0.10, h * 0.80, w * 0.05, h * 0.09, -0.5, 0, 7); g.fill();
    // crowds: grey-blue upper left and upper right, red lower middle
    crowd(g, w * 0.20, h * 0.24, w * 0.15, h * 0.20, 90, '#6f7699', '#171826');
    crowd(g, w * 0.82, h * 0.30, w * 0.16, h * 0.26, 95, '#5f6678', '#14151b');
    crowd(g, w * 0.50, h * 0.78, w * 0.16, h * 0.16, 80, '#b02a17', '#2a0904');
    crowd(g, w * 0.78, h * 0.86, w * 0.14, h * 0.13, 55, '#335644', '#0c130f');
    // scratched figures wandering the pink
    g.strokeStyle = '#141620'; g.lineWidth = 1.8; g.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = w * (0.34 + Math.random() * 0.34), y = h * (0.10 + Math.random() * 0.62);
      const s = 9 + Math.random() * 10;
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x, y + s);                        // spine
      g.moveTo(x - s * 0.5, y + s * 0.35); g.lineTo(x + s * 0.5, y + s * 0.2);  // arms
      g.moveTo(x, y + s); g.lineTo(x - s * 0.4, y + s * 1.6);
      g.moveTo(x, y + s); g.lineTo(x + s * 0.35, y + s * 1.6);   // legs
      g.stroke();
      g.beginPath(); g.arc(x, y - 3.5, 3.5, 0, 7); g.stroke();
    }
    // a few blocks of flat colour, the way the reference breaks the crowd up
    for (const [x, y, ww, hh, c] of [
      [0.44, 0.14, 0.06, 0.035, '#2c3f77'], [0.56, 0.30, 0.05, 0.03, '#2c3f77'],
      [0.38, 0.52, 0.05, 0.03, '#d8471f'], [0.63, 0.62, 0.06, 0.035, '#7a4a86'],
    ]) { g.fillStyle = c; g.fillRect(w * x, h * y, w * ww, h * hh); }
  });
}

function backArt() {
  return paper(512, 512, (g, w, h) => {
    // rubble ground: overlapping grey stones, the way the back of the case reads
    g.fillStyle = '#4a4650'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w, y = Math.random() * h, s = 6 + Math.random() * 12;
      const v = 60 + Math.random() * 70;
      g.fillStyle = `rgb(${v},${v - 4},${v + 10})`;
      g.beginPath(); g.ellipse(x, y, s, s * 0.72, Math.random() * 3, 0, 7); g.fill();
      g.strokeStyle = 'rgba(20,20,26,0.65)'; g.lineWidth = 1; g.stroke();
    }
    // the tracklist, in columns of yellow and red block capitals running up
    const tracks = ['HOW I MADE IT', 'DONT KNOW', 'SECRET', 'SUMMERDAY',
      'UP THE HILL', 'A SEER', 'INFINITE GARDEN', 'SKINT', 'BOO', 'LOVE ME',
      'NEVER END', 'BEARING', 'PROJECTIONS'];
    g.textAlign = 'left'; g.textBaseline = 'middle';
    tracks.forEach((t, i) => {
      const x = w * 0.09 + i * (w * 0.066);
      g.save(); g.translate(x, h * 0.86); g.rotate(-Math.PI / 2);
      g.font = 'bold 22px "Arial Black", Impact, sans-serif';
      g.lineWidth = 4; g.strokeStyle = '#7a1206'; g.strokeText(t, 0, 0);
      g.fillStyle = i % 3 === 0 ? '#e8b022' : (i % 3 === 1 ? '#d2401c' : '#f0c93a');
      g.fillText(t, 0, 0);
      g.restore();
    });
  });
}

function spineArt() {
  return paper(256, 32, (g, w, h) => {
    g.fillStyle = '#3d3944'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      const v = 55 + Math.random() * 60;
      g.fillStyle = `rgb(${v},${v - 3},${v + 8})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 5, 3.4, Math.random() * 3, 0, 7); g.fill();
    }
    g.font = 'bold 13px "Arial Black", Impact, sans-serif';
    g.textBaseline = 'middle';
    g.strokeStyle = '#7a1206'; g.lineWidth = 3; g.strokeText('NEW CD', 10, h / 2);
    g.fillStyle = '#e8b022'; g.fillText('NEW CD', 10, h / 2);
  });
}

// the disc: a mirror ring with a printed hub
function discTexture() {
  return paper(256, 256, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, w, h);
    const ring = g.createRadialGradient(cx, cy, w * 0.08, cx, cy, w * 0.5);
    ring.addColorStop(0.00, '#d8d8dc');
    ring.addColorStop(0.18, '#b9c6cf');
    ring.addColorStop(0.42, '#cfd6cb');
    ring.addColorStop(0.66, '#c2c8d6');
    ring.addColorStop(1.00, '#9aa0aa');
    g.fillStyle = ring;
    g.beginPath(); g.arc(cx, cy, w * 0.5, 0, 7); g.fill();
    g.fillStyle = '#d9d4c6';                                   // printed hub
    g.beginPath(); g.arc(cx, cy, w * 0.17, 0, 7); g.fill();
    g.fillStyle = '#0b0b0e';                                   // the centre hole
    g.beginPath(); g.arc(cx, cy, w * 0.058, 0, 7); g.fill();
  });
}

export function makeCdCase() {
  const g = new THREE.Group();
  const t = D / 2;

  const clear = new THREE.MeshPhysicalMaterial({
    color: 0xdfe6ee, roughness: 0.07, metalness: 0,
    transparent: true, opacity: 0.30,
    clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.62, metalness: 0 });

  // --- the printed inserts, just inside each face ------------------------
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.006, H - 0.006),
    new THREE.MeshStandardMaterial({ map: frontArt(), roughness: 0.88 }));
  front.position.z = t - 0.0011;
  g.add(front);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.004, H - 0.004),
    new THREE.MeshStandardMaterial({ map: backArt(), roughness: 0.9 }));
  back.position.z = -t + 0.0012; back.rotation.y = Math.PI;
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
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.0022, H, D * 0.98),
    new THREE.MeshStandardMaterial({ map: spineArt(), roughness: 0.85 }));
  spine.position.x = -W / 2 + 0.0011;
  g.add(spine);
  for (let i = 0; i < 7; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0075, D * 0.7), black);
    tooth.position.set(-W / 2 + 0.0012, -H / 2 + 0.012 + i * 0.0165, 0);
    g.add(tooth);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}

// the pack icon: the case seen square on
export function makeCdCaseIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#e79c86'; g.fillRect(7, 5, 34, 38);
  g.fillStyle = '#3a6ea8';
  g.beginPath(); g.moveTo(16, 18); g.lineTo(21, 20); g.lineTo(14, 42); g.lineTo(9, 40); g.fill();
  g.fillStyle = '#8e93b4'; g.beginPath(); g.arc(16, 13, 6, 0, 7); g.fill();
  g.fillStyle = '#7e8496'; g.beginPath(); g.arc(35, 16, 6.5, 0, 7); g.fill();
  g.fillStyle = '#c8402c'; g.beginPath(); g.arc(28, 35, 6, 0, 7); g.fill();
  g.strokeStyle = '#cfd6e2'; g.lineWidth = 2; g.strokeRect(7, 5, 34, 38);
  g.fillStyle = '#15151a'; g.fillRect(5, 5, 3, 38);
  return c.toDataURL();
}
