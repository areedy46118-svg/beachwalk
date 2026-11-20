/* THE ANCIENT KING COMES DOWN (2026-11-19, "make him hover down when you get in the temple at the end"): in the temple, put
 * on the podium just inside the trigger; his descent from your own eye (the cut turns it onto him), timed on the fixed clock,
 * then a close look at the hover from in front and the side. Run: PB_PORT=4265 sh tools/probe.sh 'evalFile&f=/tools/kingtemple.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 600 && !b.devTemple(); i++) { b.frame(1); await sleep(60); }
for (let i = 0; i < 400 && !(b.KING.g); i++) { b.frame(1); await sleep(40); }
log('king loaded', !!b.KING.g, 'bones', Object.keys(b.KING.B).length, 'state', JSON.stringify(b.kingS()));
w.__clockOn();
const C = b.camera, T = b.THREE, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
// on the podium, 26 m out, facing the middle (the trigger is at ${b.KING_TRIGGER})
C.position.set(X - 26, Y + F + 1.7, Z); b.camBaseY = C.position.y; b.lookAt(X, Y + F + 2, Z); w.__adv(2);
const tiles = [];
const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(lab, 6, 16); tiles.push(c); };
let started = -1;
for (let f = 1; f <= 60 * 11; f++) {
  w.__adv(1);
  const s = b.kingS();
  if (started < 0 && s.cut >= 0) { started = f; log('he comes at frame', f, 'player r', Math.hypot(C.position.x - X, C.position.z - Z).toFixed(1)); }
  if (started > 0 && [20, 62, 150, 270, 400, 450, 470, 540].includes(f - started)) { const kp = b.KING.g.position; grab(`t ${((f - started) / 60).toFixed(2)} y ${(kp.y - F).toFixed(1)} fov ${C.fov.toFixed(0)}`); }
  if (started > 0 && s.down) { log('down at', ((f - started) / 60).toFixed(2), 's; frozen after', b.tmpS().fz, 'hover', (b.KING.g.position.y - F).toFixed(2)); break; }
}
for (let i = 0; i < 90; i++) w.__adv(1);
// the hover, close: from in front, his left, three-quarter, and where his hands, feet and head are in HIS frame
w.requestAnimationFrame = () => 0;
const K = b.KING.g, kp = K.getWorldPosition(new T.Vector3()), yaw = K.rotation.y, inv = K.matrixWorld.clone().invert();
K.updateMatrixWorld(true);
const at = (n) => { const bn = b.KING.B[n]; if (!bn) return n + ' -'; const v = bn.getWorldPosition(new T.Vector3()).applyMatrix4(inv); return n.replace('CC_Base_', '') + ' ' + v.toArray().map((x) => x.toFixed(2)).join(','); };
log('in his frame (+z ahead, +x his left):', ['CC_Base_Head', 'CC_Base_L_Hand', 'CC_Base_R_Hand', 'CC_Base_L_Forearm', 'CC_Base_L_Foot', 'CC_Base_R_Foot', 'CC_Base_L_ToeBase', 'CC_Base_Hip'].map(at).join(' | '));

const shotAt = (ang, dist, lab) => { C.position.set(kp.x + Math.sin(yaw + ang) * dist, kp.y + 2.0, kp.z + Math.cos(yaw + ang) * dist); C.fov = 34; C.updateProjectionMatrix(); C.lookAt(kp.x, kp.y + 1.9, kp.z); C.updateMatrixWorld(true); b.lamps(); b.renderer.render(b.scene, C); grab(lab); };
shotAt(0, 9, 'in front'); shotAt(Math.PI / 2, 9, 'his left side'); shotAt(Math.PI / 4, 9, 'three-quarter');
const cols = 3, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.88).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'king', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
