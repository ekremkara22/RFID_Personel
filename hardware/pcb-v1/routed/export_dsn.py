"""Export declared component pads/net classes/keepouts to local Specctra DSN.

Coordinates are micrometres, with Y inverted from KiCad. No design is uploaded
to a routing service. Final copper must be checked by KiCad after SES import.
"""
from pathlib import Path
import json,math
ROOT=Path(__file__).resolve().parent
D=json.loads((ROOT/'design.json').read_text(encoding='utf-8'))
def q(s):return json.dumps(str(s))
def u(x):return str(round(x*1000,3))
NETS=sorted({p['net'] for c in D['parts'] for p in c['pins'] if p['net']})
POWER=['+5V_IN','+5V','ESP_VIN','+3V3','GND','BUZZ_NEG']
s=['(pcb rfid_carrier_v01','(parser (string_quote ") (space_in_quoted_tokens on))','(resolution um 10)','(unit um)',
   '(structure (layer F.Cu (type signal) (property (index 0))) (layer B.Cu (type signal) (property (index 1)))']
a,b,c,d=D['board']
s.append(f'(boundary (path pcb 0 {u(a)} {u(-b)} {u(c)} {u(-b)} {u(c)} {u(-d)} {u(a)} {u(-d)} {u(a)} {u(-b)}))')
a,b,c,d=D['antenna_keepout_provisional']
s.append(f'(keepout "ANTENNA" (rect signal {u(a)} {u(-d)} {u(c)} {u(-b)}))')
for i,(x,y,drill) in enumerate(D['holes']):
    r=3 if drill==2.8 else 3.5
    s.append(f'(keepout "H{i+1}" (circle signal {u(2*r)} {u(x)} {u(-y)}))')
s+=['(via VIA_1mm)','(rule (width 300) (clearance 200))',')','(placement']
for p in D['parts']:
    origin=p['pads'][0]
    s.append(f'(component {q(p["ref"])} (place {q(p["ref"])} {u(origin["x"])} {u(-origin["y"])} front 0))')
s+=[')','(library']
stacks={}
for p in D['parts']:
    s.append(f'(image {q(p["ref"])}')
    origin=p['pads'][0]
    for pin,pad in zip(p['pins'],p['pads']):
        shape='rect' if pin['number']=='1' else 'circle'
        name=f'PAD_{shape}_{pad["diameter"]}_{pad["drill"]}'
        stacks[name]=(shape,pad['diameter'])
        s.append(f'(pin {q(name)} {q(pin["number"])} {u(pad["x"]-origin["x"])} {u(origin["y"]-pad["y"])})')
    s.append(')')
for name,(shape,diam) in stacks.items():
    s.append(f'(padstack {q(name)}')
    for layer in ['F.Cu','B.Cu']:
        geo=f'(rect {layer} {u(-diam/2)} {u(-diam/2)} {u(diam/2)} {u(diam/2)})' if shape=='rect' else f'(circle {layer} {u(diam)})'
        s.append(f'(shape {geo})')
    s.append('(attach off))')
s.append('(padstack VIA_1mm (shape (circle F.Cu 1000)) (shape (circle B.Cu 1000)) (attach off))')
s+=[')','(network']
for n in NETS:
    pins=' '.join(f'{p["ref"]}-{pin["number"]}' for p in D['parts'] for pin in p['pins'] if pin['net']==n)
    s.append(f'(net {q(n)} (pins {pins}))')
for name,nets,width in [('Signal',[n for n in NETS if n not in POWER],300),('Power',[n for n in NETS if n in POWER],500)]:
    s.append(f'(class {name} '+ ' '.join(q(n) for n in nets)+f' (circuit (use_via VIA_1mm)) (rule (width {width}) (clearance 200)))')
s+=[')','(wiring)',')']
(ROOT/'rfid_carrier_v01.dsn').write_text('\n'.join(s),encoding='utf-8')
print('Exported',len(NETS),'nets')
