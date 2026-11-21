/* WHOSE CRY IS IT (2026-11-21, the owner: "DONT HAVE SKRIMS TAKE DAMAGE AUDIO FOR THE CRABS THEY ARE NOT HIM"). In the whale,
 * his fight at 49% (his heads come), you 6 m off cutting every head within 2.3 m (cryStrike), 50 s; every buffer started
 * from his hurt bank is logged with what happened that frame (a head cut, his hp changing). Silent: the audio graph runs
 * but nothing is heard (headless, muted).
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/crabvox.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
const REAL = new URLSearchParams(location.search).get('real') === '1', CHAIN = new URLSearchParams(location.search).get('chain') === '1', GUN = new URLSearchParams(location.search).get('gun') === '1';
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.placeInWhale();
const S = b.SKRIM, cam = b.camera.position;
for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
const u = S.u; for (let i = 0; i < 30; i++) b.frame(1);
for (let i = 0; i < 200 && !(b.sampleBanks.skrimHurt || []).filter(Boolean).length; i++) await sleep(50);
w.requestAnimationFrame = () => 0;
try { const W0 = GUN ? b.magnumItem : b.katanaItem; if (!b.inventory.includes(W0)) b.addToInventory(W0); if (b.equippedS && b.equippedS() !== W0) b.toggleEquip(W0); if (GUN) { b.magAmmo = 6; b.magSpare = 60; } } catch (e) { log('weapon', e.message); }
const ctx = b.audioCtx; try { await ctx.resume(); } catch (e) {}
// (headless, the audio clock does not move: his mouth stays 'busy' with the fight's opening line for ever — so it is driven by the frames here)
const ct0 = ctx.currentTime; Object.defineProperty(ctx, 'currentTime', { get: () => ct0 + t, configurable: true });
let t = 0;
const HURT = new Set((b.sampleBanks.skrimHurt || []).filter(Boolean)); let plays = 0, ev = '';
const orig = ctx.createBufferSource.bind(ctx);
ctx.createBufferSource = () => { const s = orig(); let buf = null; Object.defineProperty(s, 'buffer', { get: () => buf, set: (v) => { buf = v; if (HURT.has(v)) { plays++; log('SKRIM HURT played at', t.toFixed(2), 's; this frame:', ev || '(nothing of yours)', '| his hp', u.st.hp, '| stack', new Error().stack.split('\n').slice(2, 7).map((l) => l.trim().replace(/\(?http[^)]*main\.js:/, '@').replace(/\)$/, '')).join(' < ')); } } }); return s; };
const P = u.g.position, T = P.constructor;
S.stage = 'dig'; cam.set(P.x + Math.sin(u.g.rotation.y) * 4, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 4);
b.skrimFight();
for (let i = 0; i < 120 && S.stage !== 'fight'; i++) b.step(1 / 60);
u.st.hp = Math.round(u.kind.hp * 0.49);
let cuts = 0, hp0 = u.st.hp, swingCd = 0;
const heads = () => b.CRY.list.filter((h) => h.summon);
for (let f = 0; f < 60 * 50; f++) {
  ev = '';
  { const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; if (!CHAIN || !heads().some((h) => h.mode === 'chain')) { cam.x = P.x + dx / d * 6; cam.z = P.z + dz / d * 6; } }
  let look = [P.x, P.y + 1.3, P.z];
  if (GUN) { const onC = heads().filter((h) => h.mode === 'chain'); if (onC.length && !(swingCd > 0)) { const W = onC[0].body.getWorldPosition(new T()); b.lookAt(W.x, W.y, W.z); const hp1 = u.st.hp, tr = b.magTrace(b.camera.getWorldDirection(new T())); if (b.magAmmo <= 0) b.magAmmo = 6; b.magFire(); swingCd = 0.9; for (let q = 0; q < 3; q++) { t += 1 / 60; b.step(1 / 60); } ev = 'a round at a crab on the chain (trace: ' + (tr ? tr.kind : 'nothing') + ') his hp ' + hp1 + '->' + u.st.hp + ' head now ' + onC[0].mode; log(ev, 'his hang', u.sk.hang ? u.sk.hang.ph : 'none'); } }
  for (const h of heads()) {
    if (h.mode === 'dead' || h.mode === 'still' || h.mode === 'buried' || (!CHAIN && h.mode === 'chain') || h.off) continue;
    const W = h.body.getWorldPosition(new T());
    if (CHAIN && h.mode === 'chain') { const fy = b.skrimFloorW(W.x, W.z); if (W.y - fy > 4.2) continue; cam.x = W.x + 1.2; cam.z = W.z + 0.6; cam.y = fy + 1.62; b.camBaseY = cam.y; }
    else if (W.distanceTo(cam) > 2.3) continue;
    look = [W.x, W.y, W.z]; b.lookAt(W.x, W.y, W.z);
    if (REAL) { if (!b.state().digging && !(swingCd > 0)) { b.startDig(0.5); swingCd = 0.7; ev = 'a swing at a head (' + h.mode + ', ' + W.distanceTo(cam).toFixed(1) + ' m; him ' + Math.hypot(P.x - cam.x, P.z - cam.z).toFixed(1) + ' m)'; } }
    else if (b.cryStrike(0.6)) { cuts++; ev = 'a head cut (' + h.mode + ')'; } break;
  }
  b.lookAt(...look);
  swingCd -= 1 / 60; b.step(1 / 60); t += 1 / 60;
  if (u.st.hp !== hp0) { ev += ' his hp ' + hp0 + '->' + u.st.hp; hp0 = u.st.hp; }
  b.heal();
  if (f % 120 === 0) await sleep(1);
}
ev = 'CONTROL: him hit'; t += 2; b.hurtMutantTest(u, 3, 0.5); b.step(1 / 60);
log('done: heads cut', cuts, 'dead heads', heads().filter((h) => h.mode === 'dead' || h.mode === 'still').length, 'his hurt played', plays, 'times; heads', heads().map((h) => h.mode).join(','));
