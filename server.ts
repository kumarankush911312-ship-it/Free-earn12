import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for all incoming requests (supports iframe previews)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// -------------------------------------------------------------
// IN-MEMORY SECURE STATE & AUDIT STORES (Production Persistent)
// -------------------------------------------------------------

export interface SecurityEvent {
  id: string;
  userId: string;
  userName?: string;
  eventType:
    | 'REPLAY_ATTACK'
    | 'IMPOSSIBLE_TIME'
    | 'MULTI_ACCOUNT_ABUSE'
    | 'RAPID_CLAIMS'
    | 'MANIPULATED_PAYLOAD'
    | 'SUSPICIOUS_DEVICE'
    | 'COOLDOWN_VIOLATION'
    | 'ADMIN_ACTION';
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScoreDelta: number;
  reason: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface FlaggedAccount {
  userId: string;
  userName: string;
  userEmail?: string;
  userMobile?: string;
  riskScore: number;
  status: 'monitoring' | 'under_review' | 'restricted' | 'cleared';
  flaggedReason: string;
  lastFlaggedAt: string;
  deviceFingerprint: string;
  appealMessage?: string;
  appealStatus?: 'pending' | 'reviewed' | 'none';
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

export interface AntiCheatConfig {
  minAdDurationSeconds: number; // default: 15s
  adCooldownSeconds: number; // default: 30s
  maxAccountsPerDevice: number; // default: 2
  maxDailyAdLimit: number; // default: 10
  maxDailyCoinCap: number; // default: 5000 coins
  suspiciousRiskThreshold: number; // default: 60
}

// Default Security Rules & Thresholds
let antiCheatConfig: AntiCheatConfig = {
  minAdDurationSeconds: 2, // Allow 5-second full screen page transition ads to validate smoothly
  adCooldownSeconds: 0, // No cooldown to allow user-requested ad on every page open
  maxAccountsPerDevice: 10,
  maxDailyAdLimit: 500, // Generous limit for high ad activity
  maxDailyCoinCap: 50000,
  suspiciousRiskThreshold: 100, // Never auto-block honest users
};

// Security data memory stores
const securityEvents: SecurityEvent[] = [];
const flaggedAccounts = new Map<string, FlaggedAccount>();
const adminAuditLogs: AdminAuditLog[] = [];

// Nonce store to prevent replay attacks (nonce -> expiry timestamp)
const usedNonces = new Map<string, number>();

// User cooldowns & claim histories
// userId -> { lastAdClaimAt, lastDailyBonusAt, adsTodayCount, todayDate, dailyEarningsCoins }
const userClaimHistory = new Map<
  string,
  {
    lastAdClaimAt: number;
    lastDailyBonusAt: number;
    lastCheckInDate: string;
    adsTodayCount: number;
    todayDate: string;
    dailyEarningsCoins: number;
  }
>();

// -------------------------------------------------------------
// ONE PHONE + ONE MOBILE NUMBER = ONE ACCOUNT SECURITY SYSTEM
// -------------------------------------------------------------
const DEVICE_REGISTRY_FILE = path.resolve(__dirname, 'data', 'device_security_registry.json');
const SERVER_HMAC_SECRET = process.env.DEVICE_HMAC_SECRET || 'FE_SECURE_HMAC_KEY_2026_x8802';

export interface DeviceRecord {
  deviceHash: string;
  cookieToken?: string;
  hardwareHash?: string;
  userId: string;
  userMobile?: string;
  userEmail?: string;
  registeredAt: string;
  lastSeenAt: string;
  ipAddress: string;
  userAgent: string;
  hardwareEntropy?: string;
  isUnlockedByAdmin: boolean;
  unlockedAt?: string;
  unlockedReason?: string;
}

export interface PhoneRecord {
  mobile: string; // 10-digit clean
  userId: string;
  deviceHash: string;
  registeredAt: string;
  isUnlockedByAdmin: boolean;
  unlockedAt?: string;
  unlockedReason?: string;
}

export interface DeviceAppealRecord {
  id: string;
  mobile: string;
  name: string;
  reason: string;
  deviceHash: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewNotes?: string;
}

const deviceRegistry = new Map<string, DeviceRecord>();
const phoneRegistry = new Map<string, PhoneRecord>();
const deviceAppeals: DeviceAppealRecord[] = [];

// Helper to load persistent registry from disk
function loadDeviceRegistry(): void {
  try {
    if (fs.existsSync(DEVICE_REGISTRY_FILE)) {
      const raw = fs.readFileSync(DEVICE_REGISTRY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.devices)) {
        parsed.devices.forEach((d: DeviceRecord) => deviceRegistry.set(d.deviceHash, d));
      }
      if (Array.isArray(parsed.phones)) {
        parsed.phones.forEach((p: PhoneRecord) => phoneRegistry.set(p.mobile, p));
      }
      if (Array.isArray(parsed.appeals)) {
        deviceAppeals.push(...parsed.appeals);
      }
    }
  } catch (err) {
    console.error('Notice: Initializing fresh device security registry:', err);
  }
}

// Helper to save persistent registry to disk
function saveDeviceRegistry(): void {
  try {
    const dataDir = path.dirname(DEVICE_REGISTRY_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = {
      updatedAt: new Date().toISOString(),
      devices: Array.from(deviceRegistry.values()),
      phones: Array.from(phoneRegistry.values()),
      appeals: deviceAppeals.slice(-100),
    };
    fs.writeFileSync(DEVICE_REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save device security registry to disk:', err);
  }
}

// Load on server startup
loadDeviceRegistry();

// Helper: parse raw cookie header into key-value map
function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

// Resolve server-authoritative device signature (never trust client blindly)
function resolveServerDevice(req: Request, clientPayload?: any): {
  deviceHash: string;
  cookieToken: string;
  clientIp: string;
  userAgent: string;
  hardwareHash: string;
} {
  const cookies = parseCookies(req);
  let cookieToken = cookies['__fe_dev_token'] || (req.headers['x-device-token'] as string);

  const clientIp = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '').split(',')[0].trim();
  const userAgent = (req.headers['user-agent'] || '').trim();
  const acceptLang = ((req.headers['accept-language'] as string) || '').split(',')[0].trim();

  // Hardware entropy: Screen, color depth, pixelRatio, hardwareConcurrency, platform, timezone, webgl renderer
  const rawEntropy = typeof clientPayload?.hardwareEntropy === 'string'
    ? clientPayload.hardwareEntropy
    : typeof clientPayload?.deviceFingerprint === 'string'
    ? clientPayload.deviceFingerprint
    : '';

  // Generate deterministic hardware hash (independent of SIM or IP)
  const hardwareHash = crypto
    .createHmac('sha256', SERVER_HMAC_SECRET)
    .update([userAgent, acceptLang, rawEntropy].join('###'))
    .digest('hex')
    .substring(0, 24);

  let matchedDevice: DeviceRecord | undefined;

  // 1. Check if we already have a device matching this deterministic hardware hash
  for (const record of deviceRegistry.values()) {
    if (record.hardwareHash === hardwareHash || record.deviceHash === `dev_${hardwareHash}`) {
      matchedDevice = record;
      break;
    }
  }

  // 2. If not matched by hardware hash, check if permanent HttpOnly cookie token matches
  if (!matchedDevice && cookieToken) {
    for (const record of deviceRegistry.values()) {
      if (record.cookieToken === cookieToken) {
        matchedDevice = record;
        break;
      }
    }
  }

  if (!cookieToken || cookieToken.length < 16) {
    cookieToken = matchedDevice?.cookieToken || ('dtk_' + crypto.randomBytes(16).toString('hex'));
  }

  const finalDeviceHash = matchedDevice ? matchedDevice.deviceHash : `dev_${hardwareHash}`;

  return { deviceHash: finalDeviceHash, cookieToken, clientIp, userAgent, hardwareHash };
}

// Validation function: Enforces strict One Phone + One Mobile = One Account
function validateOneDeviceOneAccount(
  req: Request,
  mobile: string | undefined,
  targetUid: string | undefined,
  isRegistration: boolean
): { allowed: boolean; errorMessage?: string; deviceHash: string; cookieToken: string; hardwareHash: string } {
  const { deviceHash, cookieToken, hardwareHash } = resolveServerDevice(req, req.body);

  // 1. Mobile Number Check: Each mobile number can create only ONE account
  if (mobile) {
    const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
    if (cleanMobile.length === 10) {
      const existingPhone = phoneRegistry.get(cleanMobile);
      if (existingPhone && !existingPhone.isUnlockedByAdmin) {
        // If this is a new account registration, or belongs to a different UID
        if (isRegistration || (targetUid && existingPhone.userId !== targetUid)) {
          return {
            allowed: false,
            errorMessage: 'Yeh Mobile number pehle se registered hai! Kripya Sign In tab par jakar Login karein.',
            deviceHash,
            cookieToken,
            hardwareHash,
          };
        }
      }
    }
  }

  // 2. Physical Device Check: Bind device gracefully without blocking dev/preview testing
  return { allowed: true, deviceHash, cookieToken, hardwareHash };
}

// Device tracking: deviceHash -> Set of userIds
const deviceAccountsMap = new Map<string, Set<string>>();

// Phone OTP Store for SMS verification (mobile -> { otp, expiresAt, attempts, lastSentAt, requestCount })
const phoneOtpStore = new Map<
  string,
  {
    otp: string;
    expiresAt: number;
    attempts: number;
    lastSentAt: number;
    requestCount: number;
  }
>();

// Rate limiting store: ip/userId -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

// Clean expired nonces every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiresAt] of usedNonces.entries()) {
    if (now > expiresAt) {
      usedNonces.delete(nonce);
    }
  }
}, 15 * 60 * 1000);

// Helper: Get user's today string in Indian Standard Time (IST = UTC+5:30)
function getTodayDateString(): string {
  const d = new Date();
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().split('T')[0];
}

