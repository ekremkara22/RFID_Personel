"""Generate millimetre STL files. Requires manifold3d, trimesh, networkx and matplotlib."""
from pathlib import Path
import sys, json
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path.home() / '.codex' / 'cad-deps-01a077cb'))
import manifold3d as m
import trimesh
import numpy as np

OUT = Path(__file__).resolve().parent
W, D, H, WALL, FLOOR, LID = 150, 110, 52, 2.5, 3, 3

def box(x,y,z,a,b,c):
    return m.Manifold.cube((a,b,c)).translate((x,y,z))

def cyl(x,y,z,r,h):
    return m.Manifold.cylinder(h,r,circular_segments=64).translate((x,y,z))

def rounded(x,y,z,w,d,h,r):
    s = box(x+r,y,z,w-2*r,d,h) + box(x,y+r,z,w,d-2*r,h)
    for xx in (x+r,x+w-r):
        for yy in (y+r,y+d-r): s += cyl(xx,yy,z,r,h)
    return s

corners = [(x,y) for x in (7,143) for y in (7,103)]
base = rounded(0,0,0,W,D,H,6) - rounded(WALL,WALL,FLOOR,W-2*WALL,D-2*WALL,H,3.5)
for x,y in corners:
    base += cyl(x,y,0,5.5,H)
    base -= cyl(x,y,38,1.35,15)
# Two multi-position rails for a 50 mm perfboard, and two for an ESP32.
for x,y,length in [(12,52,50),(12,96,50),(115,16,27),(115,68,27)]:
    base += box(x,y,2.8,length,6,5.2)
    for xx in np.arange(x+3,x+length-2,5):
        base -= cyl(float(xx),y+3,3.4,1.1,4.8)
# Oversized side cable opening. Exact USB position is module dependent.
base -= box(146,25,7,5,18,13)

# Lid is already oriented outer face down for printing.
lid = rounded(0,0,0,W,D,LID,6)
lid -= box(39.5,74,-1,71,24,6)
for x,y in corners:
    lid -= cyl(x,y,-0.1,1.7,3.2)
    lid -= m.Manifold.cylinder(1.6,3.2,1.7,circular_segments=64).translate((x,y,0))
# Locating skirt: 0.35 mm lateral clearance to body; corner posts avoided.
for x,y,a,b in [(15,2.85,120,1.2),(15,105.95,120,1.2),(2.85,15,1.2,80),(145.95,15,1.2,80)]:
    lid += box(x,y,2.8,a,b,2.2)
# Assumed LCD PCB 80 x 36 mm, hole centres 75 x 31 mm.
for x in (37.5,112.5):
    for y in (70.5,101.5):
        lid += cyl(x,y,2.8,3.4,4.2)
        lid -= cyl(x,y,3.7,1.1,3.5)
# RC522 60 x 40 mm pocket, 0.5 mm edge clearance, 1.4 mm plastic at tap zone.
lid -= box(44.5,11.5,1.4,61,41,2)
# Low retaining edges outside the reader pocket; adhesive retains board.
for x,y,a,b in [(43,11,1.5,42),(105.5,11,1.5,42),(43,10,64,1.5),(43,52.5,64,1.5)]:
    lid += box(x,y,2.8,a,b,1.2)

report = {}
meshes = {}
for name,solid in [('govde',base),('kapak',lid)]:
    raw = solid.simplify(0.001).to_mesh64()
    mesh = trimesh.Trimesh(vertices=raw.vert_properties[:,:3],faces=raw.tri_verts,process=True)
    assert mesh.is_watertight and mesh.is_winding_consistent and mesh.volume > 0
    assert len(mesh.split()) == 1, 'Disconnected printable body'
    path = OUT / f'{name}.stl'
    mesh.export(path)
    check = trimesh.load_mesh(path)
    assert check.is_watertight and check.is_winding_consistent
    meshes[name] = mesh
    report[name] = dict(watertight=bool(check.is_watertight),consistent_winding=bool(check.is_winding_consistent),connected_bodies=len(check.split()),bounds_mm=check.bounds.tolist(),volume_cm3=round(check.volume/1000,2),triangles=len(check.faces))
# Verify no body/lid interference at assembled position.
assembled_lid = lid.mirror((0,0,1)).translate((0,0,55))
assert (base ^ assembled_lid).volume() < 1e-5
report['assembled'] = {'external_dimensions_mm':[150,110,55],'body_lid_intersection_mm3':round((base ^ assembled_lid).volume(),8)}
(OUT/'mesh_validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
fig = plt.figure(figsize=(13,6),facecolor='white')
for i,(name,mesh) in enumerate(meshes.items(),1):
    ax=fig.add_subplot(1,2,i,projection='3d')
    light=np.array([-0.4,-0.5,0.76]); light/=np.linalg.norm(light)
    brightness=0.58+0.42*np.maximum(0,mesh.face_normals@light)
    colors=brightness[:,None]*np.array([0.65,0.78,0.85])[None,:]
    poly=Poly3DCollection(mesh.triangles,facecolor=colors,edgecolor='none',linewidth=0,alpha=1)
    ax.add_collection3d(poly)
    ax.set(xlim=(0,150),ylim=(0,110),zlim=(0,55),xlabel='X (mm)',ylabel='Y (mm)',zlabel='Z (mm)')
    ax.set_box_aspect((150,110,55)); ax.view_init(elev=48,azim=-65)
    ax.set_title('Gövde — açık üst yüzey' if name=='govde' else 'Kapak — iç yüzey / baskı yönü')
fig.suptitle('RFID kutusu | Gerçek STL geometrisi | 150 × 110 × 55 mm',fontsize=16)
fig.tight_layout()
fig.savefig(OUT/'model_onizleme.png',dpi=170)
print(json.dumps(report,indent=2))
