"""Millimetre CAD, edit olculer.json then run. pip install manifold3d trimesh networkx numpy matplotlib"""
from pathlib import Path
import json, sys, zipfile
sys.path.insert(0,str(Path.home()/'.codex/cad-deps-01a077cb'))
import manifold3d as M
import trimesh
import numpy as np
OUT=Path(__file__).resolve().parent
P=json.loads((OUT/'olculer.json').read_text(encoding='utf-8'))
C=P['case']; W=C['width']; D=C['depth']; H=C['body_height']; T=C['lid']; F=C['floor']; wall=C['wall']
def box(x,y,z,a,b,c): return M.Manifold.cube((a,b,c)).translate((x,y,z))
def cy(x,y,z,r,h): return M.Manifold.cylinder(h,r,circular_segments=64).translate((x,y,z))
def along_y(x,y,z,r,h): return M.Manifold.cylinder(h,r,circular_segments=64).rotate((-90,0,0)).translate((x,y,z))
def rounded(x,y,z,w,d,h,r):
    s=box(x+r,y,z,w-2*r,d,h)+box(x,y+r,z,w,d-2*r,h)
    for a in (x+r,x+w-r):
        for b in (y+r,y+d-r): s+=cy(a,b,z,r,h)
    return s
def holes(part):
    if 'hole_offsets' in part:
        return [(part['center'][0]+x,part['center'][1]+y) for x,y in part['hole_offsets']]
    x,y=part['center']; a,b=part['holes']
    return [(x+i*a/2,y+j*b/2) for i in (-1,1) for j in (-1,1)]
def mounts(s,part,z):
    height=part['standoff']
    for x,y in holes(part):
        s+=cy(x,y,z-0.2,3.5,height+0.2)
        s-=cy(x,y,z+0.8,part['pilot']/2,height)
    return s

corners=[(x,y) for x in (7,W-7) for y in (7,D-7)]
base=rounded(0,0,0,W,D,H,6)-rounded(wall,wall,F,W-2*wall,D-2*wall,H,3.5)
for x,y in corners:
    base+=cy(x,y,0,5.5,H)
    base-=cy(x,y,H-14,1.35,15)
base=mounts(base,P['esp32'],F)
base=mounts(base,P['perfboard'],F)
# Micro USB access on LEFT wall. Board longitudinal axis points to this wall.
ex,ey=P['esp32']['center']
usb_z=F+P['esp32']['standoff']-1
base-=box(-1,ey-8,usb_z,wall+2,16,12)

# PCB-style barrel jack on right side: open-top cradle with removable clamp.
j=P['jack']; clear=j['clearance']; jy=27
jack_front=W-1; jack_back=jack_front-j['body_length']; jack_floor=F+j['terminal_clearance']
yl=jy-j['body_width']/2-clear; yr=jy+j['body_width']/2+clear
roof=jack_floor+j['body_height']+3
# Recess into the side wall leaves a 1 mm front shoulder to resist plug extraction.
base-=box(W-wall-0.2,yl,jack_floor-0.1,wall-0.8,yr-yl,j['body_height']+0.5)
port=M.Manifold.cylinder(4,3.6,circular_segments=64).rotate((0,90,0)).translate((W-3,jy,jack_floor+6.4))
base-=port
# Rear shoulder: central opening clears solder terminals.
base+=box(jack_back-2.5,yl-2.2,F-0.2,2.3,yr-yl+4.4,roof-F+0.2)
base-=box(jack_back-3,yl+1,F+0.3,3.5,yr-yl-2,jack_floor-F+1)
for yy in (yl-2.2,yr):
    base+=box(jack_back-2.5,yy,F-0.2,W-wall-(jack_back-2.5)+0.1,2.2,roof-F+0.2)
# Narrow supports under the two housing edges leave the terminal middle free.
for yy in (jy-j['body_width']/2,jy+j['body_width']/2-1):
    base+=box(jack_back,yy,F-0.2,j['body_length']-1,1,jack_floor-F+0.2)
