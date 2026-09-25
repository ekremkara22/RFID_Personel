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
#include <Update.h>
#include <SHA2Builder.h>
#include <time.h>

// ESP32 pinleri. Kendi baglantina gore burayi degistirebilirsin.
#define RFID_SS_PIN 5
#define RFID_RST_PIN 27
#define GREEN_LED_PIN 26
#define RED_LED_PIN 33
#define BUZZER_PIN 14

// Donusturucusuz 2x16 paralel LCD (4-bit mod)
#define LCD_RS_PIN 32
#define LCD_ENABLE_PIN 25
#define LCD_D4_PIN 22
#define LCD_D5_PIN 21
#define LCD_D6_PIN 16
#define LCD_D7_PIN 17

#define LCD_COLUMNS 16
#define LCD_ROWS 2

const char* FIRMWARE_VERSION = "1.0.0";
const char* DEFAULT_API_BASE_URL = "https://flodeska.com";
const char* DEFAULT_DEVICE_SECRET_KEY = "";
const bool FORCE_DEFAULT_API_BASE_URL = false;

const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
const unsigned long CONFIG_PORTAL_WIFI_RETRY_MS = 5UL * 60UL * 1000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long RFID_DEBOUNCE_MS = 2500;
const unsigned long OTA_CHECK_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;
const unsigned long OTA_RETRY_INTERVAL_MS = 5UL * 60UL * 1000UL;
const unsigned long OTA_INITIAL_CHECK_DELAY_MS = 30UL * 1000UL;
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
bool configPortalRoutesRegistered = false;
unsigned long lastWifiAttemptAt = 0;
unsigned long lastConfigPortalWifiAttemptAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastCardReadAt = 0;
unsigned long nextFirmwareCheckAt = OTA_INITIAL_CHECK_DELAY_MS;
int lastDisplayedSecond = -1;
bool idleClockActive = false;
bool otaInProgress = false;
bool bootOtaResultReported = false;

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
  idleClockActive = false;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(fitLcdText(line1));
  lcd.setCursor(0, 1);
  lcd.print(fitLcdText(line2));
}

void showIdleClock(bool forceRefresh = false) {
  struct tm timeInfo;
  if (!getLocalTime(&timeInfo, 20)) {
    if (forceRefresh || !idleClockActive) {
      showLcd("Kart bekleniyor", "Saat bekleniyor");
      idleClockActive = true;
    }
    return;
  }

  if (!forceRefresh && idleClockActive && timeInfo.tm_sec == lastDisplayedSecond) {
    return;
  }

  char timeText[9];
  strftime(timeText, sizeof(timeText), "%H:%M:%S", &timeInfo);
  if (forceRefresh || !idleClockActive) {
    showLcd("Kart bekleniyor", String(timeText));
  } else {
    lcd.setCursor(0, 1);
    lcd.print("                ");
    lcd.setCursor(0, 1);
    lcd.print(timeText);
  }
  idleClockActive = true;
  lastDisplayedSecond = timeInfo.tm_sec;
}

void setStatusLed(bool green, bool red) {
  digitalWrite(GREEN_LED_PIN, green ? HIGH : LOW);
  digitalWrite(RED_LED_PIN, red ? HIGH : LOW);
}

void beep(unsigned int durationMs = 110) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(durationMs);
  digitalWrite(BUZZER_PIN, LOW);
}

void successSignal() {
  setStatusLed(true, false);
  beep(65);
  delay(65);
  beep(65);
  setStatusLed(false, false);
}

void errorSignal() {
  setStatusLed(false, true);
  beep(260);
  delay(180);
  beep(260);
  setStatusLed(false, false);
}

void unknownCardSignal() {
  setStatusLed(false, true);
  beep(650);
  delay(180);
  beep(100);
  delay(90);
  beep(100);
  delay(90);
  beep(100);
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
  setupApSsid = getApSsid();

  dnsServer.stop();
  configServer.stop();
  WiFi.disconnect(true);
  delay(300);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(setupApSsid.c_str());

  IPAddress apIp = WiFi.softAPIP();
  dnsServer.start(DNS_PORT, "*", apIp);

  if (!configPortalRoutesRegistered) {
    configServer.on("/", HTTP_GET, handleConfigRoot);
    configServer.on("/save", HTTP_POST, handleConfigSave);
    configServer.onNotFound(handleConfigNotFound);
    configPortalRoutesRegistered = true;
  }
  configServer.begin();
  isConfigPortalActive = true;
  lastConfigPortalWifiAttemptAt = millis();

  Serial.print("Kurulum AP: ");
  Serial.println(setupApSsid);
  Serial.print("Kurulum IP: ");
  Serial.println(apIp);
  showLcd(setupApSsid, "192.168.4.1");
}

void stopConfigPortal() {
  dnsServer.stop();
  configServer.stop();
  WiFi.softAPdisconnect(true);
  isConfigPortalActive = false;
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
    configTime(3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    return true;
  }

  Serial.println("Wi-Fi baglantisi kurulamadi.");
  WiFi.disconnect(true);
  delay(300);
  return false;
}