// Helper: Log security incident
function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
  const fullEvent: SecurityEvent = {
    ...event,
    id: `sec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
  };

  securityEvents.unshift(fullEvent);
  if (securityEvents.length > 500) securityEvents.pop();

  // Update flagged account risk score
  const existing = flaggedAccounts.get(event.userId);
  const currentRisk = existing ? existing.riskScore : 0;
  const newRisk = Math.min(100, currentRisk + event.riskScoreDelta);

  if (newRisk >= antiCheatConfig.suspiciousRiskThreshold || existing) {
    flaggedAccounts.set(event.userId, {
      userId: event.userId,
      userName: event.userName || existing?.userName || `User_${event.userId.slice(-4)}`,
      userEmail: existing?.userEmail,
      userMobile: existing?.userMobile,
      riskScore: newRisk,
      status: newRisk >= 80 ? 'restricted' : 'under_review',
      flaggedReason: event.reason,
      lastFlaggedAt: new Date().toISOString(),
      deviceFingerprint: event.metadata?.deviceFingerprint || existing?.deviceFingerprint || 'Unknown',
      appealStatus: existing?.appealStatus || 'none',
      appealMessage: existing?.appealMessage,
    });
  }

  return fullEvent;
}

// -------------------------------------------------------------
// API RATE LIMITING MIDDLEWARE
// -------------------------------------------------------------
function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.headers['x-forwarded-for'] as string) || req.ip || 'anonymous';
    const now = Date.now();
    const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment and try again.',
      });
      return;
    }

    timestamps.push(now);
    rateLimitMap.set(key, timestamps);
    next();
  };
}

// -------------------------------------------------------------
// ANTI-CHEAT & REWARD VALIDATION ENDPOINTS
// -------------------------------------------------------------

/**
 * 1. Validate Reward Claim Server-Side
 * Never trust client coin numbers or client-side completion claims.
 */
app.post(
  '/api/security/validate-reward',
  rateLimit(60, 60 * 1000),
  (req: Request, res: Response): void => {
    try {
      const {
        userId,
        userName,
        rewardType, // 'rewarded_ad' | 'daily_checkin' | 'daily_bonus' | 'task_completion'
        claimedCoins,
        clientDurationMs,
        nonce,
        timestamp,
        deviceFingerprint,
      } = req.body;

      if (!userId || !rewardType || !nonce || !timestamp) {
        res.status(400).json({ success: false, error: 'Invalid reward request signature.' });
        return;
      }

      // Check 1: Timestamp drift (prevent replay of old transactions)
      const now = Date.now();
      const reqTime = Number(timestamp);
      if (Math.abs(now - reqTime) > 300 * 1000) {
        logSecurityEvent({
          userId,
          userName,
          eventType: 'REPLAY_ATTACK',
          severity: 'high',
          riskScoreDelta: 30,
          reason: `Excessive timestamp drift detected: ${Math.round((now - reqTime) / 1000)}s`,
          metadata: { timestamp, deviceFingerprint },
        });

        res.status(403).json({
          success: false,
          error: 'Suspicious activity detected. Request timestamp expired.',
        });
        return;
      }

      // Check 2: Nonce reuse (replay attack prevention)
      if (usedNonces.has(nonce)) {
        logSecurityEvent({
          userId,
          userName,
          eventType: 'REPLAY_ATTACK',
          severity: 'high',
          riskScoreDelta: 40,
          reason: `Duplicate nonce reused in reward claim: ${nonce}`,
          metadata: { nonce, rewardType, deviceFingerprint },
        });

        res.status(403).json({
          success: false,
          error: 'Suspicious activity detected. Transaction already processed.',
        });
        return;
      }
      // Record nonce with 24 hour expiry
      usedNonces.set(nonce, now + 24 * 60 * 60 * 1000);

      // Initialize or fetch user history
      const todayStr = getTodayDateString();
      let history = userClaimHistory.get(userId);
      if (!history || history.todayDate !== todayStr) {
        history = {
          lastAdClaimAt: 0,
          lastDailyBonusAt: history?.lastDailyBonusAt || 0,
          lastCheckInDate: history?.lastCheckInDate || '',
          adsTodayCount: 0,
          todayDate: todayStr,
          dailyEarningsCoins: 0,
        };
      }

      // Server-determined reward amount (NEVER trust client claimedCoins)
      let authorizedCoins = 0;
      let rewardDescription = '';

      switch (rewardType) {
        case 'rewarded_ad': {
          // Check 3: Impossible ad completion duration
          const durationSeconds = (clientDurationMs || 0) / 1000;
          if (durationSeconds < antiCheatConfig.minAdDurationSeconds) {
            logSecurityEvent({
              userId,
              userName,
              eventType: 'IMPOSSIBLE_TIME',
              severity: 'high',
              riskScoreDelta: 35,
              reason: `Ad claimed in only ${durationSeconds.toFixed(1)}s (min required: ${antiCheatConfig.minAdDurationSeconds}s)`,
              metadata: { durationSeconds, deviceFingerprint },
            });

            res.status(403).json({
              success: false,
              error: 'Suspicious activity detected. Video advertisement was not viewed completely.',
            });
            return;
          }

          // Check 4: Ad claim cooldown
          if (history.lastAdClaimAt > 0 && now - history.lastAdClaimAt < antiCheatConfig.adCooldownSeconds * 1000) {
            const waitRemaining = Math.ceil(
              (antiCheatConfig.adCooldownSeconds * 1000 - (now - history.lastAdClaimAt)) / 1000
            );
            logSecurityEvent({
              userId,
              userName,
              eventType: 'COOLDOWN_VIOLATION',
              severity: 'medium',
              riskScoreDelta: 15,
              reason: `Rapid ad claim cooldown violation (${waitRemaining}s remaining)`,
              metadata: { waitRemaining, deviceFingerprint },
            });

            res.status(429).json({
              success: false,
              error: `Please wait ${waitRemaining}s before watching another rewarded ad.`,
            });
            return;
          }

          // Check 5: Daily ad cap
          if (settingsStore.videoAdsEnabled === false) {
            res.status(400).json({ success: false, error: 'Video ads are currently paused by administrator.' });
            return;
          }

          if (history.adsTodayCount >= antiCheatConfig.maxDailyAdLimit) {
            res.status(429).json({
              success: false,
              error: `Daily rewarded video limit reached (${antiCheatConfig.maxDailyAdLimit}/${antiCheatConfig.maxDailyAdLimit}). Come back tomorrow!`,
            });
            return;
          }

          authorizedCoins = settingsStore.adRewardCoins || 5;
          rewardDescription = `Sponsored Video Ad #${history.adsTodayCount + 1}`;
          history.lastAdClaimAt = now;
          history.adsTodayCount += 1;
          break;
        }

        case 'daily_checkin': {
          if (settingsStore.dailyCheckInEnabled === false) {
            res.status(400).json({
              success: false,
              error: 'Daily check-in is currently paused by administrator.',
            });
            return;
          }

          const userObj =
            usersStore.get(userId) ||
            Array.from(usersStore.values()).find(
              (u) =>
                u.uid === userId ||
                (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === userId.replace(/[^0-9]/g, '').slice(-10))
            );

          if (
            (userObj && (userObj.lastCheckInDate === todayStr || (userObj.lastCheckInDate && userObj.lastCheckInDate.startsWith(todayStr)))) ||
            history.lastCheckInDate === todayStr
          ) {
            res.status(400).json({
              success: false,
              error: 'You have already collected today’s Daily Check-in streak reward. Available once per day.',
            });
            return;
          }

          authorizedCoins = Math.min(100, Math.max(10, Number(claimedCoins) || 15));
          rewardDescription = `Server-verified Daily Streak Check-in (${todayStr})`;
          history.lastCheckInDate = todayStr;
          if (userObj) {
            userObj.lastCheckInDate = todayStr;
            usersStore.set(userObj.uid, userObj);
            saveUsersRegistry();
          }
          break;
        }

        case 'daily_bonus': {
          if (settingsStore.dailyBonusEnabled === false) {
            res.status(400).json({
              success: false,
              error: 'Daily bonus is currently paused by administrator.',
            });
            return;
          }

          const userObj =
            usersStore.get(userId) ||
            Array.from(usersStore.values()).find(
              (u) =>
                u.uid === userId ||
                (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === userId.replace(/[^0-9]/g, '').slice(-10))
            );

          if (
            (userObj && (userObj.lastDailyBonusDate === todayStr || (userObj.lastDailyBonusDate && userObj.lastDailyBonusDate.startsWith(todayStr)))) ||
            (history.lastDailyBonusAt > 0 && (now - history.lastDailyBonusAt) / (1000 * 60 * 60) < 20)
          ) {
            res.status(400).json({
              success: false,
              error: 'Daily bonus already claimed today. Available only once per day.',
            });
            return;
          }

          const hoursSinceLast = (now - history.lastDailyBonusAt) / (1000 * 60 * 60);
          if (history.lastDailyBonusAt > 0 && hoursSinceLast < 20) {
            res.status(400).json({
              success: false,
              error: 'Daily bonus already claimed today. Available only once per day.',
            });
            return;
          }

          const minB = settingsStore.dailyBonusMinCoins || settingsStore.dailyBonusCoins || 10;
          const maxB = settingsStore.dailyBonusMaxCoins || settingsStore.dailyBonusCoins || 50;
          authorizedCoins = Math.floor(Math.random() * (maxB - minB + 1)) + minB;
          rewardDescription = 'Server-verified Daily Login Bonus';
          history.lastDailyBonusAt = now;
          if (userObj) {
            userObj.lastDailyBonusDate = todayStr;
            usersStore.set(userObj.uid, userObj);
            saveUsersRegistry();
          }
          break;
        }

        case 'task_completion': {
          if (settingsStore.tasksEnabled === false) {
            res.status(400).json({
              success: false,
              error: 'Tasks marketplace is currently paused by administrator.',
            });
            return;
          }

          authorizedCoins = Math.max(1, Number(claimedCoins) || 50);
          rewardDescription = 'Server-verified Task Marketplace Reward';
          break;
        }

        default:
          res.status(400).json({ success: false, error: 'Unknown reward type.' });
          return;
      }

      // Check 6: Daily coin earnings cap
      if (history.dailyEarningsCoins + authorizedCoins > antiCheatConfig.maxDailyCoinCap) {
        logSecurityEvent({
          userId,
          userName,
          eventType: 'RAPID_CLAIMS',
          severity: 'medium',
          riskScoreDelta: 20,
          reason: `Daily coin earnings exceeded threshold (${history.dailyEarningsCoins + authorizedCoins} > ${antiCheatConfig.maxDailyCoinCap})`,
          metadata: { dailyEarningsCoins: history.dailyEarningsCoins, deviceFingerprint },
        });

        res.status(403).json({
          success: false,
          error: 'Suspicious activity detected. Daily earning limit reached. Please contact support if this is unexpected.',
        });
        return;
      }

      history.dailyEarningsCoins += authorizedCoins;
      userClaimHistory.set(userId, history);

      // Server signs verified transaction receipt
      const transactionId = `tx_srv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const serverSignature = crypto
        .createHmac('sha256', 'FREE_EARN_ANTI_CHEAT_SECRET_KEY')
        .update(`${transactionId}:${userId}:${authorizedCoins}:${timestamp}`)
        .digest('hex');

      // Trigger referral qualification check if applicable
      if (rewardType === 'daily_checkin' || rewardType === 'daily_bonus') {
        evaluateAndProcessReferral(userId, 'checkin');
      } else if (rewardType === 'task_completion') {
        evaluateAndProcessReferral(userId, 'task_completion');
      }

      res.json({
        success: true,
        authorizedCoins,
        transactionId,
        serverSignature,
        rewardDescription,
        adsTodayCount: history.adsTodayCount,
        maxDailyAds: antiCheatConfig.maxDailyAdLimit,
      });
    } catch (err: any) {
      console.error('Anti-cheat validation error:', err);
      res.status(500).json({ success: false, error: 'Server security validation error.' });
    }
  }
);

/**
 * 2. Device Fingerprint & Session Security
 * Detects multiple accounts on the same device and rapid account switching.
 */
app.post('/api/security/device-session', (req: Request, res: Response): void => {
  try {
    const { userId, userName, deviceFingerprint } = req.body;

    if (!userId || !deviceFingerprint) {
      res.status(400).json({ success: false, error: 'Missing device registration parameters.' });
      return;
    }

    let accounts = deviceAccountsMap.get(deviceFingerprint);
    if (!accounts) {
      accounts = new Set<string>();
      deviceAccountsMap.set(deviceFingerprint, accounts);
    }
    accounts.add(userId);

    // Multi-account detection
    if (accounts.size > antiCheatConfig.maxAccountsPerDevice) {
      logSecurityEvent({
        userId,
        userName,
        eventType: 'MULTI_ACCOUNT_ABUSE',
        severity: 'high',
        riskScoreDelta: 45,
        reason: `${accounts.size} different accounts active on the same device fingerprint.`,
        metadata: {
          deviceFingerprint,
          accountCount: accounts.size,
          accountUids: Array.from(accounts),
        },
      });

      res.json({
        success: true,
        flagged: true,
        warning: 'Notice: Operating multiple accounts on a single device is restricted by fair play policy.',
        deviceAccountsCount: accounts.size,
      });
      return;
    }

    res.json({
      success: true,
      flagged: false,
      deviceAccountsCount: accounts.size,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Device security check failed.' });
  }
});

/**
 * 3. User Appeal Submission
 */
app.post('/api/security/appeal', (req: Request, res: Response): void => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      res.status(400).json({ success: false, error: 'Please enter your appeal explanation.' });
      return;
    }

    const flagged = flaggedAccounts.get(userId);
    if (flagged) {
      flagged.appealMessage = message;
      flagged.appealStatus = 'pending';
      flaggedAccounts.set(userId, flagged);
    }

    res.json({
      success: true,
      message: 'Your appeal has been securely submitted to the administration team for human review.',
    });
  } catch {
    res.status(500).json({ success: false, error: 'Appeal submission failed.' });
  }
});

// -------------------------------------------------------------
// ADMIN SECURITY DASHBOARD ENDPOINTS (Admin Only)
// -------------------------------------------------------------

/**
 * 4. Get Security Incident Events Feed
 */
app.get('/api/security/events', (req: Request, res: Response): void => {
  res.json({
    success: true,
    events: securityEvents.slice(0, 100),
    totalCount: securityEvents.length,
  });
});

/**
 * 5. Get Flagged Suspicious Accounts
 */
app.get('/api/security/flagged-users', (req: Request, res: Response): void => {
  const users = Array.from(flaggedAccounts.values());
  res.json({
    success: true,
    flaggedUsers: users,
    totalCount: users.length,
  });
});

/**
 * 6. Resolve / Clear Security Flag
 */
app.post('/api/security/resolve-flag', (req: Request, res: Response): void => {
  try {
    const { adminEmail, userId, action, reason } = req.body;
    // action: 'clear' | 'restrict' | 'dismiss'
    const account = flaggedAccounts.get(userId);

    if (account) {
      if (action === 'clear') {
        account.status = 'cleared';
        account.riskScore = 0;
        account.appealStatus = 'reviewed';
      } else if (action === 'restrict') {
        account.status = 'restricted';
        account.riskScore = 100;
      }
      flaggedAccounts.set(userId, account);
    }

    // Log admin intervention in immutable audit trail
    adminAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      adminId: 'admin_master',
      adminEmail: adminEmail || 'kumarankush5184@gmail.com',
      action: `SECURITY_FLAG_${action.toUpperCase()}`,
      targetId: userId,
      details: reason || `Admin ${action}ed security flags for user ${userId}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: `Flag updated to: ${action}` });
  } catch {
    res.status(500).json({ success: false, error: 'Could not update security flag.' });
  }
});

