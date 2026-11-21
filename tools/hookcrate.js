/* THE HOOK THROWN AT A CRATE (2026-11-20, the owner: "the hook projectile needs to hit things like crates"): stood 9 m off the
 * first crate, looking at it, a full throw; is it broken. Run: PB_PORT=4275 sh tools/probe.sh 'evalFile&f=/tools/hookcrate.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const c = b.crates.find((k) => !k.broken); const C = b.camera.position, P = new b.THREE.Vector3(); c.group.getWorldPosition(P);
log('crate at', P.toArray().map((v) => v.toFixed(1)).join(','), 'broken', c.broken);
const D = +(new URLSearchParams(location.search).get('d') || 9);
for (let i = 0; i < 20; i++) { C.set(P.x - D * 0.5, C.y, P.z + D * 0.85); b.lookAt(P.x, P.y + 0.3, P.z); adv(1); }
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
key('ShiftLeft', true); b.startWind(); for (let i = 0; i < 50; i++) { C.set(P.x - D * 0.5, C.y, P.z + D * 0.85); b.lookAt(P.x, P.y + 0.3, P.z); adv(1); }
for (let i = 0; i < 4; i++) { b.lookAt(P.x, P.y + 0.3, P.z); adv(1); }
b.releaseWind(); key('ShiftLeft', false);
log('cam', C.toArray().map((v) => v.toFixed(1)).join(','), 'dist', C.distanceTo(P).toFixed(1)); log('thrown', b.HK.st, 'at', b.HK.to ? b.HK.to.kind + ' ' + b.HK.to.t.toFixed(2) : 'nothing');
for (let i = 0; i < 90; i++) { C.set(P.x - D * 0.5, C.y, P.z + D * 0.85); adv(1); if (c.broken) { log('broken at frame', i, 'hook', b.HK.st); break; } }
log('crate broken', c.broken);
{ const T = b.THREE, rc = new T.Raycaster(), d = new T.Vector3(P.x, P.y + 0.3, P.z).sub(C).normalize(); rc.set(C.clone(), d); rc.far = 30;
  const hs = rc.intersectObject(c.group, true); let nm = 0, vis = 0; c.group.traverse((o) => { if (o.isMesh) { nm++; if (o.visible) vis++; } });
  const cd = new T.Vector3(); b.camera.getWorldDirection(cd);
  log('manual ray hits', hs.length, hs[0] ? hs[0].distance.toFixed(2) : '', 'meshes', nm, 'visible', vis, 'group vis', c.group.visible, 'parent', !!c.group.parent, 'cam dir', cd.toArray().map((v) => v.toFixed(2)).join(','), 'to crate', d.toArray().map((v) => v.toFixed(2)).join(',')); }
