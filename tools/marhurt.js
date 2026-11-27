/* DOES THE MARIONETTE GET HIT (2026-11-25, the owner: "THE MARIONETTE RARELY TAKES DAMAGE I FEEL LIKE"). Him with you, a few
 * creatures (`&kinds=runt,runt,farmer`) held on him (`marAggT` far off, you 12 m away), for `&secs=` of the game's clock: each
 * one's blows at him — how many reached their contact, how near and facing they were there, how many took health off him.
 *   PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/marhurt.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), KINDS = (Q.get('kinds') ?? 'runt,runt,farmer').split(',').filter(Boolean), SECS = +(Q.get('secs') || 30);
b.settings.devMode = false;
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(1500);
const C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { b.frame(1); await sleep(30); }
const M = b.MAR.u; M.st.hp = M.kind.hp;
const E = KINDS.map((k, i) => { try { return b.makeMutant(4 + i * 1.4, -404, k, 0); } catch (e) { log('no kind', k, e.message); return null; } }).filter(Boolean);
for (let i = 0; i < 400 && !E.every((e) => e.model && !e.parLate); i++) { b.frame(1); await sleep(15); for (const e of E) if (e.parLate) try { if (e.parLate()) e.parLate = null; } catch (er) {} }
const CR = [...Array(+(Q.get('crabs') || 0))].map((_, i) => { const c = b.makeCrabUnit(5 + i * 1.2, -403); c.st.awake = true; c.st.hp = 999; return c; });   // (&crabs=n: the beach's own)
const S = E.map((e) => ({ k: e.kind.file || '?', swings: 0, contacts: 0, near: 0, facing: 0, d: [] }));
const FREE = Q.get('free') === '1';   // (&free=1: nothing held — they come at you as a fight does, and the game shares them out)
const HPF = b.hpS();   // (no dev mode: in it nothing swings at you. Your health is put back after every frame instead, `setHp`)
for (const e of E) { e.st.awake = true; e.st.hp = 999; if (!FREE) { e.st.foe = M; e.st.mine = false; e.st.marAggT = 1e12; } }
C.position.set(6, 1.7, FREE ? -401 : -388);
let onHim = 0, frames = 0, yourHits = 0, yourLost = 0;
const prev = E.map(() => -1), was = E.map(() => 0);
let hp0 = M.st.hp, hits = 0, lost = 0;
w.__clockOn();
for (let f = 0; f < SECS * 60; f++) {
  for (const e of E) { if (e.st.alive) { if (!FREE) { e.st.foe = M; e.st.marAggT = 1e12; } e.st.hp = 999; } }
  for (const c of CR) { c.st.hp = 999; c.st.awake = true; }
  for (const e of E) { frames++; if (e.st.foe === M) onHim++; }
  if (M.st.hp < 8) M.st.hp = M.kind.hp;   // (real health, put back before it could kill him: every drop is a blow)
  const h0 = M.st.hp;
  w.__adv(1);
  if (f % 6 === 0) await sleep(1);
  if (M.st.hp < h0) { hits++; lost += h0 - M.st.hp; }
  if (b.hpS() < HPF) { yourHits++; yourLost += HPF - b.hpS(); b.setHp(HPF); }
  E.forEach((e, i) => {
    const a = e.st.atk, A = e.atk && e.atk[e.st.swing];
    if (a >= 0 && prev[i] < 0) S[i].swings++;
    if (A && a >= 0 && was[i] < A.wind && a >= A.wind) {
      S[i].contacts++;
      const d = Math.hypot(M.g.position.x - e.g.position.x, M.g.position.z - e.g.position.z);
      S[i].d.push(+d.toFixed(2));
      if (d < ((e.kind.h || 1.8) > 1.4 ? 1.9 : 1.4)) S[i].near++;
      if (b.blowFacingS ? b.blowFacingS(e) : true) S[i].facing++;
    }
    prev[i] = a; was[i] = a >= 0 ? a : 0;
  });
}
for (const s of S) log(s.k, 'swings', s.swings, 'contacts', s.contacts, 'near', s.near, 'facing', s.facing, 'dists', s.d.slice(0, 14).join(' '));
log('his health lost', lost, 'in', hits, 'blows over', SECS, 's; his foe', M.st.foe ? (M.st.foe.kind.file || '?') : 'none', 'his kind poise', M.kind.poise, 'block', M.kind.block);
log('on him', (100 * onHim / Math.max(1, frames)).toFixed(0) + '% of the time; blows on you', yourHits, 'health', yourLost, JSON.stringify(b.MAR.bal || {}));
log('DONE');
