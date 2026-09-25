"""Widen the routed ESP_VIN necks wherever existing copper clearance permits.

Conservative analytical geometry, followed by mandatory native DRC.
"""
from pathlib import Path
import sys,math,re
from finish_board import spans
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE.parent))
from validate_files import parse,child,children
P=HERE/'rfid_carrier_v01.kicad_pcb';tree=parse(P)
net=next(n[1] for n in children(tree,'net') if n[2]=='ESP_VIN')
obs=[]
for f in children(tree,'footprint'):
 x,y=map(float,child(f,'at')[1:3])
 for p in children(f,'pad'):
  ns=children(p,'net')
  if ns and ns[0][1]==net:continue
  px,py=map(float,child(p,'at')[1:3]);r=float(child(p,'size')[1])/2
  if p[3]=='rect':r*=math.sqrt(2)
  obs.append(([x+px,y+py],[x+px,y+py],r,[0,1]))
for s in children(tree,'segment'):
 if child(s,'net')[1]==net:continue
 obs.append((list(map(float,child(s,'start')[1:3])),list(map(float,child(s,'end')[1:3])),float(child(s,'width')[1])/2,[0 if child(s,'layer')[1]=='F.Cu' else 1]))
for v in children(tree,'via'):
 if child(v,'net')[1]==net:continue
 p=list(map(float,child(v,'at')[1:3]));obs.append((p,p,float(child(v,'size')[1])/2,[0,1]))
def pd(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/max(dx*dx+dy*dy,1e-30)))
 return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def sd(a,b,c,d):
 def cross(a,b,c):return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:return 0
 return min(pd(a,c,d),pd(b,c,d),pd(c,a,b),pd(d,a,b))
design=__import__('json').loads((HERE/'design.json').read_text(encoding='utf-8'))
replacements={};lengths={.3:0,.4:0,.5:0}
for s in children(tree,'segment'):
 if child(s,'net')[1]!=net:continue
 w=float(child(s,'width')[1]);a=list(map(float,child(s,'start')[1:3]));b=list(map(float,child(s,'end')[1:3]));l=0 if child(s,'layer')[1]=='F.Cu' else 1
 if w<.5:
  for candidate in [.5,.4]:
   r=candidate/2
   if candidate<=w:continue
   if any(sd(a,b,c,d)<r+rr+.201 for c,d,rr,layers in obs if l in layers):continue
   if any(pd([x,y],a,b)<(3 if drill==2.8 else 3.5)+r+.001 for x,y,drill in design['holes']):continue
   corners=[[49,39],[76,39],[76,85],[49,85]]
   if any(sd(a,b,c,d)<r+.001 for c,d in zip(corners,corners[1:]+corners[:1])):continue
   w=candidate;break
  replacements[child(s,'tstamp')[1]]=w
 lengths[w]=lengths.get(w,0)+math.dist(a,b)
out=[]
for block in spans(P.read_text(encoding='utf-8')):
 if block.startswith('(segment '):
  uid=re.search(r'\(tstamp ([^)]+)\)',block).group(1)
  if uid in replacements:block=re.sub(r'\(width [^)]+\)',f'(width {replacements[uid]})',block)
 out.append(block)
P.write_text('(kicad_pcb\n'+'\n'.join(out)+'\n)',encoding='utf-8')
print('ESP_VIN length by width (mm):',lengths)
