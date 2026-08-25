# Page Agent

Bu proje icindeki yeni dashboard sayfalari ve revize edilecek liste ekranlari asagidaki sayfa standardini korur.

- Liste ekraninin ust bolumunde sayfa basligi, kisa aciklama, arama formu ve sagda `Ekle` butonu bulunur.
- Veriler kart listesi yerine grid/tablo yapisinda listelenir.
- Her liste satirinda `Incele` aksiyonu bulunur.
- Yeni kayit formu liste altinda yer almaz; `new` sayfasinda acilir.
- Kayit duzenleme liste icinde inline yapilmaz; kaydin detay sayfasinda yapilir.
- Her liste ekraninda arama textboxu bulunur ve arama mevcut sayfa query parametresi `q` ile calisir.
- Ekleme ve duzenleme formlarinda server action kullanilir, basarili islemden sonra guvenli `returnTo` ile ilgili liste/detay sayfasina donulur.
- Mevcut sade panel gorsel dili korunur: `heroCard`, `sectionCard`, `searchForm`, `tableWrap`, `table`, `primaryLinkButton`, `inlineAction`.
- Mobil ve tablet gorunumunde tablo yatay kayabilir, toolbar ve formlar tek kolona iner.
