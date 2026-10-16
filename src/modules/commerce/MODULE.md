# Satış & Pazarlama (Shopier, ürün, içerik, sosyal medya)

> Platform sahibinin (süper admin) dijital modül lisanslarını ve fiziksel ürünleri Shopier üzerinden satmasını, siparişleri izlemesini, ürün içeriği üretip sosyal medyada yayınlamasını tek yerden yönetir.

## Amaç
- Shopier'den gelen dijital modül siparişlerinin lisansı elle iş yapmadan açması (otomatik lisans aktivasyonu).
- Platform dışı fiziksel ürünlerin (ör. LED oyun logoları) tanımlanması, Shopier'de yayınlanması ve siparişlerinin izlenmesi.
- Ürün görseli/videosu üretimi ve Instagram, TikTok gibi kanallarda planlı otomatik paylaşım.

Başarı ölçütü: ödenen dijital sipariş, alıcı e-postası bir hesapla eşleşiyorsa insan müdahalesi olmadan lisansa dönüşür; eşleşmeyen sipariş kaybolmaz, kuyrukta görünür.

## Kullanıcılar ve yetkiler
- Yalnız süper admin (platform yöneticisi). Firma kullanıcıları bu modülün ekranlarını görmez; müşteriye satılan bir ürün modülü değildir, `registry.ts` içinde lisanslı modül olarak yer almaz.
- Shopier webhook uç noktası kimlik doğrulamasızdır; güven yalnız `Shopier-Signature` HMAC doğrulamasından gelir.

## Kapsam
- Ekranlar: `src/app/dashboard/sales/**`
- API: `src/app/api/integrations/shopier/**`
- İş mantığı: `src/modules/commerce/**`
- Veri: `IntegrationCredential`, `ShopierLicenseProduct`, `ShopierOrder` (Faz 2: kargo alanları), `ShopierOrderLicense`, `CommerceProduct`, `CommerceProductImage` (Faz 3+: içerik, sosyal hesap ve paylaşım modelleri)
- Dosya deposu: ürün görselleri `var/commerce-products` (veya `COMMERCE_MEDIA_DIR`), `/api/integrations/shopier/product-images/[file]` ile herkese açık sunulur.
- Testler: `src/modules/commerce/**/*.test.ts`