# Side switching terminal protrudes beyond the housing; leave a solder/wire channel.
base-=box(jack_front-12.8,yr-0.2,F+0.3,4,3,jack_floor-F+0.8)
clamp_x=W-15; clamp_y=yl-6.5; clamp_d=yr-yl+13
for yy in (clamp_y+3,clamp_y+clamp_d-3):
    base+=cy(clamp_x+6,yy,F-0.2,3.6,roof-F+0.2)
    base-=cy(clamp_x+6,yy,F+1,1.1,roof-F)
clamp=rounded(0,0,0,12,clamp_d,3,2)
pad_depth=roof-(jack_floor+j['body_height']+0.2)
clamp+=box(3,6.85,2.8,7,j['body_width']-0.1,pad_depth+0.2)
for yy in (3,clamp_d-3): clamp-=cy(6,yy,-0.1,1.4,3.2)

# Lid, outward face on print bed; all component screw bosses on inner side.
lid=rounded(0,0,0,W,D,T,6)
lcd=P['lcd']; lx,ly=lcd['center']; wx,wy=lcd['window']
lid-=box(lx-wx/2,ly-wy/2,-1,wx,wy,T+2)
for x,y in corners:
    lid-=cy(x,y,-0.1,1.7,T+0.2)
    lid-=M.Manifold.cylinder(1.6,3.2,1.7,circular_segments=64).translate((x,y,0))
for x,y,a,b in [(15,2.85,W-30,1.2),(15,D-4.05,W-30,1.2),(2.85,15,1.2,D-30),(W-4.05,15,1.2,D-30)]:
    lid+=box(x,y,T-0.2,a,b,2.2)
lid=mounts(lid,lcd,T)
r=P['rc522']; rx,ry=r['center']; rw,rd=r['pcb']
lid-=box(rx-rw/2-0.5,ry-rd/2-0.5,r['tap_wall'],rw+1,rd+1,T)
# Screw posts originate at the thin pocket floor, PCB underside at T+standoff.
for x,y in holes(r):
    lid+=cy(x,y,r['tap_wall']-0.2,3.4,T+r['standoff']-r['tap_wall']+0.2)
    lid-=cy(x,y,r['tap_wall']+0.6,r['pilot']/2,T+r['standoff'])

# LEDs now mount perpendicular to the lid; split collars face the box interior.
for x,y in P['led']['centers']:
    collar=cy(x,y,T-0.2,4.3,3.7)
    collar-=cy(x,y,T-0.3,P['led']['bore']/2,4)
    collar-=box(x-0.45,y,T+0.3,0.9,5,4)
    lid+=collar
    lid-=cy(x,y,-1,P['led']['exit']/2,T+1.05)

# Buzzer on lid right of the reader, with front acoustic grille and rear-open sleeve.
buzzer_config=P['buzzer']; bx,by=buzzer_config['center']; sleeve_depth=buzzer_config['height']
sleeve=cy(bx,by,T-0.2,buzzer_config['diameter']/2+1.7,sleeve_depth+0.2)
sleeve-=cy(bx,by,T-0.3,buzzer_config['bore']/2,sleeve_depth+0.6)
for dx in (-7.4,0):
    sleeve-=box(bx+dx,by-0.45,T+1,7.4,0.9,sleeve_depth)
lid+=sleeve
for dx,dy in [(0,0),(-2.4,0),(2.4,0),(0,-2.4),(0,2.4)]:
    lid-=cy(bx+dx,by+dy,-1,0.8,T+2)

# Small press-fit gauge. Print and test before the enclosure.
gauge=box(0,0,0,75,22,2)
for x,d in [(8,4.8),(23,4.9),(38,5.0)]:
    gauge+=cy(x,11,1.8,4.3,4.2)
    gauge-=cy(x,11,-1,d/2,8)
    gauge-=box(x-0.4,11,2.5,0.8,5,4)
