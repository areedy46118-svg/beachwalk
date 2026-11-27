/* THE PALADIN AND THE GUN (2026-11-25, the owner: "i just shot the gun at the paladin and he took no damage in 5 bullets"). The first
 * castle booted, the paladin (the dark knight, `dkSlot.unit`) stood 6 m in front of you facing you, between his blows; `&n=` rounds
 * of the .44 (then `&sg=1` the sawn-off) at his chest, a beat apart: how many met him, how many he blocked (`dealerBlock`), the
 * health they took. A still of the last block (`&shot=1`).
 *   PB_PORT=4241 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/gunblock.js' <out> */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 30), SG = Q.get('sg') === '1';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js');
const u = b.dkSlotS().unit; if (!u || !u.model) { log('no paladin'); throw 0; }
const it = SG ? b.shotgunItem : b.magnumItem; b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it);
for (let i = 0; i < 40; i++) { b.frame(1); await sleep(30); }
w.__clockOn(); w.__adv(30);
const C = b.camera, P0 = C.position.clone();
const snapHim = () => {   // (from 3.2 m in front of where his model is drawn, at his chest)
  const T = b.THREE, bb = new T.Box3().setFromObject(u.model), c = bb.getCenter(new T.Vector3());
  log('his model drawn at', c.toArray().map((v) => v.toFixed(1)).join(','), 'his group at', u.g.position.toArray().map((v) => v.toFixed(1)).join(','), 'h', (bb.max.y - bb.min.y).toFixed(2));
  const q = C.quaternion.clone(), pp = C.position.clone(); C.position.set(c.x + 1.2, c.y + 0.3, c.z + 3.0); C.lookAt(c.x, c.y + 0.2, c.z); C.updateMatrixWorld(true);
  shot('block', 900); C.position.copy(pp); C.quaternion.copy(q); C.updateMatrixWorld(true);
};
let shotDone = false; let blocks = 0, hits = 0, lost = 0, misses = 0, shots = 0;
const realBlock = b.dealerBlockS; let blocked = false;
for (let k = 0; k < N; k++) {
  // him in front of you, facing you, awake, between blows, at full health (the count is of what each round does)
  u.g.visible = true; u.st.alive = true; u.st.awake = true; u.st.hp = 999; u.st.atk = -1; u.st.recoil = 0; u.st.stun = 0; u.st.openT = 0; u.st.block = 0; u.st.cool = 2;
  u.g.position.set(P0.x, u.g.position.y, P0.z - 6); u.g.rotation.y = 0;   // (+z is his front: facing you down -z)
  C.position.copy(P0); b.camBaseY = P0.y; b.lookAt(u.g.position.x, u.g.position.y + (u.kind.h || 1.8) * 0.6, u.g.position.z); C.updateMatrixWorld(true);
  if (SG) { try { b.magAmmo = 2; } catch (e) {} } else b.magAmmo = 6;
  const hp0 = u.st.hp, blk0 = u.st.block;
  for (let i = 0; i < 50 && b.magAmmoS().busy; i++) w.__adv(1);
  if (k === 0) { const ms = []; u.model.traverse((o) => { if (o.isMesh) { let hid = null; for (let a = o; a; a = a.parent) if (a.visible === false) { hid = a.name || a.type; break; } ms.push((o.isSkinnedMesh ? 'S:' : 'M:') + (o.name || '?') + (hid ? ' hidden by ' + hid : '')); } }); let up = [], q = u.g; while (q) { up.push((q.name || q.type) + (q.visible ? '' : '(HIDDEN)')); q = q.parent; } log('DBG meshes', ms.join(' | '), '|| chain', up.join(' < ')); }
  if (k === 0) { const D = new b.THREE.Vector3(); C.getWorldDirection(D); const h = b.magTraceS(D); const o = C.position.clone();
    log('DBG trace', h ? h.kind + ' t ' + (+h.t).toFixed(2) + (h.u ? ' unit ' + (h.u === u) : '') : 'none', '| skin hit', h && h.u ? b.projBodyHitS(h.u, o, D, Math.min(60, h.t + 1.2), 0.05) : '-', '| skin tris', b.pbSkinS(u).length / 9, '| model visible', u.model.visible, '| dist', o.distanceTo(u.g.position).toFixed(2)); }
  b.magFire(); shots++;
  for (let i = 0; i < 4; i++) { u.g.position.set(P0.x, u.g.position.y, P0.z - 6); u.g.rotation.y = 0; w.__adv(1); if (i === 2 && u.st.block > 0 && !shotDone) { shotDone = true; snapHim(); } }
  const d = hp0 - u.st.hp;
  if (d > 0) { hits++; lost += d; } else if (u.st.block > 0) blocks++; else misses++;
  for (let i = 0; i < 40; i++) w.__adv(1);
}
log(SG ? 'sawn-off' : '.44', 'shots', shots, '| took health', hits, '(', lost, 'in all) | blocked', blocks, '| neither', misses, '| his kind block', u.kind.block, 'has a guard clip', !!(u.clips && u.clips.block));
log('DONE');
