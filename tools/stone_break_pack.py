#!/usr/bin/env python3
"""The gargoyles' breaking (2026-10-28, the owner: "give these random stone breaking effects on each kill of the gargoyles
and have them break into pieces matching the audio well"): his "3D Render Stone Break Sound Design" (9.1 s, six breaks)
cut at its own silences into assets/stone-break1..6.m4a, each from 10 ms before its first crack, its tail faded over its
last 60 ms; and each one's TIMES, measured off the envelope (5 ms hops): `peak`, the loudest instant (the smash — the game
lands the statue on it), and `subs`, the later rises of 6 dB in 15 ms (the debris going again — the game breaks a piece
again on each). Prints the table `GARG_BREAKS` holds.

    /usr/bin/python3 tools/stone_break_pack.py ~/Downloads/'3D Render Stone Break Sound Design.mp3'"""
import os, sys, json, wave, subprocess, tempfile
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGS = [(0.48, 1.80), (1.88, 3.32), (3.38, 5.52), (5.60, 6.86), (6.95, 8.19), (8.19, 9.10)]   # at the source's silences
src = sys.argv[1]
tmp = tempfile.mkdtemp()
subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', src, os.path.join(tmp, 'src.wav')], check=True)
w = wave.open(os.path.join(tmp, 'src.wav')); sr = w.getframerate()
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
hop = int(sr * 0.005); table = []
for k, (t0, t1) in enumerate(SEGS):
    s = a[int(t0 * sr):int(t1 * sr)]; n = len(s) // hop
    db = 20 * np.log10(np.array([np.sqrt(np.mean(s[i * hop:(i + 1) * hop] ** 2)) for i in range(n)]) + 1e-6)
    first = float(np.argmax(db > -30)) * 0.005
    st = max(0.0, first - 0.01)
    peak = float(np.argmax(db)) * 0.005
    subs = []
    for i in range(3, n):
        t = i * 0.005
        if t > peak + 0.1 and db[i] - db[i - 3] > 6 and db[i] > -30 and (not subs or t - subs[-1] > 0.12): subs.append(t)
    cut = s[int(st * sr):].copy()
    f = int(0.06 * sr); cut[-f:] *= np.linspace(1, 0, f)
    wp = os.path.join(tmp, 'b%d.wav' % (k + 1))
    with wave.open(wp, 'wb') as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(cut, -1, 1) * 32767).astype(np.int16).tobytes())
    out = os.path.join(ROOT, 'assets/stone-break%d.m4a' % (k + 1))
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wp, out], check=True)
    table.append({'peak': round(peak - st, 3), 'subs': [round(t - st, 3) for t in subs], 'dur': round(len(cut) / sr, 2)})
    print(out, os.path.getsize(out), 'bytes')
print(json.dumps(table))
