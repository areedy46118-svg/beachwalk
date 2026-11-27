/* THE JUMP, THE TRADER'S HIGHER JUMP AND THE KICK'S TIMING (2026-11-26, the owner: "make the kick more responsive. make the base
 * jump a little higher then an upgrade to make it more high in the shop. dont make it unbalanced"). On the beach, on the clock:
 *   - a jump by the real key (`keys.Space`), the feet's lift measured off the eye's height (apex, air time);
 *   - the upgrade bought through the trader's own `traderBuy` (jars, stock, owned), then the same jump again;
 *   - the kick by `startKick` (Q's path): key -> sole out (`KICK.struck`), and a second press 0.3 s into it, held over and thrown.
 *   PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/jumpkick.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.beginGame();
for (let i = 0; i < 200; i++) { b.frame(1); await sleep(20); if (b.KICK.ready && i > 40) break; }
w.__clockOn(); const adv = (n = 1) => w.__adv(n), C = b.camera, K = b.keysS;
for (let i = 0; i < 120; i++) adv(1);
log('jump speeds', JSON.stringify(b.JUMP_VS), 'kick ready', b.KICK.ready);
const jump = () => {
  for (let i = 0; i < 30; i++) adv(1);
  const y0 = C.position.y; let top = 0, air = 0;
  K.Space = true; adv(2); K.Space = false;
  for (let i = 0; i < 120; i++) { adv(1); const dy = C.position.y - y0; top = Math.max(top, dy); if (dy > 0.005) air++; }
  return 'apex ' + top.toFixed(3) + ' m, air ' + (air / 60).toFixed(2) + ' s';
};
log('base jump', jump(), 'jumpUp', b.jumpUp);
b.bloodJarsS = 7;
log('stock', b.TRADER_STOCKS.jumpUp, 'owned', b.shopHadS('jumpUp'));
b.traderBuyS('jumpUp');
log('bought: jars 7 ->', b.bloodJarsS, 'stock', b.TRADER_STOCKS.jumpUp, 'jumpUp', b.jumpUp, 'owned', b.shopHadS('jumpUp'));
b.traderBuyS('jumpUp');
log('again: jars', b.bloodJarsS, 'stock', b.TRADER_STOCKS.jumpUp);
log('upgraded jump', jump());
// the kick
for (let i = 0; i < 300; i++) adv(1);   // (stamina back)
b.KICK.cd = 0; const ok = b.startKick(); let f = 0; while (!b.KICK.struck && f < 60) { adv(1); f++; }
log('kick', ok, 'key -> sole out', (f / 60).toFixed(3), 's (KICK_FP at that time', b.kickFPS(f / 60).toFixed(2) + ')');
let g = 0; while (b.KICK.on && g < 120) { adv(1); g++; } log('kick done after', ((f + g) / 60).toFixed(2), 's');
for (let i = 0; i < 120; i++) adv(1);
b.KICK.cd = 0; b.startKick(); for (let i = 0; i < 30; i++) adv(1);
const second = b.startKick(); let h = 0, again = -1; const t0 = b.KICK.t;
for (; h < 120; h++) { adv(1); if (again < 0 && b.KICK.on && b.KICK.t < 0.05 && h > 2) again = h; }
log('second press at 0.50 s refused now:', !second, '| buffered and thrown', again >= 0 ? ((30 + again) / 60).toFixed(2) + ' s after the first' : 'NEVER');
log('DONE');
