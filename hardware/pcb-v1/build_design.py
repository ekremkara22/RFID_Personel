"""Generate a reviewable, UNROUTED KiCad carrier design and mechanical previews.

Requires numpy and Pillow. No network, no changes to firmware or source STL files.
Coordinates use normalized V4 BODY XY, mm; positive Y points down in the drawings.
Do not manufacture generated files before the release checklist is completed.
"""
from pathlib import Path
import csv
import html
import json
import math
import re
import uuid
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont
from inspect_stl import load, section

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
NAME = 'rfid_carrier_v01'
NS = uuid.UUID('089e193d-64bf-4c6a-bcaa-1143d0d45430')
def uid(s): return str(uuid.uuid5(NS, s))
def q(s): return json.dumps(str(s), ensure_ascii=False)
def num(x): return f'{x:.4f}'.rstrip('0').rstrip('.') if x else '0'

BOARD = [4,39,132,97]
KEEP = [49,39,76,85]  # Conservative provisional region; measure actual module antenna.
HOLES = [(8.05,43.1,2.8),(8.05,66.9,2.8),(51.95,43.1,2.8),(51.95,66.9,2.8),
         (83.41,48.41,3.2),(83.41,91.59,3.2),(126.59,48.41,3.2),(126.59,91.59,3.2)]
PARTS = []

def add(ref, value, pins, pads, body, footprint, note='', types=None):
    assert len(pins) == len(pads)
    p = dict(ref=ref,value=value,pins=[dict(number=str(i+1),name=name,net=net,
              type=(types or {}).get(i+1,'passive')) for i,(name,net) in enumerate(pins)],
             pads=[dict(x=x,y=y,diameter=d,drill=h) for x,y,d,h in pads],
             body=body,footprint=footprint,note=note)
    PARTS.append(p)
    return p

def row(ref,value,x,y,pins,pitch=2.54,vertical=False,diameter=1.8,drill=1.0,note=''):
    pads=[(x+(0 if vertical else i*pitch),y+(i*pitch if vertical else 0),diameter,drill) for i in range(len(pins))]
    last=pads[-1]
    body=[x-1.3,y-1.3,last[0]+1.3,last[1]+1.3]
    return add(ref,value,pins,pads,body,f'Header_{len(pins)}_P{pitch:g}_{"V" if vertical else "H"}',note)

def two(ref,value,x,y,net1,net2,pitch=7.62,vertical=False,kind='R',note=''):
    dx,dy=(0,pitch) if vertical else (pitch,0)
    p=add(ref,value,[('1',net1),('2',net2)],[(x,y,1.8,.8),(x+dx,y+dy,1.8,.8)],
          [x-1.1,y-1.1,x+dx+1.1,y+dy+1.1],f'{kind}_P{pitch:g}_{"V" if vertical else "H"}',note)
    return p

# Explicit local pin numbers, not an undocumented library's module numbering.
# Top view: USB LEFT, antenna RIGHT. Each row numbered LEFT to RIGHT.
upper=['VIN','GND','GPIO13','GPIO12','GPIO14','GPIO27','GPIO26','GPIO25','GPIO33','GPIO32','GPIO35','GPIO34','GPIO39','GPIO36','EN']
lower=['3V3','GND','GPIO15','GPIO2','GPIO4','GPIO16','GPIO17','GPIO5','GPIO18','GPIO19','GPIO21','GPIO3','GPIO1','GPIO22','GPIO23']
used={5,14,16,17,18,19,21,22,23,25,26,27,32,33}
def espnet(pin):
    if pin=='VIN': return 'ESP_VIN'
    if pin=='3V3': return '+3V3'
    if pin=='GND': return 'GND'
    return pin if pin.startswith('GPIO') and int(pin[4:]) in used else None
for ref,y,names in [('J6',42.3,upper),('J7',67.7,lower)]:
    row(ref,'DevKit V1 socket 1x15',12.22,y,[(n,espnet(n)) for n in names],
        note='ASSUMED 25.40 mm row spacing; 2.54 mm pitch. Confirm labels and orientation on actual board.')

row('J1','5V DC INPUT',125,59,[('+5V_IN','+5V_IN'),('GND','GND')],pitch=5.08,vertical=True,diameter=2.6,drill=1.3,
    note='2-pin 5.08 mm terminal block; body envelope provisional; regulated 5V only, no reverse-polarity protection.')
