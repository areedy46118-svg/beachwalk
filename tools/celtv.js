/* THE TAPE ON THE CELLAR HOUSE'S TV (2026-11-22, `celTape`): up the cellar's stairs to the living room, the set turned on, and
 * the screen shot through its own tube at moments of each clip.  PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/celtv.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(); if (s.out && s.ready && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 400 && !(b.cpS && b.cpS().ready); i++) { b.frame(1); await sleep(20); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z, F = Y + 3.06, E = F + 1.6;
const V = b.celTvS(); log('tv', !!V, V ? [V.x, V.y, V.z].map((v) => v.toFixed(2)).join(',') : '');
C.position.set(X + V.x, E, Z + V.z - 2.2); b.camBaseY = E; w.__adv(10);
const look = () => { C.position.set(X + V.x, E - 0.55, Z + V.z - 1.15); b.camBaseY = E; C.lookAt(X + V.x, Y + V.y, Z + V.z); C.updateMatrixWorld(true); };
look(); b.renderer.render(b.scene, C); shot('tv-off', 560, 1.2);
b.celTvToggle(); for (let i = 0; i < 300 && !(b.celTapeS() && b.celTapeS().man); i++) { w.__adv(1); await sleep(10); }
const TP = b.celTapeS(); TP.t = 0; log('tape', !!TP, 'man', !!TP.man, 'pups', TP.pups.length, 'acts', Object.keys(TP.pups[0].acts).join(','));
const rtShot = (name) => { const R = b.renderer, W = 320, H = 240, px = new Uint8Array(W * H * 4); R.readRenderTargetPixels(TP.rt, 0, 0, W, H, px);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4; im.data[o] = px[i]; im.data[o + 1] = px[i + 1]; im.data[o + 2] = px[i + 2]; im.data[o + 3] = 255; }
  g.putImageData(im, 0, 0); const d = c.toDataURL('image/jpeg', 0.9).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); };
let t = 0;
for (const at of [1.5, 2.8, 4.6, 7.0, 9.2, 11.5, 13.8, 16.2, 18.4, 21.0, 23.6, 25.5]) {
  while (TP.t < at) { look(); w.__adv(1); }
  look(); b.renderer.render(b.scene, C); rtShot('rt-' + String(at).replace('.', '_'));
}
