# Ortak Sunucu Erişimi ve Proje İzolasyonu

Bu dosya, aynı VPS üzerinde geliştirilecek yeni bir projeye kopyalanmak üzere hazırlanmıştır. Dosyadaki kurallar hem geliştiriciler hem de yapay zekâ ajanları için bağlayıcıdır.

## SSH bağlantısı

- Sunucu: `13.143.223.183`
- SSH kullanıcısı: `root`
- SSH portu: `22` (varsayılan)
- Kimlik doğrulama: Yerel SSH özel anahtarı
- Windows anahtar yolu: `%USERPROFILE%\.ssh\id_ed25519`

PowerShell bağlantı komutu:

```powershell
ssh -o BatchMode=yes -i "$env:USERPROFILE\.ssh\id_ed25519" root@13.143.223.183
```

Bağlantıyı ilk kez sınamak için yalnızca salt okunur bir komut kullan:

```powershell
ssh -o BatchMode=yes -i "$env:USERPROFILE\.ssh\id_ed25519" root@13.143.223.183 "hostname; id; uptime"
```

## Gizli bilgi kuralları

- Parola, özel anahtar içeriği, `.env` değerleri, veritabanı bağlantı adresleri, token ve API anahtarları bu dosyaya veya Git deposuna yazılmaz.
- `sunucu bilgileri.txt` gibi yerel kimlik bilgisi dosyalarının içeriği okunup çıktıya, sohbete veya loga basılmaz.
- Parola ile SSH bağlantısı kurulmaz. Yerel `id_ed25519` anahtarı kullanılır.
- Yeni proje için gereken gizli değerler yalnızca sunucudaki, yeni projeye ait ve uygun izinlerle korunan `.env` dosyasında tutulur.

## Kesin izolasyon sınırı

Bu sunucuda **RFID Personel / Flodeska** uygulamasının test ve canlı ortamları çalışmaktadır. Yeni projenin açık görevi RFID Personel veya Flodeska üzerinde çalışmak değilse, aşağıdaki kaynaklara **kullanıcının açık izni olmadan hiçbir şekilde dokunma**.

### Korunan uygulama kaynakları

- Canlı uygulama dizini: `/var/www/rfid-personel-takip`
- Test uygulama dizini: `/var/www/rfid-personel-staging`
- Canlı alan adları: `flodeska.com`, `www.flodeska.com`
- Test alan adı: `test.flodeska.com`
- Canlı dahili port: `3002`
- Test dahili port: `3003`
- Test servisi: `rfid-personel-staging`
- RFID/Flodeska adını taşıyan diğer `systemd`, PM2, cron ve timer birimleri
- Özellikle `rfid-personel-staging-attendance-finalizer.timer`
- Canlı firmware dizini: `/var/lib/rfid-personel/firmware`
- Test firmware dizini: `/var/lib/rfid-personel-staging/firmware`
- `rfid_personel` veya `rfid_personel_staging` adını taşıyan veritabanları, kullanıcılar ve yedekler
- Flodeska/RFID için tanımlanmış Nginx site dosyaları, SSL sertifikaları ve loglar
- Flodeska/RFID uygulamalarına ait `.env` dosyaları ve tüm gizli değerler

### Açıkça yasak işlemler

Kullanıcı açıkça RFID/Flodeska görevi vermedikçe:

- Korunan dizinlerde dosya okuma, yazma, silme, taşıma, kopyalama veya izin değiştirme.
- Flodeska/RFID servislerini başlatma, durdurma, yeniden başlatma veya yeniden yükleme.
- Flodeska/RFID veritabanlarına bağlanma; sorgu, migration, yedekleme veya geri yükleme çalıştırma.
- Mevcut Nginx tanımlarını, sertifikaları, firewall kurallarını veya `3002`/`3003` portlarını değiştirme.
- `pm2 delete all`, `pm2 restart all`, `systemctl restart` için geniş jokerler, `docker system prune`, toplu süreç sonlandırma veya sunucunun tamamını etkileyen benzeri komutlar çalıştırma.
- Sunucuyu yeniden başlatma, dağıtım yükseltmesi yapma veya paylaşılan paketleri kaldırma/yükseltme.
- Disk temizliği amacıyla sahibi belli olmayan dosya, log, volume, image, yedek veya dizin silme.

