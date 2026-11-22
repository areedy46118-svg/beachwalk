/* THE PHONE PICKED UP, CLOSE (2026-11-21, the owner: "improve how its picked up too with better trims"). 16:9, START, then the
 * right third of the call's own picture each half second from 24 s to 29 s, at its full size: the hand's cut edges as they are
 * drawn. Run: PB_PORT=4223 PB_Q='&title=1' PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/callpick.js' <out> */
const f = w.frameElement, Q = new URLSearchParams(location.search);
f.style.width = '1280px'; f.style.height = '720px'; w.location.reload(); await sleep(1500);
const w2 = f.contentWindow; for (let i = 0; i < 300 && !(w2.__bw && w2.__bw.TB && w2.__bw.TB.ready); i++) await sleep(100);
const b2 = w2.__bw; for (let i = 0; i < 300 && !(b2.state && b2.state().started) && !b2.IC.on; i++) { try { b2.beginGame(); } catch (e) {} await sleep(200); }
const T0 = +(Q.get('t0') || 23.5), T1 = +(Q.get('t1') || 29.5), tiles = [];
while (b2.icNow() < T0) await sleep(50);
for (let t = T0; t <= T1; t += 0.5) {
  while (b2.icNow() < t) await sleep(10);
  b2.TB.r.render(b2.TB.postSc || b2.TB.sc, b2.TB.postCam || b2.TB.cam);
  const cv = b2.TB.r.domElement, c = document.createElement('canvas'); c.width = 420; c.height = 420;
  c.getContext('2d').drawImage(cv, cv.width * 0.62, 0, cv.width * 0.38, cv.width * 0.38, 0, 0, 420, 420);
  const g = c.getContext('2d'); g.fillStyle = '#ff0'; g.font = '13px monospace'; g.fillText(t.toFixed(1) + ' s', 6, 16); tiles.push(c);
}
const cols = 4, cv = document.createElement('canvas'); cv.width = 420 * cols; cv.height = 420 * Math.ceil(tiles.length / cols);
tiles.forEach((t, i) => cv.getContext('2d').drawImage(t, (i % cols) * 420, Math.floor(i / cols) * 420));
const d = cv.toDataURL('image/jpeg', 0.88).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'pick', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
