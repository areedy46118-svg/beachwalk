/* HIS HAND OUT FOR A PICKUP (2026-11-21, the owner: "use this same animation but sped up when you pick up any item the left hand
 * should come out real fast and grab it with the item pickup sound"). At the sandcastle, looking at the toy shovel, E: stills
 * every 0.05 s, and when the shovel leaves the world / lands in the pack. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/handgrab.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 100; i++) { b.frame(1); await sleep(20); }
w.__clockOn();
const it = b.interactables.find((q) => /toy shovel/i.test(q.label || '')); const S = it.root.getWorldPosition(new b.THREE.Vector3());
const C = b.camera; C.position.set(S.x + 1.3, 1.7, S.z + 0.6); b.camBaseY = 1.7; b.lookAt(S.x, S.y + 0.2, S.z);
for (let i = 0; i < 20; i++) { b.lookAt(S.x, S.y + 0.2, S.z); w.__adv(1); }
log('hovered', b.state().hover || (b.hoveredS && b.hoveredS()), '| in pack before', b.inventory.some((i) => /shovel/i.test(i.name)));
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyE', key: 'e' })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
const tiles = []; let took = null;
for (let f = 0; f < 36; f++) {
  b.lookAt(S.x, S.y + 0.2, S.z); w.__adv(1);
  if (took == null && b.inventory.some((i) => /shovel/i.test(i.name))) took = (f + 1) / 60;
  if (f === 13 || f === 20) { const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 640; c.height = 360; c.getContext('2d').drawImage(src, src.width * 0.05, src.height * 0.15, src.width * 0.5, src.height * 0.5, 0, 0, 640, 360); const d2 = c.toDataURL('image/png').split(',')[1], n2 = Math.ceil(d2.length / 8000); for (let i = 0; i < n2; i++) console.log('[PBIMG]', 'grabzoom' + f, i + '/' + n2, d2.slice(i * 8000, (i + 1) * 8000)); }
  if (f % 3 === 2 && f < 36) { const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(((f + 1) / 60).toFixed(2) + 's' + (took != null ? ' taken' : ''), 4, 13); tiles.push(c); }
}
log('tint', b.scene.getObjectByName('pipeHand').material.uniforms.tint.value.toArray().map((v) => v.toFixed(3)).join(','), 'light', JSON.stringify(b.HG.light));
log('taken at', took, 's | hand visible now', b.scene.getObjectByName('pipeHand').visible);
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'grab', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
