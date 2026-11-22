/* SKRIM'S HOOK INTO THE SAND WALL (2026-11-21, the owner: "the hook throw went through the sandwall it should connect with
 * everything"). On the beach `&d=` m off the foot of the cliff, facing it, `&up=` up; a full throw at it. Logs what it was
 * thrown at, how far, and the furthest the iron got from you. Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/hookcliff.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), D = +(Q.get('d') || 5), UP = +(Q.get('up') || 0.15);
b.settings.devMode = true;
for (let i = 0; i < 400 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const X0 = b.CLIFF_BLOCK_X - D; C.position.x = X0; adv(2);
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
const look = () => b.lookAt(C.position.x + 10, C.position.y + UP * 10, C.position.z);
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 50; i++) { C.position.x = X0; look(); adv(1); } b.releaseWind(); key('ShiftLeft', false);
log('thrown at', b.HK.to ? b.HK.to.kind + ' ' + (b.HK.to.surface || '') + ' t ' + b.HK.to.t.toFixed(2) : 'nothing', '| cliff x', b.CLIFF_BLOCK_X, 'you x', C.position.x.toFixed(2));
let far = 0, maxX = -1e9;
for (let f = 0; f < 120 && !(b.HK.st === 'idle' && f > 10); f++) { C.position.x = X0; look(); adv(1); far = Math.max(far, C.position.distanceTo(b.HK.p)); maxX = Math.max(maxX, b.HK.p.x); }
log('furthest the iron got', far.toFixed(2), 'm, its furthest x', maxX.toFixed(2), '(past the cliff foot by', (maxX - b.CLIFF_BLOCK_X).toFixed(2), 'm)');
