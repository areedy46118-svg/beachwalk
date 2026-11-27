// (does the kick break what it meets? the first castle, its props built; stood 1.1 m from each of a few, facing it, kicked — 2026-11-25)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
const site = b.CP.sites.fort; if (!site || !site.built) { log('props not built'); throw 0; }
w.__clockOn(); b.settings.devMode = true;
for (let i = 0; i < 60 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
const C = b.camera, want = ['mpCrate', 'mpBarrel', 'mpPot', 'crate', 'barrel', 'mpTub', 'mpPail', 'mpStall', 'mpWell'];
for (const P of site.props.filter((q) => !q.dead && !q.on && want.includes(q.kind.name)).slice(0, 8)) {
  const a = Math.atan2(P.wn[0], P.wn[1]), d = P.kind.r + 0.9;
  for (let i = 0; i < 4; i++) { C.position.set(P.x + Math.sin(a) * d, P.fy + 1.7, P.z + Math.cos(a) * d); b.camBaseY = C.position.y; b.lookAt(P.x, P.fy + 0.4, P.z); w.__adv(1); }
  w.__kickDbg = []; b.KICK.cd = 0; b.startKick();
  for (let i = 0; i < 70; i++) { C.position.set(P.x + Math.sin(a) * d, P.fy + 1.7, P.z + Math.cos(a) * d); b.lookAt(P.x, P.fy + 0.4, P.z); w.__adv(1); }
  log(P.kind.name, 'at', d.toFixed(2), 'm | broken', P.dead, '|', w.__kickDbg.filter((x) => typeof x === 'string').join(' ; '));
}
log('DONE');
