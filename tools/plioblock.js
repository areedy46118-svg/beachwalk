/* THE GUARD AGAINST THE SEA MONSTER (2026-11-23, the owner: "i still get hurt when blocking the seamonster fix this"). The deep's
 * fight as `plioTest` stages it (devMode OFF, healed after each), the guard held up toward it from long before each blow
 * (`setGuardTest(true, 1)`: up a second, past the parry window, so every one is a BLOCK), bites then tail swipes: per blow,
 * whether it hurt, the stamina before and after; and the stamina a few seconds after a block (does it come back down here).
 * PB_PORT=4227 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/plioblock.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
await (async () => { w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); })();
b.addToInventory(b.katanaItem); b.toggleEquip(b.katanaItem);
b.settings.devMode = false;
for (let i = 0; i < 400 && !(b.plioS().ready); i++) { b.frame(2); await sleep(100); }
b.placeInDeep(); w.__clockOn();
const P = b.plioS(), D = b.deepS(), C = b.camera.position;
C.set(25000, 1990, 25000); b.camBaseY = C.y;
D.ph = 'fight'; D.t = 0; b.plioStartPass(); w.__adv(30);
const face = () => { const g = P.g.position; b.lookAt(g.x, g.y, g.z); };
const hold = () => { C.set(25000, 1990, 25000); b.camBaseY = C.y; D.v.set(0, 0, 0); D.knock.set(0, 0, 0); face(); b.setGuardTest(true, 1); };
const runTo = (pred, max) => { for (let i = 0; i < max; i++) { hold(); w.__adv(1); if (pred()) return i; } return -1; };
const res = { hurt: 0, blows: 0 };
for (const atk of ['bite', 'bite', 'bite', 'bite', 'tail', 'tail', 'tail', 'tail']) {
  runTo(() => P.st === 'lurk', 900);
  b.setHp(4);
  b.setHp(4); const st0 = b.staminaS ? b.staminaS() : null;
  const s0 = b.state().stamina ?? null;
  b.plioTell(); P.atk = atk;
  const nb0 = (P.nBite || 0), nt0 = (P.nSwipe || 0);
  let hp0 = 4, minHp = 4, sMin = 9, sBefore = null;
  for (let i = 0; i < 900; i++) { hold(); w.__adv(1); minHp = Math.min(minHp, b.hp); if (P.st === 'flee' || P.st === 'lurk' || P.st === 'stun') { if (i > 5) break; } }
  res.blows++; if (minHp < hp0) res.hurt++;
  log(atk, 'state', P.st, 'hurt', minHp < hp0, 'hp', minHp, 'stamina now', (b.stamina ?? -1).toFixed ? b.stamina.toFixed(2) : b.stamina, 'exhausted', b.exhausted);
}
log('blocked blows', res.blows, 'hurt through the guard', res.hurt);
// and the bar down here: emptied, then four seconds of treading water
b.setStamina(0.1); for (let i = 0; i < 240; i++) { hold(); w.__adv(1); }
log('stamina after 4 s in the deep from 0.10:', b.stamina);
b.setGuardTest(false);
