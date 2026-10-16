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
