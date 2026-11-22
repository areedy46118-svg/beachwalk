/* THE MARIONETTE THROUGH A LOADING SCREEN (2026-11-22): at your side with 11 of 18, down the cellar's steps with you and back up
 * — is he there, near, on the floor, still 11; his bar up once hurt; walking off from him (does he keep up, does he jump).
 * Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/marroom.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(2);
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(); if (s.out && s.ready && i > 60) break; }
b.MAR.st = 'with'; b.MAR.hp = 11;
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && m.vis && i > 30) break; }
const rep = (tag) => { const m = b.marS(), d = Math.hypot(m.at[0] - C.position.x, m.at[2] - C.position.z); log(tag, '| him', JSON.stringify(m.at), 'hp', m.hp, 'vis', m.vis, '| from you', f2(d), '| feet', f2(m.at[1] - (b.camBaseS() - 1.7)), '| bars', [...w.document.querySelectorAll('div')].filter((e) => e.style && /6fa35a/.test(e.style.background)).length); };
rep('beside the house:'); { const u = b.MAR.u; log('in mutants', b.mutants.includes(u), '| retired', u.retired, '| alive', u.st.alive, '| immob', u.st.immob, '| struck', u.st.struck, '| hold', u.holdAnim, '| drive', typeof u.kind.drive, '| ticks', b.MAR.ticks, '| st', b.MAR.st); }
w.__clockOn();
for (let i = 0; i < 60; i++) w.__adv(1);
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) w.__adv(1);
for (let i = 0; i < 90; i++) w.__adv(1);
rep('in the cellar:'); { const t0 = b.MAR.ticks; w.__adv(5); log('drive ran', b.MAR.ticks - t0, 'times in 5 frames | mixer', !!b.MAR.u.mixer, '| pending', b.MAR.u.clipsPending, '| awake', b.MAR.u.st.awake, '| jump', b.MAR.jump, '| trail', (b.MAR.trail || []).length); }
{ const m = b.marS(); b.lookAt(m.at[0], m.at[1] + 0.6, m.at[2]); for (let i = 0; i < 4; i++) w.__adv(1); b.lookAt(m.at[0], m.at[1] + 0.6, m.at[2]); w.__adv(1); rep('looking at him:'); shot('mar_cellar', 480, 1.8); }
// walk off down the cellar (teleport-free walk: small steps each frame), and watch the gap
let maxJump = 0, last = null;
for (let i = 0; i < 240; i++) { C.position.x -= 0.02; b.camBaseY = C.position.y; w.__adv(1); const m = b.marS(); if (last) maxJump = Math.max(maxJump, Math.hypot(m.at[0] - last[0], m.at[2] - last[2])); last = m.at; }
rep('after walking 4.8 m:'); log('his largest step in a frame', f2(maxJump));
b.startCellar(-1);
for (let i = 0; i < 400 && (b.celS().celBusy || b.celS().inCel); i++) w.__adv(1);
for (let i = 0; i < 90; i++) w.__adv(1);
rep('back up:');
