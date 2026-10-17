"""The paladin's moves, baked onto his own skeleton: assets/paladin.glb (with every clip in it) and
assets/paladin-moves.json (how far each one carries him, and when).

    /usr/bin/python3 tools/paladin_pack.py          # once: the rig, the skin, the paint -> /tmp/paladin_pack/rest.blend
    /Applications/Blender.app/Contents/MacOS/Blender -b -noaudio --python tools/paladin_bake.py [-- --only pS1,pReady] [-- --shots DIR]

WHY IT IS DONE HERE AND NOT IN THE GAME (2026-10-17, round 4; the owner: "his rig is bad it makes no sense … hes not
even holding his sword. fingers arent even wrapped around the handle"). Three skeletons' clips were retargeted at
load in the game, with no fingers (the moves file carried 22 bones) and one grip read off one capture's rest, so the
blade sat in an open hand at a different wrong angle in every pack. Here:

- EVERY BONE IS RETARGETED IN WORLD SPACE off the source's own rest, which is put upright and turned to face his way
  (-Y in Blender): his bone takes the source bone's motion since ITS rest, applied to his bone laid along the source
  bone's rest direction (`W`, the shortest turn). The hips and the hands are laid by a whole FRAME (up and across the
  pelvis; along the hand and across its knuckles), not a direction, so their twist is the capture's too.
- THE BLADE IS THE CAPTURE'S. The TC and EEJANAI packs ship their swordsman's sword in his hand. His right hand is
  turned, every frame, so that HIS blade (seated under his palm by the model's maker) lies along the captured blade:
  point, flat and all. The Great Sword Pack (Mixamo) has no prop; there the hand's frame is retargeted like the left.
- HIS RIGHT FIST IS CLOSED ROUND THE GRIP once, at rest: each finger joint is turned about the grip's own axis until
  its knuckle sits on a cylinder round the hilt (`fist`). The left hand takes the capture's fingers.
- The hips: their height off the source scaled by leg length; their travel over the ground taken OUT of the clip and
  written to the moves file (`travel`, three's frame, his model's metres) for the game to move him by — a gait keeps
  its sway and loses only its straight-line drift.
"""
import bpy, os, sys, json, math
from mathutils import Vector, Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = '/tmp/paladin_pack'
EEJ = os.path.expanduser('~/paladin moves/Assets/EEJANAI_Team/FreeSwordAnimations/FBX')
TC = os.path.expanduser('~/Downloads/TC_Sword_Free_Pack/FBX_Pack/Animation')
GS = os.path.expanduser('~/Desktop/BEACHWALK ASSETS/Great Sword Pack')
FPS = 30

# name, folder, file, window (frames from the first, inclusive) or None, mode
#   idle / gait: in place, the sway kept, the straight drift (and any slow turn) out
#   swing: the travel out and written down; any turn it ends on is unwound over its back half
#   beat: the travel out; the turn unwound the same way, except where the turn is the point (KEEP_TURN)
CLIPS = [
    # (round 5: his guard and his gaits are the Great Sword Pack's, the blade up in front in BOTH hands — the TC ready, walk
    # and run carry it out at his right side in one, where his left hand cannot reach the grip: 1.15–1.24 of his arm)
    ('pReady', GS, 'great sword idle', None, 'idle'),
    ('pWalkT', GS, 'great sword walk (2)', None, 'gait'),
    ('pRunT', GS, 'great sword run', None, 'gait'),
    # ---- HIS BLOWS ARE A TWO-HANDER'S (round 5). The EEJANAI slashes are a fencer's, one-handed, out of a low side guard:
    # thrown from a two-handed guard every one of them began by letting go of the sword. The Great Sword Pack's start
    # and end in the guard he stands in, both hands on the grip the whole way (his left hand's reach 0.4–1.0 of his arm).
    # (Its slash (2) is a 3.5 s string, slash (5) begins crouched and the 360 from no guard at all: not used.)
    ('pS1', GS, 'great sword slash', None, 'swing'),
    ('pS2', GS, 'great sword slash (3)', None, 'swing'),
    ('pS3', GS, 'great sword slash (4)', None, 'swing'),
    ('pS4', GS, 'great sword attack', None, 'swing'),
    ('pS6', GS, 'great sword high spin attack', None, 'swing'),
    ('pS9', GS, 'great sword jump attack', None, 'swing'),
] + [
    ('pStrL', GS, 'great sword strafe', None, 'gait'),
    ('pStrR', GS, 'great sword strafe (2)', None, 'gait'),
    ('pTurn', GS, 'great sword 180 turn', None, 'beat'),
    ('pHit', GS, 'great sword impact (2)', None, 'beat'),        # (impact, (4) and (5) are held crouches, not flinches)
    ('pHitBig', GS, 'great sword impact (3)', None, 'beat'),
    ('pBlock', GS, 'great sword blocking (2)', None, 'beat'),
    ('pCast', GS, 'great sword casting', None, 'beat'),
    ('pDie', GS, 'two handed sword death', None, 'beat'),
    ('pDieB', GS, 'two handed sword death (2)', None, 'beat'),
]
# (the TC string, `KBS_Sword_ATK_Combo_01_001` cut at 0/36/62/90/151, turns him -176 and +170 between its pieces:
# a spinning string that only reads whole; it was the entrance's, and the entrance is gone)
KEEP_TURN = {'pTurn', 'pDie', 'pDieB'}

