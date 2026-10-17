"""Cut the owner's four recordings of 2026-10-16 into game assets.

    python3 tools/sound_pack.py

No ffmpeg and no numpy on this machine: `afconvert` decodes and encodes, and
everything between is plain Python on 16-bit PCM.

  assets/sewer-bed.m4a      "Sewer Sound Effect.mp3" (219.5 s). The file is one
                            take repeated: its envelope autocorrelates at 54.9 s
                            (and 109.7). One period from 10 s in, the 2 s that
                            follow it crossfaded (equal power) over its head, so
                            the seam is the recording's own continuation.
  assets/ship-creak-bed.m4a "Wood Creak On Old Ship Series" (73.9 s, quiet:
                            RMS -36 dBFS, a creak cycle every ~8 s). 48 s of it,
                            crossfaded end to head over 2 s, RMS brought up.
  assets/wreck-theme.m4a    "ash guitars bass loop reverse.wav" (76.8 s). 0.9 s
                            (its first sound is at 0.96) to 34.5 s, faded out
                            over 31-34.5 s into the lull the track has there
                            (-27..-31 dB at 32-34.5 s) — the "thirty seconds as
                            you see the ship" the owner asked for. Played once.
  (the shop theme it used to cut from "Self Imposed" is gone: the owner, 2026-10-17 —
  his collaborator has one)

  The creak bed's single creaks, for `SHIP_CREAKS` in main.js (the owner:
  "turn down the volume and frequency of the creaks"): the series is long
  creaks of 3-4 s, each in a second of silence (-80 dB), so a loop was a creak
  every four seconds. Measured on the source and moved into the file's time
  (file t = source t - 1.0, the loop body starting 2.0 s into the source after
  a 1.0 s pad).

The loops are PADDED a second at each end with their own wrap, so the game's
`loopStart`/`loopEnd` (PAD, PAD + L) sit inside real audio: AAC's priming
silence otherwise clicks at the seam (the forest bed's lesson). Peaks are
held to -3 dBFS because AAC overshoots on decode.
"""
import array, math, os, subprocess, sys, tempfile, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
HOME = os.path.expanduser('~')
PAD = 1.0

def log(*a): print('[sound]', *a); sys.stdout.flush()

def decode(src, sr, ch, tmp):
    out = os.path.join(tmp, os.path.basename(src) + '.%d.%d.wav' % (sr, ch))
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % sr, '-c', str(ch), src, out], check=True)
    w = wave.open(out); a = array.array('h', w.readframes(w.getnframes()))
    return [x / 32768.0 for x in a]

def encode(samples, sr, ch, dst, kbps, tmp):
    peak = max(abs(x) for x in samples) or 1.0
    k = min(1.0, 0.708 / peak)                     # -3 dBFS
    pcm = array.array('h', (int(max(-32767, min(32767, round(x * k * 32767)))) for x in samples))
    wav = os.path.join(tmp, os.path.basename(dst) + '.wav')
    w = wave.open(wav, 'wb'); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes()); w.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(kbps * 1000), wav, dst], check=True)
    log('wrote', os.path.basename(dst), '%.1f s' % (len(samples) / ch / sr), os.path.getsize(dst), 'bytes', 'gain %.2f' % k)

def frames(a, ch, f0, f1): return a[f0 * ch:f1 * ch]

def rms(a): return math.sqrt(sum(x * x for x in a) / max(1, len(a)))

def loop_from(a, sr, ch, start, length, xf):
    """`length` s of `a` from `start`, its head crossfaded (equal power) with
    the `xf` s that follow its end, then padded PAD s each side with its own wrap."""
    s0, L, X = int(start * sr), int(length * sr), int(xf * sr)
    body = frames(a, ch, s0, s0 + L)
    after = frames(a, ch, s0 + L, s0 + L + X)
    for i in range(X):
        t = i / X; gi, go = math.sin(t * math.pi / 2), math.cos(t * math.pi / 2)
        for c in range(ch): body[i * ch + c] = body[i * ch + c] * gi + after[i * ch + c] * go
    return pad(body, sr, ch)

def pad(body, sr, ch):
    P = int(PAD * sr) * ch
    return body[-P:] + body + body[:P]

def seam_check(loop, sr, ch, name):
    """RMS of the half second either side of the seam, against the loop's own."""
    P, n = int(PAD * sr) * ch, int(0.5 * sr) * ch
    body = loop[P:-P]
    a, b, r = rms(body[-n:]), rms(body[:n]), rms(body)
    log(name, 'seam: end %.4f head %.4f (loop RMS %.4f, ratio %.2f)' % (a, b, r, (b / a) if a else 0))

with tempfile.TemporaryDirectory() as tmp:
    # the sewer: mono 32 kHz
    sr = 32000
    a = decode(os.path.join(HOME, 'Downloads', 'Sewer Sound Effect.mp3'), sr, 1, tmp)
    lp = loop_from(a, sr, 1, 10.0, 54.9, 2.0)
    seam_check(lp, sr, 1, 'sewer'); encode(lp, sr, 1, os.path.join(ASSETS, 'sewer-bed.m4a'), 64, tmp)

    # the creaks: mono 32 kHz, brought up to -20 dBFS RMS
    a = decode(os.path.join(HOME, 'Downloads', 'Wood Creak On Old Ship Series - Sound Effect for editing.mp3'), sr, 1, tmp)
    lp = loop_from(a, sr, 1, 2.0, 48.0, 2.0)
    k = 0.1 / (rms(lp) or 1); lp = [x * k for x in lp]
    seam_check(lp, sr, 1, 'creak'); encode(lp, sr, 1, os.path.join(ASSETS, 'ship-creak-bed.m4a'), 64, tmp)

    # the wreck's theme: stereo 44.1 kHz, once through, faded into its own lull
    sr, ch = 44100, 2
    a = decode(os.path.join(HOME, 'Desktop', 'ash guitars bass loop reverse.wav'), sr, ch, tmp)
    t0, t1, f0 = 0.9, 34.5, 31.0
    seg = frames(a, ch, int(t0 * sr), int(t1 * sr))
    n = len(seg) // ch
    for i in range(n):
        t = t0 + i / sr
        g = 1.0 if t < f0 else math.cos((t - f0) / (t1 - f0) * math.pi / 2) ** 2
        g *= min(1.0, i / (0.02 * sr))                      # no click on its first sample
        for c in range(ch): seg[i * ch + c] *= g
    encode(seg, sr, ch, os.path.join(ASSETS, 'wreck-theme.m4a'), 96, tmp)

