/* THE WELL MAN'S REVEAL, THE LENS (2026-11-19, the owner: "give the well guy his old zoom in when he is revealed"): the
 * reveal's cut run as `nov13` does, then the camera's field of view read every few frames through the stare. Run:
 *   PB_PORT=4251 sh tools/probe.sh 'evalFile&f=/tools/wellzoom.js' <out> */
b.settings.devMode = false;
const u = b.wellU(); for (let i = 0; i < 300 && !(u && u.model && u.mixer); i++) { b.frame(1); await sleep(40); }
b.setWellPhase(1); b.wellLook.on = true; b.wellLook.phase = 'black'; b.wellLook.t = 1.89; b.wellLook.to.copy(b.camera.position);
const fov = [];
for (let i = 0; i < 240; i++) { b.frame(1); if (i % 12 === 0) fov.push(b.camera.fov.toFixed(1) + (b.cineS().hold ? '' : '!')); await sleep(5); }
log('settings fov', b.settings.fov, '| fov every 12 frames (! = not held)', fov.join(' '), '| cine', JSON.stringify(b.cineS()), '| stare', JSON.stringify(b.wellStalkS()));
