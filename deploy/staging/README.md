# Staging ortamı

Test ortamı canlıdan aşağıdaki kaynaklarla ayrılır:

- Git dalı: `staging`
- Uygulama klasörü: `/var/www/rfid-personel-staging`
- Sistem servisi: `rfid-personel-staging`
- Dahili port: `3003`
- Veritabanı: `rfid_personel_staging`
- Adres: `https://test.flodeka.com`

## Yayın akışı

1. Geliştirme dalındaki değişiklikleri `staging` dalına birleştirin.
2. Sunucuda `sudo /var/www/rfid-personel-staging/scripts/deploy-staging.sh` çalıştırın.
3. Test ortamında admin, firma ve personel akışlarını doğrulayın.
4. Onaylanan commit'i `main` dalına birleştirin.
5. Canlı dağıtımı ayrıca gerçekleştirin.

Test ortamı için canlıdan farklı `DATABASE_URL` ve `JWT_SECRET` kullanılmalıdır. `.env` dosyası Git'e eklenmemelidir.

DNS'te `test.flodeka.com` için sunucu IP'sine yönlenen bir `A` kaydı oluşturulduktan sonra HTTPS sertifikası şu komutla alınır:

```bash
certbot --nginx -d test.flodeka.com
```
