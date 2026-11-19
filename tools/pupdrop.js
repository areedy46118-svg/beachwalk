/* THE PUPPET PUT DOWN (2026-11-19, "make the puppet able to be dropped"): his puppet loaded, picked up, G (as `elvDropPuppet`),
 * then E on him again. Run: PB_PORT=4253 sh tools/probe.sh 'evalFile&f=/tools/pupdrop.js' <out> */
b.settings.devMode = true;
b.loadElvPuppet();
for (let i = 0; i < 300 && !(b.pupDropS().pup && b.pupDropS().carry); i++) { b.frame(1); await sleep(60); }
log('loaded', JSON.stringify(b.pupDropS()));
b.elvPickUp(); b.frame(2);
log('picked up', JSON.stringify(b.pupDropS()));
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyG', key: 'g' })); for (let i = 0; i < 6; i++) b.frame(1);
const e = b.interactables.find((x) => (typeof x.label === 'function' ? x.label() : x.label) === 'Pick him up');
log('after G', JSON.stringify(b.pupDropS()), '| pick-up entry', !!e, e ? e.root.position.toArray().map((v) => +v.toFixed(2)).join(',') : '', '| cam', b.camera.position.toArray().map((v) => +v.toFixed(2)).join(','));
if (e) { e.onActivate(); b.frame(2); }
log('after E', JSON.stringify(b.pupDropS()));
