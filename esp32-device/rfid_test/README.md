# RC522 bagimsiz test

Bu test Wi-Fi, API ve LCD kullanmadan RC522 surumunu ve kart UID'sini Seri Monitor'e yazar. Ana uygulama dosyalari degismez; testi ESP32'ye yuklemek cihazdaki mevcut programin yerine gecer. Test bittiginde ana rfid_personel_device.ino programini tekrar yukle. Test kayitli Wi-Fi ayarlarini silmez.

## Yukleme

1. Harici adaptor baglantisini cikar, ESP32'yi USB ile bilgisayara bagla.
2. Arduino IDE'de bu klasordeki rfid_test.ino dosyasini ac.
3. Ana uygulamada kullandigin ESP32 kartini ve portunu sec.
4. Kutuphane Yoneticisi'nde MFRC522 (GithubCommunity / miguelbalboa) kutuphanesi kurulu olmali. Ana uygulama derleniyorsa zaten kurulu olabilir.
5. Yukle, Seri Monitor'u 115200 baud ac ve ESP32'nin EN/RESET dugmesine bas.
6. Daha once calisan karti veya RC522 ile gelen kart/anahtarligi antene yaklastir. Tekrar okutmak icin karti uzaklastirip getir.

LCD bu testte guncellenmez; ekran goruntusu test sonucu degildir. Sonuclar USB Seri Monitor'dedir.

## Baglantilar

| RC522 | ESP32 GPIO / pin |
| --- | --- |
| SDA / SS | 5 |
| SCK | 18 |
| MOSI | 23 |
| MISO | 19 |
| RST | 27 |
| 3.3V | 3V3 |
| GND | GND |
| IRQ | Baglanmaz |

RC522'ye 5V verme. Lehim, kablo degisikligi ve sureklilik olcumunu enerji kesikken yap.

## Sonuclar

- `0x91` veya `0x92`: Beklenen cip surumu okunuyor. Antenin/kart okumanin calistigini tek basina kanitlamaz.
- `0x00` veya `0xFF`: Haberlesme basarisiz. Besleme, kablo, lehim veya modul arizasi olabilir; kesin bozuk demek degildir.
- Diger surumler: Klon cip veya kararsiz haberlesme olabilir. Tek basina saglamlik ya da ariza sonucu cikarma.
- `BASARILI - KART UID: ...`: Kart gercekten okundu; okuyucu bu kartla calisiyor.
- Her 5 saniyede durum yazilip kart okunmuyorsa: Daha once calisan kartla, kisa kablolarla ve metal yuzeylerden uzakta dene. Besleme ve lehimleri kontrol et.

RC522 icin uyumlu 13.56 MHz ISO/IEC 14443A kart gerekir; 125 kHz kartlar bu okuyucuyla okunmaz.
