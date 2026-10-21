# Akıllı Ev

> Süper adminin kişisel Raspberry Pi geçitlerini ve ESP32 mesh düğümlerini Flodeska panelinden izlemesini ve yönetmesini sağlar.

## Amaç
Raspberry Pi Zero 2 W yalnız internete bağlanır ve Flodeska ajanını çalıştırır. Pi'ye USB ile bağlı kök ESP32, ESP32-C3 düğümleriyle (anahtar, ışık, sensör) modemden bağımsız bir ESP-WIFI-MESH ağı kurar. Panel komutları Flodeska → Pi → kök ESP32 → düğüm yolunu izler; durum ve onaylar ters yönde döner. İlk kullanım yeri ürün sahibinin kendi odasıdır.

## Kullanıcılar ve yetkiler
- Yalnız `SUPERADMIN` rolündeki kullanıcı sayfaya ve aksiyonlara erişebilir.
- Her geçit `ownerId` ile oturumdaki kullanıcıya bağlıdır. Bir süper admin başka bir süper adminin geçitlerini, düğümlerini veya komutlarını göremez/yönetemez.
- Raspberry Pi ajanı oturum çerezi kullanmaz; yalnız geçide özel bearer anahtarıyla `/api/smart-home/sync` uç noktasına erişir.

## Kapsam
- Panel: `src/app/dashboard/smart-home`
- API: `src/app/api/smart-home/sync`
- İş mantığı: `src/modules/smart-home`, `src/lib/smart-home.ts`
- Pi ajanı ve seri protokol: `smart-home-agent/` (`PROTOCOL.md` sözleşmedir)
- Veri: `SmartHomeGateway`, `SmartHomeNode`, `SmartHomeCommand`
- Testler: `src/lib/smart-home.test.ts`

## Değişmez kurallar (ürün sahibi kararı)
- Raspberry Pi yalnız internete bağlanır; ESP32 düğümleri ev modemine bağlanmaz. Pi ↔ kök ESP32 bağlantısı USB seridir.
- Düğümler kök ESP32'ye ESP-WIFI-MESH ile bağlanır; kök sabittir ve Pi'ye USB ile bağlı ESP32'dir. Pi mesh düğümü gibi modellenmez.
- Yönetim kanalları: Flodeska paneli, ardından mobil uygulama ve Apple Home. Yeni kanal mevcut geçit/düğüm/komut modelini kullanır, ayrı bir cihaz modeli üretmez.
- Ham geçit API anahtarı veritabanına veya loglara yazılmaz; yalnız SHA-256 özeti saklanır ve ham değer oluşturulurken bir kez gösterilir.
- Her panel sorgusu/aksiyonu geçit sahibini oturumdaki kullanıcı kimliğiyle sınırlar.
- Cihazdan gelen ad, kimlik, telemetri ve JSON alanları güvenilmez girdidir; boyut ve tip doğrulamasından geçmeden saklanmaz. Geçersiz tek kayıt atlanır, tüm senkron reddedilmez.
- Düğümün `lastSeenAt` değeri ajanın o düğümden son mesaj aldığı zamandır, senkron zamanı değildir.
- Komutlar süreli, tekrar teslim edilebilir ve cihaz onayıyla tamamlanır. Düğüm aynı komut kimliğini birden fazla kez alsa da işlemi tek kez uygular.
- Fiziksel anahtar her zaman yerelde çalışır; internet veya Pi yokken de düğüm röleyi değiştirebilir.

## Bağımlılıklar
- Kullandıkları: `shared/action-helpers`, oturum (`erisim`)
- Onu kullananlar: yok

## Kapsam dışı
- Firma/çalışan verisiyle ilişki; modül kişisel kullanım içindir ve lisanslı ürün modülü değildir.

## Yol haritası
1. ESP32 firmware'i: kök (USB seri ↔ mesh) ve düğüm (mesh, röle, fiziksel anahtar girişi, OTA).
2. Panel: otomatik yenileme, geçit/düğüm silme ve yeniden adlandırma.
3. Zamanlama, otomasyon kuralları ve sensör geçmişi.
4. Mobil uygulama.
5. Apple Home: Pi üzerinde HomeKit köprüsü (yerel ağda çalışır; uzaktan erişim için evde Apple TV/HomePod gerekir).
