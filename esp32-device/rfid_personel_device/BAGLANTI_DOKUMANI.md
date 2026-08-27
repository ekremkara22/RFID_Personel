# ESP32 RFID Personel Takip Bağlantı Dokümanı

Bu doküman `rfid_personel_device.ino` dosyasındaki varsayılan pinlere göre hazırlanmıştır.

## Kullanılan parçalar

- ESP32 geliştirme kartı
- RC522 RFID/NFC modülü
- 2x16 I2C LCD ekran
- Buzzer
- Yeşil LED
- Kırmızı LED
- 2 adet 220 ohm direnç
- Jumper kablo

## ESP32 pin tablosu

| Parça | Modül pini | ESP32 pini |
| --- | --- | --- |
| RC522 | SDA / SS | GPIO 5 |
| RC522 | SCK | GPIO 18 |
| RC522 | MOSI | GPIO 23 |
| RC522 | MISO | GPIO 19 |
| RC522 | RST | GPIO 27 |
| RC522 | 3.3V | 3V3 |
| RC522 | GND | GND |
| I2C LCD | SDA | GPIO 21 |
| I2C LCD | SCL | GPIO 22 |
| I2C LCD | VCC | 5V veya VIN |
| I2C LCD | GND | GND |
| Yeşil LED | Anot + | GPIO 26 |
| Yeşil LED | Katot - | GND, 220 ohm direnç üzerinden |
| Kırmızı LED | Anot + | GPIO 33 |
| Kırmızı LED | Katot - | GND, 220 ohm direnç üzerinden |
| Buzzer | + | GPIO 25 |
| Buzzer | - | GND |

## RC522 bağlantısı

RC522 modülü mutlaka `3.3V` ile beslenmelidir. `5V` verirsen modül zarar görebilir.

```text
RC522 SDA  -> ESP32 GPIO 5
RC522 SCK  -> ESP32 GPIO 18
RC522 MOSI -> ESP32 GPIO 23
RC522 MISO -> ESP32 GPIO 19
RC522 RST  -> ESP32 GPIO 27
RC522 3.3V -> ESP32 3V3
RC522 GND  -> ESP32 GND
```

## 2x16 I2C LCD bağlantısı

LCD ekran I2C dönüştürücülü olmalıdır. Kodda varsayılan adres `0x27` olarak ayarlanmıştır.

```text
LCD SDA -> ESP32 GPIO 21
LCD SCL -> ESP32 GPIO 22
LCD VCC -> ESP32 5V / VIN
LCD GND -> ESP32 GND
```

Ekranda yazı çıkmazsa iki ihtimal vardır:

- Potansiyometre kontrast ayarı düşüktür. I2C kartındaki küçük vidayı çevir.
- LCD I2C adresi `0x27` değil `0x3F` olabilir. Bu durumda kodda şu satırı değiştir:

```cpp
#define LCD_ADDRESS 0x27
```

Şu hale getir:

```cpp
#define LCD_ADDRESS 0x3F
```

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

## Buzzer bağlantısı

Aktif buzzer kullanıyorsan doğrudan şu şekilde bağlayabilirsin:

```text
Buzzer + -> ESP32 GPIO 25
Buzzer - -> GND
```

Pasif buzzer kullanıyorsan bu kod yine ses verir ama ton kontrolü yapmadığı için aktif buzzer daha uygundur.

## Arduino IDE kütüphaneleri

Arduino IDE içinde şu kütüphaneleri kur:

- `MFRC522`
- `LiquidCrystal I2C`
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
- Başarılı kayıtta yeşil LED yanar ve buzzer iki kısa onay sesi verir.
- Tanımsız kartta kırmızı LED yanar ve hata sesi verir.

## Sık karşılaşılan sorunlar

### RC522 kart okumuyor

- RC522 `3.3V` bağlı mı kontrol et.
- SDA, SCK, MOSI, MISO, RST pinlerini tekrar kontrol et.
- Kartı okuyucuya çok uzak tutma.
- RC522 ile ESP32 arasında ortak GND olduğundan emin ol.

### LCD çalışıyor ama yazı görünmüyor

- I2C kartındaki kontrast vidasını çevir.
- `LCD_ADDRESS` değerini `0x27` yerine `0x3F` dene.

### Cihaz Wi-Fi ağına bağlanmıyor

- Wi-Fi şifresini tekrar gir.
- 2.4 GHz Wi-Fi kullan. ESP32 çoğu modelde 5 GHz ağa bağlanmaz.
- Modemi ESP32'ye yakınlaştırıp tekrar dene.

### Kart okutuluyor ama sistem kayıt atmıyor

- API adresi doğru mu kontrol et.
- Cihaz secret key doğru mu kontrol et.
- Web panelinde cihaz ilgili kullanıcıya tanımlı mı kontrol et.
- Personelin RFID kart numarası, okutulan kart UID değeri ile aynı mı kontrol et.
