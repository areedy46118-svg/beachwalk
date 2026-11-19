#!/usr/bin/env python3
"""The owner's metal (2026-11-18: "use these metal sounds for the screws and moving the grate. also use it for any other metal sounds
the game needs. we want to replace most of the ai sounds you created", and "use these sounds for the shipwreck make sure they are
subtle and match the ambience").

    python3 -I tools/metal_pack.py

  "31 Various Metal Sound Effects.mp3" (151.6 s): cut at its silences (20 ms RMS under 0.004 for half a second) into its takes,
  measured (length, peak, zero-crossing rate = brightness), and sorted into banks by what they are:
    metal-tick1..3    short bright clicks (< 0.35 s)          the screws turning
    metal-clink1..2   small light ones                        a screw coming free, small metal things
    metal-hit1..4     medium knocks                           sfxPropHit('metal'), doors, gates, anything struck
    metal-heavy1..4   loud low dull ones                      a heavy hit, the grate set down, a slam
    metal-scrape1..3  1.8-2 s scrapes and drags               the grate lifted off and dragged
    metal-rattle1     a rattle                                bars and gates shaken
  "Low Pitched Metal creaks and stress Groans.mp3" (20.9 s): cut the same way into its groans (the long first one sliced into ~4.5 s pieces) -> ship-groan1..5, for the wreck.
Each: mono 32 kHz, 5 ms in, 80 ms out (a long take cut at 2.4 s and faded over its last 0.4 s), peak -3 dBFS. afconvert + plain Python.
"""
import array, math, os, struct, subprocess, sys, tempfile, wave

DL = os.path.expanduser('~/Downloads')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
SR = 32000

def decode(src, tmp):
    out = os.path.join(tmp, os.path.basename(src) + '.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % SR, '-c', '1', src, out], check=True)
    b = open(out, 'rb').read(); i = 12
    while i < len(b):
        cid = b[i:i + 4]; n = struct.unpack('<I', b[i + 4:i + 8])[0]
        if cid == b'data': return [x / 32768 for x in array.array('h', b[i + 8:i + 8 + n])]
        i += 8 + n + (n & 1)

def segments(a, th=0.004, gap=25, minlen=0.08):
    W = int(0.02 * SR); env = [math.sqrt(sum(x * x for x in a[j:j + W]) / W) for j in range(0, len(a) - W, W)]
    segs, on, quiet = [], False, 0
    for k, e in enumerate(env):
        if e > th:
            if not on: on, s0 = True, k
            quiet = 0
        elif on:
            quiet += 1
            if quiet > gap: segs.append((s0, k - quiet)); on = False
    if on: segs.append((s0, len(env) - 1))
    return [(max(0, s0 * W - int(0.01 * SR)), (s1 + 1) * W) for s0, s1 in segs if (s1 - s0) * 0.02 > minlen]

def write(x, dst, tmp, maxlen=2.4):
    if len(x) > maxlen * SR:
        x = x[:int(maxlen * SR)]; F = int(0.4 * SR)
        for i in range(F): x[-1 - i] *= i / F
    fi, fo = int(0.005 * SR), int(0.08 * SR)
    for i in range(min(fi, len(x))): x[i] *= i / fi
    for i in range(min(fo, len(x))): x[-1 - i] *= i / fo
    pk = max(abs(v) for v in x) or 1; k = 0.708 / pk
    pcm = array.array('h', (int(max(-32767, min(32767, round(v * k * 32767)))) for v in x))
    wav = os.path.join(tmp, 'o.wav'); w = wave.open(wav, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', wav, dst], check=True)
    print('[metal] wrote', os.path.basename(dst), '%.2f s' % (len(x) / SR), os.path.getsize(dst), 'bytes')

BANKS = {   # the takes of the 31, by index after the cut (measured: see the docstring's sort)
    'metal-tick': [0, 5, 7], 'metal-clink': [33, 30], 'metal-hit': [1, 23, 31, 24],
    'metal-heavy': [11, 21, 29, 26], 'metal-scrape': [25, 17, 16], 'metal-rattle': [4],
}
with tempfile.TemporaryDirectory() as tmp:
    a = decode(os.path.join(DL, '31 Various Metal Sound Effects.mp3'), tmp)
    segs = segments(a); print('[metal] takes', len(segs))
    for name, idx in BANKS.items():
        for n, i in enumerate(idx, 1):
            s0, s1 = segs[i]; write(a[s0:s1], os.path.join(OUT, '%s%d.m4a' % (name, n)), tmp)
    g = decode(os.path.join(DL, 'Low Pitched Metal creaks and stress Groans.mp3'), tmp)
    gs = segments(g, th=0.003, gap=15, minlen=0.6); print('[metal] groans', len(gs), [(round(s0 / SR, 2), round(s1 / SR, 2)) for s0, s1 in gs])
    # (the first take is one long 18 s groan: sliced into ~4.5 s pieces, each faded, so the wreck has several to pick among)
    pieces = []
    for s0, s1 in gs:
        L = s1 - s0; n = max(1, round(L / (4.5 * SR)))
        for k in range(n): pieces.append((s0 + L * k // n, s0 + L * (k + 1) // n))
    for n, (s0, s1) in enumerate(pieces[:6], 1): write(g[s0:s1], os.path.join(OUT, 'ship-groan%d.m4a' % n), tmp, maxlen=5.0)
