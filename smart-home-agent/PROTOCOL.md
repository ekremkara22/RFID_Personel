# Pi ↔ kök ESP32 seri protokolü

Raspberry Pi ajanı ile USB'ye bağlı kök (root) ESP32 arasındaki sözleşme. Firmware ve ajan bu dosyaya göre yazılır; değişiklik iki tarafta birlikte yapılır.

## Topoloji

```text
Flodeska (HTTPS) ── İnternet ── Ev modemi ── Wi-Fi ── Raspberry Pi Zero 2 W (yalnız internete bağlı)
                                                            │ USB seri
                                                      Kök ESP32 (mesh root, sabit)
                                                            │ ESP-WIFI-MESH (modemden bağımsız)
                                     ┌──────────────────────┼──────────────────────┐
                               ESP32-C3 düğüm         ESP32-C3 düğüm         ESP32-C3 düğüm
                               (anahtar/röle)         (ışık)                 (sensör)
```

- Mesh ağı ev modemine bağlanmaz; kök düğüm sabittir (`fixed root`) ve router olmadan çalışır. Modemin bağlı cihaz sayısı ve trafiği etkilenmez. Mesh yine 2.4 GHz kullanır; modemle çakışmayan sabit bir kanal seçilir.
- Kök ESP32 Pi'nin USB portundan hem güç hem veri alır.
- Düğümler en az 30 saniyede bir ve her durum değişikliğinde `state` yayınlar. Ajan 10 dakika haber alamadığı düğümü sunucuya bildirmez; panel 45 saniyeden eski düğümü çevrimdışı gösterir.

## Fiziksel katman

- USB CDC seri, 115200 8N1, UTF-8.
- Her mesaj tek satır JSON nesnesidir ve `\n` ile biter; satır en fazla 4096 bayttır.
- `{` ile başlamayan satırlar (ESP-IDF açılış logları vb.) ajan tarafından yok sayılır.
- `hardwareId`: düğümün Wi-Fi STA MAC adresi, `AA:BB:CC:DD:EE:FF` biçiminde.

## Kök → Pi

**Durum** — kök, kendisi dahil her düğüm için iletir (kök için `meshLayer: 1`):

```json
{"type":"state","hardwareId":"AA:BB:CC:DD:EE:01","name":"Masa lambası","room":"Çalışma odası","kind":"LIGHT","capabilities":{"power":true},"state":{"power":false},"telemetry":{"temperature":23.4},"firmwareVersion":"0.1.0","rssi":-58,"meshLayer":2}
```

`kind`: `SWITCH`, `LIGHT`, `SENSOR`, `CLIMATE`, `SECURITY`, `OTHER`. `rssi` −127…0 tam sayı, `meshLayer` 0…25. JSON alanları (capabilities/state/telemetry) en fazla 8 KB nesnedir.

**Komut onayı:**

```json
{"type":"ack","hardwareId":"AA:BB:CC:DD:EE:01","id":42,"ok":true}
{"type":"ack","hardwareId":"AA:BB:CC:DD:EE:01","id":43,"ok":false,"error":"Röle yanıt vermedi"}
```

**Düğüm ayrıldı** — kök, mesh yönlendirme tablosundan çıkan düğüm için:

```json
{"type":"leave","hardwareId":"AA:BB:CC:DD:EE:01"}
```

**Log** — Pi journal'ına yazılır:

```json
{"type":"log","message":"Mesh kanalı 6, 3 düğüm"}
```

## Pi → Kök

```json
{"type":"command","id":42,"hardwareId":"AA:BB:CC:DD:EE:01","command":"SET_POWER","payload":{"power":true}}
```

Kök, komutu `hardwareId` düğümüne mesh üzerinden iletir; düğüm uygular ve `ack` döner.

| Komut | Payload | Açıklama |
|---|---|---|
| `SET_POWER` | `{"power": bool}` | Röle/ışık aç-kapa |

## Tekrar ve tutarlılık kuralları

- Onay gelmeyen komut sunucu tarafından 30 saniye sonra tekrar gönderilir; komut 2 dakika sonra zaman aşımına uğrar.
- Düğüm son uygulanan en az 16 komut kimliğini saklar. Aynı kimlik tekrar gelirse çıkışa **tekrar uygulamaz**, yalnız yeniden `ack` gönderir.
- Fiziksel anahtar/buton her zaman yerelde çalışır; internet, Pi veya kök olmasa da düğüm röleyi değiştirir ve bağlantı varsa yeni `state` yayınlar.
