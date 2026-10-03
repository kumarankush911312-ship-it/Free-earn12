# Free Earn - Complete Deployment & Setup Guide

**App Name:** Free Earn  
**Tagline:** “Earn Smart. Earn Daily.”  
**Target:** Android Phone (PWA / APK / AAB) & Responsive Web Application

---

## 1. Project Overview & Architecture

Free Earn is built with:
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion
- **Database & Authentication:** Google Cloud Firestore + Firebase Authentication
- **Security:** ABAC Zero-Trust `firestore.rules` deployed via Google Cloud FAX RPC
- **Rewarded Ad Network:** Interactive AdMob/Unity Ads SDK lifecycle simulation with anti-abuse verification
- **Financial Integrity:** Double-entry ledger architecture (`transactions` collection) with strict server-side validation.

---

## 2. Firebase Configuration & Deployment

### 1. Firebase Project Setup
- The project is configured with Firebase project `free-earn-cd0ea`.
- Client credentials and Realtime Database are configured in `firebase-applet-config.json`.

### 2. Enabling Firebase Authentication
In the Firebase Console (`https://console.firebase.google.com`):
1. Navigate to **Authentication** > **Sign-in method**.
2. Enable **Phone** (SMS verification) and **Google**.
3. For testing without SMS quota, add test phone numbers (e.g. `+91 98765 43210` with test OTP `749215`).

### 3. Deploying Firestore Security Rules
The rules in `/firestore.rules` enforce:
- Regular users cannot unilaterally modify their own `coins`, `totalEarnings`, or `totalWithdrawn` balances.
- Regular users cannot approve or mark their own withdrawals or task submissions as `approved` or `paid`.
- All writes are audited in `/transactions`.
- To re-deploy rules via CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 3. Creating the First Secure Admin Account

1. The initial master admin email is configured in `firestore.rules` and `AppContext.tsx`:
   - `kumarankush5184@gmail.com`
2. When this email logs in via Google or Mobile OTP, they automatically receive master privileges:
   - Access to the **Admin Control Panel** tab.
   - Capability to approve/reject user withdrawals (UPI/Bank).
   - Capability to review task proof submissions and credit rewards.
   - Capability to search users, adjust balances with auditable notes, and block/unblock fraudulent accounts.
   - Global configuration of minimum withdrawal limits and ad limits.

---

## 4. Connecting a Rewarded Ad Provider (AdMob / Unity Ads)

To link production Google AdMob or Unity Ads rewarded video network:
1. In `src/services/adNetwork.ts`, configure your production AdMob Ad Unit ID:
```typescript
export const ADMOB_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'; // Production Ad Unit
```
2. The controller enforces anti-abuse:
   - Verification token validation (`AD_SESS_*`).
   - Minimum viewing time verification before the reward handshake.
   - Daily user cap (10 ads/day by default, configurable in Admin settings).
   - Cooldown timer between consecutive ad views.

---

## 5. Configuring Withdrawal Settings

1. Open the app as Admin and go to **Admin Panel** > **Settings**.
2. Configure:
   - **Minimum Withdrawal:** Default 500 Coins (`₹5.00` / `$5.00`).
   - **Coin-to-Currency Ratio:** 100 Coins = 1.00 Unit.
   - **Referral Rewards:** 100 Coins for Inviter, 50 Coins for Invitee on sign up.
   - **Rewarded Ad Coins:** 20 Coins per completed ad.

---

## 6. Building the Android APK / AAB

You can wrap this web app into a native Android APK or Google Play Store AAB using **Capacitor** or **Android TWA (Trusted Web Activity)**:

### Option A: Capacitor (Recommended for APK & Play Store)
```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor
npx cap init "Free Earn" "com.freeearn.app" --web-dir dist

# 3. Build Web Assets
npm run build

# 4. Add Android Platform
npx cap add android

# 5. Open Android Studio
npx cap open android
```
In Android Studio:
1. Go to **Build** > **Generate Signed Bundle / APK**.
2. Choose **Android App Bundle (AAB)** for Google Play or **APK** for direct device installation.
3. Configure your keystore and build release artifacts.

### Option B: Bubblewrap TWA (Google Play Store)
```bash
npx @bubblewrap/cli init --manifest=https://your-domain.com/manifest.json
npx @bubblewrap/cli build
```
Generates an optimized Google Play Store AAB with full Android integration.

---

## 7. Anti-Fraud & Fair Play Architecture

1. **Client-Server Disconnect:** The client never unilaterally modifies balances. All operations write to Firestore through atomic updates and ledger transactions.
2. **Duplicate Prevention:** Pending withdrawals block secondary withdrawal attempts until processed.
3. **No Fake Earnings:** Balances update only after real timers, ad network completion callbacks, or manual admin proof reviews.
