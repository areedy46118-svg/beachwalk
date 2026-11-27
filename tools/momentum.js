/* MOMENTUM, THE SLIDE, THE HOOK'S CARRY, THE SLIDE KICK (2026-11-26, the owner: "keep momentum like half life with the hooks boost so
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
const tap = (code) => { key(code, true); adv(2); key(code, false); };
const look = () => b.lookAt(C.position.x, C.position.y - 0.05, C.position.z - 10);
let px, pz; const sp = () => { const v = Math.hypot(C.position.x - px, C.position.z - pz) * 60; px = C.position.x; pz = C.position.z; return v; };
const home = () => { C.position.set(b.CLIFF_BLOCK_X - 6, C.position.y, C.position.z); for (let i = 0; i < 60; i++) { look(); adv(1); } px = C.position.x; pz = C.position.z; };
const runUp = () => { key('KeyW', true); key('ShiftLeft', true); for (let i = 0; i < 70; i++) { look(); adv(1); sp(); } };
const stand = () => { for (let k = 0; k < 3 && b.state().crouching; k++) { tap('KeyC'); adv(12); } };
const stop = () => { key('KeyW', false); key('ShiftLeft', false); for (let i = 0; i < 90; i++) adv(1); stand(); };
// A
home(); runUp(); const z0 = C.position.z; const vRun = sp();
tap('Space'); key('KeyW', false); key('ShiftLeft', false);
let row = [], landed = -1;
for (let f = 0; f < 90; f++) { look(); adv(1); const v = sp(); if (f % 6 === 0) row.push(v.toFixed(1)); if (landed < 0 && f > 4 && b.state().onGround) { landed = f; row.push('|land ' + (z0 - C.position.z).toFixed(2) + 'm|'); tap('Space'); } }
log('A combat', b.state().combat); log('A running jump, keys let go: run', vRun.toFixed(2), 'm/s; speed every 0.1 s', row.join(' '), '| ended', (z0 - C.position.z).toFixed(2), 'm on');
stop();
// B
home(); runUp(); const z1 = C.position.z; b.stamina !== undefined && log('stamina before slide', b.stamina.toFixed(2));
tap('KeyC'); row = [];
for (let f = 0; f < 30; f++) { look(); adv(1); const v = sp(); if (f % 6 === 0) row.push(v.toFixed(1)); }
log('B slide: speed every 0.1 s', row.join(' '), '| covered', (z1 - C.position.z).toFixed(2), 'm, stamina', b.stamina.toFixed(2));
log('  before the jump: slideT', b.state().slideT, 'crouching', b.state().crouching, 'onGround', b.state().onGround, 'combat', b.state().combat);
tap('Space'); key('KeyW', false); key('ShiftLeft', false); row = [];
for (let f = 0; f < 50; f++) { look(); adv(1); const v = sp(); if (f % 6 === 0) row.push(v.toFixed(1) + (b.state().onGround ? 'g' : 'a')); }
log('  jump out of it, keys let go: speed every 0.1 s', row.join(' '), '| total', (z1 - C.position.z).toFixed(2), 'm');
stop();
// D
home(); runUp(); tap('KeyC'); adv(6); b.KICK.cd = 0; b.startKick(); for (let i = 0; i < 12; i++) { look(); adv(1); }
log('D slide kick: struck', b.KICK.struck, 'air', b.KICK.air, 'mom', (b.KICK.mom || 0).toFixed(2));
stop();
// C
home(); b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const lookF = () => b.lookAt(C.position.x, C.position.y - 2.0, C.position.z - 9);
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 40; i++) { lookF(); adv(1); }
tap('Space'); for (let i = 0; i < 8; i++) { lookF(); adv(1); }
const z2 = C.position.z; b.releaseWind(); key('ShiftLeft', false); px = C.position.x; pz = C.position.z;
row = []; let st0 = '', hop = false, zipped = false;
for (let f = 0; f < 150; f++) { look(); adv(1); const v = sp(); const s = b.HK.st; if (s !== st0) { row.push('[' + s + ']'); st0 = s; } if (s === 'zip') zipped = true;
  if (f % 6 === 0 || (zipped && s !== 'zip' && f % 2 === 0 && row.length < 60)) row.push(v.toFixed(1) + (b.state().onGround ? 'g' : 'a') + (b.HK.carry ? '/c' + b.HK.carry.length().toFixed(1) : ''));
  if (!hop && zipped && s !== 'zip' && b.state().onGround) { hop = true; row.push('|land, hop|'); tap('Space'); } }
log('C hook along the sand: speed every 0.1 s', row.join(' '), '| travelled', (z2 - C.position.z).toFixed(2), 'm');
log('DONE');
