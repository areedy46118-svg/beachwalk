/* THE CAPTAIN'S KEY JUST DROPS (2026-11-21, the owner: "have the shipwreck key just drop off the hook no rope make the cutscene
 * shorter too"). Her puzzle done (`dropShipKey`): how long the cut holds, when the key lands, whether a line is ever drawn, and
 * stills off the cut's own lens as it falls and once it is down. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/shipkeydrop.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, S = b.shipwreck, V = b.THREE.Vector3;
C.position.set(b.SHIP_X + 12, 1.7, b.SHIP_Z); b.camBaseY = 1.7;
for (let i = 0; i < 400 && !(S.userData.wheel && b.shipBrkS().length > 20); i++) { b.frame(1); await sleep(40); }
w.__clockOn(); S.updateMatrixWorld(true);
C.position.copy(S.localToWorld(new V(4.6, 5.85, 0))); b.camBaseY = C.position.y;
for (let i = 0; i < 10; i++) w.__adv(1);
const y0 = b.boatKey.getWorldPosition(new V()).y;
b.dropShipKey();
let landed = -1, cutEnd = -1, line = false; const tiles = [];
for (let f = 1; f <= 60 * 6; f++) {
  w.__adv(1);
  const K = b.shipKeyS();
  if (b.keyLineS && b.keyLineS() && b.keyLineS().visible) line = true;
  if (landed < 0 && K.keyFall > 0 && Math.abs(b.boatKey.rotation.x + Math.PI / 2) < 1e-3) landed = f / 60;
  if (cutEnd < 0 && !K.cut) { cutEnd = f / 60; }
  if ((f === 12 || f === 30 || (landed > 0 && f === Math.round(landed * 60) + 20)) && K.cam && K.cut) {
    b.renderer.render(b.scene, K.cam); const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 420; c.height = Math.round(420 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); tiles.push(c);
  }
  if (cutEnd > 0 && f > cutEnd * 60 + 10) break;
}
log('fell from y', y0.toFixed(2), 'to', b.boatKey.getWorldPosition(new V()).y.toFixed(2), '| landed at', landed.toFixed(2), 's | the cut over at', cutEnd.toFixed(2), 's | a line drawn', line, '| takeable', b.interactables.some((q) => /Captain/.test(q.label || '')));
if (tiles.length) { const cv = document.createElement('canvas'); cv.width = 420 * tiles.length; cv.height = tiles[0].height; tiles.forEach((t, i) => cv.getContext('2d').drawImage(t, i * 420, 0)); const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'key', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); }
