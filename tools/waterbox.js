/* THE WATER IN THE FIJI BOTTLE, TURNED (2026-11-21, the owner: "the water is sloshing out of the bottle and when i turn it around
 * it gets less water"). A bottle on its own in a lit room of its own, turned about its long side 0..180 deg and held there till
 * the water settles: a still each, and how much of the water's volume lies under its surface (the same share every time).
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/waterbox.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const it = b.packByName('Bottle of water'); b.addToInventory(it);
for (let i = 0; i < 200 && !(it.inspectModel && it.inspectModel.userData.filled); i++) { b.frame(1); await sleep(50); }
w.requestAnimationFrame = () => 0;
const T = b.THREE, sc = new T.Scene(); sc.background = new T.Color(0x1a2230);
sc.add(new T.AmbientLight(0xffffff, 1.2)); const dl = new T.DirectionalLight(0xffffff, 2); dl.position.set(1, 2, 3); sc.add(dl);
const bot = it.inspectModel.clone(true); sc.add(bot);
const wat = bot.getObjectByName('water'); wat.userData.fill = 0.94; wat.visible = true;
const cam = new T.PerspectiveCamera(30, 1, 0.01, 10); cam.position.set(0, 0.1, 0.62); cam.lookAt(0, 0.1, 0);
const R = b.renderer, tiles = [];
const sz = R.getSize(new T.Vector2());
for (const deg of [0, 45, 90, 135, 180, 270]) {
  bot.position.set(0, 0.1, 0); bot.rotation.set(0, 0, T.MathUtils.degToRad(deg)); bot.updateMatrix();
  bot.translateY(-0.1);
  for (let i = 0; i < 150; i++) { R.render(sc, cam); await sleep(4); }
  const pl = b.waterPlaneOf(wat.material);
  // the share of the water's skin volume under the plane, counted on a fine grid of its own
  const g = wat.geometry; g.computeBoundingBox(); const bb = g.boundingBox, rc = new T.Raycaster(), N = 26; let tot = 0, und = 0;
  const m2 = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide }));
  for (let ix = 0; ix < N; ix++) for (let iy = 0; iy < N * 2; iy++) for (let iz = 0; iz < N; iz++) {
    const p = new T.Vector3(bb.min.x + (ix + 0.5) / N * (bb.max.x - bb.min.x), bb.min.y + (iy + 0.5) / (2 * N) * (bb.max.y - bb.min.y), bb.min.z + (iz + 0.5) / N * (bb.max.z - bb.min.z));
    rc.set(p, new T.Vector3(1, 0.0137, 0.0071).normalize()); if (rc.intersectObject(m2).length % 2 === 0) continue;
    tot++; if (p.x * pl.x + p.y * pl.y + p.z * pl.z <= pl.w) und++;
  }
  log('turned', deg, 'plane', pl.toArray().map((v) => v.toFixed(3)).join(','), '| under', (und / tot).toFixed(3));
  R.setRenderTarget(null); R.setSize(400, 400, false); R.render(sc, cam);
  const c = document.createElement('canvas'); c.width = 200; c.height = 200; c.getContext('2d').drawImage(R.domElement, 0, 0, 200, 200); tiles.push(c);
}
const cv = document.createElement('canvas'); cv.width = 200 * tiles.length; cv.height = 200; tiles.forEach((c, i) => cv.getContext('2d').drawImage(c, i * 200, 0));
const d = cv.toDataURL('image/png').split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'water', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
