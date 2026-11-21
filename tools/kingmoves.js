/* THE ANCIENT KING'S MOVES (2026-11-19): him already down (`kingDown`), you on the podium 8 m off him and watching him;
 * 45 s on the fixed clock, every change of his mode logged with where he is, stills of each move from your eye.
 * Run: PB_PORT=4269 sh tools/probe.sh 'evalFile&f=/tools/kingmoves.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 600 && !b.devTemple(); i++) { b.frame(1); await sleep(60); }
for (let i = 0; i < 400 && !(b.KING.g && b.KING.A && b.KING.A.flip && b.KING.A.wallRun); i++) { b.frame(1); await sleep(40); }
log('king', !!b.KING.g, 'clips', Object.keys(b.KING.A || {}).join(','));
w.__clockOn();
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
C.position.set(X - 8, Y + F + 1.7, Z); b.camBaseY = C.position.y;
b.setKingDown && b.setKingDown(true);
const K = b.KING;
const tiles = [];
const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(lab, 6, 16); tiles.push(c); };
let last = '', shots = {};
for (let f = 0; f < 60 * 54; f++) {
  const kp = K.g.getWorldPosition(new b.THREE.Vector3());
  C.position.x = X - 8; C.position.z = Z; if (!K.look) b.lookAt(kp.x, kp.y + 2, kp.z);
  w.__adv(1);
  const m = K.mode;
  if (m === 'perch' && K.mt > 0.5 && !shots.meas) { shots.meas = 1; const B = K.B, V = b.THREE.Vector3; const y = (n) => B[n] ? (B[n].getWorldPosition(new V()).y - Y - F).toFixed(2) : '-'; const r = (n) => { const q = B[n].getWorldPosition(new V()); return Math.hypot(q.x - X, q.z - Z).toFixed(2); };
    log('perched: toes', y('CC_Base_L_ToeBase'), y('CC_Base_R_ToeBase'), 'hip', y('CC_Base_Hip'), 'head', y('CC_Base_Head'), 'head r', r('CC_Base_Head'), 'hip r', r('CC_Base_Hip'), 'origin', (kp.y - Y - F).toFixed(2), 'cEnd', K.cEnd && K.cEnd.toFixed(2), 'weights', Object.entries(K.A).map(([k, a]) => k + ':' + a.getEffectiveWeight().toFixed(2)).join(' ')); }
  if (m !== last) { log('t', (f / 60).toFixed(2), last || '-', '->', m, 'at', (kp.x - X).toFixed(1), (kp.y - Y - F).toFixed(1), (kp.z - Z).toFixed(1)); last = m; }
  for (const [mm, tt] of [['flip', 0.45], ['flip', 0.9], ['flip', 1.4], ['climb', 1.0], ['climb', 2.4], ['perch', 1.0], ['perch', 2.6], ['drop', 1.5], ['drop', 3.5]]) {
    const key = mm + tt; if (m === mm && K.mt >= tt && !shots[key]) { shots[key] = 1; grab(mm + ' ' + tt + 's  y ' + (kp.y - Y - F).toFixed(1)); }
  }
}
const cols = 4, tw = tiles[0] ? tiles[0].width : 400, th = tiles[0] ? tiles[0].height : 225, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.max(1, Math.ceil(tiles.length / cols)) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'moves', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
