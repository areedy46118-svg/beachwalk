# Handoff notes

Everything for this project lives in plain files on this machine, so nothing
needs to be "transferred" between Claude accounts — just point a fresh
Claude Code session at this folder.

## Picking it up on another account

1. Sign the other account into Claude Code (`claude` will prompt, or use
   `/login`).
2. `cd ~/Desktop/BeachWalk`
3. Run `claude`.
   - The project memory at
     `~/.claude/projects/-Users-ashtonr-Desktop-BeachWalk/memory/` loads
     automatically (it has a full revision-by-revision changelog).
   - Try `claude --resume` first — it lists past sessions for this folder and
     *may* show this exact conversation (local transcripts are keyed to the
     directory, not the account, but account switches can sometimes hide
     them; if it's not there, that's fine, the memory + this file cover it).
4. To run the game: `python3 serve.py 4173` then open
   <http://localhost:4173>.

## Where things stand

- The game is `index.html` + `main.js` + `assets/backrooms.m4a` +
  `vendor/three/`. `README.md` describes every feature and the tuning knobs.
- Last work done: better shovel dig (layered synth sound, detailed 3D
  crater + spoil mound, bigger sand-chunk particles), the "BEACHWALK" title
  card, a black opening card where the line fades in then the world fades
  up, and the opening music (`assets/backrooms.m4a`) that swells in and out
  over ~30 s.
- `window.__bw` in the browser console is a dev hook for poking at state.

## Open ideas (not started)

- Real note art for the bottle; more items / scripted events along the walk
- Object–object physics collisions (currently only ground + corridor walls)
- Persistent dig holes (the pool recycles after 20)
- A nicer two-handed dig animation
