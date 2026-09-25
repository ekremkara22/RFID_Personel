"""Import copper from local Specctra SES into the KiCad 8-compatible board.

Preserve footprint placements, UUIDs and net names from our PCB. This deliberately
does not import SES placement, since DSN uses an independent image coordinate frame.
The final result must pass native KiCad DRC and schematic-net parity checks.
"""
from pathlib import Path
import sys,json,uuid
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,children,child

def read_routes(ses):
    tree=parse(ses); routes=child(tree,'routes')
    unit=child(routes,'resolution'); assert unit[1]=='um',unit
    scale=float(unit[2])*1000
    nets=child(routes,'network_out')
    segments=[]; vias=[]
    for n in children(nets,'net'):
        net=n[1]
        for wire in children(n,'wire'):
            path=child(wire,'path'); layer=path[1]; width=float(path[2])/scale
            pts=[(float(path[i])/scale,-float(path[i+1])/scale) for i in range(3,len(path),2)]
            for a,b in zip(pts,pts[1:]):
                if a!=b: segments.append(dict(net=net,layer=layer,width=width,a=a,b=b))
        for via in children(n,'via'):
            vias.append(dict(net=net,x=float(via[2])/scale,y=-float(via[3])/scale,size=1.,drill=.5))
    return segments,vias

def main():
    path=HERE/'rfid_carrier_v01.kicad_pcb'
    base=path.read_text(encoding='utf-8')
    assert '(segment ' not in base,'Regenerate routing input before importing; will not silently duplicate copper'
    tree=parse(path); codes={n[2]:n[1] for n in children(tree,'net')}
    segs,vias=read_routes(HERE/'rfid_carrier_v01.ses')
    s=[]
    for seg in segs:
        a,b=seg['a'],seg['b']
        s.append(f'(segment (start {a[0]:.6f} {a[1]:.6f}) (end {b[0]:.6f} {b[1]:.6f}) (width {seg["width"]:.6f}) (layer "{seg["layer"]}") (net {codes[seg["net"]]}) (tstamp {uuid.uuid4()}))')
    for v in vias:
        s.append(f'(via (at {v["x"]:.6f} {v["y"]:.6f}) (size {v["size"]}) (drill {v["drill"]}) (layers "F.Cu" "B.Cu") (net {codes[v["net"]]}) (tstamp {uuid.uuid4()}))')
    path.write_text(base.rstrip()[:-1]+'\n'+'\n'.join(s)+'\n)\n',encoding='utf-8')
    (HERE/'copper.json').write_text(json.dumps(dict(segments=segs,vias=vias),indent=2),encoding='utf-8')
    print(len(segs),'segments;',len(vias),'vias')

if __name__=='__main__':main()
