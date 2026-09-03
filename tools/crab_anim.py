# Builds assets/crab.glb from artofmickey's CRAB 001 (CGTrader, free) --
# the rig prep, the five animation clips and the export, in one pass:
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b crab.blend \
#       --python tools/crab_anim.py
#
# The model arrives rigged (34 bones) but with NO actions, and with every
# limb chain an unparented root, so the body cannot carry the legs -- both
# are fixed here before anything is keyed. Timings are not free: the attack
# clip is authored against the game's own combat constants, so frame 9 at
# 30fps IS CRAB_WIND (0.30 s), the frame the damage and the parry test land
# on. Change CRAB_WIND / CRAB_STRIKE / CRAB_RECOVER in main.js and the beats
# in attack_pose() have to move with them.
import bpy, os, math, sys
from mathutils import Vector, Quaternion
def log(*a): print("[build]", *a); sys.stdout.flush()

TEX = "/Users/ethanreedy/Downloads/Textures"
OUT = "/Users/ethanreedy/Dev/beachwalk/assets/crab.glb"
FPS = 30
AX, AY, AZ = Vector((1,0,0)), Vector((0,1,0)), Vector((0,0,1))
arm  = bpy.data.objects['CAngrejo']
mesh = bpy.data.objects['crab']
sc = bpy.context.scene
sc.render.fps = FPS
log("start")

for o in list(bpy.data.objects):
    if o.type in {'LIGHT','CAMERA'} or o.name == 'Plane.001':
        bpy.data.objects.remove(o, do_unlink=True)

# ------------------------------------------------ rig: limbs onto the body
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
if 'Bone.006' in eb: eb.remove(eb['Bone.006'])
root = eb['Bone']
for b in eb:
    if b is not root and b.parent is None:
        b.parent = root; b.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
if 'Bone.006' in mesh.vertex_groups:
    mesh.vertex_groups.remove(mesh.vertex_groups['Bone.006'])
log("bones", len(arm.data.bones))

# ------------------------------------------------------ mesh strip/decimate
bpy.context.view_layer.objects.active = mesh
for m in list(mesh.modifiers):
    if m.type in {'MULTIRES','SUBSURF','DISPLACE'}: mesh.modifiers.remove(m)
tris0 = sum(len(p.vertices)-2 for p in mesh.data.polygons)
d = mesh.modifiers.new("dec", 'DECIMATE'); d.decimate_type='COLLAPSE'
d.ratio = min(1.0, 12000.0/max(1,tris0))
am = next(m for m in mesh.modifiers if m.type=='ARMATURE')
mesh.modifiers.move(list(mesh.modifiers).index(am), len(mesh.modifiers)-1)   # armature last
bpy.ops.object.modifier_apply(modifier="dec")
log("tris", tris0, "->", sum(len(p.vertices)-2 for p in mesh.data.polygons))
for p in mesh.data.polygons: p.use_smooth = True

