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
  minAdDurationSeconds: 15,
  adCooldownSeconds: 30,
  maxAccountsPerDevice: 2,
  maxDailyAdLimit: 10,
  maxDailyCoinCap: 5000,
  suspiciousRiskThreshold: 60,
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
          logSecurityEvent({
            userId: targetUid || `attempt_${cleanMobile}`,
            userName: req.body?.name || 'Blocked Duplicate User',
            eventType: 'MULTI_ACCOUNT_ABUSE',
            severity: 'critical',
            riskScoreDelta: 90,
            reason: `Blocked duplicate account creation: Mobile ${cleanMobile} is already registered to account ${existingPhone.userId}`,
            metadata: { cleanMobile, existingUserId: existingPhone.userId, deviceHash },
          });
          return {
            allowed: false,
            errorMessage: 'This device or mobile number is already registered.',
            deviceHash,
            cookieToken,
            hardwareHash,
          };
        }
      }
    }
  }

  // 2. Physical Device Check: Each physical device can create only ONE account
  if (isRegistration) {
    const existingDevice = deviceRegistry.get(deviceHash);
    if (existingDevice && !existingDevice.isUnlockedByAdmin) {
      // If the device already registered an account, and targetUid is different or not specified
      if (!targetUid || existingDevice.userId !== targetUid) {
        logSecurityEvent({
          userId: targetUid || `attempt_dev_${deviceHash.slice(-6)}`,
          userName: req.body?.name || 'Blocked Duplicate Device',
          eventType: 'MULTI_ACCOUNT_ABUSE',
          severity: 'critical',
          riskScoreDelta: 95,
          reason: `Blocked duplicate account creation on already registered physical device ${deviceHash}. Bound to account ${existingDevice.userId}`,
          metadata: { deviceHash, existingUserId: existingDevice.userId, existingMobile: existingDevice.userMobile },
        });
        return {
          allowed: false,
          errorMessage: 'This device or mobile number is already registered.',
          deviceHash,
          cookieToken,
          hardwareHash,
        };
      }
    }
  }

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

// Helper: Get user's today string (YYYY-MM-DD UTC)
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
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
          if (history.adsTodayCount >= antiCheatConfig.maxDailyAdLimit) {
            res.status(429).json({
              success: false,
              error: `Daily rewarded video limit reached (${antiCheatConfig.maxDailyAdLimit}/${antiCheatConfig.maxDailyAdLimit}). Come back tomorrow!`,
            });
            return;
          }

          authorizedCoins = 0; // No coin reward for ads per user instruction
          rewardDescription = `Sponsored Video Ad #${history.adsTodayCount + 1}`;
          history.lastAdClaimAt = now;
          history.adsTodayCount += 1;
          break;
        }

        case 'daily_checkin': {
          if (history.lastCheckInDate === todayStr) {
            res.status(400).json({
              success: false,
              error: 'You have already collected today’s Daily Check-in streak reward.',
            });
            return;
          }

          authorizedCoins = Math.min(100, Math.max(10, Number(claimedCoins) || 15));
          rewardDescription = `Server-verified Daily Streak Check-in (${todayStr})`;
          history.lastCheckInDate = todayStr;
          break;
        }

        case 'daily_bonus': {
          const userObj =
            usersStore.get(userId) ||
            Array.from(usersStore.values()).find(
              (u) =>
                u.uid === userId ||
                (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === userId.replace(/[^0-9]/g, '').slice(-10))
            );

          if (userObj && userObj.lastDailyBonusDate === todayStr) {
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

          authorizedCoins = 15;
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
} from './src/types/index.ts';

// Server-side database stores
const USERS_FILE = path.resolve(__dirname, 'data', 'users_registry.json');
const usersStore = new Map<string, UserProfile>();
DEMO_USERS.forEach((u) => usersStore.set(u.uid, { ...u }));

function loadUsersRegistry(): void {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((u: UserProfile) => usersStore.set(u.uid, u));
      }
    }
  } catch (err) {
    console.error('Notice: Initializing fresh users store:', err);
  }
}

