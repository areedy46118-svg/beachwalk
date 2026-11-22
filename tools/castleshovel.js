/* THE SHOVEL IN THE SANDCASTLE, AS YOU COME UP TO IT (2026-11-21, the owner: "FIX THE LIGHTING ON THE SAND CASTLE THE ITEM GLOW IS
 * ODD HERE ON THE TIP OF THE CASTLE"): stills from 3.5 m and 2 m at the owner's angle (a little above, from the beach side),
 * through the real frame at two beats of the glint's pulse. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/castleshovel.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); w.__adv(60);
const it = b.interactables.find((i) => /(sand|toy) shovel/i.test(i.label || '')); if (!it) { log('no shovel'); } else {
  const S = it.root.getWorldPosition(new b.THREE.Vector3()), C = b.camera, tiles = [];
  for (const [d, a] of [[3.6, 0.35], [2.1, 0.2], [3.0, -0.6]]) {
    C.position.set(S.x + Math.sin(a) * d, 1.7, S.z + Math.cos(a) * d); b.camBaseY = 1.7; b.lookAt(S.x, 0.75, S.z);
    for (const n of [10, 25]) { w.__adv(n); b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); tiles.push(c); }
  }
  const cols = 2, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
  const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
  const dd = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(dd.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'castle', i + '/' + n, dd.slice(i * 8000, (i + 1) * 8000));
}
