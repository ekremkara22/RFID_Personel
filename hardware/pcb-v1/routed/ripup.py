"""Remove selected nets' copper for local rerouting (never footprints/net assignments)."""
from pathlib import Path
import sys,re
from finish_board import spans
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,children
P=HERE/'rfid_carrier_v01.kicad_pcb';tree=parse(P)
codes={n[1] for n in children(tree,'net') if n[2] in sys.argv[1:]}
out=[];count=0
for b in spans(P.read_text(encoding='utf-8')):
 if b.startswith(('(segment ','(via ')) and re.search(r'\(net (\d+)\)',b).group(1) in codes:count+=1;continue
 if any(t in b for t in ['c3a2a25e-b37e-4d3f-9221-8f75ab0dd865','db5bda6d-2a9b-4e9f-9934-2da63ae7359f']):continue
 out.append(b)
P.write_text('(kicad_pcb\n'+'\n'.join(out)+'\n)',encoding='utf-8')
print('Removed',count,'copper items for',sys.argv[1:])
