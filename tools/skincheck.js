/* (2026-11-25) why does the skin test miss the paladin: his skin's triangle count, its bounds against his group, and a ray from your eye
 * at his chest.  PB_PORT=4241 sh tools/probe.sh 'evalFile&f=/tools/skincheck.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
const u = b.dkSlotS().unit, T3 = b.THREE, C = b.camera;
for (let i = 0; i < 20; i++) { b.frame(1); await sleep(20); }
u.g.visible = true; u.st.awake = true; const P0 = C.position.clone(); u.g.position.set(P0.x, u.g.position.y, P0.z - 6);
for (let i = 0; i < 6; i++) { u.g.position.set(P0.x, u.g.position.y, P0.z - 6); b.frame(1); await sleep(20); }
const h = u.kind.h || 1.8, chest = new T3.Vector3(P0.x, u.g.position.y + h * 0.6, P0.z - 6);
const T = b.pbSkinS(u); let bx = new T3.Box3(); for (let k = 0; k < T.length; k += 3) bx.expandByPoint(new T3.Vector3(T[k], T[k + 1], T[k + 2]));
const mb = new T3.Box3().setFromObject(u.model);
let skinned = 0, meshes = 0; u.model.traverse((o) => { if (o.isMesh) meshes++; if (o.isSkinnedMesh) skinned++; });
log('h', h, 'group at', u.g.position.toArray().map((v) => v.toFixed(2)).join(','), '| meshes', meshes, 'skinned', skinned, '| skin tris', T.length / 9);
log('skin box', bx.min.toArray().map((v) => v.toFixed(2)).join(','), '->', bx.max.toArray().map((v) => v.toFixed(2)).join(','));
log('model box', mb.min.toArray().map((v) => v.toFixed(2)).join(','), '->', mb.max.toArray().map((v) => v.toFixed(2)).join(','));
const D = chest.clone().sub(P0).normalize();
log('ray at chest: projBodyHit', b.projBodyHitS(u, P0, D, 8, 0.05), '| distance to chest', P0.distanceTo(chest).toFixed(2));
log('DONE');
