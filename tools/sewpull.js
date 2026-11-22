/* THE SEWER'S FUNNELS DON'T YANK (2026-11-22, the owner: "when turning corners in the sewer i get shifted around a corner really
 * fast like im being pull its like this in the door ways and the bridges"). Walks onto both bridges and into the side door from a
 * slant, by the keys, and reports the biggest single-frame move against the median one (a yank is a frame far over the step).
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/sewpull.js' <out> */
await w.eval(`import('/tools/sewer.js?${Date.now()}')`); for (let i = 0; i < 100 && !w.__sw; i++) await sleep(50);
await w.__sw.boot();
const S = () => b.sewS(), f0 = b.frame.bind(b); let trace = [];
b.frame = (n) => { const r = f0(n); const s = S(); trace.push([s.lx, s.lz]); return r; };
const leg = async (name, from, pts) => {
  await w.__sw.go(from[0], from[1], 0, 0, 4); trace = [];
  const r = await w.__sw.route(pts, { maxSec: 8 });
  const d = []; for (let i = 1; i < trace.length; i++) d.push(Math.hypot(trace[i][0] - trace[i - 1][0], trace[i][1] - trace[i - 1][1]));
  const srt = d.filter((x) => x > 1e-4).sort((a, c) => a - c), med = srt[srt.length >> 1] || 0, mx = srt[srt.length - 1] || 0;
  const big = d.map((x, i) => [x, i]).sort((a, c) => c[0] - a[0]).slice(0, 4).map(([x, i]) => `${x.toFixed(3)}@${i}(${trace[i][0].toFixed(2)},${trace[i][1].toFixed(2)}→${trace[i + 1][0].toFixed(2)},${trace[i + 1][1].toFixed(2)})`).join(' ');
  log(name, '| big', big, '| frames', d.length);
  if (/door/.test(name)) { const i0 = d.indexOf(Math.max(...d)); log('around', trace.slice(Math.max(0, i0 - 8), i0 + 4).map((q) => q.map((v) => v.toFixed(3)).join(',')).join(' | ')); }
  log(name, '| reached', r.map((q) => q.ok).join(','), '| median step', med.toFixed(3), 'max', mx.toFixed(3), 'ratio', (mx / (med || 1)).toFixed(2));
};
await leg('bridge 1 west→east, from 0.5 m off its line', [-1.9, -3.2], [[-0.9, -3.65], [2.0, -3.75]]);
await leg('bridge 1 east→west, slant', [2.0, -4.5], [[0.8, -3.75], [-2.0, -3.7]]);
await leg('bridge 2 along z, slant', [2.5, -26.6], [[1.95, -27.5], [1.9, -30.0]]);
await leg('side door from the far walk, slant', [1.9, -6.2], [[3.0, -6.6], [4.2, -6.78]]);
