/* THE DESERT'S AIR AND LIGHT (2026-11-21, the owner: the sand off the crests, the cloud shadows, the low sun, the air going still
 * near the temple): the teleport, the king held off, the real loop for a few seconds at each of — the crow's landing view, across
 * the far dunes, 40 m out, and inside the ring — then a still; the crests found, the stillness, the wind's sound, and the frames.
 * Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/desertatm.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) await sleep(50);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
b.KING.probeHold = true;
const tiles = []; const Q_FULL = !!+(new URLSearchParams(location.search).get('full') || 0);
const grab = (lab) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 560; c.height = Math.round(560 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
const at = async (lab, x, z, lx, ly, lz, secs = 4) => {
  const fl = Y + b.tmpFloorAt(x, z); let worst = 0, n = 0, last = performance.now();
  const end = performance.now() + secs * 1000;
  while (performance.now() < end) { b.KING.probeHold = true; C.position.set(X + x, fl + 1.7, Z + z); b.camBaseY = C.position.y; b.lookAt(X + lx, Y + ly, Z + lz); await new Promise((r) => w.requestAnimationFrame(r)); const now = performance.now(); if (n > 5) worst = Math.max(worst, now - last); last = now; n++; }
  grab(`${lab} | still ${b.TMP_ATM.still.toFixed(2)} wind ${b.audioState ? '' : ''}`);
  const CR = b.tmpAirS().CR, live = CR.filter((c) => c.age <= c.life);
  if (/ridges/.test(lab)) for (const c of live.slice(0, 5)) { const v = new b.THREE.Vector3(c.x + X, c.y + Y, c.z + Z).project(C); log('   plume at', c.x.toFixed(0), c.y.toFixed(1), c.z.toFixed(0), '| sand under', b.tmpSandRaw(c.x, c.z).toFixed(1), '| on screen', v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(3), '| age', c.age.toFixed(1), '/', c.life.toFixed(1), 'a', c.a); }
  if (/ridges/.test(lab)) { const A = b.tmpAirS(); log('   crest mesh visible', A.crest.visible, 'parent', A.crest.parent && A.crest.parent.name, 'first vert', Array.from(A.crest.geometry.attributes.position.array.slice(0, 3)).map((q) => q.toFixed(1)).join(','), 'alpha0', A.crest.geometry.attributes.color.array[3].toFixed(2)); }
  log(lab, '| plumes live', live.length, 'nearest', live.length ? Math.min(...live.map((c) => Math.hypot(c.x - (C.position.x - X), c.z - (C.position.z - Z)))).toFixed(0) : '-', '| frames', n, 'worst', worst.toFixed(1), 'ms | still', b.TMP_ATM.still.toFixed(2), '| crests', b.tmpAirS && b.tmpAirS().crests.length);
};
await at('the crow\'s landing', -129.6, 0, 0, 12, 0, 5);
await at('across the far dunes', -129.6, 0, -40, 6, 260, 4);
await at('the other way', -129.6, 0, -260, 8, -120, 4);
{ const fov = C.fov; C.fov = 22; C.updateProjectionMatrix(); await at('the ridges, close in (fov 22)', -129.6, 0, -60, 9, 150, 4); C.fov = fov; C.updateProjectionMatrix(); }
await at('40 m out', -40, 10, 0, 10, 0, 4);
await at('inside the ring', -12, 3, 20, 4, 0, 5);
const cols = 2, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], nn = Math.ceil(d.length / 8000);
for (let i = 0; i < nn; i++) console.log('[PBIMG]', 'desert', i + '/' + nn, d.slice(i * 8000, (i + 1) * 8000));
