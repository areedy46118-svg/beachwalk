"""The sewer thing's own voice: the owner's two recordings of 2026-11-16 cut into game assets.

    python3 tools/sewer_monster_voice.py [dir]          (default ~/Downloads)

No ffmpeg and no numpy on this machine (as `tools/sewer_monster_sound.py`): `afconvert` decodes and encodes, everything
between is plain Python on 16-bit PCM.

  assets/sew-breath1..6.m4a  "SEWER MONSTER BREATHING.mp3" (14.5 s): six breaths, cut at the quiet between them (the 100 ms
                             envelope falls under -60 dB at 2.3, 4.1, 6.4, 8.7, 10.1 and 13.7 s), 50 ms in, 350 ms out,
                             normalised to one RMS so the game's level is the only level. They replace the two takes of
                             2026-10-24; the game plays them in order, so the rhythm of the recording is kept.
  assets/sew-death.m4a       "SEWER MONSTER DEATH.mp3" (3.2 s): its death, 0.0-2.55 s (it is silent after 2.45), a 4 ms
                             fade in and 300 ms out.

Mono (the game places them at the thing), peaks held to -3 dBFS (AAC overshoots on decode).
"""
import array, math, os, subprocess, sys, tempfile, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads')
SR = 44100
BREATHS = [(0.35, 2.30), (2.40, 4.15), (4.20, 6.35), (6.60, 8.75), (8.85, 10.05), (10.25, 13.75)]

def log(*a): print('[sewvoice]', *a); sys.stdout.flush()

def decode(src, tmp):
    out = os.path.join(tmp, 'dec.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % SR, '-c', '1', src, out], check=True)
    w = wave.open(out); a = array.array('h', w.readframes(w.getnframes()))
    return [x / 32768.0 for x in a]

def fade(s, fin, fout):
    s = list(s); n0, n1 = int(fin * SR), int(fout * SR)
    for i in range(min(n0, len(s))): s[i] *= i / n0
    for i in range(min(n1, len(s))): s[-1 - i] *= i / n1
    return s

def rms(s): return math.sqrt(sum(x * x for x in s) / max(1, len(s)))

def encode(samples, dst, kbps, tmp, gain=None):
    peak = max(abs(x) for x in samples) or 1.0
    k = min(gain if gain else 1e9, 0.708 / peak)
    pcm = array.array('h', (int(max(-32767, min(32767, round(x * k * 32767)))) for x in samples))
    wav = os.path.join(tmp, os.path.basename(dst) + '.wav')
    w = wave.open(wav, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(kbps * 1000), wav, dst], check=True)
    log('wrote', os.path.basename(dst), '%.2f s' % (len(samples) / SR), os.path.getsize(dst), 'bytes', 'gain %.2f' % k)

def main():
    tmp = tempfile.mkdtemp()
    b = decode(os.path.join(SRC, 'SEWER MONSTER BREATHING.mp3'), tmp)
    segs = [fade(b[int(t0 * SR):int(t1 * SR)], 0.05, 0.35) for t0, t1 in BREATHS]
    for n, seg in enumerate(segs, 1):
        encode(seg, os.path.join(ASSETS, 'sew-breath%d.m4a' % n), 64, tmp, gain=0.12 / (rms(seg) or 1))
    d = decode(os.path.join(SRC, 'SEWER MONSTER DEATH.mp3'), tmp)
    encode(fade(d[:int(2.55 * SR)], 0.004, 0.3), os.path.join(ASSETS, 'sew-death.m4a'), 80, tmp)

main()
