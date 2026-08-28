# ESP32 RFID Personel Takip Bağlantı Dokümanı

Bu doküman `rfid_personel_device.ino` dosyasındaki varsayılan pinlere göre hazırlanmıştır.

## Kart üzerindeki D pinleri ve GPIO karşılıkları

Bazı ESP32 geliştirme kartlarında pinlerin yanında yalnızca `D5`, `D18`, `D21` gibi
ifadeler yazar. Bu kartlarda `D` harfinden sonraki sayı doğrudan GPIO numarasıdır:

```text
D5  = GPIO 5
D18 = GPIO 18
D19 = GPIO 19
D21 = GPIO 21
D22 = GPIO 22
D23 = GPIO 23
D25 = GPIO 25
D26 = GPIO 26
D27 = GPIO 27
D32 = GPIO 32
D33 = GPIO 33
```

Örneğin dokümanda `GPIO 21` yazıyorsa kart üzerindeki `D21` pinini kullan.
Bu eşleştirme ESP32 içindir; internette bulunan ESP8266 `D` pin tablolarını kullanma.

Kart üzerinde görülen diğer özel pinler:

| Kart etiketi | GPIO karşılığı | Açıklama |
| --- | --- | --- |
| RX0 | GPIO 3 | USB/seri haberleşme alıcısı; bu projede bağlantı için kullanma |
| TX0 | GPIO 1 | USB/seri haberleşme vericisi; bu projede bağlantı için kullanma |
| RX2 | GPIO 16 | Bu projede LCD D6 veri hattı olarak kullanılıyor |
| TX2 | GPIO 17 | Bu projede LCD D7 veri hattı olarak kullanılıyor |
| VN | GPIO 39 | Yalnızca giriş özelliği vardır; LCD, LED veya buzzer için kullanma |
| GND | GND | Tüm modüllerin ortak eksi/şase bağlantısı |

> Kart modeline göre baskı biçimi değişebilir. `D21` veya `21` etiketi GPIO 21'i,
> `D22` veya `22` etiketi GPIO 22'yi ifade eder. Kartında gereken pinlerden biri
> fiziksel olarak yoksa bağlantı yapmadan önce kartın tam modelini kontrol et.

## Kullanılan parçalar

- ESP32 geliştirme kartı
- RC522 RFID/NFC modülü
- 2x16 standart paralel LCD ekran (I2C dönüştürücüsüz)
- Yeşil LED
- Kırmızı LED
- 2 adet 220 ohm direnç
- Jumper kablo

## ESP32 pin tablosu

| Parça | Modül pini | ESP32 pini |
| --- | --- | --- |
| RC522 | SDA / SS | GPIO 5 / D5 |
| RC522 | SCK | GPIO 18 / D18 |
| RC522 | MOSI | GPIO 23 / D23 |
| RC522 | MISO | GPIO 19 / D19 |
| RC522 | RST | GPIO 27 / D27 |
| RC522 | 3.3V | 3V3 |
| RC522 | GND | GND |
| Paralel LCD | RS | GPIO 32 / D32 |
| Paralel LCD | E | GPIO 25 / D25 |
| Paralel LCD | D4 | GPIO 22 / D22 |
| Paralel LCD | D5 | GPIO 21 / D21 |
| Paralel LCD | D6 | GPIO 16 / RX2 |
| Paralel LCD | D7 | GPIO 17 / TX2 |
| Paralel LCD | RW | GND |
| Paralel LCD | VSS | GND |
| Paralel LCD | VDD | 5V / VIN veya kullanılan harici regüle 5V |
| Yeşil LED | Anot + | GPIO 26 / D26 |
| Yeşil LED | Katot - | GND, 220 ohm direnç üzerinden |
| Kırmızı LED | Anot + | GPIO 33 / D33 |
| Kırmızı LED | Katot - | GND, 220 ohm direnç üzerinden |

## RC522 bağlantısı

RC522 modülü mutlaka `3.3V` ile beslenmelidir. `5V` verirsen modül zarar görebilir.

```text
RC522 SDA  -> ESP32 GPIO 5  / kart üzerindeki D5
RC522 SCK  -> ESP32 GPIO 18 / kart üzerindeki D18
RC522 MOSI -> ESP32 GPIO 23 / kart üzerindeki D23
RC522 MISO -> ESP32 GPIO 19 / kart üzerindeki D19
RC522 RST  -> ESP32 GPIO 27 / kart üzerindeki D27
RC522 3.3V -> ESP32 3V3
RC522 GND  -> ESP32 GND
```

## 2x16 paralel LCD bağlantısı

LCD ekran I2C dönüştürücüsü olmadan 4-bit modda bağlanır.

