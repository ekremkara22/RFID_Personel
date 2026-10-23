# Instagram: ilk 9 gönderi

Görseller `gonderi-1.png` … `gonderi-9.png` dosyalarındadır. Kaynak `gonderiler.html`; tarayıcıda açınca 9 gönderi yan yana görünür, `?p=N` yalnız N. gönderiyi gerçek boyutunda gösterir.

PNG'leri yeniden üretmek (Git Bash, bu klasörde):

```bash
for spec in 1:1080 2:1920 3:1350 4:1350 5:1350 6:1350 7:1920 8:1350 9:1350; do n=${spec%%:*}; h=${spec##*:}; "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=4000 --window-size=1080,$h --screenshot="$(cygpath -w "$PWD")\\gonderi-$n.png" "file:///$(cygpath -m "$PWD")/gonderiler.html?p=$n"; done
```

Maaş rakamları `src/lib/salary-calculation.ts` (2026 parametreleri) ile hesaplandı. Parametre değişirse 4, 5 ve 6 numaralı gönderiler yeniden hesaplanmalıdır.

Paylaşım sırası 1 → 9'dur. Instagram'da en yeni gönderi sol üstte göründüğü için 9 numara ızgaranın başına gelir. Haftada 3 gönderi ile yaklaşık 3 hafta sürer.

---

## 1 · Tanışma (kare, 1080×1080)

Merhaba, biz Flodeska 👋

Küçük işletmelerin iki temel işini kolaylaştırıyoruz:

🟦 İK & RFID: Personel kartını okutur, giriş-çıkış ve mola panele düşer. İzin, çalışma takvimi ve aylık puantaj aynı kayıtla yürür.
🟩 Muhasebe: Brütten nete, netten brüte maaş ve yıllık personel bütçesi.

Her modül ayrı lisanslanır; ihtiyacınız olanla başlarsınız.
14 gün ücretsiz deneyin 👉 flodeska.com (bağlantı profilde)

#flodeska #kobi #insankaynaklari #pdks #personeltakip #maashesaplama #bordro #girisimcilik

## 2 · Reels: Kartı okut (dikey, 1080×1920)

Kartı okut, giriş panele düşsün. ✅

1️⃣ Personel kartını cihaza okutur
2️⃣ Hareket anında panelde görünür
3️⃣ Ay sonunda puantaj hazırdır

Kâğıt yok, elle toplama yok.
14 gün ücretsiz deneyin 👉 flodeska.com

#rfid #pdks #personeltakip #girişçıkış #puantaj #kobi #flodeska

> Reels videosu için kapak görselidir. Videoda: cihaza kart okutma çekimi (gerçek cihaz) + panelde hareket listesinin ekran kaydı.

## 3 · Kâğıt puantajın 4 gizli maliyeti (4:5)

Kâğıt puantaj ücretsiz görünür ama değildir. 👇

1. Ay sonunda saatler toplama ve kontrol ile geçer
2. Geç kalmalar gözden kaçar
3. Uzayan molalar fark edilmez
4. Bir anlaşmazlık olduğunda elde kayıt yoktur

Flodeska'da her hareket, kart okutulduğu anda kayda geçer.
Siz hangisini yaşıyorsunuz? Yorumlara yazın 👇

#kobi #işletmeyönetimi #insankaynaklari #puantaj #pdks #flodeska

## 4 · Asgari ücretin işverene yıllık maliyeti (4:5)

2026'da asgari ücretli bir çalışanın işverene yıllık maliyeti ne kadar? 🧮

▫️ Aylık brüt: 33.030 TL
▫️ Çalışanın eline geçen: 28.075,50 TL
▫️ İşverene 12 aylık maliyet: 470.677,56 TL (5 puanlık SGK teşviki ile)
▫️ Teşviksiz: 486.531,96 TL

Kendi rakamlarınızı Flodeska Maaş Hesaplama ile 12 aylık dökümüyle görün 👉 flodeska.com

Bu yazı bilgilendirme amaçlıdır; bordronuz için mali müşavirinize danışın.

