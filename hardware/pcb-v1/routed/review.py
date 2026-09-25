"""Audit the delivered board against native netlist and reports; draw actual copper."""
from pathlib import Path
import sys,json,math,hashlib,csv
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,children,child
BOARD=HERE/'rfid_carrier_v01.kicad_pcb'
tree=parse(BOARD); design=json.loads((HERE/'design.json').read_text(encoding='utf-8'))
nets={n[1]:n[2] for n in children(tree,'net')}
boardpins={};pads=[];holes=[]
for fp in children(tree,'footprint'):
 ref=next(x[2] for x in children(fp,'fp_text') if x[1]=='reference')
 ox,oy=map(float,child(fp,'at')[1:3])
 for p in children(fp,'pad'):
  x,y=map(float,child(p,'at')[1:3]);ns=children(p,'net');net=ns[0][2] if ns else None
  w=float(child(p,'size')[1]);drill=float(child(p,'drill')[1])
  item=dict(ref=ref,pin=p[1],x=x+ox,y=y+oy,r=w/2,drill=drill,shape=p[3],net=net)
  if ref.startswith('H'):holes.append(item)
  else:pads.append(item);boardpins[(ref,p[1])]=net
segments=[]
for s in children(tree,'segment'):
 segments.append(dict(net=nets[child(s,'net')[1]],layer=child(s,'layer')[1],width=float(child(s,'width')[1]),a=list(map(float,child(s,'start')[1:3])),b=list(map(float,child(s,'end')[1:3]))))
vias=[]
for v in children(tree,'via'):
 x,y=map(float,child(v,'at')[1:3]);vias.append(dict(net=nets[child(v,'net')[1]],x=x,y=y,size=float(child(v,'size')[1]),drill=float(child(v,'drill')[1])))
(HERE/'copper.json').write_text(json.dumps(dict(segments=segments,vias=vias),indent=2),encoding='utf-8')

