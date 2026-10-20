<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:product-ui-rules -->
# Yönetim paneli görsel standardı

Bu proje veri girişi, listeleme ve inceleme ağırlıklı bir PDKS yönetim panelidir. Yeni sayfa oluştururken veya mevcut bir sayfayı yenilerken aşağıdaki kuralları varsayılan kabul et:

- Görsel dil modern, sade, açık renkli ve profesyonel olmalı; dekoratif gradyan, yoğun gölge, cam efekti ve gereksiz büyük başlıklardan kaçın.
- Sayfa hiyerarşisi her zaman aynı sırayı izlemeli: kompakt sayfa başlığı ve açıklama, sağda birincil işlemler, ardından filtreler/özet ve ana veri alanı.
- Masaüstünde içerik yatay taşmamalı. Tabloda çok sayıda ham sütun göstermek yerine ilişkili alanları anlamlı hücrelerde grupla; zorunlu taşma varsa yalnız tablo kendi içinde yatay kaydırılmalı.
- Başlıklar, etiketler ve gövde metni için tutarlı ölçek kullan: sayfa başlığı yaklaşık 24-28px, bölüm başlığı 16-18px, gövde 14px, yardımcı metin 12-13px. Tamamı büyük harfi yalnız kısa üst etiketlerde kullan.
- Satır yüksekliği ve boşluklar ferah ama kompakt olmalı. Form kontrolleri yaklaşık 40px, tablo satırları yaklaşık 56-64px olmalı; metinler birbirine girmemeli.
- Bir sayfada yalnız bir baskın birincil buton kullan. İkincil işlemleri nötr butonlarla grupla; tehlikeli işlemler dışında yoğun renk kullanma.
- Filtreler masaüstünde tek ve dengeli bir araç çubuğunda, dar ekranlarda düzenli alt satırlarda yer almalı. Salt okunur değerleri form alanı gibi göstermek yerine bağlam etiketi olarak sun.
- Durum, rol ve kapsam gibi bilgileri kısa, okunabilir rozetler veya ikincil metinlerle göster; kod değerlerini kullanıcıya doğrudan gösterme.
- Boş durum, yüklenme, hata ve yetki reddi ekranları aynı görsel dilde ve anlaşılır Türkçe metinlerle hazırlanmalı.
- Mobil erişilebilirlik zorunludur: dokunma hedefleri en az 40px, görünür odak stili, yeterli kontrast ve anlamlı erişilebilir adlar kullanılmalı.
- Ortak tasarım desenlerini sayfaya özel tekrarlar yerine paylaşılan sınıf/bileşenlerde tut. Yeni ekran, mevcut standart sınıfları kullanmalı; istisna gerekiyorsa nedenini kod yapısında açık tut.
- Liste ve rapor tablolarında sütun başlıkları kullanıcı tarafından sürüklenerek sıralanabilir olmalı. Tercih tarayıcıda sayfa/tablo bazlı saklanmalı ve dışa aktarma işlemi ekrandaki güncel sütun sırasını aynen kullanmalı.
- Proje genelinde buton hiyerarşisi `management.module.css` üzerinden kurulmalı: birincil işlem mavi, ikincil işlem nötr, tehlikeli işlem kırmızı çerçeveli ve satır içi işlemler kompakt olmalı. Sayfaya özel büyük veya farklı ölçekli buton üretme.
- Veri giriş sayfaları aynı form şablonunu kullanmalı: sayfa başlığı, anlamlı form bölümleri, 40px kontroller, sağa hizalı işlem alanı ve gerekiyorsa ayrı bir tehlikeli işlem bölgesi.
- Personel fotoğrafı gibi görsel alanlar sabit ölçülü, `object-fit: cover` kullanan ve görsel olmadığında kısa bir yer tutucu gösteren kart yapısında olmalı.
- Sayfa tamamlanmadan önce 1440px masaüstü ve dar mobil görünümde başlık, filtre, tablo/kart taşması ve metin çakışması görsel olarak doğrulanmalı.
<!-- END:product-ui-rules -->

<!-- BEGIN:workflow-rules -->
# Çalışma ve dağıtım kuralları

Bu repo iki bilgisayardan ve farklı yapay zeka araçlarıyla (Claude, ChatGPT/Codex) geliştirilir. Aşağıdaki kurallar her araç ve her bilgisayar için geçerlidir.

## Oturum başı ve sonu
- İşe başlamadan önce `git pull` yapılır; diğer bilgisayarda yapılmış işler olabilir.
- İş bitince yarım iş bile olsa commit'lenip push edilir. Commit'lenmemiş değişiklik diğer bilgisayara geçmez.
- Her klonda bir kez `git config core.hooksPath .githooks` çalıştırılır. Kanca pull sonrası `package-lock.json` değiştiyse `npm ci`, yalnız Prisma şeması değiştiyse `npx prisma generate` çalıştırır. Kanca "npm ci başarısız" derse çalışan dev sunucusu kapatılıp `npm ci` elle çalıştırılır. Sunucularda bu ayar yapılmaz.

## Dallar
- Tüm geliştirme `staging` dalında yapılır.
- `main` dalına doğrudan commit atılmaz. `main` yalnız staging'den ilerletilir: `git checkout main && git merge --ff-only staging && git push origin main`.
- Aynı değişiklik staging ve main'e ayrı ayrı commit'lenmez; bu iki dalın geçmişini ayırır.
- Fast-forward mümkün değilse `--force` ile push yapılmaz. Kullanıcıya sorulur; gerekirse main bir kez staging'e merge edilir.

## Paketler ve ortam
- Paket yöneticisi npm'dir (`package-lock.json`). pnpm veya yarn kullanılmaz, başka lock dosyası üretilmez.
- Paket `npm install <paket>` ile eklenir; `package.json` ve `package-lock.json` birlikte commit'lenir.
- Node.js ana sürümü 24'tür.
- Prisma şeması değişince `npx prisma generate` çalıştırılır. `src/generated` elle düzenlenmez.

## Gizli bilgiler
- `.env` dosyaları, parolalar, SMTP şifresi ve API anahtarları commit'lenmez, sohbete veya loga yazılmaz.
- Yeni env değişkeni yalnız `deploy/staging/env.example` dosyasına `CHANGE_ME` değeriyle eklenir. Gerçek değer yalnızca sunucudaki `.env` dosyasına yazılır.

## Kod ve test
- İlgili modülün `MODULE.md` dosyasındaki "Değişmez kurallar"a uyulur. Modülün kapsamı değişirse `MODULE.md` güncellenir.
- Yeni test dosyası, `package.json` içindeki `test` script listesine de eklenir; liste otomatik taranmaz.
- Commit'ten önce `npm test`, değişen dosyalar için `npx eslint` ve `npx tsc --noEmit` hatasız çalışmalıdır.
- Mevcut migration dosyaları değiştirilmez veya silinmez; yalnız yeni migration eklenir.

## Dağıtım
- Test ortamı (`staging`, test.flodeska.com) onaysız deploy edilebilir.
- Canlı ortam (`main`, flodeska.com) şirket tarafından kullanılır. Canlıya almadan önce her seferinde kullanıcıdan açık onay alınır.
- Sıra: staging'e push → staging deploy → test ortamında kontrol → onay → main'e fast-forward → production deploy.

## Commit mesajları
- Kısa İngilizce başlık, conventional commit biçimi ve kapsam: `feat(site): ...`, `fix(auth): ...`, `chore: ...`, `docs: ...`.
<!-- END:workflow-rules -->
