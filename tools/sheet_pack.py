#!/usr/bin/env python3
"""The owner's "Rusted Sheet Metal" by George Hager (CC-BY-4.0, Sketchfab) -> assets/rusted-sheet.glb.
   python3 -I tools/sheet_pack.py <extracted dir> assets/rusted-sheet.glb
Every mesh is kept vertex for vertex and named sheet_0..19; the 4096 px maps (75 MB) come down to 2048 px JPEGs, the
metallic/roughness map is left out (metalness is a trap here: there is no environment map) and BLEND becomes opaque
(the colour map has no alpha). The source's two root turns cancel, so the sheets are the scene's own children: x across
the corrugations, z along them, y the thickness. stdlib + sips."""
import json, os, struct, subprocess, sys, tempfile
src, out = sys.argv[1], sys.argv[2]
g = json.load(open(os.path.join(src, 'scene.gltf')))
binb = open(os.path.join(src, 'scene.bin'), 'rb').read()
tmp = tempfile.mkdtemp()
def jpg(key, q):
    f = next(os.path.join(src, 'textures', n) for n in os.listdir(os.path.join(src, 'textures')) if key in n)
    o = os.path.join(tmp, key + '.jpg')
    subprocess.run(['sips', '-Z', '2048', '-s', 'format', 'jpeg', '-s', 'formatOptions', str(q), f, '--out', o], check=True, stdout=subprocess.DEVNULL)
    return open(o, 'rb').read()
imgs = [jpg('baseColor', 82), jpg('normal', 82)]
def pad(b, c=b'\0'): return b + c * (-len(b) % 4)
blob, views = pad(binb), list(g['bufferViews'])
for im in imgs:
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(im)}); blob += pad(im)
meshes = []
for i, m in enumerate(g['meshes']):
    p = m['primitives'][0]
    meshes.append({'name': f'sheet_{i}', 'primitives': [{'attributes': {k: v for k, v in p['attributes'].items() if k in ('POSITION', 'NORMAL', 'TEXCOORD_0')}, 'indices': p['indices'], 'material': 0}]})
doc = {'asset': {'version': '2.0', 'generator': 'sheet_pack.py', 'copyright': '"Rusted Sheet Metal" by George Hager, CC-BY-4.0'},
       'scene': 0, 'scenes': [{'nodes': list(range(len(meshes)))}],
       'nodes': [{'name': f'sheet_{i}', 'mesh': i} for i in range(len(meshes))], 'meshes': meshes,
       'accessors': g['accessors'], 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}],
       'samplers': [{'wrapS': 10497, 'wrapT': 10497}], 'textures': [{'source': 0, 'sampler': 0}, {'source': 1, 'sampler': 0}],
       'images': [{'bufferView': len(views) - 2, 'mimeType': 'image/jpeg'}, {'bufferView': len(views) - 1, 'mimeType': 'image/jpeg'}],
       'materials': [{'name': 'rustedSheet', 'doubleSided': True, 'normalTexture': {'index': 1},
                      'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}]}
js = pad(json.dumps(doc, separators=(',', ':')).encode(), b' ')
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(blob)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob)
print(out, os.path.getsize(out), [len(i) for i in imgs])
