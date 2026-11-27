/* HOW A SCOURGER CLIP MOVES OVER ITS LENGTH (2026-11-26): on the clip alone, every 1/15 s — how far his body moved since the last
 * sample (the summed turn of hips, spine, neck, head, arms and legs in his group's frame, deg), his hips' height, the axe head's
 * height and reach. A still stretch is a held pose: `&clips=sDash,sCutB`.
 *   PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/scourgeprofile.js&clips=sDash' <out> */
const Q = new URLSearchParams(location.search), ONLY = (Q.get('clips') || 'sDash').split(','), FPS = +(Q.get('fps') || 15);
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.kgMeasured); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, M = u.model; b.setKingDown(true); window.requestAnimationFrame = () => 0;
const names = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'].map((n) => M.getObjectByName('Character1_' + n)).filter(Boolean);
const all = [...new Set(Object.values(u.clips))], gi = () => u.g.getWorldQuaternion(new T.Quaternion()).invert();
const pose = (a, t) => { for (const x of all) { x.enabled = false; x.setEffectiveWeight(0); } a.play(); a.enabled = true; a.paused = false; a.setEffectiveWeight(1); a.time = t; for (const bd of u.mixer._bindings) { bd.buffer.fill(0, bd.valueSize, bd.valueSize * 2); bd.buffer.fill(1, bd.valueSize * 2, bd.valueSize * 3); }; u.mixer.rawUpdate(0); b.kingAxeHoldS(u, 1); u.g.updateMatrixWorld(true); };
for (const nm of ONLY) {
  const a = u.clips[nm]; if (!a) { log('no clip ' + nm); continue; }
  const D = a.getClip().duration, N = Math.round(D * FPS), A = Object.values(u.atk).find((x) => x.clip === nm);
  log('== ' + nm + ' ' + D.toFixed(2) + 's' + (A ? ' hit ' + A.hit + ' wind ' + (A.wind || 0).toFixed(2) + ' strike ' + (A.strike || 0).toFixed(2) + ' recover ' + (A.recover || 0).toFixed(2) : ''));
  let prev = null; const rows = [];
  for (let i = 0; i <= N; i++) {
    pose(a, D * i / N); const g = gi(), qs = names.map((n) => n.getWorldQuaternion(new T.Quaternion()).premultiply(g));
    let mv = 0; if (prev) for (let k = 0; k < qs.length; k++) mv += qs[k].angleTo(prev[k]) * 57.3; prev = qs;
    const hp = M.getObjectByName('Character1_Hips').getWorldPosition(new T.Vector3()).applyMatrix4(u.g.matrixWorld.clone().invert()), tp = u.kAxeTip ? u.kAxeTip.getWorldPosition(new T.Vector3()).applyMatrix4(u.g.matrixWorld.clone().invert()) : null;
    rows.push((D * i / N).toFixed(2) + ' mv ' + mv.toFixed(0).padStart(4) + ' hips y ' + hp.y.toFixed(2) + ' z ' + hp.z.toFixed(2) + (tp ? ' axe y ' + tp.y.toFixed(2) + ' out ' + Math.hypot(tp.x, tp.z).toFixed(2) : ''));
  }
  for (let i = 0; i < rows.length; i += 2) log(rows[i] + '   |   ' + (rows[i + 1] || ''));
}
log('DONE');
