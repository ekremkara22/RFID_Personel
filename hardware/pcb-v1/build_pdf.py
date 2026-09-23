"""Create the review packet. Page 1 is physical 1:1 geometry, never a copper-transfer mask."""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, A2, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from inspect_stl import load, section

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
DEST=ROOT/'output/pdf/rfid_pcb_v01_inceleme.pdf'
DEST.parent.mkdir(parents=True,exist_ok=True)
DATA=json.loads((OUT/'design.json').read_text(encoding='utf-8'))
for name,path in [('Arial','arial.ttf'),('ArialBold','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+path))
c=canvas.Canvas(str(DEST),pagesize=A4)
c.setTitle('RFID PCB V0.1 - V4 kutu / prototip incelemesi')
c.setAuthor('RFID Personel')

def text(x,y,s,size=10,bold=False,color='#233e50'):
    c.setFillColor(color); c.setFont('ArialBold' if bold else 'Arial',size)
    c.drawString(x*mm,y*mm,s)

def heading(title,sub):
    text(18,280,title,19,True)
    text(18,270,sub,9)
    c.setStrokeColorRGB(.8,.84,.87); c.line(18*mm,264*mm,192*mm,264*mm)

def lines(x,y,rows,size=9,step=5):
    for i,s in enumerate(rows): text(x,y-i*step,s,size)

heading('V4 / PCB mekanik kontrolü','V0.1 - %100 gerçek boyut - Sayfaya sığdırma KAPALI - Üretim maskesi değildir')
ox,oy=20,248
def pt(x,y): return ((ox+x)*mm,(oy-y)*mm)
c.setLineWidth(.12*mm); c.setStrokeColorRGB(.75,.78,.8)
tris=load(ROOT/'output/enclosure_v4/gövde.stl'); tris-=tris.reshape(-1,3).min(0)
for a,b in section(tris,9.5): c.line(*pt(*a),*pt(*b))
x0,y0,x1,y1=DATA['board']
c.setStrokeColorRGB(0,0,0); c.setLineWidth(.25*mm)
c.rect((ox+x0)*mm,(oy-y1)*mm,(x1-x0)*mm,(y1-y0)*mm)
for i,(x,y,d) in enumerate(DATA['holes']):
    X,Y=pt(x,y); c.circle(X,Y,d/2*mm); c.line(X-2*mm,Y,X+2*mm,Y); c.line(X,Y-2*mm,X,Y+2*mm)
    text(ox+x+2,oy-y-3,'H'+str(i+1),6)
for p in DATA['parts']:
    if p['ref'] not in ['J6','J7']: continue
    for i,pad in enumerate(p['pads']):
        X,Y=pt(pad['x'],pad['y']); c.circle(X,Y,.5*mm)
        if i==0: c.rect(X-1*mm,Y-1*mm,2*mm,2*mm)
    text(ox+13,oy-p['pads'][0]['y']+(5 if p['ref']=='J6' else 3),p['ref']+'  /  1 -> 15',7)
text(ox+15,oy-55,'USB <   ESP32 DevKit V1',8,True)
text(ox+83,oy-67,'TAŞIYICI PCB',9,True)
text(ox+83,oy-72,'128 x 58 mm',8)
c.setDash(2*mm,1*mm)
a,b,d,e=DATA['antenna_keepout_provisional']
c.rect((ox+a)*mm,(oy-e)*mm,(d-a)*mm,(e-b)*mm)
c.setDash()
text(ox+50,oy-61,'ANTEN',7)
text(ox+50,oy-65,'BAKIR YOK',6)
text(20,124,'Gri: V4 gövde STL kesiti. Siyah: PCB sınırı, delikler ve ESP32 soketleri.',8)
c.setLineWidth(.4*mm); c.line(20*mm,114*mm,70*mm,114*mm)
for x in [20,70]: c.line(x*mm,112*mm,x*mm,116*mm)
text(77,112,'Bu çizgi cetvelle TAM 50 mm olmalı.',9,True)
lines(20,100,[
    '1. Önce 50 mm çizgisini ölçün; çıktı ölçekli değilse parçalarla karşılaştırmayın.',
    '2. Kartı/şablonu V4 içindeki sekiz vida ayağına hizalayın. Gri çerçeve 150 x 110 mm.',
    '3. ESP32 iki pin sırası için 25,40 mm VARSAYILDI; gerçek kartla doğrulayın.',
    '4. Pin adımı 2,54 mm. USB solda. J6 pin 1=VIN; J7 pin 1=3V3.',
    '5. PCB altı Z=10 mm, üstü Z=11,6 mm. Soket yüksekliği ayrıca eklenir.',
    '6. USB açıklığı ve fiş gövdesi soket yüksekliğiyle birlikte kontrol edilmelidir.',
    '7. Kapağın arkasındaki ekran/okuyucu için bu karta doğrudan geçme varsayılmadı.'
],9,6)
text(20,42,'BU DOSYA ÜRETİME HAZIR BİR PCB DEĞİLDİR.',11,True,'#9b452b')
text(20,34,'Yollar, KiCad ERC/DRC, gerçek parça ölçüleri ve montaj testi henüz tamamlanmadı.',8)
text(20,19,'RFID Personel / donanım V0.1',8); text(181,19,'1 / 3',8)
c.showPage()

heading('Devre ve bağlantı özeti','Mevcut GPIO eşlemesi korunur. Geliştirme kartı soketten sökülüp değiştirilebilir.')
def box(x,y,w,h,title,rows):
    c.setStrokeColorRGB(.3,.5,.55); c.setFillColorRGB(.95,.97,.97); c.setLineWidth(.25*mm)
    c.roundRect(x*mm,(y-h)*mm,w*mm,h*mm,2*mm,stroke=1,fill=1)
    text(x+3,y-6,title,10,True)
    lines(x+3,y-12,rows,8,4.6)

box(20,253,170,27,'GÜÇ: J1 -> F1 -> +5V',[
    '+5V -> LCD / SN74AHCT244 / buzzer. JP1 üzerinden ESP32 VIN.',
    'ESP32 3V3 -> RC522. Bütün GND hatları ortaktır. Yalnızca regüle 5V giriş.'])
box(20,217,78,49,'ESP32 / hazır DevKit V1',[
    'LCD: GPIO32, 25, 22, 21, 16, 17',
    'RFID: SS=5; RST=27',
    'SCK=18; MOSI=23; MISO=19',
    'Yeşil=26; kırmızı=33; buzzer=14',
    'J6/J7: iki adet 1x15 dişi soket'])
box(107,217,83,49,'U1 -> J3 / paralel LCD',[
    'SN74AHCT244N: 3,3V -> 5V',
    'RN1: altı girişe 10k pull-down',
    'RW=GND; D0-D3 bağlanmaz',
    'RV1: kontrast; R5: arka ışık',
    '16 pin şerit kablo; 12 aktif hat'])
box(20,160,78,36,'J2 / RC522',[
    '3,3V besleme, 5V bağlanmaz.',
    'R7/R8: SCK/MOSI üzerinde 33R',
    'R6: SS üzerinde 10k pull-up',
    'IRQ boş; kablo isimle eşlenir.'])
box(107,160,83,36,'J4 / LED ve J5 / buzzer',[
    'LED başına kart üzerinde 220R',
    'GPIO14 -> 1k -> BC337 base',
    'Emitter=GND, collector=buzzer -',
    'D1 katodu +5V; R4=100k B-E'])
text(20,113,'Parça seçimi / kontrol bekleyenler',12,True)
lines(20,104,[
    'DevKit sıra aralığı, soket yüksekliği ve pin etiketleri; USB fişinin kutuya erişimi.',
    'Konnektör modelleri, C1 çapı/pin aralığı, BC337 bacak sırası, RV1 sürgü pini.',
    'Buzzer akımı, LCD arka ışık akımı ve besleme düşümü; F1 son seçimi.',
    'PCB anten boşluğu, kapak altındaki kablo payı ve kapalı kutuda RF testi.'
],9,6)
text(20,72,'İlk montajda besleme kuralı',12,True)
lines(20,63,[
    'USB ve harici 5V aynı anda bağlanmaz; JP1 bir güç seçme devresi değildir.',
    'İlk denemede programlamak için ESP32 soketten çıkarılır. Güç kesikken takılır.',
    'Bu taslakta ters polarite koruması ve 9/12V düşürücü bulunmaz.'
],9,6)
text(20,37,'Teknik dayanaklar: proje firmware/bağlantı belgesi; TI AHCT244;',8)
text(20,32,'onsemi BC337; Bourns MF-R; Espressif yerleşim kılavuzu. Linkler README.md içinde.',8)
text(20,19,'Şema ve yerleşim ayrı dosyalarda düzenlenebilir.',8); text(181,19,'2 / 3',8)
c.showPage()

# Native schematic's pin-functional view, generated from the same declared netlist.
# This is a review export, not a claim that KiCad rendered or accepted the files.
c.setPageSize(landscape(A2)); pagew,pageh=landscape(A2)
text(18,404,'V0.1 / pin düzeyinde devre şeması',18,True)
text(18,394,'Aynı isimli hatlar bağlıdır. NC bağlanmaz. İşlevsel kutular fiziksel pin sırasını göstermez; numaralar esas alınır.',10)
for idx,p in enumerate(DATA['parts']):
    col,row=idx%5,idx//5; x=57+108*col; cy=365-49*row
    left=(len(p['pins'])+1)//2; h=max(10.16,(left+1)*2.54)
    c.setStrokeColorRGB(.25,.4,.5); c.setLineWidth(.2*mm); c.setFillColorRGB(.97,.98,.99)
    c.rect((x-12.7)*mm,(cy-h/2)*mm,25.4*mm,h*mm,stroke=1,fill=1)
    text(x-12.7,cy+h/2+5,p['ref'],9,True)
    text(x-12.7,cy+h/2+1.7,p['value'],7)
    for i,pin in enumerate(p['pins']):
        isleft=i<left; j=i if isleft else i-left; y=cy+h/2-2.54*(j+1)
        if isleft:
            c.line((x-17.8)*mm,y*mm,(x-12.7)*mm,y*mm)
            text(x-12,y-.6,pin['number']+' '+pin['name'],5.5)
            c.setFont('Arial',6); c.drawRightString((x-18.5)*mm,(y-.6)*mm,pin['net'] or 'NC')
        else:
            c.line((x+12.7)*mm,y*mm,(x+17.8)*mm,y*mm)
            c.setFont('Arial',5.5); c.drawRightString((x+12)*mm,(y-.6)*mm,pin['name']+' '+pin['number'])
            text(x+18.5,y-.6,pin['net'] or 'NC',6)
text(18,21,'Kaynak: design.json / bağlantı etiketleri. KiCad ERC/DRC ve bakır yönlendirme tamamlanmadı.',10,True,'#9b452b')
text(555,21,'3 / 3',9)
c.save()
print(DEST)