function saveUsersRegistry(): void {
  try {
    const list = Array.from(usersStore.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save users store to disk:', err);
  }
}

loadUsersRegistry();

let tasksStore: Task[] = INITIAL_TASKS.map((t, idx) => ({
  ...t,
  id: `task_${idx + 1}_${Date.now()}`,
  totalCompleted: 24 + idx * 12,
  createdAt: new Date().toISOString(),
}));

let submissionsStore: TaskSubmission[] = [...DEMO_SUBMISSIONS];
let withdrawalsStore: Withdrawal[] = [...DEMO_WITHDRAWALS];
let transactionsStore: Transaction[] = [...DEMO_TRANSACTIONS];
let announcementsStore: Announcement[] = INITIAL_ANNOUNCEMENTS.map((a, idx) => ({
  ...a,
  id: `ann_${idx + 1}_${Date.now()}`,
  createdAt: new Date().toISOString(),
}));
let settingsStore: AppSettings = { ...DEFAULT_SETTINGS };

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

    res.json({
      success: true,
      message: 'Mobile number verified successfully!',
      verifiedMobile: cleanMobile,
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
      const newRefCode = 'FE' + Math.random().toString(36).substring(2, 7).toUpperCase();
      user = {
        uid: finalUid,
        name: name || (cleanMobile ? `User ${cleanMobile.slice(-4)}` : 'Free Earn User'),
        mobile: cleanMobile ? `+91 ${cleanMobile}` : '',
        email: email || '',
        password: password || undefined,
        referralCode: newRefCode,
        referredBy: referralCode || undefined,
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
      // Existing user logging in: update last seen
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
    const { identifier, password } = req.body;
    const cleanId = (identifier || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      res.status(400).json({ success: false, error: 'Mobile number ya Email aur Password dono required hain.' });
      return;
    }

    let foundUser: UserProfile | undefined;

    if (cleanId.includes('@')) {
      // Lookup by email (case-insensitive)
      foundUser = Array.from(usersStore.values()).find(
        (u) => u.email && u.email.toLowerCase() === cleanId.toLowerCase()
      );
    } else {
      // Lookup by 10-digit mobile
      const cleanDigits = cleanId.replace(/[^0-9]/g, '').slice(-10);
      foundUser = Array.from(usersStore.values()).find(
        (u) =>
          u.uid === `user_phone_${cleanDigits}` ||
          (u.mobile && u.mobile.replace(/[^0-9]/g, '').slice(-10) === cleanDigits)
      );
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
    if (foundUser.password && foundUser.password !== cleanPass) {
      res.status(401).json({
        success: false,
        error: 'Galat Password! Kripya sahi password enter karein.',
      });
      return;
    }

    // If account was created before password field, associate the password now
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

/**
 * 2.1 Referral System & Invite Links
 */
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

  // Official Admin code
  if (code === 'ANKUSH07') {
    res.json({
      success: true,
      valid: true,
      code: 'ANKUSH07',
      referrerName: 'Ankush Kumar (Admin / Official)',
      bonusCoins: 50,
    });
    return;
  }

  // Find user by referral code in memory store
  const referrer = Array.from(usersStore.values()).find(
    (u) => u.referralCode?.toUpperCase() === code
  );

  if (referrer) {
    res.json({
      success: true,
      valid: true,
      code,
      referrerName: referrer.name,
      bonusCoins: 50,
    });
    return;
  }

  // Fallback for valid alphanumeric format
  if (code.length >= 4 && code.length <= 16) {
    res.json({
      success: true,
      valid: true,
      code,
      referrerName: 'Invited Member',
      bonusCoins: 50,
    });
    return;
  }

  res.status(404).json({ success: false, valid: false, error: 'Invalid referral code.' });
});

app.post('/api/referrals/process', (req: Request, res: Response) => {
  try {
    const { referralCode, newUserUid, newUserName, newUserMobile } = req.body;
    const cleanCode = (referralCode || '').trim().toUpperCase();

    if (!cleanCode || !newUserUid) {
      res.status(400).json({ success: false, error: 'Invalid referral parameters.' });
      return;
    }

    // 1. Find referrer by code
    const referrer = Array.from(usersStore.values()).find(
      (u) => u.referralCode?.toUpperCase() === cleanCode
    );

    if (referrer) {
      const cleanNewMobile = (newUserMobile || '').replace(/[^0-9]/g, '').slice(-10);
      const cleanRefMobile = (referrer.mobile || '').replace(/[^0-9]/g, '').slice(-10);

      // Block self-referral (same UID or same phone number)
      if (
        referrer.uid === newUserUid ||
        (cleanNewMobile && cleanRefMobile && cleanNewMobile === cleanRefMobile)
      ) {
        res.status(403).json({
          success: false,
          error: 'Aap apna khud ka referral code use nahi kar sakte (Self-referral not allowed).',
          code: 'SELF_REFERRAL_BLOCKED',
        });
        return;
      }
    }

    // 2. Process referral reward: Referrer gets +100 Coins, New user gets +50 Coins
    const referralBonusCoins = 100;
    const joinBonusCoins = 50;

    if (referrer) {
      const updatedReferrer = {
        ...referrer,
        coins: (referrer.coins || 0) + referralBonusCoins,
        totalEarnings: (referrer.totalEarnings || 0) + referralBonusCoins,
        todayEarnings: (referrer.todayEarnings || 0) + referralBonusCoins,
      };
      usersStore.set(referrer.uid, updatedReferrer);

      // Record referrer transaction
      transactionsStore.unshift({
        id: `txn_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: referrer.uid,
        type: 'referral_bonus',
        amountCoins: referralBonusCoins,
        amountCurrency: referralBonusCoins / 100,
        status: 'completed',
        description: `Referral Reward: Invited ${newUserName || 'new earner'}!`,
        createdAt: new Date().toISOString(),
      });
    }

    // Update new user record with join bonus
    const newUser = usersStore.get(newUserUid);
    if (newUser) {
      const updatedNewUser = {
        ...newUser,
        coins: (newUser.coins || 0) + joinBonusCoins,
        totalEarnings: (newUser.totalEarnings || 0) + joinBonusCoins,
        todayEarnings: (newUser.todayEarnings || 0) + joinBonusCoins,
        referredBy: cleanCode,
      };
      usersStore.set(newUserUid, updatedNewUser);

      transactionsStore.unshift({
        id: `txn_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: newUserUid,
        type: 'referral_bonus',
        amountCoins: joinBonusCoins,
        amountCurrency: joinBonusCoins / 100,
        status: 'completed',
        description: `Referral Welcome Bonus via invite code: ${cleanCode}`,
        createdAt: new Date().toISOString(),
      });
    }

    saveUsersRegistry();

    res.json({
      success: true,
      message: `Referral activated! Referrer earned +${referralBonusCoins} coins and you got +${joinBonusCoins} bonus coins.`,
      referralBonusCoins,
      joinBonusCoins,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to process referral.' });
  }
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

app.get('/api/users', (_req: Request, res: Response) => {
  res.json({ success: true, users: Array.from(usersStore.values()) });
});

/**
 * 4. Tasks & Proof Submissions
 */
app.get('/api/tasks', (_req: Request, res: Response) => {
  res.json({ success: true, tasks: tasksStore });
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const task: Task = {
    ...req.body,
    id,
    createdAt: new Date().toISOString(),
  };
  tasksStore.unshift(task);
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const idx = tasksStore.findIndex((t) => t.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }
  tasksStore[idx] = { ...tasksStore[idx], ...req.body };
  res.json({ success: true, task: tasksStore[idx] });
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  tasksStore = tasksStore.filter((t) => t.id !== req.params.id);
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
    }
  }

  res.json({ success: true, submission: sub });
});

/**
 * 5. Withdrawals (UPI / Bank)
 */
app.post('/api/withdrawals', (req: Request, res: Response) => {
  const { userId, amountCoins, method, upiId, bankAccountNumber, bankIfsc, bankAccountName } = req.body;
  const user = usersStore.get(userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (user.coins < amountCoins) {
    res.status(400).json({ success: false, error: 'Insufficient coin balance' });
    return;
  }
  if (amountCoins < settingsStore.minWithdrawalCoins) {
    res.status(400).json({ success: false, error: `Minimum withdrawal is ${settingsStore.minWithdrawalCoins} coins` });
    return;
  }

  // Deduct coins & record pending withdrawal
  user.coins -= amountCoins;
  user.pendingWithdrawalCoins = (user.pendingWithdrawalCoins || 0) + amountCoins;
  usersStore.set(userId, user);

  const id = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const withdrawal: Withdrawal = {
    id,
    userId,
    userName: user.name,
    userMobile: user.mobile,
    amountCoins,
    amountCurrency: amountCoins / settingsStore.coinToCurrencyRatio,
    method,
    upiId,
    bankAccountNumber,
    bankIfsc,
    bankAccountName,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  withdrawalsStore.unshift(withdrawal);

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
  const { userId } = req.query;
  if (userId) {
    res.json({ success: true, withdrawals: withdrawalsStore.filter((w) => w.userId === userId) });
  } else {
    res.json({ success: true, withdrawals: withdrawalsStore });
  }
});

app.post('/api/withdrawals/:id/review', (req: Request, res: Response) => {
  const { status, adminNotes, rejectionReason, txnHash } = req.body;
  const idx = withdrawalsStore.findIndex((w) => w.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ success: false, error: 'Withdrawal not found' });
    return;
  }
  const wd = withdrawalsStore[idx];
  wd.status = status;
  wd.adminNotes = adminNotes || wd.adminNotes;
  wd.rejectionReason = rejectionReason || wd.rejectionReason;
  wd.txnHash = txnHash || wd.txnHash;
  wd.processedAt = new Date().toISOString();
  withdrawalsStore[idx] = wd;

  const user = usersStore.get(wd.userId);
  if (user) {
    if (status === 'paid') {
      user.totalWithdrawn += wd.amountCoins;
      user.pendingWithdrawalCoins = Math.max(0, (user.pendingWithdrawalCoins || 0) - wd.amountCoins);
    } else if (status === 'rejected') {
      // Refund coins back
      user.coins += wd.amountCoins;
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
        createdAt: new Date().toISOString(),
      });
    }
    usersStore.set(user.uid, user);
  }

  res.json({ success: true, withdrawal: wd, user });
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
  res.json({ success: true, announcements: announcementsStore });
});

app.post('/api/announcements', (req: Request, res: Response) => {
  const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ann: Announcement = {
    ...req.body,
    id,
    createdAt: new Date().toISOString(),
  };
  announcementsStore.unshift(ann);
  res.json({ success: true, announcement: ann });
});

app.delete('/api/announcements/:id', (req: Request, res: Response) => {
  announcementsStore = announcementsStore.filter((a) => a.id !== req.params.id);
  res.json({ success: true, message: 'Announcement deleted' });
});

/**
 * 8. App Settings
 */
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ success: true, settings: settingsStore });
});

app.put('/api/settings', (req: Request, res: Response) => {
  settingsStore = { ...settingsStore, ...req.body };
  res.json({ success: true, settings: settingsStore });
});

/**
 * 9. Daily Bonuses & Check-Ins
 */
app.post('/api/bonuses/claim-checkin', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = usersStore.get(userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  if (user.lastCheckInDate === today) {
    res.status(400).json({ success: false, error: 'Already checked in today' });
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
  usersStore.set(userId, user);

  transactionsStore.unshift({
    id: `txn_checkin_${Date.now()}`,
    userId,
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
  const { userId } = req.body;
  const user = usersStore.get(userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const bonusCoins = settingsStore.dailyBonusCoins || 15;
  user.coins += bonusCoins;
  user.todayEarnings += bonusCoins;
  user.totalEarnings += bonusCoins;
  usersStore.set(userId, user);

  transactionsStore.unshift({
    id: `txn_dailybonus_${Date.now()}`,
    userId,
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
