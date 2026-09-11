# 🥬 FreshKeep App & Hardware — Master Technical, UI & Feature Roadmap

This document outlines the complete architectural roadmap for **FreshKeep**, including completed milestones, upcoming UI/UX polish, hardware firmware upgrades, and the **Gamified Rewards & Coupon Marketplace**.

---

## 📍 Table of Contents
1. [Completed Architectural Milestones (v2.0.0)](#1-completed-architectural-milestones-v200)
2. [Mobile App UI & UX Polish Roadmap](#2-mobile-app-ui--ux-polish-roadmap)
3. [Batch Receipt Scanning & Impact Ledger](#3-batch-receipt-scanning--impact-ledger)
4. [Smart Recipe Caching & Indian Pantry Staples](#4-smart-recipe-caching--indian-pantry-staples)
5. [Hardware Magnet Firmware Upgrades (ESP8266)](#5-hardware-magnet-firmware-upgrades-esp8266)
6. [Gamified Rewards & Coupon Marketplace Integration](#6-gamified-rewards--coupon-marketplace-integration)

---

## 1. Completed Architectural Milestones (v2.0.0)

- ✅ **Centralized Gemini 3.6 Flash Client ([`geminiService.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/services/geminiService.js)):**
  Centralized all AI API endpoints with native `responseSchema` enforcement (`responseMimeType: "application/json"`), eliminating regex string parsing and JSON crashes.
- ✅ **Multi-Key Burner Key Rotation Loop ([`Keys.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/constants/Keys.js)):**
  Automatic round-robin rotation and failover across **8 Gemini burner API keys** for zero rate-limit downtime.
- ✅ **Indian Packaging Vision OCR:**
  Specialized prompt instructions to read Indian dot-matrix manufacturing dates (`PKD`, `MFG`, `USE BY X DAYS FROM PKG`, `BEST BEFORE X MONTHS`) and auto-calculate `YYYY-MM-DD` expiry dates.
- ✅ **Firestore Safety Guard:**
  Added `cleanFirestoreData()` in `InventoryContext.js` to convert `undefined` properties to `null` before Firestore writes.
- ✅ **Native Standalone APK Build:**
  Gradle 8.13 and Java 21 compilation setup producing standalone 103MB release APK.

---

## 2. Mobile App UI & UX Polish Roadmap

### A. Item Cards ([`ItemCard.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/components/ItemCard.js))
- **Shelf-Life Micro Progress Bar:** 3px rounded horizontal bar beneath title (Green >50%, Amber 20%-50%, Red <20%).
- **Styled Status Pill Badges:**
  - 🟢 **Fresh:** `#e8f4ec` bg, `#3a6649` text
  - 🟡 **Warning:** `#fef3c7` bg, `#b45309` text
  - 🔴 **Urgent:** `#fee2e2` bg, `#b91c1c` text
  - 💀 **Expired:** `#fecdd3` bg, `#991b1b` text with strikethrough title.
- **Unclipped Elevation:** Unclipped wrapper View (`shadowColor: '#4a7c59'`, `elevation: 2`) preventing shadow clipping during swipe gestures.

### B. Home Dashboard ([`HomeScreen.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/screens/HomeScreen.js))
- **Live Sync Pulse Dot:** Animated looping green pulse ring next to Connected Bluetooth badge indicating real-time sync with hardware magnet.
- **Glassmorphic Smart Tip Banner:** Translucent card (`rgba(255,255,255,0.12)` in dark mode, `rgba(74,124,89,0.08)` in light mode).

### C. Inventory Screen ([`InventoryScreen.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/screens/InventoryScreen.js))
- **Sticky Real-Time Search Bar:** Pinned search input filtering items by name instantly.
- **Combined Status Tabs & Category Chips:** Dual horizontal filter rows (*Freshness Status* + *Food Category*) working together with search.

### D. Recipes Screen ([`RecipesScreen.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/screens/RecipesScreen.js))
- **Elevated Hero Recipe Card:** Top AI recipe renders with gradient border (`LinearGradient`), prep time icon, and `🌿 Waste Saver` badge.
- **Inline Ingredient Chips:** Green tags for items in kitchen (`✓ Milk`), muted tags for pantry staples (`○ Oil`).
- **"Can Make Now" Segment Toggle:** Filter toggle between 100% available recipes vs all AI suggestions.

### E. Kira Assistant ([`AssistantScreen.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/screens/AssistantScreen.js))
- **Live Audio Waveform Animation:** 5 animated sound bars active during speech input.
- **Glassmorphic Message Bubbles:** Styled cards with avatar pills for Kira.

---

## 3. Batch Receipt Scanning & Impact Ledger

### A. Quick-Commerce Invoice OCR Pipeline
- `parseGroceryReceipt(base64Image)` in [`geminiService.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/services/geminiService.js) parses Blinkit, Zepto, Swiggy Instamart, and DMart slips.
- Infers shelf life based on perishable category norms (Milk 2-5d, Bread 4-6d, Veggies 3-5d, Meat 1-2d, Eggs 20-25d).
- Mode 4 (`🧾 Bill / Receipt`) in `AddItemScreen.js` with camera scan & photo gallery upload (`expo-image-picker`).
- Batch Review Modal allowing name edits, date adjustments, and one-shot atomic Firestore commits via `addBatchItems()`.

### B. Environmental & Monetary Impact Ledger
- Tracked in [`InventoryContext.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/context/InventoryContext.js) and rendered on [`ProfileScreen.js`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-App/src/screens/ProfileScreen.js):
  - **₹ Money Saved:** Milk (₹60), Bread (₹45), Eggs (₹80), Vegetables (₹50), Meat (₹250), Other (₹50).
  - **🌱 kg CO₂ Prevented:** ~1.9 kg CO₂ prevented per kg food waste averted based on unit weights.
  - **Milestone Unlock Badges:** `🌱 Eco Warrior (5kg CO2)`, `🌍 Planet Protector (20kg CO2)`, `💰 Budget Saver (₹500)`, `🏆 Thrifty Champion (₹2000)`, `🛟 Waste Buster (25 Items)`.

---

## 4. Smart Recipe Caching & Indian Pantry Staples

1. **Pantry Staples Assumption:** Prompts instruct Gemini AI to assume basic Indian household staples (mustard seeds, turmeric, cooking oil, salt, water) are always available.
2. **Indian Zero-Waste Focus:** Prioritizes authentic Indian leftover dishes (*Kheer/Paneer*, *Bread Upma*, *Kadhi/Rasam*).
3. **Offline Recipe Caching:** Persists AI recipes in `@freshkeep_cached_recipes` in `AsyncStorage` so recipe ideas load instantly even without cellular internet.

---

## 5. Hardware Magnet Firmware Upgrades (ESP8266)

- **Dynamic Captive Portal (`WiFiManager.h`):**
  Removes hardcoded Wi-Fi credentials from [`FreshKeep_Magnet.ino`](file:///C:/Users/Lenovo/FreshKeep-Smart-Fridge/FreshKeep-Hardware/FreshKeep_Magnet/FreshKeep_Magnet.ino). Launches access point `FreshKeep-Magnet-Setup` at `192.168.4.1` for browser configuration during live demos.
- **PIR Motion Sensor Wake (`HC-SR501`):**
  Hardware interrupt attached to motion sensor. Wakes 3.5" TFT display backlight when user approaches fridge, automatically dimming/sleeping after 45 seconds of inactivity.
- **Morning Reminder Window:**
  Restricts active piezo buzzer chirps to morning window (08:00 AM – 10:00 AM) if expired or urgent items exist.

---

## 6. Gamified Rewards & Coupon Marketplace Integration

### A. System Architecture
Integrates real-world discount vouchers and brand offers into FreshKeep's point system:

```text
  [ Save Food Item ] ➔ [ Earn +15-20 Points ] ➔ [ Open Rewards Marketplace ]
                                                         │
                                                         ▼
                                            [ Redeem Voucher for Points ]
                                                         │
                                                         ▼
                                            [ Copy Promo Code & Launch App ]
```

### B. Sample Brand Rewards Catalog
| Partner Category | Brand | Reward Offer | Cost in Points |
| :--- | :--- | :--- | :--- |
| **Quick-Commerce Grocery** | ⚡ **Zepto** | ₹100 Off on orders above ₹499 | **200 pts** |
| **Quick-Commerce Grocery** | 🍊 **Swiggy Instamart** | ₹75 Off on Fresh Vegetables & Fruit | **150 pts** |
| **Organic Dairy** | 🥛 **Country Delight** | Free 1L Organic Milk Sachet | **150 pts** |
| **Food & Dining** | 🍕 **Zomato** | ₹75 Off Healthy Meal Orders | **150 pts** |
| **Eco Kitchen Products** | 🌿 **Bare Necessities** | 20% Off Glass Containers & Beeswax Wraps | **100 pts** |

### C. Three Zero-Contract Integration Methods
1. **Xoxoday Plum / GyFTR API (Automated Digital Vouchers):**
   - Single REST API call issues real e-gift cards (Swiggy, Zomato, Amazon Pay, Flipkart) on the fly when points are redeemed.
2. **EarnKaro / Cuelinks Affiliate Networks (Zero Cost + YOU Earn Money):**
   - Provide live feeds of active promo codes for Zepto/Blinkit.
   - When users click your affiliate link to shop, **you earn 3% - 8% cash commission** on their grocery orders!
3. **Public Demo Promo Codes (For College Exhibitions & Hackathons):**
   - Curate 5-10 active public promo codes stored in a local catalog JSON for instant demo redemption.

---

## 🛠️ Master Checklist Summary

- `[x]` **Centralize Gemini 3.6 Flash Service with `responseSchema`**
- `[x]` **Multi-Key Burner Key Rotation Loop**
- `[x]` **Indian Packaging OCR & Date Engine**
- `[x]` **Visual Progress Bars & Pill Badges on Item Cards**
- `[x]` **Live Sync Pulse Dot & Glassmorphic Tip Banner on Home**
- `[x]` **Search Bar & Category Filter Chips on Inventory**
- `[x]` **Hero Recipe Card & Ingredient Chips on Recipes**
- `[x]` **Batch Receipt Ingestion Pipeline (Blinkit/Zepto)**
- `[x]` **Environmental & Monetary Impact Ledger (₹ & CO2)**
- `[ ]` **Pantry Staples Assumption & Offline Recipe Caching**
- `[ ]` **`WiFiManager.h` Captive Portal in ESP8266 Firmware**
- `[ ]` **PIR Motion Sensor Interrupt & Sleep Mode in Firmware**
- `[ ]` **Rewards & Coupon Marketplace Redemption Modal**
