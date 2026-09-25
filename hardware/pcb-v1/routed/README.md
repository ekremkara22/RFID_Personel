# RFID taşıyıcı PCB V0.2 — V4 kutu

Bu klasör V0.1 yerleşim taslağının bakır yolları çizilmiş prototip revizyonudur.
30 pin ESP32 DevKit V1 sökülebilir iki 1×15 dişi sokete takılır. Firmware GPIO
bağlantıları, V4 kart sınırı ve sekiz vida deliği korunur.

**Fiziksel prototip henüz üretilmedi veya çalıştırılmadı.** Dijital kontrollerin
sonuçları `validation.json`, `drc.json` ve `erc.json` içindedir. Siparişten önce
aşağıdaki üç fiziksel kontrol yapılmalıdır; bu dosyalar ölçülmemiş parçaların
mekanik uyumunu garanti etmez.

## Açılacak dosyalar

- `rfid_carrier_v01.kicad_pro`: proje; dosya adı şema/PCB referanslarını korumak için sabit kaldı, revizyon V0.2'dir.
- `rfid_carrier_v01.kicad_pcb`: iki katmanlı bakır yolları ve GND dolguları.
- `rfid_carrier_v01.kicad_sch`: elektrik şeması; global hat adları PCB ile aynıdır.
- `pcb_routed.png`: gerçek PCB geometrisinden üretilen üst/alt bakır görünümü.
- `mechanical_1to1.svg`: fiziksel parçalarla kontrol için %100 boyutta baskı şablonu.
- `gerber/`: iki bakır, iki maske, iki baskı katmanı, kart sınırı ve ayrı PTH/NPTH delik dosyaları.
- `connections.csv`, `bom.csv`: bağlantılar ve taşıyıcı kartın parça listesi.
- `native.net`: KiCad'in gerçek şemadan dışa aktardığı netlist.
- `validation.json`: şema–PCB–kaynak bağlantı karşılaştırması, hat uzunlukları ve PCB SHA-256 özeti.
- `RFID_Carrier.pretty/`, `RFID_Carrier.kicad_sym`, `*-lib-table`: proje ile taşınan yerel kütüphaneler.

Bir üst klasördeki V0.1 dosyaları ve eski inceleme PDF'si arşiv taslağıdır;
üretim için bu revizyonun dosyaları esas alınır.

## Tasarım kuralları ve değişiklikler

| Özellik | V0.2 |
|---|---|
| Kart | 128 × 58 mm, 1,6 mm, 2 katman; başlangıç 35 µm / 1 oz bakır |
| Kart koordinatları | V4 gövdesi normalize XY; X=4…132, Y=39…97 mm |
| Sinyal yolları | 0,30 mm |
| Güç yolları | 0,50 mm; GND ayrıca iki yüzeyde dolgu |
| Minimum elektriksel açıklık | 0,20 mm |
| Via | 1,00 mm bakır / 0,50 mm delik |
| ESP32 soket pedleri | 1,60 mm bakır / 1,00 mm delik; 2,54 mm adım |
| Soket sıra merkezleri | **25,40 mm varsayım — gerçek kartta ölçülecek** |
| Anten boşluğu | X=49…76, Y=39…85 mm; iki katmanda yol/via/dolgu yok |
| Vida boşlukları | 2,8 mm delikte 3,0 mm; 3,2 mm delikte 3,5 mm yarıçaplı bakırsız bölge |

V0.1'deki 0,80 mm güç yolu ve 0,25 mm açıklık önerisi bu yerleşimde soket
sıralarından geçişi engellediği için revize edildi. R7/R8 seri dirençleri ESP32
tarafına alındı; F1, C3, C5, Q1 ve RV1 montaj boşlukları düzeltildi. Güç
kaynakları şemada PWR_FLAG ile belirtildi. Kontroller için ihlal istisnası
eklenmedi. NPTH deliklerin koruma bölgesinde bulunabilmesi için bu bölgelerde
pad yasağı kullanılmaz; gerçek bileşen bakır pedleri ayrıca denetlenir.

## Siparişten önce üç kontrol

