/* WHICH WAY HIS AXE COMES OUT OF HIS FIST (2026-11-26): the haft (grip -> head) against the fist's knuckle line (index -> little
 * knuckle) and finger line (wrist -> middle knuckle), per clip — a sword's blade leaves a fist on the THUMB side (dot < 0 with the
 * knuckle line); an ice-pick hold on the little-finger side (> 0).
 *   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgegrip.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 10; i++) w.__adv(1);
const life = u.life; u.life = null;
const N = (n) => u.model.getObjectByName(n), P = (n) => N(n).getWorldPosition(new T.Vector3());
const tip = u.kAxeTip, hand = N('Character1_RightHand');
for (const nm of (new URLSearchParams(location.search).get('clips') || 'idle,walk,plunge,rear,sIdleW,sAtk,sCutB,sStalk').split(',')) {
  const a = u.clips[nm]; if (!a) { log('no clip', nm); continue; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * 0.3; u.mixer.update(0); u.g.updateMatrixWorld(true);
  const kn = P('Pinky1_R').sub(P('IndexFinger1_R')).normalize(), fg = P('MFinger1_R').sub(P('Character1_RightHand')).normalize();
  const palm = P('Character1_RightHand').add(P('MFinger1_R')).multiplyScalar(0.5), hd = tip.getWorldPosition(new T.Vector3()).sub(palm).normalize();
  log(nm, '| haft . knuckles', hd.dot(kn).toFixed(2), '| haft . fingers', hd.dot(fg).toFixed(2), '| haft . palm-normal', hd.dot(kn.clone().cross(fg)).toFixed(2));
}
u.life = life;
log('DONE');
