"""The sewer's stalker: the owner's four recordings of 2026-10-23 cut into game assets.

    python3 tools/sewer_monster_sound.py [dir]          (default ~/Downloads)

No ffmpeg and no numpy on this machine (as `tools/sound_pack.py`): `afconvert`
decodes and encodes, everything between is plain Python on 16-bit PCM.

  assets/sew-slosh1..N.m4a  "Water Slosh SOUND Effect.mp3" (55.9 s): a take of
                            single sloshes, one every second or two. Each is cut
                            at its own onset (the envelope at 20 ms rising past
                            ONSET dB) to where it has fallen MIN_GAP below its
                            own peak, 2.4 s at most, with a 12 ms fade in and a
                            120 ms fade out; only the clear ones (peak over -27 dB,
                            ended before the cap) are kept. Mono: the game places them. Kept in
                            the take's order and normalised to one RMS, so the
                            game's level is the only level.
  assets/sew-splash.m4a     "Water Slosh - Sound effects.mp3" (5.3 s): one big
                            slosh, 0.1-3.0 s — the thing going back under.
  assets/sew-leap.m4a       "Water jumping sound effects.mp3" (5.2 s): the burst
                            out of the water, 0.2-3.4 s.
  assets/sew-breath1..2.m4a "Monster Breathing Sound Effect 3 Free SFX.mp3" (10.1 s): two breaths, in and out,
                            0.4-5.3 s and 5.4-10.0 s (cut at the quiet between, -40 dB), normalised to one RMS.
  assets/sew-lever-a..c.m4a "Large Dull Clunky Industrial Metal Spring Lever Pull.mp3" (6.0 s): its three events —
                            the grab and first clunk 0.06-0.62 s, a second clunk 0.62-1.08, the slam ringing out
                            1.08-2.45 — at one gain, so their balance is the recording's.
  assets/sew-drip-bed.m4a   "ASMR Dark, creepy sewers..." (498 s, an even bed: RMS
                            -28 dB in every 5 s of it). 64 s from 20 s in, the 2 s
                            after it crossfaded (equal power) over its head, padded
                            a second each end with its own wrap so the game loops
                            it on REC_PAD..duration-REC_PAD. Stereo.

Peaks are held to -3 dBFS (AAC overshoots on decode).
"""
import array, math, os, subprocess, sys, tempfile, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads')
PAD = 1.0
ONSET, MIN_GAP, MAX_LEN = -36.0, 22.0, 2.4

def log(*a): print('[sewmon]', *a); sys.stdout.flush()

def decode(src, sr, ch, tmp):
    out = os.path.join(tmp, 'dec.%d.%d.wav' % (sr, ch))
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % sr, '-c', str(ch), src, out], check=True)
    w = wave.open(out); a = array.array('h', w.readframes(w.getnframes()))
    return [x / 32768.0 for x in a]

def encode(samples, sr, ch, dst, kbps, tmp, gain=None):
    peak = max(abs(x) for x in samples) or 1.0
    k = min(gain if gain else 1e9, 0.708 / peak)
    pcm = array.array('h', (int(max(-32767, min(32767, round(x * k * 32767)))) for x in samples))
    wav = os.path.join(tmp, os.path.basename(dst) + '.wav')
    w = wave.open(wav, 'wb'); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes()); w.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(kbps * 1000), wav, dst], check=True)
    log('wrote', os.path.basename(dst), '%.2f s' % (len(samples) / ch / sr), os.path.getsize(dst), 'bytes', 'gain %.2f' % k)

def fade(s, sr, fin, fout):
    n0, n1 = int(fin * sr), int(fout * sr)
    for i in range(min(n0, len(s))): s[i] *= i / n0
    for i in range(min(n1, len(s))): s[-1 - i] *= i / n1
    return s

def rms(s): return math.sqrt(sum(x * x for x in s) / max(1, len(s)))

