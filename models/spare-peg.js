import * as THREE from 'three';

/* THE SPARE PEG — the fisherman's other leg, and the one thrusting weapon in
 * this game. It is THE OWNER'S OWN SCAN: The Egypt Centre's "Furniture Leg
 * (W2054a)", CC-BY-4.0, through `tools/gltfpack.py --decimate 14000
 * --keep-uv`. It ships as six 65,532-vertex CHUNKS of one surface — not an
 * LOD chain — so it is merged before it is clustered, which welds instead of
 * dropping; taking a chunk as if it were an LOD renders as a cloud of specks,
 * which is a mistake this repo has already made once.
 *
 * A BUILT peg stood here first and is deleted. It was a fair peg and it was
 * an invention; this is a real object with four thousand years of wear on it,
 * and the whole reason this game keeps reaching for the owner's own files is
 * that a scan carries a history a lathe profile cannot.
 *
 * WHICH END IS WHICH IS MEASURED, NOT EYEBALLED. The model is 205 units long
 * on its own Y, and the radius read in four-unit slabs about its axis says:
 *
 *   y -111 .. -95   r 13.8 -> 17.4 -> 13.8   the carved foot
 *   y  -79 .. -63   r 11.9 .. 12.5           a NECK, the narrowest it ever is
 *   y  -55 .. -11   r 13.6 -> 18.4           the swell above it
 *   y   -7 .. +94   r 15.0, dead uniform     100 units of plain shaft, ending
 *                                            square and splintered
 *
 * (Measured in BLENDER, where that axis reads as Z — its importer turns a
 * glTF's Y-up into its own Z-up, so a number read there is one axis away
 * from the number three sees. Trusting the Blender axis name put the whole
 * leg across the screen on its side, which is exactly what it looked like.)
 *
 * AND YOU HOLD THE TOP, SO THE BOTTOM GOES OUT. The first build gripped the
 * NECK at y = -71 and turned the whole leg end for end, which stood the
 * carved foot over the fist as a pommel and put 0.65 m of plain shaft in the
 * picture ending on the splintered break. It is a peg LEG: the end you hold
 * is the end that goes on a knee, and the end that goes out is the one that
 * meets the ground. The owner's word, and the picture agrees with him twice
 * over — the old way spent the whole frame on the one stretch of this scan
 * that is dead uniform (100 units at a flat r 15.0) and hid the only part of
 * it with four thousand years of carving on it inside the fist, where it is
 * foreshortened and half off the edge. Turned round, what arrives at the
 * crosshair is the FOOT: the widest, most worked, most recognisable thing on
 * the model, at the one place in the frame anybody is looking.
 *
 * So the hand goes on the plain shaft at y = +54 — the top, a hand's breadth
 * below the break — and the numbers come out exactly as they were, the other
 * way round: 40 units (0.16 m) of broken shaft standing above the fist, and
 * 165 units — 0.65 m — of leg in front of it finishing on the carved foot.
 * Nothing downstream moves: `PEG_TIP` is the same number, the lip markers sit
 * on the same stretch, and the peg is the same 81 cm overall, which is what
 * the chest it comes out of was measured against.
 *
 * THE FRAME IS THE HAND'S, the katana's own rule: the fist closes on
 * (0, 0, 0) and the length runs down -Y, so the peg turns about the hand in
 * every pose and needs no grip slide.
 */

export const PEG_TIP = -0.650;          // the carved foot, in the grip's frame
export const PEG_TOP = 0.158;           // and the broken top: 81 cm overall

const GRIP_Y = 54;                      // the shaft's top, measured
const AXIS = [0.86, 2.69];              // the shaft's own centreline in x/z
const SCALE = 0.650 / 165;              // so the point lands exactly on PEG_TIP

/* AND A MUSEUM PHOTOGRAPH IS NOT A NIGHT BEACH. The albedo is lit for a
 * studio, and the view-model scene carries nearly three units of light of its
 * own, so the map is multiplied DOWN and then carries its own emissive lift
 * off itself — the scanned rocks' arrangement, for the scanned rocks' reason:
 * this is held against a black sky as often as it is held in a lit room. */
function dress(mat) {
  const m = mat.clone();
  /* AND THE LEVEL IS SWEPT, NOT CHOSEN. Measured on screen as mean
   * luminance over the peg's own pixels against the beach it is held over:
   * the map's honest brightness reads 46.4 against a scene of 18.3, which is
   * a plank of pale wood glowing in your fist. The response is ACES and not
   * linear, so one measured point and some arithmetic overshoots — this is
   * four measured points (46.4, 30.8, 26.5, 22.1) and the one that lands
   * where the wreck's own furniture was tuned to sit, a shade over the
   * ground it stands on. */
  m.color = new THREE.Color(0x443e37);
  m.roughness = 0.92;
  m.metalness = 0;                       // METALNESS IS A TRAP, the twelfth time
  m.emissive = new THREE.Color(0xffffff);
  m.emissiveMap = m.map;
  m.emissiveIntensity = 0.155;
  return m;
}

/* The fit, worked out once and shared by every copy — the hand's, the examine
 * screen's and the one lying in the chest. The geometry is baked into the
 * hand's frame here, so a copy is a mesh over the same buffer. */
export function fitSparePeg(root) {
  /* The scan already lies along Y with the foot at -111 and the broken end at
   * +94, and the hand wants the FOOT down — which is the way the scan already
   * points. So there is no turn at all: bring the grip station to the origin,
   * scale, and the leg hangs out of the fist the way a leg does. (It used to
   * be turned end for end here, back when the neck was the grip.) */
  const m = new THREE.Matrix4()
    .makeScale(SCALE, SCALE, SCALE)
    .multiply(new THREE.Matrix4().makeTranslation(-AXIS[0], -GRIP_Y, -AXIS[1]));
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(m);
    g.computeBoundingSphere();
    parts.push({ geo: g, mat: dress(Array.isArray(o.material) ? o.material[0] : o.material) });
  });
  return parts;
}

/* One copy of the fitted peg. The MATERIALS are cloned per copy on purpose:
 * `addItemShine` lifts the emissive of every material under the thing it is
 * marking, and the copy in the chest carries one — shared, that lift would
 * land on the peg in your fist as well, which is the Military Shovel's own
 * scar and took a long time to find the first time. */
export function sparePegCopy(parts) {
  const G = new THREE.Group();
  G.name = 'sparePeg';
  for (const p of parts) {
    const mesh = new THREE.Mesh(p.geo, p.mat.clone());
    mesh.castShadow = mesh.receiveShadow = false;
    G.add(mesh);
  }
  return G;
}
