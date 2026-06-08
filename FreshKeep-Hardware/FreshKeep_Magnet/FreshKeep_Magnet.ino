#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <TFT_eSPI.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ================= CREDENTIALS =================
// REPLACE THESE WITH YOUR ACTUAL CREDENTIALS BEFORE FLASHING TO THE BOARD
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "freshkeep-612df-default-rtdb.asia-southeast1.firebasedatabase.app"

// ================= PINS =================
#define BUZZER_PIN 2 // D4

TFT_eSPI tft = TFT_eSPI();
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000); // IST (+5:30)

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastFirebaseFetch = 0;

String itemName = "Loading...";
String itemEmoji = "-";
int daysLeft = 99;

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);
  beep(100);

  tft.init();
  tft.setRotation(1); // Landscape mode
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Connecting to WiFi...", 20, 20, 4);

  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  timeClient.begin();

  // ================= NEW FIREBASE AUTH SETUP =================
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Assign the token status callback (from TokenHelper.h)
  config.token_status_callback = tokenStatusCallback; 

  Serial.println("Getting Firebase Guest Token...");
  // Sign up anonymously to generate the required access token
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Guest Token generated successfully!");
  } else {
    Serial.printf("Token Error: %s\n", config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  // ==========================================================

  beep(200);
  forceRefreshData(); // Initial data pull
}

void loop() {
  timeClient.update();
  
  // Since the screen is always on, we update the clock constantly
  drawTopBar();

  // Fetch from Firebase every 15 seconds
  if (millis() - lastFirebaseFetch > 15000) {
    forceRefreshData();
    lastFirebaseFetch = millis();
  }
}

// ================= FIREBASE FETCH =================
void forceRefreshData() {
  Serial.println("--- Fetching from Firebase ---");
  
  // Fetch Name
  if (Firebase.RTDB.getString(&fbdo, "/fridge/urgentItem/name")) {
    itemName = fbdo.stringData();
    Serial.println("Name fetched: " + itemName);
  } else {
    Serial.println("Failed to fetch Item Name. Reason: " + fbdo.errorReason());
  }

  // Fetch Emoji
  if (Firebase.RTDB.getString(&fbdo, "/fridge/urgentItem/emoji")) {
    itemEmoji = fbdo.stringData();
    Serial.println("Emoji fetched: " + itemEmoji);
  } else {
    Serial.println("Failed to fetch Emoji. Reason: " + fbdo.errorReason());
  }

  // Fetch Days Left
  if (Firebase.RTDB.getInt(&fbdo, "/fridge/urgentItem/daysLeft")) {
    daysLeft = fbdo.intData();
    Serial.println("Days Left fetched: " + String(daysLeft));
  } else {
    Serial.println("Failed to fetch Days Left. Reason: " + fbdo.errorReason());
  }
  
  Serial.println("------------------------------");
  drawUI(); // Redraw the whole screen when new data arrives
}

// ================= DISPLAY LOGIC =================
void drawUI() {
  tft.fillScreen(TFT_BLACK);
  drawTopBar();
  tft.setTextDatum(MC_DATUM); // Middle-Center alignment

  if (daysLeft <= 0) {
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.drawString("EXPIRED TODAY!", 240, 120, 4);
    tft.drawString(itemEmoji + " " + itemName, 240, 170, 4);
    beep(50); 
  } 
  else if (daysLeft <= 3) {
    tft.setTextColor(TFT_ORANGE, TFT_BLACK);
    tft.drawString("USE SOON", 240, 120, 4);
    tft.drawString(itemEmoji + " " + itemName, 240, 170, 4);
  } 
  else if (daysLeft != 99) { // 99 is our default "Loading" state
    tft.setTextColor(TFT_GREEN, TFT_BLACK);
    tft.drawString("ALL FRESH!", 240, 120, 4);
    tft.drawString("No items expiring soon.", 240, 170, 4);
  }
}

void drawTopBar() {
  tft.fillRect(0, 0, 480, 30, tft.color565(30, 30, 30)); // Dark grey bar
  tft.setTextDatum(TL_DATUM); // Top-Left alignment
  tft.setTextColor(TFT_WHITE, tft.color565(30, 30, 30));
  tft.drawString(timeClient.getFormattedTime(), 10, 5, 4);
}

// ================= BUZZER =================
void beep(int duration) {
  digitalWrite(BUZZER_PIN, LOW);
  delay(duration);
  digitalWrite(BUZZER_PIN, HIGH);
}