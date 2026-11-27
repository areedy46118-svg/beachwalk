/* SWINGS AT A MAN DYING ON HIS FEET (2026-11-26, "i cant hit the knights alot when in there death animation"). The first castle, every
 * kill forced to the standing death (`__bwZDieAll`); a light cut at his chest bone once his death has run `&at=` (0.3,0.8,1.4,2.0 s):
 * did it meet him (`u.zDie` ended by the blow, not by the clip).
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/zdiehit.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = true; w.__bwZDieAll = true;
const C = b.camera, kat = b.katanaItem; b.addToInventory(kat); if (b.state().equipped !== kat.name) b.toggleEquip(kat);
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
const AT = (new URLSearchParams(location.search).get('at') || '0.3,0.8,1.4,2.0').split(',').map(Number);
const used = new Set(); const out = [];
for (const at of AT) for (let rep = 0; rep < 2; rep++) {
  const u = units().find((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out && !used.has(x)); if (!u) break; used.add(u);
  const P0 = C.position.clone();
  const put = () => { const m = u.g.position; C.position.set(m.x, P0.y, m.z + 1.7); b.camBaseY = P0.y; };
  for (let i = 0; i < 20; i++) { put(); b.lookAt(u.g.position.x, P0.y - 0.3, u.g.position.z); w.__adv(1); }
  const here = C.position.clone();
  u.st.hp = 1; u.lastHitMine = true; b.startDig(0);
  let i = 0; for (; i < 60 && !u.zDie; i++) { C.position.copy(here); w.__adv(1); }
  if (!u.zDie) { out.push(at + 's: no standing death'); continue; }
  for (let k = 0; k < 120 && !(b.state().digT <= 0); k++) { C.position.copy(here); w.__adv(1); }
  for (let t = 0; t < at * 60; t++) { C.position.copy(here); w.__adv(1); if (!u.zDie) break; }
  if (!u.zDie) { out.push(at + 's: already down'); continue; }
  const ch = u.model.getObjectByName(b.FJ ? b.FJ(u.kind.file, 'Spine2') : '') || (() => { let r = null; u.model.traverse((o) => { if (!r && o.isBone && /Spine2/.test(o.name)) r = o; }); return r; })();
  const cp = ch.getWorldPosition(new b.THREE.Vector3());
  for (let k = 0; k < 3; k++) { C.position.copy(here); b.lookAt(cp.x, cp.y, cp.z); w.__adv(1); }
  b.startDig(0); let hit = false;
  for (let k = 0; k < 40; k++) { C.position.copy(here); w.__adv(1); if (!u.zDie && u.rag) { hit = true; break; } }
  out.push(at + 's: chest ' + (cp.y - u.g.position.y).toFixed(2) + ' m up, ' + cp.distanceTo(here).toFixed(2) + ' m off — ' + (hit ? 'HIT' : 'missed'));
}
log(out.join(' | '));
log('DONE');