SIDES = ('Left', 'Right')
FING = ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')
# the bone each one points at (its rest direction is head -> that head)
AIM = {'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head'}
for S in SIDES:
    AIM.update({S + 'Shoulder': S + 'Arm', S + 'Arm': S + 'ForeArm', S + 'ForeArm': S + 'Hand',
                S + 'UpLeg': S + 'Leg', S + 'Leg': S + 'Foot', S + 'Foot': S + 'ToeBase'})
    for f in FING:
        AIM[S + 'Hand%s1' % f] = S + 'Hand%s2' % f
        AIM[S + 'Hand%s2' % f] = S + 'Hand%s3' % f
        AIM[S + 'Hand%s3' % f] = S + 'Hand%s4' % f          # (the source's; his has no 4th: his bone's tail)


def log(*a):
    print('[bake]', *a, flush=True)


def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = {'only': None, 'shots': None, 'noexport': False}
    for i, x in enumerate(a):
        if x == '--only': o['only'] = set(a[i + 1].split(','))
        if x == '--shots': o['shots'] = a[i + 1]
        if x == '--noexport': o['noexport'] = True
    return o


def rot(m):
    return m.to_3x3().normalized().to_quaternion()


def frame(p, s):
    """an orthonormal frame, x along p, y along s made square to it"""
    x = p.normalized(); y = (s - x * s.dot(x)).normalized(); z = x.cross(y)
    return Matrix((x, y, z)).transposed().to_quaternion()


def pca(pts):
    """the blade's axis and its flat's normal, off its vertices: the most and least spread directions"""
    import numpy as np
    P = np.array([tuple(p) for p in pts]); c = P.mean(0); U, S, Vt = np.linalg.svd(P - c, full_matrices=False)
    return Vector(c), Vector(Vt[0]), Vector(Vt[2])


