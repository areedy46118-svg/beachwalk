/* WHERE THE HOOK'S REGULAR HEAVY CROSSES THE PICTURE (2026-11-20, the owner: "make the regular heavy swing through where the
 * cursor is on the middle of the screen its above it right now"): a full hold released, and every frame of the cut the point's
 * place on screen (ndc, the view model's lens) — what height it crosses the middle at. A still of the frame nearest the middle.
 * Run: PB_PORT=4274 sh tools/probe.sh 'evalFile&f=/tools/hookheavyline.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const T = b.THREE, m = b.hookModel.children[0].children[0].children[0], vmc = b.vmCamera;
const tipAt = () => { b.hookModel.updateMatrixWorld(true); vmc.updateMatrixWorld(true); return m.localToWorld(new T.Vector3(-0.082, 0.032, 0.253)).project(vmc); };
const Qs = new URLSearchParams(location.search), hold = +(Qs.get('hold') || 42);
for (const L of (Qs.get('lift') || '0.36').split(',').map(Number)) {
b.setHookLift(L); adv(30);
b.startWind(); adv(hold); b.releaseWind();
const rows = []; let best = null;
for (let i = 0; i < 40; i++) {
  adv(1); const q = tipAt(); rows.push(i + ':' + q.x.toFixed(2) + ',' + q.y.toFixed(2));
  if (Math.abs(q.x) < 0.6 && (!best || Math.abs(q.x) < Math.abs(best.x))) best = { i, x: q.x, y: q.y };
  if (!(b.state().digT > 0) && i > 3) break;
}
log('lift', L, 'tip ndc', rows.slice(4, 14).join(' '));
log('lift', L, 'nearest the middle', JSON.stringify(best));
adv(60);
}