### Dosyalar (Faz 1)
- `secret-box.ts` (saf AES-256-GCM, test edilir) ve `credentials.ts` (server-only `IntegrationCredential` deposu; anahtarlar `SHOPIER/API_TOKEN`, `SHOPIER/WEBHOOK:<event>` = JSON `{id, token}`).
- `shopier-types.ts`, `shopier-client.ts` (fetch tabanlı Shopier v1 istemcisi; hatalar token içermeyen Türkçe `ActionError`).
- `license-rules.ts` (saf: sipariş normalizasyonu, süre uzatma, iade durumu), `webhook-signature.ts` (HMAC-SHA256, hex/base64, `timingSafeEqual`).
- `license-activation.ts` (`ingestOrder`, `activatePending`, `ignorePending`, `claimPendingLicensesForEmail`; entitlement yazan tek dosya).
- `webhook-handler.ts` + `src/app/api/integrations/shopier/webhook/route.ts` (imza doğrulama → ingest; geçersiz imza 401, işlem hatası 500 ile Shopier'in tekrar denemesi).
- `repository.ts` (sayfaların okuma geçidi), `actions.ts` (yalnız süper admin server action'ları), `labels.ts` (kod → Türkçe rozet).
- Ekranlar: `src/app/dashboard/sales/{orders,activations,license-products,integrations}`; menüde platform grubunda tek "Satış & Pazarlama" girdisi, alt sayfalar sayfa içi sekmelerle.
- Testler: `license-rules.test.ts`, `webhook-signature.test.ts`, `secret-box.test.ts` (`npm test` listesine ekli).

### Dosyalar (Faz 2)
- `product-rules.ts` (saf: ürün formu doğrulama, Shopier ürün gövdesi, içe aktarma normalizasyonu, kargo bilgisi, görsel türü) + `product-rules.test.ts`.
- `product-media.ts` (görsel kaydet/oku/sil; JPG/PNG sihirli bayt kontrolü, 2 MB) ve `src/app/api/integrations/shopier/product-images/[file]/route.ts`.
- `product-catalog.ts` (ürün oluştur/güncelle, görsel sırası, Shopier'de yayınla/güncelle/kaldır, tek yönlü içe aktarma, siparişi gönderildi işaretleme).
- Ekranlar: `src/app/dashboard/sales/products/**` (liste, yeni, düzenle + galeri) ve `src/app/dashboard/sales/orders/[id]` (sipariş detayı, adres, kargo formu).

### Uygulama notları
- Faz 2 ürün kararları (2026-10-15): panel asıl kaynaktır (Shopier'deki mevcut ürünler bir kez içe aktarılır, sonraki içe aktarmalar mevcut kaydı ezmez); varyant yok; kargo panelden "gönderildi" işaretlenir (`PUT /orders/{id}` `fulfillments`) ve takip no Shopier'e gider.
- Shopier'de doğrudan kapatılan sipariş (`status = fulfilled`) "Shopier'de kapatıldı" görünür ve kargo bekleyenlere girmez.
- Görsel adresi Shopier'in indirebilmesi için mutlak https olmalıdır: `APP_URL`, yoksa isteğin host'u kullanılır. Görseller `public/` altına yazılmaz (build sonrası eklenen dosyalar oradan sunulmaz).
- `ShopierOrderLicense.activatedById`: ACTIVATED kayıtta null = otomatik aktivasyon, dolu = elle aktive eden admin. IGNORED kayıtta (`ignorePending`) kararı veren admindir.
- Sıra dışı webhook: saklanan siparişte tamamlanmış iade (`full`, `partial`) varsa daha eski gövde iade durumunu geri almaz (`mergeRefundStatus`) ve lisans açmaz. Lisans açılmadan tam iade edilen sipariş için eşlemesi olan satırlara REFUNDED kayıt yazılır; böylece sonradan gelen eski "paid" teslimi unique anahtara takılır.
- Shopier belgesi (Order modeli) "şu an yalnız paid siparişler kapsamda, unpaid ileride kullanılmak üzere ayrılmış" der ve ödeme durumu değişikliği için ayrı bir olay tanımlamaz. Bu yüzden order.created + order.fulfilled + refund.updated aboneliği yeterli kabul edildi.

### Ortam değişkenleri
- `INTEGRATION_ENCRYPTION_KEY` (zorunlu): 32 baytlık base64 anahtar, ör. `openssl rand -base64 32`. Değişirse kayıtlı anahtarlar çözülemez; Shopier anahtarı yeniden girilip webhook'lar yeniden kurulmalıdır.
- `APP_URL` (isteğe bağlı): webhook adresinin kökü için varsayılan; yoksa istek host'u önerilir ve formda düzenlenebilir.

## Değişmez kurallar
- API anahtarları, tokenlar ve sosyal medya kimlik bilgileri koda, repoya, loga veya istemciye gönderilen veriye yazılmaz. Veritabanında `INTEGRATION_ENCRYPTION_KEY` ile AES-256-GCM şifreli tutulur; ekranda yalnız maskeli (son 4 karakter) gösterilir.
- İmzası doğrulanmayan webhook isteği hiçbir veriyi değiştirmez.
- Lisans aktivasyonu idempotenttir: aynı sipariş + Shopier ürünü en fazla bir kez lisans uzatır (webhook tekrarları ve elle eşitleme çift süre vermez).
- Yalnız `paymentStatus = paid` siparişler lisans açar.
- Lisans süresi Shopier ürün eşlemesinden gelir: `durationDays` doluysa süre, mevcut aktif bitiş tarihinden (yoksa şimdiden) itibaren uzar; boşsa süresiz lisans verilir. Süresiz lisans süreli alımla kısalmaz.
- Lisans, alıcı e-postasıyla eşleşen kullanıcının bağlı olduğu firmanın lisans sahibine (`findCompanyLicensePrincipal`) verilir; firması yoksa kullanıcının kendisine.
- E-posta eşleşmezse sipariş "eşleşme bekliyor" kuyruğunda kalır. Aynı e-postayla kayıt olunduğunda lisans otomatik açılır; süper admin kullanıcıyı seçip elle de aktive edebilir.
- Ürün kararı (2026-10-14): Kayıtta e-posta doğrulaması olmamasına rağmen bekleyen lisanslar kayıt anında otomatik açılır. Başka birinin e-postasıyla kayıt olup lisans alma riski ürün sahibince kabul edildi; e-posta doğrulaması eklenirse otomatik talep doğrulamaya bağlanmalıdır.
- İade otomatik lisans kapatmaz; ilgili aktivasyon "iade edildi" olarak işaretlenir ve süper admin karar verir.
- Lisans yazımı platform modülünün kurallarına (`module-license-policy.ts`) uyar; bu modül entitlement tablosuna yalnız `src/modules/commerce/license-activation.ts` üzerinden yazar.

## Bağımlılıklar
- Kullandıkları: platform (lisans, `UserModuleEntitlement`, modül kataloğu), erişim (kullanıcı, süper admin yetkisi).
- Onu kullananlar: platform kayıt akışı (`src/app/api/auth/register`) yeni kullanıcı için bekleyen lisansları talep eder.

## Kapsam dışı
- Ödeme alma: ödeme tamamen Shopier'de olur; bu modül kart verisi görmez.
- Firma içi rol/izin yönetimi (erişim), tanıtım sitesi (pazarlama).

## Yol haritası
1. **Faz 1 (tamamlandı, staging 2026-10-15)**: Entegrasyon ayarları (Shopier token, webhook kaydı), Shopier ürünü ile modül eşlemesi, webhook ve elle eşitleme ile otomatik lisans aktivasyonu, sipariş listesi, eşleşme bekleyen kuyruk.
2. **Faz 2 (kodlandı ve staging'de 2026-10-15; panelden Shopier'e ürün yayınlama çalışıyor)**: Fiziksel ürün kataloğu, Shopier'e ürün yayınlama (`POST/PUT /v1/products`, görseller URL olarak), fiziksel siparişler ve kargo durumu.
3. **Faz 3**: Şablon tabanlı ürün görseli (kare/dikey) ve kısa video üretimi; daha sonra isteğe bağlı AI sağlayıcısı.
4. **Faz 4**: Instagram ve TikTok işletme hesabı bilgilerinin girildiği alan, paylaşım planlama ve otomatik yayın.

Faz notları:
- Faz 2: 2026-10-15'te `GET /v1/products` ucunda görülen 403 hatası çözüldü; panelden Shopier'e ürün girişi çalışıyor (ürün sahibi teyidi, 2026-10-16).
- Faz 3: Önce şablonla üretim (ürün fotoğrafı + başlık + fiyat + logo; kare ve dikey format), AI sağlayıcısı sonra.
- Faz 4: Kullanıcının henüz işletme hesabı yok. Instagram/TikTok hesap bilgileri Entegrasyonlar sayfasında girilecek, şifreli `IntegrationCredential` tablosunda saklanacak; paylaşım planlanacak ve otomatik yayınlanacak.
