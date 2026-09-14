# RFID proje kutusu V3

Montajlı dış ölçü **150 × 110 × 55 mm**. Gövde 52 mm, kapak yüzeyi 3 mm; kapak ayakları kutunun içine girer. Tüm STL dosyaları **mm** birimindedir, %100 ölçekte dilimlenmelidir. V3 gövde ve V3 kapağı birlikte kullanın.

V3 düzeltmeleri: iki LED ve buzzer kapağa taşındı; gövdenin ön yüzündeki delikler kapatıldı. ESP32 merkezi (30,55), plaket merkezi (105,70) mm olarak değiştirildi. Micro USB açıklığı yeni ESP32 konumuna taşındı. Küçük ayaklar arası en az 16,8 mm; ana sütunlarla ESP32 ayakları arası en az 27,115 mm, plaket ayakları arası 10,987 mm yüzeyden yüzeye boşluk var. Taban üstündeki sekiz küçük ayak ayrı ayrı kontrol edildi; hiçbiri diğer ayakla veya ana sütunla birleşmez. Kartların kendi delik aralıkları korunmuştur.

## Parçalar

| Dosya | Adet | Kullanım |
|---|---:|---|
| govde_v3.stl | 1 | ESP32 ve plaket için dörder ayrı vida ayağı; güç jakı yuvası ve Micro USB erişimi |
| kapak_v3.stl | 1 | LCD ve RC522 için dörder vida ayağı; iki LED ve buzzer için sıkıştırma yuvaları |
| guc_jaki_baski_parcasi.stl | 1 | Güç jakını üstten kapatan iki vidalı tutucu |
| sikilik_testi.stl | İsteğe bağlı 1 | LED ve buzzer için baskı toleransı testi |

## Esas alınan modüller

| Bileşen | Kullanılan ölçüler / yaklaşım |
|---|---|
| 1602 LCD | Winstar WH1602B tipi 80 × 36 mm PCB, 75 × 31 mm vida merkezleri; pencere 71,6 × 24,6 mm. PCB kapak içinden 7,5 mm uzakta. |
| RC522 | Joy-IT SBC-RFID-RC522 çizimi, 61,25 × 40 mm PCB; dört delik iki sırada, sıralar arası 37,39 mm, sıra enleri 34 ve 24,91 mm. Alt sıra kart kenarından 7,61 mm. Kart yatay çevrilmiştir. |
| ESP32 | 30 pinli DOIT DevKit V1, 51,8 × 28,2 mm PCB. Delik düzeni 43,9 × 23,8 mm. Enine ölçü, fiziksel ölçüm kaynağındaki 2,8 mm delik ve kenara 0,8 mm boşluktan hesaplanmıştır: 28,2 − 2 × (1,4 + 0,8). Kaynak üretici mekanik çizimi değildir; klonlar farklı olabilir. |
| Delikli plaket | 50 × 50 mm, 18 × 18 delik ve 2,54 mm adım esas alındı. İlk ve son delik merkezleri 17 × 2,54 = 43,18 mm. Dört köşe grid deliği M3 geçişi için 3,2 mm'ye genişletilir. Bu işlem boş veya köşelerinde devre bulunmayan plakette yapılır. |
| Güç jakı | Görsele benzeyen KLS DC-005A-2.5 modeli: gövde 14,4 mm uzunluk × 9 mm en × 11 mm yükseklik. Fotoğraftan kesin model teşhisi yapılamaz. |
| LED | 5 mm yuvarlak, örnek paket Kingbright WP7113; 4,9 mm yarıklı sıkıştırma bileziği ve 5,2 mm dış delik. |
| Buzzer | Kullanıcının verdiği 11 mm çap; SainSmart dokümanındaki 9 mm yüksek aktif buzzer esas alındı. Yuva arkası açıktır, sıkıştırma çapı 10,85 mm. |

