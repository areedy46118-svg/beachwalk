#!/usr/bin/env python3
"""The owner's "tavern music" (2026-11-17: "add this to the tavern when you walk in make it loop. have it subtle but
heard"), packed into a seamless loop for `LOOP_SONGS.tavern`.

    python3 tools/tavern_music_pack.py "tavern music.mp3" assets/tavern-music.m4a

afconvert decodes and encodes; plain Python does the rest (no ffmpeg or numpy here). The mp3 is a 26.35 s piece that
plays to its last frame, so the loop is its sounding span (the encoder's silent head and tail trimmed), with the last
XF of it crossfaded into the first XF (equal power) so the wrap does not click. It came very quiet (peaks -22 dB), so
it is raised to peak at PEAK_DB, like the other songs, and the game plays it low. Padded PAD seconds each end with its
own wrap (the AAC priming lesson, docs/notes/audio.md) and looped by the source on [PAD, PAD + loop]: the script prints
the `loopStart` / `loopEnd` to put in `LOOP_SONGS.tavern`.
"""
import sys, os, struct, subprocess, tempfile, math, array

XF = 0.030      # s, the seam's crossfade
PAD = 1.0       # s, each end
PEAK_DB = -1.5


def read_wav(p):
    with open(p, 'rb') as f:
        d = f.read()
    i, sr, ch, data = 12, 48000, 2, None
    while i < len(d):
        cid, sz = d[i:i + 4], struct.unpack('<I', d[i + 4:i + 8])[0]
        if cid == b'fmt ':
            ch, sr = struct.unpack('<HI', d[i + 10:i + 16])
        elif cid == b'data':
            data = d[i + 8:i + 8 + sz]
        i += 8 + sz + (sz & 1)
    a = array.array('h'); a.frombytes(data)
    return a, ch, sr


def write_wav(p, a, ch, sr):
    b = a.tobytes()
    with open(p, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(b)) + b'WAVE')
        f.write(b'fmt ' + struct.pack('<IHHIIHH', 16, 1, ch, sr, sr * ch * 2, ch * 2, 16))
        f.write(b'data' + struct.pack('<I', len(b)) + b)


def main():
    src, out = sys.argv[1], sys.argv[2]
    tmp = tempfile.mkdtemp()
    wav = os.path.join(tmp, 'in.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@48000', src, wav], check=True)
    a, ch, sr = read_wav(wav)
    n = len(a) // ch
    fr = [[a[i * ch + c] for c in range(ch)] for i in range(n)]
    loud = lambda f: max(abs(v) for v in f) > 3
    s0 = next(i for i in range(n) if loud(fr[i]))
    e0 = n - next(i for i in range(n) if loud(fr[n - 1 - i]))
    loop = fr[s0:e0]
    L, X = len(loop), int(XF * sr)
    seam = []
    for i in range(X):
        t = (i + 0.5) / X
        gi, go = math.sin(t * math.pi / 2), math.cos(t * math.pi / 2)
        seam.append([loop[i][c] * gi + loop[L - X + i][c] * go for c in range(ch)])
    body = seam + [list(map(float, f)) for f in loop[X:L - X]]
    pk = max(abs(v) for f in body for v in f) or 1
    g = 32767 * 10 ** (PEAK_DB / 20) / pk
    P = int(PAD * sr)
    full = body[-P:] + body + body[:P]
    o = array.array('h', (max(-32768, min(32767, int(round(v * g)))) for f in full for v in f))
    wout = os.path.join(tmp, 'out.wav')
    write_wav(wout, o, ch, sr)
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '160000', wout, out], check=True)
    ln = len(body) / sr
    print(f'sounding {s0 / sr:.3f}-{e0 / sr:.3f} s, loop {ln:.4f} s, gain {20 * math.log10(g):+.1f} dB')
    print(f'loopStart: {PAD:.3f}, loopEnd: {PAD + ln:.4f}')


if __name__ == '__main__':
    main()