# ------------------------------------------------------------------ him
class Him:
    def __init__(self):
        self.rig = bpy.data.objects['paladin_rig']
        rig = self.rig
        for pb in rig.pose.bones:
            pb.rotation_mode = 'QUATERNION'; pb.matrix_basis = Matrix()
        bpy.context.view_layer.update()
        self.RW = rig.matrix_world.copy(); self.RWi = self.RW.inverted()
        log('rig world scale %.3f' % self.RW.to_scale().x)
        B = rig.data.bones
        self.order = sorted(B, key=lambda b: len(b.parent_recursive))
        self.rest = {b.name: b.matrix_local.copy() for b in B}                         # armature space
        self.restQ = {k: rot(v) for k, v in self.rest.items()}
        self.head = {b.name: b.head_local.copy() for b in B}
        self.tail = {b.name: b.tail_local.copy() for b in B}
        H = self.head
        legs = lambda S: (H[S + 'Leg'] - H[S + 'UpLeg']).length + (H[S + 'Foot'] - H[S + 'Leg']).length
        self.leg = (legs('Left') + legs('Right')) / 2
        self.hipZ = H['Hips'].z - min(H['LeftFoot'].z, H['RightFoot'].z)
        self.footZ = min(H['LeftFoot'].z, H['RightFoot'].z)
        # the sword's frame at rest (armature space), off its own bone's vertices
        body = bpy.data.objects['paladin_body']
        gi = body.vertex_groups['Sword'].index
        mw = self.RWi @ body.matrix_world
        pts = [mw @ v.co for v in body.data.vertices if any(g.group == gi and g.weight > 0.5 for g in v.groups)]
        c, ax, nrm = pca(pts)
        hilt = self.head['Sword']
        if ax.dot(self.tail['Sword'] - hilt) < 0: ax = -ax
        self.swordF = frame(ax, nrm)
        self.hilt, self.ax = hilt, ax
        self.gripR = float(rig.get('bw_grip', 0.026))           # (measured on the grip's rings by the packer)
        log('him: leg %.2f, hips %.2f over the foot, sword grip r %.3f' % (self.leg, self.hipZ, self.gripR))
        self.fist = self.make_fist()
        # AND THE LEFT HAND ON THE GRIP TOO (2026-10-17, round 5; the owner: "he holds the sword too awkward … make him
        # actually hold the sword on the handle"). His is a long-handled two-hander held in one fist, the other arm
        # loose. The left fist is the right one mirrored across his middle (the rig is symmetric to the millimetre):
        # closed round a mirrored grip at rest, and its seat on the blade is the right one's mirrored — so each frame
        # the left hand can be laid on the handle just under the right, the way a longsword is held.
        Mw = Matrix.Diagonal((-1, 1, 1))
        hL, aL = Mw @ self.hilt, Mw @ self.ax
        self.fist.update(self.make_fist('Left', hL, aL))
        Rs = self.restQ['Sword'].to_matrix()
        RsL = (Mw @ Rs @ Matrix.Diagonal((1, 1, -1))).to_quaternion()      # (a mirror, made proper again: its Y is the blade)
        self.seatL = self.restQ['LeftHand'].inverted() @ RsL
        self.gripL = self.rest['LeftHand'].inverted() @ hL                  # the left grip point, in the left hand's own frame
        self.space = (self.head['RightHandIndex1'] - self.head['RightHandPinky1']).length + 0.03

    # the right fist, closed round the grip at rest: a local rotation per finger bone
    def make_fist(self, side='Right', g=None, a=None):
        H, T, Q = self.head, self.tail, self.restQ
        a = a if a is not None else self.ax; g = g if g is not None else self.hilt; R = self.gripR + 0.016
        out = {}
        def dist(p):
            v = p - g; return (v - a * v.dot(a)).length
        curled = {}
        for f in ('Index', 'Middle', 'Ring', 'Pinky', 'Thumb'):          # (the thumb last: it closes onto the index)
            names = ['%sHand%s%d' % (side, f, i) for i in (1, 2, 3)]
            pts = [H[n].copy() for n in names] + [T[names[-1]].copy()]
            if f == 'Thumb':
                ip = curled['Index'][2]; v = ip - g; v = v - a * v.dot(a)
                aim = ip + v.normalized() * 0.014                     # over the index's middle joint
            worlds = [Q[n].copy() for n in names]
            for j in range(3):
                piv = pts[j]
                Rf = R + (0.014 if f == 'Thumb' else 0.0)          # (the thumb closes over the fingers, not through them)
                best = None
                for sgn in (1, -1):
                    q5 = Quaternion(a * sgn, math.radians(5))
                    if f != 'Thumb' and dist(piv + q5 @ (pts[j + 1] - piv)) > dist(pts[j + 1]): continue   # curls IN, round the grip
                    for deg in range(0, 122, 2):
                        q = Quaternion(a * sgn, math.radians(deg))
                        e = piv + q @ (pts[j + 1] - piv); d = dist(e)
                        sc_ = abs(d - Rf) + 0.00015 * deg
                        if f == 'Thumb': sc_ = (e - aim).length + (0.05 if d < R else 0) + 0.0001 * deg
                        if best is None or sc_ < best[0]: best = (sc_, q, deg * sgn)
                if best is None: best = (0, Quaternion(), 0)
                log('   fist %s%d: %d deg (knuckle %.3f from the grip, end %.3f)' % (f, j + 1, best[2], dist(piv), dist(pts[j + 1])))
                q = best[1]
                for k in range(j + 1, 4): pts[k] = piv + q @ (pts[k] - piv)
                for k in range(j, 3): worlds[k] = q @ worlds[k]
            curled[f] = pts
            # world (armature) rotations at rest -> local basis, down the chain from the hand at rest
            par = Q[side + 'Hand']; parRest = self.rest[side + 'Hand']
            for k, n in enumerate(names):
                rel = rot(parRest.inverted() @ self.rest[n])
                out[n] = (par @ rel).inverted() @ worlds[k]
                par = worlds[k]; parRest = self.rest[n]
        return out


