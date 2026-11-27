/* IS THE AXE IN HIS HAND (2026-11-26, the owner: "make sure the axe is in his hand"). Every clip of his, eight frames each: the
 * nearest point of the axe to the middle of his right palm (wrist to middle knuckle), in the hold that clip uses — and halfway
 * through the slide between the two holds. In a closed fist on a haft that reads a few centimetres, the same in every frame.
 *   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgeinhand.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 10; i++) w.__adv(1);
const OWN = ['sFly', 'sLand'];
let axe = null; u.model.traverse((o) => { if (!axe && o.isMesh && /axe/i.test(o.name)) axe = o; });
const hand = u.model.getObjectByName('Character1_RightHand'), knk = u.model.getObjectByName('MFinger1_R'), pos = axe.geometry.attributes.position, v = new T.Vector3();
const gap = () => { u.g.updateMatrixWorld(true); const palm = hand.getWorldPosition(new T.Vector3()).add(knk.getWorldPosition(new T.Vector3())).multiplyScalar(0.5); let nd = 1e9; for (let i = 0; i < pos.count; i++) nd = Math.min(nd, v.fromBufferAttribute(pos, i).applyMatrix4(axe.matrixWorld).distanceTo(palm)); return nd; };
let worst = 0; const seen = new Set();
for (const nm of Object.keys(u.clips)) {
  const a = u.clips[nm], cn = a.getClip().name; if (seen.has(cn)) continue; seen.add(cn);
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
  let lo = 1e9, hi = 0, mid = 0;
  for (let i = 0; i < 8; i++) { a.time = a.getClip().duration * i / 8; u.mixer.rawUpdate(0);
    b.kingAxeHoldS(u, OWN.includes(cn) ? 0 : 1); const g = gap(); lo = Math.min(lo, g); hi = Math.max(hi, g);
    b.kingAxeHoldS(u, 0.5); mid = Math.max(mid, gap()); }
  worst = Math.max(worst, hi, mid);
  log(cn.padEnd(9), OWN.includes(cn) ? 'his own hold ' : 'the long grip', '| palm to the axe', (lo * 100).toFixed(1), '-', (hi * 100).toFixed(1), 'cm | mid-slide', (mid * 100).toFixed(1), 'cm');
}
log('WORST', (worst * 100).toFixed(1), 'cm');
log('DONE');
