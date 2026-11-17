"""Pack the owner's crow (Alexei Ostapenko's "Crow", Sketchfab, CC-BY-4.0) into assets/crow.glb.
The source is a .gltf + .bin + three 2048 PNGs (10 MB). Kept: the mesh, the skin, its one clip (TakeOff), the colour
map and the normal map at 512 as JPEG; the metal/rough map is dropped (the game sets metalness 0, roughness its own).
    python3 tools/crow_pack.py ~/Downloads/crow assets/crow.glb"""
import io, json, struct, sys, os
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
j = json.load(open(os.path.join(src, 'scene.gltf')))
binb = bytearray(open(os.path.join(src, j['buffers'][0]['uri']), 'rb').read())

def jpg(path, size, q=86):
    im = Image.open(os.path.join(src, path)).convert('RGB').resize((size, size), Image.LANCZOS)
    bio = io.BytesIO(); im.save(bio, 'JPEG', quality=q); return bio.getvalue()

new_images = []
for im in j['images']:
    uri = im['uri']
    if 'metallicRoughness' in uri: data = None
    else: data = jpg(uri, 512)
    new_images.append(data)
# images -> bufferViews (pad to 4)
img_map = {}
for i, data in enumerate(new_images):
    if data is None: continue
    while len(binb) % 4: binb.append(0)
    off = len(binb); binb.extend(data)
    j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)})
    img_map[i] = len(j['images'])  # placeholder
imgs = []
remap = {}
for i, data in enumerate(new_images):
    if data is None: continue
    remap[i] = len(imgs)
    bv = [k for k, b in enumerate(j['bufferViews']) if b.get('byteLength') == len(data) and b.get('byteOffset', 0) >= 0][-1]
    imgs.append({'bufferView': bv, 'mimeType': 'image/jpeg'})
# rebuild: find the bufferView index for each image in order of appending
bvs = len(j['bufferViews'])
n_img = len(imgs)
for k, im in enumerate(imgs): im['bufferView'] = bvs - n_img + k
j['images'] = imgs
texs = []; tex_remap = {}
for t_i, t in enumerate(j['textures']):
    if t['source'] in remap: tex_remap[t_i] = len(texs); texs.append(dict(t, source=remap[t['source']]))
j['textures'] = texs
for m in j['materials']:
    pbr = m.get('pbrMetallicRoughness', {})
    pbr.pop('metallicRoughnessTexture', None)
    if 'baseColorTexture' in pbr: pbr['baseColorTexture']['index'] = tex_remap[pbr['baseColorTexture']['index']]
    if 'normalTexture' in m: m['normalTexture']['index'] = tex_remap[m['normalTexture']['index']]
    m.pop('occlusionTexture', None); m.pop('emissiveTexture', None)
j['buffers'] = [{'byteLength': len(binb)}]
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(binb) % 4: binb.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binb)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binb), 0x004E4942) + bytes(binb)
open(out, 'wb').write(glb)
print('wrote', out, len(glb), 'bytes')
