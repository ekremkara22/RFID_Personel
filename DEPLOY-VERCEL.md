# CheckInQR Vercel Deployment

## 1. GitHub hazirligi

Projeyi bir GitHub reposuna yukleyin.

Bu projede Prisma client `postinstall` sirasinda otomatik uretilir, bu nedenle Vercel deployunda ayrica `prisma generate` komutu vermeniz gerekmez.

## 2. Vercel proje olusturma

- Vercel'de `Add New Project` secin.
- GitHub reposunu baglayin.
- Framework olarak `Next.js` secili kalabilir.
- Root directory olarak repo kok dizinini kullanin.

## 3. Environment Variables

Vercel proje ayarlarina su degiskenleri girin:

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME"
JWT_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
NODE_ENV="production"
```

Gerekirse mobil uygulama veya cihaz icin kullanilan public API adreslerini de ayni ekrandan tanimlayin.

## 4. Build ayari

Varsayilan `npm run build` yeterlidir.

`postinstall` otomatik olarak `prisma generate` calistirir.

## 5. Ilk deploy sonrasi

- Vercel domaini uzerinden giris ekranini test edin.
- Super admin girisi yapin.
- Firma, personel, cihaz ve dashboard ekranlarini kontrol edin.
- ESP32 tarafindaki `API_BASE_URL` degerini Vercel domainine guncelleyin.
- Mobil uygulamadaki API adresini de canli domaine cevirin.

## 6. Veritabani notu

Mevcut MySQL sunucusu Vercel'den gelen baglantilari kabul etmelidir.

Deploy basarili olup uygulama veritabanina baglanamiyorsa sorun genellikle `DATABASE_URL` veya MySQL remote access kisitidir.
