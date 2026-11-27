// (the castle kit's three files: are they in, and the kinds made? — 2026-11-25, the medieval props)
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const errs = []; w.addEventListener('error', (e) => errs.push(e.message)); const ow = w.console.warn; w.console.warn = (...a) => { errs.push(a.join(' ')); ow(...a); };
b.loadCastleProps();
setTimeout(() => {}, 0);
for (let i = 0; i < 400 && !b.CP.ready; i++) { b.frame(1); await sleep(50); }
log('errors', errs.slice(0, 8).join(' | '));
log('gl', JSON.stringify(Object.fromEntries(Object.entries(b.CP.gl).map(([k, v]) => [k, !!v]))), 'noC', b.CP.noC, 'ready', b.CP.ready, 'kinds', Object.keys(b.CP.kinds).length);
if (b.CP.gl.c) { const n = []; b.CP.gl.c.traverse((o) => { if (o.name && /^MP_/.test(o.name)) n.push(o.name + (o.isMesh ? '' : '(' + o.type + ')')); }); log('c nodes', n.join(' ')); }
for (const k of Object.keys(b.CP.kinds).concat(['mpTreeBig','mpTreeSmall','mpWell','mpFountain','mpStall','mpBush','mpTub','mpPail','mpBowls','mpPlate','mpDish','mpBarrel','mpCrate','mpPot']).filter((k2, i, a) => /^mp/.test(k2) && a.indexOf(k2) === i)) { const K = b.CP.kinds[k]; log(k, K ? `h ${K.h.toFixed(2)} hx ${K.hx.toFixed(2)} hz ${K.hz.toFixed(2)} parts ${K.parts.length}` : 'NOT MADE'); }

log('DONE');