PARTS[-1]['body']=[121.3,55.8,130,68]
two('F1','MF-R075 0.75A',115,71,'+5V_IN','+5V',5.08,False,'PTC',
    'Bourns MF-R075 nominal 5.1 mm leads; current/temperature derating and voltage drop need measurement.')
PARTS[-1]['body']=[112.34,69.4,122.74,72.6]
row('JP1','ESP VIN LINK',80,77,[('5V','+5V'),('VIN','ESP_VIN')],vertical=True,
    note='Fit shunt for normal external power. Not a USB power multiplexer; program removed module for first bring-up.')
row('J2','RC522',86,43,[('SS','GPIO5'),('SCK','RFID_SCK'),('MOSI','RFID_MOSI'),('MISO','GPIO19'),('IRQ',None),('GND','GND'),('RST','GPIO27'),('3V3','+3V3')],
    note='Match signal NAMES on reader, not cable colours. 3.3V only; IRQ unused.')
row('J3','LCD1602 PARALLEL',87,87,[('VSS','GND'),('VDD','+5V'),('VO','LCD_VO'),('RS','LCD_RS_5V'),('RW','GND'),('E','LCD_E_5V'),('D0',None),('D1',None),('D2',None),('D3',None),('D4','LCD_D4_5V'),('D5','LCD_D5_5V'),('D6','LCD_D6_5V'),('D7','LCD_D7_5V'),('A','LCD_A'),('K','GND')],
    note='16-pin ribbon cable. Pin 1 at LEFT in this PCB view. LCD backlight must remain current limited.')
row('J4','STATUS LEDs',110,43,[('GREEN_A','GREEN_A'),('GREEN_K','GND'),('RED_A','RED_A'),('RED_K','GND')])
row('J5','5V ACTIVE BUZZER',124,43,[('PLUS','+5V'),('MINUS','BUZZ_NEG')])

u_pins=[('1OE','GND'),('1A1','GPIO32'),('2Y4',None),('1A2','GPIO25'),('2Y3',None),('1A3','GPIO22'),('2Y2','LCD_D7_5V'),('1A4','GPIO21'),('2Y1','LCD_D6_5V'),('GND','GND'),('2A1','GPIO16'),('1Y4','LCD_D5_5V'),('2A2','GPIO17'),('1Y3','LCD_D4_5V'),('2A3','GND'),('1Y2','LCD_E_5V'),('2A4','GND'),('1Y1','LCD_RS_5V'),('2OE','GND'),('VCC','+5V')]
u_pads=[(87,55+i*2.54,1.8,.8) for i in range(10)]+[(94.62,55+i*2.54,1.8,.8) for i in reversed(range(10))]
u_types={i:('power_in' if i in [10,20] else 'tri_state' if i in [3,5,7,9,12,14,16,18] else 'input') for i in range(1,21)}
add('U1','SN74AHCT244N',u_pins,u_pads,[85.92,53.73,95.7,79.13],'DIP20_W7.62',
    'Use AHCT or separately verified HCT; ordinary HC at 5V is not an equivalent 3.3V-input replacement. Both OE pins grounded.',u_types)
row('RN1','8x10k BUSSED',100,55,[('COMMON','GND'),('R1','GPIO32'),('R2','GPIO25'),('R3','GPIO22'),('R4','GPIO21'),('R5','GPIO16'),('R6','GPIO17'),('R7',None),('R8',None)],vertical=True,
    note='SIP-9, eight resistors sharing pin 1. NOT an isolated network. Spare pins 8/9 unconnected.')
