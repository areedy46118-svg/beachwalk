/* A SCAN OF THE CASTLE AS IT STANDS (2026-11-25, the owner: "give a scan of all this new stuff … try the fight at the castle"). The
 * first castle booted, its props built, the fight on:
 *  1. CLIPS: for every man (and the paladin) each clip his kind asks for — his gaits, his anim, his aliases, every attack's — that he
 *     does not have (`mutPlay` on a missing name is a silent no-op but for one warning a session);
 *  2. INSTANCES: every InstancedMesh in the scene whose count is over its buffers (the GL "Vertex buffer is not big enough" error);
 *  3. PROPS: the kinds the scenes name that were never made; the site's props by kind;
 *  4. THE FIGHT, 40 s, you cutting and kicking: real ms a frame (median, p95, worst), draw calls and triangles, console errors;
 *  5. stills from your eye (`&shots=1`).
 *   PB_PORT=4243 PB_WAIT=1500 sh tools/probe.sh 'evalFile&f=/tools/scan.js&shots=1' <out> */
const Q = new URLSearchParams(location.search);
const errs = []; w.addEventListener('error', (e) => errs.push('ERROR ' + e.message)); { const ow = w.console.warn, oe = w.console.error; w.console.warn = (...a) => { errs.push('warn ' + a.map(String).join(' ').slice(0, 160)); ow.apply(w.console, a); }; w.console.error = (...a) => { errs.push('error ' + a.map(String).join(' ').slice(0, 160)); oe.apply(w.console, a); }; }
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { b.frame(2); await sleep(30); }
w.__clockOn();
// 1. clips
{ const DK = b.dkSlotS().unit, all = units().concat(DK ? [DK] : []), miss = {};
  for (const u of all) { if (!u.clips) continue; const K = u.kind, want = new Set();
    for (const L of Object.values(K.gaits || {})) for (const n of L) want.add('gait:' + n);
    for (const [k, n] of Object.entries(K.anim || {})) if (typeof n === 'string') want.add('anim.' + k + ':' + n);
    for (const k of ['roar', 'roar2', 'hit', 'idle', 'idle2', 'walk2', 'run2', 'strafeL', 'strafeR', 'calm', 'die2']) want.add('name:' + k);
    for (const [k, A] of Object.entries(u.atk || {})) want.add('atk ' + k + ':' + (A.clip || k));
    for (const k of ['knockClip', 'riseClip', 'stunClip', 'first']) if (K[k]) want.add(k + ':' + K[k]);
    for (const wn of want) { const n = wn.split(':')[1]; if (!u.clips[n] && !(wn.startsWith('gait:'))) (miss[wn] || (miss[wn] = new Set())).add(u.kindName); }
    const g = Object.entries(K.gaits || {}).filter(([k, L]) => !L.some((n) => u.clips[n])); for (const [k] of g) (miss['gait ' + k + ' (none of its pool)'] || (miss['gait ' + k + ' (none of its pool)'] = new Set())).add(u.kindName); }
  const rows = Object.entries(miss).map(([k, s]) => k + ' ← ' + [...s].slice(0, 6).join(',') + (s.size > 6 ? ' +' + (s.size - 6) : ''));
  log('1 CLIPS missing:', rows.length ? rows.join(' | ') : 'none'); }
// 2. instances
{ const bad = []; let n = 0;
  b.scene.traverse((o) => { if (!o.isInstancedMesh) return; n++; const im = o.instanceMatrix, ic = o.instanceColor;
    const g = o.geometry, pc = g.attributes.position ? g.attributes.position.count : 0; let mx = -1; if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) if (a[i] > mx) mx = a[i]; }
    const short = Object.entries(g.attributes).filter(([k, a]) => !a.isInstancedBufferAttribute && a.count < pc).map(([k, a]) => k + ' ' + a.count);
    const inst = Object.entries(g.attributes).filter(([k, a]) => a.isInstancedBufferAttribute && a.count < o.count).map(([k, a]) => k + ' ' + a.count);
    if (o.count > im.count || (ic && ic.count < o.count) || mx >= pc || short.length || inst.length) bad.push(`${o.name || '?'}/${o.parent && o.parent.name || '?'} count ${o.count} matrix ${im.count} colour ${ic ? ic.count : '-'} verts ${pc} maxIndex ${mx} short[${short}] inst[${inst}]`); });
  log('2 INSTANCES', n, 'instanced meshes | over their buffers:', bad.length ? bad.join(' || ') : 'none'); }
// 3. props
{ const site = b.CP.sites.fort, by = {}; for (const P of site.props) by[P.kind.name] = (by[P.kind.name] || 0) + 1;
  log('3 PROPS', site.props.length, 'in', site.placed.length, 'scenes:', site.placed.map((p) => p.scene).join(','), '|', Object.entries(by).map(([k, v]) => k + '×' + v).join(' '), '| kinds made', Object.keys(b.CP.kinds).length); }
