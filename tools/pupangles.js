/* THE RETARGET, MEASURED (2026-11-22): the Mutant Run on the puppet at five points — the torso's lean from vertical, each knee's bend,
 * each thigh's swing forward — to set against the Mixamo source's own (`$TMPDIR/ic/mr/sticks.json`).
 * Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/pupangles.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
const u = b.cpUnitsS().find((x) => x.cpBench), B = u.cpB;
u.g.rotation.set(0, 0, 0);
const Q = new URLSearchParams(top.location.search), nm = Q.get('clip') || 'mMRun', a = u.clips[nm];
const P = (k) => B[k].getWorldPosition(new T.Vector3());
const ang = (a2, b2) => Math.acos(Math.max(-1, Math.min(1, a2.clone().normalize().dot(b2.clone().normalize())))) * 180 / Math.PI;
for (let k = 0; k < 5; k++) {
  u.mixer.stopAllAction(); a.reset(); a.play(); a.paused = true; a.time = a.getClip().duration * k / 5; u.mixer.update(0); u.g.updateMatrixWorld(true);
  const hip = P('hip'), head = P('head'), ch = P('chest');
  const lean = ang(head.clone().sub(hip), new T.Vector3(0, 1, 0));
  const kn = (s) => { const t = P('thigh' + s), sh = P('shin' + s), f = P('foot' + s); return (180 - ang(t.clone().sub(sh), f.clone().sub(sh))).toFixed(0); };
  const sw = (s) => { const t = P('thigh' + s), sh = P('shin' + s); const v = sh.clone().sub(t); return (Math.atan2(v.z, -v.y) * 180 / Math.PI).toFixed(0); };   // +: knee forward of the hip (he faces +z)
  const sx = (s) => { const t = P('thigh' + s), sh = P('shin' + s); const v = sh.clone().sub(t); return (Math.atan2(v.x, -v.y) * 180 / Math.PI).toFixed(0); };   // the knee out to the side
  log(nm, k, '| lean', lean.toFixed(0), '| knee bend L', kn('L'), 'R', kn('R'), '| thigh fwd L', sw('L'), 'R', sw('R'), '| thigh sideways L', sx('L'), 'R', sx('R'));
}