# ------------------------------------------------------------- material
mat = bpy.data.materials.new("crab"); mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
out  = nt.nodes.new('ShaderNodeOutputMaterial')
bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
bsdf.inputs['Metallic'].default_value = 0.0
def tex(f, cs, size=1024):
    img = bpy.data.images.load(os.path.join(TEX, f))
    if max(img.size) > size: img.scale(size, size)
    img.colorspace_settings.name = cs; img.pack()
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = img; return n
nt.links.new(tex("crab_Albedo_1001.png",'sRGB').outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(tex("crab_Roughness_1001.png",'Non-Color').outputs['Color'], bsdf.inputs['Roughness'])
nm = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(tex("crab_Normal_1001.png",'Non-Color').outputs['Color'], nm.inputs['Color'])
nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
mesh.data.materials.clear(); mesh.data.materials.append(mat)
uvs = mesh.data.uv_layers
if 'UVMap' in uvs: uvs.active = uvs['UVMap']
for l in uvs: l.active_render = (l.name == 'UVMap')
log("material ok, uv", uvs.active.name)

# =================================================================== POSING
pbs = arm.pose.bones
for pb in pbs: pb.rotation_mode = 'QUATERNION'
def basis(pb): return pb.bone.matrix_local.to_3x3().inverted()
def setrot(name, *pairs):
    pb = pbs[name]; m = basis(pb); q = Quaternion((1,0,0,0))
    for ax, ang in pairs:
        if ang: q = q @ Quaternion((m @ ax).normalized(), ang)
    pb.rotation_quaternion = q
def setloc(name, v):  pbs[name].location = basis(pbs[name]) @ Vector(v)
def setscale(name, s): pbs[name].scale = s

# limb tables ------------------------------------------------------------
LEGS, CLAWS = [], []
for side, sgn in (('R',-1), ('L',1)):
    for i,(a,b,c,e) in enumerate(((5,7,8,9), (10,11,12,13), (14,15,16,17))):
        LEGS.append(dict(n=[f'{side}.Bone.{a:03d}', f'{side}.Bone.{b:03d}',
                            f'{side}.Bone.{c:03d}', f'{side}.Bone.{e:03d}'], side=sgn, i=i))
    CLAWS.append(dict(n=[f'{side}.Bone.001', f'{side}.Bone.002',
                         f'{side}.Bone.003', f'{side}.Bone.004'], side=sgn))
for L in LEGS + CLAWS:
    b = arm.data.bones[L['n'][0]]
    dv = (b.tail_local - b.head_local); dv.z = 0
    dv = dv.normalized() if dv.length > 1e-6 else Vector((1,0,0))
    L['dir'] = dv
    L['lift'] = dv.cross(AZ).normalized()      # rotate about this to raise the tip

def leg(L, lift=0.0, sweep=0.0, knee=0.0, foot=0.0):
    a,b,c,e = L['n']; U = L['lift']
    setrot(a, (U, lift), (AZ, sweep))
    setrot(b, (U, knee))
    setrot(c, (U, -knee*1.5 - foot))
    setrot(e, (U, -foot*0.5))
def claw(C, up=0.0, swing=0.0, roll=0.0, fore=0.0, wrist=0.0, gape=0.0):
    a,b,c,e = C['n']; U = C['lift']
    setrot(a, (U, up), (AZ, swing), (C['dir'], roll))
    setrot(b, (U, fore))
    setrot(c, (U, wrist), (AZ, swing*0.35))
    setrot(e, (U, gape))                       # the pincer opening
def body(pitch=0, twist=0, roll=0, lift=0, push=0, squash=0):
    setrot('Bone', (AX, pitch), (AZ, twist), (AY, roll))
    setloc('Bone', (push, 0, lift))
    setscale('Bone', (1+squash*0.10, 1-squash*0.16, 1+squash*0.10))  # local Y is world Z
def rest():
    for pb in pbs:
        pb.rotation_quaternion = Quaternion((1,0,0,0)); pb.location=(0,0,0); pb.scale=(1,1,1)

def key(f):
    for pb in pbs:
        pb.keyframe_insert('rotation_quaternion', frame=f)
        if pb.name == 'Bone':
            pb.keyframe_insert('location', frame=f); pb.keyframe_insert('scale', frame=f)

def new_action(name):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    if not arm.animation_data: arm.animation_data_create()
    arm.animation_data.action = act
    try: arm.animation_data.action_slot = act.slots[0] if act.slots else act.slots.new(id_type='OBJECT', name="Legacy")
    except Exception: pass
    return act

def all_fcurves(act):
    # Blender 5 moved fcurves into slotted action layers
    if hasattr(act, 'fcurves'):
        return list(act.fcurves)
    out = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []):
                out.extend(cb.fcurves)
    return out
def finish(act, loop):
    fcs = all_fcurves(act)
    for fc in fcs:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    log("  action", act.name, "frames", tuple(act.frame_range), "curves", len(fcs))

