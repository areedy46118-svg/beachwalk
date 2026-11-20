/* THE KING AS A CREATURE, LOOKED AT (2026-11-20): made by `makeMutant` he came out torn into spikes. Stood in front of him
 * in his idle, then with his life layer off, then his own hover clip alone, then the bind pose: stills, and the world scale
 * of a few bones. Run: PB_PORT=4267 sh tools/probe.sh 'evalFile&f=/tools/kingdress.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera; w.__clockOn();
b.KING.mode = 'ready'; u.g.visible = true; w.__adv(10);
w.requestAnimationFrame = () => 0;
const tiles = [];
const kshot = (lab) => { const p = u.g.position, yw = u.g.rotation.y; u.g.updateMatrixWorld(true); C.position.set(p.x + Math.sin(yw) * 8, p.y + 2.0, p.z + Math.cos(yw) * 8); C.fov = 40; C.updateProjectionMatrix(); C.lookAt(p.x, p.y + 1.7, p.z); C.updateMatrixWorld(true); b.lamps && b.lamps(); b.renderer.render(b.scene, C);
  const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 360; c.height = Math.round(360 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(lab, 6, 15); tiles.push(c); };
const bs = () => ['CC_Base_Hip_02', 'CC_Base_Head_038', 'CC_Base_L_Hand_055', 'CC_Base_R_Foot_022'].map((n) => { const o = u.model.getObjectByName(n); if (!o) return n + ' -'; const s = o.getWorldScale(new T.Vector3()), q = o.getWorldPosition(new T.Vector3()).sub(u.g.position); return n.replace('CC_Base_', '') + ' s' + s.x.toFixed(3) + ' at ' + q.toArray().map((v) => v.toFixed(2)).join(','); }).join(' | ');
const play = (n) => { for (const k in u.clips) u.clips[k].stop(); const a = u.clips[n]; if (!a) return; a.reset(); a.setEffectiveWeight(1); a.play(); a.time = 0.5; u.cur = a; u.mixer.update(0); };
play('kIdle'); kshot('kIdle (life on)'); log('kIdle', bs());
const life = u.life; u.life = null; play('kIdle'); kshot('kIdle, no life'); log('kIdle no life', bs());
play('hover'); kshot('hover alone'); log('hover', bs());
play('hit'); kshot('hit (knight pack)');
play('kUpper'); kshot('kUpper');
for (const k in u.clips) u.clips[k].stop(); u.mixer.update(0); kshot('nothing playing'); log('none', bs());
u.life = life;
let nScaleTr = 0, nPosTr = 0; for (const k in u.clips) { const c = u.clips[k].getClip(); for (const t of c.tracks) { if (t.name.endsWith('.scale')) nScaleTr++; if (t.name.endsWith('.position')) nPosTr++; } }
log('scale tracks', nScaleTr, 'position tracks', nPosTr, 'kIdle tracks', u.clips.kIdle.getClip().tracks.slice(0, 6).map((t) => t.name).join(','));
const cols = 3, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'kingdress', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
