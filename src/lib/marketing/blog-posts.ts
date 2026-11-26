import { MODULES, type ModuleKey } from "@/modules/registry";

export type BlogTable = { caption?: string; head: string[]; rows: string[][] };
export type BlogSection = { heading: string; paragraphs: string[]; bullets?: string[]; table?: BlogTable; after?: string[] };
export type BlogFaq = { q: string; a: string };
export type BlogPost = {
  slug: string; title: string; description: string; category: string; readingTime: string; publishedAt: string;
  /** Module promoted next to the article (purchase + trial card). */
  relatedModule: ModuleKey;
  sections: BlogSection[];
  faqs?: BlogFaq[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "2026-personel-maas-butcesi-nasil-hazirlanir",
    title: "2026 personel maaş bütçesi nasıl hazırlanır? Adım adım rehber",
    description: "2026 yılı maaş bütçesini hazırlarken brüt maaş, net maaş ve işveren maliyetini nasıl toplayacağınızı 10 kişilik örnek bir kadro üzerinden adım adım anlatıyoruz.",
    category: "Muhasebe", readingTime: "8 dk", publishedAt: "2026-11-26", relatedModule: MODULES.ACCOUNTING,
    sections: [
      {
        heading: "Maaş bütçesi neden brüt maaş toplamı değildir?",
        paragraphs: [
          "Birçok küçük ve orta ölçekli işletme yıllık personel bütçesini maaş listesindeki brüt tutarları 12 ile çarparak hesaplar. Bu yöntem işverenin brüt maaşın üzerine ödediği SGK ve işsizlik sigortası primlerini dışarıda bırakır. Sonuç olarak bütçe, yılın ilk aylarında gerçek ödemelerin gerisinde kalır.",
          "Doğru bir 2026 maaş bütçesi üç rakamı birlikte göstermelidir: çalışanların yıllık brüt maaşı, hesaplarına yatacak net tutar ve işverenin toplam maliyeti. Nakit akışı ve kârlılık planı için belirleyici olan rakam işveren maliyetidir.",
        ],
      },
      {
        heading: "Adım 1: Kadro listesini ve maaş tipini netleştirin",
        paragraphs: ["Bütçe hazırlığının ilk adımı her çalışan için doğru bilginin tek listede toplanmasıdır. Liste şu alanları içermelidir:"],
        bullets: [
          "Ad soyad, departman, pozisyon ve yaka (mavi/beyaz) bilgisi",
          "Maaşın brüt mü yoksa net üzerinden mi anlaşıldığı",
          "Aylık brüt maaş veya garanti edilen net tutar",
          "SGK durumu: 5510 teşvikli, teşviksiz veya emekli (SGDP)",
        ],
        after: ["SGK durumu sık atlanan ama bütçeyi doğrudan etkileyen bir alandır. Aynı brüt maaşta teşviksiz çalışanın işverene maliyeti, teşvikli çalışandan her ay brüt maaşın %4’ü kadar fazladır."],
      },
      {
        heading: "Adım 2: Her çalışanın 12 aylık maliyetini ayrı hesaplayın",
        paragraphs: [
          "Gelir vergisi kümülatif matraha göre hesaplandığı için çalışanın neti yıl içinde değişir. Brüt sabit kalsa bile işveren maliyeti aynı kalır, ancak çalışana geçen net tutar yılın ikinci yarısında azalır. Net üzerinden anlaşılan çalışanlarda ise tersi olur: neti sabit tutmak için brüt ve işveren maliyeti yükselir.",
          "Bu nedenle her çalışan için Ocak’tan Aralık’a ay ay hesap yapmak gerekir. Tek bir ayın sonucunu 12 ile çarpmak, özellikle net maaşlı çalışanlarda bütçeyi eksik gösterir.",
        ],
      },
      {
        heading: "Örnek: 10 kişilik bir işletmenin 2026 maaş bütçesi",
        paragraphs: ["Aşağıdaki kadroda tüm çalışanlar brüt üzerinden anlaşılmış ve 5510 teşviklidir. Hesaplar Flodeska Muhasebe modülündeki 2026 varsayılan parametreleriyle yapılmıştır."],
        table: {
          caption: "Örnek kadro ve yıllık işveren maliyeti",
          head: ["Departman", "Pozisyon", "Kişi", "Aylık brüt", "Yıllık işveren maliyeti"],
          rows: [
            ["Üretim", "Operatör (asgari ücret)", "6", "33.030 ₺", "2.824.065,36 ₺"],
            ["Üretim", "Vardiya amiri", "1", "50.000 ₺", "712.500,00 ₺"],
            ["Satış", "Satış temsilcisi", "2", "45.000 ₺", "1.282.500,00 ₺"],
            ["Yönetim", "Muhasebe uzmanı", "1", "55.000 ₺", "783.750,00 ₺"],
            ["Toplam", "", "10", "", "5.602.815,36 ₺"],
          ],
        },
        after: [
          "Bu kadroda yıllık brüt maaş toplamı 4.718.160 ₺, çalışanlara geçen yıllık net toplam 3.849.203,92 ₺ ve işveren maliyeti 5.602.815,36 ₺’dir. Brüt toplamı bütçe diye kabul eden bir işletme, yıl içinde yaklaşık 885 bin ₺’lik farkla karşılaşır.",
          "Kişi başı aylık ortalama işveren maliyeti 46.690,13 ₺’dir. İşverenin ödediği her 100 ₺’nin yaklaşık 68,7 ₺’si çalışana net olarak geçer.",
        ],
      },
      {
        heading: "Adım 3: Maliyeti departman ve yaka bazında dağıtın",
        paragraphs: ["Toplam rakam tek başına karar vermeye yetmez. Maliyetin nereye gittiğini görmek, hangi alanda verimlilik veya fiyatlama çalışması gerektiğini gösterir."],
        table: {
          head: ["Departman", "Kişi", "Yıllık işveren maliyeti", "Bütçedeki payı"],
          rows: [["Üretim", "7", "3.536.565,36 ₺", "%63,1"], ["Satış", "2", "1.282.500,00 ₺", "%22,9"], ["Yönetim", "1", "783.750,00 ₺", "%14,0"]],
        },
        after: ["Aynı örnekte mavi yaka çalışanlar bütçenin %63,1’ini, beyaz yaka çalışanlar %36,9’unu oluşturur. Ürün maliyetine işçilik payı eklenirken bu dağılım doğrudan kullanılabilir."],
      },
      {
        heading: "Adım 4: Aylık nakit akışını ve bütçe limitini kontrol edin",
        paragraphs: [
          "Brüt üzerinden anlaşılan bir kadroda aylık işveren maliyeti yıl boyunca sabittir; örnekte her ay 466.901,28 ₺’dir. Çalışanlara yatan net toplam ise Ocak’ta 325.708,57 ₺ iken Aralık’ta 311.433,65 ₺’ye düşer. Çalışan memnuniyeti açısından bu düşüşün önceden bilinmesi önemlidir.",
          "Yönetimin belirlediği yıllık bir bütçe limiti varsa, hesaplanan işveren maliyeti bu limitle karşılaştırılmalı; kalan veya aşan tutar bütçe toplantısından önce ortaya konmalıdır.",
        ],
      },
      {
        heading: "Adım 5: Zam ve işe alım senaryolarını deneyin",
        paragraphs: ["Bütçe tek bir rakam değil, senaryolar arasında yapılan bir tercihtir. Yıl ortası zam, yeni bir pozisyon veya teşvik kapsamındaki değişiklikler bütçeyi doğrudan etkiler. Her senaryoda işveren maliyetinin yeniden hesaplanması gerekir; zammın maliyete etkisini ayrı bir yazıda örneklerle inceledik."],
      },
      {
        heading: "Flodeska ile maaş bütçesini dakikalar içinde çıkarın",
        paragraphs: ["Flodeska Muhasebe modülünde personel listenizi yükledikten sonra bütçe raporu otomatik oluşur. Rapor; yıllık brüt, net ve işveren maliyetini, departman, pozisyon, yaka ve SGK türüne göre dağılımı, aylık ve kümülatif maliyeti tek ekranda gösterir."],
        bullets: [
          "Zam senaryosu alanına oran girerek yeni yıllık maliyeti anında görme",
          "Yıllık bütçe limiti girerek kalan veya aşan tutarı izleme",
          "Brütten nete ve netten brüte çalışanları aynı raporda birleştirme",
          "Raporu PDF olarak kaydedip yönetimle paylaşma",
        ],
      },
    ],
    faqs: [
      { q: "Maaş bütçesi hazırlarken hangi rakam esas alınmalı?", a: "Nakit ve kârlılık planı için işveren maliyeti esas alınmalıdır. Brüt maaş toplamı, işverenin ödediği SGK ve işsizlik primlerini içermediği için bütçeyi eksik gösterir." },
      { q: "10 kişilik bir işletmenin 2026 maaş bütçesi ne kadar tutar?", a: "Kadronun maaş seviyesine ve SGK durumuna göre değişir. Yazıdaki örnekte 6’sı asgari ücretli 10 kişilik teşvikli bir kadronun yıllık işveren maliyeti 5.602.815,36 ₺’dir." },
      { q: "Bütçe yıl içinde neden sapar?", a: "En sık nedenler net üzerinden anlaşılan çalışanların vergi dilimi yükseldikçe artan brüt maliyeti, yıl ortası zamlar ve teşvik kapsamındaki değişikliklerdir." },
    ],
  },
  {
    slug: "zam-senaryosu-isveren-maliyetine-etkisi-2026",
    title: "%10, %20, %30 zam işveren maliyetini ne kadar artırır? 2026 zam senaryoları",
    description: "Zam oranının 2026 yıllık işveren maliyetine ve çalışanlara geçen net tutara etkisini örnek kadro üzerinden hesaplıyor, zam bütçesini planlarken dikkat edilecek noktaları anlatıyoruz.",
    category: "Muhasebe", readingTime: "6 dk", publishedAt: "2026-11-26", relatedModule: MODULES.ACCOUNTING,
    sections: [
      {
        heading: "Zam kararında asıl soru: işverene maliyeti ne olacak?",
        paragraphs: [
          "Zam görüşmeleri genellikle yüzde üzerinden yapılır, ama işletmenin bütçesini etkileyen şey o yüzdenin toplam işveren maliyetine karşılığıdır. Brüt maaşa yapılan zam, işverenin SGK ve işsizlik primlerini de aynı oranda artırır.",
          "Öte yandan çalışanın netine yansıyan artış zam oranından düşük kalabilir. Daha yüksek brüt maaş, birikimli matrahın gelir vergisi dilimlerini daha erken aşmasına neden olur.",
        ],
      },
      {
        heading: "Örnek kadroda zam senaryoları",
        paragraphs: ["Aşağıdaki tablo; 6 asgari ücretli operatör, 1 vardiya amiri, 2 satış temsilcisi ve 1 muhasebe uzmanından oluşan 10 kişilik 5510 teşvikli bir kadroya, brüt maaşlar üzerinden uygulanan zammın yıllık etkisini gösterir. Hesaplar Flodeska Muhasebe modülünün 2026 varsayılan parametreleriyle yapılmıştır."],
        table: {
          caption: "Zam oranına göre yıllık toplamlar (10 kişi, 5510 teşvikli)",
          head: ["Zam", "Yıllık brüt", "Yıllık net", "Yıllık işveren maliyeti", "Maliyet artışı"],
          rows: [
            ["Zamsız", "4.718.160 ₺", "3.849.203,92 ₺", "5.602.815,36 ₺", "—"],
            ["%10", "5.189.976 ₺", "4.152.534,70 ₺", "6.163.096,68 ₺", "+560.281,32 ₺"],
            ["%20", "5.661.792 ₺", "4.454.065,06 ₺", "6.723.378,00 ₺", "+1.120.562,64 ₺"],
            ["%30", "6.133.608 ₺", "4.743.245,56 ₺", "7.283.659,32 ₺", "+1.680.843,96 ₺"],
          ],
        },
        after: ["SGK tavanının altındaki maaşlarda işveren maliyeti zamla birebir aynı oranda artar: %10 zam, yıllık işveren maliyetini de %10 artırır."],
      },
      {
        heading: "Zammın ne kadarı çalışana net olarak geçer?",
        paragraphs: [
          "Aynı örnekte %10 zam işverene yıllık 560.281,32 ₺ ek maliyet getirirken çalışanların yıllık net toplamı 303.330,78 ₺ artar. Yani net artış %7,9’da kalır. %30 zamda net artış %23,2 olur.",
          "İşverenin ödediği her 100 ₺’nin çalışana net geçen kısmı zamsız durumda 68,7 ₺ iken %10 zamda 67,4 ₺’ye, %30 zamda 65,1 ₺’ye iner. Bu fark, asgari ücret istisnasının sabit kalmasından ve vergi dilimlerinin daha erken aşılmasından kaynaklanır.",
        ],
      },
      {
        heading: "Zam bütçesi planlarken dikkat edilecekler",
        paragraphs: ["Zam kararı vermeden önce şu kontrollerin yapılması yıl içindeki sürprizleri azaltır:"],
        bullets: [
          "Zammın brüt mü net mi uygulanacağı: net zam, işveren maliyetini brüt zamdan daha fazla artırır",
          "Asgari ücretli çalışanlar: yasal asgari ücret artışı şirket zam politikasından bağımsız uygulanır",
          "SGK tavanına yakın maaşlar: tavanın üzerindeki kısım için işveren primi oluşmaz",
          "Zammın yürürlük ayı: yıl ortasında başlayan zam o yıl yalnız kalan aylar için maliyet yaratır",
          "Belirlenen yıllık bütçe limiti: zam sonrası toplam maliyetin limiti aşıp aşmadığı",
        ],
      },
      {
        heading: "Flodeska’da zam senaryosunu anında görün",
        paragraphs: ["Flodeska Muhasebe modülünün bütçe raporunda zam senaryosu alanına bir oran yazmanız yeterlidir. Yıllık brüt, net, işveren maliyeti, departman dağılımı ve aylık maliyet grafiği yeni orana göre hemen güncellenir. Yıllık bütçe limiti girildiğinde senaryonun limitin ne kadar altında veya üstünde kaldığı da görünür."],
      },
    ],
    faqs: [
      { q: "%10 zam işveren maliyetini ne kadar artırır?", a: "SGK tavanının altındaki brüt maaşlarda işveren maliyeti de %10 artar. 10 kişilik örnek kadroda bu artış yıllık 560.281,32 ₺’dir." },
      { q: "Zam oranı kadar net maaş artar mı?", a: "Genellikle artmaz. Örnekte %10 brüt zam, yıllık net toplamı %7,9 artırmıştır; çünkü asgari ücret istisnası sabit kalır ve vergi dilimleri daha erken aşılır." },
      { q: "Net zam ile brüt zam arasındaki fark nedir?", a: "Brüt zamda bordrodaki brüt tutar artırılır. Net zamda çalışanın eline geçecek tutar sabitlenir; vergi dilimi yükseldikçe brüt ve işveren maliyeti de artar." },
    ],
  },
  {
    slug: "net-maas-anlasmasinin-isverene-maliyeti-2026",
    title: "Net maaş anlaşması işverene ne kadar pahalıya gelir? 2026 hesabı",
    description: "Çalışanla net maaş üzerinden anlaşmanın 2026 yılında işveren maliyetini brüt anlaşmaya göre nasıl artırdığını 40.000 ₺ net örneğiyle ay ay hesaplıyoruz.",
    category: "Muhasebe", readingTime: "6 dk", publishedAt: "2026-11-25", relatedModule: MODULES.ACCOUNTING,
    sections: [
      {
        heading: "Net anlaşma neden yaygın, riski nedir?",
        paragraphs: [
          "Türkiye’de birçok işletme, çalışana ayın sonunda hesabına yatacak tutarı garanti etmek için maaşı net olarak konuşur. Çalışan için anlaşılırdır; ancak bu durumda gelir vergisindeki artışın yükünü tamamen işveren üstlenir.",
          "Yıl içinde birikimli matrah vergi dilimlerini aştıkça, neti sabit tutmak için brüt maaşın yükseltilmesi gerekir. Brüt yükseldiğinde işverenin SGK ve işsizlik primleri de artar.",
        ],
      },
      {
        heading: "40.000 ₺ net maaşın 2026 brüt karşılığı",
        paragraphs: ["Her ay 40.000 ₺ net almak üzere anlaşılan 5510 teşvikli bir çalışan için Flodeska Muhasebe modülünde 2026 varsayılan parametreleriyle bulunan brüt tutarlar:"],
        table: {
          head: ["Ay", "Brüt maaş"],
          rows: [
            ["Ocak – Nisan", "49.709,72 ₺"],
            ["Mayıs", "51.291,07 ₺"],
            ["Haziran", "52.851,64 ₺"],
            ["Temmuz", "52.366,19 ₺"],
            ["Ağustos – Eylül", "50.763,97 ₺"],
            ["Ekim", "54.360,85 ₺"],
            ["Kasım – Aralık", "55.692,01 ₺"],
          ],
        },
        after: ["Yılın başında 49.709,72 ₺ olan brüt, Aralık’ta 55.692,01 ₺’ye çıkar. Temmuz ve Ağustos’taki düşüş, asgari ücret gelir vergisi istisnasının artmasından kaynaklanır."],
      },
      {
        heading: "Net anlaşma ile brüt anlaşmanın karşılaştırması",
        paragraphs: ["Aynı çalışanla Ocak ayındaki brüt karşılık olan 49.709,72 ₺ brüt üzerinden anlaşılsaydı, işveren maliyeti yıl boyunca sabit kalır ve çalışanın neti yılın ikinci yarısında düşerdi."],
        table: {
          head: ["", "Net anlaşma (40.000 ₺ net)", "Brüt anlaşma (49.709,72 ₺ brüt)"],
          rows: [
            ["Yıllık net", "480.000,00 ₺", "464.000,59 ₺"],
            ["Yıllık brüt", "622.620,60 ₺", "596.516,64 ₺"],
            ["Yıllık işveren maliyeti (teşvikli)", "739.361,94 ₺", "708.363,48 ₺"],
            ["Yıllık işveren maliyeti (teşviksiz)", "764.266,77 ₺", "732.224,16 ₺"],
          ],
        },
        after: [
          "Net anlaşma, teşvikli bir çalışanda işverene yıllık 30.998,46 ₺ ek maliyet getirir; çalışanın eline geçen ek tutar ise 15.999,41 ₺’dir. 20 kişilik net maaşlı bir kadroda fark yıllık 600 bin ₺’yi aşabilir.",
          "Bu, net anlaşmanın yanlış olduğu anlamına gelmez. Önemli olan farkın bütçeye baştan yazılması ve maaş teklifinin buna göre verilmesidir.",
        ],
      },
      {
        heading: "Net maaşlı çalışanlar bütçede nasıl planlanmalı?",
        paragraphs: ["Net maaşlı çalışanların maliyeti tek bir ayın brütü üzerinden değil, 12 aylık netten brüte hesap üzerinden planlanmalıdır."],
        bullets: [
          "Ocak ayının brütünü 12 ile çarpmak yıllık maliyeti eksik gösterir",
          "Maaş artışı yüksek olan çalışanlarda vergi dilimi daha erken aşılır, fark büyür",
          "Teşviksiz ve emekli çalışanlarda işveren prim oranı yüksek olduğu için fark artar",
          "Net ve brüt anlaşmalı çalışanlar aynı bütçe raporunda birlikte görülmelidir",
        ],
      },
      {
        heading: "Flodeska ile netten brüte bütçe",
        paragraphs: ["Flodeska Muhasebe modülünde netten brüte listesine eklenen çalışanlar için 12 aylık brüt ve işveren maliyeti otomatik hesaplanır. Bütçe raporu bu çalışanları brüt anlaşmalı çalışanlarla birleştirir ve aylık maliyetin Ocak’tan Aralık’a nasıl değiştiğini grafikle gösterir."],
      },
    ],
    faqs: [
      { q: "40.000 ₺ net maaşın 2026 brütü ne kadar?", a: "Flodeska’nın 2026 varsayılan parametreleriyle Ocak–Nisan döneminde 49.709,72 ₺’dir; vergi dilimi yükseldikçe Aralık’ta 55.692,01 ₺’ye çıkar." },
      { q: "Net maaş anlaşmasında vergi artışını kim öder?", a: "Çalışanın neti sabit kaldığı için gelir vergisindeki artışı brüt maaşı yükselterek işveren karşılar; bu da SGK primlerini de artırır." },
      { q: "Net anlaşma ile brüt anlaşma arasındaki maliyet farkı ne kadar?", a: "40.000 ₺ net örneğinde teşvikli çalışan için yıllık yaklaşık 31.000 ₺, teşviksiz çalışan için yaklaşık 32.000 ₺’dir." },
    ],
  },
  {
    slug: "asgari-ucretli-calisanin-isverene-maliyeti-2026",
    title: "Asgari ücretli bir çalışanın 2026 işveren maliyeti ne kadar?",
    description: "33.030 ₺ brüt asgari ücretin 2026 net tutarını, işveren SGK ve işsizlik primlerini, teşvikli ve teşviksiz aylık ve yıllık maliyetini kalem kalem hesaplıyoruz.",
    category: "Muhasebe", readingTime: "5 dk", publishedAt: "2026-11-24", relatedModule: MODULES.ACCOUNTING,
    sections: [
      {
        heading: "Asgari ücretin brüt ve net tutarı",
        paragraphs: [
          "Flodeska Muhasebe modülünde 2026 için varsayılan olarak tanımlı asgari ücret brüt 33.030 ₺’dir. Asgari ücret gelir vergisi ve damga vergisinden istisna olduğu için asgari ücretli çalışanın brütünden yalnız SGK ve işsizlik sigortası işçi payı düşülür.",
          "Asgari ücretin vergi istisnası yıl boyunca bu tutarı tamamen kapsadığı için net, yılın her ayında aynı kalır. Mevzuattaki rakamlar değiştiğinde parametrelerin güncellenmesi gerekir.",
        ],
        table: {
          caption: "33.030 ₺ brüt asgari ücretin aylık dökümü",
          head: ["Kalem", "Tutar"],
          rows: [
            ["Brüt maaş", "33.030,00 ₺"],
            ["SGK işçi payı (%14)", "4.624,20 ₺"],
            ["İşsizlik işçi payı (%1)", "330,30 ₺"],
            ["Gelir vergisi (istisna sonrası)", "0,00 ₺"],
            ["Damga vergisi (istisna sonrası)", "0,00 ₺"],
            ["Net maaş", "28.075,50 ₺"],
          ],
        },
      },
      {
        heading: "İşveren maliyeti: teşvikli ve teşviksiz",
        paragraphs: ["İşveren, brüt maaşın üzerine kendi SGK ve işsizlik payını öder. Flodeska’nın 2026 varsayılan oranlarında 5510 teşvikinden yararlanan işverende SGK işveren payı %16,75, teşviksiz işverende %20,75’tir."],
        table: {
          head: ["", "5510 teşvikli", "Teşviksiz"],
          rows: [
            ["Brüt maaş", "33.030,00 ₺", "33.030,00 ₺"],
            ["SGK işveren payı", "5.532,53 ₺", "6.853,73 ₺"],
            ["İşsizlik işveren payı (%2)", "660,60 ₺", "660,60 ₺"],
            ["Aylık işveren maliyeti", "39.223,13 ₺", "40.544,33 ₺"],
            ["Yıllık işveren maliyeti", "470.677,56 ₺", "486.531,96 ₺"],
          ],
        },
        after: ["Teşvikli ve teşviksiz durum arasındaki fark asgari ücretli tek bir çalışanda yıllık 15.854,40 ₺’dir. 20 asgari ücretli çalışanı olan bir işletme için bu fark yılda 317 bin ₺’yi aşar."],
      },
      {
        heading: "Asgari ücretin üzerindeki maaşlarda ne değişir?",
        paragraphs: [
          "Asgari ücret istisnası her çalışanın vergisinden düşülür, ama istisnanın üzerindeki kısım vergilendirilir. Bu nedenle asgari ücretin üzerindeki maaşlarda net, yılın ikinci yarısında azalır. Örneğin 40.000 ₺ brüt maaşın neti Ocak’ta 33.058,43 ₺ iken Aralık’ta 32.202,20 ₺’ye iner.",
          "İşveren maliyeti ise brüt sabit kaldığı sürece her ay aynıdır. 40.000 ₺ brüt maaşlı teşvikli bir çalışanın yıllık işveren maliyeti 570.000 ₺’dir.",
        ],
      },
      {
        heading: "Asgari ücretli kadronun bütçesini planlamak",
        paragraphs: ["Asgari ücret yılda bir veya iki kez güncellenebildiği için asgari ücretli kadrosu kalabalık işletmelerde bütçe en çok bu kalemde değişir. Yeni asgari ücret açıklandığında şu sorular hızla yanıtlanmalıdır:"],
        bullets: [
          "Asgari ücretli çalışan sayısı ve toplam yıllık işveren maliyeti ne kadar?",
          "Yeni tutarla yıllık maliyet ne kadar artıyor?",
          "Asgari ücretin hemen üzerindeki maaşlara da düzenleme yapılacak mı?",
          "Teşvik kapsamı dışında kalan çalışan var mı?",
        ],
        after: ["Flodeska Muhasebe modülünde bordro parametreleri firma bazında güncellenebilir. Yeni asgari ücret ve oranlar girildiğinde maaş listeleri ve bütçe raporu yeni değerlerle yeniden hesaplanır."],
      },
    ],
    faqs: [
      { q: "2026 asgari ücretin neti ne kadar?", a: "Flodeska’nın 2026 varsayılan parametrelerinde 33.030 ₺ brüt asgari ücretin neti 28.075,50 ₺’dir." },
      { q: "Asgari ücretli çalışanın işverene aylık maliyeti nedir?", a: "5510 teşvikli işverende 39.223,13 ₺, teşviksiz işverende 40.544,33 ₺’dir." },
      { q: "Asgari ücretten gelir vergisi kesilir mi?", a: "Hayır. Asgari ücret gelir vergisi ve damga vergisinden istisnadır; asgari ücretli çalışanın brütünden yalnız SGK ve işsizlik sigortası işçi payı düşülür." },
    ],
  },
  {
    slug: "brutten-nete-maas-hesaplama-ve-isveren-maliyeti",
    title: "Brütten nete maaş hesaplama ve işveren maliyeti: 2026 rehberi",
    description: "Brüt maaştan SGK, işsizlik, gelir ve damga vergisi kesintilerinin nasıl düşüldüğünü, kümülatif matrahın neti neden değiştirdiğini ve işverene toplam maliyeti örnekle anlatıyoruz.",
    category: "Muhasebe", readingTime: "9 dk", publishedAt: "2026-10-16", relatedModule: MODULES.ACCOUNTING,
    sections: [
      {
        heading: "Brüt, net ve işveren maliyeti arasındaki fark",
        paragraphs: [
          "İş ilanında ya da teklif mektubunda yazan rakamın brüt mü net mi olduğu, hem çalışan hem işveren için en sık karışan konudur. Brüt maaş, kesintiler yapılmadan önceki tutardır. Net maaş, çalışanın hesabına yatan tutardır. İşveren maliyeti ise brüt maaşın üzerine işverenin ödediği SGK ve işsizlik sigortası primleri eklenerek bulunur.",
          "Bu üç rakam arasındaki fark küçük değildir. Aşağıdaki örnekte 50.000 ₺ brüt maaş alan bir çalışan Ocak ayında 40.207,53 ₺ net alırken, işverene maliyeti 61.375 ₺ olur. Yani işverenin ödediği her 100 ₺’nin yaklaşık 65 ₺’si o ay çalışana net olarak geçer.",
        ],
      },
      {
        heading: "Brüt maaştan hangi kesintiler yapılır?",
        paragraphs: ["Türkiye’de bir çalışanın brüt maaşından her ay dört kalem düşülür. Oranlar 2026 için Flodeska’da varsayılan olarak tanımlı değerlerdir; mevzuat değiştiğinde güncellenmeleri gerekir."],
        bullets: [
          "SGK primi işçi payı: SGK matrahının %14’ü",
          "İşsizlik sigortası işçi payı: SGK matrahının %1’i",
          "Gelir vergisi: gelir vergisi matrahına (brüt eksi SGK ve işsizlik payı) kümülatif dilimlere göre uygulanır",
          "Damga vergisi: brüt maaşın binde 7,59’u",
        ],
        after: [
          "SGK matrahı alt ve üst sınırla çalışır. 2026 parametrelerinde taban 33.030 ₺, tavan 297.270 ₺’dir. Tavanın üzerindeki brüt maaş için SGK primi hesaplanmaz; bu nedenle yüksek maaşlarda kesinti oranı görece düşer.",
          "Asgari ücretin gelir vergisi ve damga vergisinden istisna olması, her çalışanın vergisinden asgari ücrete denk gelen kısmın düşülmesi anlamına gelir. 2026 değerleriyle bu istisna Ocak–Haziran için aylık 4.211,33 ₺ gelir vergisi ve 250,70 ₺ damga vergisidir. Asgari ücretin kendi birikimli matrahı dilim değiştirdikçe gelir vergisi istisnası Temmuz’da ve Ağustos’ta yükselir.",
        ],
      },
      {
        heading: "Gelir vergisi dilimleri ve kümülatif matrah",
        paragraphs: [
          "Gelir vergisi aylık maaşa değil, yılbaşından o aya kadar biriken matraha göre hesaplanır. Birikimli matrah bir dilim sınırını aştığında, aşan kısım bir üst oranla vergilendirilir. Bu yüzden maaşı yıl boyunca hiç değişmeyen bir çalışanın neti yılın ikinci yarısında düşer.",
        ],
        table: {
          caption: "2026 gelir vergisi dilimleri (ücret gelirleri, Flodeska varsayılan parametreleri)",
          head: ["Birikimli matrah", "Oran"],
          rows: [["0 – 190.000 ₺", "%15"], ["190.000 – 400.000 ₺", "%20"], ["400.000 – 1.500.000 ₺", "%27"], ["1.500.000 – 5.300.000 ₺", "%35"], ["5.300.000 ₺ üzeri", "%40"]],
        },
        after: ["Örneğimizdeki çalışanın aylık gelir vergisi matrahı 42.500 ₺’dir. Nisan sonunda birikimli matrah 170.000 ₺ olur; Mayıs’ta 212.500 ₺’ye çıkarak 190.000 ₺ sınırını geçer. Mayıs matrahının 22.500 ₺’lik kısmı %20 ile vergilendirildiği için o ayın neti 39.082,53 ₺’ye iner. Ekim’de 400.000 ₺ sınırı aşılır ve oran %27’ye çıkar."],
      },
      {
        heading: "Örnek: 50.000 ₺ brüt maaşın aylık dökümü",
        paragraphs: ["Teşviksiz bir çalışan için 2026 parametreleriyle Flodeska Muhasebe modülünde hesaplanan sonuçlar:"],
        table: {
          head: ["Ay", "SGK + işsizlik", "Gelir vergisi", "Damga vergisi", "Net"],
          rows: [
            ["Ocak – Nisan", "7.500,00 ₺", "2.163,67 ₺", "128,80 ₺", "40.207,53 ₺"],
            ["Mayıs", "7.500,00 ₺", "3.288,67 ₺", "128,80 ₺", "39.082,53 ₺"],
            ["Haziran", "7.500,00 ₺", "4.288,67 ₺", "128,80 ₺", "38.082,53 ₺"],
            ["Temmuz", "7.500,00 ₺", "3.962,25 ₺", "128,80 ₺", "38.408,95 ₺"],
            ["Ağustos – Eylül", "7.500,00 ₺", "2.884,90 ₺", "128,80 ₺", "39.486,30 ₺"],
            ["Ekim", "7.500,00 ₺", "4.634,90 ₺", "128,80 ₺", "37.736,30 ₺"],
            ["Kasım – Aralık", "7.500,00 ₺", "5.859,90 ₺", "128,80 ₺", "36.511,30 ₺"],
          ],
        },
        after: [
          "Yıllık toplamda çalışan 600.000 ₺ brüt karşılığında 466.135,63 ₺ net alır. Temmuz ve Ağustos’taki iyileşme, asgari ücret gelir vergisi istisnasının artmasından kaynaklanır.",
          "Ocak’taki gelir vergisinin nasıl bulunduğu: 42.500 ₺ matrahın %15’i 6.375 ₺ eder; bundan 4.211,33 ₺ asgari ücret istisnası düşülünce 2.163,67 ₺ kalır. Damga vergisi 50.000 ₺’nin binde 7,59’u olan 379,50 ₺’den 250,70 ₺ istisna düşülerek 128,80 ₺ olur.",
        ],
      },
      {
        heading: "İşveren maliyeti nasıl hesaplanır?",
        paragraphs: ["İşveren, brüt maaşın üzerine kendi SGK ve işsizlik payını öder. Oranlar çalışanın durumuna göre değişir:"],
        table: {
          head: ["Çalışan tipi", "İşveren SGK", "İşveren işsizlik", "50.000 ₺ brüt için aylık maliyet"],
          rows: [["5510 teşvikli", "%16,75", "%2", "59.375 ₺"], ["Teşviksiz", "%20,75", "%2", "61.375 ₺"], ["Emekli (SGDP)", "%24,5", "—", "62.250 ₺"]],
        },
        after: [
          "Teşvikli ve teşviksiz çalışan arasındaki fark tek kişide aylık 2.000 ₺, yıllık 24.000 ₺’dir. 30 kişilik bir kadroda bu fark yıllık 720.000 ₺’ye ulaşır. Teşvik şartlarının takibi bu yüzden bütçe açısından önemlidir.",
          "İşveren maliyeti ay ay değişmez; değişen, bu maliyetin içinden çalışana net olarak geçen paydır. Gelir vergisi yükseldikçe aynı maliyetle çalışana daha az net ulaşır.",
        ],
      },
      {
        heading: "Netten brüte hesap ne zaman gerekir?",
        paragraphs: [
          "Çalışanla net maaş üzerinden anlaşıldığında, bordroda gösterilecek brüt tutarın bulunması gerekir. Netin her ay sabit kalması isteniyorsa, vergi dilimi yükseldiğinde brüt maaşın da artması gerekir; bu da işveren maliyetini yılın ikinci yarısında yükseltir.",
          "Flodeska’da netten brüte hesap, brütten nete hesabın tersidir: bulunan brüt tutar tekrar nete çevrildiğinde başlangıçtaki neti verir. Bu tutarlılık, teklif hazırlarken iki yönde de aynı rakamlara güvenebilmenizi sağlar.",
        ],
      },
      {
        heading: "Personel bütçesini planlarken nelere bakmalı?",
        paragraphs: ["Tek bir maaşı hesaplamak kolaydır; zor olan, tüm kadronun yıllık maliyetini görmek ve senaryo denemektir. Bütçe planlarken şu soruların cevabı hazır olmalıdır:"],
        bullets: [
          "Yıllık toplam işveren maliyeti ne kadar ve kişi başı aylık ortalama nedir?",
          "Maliyetin ne kadarı departman, pozisyon veya yaka bazında nereye gidiyor?",
          "Planlanan bir zam yıllık maliyeti ne kadar artırır, belirlenen bütçe limiti aşılıyor mu?",
          "Hangi personelin maliyeti ortalamanın belirgin üzerinde?",
        ],
        after: ["Flodeska Muhasebe modülünün bütçe raporu, maaş listelerinizden bu soruların cevabını otomatik üretir: maliyet anatomisi, departman payları, aylık özet ve zam senaryosu tek ekranda görünür."],
      },
    ],
    faqs: [
      { q: "Brüt maaştan net maaşa geçerken toplam kesinti oranı nedir?", a: "Sabit bir oran yoktur. SGK ve işsizlik payı %15’tir; gelir vergisi ise birikimli matraha ve asgari ücret istisnasına göre değişir. 50.000 ₺ brüt maaşta Ocak ayında toplam kesinti yaklaşık %19,6, Aralık’ta yaklaşık %27’dir." },
      { q: "Maaşım değişmediği halde netim neden azaldı?", a: "Gelir vergisi yılbaşından itibaren biriken matraha göre hesaplanır. Birikimli matrah bir dilim sınırını aştığında aşan kısım daha yüksek oranla vergilenir ve net düşer." },
      { q: "İşveren maliyeti brüt maaşın kaç katıdır?", a: "SGK tavanına kadar teşviksiz bir çalışanda brüt maaşın yaklaşık 1,23 katı, 5510 teşvikli çalışanda yaklaşık 1,19 katıdır." },
    ],
  },
  {
    slug: "rfid-personel-takip-sistemi-nedir",
    title: "RFID personel takip sistemi nedir, nasıl çalışır?",
    description: "RFID kart, okuyucu cihaz ve web panelinin personel giriş-çıkış süreçlerinde nasıl birlikte çalıştığını inceleyin.",
    category: "İK Teknolojileri", readingTime: "6 dk", publishedAt: "2026-10-04", relatedModule: MODULES.HR,
    sections: [
      { heading: "RFID personel takibinin temeli", paragraphs: ["RFID personel takip sistemi, çalışana tanımlanan kart ile sahadaki okuyucu cihaz arasında kurulan temassız iletişimi kullanır. Okutulan kartın kimliği, saat bilgisi ve cihaz noktası merkezi yazılıma iletilir.", "Bu yapı yalnızca bir kart basma çözümü değildir. Doğru kurgulandığında giriş, çıkış, mola, izin ve çalışma takvimi verilerini aynı operasyon kaydında bir araya getirir."] },
      { heading: "Sistem hangi bileşenlerden oluşur?", paragraphs: ["Sağlıklı bir kurulumun cihaz, bağlantı ve yönetim paneli olmak üzere üç temel katmanı vardır."], bullets: ["Personele tanımlanan RFID kartlar", "İş yerine yerleştirilen bağlantılı okuyucu cihaz", "Yetkili kullanıcıların eriştiği web yönetim paneli", "Raporlama ve hareket kontrol kuralları"] },
      { heading: "İşletmeye sağladığı görünürlük", paragraphs: ["Manuel listeler yerine zaman damgalı hareketler kullanıldığında gecikme, mola ve eksik hareket kontrolleri daha hızlı yapılır. Şube ve departman bazlı görünüm de yöneticinin yalnızca sorumlu olduğu alanı izlemesini sağlar."] },
    ],
  },
  {
    slug: "pdks-seciminde-dikkat-edilmesi-gerekenler",
    title: "PDKS seçerken dikkat edilmesi gereken 7 konu",
    description: "Cihaz bağlantısından yetkilendirmeye, hareket kontrolünden raporlamaya kadar PDKS değerlendirme kontrol listesi.",
    category: "Operasyon", readingTime: "7 dk", publishedAt: "2026-10-04", relatedModule: MODULES.HR,
    sections: [
      { heading: "İhtiyacı cihazdan önce tanımlayın", paragraphs: ["PDKS seçimi yalnızca hangi kart okuyucunun kullanılacağıyla başlamamalıdır. Önce çalışma takvimi, mola kuralları, şube yapısı ve rapor sorumluları netleştirilmelidir."] },
      { heading: "Kontrol listesi", paragraphs: ["Karar verirken günlük kullanım kadar olağan dışı durumları da değerlendirin."], bullets: ["İnternet kesintisinde kayıtların korunması", "Cihaz sağlık ve son bağlantı bilgisinin izlenmesi", "Firma, şube ve departman bazlı yetki", "Eksik veya eşleşmeyen hareketlerin işaretlenmesi", "Manuel düzeltmeler için audit kaydı", "Puantaj onayı ve dönem kilitleme", "Excel ve PDF dışa aktarım seçenekleri"] },
      { heading: "Sürdürülebilir bir yapı kurun", paragraphs: ["Bugünkü personel sayısına uyan bir çözümün yeni şube, yeni vardiya ve farklı modüller geldiğinde de yönetilebilir kalması gerekir. Modüler mimari ve açık veri akışı bu nedenle önemlidir."] },
    ],
  },
  {
    slug: "is-sureclerinde-iot-ve-dijitallesme",
    title: "İş süreçlerinde IoT verisini anlamlı hale getirmek",
    description: "Bağlı cihaz verisinin yalnızca toplanması değil, doğru iş kuralına ve yönetilebilir bir sürece dönüştürülmesi gerekir.",
    category: "Dijital Dönüşüm", readingTime: "5 dk", publishedAt: "2026-10-04", relatedModule: MODULES.HR,
    sections: [
      { heading: "Cihaz verisi tek başına sonuç değildir", paragraphs: ["IoT projelerinde sensörden veya okuyucudan veri almak ilk adımdır. İşletme için değer, bu verinin doğru kişi, zaman, lokasyon ve süreç kuralıyla eşleştirilmesiyle oluşur."] },
      { heading: "Sahadan karara uzanan akış", paragraphs: ["Başarılı bir akış; cihazın sağlık durumunu izler, veriyi doğrular, istisnaları ayırır ve kullanıcıya eyleme dönüşebilecek bir özet sunar."], bullets: ["Bağlantı ve cihaz kimliğini doğrulama", "Gelen veriyi iş kuralına göre sınıflandırma", "Tutarsız kayıtları otomatik tahmin etmeden işaretleme", "Yetkili kullanıcıya anlaşılır bir kontrol ekranı sunma"] },
      { heading: "Flodeska’nın yaklaşımı", paragraphs: ["Flodeska, bağlı cihazları tek başına bir donanım projesi olarak değil, işletmenin dijital süreç katmanının parçası olarak ele alır. Amaç daha fazla veri toplamak değil, daha iyi yönetilen bir akış kurmaktır."] },
    ],
  },
];

export function getBlogPost(slug: string) { return blogPosts.find((post) => post.slug === slug); }