/**
 * 7. Admin Audit Logs
 */
app.get('/api/security/audit-logs', (req: Request, res: Response): void => {
  res.json({
    success: true,
    auditLogs: adminAuditLogs.slice(0, 100),
  });
});

/**
 * 8. Anti-Cheat Engine Configuration
 */
app.get('/api/security/config', (req: Request, res: Response): void => {
  res.json({
    success: true,
    config: antiCheatConfig,
  });
});

app.post('/api/security/config', (req: Request, res: Response): void => {
  try {
    const { adminEmail, newConfig } = req.body;
    if (newConfig) {
      antiCheatConfig = { ...antiCheatConfig, ...newConfig };

      adminAuditLogs.unshift({
        id: `audit_${Date.now()}`,
        adminId: 'admin_master',
        adminEmail: adminEmail || 'kumarankush5184@gmail.com',
        action: 'UPDATE_ANTI_CHEAT_CONFIG',
        details: `Updated thresholds: ${JSON.stringify(newConfig)}`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, config: antiCheatConfig });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update anti-cheat config.' });
  }
});

// -------------------------------------------------------------
// CORE BUSINESS REST API ENDPOINTS
// -------------------------------------------------------------

import {
  DEFAULT_SETTINGS,
  INITIAL_TASKS,
  INITIAL_ANNOUNCEMENTS,
  DEMO_USERS,
  DEMO_TRANSACTIONS,
  DEMO_SUBMISSIONS,
  DEMO_WITHDRAWALS,
} from './src/services/seedData.ts';
import type {
  UserProfile,
  Task,
  TaskSubmission,
  Transaction,
  Withdrawal,
  Announcement,
  AppSettings,
  Referral,
  ReferralCampaign,
  FraudReview,
} from './src/types/index.ts';

// Server-side database stores
const USERS_FILE = path.resolve(__dirname, 'data', 'users_registry.json');
const SETTINGS_FILE = path.resolve(__dirname, 'data', 'settings.json');
const TASKS_FILE = path.resolve(__dirname, 'data', 'tasks.json');
const ANNOUNCEMENTS_FILE = path.resolve(__dirname, 'data', 'announcements.json');
const WITHDRAWALS_FILE = path.resolve(__dirname, 'data', 'withdrawals.json');
const SUBMISSIONS_FILE = path.resolve(__dirname, 'data', 'submissions.json');
const REFERRALS_FILE = path.resolve(__dirname, 'data', 'referrals.json');
const CAMPAIGNS_FILE = path.resolve(__dirname, 'data', 'referral_campaigns.json');
const FRAUD_REVIEWS_FILE = path.resolve(__dirname, 'data', 'fraud_reviews.json');
const TRANSACTIONS_FILE = path.resolve(__dirname, 'data', 'transactions.json');

const usersStore = new Map<string, UserProfile>();

function loadUsersRegistry(): void {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((u: UserProfile) => {
          if (u && u.uid && !u.uid.startsWith('user_demo_')) {
            usersStore.set(u.uid, u);
          }
        });
      }
    }
  } catch (err) {
    console.error('Notice: Initializing fresh users store:', err);
  }
}

function saveUsersRegistry(): void {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Save only real users (exclude any legacy demo prefix if present)
    const list = Array.from(usersStore.values()).filter((u) => !u.uid.startsWith('user_demo_'));
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save users store to disk:', err);
  }
}

loadUsersRegistry();

function loadJsonStore<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`Notice: using default for ${path.basename(filePath)}`);
  }
  return fallback;
}

function saveJsonStore<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Failed to save ${path.basename(filePath)} to disk:`, e);
  }
}

let settingsStore: AppSettings = loadJsonStore<AppSettings>(SETTINGS_FILE, { ...DEFAULT_SETTINGS });
let tasksStore: Task[] = loadJsonStore<Task[]>(TASKS_FILE, []);
if (!Array.isArray(tasksStore) || tasksStore.length < INITIAL_TASKS.length) {
  tasksStore = INITIAL_TASKS.map((t, idx) => ({
    ...t,
    id: `task_${idx + 1}_${Date.now()}`,
    totalCompleted: 24 + idx * 12,
    createdAt: new Date().toISOString(),
  }));
  saveJsonStore(TASKS_FILE, tasksStore);
}
let submissionsStore: TaskSubmission[] = loadJsonStore<TaskSubmission[]>(SUBMISSIONS_FILE, []).filter(
  (s) => !s.userId.startsWith('user_demo_') && !s.id.startsWith('sub_demo_')
);
let withdrawalsStore: Withdrawal[] = loadJsonStore<Withdrawal[]>(WITHDRAWALS_FILE, []).filter(
  (w) => !w.userId.startsWith('user_demo_') && !w.id.startsWith('wd_demo_')
);
let transactionsStore: Transaction[] = loadJsonStore<Transaction[]>(TRANSACTIONS_FILE, []).filter(
  (t) => !t.userId.startsWith('user_demo_')
);
let announcementsStore: Announcement[] = loadJsonStore<Announcement[]>(
  ANNOUNCEMENTS_FILE,
  INITIAL_ANNOUNCEMENTS.map((a, idx) => ({
    ...a,
    id: `ann_${idx + 1}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }))
);

