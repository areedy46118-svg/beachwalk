/* THE WATER BALL AND ITS DROP (2026-11-23, the owner: "have a lil drop of water in the bottom right that indicates when you have
 * the water ball shot make the graphics of this water ball better and more of a impactful splash with it too"). The Sea set in
 * the shovel, in hand on the open beach: the drop's state; a ball thrown at the sand a few metres ahead; stills in flight and
 * through the burst; the drop through the cooldown and the pop when it is back.
 * PB_PORT=4227 PB_WAIT=240 sh tools/probe.sh 'evalFile&f=/tools/seadrop.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
b.settings.devMode = true;
b.setFallbackLook(true);
const D = w.document, drop = D.getElementById('seadrop'), dS = () => drop.className + ' k=' + drop.querySelector('.wet').style.getPropertyValue('--k');
log('no artifact', dS());
b.addToInventory(b.shovelItem); b.toggleEquip(b.shovelItem);
const S = b.seaArtItem; b.shovelItem.artifact = S; S.on = b.shovelItem;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
w.__clockOn();
const C = b.camera;
const put = () => { C.position.set(6.5, 1.7, -60); b.look(0.25, -0.32); };
put(); w.__adv(10);
log('held, ready', dS(), 'seaWeapon', !!b.seaWeapon());
b.seaBallFire();
for (let i = 0; i < 4; i++) { put(); w.__adv(1); }
shot('sb-flight', 800);
let hit = -1;
for (let i = 0; i < 60; i++) { put(); w.__adv(1); if (!b.seaBall.balls.length) { hit = i; break; } }
log('burst after', hit, 'frames', 'drop', dS());
for (const [n, k] of [['sb-burst-02', 2], ['sb-burst-08', 6], ['sb-burst-20', 12], ['sb-burst-45', 25], ['sb-after-2s', 75]]) { for (let i = 0; i < k; i++) { put(); w.__adv(1); } shot(n, 800); }
log('mid cooldown', dS());
for (let i = 0; i < 60 * 4; i++) { put(); w.__adv(1); }
log('back', dS());
// (the drop as it looks: tools/dropshot.html, a page of its states, screenshotted by headless Chrome)
