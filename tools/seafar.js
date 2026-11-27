/* A FAR WATER BALL (2026-11-26, the owner: "i keep trying to throw a far water ball in the castle and it explodes mid air stop this
 * now the hook as well"). On the open beach, thrown down the beach at several elevations (and one at a spot on the sand 80 m off):
 * how long it flew, how far off it ended, how high over the ground there, and on what (`seaBall.lastHit`) — nothing should end in
 * the air. And the ball a watered hook lets go at its chain's end (`seaHookLoose`), the same.
 *   PB_PORT=4241 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/seafar.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(800);
b.settings.devMode = true;
b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem);
b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.katanaItem);
w.__clockOn(); const C = b.camera, T = b.THREE;
const X = 8, Z = -120; const put = () => { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; };
for (let i = 0; i < 30; i++) { put(); w.__adv(1); }
const fly = (label, B) => {
  let at = null, fr = 0, top = -1e9;
  for (let i = 0; i < 700 && b.seaBall.balls.includes(B); i++) { at = B.m.position.clone(); top = Math.max(top, at.y); put(); w.__adv(1); fr++; }
  const H = b.seaBall.lastHit, g = b.beachGroundAt(at.x, at.z);
  log(label, '| flew', (fr / 60).toFixed(2), 's | ended', Math.hypot(at.x - X, at.z - Z).toFixed(0), 'm off,', (at.y - g).toFixed(2), 'm over the ground | highest', top.toFixed(1), '| on', H ? H.kind + (H.surface ? ':' + H.surface : '') : 'NOTHING (ran out)');
};
for (const el of [-2, 0, 3, 8, 15, 30, 50]) {
  for (let i = 0; i < 400 && b.seaBall.cd > 0; i++) { put(); w.__adv(1); }
  put(); b.look(Math.PI, el * Math.PI / 180); C.updateMatrixWorld(true);
  const d = new T.Vector3(); C.getWorldDirection(d);
  b.seaBall.lastHit = null; b.seaBallFire();
  fly('elevation ' + el + ' (aim ' + d.toArray().map((v) => v.toFixed(2)).join(',') + ')', b.seaBall.balls[b.seaBall.balls.length - 1]);
}
if (b.seaHookLooseS) { b.seaBall.lastHit = null; const d = new T.Vector3(0, 0.25, -1).normalize(); b.seaHookLooseS(new T.Vector3(X, 3, Z - 14), d); fly('the hook\'s ball let go 14 m out, 14 deg up', b.seaBall.balls[b.seaBall.balls.length - 1]); }
log('DONE');
