# ESP32 RFID Personel Cihazı — Montaj ve Bağlantı Belgesi

Bu belge çalışan `rfid_personel_device.ino` firmware'indeki pinlere göre, kalıcı
lehimli montaj sırasında çıktı alınıp kullanılmak üzere hazırlanmıştır.

## 1. Önemli güvenlik kuralları

- Bütün bağlantıları adaptör prizden çekiliyken yap.
- Adaptör çıkışı regüle `5V DC / 1A` olmalıdır. 9V veya 12V bağlama.
- Adaptör `+5V` hattını yalnızca ESP32 `VIN`, LCD ve buzzer beslemesinde kullan.
- ESP32 `3V3` pinine kesinlikle 5V bağlama.
- RC522'ye kesinlikle 5V verme; yalnızca ESP32 `3V3` pininden besle.
- Elektrolitik kondansatörü ters bağlama.
- Adaptör VIN'e bağlıyken ESP32'ye bilgisayar USB'sinden ayrıca güç verme.
- İlk enerjiyi vermeden önce multimetreyle kısa devre ve gerilim kontrolü yap.

## 2. Kullanılacak parçalar

- ESP32 geliştirme kartı (`VIN`, `3V3` ve `GND` pinli)
- RC522 RFID okuyucu
- 2x16 paralel LCD (I2C dönüştürücüsüz)
- Yeşil LED
- Kırmızı LED
- 2 adet `220 ohm` LED direnci
- 5V aktif buzzer
- 1 adet `BC337` NPN transistör
- 1 adet `1K ohm` buzzer base direnci
- 1 adet `470 uF / 16V` elektrolitik kondansatör
- 1 adet `100 nF` seramik kondansatör
- Regüle `5V DC / 1A` adaptör
- Jak soketi, klemens, kablo ve pertinaks

`2N2222` bu montajda kullanılmayacak; BC337 için yedek olarak saklanacaktır.
Transistörlerin bacak sıraları aynı olmayabileceği için birbirlerinin yerine
kontrol etmeden takılmamalıdır.

Manyetik/bobinli buzzer kullanılıyorsa ayrıca `1N4148` veya `1N4007` koruma
diyodu gerekir. Bu belge iki bacaklı 5V aktif buzzerı esas alır.

## 3. ESP32 pin özeti

| Görev | ESP32 kart etiketi | GPIO |
| --- | --- | --- |
| RC522 SDA/SS | D5 | GPIO 5 |
| RC522 SCK | D18 | GPIO 18 |
| RC522 MOSI | D23 | GPIO 23 |
| RC522 MISO | D19 | GPIO 19 |
| RC522 RST | D27 | GPIO 27 |
| LCD RS | D32 | GPIO 32 |
| LCD E | D25 | GPIO 25 |
| LCD D4 | D22 | GPIO 22 |
| LCD D5 | D21 | GPIO 21 |
| LCD D6 | RX2 | GPIO 16 |
| LCD D7 | TX2 | GPIO 17 |
| Yeşil LED | D26 | GPIO 26 |
| Kırmızı LED | D33 | GPIO 33 |
| Buzzer kontrolü | D14 | GPIO 14 |

`VN`, VIN değildir. `VN/GPIO39` bu montajda kullanılmayacaktır.

## 4. Jak soketi ve ana güç girişi

Üç bacaklı jak soketinde genellikle `+5V`, `GND` ve anahtarlı yardımcı bacak
bulunur. Fiziksel bacak yerleri soket modeline göre değişebileceği için görünüşe
bakarak tahmin etme. Multimetreyle belirlenmiş `+5V` ve `GND` bacaklarını kullan;
üçüncü anahtarlı bacağı boş ve izole bırak.

```text
Jak +5V  -> Devre +5V dağıtım hattı
Jak GND  -> Devre ORTAK GND hattı
3. bacak -> BAĞLANMAYACAK
```

ESP32 güç bağlantısı:

```text
Jak +5V -> ESP32 VIN
Jak GND -> ESP32 GND
```

ESP32 üzerindeki iki GND pini içeride ortaktır. Birisi adaptör GND için, diğeri
ortak GND dağıtımı için kullanılabilir.

## 5. 5V ve ortak GND dağıtımı

### +5V hattına bağlanacaklar

