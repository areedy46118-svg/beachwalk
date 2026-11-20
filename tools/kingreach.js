/* HOW FAR EACH OF HIS BLOWS REACHES (2026-11-20): every blow posed at each of its contacts alone, his striking limbs' points
 * in HIS frame (+z ahead of him, y over his feet): the furthest forward, its height, and its side. His stand-off for the blow
 * is that reach less a hand. Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kingreach.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.requestAnimationFrame = () => 0; u.life = null;
const RAG = u.kind.rag, bone = (n) => u.model.getObjectByName(RAG['Character1_' + n]);
const CH = [['RightArm', 'RightForeArm', 'RightHand'], ['LeftArm', 'LeftForeArm', 'LeftHand'], ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'], ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase']].map((c) => c.map(bone));
const inv = new T.Matrix4(), v = new T.Vector3();
for (const k of Object.keys(u.atk)) {
  const A = u.atk[k], a = u.clips[A.clip]; if (!a) continue;
  const D = a.getClip().duration, cs = [A.hit, ...(A.more || [])];
  const out = [];
  for (const f of cs) {
    for (const x in u.clips) u.clips[x].stop();
    a.reset(); a.setEffectiveWeight(1); a.play(); a.time = D * f; u.mixer.update(0); u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert();
    let best = null;
    for (const li of A.limbs || [0, 1]) for (const bn of CH[li]) { bn.getWorldPosition(v).applyMatrix4(inv); if (!best || v.z > best.z) best = v.clone(); }
    out.push('f' + f.toFixed(3) + ' reach ' + best.z.toFixed(2) + ' h ' + best.y.toFixed(2) + ' side ' + best.x.toFixed(2));
  }
  log(k.padEnd(8), 'stop now', A.stop, '|', out.join(' | '));
}
