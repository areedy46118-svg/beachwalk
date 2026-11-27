/* THE FIST IN MESH2MOTION'S CLIPS AGAINST THE FARMER'S (2026-11-25, the owner: "fix his weapon holding … make their skeletons and bodies be
 * exactly like that video"). A farmer holding his weapon, the clip paused at fractions `&frs=`: his right hand's knuckle line (index ->
 * little knuckle) and finger line (wrist -> middle knuckle), and his forearm, in HIS frame (+x his left, +y up, +z in front). The same
 * read off the GLB itself is `tools/swhand.py`; the two side by side say how far the retarget turns the fist.
 *   PB_PORT=4241 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/swhand.js&clip=mSwIdle&frs=0,0.5' <out> */
const Q = new URLSearchParams(location.search), CLIP = Q.get('clip') || 'mSwIdle', FRS = (Q.get('frs') || '0').split(',').map(Number);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().length >= 20 && units().every((u) => u.model && !u.parLate)); i++) { b.frame(1); await sleep(30); }
const u = units().find((x) => x.model && x.farmTool && x.clips[CLIP]);
const T = b.THREE, bn = {};
u.model.traverse((o) => { if (o.isBone) bn[o.name.replace(/^mixamorig:?/, '').replace(/_[a-z0-9]+$/i, '')] = o; });
log('man', u.kindName, u.kind.file, '| hand bones', Object.keys(bn).filter((k) => /RightHand/.test(k)).join(' '));
const stopAll = () => { for (const x of Object.values(u.clips)) { x.stop(); x.enabled = false; x.setEffectiveWeight(0); } };
const a = u.clips[CLIP]; const dur = a.getClip().duration;
const inv = new T.Matrix4(), P = (n) => bn[n] ? bn[n].getWorldPosition(new T.Vector3()).applyMatrix4(inv) : null, f2 = (v) => v ? [v.x, v.y, v.z].map((x) => x.toFixed(2)).join(',') : '-';
for (const fr of FRS) {
  stopAll(); a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = dur * fr; u.model.rotation.y = 0; u.mixer.update(0); u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert();
  // (and in his PELVIS's frame: x across the hips to his left, y up, z = x × y in front — the GLB side is read the same way)
  { const L = P('LeftUpLeg'), R = P('RightUpLeg'), X = L.clone().sub(R); X.y = 0; X.normalize(); const Y = new T.Vector3(0, 1, 0), Z = X.clone().cross(Y);
    const pf = (v) => v ? [v.dot(X), v.dot(Y), v.dot(Z)].map((x) => x.toFixed(2)).join(',') : '-', d = (a2, b2) => P(b2).clone().sub(P(a2)).normalize();
    for (const sd of ['Right', 'Left']) log(CLIP, fr, sd, 'PELVIS FRAME | knuckles', pf(d(sd + 'HandIndex1', sd + 'HandPinky1')), '| fingers', pf(d(sd + 'Hand', sd + 'HandMiddle1')), '| forearm', pf(d(sd + 'ForeArm', sd + 'Hand')), '| upper arm', pf(d(sd + 'Arm', sd + 'ForeArm'))); }
  const h = P('RightHand'), i1 = P('RightHandIndex1'), p1 = P('RightHandPinky1'), m1 = P('RightHandMiddle1'), fa = P('RightForeArm');
  log(CLIP, fr, '| knuckles (index->little)', i1 && p1 ? f2(p1.clone().sub(i1).normalize()) : '-', '| fingers (wrist->middle)', m1 ? f2(m1.clone().sub(h).normalize()) : '-', '| forearm', f2(h.clone().sub(fa).normalize()),
    '| weapon haft', u.farmTool ? f2(new T.Vector3(0, 1, 0).applyQuaternion(u.farmTool.getWorldQuaternion(new T.Quaternion())).applyQuaternion(new T.Quaternion().setFromRotationMatrix(inv))) : '-');
}
log('DONE');
