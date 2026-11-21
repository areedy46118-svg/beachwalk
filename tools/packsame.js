/* THE PACK THE SAME ON EVERY SCREEN (2026-11-21, the owner: "on smaller screens the inventory looks more zoomed in i need it to
 * look the same always"). The pack opened and settled; each part's box measured against the sheet in his hands (fractions of
 * the sheet's canvas), so two window sizes can be compared number for number — the same picture gives the same numbers.
 * Run: PB_WIN=960,540 PB_PORT=4223 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/packsame.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 40; i++) { b.frame(1); await sleep(20); }
const d = w.document; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Tab', key: 'Tab' })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'Tab', key: 'Tab' }));
if (!d.getElementById('invpanel').classList.contains('show') && b.openPack) b.openPack();
await sleep(1500);
const cv = d.querySelector('#pack-hands canvas').getBoundingClientRect();
const f = (sel) => { const e = d.querySelector(sel); if (!e) return sel + ' -'; const r = e.getBoundingClientRect(); return sel + ' ' + [(r.left - cv.left) / cv.width, (r.top - cv.top) / cv.height, r.width / cv.width, r.height / cv.height].map((v) => v.toFixed(3)).join(','); };
log('win', w.innerWidth + 'x' + w.innerHeight, 'sheet', cv.width.toFixed(0) + 'x' + cv.height.toFixed(0), 'fit', getComputedStyle(d.documentElement).getPropertyValue('--fit-pack'), 'paper', d.getElementById('invpanel').classList.contains('paper'));
for (const s of ['#invpanel .panel', '#invpanel h2', '#invpanel .islot', '#keychain-box', '#invpanel .detail', '#invpanel .detail .big', '#invpanel .rings .rslot', '#invpanel .tip', '#invpanel .detail .desc']) log(f(s));
// (the hotbar's five marked: shaded, and the only boxes numbered — 2026-11-21)
{ const sl = [...d.querySelectorAll('#inv-grid .islot')]; log('slots', sl.length, '| marked hotbar', sl.filter((s) => s.classList.contains('hb')).map((s) => s.dataset.index).join(','), '| numbered', sl.filter((s) => s.querySelector('.num')).length, '| hb background', sl[0] ? getComputedStyle(sl[0]).backgroundImage.slice(0, 40) : '-', '| plain background', sl[6] ? getComputedStyle(sl[6]).backgroundImage.slice(0, 20) : '-'); }
