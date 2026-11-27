/* THE FARMERS' RAGDOLLS AGAINST HALF-LIFE 2 (2026-11-27, the owner: "make the farmers ragdoll physics like half life 2"). On the open
 * beach (the death lab's way: `mutSpawnTest`), a fresh man for each death, killed `&n=` times each way — a light katana cut, a heavy mace
 * blow, a kick that kills — and per body, over 6 s: KNEES and ELBOWS bent the wrong way (the knee behind the hip-ankle line, against
 * the pelvis's forward; the elbow likewise against the chest's), the slide once he is down (hips under 0.45 m), the time until he
 * lies still, any jitter after that (the fastest joint once asleep), whether he ends lying, and how far he went.
 *   PB_PORT=4268 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/ragphys.js&n=3' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, T = b.THREE, Q = new URLSearchParams(location.search), N = +(Q.get('n') || 3), KIND = Q.get('k') || 'farmer1';
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
if (Q.get('noknee')) w.__noKnee = true;
w.__clockOn();
const gear = { katana: b.katanaItem, mace: b.maceItem };
let prev = null;
const spawnOne = async () => { const u = b.mutSpawnTest(X, Z - 1.75, KIND, 0); for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; w.__adv(1); await sleep(10); } for (let i = 0; i < 20; i++) w.__adv(1); return u; };
const v1 = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3(), L = new T.Vector3(), S = new T.Vector3(), F = new T.Vector3();
// how far a hinge is bent the WRONG way (m): the middle joint behind the line from the first to the last, against `fwd`
const wrong = (a, m, c, fwd) => { if (!a || !m || !c) return 0; v1.subVectors(c.p, a.p); const l = v1.length() || 1; v1.multiplyScalar(1 / l); v2.subVectors(m.p, a.p); const t = v2.dot(v1); v3.copy(v1).multiplyScalar(t); v2.sub(v3); return Math.max(0, -v2.dot(fwd)); };
const rows = [];
for (const [how, wpn, P] of [['light cut', 'katana', 0.2], ['heavy mace', 'mace', 1.0], ['kick kill', null, 0]]) for (let k = 0; k < N; k++) {
  if (prev) { prev.g.visible = false; if (prev.rag) for (const q of prev.rag.parts) { q.p.y -= 300; q.pp.y -= 300; } }
  const u = await spawnOne(); prev = u;
  const p = u.g.position, ang = (k / N) * Math.PI * 2 + 0.3, f = new T.Vector3(Math.sin(ang), 0, Math.cos(ang));
  u.st.hp = 1; u.st.awake = true; u.lastHitMine = true;
  const put = () => { C.position.set(p.x + f.x * 1.6, p.y + 1.7, p.z + f.z * 1.6); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1.1, p.z); };
  for (let i = 0; i < 10; i++) { put(); w.__adv(1); }
  if (wpn) { const it = gear[wpn]; b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it); for (let i = 0; i < 90 && u.st.alive; i++) { put(); if (i === 2) b.startDig(P); w.__adv(1); } }
  else { b.kickDirS(-f.x, -f.z); b.kickManS(u); }
  for (let i = 0; i < 120 && !u.rag; i++) { w.__adv(1); }
  const r = u.rag; if (!r) { rows.push(how + ': NO RAGDOLL (zDie ' + !!u.zDie + ', alive ' + u.st.alive + ')'); continue; }
  const B = r.byName, hp = B['Character1_Hips'] || r.parts[0]; if (!B['Character1_RightUpLeg'] || !B['Character1_LeftUpLeg']) { rows.push(how + ': parts ' + Object.keys(B).join(',')); continue; }
  let kfF = 0, kfR = 0, kneeFall = 0, kneeRest = 0, elbFall = 0, elbRest = 0, down = null, slide = 0, restAt = -1, jit = 0, travel = 0; const h0 = hp.p.clone();
  for (let i = 0; i < 360; i++) {
    w.__adv(1);
    L.subVectors(B['Character1_RightUpLeg'].p, B['Character1_LeftUpLeg'].p).normalize(); S.subVectors((B['Character1_Spine1'] || B['Character1_Spine'] || B['Character1_Spine2']).p, hp.p).normalize(); F.crossVectors(S, L).normalize();
    const kn = Math.max(wrong(B['Character1_LeftUpLeg'], B['Character1_LeftLeg'], B['Character1_LeftFoot'], F), wrong(B['Character1_RightUpLeg'], B['Character1_RightLeg'], B['Character1_RightFoot'], F));
    // (an elbow bends toward the chest's front: the forearm folds forward, so the elbow sits BEHIND the shoulder-hand line — wrong is in front)
    const eb = Math.max(wrong(B['Character1_LeftArm'], B['Character1_LeftForeArm'], B['Character1_LeftHand'], F.clone().negate()), wrong(B['Character1_RightArm'], B['Character1_RightForeArm'], B['Character1_RightHand'], F.clone().negate()));
    // (and the knee against its OWN foot's way, as the hinge judges it)
    const kf = (sd) => { const a = B['Character1_' + sd + 'UpLeg'], m = B['Character1_' + sd + 'Leg'], c = B['Character1_' + sd + 'Foot'], t = B['Character1_' + sd + 'ToeBase']; if (!a || !m || !c || !t) return 0;
      v1.subVectors(c.p, a.p).normalize(); const ft = new T.Vector3().subVectors(t.p, c.p); ft.addScaledVector(v1, -ft.dot(v1)); if (ft.length() < 0.03) return 0; ft.normalize(); return wrong(a, m, c, ft); };
    const kfoot = Math.max(kf('Left'), kf('Right'));
    if (i < 120) { kneeFall = Math.max(kneeFall, kn); elbFall = Math.max(elbFall, eb); kfF = Math.max(kfF, kfoot); } else { kneeRest = Math.max(kneeRest, kn); elbRest = Math.max(elbRest, eb); kfR = Math.max(kfR, kfoot); }
    const fl = hp.floor ?? 0;
    travel = Math.max(travel, Math.hypot(hp.p.x - h0.x, hp.p.z - h0.z));
    if (!down && hp.p.y - fl < 0.45) down = hp.p.clone();
    if (down) slide = Math.max(slide, Math.hypot(hp.p.x - down.x, hp.p.z - down.z));
    if (restAt < 0 && r.asleep) restAt = i / 60;
    if (restAt >= 0) for (const q of r.parts) jit = Math.max(jit, q.p.distanceTo(q.pp) * 180);
  }
  let top = 0; for (const q of r.parts) top = Math.max(top, q.p.y - (q.floor ?? 0));
  // and walked through: from 3 m off, the real W key for 1.5 s straight through his hips
  let walk = '';
  if (Q.get('walk')) {
    const h1 = hp.p.clone(), j1 = r.parts.map((q) => q.p.clone()); r.shoves = 0;
    const dx = Math.sin(ang + 1.2), dz = Math.cos(ang + 1.2);
    C.position.set(hp.p.x - dx * 3, (hp.floor ?? 0) + 1.7, hp.p.z - dz * 3); b.camBaseY = C.position.y;
    let vmax = 0;
    w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    for (let i = 0; i < 90; i++) { b.lookAt(C.position.x + dx * 5, C.position.y - 0.3, C.position.z + dz * 5); w.__adv(1); for (const q of r.parts) vmax = Math.max(vmax, q.p.distanceTo(q.pp) * 180); }
    w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
    for (let i = 0; i < 120; i++) w.__adv(1);
    let jm = 0; r.parts.forEach((q, k) => { jm = Math.max(jm, Math.hypot(q.p.x - j1[k].x, q.p.z - j1[k].z)); });
    walk = ` | WALKED THROUGH: shoves ${r.shoves}, hips moved ${Math.hypot(hp.p.x - h1.x, hp.p.z - h1.z).toFixed(2)} m, a joint up to ${jm.toFixed(2)} m, fastest joint ${vmax.toFixed(1)} m/s, asleep after ${!!r.asleep}`;
  }
  rows.push(`${how.padEnd(10)} | knee wrong (pelvis) fall ${kneeFall.toFixed(2)} rest ${kneeRest.toFixed(2)} (own foot) fall ${kfF.toFixed(2)} rest ${kfR.toFixed(2)} m | elbow wrong fall ${elbFall.toFixed(2)} rest ${elbRest.toFixed(2)} m | slide when down ${slide.toFixed(2)} m | still at ${restAt.toFixed(2)} s | jitter after ${jit.toFixed(2)} m/s | lying top ${top.toFixed(2)} m | travel ${travel.toFixed(2)} m${walk}`);
}
for (const r of rows) log(r);
log('DONE');