# ------------------------------------------------------------------ the capture
class Src:
    def __init__(self, folder, file):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=os.path.join(folder, file + '.fbx'), use_anim=True)
        self.new = [o for o in bpy.data.objects if o not in before]
        arms = [o for o in self.new if o.type == 'ARMATURE']
        self.arm = arms[0]
        self.eej = self.arm.name.startswith('EEJANAIBot')
        names = [b.name for b in self.arm.data.bones]
        self.pre = 'EEJANAIBot:' if self.eej else ('mixamorig:' if any(n.startswith('mixamorig:') for n in names) else '')
        self.sword = None
        for o in self.new:
            if o.type == 'MESH' and (o.name.startswith('TonySword') or (o.parent and o.parent.name.startswith('Sword'))):
                self.sword = o
        for o in self.new:
            if o.type == 'MESH' and o is not self.sword: o.hide_render = True
        act = (self.arm.animation_data and self.arm.animation_data.action)
        self.f0, self.f1 = int(act.frame_range[0]), int(act.frame_range[1])
        self.fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
        # the rest, upright: the EEJANAI hips are the armature OBJECT, whose rest is its parent's frame
        self.restW = self.arm.parent.matrix_world.copy() if self.eej else self.arm.matrix_world.copy()
        # facing: his feet at rest, turned onto -Y
        self.C = Matrix()
        fw = Vector()
        for S in SIDES:
            d = self.restpos(S + 'ToeBase') - self.restpos(S + 'Foot'); d.z = 0; fw += d.normalized()
        yaw = math.atan2(-1, 0) - math.atan2(fw.y, fw.x)
        self.C = Matrix.Rotation(yaw, 4, 'Z')
        if self.sword:
            sw = self.sword
            c, ax, nrm = pca([v.co for v in sw.data.vertices])
            # the point is the end farther from the hand
            ends = sorted([v.co for v in sw.data.vertices], key=lambda p: (p - c).dot(ax))
            lo, hi = ends[0], ends[-1]
            sc.frame_set(self.f0); bpy.context.view_layer.update()
            hw = self.C.inverted() @ self.world('RightHand').to_translation()      # (the sword's world has no C in it)
            if (sw.matrix_world @ lo - hw).length > (sw.matrix_world @ hi - hw).length: ax = -ax
            self.swF = frame(ax, nrm)                              # in the sword mesh's own space
        legs = lambda S: (self.restpos(S + 'Leg') - self.restpos(S + 'UpLeg')).length + (self.restpos(S + 'Foot') - self.restpos(S + 'Leg')).length
        self.leg = (legs('Left') + legs('Right')) / 2
        self.hipZ = self.restpos('Hips').z - min(self.restpos('LeftFoot').z, self.restpos('RightFoot').z)

    def bone(self, n):
        return self.arm.data.bones.get(self.pre + n)

    def pb(self, n):
        return self.arm.pose.bones.get(self.pre + n)

    def restM(self, n):
        if n == 'Hips' and self.eej: return self.C @ self.restW
        b = self.bone(n)
        return self.C @ self.restW @ b.matrix_local

    def restpos(self, n):
        return self.restM(n).to_translation()

    def world(self, n):
        if n == 'Hips' and self.eej: return self.C @ self.arm.matrix_world
        return self.C @ self.arm.matrix_world @ self.pb(n).matrix

    def swordQ(self):
        return rot(self.C @ self.sword.matrix_world) @ self.swF

    def drop(self):
        for o in self.new:
            if o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
        for a in list(bpy.data.actions):
            if a.users == 0: bpy.data.actions.remove(a)


sc = None


def has(S, n):
    return (n == 'Hips') or S.bone(n) is not None


def fk(him, Qw, hipPos):
    """world (armature-space) rotations -> every bone's pose matrix and local basis, root down; a bone with no
    rotation of its own (the sword) rides its parent, and the fists are their constant closes"""
    P, B = {}, {}
    for b in him.order:
        n = b.name
        par = b.parent.name if b.parent else None
        if n in him.fist:
            bq = him.fist[n]
        elif n == 'Hips':
            M = Matrix.Translation(hipPos) @ Qw['Hips'].to_matrix().to_4x4()
            bq = rot(him.rest[n].inverted() @ M)
        elif n in Qw and par in P:
            restRel = him.rest[par].inverted() @ him.rest[n]
            bq = (rot(P[par]) @ rot(restRel)).inverted() @ Qw[n]
        else:
            bq = Quaternion()
        if par is None:
            P[n] = Matrix.Translation(hipPos) @ Qw['Hips'].to_matrix().to_4x4() if n == 'Hips' else him.rest[n]
        else:
            P[n] = P[par] @ (him.rest[par].inverted() @ him.rest[n]) @ bq.to_matrix().to_4x4()
        B[n] = bq
    return P, B


