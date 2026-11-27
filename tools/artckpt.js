/* THE WATER ARTIFACT THROUGH A CHECKPOINT LOAD (2026-11-25, the owner: "my water artifact disappeared reloading a checkpoint how many
 * time do i have to say leave everything as is was when you get the checkpoint"). The Artifact of the Sea set in the katana —
 * `&how=world` taken off the sand the way the world gives it (`seaLay` + its pickup), `&how=dev` handed over by dev mode
 * (`devGrantWeapons`) — then a checkpoint on the sand (`saveCheckpoint`), the save's sea fields, the reload the way a death or the
 * menu does it (`beachwalk.load` = checkpoint), and what the katana carries 2, 5 and 9 s after.
 *   PB_PORT=4231 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/artckpt.js&how=dev' <out> */
const Q = new URLSearchParams(location.search), HOW = Q.get('how') || 'world';
for (let k = 0; k < 300 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(30); }
b.camera.position.set(6, 1.7, -300); b.camBaseY = 1.7;
const kat = b.katanaItem;
if (HOW === 'dev') { b.settings.devMode = true; b.devGrantWeapons(); for (let i = 0; i < 5; i++) b.frame(1); }
else {
  b.settings.devMode = false; b.addToInventory(kat);
  b.seaLay(7, -301); for (let i = 0; i < 10; i++) b.frame(1);
  const it = b.interactables.find((x) => /Artifact of the Sea/.test(typeof x.label === 'function' ? x.label() : x.label || ''));
  log("pickup", !!it); if (it && it.onActivate) it.onActivate();
}
if (!b.inventory.includes(kat)) b.addToInventory(kat);
log('attach', b.attachArtifact(b.seaArtItem, kat), '| on katana', kat.artifact === b.seaArtItem, '| sea state', b.seaS().state, '| dev', b.settings.devMode);
for (let i = 0; i < 5; i++) b.frame(1);
b.saveCheckpoint();
let sv = null; try { sv = JSON.parse(localStorage.getItem('beachwalk.save')); } catch (e) { /* */ }
const F = sv && (sv.flags || sv);
log('SAVE seaRelic', F && F.seaRelic, 'seaRelicOn', F && F.seaRelicOn, '| pack has the katana', !!(sv && (sv.pack || []).includes(kat.name)), 'the artifact', !!(sv && (sv.pack || []).includes(b.seaArtItem.name)));
const fr = document.querySelector('iframe');
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
fr.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = fr.contentWindow; if (w2.__bw && w2.__bw.katanaItem) break; } catch (e) {} }
const B = w2.__bw;
for (const t of [2, 5, 9]) {
  await sleep(t === 2 ? 2000 : t === 5 ? 3000 : 4000);
  const k2 = B.katanaItem, inv = B.inventory;
  log('after', t + ' s', '| katana held', inv.includes(k2), '| set in it', k2.artifact ? k2.artifact.name : 'nothing', '| artifact in the pack', inv.includes(B.seaArtItem), '| sea state', B.seaS().state, '| dev', B.settings.devMode);
}
log('DONE');
