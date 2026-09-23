"""Audit generated files independently of the generator; NOT a KiCad ERC/DRC substitute."""
from pathlib import Path
import csv
import json
import math
import re
import xml.etree.ElementTree as ET

OUT=Path(__file__).resolve().parent
NAME='rfid_carrier_v01'

def parse(path):
    text=path.read_text(encoding='utf-8')
    tokens=re.findall(r'\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+',text)
    stack=[]; root=None
    for t in tokens:
        if t=='(':
            item=[]
            if stack: stack[-1].append(item)
            else:
                assert root is None, 'More than one root expression'
                root=item
            stack.append(item)
        elif t==')':
            assert stack, 'Unexpected closing parenthesis'
            stack.pop()
        else:
            assert stack, 'Token outside root expression'
            stack[-1].append(json.loads(t,strict=False) if t.startswith('"') else t)
    assert not stack, 'Unclosed expression'
    return root

def children(n,k): return [c for c in n[1:] if isinstance(c,list) and c and c[0]==k]
def child(n,k):
    values=children(n,k)
    assert len(values)==1,(k,len(values))
    return values[0]

def run():
    checks=[]
    def ok(label,condition):
        checks.append(dict(check=label,passed=bool(condition)))
        assert condition,label
    paths=list(OUT.glob('*.kicad_*'))+list((OUT/'RFID_Carrier.pretty').glob('*.kicad_mod'))+[OUT/'fp-lib-table',OUT/'sym-lib-table']
    for path in paths:
        if path.suffix=='.kicad_pro': json.loads(path.read_text(encoding='utf-8'))
        else: parse(path)
    ok('All generated S-expressions balanced and tokenizable (not KiCad parser)',True)
    design=json.loads((OUT/'design.json').read_text(encoding='utf-8'))
    csv_rows=list(csv.DictReader((OUT/'connections.csv').open(encoding='utf-8-sig')))
    expected={(r['Reference'],r['Pin']):(None if r['Net']=='NC' else r['Net']) for r in csv_rows}
    board=parse(OUT/(NAME+'.kicad_pcb'))
    found={}; pads=[]
    for fp in children(board,'footprint'):
        ref=next(t[2] for t in children(fp,'fp_text') if t[1]=='reference')
        if ref.startswith('H'): continue
        x,y=map(float,child(fp,'at')[1:3])
        for pad in children(fp,'pad'):
            n=children(pad,'net'); net=n[0][2] if n else None
            found[(ref,pad[1])]=net
            dx,dy=map(float,child(pad,'at')[1:3]); size=list(map(float,child(pad,'size')[1:3]))
            pads.append(dict(ref=ref,number=pad[1],net=net,x=x+dx,y=y+dy,w=size[0],h=size[1],shape=pad[3]))
    ok('PCB pad nets equal CSV connections',found==expected)
    xml=ET.parse(OUT/(NAME+'.net')).getroot()
    xmlnets={(node.attrib['ref'],node.attrib['pin']):net.attrib['name'] for net in xml.findall('./nets/net') for node in net.findall('node')}
    ok('XML netlist equals connected PCB pads',xmlnets=={k:v for k,v in found.items() if v})
    sch=parse(OUT/(NAME+'.kicad_sch'))
    symbols=children(sch,'symbol')
    ok('Schematic and PCB component counts match',len(symbols)==len(design['parts']))
    libs={s[1]:s for s in children(child(sch,'lib_symbols'),'symbol')}
    wire_ends={}
    labels={tuple(map(float,child(l,'at')[1:3])):l[1] for l in children(sch,'label')}
    for wire in children(sch,'wire'):
        points=children(child(wire,'pts'),'xy'); a=tuple(map(float,points[0][1:3])); b=tuple(map(float,points[1][1:3]))
        if b in labels: wire_ends[a]=labels[b]
        elif a in labels: wire_ends[b]=labels[a]
    ncs={tuple(map(float,child(n,'at')[1:3])) for n in children(sch,'no_connect')}
    schematic_nets={}
    for sym in symbols:
        ref=next(p[2] for p in children(sym,'property') if p[1]=='Reference')
        x,y=map(float,child(sym,'at')[1:3]); lib=libs[child(sym,'lib_id')[1]]
        for unit in children(lib,'symbol'):
            for pin in children(unit,'pin'):
                no=child(pin,'number')[1]; dx,dy=map(float,child(pin,'at')[1:3]); pos=(round(x+dx,4),round(y-dy,4))
                if expected[(ref,no)] is None:
                    assert pos in ncs,(ref,no,'NC marker missing')
                    schematic_nets[(ref,no)]=None
                else:
                    assert pos in wire_ends,(ref,no,'wire missing')
                    schematic_nets[(ref,no)]=wire_ends[pos]
    ok('Actual schematic pin/wire/label graph equals PCB nets',schematic_nets==expected)
    # Shape-aware pad clearance, including square pin-1 pads.
    def gap(a,b):
        dx=abs(a['x']-b['x']); dy=abs(a['y']-b['y'])
        ar=a['shape']=='rect'; br=b['shape']=='rect'
        if not ar and not br: return math.hypot(dx,dy)-(a['w']+b['w'])/2
        if ar and br: return math.hypot(max(0,dx-(a['w']+b['w'])/2),max(0,dy-(a['h']+b['h'])/2))
        r,c=(a,b) if ar else (b,a)
        return math.hypot(max(0,dx-r['w']/2),max(0,dy-r['h']/2))-c['w']/2
    min_gap=100
    for i,a in enumerate(pads):
        for b in pads[i+1:]:
            if a['net'] and a['net']==b['net']: continue
            g=gap(a,b); min_gap=min(min_gap,g)
            assert g>=.25-1e-8,(a['ref'],a['number'],b['ref'],b['number'],g)
    ok('Shape-aware unlike-net pad clearance >=0.25mm',min_gap>=.25)
    collision=[]
    for i,a in enumerate(design['parts']):
        for b in design['parts'][i+1:]:
            ax,ay,az,aw=a['body']; bx,by,bz,bw=b['body']
            if min(az,bz)>max(ax,bx) and min(aw,bw)>max(ay,by): collision.append((a['ref'],b['ref']))
    ok('Provisional component body rectangles do not overlap',not collision)
    ok('No routed copper is falsely supplied',not children(board,'segment') and not children(board,'via'))
    report={'checks':checks,'minimum_unlike_net_pad_gap_mm':round(min_gap,4),'component_body_overlaps':collision,
        'status':'DRAFT_CHECKS_ONLY','kicad_erc_drc_run':False,'routing_complete':False,'production_ready':False}
    (OUT/'file_validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__': run()
