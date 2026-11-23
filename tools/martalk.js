/* THE MARIONETTE'S DIALOG (2026-11-22, the owner's tree): three paths through it (Leave, Escape, and take-you-there) and whether he comes off the swing. Was: THE MARIONETTE ON THE SWING, AND AT YOUR SIDE (2026-11-21): out of the washer he is on the swing in front of Elvédor's house,
 * facing you, pumping it high (stills across a swing); the walk up (bars); the talk and his hop off; following you; a fight
 * with one of Elvédor's kind beside you; and his death, in pieces.
 * Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/marswing.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(2);
b.elvLandSet(true); C.position.set(HX - 8, HY + 1.9, HZ - 4); b.camBaseY = C.position.y;
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); if (b.elvSwingS() && i > 60) break; }
b.MAR.st = 'swing';
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && m.vis && i > 30) break; }
log('on the swing:', JSON.stringify(b.marS()));
w.__clockOn();
const S = b.elvSwingS(), gp = S.g.getWorldPosition(new T.Vector3()), ax = new T.Vector3(1, 0, 0).applyQuaternion(S.g.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
const fl = gp.y - S.L - 0.55;
// stand in front of him, 7 m off along his way
const side = (C.position.x - gp.x) * ax.x + (C.position.z - gp.z) * ax.z >= 0 ? 1 : -1;
const stand = (d, h = 1.7) => { C.position.set(gp.x + ax.x * side * d, fl + h, gp.z + ax.z * side * d); b.camBaseY = C.position.y; b.lookAt(gp.x, fl + 0.9, gp.z); };
const snap = (nm, px, py, pz, tx, ty, tz, fov = 55, g = 1.6) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); for (const u of b.mutants || []) if (u.model) u.model.visible = true; if (b.MAR.u && b.MAR.u.model) b.MAR.u.model.visible = true; shot(nm, 480, g); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
for (let i = 0; i < 60; i++) { stand(20); w.__adv(1); }
for (let i = 0; i < 30; i++) { stand(6); w.__adv(1); }
log('facing', b.MAR.face, '| side', side, '| amp', f2(S.amp));
for (let i = 0; i < 60; i++) { stand(3.0); w.__adv(1); }
const D = w.document, txt = () => (D.getElementById('dialog-text') || {}).textContent || '';
const btns = () => [...D.querySelectorAll('#dialog .choice, .choice')].map((q) => q.textContent);
const settle = async (n = 160) => { for (let i = 0; i < n; i++) { stand(3.0); w.__adv(1); await sleep(4); } };
const typed = async () => { for (let i = 0; i < 400; i++) { stand(3.0); w.__adv(1); await sleep(20); if (!D.getElementById('dialog').classList.contains('typing')) break; } };
const pick = async (label) => { const q = [...D.querySelectorAll('#dialog .choice, .choice')].find((e) => e.textContent.includes(label)); if (!q) { log('  NO BUTTON', label, '| have', JSON.stringify(btns())); return false; } q.click(); await typed(); log('  said', JSON.stringify(label), '-> he:', JSON.stringify(txt()), '| buttons', JSON.stringify(btns()), '| open', b.state().dialogOpen); return true; };
const path = async (nm, labels, esc) => {
  b.marTalk(); await typed(); log(nm, 'open:', JSON.stringify(txt()), JSON.stringify(btns()));
  for (const l of labels) if (!(await pick(l))) break;
  if (esc && b.state().dialogOpen) b.endDialog();
  await settle(240); log(nm, 'after: dialog open', b.state().dialogOpen, '| st', b.MAR.st);
};
await path('A (what -> why -> leave)', ['What are you?', 'Why were you locked', 'Leave']);
await path('B (escape at the light)', ['You okay?', 'What are you?', 'Why were you locked'], true);
await path('C (okay -> what -> why -> take)', ['You okay?', 'What are you?', 'Why were you locked', 'take you there']);
