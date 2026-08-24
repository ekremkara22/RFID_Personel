#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <qrcode.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C
#define WIFI_STATUS_LED_PIN 5

const char* DEFAULT_WIFI_SSID = "";
const char* DEFAULT_WIFI_PASSWORD = "";

const char* API_BASE_URL = "https://flodeka.com";
const char* DEVICE_SECRET_KEY = "489cc5a0-db71-4b07-a0d5-2080a1cde546";

const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
const unsigned long SYNC_INTERVAL_MS = 1000;
const byte DNS_PORT = 53;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Preferences preferences;
WebServer configServer(80);
DNSServer dnsServer;

String currentQrToken = "";
String currentDeviceName = "";
String savedWifiSsid = "";
String savedWifiPassword = "";
String setupApSsid = "";
unsigned long lastWifiAttemptAt = 0;
unsigned long lastSyncAt = 0;
bool hasRenderedQr = false;
bool isConfigPortalActive = false;

void updateWifiStatusLed() {
  digitalWrite(WIFI_STATUS_LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}

bool isHttpsUrl(const String& url) {
  return url.startsWith("https://");
}

String htmlEscape(const String& value) {
  String escaped = value;
  escaped.replace("&", "&amp;");
  escaped.replace("<", "&lt;");
  escaped.replace(">", "&gt;");
  escaped.replace("\"", "&quot;");
  return escaped;
}

String getApSsid() {
  uint64_t chipId = ESP.getEfuseMac();
  char suffix[7];
  snprintf(suffix, sizeof(suffix), "%06X", (uint32_t)(chipId & 0xFFFFFF));
  return "CheckInQR-" + String(suffix);
}

void loadWifiCredentials() {
  preferences.begin("checkinqr", true);
  savedWifiSsid = preferences.getString("wifi_ssid", DEFAULT_WIFI_SSID);
  savedWifiPassword = preferences.getString("wifi_pass", DEFAULT_WIFI_PASSWORD);
  preferences.end();
}

void saveWifiCredentials(const String& ssid, const String& password) {
  preferences.begin("checkinqr", false);
  preferences.putString("wifi_ssid", ssid);
  preferences.putString("wifi_pass", password);
  preferences.end();
  savedWifiSsid = ssid;
  savedWifiPassword = password;
}

void drawCenteredText(const String& text, int y, int textSize) {
  display.setTextSize(textSize);
  display.setTextColor(SSD1306_WHITE);

  int16_t x1;
  int16_t y1;
  uint16_t width;
  uint16_t height;
  display.getTextBounds(text, 0, y, &x1, &y1, &width, &height);
  int x = (SCREEN_WIDTH - width) / 2;
  display.setCursor(x, y);
  display.print(text);
}

void drawStatusScreen(const String& title, const String& line1 = "", const String& line2 = "") {
  display.clearDisplay();
  drawCenteredText(title, 8, 1);

  if (line1.length() > 0) {
    drawCenteredText(line1, 28, 1);
  }

  if (line2.length() > 0) {
    drawCenteredText(line2, 44, 1);
  }

  display.display();
}

void drawConfigPortalScreen() {
  drawStatusScreen("Wi-Fi Kurulum", setupApSsid, "IP: 192.168.4.1");
}

void drawFooterStatus(const String& text) {
  display.fillRect(0, 52, SCREEN_WIDTH, 12, SSD1306_BLACK);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 54);
  display.print(text);
  display.display();
}

void drawQrCode(const String& token) {
  display.clearDisplay();
  display.fillScreen(SSD1306_WHITE);

  QRCode qrcode;
  const uint8_t qrVersion = token.length() <= 17 ? 1 : (token.length() <= 32 ? 2 : 4);
  uint8_t qrcodeData[qrcode_getBufferSize(4)];
  int8_t qrResult = qrcode_initText(&qrcode, qrcodeData, qrVersion, ECC_LOW, token.c_str());

  if (qrResult < 0) {
    display.clearDisplay();
    drawStatusScreen("QR hatasi", "Token cok uzun");
    hasRenderedQr = false;
    return;
  }

  const int qrSize = qrcode.size;
  const bool showDeviceName = qrSize * 2 <= 50;
  const int usableHeight = showDeviceName ? 52 : SCREEN_HEIGHT;
  const int scale = (qrSize * 2 <= usableHeight - 2) ? 2 : 1;
  const int qrPixelSize = qrSize * scale;
  const int xOffset = (SCREEN_WIDTH - qrPixelSize) / 2;
  const int yOffset = (usableHeight - qrPixelSize) / 2;

  for (int y = 0; y < qrSize; y++) {
    for (int x = 0; x < qrSize; x++) {
      if (qrcode_getModule(&qrcode, x, y)) {
        display.fillRect(xOffset + (x * scale), yOffset + (y * scale), scale, scale, SSD1306_BLACK);
      }
    }
  }

  if (showDeviceName) {
    display.fillRect(0, 52, SCREEN_WIDTH, 12, SSD1306_BLACK);
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 54);
    display.print(currentDeviceName.length() > 0 ? currentDeviceName : "CheckInQR Device");
  }

  display.display();
  hasRenderedQr = true;
}

