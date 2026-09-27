#!/usr/bin/env python3
"""Build assets/intro-waves.mp4 from the owner's clip as one seamless take.

The clip is a camera travelling over moonlit water: the ripples scroll left at
a speed that grows toward the bottom of the frame (perspective), while the
moon's road stays roughly where it is and drifts about 90 px right over the
clip's 10.9 s. Every earlier loop of it cut the end into the start, so the road
hopped sideways and the glitter dimmed through the dissolve at every seam,
which reads as a hitch. This does three things instead:

1. STABILISES THE ROAD. Its centroid is measured per band and per frame,
   smoothed hard in time, fitted as a line down the frame, and every row is
   shifted so the road stands still. The ripples keep scrolling; only the
   slow drift goes.
2. INTERPOLATES TO 30 fps ITSELF. Per frame pair the ripple motion is
   measured by sub-pixel phase correlation in twelve bands and fitted as a
   quadratic down the frame; an in-between frame is both neighbours moved
   along that motion and blended at equal power (below). No block-matching,
   so nothing in the glitter breaks up, and an in-between frame is as crisp
   as a real one, or the texture would soften five times a second.
3. CLOSES THE LOOP WITHOUT DIMMING. The last 2.2 s are blended into the first
   with the low frequencies (the road, the overall level) crossfaded and the
   high frequencies (the glitter) mixed at EQUAL POWER, so the texture never
   loses contrast in the middle of the seam the way a plain dissolve does.

The file is longer than the intro shows it, so the browser never has to wrap.

    python tools/intro_waves.py SRC.mp4 assets/intro-waves.mp4
Needs numpy and ffmpeg.
"""
import subprocess, sys
import numpy as np

SRC, DST = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
FPS_IN, FPS_OUT = 25.0, 30.0
DUR = float(__import__("os").environ.get("DUR", 31.0))   # the intro shows it until ~29.3 s
K = 55.0              # seam blend, in source frames (2.2 s)
ZOOM = 1.06           # hides the columns the road shift pulls in
CRF = 30


def read(vf, w, h, ch):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', vf, '-f', 'rawvideo', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, ch) if ch > 1 else np.frombuffer(raw, np.uint8).reshape(-1, h, w)


# ---- analysis at half size
g = read('scale=960:540,format=gray', 960, 540, 1).astype(np.float32)
n = len(g)
NB = 12
bh = 540 // NB
yc = (np.arange(NB) + 0.5) * bh


def phase(f, h):
    hh, ww = f.shape
    win = np.outer(np.hanning(hh), np.hanning(ww))
    F = np.fft.fft2((f - f.mean()) * win)
    G = np.fft.fft2((h - h.mean()) * win)
    R = F * np.conj(G)
    R /= np.abs(R) + 1e-6
    r = np.fft.ifft2(R).real
    y, x = np.unravel_index(r.argmax(), r.shape)
    c = r[y, x]
    xm, xp = r[y, (x - 1) % ww], r[y, (x + 1) % ww]
    ym, yp = r[(y - 1) % hh, x], r[(y + 1) % hh, x]
    dx = x + 0.5 * (xm - xp) / (xm - 2 * c + xp + 1e-9)
    dy = y + 0.5 * (ym - yp) / (ym - 2 * c + yp + 1e-9)
    if dx > ww / 2: dx -= ww
    if dy > hh / 2: dy -= hh
    return dx, dy


# ripple motion i -> i+1, per row, at full size
yy = np.arange(H) / H
VX = np.zeros((n - 1, H), np.float32)
VY = np.zeros((n - 1, H), np.float32)
for i in range(n - 1):
    m = np.array([phase(g[i + 1, b * bh:(b + 1) * bh], g[i, b * bh:(b + 1) * bh]) for b in range(NB)])
    cx = np.polyfit(yc / 540, m[:, 0], 2)
    cy = np.polyfit(yc / 540, m[:, 1], 1)
    VX[i] = np.polyval(cx, yy) * 2
    VY[i] = np.polyval(cy, yy) * 2

# the road, per band, smoothed in time and fitted down the frame
NR = 6
rh = 540 // NR
xs = np.arange(960)
R = np.zeros((n, NR))
for i in range(n):
    for b in range(NR):
        s = np.clip(g[i, b * rh:(b + 1) * rh] - 60, 0, None).sum(0)
        R[i, b] = (s * xs).sum() / s.sum()
