/* CAN YOU GET INTO A PILLAR (2026-11-26, the owner: "I SHOULD NOT CLIP THROUGH THE PILLARS EVER"). The temple; each of its eleven
 * pillars walked AT from inside the ring, a tenth of a metre a step through the player's own push-out (`tmpPushOut`), with your
 * feet at 0, 1, 2, 3, 4.5 and 8 m over the floor (up its stepped base, or set there by a blow or the hook): how far out you get.
 * Through the shaft is ~27 m; stopped at its face is ~22-23.   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/tmppillar.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS && b.tmpS().ready && b.tmpGS && b.tmpGS()); i++) { b.frame(1); await sleep(50); }
const T = b.THREE, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, KP = b.KING_PILLARS;
log('solid cells', JSON.stringify(b.tmpGS()));
let through = 0, n = 0; const rows = [], bad = [];
for (const feet of [0, 1, 2, 3, 4.5, 8]) {
  const reached = [];
  for (let i = 0; i < KP.n; i++) for (const off of [0, 0.03, -0.03]) {
    const a = KP.a0 + i * Math.PI * 2 / KP.n + off, sx = Math.sin(a), cz = Math.cos(a);
    const fl = b.tmpFloorAt(sx * 20, cz * 20), p = new T.Vector3(X + sx * 20, 0, Z + cz * 20);
    let inside = 0, deep = 0;
    for (let k = 0; k < 90; k++) { p.x += sx * 0.1; p.z += cz * 0.1; b.tmpPushOutS(p, fl + feet);
      // is your middle in stone that stands over your step — and is anything of it within a hand of your eye (the lens inside it)?
      if (b.tmpCellTopS(p.x - X, p.z - Z) > fl + feet + 0.42) inside++;
      for (let q = 0; q < 8; q++) { const aa = q * Math.PI / 4; if (b.tmpCellTopS(p.x - X + Math.sin(aa) * 0.15, p.z - Z + Math.cos(aa) * 0.15) > fl + feet + 0.42) { deep++; break; } } }
    const r = Math.hypot(p.x - X, p.z - Z); reached.push(r); n++; if (inside || deep) { through++; bad.push(`pillar ${i} off ${off} feet ${feet}: middle in stone ${inside} steps, stone within 0.15 m ${deep} steps`); }
  }
  rows.push(`feet ${feet} m up: got out to ${Math.min(...reached).toFixed(1)}-${Math.max(...reached).toFixed(1)} m `);
}
for (const r of rows) log(r);
const a0 = KP.a0, tops = []; for (let r = 21; r <= 29; r += 0.5) tops.push(r + ':' + (b.tmpCellTopS(Math.sin(a0) * r, Math.cos(a0) * r) - b.tmpFloorAt(Math.sin(a0) * r, Math.cos(a0) * r)).toFixed(1).replace('-1000000000.0', '-'));
log('one pillar, tops over the floor by radius:', tops.join(' '));
for (let i = 0; i < KP.n; i++) { const a = KP.a0 + i * Math.PI * 2 / KP.n, row = []; for (let r = 22; r <= 28; r += 0.25) { const lx = Math.sin(a) * r, lz = Math.cos(a) * r, t = b.tmpCellTopS(lx, lz); row.push(t < -1e8 ? '.' : Math.min(99, Math.round(t - b.tmpFloorAt(lx, lz)))); } log('pillar', i, 'tops (m) r 22..28:', row.join(' ')); }
for (const x of bad.slice(0, 8)) log('  ', x);
log('walks at a pillar', n, '| ever inside the stone', through);
log('DONE');
