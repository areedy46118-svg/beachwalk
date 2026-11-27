/* THE HOUSE ON THE CLIFF COMES UP OUT OF THE FOG (2026-11-25, the owner: "i can see this spawn in"). Walk down the beach from z −450 to
 * −700 in 5 m steps (the loop run at each), and log where the house and the gully's dressing become visible, and how much of them the
 * fog lets through there (exp(−(density·d)²) at their distance). PB_PORT=4227 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/housepop.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true; w.__clockOn();
const C = b.camera, HX = b.HOUSE_X, HZ = b.HOUSE_Z;
let hv = null, fv = null;
const H = () => { let h = null, f = null; b.scene.traverse((o) => { if (!h && o.position && Math.abs(o.position.x - HX) < 0.01 && Math.abs(o.position.z - HZ) < 0.01 && o.children.length > 3) h = o; }); return h; };
const house = H();
log('house group', !!house);
for (let z = -450; z >= -700; z -= 5) {
  C.position.set(8, 1.7, z); b.camBaseY = 1.7; w.__adv(3);
  const v = house && house.visible, d = Math.hypot(HX - 8, HZ - z), fog = Math.exp(-Math.pow(b.scene.fog.density * d, 2));
  if (v && !hv) { hv = z; log('house shown at z', z, '| distance', d.toFixed(0), 'm | fog lets through', (fog * 100).toFixed(1) + '%', '| density', b.scene.fog.density.toFixed(4)); }
}
if (!hv) log('house never shown');
