/* HEALTH HELD WHILE PAUSED (2026-11-17, `hpHeld`). Not part of the game. Run headless:
 *   PB_PORT=4258 sh tools/probe.sh 'evalFile&f=/tools/hphold.js' <out>
 * Hurt to 1, then 40 s of frames with the pack open, 40 with the menu open, 40 with neither: health over each. */
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(20); }
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false; w.__clockOn();
b.setHp(1);
const run = (s) => { for (let i = 0; i < s * 60; i++) w.__adv(1); };
b.openPack(); log('pack open', b.state().invOpen ?? '?'); run(40); log('after 40 s in the pack: hp', b.state().hp);
b.closePack();
b.openMenu(); log('menu open', b.state().menuOpen); run(40); log('after 40 s in the menu: hp', b.state().hp);
b.closeMenu(); run(1);
log('menu now', b.state().menuOpen, 'pack', b.state().invOpen);
run(40); log('after 40 s playing: hp', b.state().hp);
