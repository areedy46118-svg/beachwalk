/* THE LAG SPIKES (2026-11-22, the owner: "i keep getting random lag spikes when breaking things or leaving areas fix all them"):
 * the cellar's fight — the first of them broken (the pieces, the Enemy Log's copy, the dark), a second broken — and then out of the
 * cellar; for each, the longest frame (wall time round each harness frame, which renders) and the game's own long spans
 * (`__bw.lag()`). Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/spikes.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
const frames = (n, tag) => { let mx = 0, at = -1; for (let i = 0; i < n; i++) { const t0 = performance.now(); w.__adv(1); const d = performance.now() - t0; if (d > mx) { mx = d; at = i; } } log(tag, ': longest frame', mx.toFixed(1), 'ms at', at); return mx; };
C.position.set(X - 0.4, Y + 1.7, Z + 1.0); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X - 0.4, Z + 1.0, Y); b.lookAt(X, Y + 0.9, Z + 2.2);
frames(120, 'settled in the cellar');
b.gainJar(1); b.cpInject(); frames(60 * 5, 'the injection and the first up');
b.settings.devMode = false;
const U = b.cpUnitsS(), first = U.find((u) => u.cpBench);
const lagFrom = performance.now();
first.st.hp = 1; b.hurtMutant(first, 5, 1);
frames(40, 'THE FIRST BROKEN (pieces, his likeness, the dark, the six come down)');
frames(60 * 3, '...the drop');
const second = U.find((u) => u !== first && u.st.alive); second.st.hp = 1; b.hurtMutant(second, 5, 1);
frames(40, 'A SECOND BROKEN');
for (const u of U) if (u.st.alive) { u.st.hp = 1; b.hurtMutant(u, 5, 1); }
frames(60, 'THE REST BROKEN AT ONCE');
frames(60 * 4, 'after');
b.startCellar(-1);
frames(60 * 4, 'LEAVING THE CELLAR (the cut and after)');
frames(60 * 2, 'outside');
const L = b.lag(16).filter((e) => e[0] >= lagFrom); log('long spans since the fight:', JSON.stringify(L.slice(0, 16)));
