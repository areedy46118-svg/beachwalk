/* THE FIJI BOTTLE (2026-11-21): in your hand (held still, then swung and stopped, then drinking), in the pack's box, and its
 * icon — stills of each, and the water surface's tilt read off its plane so the slosh shows as numbers too.
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/fijibottle.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const it = b.packByName('Bottle of water'); b.addToInventory(it);
for (let i = 0; i < 200 && !(it.inspectModel && it.inspectModel.userData.filled); i++) { b.frame(1); await sleep(50); }
log('filled', !!it.inspectModel.userData.filled, 'meshes', it.inspectModel.children.map((c) => c.name).join(' | '));
w.__clockOn();
b.toggleEquip(it); w.__adv(40); log('equipped', b.equippedS && b.equippedS() && b.equippedS().name, 'vm visible', it.viewmodel.visible);
const tiles = [], C = b.camera;
const grab = (lab) => { w.__adv(1); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 420; c.height = Math.round(420 * (src.height * 0.58) / (src.width * 0.42)); const g = c.getContext('2d'); g.drawImage(src, src.width * 0.55, src.height * 0.42, src.width * 0.42, src.height * 0.58, 0, 0, c.width, c.height); g.fillStyle = '#ff0'; g.font = '13px monospace'; g.fillText(lab, 4, 14); tiles.push(c); };
const water = () => it.viewmodel.getObjectByName('water'), plane = () => { const m = water() && water().material; return m ? b.waterPlaneOf(m) : null; };
const tilt = () => { const p = plane(); return p ? (Math.acos(Math.min(1, Math.abs(p.y))) * 180 / Math.PI).toFixed(1) + '°' : '-'; };
w.__adv(30); grab('held, still  tilt ' + tilt());
log('held still: surface tilt', tilt());
// swing the view hard left then stop
const yaw0 = b.lookEulerS ? 0 : 0; let L = [];
for (let i = 0; i < 20; i++) { b.look(-0.06 * i, 0); w.__adv(1); }
for (let i = 0; i < 50; i++) { w.__adv(1); if (i % 5 === 0) L.push(tilt()); }
grab('after a swing  tilt ' + tilt());
log('after a swing, tilt every 5 frames:', L.join(' '));
// drink
w.dispatchEvent(new w.MouseEvent('mousedown', { button: 0 })); w.dispatchEvent(new w.MouseEvent('mouseup', { button: 0 }));
if (b.drinkWaterS) b.drinkWaterS();
for (let i = 0; i < 30; i++) w.__adv(1); grab('drinking  tilt ' + tilt());
const cols = 3, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'fiji', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
