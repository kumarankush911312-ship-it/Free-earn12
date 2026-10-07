import type { AppSettings, Task, Announcement } from '../types/index.ts';

export const DEFAULT_SETTINGS: AppSettings = {
  minWithdrawalCoins: 500, // 500 coins = ₹5.00
  coinToCurrencyRatio: 100, // 100 coins = 1 unit (₹1.00)
  currencySymbol: '₹',
  referralRewardCoins: 100, // Inviter earns 100 coins
  referralJoinBonusCoins: 50, // Invitee earns 50 coins
  dailyAdLimit: 100,
  adRewardCoins: 5, // Fixed 5 coins per ad as requested
  dailyBonusCoins: 15,
  dailyBonusMinCoins: 10,
  dailyBonusMaxCoins: 50,
  checkInRewards: [10, 15, 20, 25, 35, 50, 100],
  supportEmail: 'support@freeearn.app',
  supportWhatsapp: '+91 9113124207',
  telegramChannelUrl: 'https://t.me/+gUbcV1SSrDQzMDNl',
  telegramMandatoryJoin: true,
  admobAppId: 'ca-app-pub-7524191132114722~4422067441',
  admobRewardedUnitId: 'ca-app-pub-7524191132114722/4622212147',
  admobBannerUnitId: 'ca-app-pub-7524191132114722/4622212147',

  // Master Feature Controls
  maintenanceMode: false,
  maintenanceMessage: 'Free Earn app is undergoing scheduled system optimization. All user coin balances and pending withdrawals are 100% safe. We will be back online shortly!',
  dailyCheckInEnabled: true,
  dailyBonusEnabled: true,
  videoAdsEnabled: true,
  pageAdsEnabled: true,
  pageAdSkipSeconds: 5,
  pageAdRewardCoins: 5, // Fixed 5 coins per page ad
  adCooldownSeconds: 0,
  tasksEnabled: true,
  referralEnabled: true,
  withdrawalsEnabled: true,
  withdrawalsDisabledReason: 'Withdrawals are momentarily paused for banking reconciliation. Please check back in a few hours.',
  allowedWithdrawalMethods: ['upi', 'bank', 'paytm', 'phonepe'],
  homeNoticeActive: false,
  homeNoticeText: '⚡ All UPI payouts are processing within 2 hours today! Complete tasks to earn extra bonus coins.',
};

