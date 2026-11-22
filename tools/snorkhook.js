/* THE HOOK THROWN BY THE SNORKELER (2026-11-21, the owner: "make shooting the hook get the snorkelers attention"). Skrim's hook in
 * hand, at the camp's edge of the water facing him, a full throw at his tube: is he met, up and talking after it?
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/snorkhook.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const H = b.packByName("Skrim's Hook"); b.addToInventory(H); b.toggleEquip(H);
for (let i = 0; i < 200 && !(b.HKS ? b.HKS().ready : true); i++) { b.frame(1); await sleep(30); }
w.__clockOn();
const C = b.camera, X = b.SNORK_X, Z = b.SNORK_Z;
C.position.set(X + 7, 1.7, Z + 1); b.camBaseY = 1.7;
for (let i = 0; i < 30; i++) { b.lookAt(X, 0.3, Z); w.__adv(1); }
{ const q = b.snorkS(); log('before: met', q.met, 'up', q.up); }
const ok = b.hookThrow(1); log('thrown', ok);
for (let i = 0; i < 120; i++) { b.lookAt(X, 0.3, Z); w.__adv(1); await sleep(8); }
{ const q = b.snorkS(); log('after 2 s: met', q.met, 'want', q.want, 'up', q.up, 'dialog open', b.state().dialogOpen); }
