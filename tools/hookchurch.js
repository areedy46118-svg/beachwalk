/* THE HOOK UP INTO THE CHURCH'S VAULT (2026-11-22, the owner: "i jumped out of the map at the church using the hook to fly up
 * make this impossible"). In the nave: a jump, the hook thrown up at the vault from the air (`&pitch=`), the pull — the highest
 * your head goes against the vault over you (`playerHeadClamp`). Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh
 * 'evalFile&f=/tools/hookchurch.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), PITCH = +(Q.get('pitch') || 1.25), AT = Q.get('at') || 'mid';
b.settings.devMode = true;
for (let i = 0; i < 600 && !(b.hookRawS() && b.state().started && b.UCS().ready); i++) { b.frame(1); await sleep(40); }
b.enterUndercroft();
for (let i = 0; i < 600 && !b.inUndercroftS(); i++) { b.frame(1); await sleep(15); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, T = b.THREE, U = b.UCS();
for (let i = 0; i < 30; i++) adv(1);
// to the middle of the nave, between the way in and the altar
const e = U.spots.entry, a = U.spots.altar || e, k = AT === 'altar' ? 0.85 : 0.5;
C.position.x = b.UC_X + e.x + (a.x - e.x) * k; C.position.z = b.UC_Z + e.z + (a.z - e.z) * k; adv(10);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const ray = new T.Raycaster(new T.Vector3(C.position.x, C.position.y, C.position.z), new T.Vector3(0, 1, 0), 0, 60);
ray.camera = C; const hv = ray.intersectObjects(b.dropTargetsS().filter(Boolean), true).filter((h) => h.face && h.object.isMesh)[0];
const vault = hv ? hv.point.y : null;
log('in the nave: eye', C.position.y.toFixed(2), '| the vault over you', vault !== null ? vault.toFixed(2) : 'none (open)', hv ? hv.object.name : '');
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
const look = () => b.look(b.state().yaw ?? 0, PITCH);
if (Q.get('direct')) {
  // the pull itself, at a point beyond the vault (as the owner went up through it): jump, then hauled straight up
  key('Space', true); adv(2); key('Space', false); adv(4);
  const ok = b.hookZipAtS(C.position.x + 0.5, (vault ?? C.position.y + 6) + 4, C.position.z + 0.3);
  log('pull started', ok, '| hook', b.HK.st);
  let maxY = -1e9; for (let f = 0; f < 150; f++) { adv(1); maxY = Math.max(maxY, C.position.y); }
  log('DIRECT: highest eye', maxY.toFixed(2), '| the vault', vault !== null ? vault.toFixed(2) : '-', '| head clear of it by', vault !== null ? (vault - (maxY + 0.12)).toFixed(2) : '-', '| still in the church', b.inUndercroftS(), '| eye now', C.position.y.toFixed(2));
} else {
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 40; i++) { look(); adv(1); }
key('Space', true); adv(2); key('Space', false); for (let i = 0; i < 8; i++) { look(); adv(1); }
b.releaseWind(); key('ShiftLeft', false);
log('thrown at', b.HK.to ? b.HK.to.kind + ' ' + (b.HK.to.surface || '') : b.HK.surfEnd ? 'the floor' : 'nothing', '| airThrow', b.HK.airThrow);
let maxY = -1e9, zip = 0;
for (let f = 0; f < 200; f++) { adv(1); maxY = Math.max(maxY, C.position.y); if (b.HK.st === 'zip') zip++; }
log('the pull', zip, 'frames | highest eye', maxY.toFixed(2), '| the vault', vault !== null ? vault.toFixed(2) : '-', '| head under it by', vault !== null ? (vault - (maxY + 0.12)).toFixed(2) : '-', '| still in the church', b.inUndercroftS(), '| eye now', C.position.y.toFixed(2));
}
