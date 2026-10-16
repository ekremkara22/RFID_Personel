# Pazarlama (Tanıtım Sitesi)

> Ürünü ziyaretçilere anlatır, arama motorlarında bulunur kılar ve ziyaretçiyi kayda veya iletişime yönlendirir.

## Amaç
Potansiyel müşterinin modülleri anlaması, güven duyması ve deneme hesabı açması. Sayfalar hızlı, SEO uyumlu ve mobilde kusursuz olmalıdır.

## Kullanıcılar ve yetkiler
Herkese açık; oturum gerekmez.

## Kapsam
- Sayfalar: `src/app/page.tsx`, `src/app/moduller/**`, `src/app/blog/**`, `src/app/iletisim`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/marketing.module.css`
- Bileşenler: `src/components/marketing/` (site-header, site-footer, marketing-shell, module-slider, module-card, module-actions, budget-report-preview, site.module.css)
- İçerik: `src/lib/marketing/blog-posts.ts`, `src/lib/marketing/modules.ts` (sitede tanıtılan modüller), `public/` görselleri
- Modül tanıtım metinleri: `src/modules/registry.ts` içindeki `description` ve `highlights` alanları (platform modülüyle ortak; değişiklik platform agent'ı ile koordine edilir)

## Değişmez kurallar
- Yönetim paneli stilleri (`management.module.css`) tanıtım sitesinde kullanılmaz; site kendi stil dosyalarıyla çalışır.
- Her sayfanın Türkçe başlık ve açıklama meta verisi vardır; yeni sayfa `sitemap.ts`'e eklenir.
- Ürün özellikleri abartılmaz; olmayan bir özellik tanıtılmaz.
- Görseller optimize edilir, mobil görünümde yatay taşma olmaz.
- Her modül kartının, modül sayfasının ve blog yazısının yanında "Satın al" ve "Ücretsiz dene" bulunur (`ModuleActions`). Satın alma bağlantısı süper adminin Ayarlar > Modüller ekranında girdiği Shopier adresidir (`ModuleDefinition.purchaseUrl`); boşsa iletişim sayfasına yönlenir. Sayfalar `revalidate = 300` ile yenilenir, kaydetme işlemi de `revalidatePath` çağırır.
- Örnek ekran görselleri (ör. bütçe raporu önizlemesi) "Örnek veri" etiketi taşır ve rakamları kendi içinde tutarlıdır.
- Bordro rakamı içeren yazılar `src/lib/salary-calculation.ts` ile doğrulanır.

## Bağımlılıklar
- Kullandıkları: platform (modül kataloğu ve satın alma bağlantıları, kayıt akışı).
- Onu kullananlar: yok.

## Kapsam dışı
Kayıt ve oturum mantığı (platform, erişim), panel içi ekranlar.

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
