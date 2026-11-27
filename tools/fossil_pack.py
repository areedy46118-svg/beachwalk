#!/usr/bin/env python3
"""The owner's "Fossilized Scallop Shell" by NaRoCreations (CC-BY-4.0, Sketchfab) -> assets/fossil-shell.glb.
   python3 -I tools/fossil_pack.py <extracted dir> assets/fossil-shell.glb
The scan is kept vertex for vertex, its node chain as it came; its one 4096 px colour map comes down to a 2048 px JPEG
(the game caps every map at 2048 anyway, `TEX_CAP`). stdlib + sips."""
import json, os, struct, subprocess, sys, tempfile
src, out = sys.argv[1], sys.argv[2]
g = json.load(open(os.path.join(src, 'scene.gltf')))
binb = open(os.path.join(src, 'scene.bin'), 'rb').read()
tmp = tempfile.mkdtemp(); jp = os.path.join(tmp, 'c.jpg')
subprocess.run(['sips', '-Z', '2048', '-s', 'format', 'jpeg', '-s', 'formatOptions', '84', os.path.join(src, g['images'][0]['uri']), '--out', jp], check=True, stdout=subprocess.DEVNULL)
img = open(jp, 'rb').read()
def pad(b, c=b'\0'): return b + c * (-len(b) % 4)
blob = pad(binb); views = list(g['bufferViews'])
views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(img)}); blob += pad(img)
g['bufferViews'] = views; g['buffers'] = [{'byteLength': len(blob)}]
g['images'] = [{'bufferView': len(views) - 1, 'mimeType': 'image/jpeg'}]
g['asset']['copyright'] = '"Fossilized Scallop Shell" by NaRoCreations, CC-BY-4.0'
js = pad(json.dumps(g, separators=(',', ':')).encode(), b' ')
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(blob)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob)
print(out, os.path.getsize(out), len(img))