# ------------------------------------------------------------------ one clip
def bake(him, name, folder, file, win, mode):
    global sc
    S = Src(folder, file)
    sR = him.RWi.to_scale().x                       # (source metres -> his armature's units)
    k = him.leg / (S.leg * sR)
    f0 = S.f0 + (win[0] if win else 0)
    f1 = (S.f0 + win[1]) if win else S.f1
    # sampled at FPS whatever the capture's own rate
    nS = int(round((f1 - f0) / S.fps * FPS))
    frames = [f0 + (f1 - f0) * i / max(1, nS) for i in range(nS + 1)]
    def at(f):
        sc.frame_set(int(math.floor(f)), subframe=f - math.floor(f)); bpy.context.view_layer.update()
    # the alignment: his rest bone laid along the source's rest bone (armature space of his rig; C already applied)
    RWiQ = rot(him.RWi)
    sRest = {}
    for b in him.order:
        n = b.name
        if n in ('Sword',) or not has(S, n): continue
        sRest[n] = RWiQ @ rot(S.restM(n))
    def spos(n): return him.RWi @ S.restpos(n)
    W = {}
    for b in him.order:
        n = b.name
        if n not in sRest: continue
        if n == 'Hips':
            up = lambda P: (P('LeftArm') + P('RightArm')) / 2 - (P('LeftUpLeg') + P('RightUpLeg')) / 2
            lf = lambda P: P('LeftUpLeg') - P('RightUpLeg')
            Fs = frame(up(spos), lf(spos)); Ft = frame(up(lambda x: him.head[x]), lf(lambda x: him.head[x]))
            W[n] = Fs @ Ft.inverted()
        elif n in ('LeftHand', 'RightHand'):
            sd = n[:-4]
            P = lambda x: spos(sd + x); Pt = lambda x: him.head[sd + x]
            Fs = frame(P('HandMiddle1') - P('Hand'), P('HandIndex1') - P('HandPinky1'))
            Ft = frame(Pt('HandMiddle1') - Pt('Hand'), Pt('HandIndex1') - Pt('HandPinky1'))
            W[n] = Fs @ Ft.inverted()
        elif n in AIM and (has(S, AIM[n])):
            tgt = AIM[n]
            dt = (him.head[tgt] if tgt in him.head else him.tail[n]) - him.head[n]
            ds = spos(tgt) - spos(n)
            W[n] = dt.normalized().rotation_difference(ds.normalized())
        else:
            p = b.parent.name if b.parent else None
            W[n] = W.get(p, Quaternion())
    # the source's hips over the clip: height, travel and turn
    at(f0)
    h0 = him.RWi @ S.world('Hips').to_translation()
    def hipyaw():
        l = (him.RWi @ S.world('LeftUpLeg').to_translation()) - (him.RWi @ S.world('RightUpLeg').to_translation())
        return math.atan2(l.y, l.x)
    y0 = hipyaw()
    at(f1)
    turn = (hipyaw() - y0 + math.pi) % (2 * math.pi) - math.pi
    hN = him.RWi @ S.world('Hips').to_translation()
    # where his feet are when they are on the ground: the rest's for a capture that stands its rest on the floor, and
    # for EEJANAI (whose rest stands nowhere) the lowest they go over the clip
    if S.eej:
        lows = []
        for f in frames:
            at(f); lows.append(min((him.RWi @ S.world(s + 'Foot').to_translation()).z for s in SIDES))
        footRest = min(lows)
    else:
        footRest = min(spos('LeftFoot').z, spos('RightFoot').z)
    sHipZ = S.hipZ * sR
    drift = (hN - h0); drift.z = 0
    act = bpy.data.actions.new(name)
    rig = him.rig
    rig.animation_data_create(); rig.animation_data.action = act
    travel, hipY = [], []
    prevQ = {}
    N = len(frames) - 1
    swingSign = None
    leftFlip = None
    wL = None
    reach = []
    dbgAx = []
    for i, f in enumerate(frames):
        at(f)
        t = i / max(1, N)
        # the turn taken out (see the modes)
        if mode in ('idle', 'gait'): yu = -turn * t
        elif name in KEEP_TURN: yu = 0.0
        else:
            r = max(0.0, min(1.0, (t - 0.5) / 0.5)); yu = -turn * r * r * (3 - 2 * r)
        U = Quaternion((0, 0, 1), yu)
        hp = him.RWi @ S.world('Hips').to_translation()
        rel = U @ (hp - h0)
        lin = U @ (drift * t) if mode in ('idle', 'gait') else rel.copy()
        lin.z = 0
        tv = (rel - lin) if mode in ('idle', 'gait') else Vector((0, 0, rel.z))
        trav = lin * k / sR                                       # (his model's metres, as exported)
        travel.append([round(trav.x, 4), round(-trav.y, 4)])          # (three: x, z = -y)
        hipZ = him.head['Hips'].z + ((hp.z - footRest) - sHipZ) * k
        hipPos = Vector((him.head['Hips'].x + tv.x * k, him.head['Hips'].y + tv.y * k, hipZ))
        hipY.append(round((hipPos.z - him.head['Hips'].z) / sR, 4))
        # every bone's world (armature) rotation
        Qw = {}
        for b in him.order:
            n = b.name
            if n in sRest:
                qs = U @ RWiQ @ rot(S.world(n))
                Qw[n] = qs @ sRest[n].inverted() @ W[n] @ him.restQ[n]
        # the right hand: onto the captured blade
        if S.sword:
            Fs = U @ RWiQ @ S.swordQ()
            gen = Qw.get('RightHand')
            cands = [Fs @ him.swordF.inverted() @ him.restQ['RightHand'],
                     (Fs @ Quaternion((1, 0, 0), math.pi)) @ him.swordF.inverted() @ him.restQ['RightHand']]
            if swingSign is None:
                swingSign = 0 if gen is None or abs(cands[0].dot(gen)) >= abs(cands[1].dot(gen)) else 1
            Qw['RightHand'] = cands[swingSign]
            dbgAx.append(Fs @ Vector((1, 0, 0)))
        # down the chain into world (armature) poses and local bases
        P, Bq = fk(him, Qw, hipPos)
        # the left hand onto the handle, under the right: a two-bone reach, the elbow kept where the capture had it
        if 'Sword' in P and 'LeftHand' in P:
            Fs = rot(P['Sword']); ax = (Fs @ Vector((0, 1, 0))).normalized()
            if leftFlip is None:
                gen = Qw.get('LeftHand', rot(P['LeftHand']))
                c0, c1 = Fs @ him.seatL.inverted(), Fs @ Quaternion((0, 1, 0), math.pi) @ him.seatL.inverted()
                leftFlip = 0 if abs(c0.dot(gen)) >= abs(c1.dot(gen)) else 1
            QL = (Fs @ (Quaternion((0, 1, 0), math.pi) if leftFlip else Quaternion()) @ him.seatL.inverted()).normalized()
            T = P['Sword'].to_translation() - ax * him.space
            Wt = T - (QL @ him.gripL)
            S0, E0, W0 = P['LeftArm'].to_translation(), P['LeftForeArm'].to_translation(), P['LeftHand'].to_translation()
            la, lb = (E0 - S0).length, (W0 - E0).length
            dv = Wt - S0; d = min(dv.length, (la + lb) * 0.999); dn = dv.normalized()
            reach.append(dv.length / (la + lb))
            x = (la * la - lb * lb + d * d) / (2 * d); h = math.sqrt(max(0.0, la * la - x * x))
            pole = (E0 - S0) - dn * (E0 - S0).dot(dn)
            if pole.length < 1e-5: pole = Vector((0, 0, -1)) - dn * dn.z
            E = S0 + dn * x + pole.normalized() * h
            Wn = S0 + dn * d
            r1 = (E0 - S0).normalized().rotation_difference((E - S0).normalized())
            fore1 = r1 @ rot(P['LeftForeArm'])
            r2 = (r1 @ (W0 - E0)).normalized().rotation_difference((Wn - E).normalized())
            # on the grip where he can reach it, and off it — smoothly — where the cut takes the blade further than his
            # left arm goes (a one-handed extension at the end of a sweep)
            wNow = max(0.0, min(1.0, (1.12 - dv.length / (la + lb)) / 0.14))
            wL = wNow if wL is None else wL + (wNow - wL) * 0.35
            o = {k: rot(P[k]) for k in ('LeftArm', 'LeftForeArm', 'LeftHand')}
            Qw['LeftArm'] = o['LeftArm'].slerp((r1 @ o['LeftArm']).normalized(), wL)
            Qw['LeftForeArm'] = o['LeftForeArm'].slerp((r2 @ fore1).normalized(), wL)
            Qw['LeftHand'] = o['LeftHand'].slerp(QL, wL)
            P, Bq = fk(him, Qw, hipPos)
        for b in him.order:
            n = b.name; pb = rig.pose.bones[n]
            q = Bq[n].normalized()
            if n in prevQ and prevQ[n].dot(q) < 0: q = -q
            prevQ[n] = q
            pb.rotation_quaternion = q
            pb.keyframe_insert('rotation_quaternion', frame=i)
            if n == 'Hips':
                pb.location = (him.rest[n].inverted() @ P[n]).to_translation()
                pb.keyframe_insert('location', frame=i)
    if S.sword:                                       # (the check: his blade against the captured one, every frame)
        worst = 0
        for i in range(len(frames)):
            sc.frame_set(i); bpy.context.view_layer.update()
            ya = (rig.pose.bones['Sword'].matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
            worst = max(worst, math.degrees(ya.angle(dbgAx[i].normalized())))
        log('   blade against the capture: worst %.1f deg' % worst)
    rig.animation_data.action = None
    tr = rig.animation_data.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 0, act); st.name = name
    tr.mute = True
    act.use_fake_user = True
    dur = N / FPS
    if reach: log('   left hand on the grip: reach %.2f..%.2f of his arm (over 1: short of it)' % (min(reach), max(reach)))
    log('%-7s %-28s %3d frames @%g  turn %+4.0f deg  travel %.2f m  k %.2f%s' % (
        name, file[:28], N + 1, S.fps, math.degrees(turn), math.hypot(*travel[-1]), k, '  (blade followed)' if S.sword else ''))
    if SHOTS:                                         # the captured man at the same six moments, from the same side
        body = bpy.data.objects['paladin_body']; body.hide_render = True
        for o in S.new:
            if o.type == 'MESH': o.hide_render = False
        cam = shotcam(); Ci = S.C.inverted()
        for o in S.new:                               # (turned to face his way, so one camera serves both)
            if o.parent is None: o.matrix_world = S.C @ o.matrix_world
        for j in range(6):
            f = frames[int(round(N * j / 5))]; at(f)
            hp = Ci @ S.world('Hips').to_translation()           # (world() turns by C again: once is the truth now)
            atp = Vector((hp.x, hp.y, hp.z + 0.1)); loc = atp + Vector((-2.6, -3.6, 0.6)) * (S.hipZ / him.hipZ)
            cam.location = loc; cam.rotation_euler = (atp - loc).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(SHOTS, '%s_src_%d.png' % (name, j)); bpy.ops.render.render(write_still=True)
        body.hide_render = False
    S.drop()
    return {'src': file, 'dur': round(dur, 4), 'n': N + 1, 'travel': travel, 'hipY': hipY, 'mode': mode}


