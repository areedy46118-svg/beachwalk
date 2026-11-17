/* THE DARK KNIGHT'S BLADE IN HIS FIST, POSE BY POSE (2026-11-16). Not part of the game. For `sh tools/probe.sh
 * 'evalFile&f=/tools/dkblade.js'` on two builds (the Infinity Blade body and the paladin): his own clips posed at their
 * contacts, and the blade's direction (hilt → tip) and his sword hand, in HIS frame; and the hand bone's world turn there
 * and at the bind (to carry a blade direction from one body's fist into the other's). */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot())); w.__clockOn();
for (let i = 0; i < 300 && !(b.dkS().u && b.dkS().u.natDone && !(b.dkS().u.clipsPending > 0)); i++) { w.__adv(1); await sleep(10); }
const u = b.dkS().u, m = u.model, V3 = b.camera.position.constructor, Q4 = u.g.quaternion.constructor;
const tip = m.getObjectByName('kn_tip'), hilt = m.getObjectByName('kn_hilt'), hand = m.getObjectByName('b_MF_Hand_R');
log('blade', u.knBlade && u.knBlade.toFixed(3), 'h', u.kind.h, 'scale', m.scale.x.toFixed(3));
const keep = []; for (const k in u.clips) { const a = u.clips[k]; keep.push([a, a.time, a.enabled, a.paused, a.getEffectiveWeight()]); }
const inv = new u.g.matrixWorld.constructor();
const at = (clip, f) => {
  for (const x of Object.values(u.clips)) { x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
  const a = u.clips[clip]; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * f;
  const r0 = m.rotation.y; m.rotation.y = 0; u.mixer.update(0); u.g.updateMatrixWorld(true); m.rotation.y = r0;
  inv.copy(u.g.matrixWorld).invert();
  const T = tip.getWorldPosition(new V3()).applyMatrix4(inv), H = hilt.getWorldPosition(new V3()).applyMatrix4(inv), d = T.clone().sub(H).normalize();
  const gq = u.g.getWorldQuaternion(new Q4()).invert(), hq = hand.getWorldQuaternion(new Q4()).premultiply(gq);
  return { d: d.toArray().map((x) => +x.toFixed(3)), hand: H.toArray().map((x) => +x.toFixed(3)), hq: hq.toArray().map((x) => +x.toFixed(4)) };
};
const R = {};
for (const [c, f] of [['sIdle', 0.3], ['sSlash', 0.388], ['sSlashC', 0.50], ['sSlashE', 0.411], ['sAtkB', 0.419], ['sSlashD', 0.545], ['sWalk', 0.3]]) if (u.clips[c]) R[c] = at(c, f);
// the bind: skeleton.pose() puts every bone back on its bind
let sk = null; m.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o.skeleton; });
sk.pose(); u.g.updateMatrixWorld(true);
{ const gq = u.g.getWorldQuaternion(new Q4()).invert(); R.bind = { hq: hand.getWorldQuaternion(new Q4()).premultiply(gq).toArray().map((x) => +x.toFixed(4)), d: tip.getWorldPosition(new V3()).sub(hilt.getWorldPosition(new V3())).applyQuaternion(gq).normalize().toArray().map((x) => +x.toFixed(3)) }; }
log('BLADE', JSON.stringify(R));
