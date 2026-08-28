#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal.h>

// ESP32 pinleri. Kendi baglantina gore burayi degistirebilirsin.
#define RFID_SS_PIN 5
#define RFID_RST_PIN 27
#define GREEN_LED_PIN 26
#define RED_LED_PIN 33

// Donusturucusuz 2x16 paralel LCD (4-bit mod)
#define LCD_RS_PIN 32
#define LCD_ENABLE_PIN 25
#define LCD_D4_PIN 22
#define LCD_D5_PIN 21
#define LCD_D6_PIN 16
#define LCD_D7_PIN 17

#define LCD_COLUMNS 16
#define LCD_ROWS 2

const char* DEFAULT_API_BASE_URL = "http://13.143.223.183:3002";
const char* DEFAULT_DEVICE_SECRET_KEY = "be628a54-e5de-466d-8921-a3220ccb913b";

const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long RFID_DEBOUNCE_MS = 2500;
const byte DNS_PORT = 53;

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal lcd(
  LCD_RS_PIN,
  LCD_ENABLE_PIN,
  LCD_D4_PIN,
  LCD_D5_PIN,
  LCD_D6_PIN,
  LCD_D7_PIN
);
Preferences preferences;
WebServer configServer(80);
DNSServer dnsServer;

String savedWifiSsid = "";
String savedWifiPassword = "";
String apiBaseUrl = "";
String deviceSecretKey = "";
String setupApSsid = "";
String lastCardId = "";

bool isConfigPortalActive = false;
unsigned long lastWifiAttemptAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastCardReadAt = 0;

String htmlEscape(const String& value) {
  String escaped = value;
  escaped.replace("&", "&amp;");
  escaped.replace("<", "&lt;");
  escaped.replace(">", "&gt;");
  escaped.replace("\"", "&quot;");
  return escaped;
}

String fitLcdText(const String& text) {
  if (text.length() <= LCD_COLUMNS) {
    return text;
  }
  return text.substring(0, LCD_COLUMNS);
}

void showLcd(const String& line1, const String& line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(fitLcdText(line1));
  lcd.setCursor(0, 1);
  lcd.print(fitLcdText(line2));
}

void setStatusLed(bool green, bool red) {
  digitalWrite(GREEN_LED_PIN, green ? HIGH : LOW);
  digitalWrite(RED_LED_PIN, red ? HIGH : LOW);
}

void successSignal() {
  setStatusLed(true, false);
  delay(500);
  setStatusLed(false, false);
}

void errorSignal() {
  setStatusLed(false, true);
  delay(700);
  setStatusLed(false, false);
}

String getApSsid() {
  uint64_t chipId = ESP.getEfuseMac();
  char suffix[7];
  snprintf(suffix, sizeof(suffix), "%06X", (uint32_t)(chipId & 0xFFFFFF));
  return "RFIDPersonel-" + String(suffix);
}

String getMacAddress() {
  return WiFi.macAddress();
}

void loadConfig() {
  preferences.begin("rfidpdks", true);
  savedWifiSsid = preferences.getString("wifi_ssid", "");
  savedWifiPassword = preferences.getString("wifi_pass", "");
  apiBaseUrl = preferences.getString("api_url", DEFAULT_API_BASE_URL);
  deviceSecretKey = preferences.getString("secret_key", DEFAULT_DEVICE_SECRET_KEY);
  preferences.end();

  apiBaseUrl.trim();
  deviceSecretKey.trim();
}

void saveConfig(const String& ssid, const String& password, const String& apiUrl, const String& secretKey) {
  preferences.begin("rfidpdks", false);
  preferences.putString("wifi_ssid", ssid);
  preferences.putString("wifi_pass", password);
  preferences.putString("api_url", apiUrl);
  preferences.putString("secret_key", secretKey);
  preferences.end();

  savedWifiSsid = ssid;
  savedWifiPassword = password;
  apiBaseUrl = apiUrl;
  deviceSecretKey = secretKey;
}

bool isHttpsUrl(const String& url) {
  return url.startsWith("https://");
}

String normalizeApiBaseUrl(String url) {
  url.trim();
  while (url.endsWith("/")) {
    url.remove(url.length() - 1);
  }
  return url;
}

bool beginHttp(HTTPClient& http, WiFiClient& client, WiFiClientSecure& secureClient, const String& endpoint) {
  if (isHttpsUrl(endpoint)) {
    secureClient.setInsecure();
    return http.begin(secureClient, endpoint);
  }

  return http.begin(client, endpoint);
}

String buildWifiOptionsHtml() {
  int networkCount = WiFi.scanNetworks();
  String options = "";

  if (networkCount <= 0) {
    return "<option value=\"\">Ag bulunamadi</option>";
  }

  for (int i = 0; i < networkCount; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) {
      continue;
    }

    options += "<option value=\"" + htmlEscape(ssid) + "\">";
    options += htmlEscape(ssid) + " (" + String(WiFi.RSSI(i)) + " dBm)";
    options += "</option>";
  }

  WiFi.scanDelete();
  return options;
}