two('R1','220R',106,50,'GPIO26','GREEN_A',vertical=True)
two('R2','220R',110,50,'GPIO33','RED_A',vertical=True)
two('R3','1k',112,62,'GPIO14','BUZZ_BASE')
two('R4','100k',112,68,'BUZZ_BASE','GND')
two('R5','330R INITIAL',111,83,'+5V','LCD_A',note='Safe dim starting value, adjust ONLY from backlight specifications/measured current. Never blindly bridge.')
two('R6','10k',39,82,'+3V3','GPIO5',note='SS idle high; boot-strapping GPIO5 must remain compatible with actual DevKit.')
two('R7','33R',20,82,'GPIO18','RFID_SCK',note='SPI clock series damping; verify waveforms/read reliability after routing.')
two('R8','33R',8,82,'GPIO23','RFID_MOSI',note='SPI MOSI series damping; keep RC522 harness short.')
add('Q1','BC337-40', [('C','BUZZ_NEG'),('B','BUZZ_BASE'),('E','GND')],
    [(115,53,1.8,.8),(117.54,53,1.8,.8),(120.08,53,1.8,.8)], [114,50.5,121.08,55.5], 'TO92_CBE_FORMED_P2.54',
    'onsemi C-B-E reference; formed 2.54 mm leads, check actual transistor. 1k base resistor assumes a small buzzer; measure current.')
two('D1','1N4148',113,48,'+5V','BUZZ_NEG',kind='D',note='Pin 1=CATHODE, stripe at +5V; pin 2=ANODE at buzzer negative. Verify rating for actual buzzer.')
PARTS[-1]['pins'][0]['name']='K'; PARTS[-1]['pins'][1]['name']='A'

def cap(ref,val,x,y,rail,pitch=2.54,diam=None):
    p=two(ref,val,x,y,rail,'GND',pitch,kind='CP' if diam else 'C')
    p['pins'][0]['name']='+' if diam else '1'
    p['pins'][1]['name']='-' if diam else '2'
    if diam:
        for pad in p['pads']: pad['diameter']=1.6
        cx=x+pitch/2
        p['body']=[cx-diam/2,y-diam/2,cx+diam/2,y+diam/2]
        p['note']=f'Radial electrolytic, assumed diameter {diam} mm and lead pitch {pitch} mm. Check actual part and polarity.'
    return p
cap('C1','470uF 16V',123,81,'+5V',3.5,8)
cap('C2','100nF',117,75,'+5V')
cap('C3','100nF',94.62,51,'+5V')
cap('C4','100nF',88,50.5,'+3V3')
cap('C5','10uF 10V',94,47,'+3V3',2,5)
cap('C6','100nF',25,75,'ESP_VIN')
cap('C7','10uF 10V',31,75,'+3V3',2,5)
add('RV1','10k CONTRAST',[('LOW','GND'),('WIPER','LCD_VO'),('HIGH','+5V')],
    [(102.46,79,1.8,.8),(105,81.54,1.8,.8),(107.54,79,1.8,.8)], [101.5,75.5,108.5,82.5],
    'Trimmer_3pin_5.08x2.54','Provisional trimmer footprint, verify model AND wiper pin before order.')
for ref,x,net in [('TP1',113,'+5V'),('TP2',117,'+3V3'),('TP3',121,'GND')]:
    add(ref,net,[(net,net)],[(x,93,2,.9)],[x-1,92,x+1,94],'TestPoint_THT')

NETS=sorted({pin['net'] for p in PARTS for pin in p['pins'] if pin['net']})
NCODES={n:i+1 for i,n in enumerate(NETS)}
ROOT_UUID=uid('schematic-root')

