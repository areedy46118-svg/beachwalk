#!/usr/bin/env python3
"""THE VERY OLD FISHERMAN'S VOICE (2026-11-23, the owner's "New Recording 6.m4a": "trim these and make them the fisher dialog
sounds dont have them too loud"). One phone recording, four takes in it with room noise between (~-50 dB on 50 ms windows,
the takes -15 to -25). `farmer_voice_pack.py`'s `silencedetect` cuts on single samples, which this recording's hiss defeats
(it found one gap in eight seconds), so this one reads the RMS ENVELOPE (50 ms windows) and cuts where it rises over
`ON_DB`; then as there: 40 ms kept before, 150 ms after (never into the next), one RMS under a peak ceiling, 5 ms fade in
and 40 ms out, mono AAC 96 kbps.

    /usr/bin/python3 tools/fisher_voice_pack.py "<recording>"   -> assets/fisher-talk{n}.m4a

Levelled a little under the other banks (`TARGET_RMS` -20, theirs -18), and played quieter still (`FISHER_VOX.talk`).
"""
import math, os, struct, subprocess, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
TMP = '/tmp/fisher_voice_pack'
os.makedirs(TMP, exist_ok=True)
SR, WIN = 16000, 0.05
ON_DB, MIN_GAP, MIN_TAKE = -38.0, 0.25, 0.15
PRE, POST = 0.04, 0.15
TARGET_RMS, PEAK_CEIL = -20.0, -3.0


def pcm(path):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    n = len(raw) // 2
    return struct.unpack('<%dh' % n, raw)


def envelope(a):
    w = int(SR * WIN)
    return [20 * math.log10(math.sqrt(sum(x * x for x in a[i:i + w]) / max(1, len(a[i:i + w]))) / 32768 + 1e-9) for i in range(0, len(a), w)]


def takes(env, dur):
    on, segs, start = False, [], 0
    for i, v in enumerate(env + [-99]):
        if v > ON_DB and not on:
            on, start = True, i
        elif v <= ON_DB and on:
            on = False
            segs.append([start * WIN, i * WIN])
    merged = []
    for s in segs:   # a dip shorter than MIN_GAP is a breath inside one take
        if merged and s[0] - merged[-1][1] < MIN_GAP:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    merged = [s for s in merged if s[1] - s[0] >= MIN_TAKE]
    out = []
    for i, (a, b) in enumerate(merged):
        lo = max(0.0, a - PRE, merged[i - 1][1] + 0.01 if i else 0.0)
        hi = min(dur, b + POST, merged[i + 1][0] - 0.01 if i + 1 < len(merged) else dur)
        out.append((lo, hi))
    return out


def levels(a):
    rms = math.sqrt(sum(x * x for x in a) / len(a)) / 32768
    pk = max(abs(x) for x in a) / 32768
    return 20 * math.log10(rms + 1e-9), 20 * math.log10(pk + 1e-9)


a = pcm(SRC)
dur = len(a) / SR
T = takes(envelope(a), dur)
for i, (lo, hi) in enumerate(T, 1):
    rms, pk = levels(a[int(lo * SR):int(hi * SR)])
    gain = min(TARGET_RMS - rms, PEAK_CEIL - pk)
    d = hi - lo
    wav = os.path.join(TMP, f'fisher-talk{i}.wav')
    af = f'volume={gain:.2f}dB,afade=t=in:d=0.005,afade=t=out:st={max(0, d - 0.04):.3f}:d=0.04'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{lo:.3f}', '-to', f'{hi:.3f}', '-i', SRC, '-ac', '1', '-ar', '44100', '-af', af, wav], check=True)
    m4a = os.path.join(OUT, f'fisher-talk{i}.m4a')
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wav, m4a], check=True)
    print(f'fisher-talk{i}: {lo:.2f}-{hi:.2f} s ({d:.2f}) rms {rms:.1f} pk {pk:.1f} -> gain {gain:+.1f} dB, {os.path.getsize(m4a)} bytes')
print(len(T), 'takes')
