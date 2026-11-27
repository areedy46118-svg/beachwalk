/* A STRIP OF ONE OF HIS CLIPS (2026-11-26): `&clips=a,b` each as `&n=` frames (10) across one cycle, from `&cam=side|front|q`,
 * graded as the fight grades it, one row a clip — to LOOK at his legs in a run. `&hold=1` the fight's long grip on the axe.
 *   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgestrip.js&clips=sStalk,kSprint,walk' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 20; i++) w.__adv(1);
const Q = new URLSearchParams(location.search), CL = (Q.get('clips') || 'sStalk,kSprint,walk').split(','), N = +(Q.get('n') || 10), CAM = Q.get('cam') || 'side';
log('clip names', Object.keys(u.clips).join(' ')); log('kind clips', JSON.stringify(u.kind.clips || {}).slice(0, 900)); const life = u.life; u.life = null; C.fov = 34; C.updateProjectionMatrix();
const TW = +(Q.get('tw') || 170), TH = +(Q.get('th') || 190), cv = document.createElement('canvas'); cv.width = TW * N; cv.height = TH * CL.length; const g = cv.getContext('2d');
const gp = u.g.position;
CL.forEach((nm, row) => {
  const a = u.clips[nm]; if (!a) { log('no clip', nm); return; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
  for (let i = 0; i < N; i++) {
    a.time = a.getClip().duration * i / N; u.mixer.rawUpdate(0); b.kingAxeHoldS(u, 1); u.g.updateMatrixWorld(true);
    const ang = CAM === 'front' ? 0 : CAM === 'q' ? 0.8 : Math.PI / 2, yaw = u.g.rotation.y + ang, d = +(Q.get('dist') || 9.5);
    C.position.set(gp.x + Math.sin(yaw) * d, gp.y + 1.5, gp.z + Math.cos(yaw) * d); C.lookAt(gp.x, gp.y + 1.5, gp.z); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C);
    const src = b.renderer.domElement, sw = src.height * TW / TH; g.filter = 'grayscale(1) contrast(1.2) brightness(1.5)';
    g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, i * TW, row * TH, TW, TH);
    g.filter = 'none'; g.fillStyle = '#f44'; g.font = '12px monospace'; if (i === 0) g.fillText(nm, 4, row * TH + 13);
  }
});
u.life = life;
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'strip', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('DONE');
