/* EACH OF THE SCOURGER'S CLIPS, MEASURED ON ITS OWN (2026-11-26, "fix his head and chest spinning vertically around … his weapon
 * clips through his body"). The head's and the chest's facing and up axes are taken off his own idle (so "forward" is his, not a
 * guess), then every clip is stepped at 30 fps: once on the CLIP ALONE (`rawUpdate`) and once with every layer over it
 * (`mixer.update`, the life layer and `kingPersona`) — the difference is what the layers add.
 *   headPitch / headYaw / headRoll   the head's facing against his body's (deg), range over the clip
 *   hRate / cRate                    the head's / chest's own turn in his body's frame per 1/30 s, max (deg)
 *   axe                              axe vertices inside his body (a capsule per bone, its radius read off his own skin), max over
 *                                    the clip, and the bone it was in most
 * `&clips=a,b` to measure some; `&layers=0` the clip alone only.
 *   PB_PORT=4266 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgeclipspin.js' <out> */
const Q = new URLSearchParams(location.search), ONLY = (Q.get('clips') || '').split(',').filter(Boolean), LAYERS = Q.get('layers') !== '0';
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.kgMeasured); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, M = u.model; b.setKingDown(true);
b.KING.mode = 'fight'; u.st.alive = true;
window.requestAnimationFrame = () => 0;
const bn = (n) => M.getObjectByName(n), head = bn('Character1_Head'), chest = bn('Character1_Spine2'), hand = bn('Character1_RightHand');
let axe = null, body = null; M.traverse((o) => { if (!axe && o.isMesh && /axe/i.test(o.name)) axe = o; if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
const acts = u.clips, all = [...new Set(Object.values(acts))];
const pose = (a, t, layers) => { for (const x of all) { x.enabled = false; x.setEffectiveWeight(0); } a.play(); a.enabled = true; a.paused = false; a.setEffectiveWeight(1); a.time = t; for (const bd of u.mixer._bindings) { bd.buffer.fill(0, bd.valueSize, bd.valueSize * 2); bd.buffer.fill(1, bd.valueSize * 2, bd.valueSize * 3); }; (layers ? u.mixer.update : u.mixer.rawUpdate).call(u.mixer, 0); if (!layers) b.kingAxeHoldS(u, 1); u.g.updateMatrixWorld(true); };
// his frame: the group's
const gq = () => u.g.getWorldQuaternion(new T.Quaternion());
pose(acts.idle, 0.3, false);
const g0 = gq().invert(), hF = head.getWorldQuaternion(new T.Quaternion()).premultiply(g0).invert(), cF = chest.getWorldQuaternion(new T.Quaternion()).premultiply(g0).invert();
const F = new T.Vector3(0, 0, 1), U = new T.Vector3(0, 1, 0);
const lHF = F.clone().applyQuaternion(hF), lHU = U.clone().applyQuaternion(hF), lCF = F.clone().applyQuaternion(cF), lCU = U.clone().applyQuaternion(cF);
// the capsules: each deforming bone to its first bone child, radius the 70th percentile of its own vertices' distance
const segs = [];
if (body) {
  const sk = body.skeleton, si = body.geometry.attributes.skinIndex, sw = body.geometry.attributes.skinWeight, pos = body.geometry.attributes.position, v = new T.Vector3();
  body.updateMatrixWorld(true); sk.update();
  const by = new Map();
  for (let i = 0; i < pos.count; i += 2) { let bi = 0, bw = -1; for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > bw) { bw = w; bi = si.getComponent(i, c); } } const bo = sk.bones[bi]; if (!/^Character1_(Hips|Spine|Spine1|Spine2|Neck|Head|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftArm|LeftForeArm)$|^Spine3$/.test(bo.name)) continue; body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld); (by.get(bo) || by.set(bo, []).get(bo)).push(v.clone()); }
  for (const [bo, vs] of by) {
    const ch = bo.children.find((c) => c.isBone && !/Wing|Tail|Feather|Jaw|Eye|Tongue/.test(c.name)); if (!ch) continue;
    const a = bo.getWorldPosition(new T.Vector3()), c = ch.getWorldPosition(new T.Vector3()), ab = c.clone().sub(a);
    const ds = vs.map((p) => { const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); }).sort((x, y) => x - y);
    segs.push({ bo, ch, r: ds[Math.floor(ds.length * 0.7)] });
  }
  if (u.kac && u.kac.ok) log('solver capsules', u.kac.caps.map((k) => k.a.name.replace('Character1_', '') + ' ' + k.r.toFixed(2)).join(', '));
  log('capsules', segs.map((s) => s.bo.name.replace('Character1_', '') + ' ' + s.r.toFixed(2)).join(', '));
}
const sd = (p, a, c) => { const ab = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
const deg = (x) => x * 57.3;
const read = () => {
  const g = gq().invert(), hq = head.getWorldQuaternion(new T.Quaternion()).premultiply(g), cq = chest.getWorldQuaternion(new T.Quaternion()).premultiply(g);
  const hf = lHF.clone().applyQuaternion(hq), hu = lHU.clone().applyQuaternion(hq), cf = lCF.clone().applyQuaternion(cq), cu = lCU.clone().applyQuaternion(cq);
  let axeN = 0, where = {};
  if (axe && segs.length) {
    const hp = hand.getWorldPosition(new T.Vector3()), P = axe.geometry.attributes.position, v = new T.Vector3();
    const sp = u.kac && u.kac.ok ? u.kac.caps.map((k) => [{ r: k.r, bo: k.a }, k.a.getWorldPosition(new T.Vector3()), (k.c || k.a).getWorldPosition(new T.Vector3())]) : segs.map((s) => [s, s.bo.getWorldPosition(new T.Vector3()), s.ch.getWorldPosition(new T.Vector3())]);
    for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(axe.matrixWorld); if (v.distanceTo(hp) < 0.3) continue; for (const [s, a, c] of sp) if (sd(v, a, c) < s.r) { axeN++; const k = s.bo.name.replace('Character1_', ''); where[k] = (where[k] || 0) + 1; break; } }
  }
  return { hq, cq, hp: deg(Math.asin(Math.max(-1, Math.min(1, hf.y)))), hy: deg(Math.atan2(hf.x, hf.z)), hr: deg(Math.asin(Math.max(-1, Math.min(1, hu.clone().cross(hf).normalize().y)))),
    cp: deg(Math.asin(Math.max(-1, Math.min(1, cf.y)))), cy: deg(Math.atan2(cf.x, cf.z)), axeN, where };
};
const names = Object.keys(acts).filter((k) => acts[k].getClip().name === k && (!ONLY.length || ONLY.includes(k)));
for (const nm of names) {
  const a = acts[nm], D = a.getClip().duration, N = Math.max(2, Math.round(D * 30));
  for (const layers of LAYERS ? [false, true] : [false]) {
    let prev = null, R = { hp: [1e9, -1e9], hy: [1e9, -1e9], hr: [1e9, -1e9], cp: [1e9, -1e9], cy: [1e9, -1e9], hRate: 0, cRate: 0, hRateAt: 0, axe: 0, axeAt: 0, where: {} };
    for (let i = 0; i <= N; i++) {
      pose(a, D * i / N, layers); const r = read();
      for (const k of ['hp', 'hy', 'hr', 'cp', 'cy']) { R[k][0] = Math.min(R[k][0], r[k]); R[k][1] = Math.max(R[k][1], r[k]); }
      if (prev) { const h = deg(r.hq.angleTo(prev.hq)), c = deg(r.cq.angleTo(prev.cq)); if (h > R.hRate) { R.hRate = h; R.hRateAt = i / N; } R.cRate = Math.max(R.cRate, c); }
      if (r.axeN > R.axe) { R.axe = r.axeN; R.axeAt = i / N; R.where = r.where; }
      prev = r;
    }
    const f = (p) => p[0].toFixed(0) + '..' + p[1].toFixed(0);
    log((nm + (layers ? ' +L' : '   ')).padEnd(12) + ' ' + D.toFixed(2) + 's head pitch ' + f(R.hp) + ' yaw ' + f(R.hy) + ' roll ' + f(R.hr) + ' | chest pitch ' + f(R.cp) + ' yaw ' + f(R.cy) +
      ' | hRate ' + R.hRate.toFixed(0) + '@' + R.hRateAt.toFixed(2) + ' cRate ' + R.cRate.toFixed(0) + ' | axe ' + R.axe + '@' + R.axeAt.toFixed(2) + ' ' + JSON.stringify(R.where));
  }
}
log('DONE');
