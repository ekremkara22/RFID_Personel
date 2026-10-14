# Çalışma Takvimi ve İzin

> Her çalışanın her gün için "çalışması gereken saatleri" belirler; izinleri, tatilleri ve istisnaları bu plana işler.

## Amaç
Geç kalma, eksik çalışma ve fazla mesai ancak planla karşılaştırılarak hesaplanabilir. Bu modül şablon, atama, özel gün, istisna ve izinleri birleştirerek çalışan bazında günlük takvim (`EmployeeDailyCalendar`) üretir.

## Kullanıcılar ve yetkiler
- İK takvim şablonlarını, atamaları, özel günleri ve istisnaları yönetir.
- İzin talepleri oluşturulur ve onaylanır/reddedilir.
- İK (`HR`) lisansı gerekir.

## Kapsam
- Ekranlar: `src/app/dashboard/calendar/**` (templates, assignments, special-days, official-holidays, exceptions, conflicts, change-logs), `src/app/dashboard/leaves/**`
- İş mantığı: `src/modules/calendar/`, `src/modules/leave/`, `src/lib/work-calendar-rules.ts`
- Bakım script'leri: `scripts/backfill-attendance-calendars.ts`
- Veri: `WorkCalendarTemplate`, `WorkCalendarWeekday`, `CalendarAssignment`, `CalendarSpecialDay`, `CalendarDailyException`, `EmployeeDailyCalendar`, `CalendarChangeLog`, `LeaveRequest`
- Testler: `work-calendar-rules.test.ts`

## Değişmez kurallar
- Kapsam önceliği: çalışan > departman > şube > firma. Aynı seviyede çakışan kayıtlar `CONFLICT` olarak işaretlenir, sessizce seçilmez.
- Takvim kaydı ait olduğu firma dışındaki şube/departman/çalışana bağlanamaz (`assertCalendarScopeBelongsToCompany`).
- Gece yarısını geçen vardiyalar (`crossesMidnight`) iş günü olarak başlangıç gününe yazılır.
- İşe girişten önceki ve çıkıştan sonraki günler `OUT_OF_EMPLOYMENT` olur.
- Takvim değişiklikleri `CalendarChangeLog` ile kaydedilir.
- İzin türleri: yıllık, mazeret, ücretsiz, rapor, idari, saatlik, yarım gün. Onaylı izin günlük takvimde izin günü olarak görünür.

## Bağımlılıklar
- Kullandıkları: personel (şube, departman, çalışan).
- Onu kullananlar: pdks (vardiya sınırları, kesinleştirme), raporlar, muhasebe.

## Kapsam dışı
Hareket kayıtları (pdks), maaş ve izin ücreti hesaplama (muhasebe).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
