/* THE HORSESHOE CRAB'S DRAW IN THE MIDDLE OF THE SCREEN (2026-11-21, the owner: "show the horshoe crab drain in the middle of the
 * screen not to the right"). The draw started as the pack's combine starts it; half way in, where the crab, the syringe and the
 * pair of them land on the screen (ndc, -1..1; 0 the middle), and a still. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/crabdraw.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const ci = b.crabItem, si = b.syringeItem; ci.count = 1; if (!b.inventory.includes(ci)) b.addToInventory(ci); if (!b.inventory.includes(si)) b.addToInventory(si);
for (let i = 0; i < 40; i++) { b.frame(1); await sleep(20); }
b.startExtraction(); for (let i = 0; i < 70; i++) { b.frame(1); await sleep(16); }
const T = b.THREE, IC = b.inspectCamera; IC.updateMatrixWorld(true);
const ndc = (o) => { o.updateMatrixWorld(true); const B = new T.Box3().setFromObject(o), c = B.getCenter(new T.Vector3()).project(IC); const pts = []; for (const x of [B.min.x, B.max.x]) for (const y of [B.min.y, B.max.y]) for (const z of [B.min.z, B.max.z]) pts.push(new T.Vector3(x, y, z).project(IC)); const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return 'centre ' + c.x.toFixed(2) + ',' + c.y.toFixed(2) + ' x ' + Math.min(...xs).toFixed(2) + '..' + Math.max(...xs).toFixed(2) + ' y ' + Math.min(...ys).toFixed(2) + '..' + Math.max(...ys).toFixed(2); };
log('extracting', b.state().extracting, '| view offset', IC.view ? [IC.view.offsetX, IC.view.offsetY].join(',') : 'none', '| zoom', IC.zoom, 'filmOffset', IC.filmOffset);
const rig = b.inspectPivot.children[0] && b.inspectPivot.children[0].children[0]; const hc = rig ? rig.children[0] : null; log('rig', rig && rig.name, 'kids', rig ? rig.children.length : 0, '| pivot pos', b.inspectPivot.position.toArray().map((v) => v.toFixed(2)).join(','), 'cam', IC.position.toArray().map((v) => v.toFixed(2)).join(',')); if (hc) { log('hcrab', ndc(hc)); hc.traverse((o) => { if (o.isMesh) log('  part', o.name || '?', o.visible, (o.material && o.material.name) || '', ndc(o)); }); }
log('crab', ndc(b.crab)); log('syringe', ndc(b.syringe)); log('both', ndc(b.crab.parent));
{ b.frame(1); const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.strokeStyle = '#ff0'; g.beginPath(); g.moveTo(c.width / 2, 0); g.lineTo(c.width / 2, c.height); g.stroke();
  const d = c.toDataURL('image/jpeg', 0.88).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'draw', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); }
