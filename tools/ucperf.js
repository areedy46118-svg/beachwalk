/* THE CRAWL INTO THE CHURCH, TIMED (2026-11-21, the owner: "the church tunnel just froze my game when i walked in" / "church
 * tunnel is laggy"). Boots in dev mode, waits for the far rest, the church's models in; stands at the mound's mouth and crawls
 * in by the real door (`enterUndercroft`), on the real clock, then walks the bore from the entry toward the church at `&v=`
 * m/s (3.5). Every frame over `&over=` ms (30) is logged with what was new in it (programs, textures, geometries) and the
 * game's own named spans; `&prof=1` samples the JS over the whole run.
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/ucperf.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const q = new URLSearchParams(location.search), V = +(q.get('v') || 3.5), OVER = +(q.get('over') || 30), PROF = !!+(q.get('prof') || 0);
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const left = () => (b.startGate ? b.startGate().left : 0);
for (let i = 0; i < 2400 && left() > 0; i++) { b.frame(1); await sleep(16); }
b.ROOM_BACK.uc.load();
for (let i = 0; i < 600 && !b.UCS().ready; i++) { b.frame(1); await sleep(30); }
log('uc ready', b.UCS().ready);
// (&hold=<name>: that in your hand for the crawl and the walk — the glowstick, say, as anyone carries in there)
if (q.get('hold')) { const nm = q.get('hold'), it = b.inventory.find((i) => i.name === nm) || (b.packByName && b.packByName(nm)); if (it && !b.inventory.includes(it)) b.addToInventory(it); if (it && b.equippedS() !== it) b.toggleEquip(it); log('holding', b.equippedS() && b.equippedS().name); }
w.requestAnimationFrame = () => 0;
const tick = () => new Promise((r) => setTimeout(r, 0));
const C = b.camera; C.position.set(b.MOUNT_FRONT_X + 3, 1.7, b.MOUNT_MOUTH_Z); b.camBaseY = 1.7; b.lookAt(b.MOUNT_FRONT_X, 1.2, b.MOUNT_MOUTH_Z);
for (let i = 0; i < 90; i++) { b.frame(1); await tick(); }
const R = b.renderer, RI = R.info, gl = R.getContext(), px = new Uint8Array(4);
let P = PROF ? new w.Profiler({ sampleInterval: 1, maxBufferSize: 900000 }) : null;
const out = [], ms = [], tStart = performance.now(); let prevEnd = performance.now(), phase = 'crawl';
const frameT = async (tag) => {
  const pg0 = RI.programs ? RI.programs.length : 0, tx0 = RI.memory.textures, ge0 = RI.memory.geometries;
  const ta = performance.now(), gap = ta - prevEnd; b.frame(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const tb = performance.now(); prevEnd = tb;
  const dPg = (RI.programs ? RI.programs.length : 0) - pg0;
  const t = gap + (tb - ta); ms.push([tag, t]);
  if (t > OVER) out.push([tag, Math.round(gap), Math.round(tb - ta), Math.round(ta - tStart), dPg, RI.memory.textures - tx0, RI.memory.geometries - ge0, dPg > 0 ? RI.programs.slice(-dPg).map((p) => p.name || p.cacheKey.slice(0, 40)).join('/') : '']);
  await tick();
};
// (which materials are drawn for the first time in the crawl: those with no program before it)
const props = R.properties, noProg = new Map();
b.scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) if (!props.get(m).currentProgram) noProg.set(m, o); });
const seen = new Set(); b.scene.traverse((o) => seen.add(o));
b.enterUndercroft();
for (let i = 0; i < 600 && !b.state().inUndercroft && !(b.inUndercroftS && b.inUndercroftS()); i++) await frameT('crawl');
for (let i = 0; i < 120; i++) await frameT('arrived');
{ const got = []; for (const [m, o] of noProg) if (props.get(m).currentProgram) { let n = o.name || '?', p = o.parent; for (let k = 0; k < 3 && p; k++, p = p.parent) n = (p.name || '?') + '/' + n; got.push(n + ' [' + m.type + (m.name ? ' ' + m.name : '') + ']'); } const fresh = []; b.scene.traverse((o) => { if (!seen.has(o) && o.isMesh) { let n = o.name || '?', p = o.parent; for (let k = 0; k < 3 && p; k++, p = p.parent) n = (p.name || '?') + '/' + n; fresh.push(n + ' [' + [].concat(o.material).map((m) => m.type).join(',') + ']'); } }); log('NEW MESHES in the crawl', fresh.length, fresh.slice(0, 12).join(' ; ')); log('FIRST DRAWN in the crawl', got.length, got.slice(0, 12).join(' ; ')); }
// the walk: from where the crawl put you toward the church (its altar), the bore's own floor under you
const U = b.UCS(), X = b.UC_X, Y = b.UC_Y, Z = b.UC_Z, e = U.spots.entry, a = U.spots.altar || U.spots.exit;
log('entry', JSON.stringify([e.x, e.z].map((v) => +v.toFixed(1))), 'altar', a ? JSON.stringify([a.x, a.z].map((v) => +v.toFixed(1))) : '?', 'cam', [C.position.x - X, C.position.z - Z].map((v) => v.toFixed(1)).join(','));
let x = e.x, last = performance.now();
const dir = a && a.x < e.x ? -1 : 1, x1 = a ? a.x : e.x + 90;
while ((x1 - x) * dir > 1) {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; x += dir * V * dt;
  const zz = e.z + (a ? (a.z - e.z) * (x - e.x) / (x1 - e.x) : 0), f = U.floorAt(x, zz);
  C.position.set(X + x, Y + (f != null ? f : e.y) + 1.6, Z + zz); b.camBaseY = C.position.y; b.look(dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
  await frameT('walk');
}
const sum = (tag) => { const s = ms.filter((m) => m[0] === tag).map((m) => m[1]).sort((p, c) => p - c); if (!s.length) return tag + ' none'; const qq = (f) => s[Math.floor((s.length - 1) * f)].toFixed(1); return tag + ' n ' + s.length + ' med ' + qq(0.5) + ' p95 ' + qq(0.95) + ' max ' + qq(1) + ' over50 ' + s.filter((v) => v > 50).length; };
log(sum('crawl')); log(sum('arrived')); log(sum('walk'));
const spans = (b.lagTime ? b.lagTime(12) : []).filter((s) => s[0] > tStart - 50);
for (const g of out.slice(0, 40)) {
  const tAbs = tStart + g[3]; const near = spans.filter((s) => s[0] > tAbs - g[1] - 40 && s[0] < tAbs + g[2] + 5).map((s) => s[2] + ' ' + s[1]).slice(0, 4).join(' | ');
  log('GAP', g[0], 'gap', g[1], 'frame', g[2], 'progs', g[4], g[7], 'tex', g[5], 'geo', g[6], near ? '<- ' + near : '');
}
if (P) {
  const tr = await P.stop(), self = new Map(); let tot = 0;
  for (const s of tr.samples) { if (s.stackId == null) continue; tot++; const f = tr.frames[tr.stacks[s.stackId].frameId]; const k = (f.name || '(anon)') + ':' + (f.line || 0); self.set(k, (self.get(k) || 0) + 1); }
  log('PROF', tot, JSON.stringify([...self.entries()].sort((p, c) => c[1] - p[1]).slice(0, 25).map(([k, v]) => k + ' ' + v)));
}
