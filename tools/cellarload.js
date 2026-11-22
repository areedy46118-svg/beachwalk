/* A CHECKPOINT IN THE CELLAR (2026-11-21): in through the doors behind Elvédor's house (the cut autosaves), then the page
 * reloaded as a checkpoint load is, and where it puts you — in the cellar, on its floor, the puppet on the bench.
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/cellarload.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 900; i++) { b.frame(1); await sleep(15); const s = b.celS(); if (s.out && s.ready && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
const sv = JSON.parse(w.localStorage.getItem('beachwalk.save') || 'null');
log('saved: room', sv && sv.room, '| pos', sv && sv.pos && sv.pos.map((v) => v.toFixed(2)).join(','));
// the reload a checkpoint load makes
w.sessionStorage.setItem('beachwalk.load', 'checkpoint');
const f = document.getElementById('g'); f.contentWindow.location.reload();
await sleep(1500);
let w2 = null; for (let i = 0; i < 600; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.celS) break; } catch (e) {} }
const b2 = w2.__bw; try { await b2.audioCtx.suspend(); } catch (e) {}
let ok = false;
for (let i = 0; i < 600; i++) { await sleep(50); const s = b2.celS(); if (s.inCel && !b2.state().restoring) { ok = true; if (i > 40) break; } }
const s = b2.celS(), P = b2.camera.position;
log('after the load: inCel', s.inCel, '| at', (P.x - b2.CEL_X).toFixed(2), (P.y - b2.CEL_Y).toFixed(2), (P.z - b2.CEL_Z).toFixed(2), '| walls', s.walls, '| pup', s.pup);
for (let i = 0; i < 90; i++) { b2.frame(1); await sleep(15); }
log('3 s later: at', (P.x - b2.CEL_X).toFixed(2), (P.y - b2.CEL_Y).toFixed(2), (P.z - b2.CEL_Z).toFixed(2), '| inCel', b2.celS().inCel);
const errs = []; // (the page's own console is in chrome.err)
b2.renderer.render(b2.scene, b2.camera);
{ const src = b2.renderer.domElement, c = document.createElement('canvas'); c.width = 560; c.height = Math.round(560 * src.height / src.width); const g2 = c.getContext('2d'); g2.filter = 'brightness(1.4)'; g2.drawImage(src, 0, 0, c.width, c.height);
  const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'loaded', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); }
