/* CANDIDATE SPOTS FOR THE TAVERN'S WINDOW ON THE KEEP'S OUTSIDE (2026-11-26): stills from the real keep, the eye 1.7 m over a floor at
 * each `&at=x,y,z;…` (keep-local), looking along `&dir=` (+X) and a little down. */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(20); }
const Q = new URLSearchParams(location.search), C = b.camera, KX = -6000, KY = 800, KZ = 6000;
const AT = (Q.get('at') || '2,16.1,-3;2,21,0;2,21,3;-9,16.1,-3').split(';').map((s) => s.split(',').map(Number)), dir = (Q.get('dir') || '1,0').split(',').map(Number);
window.requestAnimationFrame = () => 0;
let i = 0; for (const [x, y, z] of AT) {
  const sx = Math.sign(x - -3) || 1;
  for (const [tag, dy] of [['out', -0.25], ['down', -1.1]]) {
    C.position.set(KX + x, KY + y + 1.7, KZ + z); const dx = (Q.get('dir') ? dir[0] : sx), dz = (Q.get('dir') ? dir[1] : 0);
    C.lookAt(C.position.x + dx, C.position.y + dy, C.position.z + dz); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C); shot('w' + i + '_' + tag, 480, 1.5); }
  i++; }
log('DONE');
