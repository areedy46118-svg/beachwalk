/* THE SCOURGER'S FIST AGAINST THE MESH2MOTION HAND (2026-11-25). His clip paused at `&frs=`: per hand, the knuckle line (index ->
 * little knuckle), the finger line (wrist -> middle knuckle), the forearm and upper arm, in his PELVIS frame (x across the hips to
 * his left, y up, z = x × y) — the GLB's own side by `scratchpad/swhand.py`, the same frame; `rollcmp.py` says how far rolled.
 *   PB_PORT=4267 PB_WAIT=1200 sh tools/probe.sh 'evalFile&f=/tools/scourgehand.js&clip=sIdleW&frs=0,0.3,0.5' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 10; i++) w.__adv(1);
const Q = new URLSearchParams(location.search), CLIP = Q.get('clip') || 'sIdleW', FRS = (Q.get('frs') || '0').split(',').map(Number);
const life = u.life; u.life = null;
const N = (n) => u.model.getObjectByName(n), P = (n) => { const o = N(n); return o ? o.getWorldPosition(new T.Vector3()) : null; };
const NAMES = { Right: { idx: 'IndexFinger1_R', pk: 'Pinky1_R', mid: 'MFinger1_R' }, Left: { idx: 'IndexFinger1_L', pk: 'Pinky1_L', mid: 'MFinger1_L' } };
log('finger bones', JSON.stringify(Object.fromEntries(Object.entries(NAMES.Right).map(([k, v]) => [k, !!N(v)]))));
const a = u.clips[CLIP];
for (const fr of FRS) {
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * fr; u.mixer.update(0); u.g.updateMatrixWorld(true);
  const L = P('Character1_LeftUpLeg'), R = P('Character1_RightUpLeg'), X = L.clone().sub(R); X.y = 0; X.normalize(); const Y = new T.Vector3(0, 1, 0), Z = X.clone().cross(Y);
  const pf = (v) => [v.dot(X), v.dot(Y), v.dot(Z)].map((x) => x.toFixed(2)).join(','), d = (p, q) => q.clone().sub(p).normalize();
  for (const sd of ['Right', 'Left']) {
    const nm = NAMES[sd];
    log(fr, sd, 'PELVIS FRAME | knuckles', pf(d(P(nm.idx), P(nm.pk))), '| fingers', pf(d(P('Character1_' + sd + 'Hand'), P(nm.mid))), '| forearm', pf(d(P('Character1_' + sd + 'ForeArm'), P('Character1_' + sd + 'Hand'))), '| upper arm', pf(d(P('Character1_' + sd + 'Arm'), P('Character1_' + sd + 'ForeArm'))));
  }
}
u.life = life;
log('DONE');
