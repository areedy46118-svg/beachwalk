#!/usr/bin/env python3
"""Bake a Wavefront OBJ into the compact mesh blob the game loads.

    python3 tools/objconv.py in.obj out.bwmesh --radius 3.6 --band 0.25 0.58

The game ships no model loader — this turns an OBJ into positions + indices
and nothing else, which a ~20 line reader in main.js can pull straight into a
BufferGeometry. Normals are recomputed at load (everything is flat shaded), and
UVs are dropped, so the file is roughly a sixth the size of the source OBJ.

The transform is baked in: OBJ from 3ds Max is Z-up, so it rotates to Y-up,
centres the model on its tower axis, drops the base to y=0, and scales so the
shaft radius hits --radius. --band picks which height range counts as "shaft"
when measuring that radius.

Format (little endian):
    magic   'BWMESH01'          8 bytes
    uint32  vertex count
    uint32  triangle count
    float32 dequant scale       xyz
    float32 dequant offset      xyz
    int16   positions           vertCount * 3
    uint16  indices             triCount * 3   (or uint32 if verts > 65535)
"""
import argparse
import math
import struct
import sys


def load_obj(path):
    verts, faces = [], []
    for line in open(path, 'r', errors='ignore'):
        if line.startswith('v '):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('f '):
            # each token is v, v/vt, v//vn or v/vt/vn — we only want v
            idx = []
            for tok in line.split()[1:]:
                i = int(tok.split('/')[0])
                idx.append(i - 1 if i > 0 else len(verts) + i)
            # fan-triangulate whatever polygon this is
            for k in range(1, len(idx) - 1):
                faces.append((idx[0], idx[k], idx[k + 1]))
    return verts, faces


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--radius', type=float, default=3.6,
                    help='world radius the shaft should end up at')
    ap.add_argument('--band', type=float, nargs=2, default=[0.25, 0.58],
                    help='fraction of height treated as plain shaft')
    ap.add_argument('--zup', action='store_true', default=True)
    args = ap.parse_args()

    verts, faces = load_obj(args.src)
    if not verts or not faces:
        sys.exit('no geometry found')

    # --- work out the tower axis and the shaft radius, still in OBJ space ---
    zs = [v[2] for v in verts]
    zmin, zmax = min(zs), max(zs)
    span = zmax - zmin
    upper = [v for v in verts if v[2] > zmin + span * 0.55]
    cx = sum(v[0] for v in upper) / len(upper)
    cy = sum(v[1] for v in upper) / len(upper)

    lo, hi = zmin + span * args.band[0], zmin + span * args.band[1]
    shaft = [math.hypot(v[0] - cx, v[1] - cy) for v in verts if lo <= v[2] <= hi]
    shaft.sort()
    # 90th percentile, so a stray detail doesn't set the scale
    shaft_r = shaft[int(len(shaft) * 0.9)] if shaft else 1.0
    scale = args.radius / shaft_r

    # --- bake: Z-up -> Y-up, centre on the axis, base to y=0, scale ---
    out = []
    for x, y, z in verts:
        wx = (x - cx) * scale
        wy = (z - zmin) * scale
        wz = (-(y - cy)) * scale if args.zup else (y - cy) * scale
        out.append((wx, wy, wz))

    xs = [p[0] for p in out]; ys = [p[1] for p in out]; ws = [p[2] for p in out]
    bmin = (min(xs), min(ys), min(ws))
    bmax = (max(xs), max(ys), max(ws))
    # quantise to int16 across the bounding box
    ext = [max(1e-6, bmax[i] - bmin[i]) for i in range(3)]
    qs = [ext[i] / 65534.0 for i in range(3)]

    n_v, n_f = len(out), len(faces)
    wide = n_v > 65535
    with open(args.dst, 'wb') as f:
        f.write(b'BWMESH01')
        f.write(struct.pack('<II', n_v, n_f))
        f.write(struct.pack('<3f', *qs))
        f.write(struct.pack('<3f', *bmin))
        buf = bytearray()
        for p in out:
            for i in range(3):
                q = int(round((p[i] - bmin[i]) / qs[i])) - 32767
                buf += struct.pack('<h', max(-32768, min(32767, q)))
        f.write(buf)
        fmt = '<I' if wide else '<H'
        buf = bytearray()
        for tri in faces:
            for i in tri:
                buf += struct.pack(fmt, i)
        f.write(buf)

    print(f'{args.dst}: {n_v} verts, {n_f} tris, {"u32" if wide else "u16"} indices')
    print(f'  shaft radius {shaft_r:.1f} -> {args.radius}  (scale {scale:.5f})')
    print(f'  world bounds  x {bmin[0]:.2f}..{bmax[0]:.2f}'
          f'  y {bmin[1]:.2f}..{bmax[1]:.2f}  z {bmin[2]:.2f}..{bmax[2]:.2f}')


if __name__ == '__main__':
    main()
