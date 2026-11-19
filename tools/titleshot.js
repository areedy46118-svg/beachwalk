/* THE TITLE AS IT SITS BEFORE START (2026-11-19): the bedroom's canvas after 3 s. Run: PB_PORT=4251 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/titleshot.js' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready && b.IC.props); i++) await sleep(100);
await sleep(3000);
const T = b.TB, ph = T.phone, d0 = ph.userData.drawn, p0 = ph.position.clone(); await sleep(700);
log('phone screen', ph.userData.drawn, d0, '| moved', ph.position.distanceTo(p0).toFixed(5), '| light', T.phoneL.intensity.toFixed(3));
const c = w.document.createElement('canvas'); c.width = 800; c.height = Math.round(800 * T.el.height / T.el.width); c.getContext('2d').drawImage(T.el, 0, 0, c.width, c.height);
const d = c.toDataURL('image/jpeg', 0.9).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'title', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
