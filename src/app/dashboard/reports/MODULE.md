# Raporlar

> İK verisini (personel, hareket, takvim, puantaj) yöneticinin karar verebileceği raporlara ve dışa aktarılabilir dosyalara dönüştürür.

## Amaç
Günlük devam, geç kalanlar, departman özeti, puantaj ve denetim kayıtlarını hızlı, filtrelenebilir ve Excel/PDF olarak paylaşılabilir şekilde sunmak. Raporlar veri üretmez; diğer modüllerin verisini okur.

## Kullanıcılar ve yetkiler
- Rapor izni olan roller; her kullanıcı yalnız yetki kapsamındaki (şube/departman/çalışan) veriyi görür.
- İK (`HR`) lisansı gerekir.

## Kapsam
- Ekranlar: `src/app/dashboard/reports/**` (daily-attendance, late-arrivals, departments, personnel, payroll, audit), `report-data.ts`
- API: `src/app/api/reports/operation-summary`
- Ortak bileşenler: `src/app/dashboard/export-button.tsx`, `reorderable-data-table.tsx`, `operation-filters.tsx`, `personnel-chart.tsx`, `top-late-employees.tsx`
- İş mantığı: `src/lib/operation-report.ts`, `operation-report-range.ts`, `operation-report-pdf.ts`, `cursor-pagination.ts`
- Testler: `operation-report.test.ts`, `cursor-pagination.test.ts`

## Değişmez kurallar
- Raporlar salt okunurdur; hesap kuralları (geç kalma, çalışılan süre) kaynak modülde tanımlıdır, raporda yeniden yazılmaz.
- Sütunlar sürüklenerek sıralanabilir; tercih tarayıcıda rapor bazlı saklanır ve dışa aktarma ekrandaki sırayı aynen kullanır.
- Büyük listeler sayfalanır (cursor pagination); tüm veri tek sorguda belleğe alınmaz.
- Tarih aralıkları uygulama saat dilimindedir (`app-time`).
- Kod değerleri (enum) raporda Türkçe etiketlerle gösterilir.

## Bağımlılıklar
- Kullandıkları: personel, pdks, takvim-izin, erişim (kapsam).
- Onu kullananlar: yok (son tüketici).

## Kapsam dışı
Üretim raporları (uretim modülü), veri düzeltme işlemleri (ilgili kaynak modül).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
