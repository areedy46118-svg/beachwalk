/* THE HOOK'S WALLS IN A ROOM (2026-11-20): into the undercroft (`&room=uc`) or the whale (`&room=whale`), the hook in hand,
 * thrown full at eight bearings round you; what it stopped on, how far, and how long the throw's traces took (ms).
 * Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/hookwalls.js&room=uc' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), ROOM = Q.get('room') || 'uc';
b.settings.devMode = true;
for (let i = 0; i < 400 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(50); }
if (ROOM === 'uc') b.enterUndercroft(); else if (ROOM === 'whale') b.whaleEnter && b.whaleEnter();
for (let i = 0; i < 300; i++) { b.frame(1); await sleep(30); }
w.__clockOn();
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); w.__adv(40);
const C = b.camera; log('room', ROOM, 'at', C.position.toArray().map((v) => v.toFixed(1)).join(','));
for (let k = 0; k < 8; k++) {
  const a = k * Math.PI / 4; b.look(a, 0); w.__adv(2);
  const t0 = performance.now(); b.hookThrow(1); const ms = performance.now() - t0;
  log('bearing', (a * 57.3).toFixed(0), 'stopped on', b.HK.to ? b.HK.to.kind : 'nothing', 'at', b.HK.to ? b.HK.to.t.toFixed(2) : '-', 'ms', ms.toFixed(1));
  for (let i = 0; i < 200 && b.HK.st !== 'idle'; i++) w.__adv(1);
}
