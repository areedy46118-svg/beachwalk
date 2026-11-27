// (the first castle's trees, with their planters: each from four sides, 8 m off and 2.5 m up — 2026-11-25)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
const site = b.CP.sites.fort; w.__clockOn(); w.requestAnimationFrame = () => 0;
const C = b.camera, D = +(new URLSearchParams(location.search).get('d') || 8);
for (const P of site.props.filter((q) => /^mpTree|mpFountain|mpWell|mpStall/.test(q.kind.name))) {
  log(P.kind.name, 'at', P.x.toFixed(1), P.z.toFixed(1), 'h', P.kind.h.toFixed(1));
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + 0.4;
    C.position.set(P.x + Math.sin(a) * D, P.fy + 2.5, P.z + Math.cos(a) * D); C.lookAt(P.x, P.fy + Math.min(3, P.kind.h * 0.4), P.z); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C); shot(P.kind.name + '_' + k, 360, 1.0);
  }
}
log('DONE');
