/* PAUSED IN THE WAVES (2026-11-21, the owner: "I JUST TRIED TO PAUSE DURING THE WAVE SCENE AND DIDNT SEE THE SETTINGS IT JUST
 * FROZE"): START, the call skipped with Enter, the intro's waves on; then Escape — what is on top at the screen's middle and
 * corners (`elementFromPoint`), the menu's and the intro's z-index and opacity; then Escape again and the waves going on.
 * Run: PB_PORT=4266 PB_WAIT=200 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/intromenu.js' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const D = w.document, st = D.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
st.click();
for (let i = 0; i < 100 && !(b.icNow() > 3); i++) await sleep(100);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
const vid = D.getElementById('intro-video');
for (let i = 0; i < 200 && !vid.classList.contains('on'); i++) await sleep(100);
await sleep(1500);
log('waves on', vid.classList.contains('on'), 'video time', vid.currentTime.toFixed(2));
const key = (k) => { w.dispatchEvent(new w.KeyboardEvent('keydown', { code: k, key: k })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: k, key: k })); };
key('Escape'); await sleep(600);
const M = D.getElementById('menu'), I = D.getElementById('intro'), cs = (e) => w.getComputedStyle(e);
const top = (x, y) => { let e = D.elementFromPoint(x, y); const path = []; while (e && path.length < 4) { path.push((e.id ? '#' + e.id : e.tagName.toLowerCase())); e = e.parentElement; } return path.join('<'); };
const W = w.innerWidth, H = w.innerHeight;
log('menu shown', M.classList.contains('show'), 'z', cs(M).zIndex, 'opacity', cs(M).opacity, '| intro z', cs(I).zIndex, 'opacity', cs(I).opacity);
log('on top: middle', top(W / 2, H / 2), '| corner', top(20, 20), '| low', top(W / 2, H * 0.85));
const t0 = vid.currentTime; await sleep(800); log('paused: video time', t0.toFixed(2), '→', vid.currentTime.toFixed(2));
key('Escape'); await sleep(900);
log('closed: menu shown', M.classList.contains('show'), '| video time', vid.currentTime.toFixed(2), 'playing', !vid.paused);
