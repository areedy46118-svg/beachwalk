/* WHAT THE KEEP'S OUTSIDE IS MADE OF (2026-11-26): the objects under `bw_keep` and beside it at the keep, their materials, the fog. */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const K = b.ROOM_BACK.keep; K.load(); for (let i = 0; i < 400 && !K.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); K.place(); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(20); }
const T = b.THREE; let kw = null; b.scene.traverse((o) => { if (o.name === 'bw_keep') kw = o; });
const G = K.grp();
log('keep group', G && G.name, '| children', G && G.children.map((c) => (c.name || c.type) + (c.visible ? '' : '(hid)')).join(' ').slice(0, 700));
const mats = new Map(); G.traverse((o) => { if (o.isMesh) for (const M of [].concat(o.material)) mats.set(M.uuid, [M.type, M.name, 'fog', M.fog, 'map', !!M.map, 'emis', M.emissiveIntensity, 'tm', M.toneMapped, 'side', M.side, 'transp', M.transparent, 'on', o.name].join(' ')); });
for (const v of mats.values()) log('  mat', v);
log('fog', b.scene.fog.color.getHexString(), b.scene.fog.density, '| G pos', [G.position.x, G.position.y, G.position.z].join(','), 'rot', G.rotation.y);
// what else is drawn near the keep that is not under its group (the sea, the sky)
const near = []; for (const c of b.scene.children) { if (c === G || !c.visible) continue; const bb = new T.Box3().setFromObject(c); if (bb.isEmpty()) continue; const s = bb.getSize(new T.Vector3()); if (bb.distanceToPoint(new T.Vector3(-6000, 800, 6000)) < 300) near.push((c.name || c.type) + '[' + s.x.toFixed(0) + 'x' + s.y.toFixed(0) + 'x' + s.z.toFixed(0) + ' y' + bb.min.y.toFixed(0) + ']'); }
log('others near', near.join(' ').slice(0, 900));
log('DONE');
