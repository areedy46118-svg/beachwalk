/* THE SEWER'S LAMPS DO NOT COME ON AS YOU WALK (2026-11-22, the owner: "THE SEWER LIGHTS I SHOLD NOT SEE THEM COME ON WHILE
 * WALKING … ANY LIGHT THATS ON SHOULD NOT CHANGE WHEN GETTING CLOSER TO IT"). One view down the tunnel from near the ladder,
 * drawn twice: once with the light pool as it is for that spot, once with the pool left as it was for a spot 30 m down the
 * tunnel (the six nearest lamps THERE) — what the pool decides is the difference. Before the fix that difference was the
 * lamps near you lighting the walls; after it, nothing of the sewer's own lamps is the pool's to decide.
 * PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/sewlamps.js' <out>  (&far=x,z &near=x,z &yaw=) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search);
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
b.introDone = true; b.started = true; b.loadSewer();
for (let i = 0; i < 900 && !b.sewS().ready; i++) { b.frame(1); await sleep(40); }
for (const e of ['overlay', 'blackout']) { const el = w.document.getElementById(e); if (el) { el.style.transition = 'none'; el.style.opacity = '0'; } }
b.sewRestore({ lv: 15 }); b.placeInSewer();
w.__clockOn();
for (let i = 0; i < 240; i++) { w.__adv(1); if (i % 20 === 0) await sleep(50); }
const mon = b.sewMon && b.sewMon(); if (mon && mon.g) mon.g.visible = false;
const far = (Q.get('far') || '1.6,0.8').split(',').map(Number), near = (Q.get('near') || '1.6,-30').split(',').map(Number), yaw = +(Q.get('yaw') || 0);
const G = b.sewG(); log('lamps in the list', G.P.lampSrc ? G.P.lampSrc.length : 'none', '| pooled marks', G.P.lampSrc ? G.P.lampSrc.slice(0, 3).map((q) => q.L.decay.toFixed(3)).join(',') : '');
const grab = () => { b.camera.updateMatrixWorld(true); b.renderer.render(b.scene, b.camera); const src = b.renderer.domElement, cv = w.document.createElement('canvas'); cv.width = 480; cv.height = Math.round(480 * src.height / src.width); const g = cv.getContext('2d'); g.drawImage(src, 0, 0, cv.width, cv.height); return cv; };
for (let i = 0; i < 60; i++) { b.sewSet(far[0], far[1], yaw, 0); w.__adv(1); }
log('fog lamps', b.fogLampsS ? b.fogLampsS() : '?');
b.sewSet(far[0], far[1], yaw, 0); const A = grab();
for (let i = 0; i < 60; i++) { b.sewSet(near[0], near[1], yaw, 0); w.__adv(1); }
b.sewSet(far[0], far[1], yaw, 0); const B = grab();
const a = A.getContext('2d').getImageData(0, 0, A.width, A.height).data, bb = B.getContext('2d').getImageData(0, 0, B.width, B.height).data;
let sum = 0, big = 0, ma = 0, mb = 0;
for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - bb[i]) + Math.abs(a[i + 1] - bb[i + 1]) + Math.abs(a[i + 2] - bb[i + 2]); sum += d; if (d > 12) big++; ma += a[i] + a[i + 1] + a[i + 2]; mb += bb[i] + bb[i + 1] + bb[i + 2]; }
const N = a.length / 4;
log('mean |diff|', (sum / N / 3).toFixed(2), '| pixels changed >12', (100 * big / N).toFixed(1) + '%', '| mean level', (ma / N / 3).toFixed(1), 'vs', (mb / N / 3).toFixed(1));
const sh = w.document.createElement('canvas'); sh.width = A.width * 2; sh.height = A.height; const g = sh.getContext('2d'); g.filter = 'brightness(1.6)'; g.drawImage(A, 0, 0); g.drawImage(B, A.width, 0); g.filter = 'none'; g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText('pool for here', 6, 14); g.fillText('pool from 30 m on', A.width + 6, 14);
const d = sh.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'sewlamps' + (Q.get('tag') || ''), i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