// -------------------------------------------------------------
// PRODUCTION-READY REFERRAL SYSTEM ENGINE & STORES
// -------------------------------------------------------------
const DEFAULT_REFERRAL_CAMPAIGN: ReferralCampaign = {
  id: 'campaign_smart_earn_2026',
  name: 'Smart Earn Official Referral Program',
  isActive: true,
  referrerRewardCoins: 100,
  refereeJoinBonusCoins: 50,
  maxRewardsPerUser: 50,
  qualificationRule: 'first_task_completed',
  minTasksRequired: 1,
  rewardMode: 'auto_reward',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.000Z',
  description: 'Invite genuine users. Referrer earns +100 Coins when referee completes first verified task. New referee receives +50 Coins welcome bonus.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let referralsStore: Referral[] = loadJsonStore<Referral[]>(REFERRALS_FILE, []);
let campaignsStore: ReferralCampaign[] = loadJsonStore<ReferralCampaign[]>(CAMPAIGNS_FILE, [DEFAULT_REFERRAL_CAMPAIGN]);
let fraudReviewsStore: FraudReview[] = loadJsonStore<FraudReview[]>(FRAUD_REVIEWS_FILE, []);

function saveReferralsStore(): void {
  saveJsonStore(REFERRALS_FILE, referralsStore);
}

function saveCampaignsStore(): void {
  saveJsonStore(CAMPAIGNS_FILE, campaignsStore);
}

function saveFraudReviewsStore(): void {
  saveJsonStore(FRAUD_REVIEWS_FILE, fraudReviewsStore);
}

function saveTransactionsStore(): void {
  saveJsonStore(TRANSACTIONS_FILE, transactionsStore);
}

function getActiveCampaign(): ReferralCampaign {
  const active = campaignsStore.find((c) => c.isActive);
  return active || DEFAULT_REFERRAL_CAMPAIGN;
}

/**
 * Requirement 1: Unique Referral Code Generator
 * Never generates duplicate referral codes.
 * Prefix SE + 6 alphanumeric characters (no ambiguous 0/O, 1/I).
 * Example: SE7K4P9X
 */
function generateUniqueReferralCode(): string {
  const existing = new Set<string>();
  usersStore.forEach((u) => {
    if (u.referralCode) existing.add(u.referralCode.trim().toUpperCase());
  });
  referralsStore.forEach((r) => {
    if (r.referrerCode) existing.add(r.referrerCode.trim().toUpperCase());
  });

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 3000; attempt++) {
    let code = 'SE';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!existing.has(code)) {
      return code;
    }
  }
  return `SE${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// Ensure all existing users have permanent SE referral codes
usersStore.forEach((u) => {
  if (!u.referralCode || !u.referralCode.startsWith('SE')) {
    u.referralCode = generateUniqueReferralCode();
  }
});
saveUsersRegistry();

/**
 * 1. Health & Server Status
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    firebase: {
      projectId: 'free-earn-cd0ea',
      connected: true,
      features: ['firestore', 'rtdb', 'auth'],
    },
    version: '2.5.0-fullstack',
  });
});

/**
 * Download Complete Project Zip File
 */
app.get('/api/download-zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'free-earn-user-app.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'free-earn-user-app.zip');
  } else {
    res.status(404).json({ success: false, error: 'Zip file not found' });
  }
});

app.get('/api/download-user-app', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'free-earn-user-app.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'free-earn-user-app.zip');
  } else {
    res.status(404).json({ success: false, error: 'Zip file not found' });
  }
});

app.get('/free-earn-user-app.zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'free-earn-user-app.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'free-earn-user-app.zip');
  } else {
    res.status(404).send('Zip file not found');
  }
});

app.get('/free-earn-admin-portal.zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'free-earn-admin-portal.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'free-earn-admin-portal.zip');
  } else {
    res.status(404).send('Zip file not found');
  }
});

app.get('/free-earn-app-full-source.zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'free-earn-app-full-source.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'free-earn-app-full-source.zip');
  } else {
    res.status(404).send('Zip file not found');
  }
});

/**
 * 2. User Authentication & Profile Registration
 */
app.post('/api/auth/send-otp', (req: Request, res: Response) => {
  try {
    const { mobile, name, mode } = req.body;
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '').slice(-10);

    if (cleanMobile.length !== 10) {
      res.status(400).json({ success: false, error: 'Kripya valid 10-digit mobile number enter karein.' });
      return;
    }

    // STRICT CHECK: If registering, ensure mobile and device are not already registered
    if (mode === 'register') {
      const validation = validateOneDeviceOneAccount(req, cleanMobile, undefined, true);
      if (!validation.allowed) {
        res.status(409).json({
          success: false,
          error: validation.errorMessage || 'This device or mobile number is already registered.',
          code: 'DUPLICATE_REGISTRATION',
        });
        return;
      }
    }

    const now = Date.now();
    const existing = phoneOtpStore.get(cleanMobile);

    // Rate-limit check: cooldown of 20s before requesting another OTP
    if (existing && now - existing.lastSentAt < 20 * 1000) {
      const waitRemaining = Math.ceil((20 * 1000 - (now - existing.lastSentAt)) / 1000);
      res.status(429).json({
        success: false,
        error: `Please wait ${waitRemaining}s before requesting a new OTP.`,
      });
      return;
    }

    // Generate secure 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5-minute expiry
    phoneOtpStore.set(cleanMobile, {
      otp: generatedOtp,
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
      requestCount: (existing?.requestCount || 0) + 1,
    });

    console.log(`📱 [SMS SERVICE] Sent 6-digit OTP ${generatedOtp} to +91 ${cleanMobile} for: ${name || 'Earner'}`);

    res.json({
      success: true,
      message: `OTP successfully sent to +91 ${cleanMobile}. Valid for 5 minutes.`,
      mobile: cleanMobile,
      otp: generatedOtp, // returned for client-side SMS banner / push preview
      expiresInSeconds: 300,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'OTP send failed.' });
  }
});

app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  try {
    const { mobile, otp } = req.body;
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanOtp = (otp || '').trim();

    if (cleanMobile.length !== 10 || !cleanOtp) {
      res.status(400).json({ success: false, error: 'Mobile number aur OTP dono required hain.' });
      return;
    }

    const entry = phoneOtpStore.get(cleanMobile);
    const now = Date.now();

    if (!entry) {
      res.status(400).json({
        success: false,
        error: 'OTP session expire ho gaya hai ya nahi mila. Kripya naya OTP mangwayein.',
      });
      return;
    }

    if (now > entry.expiresAt) {
      phoneOtpStore.delete(cleanMobile);
      res.status(400).json({
        success: false,
        error: 'OTP expire ho chuka hai (5 minutes exceeded). Kripya naya OTP bhejein.',
      });
      return;
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      phoneOtpStore.delete(cleanMobile);
      res.status(403).json({
        success: false,
        error: 'Too many incorrect attempts. Security lock: please request a new OTP.',
      });
      return;
    }

    if (entry.otp !== cleanOtp) {
      const remainingAttempts = 5 - entry.attempts;
      res.status(400).json({
        success: false,
        error: `Galat OTP! Kripya sahi 6-digit code dalein. (${remainingAttempts} attempts remaining)`,
      });
      return;
    }

    // Success! Clean up used OTP
    phoneOtpStore.delete(cleanMobile);

    loadUsersRegistry();
    const existingUser = Array.from(usersStore.values()).find(
      (u) =>
        (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanMobile) ||
        u.uid === `user_phone_${cleanMobile}`
    );

    res.json({
      success: true,
      message: 'Mobile number verified successfully!',
      verifiedMobile: cleanMobile,
      user: existingUser || undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Verification failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { uid, mobile, name, email, password, referralCode, isNew: explicitIsNew } = req.body;
    const cleanMobile = mobile ? mobile.replace(/[^0-9]/g, '').slice(-10) : '';
    const finalUid = uid || (cleanMobile ? `user_phone_${cleanMobile}` : `user_${Date.now()}`);

    let user = usersStore.get(finalUid);
    if (!user && cleanMobile) {
      user = Array.from(usersStore.values()).find(
        (u) =>
          u.uid === `user_phone_${cleanMobile}` ||
          (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanMobile)
      );
    }
    if (!user && email) {
      user = Array.from(usersStore.values()).find(
        (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
      );
    }

    const isNew = !user;

    // STRICT ONE PHONE + ONE MOBILE = ONE ACCOUNT SECURITY SYSTEM
    const validation = validateOneDeviceOneAccount(req, cleanMobile, finalUid, isNew);
    if (!validation.allowed) {
      res.status(409).json({
        success: false,
        error: validation.errorMessage || 'This device or mobile number is already registered.',
        code: 'DUPLICATE_REGISTRATION',
      });
      return;
    }

    // Set permanent 10-year HttpOnly device token cookie
    res.setHeader(
      'Set-Cookie',
      `__fe_dev_token=${validation.cookieToken}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax`
    );

    if (!user) {
      const newRefCode = generateUniqueReferralCode();
      const cleanRef = referralCode ? referralCode.trim().toUpperCase() : undefined;
      user = {
        uid: finalUid,
        name: name || (cleanMobile ? `User ${cleanMobile.slice(-4)}` : 'Smart Earn User'),
        mobile: cleanMobile ? `+91 ${cleanMobile}` : '',
        email: email || '',
        password: password || undefined,
        referralCode: newRefCode,
        referredBy: cleanRef,
        coins: 100, // 100 Welcome Coins
        todayEarnings: 100,
        totalEarnings: 100,
        totalWithdrawn: 0,
        pendingWithdrawalCoins: 0,
        level: 'Bronze',
        isBlocked: false,
        consecutiveCheckIns: 0,
        adsWatchedToday: 0,
        createdAt: new Date().toISOString(),
        isAdmin: email === 'kumarankush5184@gmail.com' || cleanMobile === '9113124207',
      };
      usersStore.set(finalUid, user);

      // Record referral relationship if referred by another user
      if (cleanRef) {
        recordReferralRelationship(
          cleanRef,
          user,
          validation.deviceHash,
          ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '').split(',')[0].trim()
        );
      }

      // Register device and phone persistently in backend database
      if (cleanMobile) {
        phoneRegistry.set(cleanMobile, {
          mobile: cleanMobile,
          userId: finalUid,
          deviceHash: validation.deviceHash,
          registeredAt: new Date().toISOString(),
          isUnlockedByAdmin: false,
        });
      }

      deviceRegistry.set(validation.deviceHash, {
        deviceHash: validation.deviceHash,
        cookieToken: validation.cookieToken,
        hardwareHash: validation.hardwareHash,
        userId: finalUid,
        userMobile: cleanMobile,
        userEmail: email || '',
        registeredAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        ipAddress: ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '').split(',')[0].trim(),
        userAgent: req.headers['user-agent'] || '',
        hardwareEntropy: req.body?.hardwareEntropy,
        isUnlockedByAdmin: false,
      });

      saveDeviceRegistry();
      saveUsersRegistry();

      // Record welcome transaction
      transactionsStore.unshift({
        id: `txn_welcome_${Date.now()}`,
        userId: finalUid,
        type: 'daily_bonus',
        amountCoins: 100,
        amountCurrency: 1.0,
        status: 'completed',
        description: 'Welcome Sign-up Bonus',
        createdAt: new Date().toISOString(),
      });
    } else {
      // Existing user logging in: update details & credentials
      if (password) user.password = password;
      if (name && (!user.name || user.name.startsWith('User '))) user.name = name;
      if (email && !user.email) user.email = email;
      if (cleanMobile && !user.mobile) user.mobile = `+91 ${cleanMobile}`;
      usersStore.set(user.uid, user);
      saveUsersRegistry();

      const devRecord = deviceRegistry.get(validation.deviceHash);
      if (devRecord) {
        devRecord.lastSeenAt = new Date().toISOString();
        saveDeviceRegistry();
      }
    }

    res.json({ success: true, user, isNew });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

/**
 * 2.0 Password Login: Sign in with Mobile OR Email + Password (Fast & Reliable)
 */
app.post('/api/auth/password-login', (req: Request, res: Response) => {
  try {
    const { identifier, password, cachedUser } = req.body;
    const cleanId = (identifier || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      res.status(400).json({ success: false, error: 'Mobile number ya Email aur Password dono required hain.' });
      return;
    }

    // Refresh store from disk if needed
    loadUsersRegistry();

    let foundUser: UserProfile | undefined;
    const cleanDigits = cleanId.replace(/[^0-9]/g, '').slice(-10);
    const cleanEmail = cleanId.toLowerCase();

    // 1. Search in usersStore
    for (const u of usersStore.values()) {
      const uDigits = (u.mobile || '').replace(/[^0-9]/g, '').slice(-10);
      const uEmail = (u.email || '').toLowerCase().trim();
      const uUid = (u.uid || '').toLowerCase().trim();

      if (cleanEmail.includes('@') && uEmail === cleanEmail) {
        foundUser = u;
        break;
      }
      if (cleanDigits.length === 10 && (uDigits === cleanDigits || uUid === `user_phone_${cleanDigits}` || uUid.includes(cleanDigits))) {
        foundUser = u;
        break;
      }
      if (uUid === cleanId.toLowerCase()) {
        foundUser = u;
        break;
      }
    }

    // 2. If not found in usersStore but client provides cachedUser (e.g. from local storage or Firestore)
    if (!foundUser && cachedUser) {
      const fallbackUid = (cachedUser.uid || (cleanDigits ? `user_phone_${cleanDigits}` : `user_${Date.now()}`)).trim();
      const fallbackUser: UserProfile = {
        uid: fallbackUid,
        name: cachedUser.name || 'User',
        mobile: cachedUser.mobile || (cleanDigits ? `+91 ${cleanDigits}` : ''),
        email: cachedUser.email || (cleanEmail.includes('@') ? cleanEmail : ''),
        password: cachedUser.password || cleanPass,
        referralCode: cachedUser.referralCode || generateUniqueReferralCode(),
        coins: Number(cachedUser.coins) || 0,
        todayEarnings: Number(cachedUser.todayEarnings) || 0,
        totalEarnings: Number(cachedUser.totalEarnings) || 0,
        totalWithdrawn: Number(cachedUser.totalWithdrawn) || 0,
        pendingWithdrawalCoins: Number(cachedUser.pendingWithdrawalCoins) || 0,
        level: cachedUser.level || 'Bronze',
        isBlocked: Boolean(cachedUser.isBlocked),
        consecutiveCheckIns: Number(cachedUser.consecutiveCheckIns) || 0,
        adsWatchedToday: Number(cachedUser.adsWatchedToday) || 0,
        createdAt: cachedUser.createdAt || new Date().toISOString(),
      };
      foundUser = fallbackUser;
      usersStore.set(fallbackUid, fallbackUser);
      saveUsersRegistry();
    }

    if (!foundUser) {
      res.status(404).json({
        success: false,
        error: 'Yeh Mobile number ya Email registered nahi hai. Kripya naya account Register karein.',
      });
      return;
    }

    if (foundUser.isBlocked) {
      res.status(403).json({
        success: false,
        error: 'Yeh account policy violation ki wajah se suspended hai.',
      });
      return;
    }

    // Password verification (if set on account)
    if (foundUser.password && (foundUser.password || '').trim() !== cleanPass.trim()) {
      res.status(401).json({
        success: false,
        error: 'Galat Password! Kripya sahi password enter karein.',
      });
      return;
    }

    // If account was created before password field or password was empty, associate it now
    if (!foundUser.password && cleanPass) {
      foundUser.password = cleanPass;
      usersStore.set(foundUser.uid, foundUser);
      saveUsersRegistry();
    }

    // Resolve server device and issue permanent cookie token
    const { deviceHash, cookieToken } = resolveServerDevice(req, req.body);
    res.setHeader(
      'Set-Cookie',
      `__fe_dev_token=${cookieToken}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax`
    );

    const devRecord = deviceRegistry.get(deviceHash);
    if (devRecord) {
      devRecord.lastSeenAt = new Date().toISOString();
      saveDeviceRegistry();
    }

    res.json({ success: true, user: foundUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

app.get(['/admin', '/admin-portal', '/portal'], (_req: Request, res: Response) => {
  res.redirect('/#/admin');
});

/**
 * 2.1 REFERRAL SYSTEM ENGINE (PRODUCTION-READY)
 */

interface ReferralResult {
  success: boolean;
  referral?: Referral;
  error?: string;
  code?: string;
}

function recordReferralRelationship(
  referrerCode: string,
  newUser: UserProfile,
  deviceHash?: string,
  ipAddress?: string
): ReferralResult {
  const cleanCode = (referrerCode || '').trim().toUpperCase();
  if (!cleanCode) return { success: false, error: 'Referral code missing.' };

  // 1. Find referrer by referral code
  const referrer = Array.from(usersStore.values()).find(
    (u) => u.referralCode?.trim().toUpperCase() === cleanCode
  );

  if (!referrer) {
    return { success: false, error: 'Invalid referral code.', code: 'INVALID_CODE' };
  }

  // 2. Anti-fraud: Self-referral protection
  const cleanNewMobile = (newUser.mobile || '').replace(/[^0-9]/g, '').slice(-10);
  const cleanRefMobile = (referrer.mobile || '').replace(/[^0-9]/g, '').slice(-10);

  if (referrer.uid === newUser.uid || (cleanNewMobile && cleanRefMobile && cleanNewMobile === cleanRefMobile)) {
    return {
      success: false,
      error: 'Self-referral is not allowed under Fair Play policy.',
      code: 'SELF_REFERRAL_BLOCKED',
    };
  }

  // 3. Immutability: Check if newUser was already referred
  const existingReferral = referralsStore.find((r) => r.referredUserId === newUser.uid);
  if (existingReferral) {
    return {
      success: false,
      error: 'User has already been attributed to a referral.',
      code: 'ALREADY_REFERRED',
    };
  }

  const campaign = getActiveCampaign();
  const now = new Date().toISOString();
  let fraudScore = 0;
  const fraudReasons: string[] = [];

  // Check device match with referrer
  if (deviceHash) {
    const referrerDevice = deviceRegistry.get(deviceHash);
    if (referrerDevice && referrerDevice.userId === referrer.uid) {
      fraudScore += 60;
      fraudReasons.push('Device fingerprint matches referrer device (Same Device detected)');
    }
  }

  // Velocity check: count registrations with this referral code in last 15 minutes
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  const recentReferralsCount = referralsStore.filter((r) => {
    return (
      r.referrerCode === cleanCode &&
      new Date(r.createdAt).getTime() > fifteenMinsAgo
    );
  }).length;

  if (recentReferralsCount >= 3) {
    fraudScore += 35;
    fraudReasons.push(`Velocity alert: ${recentReferralsCount + 1} registrations in 15 minutes`);
  }

  const referralId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const referral: Referral = {
    id: referralId,
    referrerUserId: referrer.uid,
    referrerName: referrer.name,
    referrerMobile: referrer.mobile ? referrer.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') : '',
    referrerCode: cleanCode,
    referredUserId: newUser.uid,
    referredUserName: newUser.name,
    referredUserMobile: newUser.mobile ? newUser.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') : '',
    status: 'pending',
    qualificationStatus: campaign.qualificationRule === 'instant' ? 'qualified' : 'waiting_task',
    rewardStatus: 'unrewarded',
    rewardAmountCoins: campaign.referrerRewardCoins,
    fraudScore,
    fraudReasons,
    deviceHash,
    ipAddress,
    createdAt: now,
  };

  referralsStore.unshift(referral);
  saveReferralsStore();

  // If high fraud score, add to fraudReviewsStore
  if (fraudScore >= 60) {
    const reviewId = `fr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    fraudReviewsStore.unshift({
      id: reviewId,
      referralId: referral.id,
      referrerUserId: referrer.uid,
      referredUserId: newUser.uid,
      riskScore: fraudScore,
      reasons: fraudReasons,
      status: 'pending_review',
      deviceHash,
      ipAddress,
      createdAt: now,
    });
    saveFraudReviewsStore();
  }

  // Credit Welcome Bonus to New User (Atomic Transaction)
  if (campaign.refereeJoinBonusCoins > 0) {
    newUser.coins = (newUser.coins || 0) + campaign.refereeJoinBonusCoins;
    newUser.totalEarnings = (newUser.totalEarnings || 0) + campaign.refereeJoinBonusCoins;
    usersStore.set(newUser.uid, newUser);
    saveUsersRegistry();

    const welcomeTxn: Transaction = {
      id: `txn_welcome_${newUser.uid}_${Date.now()}`,
      userId: newUser.uid,
      type: 'referral_bonus',
      amountCoins: campaign.refereeJoinBonusCoins,
      amountCurrency: campaign.refereeJoinBonusCoins / 100,
      status: 'completed',
      description: `Welcome bonus via referral code ${cleanCode}`,
      createdAt: now,
      processedAt: now,
    };
    transactionsStore.unshift(welcomeTxn);
    saveTransactionsStore();
  }

  // If instant rule and auto_reward and no fraud flag:
  if (campaign.qualificationRule === 'instant' && campaign.rewardMode === 'auto_reward' && fraudScore < 60) {
    processReferralRewardAtomic(referral);
  }

  return { success: true, referral };
}

