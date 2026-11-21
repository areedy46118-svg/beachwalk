/* THE HOOK DIGS A MOUND (2026-11-20, the owner: "skrims hook should collide with everything like a weapon would when thrown and
 * dig up mounds"): stood 8 m off the nearest untaken mound, looking at its foot, a full throw; is it opened.
 * Run: PB_PORT=4275 sh tools/probe.sh 'evalFile&f=/tools/hookmound.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const M = b.moundsS().filter((m) => !m.taken).sort((p, q) => Math.abs(p.z - b.camera.position.z) - Math.abs(q.z - b.camera.position.z))[0];
log('mound', M.x.toFixed(1), M.z.toFixed(1), 'taken', M.taken);
const C = b.camera.position;
const place = () => { C.set(M.x + 2, C.y, M.z + 7.5); };
for (let i = 0; i < 20; i++) { place(); b.lookAt(M.x, 0.05, M.z); adv(1); }
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 50; i++) { place(); b.lookAt(M.x, 0.05, M.z); adv(1); }
for (let i = 0; i < 4; i++) { b.lookAt(M.x, 0.05, M.z); adv(1); }
b.releaseWind(); key('ShiftLeft', false);
log('thrown', b.HK.st, b.HK.to ? b.HK.to.kind : 'nothing', 'end', b.HK.end.toArray().map((v) => v.toFixed(1)).join(','));
for (let i = 0; i < 90; i++) { adv(1); if (M.taken) { log('opened at frame', i); break; } }
log('mound taken', M.taken);