```text
Jak +5V
  |-- ESP32 VIN
  |-- LCD VDD (pin 2)
  |-- LCD A (pin 15, mevcut çalışan dirençli bağlantı üzerinden)
  |-- Buzzer +
  |-- 470 uF kondansatör +
  `-- 100 nF kondansatörün bir bacağı
```

### Ortak GND hattına bağlanacaklar

```text
Jak GND
  |-- ESP32 GND
  |-- RC522 GND
  |-- LCD VSS (pin 1)
  |-- LCD V0 (pin 3, potansiyometre yoksa)
  |-- LCD RW (pin 5)
  |-- LCD K (pin 16)
  |-- Yeşil LED'in 220 ohm direnç sonrası ucu
  |-- Kırmızı LED'in 220 ohm direnç sonrası ucu
  |-- BC337 EMITTER
  |-- 470 uF kondansatör -
  `-- 100 nF kondansatörün diğer bacağı
```

## 6. Kondansatör bağlantıları

Kondansatörler güç hattına **paralel** bağlanır; besleme kablosuna seri bağlanmaz.
Jak girişine ve ESP32'ye yakın yerleştirilmelidir.

### 470 uF / 16V elektrolitik kondansatör

```text
Kondansatör + -> +5V hattı
Kondansatör - -> ORTAK GND
```

Gövde üzerindeki şerit genellikle eksi bacağı gösterir. Ters bağlantı
kondansatörün ısınmasına, şişmesine veya patlamasına neden olabilir.

### 100 nF seramik kondansatör

```text
Bir bacak   -> +5V hattı
Diğer bacak -> ORTAK GND
```

100 nF seramik kondansatör kutupsuzdur; iki bacağın yönü önemli değildir.

## 7. RC522 bağlantıları

| RC522 pini | Bağlanacağı yer |
| --- | --- |
| SDA / SS | ESP32 D5 / GPIO5 |
| SCK | ESP32 D18 / GPIO18 |
| MOSI | ESP32 D23 / GPIO23 |
| MISO | ESP32 D19 / GPIO19 |
| RST | ESP32 D27 / GPIO27 |
| 3.3V | ESP32 3V3 |
| GND | ORTAK GND |

RC522 üzerindeki `SDA` pini bu bağlantıda SPI `SS` görevi görür; LCD bağlantısıyla
ilgili değildir.

## 8. 2x16 paralel LCD bağlantıları

LCD, I2C dönüştürücü olmadan 4-bit modda kullanılır.

| LCD no | LCD pini | Bağlanacağı yer |
| ---: | --- | --- |
| 1 | VSS | ORTAK GND |
| 2 | VDD | +5V |
| 3 | V0 | Potansiyometre yoksa GND |
| 4 | RS | ESP32 D32 / GPIO32 |
| 5 | RW | GND |
| 6 | E | ESP32 D25 / GPIO25 |
| 7 | D0 | Bağlanmayacak |
| 8 | D1 | Bağlanmayacak |
| 9 | D2 | Bağlanmayacak |
| 10 | D3 | Bağlanmayacak |
| 11 | D4 | ESP32 D22 / GPIO22 |
| 12 | D5 | ESP32 D21 / GPIO21 |
| 13 | D6 | ESP32 RX2 / GPIO16 |
| 14 | D7 | ESP32 TX2 / GPIO17 |
| 15 | A | +5V, mevcut çalışan dirençli bağlantı üzerinden |
| 16 | K | GND |

LCD `D0`, `D1`, `D2` ve `D3` pinleri boş bırakılmalıdır. LCD arka aydınlatması
daha önce mevcut bağlantıyla çalıştıysa `A` ve `K` bağlantısı aynen korunmalıdır.

## 9. Yeşil ve kırmızı LED bağlantıları

Her LED için ayrı bir `220 ohm` direnç kullanılmalıdır.

Yeşil LED:

```text
ESP32 D26 / GPIO26 -> Yeşil LED uzun bacak / anot (+)
Yeşil LED kısa bacak / katot (-) -> 220 ohm -> ORTAK GND
```

Kırmızı LED:

```text
ESP32 D33 / GPIO33 -> Kırmızı LED uzun bacak / anot (+)
Kırmızı LED kısa bacak / katot (-) -> 220 ohm -> ORTAK GND
```

