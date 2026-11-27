// (why castle-props-c.glb will not load: fetched, inflated and parsed here, the error read — 2026-11-25)
const r = await w.fetch('assets/castle-props-c.glb?' + Date.now()); log('status', r.status, r.headers.get('content-type'));
let buf = await r.arrayBuffer(); const u8 = new Uint8Array(buf); log('bytes', buf.byteLength, 'starts', u8[0], u8[1]);
if (u8[0] === 0x1f && u8[1] === 0x8b) { const ds = new w.DecompressionStream('gzip'); buf = await new w.Response(new w.Blob([buf]).stream().pipeThrough(ds)).arrayBuffer(); log('inflated', buf.byteLength); }
const mod = await w.eval("import('three/addons/loaders/GLTFLoader.js')");
await new Promise((res) => new mod.GLTFLoader().parse(buf, '', (g) => { let n = 0; g.scene.traverse((o) => { if (o.isMesh) n++; }); log('PARSED', n, 'meshes'); res(); }, (e) => { log('PARSE ERROR', e && (e.message || e)); res(); }));
log('DONE');
