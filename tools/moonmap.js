/* THE MOON'S REAL FACE (2026-11-23): on the beach looking at the moon; the frame cropped round it, with the map (`uMoonMapK` 1) and as
 * it was (0), side by side, and the whole view. PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/moonmap.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 100 && !b.skyUniforms.uMoonMap.value; i++) { b.frame(1); await sleep(50); }
log('map in', !!b.skyUniforms.uMoonMap.value, 'k', b.skyUniforms.uMoonMapK.value);
w.__clockOn();
const C = b.camera, M = b.skyUniforms.uMoonDir.value; C.position.set(4, 1.7, -60); b.camBaseY = 1.7;
b.lookAt(C.position.x + M.x * 100, C.position.y + M.y * 100, C.position.z + M.z * 100); w.__adv(3);
const out = w.document.createElement('canvas'); out.width = 1000; out.height = 300; const g = out.getContext('2d');
const crop = (k, ox) => { b.skyUniforms.uMoonMapK.value = k; b.lookAt(C.position.x + M.x * 100, C.position.y + M.y * 100, C.position.z + M.z * 100); w.__adv(1);
  const src = b.renderer.domElement, ndc = b.skyUniforms.uMoonNdc.value, r = b.skyUniforms.uMoonR.value;
  const cx = (ndc.x * 0.5 + 0.5) * src.width, cy = (1 - (ndc.y * 0.5 + 0.5)) * src.height, half = r * src.height * 0.5 * 1.6;
  g.imageSmoothingEnabled = false; g.drawImage(src, cx - half, cy - half, half * 2, half * 2, ox, 0, 300, 300); return [cx, cy, half]; };
log('moon on screen', JSON.stringify(crop(1, 0)));
crop(0, 320);
b.skyUniforms.uMoonMapK.value = 1; w.__adv(1);
const src = b.renderer.domElement; g.drawImage(src, 640, 0, 360, Math.round(360 * src.height / src.width));
const d = out.toDataURL('image/jpeg', 0.9).split(',')[1], N = Math.ceil(d.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] moonmap ${i}/${N} ${d.slice(i * 8000, (i + 1) * 8000)}`);
