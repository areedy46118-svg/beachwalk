/* WHICH WAY THE HOOK'S POINT FACES IN YOUR FIST (2026-11-19, the owner: "the point of the hook should face the enemy while
 * holding the hook"): at rest, the fit turned about its own length (`phi`) and leaned in the fist (`tx` about the fist's X,
 * `tz` about its Z, both outside the turn — Euler 'ZXY', as `fitHook` sets it); for each, where the point is, where it aims
 * (its end's tangent), where the top of the curl is, all in the lens's frame (-z ahead), and the curl's dot with the lens's
 * forward. `&phi=a,b,..` `&tx=..` `&tz=..` to choose. Run: PB_PORT=4259 sh tools/probe.sh 'evalFile&f=/tools/hookaim.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
w.__clockOn();
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); w.__adv(60);
const Q = new URLSearchParams(location.search), list = (k, d) => (Q.get(k) ? Q.get(k).split(',').map(Number) : d);
const T = b.THREE, fit = b.hookModel.children[0], inner = fit.children[0], m = inner.children[0], vmc = b.vmCamera; vmc.updateMatrixWorld(true);
const fwd = new T.Vector3(0, 0, -1).applyQuaternion(vmc.quaternion), f = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
const keep = fit.rotation.clone(), rows = [];
for (const phi of list('phi', [-1.57, -1.18, -0.79, 0, 0.79, 1.18, 1.57])) for (const tx of list('tx', [0])) for (const tz of list('tz', [0])) {
  fit.rotation.set(tx, phi, tz, 'ZXY'); fit.updateMatrixWorld(true);
  const P0 = m.localToWorld(new T.Vector3(-0.082, 0.032, 0.253)), P1 = m.localToWorld(new T.Vector3(-0.128, 0.033, 0.342)), top = m.localToWorld(new T.Vector3(-0.08, 0.085, 0.36));
  const O = inner.localToWorld(new T.Vector3()), D = inner.localToWorld(new T.Vector3(-0.707, 0.707, 0)).sub(O).normalize();
  const aim = P0.clone().sub(P1).normalize().transformDirection(vmc.matrixWorldInverse), ndc = P0.clone().project(vmc);
  P0.applyMatrix4(vmc.matrixWorldInverse); top.applyMatrix4(vmc.matrixWorldInverse);
  rows.push(`phi ${phi} tx ${tx} tz ${tz}  curl.fwd ${D.dot(fwd).toFixed(2)}  point ${f(P0)} (ndc ${ndc.x.toFixed(2)},${ndc.y.toFixed(2)})  aims ${f(aim)}  curl top ${f(top)}`);
}
fit.rotation.copy(keep);
log(rows.join('\n'));
