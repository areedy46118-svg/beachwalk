/* SKRIM HIT OFF HIS CHAIN (2026-11-21, the owner: "he dissapeared when i hit him off the chain hanging fix this"). In the
 * whale, the fight, him at half health up his chain; at `&at=` s into the hang, `&m=hook` (default) Skrim's own hook
 * thrown at him for real (Shift held, released at him), `&m=gun` a round (`skrimShot` + its damage), `&m=cut` a katana
 * cut. Then each tenth of a second: his phase, where he is (over the floor, from you), his group and model visible, any NaN,
 * the hook's state; and stills from your eye.
 * Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/skrimhookoff.js&m=hook' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), M = Q.get('m') || 'hook', AT = +(Q.get('at') || 1.6), SHOTS = !!+(Q.get('shots') ?? 1);
b.settings.devMode = false;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
// his voice (2026-11-21, `SKRIM_VOX`): every take of his banks that starts, by bank, and when
const vox = []; let voxT0 = performance.now();
{ const st0 = w.AudioBufferSourceNode.prototype.start;
  w.AudioBufferSourceNode.prototype.start = function (...a) {
    try { const B = b.sampleBanks; for (const n of ['skrimAttack', 'skrimHurt', 'skrimPhrase', 'skrimStart', 'skrimTalk', 'skrimHang', 'skrimDie']) if ((B[n] || []).includes(this.buffer)) vox.push(n + '@' + (typeof voxNow === 'function' ? voxNow() : 0).toFixed(1)); } catch (e) {}
    return st0.apply(this, a);
  }; }
const voxSum = () => { const c = {}; for (const v of vox) { const n = v.split('@')[0]; c[n] = (c[n] || 0) + 1; } return JSON.stringify(c); };
for (let i = 0; i < 400 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(50); }
b.placeInWhale();
const S = b.SKRIM, C = b.camera, cam = C.position, T = b.THREE;
for (let i = 0; i < 600 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
const u = S.u; if (!u || !u.model) { log('no skrim'); throw new Error('no skrim'); }
w.__clockOn();
// the audio clock driven by the frames (the headless context is suspended: its own never moves, and every gap would hold)
let AT_ = 0; if (b.audioCtx) Object.defineProperty(b.audioCtx, 'currentTime', { get: () => AT_, configurable: true });
const adv = (n = 1) => { for (let i = 0; i < n; i++) { AT_ += 1 / 60; w.__adv(1); } };
voxT0 = 0; const voxNow = () => AT_;
for (let i = 0; i < 30; i++) adv(1);
const P = u.g.position, k = u.sk;
S.stage = 'dig'; cam.set(P.x + Math.sin(u.g.rotation.y) * 6, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 6);
if (M === 'fight') {
  // his talk first: the opening line ('*Digging*', no voice), then the first of yours, and his answer (a voice)
  cam.set(P.x + Math.sin(u.g.rotation.y) * 2.2, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 2.2); b.lookAt(P.x, P.y + 0.8, P.z);
  b.skrimTalk(); for (let i = 0; i < 50; i++) { adv(2); await sleep(40); }
  const btn = w.document.querySelector('#dialog-choices button, .dialog-choices button, #dialogChoices button');
  log('talk open', b.state().dialogOpen, 'button', btn && btn.textContent.slice(0, 40)); if (btn) btn.click(); for (let i = 0; i < 80; i++) { adv(2); await sleep(40); }
  log('after the answer: voice so far', vox.join(' ')); b.endDialog(); adv(30);
  cam.set(P.x + Math.sin(u.g.rotation.y) * 6, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 6);
}
b.skrimFight();
for (let i = 0; i < 200 && S.stage !== 'fight'; i++) adv(1);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
if (M !== 'fight') u.st.hp = Math.round(u.kind.hp * 0.49);
log('stage', S.stage, 'hp', u.st.hp, '/', u.kind.hp);
const keepAt = () => { const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; cam.x = P.x + dx / d * 6; cam.z = P.z + dz / d * 6; };
const eye = (nm) => { if (!SHOTS) return; b.lookAt(P.x, P.y + 1.0, P.z); C.updateMatrixWorld(true); shot(nm, 480, 1.6); };
const bad = (v) => !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z);
const row = (tag) => {
  const H = k.hang, L = u.model.getObjectByName('Character1_Hips'), hp = L ? L.getWorldPosition(new T.Vector3()) : P;
  let meshVis = 0; u.model.traverse((o) => { if (o.isMesh && o.visible) meshVis++; });
  return tag + ' ph ' + (H ? H.ph + ' ' + H.t.toFixed(2) : '-') + ' stage ' + S.stage + ' feet ' + (P.y - b.skrimFloorW(P.x, P.z)).toFixed(2) + ' hips ' + (hp.y - b.skrimFloorW(P.x, P.z)).toFixed(2)
    + ' from you ' + Math.hypot(P.x - cam.x, P.z - cam.z).toFixed(2) + ' vis ' + u.g.visible + '/' + u.model.visible + ' meshes ' + meshVis + ' scale ' + u.g.scale.x.toFixed(2) + '/' + u.model.scale.x.toFixed(2)
    + (bad(P) || bad(hp) ? ' NaN!' : '') + ' alive ' + u.st.alive + ' hp ' + u.st.hp + ' recoil ' + (u.st.recoil || 0).toFixed(2) + ' push ' + !!u.st.flinchPush + ' hook ' + b.HK.st + ' act ' + (k.act && k.act.name);
};
if (M === 'fight') {
  let cuts = 0, hpYou = 0;
  const SECS = +(Q.get('secs') || 75);
  for (let f = 0; f < 60 * SECS; f++) {
    const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; if (!k.hang) { cam.x = P.x + dx / d * 3; cam.z = P.z + dz / d * 3; }
    b.lookAt(P.x, P.y + 1.3, P.z);
    if (f % 150 === 75 && !k.hang) { b.hurtMutantTest(u, 2, 0.4); cuts++; }
    if (u.st.hp < u.kind.hp * 0.55 && !k.hangDone && !k.hang && f > 60 * 50) {}
    adv(1); if (b.state().hp < 3) { b.heal(); hpYou++; }
    if (f % 600 === 0) log('  t', (f / 60).toFixed(0), 'hp', u.st.hp, 'act', k.act && k.act.name, 'hang', k.hang && k.hang.ph, 'voice', voxSum());
    if (!u.st.alive) break;
  }
  if (+(Q.get('kill') || 0) && u.st.alive) {      // (&kill=1: then the blow that kills him, and his death heard)
    const n0 = vox.length; b.hurtMutantTest(u, u.st.hp + 10, 1); for (let i = 0; i < 180; i++) adv(1);
    log('killed: alive', u.st.alive, 'stage', S.stage, '| voice after the blow', vox.slice(n0).join(' '));
  }
  log('fight: cuts on him', cuts, '| voice', voxSum(), '|', vox.join(' '));
  log('END errors', errs.length, errs.slice(0, 3).join(' | '));
  throw new Error('done');
}
let hit = false, f0 = -1, t = 0, lastPh = '';
for (let f = 0; f < 60 * 40; f++) {
  keepAt();
  const H = k.hang;
  if (!hit) b.lookAt(P.x, P.y + 1.3, P.z);
  if (!hit && H && H.ph === 'hang' && H.t >= AT) {
    hit = true; f0 = f; log(row('BEFORE'));
    eye('a_before');
    if (M === 'hook') {
      const tgt = () => { const hp = u.model.getObjectByName('Character1_Spine2') || u.model.getObjectByName('Character1_Hips'); return hp.getWorldPosition(new T.Vector3()); };
      const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
      key('ShiftLeft', true); log('wind', b.startWind());
      for (let i = 0; i < 50; i++) { keepAt(); const q = tgt(); b.lookAt(q.x, q.y, q.z); adv(1); }
      b.releaseWind(); key('ShiftLeft', false);
      log('thrown', b.HK.st, 'at', b.HK.to ? b.HK.to.kind : 'nothing', 'ph now', k.hang && k.hang.ph);
    } else if (M === 'gun') {
      const d0 = new T.Vector3(P.x - cam.x, 0, P.z - cam.z).normalize(); b.skrimShot(u, d0); b.hurtMutantTest(u, 7, 0.5);
    }
  }
  if (hit && !k.hang) { /* fight on */ }
  adv(1); t += 1 / 60;
  if (b.state().hp < 3) b.heal();
  const ph = (k.hang ? k.hang.ph : 'none');
  if (hit && (((f - f0) % 6 === 0 && f - f0 < 60 * 6) || ph !== lastPh)) log(row('  t+' + ((f - f0) / 60).toFixed(2)));
  if (hit && ph !== lastPh) eye('b_' + ph + '_' + ((f - f0) / 60).toFixed(1));
  if (hit && [0.3, 0.8, 1.5, 2.5, 4].some((s) => f - f0 === Math.round(s * 60))) eye('c_' + ((f - f0) / 60).toFixed(1));
  lastPh = ph;
  if (hit && f - f0 > 60 * 7) break;
}
log('voice', voxSum(), '|', vox.join(' '));
log('END errors', errs.length, errs.slice(0, 3).join(' | '));
