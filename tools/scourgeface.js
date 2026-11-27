/* WHICH WAY HE FACES IN EACH CLIP (2026-11-26): the hips' forward (left hip -> right hip, crossed with up) in his group's frame,
 * averaged over the clip, in degrees off +Z (his front) — every clip of his should read about 0.
 *   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgeface.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 10; i++) w.__adv(1);
const N = (n) => u.model.getObjectByName(n), inv = new T.Matrix4();
for (const nm of (new URLSearchParams(location.search).get('clips') || 'idle,walk,kSprint,sStalk,sIdleW,sAtk,sDodgeB').split(',')) {
  const a = u.clips[nm]; if (!a) { log('no clip', nm); continue; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
  const out = [];
  for (let i = 0; i < 8; i++) { a.time = a.getClip().duration * i / 8; u.mixer.rawUpdate(0); u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert();
    const L = N('Character1_LeftUpLeg').getWorldPosition(new T.Vector3()).applyMatrix4(inv), R = N('Character1_RightUpLeg').getWorldPosition(new T.Vector3()).applyMatrix4(inv);
    const X = L.sub(R); const f = new T.Vector3(X.x, 0, X.z).cross(new T.Vector3(0, 1, 0)).multiplyScalar(-1);
    out.push(Math.round(Math.atan2(f.x, f.z) * 57.3)); }
  log(nm, 'facing', out.join(' '));
}
log('DONE');