SHOTS = None


def shotcam():
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = 320; sc.render.resolution_y = 400
    cam = bpy.data.objects.get('shotcam')
    if not cam:
        c = bpy.data.cameras.new('shotcam'); c.lens = 35; cam = bpy.data.objects.new('shotcam', c); sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def shots(him, names, out):
    """a strip of frames of each clip, from his front-left, for checking by eye"""
    rig = him.rig
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = 320; sc.render.resolution_y = 400
    cam = bpy.data.objects.get('shotcam')
    if not cam:
        c = bpy.data.cameras.new('shotcam'); c.lens = 35; cam = bpy.data.objects.new('shotcam', c); sc.collection.objects.link(cam)
    sc.camera = cam
    W0 = him.RW
    for n in names:
        tr = rig.animation_data.nla_tracks.get(n)
        if not tr: continue
        act = tr.strips[0].action
        rig.animation_data.action = act
        fr = act.frame_range
        for j in range(6):
            f = int(fr[0] + (fr[1] - fr[0]) * j / 5)
            sc.frame_set(f); bpy.context.view_layer.update()
            hp = rig.matrix_world @ rig.pose.bones['Hips'].head
            at = Vector((hp.x, hp.y, hp.z + 0.1))
            loc = at + Vector((-2.6, -3.6, 0.6))
            cam.location = loc; cam.rotation_euler = (at - loc).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(out, '%s_%d.png' % (n, j))
            bpy.ops.render.render(write_still=True)
        rig.animation_data.action = None


