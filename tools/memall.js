/* WHAT THE GAME HOLDS (2026-11-22): after the boot's far rest is in and after every room has been loaded once, the textures and
 * geometry the scene holds (estimated bytes: w*h*4*4/3 per mipmapped texture, attribute arrays), the JS heap, and the room
 * that holds most.  PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/memall.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(40000);
const measure = (root) => {
  const tex = new Set(), geo = new Set();
  root.traverse((o) => {
    if (o.geometry) geo.add(o.geometry);
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture) tex.add(t); }
    if (o.material && o.material.uniforms) for (const u of Object.values(o.material.uniforms)) if (u && u.value && u.value.isTexture) tex.add(u.value);
  });
  let tb = 0, gb = 0; const src = new Map();
  for (const t of tex) { const im = t.image; const w = (im && (im.width || im.videoWidth)) || 0, h = (im && (im.height || im.videoHeight)) || 0; const k = t.source || im; if (src.has(k)) continue; const by = w * h * 4 * (t.generateMipmaps === false ? 1 : 4 / 3); src.set(k, { by, w, h, n: (t.name || (im && im.src ? im.src.split('/').pop() : '') || (im && im.tagName) || im && im.constructor && im.constructor.name || '?') }); tb += by; }
  BIG = [...src.values()].sort((a, c) => c.by - a.by);
  for (const g of geo) { for (const a of Object.values(g.attributes)) gb += a.array ? a.array.byteLength : 0; if (g.index) gb += g.index.array.byteLength; }
  return { tex: tex.size, tb, geo: geo.size, gb };
};
let BIG = [];
const mb = (x) => (x / 1048576).toFixed(0) + ' MB';
const line = (name) => { const m = measure(b.scene), R = b.renderer.info.memory, hp = performance.memory ? mb(performance.memory.usedJSHeapSize) : '?';
  log(name.padEnd(12), 'textures', m.tex, mb(m.tb), '| geometries', m.geo, mb(m.gb), '| renderer holds tex', R.textures, 'geo', R.geometries, '| heap', hp); };
line('beach');
const per = [];
for (const k of Object.keys(b.ROOM_BACK)) {
  const RB = b.ROOM_BACK[k]; b.clearRoomFlags(); try { RB.load(); } catch (e) { continue; } for (let i = 0; i < 500 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  try { RB.place(); } catch (e) {} for (let i = 0; i < 40; i++) { b.frame(1); await sleep(10); }
  const m = measure(b.scene); per.push([k, m.tb + m.gb]);
}
b.clearRoomFlags(); line('all rooms');
log('biggest images: ' + BIG.slice(0, 25).map((e) => e.n.slice(0, 22) + ' ' + e.w + 'x' + e.h).join(', '));
const hist = {}; for (const e of BIG) { const k = Math.max(e.w, e.h); hist[k] = (hist[k] || 0) + 1; } log('by size: ' + JSON.stringify(hist));
let prev = 0; log('growth by room (cumulative order): ' + per.map(([k, v]) => { const d = v - prev; prev = v; return k + ' +' + mb(d); }).join(', '));
