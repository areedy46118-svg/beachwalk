/* THE PACK OPENED IN THE WELL MAN'S HOLD (2026-11-22, the owner's screenshot — nothing but fog behind the HUD — "i went to my
 * inventory fighting the well guy then after my screen did this"): the fight staged, his grab, the pack open a second and shut,
 * and the camera after — a number or not, where, looking where. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/wellpack.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 400 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera;
C.position.set(b.WELL_X + 6, 1.7, b.WELL_Z); b.camBaseY = 1.7;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const u = b.wellU(); if (u && u.model && u.mixer && i > 60) break; }
const U = b.wellU(); b.setWellPhase(2); b.wellReveal(true);
w.__clockOn(); b.setHp(4);
const cam = (tag) => log(tag, '| cam', [C.position.x, C.position.y, C.position.z].map((v) => +v.toFixed(2)).join(','), '| q', [C.quaternion.x, C.quaternion.w].map((v) => +v.toFixed(3)).join(','), '| fov', C.fov.toFixed(1), '| base', (+b.camBaseS()).toFixed(2), '| hp', b.state().hp);
for (let i = 0; i < 60 * 8; i++) { w.__adv(1); b.setHp(4); }
cam('before the grab');
b.wellGrab(U); for (let i = 0; i < 20; i++) w.__adv(1); cam('in his hold');
b.openPack(); for (let i = 0; i < 90; i++) { w.__adv(1); await sleep(2); } cam('pack open');
b.closePack(); for (let i = 0; i < 60 * 4; i++) { w.__adv(1); if (i === 30) cam('pack shut 0.5 s'); } cam('pack shut 4 s');
shot('wellpack', 480, 1.4);
