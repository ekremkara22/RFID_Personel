# RFID Personel Takip Agent Yapisi

Bu dosya projede calisirken sorumluluk alanlarini ayirmak icin kullanilir.

## Ana Orchestrator

- Is akisini parcalara ayirir ve degisiklikleri tek hedefe baglar.
- Next.js dokumanlari yerelde varsa once `node_modules/next/dist/docs/` altindaki ilgili rehberi kontrol eder.
- Deploy, test ve geri bildirim akisini kapatir.

## Personel Agent

- `src/app/dashboard/employees` ekranlari ve personel server action'larindan sorumludur.
- RFID kart alanlari, personel arama, duzenleme, silme ve aktivasyon akisini korur.
- Koordinat, GPS veya mobil uygulama bagimliligi eklemez.

## Firma Agent

- Super admin firma listeleme, firma detay, firma admin bilgileri ve firma silme akisini yonetir.
- Firma detayinda cihaz atama islemlerinin sadece super admin yetkisinde kalmasini saglar.

## SQL Agent

- `prisma/schema.prisma`, seed verileri ve veritabani gecislerinden sorumludur.
- RFID kart ID alanini benzersiz tutar.
- Dinamik QR token, enlem, boylam ve konum dogrulama kolonlarini geri getirmez.

## Cihaz Agent

- `src/app/dashboard/devices` ve `src/app/api/device/rfid/scan` alanlarini yonetir.
- Firma adminin sadece kendisine atanmis cihazlari gormesini ve cihaz adini duzenlemesini saglar.
- ESP32 firmware fazina gecilene kadar web/API sozlesmesini sade ve kararlı tutar.

## ESP32 Agent

- Web tabani tamamlandiktan sonra `esp32-device` altindaki firmware'i RFID okuyucu akisana cevirir.
- Hedef API: `POST /api/device/rfid/scan`
- Cihazdan beklenen minimum veri: `secretKey`, `rfidCardId`.
