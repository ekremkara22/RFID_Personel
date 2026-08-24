# RFID Personel Takip VPS Deployment

## Sunucu hedefi

- Ubuntu 22.04 LTS
- Node.js 20
- Nginx
- PM2
- SSL (Let's Encrypt)

## 1. Temel paketler

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx
```

## 2. Node.js 20 kurulumu

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

## 3. PM2 kurulumu

```bash
npm install -g pm2
pm2 -v
```

## 4. Proje dizini

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/ekremkara22/RFID_Personel.git rfid-personel-takip
cd /var/www/rfid-personel-takip
```

## 5. Ortam degiskenleri

`/var/www/rfid-personel-takip/.env` dosyasi:

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME"
JWT_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
NODE_ENV="production"
```

## 6. Uygulama kurulumu

```bash
cd /var/www/rfid-personel-takip
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 7. Nginx reverse proxy

`/etc/nginx/sites-available/rfid-personel-takip`:

```nginx
server {
    server_name flodeka.com www.flodeka.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Etkinlestirme:

```bash
ln -s /etc/nginx/sites-available/rfid-personel-takip /etc/nginx/sites-enabled/rfid-personel-takip
nginx -t
systemctl restart nginx
```

## 8. SSL

```bash
certbot --nginx -d flodeka.com -d www.flodeka.com
```

## 9. Guncelleme akisi

```bash
cd /var/www/rfid-personel-takip
git pull
npm install
npm run build
pm2 restart rfid-personel-takip
```
