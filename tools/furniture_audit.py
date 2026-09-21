#!/usr/bin/env python3
"""Audit the wreck's furniture: a box on everything, and nothing inside
anything else.

    python3 tools/furniture_audit.py            # reads models/shipwreck.js
    python3 tools/furniture_audit.py --props p.json

Four questions, and it answers them off the PLAN in `models/shipwreck.js`
rather than off the running game, so it can be asked before anything is
loaded:

  1. does every piece have a solid box at all — the tipped stool did not;
  2. does any piece's turned footprint meet another's — a barrel was 15 cm
     inside the next barrel, a chair was standing in the end of the gutting
     bench, and neither shows in a screenshot taken from the other side;
  3. does any piece meet the wreck's OWN solid gear (her bulkhead, her
     stove, her sea chest, the barricade), which comes in as `--props`, the
     array `shipwreck.userData.nav.props` hands out;
  4. and does any piece stand through her planking, which is `halfAtY` at
     the piece's own station and its own height — not an eyeball.

A CYLINDER IS A CIRCLE. Testing a barrel by its axis-aligned box
overestimates it by 0.41r and moves casks that are already clear.

AND A SEPARATING-AXIS TEST MUST RETURN THE BEST AXIS, NOT THE FIRST. Written
to return the first axis that separates, it reported two boxes ELEVEN METRES
APART as two centimetres clear — true, and useless, because the number it
hands back is then a lower bound nobody can threshold on.
"""
import math, re, sys, json
SZ={'table_3':(1.374,0.825,0.894),'table_2':(1.311,0.801,0.959),'table_1':(2.054,0.918,1.129),
'chair_5':(0.524,0.952,0.523),'chair_4':(0.452,0.502,0.438),'chair_3':(0.430,0.952,0.507),
'chair_2':(0.430,0.952,0.507),'chair_1':(0.391,0.773,0.391),'bench_5':(2.127,1.118,0.704),
'bench_4':(1.567,0.531,0.410),'bench_3':(3.310,0.531,0.410),'bench_2':(2.376,0.971,0.818),
'bench_1':(2.397,0.968,0.844),'barrel_5':(0.835,0.837,0.835),'barrel_4':(0.751,0.821,0.751),
'barrel_3':(1.066,0.862,1.131),'barrel_2':(0.568,0.994,0.568),'barrel_1':(0.777,1.005,0.571),
'bunk_bed':(1.076,1.846,2.000)}
ROUND={'barrel_5','barrel_4','barrel_2'}      # true cylinders; _1 and _3 are on their sides
HALF=13; BEAM=9.4; KEEL_Y=-1.8; DECK_Y=3.20; BULWARK=0.85; HOLD_HZ=3.70; HOLD_Y=0.25
def beamAt(x):
    u=-x/HALF
    if u>0.30: t=(u-0.30)/0.70; return max(0.02,(BEAM/2)*(1-pow(t,1.6)*0.98))
    if u<-0.70: t=(-u-0.70)/0.30; return (BEAM/2)*(1-t*t*0.55)
    return (BEAM/2)*(1-0.09*u*u)
def sectionK(v):
    t=min(1,max(0,v)); return 0.80*math.sqrt(max(0,1-pow(1-min(1,t*1.5),2)))+0.20*pow(t,0.30)
def sheerAt(x):
    u=max(-1,min(1,-x/HALF)); return 1.05*pow(max(0,u),2.0)+0.30*pow(max(0,-u),2.2)
def flareAt(x,v):
    u=-x/HALF; return 1+pow(max(0,(u-0.05)/0.95),2)*0.44*pow(v,2.2)
def halfAtY(x,y):
    xc=max(-HALF,min(HALF,x)); v=max(0,min(1,(y-KEEL_Y)/(DECK_Y+sheerAt(xc)+BULWARK-KEEL_Y)))
    return beamAt(xc)*sectionK(v)*flareAt(xc,v)
def deckHalf(x): return halfAtY(x,DECK_Y)*0.99
def soleY(x,z): return HOLD_Y-(0.05+0.035*math.sin(x*0.9+1.3)*math.cos(z*1.1)+0.028*math.sin(x*2.3-z*1.7)+0.02*math.sin(z*3.1+x*0.4))

def corners(x,z,ry,w,d):
    c,s=math.cos(ry),math.sin(ry)
    return [(x+dx*c+dz*s, z-dx*s+dz*c) for dx,dz in ((-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2))]
def sat_gap(A,B):
    """separating-axis: >0 is the clearance along the BEST separating axis,
    <=0 is the overlap depth. Returning the FIRST separating axis instead of
    the best one reported two boxes eleven metres apart as 2 cm clear."""
    best_sep=-1e9; min_ov=1e9
    for P in (A,B):
        n=len(P)
        for i in range(n):
            ax,az=P[(i+1)%n][0]-P[i][0], P[(i+1)%n][1]-P[i][1]
            L=math.hypot(ax,az) or 1; nx,nz=-az/L,ax/L
            a=[p[0]*nx+p[1]*nz for p in A]; b=[p[0]*nx+p[1]*nz for p in B]
            o=min(max(a),max(b))-max(min(a),min(b))
            if o<min_ov: min_ov=o
            if -o>best_sep: best_sep=-o
    return best_sep if best_sep>0 else -min_ov

