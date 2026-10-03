# 📱 Free Earn - Complete Full-Stack Earning Application
> Earn Smart. Earn Daily. Verified Tasks, Rewarded Ads, Referral Tree & Instant UPI/Bank Withdrawals.

---

## 🚀 Quick Start Guide (Kaise Run Karein)

### 1. Requirements:
- Node.js v18+ or v20+ or v22+
- npm (Node Package Manager)

### 2. Setup & Installation:
```bash
# 1. Zip file ko extract (unzip) karein
unzip free-earn-app-full-source.zip
cd free-earn-app

# 2. Dependencies install karein
npm install

# 3. Development server run karein
npm run dev
# Browser me open karein: http://localhost:3000
```

### 3. Production Build & Deployment:
```bash
# Build production bundle
npm run build

# Start production server
npm start
```

---

## 📲 How to Convert into Android APK (.apk / .aab)

Aap is web app ko **Capacitor** ke through 5 minute me pure native Android APK me convert kar sakte hain:

```bash
# Step 1: Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Step 2: Initialize Capacitor project
npx cap init "Free Earn" "com.freeearn.app" --web-dir dist

# Step 3: Production build generate karein
npm run build

# Step 4: Android platform add karein
npx cap add android

# Step 5: Android Studio me project open karein
npx cap open android
```
*Android Studio me "Build > Build Bundle(s) / APK(s) > Build APK(s)" par click karke direct `.apk` file download kar sakte hain!*

---

## 🛡️ Admin Portal Credentials

- **Admin URL:** `http://localhost:3000/#/admin` (ya live link par `/#/admin`)
- **Master Admin Password:** `A829860k`
- **Owner Email:** `kumarankush5184@gmail.com`
- **Owner Mobile:** `+91 9113124207`
- **Default Referral Code:** `ANKUSH07`

### Admin Features:
- Instant withdrawal approval / rejection with UTR tracking
- Custom task creator with screenshot proof verification
- User balance manager (Credit / Debit coins)
- Live anti-cheat risk monitor & device fraud prevention
- System settings (Withdrawal limits, Coin rates, AdMob ad IDs)

---

## 📂 Project Structure
```
├── src/
│   ├── components/      # UI components (Header, Nav, Drawers, Modals)
│   ├── context/         # Central App Context & Global State
│   ├── services/        # Firebase, API & Seed Data
│   ├── types/           # TypeScript interfaces & types
│   ├── views/           # Views: Home, Earn, Wallet, Team, Profile, Admin
│   ├── App.tsx          # Root React Component
│   ├── main.tsx         # React DOM Entry
│   └── index.css        # Tailwind CSS
├── server.ts            # Node.js Anti-Cheat & REST API Server
├── dist/                # Pre-built production static files
├── firebase-applet-config.json # Firebase credentials
├── firestore.rules      # Cloud Firestore Security Rules
├── package.json         # Dependencies & Scripts
└── vite.config.ts       # Vite configuration
```

---
*Created with ❤️ for Ankush Kumar*