for x,d in [(53,10.85),(68,11.05)]:
    gauge+=cy(x,11,1.8,6.8,4.2)
    gauge-=cy(x,11,-1,d/2,8)
    gauge-=box(x-0.4,11,2.5,0.8,8,4)

# Print lid inner face upward. Mirror Y here so assembly requires a real 180-degree
# X rotation, not an impossible reflection; layout coordinates above are assembly XY.
lid_print=lid.mirror((0,1,0)).translate((0,D,0))
parts={'govde_v3':base,'kapak_v3':lid_print,'guc_jaki_baski_parcasi':clamp,'sikilik_testi':gauge}
report={}; meshes={}
for name,solid in parts.items():
    raw=solid.simplify(0.0005).to_mesh64()
    mesh=trimesh.Trimesh(raw.vert_properties[:,:3],raw.tri_verts,process=True)
    assert mesh.is_watertight and mesh.is_winding_consistent, name
    assert len(mesh.split())==1 and mesh.volume>0,name
    mesh.export(OUT/(name+'.stl'))
    check=trimesh.load_mesh(OUT/(name+'.stl'))
    assert check.is_watertight and check.is_winding_consistent and len(check.split())==1,name
    report[name]={'closed_surface':True,'single_body':True,'triangles':len(check.faces),'dimensions_mm':check.extents.tolist(),'volume_cm3':round(check.volume/1000,2)}
    meshes[name]=mesh
jack_envelope=box(jack_back,jy-j['body_width']/2,jack_floor,j['body_length'],j['body_width'],j['body_height'])
report['jack_body_clearance_mm3']=abs((base^jack_envelope).volume())
assert report['jack_body_clearance_mm3']<0.001
lid_asm=lid_print.rotate((180,0,0)).translate((0,D,H+T))
clamp_asm=clamp.mirror((0,0,1)).translate((clamp_x,clamp_y,roof+3))
for label,a,b in [('govde_kapak',base,lid_asm),('govde_jak_baskisi',base,clamp_asm),('kapak_jak_baskisi',lid_asm,clamp_asm)]:
    v=abs((a^b).volume()); assert v<0.001,(label,v)
    report[label+'_intersection_mm3']=v
# Conservative PCB/component envelopes, with screw bosses excluded at their intended interfaces.
envelopes={}
for name in ('esp32','perfboard','lcd','rc522'):
    p=P[name]; x,y=p['center']; a,b=p['pcb']
    if name in ('esp32','perfboard'):
        z=F+p['standoff']; h=18 if name=='perfboard' else 8
    else:
        h=12 if name=='lcd' else 6; z=H-p['standoff']-h
    envelopes[name]=box(x-a/2,y-b/2,z,a,b,h)
# Include lid-mounted holders and wire clearance in assembled position.
for k,(x,y) in enumerate(P['led']['centers'],1):
    envelopes[f'led_{k}']=cy(x,y,H-15,4.3,15)
envelopes['buzzer']=cy(bx,by,H-sleeve_depth-6,buzzer_config['diameter']/2+1.7,sleeve_depth+6)
envelopes['jack']=jack_envelope
names=list(envelopes)
for i,a in enumerate(names):
    for b in names[i+1:]:
        vol=abs((envelopes[a]^envelopes[b]).volume()); assert vol<0.001,(a,b,vol)
report['component_envelopes']='No overlaps for assumed dimensions; excludes wires, solder pins, and actual user PCB variations.'
# Explicit mounting-column separation: a connected STL alone cannot detect merged bosses.
points=[(name,x,y) for name in ('esp32','perfboard') for x,y in holes(P[name])]
separations={}
for name in ('esp32','perfboard'):
    clearance=min(np.hypot(x-a,y-b)-3.5-5.5 for n,x,y in points if n==name for a,b in corners)
    assert clearance>=10,(name,clearance)
    separations[name+'_to_main_columns_edge_gap_mm']=round(float(clearance),3)
