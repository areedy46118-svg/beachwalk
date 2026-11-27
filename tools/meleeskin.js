/* MELEE ON THE SKIN (2026-11-25, the owner: "Yes, melee too" — blows confirmed on the drawn body, as the water ball, the hook and the
 * guns were). The katana's real swings (`startDig`) on the open beach at a farmer and at a beach mutant stood in front of you, aimed
 * at his chest, his head, over his head, at his shins, and off to his side; light and heavy; at 1.7 m and 2.4 m. Each case is swung
 * with the old capsule (`__meleeCap = 1`) and then on the skin: landed or not, and the worst REAL frame (the probe page's clock)
 * while the blade was out.
 *   PB_PORT=4241 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/meleeskin.js' <out> */
const Q = new URLSearchParams(location.search), KINDS = (Q.get('k') || 'farmer1,pale,runt').split(',');
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1000);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera;
const kat = Q.get('w') === 'peg' ? b.pegItem : b.katanaItem; b.addToInventory(kat); if (b.state().equipped !== kat.name) b.toggleEquip(kat);
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
w.__clockOn();
const put = () => { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; };
const ready = async (u) => { for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { put(); w.__adv(1); await sleep(10); } for (let i = 0; i < 30; i++) { put(); w.__adv(1); } };
// one swing aimed at (dx, ay) on him; landed? and the worst real frame
const swing = (u, dx, ay, P, dz) => {
  const at0 = u.blow ? u.blow.at : 0, hp0 = u.st.hp; let landed = false, worst = 0;
  for (let i = 0; i < 70; i++) {
    put(); u.g.position.set(X, u.g.position.y, Z + dz); u.g.rotation.y = 0; u.st.atk = -1; u.st.cool = 3; u.st.block = 0;
    b.lookAt(X + dx, u.g.position.y + ay, Z + dz);
    if (i === 2) b.startDig(P);
    const a = performance.now(); w.__adv(1); const ms = performance.now() - a; if (i > 2 && ms > worst) worst = ms;
    if (u.blow && u.blow.at !== at0 && u.st.hp < hp0) { landed = true; break; }
  }
  for (let i = 0; i < 45; i++) { put(); w.__adv(1); }
  return { landed, worst };
};
const out = []; w.addEventListener("error", (e) => log("ERR", e.message, e.error && e.error.stack));
for (const KIND of KINDS) {
  const u = b.mutSpawnTest(X, Z - 1.7, KIND, 0); await ready(u);
  const h = u.kind.h || 1.8; const blk = u.kind.block; u.kind.block = 0;   // (his guard is another question: a blocked blow takes no health)
  log('kind', KIND, 'h', h.toFixed(2), 'skin tris', b.pbSkinS(u).length / 9);
  { const T = b.THREE, M = u.g.position.clone(); M.y += h * 0.5; let a = performance.now(); for (let i = 0; i < 5; i++) b.cutTrisS(u, M, h * 0.75 + 1.2); const ct = (performance.now() - a) / 5;
    const O = C.position.clone(), D = new T.Vector3(); a = performance.now(); let n = 0;
    for (let i = 0; i < 40; i++) { D.set(u.g.position.x + (i % 8 - 4) * 0.25 - O.x, u.g.position.y + h * (0.2 + 0.1 * (i >> 3)) - O.y, u.g.position.z - O.z).normalize(); if (b.projBodyHitS(u, O, D, 4, 0.08) != null) n++; }
    { const S = b.pbSkinS(u); let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9; for (let i = 0; i < S.length; i += 3) { y0 = Math.min(y0, S[i + 1]); y1 = Math.max(y1, S[i + 1]); x0 = Math.min(x0, S[i] - u.g.position.x); x1 = Math.max(x1, S[i] - u.g.position.x); }
      log('  his skin stands from', (y0 - u.g.position.y).toFixed(2), 'to', (y1 - u.g.position.y).toFixed(2), 'm (kind h', h, ') | across', x0.toFixed(2), 'to', x1.toFixed(2)); }
    log('  reading his skin', ct.toFixed(2), 'ms | one line asked of it', ((performance.now() - a) / 40).toFixed(3), 'ms (', n, 'of 40 met him)'); }
  let top = h; { const S = b.pbSkinS(u); top = -1e9; for (let i = 1; i < S.length; i += 3) top = Math.max(top, S[i] - u.g.position.y); }   // (where his crown is DRAWN, which a hunched one keeps well under his height)
  const cases = [['chest', 0, 0.72 * top], ['head', 0, top - 0.12], ['over head +0.15', 0, top + 0.15], ['over head +0.3', 0, top + 0.3], ['over head +0.5', 0, top + 0.5], ['shins', 0, 0.2 * top], ['side 0.3', 0.3, 0.6 * top], ['side 0.5', 0.5, 0.6 * top], ['side 0.7', 0.7, 0.6 * top], ['side 0.9', 0.9, 0.6 * top], ['side -0.5', -0.5, 0.6 * top], ['side -0.9', -0.9, 0.6 * top], ['over head +1.0', 0, top + 1.0], ['side 1.5', 1.5, 0.6 * top], ['side -1.5', -1.5, 0.6 * top]];
  const tot = { cap: 0, skin: 0, n: 0 };
  for (const dz of [-1.7, -2.4]) for (const P of [0, 1]) for (const [nm, dx, ay] of cases) {
    const r = {};
    for (const mode of ['cap', 'skin']) {
      w.__meleeCap = mode === 'cap' ? 1 : 0;
      u.st.hp = 9999; u.st.alive = true; u.st.struck = false; u.st.stun = 0; u.st.recoil = 0;
      w.__msDbg = {}; try { r[mode] = swing(u, dx, ay, P, dz); } catch (e) { log('SWING FAILED', e.stack.split('\n').slice(0, 6).join(' <- ')); throw e; }
      r[mode].dbg = JSON.stringify(w.__msDbg);
    }
    tot.n++; if (r.cap.landed) tot.cap++; if (r.skin.landed) tot.skin++;
    out.push(`${KIND} ${(-dz).toFixed(1)} m ${P ? 'heavy' : 'light'} ${nm}: capsule ${r.cap.landed ? 'LANDED' : 'missed'} | skin ${r.skin.landed ? 'LANDED' : 'missed'} | worst frame ${r.cap.worst.toFixed(1)} / ${r.skin.worst.toFixed(1)} ms | skin asked ${r.skin.dbg}`);
  }
  out.push(`${KIND}: landed ${tot.cap}/${tot.n} with the capsule, ${tot.skin}/${tot.n} on the skin`);
  u.kind.block = blk; u.st.alive = false; u.g.visible = false;
}
w.__meleeCap = 0;
for (const r of out) log(r);
log('DONE');
