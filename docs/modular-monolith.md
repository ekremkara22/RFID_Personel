# Modüler monolit altyapısı

Uygulama tek Next.js dağıtımı olarak kalır; iş sınırları `src/modules` altında ayrılır.

## Sınırlar

- `src/modules/*/actions.ts`: ilgili iş alanının yazma işlemleri ve sunucu aksiyonları.
- `src/modules/shared/query-repository.ts`: React sunucu sayfalarının veri okuma geçidi. `src/app` doğrudan Prisma altyapısını içe aktarmaz.
- `src/modules/registry.ts`: ürün modüllerinin tek kaynağı; lisans ve varsayılan rol modülleri buradan beslenir.
- `src/modules/navigation-registry.ts`: modül, rota ve yetki bağı bulunan yönetim menüsü tanımları.
- `src/app/dashboard/actions.ts` ve `access-actions.ts`: eski import yollarını bozmayan ince uyumluluk katmanlarıdır.

Yeni bir iş alanı eklenirken kendi modül klasörü açılmalı; başka bir modülün iç dosyası yerine açık dışa aktarımları kullanılmalıdır. Sayfa katmanı Prisma istemcisini doğrudan kullanmamalıdır.

## Veritabanı değişiklikleri

Paylaşılan ortamlarda `prisma db push` kullanılmaz. Şema değişikliği sürümlü migration olarak oluşturulur ve repoya eklenir:

```bash
npx prisma migrate dev --name aciklayici-degisiklik
```

Test ve canlı dağıtımları yalnızca bekleyen migration dosyalarını uygular:

```bash
npm run db:migrate:deploy
```

`20261004000000_baseline` migration'ı mevcut veritabanlarının başlangıç şemasını temsil eder. Mevcut test/canlı veritabanlarında ilk geçişte şema çalıştırılmadan `prisma migrate resolve --applied 20261004000000_baseline` ile bir kez kayıt altına alınır. Yeni ve boş veritabanlarında normal `migrate deploy` bütün şemayı kurar.

## Dağıtım

- Test: `scripts/deploy-staging.sh`
- Canlı: `scripts/deploy-production.sh`

Her iki akış da bağımlılık, Prisma istemcisi, migration, RBAC uyumluluğu, test, lint, production build ve servis restart adımlarını uygular.
