# Cihaz ve Firmware

> Sahadaki ESP32 RFID okuyucularını sisteme bağlar: kart okumalarını alır, cihaz sağlığını izler ve firmware'i uzaktan (OTA) günceller.

## Amaç
PDKS verisinin tek giriş kapısı cihazlardır. Cihaz kesintisiz okuma göndermeli, çevrimdışıyken kuyruğa almalı, saatini senkron tutmalı ve sahaya gitmeden güncellenebilmelidir.

## Kullanıcılar ve yetkiler
- Süper admin cihaz oluşturur, firmaya atar, firmware yayınlar.
- Firma admini yalnız kendine atanmış cihazları görür ve yalnız adını düzenler.
- Cihaz teknisyeni (`DEVICE_TECH`) rolü cihaz sağlığını izler.

## Kapsam
- API: `src/app/api/device/{rfid/scan,heartbeat,firmware/check,firmware/download,firmware/status}`, `src/app/api/admin/firmware`
- Ekranlar: `src/app/dashboard/devices`, `device-health`, `firmware-updates`, `companies/[id]/devices`
- İş mantığı: `src/modules/devices/`, `src/lib/device-scan.ts`, `attendance-type-inference.ts` (okumanın hareket türü; PDKS demo okutması da kullanır), `device-status.ts`, `firmware-storage.ts`
- Firmware: `esp32-device/` (OTA rehberi `OTA-KURULUM.md`)
- Veri: `Device`, `FirmwareRelease`, `FirmwareDeployment`, `UserDeviceAccess`
- Testler: `device-scan.test.ts`, `device-status.test.ts`

## Değişmez kurallar
- API sözleşmesi geriye uyumludur: sahadaki eski sürümler güncellenmeden çalışmaya devam eder. Alan kaldırılmaz/yeniden adlandırılmaz; yeni alanlar opsiyoneldir.
- Minimum scan verisi `secretKey` ve `rfidCardId`'dir; cihaz `secretKey` ile doğrulanır. Geçersiz anahtar hiçbir firma verisi döndürmez.
- Cihazın amacı (giriş, çıkış, mola, çift yönlü) hareket türünü belirler.
- Firmware içine gerçek Wi-Fi şifresi, secretKey veya sunucu parolası yazılmaz.
- Koordinat, GPS veya dinamik QR eklenmez.

## Bağımlılıklar
- Kullandıkları: personel (kart → çalışan), platform (firma ataması).
- Onu kullananlar: pdks (okumalar).

## Kapsam dışı
Hareketlerin yorumlanması ve kesinleştirilmesi (pdks).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
