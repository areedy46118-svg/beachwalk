/* THE PUPPET ON ITS BED, SEEN FROM THE ROOM (2026-11-17). Not part of the game. Run headless:
 *   PB_PORT=4259 sh tools/probe.sh 'evalFile&f=/tools/pupbed2.js' <out>
 * A fresh game walked (by placing) up the beach to the house and up into the back bedroom: is the puppet drawn on the
 * bed — its root, the house, the cull's mark — at each step; and a still from the doorway. */
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(20); }
b.settings.devMode = true;
const cam = b.camera.position, P = () => b.elvPupS();
const say = (tag) => { const R = P() && P().bed && P().bed.root, H = b.scene.getObjectByName('puppetHouse'); log(tag, '| bed puppet', R ? 'visible ' + R.visible + ' culled ' + !!R.userData.bwCulled : 'NOT PLACED', '| house visible', H && H.visible, '| stage', b.elvS().elvStage, 'land', b.elvS().elvLand); };
for (const z of [-400, -560, -650, -700]) { cam.set(14, cam.y, z); for (let i = 0; i < 120; i++) { cam.set(14, cam.y, z); b.frame(1); await sleep(15); } say('z ' + z); }
// into the back bedroom, a metre and a half in front of the bed
const bx = b.HOUSE_X + 2.52 - 1.6, by = b.HOUSE_Y + 5.88 + 1.6, bz = b.HOUSE_Z - 4.13;
for (let i = 0; i < 120; i++) { cam.set(bx, by, bz); b.lookAt(b.HOUSE_X + 2.52, b.HOUSE_Y + 5.6, bz); b.frame(1); await sleep(15); }
say('in the bedroom');