Direnç LED'in anot veya katot tarafında olabilir; önemli olan LED ile seri olmasıdır.

## 10. BC337 transistörlü buzzer bağlantısı

Bu montajda ESP32 buzzerı doğrudan beslemez. GPIO14 yalnızca BC337'yi kontrol
eder; buzzer enerjisini adaptörün 5V hattından alır.

```text
ESP32 D14 / GPIO14 -> 1K ohm direnç -> BC337 BASE
BC337 EMITTER       -> ORTAK GND
BC337 COLLECTOR     -> Buzzer -
Buzzer +            -> +5V hattı
```

`1K ohm` direnç olmadan GPIO14'ü BC337 BASE bacağına bağlama.

BC337 üzerinde şu üç uç bulunur:

- `B`: Base — 1K direnç üzerinden GPIO14'e gider.
- `C`: Collector — buzzer eksi ucuna gider.
- `E`: Emitter — ortak GND'ye gider.

BC337'nin fiziksel bacak sırası üreticiye göre doğrulanmalıdır. Düz yüzüne bakıp
tahmin etme; parçanın veri sayfasını veya multimetrenin transistör testini kullan.

Manyetik/bobinli buzzer kullanılıyorsa buzzer uçlarına ters koruma diyodu ekle:

```text
Diyot çizgili uç -> Buzzer + / +5V
Diyot diğer uç   -> Buzzer - / BC337 COLLECTOR
```

Aktif piezo buzzerda bu diyot genellikle gerekmez. Buzzer tipi bilinmiyorsa enerji
vermeden önce üzerindeki model/gerilim bilgisini kontrol et.

## 11. Enerji vermeden önce son kontrol

1. Adaptörü prizden çıkar.
2. Jak soketinin üçüncü anahtarlı bacağının boş olduğunu kontrol et.
3. Multimetreyle `+5V` ve `GND` arasında doğrudan kısa devre olmadığını kontrol et.
4. 470 uF kondansatörün `+` ucunun 5V'a, `-` ucunun GND'ye gittiğini kontrol et.
5. RC522 beslemesinin ESP32 `3V3` pinine gittiğini kontrol et.
6. LCD `RW`, `VSS`, `V0` ve `K` bağlantılarını kontrol et.
7. Her LED'de ayrı 220 ohm direnç olduğunu kontrol et.
8. GPIO14 ile BC337 BASE arasında 1K direnç olduğunu kontrol et.
9. BC337 EMITTER ucunun GND'ye, COLLECTOR ucunun buzzer eksiye gittiğini kontrol et.
10. Buzzer artı ucunun 5V'a gittiğini kontrol et.

## 12. İlk çalıştırma sırası

1. ESP32, RC522, LCD ve buzzerı mümkünse soketlerinden çıkar.
2. Yalnızca jak, klemens ve kondansatörleri bağla.
3. Adaptörü tak ve dağıtım hattında yaklaşık `5V DC` ölç.
4. Gücü kes; ESP32'yi tak ve yeniden enerji ver.
5. Gücü tekrar kes; LCD'yi tak ve çalışmasını kontrol et.
6. Gücü tekrar kes; RC522'yi tak ve kart okut.
7. LED'leri kontrol et.
8. En son BC337 ve buzzer devresini bağla.

ESP32 rastgele yeniden başlar, LCD ışığı titreşir, buzzer çalınca cihaz kapanır
veya Seri Monitör'de `Brownout detector` görülürse 5V/1A adaptör yetersiz ya da
kablo bağlantısı zayıf olabilir. Bu durumda kaliteli regüle 5V/2A adaptör kullan.

## 13. Çalışma doğrulaması

- Açılışta LCD'de başlatma ve Wi-Fi mesajları görünür.
- Bağlantıdan sonra LCD'de `Kart bekleniyor` görünür.
- Başarılı kartta yeşil LED yanar ve buzzer iki kısa ses verir.
- Hatalı veya tanımsız kartta kırmızı LED yanar ve buzzer iki uzun ses verir.
- RFID kart ID değeri için Arduino IDE Seri Monitör `115200` baud hızında açılır;
  `RFID kart:` satırındaki değer başındaki sıfırlar dahil aynen personele kaydedilir.
