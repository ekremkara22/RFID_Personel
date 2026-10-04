export type BlogSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type BlogPost = { slug: string; title: string; description: string; category: string; readingTime: string; publishedAt: string; sections: BlogSection[] };

export const blogPosts: BlogPost[] = [
  {
    slug: "rfid-personel-takip-sistemi-nedir",
    title: "RFID personel takip sistemi nedir, nasıl çalışır?",
    description: "RFID kart, okuyucu cihaz ve web panelinin personel giriş-çıkış süreçlerinde nasıl birlikte çalıştığını inceleyin.",
    category: "İK Teknolojileri", readingTime: "6 dk", publishedAt: "2026-10-04",
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
    category: "Operasyon", readingTime: "7 dk", publishedAt: "2026-10-04",
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
    category: "Dijital Dönüşüm", readingTime: "5 dk", publishedAt: "2026-10-04",
    sections: [
      { heading: "Cihaz verisi tek başına sonuç değildir", paragraphs: ["IoT projelerinde sensörden veya okuyucudan veri almak ilk adımdır. İşletme için değer, bu verinin doğru kişi, zaman, lokasyon ve süreç kuralıyla eşleştirilmesiyle oluşur."] },
      { heading: "Sahadan karara uzanan akış", paragraphs: ["Başarılı bir akış; cihazın sağlık durumunu izler, veriyi doğrular, istisnaları ayırır ve kullanıcıya eyleme dönüşebilecek bir özet sunar."], bullets: ["Bağlantı ve cihaz kimliğini doğrulama", "Gelen veriyi iş kuralına göre sınıflandırma", "Tutarsız kayıtları otomatik tahmin etmeden işaretleme", "Yetkili kullanıcıya anlaşılır bir kontrol ekranı sunma"] },
      { heading: "Flodeska’nın yaklaşımı", paragraphs: ["Flodeska, bağlı cihazları tek başına bir donanım projesi olarak değil, işletmenin dijital süreç katmanının parçası olarak ele alır. Amaç daha fazla veri toplamak değil, daha iyi yönetilen bir akış kurmaktır."] },
    ],
  },
];

export function getBlogPost(slug: string) { return blogPosts.find((post) => post.slug === slug); }
