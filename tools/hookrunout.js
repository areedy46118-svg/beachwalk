/* THE HOOK RUN OUT IN XIII'S AIR (2026-11-23): thrown up into open sky over a court at full charge; where the iron is each few frames
 * — it should reach its 14 m, drop for the lie, and come home; `runOut` set, no slap. PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/hookrunout.js' <out> */
w.eval(await (await fetch('/tools/c13look.js?' + Date.now())).text());
log('c13', await w.__c13LookBoot());
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const C = b.camera; b.settings.devMode = true;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 60; i++) { w.__c13Adv(1); await sleep(30); }
const S0 = C.position.clone();
for (let i = 0; i < 60 && !b.hookThrowS(1); i++) { b.HK.st = 'idle'; w.__c13Adv(2); await sleep(100); } b.HK.st = 'idle'; b.HK.p.set(0, 0, 0);
for (let i = 0; i < 40; i++) w.__c13Adv(1);
let done = false;
for (const el of [80, 70, 60]) for (let a = 0; a < 8 && !done; a++) {
  C.position.copy(S0); b.camBaseY = S0.y; b.look(a * Math.PI / 4, el * Math.PI / 180); C.updateMatrixWorld(true);
  b.HK.st = 'idle'; b.HK.cd = 0;
  if (!b.hookThrowS(1) || b.HK.to) { b.HK.st = 'idle'; continue; }
  done = true; const line = [];
  for (let f = 0; f < 90 && b.HK.st !== 'idle'; f++) { w.__c13Adv(1); if (f % 4 === 0) line.push(`${b.HK.st[0]}${b.HK.p.distanceTo(C.position).toFixed(1)}/${(b.HK.p.y - S0.y).toFixed(1)}${b.HK.runOut ? '*' : ''}`); }
  log('el', el, 'yaw', a * 45, '| state dist/height (* run out):', line.join(' '));
}
log('a clear throw found', done, '| errors', (w.__errs || []).length);
