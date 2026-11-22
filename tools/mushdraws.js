/* THE MUSHROOM HOUSE'S DRAWS (2026-11-22): every visible mesh under it, by material (name, map, colour) and by whether it is a
 * direct child (baked) or under a group — what is left unmerged.  PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/mushdraws.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(8000);
b.clearRoomFlags(); b.camera.position.set(6, 1.7, -600); b.camBaseY = 1.7; b.look(Math.PI, -0.05); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
const G = b.mushHouseS().group, by = {}; let n = 0; log('index', b.scene.children.indexOf(G), 'at', Math.round(G.position.x), Math.round(G.position.z), 'visible', G.visible);
G.traverseVisible((o) => {
  if (!o.isMesh) return; n++;
  const m = o.material, g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3;
  const k = (o.parent === G ? 'top ' : 'sub ') + (o.name || '-') + ' | ' + (m.name || m.type) + ' ' + (m.map ? 'map' : '') + ' #' + (m.color ? m.color.getHexString() : '') + (m.transparent ? ' T' : '') + ' ' + m.uuid.slice(0, 4);
  by[k] = by[k] || { d: 0, t: 0 }; by[k].d++; by[k].t += t;
});
log('meshes', n, 'materials', new Set(Object.keys(by).map((k) => k.slice(-4))).size);
for (const [k, v] of Object.entries(by).sort((a, c) => c[1].t - a[1].t)) log(k.padEnd(80), v.d, Math.round(v.t / 100) / 10 + 'k');