def audit():
 native=parse(HERE/'native.net');nativepins={}
 for n in children(child(native,'nets'),'net'):
  net=child(n,'name')[1]
  for pin in children(n,'node'):
   ref=child(pin,'ref')[1];num=child(pin,'pin')[1]
   if ref.startswith('#'):continue
   nativepins[(ref,num)]=None if net.startswith('unconnected-(') else net
 expected={(p['ref'],pin['number']):pin['net'] for p in design['parts'] for pin in p['pins']}
 checks={
  'native_schematic_nets_match_all_pcb_pads':nativepins==boardpins,
  'design_source_matches_all_pcb_pads':expected==boardpins,
  'v4_holes_unchanged':sorted((p['x'],p['y'],p['drill']) for p in holes)==sorted(tuple(h) for h in design['holes']),
  'antenna_contains_no_component_copper_pads':all(not (49-p['r']<p['x']<76+p['r'] and 39-p['r']<p['y']<85+p['r']) for p in pads),
  'sockets_25_40_mm':all(abs(a['y']-b['y']+25.4)<1e-8 for a,b in zip([p for p in pads if p['ref']=='J6'],[p for p in pads if p['ref']=='J7'])),
  'two_filled_ground_zones':len([z for z in children(tree,'zone') if children(z,'filled_polygon')])==2,
 }
 for f,key in [('drc.json','native_drc_zero_violations_and_unconnected'),('erc.json','native_erc_zero_violations')]:
  d=json.loads((HERE/f).read_text(encoding='utf-8'))
  errors=d.get('violations',[])+d.get('unconnected_items',[])+d.get('schematic_parity',[])
  errors+=sum([s.get('violations',[]) for s in d.get('sheets',[])],[])
  checks[key]=not errors
 lengths={n:round(sum(math.dist(s['a'],s['b']) for s in segments if s['net']==n),2) for n in sorted(set(s['net'] for s in segments))}
 report=dict(checks=checks,all_passed=all(checks.values()),parts=len(design['parts']),pads=len(pads),connected_pads=sum(n is not None for n in boardpins.values()),nets=len(set(n for n in boardpins.values() if n)),segments=len(segments),vias=len(vias),track_length_mm_by_net=lengths,pcb_sha256=hashlib.sha256(BOARD.read_bytes()).hexdigest(),physical_validation='Not performed: check actual socket spacing, USB height, footprints and first power-up.')
 (HERE/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 print(json.dumps(report,indent=2));assert all(checks.values()),checks

def preview():
 scale=12;W=1680;H=1790
 im=Image.new('RGB',(W,H),'#edf2f7');d=ImageDraw.Draw(im)
 def font(size,bold=False):return ImageFont.truetype('C:/Windows/Fonts/'+('arialbd.ttf' if bold else 'arial.ttf'),size)
 d.text((60,30),'RFID / V4 kutu / yönlendirilmiş taşıyıcı PCB',font=font(34,True),fill='#183147')
 d.text((60,78),'V0.2 • 128 × 58 mm • 30 pin ESP32 DevKit V1 • Üstten görünüş',font=font(23),fill='#3c5368')
 for index,layer in enumerate(['F.Cu','B.Cu']):
  oy=180+index*780;ox=65
  def pt(x,y):return(ox+(x-4)*scale,oy+(y-39)*scale)
  d.text((65,oy-48),'ÜST BAKIR + PARÇALAR' if not index else 'ALT BAKIR — üstten bakış, aynalanmamış',font=font(25,True),fill='#183147')
  d.rectangle([pt(4,39),pt(132,97)],fill='#132c35',outline='#223f4b',width=3)
  for zone in children(tree,'zone'):
   for poly in children(zone,'filled_polygon'):
    if child(poly,'layer')[1]!=layer:continue
    points=[pt(float(p[1]),float(p[2])) for p in children(child(poly,'pts'),'xy')]
    if points:d.polygon(points,fill='#265f56')
  a,b,c,e=design['antenna_keepout_provisional'];d.rectangle([pt(a,b),pt(c,e)],fill='#e1e9ed')
  d.text(pt(52,57),'ANTEN',font=font(22,True),fill='#536b78');d.text(pt(51,60),'BAKIR YOK',font=font(16),fill='#536b78')
  for s in segments:
   if s['layer']==layer:d.line([pt(*s['a']),pt(*s['b'])],fill='#f07966' if index==0 else '#68bafa',width=max(1,round(s['width']*scale)))
  for p in design['parts']:
   a,b,c,e=p['body'];d.rectangle([pt(a,b),pt(c,e)],outline='#9fb9b4',width=1)
  for p in pads:
   x,y=pt(p['x'],p['y']);r=p['r']*scale;box=[x-r,y-r,x+r,y+r]
   (d.rectangle if p['shape']=='rect' else d.ellipse)(box,fill='#e6c478')
   r=p['drill']*scale/2;d.ellipse((x-r,y-r,x+r,y+r),fill='#12252d')
  for p in vias:
   x,y=pt(p['x'],p['y']);r=p['size']*scale/2;d.ellipse((x-r,y-r,x+r,y+r),fill='#d6b665')
   r=p['drill']*scale/2;d.ellipse((x-r,y-r,x+r,y+r),fill='#12252d')
  for p in holes:
   x,y=pt(p['x'],p['y']);r=p['drill']*scale/2;d.ellipse((x-r,y-r,x+r,y+r),fill='#edf2f7',outline='#bccdd6',width=1)
  if index==0:
   for p in design['parts']:
    x,y=pt(p['pads'][0]['x'],p['pads'][0]['y']-2.2)
    d.text((x,y),p['ref'],anchor='mm',font=font(15,True),fill='white',stroke_width=1,stroke_fill='#132c35')
   d.text(pt(18,51),'ESP32 / USB ←',font=font(22,True),fill='white')
 d.text((65,1745),'Gerçek kartla doğrulanacak: 25,40 mm soket aralığı, USB yüksekliği ve parça ayak izleri.',font=font(21),fill='#805124')
 im.save(HERE/'pcb_routed.png')

if __name__=='__main__':
 if '--preview-only' not in sys.argv:audit()
 preview()