void handleConfigRoot() {
  String html = "<!doctype html><html lang=\"tr\"><head><meta charset=\"utf-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  html += "<title>RFID Personel Kurulum</title>";
  html += "<style>body{margin:0;font-family:Arial,sans-serif;background:#eef6fb;color:#0f172a}";
  html += ".wrap{max-width:540px;margin:0 auto;padding:24px}.card{background:#fff;border:1px solid #dbe3ef;border-radius:10px;padding:22px}";
  html += "h1{font-size:24px;margin:0 0 8px}p{color:#475569;line-height:1.5}label{display:block;margin-top:14px;font-weight:700}";
  html += "select,input,button{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:6px;border:1px solid #cbd5e1;font-size:16px}";
  html += "button{background:#0284c7;color:#fff;border:0;font-weight:700;margin-top:18px}.hint{font-size:13px;color:#64748b}</style></head><body>";
  html += "<main class=\"wrap\"><section class=\"card\"><h1>RFID Personel Kurulum</h1>";
  html += "<p>Wi-Fi agini sec, API adresini ve cihaz secret key bilgisini gir. Kayit sonrasi cihaz yeniden baslar.</p>";
  html += "<form method=\"post\" action=\"/save\"><label>Wi-Fi Agi</label><select name=\"ssid\" required>";
  html += buildWifiOptionsHtml();
  html += "</select><label>Wi-Fi Sifresi</label><input name=\"password\" type=\"password\" autocomplete=\"current-password\">";
  html += "<label>API Adresi</label><input name=\"apiUrl\" required value=\"" + htmlEscape(apiBaseUrl) + "\">";
  html += "<label>Cihaz Secret Key</label><input name=\"secretKey\" required value=\"" + htmlEscape(deviceSecretKey) + "\">";
  html += "<button type=\"submit\">Kaydet ve Yeniden Baslat</button></form>";
  html += "<p class=\"hint\">Bu ekran acilmazsa tarayicida 192.168.4.1 adresini ac.</p></section></main></body></html>";
  configServer.send(200, "text/html; charset=utf-8", html);
}

void handleConfigSave() {
  String ssid = configServer.arg("ssid");
  String password = configServer.arg("password");
  String apiUrl = normalizeApiBaseUrl(configServer.arg("apiUrl"));
  String secretKey = configServer.arg("secretKey");
  secretKey.trim();

  if (ssid.length() == 0 || apiUrl.length() == 0 || secretKey.length() == 0) {
    configServer.send(400, "text/plain; charset=utf-8", "Wi-Fi, API adresi ve secret key zorunludur.");
    return;
  }

  saveConfig(ssid, password, apiUrl, secretKey);
  showLcd("Ayar kaydedildi", "Yeniden baslar");
  configServer.send(200, "text/html; charset=utf-8", "<html><body><h1>Kaydedildi</h1><p>Cihaz yeniden baslatiliyor.</p></body></html>");
  delay(1500);
  ESP.restart();
}

void handleConfigNotFound() {
  configServer.sendHeader("Location", "/", true);
  configServer.send(302, "text/plain", "");
}

void startConfigPortal() {
  isConfigPortalActive = true;
  setupApSsid = getApSsid();

  WiFi.disconnect(true);
  delay(300);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(setupApSsid.c_str());

  IPAddress apIp = WiFi.softAPIP();
  dnsServer.start(DNS_PORT, "*", apIp);

  configServer.on("/", HTTP_GET, handleConfigRoot);
  configServer.on("/save", HTTP_POST, handleConfigSave);
  configServer.onNotFound(handleConfigNotFound);
  configServer.begin();

  Serial.print("Kurulum AP: ");
  Serial.println(setupApSsid);
  Serial.print("Kurulum IP: ");
  Serial.println(apIp);
  showLcd(setupApSsid, "192.168.4.1");
}

bool tryConnectWifi(const String& ssid, const String& password) {
  if (ssid.length() == 0) {
    return false;
  }

  Serial.print("Wi-Fi deneniyor: ");
  Serial.println(ssid);
  showLcd("Wi-Fi baglaniyor", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid.c_str(), password.c_str());

  unsigned long connectStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - connectStart < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi baglandi. IP: ");
    Serial.println(WiFi.localIP());
    showLcd("Wi-Fi baglandi", WiFi.localIP().toString());
    setStatusLed(true, false);
    delay(700);
    setStatusLed(false, false);
    return true;
  }

  Serial.println("Wi-Fi baglantisi kurulamadi.");
  WiFi.disconnect(true);
  delay(300);
  return false;
}

void connectWifiIfNeeded() {
  if (isConfigPortalActive || WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastWifiAttemptAt < WIFI_RETRY_MS) {
    return;
  }

  lastWifiAttemptAt = now;
  if (!tryConnectWifi(savedWifiSsid, savedWifiPassword)) {
    startConfigPortal();
  }
}

