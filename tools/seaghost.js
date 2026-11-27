/* THE WATER BALL STOPPED BY NOTHING (2026-11-25, the owner, in the first castle's street: "the water keeps hitting invisible barriers in
 * the air so does the hook fix this now it should hit where aimed"). From five spots in the street, 12 bearings x 4 pitches, a ball
 * thrown: where it burst, what stopped it (`seaBall.lastHit`), and whether anything DRAWN is within 0.6 m of that point (three's own
 * raycast down its last stretch and round the point) — a burst with nothing drawn by it is a burst on nothing.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/seaghost.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js');
b.settings.devMode = true;
for (const u of b.farmUnitsS()) u.g.position.y -= 300;
const P0 = b.dkSlotS(); if (P0.unit) P0.unit.g.position.y = -500;
b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem);
b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.katanaItem);
for (let i = 0; i < 40; i++) { b.frame(1); await sleep(20); }
w.__clockOn(); w.__adv(30);
const C = b.camera, T = b.THREE, S0 = C.position.clone(), rc = new T.Raycaster(); rc.camera = C;
const drawnNear = (p, dir) => {
  const shown = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
  const ok = (h) => { const o = h.object; if (!o.isMesh || o.isSkinnedMesh || o.name === 'hitProxy' || o.userData.bwGhost || !shown(o)) return false; const m = Array.isArray(o.material) ? o.material[0] : o.material; return m && m.visible !== false && !(m.transparent && m.opacity < 0.5) && m.depthWrite !== false; };
  const dirs = [dir, new T.Vector3(0, -1, 0), new T.Vector3(0, 1, 0), new T.Vector3(1, 0, 0), new T.Vector3(-1, 0, 0), new T.Vector3(0, 0, 1), new T.Vector3(0, 0, -1)];
  for (const d of dirs) { rc.set(p.clone().addScaledVector(d, -0.6), d); rc.far = 1.2; if (rc.intersectObjects(b.scene.children, true).some(ok)) return true; }
  return false;
};
let n = 0, ghost = 0, life = 0, foes = 0, faded = 0, farN = 0, farD = 0, farT = 0; const why = {}, shown = [];
for (const [sx, sz] of [[0, 0], [5, 3], [-5, -3], [3, -8], [-3, 8]]) for (let a = 0; a < 12; a++) for (const el of [-8, 5, 20, 40]) {
  for (let i = 0; i < 400 && b.seaBall.cd > 0; i++) w.__adv(1);
  C.position.set(S0.x + sx, S0.y, S0.z + sz); b.camBaseY = C.position.y; b.look(a / 12 * Math.PI * 2, el * Math.PI / 180); C.updateMatrixWorld(true);
  b.seaBall.lastHit = null; b.seaBallFire(); const B = b.seaBall.balls[b.seaBall.balls.length - 1]; let at = null, dir = new T.Vector3(); C.getWorldDirection(dir);
  let fr = 0; for (let i = 0; i < 620 && b.seaBall.balls.includes(B); i++) { at = B.m.position.clone(); w.__adv(1); fr++; }
  n++;
  const H = b.seaBall.lastHit;
  if (!H) { life++; continue; }
  if (H.kind === 'faded') { faded++; continue; }   // (met nothing in `SEA_BALL.out` seconds: thinned away, no burst — 2026-11-26)
  if (el >= 20) { farN++; farD += at.distanceTo(C.position); farT += fr / 60; }
  if (H.kind === 'foe') { foes++; continue; }   // (a body: confirmed on his skin in the game now — `projBodyHit`)
  if (!drawnNear(H.at, dir)) { ghost++; const k = H.kind + (H.surface ? ':' + H.surface : '') + (H.obj ? ':' + H.obj : ''); why[k] = (why[k] || 0) + 1; if (shown.length < 12) shown.push(`${sx},${sz} yaw ${a * 30} el ${el}: burst at ${H.at.toArray().map((v) => v.toFixed(1)).join(',')} by ${k}`); }
}
log('balls', n, '| burst on nothing drawn', ghost, JSON.stringify(why), '| ran out in the air', life, '| faded, no burst', faded, '| on a body (skin)', foes, '| thrown up 20-40 deg and came down on something:', farN, 'mean', (farD / Math.max(1, farN)).toFixed(0), 'm off after', (farT / Math.max(1, farN)).toFixed(1), 's');
for (const s of shown) log('  ', s);
log('DONE');