export const INITIAL_TASKS: Omit<Task, 'id' | 'createdAt'>[] = [
  {
    title: 'Install & Register: BHIM UPI App',
    description: 'Download the official BHIM UPI app, register with your bank mobile number, and complete 1st UPI setup to earn instant coins.',
    rewardCoins: 350,
    category: 'app',
    instructions: '1. Click open link to download BHIM from official link.\n2. Complete mobile number verification.\n3. Link your bank account and make 1 test transfer or scan QR.\n4. Submit your registered UPI ID/screenshot as proof.',
    stepGuide: [
      'Download & install BHIM app',
      'Register mobile & link bank account',
      'Submit your BHIM UPI ID as proof'
    ],
    dailyLimit: 1000,
    status: 'active',
    badge: 'Featured UPI',
    externalUrl: 'https://bhim.onelink.me/CoHB/dr3s0al0',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Setup & Link: PhonePe UPI App',
    description: 'Download PhonePe, verify your bank-linked mobile number, and perform 1 quick UPI scan payment.',
    rewardCoins: 400,
    category: 'app',
    instructions: '1. Download PhonePe from the official app store.\n2. Register with your primary bank mobile number.\n3. Complete 1st payment or scan merchant QR code.\n4. Submit your PhonePe registered UPI ID as proof.',
    stepGuide: [
      'Install PhonePe from official store',
      'Verify mobile number via SMS',
      'Complete 1st transaction and submit UPI ID'
    ],
    dailyLimit: 800,
    status: 'active',
    badge: 'High Reward',
    externalUrl: 'https://phon.pe/download',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Google Pay: 1st UPI Payment (Get ₹21 Bonus)',
    description: "Earn ₹21 on your first payment, if you're new or have not used Google Pay for the last 180 days. Just use my referral link https://gpay.app.goo.gl/invite-q211c0a to enjoy your reward.",
    rewardCoins: 450,
    category: 'app',
    instructions: "1. Open official referral link: https://gpay.app.goo.gl/invite-q211c0a\n2. Download Google Pay & register with bank-linked mobile.\n3. Make your 1st payment to enjoy your ₹21 reward + 450 App Coins!\n4. Submit your registered UPI ID or payment UTR as proof.",
    stepGuide: [
      'Open referral link: https://gpay.app.goo.gl/invite-q211c0a',
      'Download Google Pay & link bank',
      'Make 1st payment to claim ₹21 + 450 Coins'
    ],
    dailyLimit: 500,
    status: 'active',
    badge: '₹21 Bonus',
    externalUrl: 'https://gpay.app.goo.gl/invite-q211c0a',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 30,
  },
  {
    title: 'Navi UPI & Instant Investments',
    description: 'Download Navi app, complete 2-minute mobile OTP signup, and check free credit score.',
    rewardCoins: 500,
    category: 'app',
    instructions: '1. Click open link to install Navi app.\n2. Sign up with mobile number and verify OTP.\n3. Check your free credit score or complete basic KYC.\n4. Submit registered mobile number as verification proof.',
    stepGuide: [
      'Install Navi app from link',
      'Sign up via mobile OTP',
      'Submit mobile number as proof'
    ],
    dailyLimit: 600,
    status: 'active',
    badge: 'Mega Bonus',
    externalUrl: 'https://navi.com/download',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 50,
  },
  {
    title: 'Join Smart Earn Official Telegram (Mandatory)',
    description: 'Join our official Telegram community for daily promotional giveaway codes, instant loot deals, and payment proofs. Joining is mandatory for all users!',
    rewardCoins: 150,
    category: 'social',
    instructions: '1. Click link to join our official Telegram channel: https://t.me/+gUbcV1SSrDQzMDNl\n2. Stay joined and turn on notifications.\n3. Submit your Telegram @username as verification proof.',
    stepGuide: [
      'Click link to open Telegram: https://t.me/+gUbcV1SSrDQzMDNl',
      'Join Smart Earn Community channel',
      'Submit your Telegram username'
    ],
    dailyLimit: 2000,
    status: 'active',
    badge: 'Mandatory',
    externalUrl: 'https://t.me/+gUbcV1SSrDQzMDNl',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Subscribe Official YouTube Channel',
    description: 'Subscribe to Smart Earn official YouTube channel (@smartearn15), hit the notification bell, and watch our latest tutorial video.',
    rewardCoins: 120,
    category: 'social',
    instructions: '1. Open link to go to our YouTube channel: https://youtube.com/@smartearn15?si=rvwi__ntl2jpgez1\n2. Subscribe and tap the bell icon.\n3. Like the latest uploaded video.\n4. Submit your YouTube profile name or screenshot link.',
    stepGuide: [
      'Open YouTube: https://youtube.com/@smartearn15?si=rvwi__ntl2jpgez1',
      'Subscribe and hit the bell icon',
      'Submit your YouTube username as proof'
    ],
    dailyLimit: 1500,
    status: 'active',
    badge: 'Easy Social',
    externalUrl: 'https://youtube.com/@smartearn15?si=rvwi__ntl2jpgez1',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Follow Smart Earn on Instagram',
    description: 'Follow our official Instagram handle and like our top 3 recent posts.',
    rewardCoins: 100,
    category: 'social',
    instructions: '1. Click link to visit our Instagram profile.\n2. Click Follow button.\n3. Like the latest 3 posts.\n4. Submit your Instagram @handle as proof.',
    stepGuide: [
      'Open Instagram profile link',
      'Follow and like 3 recent posts',
      'Submit your Instagram handle'
    ],
    dailyLimit: 1500,
    status: 'active',
    badge: 'Quick Coins',
    externalUrl: 'https://instagram.com',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 20,
  },
  {
    title: 'Complete 3-Min Consumer Trends Survey',
    description: 'Share your genuine opinion on mobile shopping, banking apps, and online discounts to earn instant rewards.',
    rewardCoins: 220,
    category: 'survey',
    instructions: '1. Click open survey link.\n2. Answer all 8 short questions truthfully.\n3. Copy the Survey Completion Confirmation Code shown at the end.\n4. Submit the confirmation code below.',
    stepGuide: [
      'Open survey form link',
      'Answer 8 quick questions',
      'Submit the final completion code'
    ],
    dailyLimit: 750,
    status: 'active',
    badge: 'Top Survey',
    externalUrl: 'https://forms.gle/consumer-trends-survey-sample',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 30,
  },
  {
    title: 'Daily Financial & Savings Poll',
    description: 'Vote in today daily community poll about favorite cashback and discount apps in India.',
    rewardCoins: 150,
    category: 'survey',
    instructions: '1. Open link to vote in today poll.\n2. Select your answer and submit.\n3. Enter your voting timestamp or username as proof.',
    stepGuide: [
      'Open daily poll link',
      'Vote your preferred choice',
      'Submit your answer summary'
    ],
    dailyLimit: 1000,
    status: 'active',
    badge: 'Daily Poll',
    externalUrl: 'https://forms.gle/daily-poll-sample',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Watch Sponsored Video Ad #1 (Instant Coins)',
    description: 'Watch a full 30-second sponsored partner video ad to earn direct coin credits immediately.',
    rewardCoins: 60,
    category: 'daily',
    instructions: '1. Click Watch Video Ad button.\n2. Watch the full 30-second video without closing early.\n3. Coins will be added automatically to your wallet upon completion.',
    stepGuide: [
      'Click Watch Video Ad',
      'Watch complete 30-second ad',
      'Receive instant coin reward'
    ],
    dailyLimit: 2500,
    status: 'active',
    badge: 'Instant Ad',
    externalUrl: 'https://admob.google.com',
    verificationMethod: 'instant_timer',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Watch Sponsored Video Ad #2 (Partner Gaming)',
    description: 'Watch a trending casual mobile gaming video ad and earn coins instantly.',
    rewardCoins: 60,
    category: 'daily',
    instructions: '1. Click Watch Ad button.\n2. Watch the video until the timer expires.\n3. Submit your account confirmation note.',
    stepGuide: [
      'Click to launch video ad',
      'Watch until completion',
      'Claim your instant reward'
    ],
    dailyLimit: 2500,
    status: 'active',
    badge: 'Instant Ad',
    externalUrl: 'https://admob.google.com',
    verificationMethod: 'instant_timer',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Watch Sponsored Video Ad #3 (Finance Booster)',
    description: 'Watch fintech & savings app preview ad to earn daily reward coins.',
    rewardCoins: 60,
    category: 'daily',
    instructions: '1. Launch sponsored ad.\n2. Watch until completion.\n3. Reward is verified and added immediately.',
    stepGuide: [
      'Start video ad',
      'Watch until end',
      'Get coins credited'
    ],
    dailyLimit: 2500,
    status: 'active',
    badge: 'Instant Ad',
    externalUrl: 'https://admob.google.com',
    verificationMethod: 'instant_timer',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Read Daily Financial Article (2 Mins)',
    description: 'Read our expert guide on smart monthly budgeting and maximizing digital UPI cashbacks.',
    rewardCoins: 80,
    category: 'daily',
    instructions: '1. Click link to open the article.\n2. Read for at least 90 seconds.\n3. Submit the secret code found at the bottom of the article as proof.',
    stepGuide: [
      'Open article link',
      'Read guide for 2 minutes',
      'Submit secret article code'
    ],
    dailyLimit: 1200,
    status: 'active',
    badge: 'Daily Read',
    externalUrl: 'https://medium.com',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 20,
  },
  {
    title: 'Install Meesho App (Get 40% OFF up to ₹100)',
    description: "Join Meesho and get cheapest prices online. Install via link and get 40% OFF on your first order (up to ₹100).\n📦 Home delivery | 💵 Cash on delivery available | 🔄 Easy returns",
    rewardCoins: 250,
    category: 'app',
    instructions: "1. Open link to download Meesho: https://app.meesho.com/2yoV/r99th0qd?via=3fvfzp&from=home_page_pill\n2. Complete initial mobile signup.\n3. Get 40% OFF on your first order (up to ₹100) + 250 App Coins!\n4. Submit your registered mobile number as proof.",
    stepGuide: [
      'Install via link: https://app.meesho.com/2yoV/r99th0qd?via=3fvfzp&from=home_page_pill',
      'Signup with mobile OTP',
      'Submit your registered mobile number as proof'
    ],
    dailyLimit: 800,
    status: 'active',
    badge: '40% OFF Loot',
    externalUrl: 'https://app.meesho.com/2yoV/r99th0qd?via=3fvfzp&from=home_page_pill',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
  {
    title: 'Explore Flipkart SuperCoins & Daily Deals',
    description: 'Open Flipkart via partner link, check today supercoin offers, and save favorite items.',
    rewardCoins: 180,
    category: 'daily',
    instructions: '1. Open Flipkart via link.\n2. Browse today deal of the day.\n3. Submit your Flipkart registered name or screenshot as proof.',
    stepGuide: [
      'Click Flipkart partner link',
      'Browse deals of the day',
      'Submit verification note'
    ],
    dailyLimit: 1000,
    status: 'active',
    badge: 'Partner Deal',
    externalUrl: 'https://flipkart.com',
    verificationMethod: 'proof_link',
    hasAd: true,
    adBonusCoins: 25,
  },
];

export const INITIAL_ANNOUNCEMENTS: Omit<Announcement, 'id' | 'createdAt'>[] = [
  {
    title: '⚡ Instant UPI Withdrawals Active!',
    message: 'All withdrawal requests are processed within 2 to 24 hours. Make sure your UPI ID is linked to your primary bank account.',
    badge: 'Update',
    priority: 'high',
    active: true,
  },
  {
    title: '🎁 Refer & Earn 100 Coins Per Friend',
    message: 'Share your referral code! When your friend joins, they get 50 bonus coins and you get 100 coins after their first task.',
    badge: 'Bonus',
    priority: 'normal',
    active: true,
  },
  {
    title: '🛡️ Anti-Fraud & Fair Play Policy',
    message: 'Multiple accounts on a single device or automated clickers result in immediate permanent account termination.',
    badge: 'Security',
    priority: 'normal',
    active: true,
  },
];

// Real Users & Data Stores (No Mock / Demo Users)
import type { UserProfile, TaskSubmission, Transaction, Withdrawal } from '../types/index.ts';

export const DEMO_USERS: UserProfile[] = [];

export const DEMO_TRANSACTIONS: Transaction[] = [];

export const DEMO_SUBMISSIONS: TaskSubmission[] = [];

export const DEMO_WITHDRAWALS: Withdrawal[] = [];