bool tryConnectWifi(const String& ssid, const String& password) {
  if (ssid.length() == 0) {
    return false;
  }

  Serial.print("Wi-Fi deneniyor: ");
  Serial.println(ssid);
  drawStatusScreen("Wi-Fi baglaniliyor", ssid);

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
    updateWifiStatusLed();
    drawStatusScreen("Wi-Fi baglandi", WiFi.localIP().toString());
    delay(900);
    return true;
  }

  Serial.println("Wi-Fi baglantisi kurulamadi.");
  WiFi.disconnect(true);
  updateWifiStatusLed();
  delay(300);
  return false;
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
  html += "<title>CheckInQR Wi-Fi Kurulum</title>";
  html += "<style>body{margin:0;font-family:Arial,sans-serif;background:#0f172a;color:#0f172a}";
  html += ".wrap{max-width:520px;margin:0 auto;padding:24px}.card{background:#fff;border-radius:10px;padding:22px}";
  html += "h1{font-size:24px;margin:0 0 8px}p{color:#475569;line-height:1.5}label{display:block;margin-top:14px;font-weight:700}";
  html += "select,input,button{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:6px;border:1px solid #cbd5e1;font-size:16px}";
  html += "button{background:#0284c7;color:#fff;border:0;font-weight:700;margin-top:18px}.hint{font-size:13px;color:#64748b}</style></head><body>";
  html += "<main class=\"wrap\"><section class=\"card\"><h1>CheckInQR Wi-Fi Kurulum</h1>";
  html += "<p>ESP32'nin baglanacagi Wi-Fi agini secin ve sifresini girin. Kayit sonrasi cihazdaki reset tusuna basin.</p>";
  html += "<form method=\"post\" action=\"/save\"><label>Wi-Fi Agi</label><select name=\"ssid\" required>";
  html += buildWifiOptionsHtml();
  html += "</select><label>Wi-Fi Sifresi</label><input name=\"password\" type=\"password\" autocomplete=\"current-password\">";
  html += "<button type=\"submit\">Kaydet</button></form><p class=\"hint\">Bu ekran acilmazsa tarayicida 192.168.4.1 adresini acin.</p>";
  html += "</section></main></body></html>";
  configServer.send(200, "text/html; charset=utf-8", html);
}

