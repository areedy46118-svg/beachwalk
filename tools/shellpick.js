/* CAN A SHELL BE TAKEN (2026-11-23, the owner: "i cant pick up a shell" — the far detail's userData broke the hand's clone: perf.md).
 * run the hover with the near pass on and off and the far detail on and off, then press E on it.
 * PB_PORT=4227 PB_WAIT=240 sh tools/probe.sh 'evalFile&f=/tools/shellpick.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
b.settings.devMode = true;
b.setFallbackLook(true);
log('shells', b.shells.length, b.shells.map((g) => g.position.toArray().map((v) => +v.toFixed(2)).join(',')).join(' | '));
const C = b.camera;
for (const g of b.shells) {
  const p = g.position;
  C.position.set(p.x + 1.2, 1.7, p.z + 0.4); b.lookAt(p.x, p.y + 0.05, p.z); b.frame(2);
  C.position.set(p.x + 1.2, 1.7, p.z + 0.4); b.lookAt(p.x, p.y + 0.05, p.z); b.frame(1);
  const it = b.interactables.find((q) => q.root === g);
  const dist = C.position.distanceTo(p).toFixed(2);
  b.updateHover(); const h1 = b.state().hovered;
  b.hoverNear(false); b.updateHover(); const h2 = b.state().hovered; b.hoverNear(true);
  log('shell at', p.toArray().map((v) => +v.toFixed(2)).join(','), 'dist', dist, 'in scene', !!g.parent, 'interactable', !!it, it && it.meshes.length, '_far', it && it._far, 'when', it && it.when ? it.when() : '-',
    '| hover', h1, '| near off', h2, '| state', JSON.stringify({ locked: b.state().locked, fb: b.state().fallbackLook, frozen: b.state().menuOpen }));
}
// and take the first one, by the action itself, the hand's frames run by hand
{
  const g = b.shells[0], p = g.position;
  C.position.set(p.x + 1.2, 1.7, p.z + 0.4); b.lookAt(p.x, p.y + 0.05, p.z); b.frame(2);
  log('hover', JSON.stringify(b.hoverNowS()), 'inv', JSON.stringify(b.state().inv), 'frozen?', JSON.stringify(b.state()));
  b.primaryActionS();
  log('right after', 'in scene', !!g.parent, 'inv', JSON.stringify(b.state().inv));
  for (let i = 0; i < 60; i++) { b.frame(1); await sleep(16); }
  log('after frames', 'in scene', !!g.parent, 'inv', JSON.stringify(b.state().inv), 'equipped', b.state().equipped);
}
