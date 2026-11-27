/* THE HOOK AT SOMETHING FAR (2026-11-26, `HOOK_FAR`): in the first castle, every bearing whose first drawn face is 15-30 m off:
 * thrown at it with a TAP (charge 0.1), flown on the fixed clock — does the iron arrive at that face (how far its end is from
 * the drawn point), what state it ends in, how long its chain drew, any error. And one at the sky (it should run out at the tap's
 * own reach and come back).   PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/hookfar.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js'); b.settings.devMode = true;
for (const u of b.farmUnitsS()) u.g.position.y -= 300;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(30); }
w.__clockOn(); w.__adv(30);
const C = b.camera, T = b.THREE, S0 = C.position.clone(), rc = new T.Raycaster(); rc.camera = C;
const errs = []; w.addEventListener('error', (e) => errs.push(String(e.message).slice(0, 120)));
const drawn = (O, D, far) => { rc.set(O, D); rc.far = far; for (const h of rc.intersectObjects(b.scene.children, true)) { const o = h.object; let vis = o.visible; for (let a = o.parent; a && vis; a = a.parent) vis = a.visible; if (!vis || !o.isMesh || o.name === 'hitProxy' || o.userData.bwGhost) continue; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m || m.visible === false || (m.transparent && m.opacity < 0.3)) continue; if (h.distance < 0.5) continue; return h; } return null; };
let n = 0, ok = 0; const rows = [];
for (let a = 0; a < 24 && n < 8; a++) {
  const yaw = a / 24 * Math.PI * 2;
  C.position.copy(S0); b.camBaseY = S0.y; b.look(yaw, 0.12); C.updateMatrixWorld(true);
  const D = new T.Vector3(); C.getWorldDirection(D); const dv = drawn(C.position.clone(), D, 60);
  if (!dv || dv.distance < 15 || dv.distance > 29) continue;
  n++; b.HK.st = 'idle'; b.HK.cd = 0; b.HK.armT = -1;
  if (!b.hookThrowS(0.1)) { rows.push(`yaw ${a}: would not throw`); continue; }
  const to = b.HK.to; let st = [], maxLen = 0, lastSt = '';
  for (let f = 0; f < 60 * 6 && b.HK.st !== 'idle'; f++) { C.position.copy(S0); b.look(yaw, 0.12); w.__adv(1); if (b.HK.st !== lastSt) { lastSt = b.HK.st; st.push(lastSt); } maxLen = Math.max(maxLen, b.HK.p.distanceTo(C.position)); }
  const miss = to && to.point ? to.point.distanceTo(dv.point) : 99; if (miss < 0.8 && maxLen > dv.distance - 1.5) ok++;
  rows.push(`face ${dv.distance.toFixed(1)} m off (${dv.object.name || dv.object.type}) | target ${to ? to.kind + ' at ' + to.t.toFixed(1) + ', ' + miss.toFixed(2) + ' m from the drawn point' : 'NONE'} | the iron got ${maxLen.toFixed(1)} m out | states ${st.join('>')}`);
}
for (const r of rows) log(r);
C.position.copy(S0); b.look(0, 1.2); C.updateMatrixWorld(true); b.HK.st = 'idle'; b.HK.cd = 0; b.hookThrowS(0.1);
{ let maxLen = 0, st = [], lastSt = ''; for (let f = 0; f < 60 * 6 && b.HK.st !== 'idle'; f++) { C.position.copy(S0); b.look(0, 1.2); w.__adv(1); if (b.HK.st !== lastSt) { lastSt = b.HK.st; st.push(lastSt); } maxLen = Math.max(maxLen, b.HK.p.distanceTo(C.position)); } log('at the sky, a tap: target', b.HK.to ? b.HK.to.kind : 'none', '| got', maxLen.toFixed(1), 'm out | states', st.join('>')); }
log('far faces thrown at', n, '| reached', ok, '| errors', JSON.stringify(errs));
log('DONE');
