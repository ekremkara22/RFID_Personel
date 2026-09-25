"""Regenerate the routing input, preserving the original V0.1 outputs.

Run with the document Python runtime (numpy/Pillow). This overwrites this
revision's PCB, so do not run after hand-routing without a backup.
"""
from pathlib import Path
import sys,json,re
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
import build_design as g

def move(p,dx,dy):
    for pad in p['pads']: pad['x']+=dx; pad['y']+=dy
    p['body']=[v+(dx if i%2==0 else dy) for i,v in enumerate(p['body'])]

def resistor(p,x,y,vertical):
    p['pads'][0].update(x=x,y=y)
    x2=x if vertical else x+7.62; y2=y+7.62 if vertical else y
    p['pads'][1].update(x=x2,y=y2)
    p['body']=[x-1.1,y-1.1,x2+1.1,y2+1.1]
    p['footprint']='R_P7.62_'+('V' if vertical else 'H')

def main():
    g.OUT=HERE
    parts={p['ref']:p for p in g.PARTS}
    for ref in ['J6','J7']:
        for pad in parts[ref]['pads']: pad['diameter']=1.6
    resistor(parts['R6'],18,82,False)
    resistor(parts['R7'],38,73,True)
    resistor(parts['R8'],44,73,True)
    move(parts['F1'],0,.4)
    move(parts['RV1'],.4,0)
    move(parts['C3'],0,.6)
    move(parts['C5'],0,.4)
    move(parts['Q1'],-.6,-.3)
    g.write_pcb()
    pcb=HERE/(g.NAME+'.kicad_pcb')
    text=pcb.read_text(encoding='utf-8').replace('(pads not_allowed)','(pads allowed)')
    text=text.replace('RFID V0.1 - UNROUTED / NOT FOR FAB','RFID V0.2 - ROUTED PROTOTYPE')
    text=text.replace('MountingHole:','RFID_Carrier:')
    for d in [2.8,3.2]:
        name=f'MountingHole_{d}mm'
        lib=f'(footprint "{name}" (version 20240108) (generator "rfid_carrier_generator") (layer "F.Cu") (attr exclude_from_pos_files exclude_from_bom) (fp_text reference "REF**" (at 0 4) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15)))) (pad "" np_thru_hole circle (at 0 0) (size {d} {d}) (drill {d}) (layers "*.Cu" "*.Mask")))'
        (HERE/'RFID_Carrier.pretty'/(name+'.kicad_mod')).write_text(lib,encoding='utf-8')
    pcb.write_text(text,encoding='utf-8')
    project=HERE/(g.NAME+'.kicad_pro')
    pr=json.loads(project.read_text(encoding='utf-8'))
    for nc in pr['net_settings']['classes']:
        nc['clearance']=.2
        if nc['name']=='Power':nc['track_width']=.5
    project.write_text(json.dumps(pr,indent=2),encoding='utf-8')
    g.write_schematic(snap_grid=True)
    g.write_json_csv()
    path=HERE/(g.NAME+'.kicad_sch')
    s=path.read_text(encoding='utf-8').replace('V0.1 - ENGINEERING DRAFT','V0.2 - ROUTED PROTOTYPE').replace('2026-09-22','2026-09-24').replace('0.1 UNROUTED','0.2').replace('No copper routing yet. Footprints and power sources require final ERC/DRC review.','Physical connector dimensions and supply compatibility require prototype verification.')
    s=s.replace('Confirm module pin labels.\nPhysical','Confirm module pin labels.\\nPhysical')
    flag='''(symbol "RFID_Carrier:POWER_FLAG" (power) (pin_names (offset 0)) (in_bom no) (on_board no)
      (property "Reference" "#FLG" (at 0 2.54 0) (effects (font (size 1.27 1.27)) hide))
      (property "Value" "PWR_FLAG" (at 0 5.08 0) (effects (font (size 1.27 1.27))))
      (symbol "POWER_FLAG_0_1" (polyline (pts (xy 0 0) (xy 0 1.27) (xy -1.27 1.905) (xy 0 2.54) (xy 1.27 1.905) (xy 0 1.27)) (stroke (width 0) (type default)) (fill (type none))))
      (symbol "POWER_FLAG_1_1" (pin power_out line (at 0 0 90) (length 0) (name "pwr" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))))'''
    s=s.replace('(lib_symbols','(lib_symbols\n'+flag,1)
    extra=[]
    for i,net in enumerate(['+5V','GND']):
        x=50.8+i*25.4;y=375.92;ref=f'#FLG0{i+1}';uid=g.uid('flag'+net)
        extra.append(f'(symbol (lib_id "RFID_Carrier:POWER_FLAG") (at {x} {y} 0) (unit 1) (in_bom no) (on_board no) (dnp no) (uuid {uid}) (property "Reference" "{ref}" (at {x} {y-2.54} 0) (effects (font (size 1.27 1.27)) hide)) (property "Value" "PWR_FLAG" (at {x} {y-5.08} 0) (effects (font (size 1.27 1.27)))) (pin "1" (uuid {g.uid(ref+"pin")})) (instances (project "{g.NAME}" (path "/{g.ROOT_UUID}" (reference "{ref}") (unit 1)))))')
        extra.append(f'(label "{net}" (at {x} {y} 0) (effects (font (size 1.27 1.27)) (justify left bottom)) (uuid {g.uid(ref+"label")}))')
    s=s.rstrip()[:-1]+'\n'+'\n'.join(extra)+'\n)\n'
    s=re.sub(r'\(label ("[^"\n]+")',r'(global_label \1 (shape bidirectional)',s)
    libpath=HERE/'RFID_Carrier.kicad_sym'
    lib=libpath.read_text(encoding='utf-8').rstrip()
    libpath.write_text(lib[:-1]+'\n'+flag.replace('RFID_Carrier:POWER_FLAG','POWER_FLAG')+'\n)',encoding='utf-8')
    path.write_text(s,encoding='utf-8')
    design=json.loads((HERE/'design.json').read_text(encoding='utf-8'))
    design['status']='ROUTING_INPUT'
    design['revision']='0.2'
    (HERE/'design.json').write_text(json.dumps(design,indent=2,ensure_ascii=False),encoding='utf-8')
    print('Prepared',HERE)

if __name__=='__main__':main()
