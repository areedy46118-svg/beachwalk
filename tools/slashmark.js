/* THE SLICE IN THE SAND GOES THE WAY THE SWING DID (2026-11-23, the owner: "make the slices in the sand actually go the direction
 * it swipes"), and THE WHALE'S ARTIFACT GOLD IN THE PACK ("make whale artifact be outline yellow like the rest of the artifacts
 * are in the pack"). Real swings at the sand from the real path (`startDig`): the katana's cut and the mace's two (its return
 * goes the other way), each mark's direction read off its instance matrix; a still from overhead. Then the pack: the whale's
 * slot's class and colour beside the flame's and the sea's.
 * PB_PORT=4227 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/slashmark.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
b.settings.devMode = true;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
const T = b.THREE, C = b.camera, DH = b.scene.getObjectByName('digHoles') || b.scene.children.find((o) => o.isInstancedMesh && o.geometry && o.material && /dig/i.test(o.name));
log('holes mesh', DH && DH.name);
let X = 8, Z = -40;
for (let z = -40; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), dirv = new T.Vector3();
const lastMark = () => { let best = -1, bt = -1; const a = DH.geometry.attributes; for (const k in a) {} for (let i = 0; i < DH.count; i++) { DH.getMatrixAt(i, m); m.decompose(p, q, s); if (s.x === 0) continue; const t = DH.geometry.getAttribute('aDig') ? DH.geometry.getAttribute('aDig').getX(i) : i; if (t > bt) { bt = t; best = i; } } if (best < 0) return null; DH.getMatrixAt(best, m); m.decompose(p, q, s); dirv.set(0, 0, -1).applyQuaternion(q); return { p: [p.x.toFixed(2), p.z.toFixed(2)], dir: [dirv.x.toFixed(2), dirv.z.toFixed(2)] }; };
const swingAt = (nm, it, n) => {
  b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it);
  C.position.set(X, 1.7, Z + 1.6); b.camBaseY = 1.7; b.look(0, -0.85); w.__adv(40);
  for (let k = 0; k < n; k++) {
    C.position.set(X + k * 0.9 - 0.5, 1.7, Z + 1.6); b.look(0, -0.85); w.__adv(2);
    b.startDig(0); let f = 0; const before = JSON.stringify(lastMark());
    for (; f < 60; f++) { w.__adv(1); if (JSON.stringify(lastMark()) !== before) break; }
    log(nm, k, 'slashDir', b.slashDir, 'step', b.comboStep, 'mark', JSON.stringify(lastMark()), 'after', f);
    if (k < n - 1) { for (let g = 0; g < 3; g++) w.__adv(1); }
  }
  w.__adv(60);
};
// looking down the beach along -z: your right is +x, so a right-to-left cut runs toward -x
swingAt('katana', b.katanaItem, 1);
X += 0; Z -= 2.2;
swingAt('mace', b.maceItem, 2);
C.position.set(X + 0.2, 4.2, Z + 1.6); C.lookAt(X + 0.2, 0, Z + 0.4); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('marks-above', 640, 1.3);
C.position.set(X + 0.2, 1.7, Z + 3.6); C.lookAt(X + 0.2, 0, Z + 0.6); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('marks-stand', 640, 1.3);
// the pack
for (const it of [b.whaleArtItem, b.flameArtItem, b.seaArtItem]) b.addToInventory(it);
b.openPack(); await sleep(800); b.frame(2);
const d = w.document;
const cells = [...d.querySelectorAll('#inv-grid .islot')];
log('pack open', b.state().invOpen, 'cells', cells.length);
cells.forEach((e, i) => { if (/art|fire|sea/.test(e.className) || i < 12) log('cell', i, e.className, '|', (e.textContent || '').trim().slice(0, 30), '| --c', w.getComputedStyle(e).getPropertyValue('--c').trim()); });
const hb = [...d.querySelectorAll('#hotbar .slot')].map((e) => e.className).join(' | ');
log('hotbar', hb);