bool postJson(const String& path, const String& payload, String& response, int& statusCode) {
  if (WiFi.status() != WL_CONNECTED || apiBaseUrl.length() == 0) {
    statusCode = -1;
    return false;
  }

  String endpoint = apiBaseUrl + path;
  HTTPClient http;
  WiFiClient client;
  WiFiClientSecure secureClient;

  if (!beginHttp(http, client, secureClient, endpoint)) {
    statusCode = -2;
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Connection", "close");
  http.setTimeout(5000);
  http.setReuse(false);

  statusCode = http.POST(payload);
  response = statusCode > 0 ? http.getString() : "";
  http.end();

  return statusCode > 0;
}

bool sendHeartbeat() {
  StaticJsonDocument<256> requestBody;
  requestBody["secretKey"] = deviceSecretKey;
  requestBody["macAddress"] = getMacAddress();
  requestBody["ipAddress"] = WiFi.localIP().toString();

  String payload;
  serializeJson(requestBody, payload);

  String response;
  int statusCode = 0;
  bool ok = postJson("/api/device/heartbeat", payload, response, statusCode) && statusCode == 200;

  if (ok) {
    Serial.println("Heartbeat OK");
    return true;
  }

  Serial.print("Heartbeat hata: ");
  Serial.println(statusCode);
  return false;
}

String uidToString(MFRC522::Uid* uid) {
  String cardId = "";
  for (byte i = 0; i < uid->size; i++) {
    if (uid->uidByte[i] < 0x10) {
      cardId += "0";
    }
    cardId += String(uid->uidByte[i], HEX);
  }
  cardId.toUpperCase();
  return cardId;
}

String movementLabel(const String& type) {
  if (type == "ENTRY") return "Giris";
  if (type == "EXIT") return "Cikis";
  if (type == "BREAK_START") return "Mola giris";
  if (type == "BREAK_END") return "Mola cikis";
  if (type == "MEAL_START") return "Yemek giris";
  if (type == "MEAL_END") return "Yemek cikis";
  return type;
}

void handleCardScan(const String& cardId) {
  showLcd("Kart okunuyor", cardId);

  StaticJsonDocument<256> requestBody;
  requestBody["secretKey"] = deviceSecretKey;
  requestBody["rfidCardId"] = cardId;
  requestBody["macAddress"] = getMacAddress();
  requestBody["ipAddress"] = WiFi.localIP().toString();

  String payload;
  serializeJson(requestBody, payload);

  String response;
  int statusCode = 0;
  bool requestOk = postJson("/api/device/rfid/scan", payload, response, statusCode);

  if (!requestOk) {
    showLcd("API baglanti", "hatasi");
    errorSignal();
    showLcd("Kart bekleniyor", WiFi.localIP().toString());
    return;
  }

  StaticJsonDocument<768> responseJson;
  DeserializationError error = deserializeJson(responseJson, response);
  if (error) {
    showLcd("JSON hatasi", String(statusCode));
    errorSignal();
    showLcd("Kart bekleniyor", WiFi.localIP().toString());
    return;
  }

  if (statusCode != 200 || !responseJson["success"]) {
    const char* apiError = responseJson["error"] | "Kart reddedildi";
    showLcd("Islem basarisiz", String(apiError));
    errorSignal();
    showLcd("Kart bekleniyor", WiFi.localIP().toString());
    return;
  }

  const char* firstName = responseJson["employee"]["firstName"] | "";
  const char* lastName = responseJson["employee"]["lastName"] | "";
  const char* type = responseJson["type"] | "";
  String employeeName = String(firstName) + " " + String(lastName);
  employeeName.trim();

  showLcd(employeeName.length() > 0 ? employeeName : "Personel OK", movementLabel(String(type)));
  successSignal();
  showLcd("Kart bekleniyor", WiFi.localIP().toString());
}

void readRfidIfAvailable() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  String cardId = uidToString(&rfid.uid);
  unsigned long now = millis();

  if (cardId == lastCardId && now - lastCardReadAt < RFID_DEBOUNCE_MS) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastCardId = cardId;
  lastCardReadAt = now;

  Serial.print("RFID kart: ");
  Serial.println(cardId);
  handleCardScan(cardId);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  setStatusLed(false, false);

  lcd.begin(LCD_COLUMNS, LCD_ROWS);
  showLcd("RFID Personel", "Baslatiliyor");

  SPI.begin();
  rfid.PCD_Init();

  loadConfig();
  apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  if (deviceSecretKey.length() == 0 || !tryConnectWifi(savedWifiSsid, savedWifiPassword)) {
    startConfigPortal();
    return;
  }

  sendHeartbeat();
  showLcd("Kart bekleniyor", WiFi.localIP().toString());
}

void loop() {
  if (isConfigPortalActive) {
    dnsServer.processNextRequest();
    configServer.handleClient();
    delay(10);
    return;
  }

  connectWifiIfNeeded();

  if (WiFi.status() == WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatAt = now;
      sendHeartbeat();
    }

    readRfidIfAvailable();
  }

  delay(30);
}
