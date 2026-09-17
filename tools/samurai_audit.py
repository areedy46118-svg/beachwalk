"""Measure every clip in assets/samurai.glb, frame by frame.

    blender -b --python tools/samurai_audit.py -- [clip ...]

A strip says a pose looks wrong; this says by how much and on which frame.
Four things, because they are the four ways a retarget onto this rig has
already failed:

  hands   how far apart the two fists are. He holds a katana in both, so a
          clip whose off hand wanders is a clip whose off hand was holding
          something else (`Sword And Shield Slash` measured 1.07 and was
          dropped) or a clip whose arm was never driven.
  abd     each upper arm's angle off the body's OWN down axis. A guard is
          under fifty degrees; ninety is an arm straight out to the side,
          which is the "arms out" nobody could name from a still.
  foot    the lowest vertex of the SANDALS - the sole hangs below the joint,
          so a foot bone is the wrong thing to measure. A retarget carries
          no height, so a clip that sinks lifts the feet off the floor.
  size    the skinned bounds as a fraction of his own standing height; scale
          leaking through the retarget shows up here first.
"""
import bpy
import os
import sys
import math
import json
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(os.path.dirname(HERE), 'assets', 'samurai.glb')
WANT = [a.lower() for a in argv]


def log(*a):
    print('[audit]', *a)
    sys.stdout.flush()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
names = set(b.name for b in arm.pose.bones)


def pick(*cands):
    for c in cands:
        if c in names:
            return c
    return None


B = {
    'spine': pick('DEF-spine', 'DEF-spine001', 'ORG-spine'),
    'chest': pick('DEF-spine003', 'DEF-spine002', 'DEF-spine'),
    'armL': pick('DEF-upper_armL', 'DEF-upper_arm.L', 'DEF-upper_armL001'),
    'armR': pick('DEF-upper_armR', 'DEF-upper_arm.R'),
    'foreL': pick('DEF-forearmL', 'DEF-forearm.L'),
    'foreR': pick('DEF-forearmR', 'DEF-forearm.R'),
    'handL': pick('DEF-handL', 'DEF-hand.L'),
    'handR': pick('DEF-handR', 'DEF-hand.R'),
    'kat': pick('Katana', 'DEF-katana', 'DEF-katana_tip'),
    'headb': pick('DEF-spine006', 'DEF-spine.006', 'DEF-spine005'),
}
log('bones: %s' % json.dumps(B))
missing = [k for k, v in B.items() if v is None]
if missing:
    log('MISSING %s  (have %d bones)' % (missing, len(names)))
    log('sample: %s' % sorted(names)[:40])

# the sandals, for the floor: a sole hangs below its joint
SOLE = [o for o in meshes if any(k in o.name.lower() for k in ('sandal', 'boot', 'foot', 'shoe'))]
if not SOLE:
    SOLE = meshes
log('sole meshes: %s' % [o.name for o in SOLE])


def head(nm):
    return arm.matrix_world @ arm.pose.bones[nm].head


def axes(nm):
    m = (arm.matrix_world @ arm.pose.bones[nm].matrix).to_3x3()
    return m.col[1].normalized()          # a bone's +Y runs along the bone


def bounds():
    dg = bpy.context.evaluated_depsgraph_get()
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    slo = 1e9
    for o in meshes:
        e = o.evaluated_get(dg)
        me = e.to_mesh()
        sole = o in SOLE
        for v in me.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                lo[i] = min(lo[i], w[i])
                hi[i] = max(hi[i], w[i])
            if sole and w.z < slo:
                slo = w.z
        e.to_mesh_clear()
    return lo, hi, slo


if not arm.animation_data:
    arm.animation_data_create()

acts = [a for a in bpy.data.actions if not WANT or a.name.lower() in WANT]
# his standing height, off the first frame of the idle
ref = next((a for a in bpy.data.actions if a.name == 'idle'), acts[0])
arm.animation_data.action = ref
try:
    arm.animation_data.action_slot = (ref.slots[0] if ref.slots
                                      else ref.slots.new(id_type='OBJECT', name='Legacy'))
except Exception:
    pass
sc.frame_set(int(ref.frame_range[0]))
lo, hi, _ = bounds()
TALL = hi.z - lo.z
TORSO = (head(B['headb']) - head(B['spine'])).length
log('standing height %.3f, hips-to-head %.3f' % (TALL, TORSO))

rows = []
for act in sorted(acts, key=lambda a: a.name):
    arm.animation_data.action = act
    try:
        arm.animation_data.action_slot = (act.slots[0] if act.slots
                                          else act.slots.new(id_type='OBJECT', name='Legacy'))
    except Exception as e:
        log('could not bind %s: %s' % (act.name, e))
        continue
    f0, f1 = [int(v) for v in act.frame_range]
    per = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        hl, hr = head(B['handL']), head(B['handR'])
        down = -axes(B['chest'])
        aL = (head(B['foreL']) - head(B['armL'])).normalized()
        aR = (head(B['foreR']) - head(B['armR'])).normalized()
        lo, hi, sole = bounds()
        per.append({
            'f': f,
            'hands': (hl - hr).length / TORSO,
            'abdL': math.degrees(aL.angle(down)),
            'abdR': math.degrees(aR.angle(down)),
            'sole': sole,
            'h': hi.z - lo.z,
            'w': max(hi.x - lo.x, hi.y - lo.y),
            'hilt': (head(B['kat']) - hr).length if B['kat'] else 0.0,
        })
    worst = max(per, key=lambda r: r['hands'])
    wa = max(per, key=lambda r: max(r['abdL'], r['abdR']))
    rows.append((act.name, per))
    log('%-10s %3d f | hands mean %.2f max %.2f @f%-3d | abd max %3.0f/%3.0f @f%-3d'
        ' | sole %+.3f..%+.3f | h %.2f-%.2f (%.2f-%.2f of tall) | hilt %.2f-%.2f' % (
            act.name, len(per),
            sum(r['hands'] for r in per) / len(per), worst['hands'], worst['f'],
            wa['abdL'], wa['abdR'], wa['f'],
            min(r['sole'] for r in per), max(r['sole'] for r in per),
            min(r['h'] for r in per), max(r['h'] for r in per),
            min(r['h'] for r in per) / TALL, max(r['h'] for r in per) / TALL,
            min(r['hilt'] for r in per), max(r['hilt'] for r in per)))

out = os.path.join(os.path.dirname(HERE), 'stage', 'samurai_audit.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump({'tall': TALL, 'clips': {n: p for n, p in rows}}, open(out, 'w'), indent=1)
log('wrote %s' % out)