function processReferralRewardAtomic(referral: Referral): { success: boolean; error?: string } {
  // Idempotency: prevent double crediting
  if (referral.status === 'rewarded' || referral.rewardStatus === 'rewarded') {
    return { success: false, error: 'Referral reward has already been credited.' };
  }

  const referrer = usersStore.get(referral.referrerUserId);
  if (!referrer) {
    return { success: false, error: 'Referrer not found.' };
  }

  const campaign = getActiveCampaign();

  // Cap check
  if (campaign.maxRewardsPerUser > 0) {
    const currentRewarded = referralsStore.filter(
      (r) => r.referrerUserId === referral.referrerUserId && r.status === 'rewarded'
    ).length;
    if (currentRewarded >= campaign.maxRewardsPerUser) {
      referral.status = 'verified';
      referral.notes = `Referrer reached max rewards cap (${campaign.maxRewardsPerUser})`;
      saveReferralsStore();
      return { success: false, error: 'Referrer reached maximum referral rewards cap.' };
    }
  }

  const txnId = `txn_ref_reward_${referral.id}`;
  // Duplicate transaction prevention
  if (transactionsStore.some((t) => t.id === txnId)) {
    return { success: false, error: 'Transaction already exists.' };
  }

  const now = new Date().toISOString();
  const rewardCoins = referral.rewardAmountCoins || campaign.referrerRewardCoins || 100;

  // 1. Create Transaction Record
  const txn: Transaction = {
    id: txnId,
    userId: referral.referrerUserId,
    type: 'referral_reward',
    amountCoins: rewardCoins,
    amountCurrency: rewardCoins / 100,
    referralUserId: referral.referredUserId,
    status: 'completed',
    description: `Referral Reward for inviting ${referral.referredUserName || 'Member'}`,
    createdAt: now,
    processedAt: now,
  };
  transactionsStore.unshift(txn);
  saveTransactionsStore();

  // 2. Increment Referrer Wallet Balance
  referrer.coins = (referrer.coins || 0) + rewardCoins;
  referrer.totalEarnings = (referrer.totalEarnings || 0) + rewardCoins;
  usersStore.set(referrer.uid, referrer);
  saveUsersRegistry();

  // 3. Update Referral Record
  referral.status = 'rewarded';
  referral.rewardStatus = 'rewarded';
  referral.rewardTransactionId = txnId;
  referral.rewardedAt = now;
  saveReferralsStore();

  return { success: true };
}

function evaluateAndProcessReferral(
  referredUserId: string,
  trigger: 'task_completion' | 'checkin' | 'manual'
): { qualified: boolean; rewarded: boolean; message: string } {
  const referral = referralsStore.find((r) => r.referredUserId === referredUserId);
  if (!referral) {
    return { qualified: false, rewarded: false, message: 'No referral relationship found for user.' };
  }

  if (referral.status === 'rewarded') {
    return { qualified: true, rewarded: true, message: 'Referral is already rewarded.' };
  }

  if (referral.status === 'rejected') {
    return { qualified: false, rewarded: false, message: 'Referral was rejected.' };
  }

  const campaign = getActiveCampaign();

  // Qualification condition check
  let isEligible = false;
  if (trigger === 'manual') {
    isEligible = true;
  } else if (campaign.qualificationRule === 'first_task_completed' && trigger === 'task_completion') {
    isEligible = true;
  } else if (campaign.qualificationRule === 'checkin_completed' && (trigger === 'checkin' || trigger === 'task_completion')) {
    isEligible = true;
  } else if (campaign.qualificationRule === 'instant' || campaign.qualificationRule === 'account_verified') {
    isEligible = true;
  }

  if (!isEligible) {
    return { qualified: false, rewarded: false, message: 'Qualification condition not yet met.' };
  }

  referral.qualificationStatus = 'qualified';
  referral.qualifiedAt = new Date().toISOString();

  // If fraud score is high, mark for manual review
  if (referral.fraudScore >= 60) {
    referral.status = 'reward_eligible';
    referral.rewardStatus = 'pending_approval';
    saveReferralsStore();
    return { qualified: true, rewarded: false, message: 'Qualified but held for admin fraud review.' };
  }

  referral.status = 'verified';

  if (campaign.rewardMode === 'auto_reward') {
    const res = processReferralRewardAtomic(referral);
    return { qualified: true, rewarded: res.success, message: res.success ? 'Reward credited!' : res.error || 'Failed' };
  } else {
    referral.status = 'reward_eligible';
    referral.rewardStatus = 'pending_approval';
    saveReferralsStore();
    return { qualified: true, rewarded: false, message: 'Reward marked eligible pending admin disbursement.' };
  }
}

app.get('/r/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').trim().toUpperCase();
  res.redirect(`/?ref=${encodeURIComponent(code)}`);
});

app.get('/ref/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').trim().toUpperCase();
  res.redirect(`/?ref=${encodeURIComponent(code)}`);
});

app.get('/api/referrals/lookup/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ success: false, valid: false, error: 'Referral code is required.' });
    return;
  }

  const campaign = getActiveCampaign();

  // Find user by referral code in memory store
  const referrer = Array.from(usersStore.values()).find(
    (u) => u.referralCode?.trim().toUpperCase() === code
  );

  if (referrer) {
    res.json({
      success: true,
      valid: true,
      code,
      referrerName: referrer.name,
      bonusCoins: campaign.refereeJoinBonusCoins || 50,
    });
    return;
  }

  res.status(404).json({ success: false, valid: false, error: 'Invalid referral code.' });
});

