/* EVERY PIECE OF THE OWNER'S MUSIC, THROUGH ITS REAL TRIGGER, MEASURED AT THE SPEAKERS — SILENTLY. Not part of the game.
 * Open /README.md in the pane (no game on it), then:
 *   await import('/tools/silentframe.js'); await import('/tools/musictest.js');
 *   await __mtRun('samurai')       // one scenario (each well under the tool's 45 s): 'restart', 'checkpoint' (a respawn: silent), 'load',
 *                                  // 'samurai', 'church', 'end'  -> { scenario, pass, peak, who, note }
 * Each loads the game fresh in the silent iframe, drives the moment the way a player reaches it (the sword taken
 * off its stand, the crawl out behind the altar, the morning after the horn, a death's card clicked …) and reads the
 * analyser on whatever connected to the speakers for that track. PASS is a peak over 0.004 within the window.
 * Run it after ANY change that touches audio, a trigger, the boot or the restore. It backs up and puts back the
 * owner's checkpoint (`beachwalk.save`) itself. */
(function () {
  const W = window, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const want = { restart: 'startMusic', checkpoint: 'startMusic', load: 'startMusic', samurai: 'startSamScore', church: 'startPassing', end: 'startEndSong' };
  /* (2026-10-24, the owner: the opening song plays on the first load into the game and NOT on a respawn) — 'checkpoint'
   * is a death's respawn and passes SILENT; 'load' is a checkpoint loaded without a death and must play it */
  const silent = { checkpoint: true };
  async function boot(setup) {
    await W.__sfLoad(setup);
    for (let i = 0; i < 60; i++) { await sleep(250); const w = W.__sfW(); if (w && w.__bw) break; }
    const w = W.__sfW(), b = w.__bw;
    for (let i = 0; i < 80 && !b.state().started; i++) { try { b.beginGame(); } catch (e) { /* not ready */ } await sleep(250); }
    return { w, b };
  }
  async function listen(who, ms) {
    let peak = 0; const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      for (const d of W.__sfDests) if (d.who === who) peak = Math.max(peak, W.__sfLvl(d.an));
      if (peak > 0.004) break;
      await sleep(40);
    }
    return +peak.toFixed(4);
  }
  const drive = async (b, frames, every = 5) => { for (let i = 0; i < frames; i += every) { b.frame(every); await sleep(5); } };
  W.__mtRun = async (sc) => {
    const bak = localStorage.getItem('beachwalk.save');
    let note = '', peak = 0;
    try {
      if (sc === 'restart') {
        const { b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        await drive(b, 30); peak = await listen(want[sc], 8000);
      } else if (sc === 'checkpoint') {
        if (!bak) return { scenario: sc, pass: false, note: 'no checkpoint saved to load' };
        const { w, b } = await boot(() => { sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1'); });
        const btn = w.document.querySelector('.dc-restart');
        for (let i = 0; i < 240 && btn.classList.contains('loading'); i++) { b.frame(4); await sleep(20); }
        note = btn.classList.contains('loading') ? 'card never lit' : 'card lit';
        btn.click(); await drive(b, 120); peak = await listen(want[sc], 8000);
      } else if (sc === 'load') {
        if (!bak) return { scenario: sc, pass: false, note: 'no checkpoint saved to load' };
        const { b } = await boot(() => { sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); });
        // (a checkpoint comes in behind the black for 15-20 s: wait for it to lift, as the respawn waits for its card)
        for (let i = 0; i < 900 && !(b.restoreS && b.restoreS().bootHold <= 0); i++) { b.frame(4); await sleep(20); }
        note = 'a checkpoint loaded, no death' + (b.restoreS && b.restoreS().bootHold <= 0 ? '' : ', BLACK NEVER LIFTED');
        await drive(b, 120); peak = await listen(want[sc], 9000);
      } else if (sc === 'samurai') {
        const { b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        b.settings.devMode = true;
        const RB = b.ROOM_BACK.dojo; RB.load();
        for (let i = 0; i < 160 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
        RB.place(); await drive(b, 60);
        const it = b.interactables.find((x) => /Take the katana/.test(typeof x.label === 'function' ? x.label() : x.label));
        if (!it) return { scenario: sc, pass: false, note: 'no "Take the katana" on the stand' };
        it.onActivate(); note = 'sword taken';
        await drive(b, 40); peak = await listen(want[sc], 12000);
      } else if (sc === 'church') {
        const { b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        const RB = b.ROOM_BACK.uc; RB.load();
        for (let i = 0; i < 160 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
        RB.place(); await drive(b, 60);
        b.leaveUndercroft('far'); note = 'crawled out the far end';
        await drive(b, 300); peak = await listen(want[sc], 10000);
      } else if (sc === 'end') {
        const { w, b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        // the cut runs on the wall clock: a fake one in the frame, a 60th of a second a frame
        const real = w.performance.now.bind(w.performance), base = real(); let off = 0;
        w.performance.now = () => base + off + (performance.now() - base) * 0;
        b.startWakeCut(); note = 'the morning after the horn';
        for (let i = 0; i < 3000 && !b.state().ended; i++) { off += 16.7; b.frame(1); if (!(i % 20)) await sleep(2); }
        w.performance.now = () => real() + off;
        note += b.state().ended ? ', stats up' : ', NEVER ENDED';
        peak = await listen(want[sc], 8000);
      } else return { scenario: sc, pass: false, note: 'unknown scenario' };
    } catch (e) { note += ' THREW ' + e; }
    finally {
      try { const w = W.__sfW(); if (w && w.__bw && w.__bw.audioCtx) await w.__bw.audioCtx.close(); } catch (e) { /* */ }
      if (bak) localStorage.setItem('beachwalk.save', bak);
      for (const k of ['beachwalk.load', 'beachwalk.skipIntro', 'beachwalk.died']) sessionStorage.removeItem(k);
    }
    const others = W.__sfDests.map((d) => d.who).filter((v, i, a) => a.indexOf(v) === i).join(',');
    return { scenario: sc, pass: silent[sc] ? peak <= 0.004 : peak > 0.004, peak, who: want[sc], note: note + (silent[sc] ? ' (wants silence)' : ''), heard: others };
  };
})();
