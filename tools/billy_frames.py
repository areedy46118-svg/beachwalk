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
import argparse, os, subprocess, sys

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--panel', type=int, nargs=2, default=[520, 372],
                    help='the plaque panel, in pixels, on the shared canvas')
    ap.add_argument('--margin', type=int, default=64,
                    help='room round it for whatever hangs off the wood')
    ap.add_argument('--work', default=os.path.join(HERE, '.billy'))
    a = ap.parse_args()

    os.makedirs(a.work, exist_ok=True)
    PW, PH = a.panel
    CW, CH = PW + a.margin * 2, PH + a.margin * 2

    for name, (src, args) in CUTS.items():
        cut = os.path.join(a.work, name + '-cut.png')
        subprocess.check_call([sys.executable, os.path.join(HERE, 'plaque_cutout.py'),
                               os.path.join(ROOT, 'assets', src), cut,
                               '--max', '1200', '--pad', '2'] + args)
        im = Image.open(cut).convert('RGBA')
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
        out.alpha_composite(big, (a.margin - round(x0 * kx), a.margin - round(y0 * ky)))
        dst = os.path.join(ROOT, 'assets', 'billy-%s.png' % name)
        out.save(dst)
        al = out.split()[3].load()
        edge = (sum(1 for x in range(CW) if al[x, 0] > 20) + sum(1 for x in range(CW) if al[x, CH - 1] > 20)
                + sum(1 for y in range(CH) if al[0, y] > 20) + sum(1 for y in range(CH) if al[CW - 1, y] > 20))
        print('%-5s  cut %dx%d  panel %d,%d..%d,%d  ->  %dx%d  edge-opaque %d'
              % (name, im.width, im.height, x0, y0, x1, y1, CW, CH, edge))


if __name__ == '__main__':
    main()