def handshots(him, names, out):
    rig = him.rig; cam = shotcam()
    sc.render.resolution_x = 360; sc.render.resolution_y = 360
    for n in names:
        tr = rig.animation_data.nla_tracks.get(n)
        if not tr: continue
        act = tr.strips[0].action; rig.animation_data.action = act
        fr = act.frame_range
        for j, (dx, dy, dz) in enumerate(((0.45, -0.35, 0.15), (-0.45, -0.35, 0.2), (0.1, 0.5, 0.3))):
            sc.frame_set(int(fr[0] + (fr[1] - fr[0]) * 0.3)); bpy.context.view_layer.update()
            hp = rig.matrix_world @ rig.pose.bones['Sword'].head
            loc = hp + Vector((dx, dy, dz)) * 0.9
            cam.location = loc; cam.rotation_euler = (hp - loc).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(out, '%s_hand_%d.png' % (n, j)); bpy.ops.render.render(write_still=True)
        rig.animation_data.action = None


def fistshots(him, out):
    rig = him.rig; cam = shotcam()
    sc.render.resolution_x = 360; sc.render.resolution_y = 360
    rig.animation_data_create(); rig.animation_data.action = None
    for pb in rig.pose.bones: pb.matrix_basis = Matrix()
    for n, q in him.fist.items(): rig.pose.bones[n].rotation_quaternion = q
    bpy.context.view_layer.update()
    hp = rig.matrix_world @ rig.pose.bones['Sword'].head
    for j, d in enumerate(((-0.28, 0, 0.02), (-0.15, -0.22, 0.05), (-0.12, 0.25, 0.0), (0.0, 0.0, -0.3))):
        loc = hp + Vector(d)
        cam.location = loc; cam.rotation_euler = (hp - loc).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out, 'fist_%d.png' % j); bpy.ops.render.render(write_still=True)
    for pb in rig.pose.bones: pb.matrix_basis = Matrix()


