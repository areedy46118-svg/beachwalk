/* OUT OF THE CELLAR BEFORE HIM (2026-11-25, the owner: "the swing didnt spawn fix this it should always be there", "when running out
 * before the marionette he should still just be on the swing"): the washer kicking (celWash 1), up the steps — is he on his swing in
 * front of the house, and is the swing drawn?  PB_PORT=4241 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/marswing.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true;
const C = b.camera;
C.position.set(10, 1.7, -690); b.camBaseY = 1.7;
for (let i = 0; i < 200; i++) { b.frame(1); await sleep(20); }
try { b.placeInCellar(); } catch (e) { log('(cellar not built in this probe: straight up out of it)'); }
b.setCelWash(1);
log('in the cellar: inCel', b.celS().inCel, 'MAR', b.MAR.st);
b.placeOutOfCellar(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
log('out: MAR', b.MAR.st, 'celWash', JSON.stringify(b.celWashS()));
// walk round to the front of the house: he is made on the swing once the land is in
C.position.set(22, 2.0, b.elvSwingS().g.getWorldPosition(new b.THREE.Vector3()).z + 4); b.camBaseY = C.position.y;
for (let i = 0; i < 400 && !(b.MAR.u && b.MAR.u.model); i++) { b.frame(1); await sleep(25); }
const S = b.elvSwingS(); let vis = true; for (let o = S.g; o; o = o.parent) if (!o.visible) vis = false;
const sp = S.seat.getWorldPosition(new b.THREE.Vector3()), mp = b.MAR.u && b.MAR.u.g.position;
log('swing drawn', vis, '| rider', !!S.rider, '| marionette', b.MAR.u ? 'made, ' + (mp.distanceTo(sp)).toFixed(2) + ' m from the seat' : 'NOT made');
log('DONE');
