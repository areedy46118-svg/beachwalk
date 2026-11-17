/* A GARGOYLE BREAKING, SEEN (2026-11-17, "TURN UP BREAK EFFECTS ON THE GARGOYLES"). Not part of the game. Run headless:
 *   PB_PORT=4250 sh tools/probe.sh 'evalFile&f=/tools/gargbreak.js' <out>
 * One woken and hung 4 m in front of you, killed by your blow; stills at 0.1, 0.35 and 0.8 s; the pieces, chips and
 * clouds counted, and the frame times through the break. */
w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch;
M.stage = 'with'; M.ally = true; M.place = '?';
const home = [b.C13_X + A.ax + A.ux * (A.L + 6.0), b.C13_Z + A.az + A.uz * (A.L + 6.0)];
cam.set(home[0], cam.y, home[1]); for (let i = 0; i < 60; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
const f = new b.THREE.Vector3(); b.camera.getWorldDirection(f); f.y = 0; f.normalize();
const u = G.units[0]; G.phase = 1; u.gp.mode = 'recover';
u.g.position.set(cam.x + f.x * 4, cam.y - 0.6, cam.z + f.z * 4); u.g.visible = true;
for (let i = 0; i < 20; i++) { b.lookAt(u.g.position.x, u.g.position.y + 0.3, u.g.position.z); w.__c13Step(1); u.g.position.set(cam.x + f.x * 4, cam.y - 0.6, cam.z + f.z * 4); }
const g0 = b.scene.children.length;
b.hurtMutantTest(u, 999);
const ft = []; let k = 0;
for (const [t, nm] of [[0.1, 'break_010'], [0.35, 'break_035'], [0.8, 'break_080']]) {
  while (k < t * 60) { const t0 = performance.now(); w.__c13Step(1); ft.push(performance.now() - t0); k++; }
  shot(nm, 640, 1.4);
}
log('scene objects before', g0, 'after', b.scene.children.length, '| slowest step ms', Math.max(...ft).toFixed(1), '| mean', (ft.reduce((a, c) => a + c, 0) / ft.length).toFixed(1));
