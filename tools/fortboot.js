/* THE FIRST CASTLE, from the harness. Not part of the game. (Split out of the paladin's old paltest.js, 2026-11-04.)
 *   await import('/tools/fortboot.js?' + Date.now());
 *   await __fortBoot();         muted, past the intro, dev mode, in the first castle with the farmers' fight on */
const W = window, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mute = async () => {
  document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; });
  const c = W.__bw && W.__bw.audioCtx; if (c) { c.resume = () => Promise.resolve(); try { await c.suspend(); } catch (e) { /* */ } }
};
W.__fortErrs = [];
W.addEventListener('error', (e) => W.__fortErrs.push(String(e.message).slice(0, 200)));
W.__fortBoot = async function () {
  for (let i = 0; i < 60 && !W.__bw; i++) await sleep(500);
  const b = W.__bw; await mute();
  for (let k = 0; k < 300 && !b.state().introDone; k++) { try { if (!b.state().started) b.beginGame(); } catch (e) { /* */ } b.frame(3); await sleep(30); }
  b.settings.devMode = true;
  b.loadFort();
  for (let i = 0; i < 80 && !(b.fortRdy() && b.fortWallsReady()); i++) { b.fortWallsStep(1e9); await sleep(400); }
  b.placeInFort();
  for (let i = 0; i < 30; i++) await sleep(100);
  for (let i = 0; i < 60 && !(b.dkSlotS().unit && b.dkSlotS().unit.texW && b.dkSlotS().unit.texW.compiled); i++) await sleep(250);
  await mute();
  return { intro: b.state().introDone, inFort: b.state().inFort, fight: b.farmFightS().started, dk: !!(b.dkSlotS().unit && b.dkSlotS().unit.model) };
};