#asgariücret #asgariücret2026 #maashesaplama #bordro #sgk #işverenmaliyeti #muhasebe #kobi #flodeska

## 5 · Net 40.000 TL'nin işverene maliyeti (4:5)

Çalışanınıza net 40.000 TL ödüyorsanız, işverene yıllık maliyeti ne olur? 💰

▫️ Aylık net (12 ay sabit): 40.000 TL
▫️ Yıllık toplam brüt: 622.620,60 TL
▫️ İşverene yıllık maliyet: 739.361,94 TL (5 puanlık SGK teşviki ile)
▫️ Aylık ortalama: 61.613,50 TL
▫️ Teşviksiz yıllık maliyet: 764.266,77 TL

Ekibinizin yıllık personel bütçesini departman bazında çıkarın 👉 flodeska.com

Bu yazı bilgilendirme amaçlıdır; bordronuz için mali müşavirinize danışın.

#netmaaş #brütmaaş #nettenbrüte #maashesaplama #bordro #personelbütçesi #muhasebe #flodeska

## 6 · Net maaş aynı, brüt neden artıyor? (4:5)

Net maaş her ay aynı, ama bordroda brüt neden yükseliyor? 🤔

Gelir vergisi kümülatif hesaplanır. Yıl ilerledikçe vergi matrahı birikir ve üst dilime geçer. Asgari ücret istisnası da aya göre değişir. Aynı neti verebilmek için brüt her ay yeniden hesaplanır.

Örnek (net 40.000 TL):
▫️ Ocak brüt: 49.709,72 TL
▫️ Aralık brüt: 55.692,02 TL

Flodeska Maaş Hesaplama 12 ayın tamamını tek tabloda gösterir 👉 flodeska.com

#bordro #gelirvergisi #vergidilimi #maashesaplama #nettenbrüte #muhasebe #flodeska

## 7 · Reels: Kim geç kaldı? (dikey, 1080×1920)

Kim geç kaldı, kim molayı uzattı? Her sabah tek ekranda. 📊

✅ Günlük geç kalma raporu
✅ Mola limitini aşan personel
✅ Excel ve PDF'e aktarım

Görseldeki veriler örnektir.
14 gün ücretsiz deneyin 👉 flodeska.com

#pdks #geçkalma #personeltakip #insankaynaklari #ikraporları #kobi #flodeska

> Reels kapağıdır. Videoda: Operasyon Özeti ekranının kısa bir kaydı (örnek veriyle) ve geç kalma raporunun Excel'e aktarılması.

## 8 · Cihaz kapınıza gelir (4:5)

Yazılım ve cihaz tek yerden. 📦

1️⃣ RFID okuyucu ve kartları Shopier güvenli ödeme ile sipariş edin
2️⃣ Cihaz hesabınıza tanımlı olarak kargoyla gelir
3️⃣ Wi-Fi'ye bağlayın; okutulan kartlar panele düşer, cihazın bağlantı durumunu panelden görürsünüz

Sipariş için 👉 flodeska.com

#rfid #kartlıgeçiş #pdkscihazı #personeltakip #kobi #flodeska

> Cihaz Shopier'de ürün olarak yayınlanmadan paylaşmayın. Mümkünse yanına gerçek cihazın fotoğrafıyla ikinci bir görsel ekleyin.

## 9 · İhtiyacınız olanı alın (4:5)

Her modül ayrı lisanslanır; yıllık lisansla ihtiyacınız olanı alın, gerisini sonra ekleyin. 🧩

🟦 İK & RFID Personel Takip: Kartla giriş-çıkış ve mola, izin ve puantaj onayı, geç kalma ve departman raporları
🟩 Muhasebe: Maaş ve Bütçe: Brütten nete / netten brüte, güncel 2026 parametreleri, yıllık bütçe raporu

Satın almadan önce 14 gün ücretsiz deneyin 👉 flodeska.com

#flodeska #kobi #insankaynaklari #muhasebe #pdks #maashesaplama #dijitaldönüşüm
