/* THE FIRST CASTLE'S PROPS AFTER THE OWNER'S 2026-11-26 LIST: what was laid (no well, fountain or sacks), where the trees stand and
 * their planters' tops, and a wooden crate, a barrel and a pot broken in front of the camera — stills over the first second.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/cpbreaks.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
const site = b.CP.sites.fort, by = {}; for (const P of site.props) by[P.kind.name] = (by[P.kind.name] || 0) + 1;
log('PROPS', site.props.length, '|', Object.entries(by).map(([k, v]) => k + '×' + v).join(' '));
for (const P of site.props.filter((q) => q.kind.K.fixed)) log('TREE', P.kind.name, 'at local', (P.x - b.FORT_SITE.X).toFixed(1), (P.z - b.FORT_SITE.Z).toFixed(1), '| planter top', b.cpPlanterTopS ? (b.cpPlanterTopS(P) - P.y).toFixed(2) : '?', 'm');
w.__clockOn(); w.requestAnimationFrame = () => 0; { const L = new b.THREE.AmbientLight(0xffffff, 1.4); b.scene.add(L); }   // (lit to judge the shapes)
const C = b.camera;
const pick = (re) => site.props.find((q) => !q.dead && !q.on && re.test(q.kind.name) && !q.kind.K.fixed);
for (const [nm, re] of [['crate', /^mpCrate$|^crate$|box1/], ['barrel', /barrel|keg/i], ['stall', /mpStall/]]) {
  const P = pick(re); if (!P) { log('no', nm); continue; }
  const a = 0.7, d = P.kind.r + 1.1;
  C.position.set(P.x + Math.sin(a) * d, P.fy + 1.5, P.z + Math.cos(a) * d); C.lookAt(P.x, P.fy + 0.1, P.z); C.updateMatrixWorld(true);
  b.cpBreakS(P, 8, C.position.clone());
  for (let f = 0; f < 50; f++) { w.__adv(1); C.position.set(P.x + Math.sin(a) * d, P.fy + 1.3, P.z + Math.cos(a) * d); C.lookAt(P.x, P.fy + 0.1, P.z); C.updateMatrixWorld(true); if (f === 3 || f === 10 || f === 45) { b.light && 0; b.renderer.render(b.scene, C); shot(nm + '_' + f, 420, 1.0); } }
}
log('DONE');
