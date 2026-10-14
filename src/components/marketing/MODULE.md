# Pazarlama (Tanıtım Sitesi)

> Ürünü ziyaretçilere anlatır, arama motorlarında bulunur kılar ve ziyaretçiyi kayda veya iletişime yönlendirir.

## Amaç
Potansiyel müşterinin modülleri anlaması, güven duyması ve deneme hesabı açması. Sayfalar hızlı, SEO uyumlu ve mobilde kusursuz olmalıdır.

## Kullanıcılar ve yetkiler
Herkese açık; oturum gerekmez.

## Kapsam
- Sayfalar: `src/app/page.tsx`, `src/app/moduller/**`, `src/app/blog/**`, `src/app/iletisim`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/marketing.module.css`
- Bileşenler: `src/components/marketing/` (site-header, site-footer, marketing-shell, module-slider, site.module.css)
- İçerik: `src/lib/marketing/blog-posts.ts`, `public/` görselleri
- Modül tanıtım metinleri: `src/modules/registry.ts` içindeki `description` ve `highlights` alanları (platform modülüyle ortak; değişiklik platform agent'ı ile koordine edilir)

## Değişmez kurallar
- Yönetim paneli stilleri (`management.module.css`) tanıtım sitesinde kullanılmaz; site kendi stil dosyalarıyla çalışır.
- Her sayfanın Türkçe başlık ve açıklama meta verisi vardır; yeni sayfa `sitemap.ts`'e eklenir.
- Ürün özellikleri abartılmaz; olmayan bir özellik tanıtılmaz.
- Görseller optimize edilir, mobil görünümde yatay taşma olmaz.

## Bağımlılıklar
- Kullandıkları: platform (modül kataloğu, kayıt akışı).
- Onu kullananlar: yok.

## Kapsam dışı
Kayıt ve oturum mantığı (platform, erişim), panel içi ekranlar.

## Yol haritası / açık konular
_Ürün sahibi tarafından doldurulacak._