**Bütün modüller için tek bir evrensel standart yoktur.** Kullanıcının isteğiyle yukarıdaki kaynak varyantları seçildi. Fiziksel baskı ve kullanıcının parçalarıyla montaj denenmedi. Kaynak dosyası `olculer.json` içindeki boyutlar değiştirilebilir; ardından `uret.py` çalıştırılarak STL'ler yeniden üretilir. RC522'nin dört delik koordinatı `hole_offsets` içindedir; `holes` alanı bu kart için yalnızca çizim açıklamasıdır.

## Yerleşim ve montaj

1. **ESP32:** Gövdenin sol orta bölümündeki dört ayağa takılır. Micro USB konektörü sol duvara bakar; 16 × 12 mm servis açıklığı USB kablosu içindir. Açıklık merkezi Y=55 mm'dir. Kart PCB altı tabandan 10 mm yüksektedir. Kapak açıkken BOOT/EN düğmelerine erişilir.
2. **Plaket:** Sağ bölümde merkeze yaklaştırılan dört M3 vida ayağına sabitlenir. PCB merkezi (105,70) mm; kenarları X=80..130, Y=45..95 mm'dir. Lehim yüzeyi altında 7 mm boşluk vardır. Ayak çevresinde iletken yolları vida başına temas ettirmeyin; gerekirse yalıtkan pul kullanın.
3. **LED'ler:** Kapağın iç yüzündeki iki küçük yarıklı yuvaya takılır. Kubbeler kapaktan dışarı, bacaklar kutuya bakar. Yarıklı bilezik LED gövdesini sıkar; taban flanşı içeride kalır.
4. **Buzzer:** Kapağın iç yüzündeki büyük yarıklı yuvaya bastırılır. Ses veren yüz kapaktaki beş delikli ızgaraya, bacaklar kutuya bakar. Yuva duvarı esneyerek tutar.
5. **Güç jakı:** Sağ duvardaki yuvaya üstten yerleştirilir. Ağız dışa, lehim bacakları aşağı bakar. Altında 6 mm bacak/kablo boşluğu, yan terminal için kanal vardır. Ön duvardaki 1 mm omuz jakın dışarı çekilmesini, arka dayama içeri itilmesini sınırlar. Küçük baskı parçası üstten iki M2.5 vida ile kapatılır. Plastik üzerindeki 0,2 mm dikey pay gevşeklik bırakırsa ince yalıtkan bant şimiyle alınabilir; elektrik terminallerine baskı uygulamayın.
6. **LCD:** Ekran dışa bakacak şekilde kapağın arkasındaki dört ayağa vidalanır. I2C adaptörü ve kablolar içeride kalır.
7. **RC522:** Dört delikten kısa M2.5 vidalarla kapağa sabitlenir. Anten yüzü kapağa bakar. Anten önünde 1,4 mm plastik bırakılmıştır. Kartın montaj düzlemi ile ince panel arasında yaklaşık 4,6 mm vardır. Mümkünse plastik vidalar kullanın; montaj sonrası okuma mesafesini deneyin.
8. Kapak dört köşe vidasıyla kapatılır. Kapak kablolarına açılıp kapanmayı sağlayacak pay bırakın.

Vida başlangıç listesi: kapak için 4 × M3×12 havşa başlı; plaket için 4 × M3×6; ESP32 ve LCD için toplam 8 × M2.5×6; RC522 için 4 × M2.5×4; jak tutucusu için 2 × M2.5×8. Boylar yaklaşık 1,6 mm PCB ve pulsuz montaja göredir. Kısa vida tercih edin; vida kör deliğin tabanına dayanmamalıdır. M2.5 ayaklarında 2,2 mm, M3 ayaklarında 2,7 mm pilot delikler vardır; delikler basılı diş içermez. Uygun kılavuzla diş açın veya plastik için uygun vida kullanın.

## Baskı

