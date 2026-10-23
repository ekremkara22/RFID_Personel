# PDKS (Giriş-Çıkış ve Puantaj)

> RFID okumalarını güvenilir giriş, çıkış ve mola hareketlerine dönüştürür; hatalı günleri incelemeye çıkarır ve aylık puantaj dönemini onaylanabilir hale getirir.

## Amaç
Firmanın "kim ne zaman geldi, ne kadar çalıştı" sorusuna doğru yanıt vermesi. Ham okumalar sıralama, tekrar okuma ve vardiya kurallarıyla kesinleştirilir; şüpheli durumlar insan onayına düşer; onaylanan dönem kilitlenerek muhasebe ve raporlara temel olur.

## Kullanıcılar ve yetkiler
- İK ve yöneticiler hareketleri görür, manuel hareket ekler/düzeltir, inceleme kayıtlarını çözer.
- Bordro (`PAYROLL`) rolü puantaj dönemini onaylar/kilitler.
- İK (`HR`) lisansı gerekir.

## Kapsam
- Ekranlar: `src/app/dashboard/movements/**`, `src/app/dashboard/movement-reviews/**`
- İş mantığı: `src/modules/attendance/`, `src/modules/attendance-review/`, `src/modules/payroll/` (puantaj dönemi onay/kilit), `src/lib/attendance-sequence.ts`, `attendance-finalization-rules.ts`, `attendance-finalizer.ts`, `attendance-review.ts`, `attendance-labels.ts`, `payroll-period.ts`
- Zamanlanmış iş: `scripts/finalize-attendance.ts` (`deploy/*/…-attendance-finalizer.timer`)
- Veri: `AttendanceLog`, `AttendanceReviewResolution`, `AttendanceMovementAudit`, `PayrollPeriod`
- Testler: `attendance-sequence.test.ts`, `attendance-finalization-rules.test.ts`, `attendance-review.test.ts`

## Değişmez kurallar
- Hareket türleri: giriş, çıkış, mola başlangıç/bitiş, yemek başlangıç/bitiş. Sıra ve eşleşme `attendance-sequence` kurallarıyla değerlendirilir.
- Kısa aralıktaki tekrar okumalar (`DUPLICATE_SCAN_WINDOW_MS`) tek hareket sayılır; gecikmeli yüklenen cihaz kayıtları işaretlenir.
- Manuel ekleme, düzeltme ve silme `AttendanceMovementAudit` ile iz bırakır; iz silinmez.
- Onaylanmış veya kilitli puantaj dönemindeki hareketler değiştirilemez; önce dönem yeniden açılmalıdır (yetki gerekir).
- Demo kart okutma (`simulateDemoCardScanAction`, Operasyon Özeti başlangıç listesi) yalnız firma lisans sahibinin deneme süresi açıkken çalışır; hareket türünü gerçek çift yönlü cihazla aynı kuralla (`src/lib/attendance-type-inference.ts`) belirler, cihazsız kaydedilir ve "Deneme süresinde demo kart okutma" gerekçesiyle audit izi bırakır.
- Tüm gün/saat hesapları `src/lib/app-time.ts` ile uygulama saat diliminde yapılır.

## Bağımlılıklar
- Kullandıkları: personel, takvim-izin (planlanan vardiya), cihaz (okumalar).
- Onu kullananlar: raporlar, muhasebe.

## Kapsam dışı
Cihaz API'si ve firmware (cihaz-firmware), çalışma takvimi tanımları (takvim-izin), maaş tutarı hesaplama (muhasebe).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
