# Akıllı Ev

> Süper adminin kişisel Raspberry Pi geçitlerini ve ESP32-C3 düğümlerini Flodeska panelinden izlemesini ve yönetmesini sağlar.

## Amaç
Raspberry Pi Zero 2 W yerel MQTT geçidi ve Flodeska ajanı olarak çalışır. ESP32-C3 düğümleri durum/telemetri yayınlar; panel komutları Pi üzerinden ilgili düğüme iletilir.

## Kullanıcılar ve yetkiler
- Yalnız `SUPERADMIN` rolündeki kullanıcı sayfaya ve aksiyonlara erişebilir.
- Her geçit `ownerId` ile oturumdaki kullanıcıya bağlıdır. Bir süper admin başka bir süper adminin geçitlerini, düğümlerini veya komutlarını göremez/yönetemez.
- Raspberry Pi ajanı oturum çerezi kullanmaz; yalnız geçide özel bearer anahtarıyla `/api/smart-home/sync` uç noktasına erişir.

## Kapsam
- Panel: `src/app/dashboard/smart-home`
- API: `src/app/api/smart-home/sync`
- İş mantığı: `src/modules/smart-home`, `src/lib/smart-home.ts`
- Pi ajanı: `smart-home-agent/`
- Veri: `SmartHomeGateway`, `SmartHomeNode`, `SmartHomeCommand`

## Değişmez kurallar
- Ham geçit API anahtarı veritabanına veya loglara yazılmaz; yalnız SHA-256 özeti saklanır ve ham değer oluşturulurken bir kez gösterilir.
- Her panel sorgusu/aksiyonu geçit sahibini oturumdaki kullanıcı kimliğiyle sınırlar.
- Cihazdan gelen ad, kimlik, telemetri ve JSON alanları güvenilmez girdidir; boyut ve tip doğrulamasından geçmeden saklanmaz.
- Komutlar süreli, tekrar teslim edilebilir ve cihaz onayıyla tamamlanır. ESP32 tarafı aynı komut kimliğini birden fazla kez alsa da işlemi tek kez uygulamalıdır.
- ESP-WIFI-MESH kullanılıyorsa root düğüm bir ESP32 olmalıdır; Raspberry Pi ESP-WIFI-MESH düğümü gibi modellenmez.

## Yol haritası
- ESP32-C3 için ortak firmware ve cihaz eşleştirme akışı
- Röle, ışık, iklim ve sensör tiplerine özel kontrol bileşenleri
- Otomasyon kuralları, zamanlama ve olay geçmişi
