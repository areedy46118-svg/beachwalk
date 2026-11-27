/* LAG IN THE CASTLE FIGHT (2026-11-24, the owner: "look for any lag too and eliminate it in this fight"). The garrison's natural fight
 * (devMode off, you healed, facing the nearest man), the katana, and every ~2 s a real swing that kills the nearest man in reach (his
 * hp set to 1 first): ragdolls, gore, blood pile up as in play. Every frame timed on the OUTER clock (the probe's `__clockOn` fakes
 * the game's `performance.now`); the JS sampler over the run: the functions inside frames over 25 ms (self and inclusive), and the
 * steady cost over all frames. &secs=60  PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/fightlag.js' <out> */
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 60), GAP = +(Q.get('gap') || 120), REACH = +(Q.get('reach') || 2.4);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = false;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat);
const cam = b.camera.position, home = [cam.x, cam.z];
for (let i = 0; i < 120; i++) w.__adv(1);     // warm
const toW = (t) => performance.timeOrigin + t - w.performance.timeOrigin;     // outer clock → the game's timeline
const Pr = new w.Profiler({ sampleInterval: 2, maxBufferSize: 1000000 });
const times = [], slow = [], ctx = [];
let kills = 0, nextSwing = 60, tgtK = null;
const N = SECS * 60;
for (let f = 0; f < N; f++) {
  const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
  let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
  if (tgt) b.lookAt(tgt.g.position.x, tgt.g.position.y + 1.2, tgt.g.position.z);
  if (f >= nextSwing && tgt && bd < REACH) { tgt.st.hp = 1; b.startDig(Q.get('heavy') ? 1 : (f % 3 === 0 ? 1 : 0)); tgtK = tgt; nextSwing = f + GAP; }
  b.renderer.info.autoReset = false; b.renderer.info.reset();
  const t0 = performance.now(); w.__adv(1); const t1 = performance.now();
  cam.x = home[0]; cam.z = home[1]; b.heal(); if (P0.unit) P0.unit.st.awake = false;
  if (tgtK && !tgtK.st.alive) { kills++; tgtK = null; }
  const d = t1 - t0; times.push(d);
  if (f % 300 === 0 || f === N - 1) { const ri = b.renderer.info; let meshes = 0; b.scene.traverse((o) => { if (o.isMesh && o.visible) meshes++; }); const kinds = {}; b.scene.traverse((o) => { if (o.isMesh && o.visible && o.parent === b.scene) { const k = (o.name || ((o.geometry && o.geometry.type) + '/' + ((o.material && o.material.name) || (o.isSkinnedMesh ? 'skinned' : '')) + (o.userData && o.userData.noBake ? '/rubble' : '')) || '?').slice(0, 40); kinds[k] = (kinds[k] || 0) + 1; } }); log('  at', (f / 60).toFixed(0) + 's', 'kills', kills, '| draw calls', ri.render.calls, 'triangles', ri.render.triangles, '| visible meshes in the scene', meshes, '| geometries', ri.memory.geometries, 'textures', ri.memory.textures, 'programs', (ri.programs || []).length, '| blood drops', b.bloodDropsN ? b.bloodDropsN() : -1, '| ragdolls awake', units().filter((u) => u.rag && !u.rag.asleep).length); if (f === N - 1 || f === 0) log('  scene-level meshes by name', JSON.stringify(Object.entries(kinds).sort((a, c) => c[1] - a[1]).slice(0, 14))); }
  if (d > 25) { slow.push([toW(t0), toW(t1)]); if (ctx.length < 40) ctx.push([f, Math.round(d), kills, units().filter((u) => u.rag && !u.rag.asleep).length, b.bloodDropsN ? b.bloodDropsN() : -1]); }
}
const tr = await Pr.stop();
const s = times.slice().sort((a, c) => a - c), pc = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
log('frames', times.length, '| p50', pc(0.5), 'p95', pc(0.95), 'p99', pc(0.99), 'max', s[s.length - 1].toFixed(1), 'ms | over 25 ms', times.filter((x) => x > 25).length, 'over 33', times.filter((x) => x > 33).length, 'over 50', times.filter((x) => x > 50).length, '| kills', kills);
log('SLOW FRAMES [frame, ms, kills so far, ragdolls awake, blood drops]', JSON.stringify(ctx));
const inSlow = (t) => slow.some(([a, c]) => t >= a && t <= c);
const nm = (fi) => { const fr = tr.frames[fi]; return (fr.name || '(anon)') + ':' + (fr.line || 0) + (fr.resourceId != null && !/main\.js/.test(tr.resources[fr.resourceId] || '') ? '@' + (tr.resources[fr.resourceId] || '').split('/').pop() : ''); };
const tally = (pred) => { const self = new Map(), incl = new Map(); let tot = 0;
  for (const sm of tr.samples) { if (sm.stackId == null || !pred(sm.timestamp)) continue; tot++;
    const k = nm(tr.stacks[sm.stackId].frameId); self.set(k, (self.get(k) || 0) + 1);
    const seen = new Set(); for (let id = sm.stackId; id != null; id = tr.stacks[id].parentId) { const kk = nm(tr.stacks[id].frameId); if (!seen.has(kk)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + 1); } } }
  const top = (m, n) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => k + ' ' + v);
  return { tot, self: top(self, 25), incl: top(incl, 40) }; };
const A = tally(inSlow); log('IN SLOW FRAMES samples', A.tot); log('SELF', JSON.stringify(A.self)); log('INCL', JSON.stringify(A.incl));
{ const seen = new Map(); b.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.noBake && o.parent === b.scene) { const M = o.material, c = (x) => (x && x.isColor ? x.getHexString() : '-'); const k = [M.type, c(M.color), c(M.emissive), M.emissiveIntensity, M.map ? 'map' : '-', M.roughness, M.transparent, M.opacity, M.side, M.flatShading, M.vertexColors, M.name].join('|'); seen.set(k, (seen.get(k) || 0) + 1); } });
  log('RUBBLE MATERIALS', seen.size, JSON.stringify([...seen.entries()].sort((a, c) => c[1] - a[1]).slice(0, 12))); }
const B = tally(() => true); log('ALL FRAMES samples', B.tot); log('ALL SELF', JSON.stringify(B.self)); log('ALL INCL', JSON.stringify(B.incl));