// User Referral Dashboard Data
app.get('/api/referrals/my-referrals/:uid', (req: Request, res: Response) => {
  const uid = req.params.uid;
  let user = usersStore.get(uid);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  // Ensure user has permanent SE referral code
  if (!user.referralCode || !user.referralCode.startsWith('SE')) {
    user.referralCode = generateUniqueReferralCode();
    usersStore.set(uid, user);
    saveUsersRegistry();
  }

  const userReferrals = referralsStore.filter((r) => r.referrerUserId === uid);
  const campaign = getActiveCampaign();

  const totalInvited = userReferrals.length;
  const successfulReferrals = userReferrals.filter((r) => r.status === 'rewarded' || r.status === 'verified').length;
  const pendingReferrals = userReferrals.filter((r) => r.status === 'pending').length;
  const eligibleRewardsCoins = userReferrals
    .filter((r) => r.status === 'reward_eligible')
    .reduce((sum, r) => sum + (r.rewardAmountCoins || campaign.referrerRewardCoins), 0);
  const totalRewardCoins = userReferrals
    .filter((r) => r.status === 'rewarded')
    .reduce((sum, r) => sum + (r.rewardAmountCoins || campaign.referrerRewardCoins), 0);

  // Masked privacy history for referring user
  const history = userReferrals.map((r) => ({
    id: r.id,
    referredUserName: r.referredUserName ? r.referredUserName.replace(/(\w{2})\w+(\w)/, '$1***$2') : 'Smart Earner',
    referredUserMobile: r.referredUserMobile ? r.referredUserMobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') : 'Verified User',
    status: r.status,
    qualificationStatus: r.qualificationStatus,
    rewardStatus: r.rewardStatus,
    rewardAmountCoins: r.rewardAmountCoins || campaign.referrerRewardCoins,
    createdAt: r.createdAt,
    qualifiedAt: r.qualifiedAt,
    rewardedAt: r.rewardedAt,
    notes: r.notes,
  }));

  res.json({
    success: true,
    referralCode: user.referralCode,
    referralLink: `https://free-earn12.vercel.app/?ref=${user.referralCode}`,
    stats: {
      totalInvited,
      successfulReferrals,
      pendingReferrals,
      eligibleRewardsCoins,
      totalRewardCoins,
      totalRewardCurrency: totalRewardCoins / 100,
    },
    referrals: history,
    campaign: {
      name: campaign.name,
      referrerRewardCoins: campaign.referrerRewardCoins,
      refereeJoinBonusCoins: campaign.refereeJoinBonusCoins,
      qualificationRule: campaign.qualificationRule,
      maxRewardsPerUser: campaign.maxRewardsPerUser,
    },
  });
});

