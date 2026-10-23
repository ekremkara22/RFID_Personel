# Platform (Firma, Lisans ve Sistem)

> SaaS platformunun omurgası: firmaları, kayıt ve deneme süresini, modül lisanslarını, modül kataloğunu ve sunucu sağlığını yönetir.

## Amaç
Yeni müşterinin kendi kendine kaydolup 14 günlük deneme ile başlaması, lisansladığı modüllere erişmesi ve süper adminin tüm firmaları, lisansları ve sistem sağlığını tek yerden yönetmesi.

## Kullanıcılar ve yetkiler
- Süper admin: firma listesi/detayı/silme, modül tanımları, sunucu sağlığı.
- Firma admini: mağaza ekranında lisans durumunu görür, deneme süresinde firma oluşturur.
- Yeni ziyaretçi: kayıt (`/register`).

## Kapsam
- Ekranlar: `src/app/dashboard/companies/**`, `store`, `settings/{modules,roles}`, `server-health`, `src/app/register`
- API: `src/app/api/auth/register`
- İş mantığı: `src/modules/companies/` (`provisioning.ts`: hazır roller ve firma sahibi üyeliği; mağaza akışı ve kayıt ortak kullanır), `src/modules/licensing/`, `src/modules/module-definitions/`, `src/modules/registry.ts`, `src/modules/navigation-registry.ts`, `src/lib/module-license-policy.ts`, `module-catalog.ts`, `server-health-rules.ts`, `internet-speed.ts`
- Veri: `Company`, `CompanyCategory`, `RoleDefinition`, `ModuleDefinition`, `UserModuleEntitlement`
- Testler: `module-license-policy.test.ts`, `server-health-rules.test.ts`, `src/modules/architecture.test.ts`

## Değişmez kurallar
- Ürün modülleri tek kaynaktan gelir: `src/modules/registry.ts`. Menü ve lisans buradan beslenir; modül anahtarları benzersizdir.
- Kendi kendine kayıt, kullanıcıyla birlikte firmasını da tek işlemde oluşturur (firma adı kayıt formunda zorunludur); kullanıcı firmanın sahibi (OWNER) olur ve deneme süresince tüm modüller firmaya açılır. Firmasız eski hesaplar mağazadaki "Firmanızı oluşturun" akışını kullanmaya devam eder.
- Deneme süresi 14 gündür (`TRIAL_DAYS`). Süresi biten ve lisansı olmayan hesap lisanslı modüllere erişemez.
- Lisans süresi (`expiresAt`) dolan modül etkin sayılmaz.
- Süper admin her modülü lisans seçimi olmadan görür.
- Firma silme tüm bağlı veriyi siler; yalnız süper admin yapar ve onay ister.
- Cihazın firmaya atanması yalnız süper admin yetkisindedir.
- `UserModuleEntitlement` tablosuna platform dışında yalnız `src/modules/commerce/license-activation.ts` yazar; e-posta doğrulaması (`src/modules/auth/email-tokens.ts`) bekleyen Shopier lisanslarını talep eder; kayıt akışı lisans yazmaz; yalnız firmayı oluşturur ve doğrulama e-postası gönderir.

## Bağımlılıklar
- Kullandıkları: erişim (kullanıcı, oturum).
- Onu kullananlar: tüm modüller (firma ve lisans bağlamı).
- Onu kullananlar: commerce (Shopier lisans aktivasyonu `UserModuleEntitlement` yazar).

## Kapsam dışı
Firma içi rol ve izin yönetimi (erişim), ödeme altyapısı (henüz yok).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
