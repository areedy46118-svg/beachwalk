/* DOES THE MARIONETTE FIGHT (2026-11-22, the owner: "the marionette should always try and fight enemies he just stand there
 * alot"): the first castle's fight with him beside you, 40 s on the real clock, you stood still in the street — each second:
 * his foe (and how far), awake farmers within 18 m of you, whether he moved, and a blow thrown.  PB_PORT=4246 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/marfight.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
b.settings.devMode = false; const keepAlive = setInterval(() => { try { b.setHp(4); } catch (e) {} }, 300);
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 400 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { await sleep(50); }
const M = b.MAR.u, C = b.camera; log('marionette', !!M);
let last = M.g.position.clone(), idle = 0, foeless = 0, rows = [];
for (let s = 0; s < 40; s++) {
  let atk = 0; for (let k = 0; k < 10; k++) { await sleep(100); if (M.st.atk >= 0) atk++; if (M._dbg && M._dbg.dist < 2.3 && !w.__mfShown) { w.__mfShown = (w.__mfShown || 0); log('CLOSE', JSON.stringify(M._dbg), 'wantSwing?', JSON.stringify({ wait: M.st.wait, recover: M.st.recover, stun: M.st.stun, down: M.st.down, swing: M.st.swing, roar: M.st.roar, ready: M.st.ready, struck: M.st.struck, cool: M.st.cool, holdAnim: M.holdAnim, mine: M.st.mine, token: b.mutTokenS ? b.mutTokenS() === M : '?' })); w.__mfN = (w.__mfN || 0) + 1; if (w.__mfN > 4) w.__mfShown = 1; } }
  const P = M.g.position, moved = P.distanceTo(last); last = P.clone();
  const near = b.mutants.filter((f) => f !== M && f.st && f.st.alive && !f.retired && f.g.visible && Math.hypot(f.g.position.x - C.position.x, f.g.position.z - C.position.z) < 18);
  const awake = near.filter((f) => f.st.awake).length, F = M.st.foe, onHim = near.filter((f) => f.st.foe === M).length; w.__onHim = (w.__onHim || 0) + onHim; w.__awSum = (w.__awSum || 0) + awake;
  const fd = F ? Math.hypot(F.g.position.x - P.x, F.g.position.z - P.z) : -1;
  if (!F && near.length) foeless++; if (moved < 0.2 && atk === 0) idle++;
  rows.push(`on him ${onHim} ${s}:${F ? (F.kind.name || F.kind.glb || '?').toString().slice(-10) + '@' + fd.toFixed(1) : '-'} near ${near.length}/${awake}aw mv ${moved.toFixed(1)} atk ${atk}`);
}
log(rows.slice(0, 20).join(' | ')); log(rows.slice(20).join(' | '));
log('on him, mean', (w.__onHim / 40).toFixed(2), 'of awake', (w.__awSum / 40).toFixed(2), JSON.stringify(b.MAR.bal), '| seconds with enemies near but no foe', foeless, '| seconds neither moving nor swinging', idle, '| his hp', M.st.hp.toFixed(2));
{ const seen = {}; let atkF = 0; const hp0 = b.mutants.filter((f) => f !== M && f.st && f.st.alive).reduce((s, f) => s + f.st.hp, 0);
  for (let i = 0; i < 300; i++) { await sleep(16); const c = M.cur ? (M.cur.getClip ? M.cur.getClip().name : String(M.cur)) : '-'; seen[c] = (seen[c] || 0) + 1; if (M.st.atk >= 0) atkF++; }
  const hp1 = b.mutants.filter((f) => f !== M && f.st && f.st.alive).reduce((s, f) => s + f.st.hp, 0);
  log('5 s close up: frames with atk>=0', atkF, '| clips', JSON.stringify(seen).slice(0, 300), '| swing', M.st.swing, 'atk', M.st.atk, 'wait', M.st.wait, 'cool', M.st.cool, '| holdAnim', M.holdAnim, '| foes hp', hp0.toFixed(1), '->', hp1.toFixed(1), '| foe dist', M.st.foe ? Math.hypot(M.st.foe.g.position.x - M.g.position.x, M.st.foe.g.position.z - M.g.position.z).toFixed(2) : '-'); }
