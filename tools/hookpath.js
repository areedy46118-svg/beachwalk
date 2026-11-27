/* THE HOOK THROUGH A BODY (2026-11-25, the owner: "sometimes it misses an enemy when it clearly went through them"). On the open beach,
 * the hook in hand: (1) thrown at the sand 10 m off, and a man stepped onto its line as it flies; (2) thrown at a man with another
 * standing in front of him, a little to the side; (3) thrown a hand past a man's shoulder. What it bit, each.
 *   PB_PORT=4241 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/hookpath.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(50);
b.settings.devMode = true;
const C = b.camera, X = 6, Z = -300;
C.position.set(X, 1.7, Z); b.camBaseY = 1.7;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(30); }
const mk = async (x, z) => { const u = b.mutSpawnTest(x, z, 'pale', 0); for (let i = 0; i < 300 && !u.model; i++) { b.frame(1); await sleep(20); } u.st.awake = false; u.st.hp = 99; return u; };
const A = await mk(X, Z - 20), B = await mk(X + 30, Z);
w.__clockOn(); w.__adv(30);
const park = () => { A.g.position.set(X + 40, 0, Z - 40); B.g.position.set(X + 44, 0, Z - 40); };
const throwAt = async (yaw, pitch, mid) => {
  for (let i = 0; i < 80 && b.HK.st !== 'idle'; i++) w.__adv(1);
  b.HK.st = 'idle'; b.HK.cd = 0; b.HK.armT = -1;
  C.position.set(X, 1.7, Z); b.look(yaw, pitch); C.updateMatrixWorld(true);
  if (!b.hookThrowS(1)) return 'no throw';
  const aimed = b.HK.to ? b.HK.to.kind + (b.HK.u ? ':' + (b.HK.u === A ? 'A' : b.HK.u === B ? 'B' : '?') : '') : 'nothing';
  let bit = null;
  for (let f = 0; f < 90; f++) { if (f === 3 && mid) mid(); w.__adv(1); if (b.HK.st === 'bite') { bit = b.HK.u === A ? 'A' : b.HK.u === B ? 'B' : 'other'; break; } if (b.HK.st === 'back') break; }
  return `aimed ${aimed} -> ${bit ? 'BIT ' + bit : 'state ' + b.HK.st}`;
};
// 1: at the sand 10 m ahead (-Z), A stepped onto the line 6 m out once the iron has left
park(); log('1 stepped into its flight:', await throwAt(0, -0.16, () => { A.g.position.set(X, 0, Z - 6); A.g.updateMatrixWorld(true); }));
// 2: at B 9 m ahead, A in front of him 5 m out, 0.25 m to the side
park(); A.g.position.set(X + 0.25, 0, Z - 5); B.g.position.set(X, 0, Z - 9); log('2 one in front of the one thrown at:', await throwAt(0, -0.02));
// 3: a hand past A's shoulder (the line 0.5 m from his middle)
park(); A.g.position.set(X + 0.5, 0, Z - 7); log('3 past his shoulder:', await throwAt(0, -0.02));
log('DONE');
