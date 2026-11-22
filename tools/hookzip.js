/* SKRIM'S HOOK PULLS YOU IN (2026-11-21, the owner: "IF I SHOOT THE HOOK AND CONNECT WITH SOMETHING EVEN A WALL OR FLOOR WHILE MID
 * AIR FROM A JUMP IT BRINGS ME FORWARD"). On the beach `&d=` m from the sand wall: the throw wound on the ground, a jump, released
 * in the air at the wall (`&up=` how high you aim); then every frame your place, height over the sand, speed, the hook's state;
 * `&ground=1` released standing (no pull wanted). Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/hookzip.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), D = +(Q.get('d') || 12), UP = +(Q.get('up') || 0.15), GROUND = !!+(Q.get('ground') || 0), DIR = Q.get('dir') || 'wall';
b.settings.devMode = true;
for (let i = 0; i < 400 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
C.position.x = b.CLIFF_BLOCK_X - D; adv(4);
const look = () => DIR === 'floor' ? b.lookAt(C.position.x + 3, C.position.y - 2.2, C.position.z - 8) : b.lookAt(C.position.x + 10, C.position.y + UP * 10, C.position.z);
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 40; i++) { look(); adv(1); }
if (!GROUND) { key('Space', true); adv(2); key('Space', false); for (let i = 0; i < 8; i++) { look(); adv(1); } }
const x0 = C.position.x, z0 = C.position.z;
log('released: in the air', !b.state().onGround, '| y', C.position.y.toFixed(2));
b.releaseWind(); key('ShiftLeft', false);
log('charge', b.HK.charge && b.HK.charge.toFixed(2), 'thrown at', b.HK.to ? b.HK.to.kind + ' ' + (b.HK.to.surface || '') + ' t ' + b.HK.to.t.toFixed(2) : b.HK.surfEnd ? 'the sand' : 'nothing', '| airThrow', b.HK.airThrow);
let last = '', maxV = 0, px = C.position.x, pz = C.position.z;
for (let f = 0; f < 150; f++) {
  adv(1);
  const v = Math.hypot(C.position.x - px, C.position.z - pz) * 60; px = C.position.x; pz = C.position.z; maxV = Math.max(maxV, v);
  const s = b.HK.st;
  if (s !== last || f % 6 === 0) log(' f', f, 'hook', s, 'x', (C.position.x - x0).toFixed(2), 'z', (C.position.z - z0).toFixed(2), 'eye', C.position.y.toFixed(2), 'speed', v.toFixed(1), 'm/s', 'to wall', (b.CLIFF_BLOCK_X - C.position.x).toFixed(2));
  last = s;
  if (s === 'idle' && f > 40) break;
}
log('travelled', Math.hypot(C.position.x - x0, C.position.z - z0).toFixed(2), 'm, top speed', maxV.toFixed(1), 'm/s');