void handleConfigSave() {
  String ssid = configServer.arg("ssid");
  String password = configServer.arg("password");

  if (ssid.length() == 0) {
    configServer.send(400, "text/plain; charset=utf-8", "Wi-Fi agi secilmedi.");
    return;
  }

  saveWifiCredentials(ssid, password);
  drawStatusScreen("Wi-Fi kaydedildi", ssid, "Reset tusuna basin");

  String html = "<!doctype html><html lang=\"tr\"><head><meta charset=\"utf-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  html += "<title>Kaydedildi</title><style>body{font-family:Arial,sans-serif;background:#0f172a;color:#fff;padding:24px}";
  html += ".card{max-width:520px;margin:0 auto;background:#fff;color:#0f172a;border-radius:10px;padding:22px}</style></head><body>";
  html += "<section class=\"card\"><h1>Wi-Fi bilgisi kaydedildi</h1><p>ESP32 uzerindeki reset tusuna basin. Cihaz yeni Wi-Fi bilgisi ile acilacak.</p></section>";
  html += "</body></html>";
  configServer.send(200, "text/html; charset=utf-8", html);
}

void handleConfigNotFound() {
  configServer.sendHeader("Location", "/", true);
  configServer.send(302, "text/plain", "");
}

void startConfigPortal() {
  isConfigPortalActive = true;
  setupApSsid = getApSsid();

  WiFi.disconnect(true);
  updateWifiStatusLed();
  delay(300);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(setupApSsid.c_str());

  IPAddress apIp = WiFi.softAPIP();
  dnsServer.start(DNS_PORT, "*", apIp);

  configServer.on("/", HTTP_GET, handleConfigRoot);
  configServer.on("/save", HTTP_POST, handleConfigSave);
  configServer.onNotFound(handleConfigNotFound);
  configServer.begin();

  Serial.print("Kurulum AP acildi: ");
  Serial.println(setupApSsid);
  Serial.print("Kurulum IP: ");
  Serial.println(apIp);
  drawConfigPortalScreen();
}

void connectWifiIfNeeded() {
  if (isConfigPortalActive) {
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastWifiAttemptAt < WIFI_RETRY_MS) {
    return;
  }

  lastWifiAttemptAt = now;
  if (!hasRenderedQr) {
    drawStatusScreen("Wi-Fi baglaniliyor", savedWifiSsid);
  } else {
    drawFooterStatus("Wi-Fi baglaniyor");
  }

  if (!tryConnectWifi(savedWifiSsid, savedWifiPassword)) {
    if (!hasRenderedQr) {
      drawStatusScreen("Wi-Fi hatasi", "Baglanti kurulamadi");
    } else {
      drawFooterStatus("Wi-Fi hatasi");
    }
    startConfigPortal();
  }
}

bool syncQrToken() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  String endpoint = String(API_BASE_URL) + "/api/device/qr/sync";
  HTTPClient http;

  WiFiClient client;
  WiFiClientSecure secureClient;

  bool beginOk = false;
  if (isHttpsUrl(endpoint)) {
    secureClient.setInsecure();
    beginOk = http.begin(secureClient, endpoint);
  } else {
    beginOk = http.begin(client, endpoint);
  }

  if (!beginOk) {
    drawStatusScreen("API hatasi", "HTTP baslatilamadi");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Connection", "close");
  http.setTimeout(4000);
  http.setReuse(false);

  StaticJsonDocument<128> requestBody;
  requestBody["secretKey"] = DEVICE_SECRET_KEY;

  String payload;
  serializeJson(requestBody, payload);

  int statusCode = http.POST(payload);
  if (statusCode <= 0) {
    Serial.print("API istegi basarisiz. Kod: ");
    Serial.println(statusCode);
    if (!hasRenderedQr) {
      drawStatusScreen("API hatasi", "Istek gonderilemedi", String(statusCode));
    } else {
      drawFooterStatus("Sync hatasi: " + String(statusCode));
    }
    http.end();
    return false;
  }

  String response = http.getString();
  http.end();

  if (statusCode != 200) {
    Serial.print("HTTP hata kodu: ");
    Serial.println(statusCode);
    if (!hasRenderedQr) {
      drawStatusScreen("Sync hatasi", "HTTP " + String(statusCode));
    } else {
      drawFooterStatus("HTTP " + String(statusCode));
    }
    return false;
  }

  StaticJsonDocument<512> responseJson;
  DeserializationError error = deserializeJson(responseJson, response);
  if (error) {
    Serial.print("JSON parse hatasi: ");
    Serial.println(error.c_str());
    if (!hasRenderedQr) {
      drawStatusScreen("JSON hatasi", error.c_str());
    } else {
      drawFooterStatus("JSON hatasi");
    }
    return false;
  }

  const char* qrToken = responseJson["qrToken"] | "";
  const char* deviceName = responseJson["deviceName"] | "CheckInQR Device";

  currentDeviceName = String(deviceName);

  if (String(qrToken).length() == 0) {
    if (!hasRenderedQr) {
      drawStatusScreen("QR bekleniyor", currentDeviceName);
    } else {
      drawFooterStatus("QR bekleniyor");
    }
    currentQrToken = "";
    return false;
  }

  if (currentQrToken != String(qrToken)) {
    currentQrToken = String(qrToken);
    drawQrCode(currentQrToken);
  }

  return true;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(WIFI_STATUS_LED_PIN, OUTPUT);
  digitalWrite(WIFI_STATUS_LED_PIN, LOW);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED baslatilamadi.");
    while (true) {
      delay(1000);
    }
  }

  display.clearDisplay();
  display.display();

  drawStatusScreen("CheckInQR", "ESP32 basladi");
  delay(1000);

  loadWifiCredentials();
  if (!tryConnectWifi(savedWifiSsid, savedWifiPassword)) {
    startConfigPortal();
  }
}

void loop() {
  if (isConfigPortalActive) {
    updateWifiStatusLed();
    dnsServer.processNextRequest();
    configServer.handleClient();
    delay(10);
    return;
  }

  connectWifiIfNeeded();
  updateWifiStatusLed();

  unsigned long now = millis();
  if (now - lastSyncAt >= SYNC_INTERVAL_MS) {
    lastSyncAt = now;
    syncQrToken();
  }

  delay(50);
}
