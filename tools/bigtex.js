/* TEXTURES OVER THE CAP (2026-11-22): after the boot's far rest, every texture in the scene wider than `TEX_CAP`, with the
 * slot it is in, the material, the mesh's top ancestor and what its image is.  PB_PORT=4223 sh tools/probe.sh 'evalFile&f=/tools/bigtex.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(40000);
const seen = new Set();
b.scene.traverse((o) => {
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) for (const k of Object.keys(m)) { const t = m[k]; if (!t || !t.isTexture || seen.has(t)) continue; seen.add(t); const im = t.image; const w = im && (im.width || im.videoWidth); if (!(w > 2048)) continue;
    let p = o; while (p.parent && p.parent !== b.scene) p = p.parent;
    log(t.name, w + 'x' + (im.height || im.videoHeight), k, m.name, 'mesh', o.name, 'top', p.name || p.type, Math.round(p.position.x), Math.round(p.position.z), im.constructor.name); }
});
