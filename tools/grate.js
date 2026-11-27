/* THE DRAIN'S GRATE PULLED OFF BY HAND AND THROWN (2026-11-23): in the drain room by the outlet, every screw out (the last one's own
 * call: loose), the outlet's label; pulled (in your hands? where?); thrown across the room — where it flies and where it comes to
 * rest against the room's floor; picked up again; and as after a load with it off. &shots=1 stills.
 * PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/grate.js' <out> */
const Q0 = new URLSearchParams(location.search);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
const C = b.camera, DX = b.DRAIN_XS(), DZ = b.DRAIN_ZS(), G0 = b.grateS();
log('outlet', JSON.stringify(G0.outlet), 'room', JSON.stringify(G0.room), 'floor', G0.floor, 'drain at', DX.toFixed(1), DZ.toFixed(1));
// walk in: the mouth, then the room's middle facing the outlet
C.position.set(DX - 2.5, 1.7, DZ); b.camBaseY = 1.7;
for (let i = 0; i < 20; i++) b.frame(1);
const O = G0.outlet, mid = DX + (G0.room[0] + G0.room[1]) / 2;
const stand = (x, z) => { for (let i = 0; i < 8; i++) { C.position.set(x, G0.floor + 1.7, z); b.camBaseY = G0.floor + 1.7; b.lookAt(O[0], O[1], O[2]); b.frame(1); } };
stand(DX + 0.5, DZ); stand(mid, DZ); stand(O[0] - (+(Q0.get('near') || 1.4)) * Math.sign(O[0] - mid || 1), O[2] + (+(Q0.get('side') || 0)));   // (&near= how far from the outlet you pull, &side= off its line)
log('stood at', (C.position.x - DX).toFixed(2), (C.position.z - DZ).toFixed(2), 'inside', b.insideDrainS());
w.__clockOn();
b.setGrateScrewsS(15); b.grateLoosenS();
log('loose:', JSON.stringify(b.grateS()));
b.pullGrateS(); { const tr0 = []; for (let i = 0; i < 90; i++) { if (Q0.get('shots') && i % 6 === 0) { b.renderer.render(b.scene, C); shot('pull_' + String(i).padStart(3, '0'), 360, 1.0); } b.lookAt(O[0], O[1], O[2]); w.__adv(1); if (i % 6 === 0) { const S = b.grateS(), gp = b.grateObjS ? b.grateObjS() : null; tr0.push(`${i}: you ${(C.position.x - DX).toFixed(2)} grate ${S.at ? (S.at[0] - DX).toFixed(2) : gp ? 'tween ' + (gp.x - DX).toFixed(2) : '-'} in ${b.insideDrainS()}`); } } log('held:', tr0.join(' | ')); }
const S1 = b.grateS(); log('pulled:', JSON.stringify(S1), '| from your eye', Math.hypot(S1.at[0] - C.position.x, S1.at[1] - C.position.y, S1.at[2] - C.position.z).toFixed(2));
// thrown along the room, back toward the door
const aimT = (new URLSearchParams(location.search).get('aim') || 'corner');
const A = aimT === 'door' ? [DX + G0.room[0], G0.floor + 1.0, DZ] : aimT === 'side' ? [C.position.x - 1, G0.floor + 0.8, DZ - G0.room[2] - 2] : [DX + G0.room[0] + 0.3, G0.floor + 0.8, DZ + G0.room[2] + 1.5];
b.lookAt(A[0], A[1], A[2]); C.updateMatrixWorld(true); b.throwHeldS();
const tr = []; { const S = b.grateS(); tr.push(`T0 ${(S.at[0] - DX).toFixed(2)} v ${S.vel}`); } for (let i = 0; i < 240; i++) { w.__adv(1); if (i < 4 || i % 20 === 0) { const S = b.grateS(); tr.push(`${(S.at[0] - DX).toFixed(1)},${(S.at[1] - G0.floor).toFixed(2)},${(S.at[2] - DZ).toFixed(1)}`); } }
const S2 = b.grateS(); log('aim', aimT, '| thrown, local x,y-over-floor,z:', tr.join(' → '), '| at rest y over the floor', (S2.at[1] - G0.floor).toFixed(3), '| sand would say', S2.sand);
// and picked up again where it lies
const S3 = b.grateS(); C.position.set(S3.at[0] + 1.0, G0.floor + 1.7, S3.at[2]); b.camBaseY = G0.floor + 1.7; b.lookAt(S3.at[0], S3.at[1], S3.at[2]); for (let i = 0; i < 6; i++) { b.lookAt(S3.at[0], S3.at[1], S3.at[2]); w.__adv(1); }
C.position.set(S3.at[0] + 0.9, G0.floor + 1.7, S3.at[2] + 0.2); b.camBaseY = C.position.y; b.lookAt(S3.at[0], S3.at[1], S3.at[2]); C.updateMatrixWorld(true);
log('aimed at it:', JSON.stringify(b.hoverNowS()));
b.primaryActionS(); w.__adv(10); log('picked up again:', b.grateS().held);
if (new URLSearchParams(location.search).get('shots')) { const src = b.renderer.domElement, c = w.document.createElement('canvas'); w.__adv(1); c.width = 480; c.height = Math.round(480 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], N = Math.ceil(d.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] grate_rest ${i}/${N} ${d.slice(i * 8000, (i + 1) * 8000)}`); }