def gripshots(him, names, out):
    """his sword hand and forearm at four moments of each clip, close, from his right-front"""
    rig = him.rig; cam = shotcam()
    sc.render.resolution_x = 300; sc.render.resolution_y = 300
    for n in names:
        tr = rig.animation_data.nla_tracks.get(n)
        if not tr: continue
        act = tr.strips[0].action; rig.animation_data.action = act
        fr = act.frame_range
        for j in range(4):
            sc.frame_set(int(fr[0] + (fr[1] - fr[0]) * (0.1 + 0.27 * j))); bpy.context.view_layer.update()
            M = rig.matrix_world @ rig.pose.bones['RightHand'].matrix
            hp = M.to_translation()
            fw = (rig.matrix_world.to_3x3() @ Vector((0, -1, 0)))
            loc = hp + Vector((0.55, -0.75, 0.25))
            cam.location = loc; cam.rotation_euler = (hp - loc).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(out, '%s_grip_%d.png' % (n, j)); bpy.ops.render.render(write_still=True)
        rig.animation_data.action = None


def main():
    global sc, SHOTS
    o = args()
    SHOTS = o['shots']
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, 'rest.blend'))
    sc = bpy.context.scene
    sc.render.fps = FPS
    him = Him()
    if o['shots'] and o['only'] == {'fist'}:
        fistshots(him, o['shots']); return
    moves = {'fps': FPS, 'clips': {}}
    done = []
    for (name, folder, file, win, mode) in CLIPS:
        if o['only'] and name not in o['only']: continue
        if not os.path.exists(os.path.join(folder, file + '.fbx')):
            log('MISSING %s: %s' % (name, file)); continue
        moves['clips'][name] = bake(him, name, folder, file, win, mode)
        done.append(name)
    if o['shots']:
        os.makedirs(o['shots'], exist_ok=True)
        shots(him, done, o['shots'])
        # handshots(him, done, o['shots'])        (a close look at the fist, when it is in doubt)
        gripshots(him, done, o['shots'])
    if o['noexport']:
        return
    for tr in him.rig.animation_data.nla_tracks: tr.mute = False
    if bpy.data.objects.get('shotcam'): bpy.data.objects.remove(bpy.data.objects['shotcam'], do_unlink=True)
    bpy.ops.object.select_all(action='SELECT')
    dst = os.path.join(ROOT, 'assets', 'paladin.glb')
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_optimize_animation_size=True, export_force_sampling=True, export_frame_step=1,
                              export_extras=True, export_image_format='JPEG', export_jpeg_quality=90,
                              export_yup=True, export_apply=False, export_def_bones=False)
    log('%s: %.2f MB' % (os.path.basename(dst), os.path.getsize(dst) / 1e6))
    json.dump(moves, open(os.path.join(ROOT, 'assets', 'paladin-moves.json'), 'w'), separators=(',', ':'))
    log('paladin-moves.json: %.0f KB' % (os.path.getsize(os.path.join(ROOT, 'assets', 'paladin-moves.json')) / 1024))


main()
