/* THE BENCH PUPPET ASLEEP (2026-11-22, "the puppet laying on the workshop desk should be in this pose" — Mixamo "Sleeping Idle"):
 * into the cellar, the bench puppet from above, the side and the end. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh
 * 'evalFile&f=/tools/pupsleep.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(5); }
w.__clockOn();
const P = b.celPupS(); log('slept', !!(P && P.slept), P && P.sleepDbg);
const A = new T.AmbientLight(0xffffff, 1.2); b.scene.add(A);
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z, at = { x: X - 0.45, y: Y + 0.9, z: Z + 2.3 };
const view = (nm, dx, dy, dz) => { C.fov = 45; C.updateProjectionMatrix(); C.position.set(at.x + dx, at.y + dy, at.z + dz); C.lookAt(at.x, at.y, at.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 560, 1.4); };
view('sl_above', 0.05, 1.4, -0.5); view('sl_side', 0.1, 0.35, -1.3); view('sl_end', -1.3, 0.4, -0.3);
// the fighter himself in the clip, on the floor beside the bench: is the retarget lying flat?
{
  const u = b.cpUnitsS().find((x) => x.cpBench), a = u.clips.mSleep;
  u.cpHidden = false; u.g.visible = true; u.model.visible = true;
  u.g.position.set(X + 0.6, Y, Z + 1.0); u.g.rotation.set(0, 0, 0);
  u.mixer.stopAllAction(); a.reset(); a.play(); a.paused = true; a.time = a.getClip().duration * 0.3; u.mixer.update(0); u.g.updateMatrixWorld(true);
  const B = u.cpB, f = (k) => { const v = B[k].getWorldPosition(new T.Vector3()); return k + ' ' + (v.y - Y).toFixed(2); };
  log('fighter heights', ['hip', 'spine', 'chest', 'head', 'footL', 'footR', 'handL', 'handR'].map(f).join(' | '));
  const I = b.celPupS(), g = (k) => { const v = I.rig.B[k].getWorldPosition(new T.Vector3()); return k + ' ' + (v.y - Y - 0.816).toFixed(2); };
  log('bench copy heights over the bench', ['hip', 'spine', 'chest', 'head', 'footL', 'footR', 'handL', 'handR'].map(g).join(' | '));
  const at2 = { x: X + 0.6, y: Y + 0.3, z: Z + 1.0 };
  C.fov = 50; C.updateProjectionMatrix(); C.position.set(at2.x + 0.2, at2.y + 0.5, at2.z - 1.6); C.lookAt(at2.x, at2.y, at2.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('fighter_sleep', 560, 1.4);
}
{
  const u = b.cpUnitsS().find((x) => x.cpBench), I = b.celPupS();
  const rows = [];
  for (const k of ['hip', 'spine', 'chest', 'head', 'armL', 'thighL', 'shinL']) {
    const s = u.cpB[k], d = I.rig.B[k];
    rows.push(`${k}: par ${s.parent.name}/${d.parent.name} pos ${s.position.toArray().map((v) => v.toFixed(2))}/${d.position.toArray().map((v) => v.toFixed(2))} sc ${s.scale.x.toFixed(2)}/${d.scale.x.toFixed(2)}`);
  }
  log(rows.join(' || '));
  let pu = [], pi = []; for (let o = u.cpB.hip; o; o = o.parent) pu.push((o.name || o.type) + (o.scale.x !== 1 ? '*' + o.scale.x.toFixed(3) : '') + (o.quaternion.w < 0.9999 ? 'q' : ''));
  for (let o = I.rig.B.hip; o; o = o.parent) pi.push((o.name || o.type) + (o.scale.x !== 1 ? '*' + o.scale.x.toFixed(3) : '') + (o.quaternion.w < 0.9999 ? 'q' : ''));
  log('unit chain', pu.join(' < ')); log('copy chain', pi.join(' < '));
}