gap=min(np.hypot(x-a,y-b)-7 for i,(_,x,y) in enumerate(points) for _,a,b in points[i+1:])
assert gap>=10,gap
separations['all_board_bosses_min_edge_gap_mm']=round(float(gap),3)
for name in ('esp32','perfboard'):
    p=P[name]; x,y=p['center']; w,d=p['pcb']
    distances=[]
    for a,b in corners:
        dx=max(x-w/2-a,0,a-x-w/2); dy=max(y-d/2-b,0,b-y-d/2)
        distances.append(np.hypot(dx,dy)-5.5)
    assert min(distances)>=5,(name,distances)
    separations[name+'_pcb_to_main_columns_mm']=round(float(min(distances)),3)
# Above the shared floor, every ESP/perfboard support is a separate island.
isolated=(base^box(0,0,F+0.2,W,D,min(P['esp32']['standoff'],P['perfboard']['standoff'])-0.4)).decompose()
for name,x,y in points:
    # A thin ring at each boss top must not contain any other mounting centre.
    owner=[s for s in isolated if abs((s^cy(x,y,F+0.3,3.4,0.3)).volume())>0.1]
    assert len(owner)==1,(name,x,y)
    for n,a,b in points:
        if (a,b)!=(x,y): assert abs((owner[0]^cy(a,b,F+0.3,3.4,0.3)).volume())<0.001
