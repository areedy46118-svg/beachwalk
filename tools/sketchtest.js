/* THE SKETCHBOOK, END TO END (2026-11-23). The real path: put in the deep, drowned (`startDrown`), the black, the bedroom
 * (`skStart` from the deep's 'sketch' phase), a stick figure drawn with pointer events, E, a name typed and Enter, the slam,
 * the wash. Then the island's pier: the figure where the owner's screenshot stood, its prompt, a blow, the fade, the
 * achievement. Stills: the room coming to, the page drawn on, the pier, close up.
 * PB_PORT=4227 PB_WAIT=420 sh tools/probe.sh 'evalFile&f=/tools/sketchtest.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
b.settings.devMode = true;
const D = w.document;
// a still of the room: render it and copy it out in the same task (its canvas keeps nothing after)
const roomShot = (nm) => { const TB = b.TBS(); if (!TB.el) { log('no room canvas'); return; } b.tbRenderS(); const c = D.createElement('canvas'); c.width = 640; c.height = Math.round(640 * TB.el.height / TB.el.width); c.getContext('2d').drawImage(TB.el, 0, 0, c.width, c.height); const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', nm, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
// the page as drawn: the photograph and the ink canvas over it (its own pixels, no zoom)
const pageShot = async (nm) => { const S = b.SK, c = D.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d'); g.drawImage(S.cv, 0, 0, 512, 384);   // (the page as it lies on the desk: the squared-up photo and the ink, `skDeskBuild`)
  const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', nm, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
try { b.placeInDeep(); b.setDeepLockS(true); } catch (e) { log('placeInDeep threw', e.message); }   // (the hook sets the lock on the way in; without it the deep's update stops at the black)
await sleep(800);
b.startDrown();
let seen = '';
for (let i = 0; i < 400; i++) { await sleep(100); const s = b.skS(); if (s.ph !== seen) { seen = s.ph; log('t', (i / 10).toFixed(1), 'deep', b.deepS().ph, 'sk', s.ph); } if (s.ph === 'wake' && b.TBS().ready) break; }
log('room ready', b.TBS().ready, 'reprise', b.TBS().reprise, 'syringe fill', b.TBS().syrModel ? 'yes' : '?');
await sleep(1500); roomShot('sk-room-1');
await sleep(3000); roomShot('sk-room-2');
for (let i = 0; i < 120 && b.skS().ph !== 'draw'; i++) await sleep(100);
log('drawing', b.skS().ph, 'sk on', D.getElementById('sk').className, 'lock', !!D.pointerLockElement, 'menu', b.state().menuOpen === true);
// a stick figure, in the photograph's pixels
const S = b.SK, ev = (type, x, y) => { const [cx, cy] = b.skBookToScreenS(x, y); S.el.dispatchEvent(new w.PointerEvent(type, { clientX: cx, clientY: cy, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, bubbles: true })); };
const line = async (pts) => { ev('pointerdown', ...pts[0]); for (let k = 1; k < pts.length; k++) { const [a, c] = pts[k - 1], [x, y] = pts[k]; for (let s = 1; s <= 6; s++) ev('pointermove', a + (x - a) * s / 6, c + (y - c) * s / 6); } ev('pointerup', ...pts[pts.length - 1]); await sleep(30); };
const circ = []; for (let k = 0; k <= 24; k++) circ.push([256 + 30 * Math.cos(k / 24 * Math.PI * 2), 120 + 30 * Math.sin(k / 24 * Math.PI * 2)]);   // (page units, 512 x 384)
await line(circ); await line([[256, 150], [256, 270]]); await line([[200, 195], [312, 205]]); await line([[256, 270], [220, 350]]); await line([[256, 270], [292, 350]]);
log('ink', Math.round(b.skS().len), 'strokes', S.strokes.length, 'confirm', S.conf.className);
await pageShot('sk-page');
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
await sleep(400);
log('after E', b.skS().ph, 'name box', S.nameBox.className, 'focused', D.activeElement === S.input);
S.input.value = 'Gerald';
S.input.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
log('after Enter', JSON.stringify(b.skS()));
for (let i = 0; i < 120; i++) { await sleep(100); if (b.deepS().ph === 'wash') break; }
log('then', 'deep', b.deepS().ph, 'sk', JSON.stringify(b.skS()), 'room el', !!b.TBS().el, 'cine', D.body.classList.contains('sk-cine'));
// the island
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.loadIsle();
for (let i = 0; i < 300 && !(b.isleS().ready); i++) { b.frame(2); await sleep(100); }
w.__clockOn();
const C = b.camera, F = b.SK_FIG.mesh;
log('isle ready', b.isleS().ready, 'figure', !!F, F && F.position.toArray().map((v) => +v.toFixed(2)).join(','));
const put = (x, y, z, yaw, pitch) => { C.position.set(x, y, z); b.camBaseY = y; b.look(yaw, pitch); w.__adv(2); C.position.set(x, y, z); C.rotation.set(pitch, yaw, 0, 'YXZ'); C.updateMatrixWorld(true); };
put(-14.39, 15.65 + 1.7, -1249.33, 1.19, -0.08); shot('sk-pier', 640);
C.fov = 105; C.updateProjectionMatrix(); shot('sk-pier105', 640);
if (F) {
  const p = F.position, yaw = Math.atan2(-(p.x + 2.0 - (p.x)), 0);
  C.position.set(p.x + 1.9, p.y + 1.6, p.z + 0.6); C.lookAt(p.x, p.y + 0.9, p.z); C.updateMatrixWorld(true); w.__adv(1); C.position.set(p.x + 1.9, p.y + 1.6, p.z + 0.6); C.lookAt(p.x, p.y + 0.9, p.z); C.updateMatrixWorld(true);
  shot('sk-close', 640);
  { const it = b.interactables.find((q) => q.root === F); log('talk', it ? (typeof it.label === 'function' ? it.label() : it.label) : 'NONE', 'kind', it && it.kind, 'far', it && it.far); }
  const hit = b.skStrikeS(0.6);
  for (let i = 0; i < 12; i++) w.__adv(1); C.lookAt(p.x, p.y + 0.9, p.z); C.updateMatrixWorld(true); shot('sk-flinch', 640);
  for (let i = 0; i < 60 * 3; i++) w.__adv(1);
  log('struck', hit, 'after', JSON.stringify(b.skS()), 'ach', D.getElementById('ach').className, D.getElementById('ach').textContent.replace(/\s+/g, ' ').trim());
}
