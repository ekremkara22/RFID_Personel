"""Add final copper zones/assembly marks, or retain filled zones in KiCad 8 syntax.

Usage: python finish_board.py add
       kicad-cli pcb drc ... --refill-zones --save-board
       python finish_board.py retain-compatible
The native KiCad check must be repeated after the second command.
"""
from pathlib import Path
import sys,uuid,json
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,children,child
P=HERE/'rfid_carrier_v01.kicad_pcb'

def spans(text):
 depth=0;quoted=False;escaped=False;start=0;out=[]
 for i,c in enumerate(text):
  if escaped:escaped=False;continue
  if quoted and c=='\\':escaped=True;continue
  if c=='"':quoted=not quoted
  if quoted:continue
  if c=='(':
   depth+=1
   if depth==2:start=i
  elif c==')':
   if depth==2:out.append(text[start:i+1])
   depth-=1
 return out

def add():
 s=P.read_text(encoding='utf-8');tree=parse(P)
 assert not any(children(z,'name') and child(z,'name')[1].startswith('GND pour') for z in children(tree,'zone'))
 net=next(n[1] for n in children(tree,'net') if n[2]=='GND')
 extra=[]
 for layer in ['F.Cu','B.Cu']:
  extra.append(f'''(zone (net {net}) (net_name "GND") (layer "{layer}") (tstamp {uuid.uuid4()})
   (name "GND pour {layer}") (hatch edge 0.5) (connect_pads (clearance 0.2)) (min_thickness 0.2)
   (filled_areas_thickness no) (fill yes (thermal_gap 0.25) (thermal_bridge_width 0.4) (island_removal_mode 0))
   (polygon (pts (xy 4.5 39.5) (xy 131.5 39.5) (xy 131.5 96.5) (xy 4.5 96.5))))''')
 for label,x,y,size in [('RFID CARRIER V0.2',28,52,1),('ESP32 DEVKIT V1 / 30 PIN',28,55,.8),('USB <',20,59,1),('ANTENNA',62.5,54,1),('NO COPPER',62.5,57,1),('5V DC ONLY',116,66,1)]:
  extra.append(f'(gr_text "{label}" (at {x} {y}) (layer "F.SilkS") (effects (font (size {size} {size}) (thickness .15))))')
 P.write_text(s.rstrip()[:-1]+'\n'+'\n'.join(extra)+'\n)\n',encoding='utf-8')
 (HERE/'work'/'before-fill.kicad_pcb').write_text(P.read_text(encoding='utf-8'),encoding='utf-8')

def retain():
 native=P.read_text(encoding='utf-8');before=(HERE/'work'/'before-fill.kicad_pcb').read_text(encoding='utf-8')
 zones=[s for s in spans(native) if s.startswith('(zone') and '(filled_polygon' in s]
 assert len(zones)==2,len(zones)
 # New KiCad stores a net NAME rather than net CODE in zones. Restore the older
 # syntax from the original zone while retaining the native fill polygons only.
 origs=spans(before);out=[]
 for o in origs:
  if o.startswith('(zone') and 'GND pour ' in o:
   layer='F.Cu' if 'GND pour F.Cu' in o else 'B.Cu'
   nativezone=next(z for z in zones if f'GND pour {layer}' in z)
   polys=[b for b in spans(nativezone) if b.startswith('(filled_polygon')]
   out.append(o.rstrip()[:-1]+'\n'+'\n'.join(polys)+'\n)')
  else:out.append(o)
 P.write_text('(kicad_pcb\n'+'\n'.join(out)+'\n)\n',encoding='utf-8')
 (HERE/'work'/'native-filled.kicad_pcb').write_text(native,encoding='utf-8')
 print('Retained native filled zones with original board/footprint/track syntax')

if __name__=='__main__':
 {'add':add,'retain-compatible':retain}[sys.argv[1]]()
