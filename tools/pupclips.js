/* THE WORKSHOP PUPPET'S CLIPS ON HIS RIG (2026-11-22, the owner: "LOOK HOW THEY MOVE THEIR RIGS ARE OFF"): one puppet stood in the
 * open, lit, each of his gaits and blows sampled at 5 points, from his side — a sheet per clip.
 * Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/pupclips.js' <out>   (&clips=a,b to choose) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(5); }
w.__clockOn();
const A = new T.AmbientLight(0xffffff, 1.6); b.scene.add(A);
const u = b.cpUnitsS().find((x) => x.cpBench), X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
u.cpHidden = false; u.g.visible = true; u.model.visible = true;
const at = { x: X + 0.2, z: Z + 0.6 };
const Q = new URLSearchParams(top.location.search);
const names = (Q.get('clips') || 'mMRun,mHWalk,mHStrL,mPunch,mZKick,mZPunch2,mHitBack').split(',');
log('clips he has', Object.keys(u.clips).join(','));
for (const nm of names) {
  const a = u.clips[nm]; if (!a) { log('no', nm); continue; }
  const tiles = [];
  for (const [side, yaw] of [['side', Math.PI / 2], ['front', 0]]) for (let k = 0; k < 5; k++) {
    u.g.position.set(at.x, Y, at.z); u.g.rotation.set(0, 0, 0); u.g.updateMatrixWorld(true);
    u.mixer.stopAllAction(); a.reset(); a.play(); a.paused = true; a.time = a.getClip().duration * k / 5; u.mixer.update(0); u.g.updateMatrixWorld(true);
    C.fov = 40; C.updateProjectionMatrix(); C.position.set(at.x + Math.sin(yaw) * 2.6, Y + 0.6, at.z + Math.cos(yaw) * 2.6); C.lookAt(at.x, Y + 0.45, at.z); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C);
    const cv = b.renderer.domElement, c = document.createElement('canvas'); c.width = 200; c.height = 240;
    const g = c.getContext('2d'); g.drawImage(cv, (cv.width - cv.height * 0.83) / 2, 0, cv.height * 0.83, cv.height, 0, 0, 200, 240);
    g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(nm + ' ' + side + ' ' + k, 4, 14); tiles.push(c);
  }
  const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 480;
  tiles.forEach((t, i) => cv.getContext('2d').drawImage(t, (i % 5) * 200, Math.floor(i / 5) * 240));
  const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'c_' + nm, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}
