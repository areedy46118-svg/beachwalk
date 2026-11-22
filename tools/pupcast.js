/* THE WORKSHOP'S SEVEN, one at a time (2026-11-21): each hung puppet from a metre and a half in front of him, his name in the
 * file. Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/pupcast.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
w.__clockOn();
for (let i = 0; i < 30; i++) w.__adv(1);
for (const u of b.cpUnitsS()) {
  if (!u.cpH) continue;
  for (const o of b.cpUnitsS()) if (o.model) o.model.visible = true;   // (the frame's culling ran against the last camera, not this one)
  const S = u.cpSw, c = new T.Vector3(0, S.hc, 0).applyQuaternion(u.g.quaternion).add(u.g.position);
  const f = new T.Vector3(0, 0, 1).applyQuaternion(S.q0); f.y = 0; f.normalize();
  const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = 55; C.updateProjectionMatrix();
  C.position.copy(c).addScaledVector(f, 1.5); C.position.y += 0.1; C.lookAt(c); C.updateMatrixWorld(true);
  shot('cast_' + u.cpH.who, 360, 1.5);
  C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q);
  if (u.cpH.who === 'clown') { C.position.set(b.CEL_X + 1.6, b.CEL_Y + 1.5, b.CEL_Z + 0.6); C.lookAt(c); C.updateMatrixWorld(true); shot('cast_clown_far', 360, 2.2); C.position.copy(pp); C.quaternion.copy(q);
    log('clown: visible', u.g.visible, u.cpHidden, '| model', u.model.visible, '| pos', (u.g.position.x - b.CEL_X).toFixed(2), (u.g.position.y - b.CEL_Y).toFixed(2), (u.g.position.z - b.CEL_Z).toFixed(2), '| inner y', u.cpInner.position.y.toFixed(3), '| scale', u.cpInner.scale.x); }
  if (u.cpH.who === 'host' || u.cpH.who === 'clown') { const B = u.cpB, S2 = u.cpSw, tp = B[S2.tied[0]].localToWorld(S2.att[0].clone()); const q2 = C.quaternion.clone(), p2 = C.position.clone(); C.fov = 40; C.updateProjectionMatrix(); C.position.copy(tp).addScaledVector(f, 0.55).add(new T.Vector3(0, 0.05, 0)); C.lookAt(tp); C.updateMatrixWorld(true); shot('tie_' + u.cpH.who, 360, 1.8); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(p2); C.quaternion.copy(q2); }
  log(u.cpH.who, 'centre', c.x.toFixed(2), (c.y - b.CEL_Y).toFixed(2), c.z.toFixed(2), '| strings', S.strs.length, '| loose', S.loose.length, '| L', S.L.toFixed(2));
}
