/* what stands behind the tavern's window: the yard group's meshes and their materials */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 500 && !b.TAV_YARDS.on; i++) { b.frame(1); await sleep(40); }
const G = b.TAV_YARDS.G; log('yard on', b.TAV_YARDS.on, 'children', G && G.children.length);
for (const m of (G ? G.children : [])) { const M = m.material; log(' ', m.name, '| faces', ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) | 0, '|', M.type, M.name, '| color', M.color ? M.color.getHexString() : '-', '| map', !!M.map, M.map && M.map.image ? (M.map.image.width + 'x' + M.map.image.height) : '', '| vc', M.vertexColors, 'attrs', Object.keys(m.geometry.attributes).join(','), '| tm', M.toneMapped, 'fog', M.fog); }
log('exposure', b.renderer.toneMappingExposure, 'tm', b.renderer.toneMapping);
log('DONE');
