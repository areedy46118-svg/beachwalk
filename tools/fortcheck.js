/* THE CASTLE'S BOOT-BUILT PIECES, AS NUMBERS (2026-11-21, the perf pass: the mask's morphology and the torches' wall search made
 * faster — this prints what they made, to compare with an older build's): the mask's size and a checksum of every cell, and
 * every torch's place. Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/fortcheck.js' <out> */
const torchL = () => { const T = []; b.scene.traverse((o) => { if (o.isPointLight && o.userData.lpAlways === 14) T.push(o); }); return T; };
for (let i = 0; i < 1200 && !(b.FORT_M && b.FORT_M.data && torchL().length >= 8); i++) { b.frame(1); await sleep(50); }
const M = b.FORT_M; let h = 0; for (let k = 0; k < M.data.length; k++) h = (h * 31 + M.data[k] + k) >>> 0;
let ones = 0; for (const v of M.data) ones += v;
log('mask', M.gw, 'x', M.gh, 'cells set', ones, 'checksum', h);
for (let i = 0; i < 1200 && !(b.C13_M && b.C13_M.data); i++) { b.frame(1); await sleep(50); }
if (b.C13_M && b.C13_M.data) { const D = b.C13_M.data; let h2 = 0, o2 = 0; for (let k = 0; k < D.length; k++) { h2 = (h2 * 31 + D[k] + k) >>> 0; o2 += D[k]; } log('XIII mask', b.C13_M.gw, 'x', b.C13_M.gh, 'cells set', o2, 'checksum', h2); } else log('XIII mask not exposed or not built');
const T = torchL().map((l) => l.getWorldPosition(new b.THREE.Vector3()).toArray().map((v) => v.toFixed(5)).join(','));
log('torch lights', T.length, '|', T.join(' ; '));
