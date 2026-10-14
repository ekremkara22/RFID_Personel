# Personel

> Firmanın çalışan kayıtlarını ve organizasyon yapısını (şube, departman, pozisyon, yönetici) tek ve güvenilir kaynakta tutar.

## Amaç
PDKS, takvim, puantaj ve raporların hepsi personel kaydına dayanır. Bu modül çalışanın kimliğini, RFID kartını, organizasyondaki yerini ve istihdam tarihlerini doğru tutarak diğer modüllere temiz veri sağlar.

## Kullanıcılar ve yetkiler
- Firma sahibi, admin ve İK rolleri personel ekler/düzenler; kapsamlı yöneticiler yalnız yetki kapsamındaki personeli görür.
- İK (`HR`) lisansı gerekir.

## Kapsam
- Ekranlar: `src/app/dashboard/employees/**`, `src/app/dashboard/settings/{branches,departments,managers,company-categories}/**`
- İş mantığı: `src/modules/personnel/` (`actions.ts`, `employee-photo.ts`), `src/modules/settings/` (organizasyon tanımları), `src/app/api/avatar`
- Veri: `Employee`, `Branch`, `Department`, `DepartmentCategory`, `Position`, `Manager`, `CompanyCategory`
- Testler: `src/lib/user-identity.test.ts`

## Değişmez kurallar
- RFID kart ID'si sistem genelinde benzersizdir; boş değer `normalizeOptionalRfidCardId` ile null'a çevrilir.
- Sicil numarası firma içinde benzersizdir (`companyId + registrationNumber`).
- Personel her zaman bir firmaya bağlıdır; başka firmanın personeli görüntülenemez ve değiştirilemez.
- İşe giriş/çıkış tarihleri takvim ve puantaj hesaplarını etkiler; değiştirildiğinde takvim yeniden üretimi gerektirebilir.
- Fotoğraf sabit ölçülü kartta `object-fit: cover` ile gösterilir, yoksa yer tutucu çıkar.
- Koordinat, GPS veya mobil uygulama bağımlılığı eklenmez.

## Bağımlılıklar
- Kullandıkları: erişim (yetki kapsamı), platform (firma).
- Onu kullananlar: pdks, takvim-izin, raporlar, muhasebe, cihaz (kart eşleşmesi).

## Kapsam dışı
Giriş-çıkış hareketleri (pdks), çalışma takvimi (takvim-izin), maaş hesaplama (muhasebe), panel kullanıcı hesapları (erişim).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
