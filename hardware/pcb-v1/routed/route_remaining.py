"""Locally route native KiCad DRC airwires on a two-layer clearance grid.

The output is only a candidate: native KiCad DRC is mandatory afterwards.
No checks are excluded. Existing copper and the mechanical keepouts are obstacles.
"""
from pathlib import Path
import json,sys,math,heapq,uuid,re
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,children,child
STEP=.1; X0=4; Y0=39; NX=1281; NY=581; N=NX*NY
LAYERS=['F.Cu','B.Cu']
D=json.loads((HERE/'design.json').read_text(encoding='utf-8'))
path=HERE/'rfid_carrier_v01.kicad_pcb'
tree=parse(path)
codes={n[2]:int(n[1]) for n in children(tree,'net')}
names={v:k for k,v in codes.items()}
objects=[];lookup={}; additions=[]
def obj(o,node=None):
 objects.append(o)
 if node is not None:
  ids=children(node,'tstamp') or children(node,'uuid')
  if ids:lookup[ids[0][1]]=o
for fp in children(tree,'footprint'):
 x,y=map(float,child(fp,'at')[1:3])
 for p in children(fp,'pad'):
  px,py=map(float,child(p,'at')[1:3]);diam=float(child(p,'size')[1])
  nets=children(p,'net'); net=nets[0][2] if nets else None
  obj(dict(kind='rect' if p[3]=='rect' else 'circle',x=x+px,y=y+py,r=diam/2,drill=float(child(p,'drill')[1]),net=net,layers=[0,1]),p)
for seg in children(tree,'segment'):
 obj(dict(kind='line',a=list(map(float,child(seg,'start')[1:3])),b=list(map(float,child(seg,'end')[1:3])),r=float(child(seg,'width')[1])/2,net=names[int(child(seg,'net')[1])],layers=[LAYERS.index(child(seg,'layer')[1])]),seg)
for via in children(tree,'via'):
 x,y=map(float,child(via,'at')[1:3])
 obj(dict(kind='circle',x=x,y=y,r=float(child(via,'size')[1])/2,drill=float(child(via,'drill')[1]),net=names[int(child(via,'net')[1])],layers=[0,1]),via)

def paint(mask,o,margin):
 r=o['r']+margin
 if o['kind']=='line':
  ax,ay=o['a'];bx,by=o['b'];xlo=min(ax,bx)-r;xhi=max(ax,bx)+r;ylo=min(ay,by)-r;yhi=max(ay,by)+r
 else:
  ax,ay=o['x'],o['y'];xlo=ax-r;xhi=ax+r;ylo=ay-r;yhi=ay+r
 i0=max(0,math.floor((xlo-X0)/STEP));i1=min(NX-1,math.ceil((xhi-X0)/STEP))
 j0=max(0,math.floor((ylo-Y0)/STEP));j1=min(NY-1,math.ceil((yhi-Y0)/STEP))
 if i1<i0 or j1<j0:return
 yy,xx=np.mgrid[j0:j1+1,i0:i1+1];xx=xx*STEP+X0;yy=yy*STEP+Y0
 if o['kind']=='line':
  dx=bx-ax;dy=by-ay;t=np.clip(((xx-ax)*dx+(yy-ay)*dy)/max(dx*dx+dy*dy,1e-20),0,1)
  hit=(xx-ax-t*dx)**2+(yy-ay-t*dy)**2<=r*r
 elif o['kind']=='rect':
  hit=np.maximum(abs(xx-ax)-o['r'],0)**2+np.maximum(abs(yy-ay)-o['r'],0)**2<=margin*margin
 else:hit=(xx-ax)**2+(yy-ay)**2<=r*r
 for l in o['layers']:mask[l,j0:j1+1,i0:i1+1]|=hit