Salt okunur envanter komutları bile yalnızca yeni projeyi yerleştirmek için gerçekten gerekliyse kullanılmalı; korunan dosyaların içerikleri görüntülenmemelidir.

## Yeni proje için zorunlu ayrım

Yeni proje aşağıdaki kaynakların tamamında benzersiz ve Flodeska/RFID'den bağımsız adlar kullanmalıdır:

- Ayrı uygulama dizini; örneğin `/var/www/<yeni-proje>`
- Ayrı Linux servis adı veya PM2 uygulama adı
- Ayrı dahili port; önce kullanımda olmadığı salt okunur biçimde doğrulanmalıdır
- Ayrı veritabanı ve mümkünse yalnız o veritabanına yetkili ayrı veritabanı kullanıcısı
- Ayrı `.env` dosyası
- Ayrı Nginx site dosyası ve ayrı alan adı/alt alan adı
- Ayrı log, yükleme, kalıcı veri ve yedek dizinleri
- Mümkünse ayrı, kısıtlı Linux servis kullanıcısı

Yeni proje hiçbir zaman Flodeska/RFID `.env` değerlerini, veritabanını, portlarını, servis kullanıcılarını, kalıcı veri dizinlerini veya dağıtım betiklerini yeniden kullanmamalıdır.

## Güvenli çalışma sırası

1. Yerelde yeni projenin gereksinimlerini ve kullanılacak kaynak adlarını belirle.
2. Sunucuda yalnızca gerekli salt okunur kontrollerle hedef dizinin, portun, servis adının ve veritabanı adının boş olduğunu doğrula.
3. Çakışma görülürse mevcut kaynağı değiştirme; yeni bir ad veya port seç.
4. Yalnızca yeni projeye ait dizinleri, kullanıcıları, servisleri ve yapılandırmaları oluştur.
5. Nginx gerekiyorsa mevcut Flodeska dosyalarını değiştirmeden yeni ve ayrı bir site dosyası oluştur; `nginx -t` başarılı olmadan reload yapma.
6. Komutları dar kapsamlı çalıştır. Toplu silme, toplu yeniden başlatma ve jokerli yönetim komutlarından kaçın.
7. Her dağıtımdan sonra yalnızca yeni projenin servisini, loglarını ve HTTP yanıtını kontrol et.

## Flodeska/RFID görevi verilirse

Görev açıkça RFID Personel veya Flodeska ile ilgili olsa bile:

- Test ortamı ile canlı ortamı karıştırma.
- Canlı ortamda değişiklik veya deploy yapmadan önce kullanıcıdan her seferinde açık onay al.
- Mevcut projenin kendi `AGENTS.md`, `MODULE.md` ve dağıtım kurallarını önce oku.
- Kullanıcının verdiği kapsamın dışındaki Flodeska/RFID kaynaklarına dokunma.
- Force push, `git reset --hard`, mevcut migration değiştirme veya sunucuda kaynak kodu elle düzenleme yapma.

## Ajan için kısa ve bağlayıcı talimat

> Bu sunucu paylaşımlıdır. Görev açıkça RFID Personel veya Flodeska projesini kapsamıyorsa `/var/www/rfid-personel-takip`, `/var/www/rfid-personel-staging`, Flodeska/RFID servisleri, veritabanları, Nginx tanımları, port `3002` ve `3003`, firmware dizinleri, ortam dosyaları ve yedekler kesinlikle kapsam dışıdır. Bunları inceleme, değiştirme, yeniden başlatma veya silme. Yeni proje için tamamen ayrı kaynaklar oluştur. Bir çakışmayı mevcut kaynağı değiştirerek çözme; dur ve kullanıcıya bildir. Canlı Flodeska işlemleri her zaman ayrıca açık kullanıcı onayı gerektirir.

