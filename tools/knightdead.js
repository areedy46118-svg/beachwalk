/* SWINGS AT A KNIGHT AS HE DIES (2026-11-26, the owner: "i cant hit the knights alot when in there death animation fix this"). The first
 * castle; the dark knight (`dkSlotS`) stood 1.6 m in front of you and killed; then a light cut thrown at his chest every 0.45 s for
 * 3 s while he goes down: per swing, whether it met the body (`ragBlowStart` ran: `r.hitN`), the body's state, and the distance.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/knightdead.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = true;
const C = b.camera, kat = b.katanaItem; b.addToInventory(kat); if (b.state().equipped !== kat.name) b.toggleEquip(kat);
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
const tries = [];
const DK = b.dkSlotS().unit; if (DK) tries.push(DK);
for (const u of units()) if (u.st.alive && u.model && u.g.visible && u.farm && u.farm.out && tries.length < 4) tries.push(u);
for (const u of tries) {
  const P0 = C.position.clone();
  for (let i = 0; i < 30; i++) { const m = u.g.position; C.position.set(m.x, P0.y, m.z + 1.6); b.camBaseY = P0.y; b.lookAt(m.x, P0.y - 0.3, m.z); u.st.awake = true; w.__adv(1); }
  const at = C.position.clone();
  u.st.hp = 1; u.lastHitMine = true; b.startDig(0);
  for (let i = 0; i < 60 && (u.st.alive || !u.rag); i++) { C.position.copy(at); w.__adv(1); }
  if (!u.rag) { log(u.kindName, 'no ragdoll'); continue; }
  let hits = 0, swings = 0; const row = [];
  for (let f = 0; f < 180; f++) {
    const R = u.rag; const H = R && (R.byName.Character1_Spine2 || R.parts[0]);
    if (H) b.lookAt(H.p.x, H.p.y, H.p.z);
    C.position.copy(at);
    if (f % 27 === 2) { swings++; const t0 = R ? R.hitN || 0 : 0; b.startDig(0); for (let k = 0; k < 26; k++) { C.position.copy(at); if (H) b.lookAt(H.p.x, H.p.y, H.p.z); w.__adv(1); f++; } const got = (u.rag && (u.rag.hitN || 0) > t0); if (got) hits++; row.push((got ? 'HIT' : 'miss') + '@' + (H ? H.p.distanceTo(at).toFixed(1) + 'm,y' + (H.p.y - (H.floor ?? 0)).toFixed(1) : '-')); }
    else w.__adv(1);
  }
  log(u.kindName, '| swings at the falling body', swings, 'met', hits, '|', row.join(' '));
}
log('DONE');
