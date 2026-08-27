# RFID Personel ESP32 Cihaz Kodu

Bu klasor tek RFID okuyucu ile personel giris-cikis, mola giris-cikis ve mesai cikis hareketlerini web API'ye gondermek icin hazirlandi.

## Gerekli Arduino kutuphaneleri

- MFRC522
- LiquidCrystal I2C
- ArduinoJson

## Varsayilan pinler

| Parca | ESP32 pini |
| --- | --- |
| RC522 SDA/SS | GPIO 5 |
| RC522 RST | GPIO 27 |
| RC522 SCK | GPIO 18 |
| RC522 MISO | GPIO 19 |
| RC522 MOSI | GPIO 23 |
| 2x16 LCD SDA | GPIO 21 |
| 2x16 LCD SCL | GPIO 22 |
| Yesil LED | GPIO 26 |
| Kirmizi LED | GPIO 33 |
| Buzzer | GPIO 25 |

LCD adresi kodda `0x27` olarak ayarlandi. Ekran calismazsa yaygin diger adres `0x3F` olabilir.

## Ilk kurulum

1. Arduino IDE icinde `rfid_personel_device.ino` dosyasini ac.
2. Kart olarak ESP32 sec.
3. Kodu ESP32'ye yukle.
4. Cihazda kayitli Wi-Fi/secret yoksa `RFIDPersonel-XXXXXX` adinda ag acar.
5. Telefonda bu aga baglan ve tarayicida `192.168.4.1` adresini ac.
6. Wi-Fi, API adresi ve cihaz secret key bilgisini kaydet.

Varsayilan API adresi:

```text
http://13.143.223.183:3002
```

Secret key bilgisini firma admin panelindeki RFID cihaz detayindan alabilirsin.

## Calisma mantigi

- Cihaz baglandiginda `/api/device/heartbeat` endpoint'ine bilgi yollar, panelde aktif gorunur.
- RFID kart okutulunca `/api/device/rfid/scan` endpoint'ine kart UID bilgisini gonderir.
- Web tarafinda hareket turu calisma takvimine gore tahmin edilir:
  - Gunun ilk hareketi: giris
  - Mola baslangic/bitiş saatlerine +-30 dakika yakin hareket: mola giris/cikis
  - Mesai bitisine +-30 dakika yakin hareket: cikis
  - Yanlis tahmin olursa firma admini Personel Hareketleri sayfasindan kaydi duzeltebilir.
