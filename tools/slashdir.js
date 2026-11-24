/* WHICH WAY EACH SWING SWEEPS ON SCREEN (2026-11-23, the owner: "make the slices in the sand actually go the direction it
 * swipes"). For each weapon: several swings in a row (light, so they alternate), and through each one the weapon's meshes'
 * centre in the view model's camera, as screen x, logged against `slashDir`, the combo step and the moment of impact.
 * PB_PORT=4227 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/slashdir.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
b.settings.devMode = true;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
const T = b.THREE, C = b.camera;
const box = new T.Box3(), v = new T.Vector3();
const items = [['katana', b.katanaItem], ['blood', b.bloodItem], ['hook', b.hookItem], ['peg', b.pegItem], ['military', b.militaryItem], ['mace', b.maceItem], ['shovel', b.shovelItem]];
for (const [nm, it] of items) {
  if (!it) { log(nm, 'none'); continue; }
  b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it);
  C.position.set(8, 1.7, -60); b.camBaseY = 1.7; b.look(Math.PI, -0.5); w.__adv(40);
  const vm = it.viewmodel; if (!vm) { log(nm, 'no vm'); continue; }
  const rows = [];
  // a chain: each next click made while the last cut is still going (queued), so the combo alternates
  const sd0 = b.stampDigHole; let stamps = [];
  b.startDig(0);
  for (let s = 0; s < 4; s++) {
    let xs = [], hitAt = -1, d0 = b.slashDir, c0 = b.comboStep;
    for (let f = 0; f < 50; f++) {
      if (f === 10 && s < 3) b.startDig(0);
      w.__adv(1);
      vm.updateMatrixWorld(true); box.setFromObject(vm); box.getCenter(v); v.project(b.vmCamera || C);
      xs.push(+v.x.toFixed(2));
    }
    rows.push('dir ' + d0 + ' step ' + c0 + ' -> ' + b.slashDir + '/' + b.comboStep + ' x: ' + xs.filter((_, i) => i % 3 === 0).join(' '));
  }
  log(nm, '\n  ' + rows.join('\n  '));
}
