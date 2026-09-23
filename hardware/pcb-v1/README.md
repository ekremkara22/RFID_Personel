# RFID taşıyıcı PCB V0.1 - V4 kutu

**Durum: elektrik bağlantıları tanımlanmış, parçaları yerleştirilmiş, bakır yolları henüz çizilmemiş ilk taslak. Üretime hazır değildir.**

Bu paket 30 pinli ESP32 DevKit V1'i sökülebilir iki soket üzerinde kullanır. Mevcut çalışan firmware'in GPIO bağlantıları korunur. ESP32, LCD veya RC522'nin fiziksel örnekleri bu çalışma sırasında ölçülmedi; kart çalıştırılmadı. Gerber üretilmedi.

## Dosyalar

- `rfid_carrier_v01.kicad_pro`: KiCad proje dosyası.
- `rfid_carrier_v01.kicad_sch`: gömülü sembolleri olan elektrik şeması; aynı isimli net etiketleri birbirine bağlıdır.
- `rfid_carrier_v01.kicad_pcb`: 128 × 58 mm, 1,6 mm, iki katmanlı taslak; net atamaları ve anten/vida bölgeleri var, yollar yok.
- `RFID_Carrier.pretty/`, `RFID_Carrier.kicad_sym`, kütüphane tabloları: taşınabilir yerel parçalar. Footprint'ler fiziksel doğrulama bekliyor.
- `connections.csv`: her bileşenin her bacağı ve bağlandığı hat.
- `bom.csv`: parça listesi; ESP32 modülü, LCD, RC522, iki LED, buzzer, kutu, kablo, eş soketler ve bağlantı elemanları ayrıca gerekir.
- `design.json`: parametrik elektrik ve yerleşim kaynağı.
- `pcb_yerlesim.png`: yerleşim görünümü; üretim çizimi değildir.
- `v4_geometry.json`: kaynak STL özetleri, dosya hash'leri ve kesitlerden bulunan geometriler.
- `validation.json`, `file_validation.json`: yapılan sınırlı kontroller ve yapılmayanlar.
- `../../output/pdf/rfid_pcb_v01_inceleme.pdf`: 1:1 mekanik kontrol sayfası ve devre özeti.

KiCad 8+ dosya sözdizimi hedeflendi. Bu makinede KiCad bulunmadığından uygulamada açılış, ERC ve DRC henüz doğrulanmadı. `.kicad_pro` dosyasını açın; şema ve kartta karşılıklı referans UUID'leri bulunur. Şemadan PCB güncellemesi yapmadan önce yedek alın.

## V4'ten ölçülen mekanik düzen

Kaynaklar `output/enclosure_v4/gövde.stl` ve `kapak.stl` dosyalarıdır. STL birimi proje bağlamına göre mm kabul edilir. Dosyalardaki negatif yerleşim koordinatları normalize edildi; **gövdenin minimum X/Y köşesi (0,0)** kabul edilir. Çizimler bu XY koordinatlarını gösterir, kullanıcı bakış açısına göre ön/arka isimlendirme yapılmaz.

| Özellik | Değer |
|---|---|
| Gövde dışı | 150 × 110 × 52 mm |
| Kapak STL sınırları | 150 × 110 × 8,498 mm; bu üçüncü ölçü ayaklarla toplam zarf, kapak et kalınlığı değildir |
| PCB sınırı | X=4…132; Y=39…97 mm |
| PCB boyutu | 128 × 58 × 1,6 mm |
| PCB alt yüzeyinin hedef yüksekliği | Gövde STL tabanından Z=10 mm |
| ESP32 bölgesi delikleri | X=8,05 / 51,95; Y=43,10 / 66,90; geçiş çapı 2,8 mm |
| Eski plaket bölgesi delikleri | X=83,41 / 126,59; Y=48,41 / 91,59; geçiş çapı 3,2 mm |
| Delik merkezlerinin STL kesitleriyle farkı | Taslak kontrolünde 0,06 mm'den az; baskı toleransı değildir |

