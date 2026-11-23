/* THE HOOK'S PULL IN A CASTLE (2026-11-22, the owner: "using the hook in the castle i shouldnt clip through high parts on the
 * castle when flying up make it flawless"): in the first castle's street, pulls at 8 bearings x 3 climbs (30/55/75°) to a point
 * 12 m off — after each, is there a drawn face between where you started and where you ended (through it), and your end.
 * PB_PORT=4246 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/hookcastle.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js');
b.settings.devMode = true;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 300 && !b.castleSiteS(); i++) await sleep(30);
w.__clockOn(); w.__adv(30);
const C = b.camera, T = b.THREE, S0 = C.position.clone(), base0 = b.camBaseY;
log('site', !!b.castleSiteS(), 'at', S0.toArray().map((v) => v.toFixed(1)).join(','));
let through = 0, n = 0; const ends = [];
for (let a = 0; a < 8; a++) for (const el of [30, 55, 75]) {
  C.position.copy(S0); b.camBaseY = base0; b.HK.st = 'idle'; b.HK.zipUsed = false; w.__adv(3);
  const yaw = a / 8 * Math.PI * 2, e = el * Math.PI / 180, d = new T.Vector3(Math.sin(yaw) * Math.cos(e), Math.sin(e), Math.cos(yaw) * Math.cos(e));
  const start = C.position.clone(), tgt = start.clone().addScaledVector(d, 12);
  b.HK.st = 'out'; b.HK.airThrow = true; const ok = b.hookZipAtS(tgt.x, tgt.y, tgt.z);
  let top = -1e9, crossed = false; const S = b.castleSiteS(); let prev = C.position.clone();
  for (let i = 0; i < 120; i++) {
    w.__adv(1); top = Math.max(top, C.position.y);
    const cur = C.position.clone(), dd = cur.clone().sub(prev), LL = dd.length();
    if (S && LL > 0.02) for (const dy of [-1.3, -0.7, 0.1]) { const o = prev.clone(); o.y += dy; if (b.siteRayS(S, o, dd.clone().normalize(), LL) !== null) { crossed = true; if (!w.__hcShow) { w.__hcShow = 1; log('crossed at frame', i, 'from', prev.toArray().map((v) => v.toFixed(2)).join(','), 'to', cur.toArray().map((v) => v.toFixed(2)).join(','), 'dy', dy, 'zip', b.HK.st); } } }
    prev = cur;
  }
  const end = C.position.clone(), L = end.distanceTo(start);
  n++; if (crossed) through++;
  ends.push(`${a * 45}°/${el}: ${ok ? 'pulled' : 'no'} to ${end.y.toFixed(1)} (top ${top.toFixed(1)}) moved ${L.toFixed(1)}${crossed ? ' THROUGH' : ''}`);
  b.HK.st = 'idle';
}
log(ends.slice(0, 12).join(' | ')); log(ends.slice(12).join(' | '));
log('pulls', n, '| ended on the far side of a face', through);