t = np.arange(n)
Rs = np.zeros_like(R)
for b in range(NR):
    k = np.exp(-0.5 * ((t[:, None] - t[None, :]) / 30.0) ** 2)
    Rs[:, b] = (k * R[:, b]).sum(1) / k.sum(1)
ryc = (np.arange(NR) + 0.5) * rh / 540
wts = np.linspace(1.0, 0.4, NR)          # the top of the road is the clean part
fit = np.array([np.polyfit(ryc, Rs[i], 1, w=wts) for i in range(n)])
road = np.array([np.polyval(fit[i], yy) for i in range(n)]) * 2   # (n, H) at full size
OFF = road.mean(0)[None] - road                                  # shift that holds the road still
OFF = (OFF - (OFF.max() + OFF.min()) / 2).astype(np.float32)     # centred, so neither edge runs out
print('road shift range px:', round(float(OFF.min()), 1), round(float(OFF.max()), 1))
del g

# ---- the frames, full size
F = read('format=rgb24', W, H, 3)
assert len(F) == n
COLS = np.arange(W)
ROWS = np.arange(H)


def warp(fr, dx, dy):
    """out(x, y) = fr(x - dx(y), y - dy(y)), bilinear, edges clamped."""
    sy = ROWS - dy
    y0 = np.floor(sy).astype(np.int32)
    fy = (sy - y0)[:, None, None].astype(np.float32)
    r0 = np.clip(y0, 0, H - 1)[:, None]
    r1 = np.clip(y0 + 1, 0, H - 1)[:, None]
    sx = -dx
    x0 = np.floor(sx).astype(np.int32)
    fx = (sx - x0)[:, None, None].astype(np.float32)
    c0 = np.clip(COLS[None] + x0[:, None], 0, W - 1)
    c1 = np.clip(c0 + 1, 0, W - 1)
    a = fr[r0, c0].astype(np.float32) * (1 - fx) + fr[r0, c1] * fx
    b = fr[r1, c0].astype(np.float32) * (1 - fx) + fr[r1, c1] * fx
    return a * (1 - fy) + b * fy


def S(tau):
    """The stabilised clip at fractional source frame tau."""
    i = min(int(np.floor(tau)), n - 2)
    a = tau - i
    off = OFF[i] * (1 - a) + OFF[i + 1] * a
    A = warp(F[i], off + a * VX[i], a * VY[i])
    if a < 1e-4:
        return A
    B = warp(F[i + 1], off - (1 - a) * VX[i], -(1 - a) * VY[i])
    return mix(A, B, a)


def mix(A, B, w):
    """A to B by w: the broad light crossfaded, the glitter at equal power,
    so a blend of two frames is as crisp as either of them."""
    la, lb = blur(A, 40), blur(B, 40)
    hf = ((1 - w) * (A - la) + w * (B - lb)) / np.sqrt((1 - w) ** 2 + w ** 2)
    return (1 - w) * la + w * lb + hf


def blur(x, r):
    """Box blur, twice per axis, edges extended."""
    for ax in (0, 1):
        for _ in range(2):
            pad = [(0, 0)] * x.ndim
            pad[ax] = (r + 1, r)
            c = np.cumsum(np.pad(x, pad, mode='edge'), axis=ax)
            N = x.shape[ax]
            x = (np.take(c, np.arange(2 * r + 1, N + 2 * r + 1), axis=ax)
                 - np.take(c, np.arange(0, N), axis=ax)) / (2 * r + 1)
    return x


END = n - 1 - 0.1
L = END - K
print('loop', round(L / FPS_IN, 3), 's; seam', round(K / FPS_IN, 2), 's')

enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                        '-s', f'{W}x{H}', '-r', str(FPS_OUT), '-i', '-',
                        '-vf', f'scale={round(W * ZOOM / 2) * 2}:{round(H * ZOOM / 2) * 2}:flags=lanczos,crop={W}:{H},format=yuv420p',
                        '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(CRF), '-profile:v', 'high',
                        '-g', '60', '-movflags', '+faststart', DST], stdin=subprocess.PIPE)
N = int(round(DUR * FPS_OUT))
for k in range(N):
    tau = (k * FPS_IN / FPS_OUT) % L
    if tau < K:
        w = tau / K
        w = w * w * (3 - 2 * w)
        out = mix(S(tau + L), S(tau), w)   # the end of the clip going out, the start coming in
    else:
        out = S(tau)
    enc.stdin.write(np.clip(out + 0.5, 0, 255).astype(np.uint8).tobytes())
    if k % 60 == 0:
        print(k, '/', N, flush=True)
enc.stdin.close()
enc.wait()
