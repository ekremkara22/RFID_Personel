# Muhasebe

> Türkiye bordro mevzuatına göre brütten nete ve netten brüte maaş hesaplar; güncel bordro sabitlerini yönetir.

## Amaç
Bordro ve muhasebe ekiplerinin maaş hesabını doğru, şeffaf ve dışa aktarılabilir şekilde yapması. Hesaplama SGK primi, işsizlik sigortası, gelir vergisi dilimleri, damga vergisi ve asgari ücret istisnalarını içerir.

## Kullanıcılar ve yetkiler
- Varsayılan olarak firma sahibi, admin ve bordro (`PAYROLL`) rolü.
- Muhasebe (`ACCOUNTING`) lisansı gerekir.

## Kapsam
- Ekranlar: `src/app/dashboard/accounting/**` (salary-calculation, gross-to-net, net-to-gross, settings)
- İş mantığı: `src/lib/salary-calculation.ts`
- Bu klasör muhasebe sunucu aksiyonları eklendiğinde kullanılacaktır.
- Testler: `salary-calculation.test.ts`

## Değişmez kurallar
- Hesaplama kümülatif gelir vergisi matrahını ay ay taşır; dilim geçişleri doğru uygulanır.
- Çalışan türü (teşvikli, teşviksiz, emekli) prim oranlarını belirler.
- Yıllık bordro sabitleri (asgari ücret, SGK tavanı, vergi dilimleri) tek yerde tanımlıdır ve değiştiğinde testlerle doğrulanır.
- Netten brüte hesap, brütten nete hesabın tersiyle tutarlı olmalıdır (aynı sonuca döner).
- Para hesaplarında yuvarlama kuralı tutarlıdır; ara sonuçlar keyfi yuvarlanmaz.
- CSV ile içe aktarma, CSV dışa aktarma ve PDF dışa aktarma modüle erişimi olan herkese (14 günlük deneme dahil) açıktır; ayrı bir ücretli lisans kilidi yoktur.

## Bağımlılıklar
- Kullandıkları: personel (brüt maaş, sigorta türü), pdks (kilitli puantaj dönemi — gelecekte).
- Onu kullananlar: yok.

## Kapsam dışı
Devam takibi ve puantaj onayı (pdks), resmi beyanname gönderimi.

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
