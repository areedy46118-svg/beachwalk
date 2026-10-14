#!/usr/bin/env python3
"""Drop the vertices no index references from every indexed primitive of a .glb, in place.

    python3 tools/glbcompact.py assets/crab-call.glb

`gltfpack.py --decimate --keep-uv` re-indexes onto the merged vertex arrays and
leaves them whole — 12,000 triangles carried 1.07 M vertices (4.4 MB). This
rebuilds the binary with only what is drawn; images and the rest are copied.
"""
import json, struct, sys

CT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

def main(path):
    raw = open(path, 'rb').read()
    jl = struct.unpack('<I', raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack('<I', raw[off:off + 4])[0]
    bin_ = raw[off + 8: off + 8 + bl]

    def read(ai):
        a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]
        n, c, f = a['count'], NC[a['type']], CT[a['componentType']]
        sz = struct.calcsize('<' + f)
        st = bv.get('byteStride', sz * c)
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        out = []
        for i in range(n):
            out.append(struct.unpack_from('<' + f * c, bin_, o + i * st))
        return a, out

    out = bytearray(); views = []; accs = []
    def add(data_bytes, target=None):
        while len(out) % 4: out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data_bytes)}
        if target: v['target'] = target
        out.extend(data_bytes); views.append(v); return len(views) - 1

    # images first, as they were
    for img in j.get('images', []):
        if 'bufferView' in img:
            bv = j['bufferViews'][img['bufferView']]
            o = bv.get('byteOffset', 0)
            img['bufferView'] = add(bin_[o:o + bv['byteLength']])
    for mesh in j['meshes']:
        for p in mesh['primitives']:
            ia, idx = read(p['indices'])
            idx = [t[0] for t in idx]
            used = sorted(set(idx)); remap = {v: i for i, v in enumerate(used)}
            nidx = [remap[v] for v in idx]
            f = 'H' if len(used) < 65536 else 'I'
            vi = add(struct.pack('<%d%s' % (len(nidx), f), *nidx), 34963)
            accs.append({'bufferView': vi, 'componentType': 5123 if f == 'H' else 5125, 'count': len(nidx), 'type': 'SCALAR'})
            p['indices'] = len(accs) - 1
            for k, ai in list(p['attributes'].items()):
                a, vals = read(ai)
                c = NC[a['type']]; fm = CT[a['componentType']]
                sel = [vals[v] for v in used]
                flat = [x for t in sel for x in t]
                vv = add(struct.pack('<%d%s' % (len(flat), fm), *flat), 34962)
                na = {'bufferView': vv, 'componentType': a['componentType'], 'count': len(sel), 'type': a['type']}
                if a.get('normalized'): na['normalized'] = True
                if k == 'POSITION':
                    na['min'] = [min(t[i] for t in sel) for i in range(c)]
                    na['max'] = [max(t[i] for t in sel) for i in range(c)]
                accs.append(na); p['attributes'][k] = len(accs) - 1
            print(f"{mesh.get('name', '?')}: {len(idx)//3} tris, {len(vals)} -> {len(used)} verts")
    j['accessors'] = accs; j['bufferViews'] = views
    while len(out) % 4: out.append(0)
    j['buffers'] = [{'byteLength': len(out)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out))
    glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    open(path, 'wb').write(glb)
    print(path, len(glb) / 1e6, 'MB')

if __name__ == '__main__':
    main(sys.argv[1])
