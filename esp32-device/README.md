# CheckInQR ESP32 QR Device

Bu klasor, firma girisine koyulacak ESP32 + OLED cihazinin firmware taslagini icerir.

## Yeni Wi-Fi kurulum akisi

Cihaz artik Wi-Fi adini ve sifresini koda sabitlemek zorunda degil.

1. ESP32 acildiginda kalici bellekte kayitli Wi-Fi bilgisi arar.
2. Kayitli bilgi varsa bu aga baglanmayi dener.
3. Baglanabilirse `https://flodeka.com/api/device/qr/sync` endpoint'inden QR token almaya devam eder.
4. Kayitli bilgi yoksa veya aga baglanamazsa kendi kurulum agini acar.
5. OLED ekranda kurulum agi gorunur: `CheckInQR-XXXXXX`.
6. Telefon ile bu Wi-Fi agina baglan.
7. Tarayici otomatik acilmazsa `http://192.168.4.1` adresine git.
8. ESP32'nin gordugu Wi-Fi aglarindan kendi agini sec, sifreyi gir ve kaydet.
9. OLED'de kaydedildi mesaji gorundukten sonra ESP32 uzerindeki reset tusuna bas.
10. Cihaz yeniden acilinca kaydedilen Wi-Fi bilgisi ile internete baglanir ve QR uretmeye devam eder.

## Mimari

ESP32 dogrudan MySQL veritabanina baglanmaz.

Daha dogru akis:

1. ESP32 Wi-Fi'ye baglanir.
2. Sunucudaki `/api/device/qr/sync` endpoint'ine `secretKey` ile POST atar.
3. Sunucu cihaz icin aktif `qrToken` degerini dondurur.
4. ESP32 bu token'i OLED uzerinde QR olarak gosterir.
5. ESP32 duzenli araliklarla endpoint'i tekrar cagirir.
6. Eger sunucudaki token degismisse OLED'deki QR da hemen degisir.

Bu sayede:

- 5 saniyelik token yenileme veritabaninda merkezi olarak yonetilir
- Personel basarili `Giris` veya `Cikis` yaptiginda backend token'i aninda yeniler
- ESP32 bir sonraki poll'da bunu gorup QR'i hemen yeniler

## Dosyalar

- `checkinqr_device/checkinqr_device.ino`: Arduino IDE / ESP32 icin ana firmware
- `qrcode.c`, `qrcode.h`: QR olusturma kutuphanesi

## Gerekli kutuphaneler

Arduino IDE Library Manager ile su kutuphaneleri kur:

- `Adafruit GFX Library`
- `Adafruit SSD1306`
- `ArduinoJson`
- `QRCode`

ESP32 core ile gelen su kutuphaneler de kullanilir:

- `WiFi`
- `WebServer`
- `DNSServer`
- `Preferences`
- `HTTPClient`
- `WiFiClientSecure`

## Donanim varsayimi

- Kart: ESP32 Dev Module
- Ekran: SSD1306 128x64 I2C OLED
- I2C adresi: `0x3C`
- Reset: ESP32 kart uzerindeki `EN/RST` tusu
- Wi-Fi durum LED'i: `GPIO 5` / kart uzerinde `D5`

## LED ve reset butonu baglantisi

Wi-Fi baglaninca yanacak yesil LED:

```text
ESP32 D5 / GPIO 5 -> LED uzun bacak (+)
LED kisa bacak (-) -> 220R veya 330R direnc -> GND
```

Harici reset butonu kullanmak istersen:

```text
Buton ucu 1 -> EN
Buton ucu 2 -> GND
```

Not: Harici reset butonu koda bagli degildir; ESP32'yi donanimsal olarak yeniden baslatir.

## Ayarlanacak alanlar

`checkinqr_device.ino` icindeki su degerleri kontrol et:

- `API_BASE_URL`: varsayilan `https://flodeka.com`
- `DEVICE_SECRET_KEY`: panelde tanimli cihaz secret key degeri

Wi-Fi bilgisi artik web kurulum ekranindan kaydedilir.

Istersen firmware icine ilk kurulum icin varsayilan Wi-Fi bilgisi gomulebilir:

```cpp
const char* DEFAULT_WIFI_SSID = "WiFi_Adi";
const char* DEFAULT_WIFI_PASSWORD = "WiFi_Sifresi";
```

Bu degerler bos birakilirsa cihaz ilk acilista kurulum agi acar.

## Sunucu endpoint'i

POST `https://flodeka.com/api/device/qr/sync`

Ornek body:

```json
{
  "secretKey": "cihaz-secret-key"
}
```

Ornek cevap:

```json
{
  "deviceId": "uuid",
  "deviceName": "On Kapi ESP32",
  "companyId": "uuid",
  "qrToken": "aktif-uuid-token",
  "qrUpdatedAt": "2026-04-11T12:00:00.000Z",
  "qrExpiresAt": "2026-04-11T12:00:05.000Z",
  "refreshIntervalSeconds": 5
}
```

## Onemli not

Backend tarafinda token 5 saniyede bir degisecek sekilde ayarli.
Ancak personel basarili `Giris` veya `Cikis` yaptiginda token hemen yenileniyor.

Bu nedenle ESP32 kodunda poll araligini 1 saniye tuttuk.
Boylece cihaz, 5 saniyeyi beklemeden yeni token'i hizlica alir.
