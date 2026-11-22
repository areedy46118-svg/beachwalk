/* A THING PUT DOWN IN THE SEWER (2026-11-22, the owner: "i dropped my water in the sewer and it dissapeared this should never
 * happen anywhere"): the bottle of water dropped at spots round the sewer — on the walk ahead, toward the channel, at a wall —
 * and where each comes to lie, against the floor under it and your feet. Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh
 * 'evalFile&f=/tools/sewdrop.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 400 && !b.state().started; i++) { b.frame(1); await sleep(30); }
b.loadSewer(); for (let i = 0; i < 1500 && !b.sewS().ready; i++) { b.frame(1); await sleep(15); }
b.placeInSewer(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(10); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, T = b.THREE, G = b.sewG();
log('in the sewer', b.sewS().inSewer, '| at', (C.position.x - G.SEW_X).toFixed(2), (C.position.y - G.SEW_Y).toFixed(2), (C.position.z - G.SEW_Z).toFixed(2));
const before = new Set(b.scene.children);
const tries = [['ahead, down', 0, 0.6], ['far ahead', 0, 0.1], ['left (the channel?)', Math.PI / 2, 0.5], ['right', -Math.PI / 2, 0.5], ['behind', Math.PI, 0.6], ['straight down', 0, 1.5]];
for (const [nm, dyaw, pitch] of tries) {
  b.gainWater(1); const it = b.waterBottleItem; if (b.equippedS && b.equippedS() !== it) b.toggleEquip(it); adv(20);
  const yaw = b.state().yaw ?? 0; b.look(dyaw, -pitch); adv(2); b.look(dyaw, -pitch); adv(1);
  b.dropEquipped(); adv(3);
  const added = b.scene.children.filter((o) => !before.has(o)); for (const o of added) before.add(o);
  const m = added.find((o) => o.children.some((c) => c.name === 'hitProxy'));
  if (!m) { log(nm, ': NOTHING DROPPED', added.length); continue; }
  const p = m.getWorldPosition(new T.Vector3());
  const ray = new T.Raycaster(new T.Vector3(p.x, C.position.y + 0.5, p.z), new T.Vector3(0, -1, 0), 0, 30); ray.camera = C;
  const h = ray.intersectObjects([G.world], true).filter((x) => x.face && x.object.isMesh && x.object.visible)[0];
  log(nm, ': at', (p.x - G.SEW_X).toFixed(2), (p.y - G.SEW_Y).toFixed(2), (p.z - G.SEW_Z).toFixed(2), '| floor under it', h ? (h.point.y - G.SEW_Y).toFixed(2) + ' ' + h.object.name : 'none', '| your feet', (b.camBaseS() - 1.7 - G.SEW_Y).toFixed(2), '| visible', m.visible, '| in scene', !!m.parent);
}
