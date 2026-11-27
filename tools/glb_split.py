#!/usr/bin/env python3
"""One GLB per animation out of a Mesh2Motion export that carries several (2026-11-25: `~/Downloads/exported-model-3.glb`, twelve
of the owner's clips for the final boss). The packer (`tools/ntar_moves.py`, its GLB path) takes one clip per file; this writes
<out>/<AnimationName>.glb for each, the same nodes and binary, only that animation kept.
    python3 tools/glb_split.py ~/Downloads/exported-model-3.glb /tmp/scourge_src

AND AN UNREAL-NAMED ONE (2026-11-26: `~/Downloads/exported-model-4.glb`, "Run_Stealth", came out of Mesh2Motion on its Unreal
skeleton — pelvis, spine_01-03, thigh_l, upperarm_r, index_01_l … — and SKINNED: a mesh over the joints). `--ue` renames every joint
to Mixamo's (`mixamorig` + HumanIK) and drops the mesh and the skin, so it is the bare-joints file `ntar_moves.py`'s GLB path reads
(which lines the stance up on Mixamo's bind by the joints' POSITIONS, not their axes — the Unreal joints' own axes do not matter).
    python3 tools/glb_split.py --ue ~/Downloads/exported-model-4.glb /tmp/scourge_src"""
import json, struct, sys, os
UE = '--ue' in sys.argv
args = [a for a in sys.argv[1:] if a != '--ue']
src, out = args[0], args[1]
os.makedirs(out, exist_ok=True)
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl]); rest = d[20 + jl:]
if UE:
    MAP = {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'head': 'Head', 'head_leaf': 'HeadTop_End'}
    for s, S in (('l', 'Left'), ('r', 'Right')):
        MAP.update({'clavicle_' + s: S + 'Shoulder', 'upperarm_' + s: S + 'Arm', 'lowerarm_' + s: S + 'ForeArm', 'hand_' + s: S + 'Hand',
                    'thigh_' + s: S + 'UpLeg', 'calf_' + s: S + 'Leg', 'foot_' + s: S + 'Foot', 'ball_' + s: S + 'ToeBase', 'ball_leaf_' + s: S + 'Toe_End'})
        for f, F in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Pinky')):
            for k in (1, 2, 3): MAP['%s_0%d_%s' % (f, k, s)] = '%sHand%s%d' % (S, F, k)
            MAP['%s_04_leaf_%s' % (f, s)] = '%sHand%s4' % (S, F)
    left = [n.get('name') for n in J['nodes'] if 'mesh' not in n and n.get('name') not in MAP]
    if left: print('UNMAPPED joints:', left)
    for n in J['nodes']:
        if n.get('name') in MAP: n['name'] = 'mixamorig' + MAP[n['name']]
        n.pop('mesh', None); n.pop('skin', None)
    J.pop('skins', None); J.pop('meshes', None); J.pop('materials', None); J.pop('textures', None); J.pop('images', None); J.pop('samplers', None)
for a in J.get('animations', []):
    j = dict(J); j['animations'] = [a]
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    body = struct.pack('<II', len(js), 0x4E4F534A) + js + rest
    open(os.path.join(out, a['name'] + '.glb'), 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body)
    print(a['name'])
