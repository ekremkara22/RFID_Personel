# Erişim ve Yetki

> Kimin hangi firmada, hangi modülde, hangi işlemi, hangi veri kapsamında yapabileceğini belirler.

## Amaç
Çok firmalı yapıda her kullanıcının yalnız yetkili olduğu veriyi görmesi ve değiştirmesi. Firma rolleri, izinler, modül atamaları, veri kapsamı (şube/departman/çalışan/cihaz/ekip), davetler ve denetim kaydı bu modüldedir.

## Kullanıcılar ve yetkiler
- Firma sahibi ve admin üye, rol, ekip ve davetleri yönetir.
- Süper admin panel kullanıcılarını (`/dashboard/users`) yönetir.
- Her kullanıcı oturumda aktif firmasını seçebilir.

## Kapsam
- Ekranlar: `src/app/dashboard/access/**` (members, roles, teams, invite, audit), `src/app/dashboard/users/**`, `src/app/login` (davet linki 2026-10-15'te kaldırıldı: firma adminleri kullanıcıyı doğrudan "Kullanıcı Tanımla" ile açar; `CompanyInvitation` tablosu yalnız geçmiş kayıt olarak durur)
- API: `src/app/api/auth/login`
- İş mantığı: `src/modules/access/`, `src/modules/users/`, `src/modules/auth/`, `src/lib/auth.ts`, `session.ts`, `api-session.ts`, `access.ts`, `authorization.ts`, `authorization-scope.ts`, `company-scope.ts`, `company-role-policy.ts`, `permission-catalog.ts`, `role-editor-options.ts`
- Script'ler: `scripts/migrate-company-rbac.ts`, `scripts/seed-rbac-staging-demo.ts`
- Veri: `User`, `CompanyRole`, `CompanyRoleModule`, `CompanyRolePermission`, `CompanyMembership`, `Membership*Scope`, `MembershipModule`, `CompanyTeam`, `CompanyTeamEmployee`, `CompanyInvitation`, `CompanyAccessAudit`, `UserCompanyAccess`
- Testler: `authorization.test.ts`, `company-scope.test.ts`, `company-role-policy.test.ts`, `role-module-sync.test.ts`, `user-identity.test.ts`

## Değişmez kurallar
- Varsayılan red: izin açıkça verilmemişse işlem yapılamaz.
- Veri kapsamı modları: firma geneli, kısıtlı, yalnız kendi, hiçbiri. Kısıtlı kapsam her sorguda uygulanır.
- Kullanıcı kendisinde olmayan modül veya izni başkasına devredemez (`validateDelegatedModules`, `canDelegateRole`).
- Firma sahipliği yalnız sahiplik devri akışıyla değişir; firmada her zaman bir sahip bulunur.
- Üyelik, rol ve kapsam değişiklikleri `CompanyAccessAudit` ile kaydedilir.
- Davet token'ları hash'lenerek saklanır, süreleri dolar.
- Parolalar bcrypt ile saklanır; hiçbir yanıtta parola veya hash dönmez.

## Bağımlılıklar
- Kullandıkları: platform (firma, lisans), personel (çalışan bağlı üyelik).
- Onu kullananlar: tüm modüller.

## Kapsam dışı
Firma oluşturma ve lisans satın alma (platform).

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
