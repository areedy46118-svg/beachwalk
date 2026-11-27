/* THE WORKSHOP PUPPETS' VOICES (2026-11-23, the owner's five bounces: "use these for the puppet sounds they are labeled"). Into the
 * cellar as `pupfight` goes; every buffer started is named by the bank it came from (`AudioBufferSourceNode.start` wrapped):
 * the injection, then the first one fighting you (devMode off, kept alive), struck a few times, and 40 s of the fight for the
 * rare phrase. Counts per bank, and when.
 * PB_PORT=4227 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/pupvox.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
let at0 = null;
const stand = (lx, lz, tx, tz) => { if (!at0 || at0[0] !== lx || at0[1] !== lz) { at0 = [lx, lz]; C.position.set(X + lx, Y + 1.7, Z + lz); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X + lx, Z + lz, Y); } b.lookAt(X + tx, Y + 1.0, Z + tz); };
// name every buffer played by its bank
const SB = b.sampleBanksS(), name = new Map(); for (const k of ['pupAttack', 'pupHurt', 'pupInject', 'pupPhrase']) (SB[k] || []).forEach((buf) => buf && name.set(buf, k));
log('loaded', ['pupAttack', 'pupHurt', 'pupInject', 'pupPhrase'].map((k) => k + ' ' + (SB[k] || []).filter(Boolean).length).join(', '));
const heard = []; let clock = 0;
const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) { const n = this.buffer && name.get(this.buffer); if (n) heard.push(n + '@' + clock.toFixed(1)); return S0.apply(this, a); };
const run = (secs, f) => { for (let i = 0; i < secs * 60; i++) { f && f(); w.__adv(1); clock += 1 / 60; } };
b.gainJar(1);
run(0.1, () => stand(-0.4, 1.3, -0.4, 2.3));
b.cpInject();
run(5, () => stand(-0.4, 1.0, -0.4, 2.3));
log('after the injection', heard.join(' '));
const U = b.cpUnitsS(), first = U.find((u) => u.cpBench);
b.settings.devMode = false; b.setHp(4);
run(8, () => { stand(-0.8, -0.2, first.g.position.x - X, first.g.position.z - Z); if (b.state().hp < 3) b.setHp(4); });
log('first fighting 8 s', heard.join(' '));
for (let k = 0; k < 3 && first.st.alive; k++) { b.hurtMutant(first, 1, 0.3); log("  strike", k, "hp", first.st.hp, "air", !!first.cpAir); run(2.5, () => { if (b.state().hp < 3) b.setHp(4); }); }
log('struck x3', heard.join(' '));
run(25, () => { stand(-0.8, -0.2, first.g.position.x - X, first.g.position.z - Z); if (b.state().hp < 3) b.setHp(4); });
const cnt = {}; for (const h of heard) { const k = h.split('@')[0]; cnt[k] = (cnt[k] || 0) + 1; }
log('in all', JSON.stringify(cnt), '| fight', b.cpS().fight ?? '', JSON.stringify(b.cpS()).slice(0, 160));
b.settings.devMode = true;
