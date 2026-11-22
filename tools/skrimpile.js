/* HIS OWN HEAP, STRUCK (2026-11-21, the owner: "MAKE HIS PILE ABLE TO BE HIT BUT IT DOESNT BREAK"). In the whale, him digging;
 * you 2 m off his heap on its far side from him, real swings at its middle (light ×4, heavy ×2): each should wobble it
 * (`SKQ.home.jig`) and throw pieces, and it stays; then a swing aimed at HIM over it: his, not the heap's.
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/skrimpile.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.placeInWhale();
const S = b.SKRIM, cam = b.camera.position;
for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
try { if (!b.inventory.includes(b.katanaItem)) b.addToInventory(b.katanaItem); if (b.equippedS && b.equippedS() !== b.katanaItem) b.toggleEquip(b.katanaItem); } catch (e) { log('katana', e.message); }
w.__clockOn(); w.__adv(30);
const A = b.whaleS().arena, sp = A.skrimSpot.pile, u = S.u, P = u.g.position;
const hx = b.WHALE_X + sp.x, hz = b.WHALE_Z - sp.s, hy = b.skrimFloorW(hx, hz);
const dx = hx - P.x, dz = hz - P.z, L = Math.hypot(dx, dz) || 1;
const put = (x, z) => { cam.x = x; cam.z = z; const fy = b.skrimFloorW(x, z); cam.y = fy + 1.62; b.camBaseY = cam.y; };
const sx = hx + dx / L * 2.0, sz = hz + dz / L * 2.0;
let jigs = 0, thrown0 = b.SKQ.pool.filter((c) => c.busy).length;
for (const pw of [0, 0, 0, 0, 1, 1]) {
  put(sx, sz); b.lookAt(hx, hy + 0.35, hz);
  b.startDig(pw);
  let jig = 0; for (let i = 0; i < 100; i++) { put(sx, sz); b.lookAt(hx, hy + 0.35, hz); w.__adv(1); if (b.SKQ.home && b.SKQ.home.jig > jig) jig = b.SKQ.home.jig; }
  if (jig > 0.5) jigs++;
  log(pw ? 'heavy' : 'light', 'swing: wobble', jig.toFixed(2), '| pieces out', b.SKQ.pool.filter((c) => c.busy).length - thrown0, '| heap there', !!(b.SKQ.home && b.SKQ.home.g.parent), 'scale y', b.SKQ.home ? b.SKQ.home.g.scale.y.toFixed(2) : '-', '| skrim stage', S.stage);
}
log('HEAP: struck', jigs, 'of 6, still standing', !!(b.SKQ.home && b.SKQ.home.g.parent));
// at him, past the heap
put(P.x - dx / L * 1.6, P.z - dz / L * 1.6); const hp0 = u.st.hp;
b.lookAt(P.x, P.y + 0.8, P.z); b.startDig(0); const j0 = b.SKQ.home.jig;
for (let i = 0; i < 100; i++) { b.lookAt(P.x, P.y + 0.8, P.z); w.__adv(1); }
log('a swing at HIM: his hp', hp0, '->', u.st.hp, 'stage', S.stage, 'heap wobble after', b.SKQ.home.jig.toFixed(2));
