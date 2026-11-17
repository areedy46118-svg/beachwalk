#!/usr/bin/env python3
"""Pack the owner's Bone Mace (Ruslan Malovsky, Sketchfab, CC-BY-4.0) into the lair's club.

    python3 -I tools/bone_mace_pack.py <unzipped dir> assets/bone-mace.glb

The download is a glTF with two meshes (the bone club `Kos`, its binding `Lia`; 1,300 vertices in all) and 9.5 MB of
JPEG maps in the spec-gloss extension. What comes out is one small .glb the game's loader reads like every other:

  * THE MAPS COME DOWN AT SOURCE (`sips`): colour to 512, normal to 256 — this game renders at 0.42 of the screen.
  * SPEC-GLOSS BECOMES METAL-ROUGH: the diffuse map is the base colour, metalness 0 (METALNESS IS A TRAP — there is no
    environment map), roughness from the old glossiness (1 - g); the spec-gloss maps are dropped.
  * The geometry, its nodes and their transforms go in as the bytes they already are (`tools/gltf_to_glb.py`'s way).
"""
import json, os, shutil, struct, subprocess, sys, tempfile

src_dir, out = sys.argv[1], sys.argv[2]
gpath = os.path.join(src_dir, 'scene.gltf')
d = json.load(open(gpath))
tmp = tempfile.mkdtemp()

def small(uri, px):
    s = os.path.join(src_dir, uri); dst = os.path.join(tmp, os.path.basename(uri))
    shutil.copy(s, dst)
    subprocess.run(['sips', '-Z', str(px), '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', dst, '--out', dst], check=True, capture_output=True)
    return open(dst, 'rb').read()

# the materials: metal-rough off the old spec-gloss
used = {}
for m in d['materials']:
    sg = m.pop('extensions', {}).get('KHR_materials_pbrSpecularGlossiness', {})
    pbr = {'metallicFactor': 0.0, 'roughnessFactor': max(0.35, 1.0 - sg.get('glossinessFactor', 0.5) * 0.6)}
    if 'diffuseTexture' in sg: pbr['baseColorTexture'] = {'index': sg['diffuseTexture']['index']}; used[sg['diffuseTexture']['index']] = 512
    m['pbrMetallicRoughness'] = pbr
    if 'normalTexture' in m: used[m['normalTexture']['index']] = 256
d.pop('extensionsUsed', None); d.pop('extensionsRequired', None)

blob = bytearray()
def put(data):
    off = len(blob); blob.extend(data)
    while len(blob) % 4: blob.append(0)
    return off, len(data)
raw = open(os.path.join(src_dir, d['buffers'][0]['uri']), 'rb').read()
put(raw)
# keep only the textures still used, remapped; each image into the one buffer
new_tex, remap = [], {}
for ti, px in sorted(used.items()):
    t = d['textures'][ti]; img = d['images'][t['source']]
    data = small(img['uri'], px)
    off, ln = put(data)
    d['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': ln})
    d['images'][t['source']] = {'bufferView': len(d['bufferViews']) - 1, 'mimeType': 'image/jpeg'}
    remap[ti] = len(new_tex); new_tex.append({'sampler': t.get('sampler', 0), 'source': t['source']})
# drop the images nobody uses, renumbering sources
keep_src = sorted({t['source'] for t in new_tex}); srcmap = {s: i for i, s in enumerate(keep_src)}
d['images'] = [d['images'][s] for s in keep_src]
for t in new_tex: t['source'] = srcmap[t['source']]
d['textures'] = new_tex
for m in d['materials']:
    p = m['pbrMetallicRoughness']
    if 'baseColorTexture' in p: p['baseColorTexture']['index'] = remap[p['baseColorTexture']['index']]
    if 'normalTexture' in m: m['normalTexture']['index'] = remap[m['normalTexture']['index']]
d['buffers'] = [{'byteLength': len(blob)}]
d.setdefault('asset', {})['generator'] = 'beachwalk tools/bone_mace_pack.py'
js = json.dumps(d, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
print('wrote', out, os.path.getsize(out), 'bytes')