def masks(net,width):
 track=np.zeros((2,NY,NX),dtype=bool);via=np.zeros_like(track)
 for mask,rad in [(track,width/2),(via,.5)]:
  yy,xx=np.mgrid[:NY,:NX];xx=xx*STEP+X0;yy=yy*STEP+Y0
  outside=(xx<X0+.5+rad)|(xx>132-.5-rad)|(yy<Y0+.5+rad)|(yy>97-.5-rad)
  a,b,c,d=D['antenna_keepout_provisional']
  outside|=(xx>=a-rad-.03)&(xx<=c+rad+.03)&(yy>=b-rad-.03)&(yy<=d+rad+.03)
  for x,y,h in D['holes']:outside|=(xx-x)**2+(yy-y)**2<((3 if h==2.8 else 3.5)+rad+.03)**2
  mask[:]=outside
  for o in objects:
   if o['net']!=net:paint(mask,o,rad+.205)
   elif mask is via and 'drill' in o:
    paint(mask,dict(kind='circle',x=o['x'],y=o['y'],r=o['drill']/2,layers=[0,1]),.53)
 return track.reshape(-1),np.any(via,axis=0).reshape(-1)

def gridpt(x,y,l):return l*N+round((y-Y0)/STEP)*NX+round((x-X0)/STEP)
def xy(n):return [X0+(n%N%NX)*STEP,Y0+(n%N//NX)*STEP]
def pointdist(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/max(dx*dx+dy*dy,1e-20)))
 return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def ends(o):return (o['a'],o['b']) if o['kind']=='line' else ([o['x'],o['y']],[o['x'],o['y']])
def touch(a,b):
 if not set(a['layers'])&set(b['layers']):return False
 p,q=ends(a);r,s=ends(b)
 def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 intersect=cross(p,q,r)*cross(p,q,s)<0 and cross(r,s,p)*cross(r,s,q)<0
 dist=0 if intersect else min(pointdist(p,r,s),pointdist(q,r,s),pointdist(r,p,q),pointdist(s,p,q))
 return dist<=a['r']+b['r']+1e-6
def component(seed,net):
 found=[seed];remaining=[o for o in objects if o['net']==net and o is not seed]
 for cur in found:
  hit=[o for o in remaining if touch(cur,o)]
  found+=hit;remaining=[o for o in remaining if not any(o is h for h in hit)]
 return found
def seeds(items,blocked):
 mask=np.zeros((2,NY,NX),dtype=bool)
 for o in items:
  oo=dict(o)
  if oo['kind']=='rect':oo['kind']='circle'
  paint(mask,oo,-.05)
 return np.flatnonzero(mask.reshape(-1)&~blocked)
def route(start,end,net,width):
 blocked,vblocked=masks(net,width)
 source=seeds(component(lookup[start['uuid']],net),blocked)
 goalnodes=seeds(component(lookup[end['uuid']],net),blocked)
 if not len(source) or not len(goalnodes):print('BLOCKED ENDPOINT',net,flush=True);return None
 goals=set(goalnodes);gx0=int(min(goalnodes%N%NX));gx1=int(max(goalnodes%N%NX));gy0=int(min(goalnodes%N//NX));gy1=int(max(goalnodes%N//NX))
 def h(n):
  dx=max(gx0-n%N%NX,n%N%NX-gx1,0);dy=max(gy0-n%N//NX,n%N//NX-gy1,0)
  return max(dx,dy)+.41421356*min(dx,dy)
 dist=np.full(2*N,np.inf); prev=np.full(2*N,-1,dtype=np.int32);heap=[]
 for n in source:dist[n]=0;heapq.heappush(heap,(h(n),0,n))
 moves=[(-1,0,1),(1,0,1),(0,-1,1),(0,1,1),(-1,-1,1.41421356),(-1,1,1.41421356),(1,-1,1.41421356),(1,1,1.41421356)]
 while heap:
  _,cost,n=heapq.heappop(heap)
  if cost>dist[n]+1e-9:continue
  if n in goals:
   out=[]
   while n>=0:out.append(n);n=int(prev[n])
   return out[::-1]
  x=n%N%NX;y=n%N//NX;l=n//N
  for dx,dy,c in moves:
   if not(0<=x+dx<NX and 0<=y+dy<NY):continue
   m=n+dy*NX+dx
   if blocked[m]:continue
   if dx and dy and (blocked[n+dx] or blocked[n+dy*NX]):continue
   nc=cost+c
   if nc+1e-9<dist[m]:dist[m]=nc;prev[m]=n;heapq.heappush(heap,(nc+h(m),nc,m))
  if not vblocked[n%N]:
   m=(1-l)*N+n%N;nc=cost+16
   if not blocked[m] and nc<dist[m]:dist[m]=nc;prev[m]=n;heapq.heappush(heap,(nc+h(m),nc,m))
 return None

def segment(a,b,layer,net,width):
 if math.dist(a,b)<1e-8:return
 additions.append(f'(segment (start {a[0]:.6f} {a[1]:.6f}) (end {b[0]:.6f} {b[1]:.6f}) (width {width}) (layer "{LAYERS[layer]}") (net {codes[net]}) (tstamp {uuid.uuid4()}))')
 obj(dict(kind='line',a=a,b=b,r=width/2,net=net,layers=[layer]))

report=json.loads((HERE/sys.argv[1]).read_text(encoding='utf-8'))
issues=report['unconnected_items']
for issue in issues:
 for item in issue['items']:
  if item['uuid'] not in lookup:
   matches=[o for o in objects if o['kind']!='line' and math.dist([o['x'],o['y']],list(item['pos'].values()))<.001]
   assert len(matches)==1,(item,matches)
   lookup[item['uuid']]=matches[0]
# Longer bridge connections first; the native report already gives a spanning set.
issues.sort(key=lambda e:(0 if lookup[e['items'][0]['uuid']]['net']=='ESP_VIN' else 1,-math.dist(list(e['items'][0]['pos'].values()),list(e['items'][1]['pos'].values()))))
failed=[]
for issue in issues:
 a,b=issue['items'];net=lookup[a['uuid']]['net'];width=.5 if net in ['+5V_IN','+5V','ESP_VIN','+3V3','GND','BUZZ_NEG'] else .3
 if net=='ESP_VIN':width=.3
 if net in ['GPIO22','GPIO32']:width=.25
 if net=='GPIO32':width=.2
 p=route(a,b,net,width)
 if p is None:failed.append(net);print('FAILED',net,flush=True);continue
 points=[(xy(n),n//N) for n in p]
 # Collapse collinear grid steps without changing their geometry.
 simple=[]
 for point in points:
  if simple and point==simple[-1]:continue
  while len(simple)>1 and point[1]==simple[-1][1]==simple[-2][1]:
   aa,bb,cc=simple[-2][0],simple[-1][0],point[0]
   if abs((bb[0]-aa[0])*(cc[1]-bb[1])-(bb[1]-aa[1])*(cc[0]-bb[0]))>1e-9:break
   simple.pop()
  simple.append(point)
 for (aa,la),(bb,lb) in zip(simple,simple[1:]):
  if la==lb:segment(aa,bb,la,net,width)
  else:
   assert aa==bb
   additions.append(f'(via (at {aa[0]} {aa[1]}) (size 1) (drill .5) (layers "F.Cu" "B.Cu") (net {codes[net]}) (tstamp {uuid.uuid4()}))')
   obj(dict(kind='circle',x=aa[0],y=aa[1],r=.5,drill=.5,net=net,layers=[0,1]))
 print('ROUTED',net,len(simple),'corners',flush=True)
base=path.read_text(encoding='utf-8').rstrip()
path.write_text(base[:-1]+'\n'+'\n'.join(additions)+'\n)\n',encoding='utf-8')
print('Added',len(additions),'items; failed',failed,flush=True)