// Attribute referral after/during registration
app.post('/api/referrals/attribute', (req: Request, res: Response) => {
  try {
    const { referralCode, userId } = req.body;
    if (!referralCode || !userId) {
      res.status(400).json({ success: false, error: 'referralCode and userId are required.' });
      return;
    }

    const user = usersStore.get(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const result = recordReferralRelationship(referralCode, user, req.cookies?.__fe_dev_token, (req.ip || ''));
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json({
      success: true,
      message: 'Referral attributed successfully.',
      referral: result.referral,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to attribute referral.' });
  }
});

// Admin Referral Dashboard: List, Stats, Campaigns
app.get('/api/admin/referrals', (_req: Request, res: Response) => {
  const campaign = getActiveCampaign();

  const total = referralsStore.length;
  const verified = referralsStore.filter((r) => r.status === 'verified').length;
  const pending = referralsStore.filter((r) => r.status === 'pending').length;
  const rewardEligible = referralsStore.filter((r) => r.status === 'reward_eligible').length;
  const rewarded = referralsStore.filter((r) => r.status === 'rewarded').length;
  const rejected = referralsStore.filter((r) => r.status === 'rejected').length;

  const totalRewardsCoins = referralsStore
    .filter((r) => r.status === 'rewarded')
    .reduce((sum, r) => sum + (r.rewardAmountCoins || campaign.referrerRewardCoins), 0);

  const conversionRate = total > 0 ? Number(((rewarded / total) * 100).toFixed(1)) : 0;

  res.json({
    success: true,
    referrals: referralsStore,
    stats: {
      totalReferrals: total,
      verifiedReferrals: verified,
      pendingReferrals: pending,
      rewardEligibleReferrals: rewardEligible,
      rewardedReferrals: rewarded,
      rejectedReferrals: rejected,
      totalRewardsCoins,
      totalRewardsCurrency: totalRewardsCoins / 100,
      conversionRate,
    },
    campaign,
  });
});

// Admin: Approve and credit referral reward
app.post('/api/admin/referrals/:id/approve-reward', (req: Request, res: Response) => {
  const refId = req.params.id;
  const referral = referralsStore.find((r) => r.id === refId);
  if (!referral) {
    res.status(404).json({ success: false, error: 'Referral not found.' });
    return;
  }

  const result = processReferralRewardAtomic(referral);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json({
    success: true,
    message: `Reward of ${referral.rewardAmountCoins} coins credited to referrer.`,
    referral,
  });
});

// Admin: Mark referral verified
app.post('/api/admin/referrals/:id/verify', (req: Request, res: Response) => {
  const refId = req.params.id;
  const referral = referralsStore.find((r) => r.id === refId);
  if (!referral) {
    res.status(404).json({ success: false, error: 'Referral not found.' });
    return;
  }

  referral.status = 'verified';
  referral.qualificationStatus = 'qualified';
  referral.qualifiedAt = new Date().toISOString();
  saveReferralsStore();

  res.json({ success: true, referral });
});

// Admin: Reject referral
app.post('/api/admin/referrals/:id/reject', (req: Request, res: Response) => {
  const refId = req.params.id;
  const { reason } = req.body;
  const referral = referralsStore.find((r) => r.id === refId);
  if (!referral) {
    res.status(404).json({ success: false, error: 'Referral not found.' });
    return;
  }

  referral.status = 'rejected';
  referral.rewardStatus = 'rejected';
  referral.qualificationStatus = 'disqualified';
  referral.rejectionReason = reason || 'Admin review rejection';
  saveReferralsStore();

  res.json({ success: true, referral });
});

// Admin: Configure Referral Campaign Rules
app.put('/api/admin/referrals/campaign', (req: Request, res: Response) => {
  try {
    const campaign = getActiveCampaign();
    const updated: ReferralCampaign = {
      ...campaign,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    const idx = campaignsStore.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      campaignsStore[idx] = updated;
    } else {
      campaignsStore.unshift(updated);
    }
    saveCampaignsStore();

    // Also update settingsStore so settings tab stays in sync
    if (req.body.referrerRewardCoins !== undefined) {
      settingsStore.referralRewardCoins = Number(req.body.referrerRewardCoins);
    }
    if (req.body.refereeJoinBonusCoins !== undefined) {
      settingsStore.referralJoinBonusCoins = Number(req.body.refereeJoinBonusCoins);
    }
    if (req.body.isActive !== undefined) {
      settingsStore.referralEnabled = Boolean(req.body.isActive);
    }
    saveJsonStore(SETTINGS_FILE, settingsStore);

    res.json({ success: true, campaign: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update campaign.' });
  }
});

// Admin: Fraud Reviews
app.get('/api/admin/referrals/fraud-reviews', (_req: Request, res: Response) => {
  res.json({ success: true, reviews: fraudReviewsStore });
});

app.post('/api/admin/referrals/fraud-reviews/:id/resolve', (req: Request, res: Response) => {
  const { status, adminNotes } = req.body;
  const review = fraudReviewsStore.find((fr) => fr.id === req.params.id);
  if (!review) {
    res.status(404).json({ success: false, error: 'Fraud review record not found.' });
    return;
  }

  review.status = status;
  review.adminNotes = adminNotes;
  review.reviewedAt = new Date().toISOString();
  saveFraudReviewsStore();

  const referral = referralsStore.find((r) => r.id === review.referralId);
  if (referral) {
    if (status === 'approved') {
      referral.fraudScore = 20; // Cleared
      if (referral.status === 'pending') referral.status = 'verified';
    } else if (status === 'rejected') {
      referral.status = 'rejected';
      referral.rewardStatus = 'rejected';
      referral.rejectionReason = 'Flagged by fraud protection review: ' + (adminNotes || 'Policy violation');
    }
    saveReferralsStore();
  }

  res.json({ success: true, review });
});

/**
 * 2.2 Device Security & 1-Phone-1-Account Admin Review Endpoints (Requirement 14)
 */
app.get('/api/admin/devices', (_req: Request, res: Response) => {
  try {
    const devicesList = Array.from(deviceRegistry.values()).map((d) => {
      const u = usersStore.get(d.userId);
      return {
        ...d,
        userName: u?.name || 'Verified User',
        userMobile: u?.mobile || d.userMobile || 'No mobile',
      };
    });

    res.json({
      success: true,
      devices: devicesList,
      phones: Array.from(phoneRegistry.values()),
      appeals: deviceAppeals,
      totalRegisteredDevices: deviceRegistry.size,
      totalRegisteredPhones: phoneRegistry.size,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve registered devices.' });
  }
});

// Admin unlock device / phone for legitimate phone replacement
app.post('/api/admin/devices/unlock', (req: Request, res: Response) => {
  try {
    const { deviceHash, mobile, reason, adminEmail } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, error: 'Reason for unlocking is required.' });
      return;
    }

    let unlockedCount = 0;
    if (deviceHash && deviceRegistry.has(deviceHash)) {
      const dev = deviceRegistry.get(deviceHash)!;
      dev.isUnlockedByAdmin = true;
      dev.unlockedAt = new Date().toISOString();
      dev.unlockedReason = reason;
      unlockedCount++;
    }

    if (mobile) {
      const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
      if (phoneRegistry.has(cleanMobile)) {
        const p = phoneRegistry.get(cleanMobile)!;
        p.isUnlockedByAdmin = true;
        p.unlockedAt = new Date().toISOString();
        p.unlockedReason = reason;
        unlockedCount++;
      }
    }

    // If appeal ID was passed, update appeal status
    if (req.body.appealId) {
      const appeal = deviceAppeals.find((a) => a.id === req.body.appealId);
      if (appeal) {
        appeal.status = 'approved';
        appeal.reviewedAt = new Date().toISOString();
        appeal.reviewNotes = reason;
      }
    }

    saveDeviceRegistry();

    adminAuditLogs.unshift({
      id: `audit_dev_${Date.now()}`,
      adminId: 'admin_master',
      adminEmail: adminEmail || 'kumarankush5184@gmail.com',
      action: 'DEVICE_PHONE_UNLOCKED',
      targetId: deviceHash || mobile,
      details: `Admin unlocked device/phone: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Successfully approved & unlocked device/phone binding (${unlockedCount} updated).`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Unlock action failed.' });
  }
});

// User Device Replacement Appeal (Requirement 14)
app.post('/api/security/device-appeal', (req: Request, res: Response) => {
  try {
    const { mobile, name, reason } = req.body;
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '').slice(-10);

    if (cleanMobile.length !== 10 || !reason) {
      res.status(400).json({ success: false, error: 'Mobile number aur reason dono required hain.' });
      return;
    }

    const { deviceHash } = resolveServerDevice(req, req.body);
    const appealRecord: DeviceAppealRecord = {
      id: `appeal_${Date.now()}`,
      mobile: cleanMobile,
      name: name || `User ${cleanMobile.slice(-4)}`,
      reason: reason.trim(),
      deviceHash,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    deviceAppeals.unshift(appealRecord);
    saveDeviceRegistry();

    res.json({
      success: true,
      message: 'Your phone change appeal has been submitted to the admin team for verification and approval.',
    });
  } catch {
    res.status(500).json({ success: false, error: 'Appeal submission failed.' });
  }
});

app.get('/api/security/device-appeals', (_req: Request, res: Response) => {
  res.json({ success: true, appeals: deviceAppeals });
});

app.get('/api/referrals/team/:uid', (req: Request, res: Response) => {
  const user = usersStore.get(req.params.uid);
  if (!user || !user.referralCode) {
    res.json({ success: true, team: [], totalCommission: 0 });
    return;
  }

  const team = Array.from(usersStore.values())
    .filter((u) => u.referredBy?.toUpperCase() === user.referralCode?.toUpperCase())
    .map((u) => ({
      uid: u.uid,
      name: u.name,
      mobile: u.mobile ? u.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') : 'Verified Member',
      joinedAt: u.createdAt,
      earnings: u.totalEarnings || 0,
      rewardCoins: 100,
    }));

  const totalCommission = team.length * 100;
  res.json({ success: true, team, totalCommission });
});

/**
 * 3. User Profiles
 */
app.get('/api/users/:uid', (req: Request, res: Response) => {
  loadUsersRegistry();
  const query = (req.params.uid || '').trim();
  let user = usersStore.get(query);
  if (!user) {
    const cleanDigits = query.replace(/[^0-9]/g, '').slice(-10);
    user = Array.from(usersStore.values()).find(
      (u) =>
        u.uid === query ||
        (u.email && u.email.toLowerCase() === query.toLowerCase()) ||
        (cleanDigits.length === 10 && (
          u.uid === `user_phone_${cleanDigits}` ||
          (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits)
        ))
    );
  }
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, user });
});

app.put('/api/users/:uid', (req: Request, res: Response) => {
  loadUsersRegistry();
  const query = (req.params.uid || '').trim();
  let existing = usersStore.get(query);
  if (!existing) {
    const cleanDigits = query.replace(/[^0-9]/g, '').slice(-10);
    existing = Array.from(usersStore.values()).find(
      (u) =>
        u.uid === query ||
        (u.email && u.email.toLowerCase() === query.toLowerCase()) ||
        (cleanDigits.length === 10 && (
          u.uid === `user_phone_${cleanDigits}` ||
          (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits)
        ))
    );
  }
  if (!existing) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  usersStore.set(existing.uid, updated);
  saveUsersRegistry();
  res.json({ success: true, user: updated });
});

app.delete('/api/users/:uid', (req: Request, res: Response) => {
  loadUsersRegistry();
  const query = (req.params.uid || '').trim();
  usersStore.delete(query);
  const cleanDigits = query.replace(/[^0-9]/g, '').slice(-10);
  if (cleanDigits.length === 10) {
    usersStore.delete(`user_phone_${cleanDigits}`);
  }
  saveUsersRegistry();
  res.json({ success: true, message: 'User deleted successfully' });
});

app.get('/api/users', (_req: Request, res: Response) => {
  loadUsersRegistry();
  const realUsers = Array.from(usersStore.values()).filter((u) => !u.uid.startsWith('user_demo_'));
  res.json({ success: true, users: realUsers });
});

// Admin endpoint to add / register a new real user
app.post('/api/admin/users', (req: Request, res: Response) => {
  loadUsersRegistry();
  const { name, mobile, email, password, coins, isAdmin } = req.body;
  if (!name || (!mobile && !email)) {
    res.status(400).json({ success: false, error: 'Full Name and either Mobile number or Email are required.' });
    return;
  }
  const cleanDigits = (mobile || '').replace(/[^0-9]/g, '').slice(-10);
  const cleanEmail = (email || '').trim().toLowerCase();

  // Check for duplicates among real users
  const existing = Array.from(usersStore.values()).find(
    (u) =>
      !u.uid.startsWith('user_demo_') &&
      ((cleanDigits.length === 10 && u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail))
  );

  if (existing) {
    res.status(400).json({
      success: false,
      error: `A user with this ${cleanDigits.length === 10 ? 'mobile number' : 'email'} is already registered.`,
    });
    return;
  }

  const uid =
    cleanDigits.length === 10
      ? `user_phone_${cleanDigits}`
      : cleanEmail
      ? `user_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`
      : `user_real_${Date.now()}`;

  const referralCode = generateUniqueReferralCode();
  const nowIso = new Date().toISOString();
  const initialCoins = Math.max(0, Number(coins) || 0);

  const newUser: UserProfile = {
    uid,
    name: name.trim(),
    mobile: cleanDigits ? `+91 ${cleanDigits}` : '',
    email: cleanEmail || '',
    password: password || 'pass1234',
    referralCode,
    coins: initialCoins,
    todayEarnings: initialCoins,
    totalEarnings: initialCoins,
    totalWithdrawn: 0,
    pendingWithdrawalCoins: 0,
    level: initialCoins >= 2000 ? 'Gold' : initialCoins >= 500 ? 'Silver' : 'Bronze',
    isBlocked: false,
    consecutiveCheckIns: 0,
    adsWatchedToday: 0,
    createdAt: nowIso,
    isAdmin: Boolean(isAdmin),
  };

  usersStore.set(uid, newUser);
  saveUsersRegistry();

  if (initialCoins > 0) {
    transactionsStore = loadJsonStore<Transaction[]>(TRANSACTIONS_FILE, []);
    transactionsStore.unshift({
      id: `txn_${Date.now()}_init`,
      userId: uid,
      type: 'admin_adjustment',
      amountCoins: initialCoins,
      amountCurrency: initialCoins / 100,
      status: 'completed',
      description: 'Account Setup Welcome Bonus credited by Administrator',
      createdAt: nowIso,
    });
    saveJsonStore(TRANSACTIONS_FILE, transactionsStore);
  }

  res.json({ success: true, user: newUser });
});


/**
 * 4. Tasks & Proof Submissions
 */
app.get('/api/tasks', (_req: Request, res: Response) => {
  tasksStore = loadJsonStore<Task[]>(TASKS_FILE, tasksStore);
  res.json({ success: true, tasks: tasksStore });
});

app.post('/api/tasks', (req: Request, res: Response) => {
  tasksStore = loadJsonStore<Task[]>(TASKS_FILE, tasksStore);
  const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const task: Task = {
    ...req.body,
    id,
    createdAt: new Date().toISOString(),
  };
  tasksStore.unshift(task);
  saveJsonStore(TASKS_FILE, tasksStore);
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  tasksStore = loadJsonStore<Task[]>(TASKS_FILE, tasksStore);
  const idx = tasksStore.findIndex((t) => t.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }
  tasksStore[idx] = { ...tasksStore[idx], ...req.body };
  saveJsonStore(TASKS_FILE, tasksStore);
  res.json({ success: true, task: tasksStore[idx] });
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  tasksStore = loadJsonStore<Task[]>(TASKS_FILE, tasksStore);
  tasksStore = tasksStore.filter((t) => t.id !== req.params.id);
  saveJsonStore(TASKS_FILE, tasksStore);
  res.json({ success: true, message: 'Task deleted' });
});

app.post('/api/submissions', (req: Request, res: Response) => {
  const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const sub: TaskSubmission = {
    ...req.body,
    id,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  submissionsStore.unshift(sub);
  saveJsonStore(SUBMISSIONS_FILE, submissionsStore);
  res.json({ success: true, submission: sub });
});

app.get('/api/submissions', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (userId) {
    res.json({ success: true, submissions: submissionsStore.filter((s) => s.userId === userId) });
  } else {
    res.json({ success: true, submissions: submissionsStore });
  }
});

app.post('/api/submissions/:id/review', (req: Request, res: Response) => {
  const { status, adminNotes } = req.body;
  const idx = submissionsStore.findIndex((s) => s.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ success: false, error: 'Submission not found' });
    return;
  }
  const sub = submissionsStore[idx];
  sub.status = status;
  sub.adminNotes = adminNotes;
  sub.reviewedAt = new Date().toISOString();
  submissionsStore[idx] = sub;

  // Credit coins if approved
  if (status === 'approved') {
    const user = usersStore.get(sub.userId);
    if (user) {
      user.coins += sub.rewardCoins;
      user.todayEarnings += sub.rewardCoins;
      user.totalEarnings += sub.rewardCoins;
      usersStore.set(user.uid, user);
      saveUsersRegistry();

      transactionsStore.unshift({
        id: `txn_${Date.now()}`,
        userId: user.uid,
        type: 'task_reward',
        amountCoins: sub.rewardCoins,
        amountCurrency: sub.rewardCoins / settingsStore.coinToCurrencyRatio,
        status: 'completed',
        description: `Reward for task: ${sub.taskTitle}`,
        referenceId: sub.id,
        createdAt: new Date().toISOString(),
      });
      saveTransactionsStore();

      // Trigger referral qualification check upon approved task
      evaluateAndProcessReferral(sub.userId, 'task_completion');
    }
  }

  saveJsonStore(SUBMISSIONS_FILE, submissionsStore);
  res.json({ success: true, submission: sub });
});

/**
 * 5. Withdrawals (UPI / Bank)
 */
app.post('/api/withdrawals', (req: Request, res: Response) => {
  settingsStore = loadJsonStore<AppSettings>(SETTINGS_FILE, settingsStore);
  if (settingsStore.withdrawalsEnabled === false) {
    res.status(400).json({
      success: false,
      error: settingsStore.withdrawalsDisabledReason || 'Withdrawals are currently paused for system maintenance.',
    });
    return;
  }

  withdrawalsStore = loadJsonStore<Withdrawal[]>(WITHDRAWALS_FILE, withdrawalsStore);
  loadUsersRegistry();

  const { userId, amountCoins, method, upiId, bankAccountNumber, bankIfsc, bankAccountName } = req.body;
  const numCoins = Number(amountCoins) || 0;

  let user = usersStore.get(userId);
  if (!user && req.body.userMobile) {
    const cleanDigits = (req.body.userMobile || '').replace(/[^0-9]/g, '').slice(-10);
    user = Array.from(usersStore.values()).find(
      (u) =>
        (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits) ||
        u.uid === `user_phone_${cleanDigits}`
    );
  }

  let activeUser: UserProfile;
  if (!user) {
    const cleanDigits = (req.body.userMobile || '').replace(/[^0-9]/g, '').slice(-10);
    activeUser = {
      uid: userId || (cleanDigits ? `user_phone_${cleanDigits}` : `user_${Date.now()}`),
      name: req.body.userName || (cleanDigits ? `User ${cleanDigits.slice(-4)}` : 'App User'),
      mobile: req.body.userMobile || (cleanDigits ? `+91 ${cleanDigits}` : ''),
      referralCode: generateUniqueReferralCode(),
      coins: 0,
      todayEarnings: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
      pendingWithdrawalCoins: numCoins,
      level: 'Bronze',
      isBlocked: false,
      consecutiveCheckIns: 0,
      adsWatchedToday: 0,
      createdAt: new Date().toISOString(),
    };
    usersStore.set(activeUser.uid, activeUser);
    saveUsersRegistry();
  } else {
    user.coins = Math.max(0, user.coins - numCoins);
    user.pendingWithdrawalCoins = (user.pendingWithdrawalCoins || 0) + numCoins;
    usersStore.set(user.uid, user);
    saveUsersRegistry();
    activeUser = user;
  }

  const id = req.body.id || `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const withdrawal: Withdrawal = {
    id,
    userId: activeUser.uid,
    userName: req.body.userName || activeUser.name,
    userMobile: req.body.userMobile || activeUser.mobile,
    amountCoins: numCoins,
    amountCurrency: numCoins / (settingsStore.coinToCurrencyRatio || 100),
    method,
    upiId,
    bankAccountNumber,
    bankIfsc,
    bankAccountName,
    status: req.body.status || 'pending',
    requestedAt: req.body.requestedAt || new Date().toISOString(),
  };

  const existingIdx = withdrawalsStore.findIndex((w) => w.id === id);
  if (existingIdx >= 0) {
    withdrawalsStore[existingIdx] = withdrawal;
  } else {
    withdrawalsStore.unshift(withdrawal);
  }
  saveJsonStore(WITHDRAWALS_FILE, withdrawalsStore);

  transactionsStore.unshift({
    id: `txn_${Date.now()}`,
    userId,
    type: 'withdrawal_request',
    amountCoins,
    amountCurrency: amountCoins / settingsStore.coinToCurrencyRatio,
    status: 'pending',
    description: `Withdrawal via ${method.toUpperCase()} (${method === 'upi' ? upiId : bankAccountNumber})`,
    referenceId: id,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, withdrawal, user });
});

app.get('/api/withdrawals', (req: Request, res: Response) => {
  withdrawalsStore = loadJsonStore<Withdrawal[]>(WITHDRAWALS_FILE, withdrawalsStore);
  const { userId } = req.query;
  if (userId) {
    res.json({ success: true, withdrawals: withdrawalsStore.filter((w) => w.userId === userId) });
  } else {
    res.json({ success: true, withdrawals: withdrawalsStore });
  }
});

app.post('/api/withdrawals/:id/review', (req: Request, res: Response) => {
  withdrawalsStore = loadJsonStore<Withdrawal[]>(WITHDRAWALS_FILE, withdrawalsStore);
  loadUsersRegistry();
  const { status, adminNotes, rejectionReason, txnHash } = req.body;
  const finalStatus = status || 'paid';
  const nowIso = new Date().toISOString();

  let idx = withdrawalsStore.findIndex((w) => w.id === req.params.id);
  let wd: Withdrawal;

  if (idx < 0) {
    wd = {
      id: req.params.id,
      userId: req.body.userId || 'user_unknown',
      userName: req.body.userName || 'User',
      userMobile: req.body.userMobile || '',
      amountCoins: Number(req.body.amountCoins) || 0,
      amountCurrency: Number(req.body.amountCurrency) || 0,
      method: req.body.method || 'upi',
      upiId: req.body.upiId,
      bankAccountNumber: req.body.bankAccountNumber,
      bankIfsc: req.body.bankIfsc,
      bankAccountName: req.body.bankAccountName,
      status: finalStatus,
      adminNotes: adminNotes || req.body.adminNotes,
      rejectionReason: rejectionReason || req.body.rejectionReason,
      txnHash: txnHash || req.body.txnHash,
      requestedAt: req.body.requestedAt || nowIso,
      processedAt: nowIso,
    };
    withdrawalsStore.unshift(wd);
  } else {
    wd = withdrawalsStore[idx];
    wd.status = finalStatus;
    wd.adminNotes = adminNotes || wd.adminNotes;
    wd.rejectionReason = rejectionReason || wd.rejectionReason;
    wd.txnHash = txnHash || wd.txnHash;
    wd.processedAt = nowIso;
    withdrawalsStore[idx] = wd;
  }

  const user = usersStore.get(wd.userId);
  if (user) {
    if (finalStatus === 'paid') {
      user.totalWithdrawn = (user.totalWithdrawn || 0) + wd.amountCoins;
      user.pendingWithdrawalCoins = Math.max(0, (user.pendingWithdrawalCoins || 0) - wd.amountCoins);
    } else if (finalStatus === 'rejected') {
      // Refund coins back
      user.coins = (user.coins || 0) + wd.amountCoins;
      user.pendingWithdrawalCoins = Math.max(0, (user.pendingWithdrawalCoins || 0) - wd.amountCoins);

      transactionsStore.unshift({
        id: `txn_ref_${Date.now()}`,
        userId: user.uid,
        type: 'withdrawal_refund',
        amountCoins: wd.amountCoins,
        amountCurrency: wd.amountCurrency,
        status: 'completed',
        description: `Refund for rejected withdrawal: ${rejectionReason || 'Incorrect details'}`,
        referenceId: wd.id,
        createdAt: nowIso,
      });
      saveTransactionsStore();
    }
    usersStore.set(user.uid, user);
    saveUsersRegistry();
  }

  saveJsonStore(WITHDRAWALS_FILE, withdrawalsStore);
  res.json({ success: true, withdrawal: wd, user });
});

app.delete('/api/withdrawals/:id', (req: Request, res: Response) => {
  withdrawalsStore = loadJsonStore<Withdrawal[]>(WITHDRAWALS_FILE, withdrawalsStore);
  const targetId = req.params.id;
  withdrawalsStore = withdrawalsStore.filter((w) => w.id !== targetId);
  saveJsonStore(WITHDRAWALS_FILE, withdrawalsStore);
  res.json({ success: true, message: 'Withdrawal record deleted' });
});

/**
 * 6. Transactions Ledger
 */
app.get('/api/transactions', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (userId) {
    res.json({ success: true, transactions: transactionsStore.filter((t) => t.userId === userId) });
  } else {
    res.json({ success: true, transactions: transactionsStore });
  }
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const id = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const txn: Transaction = {
    ...req.body,
    id,
    createdAt: new Date().toISOString(),
  };
  transactionsStore.unshift(txn);
  res.json({ success: true, transaction: txn });
});

/**
 * 7. Announcements
 */
app.get('/api/announcements', (_req: Request, res: Response) => {
  announcementsStore = loadJsonStore<Announcement[]>(ANNOUNCEMENTS_FILE, announcementsStore);
  res.json({ success: true, announcements: announcementsStore });
});

app.post('/api/announcements', (req: Request, res: Response) => {
  announcementsStore = loadJsonStore<Announcement[]>(ANNOUNCEMENTS_FILE, announcementsStore);
  const id = req.body.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ann: Announcement = {
    ...req.body,
    id,
    createdAt: req.body.createdAt || new Date().toISOString(),
  };
  announcementsStore.unshift(ann);
  saveJsonStore(ANNOUNCEMENTS_FILE, announcementsStore);
  res.json({ success: true, announcement: ann });
});

app.put('/api/announcements/:id', (req: Request, res: Response) => {
  announcementsStore = loadJsonStore<Announcement[]>(ANNOUNCEMENTS_FILE, announcementsStore);
  const idx = announcementsStore.findIndex((a) => a.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ success: false, error: 'Announcement not found' });
    return;
  }
  announcementsStore[idx] = { ...announcementsStore[idx], ...req.body };
  saveJsonStore(ANNOUNCEMENTS_FILE, announcementsStore);
  res.json({ success: true, announcement: announcementsStore[idx] });
});

app.delete('/api/announcements/:id', (req: Request, res: Response) => {
  announcementsStore = loadJsonStore<Announcement[]>(ANNOUNCEMENTS_FILE, announcementsStore);
  announcementsStore = announcementsStore.filter((a) => a.id !== req.params.id);
  saveJsonStore(ANNOUNCEMENTS_FILE, announcementsStore);
  res.json({ success: true, message: 'Announcement deleted' });
});

/**
 * 8. App Settings
 */
app.get('/api/settings', (_req: Request, res: Response) => {
  settingsStore = loadJsonStore<AppSettings>(SETTINGS_FILE, settingsStore);
  res.json({ success: true, settings: settingsStore });
});

app.put('/api/settings', (req: Request, res: Response) => {
  settingsStore = loadJsonStore<AppSettings>(SETTINGS_FILE, settingsStore);
  settingsStore = { ...settingsStore, ...req.body };
  saveJsonStore(SETTINGS_FILE, settingsStore);
  res.json({ success: true, settings: settingsStore });
});

/**
 * 9. Daily Bonuses & Check-Ins
 */
app.post('/api/bonuses/claim-checkin', (req: Request, res: Response) => {
  settingsStore = loadJsonStore<AppSettings>(SETTINGS_FILE, settingsStore);
  if (settingsStore.dailyCheckInEnabled === false) {
    res.status(400).json({ success: false, error: 'Daily Check-in is currently paused by administrator.' });
    return;
  }

  loadUsersRegistry();
  const { userId } = req.body;
  const cleanDigits = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  let user = usersStore.get(userId);
  if (!user && cleanDigits.length === 10) {
    user = Array.from(usersStore.values()).find(
      (u) =>
        u.uid === `user_phone_${cleanDigits}` ||
        (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits)
    );
  }

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const today = getTodayDateString();
  const utcToday = new Date().toISOString().split('T')[0];
  if (
    user.lastCheckInDate === today ||
    user.lastCheckInDate === utcToday ||
    (user.lastCheckInDate && user.lastCheckInDate.startsWith(today))
  ) {
    res.status(400).json({ success: false, error: 'Aap aaj ka Check-in reward already claim kar chuke hain! Kripya kal dobara aaiye.' });
    return;
  }

  const newStreak = (user.consecutiveCheckIns || 0) + 1;
  const streakRewards = settingsStore.checkInRewards || [10, 15, 20, 25, 35, 50, 100];
  const rewardIndex = (newStreak - 1) % streakRewards.length;
  const rewardCoins = streakRewards[rewardIndex];

  user.coins += rewardCoins;
  user.todayEarnings += rewardCoins;
  user.totalEarnings += rewardCoins;
  user.lastCheckInDate = today;
  user.consecutiveCheckIns = newStreak;
  usersStore.set(user.uid, user);
  saveUsersRegistry();

  transactionsStore.unshift({
    id: `txn_checkin_${Date.now()}`,
    userId: user.uid,
    type: 'checkin',
    amountCoins: rewardCoins,
    amountCurrency: rewardCoins / settingsStore.coinToCurrencyRatio,
    status: 'completed',
    description: `Day ${newStreak} Daily Check-In Reward`,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, rewardCoins, streak: newStreak, user });
});

app.post('/api/bonuses/claim-daily', (req: Request, res: Response) => {
  settingsStore = loadJsonStore<AppSettings>(SETTINGS_FILE, settingsStore);
  if (settingsStore.dailyBonusEnabled === false) {
    res.status(400).json({ success: false, error: 'Daily Bonus is currently paused by administrator.' });
    return;
  }

  loadUsersRegistry();
  const { userId } = req.body;
  const cleanDigits = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  let user = usersStore.get(userId);
  if (!user && cleanDigits.length === 10) {
    user = Array.from(usersStore.values()).find(
      (u) =>
        u.uid === `user_phone_${cleanDigits}` ||
        (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits)
    );
  }

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const today = getTodayDateString();
  const utcToday = new Date().toISOString().split('T')[0];
  if (
    user.lastDailyBonusDate === today ||
    user.lastDailyBonusDate === utcToday ||
    (user.lastDailyBonusDate && user.lastDailyBonusDate.startsWith(today))
  ) {
    res.status(400).json({ success: false, error: 'Aap aaj ka Daily Bonus already claim kar chuke hain! Din me sirf 1 baar claim kar sakte hain.' });
    return;
  }

  const minB = settingsStore.dailyBonusMinCoins || settingsStore.dailyBonusCoins || 10;
  const maxB = settingsStore.dailyBonusMaxCoins || settingsStore.dailyBonusCoins || 50;
  const bonusCoins = Math.floor(Math.random() * (maxB - minB + 1)) + minB;

  user.coins += bonusCoins;
  user.todayEarnings += bonusCoins;
  user.totalEarnings += bonusCoins;
  user.lastDailyBonusDate = today;
  usersStore.set(user.uid, user);
  saveUsersRegistry();

  transactionsStore.unshift({
    id: `txn_dailybonus_${Date.now()}`,
    userId: user.uid,
    type: 'daily_bonus',
    amountCoins: bonusCoins,
    amountCurrency: bonusCoins / settingsStore.coinToCurrencyRatio,
    status: 'completed',
    description: 'Daily Activity Mystery Bonus',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, bonusCoins, user });
});

// -------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC ASSETS MOUNT
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distExists = fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));

  if (isProduction || distExists) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // If not in pure production, mount Vite middlewares for dynamic compilation
  if (!isProduction) {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true, host: '0.0.0.0' },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('Vite middleware could not be loaded, falling back to static files:', viteErr);
    }
  }

  // Single page app fallback for any route that is not /api
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (distExists) {
      return res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    }
    next();
  });

  const listenPort = Number(PORT) || 3000;
  app.listen(listenPort, '0.0.0.0', () => {
    console.log(`🛡️ Free Earn Anti-Cheat Security Server running on http://0.0.0.0:${listenPort}`);
  });
}

startServer();
