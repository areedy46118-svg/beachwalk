/* THE RARE KNIGHTS' SHIELDS (2026-11-23): every knight-bodied man given one (`__bwAllShields`); one of them filmed from behind, then
 * struck from behind (the shield off into the debris: where it flies, where it lands, lying how; his health kept) and from the front
 * (hurt). PB_PORT=4241 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/farmshield.js' <out> */
w.__bwAllShields = true;
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 300 && !b.farmUnitsS().filter((u) => u.farmShieldM).length; i++) { b.frame(1); await sleep(30); }
const us = b.farmUnitsS(), sh = us.filter((u) => u.farmShieldM);
log('men', us.length, '| with shields', sh.length, sh.map((u) => u.kindName + ':' + u.kind.file).join(','));
const u = sh[0]; if (!u) { log('NONE'); } else {
  b.settings.devMode = true; u.st.awake = false;
  const T = b.THREE, C = b.camera, p = u.g.position;
  u.g.visible = true; u.model && (u.model.visible = true);
  const snap = (nm, extra = null) => { const hid = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g || (extra && x === extra)) { mine = true; break; } x = x.parent; } if (!mine) { o.visible = false; hid.push(o); } } });
    const bg = b.scene.background; b.scene.background = new T.Color(0x2a3040); const f0 = C.fov; C.fov = 40; C.updateProjectionMatrix(); b.scene.updateMatrixWorld(true); b.renderer.render(b.scene, C);
    const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 360; c.height = Math.round(360 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    for (const o of hid) o.visible = true; b.scene.background = bg; C.fov = f0; C.updateProjectionMatrix();
    const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], N = Math.ceil(d.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] ${nm} ${i}/${N} ${d.slice(i * 8000, (i + 1) * 8000)}`); };
  w.__clockOn();
  const fwd = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
  const at = (k, side = 0) => { C.position.set(p.x + fwd.x * k + fwd.z * side, p.y + 1.6, p.z + fwd.z * k - fwd.x * side); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1.2, p.z); C.updateMatrixWorld(true); };
  w.__adv(2); at(-1.9, 0.6); snap('shield_back'); at(1.9, 0.5); snap('shield_front');
  const hp0 = u.st.hp;
  at(-1.6); const took = b.hurtMutant(u, 2, 0.8);
  log('struck from behind: shield off', !u.farmShieldM, '| his health', hp0, '→', u.st.hp, '| gibs', b.gibsS().length);
  const G = b.gibsS()[b.gibsS().length - 1];
  const tr = []; for (let i = 0; i < 150; i++) { w.__adv(1); if (i % 15 === 0 && G) tr.push(`${(G.m.position.x - p.x).toFixed(1)},${(G.m.position.y - p.y).toFixed(2)},${(G.m.position.z - p.z).toFixed(1)}${G.settled ? ' rest' : ''}`); }
  log('  its flight (from him):', tr.join(' → '));
  if (G) { const up = new T.Vector3(0, 1, 0).applyQuaternion(G.m.children[0].getWorldQuaternion(new T.Quaternion())); log('  at rest: settled', !!G.settled, '| its own +Y (face up if 1 for face +Z-sheets) world', up.toArray().map((v) => v.toFixed(2)).join(',')); }
  at(-3.2, 1.4); if (G) { C.position.set(G.m.position.x + 1.2, G.m.position.y + 1.1, G.m.position.z + 1.2); b.lookAt(G.m.position.x, G.m.position.y, G.m.position.z); } C.updateMatrixWorld(true); snap('shield_down', G && G.m);
  at(1.6); const hp1 = u.st.hp; b.hurtMutant(u, 1, 0.5); log('struck from the front: his health', hp1, '→', u.st.hp);
}
