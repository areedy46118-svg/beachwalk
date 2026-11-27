/* THE MARIONETTE IN THE CASTLE FIGHT (2026-11-25, the owner: "THE MARIONETTE RARELY TAKES DAMAGE I FEEL LIKE"). The garrison's
 * natural fight (`fortboot.js`, devMode off), him at your side, you standing still at the gate facing the nearest man; `&secs=` of
 * the game's clock. Every drop in his health and yours is a blow (his put back under 8, yours after each): how many fell on each
 * of you, how much of the time the men were on him, and what `marBalance` decided (`MAR.bal`).
 *   PB_PORT=4231 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/marfort.js' <out> */
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 60), FIGHT = Q.get('fight') === '1', DIE = Q.get('die') === '1', GAP = +(Q.get('gap') || 150);
// (&fight=1: you fight too, the katana, a killing blow on the nearest man in reach every `gap` frames; &die=1: his health is his, and he may die)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = false;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 400 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { w.__adv(1); await sleep(20); }
const M = b.MAR.u; if (!M) { log('no marionette'); log('DONE'); throw 0; }
M.st.hp = M.kind.hp;
const cam = b.camera.position, home = [cam.x, cam.z];
if (FIGHT) { const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat); }
let nextSwing = 120, kills = 0, diedAt = -1;
for (let i = 0; i < 120; i++) { w.__adv(1); cam.x = home[0]; cam.z = home[1]; }
log('him', M.g.position.x.toFixed(1), M.g.position.y.toFixed(1), M.g.position.z.toFixed(1), 'you', cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(1), 'place', b.marPlaceS ? b.marPlaceS() : '?');
const HPF = b.hpS();
let his = 0, hisN = 0, yours = 0, yoursN = 0, onHim = 0, awakeF = 0, dHim = 0, dN = 0;
for (let f = 0; f < SECS * 60; f++) {
  const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
  let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
  if (tgt) b.lookAt(tgt.g.position.x, tgt.g.position.y + 1.2, tgt.g.position.z);
  if (!DIE && M.st.hp < 8) M.st.hp = M.kind.hp;
  if (FIGHT && f >= nextSwing && tgt && bd < 2.4) { tgt.st.hp = 1; b.startDig(f % 3 === 0 ? 1 : 0); nextSwing = f + GAP; kills++; }
  const h0 = M.st.hp;
  w.__adv(1);
  if (f % 10 === 0) await sleep(1);
  cam.x = home[0]; cam.z = home[1];
  if (M.st.hp < h0) { hisN++; his += h0 - M.st.hp; }
  if (diedAt < 0 && (!M.st.alive || b.MAR.st === 'dead')) { diedAt = f / 60; log('HE DIED at', diedAt.toFixed(1), 's'); }
  if (b.hpS() < HPF) { yoursN++; yours += HPF - b.hpS(); b.setHp(HPF); }
  for (const u of us) if (u.st.awake && Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z) < 30) { awakeF++; if (u.st.foe === M) { onHim++; dHim += Math.hypot(u.g.position.x - M.g.position.x, u.g.position.z - M.g.position.z); dN++; } }
  if (f % 600 === 599) log('t', (f + 1) / 60, 's: on him', hisN, 'blows', his.toFixed(1), 'hp | on you', yoursN, 'blows', yours.toFixed(1), '| men on him', (100 * onHim / Math.max(1, awakeF)).toFixed(0) + '%', 'his foe', M.st.foe ? 'yes' : 'none', 'd', Math.hypot(M.g.position.x - cam.x, M.g.position.z - cam.z).toFixed(1));
}
log('men left', units().filter((u) => u.st.alive && u.farm && u.farm.out).length, 'your swings', kills, 'his hp', M.st.hp, 'alive', M.st.alive);
log('TOTAL per minute: him', (hisN * 60 / SECS).toFixed(1), 'blows', (his * 60 / SECS).toFixed(1), 'hp; you', (yoursN * 60 / SECS).toFixed(1), 'blows', (yours * 60 / SECS).toFixed(1), 'hp; men on him', (100 * onHim / Math.max(1, awakeF)).toFixed(0) + '% (mean distance', (dHim / Math.max(1, dN)).toFixed(2) + ')', JSON.stringify(b.MAR.bal || {}));
log('DONE');
