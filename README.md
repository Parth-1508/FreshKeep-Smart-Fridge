# 🥬 FreshKeep: Smart Food Expiry Management System

FreshKeep is a full-stack IoT ecosystem designed to tackle household food waste. It features an offline-first React Native mobile application integrated with a custom ESP8266-powered smart fridge magnet, providing real-time, passive alerts before groceries expire.

## 🚀 Key Features
* **Kira AI Voice Assistant:** Integrated with Gemini 2.5 Flash to allow frictionless, voice-based grocery logging. Kira automatically parses item names and expiry dates from natural speech.
* **Real-Time IoT Synchronization:** The mobile app communicates directly with an ESP8266 microcontroller via Firebase RTDB to update the physical fridge magnet display in milliseconds.
* **Offline-First Architecture:** Built to function without internet, utilizing `AsyncStorage` for local caching and Firestore as a cloud backup.
* **Smart Expiry Algorithms:** Calculates gamified "streaks," categorizes food urgency, and triggers local push notifications at strategic intervals.
* **AI Recipe Generator:** Analyzes currently available (and expiring) ingredients to suggest zero-waste meals.

## 💻 Tech Stack
**Frontend (Mobile App):**
* React Native (Expo)
* React Navigation
* Context API (State Management)
* Expo AV & Speech (Voice UI)

**Backend & Cloud:**
* Firebase Firestore (Cloud Database)
* Firebase Realtime Database (IoT Hardware Bridge)
* Google Gemini AI API (Generative AI & Image parsing)

**Hardware (IoT Magnet):**
* NodeMCU ESP8266
* 3.5" TFT Display (ILI9488)
* C++ / Arduino Framework

## ⚙️ Installation & Setup
1. Clone the repository: `git clone https://github.com/YourUsername/FreshKeep-Smart-Fridge.git`
2. Navigate to the app directory: `cd FreshKeep-App`
3. Install dependencies: `npm install`
4. Add your API keys: Create a `Keys.js` file in the `constants` folder and add your Gemini API key. Update `firebase.js` with your Firebase config.
5. Run the app: `npx expo start`

## 👨‍💻 Credits & Development
**Software Architecture, App Development & AI Integration:** Engineered entirely by Parth Pate. 
**Hardware Assembly & Research:** Physical hardware assembly and Design Thinking research collaborated with Utkarsh Korhale,Tushti Rastogi, Parth Pawar and Mokshda Mankar for the MIT-ADT Pratibhuti 3.0 Exhibition.
