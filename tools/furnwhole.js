/* ONE DRAW A WHOLE PIECE OF FURNITURE (2026-11-22, `furnWhole`): in the throne room and the tavern, a still of a table and
 * chairs whole, the draw count, then one table and one chair broken — their pieces must fly as before and the whole go with
 * them — and a still after.  PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/furnwhole.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(20000);
const T = b.THREE, C = b.camera, R = b.renderer;
const calls = () => { R.info.autoReset = false; R.info.reset(); R.render(b.scene, C); const n = R.info.render.calls; R.info.autoReset = true; return n; };
const RB = b.ROOM_BACK.thr; b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
RB.place(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(10); }
const F = b.thrFurn, tab = F.find((f) => f.kind === 'table' && f.items.length), ch = F.find((f) => f.kind === 'chair');
const W = new T.Vector3(); tab.grp.getWorldPosition(W);
const cx = b.THR_X !== undefined ? b.THR_X : 17000, cz = b.THR_Z !== undefined ? b.THR_Z : 17000;
const tx = 17000 + tab.cx, tz = 17000 + tab.cz;
log('furn', F.length, 'wholes', F.reduce((s, f) => s + f.grp.children.filter((c) => c.userData.furnWhole).length, 0), 'hidden pieces', F.reduce((s, f) => s + f.pieces.filter((p) => !p.visible).length + f.items.filter((p) => !p.visible).length, 0));
C.position.set(tx + 2.6, C.position.y, tz + 2.6); b.lookAt(tx, C.position.y - 1.0, tz);
for (let i = 0; i < 6; i++) { b.frame(1); await sleep(10); }
log('whole: calls', calls()); await shot('furn-whole');
const g0 = b.gibs ? b.gibs.length : -1;
b.smashThrFurn(tab, 8); b.smashThrFurn(ch, 8);
for (let i = 0; i < 20; i++) { b.frame(1); await sleep(10); }
log('broken: grp in world', !!tab.grp.parent, !!ch.grp.parent, 'gibs', g0, '->', b.gibs ? b.gibs.length : -1, 'calls', calls());
await shot('furn-broken');
