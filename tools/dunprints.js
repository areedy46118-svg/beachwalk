/* THE PRINTS TO HENRY'S DOOR (2026-11-21). Stood in the pavilion's yard by the steps, then by the column, looking round it at
 * the dungeon's door: stills, and how many prints are laid. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/dunprints.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const MX = b.MUSH_XS(), MZ = b.MUSH_ZS(), M = b.MUSH_S(), C = b.camera;
C.position.set(MX - 6, 1.7, MZ); b.camBaseY = 1.7;
let im = null; for (let i = 0; i < 600 && !(im = b.scene.getObjectByName('dunPrints')); i++) { if (i === 5 && b.loadDungeonS) b.loadDungeonS(); b.frame(1); await sleep(30); }
log('prints', im ? im.count : 'none');
w.requestAnimationFrame = () => 0;
const R = b.renderer, tiles = [];
const shotAt = (px, pz, lx, lz, pitch) => { C.position.set(MX + px, M.PLAT_TOP + 1.65, MZ + pz); b.camBaseY = C.position.y; b.lookAt(MX + lx, M.PLAT_TOP + pitch, MZ + lz); for (let i = 0; i < 3; i++) { b.lookAt(MX + lx, M.PLAT_TOP + pitch, MZ + lz); b.frame(1); } C.updateMatrixWorld(true); if (im) im.visible = true; R.render(b.scene, C); const c = document.createElement('canvas'); c.width = 640; c.height = 360; c.getContext('2d').drawImage(R.domElement, 0, 0, 640, 360); tiles.push(c); };
shotAt(-4.6, 0.6, -1.2, 3.6, 0);
shotAt(-1.5, 3.9, 2.5, 3.0, 0);
shotAt(1.2, 4.1, 4.2, 0.5, 0.3);
const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360 * tiles.length; tiles.forEach((c, i) => cv.getContext('2d').drawImage(c, 0, i * 360));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'prints', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
// (and his hand for the door, 2026-11-21: E at the dungeon's door — the reach out, and the door used as it closes)
{
  w.__clockOn && w.__clockOn();
  const dm = b.dunDoorMeshS(); const P = dm.getWorldPosition(new b.THREE.Vector3());
  C.position.set(P.x - 1.6, M.PLAT_TOP + 1.65, P.z); b.camBaseY = C.position.y;
  for (let i = 0; i < 10; i++) { b.lookAt(P.x, M.PLAT_TOP + 1.1, P.z); w.__adv ? w.__adv(1) : b.frame(1); }
  log('hovered', b.state().hovered);
  w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyE', key: 'e' })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
  const tl = [];
  for (let f = 0; f < 40; f++) { b.lookAt(P.x, M.PLAT_TOP + 1.1, P.z); w.__adv ? w.__adv(1) : b.frame(1); if (f % 4 === 3) tl.push(((f + 1) / 60).toFixed(2) + 's hand ' + (b.scene.getObjectByName('pipeHand').visible ? 'out' : '-') + ' door ' + (b.dunBusyS() ? 'opening' : '-')); }
  log(tl.join(' | '));
}