# ------------------------------------------------------------------ IDLE
act = new_action("idle"); N = 60
for f in range(0, N+1):
    p = f/N; a = p*2*math.pi
    rest()
    body(pitch=math.sin(a)*0.020, twist=math.sin(a*0.5)*0.030,
         roll=math.cos(a)*0.022, lift=math.sin(a*2)*0.012)
    for L in LEGS:
        ph = a + L['i']*0.7 + (0 if L['side']<0 else math.pi)
        leg(L, lift=0.030+math.sin(ph)*0.030, sweep=math.sin(ph*0.5)*0.05,
               knee=-0.10+math.cos(ph)*0.04, foot=0.05)
    for C in CLAWS:
        ph = a*0.7 + (1.7 if C['side']>0 else 0)
        claw(C, up=0.10+math.sin(ph)*0.07, swing=math.sin(ph*0.8)*0.10,
                fore=-0.15, wrist=0.10, gape=0.10+math.sin(ph*1.3)*0.07)
    key(f)
finish(act, True)

# ------------------------------------------------------------------ WALK
# It travels SIDEWAYS (the game yaws it 90 deg to its heading), so the cycle
# is the legs reaching out and hauling in along the body's X, not a stride.
act = new_action("walk"); N = 20
for f in range(0, N+1):
    p = (f % N)/N; a = p*2*math.pi
    rest()
    body(pitch=math.sin(a*2)*0.030, roll=math.sin(a)*0.055,
         lift=abs(math.sin(a))*0.030-0.010, twist=math.sin(a)*0.025)
    for L in LEGS:
        # the two sides half a cycle apart, with a ripple down each side
        ph = a + (math.pi if L['side']>0 else 0) + L['i']*0.55
        ext  = math.cos(ph)            # +1 reaching out, -1 hauled in
        rise = max(0.0, math.sin(ph))  # only lifts on the return
        leg(L, lift=rise*0.34 - 0.02, sweep=ext*0.20*L['side'],
               knee=-0.34 + ext*0.30, foot=0.10 + rise*0.16)
    for C in CLAWS:
        ph = a + (1.5 if C['side']>0 else 0)
        claw(C, up=0.28+math.sin(ph)*0.10, swing=-0.10*C['side']+math.sin(ph)*0.09,
                fore=-0.30, wrist=0.22, gape=0.16)
    key(f)
finish(act, True)

# ---------------------------------------------------------------- ATTACK
# Locked to the combat clock. CRAB_WIND 0.30s / CRAB_STRIKE 0.10s /
# CRAB_RECOVER 0.34s at 30fps, so the damage frame is f9 -- and the claw has
# to ARRIVE on f9, not sail past it three frames later. Anticipation opposite
# the action, a two-frame slam, then a long open recovery you can punish.
act = new_action("attack")
LEAD, TRAIL = CLAWS[1], CLAWS[0]        # the left claw leads the swing
def P(body_kw, lead_kw, trail_kw, leg_kw):
    return dict(body=body_kw, lead=lead_kw, trail=trail_kw, leg=leg_kw)
P_READY = P(dict(), dict(up=0.30, fore=-0.20, wrist=0.30, gape=0.15),
               dict(up=0.25, fore=-0.25, wrist=0.20, gape=0.15),
               dict(knee=-0.30, foot=0.14))
P_WOUND = P(dict(pitch=-0.30, twist=-0.34, roll=-0.10, lift=0.075, squash=0.90),
            dict(up=1.05, swing=-0.85, roll=0.25, fore=-0.60, wrist=0.60, gape=0.77),
            dict(up=0.60, swing=0.30, fore=-0.40, wrist=0.20, gape=0.45),
            dict(lift=-0.10, sweep=-0.12, knee=-0.52, foot=0.30))
P_CONTACT = P(dict(pitch=0.30, twist=0.50, roll=0.14, lift=-0.02, push=0.26, squash=-0.50),
              dict(up=-0.35, swing=0.85, roll=-0.20, fore=0.05, wrist=-0.10, gape=0.0),
              dict(up=0.20, swing=-0.25, fore=-0.15, wrist=0.15, gape=0.0),
              dict(lift=0.14, sweep=0.16, knee=-0.20, foot=0.16))
