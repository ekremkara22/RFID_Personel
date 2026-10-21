# Raspberry Pi Zero 2 W ajan kurulumu

Ajan, USB'ye bağlı kök ESP32 ile Flodeska Akıllı Ev API'si arasında köprü kurar. Pi yalnız internete (ev Wi-Fi'ı) bağlanır; ESP32 düğümleri modeme bağlanmaz, kök ESP32 üzerinden ESP-WIFI-MESH ile haberleşir. Topoloji ve mesaj biçimi: [PROTOCOL.md](PROTOCOL.md).

Ajan Flodeska'ya 5 saniyede bir dışarıya doğru HTTPS isteği atar; modemde port açılmaz.

## 1. Pi'yi hazırlama

1. Raspberry Pi Imager ile **Raspberry Pi OS Lite (64-bit)** yazın. Ayarlarda cihaz adını (ör. `flodeska-ev`), kullanıcıyı, Wi-Fi'ı ve SSH'ı (tercihen anahtar ile) açın.
2. Pi açıldıktan sonra bağlanıp güncelleyin:

   ```bash
   ssh <kullanıcı>@flodeska-ev.local
   sudo apt update && sudo apt full-upgrade -y
   sudo apt install -y python3-venv
   ```

## 2. Geçidi panelde oluşturma

Flodeska'da **Akıllı Ev > Raspberry Pi geçidi ekle** ile geçidi oluşturun. Anahtar (`shg_...`) yalnız bir kez gösterilir; kopyalayın.

## 3. Ajanı kurma

Bilgisayardan klasörü Pi'ye kopyalayın (repo kökünde):

```bash
scp -r smart-home-agent <kullanıcı>@flodeska-ev.local:/tmp/
```

Pi'de:

```bash
sudo mkdir -p /opt/flodeska-smart-home
sudo cp /tmp/smart-home-agent/* /opt/flodeska-smart-home/
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin --groups dialout flodeska
sudo python3 -m venv /opt/flodeska-smart-home/venv
sudo /opt/flodeska-smart-home/venv/bin/pip install -r /opt/flodeska-smart-home/requirements.txt
sudo cp /opt/flodeska-smart-home/flodeska-smart-home.env.example /etc/flodeska-smart-home.env
sudo chmod 600 /etc/flodeska-smart-home.env
sudo nano /etc/flodeska-smart-home.env   # URL ve anahtarı yazın
sudo cp /opt/flodeska-smart-home/flodeska-smart-home.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now flodeska-smart-home
```

## 4. ESP32 olmadan deneme (simülasyon)

Örnek ayar dosyasında `FLODESKA_SERIAL_PORT=simulate` gelir. Bu modda ajan sahte bir "Simülasyon ışığı" düğümü bildirir; panelden **Aç/Kapat** komutu Pi'ye gider, simülasyon uygular ve onaylar. Böylece Flodeska ↔ Pi yolu donanım gelmeden doğrulanır.

```bash
systemctl status flodeska-smart-home --no-pager
journalctl -u flodeska-smart-home -f
```

Beklenen loglar: `Simülasyon modu...`, `Flodeska bağlantısı kuruldu.` Panelde geçit ve düğüm çevrimiçi görünür. Komutun sonucunu görmek için sayfayı yenileyin. API anahtarı loglara yazılmaz.

## 5. Kök ESP32'yi bağlama

- Pi Zero 2 W'de iki micro-USB vardır: **PWR** yalnız güç, **USB** veri portudur. Kök ESP32'yi **USB** portuna, veri destekli bir kablo veya OTG adaptörüyle takın.
- Port adını bulun ve ayar dosyasına kalıcı yolu yazın:

  ```bash
  ls -l /dev/serial/by-id/
  sudo nano /etc/flodeska-smart-home.env   # FLODESKA_SERIAL_PORT=/dev/serial/by-id/usb-...
  sudo systemctl restart flodeska-smart-home
  ```

Kablo çıkarılırsa ajan 5 saniye arayla yeniden bağlanmayı dener; Flodeska ile senkron devam eder.

## Güvenlik

- Geçit anahtarı sızarsa panelde **Anahtarı yenile** yapılır ve `/etc/flodeska-smart-home.env` güncellenir.
- Ajan ayrı, girişsiz `flodeska` sistem kullanıcısıyla ve salt okunur dosya sistemiyle çalışır; seri port için yalnız `dialout` grubuna üyedir.
