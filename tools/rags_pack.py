#!/usr/bin/env python3
"""The owner's rags (2026-11-18, "add some of these rags in the lair like the creatures sleeps on them"): Frice's "rags pack"
(Sketchfab, CC-BY-NC-4.0, credited in the README), five low cloth meshes on one material, repacked as one small .glb.

    python3 -I tools/rags_pack.py SRC_DIR assets/rags.glb       (SRC_DIR: the unzipped pack, with scene.gltf)

No Blender and no numpy: the glTF's own JSON and buffer are carried over as they are (the node tree, so the Sketchfab
root's turn to Y-up stays), and only the maps change. `sips` brings the colour map to 512 and the normal map to 256 as
JPEG; the metallic-roughness map is dropped and the material's metalness zeroed (METALNESS IS A TRAP: there is no
environment map in this game), roughness 0.95.
"""
import json, os, struct, subprocess, sys, tempfile

def main():
    src, dst = sys.argv[1:3]
    g = json.load(open(os.path.join(src, 'scene.gltf')))
    binp = open(os.path.join(src, g['buffers'][0]['uri']), 'rb').read()
    tmp = tempfile.mkdtemp()
    # which image is which, by the material's use of it
    mat = g['materials'][0]
    pbr = mat.get('pbrMetallicRoughness', {})
    base_i = g['textures'][pbr['baseColorTexture']['index']]['source']
    norm_i = g['textures'][mat['normalTexture']['index']]['source'] if 'normalTexture' in mat else None
    out_imgs = []
    for idx, size in ((base_i, 512), (norm_i, 256)):
        if idx is None: continue
        p = os.path.join(src, g['images'][idx]['uri'])
        o = os.path.join(tmp, 'img%d.jpg' % idx)
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', str(size), p, '--out', o], check=True, capture_output=True)
        out_imgs.append((idx, open(o, 'rb').read()))
    # the new buffer: the old geometry, then the images, each 4-aligned
    blob = bytearray(binp)
    while len(blob) % 4: blob.append(0)
    views = g['bufferViews']
    images = []
    remap = {}
    for idx, data in out_imgs:
        off = len(blob); blob += data
        while len(blob) % 4: blob.append(0)
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)})
        remap[idx] = len(images)
        images.append({'bufferView': len(views) - 1, 'mimeType': 'image/jpeg'})
    g['images'] = images
    g['textures'] = [{'source': remap[base_i], 'sampler': 0}] + ([{'source': remap[norm_i], 'sampler': 0}] if norm_i is not None else [])
    g['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    pbr['baseColorTexture'] = {'index': 0}
    pbr.pop('metallicRoughnessTexture', None)
    pbr['metallicFactor'] = 0.0; pbr['roughnessFactor'] = 0.95
    mat['pbrMetallicRoughness'] = pbr
    if norm_i is not None: mat['normalTexture'] = {'index': 1, 'scale': 1.0}
    mat.pop('occlusionTexture', None); mat.pop('emissiveTexture', None)
    g['buffers'] = [{'byteLength': len(blob)}]
    g.pop('extensionsUsed', None); g.pop('extensionsRequired', None)
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    with open(dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    print('wrote', dst, os.path.getsize(dst), 'bytes')

main()