def load_plan(path):
    src=open(path).read()
    blk=src[src.index('const PLAN = ['):]; blk=blk[:blk.index('];')]
    rows=re.findall(r"\['([a-z_0-9]+)',\s*([-\d.]+),\s*([-\d.]+),\s*([^,]+),\s*([-\d.]+),\s*([-\d.]+)(?:,\s*\{([^}]*)\})?\]", blk)
    out=[]
    for (n,x,z,yaw,w,d,o) in rows:
        out.append(dict(name=n,x=float(x),z=float(z),ry=eval(yaw.strip().replace('Math.PI','math.pi'),{'math':math}),
                        bw=float(w),bd=float(d),deck='deck' in (o or ''),opts=o or ''))
    return out

import argparse, os
_ap = argparse.ArgumentParser()
_ap.add_argument('src', nargs='?', default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models/shipwreck.js'))
_ap.add_argument('--props', default=None, help="JSON of shipwreck.userData.nav.props")
_A = _ap.parse_args()
PROPS = json.load(open(_A.props)) if _A.props else []
plan = load_plan(_A.src)
bad=0
# --- 1. does everything have a box? -----------------------------------
for p in plan:
    if p['bw']<=0 or p['bd']<=0:
        print('NO COLLISION  %-9s at %6.2f,%6.2f'%(p['name'],p['x'],p['z'])); bad+=1
# --- 2. piece vs piece --------------------------------------------------
for i in range(len(plan)):
    for j in range(i+1,len(plan)):
        a,b=plan[i],plan[j]
        if a['deck']!=b['deck']: continue
        sa,sb=SZ[a['name']],SZ[b['name']]
        if a['name'] in ROUND and b['name'] in ROUND:
            ra,rb=sa[0]/2,sb[0]/2
            gap=math.hypot(a['x']-b['x'],a['z']-b['z'])-ra-rb
        else:
            ca=corners(a['x'],a['z'],a['ry'],sa[0],sa[2]); cb=corners(b['x'],b['z'],b['ry'],sb[0],sb[2])
            gap=sat_gap(ca,cb)
        if gap<0.02:
            print('MESHES MEET   %-9s %6.2f,%6.2f  x  %-9s %6.2f,%6.2f   gap %+.3f'
                  %(a['name'],a['x'],a['z'],b['name'],b['x'],b['z'],gap)); bad+=1
# --- 3. piece vs the wreck's own solid gear -----------------------------
for p in plan:
    sa=SZ[p['name']]
    ca=corners(p['x'],p['z'],p['ry'],sa[0],sa[2])
    lo=DECK_Y+0.055 if p['deck'] else min(soleY(p['x'],p['z']),soleY(p['x'],p['z']))
    for k,b in enumerate(PROPS):
        if (b[4]>2.0)!=p['deck']: continue          # other band
        if abs(b[0]-(p['x']-p['bw']/2))<1e-6 and abs(b[1]-(p['z']-p['bd']/2))<1e-6: continue  # its own
        cb=[(b[0],b[1]),(b[2],b[1]),(b[2],b[3]),(b[0],b[3])]
        gap=sat_gap(ca,cb)
        if gap<0.0:
            print('INTO HER GEAR %-9s %6.2f,%6.2f  x  prop#%-2d %s  overlap %.3f'
                  %(p['name'],p['x'],p['z'],k,[round(v,2) for v in b[:4]],-gap)); bad+=1
# --- 4. piece vs her planking ------------------------------------------
for p in plan:
    sa=SZ[p['name']]
    c,s=abs(math.cos(p['ry'])),abs(math.sin(p['ry']))
    fw=sa[0]*c+sa[2]*s; fd=sa[0]*s+sa[2]*c
    y0=DECK_Y+0.055 if p['deck'] else min(soleY(p['x']+(i/3-0.5)*fw,p['z']+(j/3-0.5)*fd) for i in range(4) for j in range(4))
    y1=y0+sa[1]
    worst=1e9
    # a cylinder is a CIRCLE, not its own axis-aligned box: the corner test
    # overestimates a barrel by 0.41r and moves things that are already clear
    if p['name'] in ROUND:
        r=sa[0]/2
        pts=[(p['x']+r*math.cos(t*math.pi/8), p['z']+r*math.sin(t*math.pi/8)) for t in range(16)]
    else:
        pts=corners(p['x'],p['z'],p['ry'],sa[0],sa[2])
    for (cx,cz) in pts:
        for yy in (y0+0.02,(y0+y1)/2,y1-0.02):
            lim = deckHalf(cx) if p['deck'] else min(HOLD_HZ,halfAtY(cx,yy))-0.10
            worst=min(worst,lim-abs(cz))
    if worst<0.0:
        print('THROUGH HER   %-9s %6.2f,%6.2f  by %.3f'%(p['name'],p['x'],p['z'],-worst)); bad+=1
print('\n%d problems' % bad)
sys.exit(1 if bad else 0)
