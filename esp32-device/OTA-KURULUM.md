# ESP32 OTA kurulum ve test

## Dosyalar

- `rfid_personel_device_ota/rfid_personel_device_ota.ino`: canlı cihaz sürümü (`1.0.0`).
- `rfid_personel_device_ota_test/rfid_personel_device_ota_test.ino`: staging üzerinde ilk USB yüklemesi için test sürümü (`0.1.0-test`).
- `rfid_personel_device_ota_test_update/rfid_personel_device_ota_test_update.ino`: panelden OTA ile gönderilecek test sürümü (`0.1.1-test`).

Mevcut `rfid_personel_device/rfid_personel_device.ino` korunmuştur. OTA sürümü ilk kez USB ile yüklenmelidir; sonraki sürümler panelden gönderilebilir.

## Canlı kurulum

1. Arduino IDE'de partition scheme olarak OTA destekli, iki uygulama bölümü bulunan düzeni seçin. Derleme çıktısındaki maksimum uygulama boyutu firmware'den büyük olmalıdır.
2. `rfid_personel_device_ota.ino` dosyasını USB ile cihaza yükleyin.
3. Cihazın kayıtlı Wi-Fi ve secret key bilgileri flash silinmediyse korunur. Flash silindiyse cihazın kurulum ağına bağlanıp bilgileri yeniden girin.
4. Yönetim panelinde **Cihaz Yazılım Güncellemeleri** sayfasından sonraki sürümün derlenmiş `.bin` dosyasını yükleyin.
5. Yüklenen panel sürümü ile ino içindeki `FIRMWARE_VERSION` birebir aynı olmalıdır.
6. Sürümü cihaz, firma veya şubeye atayın.

Cihaz açılıştan yaklaşık 30 saniye sonra ilk kontrolü, ardından 6 saatte bir kontrolü yapar. Sunucuya ulaşılamazsa 5 dakika sonra yeniden dener.

## Staging OTA testi

1. Staging veritabanında test cihazı oluşturun ve cihazın secret key bilgisini not edin.
2. `rfid_personel_device_ota_test.ino` dosyasını USB ile yükleyin. Bu dosya API adresini zorunlu olarak `https://test.flodeska.com` kullanır.
3. Gerekirse kurulum ekranından staging test cihazının secret key bilgisini girin.
4. Arduino IDE'de `rfid_personel_device_ota_test_update.ino` dosyasını açın ve **Sketch > Export Compiled Binary** işlemini çalıştırın.
5. Oluşan `.bin` dosyasını staging paneline `0.1.1-test` sürümüyle yükleyin.
6. Test cihazını hedefleyip güncellemeyi başlatın.
7. En geç ilk kontrol zamanında cihaz ekranda güncelleme mesajını gösterir, yeniden başlar ve açılışta `OTA Test 0.1.1 / Guncelleme OK` yazar.
8. Panelde durum önce **İndiriliyor**, yeniden açıldıktan sonra **Başarılı** olur.

## Yeni sürüm hazırlama

Her yeni firmware için `FIRMWARE_VERSION` değerini artırın. Eski veya aynı sürüm numarasını farklı bir `.bin` için tekrar kullanmayın. Firmware dosyasını panelden yüklerken yazılan sürüm ile kod içindeki değer farklı olursa cihaz kurulum sonucunu doğrulayamaz.

HTTPS bağlantısında Let’s Encrypt ISRG Root X1 sertifikası doğrulanır. Firmware indirme sırasında dosya boyutu ve SHA-256 özeti de doğrulanır. Geçersiz veya yarım dosya aktif önyükleme bölümü yapılmaz.
