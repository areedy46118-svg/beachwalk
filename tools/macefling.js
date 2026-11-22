/* THE MACE'S THROW (2026-11-22, the owner: "the mace should fling enemies bodies further based on where hit … crushing … smashing
 * heads and bodies. keep damage where its at"): one of Elvédor's kind killed at a stride, aimed at his head, his chest, his legs,
 * and with an overhead — with the mace and with the toy shovel — how far his hips go, how high, and whether the head went.
 * Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/macefling.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE;
w.__clockOn();
const one = async (tool, aimK, oh, tag) => {
  C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
  const u = b.makeMutant(6, -401.6, 'elvedor', 0);
  for (let i = 0; i < 600 && !(u.model && !u.parLate); i++) { b.frame(1); await sleep(10); if (u.parLate) try { if (u.parLate()) u.parLate = null; } catch (e) {} }
  b.addToInventory(tool); if (b.state().equipped !== tool.name) b.toggleEquip(tool);
  for (let i = 0; i < 10; i++) w.__adv(1);
  b.lookAt(6, (u.kind.h || 1.9) * aimK, -401.6); w.__adv(1); b.lookAt(6, (u.kind.h || 1.9) * aimK, -401.6);
  const p0 = u.g.position.clone(); u.st.hp = 1;
  if (oh) b.digOverheadS && b.digOverheadS(true);
  b.hurtMutant(u, 1, oh ? 1 : 0.6);
  let maxD = 0, maxY = 0, hip = null; u.model.traverse((o) => { if (o.isBone && /Hips$/.test(o.name)) hip = hip || o; });
  for (let i = 0; i < 150; i++) { w.__adv(1); if (hip) { const h = hip.getWorldPosition(new T.Vector3()); maxD = Math.max(maxD, Math.hypot(h.x - p0.x, h.z - p0.z)); maxY = Math.max(maxY, h.y - p0.y); } }
  log(tag, '| hips thrown', maxD.toFixed(2), 'm, up to', maxY.toFixed(2), 'm | head gone', !!(u.gone && (u.gone.Character1_Head || u.gone.Character1_Neck)), '| mace mark', u.st.killMace, (u.st.killHitK ?? -1).toFixed(2));
  if (oh) b.digOverheadS && b.digOverheadS(false);
  u.g.visible = false;
};
for (const [tool, nm] of [[b.maceItem, 'mace'], [b.shovelItem, 'shovel']]) {
  await one(tool, 0.92, false, nm + ' HEAD');
  await one(tool, 0.6, false, nm + ' BODY');
  await one(tool, 0.2, false, nm + ' LEGS');
}
