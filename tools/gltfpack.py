#!/usr/bin/env python3
"""Pack a Sketchfab .gltf (+ .bin + loose 4K textures) into one small .glb.

    python3 tools/gltfpack.py in/scene.gltf assets/rocks.glb \
        --tex 1024 --normal-tex 512 --drop-mr

Unlike tools/gltfslim.py this KEEPS the textures — it is for the props whose
whole point is the scanned albedo. What it actually does:

  * rebuilds the binary from scratch, so every attribute we dropped
    (TANGENT and the spare UV sets, ~half the file on these downloads)
    really leaves;
  * downcasts 32-bit indices to 16-bit wherever the vertex count allows;
  * resizes every image and re-encodes it as JPEG — Sketchfab ships 4096²
    PNGs, which is 344 MB for six little rocks;
  * rewrites KHR_materials_pbrSpecularGlossiness into plain metallic-roughness.
    three r160 dropped that extension, so a spec-gloss model loads as blank
    white with no maps at all — which is exactly how the body bag first looked.

Geometry, node names and the node hierarchy come through untouched.
"""
import argparse, base64, io, json, os, struct, sys

from PIL import Image

CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
      5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4,
      'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER = 34962, 34963


def mat_mul(a, b):
    return [sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(n):
    if 'matrix' in n:
        return list(n['matrix'])
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    return [(1-2*(y*y+z*z))*s[0], (2*(x*y+z*w))*s[0], (2*(x*z-y*w))*s[0], 0,
            (2*(x*y-z*w))*s[1], (1-2*(x*x+z*z))*s[1], (2*(y*z+x*w))*s[1], 0,
            (2*(x*z+y*w))*s[2], (2*(y*z-x*w))*s[2], (1-2*(x*x+y*y))*s[2], 0,
            t[0], t[1], t[2], 1]


def apply_m(m, p):
    x, y, z = p[0], p[1], p[2]
    return (m[0]*x + m[4]*y + m[8]*z + m[12],
            m[1]*x + m[5]*y + m[9]*z + m[13],
            m[2]*x + m[6]*y + m[10]*z + m[14])


def _cluster(P, I, cell):
    """snap to a grid, average each cell, drop the triangles that collapse"""
    rep, acc, remap = {}, [], [0] * len(P)
    for vi, p in enumerate(P):
        key = (round(p[0] / cell), round(p[1] / cell), round(p[2] / cell))
        j = rep.get(key)
        if j is None:
            j = rep[key] = len(acc); acc.append([0.0, 0.0, 0.0, 0])
        s = acc[j]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += 1
        remap[vi] = j
    pos = [(s[0] / s[3], s[1] / s[3], s[2] / s[3]) for s in acc]
    tris, seen = [], set()
    for t in range(0, len(I) - 2, 3):
        a, b, c = remap[I[t]], remap[I[t + 1]], remap[I[t + 2]]
        if a == b or b == c or a == c:
            continue
        k = tuple(sorted((a, b, c)))
        if k in seen:
            continue
        seen.add(k); tris.append((a, b, c))
    return pos, tris


def _cluster_uv(P, UV, I, cell, uv_cell=0.004):
    """The same weld, carrying the ATLAS. A scan's whole point is its
    albedo, and `_cluster` keeps positions and indices only — so anything
    put through it comes out untextured and has to have a projection
    invented for it (the octopus ring's own scar). A vertex may only merge
    with one that is near it in the uv as well as in space; the POSITION
    cell still decides a collapse, so the budget means exactly what it
    meant before and a seam can never open a crack. The undercroft's
    `cluster_uv`, which the church paid for."""
    pcell, pacc, vcell, vacc = {}, [], {}, []
    remap = [0] * len(P); pmap = [0] * len(P)
    for vi, p in enumerate(P):
        u = UV[vi]
        key = (int(p[0] // cell), int(p[1] // cell), int(p[2] // cell))
        pi = pcell.get(key)
        if pi is None:
            pi = pcell[key] = len(pacc); pacc.append([0.0, 0.0, 0.0, 0])
        acc = pacc[pi]; acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; acc[3] += 1
        pmap[vi] = pi
        vkey = (pi, int(u[0] // uv_cell), int(u[1] // uv_cell))
        j = vcell.get(vkey)
        if j is None:
            j = vcell[vkey] = len(vacc); vacc.append([0.0, 0.0, 0, pi])
        b = vacc[j]; b[0] += u[0]; b[1] += u[1]; b[2] += 1
        remap[vi] = j
    pos = [(pacc[b[3]][0] / pacc[b[3]][3], pacc[b[3]][1] / pacc[b[3]][3],
            pacc[b[3]][2] / pacc[b[3]][3]) for b in vacc]
    uvs = [(b[0] / b[2], b[1] / b[2]) for b in vacc]
    tris, seen = [], set()
    for t in range(0, len(I) - 2, 3):
        pa, pb, pc = pmap[I[t]], pmap[I[t + 1]], pmap[I[t + 2]]
        if pa == pb or pb == pc or pa == pc:
            continue
        # a duplicate is a duplicate in SPACE, not in the atlas — two faces
        # welded from different corners of the map sit at exactly the same
        # depth and fight, which is the flicker the church measured
        k = tuple(sorted((pa, pb, pc)))
        if k in seen:
            continue
        seen.add(k); tris.append((remap[I[t]], remap[I[t + 1]], remap[I[t + 2]]))
    return pos, uvs, tris


def _smooth_normals(P, tris):
    """Recomputed, never carried. A decimated vertex is an AVERAGE of the
    vertices that fell in its cell, so the normal it arrived with belongs
    to a surface that is no longer there; the faces it actually has now
    are the only honest source."""
    N = [[0.0, 0.0, 0.0] for _ in P]
    for a, b, c in tris:
        ax, ay, az = P[a]; bx, by, bz = P[b]; cx, cy, cz = P[c]
        ux, uy, uz = bx - ax, by - ay, bz - az
        vx, vy, vz = cx - ax, cy - ay, cz - az
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        for i in (a, b, c):
            N[i][0] += nx; N[i][1] += ny; N[i][2] += nz
    out = []
    for n in N:
        L = (n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) ** 0.5
        out.append((n[0] / L, n[1] / L, n[2] / L) if L > 1e-12 else (0.0, 1.0, 0.0))
    return out


def _descendants(nodes, i):
    out = []
    for c in nodes[i].get('children', []):
        out.append(c); out.extend(_descendants(nodes, c))
    return out


def pad4(b):
    b.extend(b'\0' * ((4 - len(b) % 4) % 4))


def read_accessor(g, bufs, i):
    """every element of accessor i as a tuple, de-strided"""
    a = g['accessors'][i]
    fmt, size = CT[a['componentType']]
    n = NC[a['type']]
    if 'bufferView' not in a:                       # all-zero accessor
        return [(0,) * n] * a['count']
    bv = g['bufferViews'][a['bufferView']]
    buf = bufs[bv.get('buffer', 0)]
    stride = bv.get('byteStride') or size * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * n, buf, base + k * stride)
            for k in range(a['count'])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--tex', type=int, default=1024, help='max size for colour maps')
    ap.add_argument('--normal-tex', type=int, default=0, help='max size for normal maps (default: --tex)')
    ap.add_argument('--quality', type=int, default=88)
    ap.add_argument('--drop', default='TANGENT,TEXCOORD_1,TEXCOORD_2,TEXCOORD_3,COLOR_0',
                    help='vertex attributes to throw away')
    ap.add_argument('--drop-mr', action='store_true',
                    help='drop metallicRoughness maps and use flat factors')
    ap.add_argument('--drop-ext', default=None,
                    help='comma list of MATERIAL extensions to strip. KHR_materials_specular is the '
                         'one that matters here: three honours it by promoting the material to '
                         'MeshPhysicalMaterial and hanging a second map off it, which for a rock is '
                         'a megabyte and a costlier shader for nothing.')
    ap.add_argument('--nodes', default=None,
                    help='regex: keep only nodes (or nodes whose mesh) matching this, plus ancestors/descendants')
    ap.add_argument('--min-tris', type=int, default=0, help='drop primitives smaller than this')
    ap.add_argument('--no-clips', action='store_true',
                    help='drop every animation: for a creature whose clips are all retargeted, '
                         'and for a demo clip on morph targets this packer has just dropped')
    ap.add_argument('--clips', default=None,
                    help='comma list: keep only these animations and RENAME them to these names. '
                         'A Sketchfab rip names every clip "rig|rig|rig|walk", so the match is on '
                         'the last |-separated segment. Use old=new to rename as well as keep. '
                         'Thirty-seven clips of keyframes is most of a download; a fight wants twelve.')
    ap.add_argument('--keep-uv', action='store_true',
                    help='carry TEXCOORD_0 through --decimate and rebuild smooth normals')
    ap.add_argument('--decimate', type=int, default=0,
                    help='merge every primitive and vertex-cluster down to about this many triangles')
    ap.add_argument('--decimate-each', type=int, default=0,
                    help='vertex-cluster EVERY PRIMITIVE ON ITS OWN down to about this many '
                         'triangles, carrying its uv. --decimate merges the whole file into one '
                         'mesh, which is right for a scan split into chunks and destroys a pack of '
                         'thirty-two separate props: this is the same weld, per prop, so they stay '
                         'thirty-two props.')
    a = ap.parse_args()
    nrm_max = a.normal_tex or a.tex
    drop = {s for s in a.drop.split(',') if s}

    root = os.path.dirname(os.path.abspath(a.src))
    g = json.load(open(a.src))
    bufs = []
    for b in g['buffers']:
        uri = b.get('uri', '')
        bufs.append(base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:')
                    else open(os.path.join(root, uri), 'rb').read())

    # ---- keep only the animations asked for -----------------------------
    # Keyframes are the bulk of a rigged download: SCP-096 arrives with 37
    # clips over 4.2 MB of buffer, and a boss fight uses twelve of them. The
    # match is on the last |-separated segment because every clip in a
    # Sketchfab rip is called 'rig|rig|rig|<name>'.
    # AND A DEMO CLIP CAN BE WORSE THAN USELESS. The orc's one animation drives
    # MORPH TARGET WEIGHTS, and this packer drops the targets — so Blender's
    # own importer walks into `obj.data.shape_keys.id_type` on a mesh that has
    # no shape keys and dies before a single triangle arrives. A creature whose
    # every clip is retargeted has no use for the file's own anyway.
    if a.no_clips:
        g['animations'] = []
    # AND A CHANNEL THAT DRIVES SOMETHING THIS PACKER HAS DROPPED IS A BROKEN
    # CHANNEL. The morph targets go with the attribute rebuild; the tracks that
    # drove their weights stayed, and Blender's own importer then walked into
    # `obj.data.shape_keys.id_type` on a mesh with no shape keys and died
    # before a triangle arrived. The clip is worth keeping — on a rip whose
    # bind pose is degenerate it is the only real stance there is — so it is
    # the dead channels that go, not the animation.
    for an in g.get('animations', []):
        ch = [c for c in an.get('channels', []) if c.get('target', {}).get('path') != 'weights']
        if len(ch) != len(an.get('channels', [])):
            an['channels'] = ch
    g['animations'] = [an for an in g.get('animations', []) if an.get('channels')]
    if a.clips:
        want = {}
        for tok in a.clips.split(','):
            if not tok:
                continue
            old, _, new = tok.partition('=')
            want[old] = new or old
        keep, seen = [], set()
        for an in g.get('animations', []):
            short = an.get('name', '').split('|')[-1]
            if short in want:
                an['name'] = want[short]
                seen.add(short)
                keep.append(an)
        missing = set(want) - seen
        if missing:
            sys.exit('no such clip: ' + ', '.join(sorted(missing)))
        g['animations'] = keep

    # ---- keep only the nodes asked for ---------------------------------
    # A Sketchfab scene is often one asset plus the ground it was scanned on
    # and a demo scatter of itself; --nodes lets you take the four grass clumps
    # and leave the 70k-triangle lawn behind.
    if a.nodes or a.min_tris:
        import re
        nodes = g.get('nodes', [])
        if a.min_tris:
            for m in g.get('meshes', []):
                m['primitives'] = [pr for pr in m.get('primitives', [])
                                   if 'indices' not in pr or g['accessors'][pr['indices']]['count'] // 3 >= a.min_tris]
        if a.nodes:
            rx = re.compile(a.nodes)
            parent = {}
            for i, n in enumerate(nodes):
                for c in n.get('children', []):
                    parent[c] = i
            hit = set()
            for i, n in enumerate(nodes):
                mname = g['meshes'][n['mesh']].get('name', '') if 'mesh' in n else ''
                has_geo = 'mesh' in n and g['meshes'][n['mesh']].get('primitives')
                if (rx.search(n.get('name', '') or '') or rx.search(mname or '')) and (has_geo or 'mesh' not in n):
                    hit.add(i)
            keep = set()
            def down(i):
                keep.add(i)
                for c in nodes[i].get('children', []):
                    down(c)
            for i in hit:
                down(i)
                j = i
                while j in parent:
                    j = parent[j]; keep.add(j)
            # everything under a hit is kept whole; ancestors are kept for
            # their transforms only and carry no mesh of their own
            under = set()
            for i in hit:
                under.update(_descendants(nodes, i))
            for i, n in enumerate(nodes):
                if 'children' in n:
                    n['children'] = [c for c in n['children'] if c in keep]
                if i not in hit and i not in under:
                    n.pop('mesh', None)
            for sc in g.get('scenes', []):
                sc['nodes'] = [r for r in sc.get('nodes', []) if r in keep]
        # drop meshes nothing points at any more, and remap
        refd = sorted({n['mesh'] for n in nodes if 'mesh' in n and g['meshes'][n['mesh']].get('primitives')})
        remap_m = {old: new for new, old in enumerate(refd)}
        g['meshes'] = [g['meshes'][i] for i in refd]
        for n in nodes:
            if 'mesh' in n:
                if n['mesh'] in remap_m: n['mesh'] = remap_m[n['mesh']]
                else: n.pop('mesh')
        # and materials nothing uses
        usedm = sorted({pr['material'] for m in g['meshes'] for pr in m['primitives'] if 'material' in pr})
        remap_mat = {old: new for new, old in enumerate(usedm)}
        g['materials'] = [g['materials'][i] for i in usedm]
        for m in g['meshes']:
            for pr in m['primitives']:
                if 'material' in pr: pr['material'] = remap_mat[pr['material']]
        print('kept %d meshes, %d materials' % (len(g['meshes']), len(g['materials'])))

    # ---- materials: spec-gloss -> metallic-roughness -------------------
    for m in g.get('materials', []):
        sg = (m.get('extensions') or {}).pop('KHR_materials_pbrSpecularGlossiness', None)
        if sg is not None:
            pbr = m.setdefault('pbrMetallicRoughness', {})
            pbr['baseColorFactor'] = sg.get('diffuseFactor', [1, 1, 1, 1])
            if 'diffuseTexture' in sg:
                pbr['baseColorTexture'] = sg['diffuseTexture']
            pbr['metallicFactor'] = 0.0
            pbr['roughnessFactor'] = round(1.0 - sg.get('glossinessFactor', 1.0), 4)
            if not m['extensions']:
                del m['extensions']
        if a.drop_mr:
            pbr = m.setdefault('pbrMetallicRoughness', {})
            pbr.pop('metallicRoughnessTexture', None)
            pbr.setdefault('metallicFactor', 0.0)
            pbr.setdefault('roughnessFactor', 1.0)
        for e in (a.drop_ext or '').split(','):
            if e and (m.get('extensions') or {}).pop(e, None) is not None and not m['extensions']:
                del m['extensions']
    gone = {'KHR_materials_pbrSpecularGlossiness'} | {e for e in (a.drop_ext or '').split(',') if e}
    for k in ('extensionsUsed', 'extensionsRequired'):
        if k in g:
            g[k] = [e for e in g[k] if e not in gone]
            if not g[k]:
                del g[k]

    # ---- decimate each primitive on its own ----------------------------
    if a.decimate_each:
        """A pack of separate props is not a scan in chunks. `--decimate`
        merges the file into one mesh, which is exactly what a rock pack must
        not become; this welds each primitive against its own budget and hands
        it back where it was, so the thirty-two rocks are still thirty-two
        rocks and the node names still name them."""
        newbuf, views, accs, before, after = bytearray(), [], [], 0, 0
        for mesh in g.get('meshes', []):
            for pr in mesh.get('primitives', []):
                pos = read_accessor(g, bufs, pr['attributes']['POSITION'])
                idx = ([v[0] for v in read_accessor(g, bufs, pr['indices'])]
                       if 'indices' in pr else list(range(len(pos))))
                ti = pr['attributes'].get('TEXCOORD_0')
                uv = read_accessor(g, bufs, ti) if ti is not None else [(0.0, 0.0)] * len(pos)
                before += len(idx) // 3
                if len(idx) // 3 <= a.decimate_each:
                    ext = 0.0
                else:
                    ext = max(max(p[k] for p in pos) - min(p[k] for p in pos) for k in range(3))
                if ext:
                    lo, hi, best = ext / 600.0, ext / 2.0, None
                    for _ in range(24):
                        cell = (lo + hi) / 2
                        out = _cluster_uv(pos, uv, idx, cell)
                        if len(out[-1]) > a.decimate_each: lo = cell
                        else: hi = cell; best = out
                    if best is None:
                        best = _cluster_uv(pos, uv, idx, hi)
                    vp, vt, tris = best
                else:
                    vp, vt = list(pos), list(uv)
                    tris = [(idx[t], idx[t + 1], idx[t + 2]) for t in range(0, len(idx) - 2, 3)]
                vn = _smooth_normals(vp, tris)
                after += len(tris)
                attrs = {}
                for name, comp, fmt, cnt in (('POSITION', vp, '<fff', 3),
                                             ('NORMAL', vn, '<fff', 3),
                                             ('TEXCOORD_0', vt, '<ff', 2)):
                    off = len(newbuf)
                    for v in comp: newbuf.extend(struct.pack(fmt, *v[:cnt]))
                    views.append({'buffer': 0, 'byteOffset': off,
                                  'byteLength': len(newbuf) - off, 'target': 34962})
                    acc = {'bufferView': len(views) - 1, 'componentType': 5126,
                           'count': len(comp), 'type': 'VEC3' if cnt == 3 else 'VEC2'}
                    if name == 'POSITION':
                        acc['min'] = [min(v[k] for v in comp) for k in range(3)]
                        acc['max'] = [max(v[k] for v in comp) for k in range(3)]
                    attrs[name] = len(accs); accs.append(acc)
                wide = len(vp) > 65535
                off = len(newbuf)
                for t in tris: newbuf.extend(struct.pack('<III' if wide else '<HHH', *t))
                views.append({'buffer': 0, 'byteOffset': off,
                              'byteLength': len(newbuf) - off, 'target': 34963})
                accs.append({'bufferView': len(views) - 1, 'componentType': 5125 if wide else 5123,
                             'count': len(tris) * 3, 'type': 'SCALAR'})
                pr['attributes'] = attrs
                pr['indices'] = len(accs) - 1
        g['buffers'] = [{'byteLength': len(newbuf)}]
        g['bufferViews'] = views
        g['accessors'] = accs
        bufs = [bytes(newbuf)]
        print('decimated each: %d -> %d tris' % (before, after))

    # ---- merge everything and decimate ---------------------------------
    if a.decimate:
        """Sketchfab splits a big scan into 65535-VERTEX CHUNKS, and the
        splitter walks the triangle list rather than the surface — so each
        chunk is a scatter of triangles spread over the whole model and any
        one of them alone renders as a cloud of specks. (The octopus ring
        arrives as seven such chunks of a 400k-triangle mesh; taking the
        smallest as if it were an LOD gave 15 % of the surface.) The only
        correct thing to do is take them ALL, and then decimate for real —
        vertex clustering, which welds, rather than dropping triangles."""
        import math as _m
        P, I, UV = [], [], []
        def _walk(ni, parent):
            n = g['nodes'][ni]
            m = mat_mul(parent, node_matrix(n))
            if 'mesh' in n:
                for pr in g['meshes'][n['mesh']].get('primitives', []):
                    pos = read_accessor(g, bufs, pr['attributes']['POSITION'])
                    idx = ([v[0] for v in read_accessor(g, bufs, pr['indices'])]
                           if 'indices' in pr else list(range(len(pos))))
                    off = len(P)
                    P.extend(apply_m(m, p) for p in pos)
                    I.extend(v + off for v in idx)
                    if a.keep_uv:
                        ti = pr['attributes'].get('TEXCOORD_0')
                        UV.extend(read_accessor(g, bufs, ti) if ti is not None
                                  else [(0.0, 0.0)] * len(pos))
            for c in n.get('children', []):
                _walk(c, m)
        ident = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
        for ni in g['scenes'][g.get('scene', 0)]['nodes']:
            _walk(ni, ident)
        print('merged: %d verts, %d tris' % (len(P), len(I) // 3))
        ext = max(max(p[k] for p in P) - min(p[k] for p in P) for k in range(3))
        lo, hi = ext / 900.0, ext / 3.0
        best = None
        for _ in range(26):                       # bisect the grid onto the budget
            cell = (lo + hi) / 2
            out = _cluster_uv(P, UV, I, cell) if a.keep_uv else _cluster(P, I, cell)
            if len(out[-1]) > a.decimate: lo = cell
            else: hi = cell; best = out
        if best is None:
            best = _cluster_uv(P, UV, I, hi) if a.keep_uv else _cluster(P, I, hi)
        if a.keep_uv:
            vp, vt, tris = best
            vn = _smooth_normals(vp, tris)
        else:
            vp, tris = best; vt = vn = None
        print('decimated: %d tris at cell %.5f' % (len(tris), hi))
        # rebuild the file around one mesh
        vbuf = bytearray()
        for v in vp: vbuf.extend(struct.pack('<fff', *v))
        views = [{'buffer': 0, 'byteOffset': 0, 'byteLength': len(vbuf), 'target': 34962}]
        mn = [min(v[k] for v in vp) for k in range(3)]
        mx = [max(v[k] for v in vp) for k in range(3)]
        accs = [{'bufferView': 0, 'componentType': 5126, 'count': len(vp), 'type': 'VEC3', 'min': mn, 'max': mx}]
        attrs = {'POSITION': 0}
        if a.keep_uv:
            attrs['NORMAL'] = len(accs)
            views.append({'buffer': 0, 'byteOffset': len(vbuf), 'byteLength': 12 * len(vn), 'target': 34962})
            accs.append({'bufferView': len(views) - 1, 'componentType': 5126, 'count': len(vn), 'type': 'VEC3'})
            for v in vn: vbuf.extend(struct.pack('<fff', *v))
            attrs['TEXCOORD_0'] = len(accs)
            views.append({'buffer': 0, 'byteOffset': len(vbuf), 'byteLength': 8 * len(vt), 'target': 34962})
            accs.append({'bufferView': len(views) - 1, 'componentType': 5126, 'count': len(vt), 'type': 'VEC2'})
            for v in vt: vbuf.extend(struct.pack('<ff', *v))
        wide = len(vp) > 65535
        ibuf = bytearray()
        for t in tris: ibuf.extend(struct.pack('<III' if wide else '<HHH', *t))
        views.append({'buffer': 0, 'byteOffset': len(vbuf), 'byteLength': len(ibuf), 'target': 34963})
        accs.append({'bufferView': len(views) - 1, 'componentType': 5125 if wide else 5123,
                     'count': len(tris) * 3, 'type': 'SCALAR'})
        g['buffers'] = [{'byteLength': 0}]
        g['bufferViews'] = views
        g['accessors'] = accs
        g['meshes'] = [{'primitives': [{'attributes': attrs, 'indices': len(accs) - 1, 'material': 0}]}]
        g['materials'] = g.get('materials', [{}])[:1] or [{}]
        g['nodes'] = [{'mesh': 0}]
        g['scenes'] = [{'nodes': [0]}]
        g['scene'] = 0
        bufs = [bytes(vbuf) + bytes(ibuf)]
        for bv in g['bufferViews']: bv['byteOffset'] = bv['byteOffset']
        g['buffers'][0]['byteLength'] = len(bufs[0])

    # ---- prune attributes, and note which accessors survive ------------
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            for at in list(pr.get('attributes', {})):
                if at in drop:
                    del pr['attributes'][at]
            pr.pop('targets', None)

    # a texCoord pointing at a set we just dropped would sample garbage
    for m in g.get('materials', []):
        def fix(t):
            if t and t.get('texCoord', 0) > 0 and ('TEXCOORD_%d' % t['texCoord']) in drop:
                t['texCoord'] = 0
        pbr = m.get('pbrMetallicRoughness', {})
        for t in (pbr.get('baseColorTexture'), pbr.get('metallicRoughnessTexture'),
                  m.get('normalTexture'), m.get('occlusionTexture'), m.get('emissiveTexture')):
            fix(t)

    used = set()
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            used.update(pr['attributes'].values())
            if 'indices' in pr:
                used.add(pr['indices'])
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s:
            used.add(s['inverseBindMatrices'])
    for an in g.get('animations', []):
        for s in an.get('samplers', []):
            used.add(s['input']); used.add(s['output'])

    # ---- rebuild the binary -------------------------------------------
    blob = bytearray()
    views, remap = [], {}

    def emit(data, target=None, stride=None):
        pad4(blob)
        off = len(blob)
        blob.extend(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target is not None:
            v['target'] = target
        views.append(v)
        return len(views) - 1

    # indices first so the downcast decision can see the vertex counts
    tighten = {}
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            ai = pr.get('indices')
            if ai is None:
                continue
            nv = g['accessors'][pr['attributes']['POSITION']]['count']
            if g['accessors'][ai]['componentType'] == 5125 and nv <= 65535:
                tighten[ai] = 5123

    for ai in sorted(used):
        acc = g['accessors'][ai]
        elems = read_accessor(g, bufs, ai)
        ct = tighten.get(ai, acc['componentType'])
        fmt, size = CT[ct]
        n = NC[acc['type']]
        data = bytearray()
        for e in elems:
            data.extend(struct.pack('<' + fmt * n, *e))
        is_idx = acc['type'] == 'SCALAR' and ct in (5121, 5123, 5125)
        vi = emit(data, ELEMENT_ARRAY_BUFFER if is_idx else ARRAY_BUFFER)
        new = {'bufferView': vi, 'componentType': ct, 'count': acc['count'],
               'type': acc['type']}
        if 'min' in acc:
            new['min'] = acc['min']; new['max'] = acc['max']
        if acc.get('normalized'):
            new['normalized'] = True
        remap[ai] = len(remap)
        g.setdefault('_new', []).append(new)

    newacc = g.pop('_new', [])
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            pr['attributes'] = {k: remap[v] for k, v in pr['attributes'].items()}
            if 'indices' in pr:
                pr['indices'] = remap[pr['indices']]
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s:
            s['inverseBindMatrices'] = remap[s['inverseBindMatrices']]
    for an in g.get('animations', []):
        for s in an.get('samplers', []):
            s['input'] = remap[s['input']]; s['output'] = remap[s['output']]
    g['accessors'] = newacc

    # ---- images: resize, re-encode, embed ------------------------------
    if 'textures' not in g:
        g['textures'] = []          # an untextured scan (raw STL) has neither
    normal_imgs, cutout_imgs = set(), set()
    for m in g.get('materials', []):
        nt = m.get('normalTexture')
        if nt:
            normal_imgs.add(g['textures'][nt['index']].get('source'))
        bt = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if bt and m.get('alphaMode', 'OPAQUE') != 'OPAQUE':
            cutout_imgs.add(g['textures'][bt['index']].get('source'))
    live = set()
    for m in g.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for t in (pbr.get('baseColorTexture'), pbr.get('metallicRoughnessTexture'),
                  m.get('normalTexture'), m.get('occlusionTexture'), m.get('emissiveTexture')):
            if t:
                live.add(t['index'])

    keep_img = {}
    for ti in sorted(live):
        si = g['textures'][ti].get('source')
        if si in keep_img:
            continue
        img = g['images'][si]
        uri = img.get('uri', '')
        raw = (base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:')
               else open(os.path.join(root, uri), 'rb').read())
        im0 = Image.open(io.BytesIO(raw))
        # Cut-outs keep their alpha: grass cards and leaves are nothing without
        # it, and JPEG throws it away. Anything with a used alpha channel, or
        # feeding a BLEND/MASK material, goes out as PNG.
        alpha = im0.mode in ('RGBA', 'LA') or (im0.mode == 'P' and 'transparency' in im0.info)
        if alpha:
            im0 = im0.convert('RGBA')
            alpha = im0.getchannel('A').getextrema()[0] < 250
        alpha = alpha or si in cutout_imgs
        im = im0.convert('RGBA' if alpha else 'RGB')
        lim = nrm_max if si in normal_imgs else a.tex
        if max(im.size) > lim:
            k = lim / max(im.size)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))),
                           Image.LANCZOS)
        out = io.BytesIO()
        if alpha: im.save(out, 'PNG', optimize=True)
        else: im.save(out, 'JPEG', quality=a.quality, optimize=True)
        enc = out.getvalue()
        print('  %-44s %4dpx %s %6.1f KB' % (os.path.basename(uri), max(im.size), 'png ' if alpha else 'jpeg', len(enc) / 1024))
        keep_img[si] = {'bufferView': emit(enc), 'mimeType': 'image/png' if alpha else 'image/jpeg',
                        'name': os.path.splitext(os.path.basename(uri))[0]}

    order = sorted(keep_img)
    imap = {si: k for k, si in enumerate(order)}
    if not keep_img:
        g.pop('images', None); g.pop('textures', None); g.pop('samplers', None)
    else:
        g['images'] = [keep_img[si] for si in order]
    if keep_img:
        g['textures'] = [{**{k: v for k, v in t.items() if k != 'source'},
                          'source': imap[t['source']]}
                         if t.get('source') in imap else t
                         for t in g['textures']]

    g['bufferViews'] = views
    g['buffers'] = [{'byteLength': len(blob)}]
    g.pop('_new', None)

    # ---- write the .glb ------------------------------------------------
    js = json.dumps(g, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    pad4(blob)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(a.dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    print('%s: %.2f MB  (json %.0f KB, bin %.2f MB)'
          % (a.dst, total / 1e6, len(js) / 1024, len(blob) / 1e6))


main()
