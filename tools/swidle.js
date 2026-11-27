/* THE GARRISON STANDING IN THE OWNER'S IDLE (2026-11-25: "use the idle too on farmers" — Mesh2Motion's Idle_Sword). The castle booted,
 * the game run 6 s: per armed man, the clip he is standing in and its weight, the seat turn (`farmSwSeat`) and whether the carry
 * is off; then stills of three of them, from 2.6 m in front, as the game draws them.
 *   PB_PORT=4241 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/swidle.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
for (let i = 0; i < 360; i++) w.__adv(1);
const cl = (u) => { let best = null, bw = 0; for (const [k, a] of Object.entries(u.clips || {})) { const wt = a.enabled && a.isRunning() ? a.getEffectiveWeight() : 0; if (wt > bw) { bw = wt; best = k; } } return best + ' ' + bw.toFixed(2); };
const armed = units().filter((u) => u.model && u.farmTool && u.st.alive);
const rows = {}; for (const u of armed) { const k = cl(u).split(' ')[0]; rows[k] = (rows[k] || 0) + 1; }
log('idle clip of man 0: dur', armed[0].clips.idle.getClip().duration.toFixed(2), 'tracks', armed[0].clips.idle.getClip().tracks.length, '| mSwIdle dur', armed[0].clips.mSwIdle ? armed[0].clips.mSwIdle.getClip().duration.toFixed(2) : '-', '| anim.idle', armed[0].kind.anim.idle, '| gait.idle', armed[0].gait && armed[0].gait.idle, '| awake', armed.filter((u) => u.st.awake).length);
log('the alias idle IS the video idle:', armed.map((u) => u.clips.idle && u.clips.mSwIdle ? (u.clips.idle.getClip() === u.clips.mSwIdle.getClip() ? 'same' : u.clips.idle.getClip().name) : '-').join(' '));
log('armed men', armed.length, '| standing/moving in', JSON.stringify(rows));
log('clipK', armed.map((u) => b.farmSwClipKS(u).toFixed(2)).join(' '), '| acts', armed.map((u) => (u.fswActs || []).length).join(' '), '| farm.out', armed.map((u) => u.farm && u.farm.out ? 1 : 0).join(''), 'visible', armed.map((u) => u.g.visible ? 1 : 0).join(''));
log('seat turned (fswK)', armed.map((u) => (u.fswK || 0).toFixed(2)).join(' '), '| carry', armed.map((u) => (u.farmCarryK || 0).toFixed(2)).join(' '));
const C = b.camera, home = C.position.clone(), q0 = C.quaternion.clone(), f0 = C.fov;
let n = 0;
const pick = armed.filter((x) => /mSwIdle/.test(cl(x))).slice(0, 3); for (const u of pick) u.g.visible = true; for (let i = 0; i < 40; i++) { for (const u of pick) u.g.visible = true; w.__adv(1); }
log('the three in view: seat', pick.map((u) => (u.fswK || 0).toFixed(2)).join(' '), 'clip', pick.map(cl).join(' / '));
for (const u of pick) {
  const P = u.g.position, ry = u.g.rotation.y;
  C.position.set(P.x + Math.sin(ry - 0.6) * 2.6, P.y + 1.4, P.z + Math.cos(ry - 0.6) * 2.6); C.fov = 50; C.updateProjectionMatrix(); C.lookAt(P.x, P.y + 1.0, P.z); C.updateMatrixWorld(true);
  b.renderer.render(b.scene, C); shot('idle' + (n++), 400, 1.0);
}
C.position.copy(home); C.quaternion.copy(q0); C.fov = f0; C.updateProjectionMatrix();
log('DONE');
