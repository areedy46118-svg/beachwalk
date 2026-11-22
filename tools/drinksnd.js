/* THE OWNER'S DRINK (2026-11-21): the water bottle in hand, a drink, and which recording played and when the level ran out.
 * Run: PB_PORT=4223 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/drinksnd.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 200 && !b.state().started; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 100; i++) { b.frame(1); await sleep(20); }       // (the sample banks in)
const it = b.waterBottleItem; b.gainWater(1); if (b.equippedS && b.equippedS() !== it) b.toggleEquip(it);
for (let i = 0; i < 40; i++) { b.frame(1); await sleep(16); }
const n0 = b.sampleLogS().length; b.drinkWaterS();
let t = 0, done = -1; for (let i = 0; i < 200; i++) { b.step(1 / 60); t += 1 / 60; }
log('played:', b.sampleLogS().slice(-3).join(','), '| equipped after', b.equippedS ? (b.equippedS() || {}).name : '?', '| count', it.count);
