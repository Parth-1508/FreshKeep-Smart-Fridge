# 🧲 FreshKeep: Smart Fridge Magnet (ESP8266)

This folder contains the Arduino C++ code for the hardware component of the **FreshKeep** ecosystem. It runs on a NodeMCU ESP8266 and acts as a passive smart display for your fridge, pulling real-time food expiry data from Firebase and alerting you before items go bad.

## ✨ Features
* **Real-Time Cloud Sync:** Connects to Firebase Realtime Database (RTDB) to instantly display the most urgent item from the FreshKeep mobile app.
* **Color-Coded TFT Display:** Uses an ILI9488 3.5" screen to show Green (Fresh), Orange (Expiring Soon), or Red (Expired) statuses.
* **Audio Alerts:** Triggers an active buzzer when an item officially expires.
* **Live Clock:** Fetches network time via NTP to display a live digital clock on the top bar.

## 🛠️ Hardware Requirements
* **NodeMCU ESP8266** (Development Board)
* **3.5" TFT LCD Screen** (ILI9488 SPI driver)
* **Active Buzzer Module**
* Jumper wires & Breadboard (or custom PCB)
* *Note: A 5V wall charger is recommended over USB power to prevent screen flickering during WiFi transmission.*

## 🔌 Wiring & Pinout Guide

### Buzzer Module
| Buzzer Pin | NodeMCU ESP8266 |
| :--- | :--- |
| Signal / I/O | **D4 (GPIO 2)** |
| VCC | 3V3 |
| GND | GND |

### ILI9488 TFT Display (SPI)
*Note: This relies on the standard ESP8266 Hardware SPI pins.*
| Display Pin | NodeMCU ESP8266 |
| :--- | :--- |
| VCC | 3V3 (or VIN for more power) |
| GND | GND |
| CS | D8 (GPIO 15) |
| RESET | RST (or 3V3) |
| DC / RS | D3 (GPIO 0) |
| SDI / MOSI | D7 (GPIO 13) |
| SCK / CLK | D5 (GPIO 14) |
| LED / BL | 3V3 (or VIN) |
| SDO / MISO | D6 (GPIO 12) |

## 💻 Arduino IDE Setup
To compile and flash this code, you will need the Arduino IDE configured for the ESP8266 platform.

### 1. Required Libraries
Install the following via the Arduino Library Manager:
* **Firebase ESP Client** (by Mobizt) - *Handles the RTDB connection.*
* **TFT_eSPI** (by Bodmer) - *Drives the display.*
* **NTPClient** (by Fabrice Weinberg) - *Fetches the live time.*

### 2. Configure TFT_eSPI
Before uploading, you **must** configure the `TFT_eSPI` library for the ILI9488 screen:
1. Navigate to your Arduino libraries folder (usually `Documents/Arduino/libraries/TFT_eSPI`).
2. Open `User_Setup.h`.
3. Comment out the default driver, and uncomment `#define ILI9488_DRIVER`.
4. Ensure the SPI pins defined in the file match the wiring guide above.

### 3. Add Your Credentials
Open `FreshKeep_Magnet.ino` and update the top section with your specific credentials before flashing:
```cpp
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "your-project-default-rtdb.asia-southeast1.firebasedatabase.app"