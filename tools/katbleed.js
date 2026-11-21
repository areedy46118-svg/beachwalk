/* THE KATANA BLEEDS THEM, LESS THAN THE BLOODY BLADE (2026-11-21, the owner: "make the katana do bleed damage too and edit its
 * description. make it less bleed than the bloody blade."). A red mutant stood up in front of you for each: a light cut, then
 * a heavy, by each weapon (the game's own hurt, as a swing lands), and the bleed on him after each; and the katana's words.
 * Run: PB_PORT=4223 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/katbleed.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const C = b.camera;
for (const nm of ['Katana', 'Bloody Blade', 'Toy Shovel']) {
  const it = b.packByName(nm); if (!b.inventory.includes(it)) b.addToInventory(it); if (b.equippedS() !== it) b.toggleEquip(it); b.frame(2);
  const u = b.mutSpawnTest(C.position.x - 2, C.position.z - 2, 'red', 0); for (let i = 0; i < 5; i++) b.frame(1);
  u.st.hp = 999; u.hpMax = 13;
  b.hurtMutantTest(u, 0.01, 0.2); const a = u.st.bleed || 0; for (let i = 0; i < 40; i++) b.step(1 / 60);
  b.hurtMutantTest(u, 0.01, 1.0); const c = u.st.bleed || 0;
  log(nm, '| bleed after a cut', a.toFixed(2), '| after a heavy too', c.toFixed(2), '(the heavy built', (c - a).toFixed(2) + ')');
  u.st.alive = false; u.g.visible = false;
}
log('katana says:', b.packByName('Katana').desc);
