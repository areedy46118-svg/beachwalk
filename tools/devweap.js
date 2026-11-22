/* DEV MODE'S WEAPONS, DRAWN (2026-11-21, the owner: "my weapons arent letting me pull them out when i turn to dev mode"). A
 * game started, dev mode turned on by its own toggle, then each hotbar digit pressed in turn and each weapon's slot used:
 * what is in your hand and what is drawn. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/devweap.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
const D = document.getElementById('s-dev') || w.document.getElementById('s-dev');
log('dev toggle', !!D); D.checked = true; D.dispatchEvent(new w.Event('change')); D.dispatchEvent(new w.Event('input'));
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
const slots = b.packSlotsS ? b.packSlotsS() : null;
log('devMode', b.settings.devMode, '| slots', slots ? slots.map((s) => s ? s.name : '-').join(' | ') : '?', '| equipped', b.state().equipped);
for (let k = 1; k <= 5; k++) {
  w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Digit' + k, key: '' + k })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'Digit' + k, key: '' + k }));
  for (let i = 0; i < 40; i++) { b.frame(1); await sleep(10); }
  const vm = b.viewmodelS(); log('digit', k, '-> equipped', b.state().equipped, '| vm visible', vm && vm.visible, '| locked', b.state().locked, 'menu', b.state().menuOpen);
}
// (and each weapon by its own item, 2026-11-21: the Bloody Blade and the Spare Peg had lost their `viewmodel` to a comment)
for (const nm of ['Bloody Blade', 'Spare Peg', 'Bone Mace', "Skrim's Hook", 'Military Shovel', 'Toy Shovel', 'Fishing rod']) {
  const it = b.inventory.find((i) => i.name === nm); if (!it) { log(nm, 'not carried'); continue; }
  if (b.equippedS() === it) b.toggleEquip(it); b.toggleEquip(it);
  for (let i = 0; i < 40; i++) { b.frame(1); await sleep(10); }
  let meshes = 0; if (it.viewmodel) it.viewmodel.traverse((o) => { if (o.isMesh && o.visible) meshes++; });
  log(nm, '| has viewmodel', !!it.viewmodel, '| icon', !!it.icon, '| equipped', b.equippedS() === it, '| vm visible', !!(it.viewmodel && it.viewmodel.visible), '| meshes', meshes);
}
