/* MYLES AFTER A FIRST-CASTLE CHECKPOINT (2026-11-26, the owner: "myles went invisible" — "First castle"). The first castle, its
 * fight on, him at your side; 8 s, a checkpoint saved there; the game reloaded as a checkpoint load (the owner's way back in);
 * then 40 s, the camera kept on where he should be: is he placed, is his group shown, are his meshes drawn, what stage and place
 * he is in — and if he is not drawn, every flag that can turn him off. `&kick=1` / `&hurt=1` on the second half too.
 * The probe's own profile (its own localStorage): never the owner's save.
 *   PB_PORT=4241 PB_WAIT=1200 sh tools/probe.sh 'evalFile&f=/tools/minoload.js' <out> */
const ev = async (ww, f) => ww.eval(await (await fetch(f + '?' + Date.now())).text());
await ev(w, '/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
let M = b.MINO;
for (let i = 0; i < 200 && !M.u; i++) { b.frame(2); await sleep(50); }
if (!M.u) { log('no minotaur was placed'); return; }
M.stage = 'with'; M.ally = true; M.place = '?';
for (let i = 0; i < 8 * 60 / 4; i++) { b.frame(4); await sleep(5); }
log('before the save | stage', M.stage, 'place', M.place, '| g.visible', M.u.g.visible, '| in fort', b.state().inFort);
b.saveCheckpoint();
const sv = JSON.parse(w.localStorage.getItem('beachwalk.save') || '{}');
log('saved | mino in the save', JSON.stringify(sv.mino || sv.minotaur || sv.mn || Object.keys(sv).filter((k) => /mino|myles/i.test(k))));
// the checkpoint load: as the game does it for a reload it asked for
w.sessionStorage.setItem('beachwalk.load', 'checkpoint'); w.sessionStorage.setItem('beachwalk.skipIntro', '1');
const fr = document.getElementById('g'); fr.contentWindow.location.reload();
await sleep(1500);
let W2 = null; for (let i = 0; i < 120; i++) { await sleep(250); try { W2 = fr.contentWindow; if (W2.__bw && W2.__bw.state) break; } catch (e) {} }
const B = W2.__bw; for (let i = 0; i < 80 && !B.state().started; i++) { try { B.beginGame(); } catch (e) {} await sleep(250); }
try { W2.document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; }); B.audioCtx.resume = () => Promise.resolve(); await B.audioCtx.suspend(); } catch (e) {}
const errs = []; W2.addEventListener('error', (e) => errs.push(String(e.message).slice(0, 160)));
for (let i = 0; i < 1200 && !(B.restoreS && B.restoreS().bootHold <= 0); i++) { B.frame(4); await sleep(20); }
log('loaded | black lifted', B.restoreS && B.restoreS().bootHold <= 0, '| in fort', B.state().inFort);
await ev(W2, '/tools/burntest.js'); W2.__clockOn();
M = B.MINO;
const Q = new URLSearchParams(location.search), T = B.THREE;
const drawn = (u) => { if (!u.g.visible) return 0; let n = 0; u.g.traverse((o) => { if (!o.isMesh || o.name === 'hitProxy') return; for (let a = o; a; a = a.parent) if (a.visible === false) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.visible !== false && !(m.transparent && m.opacity < 0.05)) n++; }); return n; };
let lost = 0, firstLost = null, nMax = 0;
for (let f = 0; f < 60 * 40; f++) {
  const u = M.u;
  if (u) { let hips = u.hipsB || (u.model && (u.hipsB = (() => { let h = null; u.model.traverse((o) => { if (!h && o.isBone && /hips|pelvis/i.test(o.name)) h = o; }); return h; })())); const hp = hips ? hips.getWorldPosition(new T.Vector3()) : u.g.position; B.lookAt(hp.x, hp.y, hp.z); }
  if (u && f > 60 * 20 && Q.get('kick') && f % 120 === 0 && B.kickS) { try { B.kickS(); } catch (e) {} }
  if (u && f > 60 * 20 && Q.get('hurt') && f % 90 === 0) { try { B.hurtMutantS ? B.hurtMutantS(u, 3) : null; } catch (e) {} }
  W2.__adv(1);
  if (f % 30 === 0) {
    const n = u ? drawn(u) : -1; nMax = Math.max(nMax, n);
    if (n < Math.max(1, nMax)) { lost++; if (!firstLost) { firstLost = (f / 60).toFixed(1);
      log('NOT DRAWN at', firstLost, 's | placed', !!u, u && JSON.stringify({ stage: M.stage, place: M.place, ally: M.ally, gVis: u.g.visible, modelVis: u.model && u.model.visible, alive: u.st.alive, retired: !!u.retired, tex: u.texW && u.texW.compiled, texAsked: u.texW && u.texW.asked, mixer: !!u.mixer, pending: u.clipsPending, restored: !!M.restored, at: u.g.position.toArray().map((v) => +v.toFixed(1)), you: B.camera.position.toArray().map((v) => +v.toFixed(1)), inFort: B.state().inFort, inRoom: B.state().inRoom })); } }
    if (f % 600 === 0) log('t', (f / 60).toFixed(0), '| placed', !!u, '| drawn meshes', n, '| stage', M.stage, 'place', M.place, u ? '| dist ' + Math.hypot(u.g.position.x - B.camera.position.x, u.g.position.z - B.camera.position.z).toFixed(1) : '');
  }
}
log('half-seconds not fully drawn', lost, 'of 80 | first at', firstLost, '| errors', JSON.stringify(errs.slice(0, 3)));
log('DONE');
