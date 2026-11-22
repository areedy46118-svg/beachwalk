/* HOW FAST THE GAME'S OWN INFLATE IS (2026-11-21, the perf pass): `bwGunzip` (DecompressionStream) on stored files, timed, and
 * the same bytes read plain for comparison. Run: PB_PORT=4266 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/gzbench.js' <out> */
const files = ['assets/castle.glb', 'assets/bunker.glb', 'assets/skrim-moves.json', 'assets/crab.glb', 'assets/tree.glb'];
const gun = (buf) => new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
for (const f of files) {
  let t = performance.now(); const raw = await (await fetch('/' + f + '?' + Math.random())).arrayBuffer(); const tf = performance.now() - t;
  t = performance.now(); const out = await gun(raw); const ti = performance.now() - t;
  t = performance.now(); await Promise.all([gun(raw), gun(raw), gun(raw), gun(raw)]); const t4 = performance.now() - t;
  log(f, 'stored', (raw.byteLength / 1048576).toFixed(2), 'MB fetched in', tf.toFixed(0), 'ms; inflated to', (out.byteLength / 1048576).toFixed(2), 'MB in', ti.toFixed(0), 'ms (', (out.byteLength / 1048576 / ti * 1000).toFixed(0), 'MB/s ); four at once', t4.toFixed(0), 'ms');
}