// 4. the fight
b.settings.devMode = false;
w.__cpWhy = [];
const kat = b.katanaItem; b.addToInventory(kat); if (b.state().equipped !== kat.name) b.toggleEquip(kat);
const cam = b.camera.position, home = [cam.x, cam.z], T = [], R = b.renderer; let kicks = 0, kickHits = 0, downs = 0, hurts = 0, kills = 0, calls = [], tris = [];
const alive0 = units().filter((u) => u.st.alive).length;
R.info.autoReset = false; let kickKills = 0, idle = 0; const stuck = [], solids = b.CP.sites.fort.props.filter((q) => q.kind.K.solid || q.kind.K.fixed), broke0 = b.CP.sites.fort.props.filter((q) => q.dead).length;
const SECS = +(Q.get('secs') || 40);
for (let f = 0; f < SECS * 60; f++) {
  const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
  let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
  if (tgt) b.lookAt(tgt.g.position.x, tgt.g.position.y + 1.2, tgt.g.position.z);
  if (tgt && bd < 2.4 && f % 75 === 0) b.startDig(0);
  if (tgt && bd < 2.2 && f % 130 === 60) { b.KICK.lastHit = null; if (b.startKick()) kicks++; }
  const hp0 = b.state().hp; R.info.reset(); const t0 = performance.now(); w.__adv(1); T.push(performance.now() - t0);
  if (b.KICK.lastHit) { kickHits++; if (b.KICK.lastHit.down) downs++; if (b.KICK.lastHit.killed) kickKills++; b.KICK.lastHit = null; }
  cam.x = home[0]; cam.z = home[1]; if (b.state().hp < hp0) hurts++; b.heal();
  if (f % 20 === 0) { calls.push(R.info.render.calls); tris.push(R.info.render.triangles); }
  // (a man held by a thing he cannot break: out, alive, on his feet, further than 3.5 m from you, not moved 0.2 m in 4 s, and against a solid prop)
  if (f % 240 === 0) { for (const u of us) { const p = u.g.position, o = u.__scanP; const far = Math.hypot(p.x - cam.x, p.z - cam.z) > 3.5;
      if (o && far && !(u.st.down > 0) && Math.hypot(p.x - o.x, p.z - o.z) < 0.2) { const P = solids.find((q) => !q.dead && Math.hypot(q.x - p.x, q.z - p.z) < q.kind.r + 0.9); if (P) stuck.push(u.kindName + ' by ' + P.kind.name + ' at ' + (f / 60).toFixed(0) + ' s'); else idle++; }
      u.__scanP = { x: p.x, z: p.z }; } }
  if (Q.get('shots') && [300, 700, 1100, 1500, 1900, 2300].includes(f)) { R.render(b.scene, b.camera); shot('fight_' + f, 640, 1.0); }
}
kills = alive0 - units().filter((u) => u.st.alive).length;
T.sort((a, c) => a - c); const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
log('4 FIGHT', SECS, 's | frame ms median', T[T.length >> 1].toFixed(1), 'p95', T[(T.length * 0.95) | 0].toFixed(1), 'worst', T[T.length - 1].toFixed(1), '| draw calls median', med(calls), 'max', Math.max(...calls), '| triangles median', med(tris), '| hurts', hurts, 'kills', kills, '| kicks', kicks, 'struck', kickHits, 'put down', downs, 'killed', kickKills);
log('4b WALKERS held against a solid prop:', stuck.length ? stuck.join(' | ') : 'none', '| standing off elsewhere', idle, '| props broken in the fight', b.CP.sites.fort.props.filter((q) => q.dead).length - broke0, '| solid ones broken', solids.filter((q) => q.dead).map((q) => q.kind.name).join(',') || 'none');
log('4b WHAT BROKE THEM:', w.__cpWhy.filter((x) => /^(BODY|mp(Stall|Well|Fountain|Tree))/.test(x)).join(' | ') || '-', '|| all:', [...new Set(w.__cpWhy.map((x) => x.split(' ').slice(2).join(' ')))].join(' | '));
// 4c. the boot on a body: the nearest body that has come to rest, stood over, kicked — how far its hips went, and that it rests again
{ const dead = units().filter((u) => u.rag && u.g.visible && u.rag.parts.length && u.rag.asleep);
  if (!dead.length) log('4c BODY KICK: no body at rest to kick');
  else for (const u of dead.slice(0, 4)) { const H = u.rag.byName.Character1_Hips || u.rag.parts[0], h0 = H.p.clone();
    b.settings.devMode = true;
    for (const m of units()) if (m.st.alive) m.cpAlly = true;   // (the living stand aside for this one: the kick takes a man before a body)
    const put = () => { cam.set(h0.x, h0.y + 1.55, h0.z + 1.0); b.camBaseY = cam.y; b.lookAt(h0.x, h0.y, h0.z); };
    for (let i = 0; i < 50; i++) { put(); w.__adv(1); } b.KICK.cd = 0; b.KICK.lastBody = null; b.KICK.lastHit = null; w.__kickDbg = []; const ok = b.startKick();
    for (let i = 0; i < 240; i++) { put(); w.__adv(1); }
    log('4c BODY KICK: kicked', ok, 'took it', b.KICK.lastBody === u, '| hips moved', Math.hypot(H.p.x - h0.x, H.p.z - h0.z).toFixed(2), 'm | at rest again', !!u.rag.asleep, '| a living man took it instead', !!b.KICK.lastHit, '| dbg', w.__kickDbg.filter((x) => typeof x === 'string').slice(-3).join(' ; '), '| lowest joint over its floor', Math.min(...u.rag.parts.map((q) => q.p.y - q.r - (q.floor ?? 0))).toFixed(2)); if (b.KICK.lastBody === u) break; } }
log('5 CONSOLE:', errs.length ? [...new Set(errs)].slice(0, 12).join(' | ') : 'clean');
log('DONE');
