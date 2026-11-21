/* THE PUPPET ON HIS BED, AND PUT DOWN IN THE HOUSE (2026-11-21, the owner: "the puppet should always be sitting on the bed not in
 * front of it" / "when you drop him make sure hes on the ground right where you dropped him he just dissapeared ... he should
 * not fall through any floor"). Loads him from far off (the house never drawn) and reads where he sits against the mattress
 * under him; then upstairs by the bed, picks him up (the prompt), drops him where you look, and reads where he lies against
 * the floor there. Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/pupfloor.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.loadElvPuppet(); for (let i = 0; i < 400; i++) { b.frame(1); await sleep(30); const s = b.pupDropS(); if (s.pup) break; }
for (let i = 0; i < 400 && !(b.elvPupBedS && b.elvPupBedS()); i++) { b.frame(1); await sleep(30); }
const bed = b.elvPupBedS && b.elvPupBedS();
const rd = () => { if (!bed) return 'no bed puppet'; bed.updateMatrixWorld(true); const B = new T.Box3().setFromObject(bed), hip = bed.userData.hipW ? bed.userData.hipW() : null; const ms = []; b.elvHouseS().traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') ms.push(o); }); b.elvHouseS().updateMatrixWorld(true); const rc = new T.Raycaster(); const c = B.getCenter(new T.Vector3()); rc.set(new T.Vector3(c.x, B.max.y + 0.5, c.z), new T.Vector3(0, -1, 0)); rc.far = 6; const hs = rc.intersectObjects(ms, false).filter((h) => !bed.getObjectById(h.object.id)); return 'box x ' + B.min.x.toFixed(2) + '..' + B.max.x.toFixed(2) + ' y ' + B.min.y.toFixed(2) + '..' + B.max.y.toFixed(2) + ' z ' + B.min.z.toFixed(2) + '..' + B.max.z.toFixed(2) + ' | under his middle: ' + hs.slice(0, 3).map((h) => (h.object.name || '?').slice(0, 18) + '@' + h.point.y.toFixed(2)).join(', ') + ' | bed spot x ' + (HX + 2.52).toFixed(2) + ' y ' + (HY + 5.88).toFixed(2); };
log('ON THE BED (placed with the house far off):', rd());
// upstairs by the bed: picked up (the prompt), then put down where you look, and where he lies
{
  const C = b.camera, bx = HX + 2.52 - 1.6, bz = HZ - 4.13, fl = b.houseFloorAt(bx, bz, HY + 7, 0.3);
  b.elvLandSet(true); C.position.set(bx, (fl ?? HY + 5) + 1.6, bz); b.camBaseY = C.position.y;
  log('upstairs floor', fl != null ? fl.toFixed(2) : 'none', '| elvLand', b.elvLandS(bx, bz, C.position.y)[2]);
  for (let i = 0; i < 20; i++) { b.frame(1); await sleep(10); }
  b.elvPickUp(); for (let i = 0; i < 5; i++) b.frame(1);
  log('picked up: carrying', b.pupDropS().carrying, '| prompt', w.document.getElementById('prompt') ? w.document.getElementById('prompt').textContent : '?');
  b.look(Math.PI / 2, -0.6); for (let i = 0; i < 5; i++) b.frame(1);
  b.elvDropPuppet(); for (let i = 0; i < 10; i++) b.frame(1);
  let lay = null; b.scene.traverse((o) => { if (!lay && o !== bed && o.parent === b.scene && o.userData && o.getObjectByName && o.getObjectByName('hitProxy') == null && o.type === 'Group' && o.children.length && o.position.y > HY && Math.hypot(o.position.x - bx, o.position.z - bz) < 4) lay = o; });
  const st = b.pupDropS(); log('dropped:', st.dropped, '| carrying', st.carrying);
  if (b.elvDroppedS) { const d = b.elvDroppedS(); const B = new T.Box3().setFromObject(d); const f2 = b.houseFloorAt((B.min.x + B.max.x) / 2, (B.min.z + B.max.z) / 2, B.max.y, 0.3); log('he lies: box x', B.min.x.toFixed(2), B.max.x.toFixed(2), 'y', B.min.y.toFixed(2), B.max.y.toFixed(2), 'z', B.min.z.toFixed(2), B.max.z.toFixed(2), '| floor under him', f2 != null ? f2.toFixed(2) : 'none', '| you at', C.position.x.toFixed(2), C.position.z.toFixed(2)); }
}