report['mounting_clearances']=separations
(OUT/'kontrol.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
def raster(mesh):
    # Orthographic software z-buffer avoids painter-order artifacts on concave STL meshes.
    az=np.radians(-65); el=np.radians(54)
    view=np.array([np.cos(el)*np.cos(az),np.cos(el)*np.sin(az),np.sin(el)])
    right=np.array([-np.sin(az),np.cos(az),0]); up=np.cross(view,right)
    basis=np.array([right,up,view]); pts=mesh.vertices@basis.T
    scale=min(910/np.ptp(pts[:,0]),710/np.ptp(pts[:,1])); mins=pts[:,:2].min(axis=0)
    def project(p):
        q=np.asarray(p)@basis.T
        return np.array([45+(q[0]-mins[0])*scale,765-(q[1]-mins[1])*scale])
    pix=np.c_[45+(pts[:,0]-mins[0])*scale,765-(pts[:,1]-mins[1])*scale,pts[:,2]]
    canvas=np.full((820,1000,3),248,dtype=np.uint8); depth=np.full((820,1000),-np.inf)
    light=np.array([-0.35,-0.45,0.82]); light/=np.linalg.norm(light)
    colors=(np.array([163,196,215])[None,:]*(0.48+0.52*np.maximum(0,mesh.face_normals@light))[:,None]).astype(np.uint8)
    for k,face in enumerate(mesh.faces):
        t=pix[face]; x0=max(0,int(np.floor(t[:,0].min()))); x1=min(999,int(np.ceil(t[:,0].max())))
        y0=max(0,int(np.floor(t[:,1].min()))); y1=min(819,int(np.ceil(t[:,1].max())))
        if x1<x0 or y1<y0: continue
        a,b,c=t; den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-8: continue
        xx,yy=np.meshgrid(np.arange(x0,x1+1)+0.5,np.arange(y0,y1+1)+0.5)
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den; w=1-u-v
        z=u*a[2]+v*b[2]+w*c[2]; target=depth[y0:y1+1,x0:x1+1]
        mask=(u>=-1e-6)&(v>=-1e-6)&(w>=-1e-6)&(z>target)
        target[mask]=z[mask]; canvas[y0:y1+1,x0:x1+1][mask]=colors[k]
    return canvas,project
fig=plt.figure(figsize=(15,7),facecolor='white')
for index,name in enumerate(['govde_v3','kapak_v3'],1):
    ax=fig.add_subplot(1,2,index); mesh=trimesh.load_mesh(OUT/(name+'.stl'))
    rendered,project=raster(mesh); ax.imshow(rendered); ax.axis('off')
    if index==1:
        labels=[(30,55,13,'ESP32 / 4 ayrı ayak'),(105,70,13,'Plaket / 4 ayrı ayak'),(140,27,27,'Güç jakı')]
    else: labels=[(75,84,13,'LCD'),(75,32,9,'RC522'),(24,33,9,'2 LED'),(126,32,14,'Buzzer')]
    for x,y,z,label in labels:
        if index==2: y=D-y
        px,py=project((x,y,z)); ax.text(px,py,label,fontsize=8,color='#132c43',ha='center',bbox=dict(facecolor='white',alpha=0.8,edgecolor='none',pad=2))
    ax.set_title('GÖVDE — iç görünüm' if index==1 else 'KAPAK — iç görünüm / baskı yönü')
fig.suptitle('RFID KUTUSU V3 • 150 × 110 × 55 mm\nLED ve buzzer kapakta • Gövde vida ayakları ayrıldı',fontsize=16)
fig.tight_layout(rect=(0,0,1,0.88)); fig.savefig(OUT/'onizleme.png',dpi=160); plt.close(fig)

# Dimensioned top-view drawing, independent of any illustrative render.
from matplotlib.patches import Rectangle,Circle
fig,axes=plt.subplots(1,2,figsize=(13,6))
for ax,title,nameset in [(axes[0],'Gövde: üstten montaj planı',['esp32','perfboard']),(axes[1],'Kapak: baskı yönünde iç yüz',['lcd','rc522'])]:
    ax.add_patch(Rectangle((0,0),W,D,fill=False,lw=2))
    for xx,yy in corners: ax.add_patch(Circle((xx,yy),5.5,facecolor='#ddd',edgecolor='#777'))
    for name in nameset:
        p=P[name]; x,y=p['center']; w,d=p['pcb']
        if ax is axes[1]: y=D-y
        ax.add_patch(Rectangle((x-w/2,y-d/2),w,d,facecolor='#e5eef5',edgecolor='#37617c'))
        for xx,yy in holes(p):
            if ax is axes[1]: yy=D-yy
            ax.add_patch(Circle((xx,yy),3.5,fill=False,edgecolor='#a54136'))
            ax.add_patch(Circle((xx,yy),1.2,color='#a54136'))
        ht=f'Delik: {p["holes"][0]} × {p["holes"][1]}' if name!='rc522' else 'Sıra arası: 37.39\nSıra enleri: 34 / 24.91'
        ax.text(x,y,f'{name}\nPCB: {w} × {d}\n{ht}',ha='center',va='center',fontsize=9)
    ax.set(xlim=(-6,W+6),ylim=(-6,D+6),aspect='equal',xlabel='mm',ylabel='mm',title=title); ax.grid(alpha=0.2)
axes[0].annotate('Micro USB',xy=(0,55),xytext=(8,29),arrowprops={'arrowstyle':'->'})
axes[0].add_patch(Rectangle((jack_back,yl),j['body_length'],yr-yl,fill=False,edgecolor='brown'))
axes[0].text(135,41,'Güç jakı',ha='center',fontsize=9)
axes[0].text(68,10,'Ana sütun / plaket ayağı boşluğu ≥ 10,98 mm',ha='center',fontsize=8)
for xx,yy in P['led']['centers']:
    axes[1].add_patch(Circle((xx,D-yy),4.3,facecolor='#ffdf70',edgecolor='#b98c00'))
axes[1].text(24,D-54,'LED',ha='center',fontsize=9)
axes[1].add_patch(Circle((bx,D-by),buzzer_config['diameter']/2+1.7,facecolor='#ccc',edgecolor='#555'))
axes[1].text(bx,D-by+12,'Buzzer',ha='center',fontsize=9)
fig.suptitle('TASLAK MONTAJ ÖLÇÜLERİ — merkezden merkeze, mm',fontsize=14)
fig.tight_layout(); fig.savefig(OUT/'montaj_plani.png',dpi=160); plt.close(fig)
print(json.dumps(report,indent=2))
