/* WHICH OF THE TEMPLE'S MATERIALS IS WHAT (2026-11-21): every material on the temple, the meshes that use it, and their room-frame
 * bounds (radius from the middle, height) — to tell the carved ring round the floor from the columns and the roof.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/templemats.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const T = b.THREE, W = b.scene.getObjectByName('temple'), inv = W.matrixWorld.clone().invert(), by = new Map();
W.traverse((o) => { if (!o.isMesh || o.name === 'desertSand') return; const m = o.material; const k = (m.name || '?') + (m.map ? ' map ' + (m.map.name || m.map.image && m.map.image.width) : ''); if (!by.has(k)) by.set(k, []);
  const bb = new T.Box3().setFromObject(o).applyMatrix4(inv), c = bb.getCenter(new T.Vector3()), s = bb.getSize(new T.Vector3());
  let p = o; const path = []; while (p && p !== W && path.length < 4) { path.push(p.name); p = p.parent; }
  by.get(k).push(`${path.join('<')} r ${Math.hypot(c.x, c.z).toFixed(1)} y ${bb.min.y.toFixed(1)}..${bb.max.y.toFixed(1)} size ${s.x.toFixed(1)}x${s.z.toFixed(1)} tris ${(o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 | 0}`); });
for (const [k, v] of by) log(k, '|', v.join(' || '));
