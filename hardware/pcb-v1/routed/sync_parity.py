"""Declare explicit NC pad nets from KiCad and board-only mechanical holes."""
from pathlib import Path
import sys,json,re
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,children,child
from finish_board import spans
P=HERE/'rfid_carrier_v01.kicad_pcb'
tree=parse(P);native=parse(HERE/'native.net');assign={}
for net in children(child(native,'nets'),'net'):
 name=child(net,'name')[1]
 if not name.startswith('unconnected-('):continue
 for n in children(net,'node'):assign[(child(n,'ref')[1],child(n,'pin')[1])]=name
codes={n[2]:int(n[1]) for n in children(tree,'net')};extra=[]
for name in sorted(set(assign.values())):
 if name not in codes:
  codes[name]=max(codes.values())+1;extra.append(f'(net {codes[name]} {json.dumps(name)})')
source=P.read_text(encoding='utf-8');out=[]
for block in spans(source):
 if block.startswith('(footprint'):
  ref=re.search(r'\(fp_text reference "([^"]+)"',block).group(1)
  if ref.startswith('H'):
   block=block.replace('(attr exclude_from_pos_files','(attr board_only exclude_from_pos_files')
  else:
   for pad in spans(block):
    if not pad.startswith('(pad '):continue
    number=re.search(r'^\(pad "([^"]*)"',pad).group(1)
    name=assign.get((ref,number))
    if name and '(net ' not in pad:
     block=block.replace(pad,pad[:-1]+f' (net {codes[name]} {json.dumps(name)}))')
 out.append(block)
headers=['version','generator','general','paper','layers','setup']
ordered=[b for k in headers for b in out if b.split()[0]=='('+k]
ordered+=extra+[b for b in out if b.split()[0][1:] not in headers]
P.write_text('(kicad_pcb\n'+'\n'.join(ordered)+'\n)\n',encoding='utf-8')
for p in (HERE/'RFID_Carrier.pretty').glob('MountingHole*.kicad_mod'):
 s=p.read_text(encoding='utf-8').replace('(attr exclude_from_pos_files','(attr board_only exclude_from_pos_files')
 p.write_text(s,encoding='utf-8')
print('Explicit NC pads:',len(assign),'; holes declared board-only')