Sekiz ayağın tepe düzlemi Z=10 mm. Kart bu ayakların üzerine oturur; eski ayrı delikli plaket çıkarılır. ESP32 PCB'ye takılır. Sol bölgedeki vidaların başları ESP32 altında kalabilir: önce taşıyıcı kart vidalanır, sonra ESP32 takılır. Uygun küçük başlı vidalar/yalıtkan pullar seçilir. Mevcut V4 STL dosyaları değiştirilmedi.

**USB yüksekliği kesinleşmedi:** mevcut gövde USB açıklığı yaklaşık Z=9…21 mm. Taşıyıcı PCB ve soket ESP32'yi yükseltir. DevKit'in alt yüzeyi yaklaşık `10 + 1,6 + soketin etkin yüksekliği` mm olur. Soket yüksekliği, USB metal gövdesi ve takılı kablo fişi birlikte denenmelidir. Gerekirse düşük profilli soket veya V4 yan pencere revizyonu gerekir. Kutuya kusursuz oturduğu iddia edilmez.

Kapak, gövdeyle montaj konumuna çevrilmeden LCD/RC522 koordinatları doğrudan üst üste konulamaz. Bu nedenle taslak kapak modüllerine doğrudan geçmeli soket kullanmaz; esnek kablo bağlantısı bırakır. DevKit dış zarfı ve soket yeri önceki proje ölçülerinden varsayımdır, V4 STL ESP32 pinlerini içermez.

## Elektrik düzeni

`J1 → F1 → +5V` hattı LCD, buzzer ve U1'i besler. `JP1` takılıyken ESP32 VIN'e gider. ESP32'nin mevcut regülatöründen alınan 3V3 RC522'yi besler. Bütün GND'ler ortaktır.

- **J6/J7:** iki 1×15 dişi soket. 2,54 mm pin adımı, **25,40 mm sıra arası varsayım**. Üstten PCB görünümünde USB solda, anten sağda. J6 soldan VIN ile; J7 soldan 3V3 ile başlar. `connections.csv` bütün sırayı verir. Kart üzerindeki gerçek etiketlerle tek tek karşılaştırılmalı.
- **J2:** RC522, pinler soldan `SS, SCK, MOSI, MISO, IRQ(NC), GND, RST, 3V3`. Reader soketinin sırası farklıysa kablo çaprazlanır; isimler esas alınır. R7/R8 SCK ve MOSI üzerinde 33 Ω seri dirençtir. SS, R6 ile 3V3'e çekilir.
- **J3:** LCD'nin 1…16 pinleriyle aynı numaralar; RW GND, D0…D3 boş. Altı sinyal U1 üzerinden gider. Bu tasarım I2C değildir.
- **U1:** SN74AHCT244N, DIP-20. 5V beslemede 3,3V girişleri kabul ederek LCD'ye 5V sinyal verir. Her iki OE GND; kullanılmayan girişler GND, çıkışlar NC. RN1 LCD kontrol girişlerini açılışta düşük tutar. RN1, ortak ucu pin 1 olan **bussed** 8×10 kΩ SIP-9 olmalıdır.
- **RV1:** 10 kΩ kontrast trimeri. Pin 1 GND, 2 sürgü/VO, 3 +5V; gerçek modelin pin sırası doğrulanmalı.
- **R5:** LCD arka aydınlatması için başlangıç 330 Ω. Loş olabilir; LCD veri sayfası ve ölçülen akıma göre seçilir. Mevcut LCD'de dahili direnç bulunması doğrulanmadan kısa devre edilmez.
- **J4:** yeşil anot, GND, kırmızı anot, GND. R1/R2 220 Ω seri dirençler kart üzerindedir.
- **J5:** pin 1 +5V, pin 2 Q1 kolektörü. GPIO14 → R3 1 kΩ → BC337 base; emitter GND. R4 100 kΩ base-emitter direnci açılışta kapalı tutar. D1 katot/çizgi +5V, anot kolektör. D1'in ve base sürüşünün uygunluğu gerçek buzzer akımına göre doğrulanmalı; BC337'nin katalog maksimum akımı bu devrenin izin verilen buzzer akımı değildir.
- **C1:** 470 µF/16V; mevcut parçanın çapı/pin aralığı 8/3,5 mm varsayımıyla uyuşmuyorsa footprint değiştirilir. Yerel 100 nF ve 10 µF kondansatörler eklendi.
- **TP1/TP2/TP3:** +5V, +3V3 ve GND ölçüm noktaları.

