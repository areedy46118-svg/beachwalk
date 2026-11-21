/* THE TWO SHOVELS' BLOWS (2026-11-21, the owner: "make military shovel do more damage then the toy shovel not by alot make it
 * balanced"). Each in hand: what a light cut and a heavy deal (the game's own `toolDmgBase`), and how many of each a dark
 * mutant (8) and a red (13) take. Run: PB_PORT=4223 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/shoveldmg.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (const nm of ['Toy Shovel', 'Military Shovel', 'Katana']) {
  const it = b.packByName(nm); if (!it) { log(nm, 'none'); continue; } if (!b.inventory.includes(it)) b.addToInventory(it);
  if (b.equippedS() !== it) b.toggleEquip(it); b.frame(2);
  const L = b.toolDmgBaseS(false), H = b.toolDmgBaseS(true);
  log(nm, '| light', L, 'heavy', H, '| dark (8):', Math.ceil(8 / L), 'cuts or', Math.ceil(8 / H), 'heavies | red (13):', Math.ceil(13 / L), 'cuts or', Math.ceil(13 / H), 'heavies');
}
