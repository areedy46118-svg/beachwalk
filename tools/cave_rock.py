"""Build assets/cave-rock.jpg and assets/cave-rock-n.jpg — the stone the
undercroft's two tunnels are made of.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/cave_rock.py

(Blender only because it is the one python on this machine with numpy in it.)

WHY THERE IS A TEXTURE HERE AT ALL. The 3DRT tunnel ships ONE 256 by 256
base colour and nothing else — no normal, no roughness — for three hundred
and forty metres of cave, and no amount of projection makes that read as
rock: it is the whole of "the textures are stretched", "it looks
untextured" and "a lot of this looks bad". The owner's word was that the
two caves should be THE SAME COLOUR AS THE HUGE ROCK, so the stone is cut
out of that rock's own 4096 diffuse — JJ's "Rock Mountain with cave" —
and the tunnels are built and projected with it.

Three things it has to do to a photogrammetry atlas before it can tile:

  * PICK A PATCH WITH NOTHING IN IT. A scan's atlas is a map of one
    mountain: most of it is seams, charts and sky. Every 1024 window is
    scored on how little LOW-frequency variation it has (a gradient across
    the tile is baked sunlight, and baked sunlight tiled fifty times is
    fifty identical shadows) and how much HIGH-frequency it keeps, and the
    best one wins.
  * DIVIDE OUT THE LIGHT IT WAS SHOT IN. The CD sleeve's own trick: divide
    by a heavily blurred copy of itself and multiply the mean back, which
    takes the low-frequency lighting out and leaves the grain.
  * AND MIRRORING IS NOT SEAMLESS, IT IS A BUTTERFLY. Mirroring the tile
    makes the edges match by construction and was the first thing tried;
    what came back was a kaleidoscope, because this rock has strong
    diagonal streaks in it and a mirror turns every one of them into a V.
    The tile is OFFSET by half instead — which moves the seams to the
    middle — and the cross that leaves is healed with a quarter-offset copy
    of itself under a smooth mask. A little ghosting on stone in the dark
    is nothing; a grid of symmetries is the first thing the eye finds.

The normal map is derived from the colour's own luminance, because on stone
the dark parts ARE the hollows. It is derived from the FLATTENED colour
(the grade is a level change that costs contrast, and contrast is what a
height field is made of — the wreck paid for this once).
"""
import bpy, os, sys
import numpy as np

SRC = ('/Users/ethanreedy/Downloads/rock_mountain_with_cave_realistic_85k_by_jj_fbx/'
       'textures/Rock_Mountain_with_cave_realistic_85k_by_JJ_gameasset_Mat_1_diffuse.png')
OUT = '/Users/ethanreedy/Dev/beachwalk/assets'
N   = 1024          # the tile
def log(*a): print('[rock]', *a); sys.stdout.flush()

im = bpy.data.images.load(SRC)
W, H = im.size
px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, :3]
px = px[::-1]                                  # blender images are bottom-up
log('source', W, H)

def boxblur(a, r):
    """a separable box blur by cumulative sums — no scipy on this machine"""
    out = a
    for ax in (0, 1):
        c = np.cumsum(np.pad(out, [(r + 1, r) if i == ax else (0, 0) for i in range(out.ndim)],
                             mode='edge'), axis=ax)
        sl_hi = [slice(None)] * out.ndim; sl_lo = [slice(None)] * out.ndim
        sl_hi[ax] = slice(2 * r + 1, None); sl_lo[ax] = slice(0, -(2 * r + 1))
        out = (c[tuple(sl_hi)] - c[tuple(sl_lo)]) / (2 * r + 1)
    return out

# ---- pick the patch -------------------------------------------------------
lum = px @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
lowf = boxblur(lum, 48)
best, bxy = -1e9, (0, 0)
for y in range(0, H - N + 1, 128):
    for x in range(0, W - N + 1, 128):
        t = lum[y:y + N, x:x + N]
        if t.mean() < 0.05 or t.mean() > 0.75: continue        # sky, or a black chart
        flat = 1.0 - min(1.0, lowf[y:y + N, x:x + N].std() * 9.0)   # no baked gradient
        grain = min(1.0, (t - boxblur(t, 12)).std() * 26.0)         # but plenty of stone
        holes = (t < 0.012).mean()                                  # unwrapped nothing
        s = flat * 1.0 + grain * 1.2 - holes * 6.0
        if s > best: best, bxy = s, (x, y)
x0, y0 = bxy
log('patch at', x0, y0, 'score', round(best, 3))
tile = px[y0:y0 + N, x0:x0 + N].copy()

# ---- divide out the light it was shot in ----------------------------------
# HARD, and the radius is the whole argument. At 96 the division only took
# features bigger than a fifth of the tile, and what was left was a handful of
# recognisable BLOBS — so the tile read as a tile the moment it repeated, and
# a hundred and seventy metres of tunnel rendered as a lattice. At 40 nothing
# coarser than a twelfth of the tile survives: what is left is grain, and
# grain has no shape to recognise.
big = boxblur(tile, 40)
tile = np.clip(tile / np.maximum(big, 1e-3) * big.mean(axis=(0, 1)), 0.0, 1.0)
mid = tile.mean(axis=(0, 1))
tile = np.clip((tile - mid) * 1.35 + mid, 0.0, 1.0)      # the divide costs contrast; give it back

# ---- seamless: offset by half, then heal the cross -------------------------
tile = np.roll(np.roll(tile, N // 2, axis=0), N // 2, axis=1)
patch = np.roll(np.roll(tile, N // 4, axis=0), -N // 4, axis=1)
i = np.arange(N, dtype=np.float32)
band = lambda c, w: np.exp(-((np.minimum(np.abs(i - c), N - np.abs(i - c))) / w) ** 2)
mx = band(N / 2, 46.0); my = band(N / 2, 46.0)
mask = np.maximum(mx[None, :], my[:, None])[:, :, None]
tile = tile * (1 - mask) + patch * mask

def save(arr, name, srgb=True):
    h, w = arr.shape[:2]
    out = bpy.data.images.new(name, w, h, alpha=False)
    out.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    buf = np.concatenate([arr[::-1], np.ones((h, w, 1), dtype=np.float32)], axis=2)
    out.pixels = buf.reshape(-1)
    out.filepath_raw = os.path.join(OUT, name)
    out.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 88
    out.save()
    log('wrote', name, w, h, round(os.path.getsize(out.filepath_raw) / 1e3), 'KB')

save(tile, 'cave-rock.jpg')

# ---- the relief, off the flattened colour's own luminance -----------------
h = tile @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
h = boxblur(h, 2)
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 9.0
gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 9.0
nz = np.ones_like(h)
L = np.sqrt(gx * gx + gy * gy + nz * nz)
nrm = np.stack([(-gx / L) * 0.5 + 0.5, (gy / L) * 0.5 + 0.5, (nz / L) * 0.5 + 0.5], axis=2)
save(np.clip(nrm, 0, 1).astype(np.float32), 'cave-rock-n.jpg', srgb=False)
log('mean', [round(float(v), 3) for v in tile.mean(axis=(0, 1))],
    'sd', [round(float(v), 3) for v in tile.std(axis=(0, 1))])
