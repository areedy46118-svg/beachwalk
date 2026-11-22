/* WHAT BENDS THEM (2026-11-22, "LOOK HOW THEY MOVE THEIR RIGS ARE OFF"): in the fight, a puppet caught mid-move; its bones as the
 * game drew them, then the same clips at the same times and weights on the same rig with nothing else — and the difference,
 * bone by bone, in degrees. Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/pupdiff.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
C.position.set(X - 0.4, Y + 1.7, Z + 1.0); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X - 0.4, Z + 1.0, Y);
b.gainJar(1); b.cpInject(); for (let i = 0; i < 60 * 4; i++) w.__adv(1);
b.settings.devMode = false; b.cpAllDown(); for (let i = 0; i < 60 * 2; i++) { b.setHp(4); w.__adv(1); }
const K = ['hip', 'spine', 'chest', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
const stat = {}; let n = 0;
for (let f = 0; f < 60 * 8; f++) {
  b.setHp(4); C.position.set(X - 0.4, Y + 1.7, Z + 1.0); w.__adv(1);
  if (f % 6) continue;
  for (const u of b.cpUnitsS()) {
    if (!u.st.alive || u.cpHung || u.cpAir || u.cpLeap || u.cpDash || u.cpFall || u.cpHold || u.st.struck || !u.cpB) continue;
    const B = u.cpB, got = {}, q = {};
    for (const k of K) if (B[k]) { got[k] = B[k].getWorldQuaternion(new T.Quaternion()); q[k] = B[k].quaternion.clone(); }
    const acts = u.mixer._actions.filter((a) => a.isRunning()).map((a) => [a, a.time, a.getEffectiveWeight(), a.paused]);
    // the clips alone: every bone back to bind, then the mixer at its own state, sampled with no time passing
    const st = acts.map(([a]) => a.getClip().name + (a.getEffectiveWeight() > 0.5 ? '' : '~')).join('+');
    u.mixer.update(0); u.g.updateMatrixWorld(true);
    const bad = [];
    for (const k of K) if (got[k]) { const d = got[k].angleTo(B[k].getWorldQuaternion(new T.Quaternion())) * 180 / Math.PI; if (d > 8) bad.push(k + ' ' + d.toFixed(0)); const S = stat[k] || (stat[k] = { sum: 0, n: 0, max: 0 }); S.sum += d; S.n++; S.max = Math.max(S.max, d); }
    for (const k of K) if (q[k]) B[k].quaternion.copy(q[k]);
    u.g.updateMatrixWorld(true);
    if (bad.length && n < 25) { n++; log(st, '| mode', u._vgMode, u.st.atk >= 0 ? 'atk' : '', '|', bad.join(', ')); }
  }
}
log('mean/max degrees off the clip, by bone:', Object.entries(stat).map(([k, S]) => k + ' ' + (S.sum / S.n).toFixed(1) + '/' + S.max.toFixed(0)).join(' | '));
