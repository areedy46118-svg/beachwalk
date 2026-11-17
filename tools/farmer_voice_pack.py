#!/usr/bin/env python3
"""THE FARMERS' VOICES (2026-11-16, the owner's four bounces from "FARMER SOUND EFFECTS"): every take cut at its own
silences, levelled, and written as its own small file.

    /usr/bin/python3 tools/farmer_voice_pack.py "<Bounced Files folder>"

  FARMER SWINGS.mp3                 -> assets/farm-swing{n}.m4a   the grunt that goes with a blow (`farmSwingVox`)
  FARMER HITS.mp3                   -> assets/farm-hit{n}.m4a     a man struck (`voice.rec.hurt`)
  FARMER RARE BACKROUND SHOUTS.mp3  -> assets/farm-shout{n}.m4a   a man somewhere in the street, now and then (`farmShoutTick`)
  FARMER RARE DEATH SOUNDS.mp3      -> assets/farm-die{n}.m4a     a man going down, now and then (`voice.rec.die`)
  ORC SWINGS / ORC HITS / ORC DEATH SOUND .mp3 -> assets/orc-swing{n}, orc-hit{n}, orc-die1 .m4a   the tavern's orc (`ORC_VOX`)
  GARGOYLE ATTACK SOUNDS / DEATH SOUNDS / DROP BEHIND MYLES SOUND .mp3 -> assets/garg-attack{n}, garg-die{n}, garg-drop1

Measured on the way in: every take is a voice (pitched, 150-370 Hz), 0.15-0.8 s, the bounces quiet (peaks -5 to -7
dBFS, the takes -18 to -23 dBFS RMS). Each take keeps 40 ms before its onset and 150 ms after its offset (never into
its neighbour), so a breath in or a tail is not clipped; is brought to one RMS (`TARGET_RMS`) under a peak ceiling
(`PEAK_CEIL`), so no one take jumps out of the bank; gets a 5 ms fade in and 40 ms out; and is written mono AAC 96 kbps.
"""
import os, re, subprocess, sys

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'assets')
TMP = os.path.join('/tmp', 'farmer_voice_pack')
os.makedirs(TMP, exist_ok=True)
SETS = [('FARMER SWINGS', 'farm-swing'), ('FARMER HITS', 'farm-hit'),
        ('FARMER RARE BACKROUND SHOUTS', 'farm-shout'), ('FARMER RARE DEATH SOUNDS', 'farm-die')]
# or any bounces named after the folder as "BOUNCE NAME=stem" (the orc's, 2026-11-16):
#   /usr/bin/python3 tools/farmer_voice_pack.py "<Bounced Files>" "ORC SWINGS=orc-swing" "ORC HITS=orc-hit" "ORC DEATH SOUND=orc-die"
if len(sys.argv) > 2:
    SETS = [tuple(a.split('=', 1)) for a in sys.argv[2:]]
NOISE, MIN_SIL = '-42dB', 0.18
PRE, POST = 0.04, 0.15
TARGET_RMS, PEAK_CEIL = -18.0, -1.5


def run(args):
    return subprocess.run(args, capture_output=True, text=True).stderr


def takes(path):
    err = run(['ffmpeg', '-hide_banner', '-i', path, '-af', f'silencedetect=noise={NOISE}:d={MIN_SIL}', '-f', 'null', '-'])
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', err)]
    dur = float(re.search(r'Duration: (\d+):(\d+):([0-9.]+)', err).group(3)) + 60 * float(re.search(r'Duration: (\d+):(\d+)', err).group(2))
    # sound runs from each silence's end to the next silence's start
    segs = []
    if starts and (not ends or starts[0] < ends[0]) and starts[0] > 0.08:
        segs.append((0.0, starts[0]))          # (a bounce that opens on its first take: the gargoyle's deaths)
    for e in ends:
        nxt = [s for s in starts if s > e]
        segs.append((e, nxt[0] if nxt else dur))
    segs = [(a, b) for a, b in segs if b - a > 0.08]
    out = []
    for i, (a, b) in enumerate(segs):
        lo = max(0.0, a - PRE, segs[i - 1][1] + 0.01 if i else 0.0)
        hi = min(dur, b + POST, segs[i + 1][0] - 0.01 if i + 1 < len(segs) else dur)
        out.append((lo, hi))
    return out


def levels(path, a, b):
    err = run(['ffmpeg', '-hide_banner', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'])
    return float(re.search(r'mean_volume: (-?[0-9.]+)', err).group(1)), float(re.search(r'max_volume: (-?[0-9.]+)', err).group(1))


for name, stem in SETS:
    path = os.path.join(SRC, name + '.mp3')
    T = takes(path)
    for i, (a, b) in enumerate(T, 1):
        rms, pk = levels(path, a, b)
        gain = min(TARGET_RMS - rms, PEAK_CEIL - pk)
        d = b - a
        wav = os.path.join(TMP, f'{stem}{i}.wav')
        af = f'volume={gain:.2f}dB,afade=t=in:d=0.005,afade=t=out:st={max(0, d - 0.04):.3f}:d=0.04'
        run(['ffmpeg', '-hide_banner', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', path, '-ac', '1', '-ar', '44100', '-af', af, wav])
        m4a = os.path.join(OUT, f'{stem}{i}.m4a')
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wav, m4a], check=True)
        print(f'{stem}{i}: {a:.2f}-{b:.2f} s ({d:.2f}) rms {rms:.1f} pk {pk:.1f} -> gain {gain:+.1f} dB, {os.path.getsize(m4a)} bytes')
    print(name, '->', len(T), 'takes')
