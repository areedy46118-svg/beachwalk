/* THE BACK OF GRAMMY ORC'S PHOTO (2026-11-19): its canvas as drawn, once the owner's font is in. Run:
 *   PB_PORT=4251 sh tools/probe.sh 'evalFile&f=/tools/grammyback.js' <out>      → <out>/grammy.jpg */
let m = null;
for (let i = 0; i < 300 && !m; i++) { await sleep(200); b.grammyModel && b.grammyModel.traverse((o) => { if (!m && o.name === 'grammyBack' && o.material && o.material.map) m = o; }); }
if (!m) { log('no grammy back found'); return; }
await sleep(1500);
log('font in', w.document.fonts.check('30px "BW Hand"'));
const c = m.material.map.image, d = c.toDataURL('image/jpeg', 0.9).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'grammy', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
