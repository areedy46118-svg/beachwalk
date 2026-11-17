/* MUSIC THROUGH A LOADING SCREEN (2026-11-17, `cutMusicTick`). Not part of the game. Run headless:
 *   PB_PORT=4257 sh tools/probe.sh 'evalFile&f=/tools/cutmusic.js' <out>
 * The opening song started on the beach; the black up; put in the first castle under it; the black down. The music log
 * must show the song going out at the loading screen, and the castle's own (the farmers' fight) coming in. And a black
 * that does NOT change the section (a cutscene's) must leave a playing piece alone. */
const c = b.audioCtx;
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(30); }
await w.AudioContext.prototype.resume.call(c);
b.settings.devMode = true;
b.loadFort(); for (let i = 0; i < 80 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.fortWallsStep(1e9); await sleep(300); }
b.startMusic(1); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(30); }
const bo = w.document.getElementById('blackout');
const ms = () => b.music();
log('before:', b.musicLog().slice(-2).join(' | '));
// a cutscene's black on the beach: nothing should go
bo.style.opacity = '1'; for (let i = 0; i < 20; i++) { b.frame(1); await sleep(20); } bo.style.opacity = '0'; for (let i = 0; i < 20; i++) { b.frame(1); await sleep(20); }
log('after a black on the beach:', b.musicLog().slice(-3).join(' | '));
bo.style.opacity = '1'; for (let i = 0; i < 10; i++) { b.frame(1); await sleep(20); }
b.placeInFort(); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(30); }
bo.style.opacity = '0'; for (let i = 0; i < 90; i++) { b.frame(1); await sleep(30); }
log('in fort', b.state().inFort, '| log:', b.musicLog().slice(-4).join(' | '));
