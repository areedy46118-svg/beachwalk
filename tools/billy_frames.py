#!/usr/bin/env python3
"""Cut the Billy Bass photographs and REGISTER them onto one frame.

    python3 tools/billy_frames.py

`tools/plaque_cutout.py` takes the wall out from behind each photograph;
this decides where the plaque then SITS. The two shipped frames were cut
independently and it showed:

  * both were clipped by the cutter's own `--inset`, in different
    directions — the idle lost its left and right edges (33 and 74 rows of
    opaque pixel on the frame border) and the talk frame lost its top and
    bottom (467 and 598 columns). A plaque with a sawn-off edge is the
    whole of "the cut-outs look strange";
  * and they came out at different ASPECTS, 1.371 against 1.536, which the
    game reads to set the plane's width — so the plaque grew by a ninth and
    shifted on the wall the moment he started talking. That is what the
    frame change actually looked like: not a fish moving, a picture being
    swapped for a bigger picture.

So the plaque is the LANDMARK, not the image. Its panel is found in each
cut — the columns and rows that are opaque over most of their length, which
is the wood, and not the jaw or the tail hanging off the side of it — and
both frames are put on one canvas with those panels on top of each other.
After that the plane never changes shape, nothing moves but the fish, and
the only difference between the two pictures is the thing the toy does.
"""
import argparse, math, os, subprocess, sys
# (the cut itself is macOS Vision's subject lift now — see SUBJECT below)

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Measured per photograph — these are two different cameras, two different
# walls and two different plaques, and one set of keying numbers does not
# do both. See the sweeps in the round that produced them.
CUTS = {
    # the thumbnail: its oak is washed out to a saturation the wall shares,
    # so the colour test has to be tightened and the brightness floor
    # dropped to reach the shadow the plaque throws to its right
    'idle': ('raw-billy-idle.png', ['--inset', '0.006', '--sat', '22', '--luma', '90']),
    # the video still: whole plaque in frame, and a BLACK band under it
    # where it stands on the table, which is what --dark and --trim-shadow
    # are for
    'talk': ('raw-billy-talk.webp', ['--inset', '0.006', '--dark', '32', '--trim-shadow', '52']),
}


# THE CUT IS THE SUBJECT, NOT A COLOUR. Keying the wall out by colour could
# not tell the talk frame's white chin from the white wall behind it (a wedge
# of wall rode on his jaw) and it tore holes in the idle frame's jaw and left
# a ragged shadow along its foot. `tools/subject_cutout.swift` asks the
# foreground-instance model that ships with macOS what the OBJECT is, which is
# the right question. The thumbnail is upscaled 3x before it is asked, so the
# mask has the pixels it needs round the fins.
SUBJECT = {'idle': ('raw-billy-idle.png', 3), 'talk': ('raw-billy-talk.webp', 1)}


def subject_cut(src, up, out):
    subprocess.check_call(['swift', os.path.join(HERE, 'subject_cutout.swift'),
                           os.path.join(ROOT, 'incoming/unused-2026-10-15', src), out, str(up)])   # (the raw frames left assets/ on 2026-10-15: the game never loads them)
    im = Image.open(out).convert('RGBA')
    # a soft mask has a halo of the wall's colour in its last few percent;
    # keep what is solidly the object and let the rest go
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 70 else min(255, round((v - 70) * 255 / 150)))
    im = Image.merge('RGBA', (r, g, b, a))
    bb = a.getbbox()
    return im.crop(bb)


def hist_match(im, ref):
    """Every channel of `im` mapped onto `ref`'s distribution, over the opaque
    pixels of each. The idle photo is a washed-out 300 px thumbnail and the
    talk one a video still, and matching the WOOD alone left the fish a
    different green in each — which is the thing that changes when he turns,
    so it read as a different fish."""
    def cdf(img):
        a = img.split()[3].load(); W, H = img.size
        chans = [img.getchannel(c).load() for c in 'RGB']
        hs = [[0] * 256 for _ in range(3)]
        for y in range(H):
            for x in range(W):
                if a[x, y] > 200:
                    for c in range(3): hs[c][chans[c][x, y]] += 1
        out = []
        for h in hs:
            tot = float(sum(h)) or 1.0; acc = 0; c = []
            for v in h: acc += v; c.append(acc / tot)
            out.append(c)
        return out
    ci, cr = cdf(im), cdf(ref)
    bands = list(im.split())
    for c in range(3):
        lut = []; j = 0
        for v in range(256):
            while j < 255 and cr[c][j] < ci[c][v]: j += 1
            lut.append(j)
        # half way: the thumbnail's own contrast is not all wrong
        lut = [round(v * 0.25 + l * 0.75) for v, l in enumerate(lut)]
        bands[c] = bands[c].point(lut)
    return Image.merge('RGBA', bands)


