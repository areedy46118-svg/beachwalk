#!/usr/bin/env python3
"""The lair's flies, the owner's recording (2026-11-18: "use this sound for the flies in the lair also make sure they arent
too loud"): "Flies Buzzing and Circling - Free Sound Effects.mp3" (6.77 s) made a seamless loop.

    python3 -I tools/flies_pack.py [~/Downloads/Flies Buzzing and Circling - Free Sound Effects.mp3]

3.8 s from 2.1 s (the first two seconds are silence), its head crossfaded (equal power) with the 0.6 s after its end, padded 1 s each side with its own wrap
(the game loops beds on REC_PAD .. duration - REC_PAD), mono 32 kHz, brought up to peak -3 dBFS (the recording sits
around -60 dB RMS; the game sets its level, low) -> assets/flies-bed.m4a. afconvert and
plain Python, as `tools/sound_pack.py` (whose helpers these are).
"""
import array, math, os, subprocess, sys, tempfile, wave

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/Flies Buzzing and Circling - Free Sound Effects.mp3')
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'flies-bed.m4a')
SR, PAD = 32000, 1.0

def decode(src, tmp):
    out = os.path.join(tmp, 'dec.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % SR, '-c', '1', src, out], check=True)
    w = wave.open(out); return [x / 32768.0 for x in array.array('h', w.readframes(w.getnframes()))]

def rms(a): return math.sqrt(sum(x * x for x in a) / max(1, len(a)))

with tempfile.TemporaryDirectory() as tmp:
    a = decode(SRC, tmp)
    s0, L, X = int(2.1 * SR), int(3.8 * SR), int(0.6 * SR)
    body = a[s0:s0 + L]; after = a[s0 + L:s0 + L + X]
    for i in range(min(X, len(after))):
        t = i / X; body[i] = body[i] * math.sin(t * math.pi / 2) + after[i] * math.cos(t * math.pi / 2)
    P = int(PAD * SR); loop = body[-P:] + body + body[:P]
    n = int(0.5 * SR); print('[flies] seam: end %.4f head %.4f loop %.4f' % (rms(body[-n:]), rms(body[:n]), rms(body)))
    peak = max(abs(x) for x in loop) or 1.0; k = 0.708 / peak
    pcm = array.array('h', (int(max(-32767, min(32767, round(x * k * 32767)))) for x in loop))
    wav = os.path.join(tmp, 'out.wav'); w = wave.open(wav, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', wav, DST], check=True)
    print('[flies] wrote', DST, os.path.getsize(DST), 'bytes, %.2f s, gain %.2f' % (len(loop) / SR, k))