- Gövde: tabanı tabla üzerinde, açık yüzü yukarı.
- Kapak: dış yüzü tabla üzerinde, LCD/RC522 ayakları ve LED/buzzer yuvaları yukarı. Dosya zaten bu yöndedir. Montajda kapağı X ekseni etrafında 180° çevirin: STL iç görünümündeki Y konumları gövdeye göre ters görünür. Bu işlemle bileşenler plandaki montaj konumlarına gelir.
- Jak baskı parçası: geniş düz yüz tabla üzerinde, küçük baskı çıkıntısı yukarı.
- Başlangıç ayarı: 0,4 mm nozül, 0,2 mm katman, 4 duvar, %20–25 dolgu. Malzeme profilini yazıcınıza göre seçin. Esneyen yuvalar için PETG tercih edilebilir.
- Gövdedeki jak kanalları ve USB açıklığı için **yerel destek gerekebilir**. Dilimleyicide destekleri inceleyin. Kapaktaki LED/buzzer yuvaları dik basılır; küçük sıkıştırma yarıklarını destekle doldurmayın. Destekleri parçaları takmadan önce temizleyin.
- Kapak ve jak baskı parçası önerilen yönde destek gerektirmeyecek şekilde tasarlanmıştır.
- Önce `sikilik_testi.stl` basılabilir: soldan sağa LED çapları 4,8 / 4,9 / 5,0 mm; buzzer çapları 10,85 / 11,05 mm. Test parçasını düz yüzü altta kullanın. Zorlayarak takmayın; gerekirse çapı kaynak dosyasında değiştirin.

## Kontroller ve sınırlar

STL'ler dışa aktarıldıktan sonra yeniden okunarak kapalı yüzey, tutarlı yüz yönü, pozitif hacim ve tek bağlı parça kontrollerinden geçirilmiştir. Gövde-kapak-jak tutucusu çakışmaları ve seçilen jak gövdesinin yuvaya oturması geometrik olarak kontrol edilmiştir. Örnek PCB/bileşen hacimleri birbirleriyle çakışmaz; bu kontrol gerçek kablo, lehim, tüm konektör ve her komponent ayrıntısını kapsamaz. Kutu dilimlenmedi veya fiziksel olarak basılmadı. Su/toz koruma sınıfı yoktur.

## Kaynaklar

- LCD: [Winstar WH1602B ürün sayfası](https://www.winstar.com.tw/products/lcd-display/character-lcd-display-module/lcd-display-16x2.html) ve [üretici ölçü çizimi](https://www.winstar.com.tw/uploads/files/7d640ef3cbbd07cb31ae8168e217d266.pdf).
- RC522: [Joy-IT ürün sayfası](https://joy-it.net/en/products/SBC-RFID-RC522), [Simac/Joy-IT mekanik çizimi](https://asset.conrad.com/media10/add/160267/c1/-/gl/001503746IN01/informacije-1503746-joy-it-sbc-rfid-rc522-rfid-komplet-1-kos.pdf).
- ESP32: [Fritzing topluluğunda kartın fiziksel ölçümü](https://forum.fritzing.org/t/doit-esp32-devkit-v1/6158/9). 23,8 mm enine vida aralığı kaynaktan yapılan hesaplamadır.
- Güç jakı: [KLS DC-005A-2.5-5A üretici teknik çizimi, Özdisan](https://img.ozdisan.com/ETicaret_Dosya/634768_165145.pdf).
- LED: [Kingbright delikli montaj LED katalog çizimleri](https://www.kingbrightusa.com/webimages/catalog/Through-HoleLED-P17-27.pdf).
- Buzzer: [SainSmart eğitim dokümanı](https://images-na.ssl-images-amazon.com/images/I/B1kzlYSfD4S.pdf); 11 mm çaplı aktif tip için 9 mm yükseklik açıklaması.
- Plaket: [Direnc.net 5×5 ürününde satıcının 18×18 delik açıklaması](https://www.direnc.net/5x5-delikli-plaket), [2,54 mm adımlı 5×5 plaket örneği](https://temperosystems.com.au/products/5-x-5cm-2-54-pitch-double-sided-universal-board/). 43,18 mm montaj aralığı tasarım hesabıdır; ayrı bir montaj standardı değildir.

Kaynaklar 10 Eylül 2026 tarihinde kontrol edildi.
