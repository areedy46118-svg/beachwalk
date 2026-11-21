/* THE KEEP'S HOIST, BY HAND (2026-11-21, the owner: "give the tavern lift the left hand animation also the item sound when used
 * take out the claude sound"). In the keep, at the hoist's foot looking at it, E: the hand out, the hoist going, and the
 * recordings started (his pickup sound, once). Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/keephoist.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const RB = b.ROOM_BACK.keep; RB.load(); for (let i = 0; i < 900 && !(RB.ready() && b.keepLiftS()); i++) { b.frame(1); await sleep(30); }
RB.place(); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(10); }
w.__clockOn && w.__clockOn();
const L = b.keepLiftS(); log('hoist', L ? L.state : 'none', '| handUses', b.handUsesS('Raise the hoist', 'action'));
const foot = L.proxies[0], P = foot.getWorldPosition(new b.THREE.Vector3()), C = b.camera;
C.position.set(P.x + 2.4, P.y + 0.6, P.z); b.camBaseY = C.position.y;
for (let i = 0; i < 12; i++) { b.lookAt(P.x, P.y, P.z); w.__adv ? w.__adv(1) : b.frame(1); }
log('hovered', b.state().hovered);
const s0 = b.sampleLogS().length;
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyE', key: 'e' })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
const tl = [];
for (let f = 0; f < 60; f++) { b.lookAt(P.x, P.y, P.z); w.__adv ? w.__adv(1) : b.frame(1); if (f % 6 === 5) tl.push(((f + 1) / 60).toFixed(2) + 's hand ' + (b.scene.getObjectByName('pipeHand').visible ? 'out' : '-') + ' hoist ' + b.keepLiftS().state); }
log(tl.join(' | '));
for (let i = 0; i < 300; i++) w.__adv ? w.__adv(1) : b.frame(1);
log('hoist now', b.keepLiftS().state, '| sounds over the whole ride', b.sampleLogS().slice(s0).join(',') || '(none)');
