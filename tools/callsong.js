/* THE SONG FROM THE PAGE (2026-11-20, the owner: "have the intro music play on the page that says beachwalk then have the waves
 * come in exactly where the text shows up on the beat drop"): the call in real time from START, and from 68 s of it every
 * half second: the call's clock, the intro song's own time (scheduled? playing?), the waves' and the name's classes — so
 * the song is seen to begin at the page (69.6) and the waves and the name to come in together at its drop (7.39 of it).
 * Run: PB_WAIT=200 PB_PORT=4261 sh tools/probe.sh 'evalFile&f=/tools/callsong.js&title=1' <out> */
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
st.click();
const IC = b.IC, ctx = () => b.audioCtx;
for (let i = 0; i < 1600 && !(b.icNow() >= 68) && !IC.ended; i++) await sleep(50);
const vid = w.document.getElementById('intro-video'), ttl = w.document.getElementById('intro-title');
let t0 = null;
for (let i = 0; i < 30; i++) {
  const now = ctx().currentTime;
  const song = IC.song || null;
  log('call t', IC.ended ? 'ended' : b.icNow().toFixed(2), '| video', vid.className || '-', vid.paused ? 'paused' : 'playing', '| title', ttl.className || '-', '| ctx', now.toFixed(2));
  await sleep(500);
}
