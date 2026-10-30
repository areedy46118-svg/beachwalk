/* EVERY PIECE OF THE OWNER'S MUSIC, THROUGH ITS REAL TRIGGER, MEASURED AT THE SPEAKERS — SILENTLY. Not part of the game.
 * Open /README.md in the pane (no game on it), then:
 *   await import('/tools/silentframe.js'); await import('/tools/musictest.js');
 *   await __mtRun('samurai')       // one scenario (each well under the tool's 45 s): 'restart', 'checkpoint' (a respawn: silent), 'load',
 *                                  // 'samurai', 'samuraiBack', 'church', 'end', 'mino'  -> { scenario, pass, peak, who, note }
 * Each loads the game fresh in the silent iframe, drives the moment the way a player reaches it (the sword taken
 * off its stand, the crawl out behind the altar, the morning after the horn, a death's card clicked …) and reads the
 * analyser on whatever connected to the speakers for that track. PASS is a peak over 0.004 within the window.
 * Run it after ANY change that touches audio, a trigger, the boot or the restore. It backs up and puts back the
 * owner's checkpoint (`beachwalk.save`) itself. */
(function () {
  const W = window, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const want = { restart: 'startMusic', checkpoint: 'startMusic', load: 'startMusic', samurai: 'startSamScore', samuraiBack: 'startSamScore', church: 'startPassing', end: 'startEndSong', mino: 'startMinoSong', skrim: 'startSkrimSong', skrimFight: 'startSkrimFightMusic' };
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
      if (peak > (W.__mtFloor || 0.004)) break;
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
      } else if (sc === 'samuraiBack') {
        // (2026-10-21, "my music isnt playing at the samurai"): the sword taken, out of the dojo mid-fight, and back in to
        // him still on his feet — the score has to come back with the fight, not only on his line
        const { b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        b.settings.devMode = true;
        const RB = b.ROOM_BACK.dojo; RB.load();
        for (let i = 0; i < 160 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
        RB.place(); await drive(b, 60);
        const it = b.interactables.find((x) => /Take the katana/.test(typeof x.label === 'function' ? x.label() : x.label));
        if (!it) return { scenario: sc, pass: false, note: 'no "Take the katana" on the stand' };
        it.onActivate(); await drive(b, 120);
        b.placeBackAtPortal(); await drive(b, 200);
        const away = W.__sfDests.filter((d) => d.who === want[sc]).reduce((m, d) => Math.max(m, W.__sfLvl(d.an)), 0);
        const sam = b.samurai; note = 'out (score ' + away.toFixed(4) + ') and back, he is ' + (sam && sam.st.awake ? 'awake' : 'asleep');
        RB.place(); await drive(b, 60); peak = await listen(want[sc], 12000);
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
      } else if (sc === 'mino') {
        // (2026-10-29, the owner's "minotaur death music": once — now when you ask him "What's wrong?" on his knee, fading in)
        const { w, b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
        w.__ggBoot(); for (let i = 0; i < 180 && !w.__ggBooted; i++) await sleep(1000);
        try { await b.audioCtx.resume(); } catch (e) { /* the boot helper suspends it */ }
        const M = b.MINO, u = M.u;
        if (!u || !w.__ggBooted) return { scenario: sc, pass: false, note: 'never got into XIII with him' };
        M.stage = 'with'; M.ally = true; M.place = '?';
        for (let i = 0; i < 20; i++) w.__c13Step(1);
        b.minoGoDown(u); note = 'he goes down';
        const look = () => b.lookAt(u.g.position.x, u.g.position.y + 1.2, u.g.position.z);
        for (let i = 0; i < 360; i++) { look(); w.__c13Step(1); if (i % 40 === 0) await sleep(5); }
        note += M.kneel ? ', on his knee' : ', NOT KNEELING';
        b.minoTalk(); note += b.state().dialogOpen ? ', asked' : ', NO TALK';
        peak = await listen(want[sc], 8000);
      } else if (sc === 'skrimFight') {
        // (2026-10-30, the owner's "skrim fight": looped through his fight, not loud)
        const { w, b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        try { await b.audioCtx.resume(); } catch (e) { /* the boot helper suspends it */ }
        b.placeInWhale(); const S = b.SKRIM;
        for (let i = 0; i < 240 && !(S.u && S.u.model && S.placed && !(S.u.clipsPending > 0)); i++) { b.frame(1); await sleep(40); }
        if (!S.u || !S.u.model) return { scenario: sc, pass: false, note: 'he never came in' };
        b.skrimFight(); note = 'in the whale, fighting him: ' + S.stage;
        W.__mtFloor = 0.0012;
        for (let i = 0; i < 60; i++) { b.frame(1); if (i % 20 === 0) await sleep(10); }
        peak = await listen(want[sc], 8000);
      } else if (sc === 'skrim') {
        W.__mtFloor = 0.0012;
        // (2026-10-30, the owner's "skrim spotting": once, as you first walk up on him digging in the whale)
        const { w, b } = await boot(() => sessionStorage.setItem('beachwalk.skipIntro', '1'));
        try { await b.audioCtx.resume(); } catch (e) { /* the boot helper suspends it */ }
        b.placeInWhale();
        const S = b.SKRIM;
        for (let i = 0; i < 240 && !(S.u && S.u.model && S.placed && !(S.u.clipsPending > 0)); i++) { b.frame(1); await sleep(40); }
        if (!S.u || !S.u.model) return { scenario: sc, pass: false, note: 'he never came in' };
        note = 'in the whale, him placed';
        const P = S.u.g.position, cam = b.camera.position, y = S.u.g.rotation.y;
        cam.set(P.x + Math.sin(y + 0.6) * 15, cam.y, P.z + Math.cos(y + 0.6) * 15);
        for (let i = 0; i < 120; i++) { b.lookAt(P.x, P.y + 0.8, P.z); b.frame(1); if (i % 20 === 0) await sleep(10); }
        note += S.songDone ? ', seen' : ', NOT SEEN';
        peak = await listen(want[sc], 8000);
      } else return { scenario: sc, pass: false, note: 'unknown scenario' };
    } catch (e) { note += ' THREW ' + e; }
    finally {
      W.__mtFloor = 0;
      try { const w = W.__sfW(); if (w && w.__bw && w.__bw.audioCtx) await w.__bw.audioCtx.close(); } catch (e) { /* */ }
      if (bak) localStorage.setItem('beachwalk.save', bak);
      for (const k of ['beachwalk.load', 'beachwalk.skipIntro', 'beachwalk.died']) sessionStorage.removeItem(k);
    }
    const others = W.__sfDests.map((d) => d.who).filter((v, i, a) => a.indexOf(v) === i).join(',');
    const floor = { skrim: 0.0012, skrimFight: 0.0012 }[sc] || 0.004;   // (his song is played low by the owner's word: 0.55, not 1.9)
    return { scenario: sc, pass: silent[sc] ? peak <= 0.004 : peak > floor, peak, who: want[sc], note: note + (silent[sc] ? ' (wants silence)' : ''), heard: others };
  };
})();
