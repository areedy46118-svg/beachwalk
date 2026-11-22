/* A WEAPON IN YOUR HAND ACROSS A CHECKPOINT IN A ROOM (2026-11-22, the owner: "my weapons sometimes dont show up in my hand when
 * loading a checkpoint"): given it, held, saved in the room, the page reloaded into it as a death does — is it drawn?
 * Run: PB_PORT=4223 PB_WAIT=400 PB_Q='&item=Skrim%27s%20Hook&room=cel' sh tools/probe.sh 'evalFile&f=/tools/vmroom.js' <out> */
const f = w.frameElement, Q = new URLSearchParams(top.location.search), NAME = Q.get('item') || "Skrim's Hook", ROOM = Q.get('room') || 'cel';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(2500);
const it = b.packByName(NAME); if (!it) { log('no item', NAME); throw new Error('no item'); }
if (!b.inventory.includes(it)) b.addToInventory(it);
if (b.equippedS() !== it) b.toggleEquip(it);
const RB = b.ROOM_BACK[ROOM]; RB.load(); for (let i = 0; i < 300 && !RB.ready(); i++) { b.frame(2); await sleep(50); } RB.place();
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(15); }
log('before', b.equippedS() && b.equippedS().name, 'room', b.devRoom());
b.saveCheckpoint();
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
w.__old = 1; f.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (!w2.__old && w2.__bw && w2.__bw.state) break; } catch (e) {} }
const B = w2.__bw; const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
for (let i = 0; i < 300 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
for (const t of [0.5, 2, 5, 10]) {
  await sleep(t === 0.5 ? 500 : 1500 * (t > 2 ? 2 : 1));
  const E = B.equippedS(), vm = E && E.viewmodel; let n = 0, v = 0;
  if (vm) vm.traverse((o) => { if (o.isMesh) { n++; let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false; if (vis) v++; } });
  log('after', t, 's | equipped', E && E.name, '| meshes drawn', v + '/' + n, '| build pending', !!(vm && vm.userData.build), '| room', B.devRoom());
}
