// how pronounced the desert's ridges are across the wind (2026-11-21): for steps of 4/8/12 m up and down the wind, the
// distribution of (h − max(up, down)) over the ring 30-330 m. Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/dunecrest.js' <out>
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready); i++) await sleep(50);
const W = { x: 0.84, z: -0.54 };
for (const step of [4, 8, 12, 20]) {
  const v = [];
  for (let x = -330; x <= 330; x += 5) for (let z = -330; z <= 330; z += 5) { const r = Math.hypot(x, z); if (r < 30 || r > 330) continue;
    const h = b.tmpSandRaw(x, z), up = b.tmpSandRaw(x - W.x * step, z - W.z * step), dn = b.tmpSandRaw(x + W.x * step, z + W.z * step); v.push(h - Math.max(up, dn)); }
  v.sort((a, c) => c - a);
  log('step', step, '| top', v.slice(0, 5).map((q) => q.toFixed(2)).join(' '), '| p1', v[Math.floor(v.length * 0.01)].toFixed(3), 'p5', v[Math.floor(v.length * 0.05)].toFixed(3), 'p10', v[Math.floor(v.length * 0.1)].toFixed(3), '| n', v.length);
}
log('h range', b.tmpSandRaw(0, 200).toFixed(2), b.tmpSandRaw(150, 150).toFixed(2), b.tmpSandRaw(-200, 50).toFixed(2));
