"""The owner's electricity recording cut into game assets (2026-11-14: "use these electric sounds for all the electric
stuff in the sewer and elsewhere").

    python3 tools/elec_sound.py [path-to-mp3]   (default ~/Downloads/Electricity Sound Effect xd (Thx for 1M Views!).mp3)

No ffmpeg and no numpy on this machine (as `tools/sewer_monster_sound.py`): `afconvert` decodes and encodes, everything
between is plain Python on 16-bit PCM.

The take (30.0 s) is nine runs of continuous arcing crackle split by short silences (0.3-4.55, 4.7-6.35, 6.6-9.85,
10.2-14.05, 14.4-14.95, 16.1-21.75, 21.9-24.25, 24.9-26.4 s; measured at 100 ms).

  assets/elec-zap1..6.m4a  short bursts (0.28-0.55 s) cut where the crackle peaks, 4 ms in, 90 ms out: a spark, a
                           flickering lamp's crack, a wire spitting. Mono (the game places them), one RMS.
  assets/elec-shock.m4a    10.2-12.9 s, the loudest stretch: the line in the water. 10 ms in, 0.5 s out. Mono.
  assets/elec-loop.m4a     16.1-21.7 s, the steadiest and quietest run: live wires and the box humming. Its last
                           1.2 s crossfaded (equal power) over its head, padded a second each end with its own wrap so
                           the game loops it on REC_PAD..duration-REC_PAD (`recLoop`). Mono.

Peaks are held to -3 dBFS (AAC overshoots on decode).
"""
import array, math, os, subprocess, sys, tempfile, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/Electricity Sound Effect xd (Thx for 1M Views!).mp3')
PAD = 1.0

def log(*a): print('[elec]', *a); sys.stdout.flush()

def decode(src, sr, ch, tmp):
    out = os.path.join(tmp, 'dec.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % sr, '-c', str(ch), src, out], check=True)
    w = wave.open(out); a = array.array('h', w.readframes(w.getnframes()))
    return [x / 32768.0 for x in a]

def encode(samples, sr, dst, kbps, tmp, gain=None):
    peak = max(abs(x) for x in samples) or 1.0
    k = min(gain if gain else 1e9, 0.708 / peak)
    pcm = array.array('h', (int(max(-32767, min(32767, round(x * k * 32767)))) for x in samples))
    wav = os.path.join(tmp, os.path.basename(dst) + '.wav')
    w = wave.open(wav, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes()); w.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(kbps * 1000), wav, dst], check=True)
    log('wrote', os.path.basename(dst), '%.2f s' % (len(samples) / sr), os.path.getsize(dst), 'bytes', 'gain %.2f' % k)

def fade(s, sr, fin, fout):
    s = list(s); n0, n1 = max(1, int(fin * sr)), max(1, int(fout * sr))
    for i in range(min(n0, len(s))): s[i] *= i / n0
    for i in range(min(n1, len(s))): s[-1 - i] *= i / n1
    return s

def rms(s): return math.sqrt(sum(x * x for x in s) / max(1, len(s)))

def main():
    tmp = tempfile.mkdtemp(); sr = 44100
    a = decode(SRC, sr, 1, tmp)
    cut = lambda t0, t1: a[int(t0 * sr):int(t1 * sr)]
    # ---- the zaps: where the crackle peaks (2.6, 5.3, 7.7, 8.8, 12.3, 14.4 s), each short and hard-edged
    zaps = [(2.52, 2.92), (5.28, 5.62), (7.66, 8.06), (8.78, 9.10), (12.26, 12.81), (14.42, 14.70)]
    segs = [fade(cut(t0, t1), sr, 0.004, 0.09) for t0, t1 in zaps]
    target = 0.16
    for n, sg in enumerate(segs, 1):
        encode(sg, sr, os.path.join(ASSETS, 'elec-zap%d.m4a' % n), 80, tmp, gain=target / (rms(sg) or 1))
    # ---- the shock: the loudest stretch, ringing off
    sh = fade(cut(10.2, 12.9), sr, 0.01, 0.5)
    encode(sh, sr, os.path.join(ASSETS, 'elec-shock.m4a'), 96, tmp, gain=0.2 / (rms(sh) or 1))
    # ---- the loop: the steady run, its tail crossfaded over its head, padded with its own wrap
    body = cut(16.1, 21.7); X = int(1.2 * sr)
    head, tail = body[:X], body[-X:]
    mid = body[X:-X]
    xf = [tail[i] * math.cos(i / X * math.pi / 2) + head[i] * math.sin(i / X * math.pi / 2) for i in range(X)]
    loop = mid + xf                                  # one period: plays on from the crossfade straight into `mid`
    P = int(PAD * sr)
    padded = loop[-P:] + loop + loop[:P]
    encode(padded, sr, os.path.join(ASSETS, 'elec-loop.m4a'), 72, tmp, gain=0.14 / (rms(loop) or 1))

main()
