/* THE SCOURGER HEAD-ON, AS YOU SEE HIM (2026-11-26): stills of chosen clips at chosen moments, from your eye 6 m in front of him,
 * through the game's own camera and grade — to tell which clip a screenshot of the owner's is. `&set=sStalk:0,sStalk:0.5,...`
 *   PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/scourgefront.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), SET = (Q.get('set') || 'sStalk:0,sStalk:0.25,sStalk:0.5,sStalk:0.75,kSprint:0,kSprint:0.5,walk:0.25,sDash:0.1,sDash:0.3,sCombo:0.6,sCutC:0.3,sAtk:0.2').split(',').map((s) => s.split(':'));
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.kgMeasured); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, C = b.camera, Y = b.TMP_Y; w.__clockOn(); b.setKingDown(true); b.KING.mode = 'fight'; u.st.alive = true; u.g.visible = true;
const all = [...new Set(Object.values(u.clips))], p = u.g.position, yaw = u.g.rotation.y;
const TW = 320, TH = 260, COLS = 6, cv = document.createElement('canvas'); cv.width = TW * COLS; cv.height = TH * Math.ceil(SET.length / COLS); const g = cv.getContext('2d');
let k = 0;
for (const [nm, f] of SET) {
  const a = u.clips[nm]; if (!a) { log('no ' + nm); continue; }
  for (const x of all) { x.enabled = false; x.setEffectiveWeight(0); } a.play(); a.enabled = true; a.paused = false; a.setEffectiveWeight(1); a.time = a.getClip().duration * +f;
  for (const bd of u.mixer._bindings) { bd.buffer.fill(0, bd.valueSize, bd.valueSize * 2); bd.buffer.fill(1, bd.valueSize * 2, bd.valueSize * 3); }
  u.mixer.update(0); u.g.updateMatrixWorld(true);
  C.position.set(p.x + Math.sin(yaw) * 6, p.y + 1.7, p.z + Math.cos(yaw) * 6); b.lookAt(p.x, p.y + 1.5, p.z); C.updateMatrixWorld(true);
  b.renderer.render(b.scene, C);
  const src = b.renderer.domElement, sw = src.height * TW / TH;
  g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, (k % COLS) * TW, Math.floor(k / COLS) * TH, TW, TH);
  g.fillStyle = '#ff5'; g.font = '13px monospace'; g.fillText(nm + ' ' + f, (k % COLS) * TW + 3, Math.floor(k / COLS) * TH + 14); k++;
}
const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'front', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('DONE');
