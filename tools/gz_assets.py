#!/usr/bin/env python3
"""EVERY MODEL AND EVERY MOVES FILE GZIPPED, BYTE FOR BYTE THE SAME INSIDE (2026-11-21, the owner: "see if we can get some more
space but make sure nothing changes visually or gameplay wise"). The game reads every .glb and every moves .json through
`bwFetch`, which hands the bytes to `bwGunzip` — the browser's own DecompressionStream when they start 1f 8b, untouched when
they do not — before anything parses them. So a file stored gzipped is the same file to the game, exactly. Each one is
compressed at level 9 (mtime 0: the same input always makes the same bytes), inflated again here and compared with the
original byte for byte before it is written over it; one that does not come back identical, or does not get smaller, is
left as it was.

NOT these: files the game fetches some other way (`fetch(...).json()` reads the raw text) — `assets/intro/cut.json` and
`assets/hud/pipe-hand.json` — and anything already gzipped.

    /usr/bin/python3 tools/gz_assets.py            (a dry run: what it would save)
    /usr/bin/python3 tools/gz_assets.py --write

A tool that READS one of these back (`ntar_moves.py`'s merge, `king_bike_loop.py`) goes through `tools/bwio.py`."""
import gzip, os, sys
SKIP = {'assets/intro/cut.json', 'assets/hud/pipe-hand.json'}
WRITE = '--write' in sys.argv
t0 = t1 = n = 0
for dp, dn, fn in os.walk('assets'):
    for f in sorted(fn):
        if not (f.endswith('.glb') or f.endswith('.json')): continue
        p = os.path.join(dp, f)
        if p in SKIP: continue
        raw = open(p, 'rb').read()
        if raw[:2] == b'\x1f\x8b': continue
        z = gzip.compress(raw, 9, mtime=0)
        if gzip.decompress(z) != raw: print('NOT IDENTICAL, left:', p); continue
        if len(z) >= len(raw): continue
        t0 += len(raw); t1 += len(z); n += 1
        if WRITE:
            tmp = p + '.gztmp'
            open(tmp, 'wb').write(z); os.replace(tmp, p)
print(('wrote' if WRITE else 'would write'), n, 'files:', f'{t0 / 1048576:.2f} -> {t1 / 1048576:.2f} MB, saving {(t0 - t1) / 1048576:.2f} MB')
