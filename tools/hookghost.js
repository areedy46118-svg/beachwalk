/* WHAT THE HOOK CATCHES THAT ISN'T THERE (2026-11-22, the owner: "i keep hitting random invisible stuff in the air when throwing
 * the hook"): from a spot (&at=isle|fort|tav|beach), the hook's own target-finding (`hookThrowS`) down 16 bearings x 6 pitches,
 * each answer compared with a ray against what is DRAWN (visible, opaque meshes) down the same line: a catch more than 0.6 m short of
 * the first drawn face is a catch on nothing — logged with what kind of thing answered.  PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/hookghost.js&at=isle' <out> */
const Q = new URLSearchParams(location.search), AT = Q.get('at') || 'isle';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
if (AT === 'fort') { await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot())); }
else if (AT === 'tav') { await ev('/tools/tavdrink.js'); log('tav', JSON.stringify(await w.__tavSetup())); }
else { for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); } for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100); }
await ev('/tools/burntest.js');
b.settings.devMode = true;
if (AT === 'isle') { b.loadIsle(); for (let i = 0; i < 400 && !(b.isleS && b.isleS().ready); i++) { b.frame(1); await sleep(40); } b.placeOnIsle(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); } }
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 80; i++) { b.frame(1); await sleep(50); }
w.__clockOn(); w.__adv(30);
for (let i = 0; i < 60 && !b.hookThrowS(1); i++) { b.HK.st = 'idle'; w.__adv(2); await sleep(100); } b.HK.st = 'idle';
const C = b.camera, T = b.THREE, S0 = C.position.clone(); log('at', AT, S0.toArray().map((v) => v.toFixed(1)).join(','));
const rc = new T.Raycaster(); rc.camera = C;
const drawn = (O, D, far) => { rc.set(O, D); rc.far = far; const hs = rc.intersectObjects(b.scene.children, true); for (const h of hs) { const o = h.object; let vis = o.visible; for (let a = o.parent; a && vis; a = a.parent) vis = a.visible; if (!vis || !o.isMesh || o.isSprite || o.isPoints || o.name === 'hitProxy') continue; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && ((m.transparent && m.opacity < 0.35) || m.visible === false || m.colorWrite === false)) continue; return h; } return null; };
let n = 0, ghosts = 0; const kinds = {}, shown = [];
const spots = [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]];
for (const [dx, dz] of spots) for (let a = 0; a < 16; a++) for (const el of [-20, -5, 10, 25, 45, 65]) {
  C.position.set(S0.x + dx, S0.y, S0.z + dz); b.camBaseY = C.position.y;
  const yaw = a / 16 * Math.PI * 2, e = el * Math.PI / 180; b.look(yaw, e); C.updateMatrixWorld(true);
  b.HK.st = 'idle'; b.HK.cd = 0; b.HK.armT = -1;
  if (!b.hookThrowS(1)) continue;
  const to = b.HK.to; b.HK.st = 'idle'; if (b.HK.links) b.HK.links.visible = false;
  if (!to || !to.point) continue;
  n++;
  const D = b.HK.aim.clone(), O = C.position.clone(), dv = drawn(O, D, to.t + 30);
  const short = dv ? dv.distance - to.t : 99;
  if (to.kind === 'foe' || to.kind === 'gull' || to.kind === 'pile') continue;
  if (short > 0.6) { ghosts++; const k = to.kind + (to.surface ? ':' + to.surface : '') + (to.hit && to.hit.object ? ':' + (to.hit.object.name || to.hit.object.type) : ''); kinds[k] = (kinds[k] || 0) + 1; if (shown.length < 10) shown.push(`${k} at t ${to.t.toFixed(1)} (drawn at ${dv ? dv.distance.toFixed(1) : 'none'}) yaw ${a * 22.5} el ${el} from ${dx},${dz} pt ${to.point.toArray().map((v) => v.toFixed(1)).join(',')}`); }
}
log('throws', n, '| caught short of anything drawn', ghosts, JSON.stringify(kinds));
for (const s of shown) log('  ', s);
