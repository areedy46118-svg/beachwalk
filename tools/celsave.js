/* THE CELLAR'S CHECKPOINTS (2026-11-22, the owner: "make a checkpoint leaving or entering the cellar"): in through the doors and
 * out again — is a checkpoint written each way, where, and is it said? Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh
 * 'evalFile&f=/tools/celsave.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
const save = () => { try { const d = JSON.parse(localStorage.getItem('beachwalk.save')); return d ? { at: d.at, room: d.room, spot: d.spot, pos: d.pos.map((v) => +v.toFixed(1)) } : null; } catch (e) { return 'unreadable'; } };
const toast = () => { const el = document.querySelector('#saved, #checkpoint, .cp-toast, #cpnote'); return el ? (el.className + ' ' + (el.textContent || '').trim()).slice(0, 60) : 'no toast element'; };
log('before', JSON.stringify(save()));
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
log('in', JSON.stringify(save()), '|', toast());
b.startCellar(-1);
for (let i = 0; i < 400 && (b.celS().celBusy || b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
log('out', JSON.stringify(save()), '|', toast());
