/* THE FIRST CASTLE'S SQUARE, AS A LIST (2026-11-26): the street, the gate and back door, the farmers' doors, the fires, every prop laid,
 * and how open the paving is around given spots — to place a scene where the owner stood.
 *   PB_PORT=4243 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/fortmap.js&at=-11.23,10.50,1.95' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 1500 && !(b.CP.sites.fort && b.CP.sites.fort.built); i++) { b.frame(1); await sleep(20); }
const G = b.fortGeoS(), D = b.cpSiteDefsS().fort, F = b.fortDbg, X = G.X, Z = G.Z, f2 = (v) => v.toFixed(1);
log('K', G.K, 'gate', f2(G.gate.xi), f2(G.gate.zi), 'door', f2(G.door.x), f2(G.door.z));
log('SPINE', F.FARM_SPINE.map((q) => f2(q[0]) + ',' + f2(q[1])).join(' '));
log('DOORS', F.farmDoors.map((q) => f2(q.cx) + ',' + f2(q.cz)).join(' '));
log('FIRES', (b.fortBraziersS() || []).map((B) => f2(B.x) + ',' + f2(B.z)).join(' '));
const site = b.CP.sites.fort;
log('PROPS', site.props.map((P) => P.kind.name + '@' + f2(P.x - X) + ',' + f2(P.z - Z)).join(' '));
// a grid of the paving: . open, A avoided (door, fire, gate), # not open sky / no floor
const ok = (lx, lz) => { const x = X + lx, z = Z + lz, f = D.floor(x, z); if (f === null || !D.open(x, z, false)) return '#'; return b.fortAnchorAvoidS(lx, lz) ? 'A' : '.'; };
for (let lz = 36; lz >= -18; lz -= 1.5) { let row = ''; for (let lx = -30; lx <= 22; lx += 1.5) { const near = site.props.some((P) => Math.hypot(P.x - X - lx, P.z - Z - lz) < 0.8); row += near ? 'P' : ok(lx, lz); } log('ROW', (lz >= 0 ? ' ' : '') + lz.toFixed(1).padStart(5), row); }
const at = (new URLSearchParams(location.search).get('at') || '').split(',').map(Number);
if (at.length === 3) for (const d of [1.5, 2.2, 3, 4, 5]) { const lx = at[0] - Math.sin(at[2]) * d, lz = at[1] - Math.cos(at[2]) * d; log('AHEAD', d, f2(lx), f2(lz), ok(lx, lz), 'floor', (D.floor(X + lx, Z + lz) - G.Y).toFixed(2)); }
{ const sp = []; for (let t = 0; t <= 1; t += 0.01) { const P = F.fortStreetAt ? F.fortStreetAt(t) : null; if (P) sp.push(P); }
  const S = F.FARM_SPINE, dSeg = (x, z) => { let m = 1e9; for (let i = 1; i < S.length; i++) { const [ax, az] = S[i - 1], [bx, bz] = S[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
  log('BOXES', site.props.filter((P) => /crate|box|Crate|Box/.test(P.kind.name) && !P.on).map((P) => P.kind.name + '@' + f2(P.x - X) + ',' + f2(P.z - Z) + ' mid ' + f2(dSeg(P.x - X, P.z - Z)) + (P.carries ? ' +stack' : '')).join(' | ')); }
log('WHY', Object.entries(b.CP.why || {}).filter(([k]) => /anchor/.test(k)).map(([k, v]) => k + '=' + v).join(' '));
log('TREES', site.props.filter((P) => P.kind.K.fixed).map((P) => P.kind.name + '@' + f2(P.x - X) + ',' + f2(P.z - Z)).join(' ') || 'none');
log('LEFT SIDE', site.props.filter((P) => P.x - X < -11 && P.z - Z > 8 && P.z - Z < 24).map((P) => P.kind.name + '@' + f2(P.x - X) + ',' + f2(P.z - Z)).join(' ') || 'none');
// stills: from where the owner stood (eye 1.6 over the floor) looking 1.95 rad, and from the street looking at the doors
w.__clockOn(); w.requestAnimationFrame = () => 0;
if (b.fortWorldS) 0;
const C = b.camera;
for (const [nm, lx, lz, yaw] of [['owner', -11.23, 10.5, 1.95], ['doors', -6.5, 17.5, Math.PI / 2], ['wide', -6, 6, 0.9]]) {
  const x = X + lx, z = Z + lz, fy = D.floor(x, z);
  C.position.set(x, fy + 1.6, z); C.rotation.set(0, 0, 0); C.lookAt(x - Math.sin(yaw), fy + 1.4, z - Math.cos(yaw)); C.updateMatrixWorld(true);
  w.__adv(2); C.position.set(x, fy + 1.6, z); C.lookAt(x - Math.sin(yaw), fy + 1.4, z - Math.cos(yaw)); C.updateMatrixWorld(true);
  b.renderer.render(b.scene, C); shot(nm, 640, 0.9);
}
log('DONE');
