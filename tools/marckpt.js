/* THE MARIONETTE THROUGH A CHECKPOINT LOAD (2026-11-25, the owner: "the marionette didnt respawn too when reloading checkpoint each
 * checkpoint should save exactly where you left off when getting it companion and everything"). Him out of the washer and at your
 * side (`marRestore('with')`, a little hurt), then a checkpoint: `&where=fort` (default) walks into the first castle the way
 * `fortEntryRestore` does (its own autosave), `&where=beach` saves on the sand (`saveCheckpoint`). Then the save's marionette
 * fields, the reload (`beachwalk.load` = checkpoint), and every quarter second for 12 s: is he made, drawn, where, how hurt.
 *   PB_PORT=4231 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/marckpt.js' <out> */
const Q = new URLSearchParams(location.search), WHERE = Q.get('where') || 'fort';
for (let k = 0; k < 300 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(30); }
b.settings.devMode = false;
const marOut = async (B, lab) => {
  for (let i = 0; i < 300 && !(B.MAR.u && B.MAR.u.model && !B.MAR.u.marPend); i++) { B.frame(1); await sleep(30); }
  const s = B.marS(); log(lab, 'st', s.st, 'made', s.u, 'drawn', s.vis, 'hp', s.hp, 'at', JSON.stringify(s.at), 'you', B.camera.position.toArray().map((v) => +v.toFixed(1)).join(','));
};
if (WHERE === 'beach') {
  b.camera.position.set(6, 1.7, -300); b.camBaseY = 1.7;
  b.setCelWash(2); b.marRestore('with');
  await marOut(b, 'with you');
  b.MAR.u.st.hp = 17; for (let i = 0; i < 5; i++) b.frame(1);
  b.saveCheckpoint();
} else {
  b.setCelWash(2); b.marRestore('with');
  await marOut(b, 'with you');
  b.MAR.u.st.hp = 17; for (let i = 0; i < 5; i++) b.frame(1);
  b.loadFort();
  for (let i = 0; i < 120 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.frame(1); await sleep(250); }
  b.skipTakes(); b.placeOutOfFort('gate'); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(100); }
  b.skipTakes(); b.startFort(1); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(60); }
  log('in fort', b.roomFlags().inFort, 'save room', b.devRoom());
  const s = b.marS(); log('before the load: st', s.st, 'made', s.u, 'drawn', s.vis, 'hp', s.hp, 'at', JSON.stringify(s.at));
}
let sv = null; try { sv = JSON.parse(localStorage.getItem('beachwalk.save')); } catch (e) { /* */ }
const F = sv && (sv.flags || sv);
log('SAVE room', sv && sv.room, 'marSt', F && F.marSt, 'marHp', F && F.marHp, 'marWait', JSON.stringify(F && F.marWait), 'celWash', F && F.celWash);
const f = document.querySelector('iframe');
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
f.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.marS) break; } catch (e) {} }
const B = w2.__bw; let prev = '';
for (let s2 = 1; s2 <= 48; s2++) {
  await sleep(250);
  const s = B.marS(), c = B.camera.position, d = s.at ? Math.hypot(s.at[0] - c.x, s.at[2] - c.z).toFixed(1) : '-';
  const cur = `st ${s.st} made ${s.u} model ${s.model} drawn ${s.vis} hp ${s.hp} d ${d}`;
  if (cur !== prev || s2 === 48) { log('after', (s2 / 4) + ' s', cur, 'inFort', B.roomFlags().inFort); prev = cur; }
}
const mu = B.MAR.u; log('end: castle kit asked', B.CP && B.CP.asked, 'ready', B.CP && B.CP.ready, '| his glb', mu && mu.kind.glb, 'units still bodiless within 100 m', B.mutants ? B.mutants.filter((u) => !u.retired && !u.model && Math.hypot(u.g.position.x - B.camera.position.x, u.g.position.z - B.camera.position.z) < 100).map((u) => (u.kind.glb || '').split('/').pop()).join(',') : '?');
log('DONE');
