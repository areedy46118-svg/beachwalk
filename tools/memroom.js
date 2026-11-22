/* WHO HOLDS THE TEXTURE MEMORY (2026-11-22): after the boot's far rest and every room loaded once, the image bytes held ONLY
 * under each top-level object (w*h*4, x4/3 when mipmapped; one count per image source), the largest twenty, and the shared
 * rest. Pair with `ps` on the headless Chrome's GPU process for the real footprint.  PB_PORT=4223 PB_WAIT=1200 sh tools/probe.sh 'evalFile&f=/tools/memroom.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(40000);
log('MARK beach-loaded');
for (const k of Object.keys(b.ROOM_BACK)) {
  const RB = b.ROOM_BACK[k]; b.clearRoomFlags(); try { RB.load(); } catch (e) { continue; } for (let i = 0; i < 500 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  try { RB.place(); } catch (e) {} for (let i = 0; i < 40; i++) { b.frame(1); await sleep(10); }
}
b.clearRoomFlags(); log('MARK rooms-loaded'); await sleep(15000);
const owners = new Map(), bytes = new Map();
for (const top of b.scene.children) top.traverse((o) => {
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) for (const k of Object.keys(m)) { const t = m[k]; if (!t || !t.isTexture) continue; const src = t.source || t.image; if (!src) continue;
    const im = t.image; const w = (im && (im.width || im.videoWidth)) || 0, h = (im && (im.height || im.videoHeight)) || 0;
    bytes.set(src, w * h * 4 * (t.generateMipmaps === false ? 1 : 4 / 3)); let s = owners.get(src); if (!s) owners.set(src, s = new Set()); s.add(top); }
});
const per = new Map(); let shared = 0, total = 0;
for (const [src, s] of owners) { const by = bytes.get(src); total += by; if (s.size > 1) { shared += by; continue; } const top = [...s][0]; per.set(top, (per.get(top) || 0) + by); }
const mb = (x) => (x / 1048576).toFixed(0);
log('total', mb(total), 'MB; shared between tops', mb(shared), 'MB');
for (const [top, by] of [...per.entries()].sort((a, c) => c[1] - a[1]).slice(0, 22)) {
  let nm = top.name; if (!nm) { const c = []; top.traverse((o) => { if (o.name && c.length < 2) c.push(o.name); }); nm = top.type + '[' + c.join(',').slice(0, 30) + ']'; }
  log('  ' + nm.padEnd(44) + ' @' + Math.round(top.position.x) + ',' + Math.round(top.position.z) + '  ' + mb(by) + ' MB' + (top.visible ? '' : ' (hidden)'));
}
log('MARK end');
