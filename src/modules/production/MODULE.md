# Üretim Planlama

> İş merkezi, istasyon, kalıp ve çevrim süresi tanımlarıyla iş emirlerini planlar; kapasiteyi ve üretim takvimini görünür kılar.

## Amaç
Üretim yapan firmaların hangi işin hangi istasyonda ne zaman yapılacağını planlaması, kapasite darboğazlarını önceden görmesi ve iş emirlerini Excel'den toplu alabilmesi.

## Kullanıcılar ve yetkiler
- Varsayılan olarak firma sahibi ve admin.
- Üretim Planlama (`PRODUCTION_PLANNING`) lisansı gerekir.
- Ürün kararı (2026-10-15): modül henüz müşteriye açılmadı. `src/modules/registry.ts` içindeki `UNRELEASED_MODULE_KEYS` listesinde olduğu sürece yalnız süper admin görür; firma yetki bağlamı, mağaza ve firma ekranları onu filtreler (kayıtlı rol/lisans satırları silinmez). Açmak için listeden çıkarılması yeterlidir.

## Kapsam
- Ekranlar: `src/app/dashboard/production/**` (definitions/{work-centers,stations,tools}, cycle-times, work-orders, gantt, calendar, capacity-planning, reports)
- İş mantığı: `src/modules/production/` (`actions.ts`, `labels.ts`)
- İçe aktarma: `work-orders/template`, `work-orders/template-xlsx` (xlsx)
- Demo veri: `scripts/seed-production-planning-demo.ts`
- Veri: `ProductionWorkCenter`, `ProductionStation`, `ProductionTool`, `ProductionCycleTime`, `ProductionCustomField`, `ProductionImportTemplate`, `ProductionWorkOrder`

## Değişmez kurallar
- Tüm üretim tanımları firmaya aittir; başka firmanın iş merkezi/istasyonu seçilemez.
- İş emri durumları: taslak, planlandı, devam ediyor, tamamlandı, iptal. Tamamlanan/iptal edilen iş emri planda taşınmaz.
- İstasyon türleri (genel, enjeksiyon, CNC torna/freze, montaj, kalite) `labels.ts` ile Türkçe gösterilir.
- Excel içe aktarma satır bazında doğrulanır; hatalı satır diğerlerini sessizce bozmaz, kullanıcıya raporlanır.
- Özel alanlar (metin, sayı, tarih, seçim, evet/hayır) tanımlı tipine göre doğrulanır.

## Bağımlılıklar
- Kullandıkları: platform (firma, lisans).
- Onu kullananlar: yok. (İleride personel/PDKS ile vardiya-istasyon bağı kurulabilir.)

## Kapsam dışı
Personel devam takibi, stok ve maliyet muhasebesi.

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
