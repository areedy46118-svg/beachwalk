"""THE BICYCLE KICK, FLOWN (2026-11-20, the owner: "FIX THE BICYCLE KICK TOO HE DOES IT TOO FAST HE SHOULD FLY AND KICK A
FEW TIMES"). Mixamo's "Flying Bicycle Kick" is ONE CYCLE of the move — 17 frames, the right foot at f8, the left at f16, its
last frame the first again (measured off the FBX: every bone's pose at f17 = f1, the hips level the whole way) — made to be
looped. Played once it was two kicks in 0.7 s. This writes `kBikeAir` into assets/king-moves.json beside it: the cycle three
times over (frames 1-17, then 2-17 twice: 49 frames, six kicks, at idx 7, 15, 23, 31, 39, 47 of 48), its travel carried on.
The game lifts him through it (`kingAirBike`). Run: python3 tools/king_bike_loop.py (after any re-run of ntar_moves -- king)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__)); import bwio   # (the file is stored gzipped)
P = os.path.join(os.path.dirname(__file__), '..', 'assets', 'king-moves.json')
D = bwio.read_json(P); C = D['clips']; src = C['kBike']; n = src['n']
CYC = int(sys.argv[1]) if len(sys.argv) > 1 else 3          # (cycles: 2 since 2026-11-21, "ITS TOO LONG AND HARD TO READ")
idx = list(range(n)) + [i for _ in range(CYC - 1) for i in range(1, n)]
out = {k: v for k, v in src.items() if k not in ('d', 'hipY', 'travel', 'n', 'dur', 'hit', 'land')}
out['what'] = 'the bicycle kick flown: %d cycles, %d kicks' % (CYC, 2 * CYC)
out['n'] = len(idx); out['dur'] = round((len(idx) - 1) / D['fps'], 4)
out['d'] = {b: [x for i in idx for x in q[i * 4:i * 4 + 4]] for b, q in src['d'].items()}
out['hipY'] = [src['hipY'][i] for i in idx]
tr, off, last = [], [0.0, 0.0], None
for j, i in enumerate(idx):
    if j and i == 1:     # the cycle starts over: carry its travel on from where the last one ended
        off = [tr[-1][0] - src['travel'][0][0], tr[-1][1] - src['travel'][0][1]]
    tr.append([round(src['travel'][i][0] + off[0], 4), round(src['travel'][i][1] + off[1], 4)])
out['travel'] = tr; out['hit'] = round(7 / (len(idx) - 1), 4); out['land'] = src.get('land', 0)
C['kBikeAir'] = out
bwio.write_json(P, D)
print('kBikeAir', out['n'], 'frames', out['dur'], 's at 1x; bones', len(out['d']))
