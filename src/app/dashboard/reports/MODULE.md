# Raporlar

> İK verisini (personel, hareket, takvim, puantaj) yöneticinin karar verebileceği raporlara ve dışa aktarılabilir dosyalara dönüştürür.

## Amaç
Rapor merkezi özeti, aylık puantaj cetveli (onay/kilit), günlük devam, personel puantaj özeti, departman karşılaştırma, geç kalma/erken çıkış, fazla mesai/eksik süre ve audit kayıtlarını filtrelenebilir, grafikli ve Excel/PDF olarak paylaşılabilir şekilde sunmak. Raporlar veri üretmez; diğer modüllerin verisini okur.

## Kullanıcılar ve yetkiler
- Rapor izni olan roller; her kullanıcı yalnız yetki kapsamındaki (şube/departman/çalışan) veriyi görür.
- İK (`HR`) lisansı gerekir.

## Kapsam
- Ekranlar: `src/app/dashboard/reports/**` (page = rapor merkezi, payroll, daily-attendance, personnel, departments, late-arrivals, overtime, audit)
- Ortak rapor parçaları: `report-context.ts` (yetki, kapsam, filtre, tarih aralığı), `report-metrics.ts`, `report-ui.tsx` (filtre çubuğu, KPI, çubuk listesi, günlük grafik, puantaj kodu), `reports.module.css`
- Puantaj çıktısı: `payroll/payroll-data.ts`, `payroll/payroll-export.ts` (xlsx + PDF), `payroll/export/route.ts`
- API: `src/app/api/reports/operation-summary`
- Ortak bileşenler: `src/app/dashboard/export-button.tsx`, `reorderable-data-table.tsx`, `operation-filters.tsx`, `personnel-chart.tsx`, `top-late-employees.tsx`
- İş mantığı: `src/lib/operation-report.ts`, `operation-report-range.ts`, `operation-report-pdf.ts`, `cursor-pagination.ts`
- Testler: `operation-report.test.ts`, `cursor-pagination.test.ts`

## Değişmez kurallar
- Raporlar salt okunurdur; günlük değerler yalnız `loadAttendanceDays` (`src/lib/attendance-days.ts`, PDKS) ile alınır. Geç kalma, net süre, mola, fazla mesai gibi hesaplar raporda yeniden yazılmaz.
- Ölçülen mola ve aşan mola sütunları yalnız mola takibi açık firmalarda gösterilir; düşülen (planlanan) mola her firmada bilgi olarak gösterilebilir.
- Puantaj raporları seçilen aralığın (en çok 370 gün) günlük verisini bir kez okuyup hesaplar; liste ekranlarındaki "tek sorguda belleğe alma" yasağının bilinçli istisnasıdır.
- Aylık puantaj cetveli personel × gün ızgarası olduğu için sütun sürükleme kuralının istisnasıdır; sıralanabilir liste ihtiyacı Personel Puantaj Özeti'ndedir.
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