def panel_rect(im, frac=0.5):
    """The plaque's own rectangle: the columns opaque over most of the
    height and the rows opaque over most of the width. The fish's jaw
    overhangs the wood on the left in both photographs and its tail does on
    the right in one, and an overhang is a few rows tall — so it never
    reaches the fraction and never moves the landmark."""
    W, H = im.size
    a = im.split()[3].load()
    cols = [sum(1 for y in range(H) if a[x, y] > 40) for x in range(W)]
    rows = [sum(1 for x in range(W) if a[x, y] > 40) for y in range(H)]
    xs = [x for x in range(W) if cols[x] >= H * frac]
    ys = [y for y in range(H) if rows[y] >= W * frac]
    if not xs or not ys:
        raise SystemExit('no panel found')
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


def panel_median(im, margin, panel, mx=None):
    """The wood's own colour, taken as a MEDIAN over the panel so the fish —
    which covers a different part of it in each photograph — cannot move it."""
    p = im.load()
    mx = margin if mx is None else mx
    px = [p[x, y] for y in range(margin, margin + panel[1], 3)
          for x in range(mx, mx + panel[0], 3) if p[x, y][3] > 200]
    return [sorted(c[i] for c in px)[len(px) // 2] for i in range(3)]


def regrade(im, src, dst):
    """Bring `src` to `dst` per channel by a GAMMA and not a gain: it is
    monotonic, it pins black and white, and it cannot clip. A gain of 2.79 on
    the talk frame's blue — which is what matching the medians straight would
    have wanted — flattens the nameplate and the fish's belly to paper."""
    out = im.copy()
    for ch in range(3):
        a, b = max(1, min(254, src[ch])) / 255.0, max(1, min(254, dst[ch])) / 255.0
        g = math.log(b) / math.log(a)
        lut = [min(255, max(0, round(255 * pow(v / 255.0, g)))) for v in range(256)]
        band = out.getchannel('RGB'[ch]).point(lut)
        bands = list(out.split())
        bands[ch] = band
        out = Image.merge('RGBA', bands)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--panel', type=int, nargs=2, default=[520, 372],
                    help='the plaque panel, in pixels, on the shared canvas')
    ap.add_argument('--margin', type=int, default=64,
                    help='room above and below it')
    ap.add_argument('--margin-x', type=int, default=118,
                    help='and either side: his snout and jaw hang well past the wood')
    ap.add_argument('--work', default=os.path.join(HERE, '.billy'))
    a = ap.parse_args()

    os.makedirs(a.work, exist_ok=True)
    PW, PH = a.panel
    MX = a.margin_x
    CW, CH = PW + MX * 2, PH + a.margin * 2
    made = {}

    for name, (src, up) in SUBJECT.items():
        im = subject_cut(src, up, os.path.join(a.work, name + '-subj.png'))
        x0, y0, x1, y1 = panel_rect(im)
        # the panel goes on the shared rect. A NON-UNIFORM fit, because
        # these are two different plaques photographed from two different
        # places and their panels are 1.35 and 1.45 wide for their height:
        # matched on one axis they are still eight per cent out on the
        # other, which is exactly the jump this exists to remove. Stretching
        # a photograph of a plank by that much is invisible; a plaque that
        # changes width is not.
        kx, ky = PW / (x1 - x0), PH / (y1 - y0)
        big = im.resize((max(1, round(im.width * kx)), max(1, round(im.height * ky))), Image.LANCZOS)
        out = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        out.alpha_composite(big, (MX - round(x0 * kx), a.margin - round(y0 * ky)))
        made[name] = out
        al = out.split()[3].load()
        edge = (sum(1 for x in range(CW) if al[x, 0] > 20) + sum(1 for x in range(CW) if al[x, CH - 1] > 20)
                + sum(1 for y in range(CH) if al[0, y] > 20) + sum(1 for y in range(CH) if al[CW - 1, y] > 20))
        print('%-5s  cut %dx%d  panel %d,%d..%d,%d  ->  %dx%d  edge-opaque %d'
              % (name, im.width, im.height, x0, y0, x1, y1, CW, CH, edge))

    # AND THE TWO PHOTOGRAPHS ARE NOT THE SAME LIGHT. Measured on the wood
    # inside each panel: the idle frame's oak sits at (135, 112, 81) and the
    # talk frame's at (116, 74, 29) — a third of a stop darker and far
    # warmer, so the PLAQUE changed colour every time he opened his mouth,
    # which is a flicker whatever the registration does. Both go to the
    # geometric mean of the two, which moves each about half way and asks
    # neither picture to carry the whole correction.
    # the talk frame is the better photograph, so the idle one is brought to
    # it (colours matched over the whole object), and then both go a little
    # toward each other's wood so neither carries the whole correction
    made['idle'] = hist_match(made['idle'], made['talk'])
    meds = {k: panel_median(v, a.margin, a.panel, MX) for k, v in made.items()}
    tgt = [round((meds['idle'][i] * meds['talk'][i]) ** 0.5) for i in range(3)]
    for name, im in made.items():
        g = regrade(im, meds[name], tgt)
        g.save(os.path.join(ROOT, 'assets', 'billy-%s.png' % name))
        print('%-5s  wood %s -> %s' % (name, meds[name], panel_median(g, a.margin, a.panel, MX)))


if __name__ == '__main__':
    main()
