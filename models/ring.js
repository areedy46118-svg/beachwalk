import * as THREE from 'three';

/* A signet ring, ~20 mm across, stamped with a horseshoe crab.
 *
 * Metres, +Y up, +Z forward. The band lies in the XY plane with its axis
 * along Z — the way you'd hold it up to look through — and the bezel sits at
 * the top. Smooth-shaded, like the other hero props: this one is examined at
 * arm's length in the inspect view, and the whole point of it is the stamp.
 *
 * The stamp is the game's own motif. Whoever wore this was in the trade.
 */
export function makeRing() {
  const G = new THREE.Group();

  const R = 0.0098;                 // inner radius of the band
  const silver = new THREE.MeshStandardMaterial({
    color: 0xa7afba, roughness: 0.34, metalness: 0.62, emissive: 0x101419,
  });
  // the recesses of an old ring are darker than its faces - the tarnish sits
  // where a thumb never reaches, and it is what stops it reading as new
  const tarnish = new THREE.MeshStandardMaterial({
    color: 0x4a525d, roughness: 0.85, metalness: 0.4, emissive: 0x080b0f,
  });

  // ---- the band, and the shoulders that swell into the head --------
  /* A signet is not a hoop with a lump stuck on it: the band thickens as it
   * climbs to meet the bezel, and that swell has to be CONTINUOUS. Two
   * earlier tries were not — a row of spheres up each side reads as knuckles,
   * and nested partial tori leave a visible step everywhere one arc ends
   * inside a fatter one. So it is a single torus whose tube is squeezed per
   * vertex: work out where each vertex sits around the ring, and scale its
   * offset from the tube's centre line by how near that is to the crown.
   */
  const TUBE = 0.0032;                     // at the shoulders, under the head
  const bandGeo = new THREE.TorusGeometry(R, TUBE, 16, 72);
  {
    const pos = bandGeo.attributes.position;
    const v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const th = Math.atan2(v.y, v.x);
      c.set(Math.cos(th) * R, Math.sin(th) * R, 0);       // the tube's centre line
      // 0 at the crown, 1 at the bottom of the finger, eased so the taper
      // runs out gently instead of pinching just under the shoulders
      let d = Math.abs(th - Math.PI / 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      const t = Math.min(1, d / (Math.PI * 0.62));
      const k = 1 - 0.52 * (t * t * (3 - 2 * t));
      v.sub(c).multiplyScalar(k).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    bandGeo.computeVertexNormals();
  }
  const band = new THREE.Mesh(bandGeo, silver);
  G.add(band);

  // ---- the bezel ---------------------------------------------------
  // small: at 0.006 it is a plate the band hangs off, and the whole thing
  // stops reading as jewellery at all
  /* A cylinder's axis is already Y, so a flat disc facing UP needs no
   * rotation at all. The first build rotated it a quarter turn "to face +Y"
   * and got a coin standing on its edge along the top of the band, with the
   * stamp poking out from behind its rim like a pin. */
  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0047, 0.0019, 24), silver);
  bezel.scale.set(1.22, 1, 0.82);                    // an oval, not a disc
  bezel.position.y = R + 0.0026;
  G.add(bezel);
  // the sunken field the stamp stands in
  const field = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0037, 0.0008, 22), tarnish);
  field.scale.set(1.22, 1, 0.82);
  field.position.y = R + 0.0033;
  G.add(field);

  // ---- the stamp: a horseshoe crab, in relief ----------------------
  const S = new THREE.Group();
  /* Proud of the field, not level with it. At R + 0.0037 the stamp sits just
   * UNDER the top face of the field disc and all you see is the crown of the
   * head shield poking through, which reads as a pin rather than as a crab. */
  S.position.y = R + 0.0040;              // relief base just inside the field's top
  S.rotation.x = -Math.PI / 2;                       // lie it on the field
  G.add(S);
  // prosoma - the broad head shield, flattened and slightly domed
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0020, 12, 10), silver);
  head.scale.set(1.35, 0.9, 0.30);
  head.position.set(0, 0.0007, 0);
  S.add(head);
  // opisthosoma - the smaller hinged plate behind it
  const abdo = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 10, 8), silver);
  abdo.scale.set(1.1, 1.0, 0.30);
  abdo.position.set(0, -0.0018, 0);
  S.add(abdo);
  // telson - the tail spike, which is the whole read at this size
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.00032, 0.0030, 6), silver);
  tail.rotation.z = Math.PI;                          // point it away from the head
  tail.position.set(0, -0.0040, -0.0001);
  tail.scale.z = 0.4;
  S.add(tail);
  // the two ridges down the shield, the detail your eye finds last
  for (const sx of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.00018, 0.0018, 3, 6), tarnish);
    r.position.set(sx * 0.0008, 0.0007, 0.0006);
    S.add(r);
  }

  G.userData.parts = { band, bezel, field, stamp: S };
  return G;
}

/* The hotbar icon. Drawn rather than an emoji so the slot shows THIS ring —
 * a plain tarnished band with a dark oval head — at 48 px, where the stamp
 * itself is far too small to survive and is left as a suggestion. */
export function makeRingIcon() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  // band: two arcs, the lower one lighter where the moon would catch it
  // rusted iron, and an octopus on it — the slot has to show the ring you actually
  // have. At 48 px that is a band, a domed body and the suggestion of arms.
  g.lineWidth = 5;
  g.strokeStyle = '#5a3520';
  g.beginPath(); g.arc(24, 29, 13, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
  g.strokeStyle = '#b0673a';
  g.beginPath(); g.arc(24, 29, 13, Math.PI * 1.88, Math.PI * 3.12); g.stroke();
  // the body
  g.fillStyle = '#c2764a';
  g.beginPath(); g.ellipse(24, 15, 8, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6e3f22';
  g.beginPath(); g.ellipse(24, 17.5, 8.5, 5, 0, 0, Math.PI * 2); g.fill();
  // the arms, curling down over the shoulders of the band
  g.strokeStyle = '#a55f36'; g.lineCap = 'round';
  for (const [x0, x1, y1] of [[16, 9, 27], [19, 14, 30], [29, 34, 30], [32, 39, 27]]) {
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(x0, 19); g.quadraticCurveTo((x0 + x1) / 2, 26, x1, y1); g.stroke();
  }
  // two eyes on the body
  g.fillStyle = '#2a1408';
  g.beginPath(); g.arc(21, 13, 1.7, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(27, 13, 1.7, 0, Math.PI * 2); g.fill();
  return c.toDataURL();
}
