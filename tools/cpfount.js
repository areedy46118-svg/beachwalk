// (the fountain and the well drawn nothing but their water — what are they made of in the game? 2026-11-25)
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
b.loadCastleProps();
for (let i = 0; i < 400 && !b.CP.ready; i++) { b.frame(1); await sleep(50); }
for (const k of ['mpFountain', 'mpWell', 'mpBarrel']) {
  const K = b.CP.kinds[k]; if (!K) { log(k, 'no kind'); continue; }
  for (const p of K.parts) { const g = p.geo, m = p.mat; g.computeBoundingBox();
    log(k, 'verts', g.attributes.position.count, 'box', g.boundingBox.min.toArray().map((v) => v.toFixed(2)).join(','), '..', g.boundingBox.max.toArray().map((v) => v.toFixed(2)).join(','),
      '| mat', m.type, 'opacity', m.opacity, 'transparent', m.transparent, 'alphaTest', m.alphaTest, 'visible', m.visible, 'side', m.side, 'map', !!m.map, m.map && m.map.image ? (m.map.image.width + 'x' + m.map.image.height) : '-', 'color', m.color && m.color.getHexString(), 'emissive', m.emissive && m.emissive.getHexString(), 'blending', m.blending, 'depthWrite', m.depthWrite, 'colorWrite', m.colorWrite); }
}
log('DONE');
