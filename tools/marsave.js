/* THE MARIONETTE ACROSS A CHECKPOINT (2026-11-22, the owner: "every checkpoint the marionette gets with me he should be there
 * still on a reload with the same health we got the checkpoint with"): a fresh game, him with you and hurt, saved; then the
 * page reloaded into that checkpoint the way a death does — is he there, at your side, with that health? Its own profile.
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/marsave.js' <out>   (&room=… for w.__msRoom) */
const f = w.frameElement;
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(2500);
b.camera.position.set(8, 1.7, -60); b.camBaseY = 1.7;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(15); }
const room = new URLSearchParams(top.location.search).get('room');
if (room) { const RB = b.ROOM_BACK[room]; RB.load(); for (let i = 0; i < 300 && !RB.ready(); i++) { b.frame(2); await sleep(50); } RB.place(); for (let i = 0; i < 120; i++) { b.frame(1); await sleep(15); } log('in room', room, JSON.stringify(b.marS())); }
b.MAR.u.st.hp = 11;
for (let i = 0; i < 10; i++) { b.frame(1); await sleep(15); }
log('before', JSON.stringify(b.marS()));
b.saveCheckpoint();
let sv = null; try { sv = JSON.parse(localStorage.getItem('beachwalk.save')); } catch (e) {}
const ff = sv && (sv.flags || sv.f || sv); log('saved', JSON.stringify({ marSt: ff && ff.marSt, marHp: ff && ff.marHp, keys: sv ? Object.keys(sv).slice(0, 8) : null }));
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
w.__old = 1; f.contentWindow.location.reload();
await sleep(1500);
let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (!w2.__old && w2.__bw && w2.__bw.state) break; } catch (e) {} }
const B = w2.__bw; log('reloaded', !w2.__old, B !== b);
const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
for (let i = 0; i < 300 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
for (let k = 0; k < 6; k++) { await sleep(1000); const s = B.marS(), c = B.camera.position; log('after', k, JSON.stringify(s), 'from you', s.at ? Math.hypot(s.at[0] - c.x, s.at[2] - c.z).toFixed(1) : '-'); }
