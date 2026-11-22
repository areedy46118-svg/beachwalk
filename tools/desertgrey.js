/* THE DESERT GREY ALL THE TIME (2026-11-21, the owner: "it should always be black and white at the desert too"). The dev
 * teleport (the king not yet come): the canvas's filter on arrival, on the walk before his trigger, while he comes and in
 * his fight; then out by the menu's beach jump, where it must be gone. Run:
 * PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/desertgrey.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const cv = b.renderer.domElement, F = () => cv.style.filter || '(none)';
log('beach before:', F());
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 30; i++) b.frame(1);
log('desert, arrived (king', b.kingS().mode + '):', F());
const X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
b.camera.position.set(X - 12, Y + b.tmpFloorAt(-12, 0) + 1.7, Z);
for (let i = 0; i < 900 && b.kingS().mode !== 'descend'; i++) { b.frame(1); if (i % 20 === 0) await sleep(0); }
for (let i = 0; i < 60; i++) b.frame(1);
log('desert, he comes (' + b.kingS().mode + '):', F());
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
for (let i = 0; i < 400; i++) { b.frame(1); if (i % 20 === 0) await sleep(0); }
log('desert, fight (' + b.kingS().mode + ', KA k ' + b.KA.k.toFixed(2) + '):', F());
if (b.devLeaveRooms) { b.devLeaveRooms(); for (let i = 0; i < 30; i++) b.frame(1); log('left (room', b.devRoom(), '):', F()); }
