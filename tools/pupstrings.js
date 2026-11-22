/* THE HUNG PUPPETS AND THEIR STRINGS (2026-11-22, the owner: "fix this puppets strings it doesnt look like hed hang like this from
 * where the string is"): every hung one from his side and from his front, lit. Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh
 * 'evalFile&f=/tools/pupstrings.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(5); }
w.__clockOn();
const L = new T.PointLight(0xffffff, 0, 6, 1.2); b.scene.add(L); const A = new T.AmbientLight(0xffffff, 0.9); b.scene.add(A);
const U = b.cpUnitsS().filter((u) => u.cpH);
const tiles = [];
for (const u of U) {
  const S = u.cpSw; if (u.model) u.model.visible = true;
  const p = u.g.position.clone(); p.y = S ? (S.piv.y + p.y) / 2 - 0.25 : p.y + 0.8;
  for (const ang of [0, Math.PI / 2]) {
    const f = (u.cpH.yaw || 0) + ang, at = new T.Vector3(p.x + Math.sin(f) * 2.0, p.y + 0.1, p.z + Math.cos(f) * 2.0);
    C.fov = 62; C.updateProjectionMatrix(); C.position.copy(at); C.lookAt(p); C.updateMatrixWorld(true);
    L.position.copy(at).add(new T.Vector3(0, 0.8, 0)); L.intensity = 3;
    b.renderer.render(b.scene, C);
    const cv = b.renderer.domElement, c = document.createElement('canvas'); c.width = 300; c.height = 300;
    const g = c.getContext('2d'); g.drawImage(cv, (cv.width - cv.height) / 2, 0, cv.height, cv.height, 0, 0, 300, 300);
    g.fillStyle = '#ff0'; g.font = '14px monospace'; g.fillText(u.cpH.who + (ang ? ' side' : ' front'), 6, 16); tiles.push(c);
  }
}
const cols = 4, cv = document.createElement('canvas'); cv.width = 300 * cols; cv.height = 300 * Math.ceil(tiles.length / cols);
tiles.forEach((t, i) => cv.getContext('2d').drawImage(t, (i % cols) * 300, Math.floor(i / cols) * 300));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'hung', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('hung', U.map((u) => u.cpH.who).join(','));
