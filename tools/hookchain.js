/* THE CHAIN NEVER IN THE GROUND (2026-11-26, the owner: "the chain of the hook should never go through the ground or anything"). On the
 * open beach, the hook thrown at the sand at three distances and once level out over it with a full charge; every frame its chain is
 * out, each link's height over the ground under it (`groundUnderS`): the worst, and how many link-frames were under.
 *   PB_PORT=4244 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/hookchain.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(50);
b.settings.devMode = true;
const C = b.camera, X = 6, Z = -300, M = new b.THREE.Matrix4(), V = new b.THREE.Vector3();
C.position.set(X, 1.7, Z); b.camBaseY = 1.7;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(30); }
w.__clockOn(); w.__adv(30);
const out = [];
for (const [pitch, charge, walk] of [[-0.12, 1, 0], [-0.25, 1, 0], [-0.4, 0.6, 0], [0.02, 1, 0], [-0.18, 1, 1]]) {
  for (let i = 0; i < 120 && b.HK.st !== 'idle'; i++) w.__adv(1);
  b.HK.st = 'idle'; b.HK.cd = 0; b.HK.armT = -1;
  C.position.set(X, 1.7, Z); b.look(0, pitch); C.updateMatrixWorld(true);
  if (!b.hookThrowS(charge)) { out.push(pitch + ': no throw'); continue; }
  let worst = 9, under = 0, n = 0;
  for (let f = 0; f < 150; f++) {
    if (walk) C.position.x += 0.04;    // (you walk off sideways while it is out)
    w.__adv(1);
    const L = b.HK.links; if (!L || !L.visible) continue;
    for (let i = 0; i < L.count; i++) { L.getMatrixAt(i, M); V.setFromMatrixPosition(M); const g = b.groundUnderS(V.x, V.z, V.y + 0.3); const d = V.y - g; n++; if (d < worst) worst = d; if (d < 0) under++; }
  }
  out.push(`pitch ${pitch}${walk ? ' walking off' : ''}: worst link ${worst.toFixed(3)} m over the sand, ${under} of ${n} link-frames under`);
}
log(out.join(' | '));
log('DONE');