void retrySavedWifiFromConfigPortal() {
  if (!isConfigPortalActive || savedWifiSsid.length() == 0) {
    return;
  }

  unsigned long now = millis();
  if (now - lastConfigPortalWifiAttemptAt < CONFIG_PORTAL_WIFI_RETRY_MS) {
    return;
  }

  lastConfigPortalWifiAttemptAt = now;
  Serial.println("Kurulum modunda kayitli Wi-Fi yeniden deneniyor.");
  stopConfigPortal();

  if (tryConnectWifi(savedWifiSsid, savedWifiPassword)) {
    Serial.println("Kayitli Wi-Fi geri geldi. Normal moda gecildi.");
    lastHeartbeatAt = 0;
    showIdleClock(true);
    return;
  }

  Serial.println("Kayitli Wi-Fi hala kullanilamiyor. Kurulum AP yeniden aciliyor.");
  startConfigPortal();
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
  requestBody["firmwareVersion"] = FIRMWARE_VERSION;

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

bool reportFirmwareStatus(long deploymentId, const String& status, const String& errorMessage = "") {
  StaticJsonDocument<512> requestBody;
  requestBody["secretKey"] = deviceSecretKey;
  requestBody["deploymentId"] = deploymentId;
  requestBody["status"] = status;
  requestBody["currentVersion"] = FIRMWARE_VERSION;
  if (errorMessage.length() > 0) requestBody["error"] = errorMessage;

  String payload;
  serializeJson(requestBody, payload);
  String response;
  int statusCode = 0;
  return postJson("/api/device/firmware/status", payload, response, statusCode) && statusCode == 200;
}

void savePendingOta(long deploymentId, const String& targetVersion) {
  preferences.begin("rfidpdks", false);
  preferences.putLong("ota_deploy", deploymentId);
  preferences.putString("ota_target", targetVersion);
  preferences.end();
}

void clearPendingOta() {
  preferences.begin("rfidpdks", false);
  preferences.remove("ota_deploy");
  preferences.remove("ota_target");
  preferences.end();
}

void reportBootFirmwareResult() {
  preferences.begin("rfidpdks", true);
  long deploymentId = preferences.getLong("ota_deploy", 0);
  String targetVersion = preferences.getString("ota_target", "");
  preferences.end();

  if (deploymentId <= 0 || targetVersion.length() == 0) return;

  if (targetVersion == FIRMWARE_VERSION) {
    reportFirmwareStatus(deploymentId, "INSTALLED");
  } else {
    reportFirmwareStatus(deploymentId, "FAILED", "Cihaz hedef firmware ile acilmadi; onceki surum calisiyor.");
  }
  clearPendingOta();
}

String absoluteFirmwareUrl(const String& url) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return apiBaseUrl + url;
  return apiBaseUrl + "/" + url;
}

bool installFirmware(long deploymentId, const String& targetVersion, const String& downloadUrl,
                     size_t expectedSize, String expectedSha256) {
  otaInProgress = true;
  showLcd("Yazilim", "indiriliyor");
  reportFirmwareStatus(deploymentId, "DOWNLOADING");

  HTTPClient http;
  WiFiClient client;
  WiFiClientSecure secureClient;
  String endpoint = absoluteFirmwareUrl(downloadUrl);
  if (!beginHttp(http, client, secureClient, endpoint)) {
    reportFirmwareStatus(deploymentId, "FAILED", "Firmware indirme baglantisi acilamadi.");
    otaInProgress = false;
    return false;
  }

  http.setTimeout(60000);
  http.setReuse(false);
  int statusCode = http.GET();
  int contentLength = http.getSize();
  if (statusCode != 200 || contentLength <= 0 || (expectedSize > 0 && (size_t)contentLength != expectedSize)) {
    String errorMessage = "Firmware indirme HTTP hatasi: " + String(statusCode);
    http.end();
    reportFirmwareStatus(deploymentId, "FAILED", errorMessage);
    otaInProgress = false;
    return false;
  }

  if (!Update.begin((size_t)contentLength, U_FLASH)) {
    String errorMessage = "OTA bolumu hazirlanamadi: " + String(Update.errorString());
    http.end();
    reportFirmwareStatus(deploymentId, "FAILED", errorMessage);
    otaInProgress = false;
    return false;
  }

  SHA256Builder sha256;
  sha256.begin();
  WiFiClient* stream = http.getStreamPtr();
  uint8_t buffer[1024];
  size_t received = 0;
  unsigned long lastDataAt = millis();

  while (http.connected() && received < (size_t)contentLength) {
    size_t available = stream->available();
    if (available > 0) {
      size_t readSize = stream->readBytes(buffer, min(available, sizeof(buffer)));
      if (readSize > 0) {
        sha256.add(buffer, readSize);
        if (Update.write(buffer, readSize) != readSize) break;
        received += readSize;
        lastDataAt = millis();
      }
    } else {
      if (millis() - lastDataAt > 30000) break;
      delay(10);
    }
  }

  http.end();
  sha256.calculate();
  String actualSha256 = sha256.toString();
  actualSha256.toLowerCase();
  expectedSha256.toLowerCase();

  if (received != (size_t)contentLength || actualSha256 != expectedSha256) {
    Update.abort();
    reportFirmwareStatus(deploymentId, "FAILED", "Firmware boyutu veya SHA-256 dogrulamasi basarisiz.");
    showLcd("Guncelleme", "dogrulanamadi");
    delay(2500);
    otaInProgress = false;
    showIdleClock(true);
    return false;
  }

  savePendingOta(deploymentId, targetVersion);
  if (!Update.end()) {
    String errorMessage = "Firmware yazilamadi: " + String(Update.errorString());
    clearPendingOta();
    reportFirmwareStatus(deploymentId, "FAILED", errorMessage);
    otaInProgress = false;
    showIdleClock(true);
    return false;
  }

  showLcd("Guncelleme tamam", "Yeniden basliyor");
  delay(1500);
  ESP.restart();
  return true;
}