P_OVER = P(dict(pitch=0.42, twist=0.62, roll=0.18, push=0.32, squash=-0.35),
           dict(up=-0.45, swing=1.05, roll=-0.28, fore=0.14, wrist=-0.18, gape=0.06),
           dict(up=0.15, swing=-0.32, fore=-0.15, wrist=0.15, gape=0.06),
           dict(lift=0.18, sweep=0.20, knee=-0.16, foot=0.14))
def mix(p0, p1, t):
    o = {}
    for part in ('body','lead','trail','leg'):
        a_, b_ = p0[part], p1[part]
        o[part] = {k: a_.get(k,0.0) + (b_.get(k,0.0) - a_.get(k,0.0))*t for k in set(a_)|set(b_)}
    return o
def apply(p):
    rest()
    body(**p['body']); claw(LEAD, **p['lead']); claw(TRAIL, **p['trail'])
    for L in LEGS:
        kw = dict(p['leg']); kw['sweep'] = kw.get('sweep',0.0)*L['side']
        leg(L, **kw)
def attack_pose(f):
    if f <= 7:                       # anticipation: cocks away from the blow
        apply(mix(P_READY, P_WOUND, (f/7.0)**0.65))
    elif f <= 9:                     # the slam - two frames, and it lands on 9
        e = (f-7)/2.0
        apply(mix(P_WOUND, P_CONTACT, e*e))
    elif f <= 12:                    # follow-through, carried past the hit
        e = (f-9)/3.0
        apply(mix(P_CONTACT, P_OVER, e*e*(3-2*e)))
    else:                            # recovery: open for all of it
        e = (f-12)/11.0
        apply(mix(P_OVER, P_READY, e*e*(3-2*e)))
for f in range(0, 24):
    attack_pose(f); key(f)
finish(act, False)

# ----------------------------------------------------------------- STUN
# the parry payoff: it reels, claws drop wide open, and it is left there
act = new_action("stun"); N = 51
for f in range(0, N+1):
    rest()
    e = min(1.0, f/6.0)                      # snapped back
    w = math.sin(f*0.55)*math.exp(-f/26.0)   # and wobbling it off
    body(pitch=-0.34*e+w*0.10, twist=0.30*e+w*0.16, roll=w*0.14, lift=-0.05*e)
    for C in CLAWS:
        claw(C, up=-0.45*e+w*0.14, swing=(0.55*e+w*0.2)*C['side'],
                fore=0.25*e, wrist=-0.30*e, gape=0.55*e+w*0.1)
    for L in LEGS:
        leg(L, lift=-0.12*e+w*0.10, sweep=w*0.14*L['side'], knee=-0.45*e, foot=0.20*e)
    key(f)
finish(act, False)

# ------------------------------------------------------------------ DIE
act = new_action("die"); N = 24
for f in range(0, N+1):
    rest()
    s = (f/N); s = s*s*(3-2*s)
    body(pitch=0.30*s, roll=1.15*s, lift=-0.20*s, twist=0.25*s, squash=-0.5*s)
    for C in CLAWS:
        claw(C, up=-0.55*s, swing=0.70*s*C['side'], fore=0.85*s, wrist=0.55*s, gape=0.10)
    for L in LEGS:                            # legs curl in, the way they do
        leg(L, lift=0.55*s, sweep=0.30*s*L['side'], knee=0.85*s, foot=-0.75*s)
    key(f)
finish(act, False)

# ------------------------------------------------- stash them all for export
ad = arm.animation_data
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
for a in bpy.data.actions:
    tr = ad.nla_tracks.new(); tr.name = a.name
    tr.strips.new(a.name, int(a.frame_range[0]), a)
ad.action = None
rest()

log("exporting", OUT)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_apply=False,
    export_animations=True, export_animation_mode='ACTIONS',
    export_bake_animation=True, export_optimize_animation_size=True,
    export_yup=True, export_skins=True, export_materials='EXPORT',
    export_image_format='JPEG', export_jpeg_quality=88,
)
log("DONE", os.path.getsize(OUT))