def main():
    tmp = tempfile.mkdtemp()
    sr = 44100
    # ---- the sloshes, one at a time
    a = decode(os.path.join(SRC, 'Water Slosh SOUND Effect.mp3'), sr, 1, tmp)
    hop = int(sr * 0.02)
    env = [20 * math.log10(rms(a[i:i + hop]) + 1e-9) for i in range(0, len(a) - hop, hop)]
    cuts, i = [], 0
    while i < len(env):
        if env[i] > ONSET:
            j0 = max(0, i - 3)
            pk, j = env[i], i
            while j < len(env) and (j - j0) * hop < MAX_LEN * sr:
                pk = max(pk, env[j])
                if env[j] < pk - MIN_GAP and j - i > 10: break
                j += 1
            cuts.append((j0 * hop, j * hop, pk))
            i = j + 5
        else: i += 1
    log(len(cuts), 'sloshes at', ['%.2f-%.2f (%.0f dB)' % (c0 / sr, c1 / sr, p) for c0, c1, p in cuts])
    # the clear ones: loud enough to stand off the take's own room, and over before the cap (one that ran to it ran into the next)
    keep = [c for c in cuts if c[2] > -27 and 0.4 <= (c[1] - c[0]) / sr < MAX_LEN - 0.05][:8]
    target = 0.12
    for n, (c0, c1, pk) in enumerate(keep, 1):
        s = fade(a[c0:c1], sr, 0.012, 0.12)
        encode(s, sr, 1, os.path.join(ASSETS, 'sew-slosh%d.m4a' % n), 64, tmp, gain=target / (rms(s) or 1))
    for f in os.listdir(ASSETS):                       # (a re-pack that keeps fewer leaves none of the old ones behind)
        if f.startswith('sew-slosh') and f.endswith('.m4a') and int(f[9:-4]) > len(keep): os.remove(os.path.join(ASSETS, f))
    # ---- the splash going under, the leap out
    b = decode(os.path.join(SRC, 'Water Slosh - Sound effects.mp3'), sr, 1, tmp)
    encode(fade(b[int(0.1 * sr):int(3.0 * sr)], sr, 0.005, 0.4), sr, 1, os.path.join(ASSETS, 'sew-splash.m4a'), 80, tmp)
    c = decode(os.path.join(SRC, 'Water jumping sound effects.mp3'), sr, 1, tmp)
    encode(fade(c[int(0.2 * sr):int(3.4 * sr)], sr, 0.004, 0.5), sr, 1, os.path.join(ASSETS, 'sew-leap.m4a'), 80, tmp)
    # ---- the drips and the wet air, looped
    sr2 = 32000
    d = decode(os.path.join(SRC, 'ASMR Dark, creepy sewers. Dripping water, relaxation, sleep, ambience, noise. Free sound effect.mp3'), sr2, 2, tmp)
    L, X, t0 = 64.0, 2.0, 20.0
    f0, fl, fx = int(t0 * sr2), int(L * sr2), int(X * sr2)
    body = d[f0 * 2:(f0 + fl) * 2]
    tail = d[(f0 + fl) * 2:(f0 + fl + fx) * 2]
    for k in range(fx):                                # the recording's own continuation laid over the head, equal power
        w = k / fx; ga, gb = math.sin(w * math.pi / 2), math.cos(w * math.pi / 2)
        for ch in (0, 1): body[k * 2 + ch] = body[k * 2 + ch] * ga + tail[k * 2 + ch] * gb
    p = int(PAD * sr2) * 2
    loop = body[-p:] + body + body[:p]
    encode(loop, sr2, 2, os.path.join(ASSETS, 'sew-drip-bed.m4a'), 72, tmp)
    # ---- its breath (2026-10-24): two breaths in the take, each in and out, cut at the quiet between them
    e = decode(os.path.join(SRC, 'Monster Breathing Sound Effect 3 Free SFX.mp3'), sr, 1, tmp)
    for n, (t0, t1) in enumerate([(0.4, 5.3), (5.4, 10.0)], 1):
        seg = fade(e[int(t0 * sr):int(t1 * sr)], sr, 0.05, 0.6)
        encode(seg, sr, 1, os.path.join(ASSETS, 'sew-breath%d.m4a' % n), 64, tmp, gain=0.12 / (rms(seg) or 1))
    # ---- the rusty levers (2026-10-26): the owner's lever take is three events — the grab and a first clunk, a second
    # clunk, the heavy slam ringing out — cut apart so the game can lay each on its own jerk of the pull. One gain for
    # all three (their own balance kept), peaks to -3 dBFS. Mono: the game places them at the lever.
    L = decode(os.path.join(SRC, 'Large Dull Clunky Industrial Metal Spring Lever Pull.mp3'), sr, 1, tmp)
    cuts = [(0.06, 0.62, 'a'), (0.62, 1.08, 'b'), (1.08, 2.45, 'c')]
    segs = [fade(L[int(t0 * sr):int(t1 * sr)], sr, 0.004, 0.08 if n != 'c' else 0.5) for t0, t1, n in cuts]
    k = 0.708 / max(max(abs(x) for x in sg) for sg in segs)
    for (t0, t1, n), sg in zip(cuts, segs):
        encode(sg, sr, 1, os.path.join(ASSETS, 'sew-lever-%s.m4a' % n), 80, tmp, gain=k)

main()
