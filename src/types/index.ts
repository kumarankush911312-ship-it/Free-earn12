export type UserLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface UserProfile {
  uid: string;
  name: string;
  mobile: string;
  email?: string;
  referralCode: string;
  referredBy?: string;
  coins: number;
  todayEarnings: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawalCoins: number;
  level: UserLevel;
  isBlocked: boolean;
  lastCheckInDate?: string;
  consecutiveCheckIns: number;
  lastAdWatchedAt?: string;
  adsWatchedToday: number;
  adsWatchedDate?: string;
  createdAt: string;
  updatedAt?: string;
  isAdmin?: boolean;
}

export type TaskCategory = 'app' | 'survey' | 'social' | 'daily' | 'special';

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  category: TaskCategory;
  instructions: string;
  stepGuide?: string[];
  dailyLimit: number;
  totalCompleted?: number;
  status: 'active' | 'paused' | 'completed';
  badge?: string;
  externalUrl?: string;
  verificationMethod: 'proof_link' | 'instant_timer' | 'app_install';
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  userMobile: string;
  rewardCoins: number;
  proofLink: string;
  proofNotes: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export type TransactionType =
  | 'checkin'
  | 'rewarded_ad'
  | 'task_reward'
  | 'referral_bonus'
  | 'daily_bonus'
  | 'withdrawal_request'
  | 'withdrawal_refund'
  | 'admin_adjustment';

export type TransactionStatus = 'completed' | 'pending' | 'rejected' | 'paid';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amountCoins: number;
  amountCurrency: number;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export type WithdrawalMethod = 'upi' | 'bank';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  amountCoins: number;
  amountCurrency: number;
  method: WithdrawalMethod;
  upiId?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
  status: WithdrawalStatus;
  rejectionReason?: string;
  adminNotes?: string;
  requestedAt: string;
  processedAt?: string;
  txnHash?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  referredMobile: string;
  bonusCoins: number;
  status: 'active' | 'pending';
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  badge: string;
  priority: 'high' | 'normal' | 'low';
  active: boolean;
  createdAt: string;
}

export interface AppSettings {
  minWithdrawalCoins: number;
  coinToCurrencyRatio: number;
  currencySymbol: string;
  referralRewardCoins: number;
  referralJoinBonusCoins: number;
  dailyAdLimit: number;
  adRewardCoins: number;
  dailyBonusCoins: number;
  checkInRewards: number[];
  supportEmail: string;
  supportWhatsapp: string;
  admobAppId?: string;
  admobRewardedUnitId?: string;
  admobBannerUnitId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'reward' | 'withdrawal' | 'task' | 'announcement' | 'system';
  read: boolean;
  createdAt: string;
}

export interface RewardedAdNetworkConfig {
  providerName: string;
  adUnitId: string;
  rewardAmount: number;
  cooldownSeconds: number;
  dailyCap: number;
}
