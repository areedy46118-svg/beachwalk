#!/usr/bin/env python3
"""THE DESERT TEMPLE (2026-11-18): Sketchfab's "Temple USD Workflow Test 3" (re1monsen, CC-BY-4.0) packed for the
crow's flight, and its ground baked into one seamless field.

    python3 -I tools/temple_pack.py incoming/temple assets/temple.glb [--dune x,z,top,sigma_x[,sigma_z] ...]

  incoming/temple/ holds the Sketchfab download (scene.gltf, scene.bin, textures/) and `bake.json`, which
  `incoming/temple/bake.html` writes (open it on any local server; it logs the JSON in [BKJ] chunks — the raycast
  was too slow for 123k triangles, so every terrain triangle is rasterised onto the grid instead).

What it keeps: the near temple (podium, columns, roof rings, the altar ring, the fallen block) and the two far
colonnades — the three fallen columns (.007-.009) are out since 2026-11-18 ("take out those broken pillars … for space"). What it drops: the six camels, the three cloaked figures and the two lines of
little people, the two sand heaps lying on the temple's floor, the pebbles strewn over it, the black mirror disc in
its middle's sister (kept: it is the floor's centre), and the three terrain meshes — which were three different
resolutions laid over each other, a ten-metre cliff where the near one ended. The ground is the bake instead:

  * a non-uniform grid (0.75 m cells to ±45 m round the temple, each next cell 8 % longer to ±1 km, then 16 % to
    ±10 km), heights in metres in the room's frame (the temple's centre at 0, 11x the model's own scale: the temple
    20.5 m to its roof ring, its podium 26 m across and 0.81 m high);
  * the near terrain where it is, the base terrain (mid + far) lifted by the mean difference at the near one's edge
    and that lift let down over 260 m, the two cross-faded over 36..52 m — one surface, no seam;
  * the sand round the podium let down to 0.45 m (a 0.36 m step onto its 0.81 m floor: under `ROCK_STEP`), and
    under it to 0.6 so nothing pokes through the floor;
  * a dune where the crow drops you (`--dune`), so standing on its crest is the owner's screenshot.

Written into the GLB: the heights (float32, row-major z then x) and the axis (float32) as two buffer views, the
sand's colour map (the model's own, 256 px) as a texture, and `scenes[0].extras.bw_desert` saying where they are.
"""
import json, math, os, struct, subprocess, sys, io
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
dunes = [tuple(float(v) for v in a.split(',')) for i, a in enumerate(sys.argv) if i > 0 and sys.argv[i - 1] == '--dune']
# --scale S: the near temple drawn S times its first size (main.js `TMP_SCALE`): its floor 0.81 S, its edge 13.1 S
SC = next((float(sys.argv[i + 1]) for i, a in enumerate(sys.argv) if a == '--scale'), 1.0)
FLOOR, EDGE = 0.81 * SC, 13.1 * SC
here = os.path.dirname(os.path.abspath(__file__))
tmp = os.path.join(src, 'temple-a.glb')
subprocess.check_call([sys.executable, '-I', os.path.join(here, 'gltfpack.py'), os.path.join(src, 'scene.gltf'), tmp,
                       '--tex', '512', '--normal-tex', '256', '--quality', '85',
                       '--nodes', r'^temple\.0(0[1-6]|10|25|26)_\d+$'], stdout=subprocess.DEVNULL)

B = json.load(open(os.path.join(src, 'bake.json')))
ax, N = B['axis'], len(B['axis'])
Hn, Hb = B['Hn'], B['Hb']
sm = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(min(1.0, max(0.0, (x - a) / (b - a))))
diffs = [(Hn[j * N + i] - Hb[j * N + i]) / 100 for j in range(N) for i in range(N)
         if 40 < math.hypot(ax[i], ax[j]) < 50 and Hn[j * N + i] is not None and Hb[j * N + i] is not None]
D = sum(diffs) / len(diffs)
H = [0.0] * (N * N)
for j in range(N):
    for i in range(N):
        k = j * N + i; x, z = ax[i], ax[j]; r = math.hypot(x, z)
        b = Hb[k] / 100 if Hb[k] is not None else -20.0
        b += D * (1 - sm(48, 260, r))
        w = 1 - sm(36, 52, r)
        h = (w * Hn[k] / 100 + (1 - w) * b) if Hn[k] is not None else b
        for dn in dunes:                           # a dune: the ground lifted to `top` at its crest, falling off as a bell
            dx, dz, top, sa = dn[:4]; sb = dn[4] if len(dn) > 4 else sa   # (x, z, top, across the view, along the crest)
            g = math.exp(-((x - dx) ** 2) / (2 * sa * sa) - ((z - dz) ** 2) / (2 * sb * sb))
            h = h + max(0.0, top - h) * g if top > h else h
        # the sand round the podium: drifted up against its foot to a step under its floor (0.36 m: under `ROCK_STEP`),
        # blending back into the dunes over a skirt as wide as the temple is big; and under it, under its floor
        skirt = 4.0 * SC + 20 * (SC - 1) / max(1e-6, SC) if SC > 1 else 3.9
        if r < EDGE + skirt:
            h = h + ((FLOOR - 0.36) - h) * sm(EDGE + skirt, EDGE + 0.5, r)
        if r < EDGE + 0.5:
            h = min(h, FLOOR - 0.21)
        H[k] = h

d = open(tmp, 'rb').read()
jl = struct.unpack_from('<I', d, 12)[0]
g = json.loads(d[20:20 + jl])
bl = struct.unpack_from('<I', d, 20 + jl)[0]
binc = bytearray(d[28 + jl:28 + jl + bl])
def add_view(raw):
    while len(binc) % 4: binc.append(0)
    g['bufferViews'].append({'buffer': 0, 'byteOffset': len(binc), 'byteLength': len(raw)})
    binc.extend(raw)
    return len(g['bufferViews']) - 1
vh = add_view(struct.pack('<%df' % (N * N), *H))
va = add_view(struct.pack('<%df' % N, *ax))
im = Image.open(os.path.join(src, 'textures', '69eb4fb6_baseColor.jpeg')).convert('RGB').resize((256, 256), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=82)
vi = add_view(buf.getvalue())
g.setdefault('images', []).append({'bufferView': vi, 'mimeType': 'image/jpeg', 'name': 'desert_sand'})
g.setdefault('samplers', []).append({'magFilter': 9728, 'minFilter': 9728, 'wrapS': 10497, 'wrapT': 10497})
g.setdefault('textures', []).append({'source': len(g['images']) - 1, 'sampler': len(g['samplers']) - 1})
g['buffers'][0]['byteLength'] = len(binc)
parts = B['parts']
g['scenes'][0].setdefault('extras', {})['bw_desert'] = {
    'n': N, 'heights': vh, 'axis': va, 'sand': len(g['textures']) - 1, 'K': B['K'], 'C': B['C'], 'lift': round(D, 3),
    'dunes': dunes, 'far': {k: parts[k] for k in ('temple025_25', 'temple026_26')},
}
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(binc) % 4: binc.append(0)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binc)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binc), 0x004E4942) + bytes(binc)
open(dst, 'wb').write(out)
print('%s: %.2f MB, grid %d^2, lift %.2f m, dunes %s' % (dst, len(out) / 1e6, N, D, dunes))
