/* THE SKETCHBOOK BY THE REAL ROAD (2026-11-23, the owner: "the textbook scenes after the seamonster just froze the game").
 * The hook at the fishing spot, the drag, the fight (the pliosaur killed), the drowning, the black, the room, the book,
 * a figure drawn, E, a name, the wash. Every phase change logged with the frame errors; stills of the room and the book.
 * PB_PORT=4227 PB_WAIT=480 sh tools/probe.sh 'evalFile&f=/tools/sketchreal.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
const D0 = w.document;
const roomShot = (nm) => { const TB = b.TBS(); if (!TB.el) { log('no room canvas'); return; } b.tbRenderS(); const c = D0.createElement('canvas'); c.width = 800; c.height = Math.round(800 * TB.el.height / TB.el.width); c.getContext('2d').drawImage(TB.el, 0, 0, c.width, c.height); const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', nm, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
const errs = []; const oe = w.console.error.bind(w.console);
w.console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); oe(...a); };
w.addEventListener('error', (e) => errs.push('onerror ' + e.message));
w.eval(await (await fetch('/tools/deepshot.js?' + Date.now())).text());
w.__dpBoot();
log('hook', w.__dpHook());
const D = () => b.deepS(), P = () => b.plioS();
let last = '';
const watch = (tag) => { const s = D().ph + '/' + b.skS().ph; if (s !== last) { last = s; log(tag, 'deep', D().ph, (D().t || 0).toFixed(1), 'sk', b.skS().ph, 'errs', errs.length); } };
for (let n = 0; n < 9000; n++) {
  w.__adv(1); watch('run');
  if (D().ph === 'fight' && P().alive && n % 30 === 0) { try { b.plioHurt(99); } catch (e) { log('plioHurt', e.message); } }
  if (D().ph === 'sketch') break;
  if (n % 200 === 0) await sleep(1);
}
log('at', D().ph, 'sk', JSON.stringify(b.skS()));
// the room: wait for it in real time (its fetch), the deep's clock run by hand
let shotW = false;
for (let n = 0; n < 2000 && b.skS().ph !== 'draw'; n++) { w.__adv(1); watch('room'); if (n % 20 === 0) await sleep(10); if (!shotW && b.skS().ph === 'wake' && b.SK.t > 6) { shotW = true; b.tbLoopS(); roomShot('skr-wake'); } }
b.tbLoopS(); roomShot('skr-desk-arrive');
log('room', 'ready', b.TBS().ready, 'sk', b.skS().ph, 'blackout', w.document.getElementById('blackout').style.opacity, 'errs', errs.length);
const S = b.SK, ev = (type, x, y) => { const p = b.skBookToScreenS(x, y); S.el.dispatchEvent(new w.PointerEvent(type, { clientX: p[0], clientY: p[1], button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, bubbles: true })); };
const line = (pts) => { ev('pointerdown', ...pts[0]); for (let k = 1; k < pts.length; k++) { const [a, c] = pts[k - 1], [x, y] = pts[k]; for (let s = 1; s <= 6; s++) ev('pointermove', a + (x - a) * s / 6, c + (y - c) * s / 6); } ev('pointerup', ...pts[pts.length - 1]); };
b.tbLoopS();
log('book', JSON.stringify(b.skBookToScreenS(256, 192)), 'maps back', JSON.stringify(b.skToBookS(...b.skBookToScreenS(100, 300)).map(Math.round)), 'tidy', JSON.stringify(S.tidy));
// a head and a body, and an L on the left of the page (which side it lands on, measured)
const circ = []; for (let k = 0; k <= 24; k++) circ.push([256 + 30 * Math.cos(k / 24 * Math.PI * 2), 120 + 30 * Math.sin(k / 24 * Math.PI * 2)]);
line(circ); line([[256, 150], [256, 270]]); line([[200, 195], [312, 205]]); line([[256, 270], [220, 350]]); line([[256, 270], [292, 350]]);
line([[40, 80], [40, 200], [100, 200]]);
w.__adv(5); b.tbLoopS(); roomShot('skr-desk-draw');
log('ink', Math.round(b.skS().len), 'confirm', S.conf.className);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
await sleep(200); w.__adv(3);
S.input.value = 'Gerald'; S.el.dispatchEvent(new w.PointerEvent('pointermove', { clientX: 400, clientY: 300, pointerId: 1, bubbles: true })); w.__adv(3); await sleep(800);
{ const R = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };
  log('naming', 'header', JSON.stringify(R(S.el.querySelector('.ask2'))), 'box', JSON.stringify(R(S.input)), 'book top y', Math.round(Math.min(b.skBookToScreenS(0, 0)[1], b.skBookToScreenS(512, 0)[1])),
    'hint', S.conf.textContent, S.conf.className, 'pen', w.getComputedStyle(S.pen).opacity, 'focused', w.document.activeElement === S.input); }
S.input.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
{ const sv = JSON.parse(w.localStorage.getItem('beachwalk.save') || 'null'); log('checkpoint at the room', sv && JSON.stringify({ pos: sv.pos, room: sv.room, skAt: sv.flags && sv.flags.skAt, deepDone: sv.flags && sv.flags.deepDone, pack: sv.pack })); }
for (let n = 0; n < 200; n++) { w.__adv(1); if (b.skS().ph === 'drowse' && b.SK.t > 3.5) { b.tbLoopS(); roomShot('skr-slump'); break; } }
let roomGone = null;
for (let n = 0; n < 3000; n++) { w.__adv(1); watch('after'); if (roomGone === null && D().ph === 'wash') { const h = w.document.getElementById('sk-room'); roomGone = !h || h.className === '' || w.getComputedStyle(h).display === 'none'; log('wash begins: room layer gone', roomGone, 'blackout', w.document.getElementById('blackout').style.opacity); } if (D().ph === 'wash' && D().t > 3) break; if (n % 100 === 0) await sleep(1); }
log('end', 'deep', D().ph, 'sk', JSON.stringify(b.skS()), 'state', JSON.stringify(b.state()).slice(0, 300));
log('errors', errs.length, JSON.stringify(errs.slice(0, 6)));
