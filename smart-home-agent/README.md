# Raspberry Pi Zero 2 W kurulumu

Bu ajan, Pi üzerindeki yerel Mosquitto MQTT broker ile Flodeska Akıllı Ev API'si arasında güvenli bir köprü kurar. ESP32-C3 düğümleri internete doğrudan açılmaz.

## Ağ topolojisi

```text
Flodeska (HTTPS) <--Wi-Fi/İnternet--> Raspberry Pi + Mosquitto
                                           |
                                      yerel MQTT
                                           |
                               ESP32-C3 root/geçit
                                           |
                                   ESP-WIFI-MESH
                                           |
                                  ESP32-C3 düğümleri
```

ESP-WIFI-MESH'in root düğümü ESP32 olmalıdır. Raspberry Pi, root ESP32'nin bağlandığı IP ağı ve uygulama geçididir. Tek oda ve güçlü Wi-Fi kapsaması için ilk aşamada mesh yerine her ESP32-C3'ü Pi'nin MQTT broker'ına normal Wi-Fi ile bağlamak daha basittir; panel/API sözleşmesi iki topolojide de değişmez.

## Pi kurulumu

1. Raspberry Pi Imager ile **Raspberry Pi OS Lite (64-bit)** yazın; cihaz adını, Wi-Fi ve SSH anahtarını Imager içinden ayarlayın.
2. Pi'ye SSH ile bağlanıp güncelleyin:

   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo apt install -y mosquitto mosquitto-clients python3-venv
   ```

3. Panelde **Akıllı Ev > Raspberry Pi geçidi ekle** alanından geçidi oluşturun ve tek sefer gösterilen anahtarı kopyalayın.
4. Bu klasörü Pi'de `/opt/flodeska-smart-home` altına kopyalayın ve servisi kurun:

   ```bash
   sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin flodeska
   sudo python3 -m venv /opt/flodeska-smart-home/venv
   sudo /opt/flodeska-smart-home/venv/bin/pip install -r /opt/flodeska-smart-home/requirements.txt
   sudo cp /opt/flodeska-smart-home/flodeska-smart-home.env.example /etc/flodeska-smart-home.env
   sudo chmod 600 /etc/flodeska-smart-home.env
   sudo nano /etc/flodeska-smart-home.env
   sudo cp /opt/flodeska-smart-home/flodeska-smart-home.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now mosquitto flodeska-smart-home
   ```

5. Durumu kontrol edin. API anahtarı loglarda yazdırılmaz:

   ```bash
   systemctl status flodeska-smart-home --no-pager
   journalctl -u flodeska-smart-home -n 50 --no-pager
   ```

## ESP32 MQTT sözleşmesi

Düğüm durumunu QoS 1 ile `flodeska/nodes/<hardware-id>/state` konusuna JSON olarak yayınlar:

```json
{
  "name": "Masa lambası",
  "room": "Çalışma odası",
  "kind": "LIGHT",
  "capabilities": { "power": true },
  "state": { "power": false },
  "telemetry": { "temperature": 23.4, "humidity": 46 },
  "firmwareVersion": "0.1.0",
  "rssi": -58,
  "meshLayer": 1
}
```

Komutlar `flodeska/nodes/<hardware-id>/command` konusunda gelir. Düğüm komutu uyguladıktan sonra aynı kimliği `flodeska/nodes/<hardware-id>/ack` konusunda onaylar:

```json
{ "id": 42, "ok": true }
```

Komutlar tekrar teslim edilebilir. ESP32 firmware'i son uygulanan komut kimliklerini kısa süreli saklamalı ve aynı kimliği ikinci kez fiziksel çıkışa uygulamadan yeniden onaylamalıdır.

## Güvenlik notu

Mosquitto ilk kurulumdan sonra yalnız yerel ağdan erişilebilir, parola korumalı ve tercihen TLS olacak şekilde sertleştirilmelidir. İnternet yönlendiricisinde 1883 portu açılmaz. Geçit anahtarı sızarsa panelde **Anahtarı yenile** işlemi yapılır ve Pi'deki `/etc/flodeska-smart-home.env` güncellenir.
