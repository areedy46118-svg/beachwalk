/* THE SKETCHBOOK'S CHECKPOINT AND ITS MENU (2026-11-23, the owner: "i couldnt even esc and reload checkpoint which i always
 * should. there should also be a checkpoint at the start of this cutscene"). Drowned (the quick road), the room comes up and
 * writes its checkpoint; Escape opens the menu over the scene and holds it, Escape again shuts it. Then the game is loaded
 * again from that checkpoint, as the menu's button does: it must come back INTO the room, the book on the desk, and go on to
 * the wash, whose own save then writes over it.
 * PB_PORT=4227 PB_WAIT=420 sh tools/probe.sh 'evalFile&f=/tools/sketchload.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
const esc = (W) => W.dispatchEvent(new W.KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
try { b.placeInDeep(); b.setDeepLockS(true); } catch (e) { log('placeInDeep threw', e.message); }
await sleep(800);
b.startDrown();
for (let i = 0; i < 400 && b.skS().ph !== 'wake'; i++) await sleep(100);
const sv = JSON.parse(w.localStorage.getItem('beachwalk.save') || 'null');
log('room up', b.skS().ph, 'save', sv && JSON.stringify({ pos: sv.pos, skAt: sv.flags.skAt, deepDone: sv.flags.deepDone, room: sv.room }));
for (let i = 0; i < 200 && b.skS().ph !== 'draw'; i++) await sleep(100);
const t0 = b.SK.t;
esc(w); await sleep(1200);
log('escape', 'menu', b.state().menuOpen, 'scene held', Math.abs(b.SK.t - t0) < 0.05, 'sk', b.skS().ph, 'menu shown', w.document.getElementById('menu').classList.contains('show'));
esc(w); await sleep(400);
log('escape again', 'menu', b.state().menuOpen, 'sk', b.skS().ph, 'lock asked', !!w.document.pointerLockElement);
// load the checkpoint, as the menu's button does (a reload asked for by the game)
sessionStorage.setItem('beachwalk.load', 'checkpoint');
const f = document.getElementById('g'); f.src = '/index.html?' + Date.now();
await sleep(1500);
let W2 = null; for (let i = 0; i < 600; i++) { await sleep(100); try { W2 = f.contentWindow; if (W2.__bw && W2.__bw.skS) break; } catch (e) {} }
const b2 = W2.__bw;
for (let i = 0; i < 200 && !b2.state().started; i++) { try { b2.beginGame(); } catch (e) {} await sleep(250); }
try { await b2.audioCtx.suspend(); } catch (e) {}
let seen = '';
for (let i = 0; i < 600; i++) { await sleep(100); const s = b2.skS().ph + '/' + (b2.deepS().ph || '-'); if (s !== seen) { seen = s; log('loaded', (i / 10).toFixed(1), 'sk', b2.skS().ph, 'deep', b2.deepS().ph, 'room', !!b2.TBS().ready, 'book', !!b2.TBS().skBook); } if (b2.skS().ph === 'draw') break; }
// draw, name, and on to the wash
const S = b2.SK, ev = (type, x, y) => { const p = b2.skBookToScreenS(x, y); S.el.dispatchEvent(new W2.PointerEvent(type, { clientX: p[0], clientY: p[1], button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, bubbles: true })); };
const line = (pts) => { ev('pointerdown', ...pts[0]); for (let k = 1; k < pts.length; k++) { const [a, c] = pts[k - 1], [x, y] = pts[k]; for (let s = 1; s <= 6; s++) ev('pointermove', a + (x - a) * s / 6, c + (y - c) * s / 6); } ev('pointerup', ...pts[pts.length - 1]); };
line([[256, 100], [256, 300]]); line([[180, 200], [330, 200]]);
await sleep(300);
log('ink', Math.round(b2.skS().len), 'confirm', S.conf.className);
W2.dispatchEvent(new W2.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
await sleep(300);
S.input.value = 'Pat';
S.input.dispatchEvent(new W2.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
for (let i = 0; i < 300; i++) { await sleep(100); if (!b2.deepS().ph) break; }
const sv2 = JSON.parse(W2.localStorage.getItem('beachwalk.save') || 'null');
log('after', 'deep', b2.deepS().ph, 'sk', JSON.stringify(b2.skS()), 'save', sv2 && JSON.stringify({ skAt: sv2.flags.skAt, deepDone: sv2.flags.deepDone, skDone: sv2.flags.skDone, skName: sv2.flags.skName }), 'needle', !!b2.needleS());
