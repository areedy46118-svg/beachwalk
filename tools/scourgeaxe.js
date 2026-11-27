/* HIS AXE IN HIS FIST (2026-11-26): from the grip (the axe point nearest his knuckles) to its head, and its head's lowest point
 * over the floor through each blow (scrubbed, 80 samples) — at KING_AXE_K as the game has it.
 *   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgeaxe.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 10; i++) w.__adv(1);
const life = u.life; u.life = null;
let axe = null; u.model.traverse((o) => { if (!axe && o.isMesh && /axe/i.test(o.name)) axe = o; });
const hand = u.model.getObjectByName('Character1_RightHand'), knk = u.model.getObjectByName('MFinger1_R'), tip = u.kAxeTip;
const pos = axe.geometry.attributes.position, v = new T.Vector3();
u.mixer.update(0); u.g.updateMatrixWorld(true);
const palm = hand.getWorldPosition(new T.Vector3()).add(knk.getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
let far = 0; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(axe.matrixWorld); far = Math.max(far, v.distanceTo(palm)); }
const bx = new T.Box3().setFromObject(u.model); log('his height', (bx.max.y - u.g.position.y).toFixed(2), '| axe: palm to its far end', far.toFixed(2), 'm, to the tip marker', tip.getWorldPosition(new T.Vector3()).distanceTo(palm).toFixed(2), '| hold', JSON.stringify(u.kAxeHold && { len: +u.kAxeHold.len.toFixed(2), blade: +u.kAxeHold.blade.toFixed(2), slide: +u.kAxeHold.slide.toFixed(2) }));
for (const nm of (new URLSearchParams(location.search).get('clips') || 'plunge,sAtk,sDash,sCutB,sCutC,sCombo,idle,walk,sStalk,kSprint').split(',')) {
  const a = u.clips[nm]; if (!a) { log('no clip', nm); continue; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
  let lo = 1e9, at = 0; const D = a.getClip().duration;
  for (let i = 0; i <= 80; i++) { a.time = D * i / 80; u.mixer.update(0); b.kingAxeHoldS(u, ['sFly', 'sLand'].includes(a.getClip().name) ? 0 : 1); u.g.updateMatrixWorld(true);
    for (let k = 0; k < pos.count; k += 3) { v.fromBufferAttribute(pos, k).applyMatrix4(axe.matrixWorld); if (v.y < lo) { lo = v.y; at = i / 80; } } }
  log(nm, '| the axe lowest', (lo - u.g.position.y).toFixed(2), 'm over the floor at', at.toFixed(2));
}
u.life = life;
log('DONE');