def write_json_csv():
    (OUT/'design.json').write_text(json.dumps(dict(status='UNROUTED_ENGINEERING_DRAFT_NOT_FOR_MANUFACTURE',board=BOARD,
        antenna_keepout_provisional=KEEP,holes=HOLES,parts=PARTS),ensure_ascii=False,indent=2),encoding='utf-8')
    with (OUT/'connections.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.writer(f); w.writerow(['Reference','Pin','Signal','Net','X_mm','Y_mm'])
        for p in PARTS:
            for pin,pad in zip(p['pins'],p['pads']):
                w.writerow([p['ref'],pin['number'],pin['name'],pin['net'] or 'NC',pad['x'],pad['y']])
    with (OUT/'bom.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.writer(f); w.writerow(['Reference','Qty','Value','Footprint','Notes'])
        for p in PARTS: w.writerow([p['ref'],1,p['value'],p['footprint'],p['note']])
    root=ET.Element('export',version='E')
    comps=ET.SubElement(root,'components')
    for p in PARTS:
        c=ET.SubElement(comps,'comp',ref=p['ref'])
        ET.SubElement(c,'value').text=p['value']
        ET.SubElement(c,'footprint').text='RFID_Carrier:'+p['footprint']
    nets=ET.SubElement(root,'nets')
    for n in NETS:
        net=ET.SubElement(nets,'net',code=str(NCODES[n]),name=n)
        for p in PARTS:
            for pin in p['pins']:
                if pin['net']==n: ET.SubElement(net,'node',ref=p['ref'],pin=pin['number'])
    ET.indent(root)
    ET.ElementTree(root).write(OUT/(NAME+'.net'),encoding='utf-8',xml_declaration=True)

def fp(p,library=False):
    x,y=p['pads'][0]['x'],p['pads'][0]['y']
    content=[f'(footprint {q(p["footprint"] if library else "RFID_Carrier:"+p["footprint"])} (layer "F.Cu")']
    if library: content+=['(version 20240108) (generator "rfid_carrier_generator")']
    else: content += [f'(at {num(x)} {num(y)}) (tstamp {uid("fp"+p["ref"])})',f'(path "/{ROOT_UUID}/{uid("symbol"+p["ref"])}")']
    content += ['(attr through_hole)',f'(fp_text reference {q("REF**" if library else p["ref"])} (at 0 -2.2) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))',
        f'(fp_text value {q(p["value"])} (at 0 2.2) (layer "F.Fab") hide (effects (font (size 1 1) (thickness 0.15))))']
    a,b,c,d=p['body']
    for layer,margin in [('F.Fab',0),('F.CrtYd',.25)]:
        content.append(f'(fp_rect (start {num(a-x-margin)} {num(b-y-margin)}) (end {num(c-x+margin)} {num(d-y+margin)}) (stroke (width 0.1) (type default)) (fill none) (layer {q(layer)}))')
    # Pin 1 square; signal names reside in F.Fab / schematic, not tiny overlapping silk.
    for pin,pad in zip(p['pins'],p['pads']):
        shape='rect' if pin['number']=='1' else 'circle'
        net=f'(net {NCODES[pin["net"]]} {q(pin["net"])})' if pin['net'] and not library else ''
        content.append(f'(pad {q(pin["number"])} thru_hole {shape} (at {num(pad["x"]-x)} {num(pad["y"]-y)}) (size {num(pad["diameter"])} {num(pad["diameter"])}) (drill {num(pad["drill"])}) (layers "*.Cu" "*.Mask") {net})')
    content.append(')')
    return '\n'.join(content)

def write_pcb():
    lib=OUT/'RFID_Carrier.pretty'; lib.mkdir(exist_ok=True)
    # All references get unique footprint ids: equal pitch does not imply equal body.
    for p in PARTS:
        p['footprint']=p['ref']+'_'+p['footprint']
        (lib/(p['footprint']+'.kicad_mod')).write_text(fp(p,True),encoding='utf-8')
    (OUT/'fp-lib-table').write_text('(fp_lib_table (version 7) (lib (name "RFID_Carrier")(type "KiCad")(uri "${KIPRJMOD}/RFID_Carrier.pretty")(options "")(descr "Provisional carrier footprints; verify physical components")))\n',encoding='utf-8')
    s=['(kicad_pcb (version 20240108) (generator "rfid_carrier_generator")',
       '(general (thickness 1.6)) (paper "A4")',
       '(layers (0 "F.Cu" signal) (31 "B.Cu" signal) (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (38 "B.Mask" user) (39 "F.Mask" user) (40 "Dwgs.User" user "user.drawings") (44 "Edge.Cuts" user) (46 "B.CrtYd" user "b.courtyard") (47 "F.CrtYd" user "f.courtyard") (48 "B.Fab" user) (49 "F.Fab" user))',
       '(setup (pad_to_mask_clearance 0)) (net 0 "")']
    for n in NETS: s.append(f'(net {NCODES[n]} {q(n)})')
    x0,y0,x1,y1=BOARD
    corners=[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
    for i,(a,b) in enumerate(zip(corners,corners[1:]+corners[:1])):
        s.append(f'(gr_line (start {a[0]} {a[1]}) (end {b[0]} {b[1]}) (stroke (width 0.05) (type default)) (layer "Edge.Cuts") (tstamp {uid("edge"+str(i))}))')
    s += [fp(p) for p in PARTS]
    for i,(x,y,d) in enumerate(HOLES):
        radius=3.0 if d==2.8 else 3.5
        s.append(f'(footprint "MountingHole:MountingHole_{d}mm" (layer "F.Cu") (at {x} {y}) (attr exclude_from_pos_files exclude_from_bom) (tstamp {uid("hole"+str(i))}) (fp_text reference "H{i+1}" (at 0 4) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15)))) (pad "" np_thru_hole circle (at 0 0) (size {d} {d}) (drill {d}) (layers "*.Cu" "*.Mask")))')
        s.append(f'(zone (net 0) (net_name "") (layers "F.Cu" "B.Cu") (tstamp {uid("holezone"+str(i))}) (hatch edge 0.5) (connect_pads (clearance 0)) (min_thickness 0.25) (keepout (tracks not_allowed) (vias not_allowed) (pads not_allowed) (copperpour not_allowed) (footprints allowed)) (fill (thermal_gap 0.3) (thermal_bridge_width 0.3)) (polygon (pts '+ ' '.join(f'(xy {num(x+radius*math.cos(k*math.pi/16))} {num(y+radius*math.sin(k*math.pi/16))})' for k in range(32))+')))')
    a,b,c,d=KEEP
    s.append(f'(zone (net 0) (net_name "") (layers "F.Cu" "B.Cu") (tstamp {uid("antenna-zone")}) (hatch edge 0.5) (connect_pads (clearance 0)) (min_thickness 0.25) (keepout (tracks not_allowed) (vias not_allowed) (pads not_allowed) (copperpour not_allowed) (footprints allowed)) (fill (thermal_gap 0.3) (thermal_bridge_width 0.3)) (polygon (pts (xy {a} {b}) (xy {c} {b}) (xy {c} {d}) (xy {a} {d}))))')
    for text,x,y,size,layer in [('RFID V0.1 - UNROUTED / NOT FOR FAB',68,101,1.3,'Dwgs.User'),('VERIFY ANTENNA / NO COPPER',62.5,59,.85,'Dwgs.User'),('USB LEFT',20,61,1,'Dwgs.User'),('V4 BODY XY - TOP VIEW',33,93,1,'F.SilkS')]:
        s.append(f'(gr_text {q(text)} (at {x} {y}) (layer {q(layer)}) (effects (font (size {size} {size}) (thickness 0.15))))')
    s.append(')')
    (OUT/(NAME+'.kicad_pcb')).write_text('\n'.join(s),encoding='utf-8')
    project={'meta':{'filename':NAME+'.kicad_pro','version':1},'net_settings':{'classes':[
        {'name':'Default','clearance':0.25,'track_width':0.3,'via_diameter':0.8,'via_drill':0.4},
        {'name':'Power','clearance':0.25,'track_width':0.8,'via_diameter':1.0,'via_drill':0.5}],
        'netclass_patterns':[{'netclass':'Power','pattern':n} for n in ['+5V_IN','+5V','ESP_VIN','+3V3','GND']],'version':3}}
    (OUT/(NAME+'.kicad_pro')).write_text(json.dumps(project,indent=2),encoding='utf-8')

def symbol_geom(p):
    count=len(p['pins']); left=(count+1)//2
    height=max(10.16,(left+1)*2.54)
    return left,height

def write_schematic(snap_grid=False):
    # A2 single sheet: embedded symbols, named nets, every pad represented.
    # Rectangular pin-functional symbols intentionally avoid guessed third-party pin numbering.
    s=['(kicad_sch (version 20231120) (generator "rfid_carrier_generator")',f'(uuid {ROOT_UUID}) (paper "A2")',
       '(title_block (title "RFID Carrier V0.1 - ENGINEERING DRAFT") (date "2026-09-22") (rev "0.1 UNROUTED") (comment 1 "NOT FOR MANUFACTURE - verify footprints, ERC/DRC and routing"))', '(lib_symbols']
    defs=[]
    for p in PARTS:
        ref=p['ref']; name='Part_'+ref; left,height=symbol_geom(p)
        d=[f'(symbol "RFID_Carrier:{name}" (pin_names (offset 0.5)) (in_bom yes) (on_board yes)',
           f'(property "Reference" {q(re.sub(r"[0-9]", "",ref))} (at 0 {num(height/2+3)} 0) (effects (font (size 1.27 1.27))))',
           f'(property "Value" {q(p["value"])} (at 0 {num(-height/2-3)} 0) (effects (font (size 1.27 1.27))))',
           f'(property "Footprint" {q("RFID_Carrier:"+p["footprint"])} (at 0 0 0) (effects (font (size 1.27 1.27)) hide))',
           f'(symbol "{name}_0_1" (rectangle (start -12.7 {num(height/2)}) (end 12.7 {num(-height/2)}) (stroke (width 0.254) (type default)) (fill (type background))))',
           f'(symbol "{name}_1_1"']
        for i,pin in enumerate(p['pins']):
            side=i<left; idx=i if side else i-left; x=-17.78 if side else 17.78; y=height/2-2.54*(idx+1)
            d.append(f'(pin {pin["type"]} line (at {num(x)} {num(y)} {0 if side else 180}) (length 5.08) (name {q(pin["name"])} (effects (font (size 1.0 1.0)))) (number {q(pin["number"])} (effects (font (size 1.0 1.0)))))')
        d+=['))']; defs.append('\n'.join(d))
    s+=defs; s+=[')']
    for idx,p in enumerate(PARTS):
        ref=p['ref']; x=58+(idx%5)*108; y=51+(idx//5)*49
        if snap_grid:
            x=round(round(x/1.27)*1.27,4); y=round(round(y/1.27)*1.27,4)
        left,height=symbol_geom(p)
        s += [f'(symbol (lib_id "RFID_Carrier:Part_{ref}") (at {x} {y} 0) (unit 1) (in_bom yes) (on_board yes) (dnp no) (uuid {uid("symbol"+ref)})',
              f'(property "Reference" {q(ref)} (at {x} {num(y-height/2-5)} 0) (effects (font (size 1.27 1.27))))',
              f'(property "Value" {q(p["value"])} (at {x} {num(y-height/2-2.5)} 0) (effects (font (size 1.27 1.27))))',
              f'(property "Footprint" {q("RFID_Carrier:"+p["footprint"])} (at {x} {y} 0) (effects (font (size 1.27 1.27)) hide))']
        for pin in p['pins']: s.append(f'(pin {q(pin["number"])} (uuid {uid(ref+"pin"+pin["number"])}))')
        s.append(f'(instances (project {q(NAME)} (path "/{ROOT_UUID}" (reference {q(ref)}) (unit 1)))))')
        for i,pin in enumerate(p['pins']):
            side=i<left; ix=i if side else i-left; px=x+(-17.78 if side else 17.78); py=y-height/2+2.54*(ix+1)
            if pin['net']:
                end=px+(-7.62 if side else 7.62)
                s.append(f'(wire (pts (xy {num(px)} {num(py)}) (xy {num(end)} {num(py)})) (stroke (width 0) (type default)) (uuid {uid(ref+"wire"+str(i))}))')
                s.append(f'(label {q(pin["net"])} (at {num(end)} {num(py)} {0 if side else 180}) (effects (font (size 1 1)) (justify left bottom)) (uuid {uid(ref+"label"+str(i))}))')
            else:
                s.append(f'(no_connect (at {num(px)} {num(py)}) (uuid {uid(ref+"nc"+str(i))}))')
    s.append('(text "DRAFT: all same-name labels connect. J6/J7: USB left, antenna right. Confirm module pin labels.\nNo copper routing yet. Footprints and power sources require final ERC/DRC review." (at 25 392 0) (effects (font (size 1.5 1.5)) (justify left)) (uuid '+uid('draft-note')+'))')
    s.append(')')
    (OUT/(NAME+'.kicad_sch')).write_text('\n'.join(s),encoding='utf-8')
    (OUT/'RFID_Carrier.kicad_sym').write_text('(kicad_symbol_lib (version 20231120) (generator "rfid_carrier_generator")\n'+'\n'.join(d.replace('"RFID_Carrier:Part_','"Part_') for d in defs)+'\n)',encoding='utf-8')
    (OUT/'sym-lib-table').write_text('(sym_lib_table (version 7) (lib (name "RFID_Carrier")(type "KiCad")(uri "${KIPRJMOD}/RFID_Carrier.kicad_sym")(options "")(descr "Pin-functional draft symbols")))\n',encoding='utf-8')

def font(size,bold=False):
    path=Path('C:/Windows/Fonts')/('arialbd.ttf' if bold else 'arial.ttf')
    return ImageFont.truetype(str(path),size)

def preview():
    im=Image.new('RGB',(1800,1130),'#f2f5f8'); d=ImageDraw.Draw(im)
    d.text((60,35),'RFID / V4 kutu için ilk taşıyıcı PCB',(20,39,56),font(38,True))
    d.text((60,91),'V0.1  •  30 pin DevKit V1  •  128 × 58 mm  •  Yerleşim taslağı, bakır yollar henüz çizilmedi',(69,86,102),font(23))
    scale=10; ox,oy=100,155
    def xy(x,y): return (ox+x*scale,oy+y*scale)
    # Enclosure cross-section at the carrier's mounting plane, derived from STL.
    tris=load(ROOT/'output/enclosure_v4/gövde.stl'); tris-=tris.reshape(-1,3).min(0)
    for a,b in section(tris,9.5): d.line([xy(*a),xy(*b)],fill='#b9c4ce',width=2)
    # Compact the drawing vertically by cropping the region shown, without changing XY relationships.
    b=BOARD; d.rectangle([xy(b[0],b[1]),xy(b[2],b[3])],fill='#185d4e',outline='#103e34',width=4)
    a,b,c,e=KEEP; d.rectangle([xy(a,b),xy(c,e)],fill='#d8b365',outline='#a37e2a',width=2)
    d.text(xy(51,54),'ANTEN',(68,48,14),font(21,True))
    d.text(xy(51,57.5),'BAKIR YOK',(68,48,14),font(17,True))
    d.text(xy(51,61),'Sınır doğrulanacak',(68,48,14),font(13))
    # DevKit body is an assumed physical envelope from prior measurements, clearly distinct from sockets.
    d.rectangle([xy(4.1,40.9),xy(48.9,69.1)],outline='#cbd9e2',width=2)
    d.text(xy(18,53),'ESP32',(236,245,246),font(28,True)); d.text(xy(15,57),'USB ←',(236,245,246),font(23))
    for p in PARTS:
        a,b,c,e=p['body']
        if p['ref'] not in ['J6','J7']:
            d.rectangle([xy(a,b),xy(c,e)],fill='#263c43',outline='#97b1b5',width=1)
        for pin,pad in zip(p['pins'],p['pads']):
            x,y=xy(pad['x'],pad['y']); r=pad['diameter']*scale/2
            if pin['number']=='1': d.rectangle((x-r,y-r,x+r,y+r),fill='#e6c66b')
            else: d.ellipse((x-r,y-r,x+r,y+r),fill='#e6c66b')
            r=pad['drill']*scale/2; d.ellipse((x-r,y-r,x+r,y+r),fill='#17362f')
        label={'C5':(98,46),'C3':(98,50),'J1':(128,58)}.get(p['ref'],(a,b-2))
        x,y=xy(*label)
        d.text((x,y),p['ref'],fill='#ffffff',font=font(14,True))
    for i,(x,y,h) in enumerate(HOLES):
        X,Y=xy(x,y); r=(3.0 if h==2.8 else 3.5)*scale; d.ellipse((X-r,Y-r,X+r,Y+r),outline='#dfe7ea',width=2)
        r=h*scale/2; d.ellipse((X-r,Y-r,X+r,Y+r),fill='#f2f5f8')
    # Hide empty upper part by moving the whole XY drawing to a higher position in final image.
    region=im.crop((0,480,1800,1130)); final=Image.new('RGB',(1800,990),'#f2f5f8')
    final.paste(im.crop((0,0,1800,150)),(0,0)); final.paste(region,(0,150)); d=ImageDraw.Draw(final)
    d.text((100,820),'J2 RFID   •   J3 LCD   •   J4 LED’ler   •   J5 Buzzer   •   J1 5 V giriş',(31,57,73),font(24,True))
    d.text((100,865),'Sekiz delik V4 STL’den ölçüldü. Soket aralığı 25,40 mm varsayım; gerçek kartla kontrol gerekli.',(68,85,100),font(23))
    d.text((100,904),'İz bağlantıları, KiCad ERC/DRC ve fiziksel deneme tamamlanmadan üretime gönderilmez.',(151,65,34),font(23,True))
    final.save(OUT/'pcb_yerlesim.png')

def check():
    checks=[]; failures=[]
    def test(label,value):
        checks.append({'check':label,'passed':bool(value)})
        if not value: failures.append(label)
    test('Unique component references',len({p['ref'] for p in PARTS})==len(PARTS))
    pins={(p['ref'],pin['number']):pin['net'] for p in PARTS for pin in p['pins']}
    test('RC522 3V3 only',pins[('J2','8')]=='+3V3')
    test('LCD RW grounded',pins[('J3','5')]=='GND')
    test('AHCT unused inputs grounded',pins[('U1','15')]==pins[('U1','17')]=='GND')
    test('AHCT enables grounded',pins[('U1','1')]==pins[('U1','19')]=='GND')
    test('Buzzer diode cathode +5V',pins[('D1','1')]=='+5V' and pins[('D1','2')]=='BUZZ_NEG')
    firmware=(ROOT/'esp32-device/rfid_personel_device/rfid_personel_device.ino').read_text(encoding='utf-8-sig')
    expected={'RFID_SS_PIN':5,'RFID_RST_PIN':27,'GREEN_LED_PIN':26,'RED_LED_PIN':33,'BUZZER_PIN':14,'LCD_RS_PIN':32,'LCD_ENABLE_PIN':25,'LCD_D4_PIN':22,'LCD_D5_PIN':21,'LCD_D6_PIN':16,'LCD_D7_PIN':17}
    test('Firmware GPIO defines match',all(re.search(r'#define\s+'+name+r'\s+'+str(value)+r'\b',firmware) for name,value in expected.items()))
    electrical=[]
    for p in PARTS:
        for pin,pad in zip(p['pins'],p['pads']): electrical.append((p['ref'],pin,pad))
    edge_ok=True; holes_ok=True; keep_ok=True; clearance_ok=True
    clearance_issues=[]
    for ref,pin,pad in electrical:
        x,y,r=pad['x'],pad['y'],pad['diameter']/2
        edge_ok &= x-r>=BOARD[0]+.25 and x+r<=BOARD[2]-.25 and y-r>=BOARD[1]+.25 and y+r<=BOARD[3]-.25
        holes_ok &= all(math.hypot(x-hx,y-hy)>(3.0 if hd==2.8 else 3.5)+r for hx,hy,hd in HOLES)
        keep_ok &= not(x+r>KEEP[0] and x-r<KEEP[2] and y+r>KEEP[1] and y-r<KEEP[3])
    for i,(ref,pin,pad) in enumerate(electrical):
        for ref2,pin2,pad2 in electrical[i+1:]:
            if pin['net'] and pin['net']==pin2['net']: continue
            gap=math.hypot(pad['x']-pad2['x'],pad['y']-pad2['y'])-(pad['diameter']+pad2['diameter'])/2
            if gap<.25:
                clearance_ok=False; clearance_issues.append([ref,pin['number'],ref2,pin2['number'],round(gap,3)])
    test('All pads inside PCB edge with >=0.25mm copper margin',edge_ok)
    test('Pads clear M2.5/M3 screw-head exclusion radii 3.0/3.5mm',holes_ok)
    test('No pads in provisional antenna region',keep_ok)
    test('Round-pad center clearance >=0.25mm (NOT full KiCad DRC)',clearance_ok)
    geometry=json.loads((OUT/'v4_geometry.json').read_text(encoding='utf-8'))
    measured=geometry['gövde.stl']['slices']['9.5']
    test('Eight mounting centers within 0.06mm of STL sections',all(any(math.hypot(x-v['center'][0],y-v['center'][1])<.06 and 2<v['size'][0]<3 for v in measured) for x,y,d in HOLES))
    report={'checks':checks,'clearance_issues':clearance_issues,'failures':failures,
        'not_performed':['KiCad application parse/ERC/DRC','Copper routing and continuity','Full 3D component collision test','Physical fit and power/RF test'],
        'manufacturing_release':False}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))
    if failures: raise SystemExit('Fix failed draft checks before delivery')

if __name__=='__main__':
    write_pcb()
    write_schematic()
    write_json_csv()
    preview()
    check()
