"""EXACT PACK: gltf + bin + textures -> one .glb, byte for byte.

Nothing is decimated, resized or re-encoded. The buffer and every image go in
as the bytes they already are, so the geometry and the textures in the game
are the ones the artist shipped — which is what "an exact replica with the
same textures" means, and is also the only thing some licences allow.

    python3 tools/gltf_to_glb.py <scene.gltf> <out.glb>
"""
import json, os, struct, sys

src, out = sys.argv[1], sys.argv[2]
base = os.path.dirname(os.path.abspath(src))
d = json.load(open(src))

blob = bytearray()
def put(data):
    """append to the single GLB buffer, 4-byte aligned, return (offset, length)"""
    off = len(blob)
    blob.extend(data)
    while len(blob) % 4: blob.append(0)
    return off, len(data)

# the existing buffer(s), in order, rewritten as bufferViews already expect
assert len(d['buffers']) == 1, 'expected one buffer'
bin_path = os.path.join(base, d['buffers'][0]['uri'])
raw = open(bin_path, 'rb').read()
bo, bl = put(raw)
assert bo == 0

for bv in d['bufferViews']:
    bv['byteOffset'] = bv.get('byteOffset', 0) + bo

# every image becomes a bufferView of its own file's bytes
for im in d.get('images', []):
    uri = im.pop('uri')
    data = open(os.path.join(base, uri), 'rb').read()
    o, l = put(data)
    d['bufferViews'].append({'buffer': 0, 'byteOffset': o, 'byteLength': l})
    im['bufferView'] = len(d['bufferViews']) - 1
    im['mimeType'] = 'image/png' if uri.lower().endswith('.png') else 'image/jpeg'

d['buffers'] = [{'byteLength': len(blob)}]

js = json.dumps(d, separators=(',', ':')).encode('utf-8')
while len(js) % 4: js += b' '
while len(blob) % 4: blob.append(0)

with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
print('wrote', out, '%.2f MB' % (os.path.getsize(out) / 1e6))
