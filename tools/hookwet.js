/* THE HOOK THROWN WET (2026-11-24, the owner: "the shift heavy with the hook with the water artifact is bad the splash stops the hook
 * early from where you are throwing it … it always getting stuck on invisible stuff … it sometimes goes through the beach walls
 * ceiling everything"). On the open beach, the Sea set in Skrim's hook, full throws down the beach at pitches −10..30°, dry and
 * wet: what the throw was aimed to stop on (`HK.to`), how far, and — frame by frame — where the iron actually got to and where
 * the ball burst (the frame `HK.water` goes to 0), and the hook's state through it.
 * PB_PORT=4245 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/hookwet.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, H = b.HK, f2 = (v) => (+v).toFixed(2);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.hookItem);
for (let i = 0; i < 60; i++) b.frame(1);
w.__clockOn(); w.__adv(20);
const X = 8, Z = -70;
for (const wet of [0, 1]) for (const el of [-10, -3, 5, 15, 30]) {
  C.position.set(X, 1.7, Z); b.camBaseY = 1.7; b.look(0, el * Math.PI / 180); w.__adv(3);
  H.st = 'idle'; H.cd = 0; H.armT = -1;
  if (!b.hookThrowS(1)) { log('no throw'); continue; }
  H.water = wet; if (wet) b.seaBallFx();
  const aimEnd = H.end.distanceTo(C.position), to = H.to;
  let burst = null, far = 0, states = [H.st], lastBall = null;
  for (let i = 0; i < 220; i++) {
    C.position.set(X, 1.7, Z); w.__adv(1);
    const d = H.p.distanceTo(C.position); if (H.st === 'out') far = Math.max(far, d);
    if (states[states.length - 1] !== H.st) states.push(H.st);
    const bb = b.seaBall.balls; if (bb.length) lastBall = bb[0].m.position.clone();
    if (wet && burst === null && !H.water && !bb.length && (lastBall || H.st !== 'out')) burst = lastBall ? lastBall.distanceTo(C.position) : d;
    if (H.st === 'idle' && !bb.length) break;
  }
  log(wet ? 'WET' : 'dry', 'el', el, '| aimed to', f2(aimEnd), 'm', to ? `(${to.kind}${to.surface ? ':' + to.surface : ''})` : (H.surfEnd ? '(sand)' : '(run out)'), '| iron got to', f2(far), wet ? `| burst at ${burst === null ? '-' : f2(burst)}` : '', '|', states.join('>'));
}
