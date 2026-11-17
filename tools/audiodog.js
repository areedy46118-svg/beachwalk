/* THE AUDIO WATCHDOG, TESTED (2026-11-17, `audioWatchdog`). Not part of the game. Run headless:
 *   PB_PORT=4247 sh tools/probe.sh 'evalFile&f=/tools/audiodog.js' <out>
 * In the farmers' fight: the context suspended behind the game's back, the master pulled to nothing, the effects bus
 * pulled to nothing — each must come back by itself within ~2 s, and the log says what it put back. */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
const c = b.audioCtx, A = b.audNodes();
await w.AudioContext.prototype.resume.call(c);
const run = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { b.frame(1); await sleep(16); } };
await run(1500);
log('before', c.state, 'master', A.master.gain.value.toFixed(3), 'sfx', A.sfx.gain.value.toFixed(3));
await w.AudioContext.prototype.suspend.call(c); log('suspended:', c.state); await run(2500); log('after 2.5 s:', c.state);
A.master.gain.cancelScheduledValues(0); A.master.gain.value = 0; await run(3500); log('master zeroed, after 3.5 s:', A.master.gain.value.toFixed(3));
A.sfx.gain.cancelScheduledValues(0); A.sfx.gain.value = 0; await run(3500); log('sfx zeroed, after 3.5 s:', A.sfx.gain.value.toFixed(3));
// and who suspends it, if anyone does, over 12 s of the fight
const S0 = w.AudioContext.prototype.suspend, who = [];
w.AudioContext.prototype.suspend = function () { who.push(((new Error().stack || '').split('\n').slice(2, 5).join(' < ')).replace(/http:\/\/localhost:\d+\//g, '')); return S0.apply(this, arguments); };
const st = []; c.onstatechange = () => st.push(Math.round(performance.now()) + ':' + c.state);
await run(12000);
log('suspend calls', who.length, JSON.stringify(who.slice(0, 4)), '| state changes', st.join(' '));
log('log', JSON.stringify(b.audioDog()));
