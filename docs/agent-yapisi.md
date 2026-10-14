# Claude agent yapısı

Proje üç katmanlı bir agent yapısıyla yönetilir. Agent tanımları `.claude/agents/` altındadır.

```
                         şef (ana oturum)
                               │
     ┌─────────────────────────┼──────────────────────────┐
 modül agent'ları         uzman agent'lar          kalite / dağıtım
 personel, pdks,          ui-sayfa, veritabani,    kod-inceleyici,
 takvim-izin, cihaz-      modul-backend            deploy
 firmware, uretim,        (ortak altyapı)
 muhasebe, erisim,
 platform, raporlar,
 pazarlama
```

- **Şef** (`sef`): Talebi modüllere böler, işi doğru agent'a verir, sonuçları doğrular, incelemeyi ve dağıtımı kapatır. Alt agent'lar başka agent çağıramadığı için şef her zaman ana oturumdur (`CLAUDE.md` bu rolü ana oturuma yükler).
- **Modül agent'ları**: Bir iş alanının sahibidir. Her biri önce kendi `MODULE.md` dosyasını okur.
- **Uzman agent'lar**: Modüller arası kesişen konular (arayüz standardı, şema/migration, ortak altyapı).
- **Kalite / dağıtım**: Salt okunur inceleme ve sunucuya dağıtım.

## Modül haritası

| Agent | MODULE.md | Ürün modülü |
|---|---|---|
| `personel` | [src/modules/personnel/MODULE.md](../src/modules/personnel/MODULE.md) | İK |
| `pdks` | [src/modules/attendance/MODULE.md](../src/modules/attendance/MODULE.md) | İK |
| `takvim-izin` | [src/modules/calendar/MODULE.md](../src/modules/calendar/MODULE.md) | İK |
| `cihaz-firmware` | [src/modules/devices/MODULE.md](../src/modules/devices/MODULE.md) | İK |
| `raporlar` | [src/app/dashboard/reports/MODULE.md](../src/app/dashboard/reports/MODULE.md) | İK |
| `uretim` | [src/modules/production/MODULE.md](../src/modules/production/MODULE.md) | Üretim Planlama |
| `muhasebe` | [src/modules/accounting/MODULE.md](../src/modules/accounting/MODULE.md) | Muhasebe |
| `erisim` | [src/modules/access/MODULE.md](../src/modules/access/MODULE.md) | Platform (tümü) |
| `platform` | [src/modules/companies/MODULE.md](../src/modules/companies/MODULE.md) | Platform (tümü) |
| `pazarlama` | [src/components/marketing/MODULE.md](../src/components/marketing/MODULE.md) | Tanıtım sitesi |

## MODULE.md şablonu

Her modülün amacı ve sınırları kendi klasöründeki `MODULE.md` dosyasında tutulur. Bu dosya modül agent'ının "anayasası"dır: agent tanımı ince kalır, iş bilgisi burada yaşar. Yeni modül açılırken aşağıdaki şablon kopyalanır.

```markdown
# <Modül adı>

> <Tek cümlelik amaç: bu modül kimin hangi sorununu çözer?>

## Amaç
<Neden var, hangi iş ihtiyacını karşılar, başarısı neyle ölçülür.>

## Kullanıcılar ve yetkiler
<Hangi roller kullanır, hangi izin/lisans gerekir.>

## Kapsam
- Ekranlar: <src/app/... rotaları>
- İş mantığı: <src/modules/..., src/lib/...>
- Veri: <Prisma modelleri>
- Testler: <*.test.ts>

## Değişmez kurallar
<İhlal edilmemesi gereken iş kuralları. Agent bunlarla çelişen isteği uygulamadan önce bildirir.>

## Bağımlılıklar
- Kullandıkları: <modüller>
- Onu kullananlar: <modüller>

## Kapsam dışı
<Bu modülde bilerek yapılmayan şeyler.>

## Yol haritası / açık konular
<Ürün sahibinin doldurduğu, planlanan geliştirmeler.>
```

## Ortak çalışma kuralları (tüm agent'lar)

1. Kullanıcıya Türkçe yanıt verilir.
2. Modül agent'ı yalnız kendi `MODULE.md` "Kapsam" bölümündeki dosyaları değiştirir. Başka modülün dosyasında değişiklik gerekiyorsa yapmaz; teslim raporunda "diğer modüllerden gereken değişiklik" olarak yazar.
3. Alt agent başka agent çağıramaz. Arayüz işinde `.claude/agents/ui-sayfa.md`, şema işinde `.claude/agents/veritabani.md`, ortak altyapıda `.claude/agents/modul-backend.md` kuralları okunup uygulanır.
4. Mimari sınırlar `docs/modular-monolith.md` dosyasındadır; `src/app` sayfaları Prisma'yı doğrudan kullanmaz.
5. Yerel makinede Node.js yoktur; test, lint ve build sunucudaki deploy akışında çalışır. Çalıştırılamayan doğrulama "yapıldı" diye raporlanmaz.
6. Modülün amacı, kapsamı veya kuralı değiştiyse aynı değişiklikte `MODULE.md` güncellenir.

## Teslim raporu biçimi (modül ve uzman agent'lar)

- Yapılanlar ve değişen dosyalar
- Diğer modüllerden gereken değişiklikler (varsa)
- `MODULE.md` güncellemesi (varsa)
- Doğrulanamayan noktalar ve riskler