bool checkFirmwareUpdate() {
  StaticJsonDocument<256> requestBody;
  requestBody["secretKey"] = deviceSecretKey;
  requestBody["macAddress"] = getMacAddress();
  requestBody["currentVersion"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(requestBody, payload);
  String response;
  int statusCode = 0;
  if (!postJson("/api/device/firmware/check", payload, response, statusCode) || statusCode != 200) {
    Serial.println("OTA kontrolu basarisiz: " + String(statusCode));
    return false;
  }

  DynamicJsonDocument responseJson(1536);
  if (deserializeJson(responseJson, response)) return false;
  if (!(responseJson["updateAvailable"] | false)) return true;

  long deploymentId = responseJson["deploymentId"] | 0;
  String targetVersion = responseJson["version"] | "";
  String downloadUrl = responseJson["url"] | "";
  String sha256 = responseJson["sha256"] | "";
  size_t size = responseJson["size"] | 0;
  if (deploymentId <= 0 || targetVersion.length() == 0 || downloadUrl.length() == 0 || sha256.length() != 64 || size == 0) {
    return false;
  }

  Serial.println("Yeni firmware bulundu: " + targetVersion);
  return installFirmware(deploymentId, targetVersion, downloadUrl, size, sha256);
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
    showIdleClock(true);
    return;
  }

  StaticJsonDocument<768> responseJson;
  DeserializationError error = deserializeJson(responseJson, response);
  if (error) {
    showLcd("JSON hatasi", String(statusCode));
    errorSignal();
    showIdleClock(true);
    return;
  }

  if (statusCode != 200 || !responseJson["success"]) {
    const char* errorCode = responseJson["code"] | "";
    if (statusCode == 404 && String(errorCode) == "UNKNOWN_CARD") {
      showLcd("T.siz kart =", cardId);
      unknownCardSignal();
      delay(5780);
      showIdleClock(true);
      return;
    }

    const char* apiError = responseJson["error"] | "Kart reddedildi";
    showLcd("Islem basarisiz", String(apiError));
    errorSignal();
    showIdleClock(true);
    return;
  }

  const char* firstName = responseJson["employee"]["firstName"] | "";
  const char* lastName = responseJson["employee"]["lastName"] | "";
  String firstNameText = String(firstName);
  String lastNameText = String(lastName);
  showLcd(firstNameText.length() > 0 ? firstNameText : "Personel", lastNameText);
  successSignal();
  delay(1805);
  showIdleClock(true);
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
  pinMode(BUZZER_PIN, OUTPUT);
  setStatusLed(false, false);
  digitalWrite(BUZZER_PIN, LOW);

  lcd.begin(LCD_COLUMNS, LCD_ROWS);
  showLcd("RFID Personel", "Baslatiliyor");

  SPI.begin();
  rfid.PCD_Init();

  loadConfig();
  if (FORCE_DEFAULT_API_BASE_URL) apiBaseUrl = DEFAULT_API_BASE_URL;
  apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  if (deviceSecretKey.length() == 0 || !tryConnectWifi(savedWifiSsid, savedWifiPassword)) {
    startConfigPortal();
    return;
  }

  sendHeartbeat();
  reportBootFirmwareResult();
  bootOtaResultReported = true;
  showIdleClock(true);
}

void loop() {
  if (isConfigPortalActive) {
    dnsServer.processNextRequest();
    configServer.handleClient();
    retrySavedWifiFromConfigPortal();
    if (!isConfigPortalActive) {
      delay(30);
      return;
    }
    delay(10);
    return;
  }

  connectWifiIfNeeded();

  if (WiFi.status() == WL_CONNECTED) {
    unsigned long now = millis();
    if (!bootOtaResultReported) {
      reportBootFirmwareResult();
      bootOtaResultReported = true;
    }
    if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatAt = now;
      sendHeartbeat();
    }

    if (!otaInProgress && (long)(now - nextFirmwareCheckAt) >= 0) {
      bool checkSucceeded = checkFirmwareUpdate();
      nextFirmwareCheckAt = millis() + (checkSucceeded ? OTA_CHECK_INTERVAL_MS : OTA_RETRY_INTERVAL_MS);
    }

    if (!otaInProgress) {
      readRfidIfAvailable();
      showIdleClock();
    }
  }

  delay(30);
}
