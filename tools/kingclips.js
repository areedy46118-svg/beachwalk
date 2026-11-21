/* THE KING'S CLIPS, LOOKED AT (2026-11-20, the owner: "make sure the final boss animations are right they look awful in the
 * screenshots"): each of his clips at five moments, from his right side, on the podium, nothing else running (no fight, no
 * life layer, no aim) — to set beside the Mixamo takes themselves (`tools/fbxshots.py`). `&clips=a,b` `&view=side|front`.
 * Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kingclips.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera; w.__clockOn();
b.KING.mode = 'ready'; u.g.visible = true; w.__adv(5);
w.requestAnimationFrame = () => 0;
const Q = new URLSearchParams(location.search), view = Q.get('view') || 'side';
const clips = (Q.get('clips') || 'kIdle,kWalk,kRun,kSprint,kStrWL,kUpper,kKnee,kKick,kBike,kAssn,kShock,flip').split(',');
const life = u.life; u.life = null;
const tiles = [];
const kshot = (lab) => {
  const p = u.g.position, yw = u.g.rotation.y + (view === 'side' ? -Math.PI / 2 : 0);
  u.g.updateMatrixWorld(true);
  C.position.set(p.x + Math.sin(yw) * 9, p.y + 1.9, p.z + Math.cos(yw) * 9); C.fov = 40; C.updateProjectionMatrix(); C.lookAt(p.x, p.y + 1.6, p.z); C.updateMatrixWorld(true);
  b.lamps && b.lamps(); b.renderer.render(b.scene, C);
  const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 220; c.height = 260; const g = c.getContext('2d');
  const sw = src.height * 220 / 260; g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, 0, 0, 220, 260); g.fillStyle = '#ff0'; g.font = '11px monospace'; g.fillText(lab, 4, 13); tiles.push(c); };
for (const n of clips) {
  const a = u.clips[n]; if (!a) { log('no clip', n); continue; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.setEffectiveWeight(1); a.play(); u.cur = a;
  const D = a.getClip().duration;
  for (const f of [0, 0.25, 0.5, 0.75, 0.98]) { a.time = D * f; u.g.position.set(b.TMP_X, b.TMP_Y + b.tmpFloorAt(0, 0), b.TMP_Z); u.mixer.update(0); kshot(n + ' ' + f); }
}
u.life = life;
const cols = 5, tw = 220, th = 260, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'kingclips', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
