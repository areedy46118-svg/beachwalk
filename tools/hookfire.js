/* THE FIRE GOES WITH THE HOOK (2026-11-22, the owner: "the fire should follow skrims hook when the artifact is on it"): on the
 * beach, the hook in hand with the Artifact of the Flame on it, a full shift-heavy throw down the beach — each few frames of the
 * flight, the iron's distance from you, how many world flames are live within 40 cm of it, and the hand's flames; stills.
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/hookfire.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 600 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(40); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(3000);
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera; C.position.set(8, 1.7, -60); b.camBaseY = 1.7;
b.addToInventory(b.hookItem); b.hookItem.artifact = b.flameArtItem; if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
log('flameWeapon', !!b.flameWeapon());
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
const look = () => b.look(Math.PI * 0.92, 0.02);
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 70; i++) { look(); adv(1); }
log('wound: flame.k', b.flame.k.toFixed(2));
b.releaseWind(); key('ShiftLeft', false);
const near = () => { let n = 0; for (const q of b.flameWorld.P) if (q.live && q.p.distanceTo(b.HK.p) < 0.4) n++; return n; };
const vm = () => { let n = 0; for (const q of b.flameVM.P) if (q.live) n++; return n; };
for (let f = 0; f < 90; f++) {
  look(); adv(1);
  if (f % 10 === 0) log('f', f, b.HK.st, '| iron at', C.position.distanceTo(b.HK.p).toFixed(1), 'm | world flames on it', near(), '| hand flames', vm(), '| fire', b.HK.fire);
  if (f === 12 || f === 24) shot('hookfire-' + f, 560);
}
log('home:', b.HK.st, 'fire', b.HK.fire);
