/* THE KEEP FROM ITS FOUR SIDES (2026-11-26): to find the face the owner pointed at for the tavern's window. */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
log('placed at local', (b.camera.position.x + 6000).toFixed(1), (b.camera.position.y - 800).toFixed(1), (b.camera.position.z - 6000).toFixed(1));
const C = b.camera, KX = -6000, KY = 800, KZ = 6000, R = +(new URLSearchParams(location.search).get('r') || 45), H = +(new URLSearchParams(location.search).get('h') || 4);
for (const [nm, ax, az] of [['px', 1, 0], ['nx', -1, 0], ['pz', 0, 1], ['nz', 0, -1]]) {
  C.position.set(KX - 2.6 + ax * R, KY + H, KZ + az * R); b.camBaseY = C.position.y;
  b.lookAt(KX - 2.6, KY + 20, KZ); for (let i = 0; i < 4; i++) { b.lookAt(KX - 2.6, KY + 20, KZ); b.frame(1); await sleep(30); }
  shot('side_' + nm, 480, 1.5);
}
log('DONE');
