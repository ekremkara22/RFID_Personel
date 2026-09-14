#include <SPI.h>
#include <MFRC522.h>

// Mevcut RFID Personel devresinin ESP32 pinleri.
constexpr byte SS_PIN = 5;
constexpr byte RST_PIN = 27;
constexpr byte SCK_PIN = 18;
constexpr byte MISO_PIN = 19;
constexpr byte MOSI_PIN = 23;

MFRC522 reader(SS_PIN, RST_PIN);
unsigned long lastStatusAt = 0;
unsigned long cardCount = 0;
bool readerResponding = false;

bool checkReader() {
  byte version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("RC522 surum: 0x");
  if (version < 0x10) Serial.print('0');
  Serial.println(version, HEX);

  if (version == 0x00 || version == 0xFF) {
    Serial.println("HATA: RC522 ile haberlesilemiyor.");
    Serial.println("3.3V, GND, SDA=5, SCK=18, MOSI=23, MISO=19, RST=27 kontrol et.");
    Serial.println("Bu sonuc tek basina modulun bozuk oldugunu kanitlamaz.");
    return false;
  }

  if (version == 0x91 || version == 0x92) {
    Serial.println("OK: RC522 surum bilgisi okundu. Kart okuma testi bekleniyor.");
  } else {
    Serial.println("UYARI: Farkli surum yaniti. Klon veya kararsiz baglanti olabilir.");
    Serial.println("Bu yanit tek basina saglamlik kaniti degildir; karti dene.");
  }
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Mevcut devredeki buzzer ve durum LED'lerini kapali tut.
  pinMode(14, OUTPUT);
  pinMode(26, OUTPUT);
  pinMode(33, OUTPUT);
  digitalWrite(14, LOW);
  digitalWrite(26, LOW);
  digitalWrite(33, LOW);

  Serial.println("\n=== ESP32 RC522 BAGIMSIZ TEST ===");
  Serial.println("Wi-Fi, sunucu ve LCD bu testte kullanilmaz.");
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  reader.PCD_Init();
  delay(50);
  readerResponding = checkReader();
  Serial.println("Karti okuyucuya yaklastir. Tekrar okumak icin uzaklastirip getir.");
}

void loop() {
  if (millis() - lastStatusAt >= 5000) {
    lastStatusAt = millis();
    // Ilk baslatma basarisizsa yeniden dene.
    if (!readerResponding) {
      reader.PCD_Init();
      delay(50);
    }
    readerResponding = checkReader();
    Serial.print("Test calisiyor. Okunan kart sayisi: ");
    Serial.println(cardCount);
  }

  if (!readerResponding || !reader.PICC_IsNewCardPresent()) {
    delay(20);
    return;
  }
  if (!reader.PICC_ReadCardSerial()) {
    Serial.println("Kart algilandi fakat UID okunamadi. Uzaklastirip tekrar dene.");
    delay(200);
    return;
  }

  ++cardCount;
  Serial.print("BASARILI - KART UID: ");
  for (byte i = 0; i < reader.uid.size; ++i) {
    if (i > 0) Serial.print(':');
    if (reader.uid.uidByte[i] < 0x10) Serial.print('0');
    Serial.print(reader.uid.uidByte[i], HEX);
  }
  Serial.println();
  Serial.print("Kart tipi: ");
  Serial.println(reader.PICC_GetTypeName(reader.PICC_GetType(reader.uid.sak)));
  Serial.println("Kart okuma dogrulandi. Tekrar denemek icin karti uzaklastirip getir.");
  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  delay(50);
}