1. **ESP32:** iki pin sırası merkezini ölçün; 25,40 mm olmalı. Üstten bakışta
   USB solda, anten sağda; J6 soldan VIN, J7 soldan 3V3 ile başlar. Kart
   etiketlerini `connections.csv` ile tek tek eşleştirin.
2. **Kutu:** `mechanical_1to1.svg` dosyasını gerçek boyut / %100 basın; 50 mm
   çizgiyi cetvelle doğrulayın. Sekiz vida, kart sınırı, soket yüksekliği ve USB
   fişini V4 baskıda deneyin. PCB altı hedef Z=10 mm; mevcut USB penceresi
   yaklaşık Z=9…21 mm. Soket ESP32'yi yükselttiği için pencere değişikliği gerekebilir.
3. **BOM:** RV1 sürgü bacağı, J1 5,08 mm terminal, BC337 C-B-E, elektrolitik
   çap/adım, RN1 ortak bacak ve seçilen dişi soketlerin gövdelerini kontrol edin.
   J2…J5 genel 2,54 mm pin sıralarıdır; kilitli konnektör gövdeleri doğrulanmadı.

## Montaj ve ilk çalıştırma

- J1 yalnız **regüle 5 V DC** içindir. 12 V girişi, ters kutup koruması ve USB
  ile harici güç arasında otomatik seçim devresi yoktur. İlk programlamada
  ESP32'yi taşıyıcıdan çıkarıp USB ile programlayın. Harici beslemeyle kullanımda JP1 takılır.
- U1 **SN74AHCT244N DIP-20** olmalıdır. RN1 ortak ucu pin 1 olan 8×10 kΩ
  bussed SIP-9 ağıdır. LCD paralel 4-bit arayüz kullanır; I2C adaptör gerekmez.
- J2 RC522 sadece 3,3 V'tur. Soket sırası isimle eşleştirilir; kablo renkleri
  esas alınmaz. RFID kablosunu kısa tutun. Uzun bakır hatların/kablonun gerçek
  SPI okuma kararlılığı donanım üzerinde denenmelidir.
- R5=330 Ω LCD arka ışığı için başlangıç değeridir; ekranın gerçek akımı ve
  dahili direnci ölçülmeden köprülemeyin. Buzzer, Q1 ve D1 uygunluğu gerçek
  buzzer akımına bağlıdır. F1'in 0,75 A değeri kart için doğrulanmış akım kapasitesi değildir.
- Önce modüller çıkarılmışken kısa devre ve kutup kontrolü yapın. Akım sınırlı
  5 V ile besleyin; sonra gücü kesip ESP32, ekran, RC522 ve buzzerı sırayla ekleyin.
  Wi-Fi + arka ışık + buzzer eşzamanlı çalışırken 5 V / 3V3 düşümünü, resetleri,
  sıcaklığı ve kapak kapalı RFID menzilini kontrol edin.

## Doğrulama ve yeniden üretme

Doğrulama için resmi imzalı KiCad **10.99.0-4384-g95775e4647** CLI kullanıldı.
PCB/şema kaynakları KiCad 8 dosya sözdizimini korur; KiCad 8 uygulamasıyla
ayrıca denenmedi. Freerouting yerel çalıştırıldı; tasarım harici yönlendirme
servisine yüklenmedi. Donanım güç/ısı, sinyal bütünlüğü veya RF laboratuvar testi yapılmadı.

`prepare.py` yerleşim ve şema kaynağını üretir ve **mevcut bakır yollarını siler**.
`export_dsn.py` yönlendirme girdisini, `import_ses.py` SES'ten bakır yollarını
oluşturur. `finish_board.py` GND bölgelerini ekler; dolgu KiCad tarafından
yapılır. `review.py` gerçek PCB dosyasından kontrol raporu ve görsel üretir.
El ile düzenlenmiş PCB üzerine `prepare.py` çalıştırmayın.

Şema değişikliğinde ERC, şema–PCB netlist karşılaştırması ve DRC; her PCB
değişikliğinde dolgu yenileme, tüm DRC kontrolleri ve Gerber/delik dışa aktarımı
tekrarlanmalıdır. `validation.json` içindeki SHA-256, raporun hangi PCB'ye ait
olduğunu gösterir.
