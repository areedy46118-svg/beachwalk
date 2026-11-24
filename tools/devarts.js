/* DEV MODE GIVES THE ARTIFACTS (2026-11-23, the owner: "give all arifacts in dev mode too"), and THE PIER FIGURE AT THE PEN'S
 * OWN WIDTH ("make the drawing same thickness when you see them at the lighthouse just have it white how it is"): dev mode turned
 * on, what the pack holds; one set in a weapon and dev mode handed again (no second copy); the checkpoint patched by
 * `stickArtifacts` must not mark the world's as given; then a figure built from test ink and a still of it on the pier.
 * PB_PORT=4227 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/devarts.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1000);
const nm = (it) => it && it.name;
const has = () => [b.whaleArtItem, b.flameArtItem, b.seaArtItem].map((it) => (b.inventory || []).includes(it) ? 'pack' : (it.on ? 'on ' + it.on.name : 'no'));
log('before', JSON.stringify(has()));
const D = w.document.getElementById('s-dev'); D.checked = true; D.dispatchEvent(new w.Event('change'));
await sleep(300);
log('dev on', JSON.stringify(has()), 'names', [b.whaleArtItem, b.flameArtItem, b.seaArtItem].map(nm).join(' | '));
b.saveCheckpoint(); await sleep(100);
const wpn = (b.inventory || []).find((it) => it.viewmodel && !it.artifact && b.attachArtifact(b.seaArtItem, it));
log('set in', nm(wpn), JSON.stringify(has()));
D.checked = false; D.dispatchEvent(new w.Event('change')); await sleep(100); D.checked = true; D.dispatchEvent(new w.Event('change')); await sleep(300);
log('dev again', JSON.stringify(has()), 'sea copies in pack', b.inventory.filter((it) => it === b.seaArtItem).length);
const sv = JSON.parse(w.localStorage.getItem('beachwalk.save') || 'null');
log('save flags', JSON.stringify({ tavChest: sv.flags.tavChest, whaleArt: sv.flags.whaleArt, seaRelic: sv.flags.seaRelic, seaOn: sv.flags.seaRelicOn }));
// the figure
const ink = []; { const c = []; for (let k = 0; k <= 24; k++) c.push(256 + 30 * Math.cos(k / 24 * Math.PI * 2), 120 + 30 * Math.sin(k / 24 * Math.PI * 2)); ink.push(c); }
ink.push([256, 150, 256, 270], [200, 195, 312, 205], [256, 270, 220, 350], [256, 270, 292, 350], [230, 110]);
b.setSkInk(ink, 'Pat'); b.skFigBuild();
const m = b.scene.getObjectByName('skFigure');
log('figure', !!m, m && m.material.map.image.width + 'x' + m.material.map.image.height);
if (m) {
  w.requestAnimationFrame = () => 0; await sleep(100);
  const C = b.camera; m.visible = true; m.updateMatrixWorld(true);
  const p = m.position;
  C.position.set(p.x + 3.2, p.y + 1.6, p.z + 0.4); C.lookAt(p.x, p.y + 0.9, p.z); m.rotation.y = Math.atan2(C.position.x - p.x, C.position.z - p.z);
  C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('pierfig', 640, 1.2);
}
