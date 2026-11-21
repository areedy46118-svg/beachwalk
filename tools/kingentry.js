/* THE KING'S ENTRANCE, AS YOU SEE IT (2026-11-21, the owner: "HE SHOULD EMERGE FROM THE FOG IN THE START BETTER TOO IT LOOKS
 * HORRIBLE IT HAS TO MATCH THE GAME WITH THE BEAUTY OF SEEING THE WALL OR LIGHTHOUSE. MAKE IT MAJESTIC"). The dev teleport to the
 * temple, onto the podium 26 m out; his coming through your own eye (the cut takes it) on the fixed clock: stills at `&at=`
 * (s, comma list; default every 0.75 s) with the canvas's own filter (the black and white), sheeted 4 across; and his height,
 * the mist's and the shaft's levels each half second. `&w=` still width. `&from=` where you stand (m from the middle).
 * Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/kingentry.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), W = +(Q.get('w') || 480), FROM = +(Q.get('from') || 26);
const ATS = Q.get('at') ? Q.get('at').split(',').map(Number) : Array.from({ length: 16 }, (_, i) => 0.4 + i * 0.75);
b.settings.devMode = false;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u; if (!u) { log('NO KING'); throw 0; }
w.__clockOn();
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
C.position.set(X - FROM, Y + F + 1.7, Z); b.camBaseY = C.position.y; b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 60; i++) w.__adv(1);           // (settled, the pool and the fog in)
C.position.set(X - b.KING_TRIGGER * 0.97, Y + F + 1.7, Z); b.camBaseY = C.position.y; b.lookAt(X, Y + F + 2, Z);
const tiles = [];
const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = W; c.height = Math.round(W * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
let started = -1, next = 0, ai = 0;
for (let f = 1; f <= 60 * 16; f++) {
  w.__adv(1);
  const s = b.kingS();
  if (started < 0 && s.cut >= 0) { started = f; log('he comes at frame', f); }
  if (started < 0) continue;
  const t = (f - started) / 60;
  if (ai < ATS.length && t >= ATS[ai]) { ai++; grab(`t ${t.toFixed(2)} y ${(u.g.position.y - Y - F).toFixed(1)}`); }
  if (t >= next) { next += 0.5; log(' t', t.toFixed(1), 'mode', s.mode, 'his feet', (u.g.position.y - Y - F).toFixed(2), 'vis', u.g.visible, 'mist', b.KFX.mistK.toFixed(2), 'beam', b.KFX.beamK.toFixed(2), 'dark', b.KFX.dark.toFixed(2), 'fov', C.fov.toFixed(1)); }
  if (s.mode === 'fight' && t > 1) { log('fight on at', t.toFixed(2)); break; }
}
if (tiles.length) {
  const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
  const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'entry', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}
log('END errors', errs.length, errs.slice(0, 3).join(' | '));
