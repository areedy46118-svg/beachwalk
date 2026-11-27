/* THE TAVERN'S FIGHT, READ (2026-11-26, the owner: "the drunk in the tavern needs better animations i cant read him and they dont connect
 * and the farmers in there should punch cuz they have no weapons they barely hit me. the tavern was lagging very bad as well").
 * In the tavern, the bar's own scene held; then `&who=` drinkers | dancers | drunk | all provoked at you, you standing in the hall,
 * healed and pinned, `&secs=`: per attacker the swings he threw (by name), the ones that hurt you, his nearest approach; and the
 * frame's real ms (median, p95, worst) through it, with the draw calls.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/tavfight.js&who=drinkers&secs=40' <out> */
const Q = new URLSearchParams(location.search), WHO = Q.get('who') || 'all', SECS = +(Q.get('secs') || 40);
await (async () => { w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.eval(await (await fetch('/tools/tavdrink.js?' + Date.now())).text()); })();
const sit = await w.__tavSetup(); log('in the tavern, drinkers', JSON.stringify(sit), 'dancers', b.tavDancers.length, 'drunk', !!b.drunkUnit);
w.__clockOn(); b.settings.devMode = false;
const C = b.camera, R = b.renderer;
const foes = [];
if (WHO === 'drinkers' || WHO === 'all') foes.push(...b.tavDrinkers);
if (WHO === 'dancers' || WHO === 'all') foes.push(...b.tavDancers);
if ((WHO === 'drunk' || WHO === 'all') && b.drunkUnit) foes.push(b.drunkUnit);
// stand in the hall's middle, between them
let cx = 0, cz = 0; for (const u of foes) { cx += u.g.position.x; cz += u.g.position.z; } cx /= foes.length || 1; cz /= foes.length || 1;
if (foes.length === 1) { const D = b.tavDancers; cx = (D[0].g.position.x + D[1].g.position.x) / 2; cz = (D[0].g.position.z + D[1].g.position.z) / 2 - 2.5; }   // (one man: the open floor in front of the dancers — beside the bar he could not reach you and circled)
const home = [cx, cz], y0 = C.position.y;
for (const u of foes) { try { if (u.kind.provoke) u.kind.provoke(u); else b.tavProvoke(u); } catch (e) { log('provoke failed', u.kindName, e.message); } u.st.awake = true; u.lastHitMine = true; }
const stat = new Map(foes.map((u) => [u, { sw: {}, hurt: 0, near: 99 }]));
const T = [], calls = [], gaps = []; R.info.autoReset = false; let hurts = 0, lastSw = new Map();
for (let f = 0; f < SECS * 60; f++) {
  C.position.x = home[0]; C.position.z = home[1];
  let tg = null, bd = 99; for (const u of foes) { if (!u.st.alive) continue; const d = Math.hypot(u.g.position.x - home[0], u.g.position.z - home[1]); stat.get(u).near = Math.min(stat.get(u).near, d); if (d < bd) { bd = d; tg = u; } }
  if (tg) b.lookAt(tg.g.position.x, tg.g.position.y + 1.4, tg.g.position.z);
  const hp0 = b.state().hp; R.info.reset(); const t0 = performance.now(); w.__adv(1); T.push(performance.now() - t0);
  if (f % 20 === 0) calls.push(R.info.render.calls);
  for (const u of foes) { const sw = u.st.atk >= 0 ? u.st.swing : null; if (sw && lastSw.get(u) !== sw + ':' + (u.st.swingN || 0) && u.st.atk < 0.1) { lastSw.set(u, sw + ':' + (u.st.swingN || 0)); const S = stat.get(u); S.sw[sw] = (S.sw[sw] || 0) + 1; } if (u.st.atk < 0) lastSw.set(u, null); }
  if (b.state().hp < hp0) {
    // (what of him was nearest you when it landed: his hands, his head, his feet — the "they dont connect" number)
    let gap = 99, part = '-';
    for (const u of foes) { if (!(u.st.atk >= 0) || !u.model) continue; u.model.traverse((o) => { if (!o.isBone || !/hand|head|foot|Hand|Head|Foot/.test(o.name) || /finger|thumb|index|middle|ring|pinky|Index|Middle|Ring|Pinky|Thumb|toe|Toe/.test(o.name)) return; const p = o.getWorldPosition(new b.THREE.Vector3()); const d = Math.hypot(p.x - C.position.x, p.z - C.position.z, Math.max(0, Math.abs(p.y - (C.position.y - 0.5)) - 0.5)); if (d < gap) { gap = d; part = o.name; } }); }
    gaps.push(gap); if (gaps.length <= 8) log('  hurt at', (f / 60).toFixed(2), 's: nearest of him', gap.toFixed(2), 'm', part);
    hurts++; let who = null, bw = 99; for (const u of foes) { if (u.st.atk >= 0) { const d = Math.hypot(u.g.position.x - home[0], u.g.position.z - home[1]); if (d < bw) { bw = d; who = u; } } } if (who) stat.get(who).hurt++; }
  b.heal();
  if (f % 300 === 299) for (const u of foes) { const S2 = u.st; log('  t', (f / 60).toFixed(0), u.kindName, 'dist', Math.hypot(u.g.position.x - home[0], u.g.position.z - home[1]).toFixed(2), 'atk', (S2.atk ?? 0).toFixed(2), 'cool', (S2.cool || 0).toFixed(2), 'foe', S2.foe ? (S2.foe.kindName || 'thing') : '-', 'awake', !!S2.awake, 'stun', (S2.stun || 0).toFixed(1), 'flee', !!S2.flee, 'clip', u.cur ? u.cur.getClip().name : '-', 'hp', S2.hp, '| turn held by', (() => { const t = b.mutTokenS(); return t ? t.kindName + (t === u ? ' (him)' : ' alive ' + t.st.alive + ' awake ' + !!t.st.awake + ' atk ' + (t.st.atk ?? 0).toFixed(1)) : 'nobody'; })(), '| maxReach', (u.maxReach || 0).toFixed(2)); }
}
T.sort((a, c) => a - c); const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const [u, S] of stat) log(u.kindName, '| alive', u.st.alive, '| swings', JSON.stringify(S.sw), '| hurt you', S.hurt, '| nearest', S.near.toFixed(2), 'm');
log('FIGHT', SECS, 's | hurts', hurts, '| frame ms median', T[T.length >> 1].toFixed(1), 'p95', T[(T.length * 0.95) | 0].toFixed(1), 'worst', T[T.length - 1].toFixed(1), '| over 33 ms', T.filter((x) => x > 33).length, '| draw calls median', med(calls), 'max', Math.max(...calls));
if (gaps.length) { gaps.sort((x, y) => x - y); log('CONTACT at the hurt: median', gaps[gaps.length >> 1].toFixed(2), 'm, worst', gaps[gaps.length - 1].toFixed(2), 'm, over 0.6 m', gaps.filter((g) => g > 0.6).length, 'of', gaps.length); }
log('DONE');
