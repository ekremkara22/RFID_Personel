"""Remove only native-DRC-identified dangling copper after all nets connect."""
from pathlib import Path
import sys,json,subprocess
from finish_board import spans
HERE=Path(__file__).resolve().parent;P=HERE/'rfid_carrier_v01.kicad_pcb'
cli=sys.argv[1];report=HERE/'work'/'trim-drc.json'
for attempt in range(30):
 subprocess.run([cli,'pcb','drc',str(P),'--format','json','-o',str(report)],check=True,stdout=subprocess.DEVNULL)
 d=json.loads(report.read_text(encoding='utf-8'));assert not d['unconnected_items'],d['unconnected_items']
 stubs=[v for v in d['violations'] if v['type'] in ['track_dangling','via_dangling']]
 if not stubs:print('Trim complete:',attempt,'passes;',len(d['violations']),'other violations');break
 ids={i['uuid'] for v in stubs for i in v['items']}
 text=P.read_text(encoding='utf-8')
 out=[b for b in spans(text) if not (b.startswith(('(segment ','(via ')) and any(uid in b for uid in ids))]
 P.write_text('(kicad_pcb\n'+'\n'.join(out)+'\n)',encoding='utf-8')
else:raise RuntimeError('Stub cleanup did not converge')
