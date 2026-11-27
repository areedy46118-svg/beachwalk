/* WHERE A TREE AND BOXES FIT ON THE FIRST CASTLE'S LEFT SIDE (2026-11-26): `cpFits` over a grid by the row of chained doors and the
 * fire at (-13.7, 12.5), castle frame. T = a big tree fits (and 2.4 m clear of the fire), c = a crate fits, . = neither, # = no floor.
 *   PB_PORT=4243 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/fortspot.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
const G = b.fortGeoS(), D = b.cpSiteDefsS().fort, X = G.X, Z = G.Z, K = b.CP.kinds;
const fires = (b.fortBraziersS() || []);
const site = b.CP.sites.fort;
log('TREES NOW', site.props.filter((P) => P.kind.K.fixed).map((P) => P.kind.name + '@' + (P.x - X).toFixed(1) + ',' + (P.z - Z).toFixed(1)).join(' ') || 'none');
const tr = [];
for (let lz = 25; lz >= 4; lz -= 0.5) {
  let row = '';
  for (let lx = -19; lx <= -6; lx += 0.5) {
    const x = X + lx, z = Z + lz, fy = D.floor(x, z);
    if (fy === null) { row += '#'; continue; }
    const fire = Math.min(...fires.map((B) => Math.hypot(B.x - lx, B.z - lz)));
    const t = fire > 2.4 && b.cpFitsS(D, K.mpTreeBig, x, z, fy, 0);
    const c = b.cpFitsS(D, K.mpCrate || K.crate, x, z, fy, 0) && !b.fortAnchorAvoidS(lx, lz);
    if (t) tr.push([lx, lz]);
    row += t ? 'T' : c ? 'c' : (b.fortAnchorAvoidS(lx, lz) ? 'A' : '.');
  }
  log('ROW', lz.toFixed(1).padStart(5), row);
}
const want = [-14.6, 11.8];
tr.sort((p, q) => Math.hypot(p[0] - want[0], p[1] - want[1]) - Math.hypot(q[0] - want[0], q[1] - want[1]));
log('TREE SPOTS nearest', tr.slice(0, 12).map((p) => p.join(',')).join(' '));
log('DONE');
