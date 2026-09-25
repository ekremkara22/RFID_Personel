"""Repair the three reviewed imported/grid via defects before final fill.

The overlapping +5V via is redundant because the F1 lead is already plated.
The two single-layer stubs have no use as layer transitions.
"""
from pathlib import Path
import uuid
from finish_board import spans
HERE=Path(__file__).resolve().parent;P=HERE/'rfid_carrier_v01.kicad_pcb'
s=P.read_text(encoding='utf-8');out=[]
targets=['75.396600 90.247900','78.948900 81.456300','120.1 71.0']
for b in spans(s):
 if b.startswith('(via ') and any('(at '+p+')' in b for p in targets):continue
 out.append(b)
for layer in ['F.Cu','B.Cu']:
 out.append(f'(segment (start 120.1 71) (end 120.08 71.4) (width .5) (layer "{layer}") (net 2) (tstamp {uuid.uuid4()}))')
P.write_text('(kicad_pcb\n'+'\n'.join(out)+'\n)',encoding='utf-8')
