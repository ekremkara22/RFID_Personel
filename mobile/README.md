# CheckInQR Mobile

Expo tabanli personel mobil uygulamasi.

## Hazir akıs

- Personel mobil login
- Oturumun cihazda saklanmasi
- Giris / Cikis icin QR okutma
- Giris / Cikis icin konum alma
- Mola ve yemek hareketlerini direkt attendance API'sine gonderme

## Kurulum

```bash
npm install
npm run start
```

## Kritik ayar

Telefonun backend'e ulasabilmesi icin [app.json](C:\Users\PC\Desktop\Antigravity\QrCalisma1\mobile\app.json) icindeki:

`expo.extra.apiBaseUrl`

degerinin bilgisayarinin yerel IP'si ve backend portu ile uyusmasi gerekir.

Ornek:

`http://192.168.1.103:3000`

## Demo personel girisi

- `ahmet@demosirketi.com`
- `Personel123!`

## APK notu

Bu klasor Expo projesi olarak hazirlandi. APK almak icin sonraki adimda Android build alinmasi gerekir.
