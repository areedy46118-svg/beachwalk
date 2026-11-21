/* HIS BIND, MEASURED (2026-11-20): every mapped joint's place in his model's frame at the bind, the direction to the joint the
 * retarget aligns it by (NTAR_MX_CHILD) against the same in the Mixamo rest, and the angle between them; and which of his
 * joints have a parent that is not a bone (a scale-compensation node). Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kingbind.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; u.mixer.stopAllAction(); u.mixer.update(0); u.model.updateMatrixWorld(true);
const mv = await (await fetch('/assets/king-moves.json')).json(), RP = mv.clips.kIdle.restPos;
const mmi = u.model.matrixWorld.clone().invert(), at = (n) => u.model.getObjectByName(n).getWorldPosition(new T.Vector3()).applyMatrix4(mmi);
const R = b.MUT_KINDS ? b.MUT_KINDS.king.rag : null;
const rag = u.kind.rag, CH = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftShoulder: 'LeftArm', RightShoulder: 'RightArm', LeftFoot: 'LeftToeBase', RightFoot: 'RightToeBase' };
const rows = [];
for (const mx in CH) {
  const a = rag['Character1_' + mx], c = rag['Character1_' + CH[mx]]; if (!a || !c || !RP[mx] || !RP[CH[mx]]) continue;
  const d1 = at(c).sub(at(a)), d2 = new T.Vector3(RP[CH[mx]][0] - RP[mx][0], RP[CH[mx]][1] - RP[mx][1], RP[CH[mx]][2] - RP[mx][2]);
  const ang = d1.clone().normalize().angleTo(d2.clone().normalize()) * 180 / Math.PI;
  const bn = u.model.getObjectByName(a);
  rows.push(mx.padEnd(13) + ' rig ' + d1.toArray().map((v) => v.toFixed(2)).join(',') + ' mixamo ' + d2.toArray().map((v) => v.toFixed(2)).join(',') + ' angle ' + ang.toFixed(0) + ' parentBone ' + !!(bn.parent && bn.parent.isBone) + ' parent ' + bn.parent.name);
}
log('\n' + rows.join('\n'));
log('hip at', at(rag.Character1_Hips).toArray().map((v) => v.toFixed(2)).join(','), 'head', at(rag.Character1_Head).toArray().map((v) => v.toFixed(2)).join(','), 'Lfoot', at(rag.Character1_LeftFoot).toArray().map((v) => v.toFixed(2)).join(','));
