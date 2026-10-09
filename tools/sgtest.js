/* THE DOUBLE, in the hands. Not part of the game.
 *   sessionStorage['beachwalk.skipIntro'] = '1'; location.reload();   (then, in the NEXT call:)
 *   eval(await (await fetch('/tools/sgtest.js')).text()); await __sgBoot();
 *   __sgSheet(plan, every, W, H)  runs whole frames on a fake clock and draws the player's own view every
 *                                 `every` frames into a sheet; `plan(f)` is called before frame f (fire, reload,
 *                                 aim...). -> padded base64 jpeg (write to a file and decode it in the shell)
 *   __sgFire() / __sgReload()     the trigger and the R key */
(function () {
  const b = window.__bw;
  window.__sgBoot = async (opts = {}) => {
    let i = 0; while (i++ < 160 && !(b.startGate().startReady)) { b.frame(1); await new Promise((r) => setTimeout(r, 250)); }
    b.beginGame(); b.settings.devMode = opts.dev !== false;
    window.requestAnimationFrame = () => 0;
    const real = performance.now.bind(performance), base = real(); let off = 0, creep = 0;
    performance.now = () => base + off + (creep += 0.01);
    window.__cadv = (k) => { for (let n = 0; n < k; n++) { off += 16.7; b.frame(1); } };
    for (let n = 0; n < 240 && b.frozen(); n++) { window.__cadv(1); await new Promise((r) => setTimeout(r, 10)); }
    if (opts.noGun) return { frozen: b.frozen() };
    b.addToInventory(b.shotgunItem);              // it refuses a duplicate by identity
    b.sgCh = [1, 1]; b.sgSpare = 12;
    if (b.state().equipped !== b.shotgunItem.name) b.toggleEquip(b.shotgunItem);
    b.fallbackLook = true;
    window.__cadv(30);
    return { frozen: b.frozen(), equipped: b.state().equipped, loaded: b.sgCh.join(','), spare: b.sgSpare };
  };
  window.__sgFire = () => b.sgFire();
  window.__sgReload = () => b.sgReload();
  window.__sgSheet = (plan, frames = 24, every = 2, W = 176, H = 132, cols = 4) => {
    const R = b.renderer, src = R.domElement, n = Math.ceil(frames / every);
    const cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Math.ceil(n / cols) * (H + 12);
    const g = cv.getContext('2d'); g.font = '10px monospace';
    let k = 0;
    for (let f = 0; f < frames; f++) {
      if (plan) plan(f);
      window.__cadv(1);
      if (f % every) continue;
      const x = (k % cols) * W, y = Math.floor(k / cols) * (H + 12);
      g.drawImage(src, x, y, W, H);
      g.fillStyle = '#9f9';
      g.fillText(`f${f} rel${b.sgRel >= 0 ? b.sgRel.toFixed(2) : '-'} ch${b.sgCh.join('')}`, x + 2, y + H + 10);
      k++;
    }
    return cv.toDataURL('image/jpeg', 0.86).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
