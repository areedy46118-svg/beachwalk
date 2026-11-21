/* WHAT TIPS HIM OVER (2026-11-20, the owner: "hes flying around … his rig has to be messed up"): his root joints' rotation in
 * the bind (every action stopped: the mixer puts back what it bound) and under each clip; then his idle with the two roots held
 * at the bind, a still of each. Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kingroot.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera; w.__clockOn(); b.KING.mode = 'ready'; u.g.visible = true; w.__adv(3);
w.requestAnimationFrame = () => 0; u.life = null;
const names = ['_rootJoint', 'RL_BoneRoot_01', 'CC_Base_BoneRoot_00', 'CC_Base_Hip_02', 'CC_Base_Pelvis_03'];
const q = (n) => { const o = u.model.getObjectByName(n); return o ? o.quaternion.toArray().map((v) => v.toFixed(3)).join(',') + ' p ' + o.position.toArray().map((v) => v.toFixed(3)).join(',') + ' s ' + o.scale.x.toFixed(3) : '-'; };
u.mixer.stopAllAction(); u.mixer.update(0);
const bind = {}; for (const n of names) { const o = u.model.getObjectByName(n); if (o) bind[n] = [o.quaternion.clone(), o.position.clone()]; }
log('BIND', names.map((n) => n + ' ' + q(n)).join(' | '));
let chain = []; for (let o = u.model.getObjectByName('CC_Base_Hip_02'); o && o !== u.model; o = o.parent) chain.push(o.name + (o.isBone ? '(b)' : ''));
log('hip chain up', chain.join(' < '));
const play = (n) => { for (const k in u.clips) u.clips[k].stop(); const a = u.clips[n]; a.reset(); a.setEffectiveWeight(1); a.play(); a.time = 0.5; u.mixer.update(0); };
for (const n of ['kIdle', 'hover', 'hit', 'flip']) { if (!u.clips[n]) continue; play(n); log(n, names.map((x) => x + ' ' + q(x)).join(' | ')); const c = u.clips[n].getClip(); log('  tracks on roots', c.tracks.filter((t) => /_rootJoint|RL_BoneRoot|BoneRoot/.test(t.name)).map((t) => t.name + ' ' + Array.from(t.values.slice(0, 4)).map((v) => v.toFixed(3)).join(',')).join(' ; ')); }
