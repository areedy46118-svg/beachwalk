/* SKRIM'S HOOK AS A WEAPON (2026-11-19): in hand (and its chain off the pommel), a light cut timed against the katana's,
 * the Shift whirl, the throw into a pale mutant 9 m out, the drag in, and the cooldown (a second Shift hold at once is the
 * stab, not a throw). Stills of the whole frame, view model and all. `&dist=` the mutant's distance.
 * Run: PB_PORT=4255 sh tools/probe.sh 'evalFile&f=/tools/hookweapon.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const T = b.THREE, C = b.camera, Q = new URLSearchParams(location.search), DIST = +(Q.get('dist') || 9);
for (let i = 0; i < 400 && !b.hookRawS(); i++) { b.frame(1); await sleep(50); }
log('hook model in', !!b.hookRawS());
w.__clockOn();
const adv = (n = 1) => w.__adv(n);
const tiles = [];
const vshot = (lab) => {
  adv(1);
  const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * src.height / src.width);
  const g = c.getContext('2d'); g.filter = 'brightness(1.5)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none';
  g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(lab, 6, 16); tiles.push(c);
};
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
const run = (n) => adv(n);
b.addToInventory(b.hookItem); b.toggleEquip(b.hookItem);
run(30);
log('equipped', b.state().equipped, 'dangle links', !!(b.HD.links && b.HD.links.visible));
const swingFrames = (it) => { if (b.state().equipped !== it.name) b.toggleEquip(it); run(20); b.startDig(0); let n = 0; while (n < 300) { adv(1); n++; if (!(b.digT > 0)) break; } return n; };
log('light cut frames: hook', swingFrames(b.hookItem), 'katana', (b.addToInventory(b.katanaItem), swingFrames(b.katanaItem)));
b.toggleEquip(b.hookItem); run(20);
// a pale one ahead of you, down the beach, standing
const fw = new T.Vector3(); C.getWorldDirection(fw); fw.y = 0; fw.normalize();
const mx = C.position.x + fw.x * DIST, mz = C.position.z + fw.z * DIST;
const u = b.mutSpawnTest(mx, mz, 'pale');
for (let i = 0; i < 300 && (u.clipsPending > 0 || !u.model); i++) { adv(1); await sleep(30); }
u.st.hp = 999; u.st.awake = true; run(90);
log('mutant', u.kindName, 'visible', u.g.visible, 'alive', u.st.alive, 'at', Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z).toFixed(2));
b.lookAt(u.g.position.x, u.g.position.y + 1.3, u.g.position.z); run(20);
vshot('rest, hook in hand');
// a light cut, timed (and the katana's, for the pace)
// the whirl
key('ShiftLeft', true); b.startWind();
for (let i = 0; i < 70; i++) { u.g.position.set(mx, u.g.position.y, mz); adv(1); if (i === 14 || i === 40 || i === 69) vshot('whirl ' + (i / 60).toFixed(2) + 's  windT ' + b.windT.toFixed(2)); }
b.lookAt(u.g.position.x, u.g.position.y + 1.3, u.g.position.z); adv(1); b.lookAt(u.g.position.x, u.g.position.y + 1.3, u.g.position.z); adv(1);
const d0 = Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z);
b.releaseWind(); key('ShiftLeft', false);
log('thrown: st', b.HK.st, 'target', b.HK.u === u ? 'the mutant' : (b.HK.to ? b.HK.to.kind : 'none'), 'd0', d0.toFixed(2));
let last = b.HK.st, t = 0;
for (let i = 1; i <= 150; i++) {
  if ([4, 10, 16].includes(i)) vshot('t ' + (i / 60).toFixed(2) + ' ' + b.HK.st); else adv(1);
  t = i / 60;
  if (b.HK.st !== last) { log('t', t.toFixed(2), last, '->', b.HK.st, 'mutant at', Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z).toFixed(2), 'hp', u.st.hp, 'bleed', (+(u.st.bleed || 0)).toFixed(2)); last = b.HK.st; if (last === 'bite' || last === 'back') vshot('t ' + t.toFixed(2) + ' ' + last); }
  if (b.HK.st === 'bite' && i % 6 === 0) vshot('drag t ' + t.toFixed(2) + ' d ' + Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z).toFixed(1));
  if (b.HK.st === 'idle' && i > 20) break;
}
log('home at', t.toFixed(2), 's; mutant now', Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z).toFixed(2), 'm (from', d0.toFixed(2) + '); cd', b.HK.cd.toFixed(2), 'recoil', (+(u.st.recoil || 0)).toFixed(2));
run(20); vshot('home, cd ' + b.HK.cd.toFixed(1));
// at once again: a stab, not a throw
key('ShiftLeft', true); b.startWind(); run(40); b.releaseWind(); key('ShiftLeft', false);
log('second Shift hold at once: hook st', b.HK.st, 'swinging', !!b.state().digT);
run(60);
for (let i = 0; i < 8 * 60 && b.HK.cd > 0; i++) adv(1);
key('ShiftLeft', true); b.startWind(); run(30); b.releaseWind(); key('ShiftLeft', false);
log('after the wait: hook st', b.HK.st);
run(90);
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'hook', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
