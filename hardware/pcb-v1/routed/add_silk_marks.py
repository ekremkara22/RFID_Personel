"""Add assembly marks to F.SilkS: pin-1 dots, electrolytic '+', diode cathode bar, Q1 C/B/E.

Usage: python add_silk_marks.py   (after finish_board.py retain-compatible)
Marks are board-level graphics so footprints stay unchanged. Run native DRC afterwards.
"""
from pathlib import Path
import sys
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from validate_files import parse,child,children
P=HERE/'rfid_carrier_v01.kicad_pcb'
TAG='ASSEMBLY MARK'

def main():
 s=P.read_text(encoding='utf-8')
 assert TAG not in s,'marks already present'
 fps={}
 for f in children(parse(P),'footprint'):
  ref=[x for x in children(f,'fp_text') if x[1]=='reference']
  if not ref:continue
  x,y=map(float,child(f,'at')[1:3])
  pads={p[1]:(x+float(child(p,'at')[1]),y+float(child(p,'at')[2]),float(child(p,'size')[1])) for p in children(f,'pad')}
  fps[ref[0][2]]=pads
 out=[f'(gr_text "{TAG}" (at 68 103) (layer "Dwgs.User") (effects (font (size 0.8 0.8) (thickness 0.12))))']
 def away(ref,gap):
  # Point beside pad 1, away from pad 2.
  x1,y1,size=fps[ref]['1'];x2,y2,_=fps[ref]['2']
  # Vertical parts get the mark on the left: their reference text sits above pad 1.
  dx,dy=(1,0) if abs(x2-x1)>=abs(y2-y1) and x2<x1 else (-1,0)
  d=size/2+gap
  return x1+dx*d,y1+dy*d
 for ref in ['J1','J2','J3','J4','J5','J6','J7','JP1','U1','RN1','RV1']:
  x,y=away(ref,.65)
  out.append(f'(gr_circle (center {x:.2f} {y:.2f}) (end {x+.3:.2f} {y:.2f}) (stroke (width 0.15) (type solid)) (fill solid) (layer "F.SilkS"))')
 for ref in ['C1','C5','C7']:
  x,y=away(ref,.9)
  out.append(f'(gr_text "+" (at {x:.2f} {y:.2f}) (layer "F.SilkS") (effects (font (size 1.2 1.2) (thickness 0.2))))')
 # D1 pad 1 is the cathode (+5V): bar on the cathode side.
 x,y,size=fps['D1']['1'];bx=x-size/2-.55
 out.append(f'(gr_line (start {bx:.2f} {y-1:.2f}) (end {bx:.2f} {y+1:.2f}) (stroke (width 0.3) (type solid)) (layer "F.SilkS"))')
 for pin,label in [('1','C'),('2','B'),('3','E')]:
  x,y,size=fps['Q1'][pin]
  out.append(f'(gr_text "{label}" (at {x:.2f} {y+size/2+.9:.2f}) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.15))))')
 P.write_text(s.rstrip()[:-1].rstrip()+'\n'+'\n'.join(out)+'\n)\n',encoding='utf-8')
 print(len(out)-1,'marks added')

if __name__=='__main__':main()
