/* THE HOOK'S PULL, FRAME BY FRAME (2026-11-26, the owner: "use the hook to move fast and make it seem smoother to do"). The momentum
 * its fun to move around and slide into jump kicks"). On the open beach, on the clock, by the real keys (dispatched key events):
 *   A  a running jump with every key let go at take-off: your speed through the air, and a hop again on landing;
 *   B  the slide (C while running): its speed and length, then a jump out of it (its speed through the air);
 *   C  the hook thrown in the air at the sand along the beach (`&d=`): the pull, then the carry through the landing and a hop;
 *   D  a kick in a slide: `KICK.air` and `KICK.mom`.
 *   PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/momentum.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n), C = b.camera;
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
const tap = (code) => { key(code, true); adv(1); key(code, false); };
const look = () => b.lookAt(C.position.x, C.position.y - 0.05, C.position.z - 10);
let px, pz, py; const sp = () => { const v = Math.hypot(C.position.x - px, C.position.z - pz) * 60, vv = (C.position.y - py) * 60; px = C.position.x; pz = C.position.z; py = C.position.y; return [v, vv]; };
const home = () => { C.position.set(b.CLIFF_BLOCK_X - 6, C.position.y, C.position.z); for (let i = 0; i < 60; i++) { look(); adv(1); } px = C.position.x; pz = C.position.z; py = C.position.y; };
const Q = new URLSearchParams(w.parent.location.search), RUN = !!Q.get('run');
home(); b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const lookF = () => b.lookAt(C.position.x, C.position.y - 2.0, C.position.z - 9);
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 40; i++) { lookF(); adv(1); }
if (RUN) key('KeyW', true);
tap('Space'); for (let i = 0; i < 8; i++) { lookF(); adv(1); }
b.releaseWind(); key('ShiftLeft', false); sp();
const rows = []; let st0 = '', zipped = false, endF = -1, hop = false, jerk = 0, prev = null;
for (let f = 0; f < 140; f++) {
  look(); adv(1); const [v, vv] = sp(); const s = b.HK.st;
  if (s === 'zip') zipped = true; if (zipped && s !== 'zip' && endF < 0) endF = f;
  if (prev !== null && zipped && f < (endF < 0 ? 999 : endF + 60)) jerk = Math.max(jerk, Math.abs(v - prev));
  prev = v;
  if (zipped && (endF < 0 || f < endF + 50)) rows.push((s !== st0 ? '[' + s + ']' : '') + v.toFixed(1) + '/' + vv.toFixed(1) + (b.state().onGround ? 'g' : 'a') + (b.HK.carry ? 'c' + b.HK.carry.length().toFixed(1) : ''));
  st0 = s;
  if (!hop && endF >= 0 && b.state().onGround) { hop = true; rows.push('|hop|'); key('Space', true); adv(1); key('Space', false); sp(); }
}
if (RUN) key('KeyW', false);
log('PULL horiz/vert m/s per frame:', rows.join(' '));
log('SMOOTH: biggest frame-to-frame change in ground speed', jerk.toFixed(2), 'm/s');
log('DONE');
