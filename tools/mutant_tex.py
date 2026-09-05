#!/usr/bin/env python3
"""Prepare the mutant's maps. Run BEFORE tools/mutant_anim.py.

    python3 tools/mutant_tex.py

The pack ships 4K albedo, AO, normal and roughness per texture set. Two things
happen here that matter more than the resolution:

  * THE AMBIENT OCCLUSION IS MULTIPLIED INTO THE ALBEDO. There is one
    directional light in this game and it is a quarter moon behind you, so
    nothing in a crease is ever shaded by the renderer — every fold, every
    socket, every gap between the ribs comes out the same value as the flesh
    beside it, and the creature reads as a smooth pale mass. Baked in, the
    depth is in the map and survives any lighting. This is most of what "the
    textures look better" actually is here.
  * THEY ARE DARKENED AT SOURCE. The first build lifted them in the shader
    with a gamma re-expose and an emissive off their own map, which is the
    trap the Military Shovel taught: a lift applied to a whole map flattens
    it, because it raises the dark parts furthest. The map is multiplied DOWN
    instead and the moon is left to do the modelling.

4K down to 1536 with a proper filter is also a real improvement over the 2K
source resized by the same amount: the pack's 2K maps are already a
resize, and resizing a resize twice is what made the pores mush.
"""
import os, sys
from PIL import Image, ImageChops

SRC = '/private/tmp/claude-501/-Users-ethanreedy-Dev-beachwalk/86ac18b9-ad0c-4a6c-974a-c4c4d6a8f782/scratchpad/mutant/Textures'
OUT = '/private/tmp/claude-501/-Users-ethanreedy-Dev-beachwalk/86ac18b9-ad0c-4a6c-974a-c4c4d6a8f782/scratchpad/tex'
# And a grade on top of each, so they are three related animals rather than
# three downloads. The sets already differ; this pushes them a little further
# apart in the direction each is already going and -- the part that matters --
# pulls all three toward the scene's own cold blue, so they sit in the light of
# this beach instead of on top of it. (r, g, b gains, then a mix of the
# scene's blue through all of it.)
SETS = {
    'pale': ('Texture_set_02/png 4k', 'Mutant_Base_color.png', 'Mutant_AO.png',
             (0.94, 0.99, 1.10), 0.13),      # cooler, the drowned one
    'red':  ('Texture_set_01/Png 4k', 'Mutant_Base_color.png', 'Mutant_AO.png',
             (1.10, 0.86, 0.80), 0.09),      # warmer and deeper: raw meat
    'dark': ('Texture_set_03/png 4k', 'Mutant_Base_color.tga', 'Mutant_AO.tga',
             (0.86, 1.00, 0.88), 0.16),      # green, and furthest into the dark
}
SCENE_BLUE = (0.28, 0.34, 0.46)
COL, NRM = 1536, 1024
AO_POW = 0.85          # the AO map is contrasty; ease it or the folds go to black
DOWN = 0.62            # and the whole thing comes DOWN, at source, not in a shader


def load(setdir, name):
    p = os.path.join(SRC, setdir, name)
    if not os.path.exists(p):
        for alt in (name.replace('.png', '.tga'), name.replace('.tga', '.png'),
                    name.replace('Base_color', 'color')):
            q = os.path.join(SRC, setdir, alt)
            if os.path.exists(q): return Image.open(q)
        raise SystemExit('missing ' + p)
    return Image.open(p)


os.makedirs(OUT, exist_ok=True)
for tag, (setdir, colname, aoname, gain, blue) in SETS.items():
    col = load(setdir, colname).convert('RGB').resize((COL, COL), Image.LANCZOS)
    ao = load(setdir, aoname).convert('L').resize((COL, COL), Image.LANCZOS)
    ao = ao.point(lambda v: int(255 * pow(v / 255.0, AO_POW)))
    # multiply, then take the whole thing down: the moon does the modelling
    out = ImageChops.multiply(col, Image.merge('RGB', (ao, ao, ao)))
    # its own grade, then a little of the scene's blue through all of it, so
    # the three sit in this light rather than on top of it
    ch = list(out.split())
    for i in range(3):
        g, b = gain[i] * DOWN, SCENE_BLUE[i] * 255 * blue
        ch[i] = ch[i].point(lambda v, g=g, b=b: min(255, int(v * g * (1 - blue) + b)))
    out = Image.merge('RGB', ch)
    path = os.path.join(OUT, 'mutant_%s_color.jpg' % tag)
    out.save(path, quality=90, optimize=True)
    print('  %-5s colour %d px  %d KB' % (tag, COL, os.path.getsize(path) // 1024))

# one normal and one roughness serve all three: the sculpt is shared
for name, src, size, q in [('normal', 'Mutant_Normal_OpenGL.png', NRM, 92),
                           ('rough', 'Mutant_Roughness.png', NRM, 85)]:
    im = load('Texture_set_02/png 4k', src).convert('RGB').resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, 'mutant_%s.jpg' % name)
    im.save(path, quality=q, optimize=True)
    print('  %-5s %s %d px  %d KB' % ('', name, size, os.path.getsize(path) // 1024))
print('done ->', OUT)
