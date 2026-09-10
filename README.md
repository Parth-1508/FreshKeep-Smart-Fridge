# 🥬 FreshKeep: Smart Food Expiry Management System

FreshKeep is a full-stack IoT & AI ecosystem designed to tackle household food waste. It features an offline-first React Native mobile application integrated with a custom ESP8266-powered smart fridge magnet, providing real-time, passive alerts before groceries expire.

---

## 🚀 Key Features

* **Kira AI Voice & Text Assistant:** Powered by **Gemini 3.6 Flash** for frictionless voice logging, natural speech context comprehension, and automated inventory actions.
* **Centralized Multi-Key Rotation Engine:** Centralized API service in `src/services/geminiService.js` with automatic round-robin rotation across **8 burner API keys** for 100% uptime and zero rate-limit downtime.
* **Indian Packaging OCR & Date Engine:** Vision AI specialized in parsing Indian dot-matrix packaging manufacturing dates (`PKD`, `MFG`, `USE BY X DAYS FROM PKG`, `BEST BEFORE X MONTHS`) and auto-calculating exact expiry timestamps (`YYYY-MM-DD`).
* **Real-Time IoT Synchronization:** Mobile app communicates directly with an ESP8266 microcontroller via Firebase Realtime Database to update the physical fridge magnet display in milliseconds.
* **Smart AI Recipe Generator:** Analyzes expiring inventory and assumes household Indian pantry staples (mustard seeds, turmeric, oil, salt) to suggest zero-waste meals.
* **Offline-First Architecture:** Built to function seamlessly without internet using `AsyncStorage` local caching backed up to Firebase Firestore.
* **Standalone Release APK:** Pre-compiled standalone Android APK build available in Releases (`v2.0.0`).

---

## 💻 Tech Stack

**Frontend (Mobile App):**
* React Native (Expo SDK 55)
* React Navigation (Stack & Bottom Tabs)
* Context API (State Management)
* Expo AV & Speech (Voice UI)

**AI & Backend Cloud:**
* **Google Gemini 3.6 Flash API** (Multi-modal Vision & Natural Language with strict `responseSchema`)
* Firebase Firestore (Cloud Backups & User Profiles)
* Firebase Realtime Database (IoT Hardware Bridge)

**Hardware (IoT Fridge Magnet):**
* NodeMCU ESP8266
* 3.5" TFT Display (ILI9488)
* C++ / Arduino Framework

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Parth-1508/FreshKeep-Smart-Fridge.git
   ```

2. **Navigate to the app directory:**
   ```bash
   cd FreshKeep-App
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in `FreshKeep-App/`:
   ```env
   EXPO_PUBLIC_GEMINI_KEYS="your_gemini_api_key_1,your_gemini_api_key_2"
   ```

5. **Run the App:**
   - **Via Expo Go (Mobile Phone):**
     ```bash
     npx expo start --go
     ```
   - **Local Android Release Build:**
     ```bash
     npx expo run:android --variant release
     ```

---

## 📦 Releases & Downloads
Download the latest standalone `.apk` directly from the **[GitHub Releases Page](https://github.com/Parth-1508/FreshKeep-Smart-Fridge/releases)** (Tag `v2.0.0`).

---

## 👨‍💻 Credits & Development
**Software Architecture, App Development & AI Integration:** Engineered entirely by Parth Pate. 
**Hardware Assembly & Research:** Physical hardware assembly and Design Thinking research collaborated with Utkarsh Tushti and Parth Pawar for the MIT-ADT Pratibhuti 3.0 Exhibition.
