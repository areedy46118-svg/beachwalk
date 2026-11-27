/* THE SCOURGER'S BLOWS, WHERE THEY STRIKE (2026-11-25). Each attack clip scrubbed (160 samples, nothing else running) on him in the
 * temple: the axe's head (`kingAxeTip`) and his left claws, in his frame (+z in front, +x his left); the passes = fast, in front
 * of him, at a man's head and chest — the contact of each is the sample most squarely in front. Prints SCOURGE_HIT. Also the
 * idle layer (`KING.layered`) and `kingMeasureBlows`' stand-offs.
 *   PB_PORT=4267 PB_WAIT=1200 sh tools/probe.sh 'evalFile&f=/tools/scourgeclips.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn();
b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 30; i++) w.__adv(1);
log('layered', b.KING.layered, '| tip', !!u.kAxeTip, '| blows', b.KING.blows);
const Q = new URLSearchParams(location.search), CL = (Q.get('clips') || 'plunge,rear,sAtk,sDash,sCutB,sCutC,sCombo').split(',');
const life = u.life; u.life = null;
const hand = u.model.getObjectByName(Q.get('end') || 'Character1_LeftHand'), tip = u.kAxeTip, inv = new T.Matrix4(), res = {};   // (&end=Tail: the second end measured is that bone — the tail's tip for 'rear')
for (const nm of CL) {
  const a = u.clips[nm]; if (!a) { log('no clip', nm); continue; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
  const D = a.getClip().duration, N = 160, S = { axe: [], claw: [] };
  const r0 = u.g.rotation.y; u.g.rotation.y = 0;
  for (let i = 0; i <= N; i++) { a.time = D * i / N; u.mixer.update(0); b.kingAxeHoldS(u, ['sFly', 'sLand'].includes(a.getClip().name) ? 0 : 1); u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert();
    S.axe.push(tip.getWorldPosition(new T.Vector3()).applyMatrix4(inv)); S.claw.push(hand.getWorldPosition(new T.Vector3()).applyMatrix4(inv)); }
  u.g.rotation.y = r0;
  const all = [];
  for (const end of ['axe', 'claw']) {
    const P = S[end], sp = P.map((p, i) => (i ? p.distanceTo(P[i - 1]) * N / D : 0)), fr = P.map((p) => p.z - Math.abs(p.x) * 0.6);
    const pass = [];
    for (let i = 1; i < N; i++) { const ok = sp[i] > 4 && fr[i] > 0.3 && P[i].y > 0.9 && P[i].y < 2.4; if (ok) { const l = pass[pass.length - 1]; if (l && i - l.e <= 3) { l.e = i; if (fr[i] > fr[l.b]) l.b = i; } else pass.push({ s: i, e: i, b: i }); } }
    for (const q of pass) all.push({ end, f: q.b / N, sp: sp[q.b], z: P[q.b].z, x: P[q.b].x, y: P[q.b].y });
  }
  if ((Q.get('prof') || '').split(',').includes(nm)) for (let i = 0; i <= N; i += 4) { const A = S.axe[i], Cw = S.claw[i], sA = i ? A.distanceTo(S.axe[i - 1]) * N / D : 0, sC = i ? Cw.distanceTo(S.claw[i - 1]) * N / D : 0; log('  PROF', nm, (i / N).toFixed(3), '| axe', [A.x, A.y, A.z].map((v) => v.toFixed(2)).join(','), sA.toFixed(1), 'm/s r', Math.hypot(A.x, A.z).toFixed(2), '| claw', [Cw.x, Cw.y, Cw.z].map((v) => v.toFixed(2)).join(','), sC.toFixed(1)); }
  all.sort((a2, b2) => a2.f - b2.f);
  log(nm, D.toFixed(2) + 's', '| passes', all.map((q) => `${q.end} ${q.f.toFixed(3)} (${q.sp.toFixed(0)} m/s, ${q.z.toFixed(2)} in front, x ${q.x.toFixed(2)}, y ${q.y.toFixed(2)})`).join(' ; ') || 'NONE');
  res[nm] = all.map((q) => +q.f.toFixed(3));
}
log('RE-MEASURED', b.kingMeasureBlowsS());
if (Q.get('life')) u.life = life;   // (&life=1: posed with his life layer on, as the game measures)
for (const k of ['kgAtk', 'kgCutB', 'kgCutC', 'kgCombo', 'kgDash', 'kgPlunge', 'kgRear']) {
  const A = u.atk[k]; if (!A) { log('no atk', k); continue; } const a = u.clips[A.clip];
  for (const kk in u.clips) u.clips[kk].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * A.hit; u.mixer.update(0); b.kingAxeHoldS(u, ['sFly', 'sLand'].includes(a.getClip().name) ? 0 : 1); u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert();
  const tp = tip.getWorldPosition(new T.Vector3()).applyMatrix4(inv);
  log('ATK', k, 'clip', A.clip, 'hit', (+A.hit).toFixed(3), 'more', JSON.stringify(A.moreT || A.more || null), 'wind', (+A.wind).toFixed(2), '| tip at', [tp.x, tp.y, tp.z].map((v) => v.toFixed(2)).join(','), '| model rotY', u.model.rotation.y.toFixed(2));
}
u.life = life;
log('SCOURGE_HIT', JSON.stringify(res));
log('DONE');