```text
LCD VSS -> GND
LCD VDD -> 5V / VIN veya harici regüle 5V
LCD V0  -> 10K potansiyometrenin orta bacağı (geçici olarak GND)
LCD RS  -> ESP32 D32 / GPIO 32
LCD RW  -> GND
LCD E   -> ESP32 D25 / GPIO 25
LCD D0, D1, D2, D3 -> Bağlanmayacak
LCD D4  -> ESP32 D22 / GPIO 22
LCD D5  -> ESP32 D21 / GPIO 21
LCD D6  -> ESP32 RX2 / GPIO 16
LCD D7  -> ESP32 TX2 / GPIO 17
LCD A   -> 5V (gerekiyorsa 220 ohm direnç üzerinden)
LCD K   -> GND
```

Potansiyometre ESP32 pini kullanmaz. Bağlantısı:

```text
Potansiyometre dış bacak 1 -> 5V
Potansiyometre dış bacak 2 -> GND
Potansiyometre orta bacak  -> LCD V0
```

Potansiyometre yoksa ilk deneme için `V0 -> GND` bağlanabilir. Yazılar aşırı
koyuysa veya yalnızca kutular görünüyorsa 10K potansiyometre eklenmelidir.

## LED bağlantısı

Her LED için 220 ohm direnç kullan.

Yeşil LED:

```text
ESP32 GPIO 26 -> LED uzun bacak / anot
LED kısa bacak / katot -> 220 ohm direnç -> GND
```

Kırmızı LED:

```text
ESP32 GPIO 33 -> LED uzun bacak / anot
LED kısa bacak / katot -> 220 ohm direnç -> GND
```

## Arduino IDE kütüphaneleri

Arduino IDE içinde şu kütüphaneleri kur:

- `MFRC522`
- `LiquidCrystal` (Arduino IDE ile birlikte gelir)
- `ArduinoJson`

ESP32 kart desteği de yüklü olmalıdır.

## Arduino IDE yükleme adımları

1. Arduino IDE'yi aç.
2. Kart olarak ESP32 modelini seç.
3. `esp32-device/rfid_personel_device/rfid_personel_device.ino` dosyasını aç.
4. Gerekirse pinleri dosyanın üst kısmından değiştir.
5. Kodu ESP32'ye yükle.
6. Cihaz açıldığında kayıtlı Wi-Fi yoksa `RFIDPersonel-XXXXXX` isimli ağ açar.
7. Telefonda bu ağa bağlan.
8. Tarayıcıdan `192.168.4.1` adresine gir.
9. Wi-Fi adı, Wi-Fi şifresi, API adresi ve cihaz secret key bilgisini yaz.

Varsayılan API adresi:

```text
http://13.143.223.183:3002
```

## Cihaz secret key nereden alınır?

Firma admin panelinde veya süper admin cihaz detayında ilgili RFID cihazın `Secret Key` alanı bulunur. Bu değeri ESP32 kurulum ekranındaki `Cihaz Secret Key` alanına yazmalısın.

## Çalışma kontrolü

Bağlantı doğruysa:

- LCD ekranda önce Wi-Fi bağlantı bilgisi görünür.
- Wi-Fi bağlandıktan sonra `Kart bekleniyor` yazar.
- RFID kart okutunca personel adı görünür.
- Başarılı kayıtta yeşil LED yanar.
- Tanımsız kartta kırmızı LED yanar.

## Sık karşılaşılan sorunlar

### RC522 kart okumuyor

- RC522 `3.3V` bağlı mı kontrol et.
- SDA, SCK, MOSI, MISO, RST pinlerini tekrar kontrol et.
- Kartı okuyucuya çok uzak tutma.
- RC522 ile ESP32 arasında ortak GND olduğundan emin ol.

### LCD ışığı yanıyor ama yazı görünmüyor

- `V0` kontrast bağlantısını kontrol et.
- Potansiyometre yoksa `V0` pinini geçici olarak GND'ye bağla.
- `RS`, `E` ve `D4-D7` bağlantılarını tekrar kontrol et.

### Cihaz Wi-Fi ağına bağlanmıyor

- Wi-Fi şifresini tekrar gir.
- 2.4 GHz Wi-Fi kullan. ESP32 çoğu modelde 5 GHz ağa bağlanmaz.
- Modemi ESP32'ye yakınlaştırıp tekrar dene.

### Kart okutuluyor ama sistem kayıt atmıyor

- API adresi doğru mu kontrol et.
- Cihaz secret key doğru mu kontrol et.
- Web panelinde cihaz ilgili kullanıcıya tanımlı mı kontrol et.
- Arduino IDE Seri Monitör hızını `115200` yap ve kartı okut.
- Personelin RFID kart numarasına Seri Monitör'deki `RFID kart:` satırında görünen
  değeri, başındaki sıfırlar dahil olmak üzere aynen kaydet.
- Kartın üzerinde yazan numara veya başka bir okuyucunun gösterdiği değer farklı
  formatta olabileceği için bu sistemde doğrudan kullanılmamalıdır.
- Personelin aktif ve RFID cihazıyla aynı firmaya bağlı olduğunu kontrol et.