F1, MF-R075 0,75 A PTC ön seçimidir. Kutudaki sıcaklık, başlangıç akımı ve üzerindeki gerilim düşümü ölçülmeden sonlandırılmaz. 5V hattı U1 için en az 4,5V olmalı. Burada 9/12V düşürücü, ters kutup koruması veya USB/harici güç OR-ing devresi yoktur. Regüle 5V ve doğru polarite gerekir.

**USB ile harici besleme aynı anda bağlanmaz.** JP1 çift güç kaynağı güvenliği sağlamaz. İlk prototipte programlamayı ESP32'yi soketten çıkarıp USB'ye bağlayarak yapın; güç kesikken yeniden takın. Sonraki revizyonda servis sırasında eşzamanlı güç istenirse uygun güç seçimi eklenir.

## Kablo kalabalığı nasıl azalıyor?

ESP32 ile dirençler, transistör, besleme dağıtımı ve kondansatörler arasında kablo olmayacak; bunlar PCB yollarına dönüşecek. Kapaktaki modüller için dört demet kalacak: LCD (16'lı şerit, 12 aktif hat), RC522 (8'li, 7 aktif), LED'ler (4'lü), buzzer (2'li). Jak için ayrıca iki güç teli var. Henüz yollar çizilmediği için mevcut dosya bu işlevi fiziksel olarak gerçekleştiren bitmiş kart değildir.

J2…J5 için çizilen footprint'ler genel 2,54 mm pin sıralarıdır; belirli bir kilitli konektörün mekanik zarfı doğrulanmış değildir. Sipariş öncesi tek seri kutuplu/kilitli soket seçilip gerçek footprint'e geçilir. Kablo pin 1 yönleri iki uçtan multimetreyle kontrol edilir.

## Üretimden önce kapanması gerekenler

1. PDF'yi **gerçek boyut/%100**, sayfaya sığdırma kapalı basın; 50 mm ölçek çizgisini cetvelle ölçün. DevKit soketleri, sekiz vida ve kart sınırını gerçek parçalarla kontrol edin.
2. DevKit iki sıra merkezini, USB yönünü, J6/J7 pin sırasını, soket yüksekliğini ve kablo fişi açıklığını doğrulayın. 30 pinli DevKit V1 adı tek başına bütün klonların aynı ölçüde olduğunu garanti etmez.
3. Trimer, terminal, kondansatör, transistör ve soket modellerini kesinleştirin; footprint'leri düzeltin. Boşluk kontrolleri yalnızca taslaktaki zarflara dayanır.
4. KiCad'de açın. Şema ERC uyarılarını gerçek güç kaynaklarını ve bağlantıları göz önünde bulundurarak çözün. Bağlantı etiketlerinin şemadan çıkan netlist ile eşleştiğini doğrulayın; sadece bütün uyarıları susturmayın.
5. İki katmanlı bakır yolları çizin. Başlangıç kuralları: sinyal 0,30 mm; güç 0,80 mm; minimum açıklık 0,25 mm; bunlar üretici kuralları ve akım/ısı hesabıyla sonlandırılır. Wi-Fi anten bölgesinde iki katmanda da bakır, via ve hat bırakmayın. Şu anki anten boşluğu muhafazakâr bir taslak; gerçek anten sınırı ve üretici önerileriyle doğrulanmalı. Vida bölgelerinden bakır geçirmeyin. Uygun bölgelerde GND dolgusu ve kısa dönüş yolları oluşturun.
6. DRC, açık bağlantı kontrolü, gerçek bileşenlerle 3B çakışma ve kapak kapalı halde kablo boşluklarını kontrol edin. Eksiksiz 3B doğrulama yapılmadan "V4'e kesin uyumlu" kabul etmeyin.
7. Gerber ve delik dosyalarını **bu adımlardan sonra** üretin. Küçük deneme adedi yaptırın; nihai BOM'a göre elle monte edin.
8. Akım sınırlı regüle 5V ile modüller çıkarılmış halde kısa devre/besleme kontrolü yapın. Gücü kesip ESP32'yi ekleyin, 3V3 ölçün; sonra ekran, RFID ve buzzerı sırayla deneyin. Wi-Fi gönderimi + arka ışık + buzzer birlikteyken reset/gerilim düşümü olmamalı. Kapak açık/kapalı RFID okuma mesafesini ve Wi-Fi kararlılığını karşılaştırın.

## İkinci sürüm: geliştirme kartını kaldırmak

İlk PCB donanım arayüzünü sabitler: LCD paralel, RC522 SPI, iki LED, buzzer. İkinci revizyonda DevKit yerine uygun bir **ESP32 modülü** doğrudan lehimlenebilir. ESP32 çipini ve RF devresini sıfırdan tasarlamak zorunlu değildir.

Bu değişimde DevKit'in sağladığı 3,3V regülatör, EN/BOOT devresi, programlama arayüzü, besleme ayırma ve test noktaları ana karta taşınır. Aynı ESP32 ailesi/modülü ve GPIO'lar korunursa uygulama mantığı büyük ölçüde yeniden kullanılabilir; farklı aileye geçiş yeniden pin/çevrebirim doğrulaması gerektirir.

"Standart gömülü yazılım" için sonraki iş: pinleri kart profiline ayırmak, sürüm numaralı derleme ve bağımlılıklar, cihaz kimliği/provizyonlama, güvenli güncelleme ve test prosedürü oluşturmak. Geliştirme kartını kaldırmak tek başına yazılımı standartlaştırmaz. Bu çalışmada çalışan `.ino` değiştirilmedi.

## Kaynaklar

- Yerel bağlantılar: `esp32-device/rfid_personel_device/BAGLANTI_DOKUMANI.md` ve aynı dizindeki firmware.
- [TI SN74AHCT244 veri sayfası](https://www.ti.com/lit/ds/symlink/sn74ahct244.pdf): pin düzeni, TTL giriş eşiği, besleme aralığı.
- [onsemi BC337 veri sayfası](https://www.onsemi.com/pdf/datasheet/bc337-fsc-d.pdf): C-B-E bacak sırası ve elektriksel sınırlar.
- [Bourns MF-R veri sayfası](https://bourns.com/docs/product-datasheets/mf-r.pdf): PTC ölçüleri, akım ve sıcaklık karakteristikleri.
- [Espressif ESP32 yerleşim kılavuzu](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32/pcb-layout-design.html): modül anten bölgesi ve yerleşim.
- [KiCad PCB dosya biçimi](https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/) ve [şema biçimi](https://dev-docs.kicad.org/en/file-formats/sexpr-schematic/).

## Yeniden üretme

Python 3, numpy, Pillow; PDF için reportlab. Çalışma dizini projenin kökü:

```text
python hardware/pcb-v1/inspect_stl.py
python hardware/pcb-v1/build_design.py
python hardware/pcb-v1/validate_files.py
python hardware/pcb-v1/build_pdf.py
```

Üreteç aynı adlı çıktıları yeniden yazar. KiCad'de el ile yapılan değişikliklerin üzerine çalıştırmayın; üreteci veya dosyaları tek kaynak olarak seçin. Hiçbir komut kaynak STL'leri veya firmware'i değiştirmez.
