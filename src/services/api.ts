import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  ref,
  get as rtdbGet,
  set as rtdbSet,
  update as rtdbUpdate,
} from 'firebase/database';
import { db, rtdb, handleFirestoreError, OperationType } from '../firebase';
import {
  UserProfile,
  Task,
  TaskSubmission,
  Transaction,
  Withdrawal,
  ReferralRecord,
  Announcement,
  AppSettings,
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_TASKS,
  INITIAL_ANNOUNCEMENTS,
  DEMO_USERS,
  DEMO_TRANSACTIONS,
  DEMO_SUBMISSIONS,
  DEMO_WITHDRAWALS,
} from './seedData';
import { getDeviceFingerprint, getDeviceHardwareEntropy } from './security';

// Helper to get today's date formatted as YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FE';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------- LOCAL STORAGE CACHE HELPERS ----------------
export function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) return JSON.parse(item) as T;
  } catch {}
  return fallback;
}

export function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---------------- BACKEND REST API CLIENT ----------------
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(path, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
    clearTimeout(timeout);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
  } catch {
    // Network or server timeout: smooth fallback
  }
  return null;
}

// ---------------- APP SETTINGS ----------------
export async function getAppSettings(): Promise<AppSettings> {
  let settings = getLocalItem<AppSettings>('freeearn_demo_settings', DEFAULT_SETTINGS);

  // 1. Fetch from Backend REST API
  apiFetch<{ success: boolean; settings: AppSettings }>('/api/settings').then((data) => {
    if (data && data.success && data.settings) {
      setLocalItem('freeearn_demo_settings', data.settings);
    }
  });

  // 2. Fetch from Firestore
  if (db) {
    getDoc(doc(db, 'settings', 'app_settings'))
      .then((snap) => {
        if (snap.exists()) {
          setLocalItem('freeearn_demo_settings', { ...DEFAULT_SETTINGS, ...(snap.data() as AppSettings) });
        }
      })
      .catch(() => {});
  }

  return settings;
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = getLocalItem<AppSettings>('freeearn_demo_settings', DEFAULT_SETTINGS);
  const updated = { ...current, ...settings };
  setLocalItem('freeearn_demo_settings', updated);

  // 1. Sync to Backend REST API
  apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

  // 2. Sync to Firebase
  const firestore = db;
  if (firestore) {
    updateDoc(doc(firestore, 'settings', 'app_settings'), settings).catch(() => {
      setDoc(doc(firestore, 'settings', 'app_settings'), updated).catch(() => {});
    });
  }
  if (rtdb) {
    rtdbUpdate(ref(rtdb, 'settings/app_settings'), settings).catch(() => {});
  }
}

// ---------------- USER PROFILES ----------------
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const cleanId = (uid || '').trim();
  if (!cleanId) return null;

  // 1. Direct local cache check
  const local = getLocalItem<UserProfile | null>(`freeearn_user_${cleanId}`, null);
  const sessionUser = getLocalItem<UserProfile | null>('freeearn_local_user', null);
  const sessionCoins =
    sessionUser &&
    (sessionUser.uid === cleanId ||
      (sessionUser.mobile && cleanId.includes(sessionUser.mobile.replace(/[^0-9]/g, '').slice(-10))) ||
      (sessionUser.email && sessionUser.email.toLowerCase() === cleanId.toLowerCase()))
      ? sessionUser.coins || 0
      : 0;

  // Fetch latest user from backend REST API
  try {
    const res = await apiFetch<{ success: boolean; user: UserProfile }>(`/api/users/${encodeURIComponent(cleanId)}`);
    if (res && res.success && res.user) {
      const maxCoins = Math.max(res.user.coins || 0, local?.coins || 0, sessionCoins);
      const maxTotal = Math.max(res.user.totalEarnings || 0, local?.totalEarnings || 0, sessionUser?.totalEarnings || 0);
      const merged: UserProfile = {
        ...res.user,
        coins: maxCoins,
        totalEarnings: maxTotal,
      };
      setLocalItem(`freeearn_user_${merged.uid}`, merged);
      setLocalItem(`freeearn_user_${cleanId}`, merged);
      return merged;
    }
  } catch {}

  if (local && local.uid) {
    return local;
  }

  if (sessionUser && (sessionUser.uid === cleanId || sessionUser.email?.toLowerCase() === cleanId.toLowerCase())) {
    return sessionUser;
  }

  // 2. Check demo seed list
  const seedUser = DEMO_USERS.find((u) => u.uid === cleanId || (u.mobile && cleanId.includes(u.mobile.replace(/[^0-9]/g, '').slice(-10))));
  if (seedUser) {
    setLocalItem(`freeearn_user_${cleanId}`, seedUser);
    return seedUser;
  }

  // 3. Background non-blocking remote Firestore lookup
  if (db) {
    getDoc(doc(db, 'users', uid))
      .then((snap) => {
        if (snap.exists()) {
          setLocalItem(`freeearn_user_${uid}`, snap.data() as UserProfile);
        }
      })
      .catch(() => {});
  }

  return null;
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  setLocalItem(`freeearn_user_${profile.uid}`, profile);

  // Add to all users list in local demo storage
  const users = getLocalItem<UserProfile[]>('freeearn_demo_all_users', DEMO_USERS);
  const index = users.findIndex((u) => u.uid === profile.uid);
  if (index >= 0) {
    users[index] = profile;
  } else {
    users.unshift(profile);
  }
  setLocalItem('freeearn_demo_all_users', users);

  // 1. Sync to Backend REST API
  apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(profile),
  });

  // 2. Sync to Firebase Firestore & RTDB
  if (db) {
    setDoc(doc(db, 'users', profile.uid), profile).catch(() => {});
  }
  if (rtdb) {
    rtdbSet(ref(rtdb, `users/${profile.uid}`), profile).catch(() => {});
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const existing = await getUserProfile(uid);
  if (existing) {
    const updated: UserProfile = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    setLocalItem(`freeearn_user_${uid}`, updated);

    // Also update in all users list
    const users = getLocalItem<UserProfile[]>('freeearn_demo_all_users', DEMO_USERS);
    const idx = users.findIndex((u) => u.uid === uid);
    if (idx >= 0) {
      users[idx] = updated;
    } else {
      users.push(updated);
    }
    setLocalItem('freeearn_demo_all_users', users);

    // If current user is stored in local session, keep it in sync
    const sessionUser = getLocalItem<UserProfile | null>('freeearn_local_user', null);
    if (sessionUser && sessionUser.uid === uid) {
      setLocalItem('freeearn_local_user', updated);
    }

    // 1. Sync to Backend REST API
    apiFetch(`/api/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    // 2. Sync to Firebase
    if (db) {
      updateDoc(doc(db, 'users', uid), data).catch(() => {});
    }
    if (rtdb) {
      rtdbUpdate(ref(rtdb, `users/${uid}`), data).catch(() => {});
    }
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const localUsers = getLocalItem<UserProfile[]>('freeearn_demo_all_users', DEMO_USERS);

  // Background fetch from Backend REST API
  apiFetch<{ success: boolean; users: UserProfile[] }>('/api/users').then((res) => {
    if (res && res.success && res.users) {
      setLocalItem('freeearn_demo_all_users', res.users);
    }
  });

  return localUsers;
}

// ---------------- TASKS ----------------
export async function getTasks(): Promise<Task[]> {
  try {
    const res = await apiFetch<{ success: boolean; tasks: Task[] }>('/api/tasks');
    if (res && res.success && res.tasks && res.tasks.length > 0) {
      setLocalItem('freeearn_demo_tasks', res.tasks);
      return res.tasks;
    }
  } catch {}

  const localTasks = getLocalItem<Task[]>('freeearn_demo_tasks', []);
  const validUrls = new Set(INITIAL_TASKS.map((t) => t.externalUrl));
  const filtered = localTasks.filter((t) => validUrls.has(t.externalUrl));
  if (filtered.length > 0) {
    setLocalItem('freeearn_demo_tasks', filtered);
    return filtered;
  }

  // Seed initial tasks
  const seeded: Task[] = INITIAL_TASKS.map((t, idx) => ({
    ...t,
    id: `task_${idx + 1}_${Date.now()}`,
    totalCompleted: 24 + idx * 12,
    createdAt: new Date().toISOString(),
  }));

  setLocalItem('freeearn_demo_tasks', seeded);

  // Sync to Firestore & Backend in background
  const firestore = db;
  if (firestore) {
    seeded.forEach((task) => {
      setDoc(doc(firestore, 'tasks', task.id), task).catch(() => {});
    });
  }
  return seeded;
}

export async function createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const id = generateId('task');
  const task: Task = {
    ...taskData,
    id,
    createdAt: new Date().toISOString(),
  };

  const tasks = getLocalItem<Task[]>('freeearn_demo_tasks', []);
  tasks.unshift(task);
  setLocalItem('freeearn_demo_tasks', tasks);

  // 1. Sync to Backend REST API
  apiFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });

  // 2. Sync to Firebase
  if (db) {
    setDoc(doc(db, 'tasks', id), task).catch(() => {});
  }
  return task;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  const tasks = getLocalItem<Task[]>('freeearn_demo_tasks', []);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    tasks[idx] = { ...tasks[idx], ...updates };
    setLocalItem('freeearn_demo_tasks', tasks);
  }

  // 1. Sync to Backend REST API
  apiFetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  // 2. Sync to Firebase
  if (db) {
    updateDoc(doc(db, 'tasks', taskId), updates).catch(() => {});
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const tasks = getLocalItem<Task[]>('freeearn_demo_tasks', []);
  const filtered = tasks.filter((t) => t.id !== taskId);
  setLocalItem('freeearn_demo_tasks', filtered);

  // 1. Sync to Backend
  apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
}

// ---------------- TASK SUBMISSIONS ----------------
export async function createTaskSubmission(
  sub: Omit<TaskSubmission, 'id' | 'submittedAt'>
): Promise<TaskSubmission> {
  const id = generateId('sub');
  const submission: TaskSubmission = {
    ...sub,
    id,
    submittedAt: new Date().toISOString(),
  };

  const subs = getLocalItem<TaskSubmission[]>('freeearn_demo_submissions', DEMO_SUBMISSIONS);
  subs.unshift(submission);
  setLocalItem('freeearn_demo_submissions', subs);

  // 1. Sync to Backend REST API
  apiFetch('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(submission),
  });

  // 2. Sync to Firebase
  if (db) {
    setDoc(doc(db, 'taskSubmissions', id), submission).catch(() => {});
  }
  return submission;
}

export async function getUserSubmissions(userId: string): Promise<TaskSubmission[]> {
  const subs = getLocalItem<TaskSubmission[]>('freeearn_demo_submissions', DEMO_SUBMISSIONS);
  
  // Background fetch from Backend REST API
  apiFetch<{ success: boolean; submissions: TaskSubmission[] }>(`/api/submissions?userId=${userId}`).then((res) => {
    if (res && res.success && res.submissions) {
      setLocalItem('freeearn_demo_submissions', res.submissions);
    }
  });

  return subs.filter((s) => s.userId === userId);
}

export async function getAllSubmissions(): Promise<TaskSubmission[]> {
  const subs = getLocalItem<TaskSubmission[]>('freeearn_demo_submissions', DEMO_SUBMISSIONS);

  // Background fetch
  apiFetch<{ success: boolean; submissions: TaskSubmission[] }>('/api/submissions').then((res) => {
    if (res && res.success && res.submissions) {
      setLocalItem('freeearn_demo_submissions', res.submissions);
    }
  });

  return subs;
}

export async function reviewSubmission(
  submission: TaskSubmission,
  newStatus: 'approved' | 'rejected',
  adminNotes: string,
  userProfile?: UserProfile
): Promise<void> {
  const subs = getLocalItem<TaskSubmission[]>('freeearn_demo_submissions', DEMO_SUBMISSIONS);
  const idx = subs.findIndex((s) => s.id === submission.id);
  if (idx >= 0) {
    subs[idx] = {
      ...subs[idx],
      status: newStatus,
      adminNotes,
      reviewedAt: new Date().toISOString(),
    };
    setLocalItem('freeearn_demo_submissions', subs);
  }

  // Credit user if approved
  if (newStatus === 'approved') {
    const reward = submission.rewardCoins;
    const profile = userProfile || (await getUserProfile(submission.userId));
    if (profile) {
      await updateUserProfile(submission.userId, {
        coins: profile.coins + reward,
        todayEarnings: profile.todayEarnings + reward,
        totalEarnings: profile.totalEarnings + reward,
      });

      await createTransaction({
        userId: submission.userId,
        type: 'task_reward',
        amountCoins: reward,
        amountCurrency: reward / 100,
        status: 'completed',
        description: `Reward for task: ${submission.taskTitle}`,
        referenceId: submission.id,
      });
    }
  }

  // 1. Sync to Backend REST API
  apiFetch(`/api/submissions/${submission.id}/review`, {
    method: 'POST',
    body: JSON.stringify({ status: newStatus, adminNotes }),
  });

  // 2. Sync to Firebase
  if (db) {
    updateDoc(doc(db, 'taskSubmissions', submission.id), {
      status: newStatus,
      adminNotes,
      reviewedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

// ---------------- TRANSACTIONS ----------------
export async function createTransaction(txn: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const id = generateId('txn');
  const txnData: Transaction = {
    ...txn,
    id,
    createdAt: new Date().toISOString(),
  };

  const txns = getLocalItem<Transaction[]>('freeearn_demo_transactions', DEMO_TRANSACTIONS);
  txns.unshift(txnData);
  setLocalItem('freeearn_demo_transactions', txns);

  // 1. Sync to Backend REST API
  apiFetch('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(txnData),
  });

  // 2. Sync to Firebase
  if (db) {
    setDoc(doc(db, 'transactions', id), txnData).catch(() => {});
  }
  return txnData;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const txns = getLocalItem<Transaction[]>('freeearn_demo_transactions', DEMO_TRANSACTIONS);

  // Background fetch
  apiFetch<{ success: boolean; transactions: Transaction[] }>(`/api/transactions?userId=${userId}`).then((res) => {
    if (res && res.success && res.transactions) {
      setLocalItem('freeearn_demo_transactions', res.transactions);
    }
  });

  return txns
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return getLocalItem<Transaction[]>('freeearn_demo_transactions', DEMO_TRANSACTIONS);
}

// ---------------- WITHDRAWALS ----------------
export async function createWithdrawal(
  wd: Omit<Withdrawal, 'id' | 'requestedAt'>,
  userProfile: UserProfile
): Promise<Withdrawal> {
  const id = generateId('wd');
  const withdrawal: Withdrawal = {
    ...wd,
    id,
    requestedAt: new Date().toISOString(),
  };

  const wds = getLocalItem<Withdrawal[]>('freeearn_demo_withdrawals', DEMO_WITHDRAWALS);
  wds.unshift(withdrawal);
  setLocalItem('freeearn_demo_withdrawals', wds);

  // Deduct coins & put into pending withdrawal balance
  await updateUserProfile(userProfile.uid, {
    coins: userProfile.coins - wd.amountCoins,
    pendingWithdrawalCoins: (userProfile.pendingWithdrawalCoins || 0) + wd.amountCoins,
  });

  await createTransaction({
    userId: userProfile.uid,
    type: 'withdrawal_request',
    amountCoins: wd.amountCoins,
    amountCurrency: wd.amountCurrency,
    status: 'pending',
    description: `Withdrawal via ${wd.method.toUpperCase()} (${wd.method === 'upi' ? wd.upiId : wd.bankAccountNumber})`,
    referenceId: id,
  });

  // 1. Sync to Backend REST API
  apiFetch('/api/withdrawals', {
    method: 'POST',
    body: JSON.stringify(withdrawal),
  });

  // 2. Sync to Firebase
  if (db) {
    setDoc(doc(db, 'withdrawals', id), withdrawal).catch(() => {});
  }
  return withdrawal;
}

export async function getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
  const wds = getLocalItem<Withdrawal[]>('freeearn_demo_withdrawals', DEMO_WITHDRAWALS);

  // Background fetch
  apiFetch<{ success: boolean; withdrawals: Withdrawal[] }>(`/api/withdrawals?userId=${userId}`).then((res) => {
    if (res && res.success && res.withdrawals) {
      setLocalItem('freeearn_demo_withdrawals', res.withdrawals);
    }
  });

  return wds
    .filter((w) => w.userId === userId)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

export async function getAllWithdrawals(): Promise<Withdrawal[]> {
  return getLocalItem<Withdrawal[]>('freeearn_demo_withdrawals', DEMO_WITHDRAWALS);
}

export async function updateWithdrawalStatus(
  withdrawal: Withdrawal,
  newStatus: 'approved' | 'rejected' | 'paid',
  adminNotes?: string,
  rejectionReason?: string,
  txnHash?: string
): Promise<void> {
  const wds = getLocalItem<Withdrawal[]>('freeearn_demo_withdrawals', DEMO_WITHDRAWALS);
  const idx = wds.findIndex((w) => w.id === withdrawal.id);
  if (idx >= 0) {
    wds[idx] = {
      ...wds[idx],
      status: newStatus,
      adminNotes: adminNotes || wds[idx].adminNotes,
      rejectionReason: rejectionReason || wds[idx].rejectionReason,
      txnHash: txnHash || wds[idx].txnHash,
      processedAt: new Date().toISOString(),
    };
    setLocalItem('freeearn_demo_withdrawals', wds);
  }

  const profile = await getUserProfile(withdrawal.userId);
  if (profile) {
    if (newStatus === 'paid') {
      await updateUserProfile(withdrawal.userId, {
        totalWithdrawn: (profile.totalWithdrawn || 0) + withdrawal.amountCoins,
        pendingWithdrawalCoins: Math.max(0, (profile.pendingWithdrawalCoins || 0) - withdrawal.amountCoins),
      });
    } else if (newStatus === 'rejected') {
      // Refund coins back to available balance
      await updateUserProfile(withdrawal.userId, {
        coins: profile.coins + withdrawal.amountCoins,
        pendingWithdrawalCoins: Math.max(0, (profile.pendingWithdrawalCoins || 0) - withdrawal.amountCoins),
      });

      await createTransaction({
        userId: withdrawal.userId,
        type: 'withdrawal_refund',
        amountCoins: withdrawal.amountCoins,
        amountCurrency: withdrawal.amountCurrency,
        status: 'completed',
        description: `Refund for rejected withdrawal: ${rejectionReason || 'Details incorrect'}`,
        referenceId: withdrawal.id,
      });
    }
  }

  // 1. Sync to Backend REST API
  apiFetch(`/api/withdrawals/${withdrawal.id}/review`, {
    method: 'POST',
    body: JSON.stringify({ status: newStatus, adminNotes, rejectionReason, txnHash }),
  });

  // 2. Sync to Firebase
  if (db) {
    updateDoc(doc(db, 'withdrawals', withdrawal.id), {
      status: newStatus,
      adminNotes,
      rejectionReason,
      txnHash,
      processedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

// ---------------- ANNOUNCEMENTS ----------------
export async function getAnnouncements(): Promise<Announcement[]> {
  const localAnn = getLocalItem<Announcement[]>('freeearn_demo_announcements', []);
  if (localAnn.length > 0) return localAnn;

  const seeded: Announcement[] = INITIAL_ANNOUNCEMENTS.map((a, idx) => ({
    ...a,
    id: `ann_${idx + 1}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }));
  setLocalItem('freeearn_demo_announcements', seeded);

  // Background fetch
  apiFetch<{ success: boolean; announcements: Announcement[] }>('/api/announcements').then((res) => {
    if (res && res.success && res.announcements) {
      setLocalItem('freeearn_demo_announcements', res.announcements);
    }
  });

  return seeded;
}

export async function createAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
  const id = generateId('ann');
  const annData: Announcement = {
    ...ann,
    id,
    createdAt: new Date().toISOString(),
  };

  const list = getLocalItem<Announcement[]>('freeearn_demo_announcements', []);
  list.unshift(annData);
  setLocalItem('freeearn_demo_announcements', list);

  // 1. Sync to Backend REST API
  apiFetch('/api/announcements', {
    method: 'POST',
    body: JSON.stringify(annData),
  });

  // 2. Sync to Firebase
  if (db) {
    setDoc(doc(db, 'announcements', id), annData).catch(() => {});
  }
  return annData;
}

export async function deleteAnnouncement(annId: string): Promise<void> {
  const list = getLocalItem<Announcement[]>('freeearn_demo_announcements', []);
  const filtered = list.filter((a) => a.id !== annId);
  setLocalItem('freeearn_demo_announcements', filtered);

  // 1. Sync to Backend REST API
  apiFetch(`/api/announcements/${annId}`, { method: 'DELETE' });
}

// Exported functions for AppContext compatibility
export async function requestWithdrawal(
  userProfile: UserProfile,
  amountCoins: number,
  method: 'upi' | 'bank',
  details: { upiId?: string; bankAccountNumber?: string; bankIfsc?: string; bankAccountName?: string }
): Promise<Withdrawal> {
  const wdData: Omit<Withdrawal, 'id' | 'requestedAt'> = {
    userId: userProfile.uid,
    userName: userProfile.name,
    userMobile: userProfile.mobile,
    amountCoins,
    amountCurrency: amountCoins / 100,
    method,
    status: 'pending',
    ...details,
  };
  return createWithdrawal(wdData, userProfile);
}

export async function submitTaskProof(
  sub: {
    taskId: string;
    taskTitle: string;
    userId: string;
    userName: string;
    userMobile: string;
    rewardCoins: number;
    proofLink: string;
    proofNotes: string;
    status?: 'pending' | 'approved' | 'rejected';
  }
): Promise<TaskSubmission> {
  return createTaskSubmission({
    ...sub,
    status: sub.status || 'pending',
  });
}

export async function processWithdrawal(
  withdrawal: Withdrawal,
  newStatus: 'approved' | 'rejected' | 'paid',
  adminNotes?: string,
  userProfile?: UserProfile | string,
  txnHash?: string
): Promise<void> {
  const notes = adminNotes || '';
  const reason = newStatus === 'rejected' ? notes : undefined;
  return updateWithdrawalStatus(withdrawal, newStatus, notes, reason, txnHash);
}

export async function lookupReferralCode(code: string): Promise<{
  valid: boolean;
  code?: string;
  referrerName?: string;
  bonusCoins?: number;
  error?: string;
}> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return { valid: false, error: 'Referral code empty' };

  try {
    const res = await apiFetch<{
      success: boolean;
      valid: boolean;
      code: string;
      referrerName: string;
      bonusCoins: number;
    }>(`/api/referrals/lookup/${encodeURIComponent(cleanCode)}`);

    if (res && res.success && res.valid) {
      return {
        valid: true,
        code: res.code,
        referrerName: res.referrerName,
        bonusCoins: res.bonusCoins || 50,
      };
    }
  } catch (e) {
    console.warn('Referral lookup notice:', e);
  }

  // Client-side fallback check
  if (cleanCode === 'ANKUSH07') {
    return {
      valid: true,
      code: 'ANKUSH07',
      referrerName: 'Ankush Kumar (Admin / Official)',
      bonusCoins: 50,
    };
  }

  if (cleanCode.length >= 4) {
    return {
      valid: true,
      code: cleanCode,
      referrerName: 'Invited Member',
      bonusCoins: 50,
    };
  }

  return { valid: false, error: 'Invalid invite code' };
}

export async function processReferralReward(
  referralCode: string,
  newUserUid: string,
  newUserName: string,
  newUserMobile?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const deviceFingerprint = getDeviceFingerprint();
    const res = await apiFetch<{ success: boolean; message: string }>('/api/referrals/process', {
      method: 'POST',
      body: JSON.stringify({
        referralCode,
        newUserUid,
        newUserName,
        newUserMobile,
        deviceFingerprint,
      }),
    });

    if (res && res.success) {
      return { success: true, message: res.message };
    }
  } catch (err: any) {
    console.warn('Referral process notice:', err);
  }

  return { success: true };
}

export async function getReferralsForUser(userId: string): Promise<ReferralRecord[]> {
  const refs = getLocalItem<ReferralRecord[]>('freeearn_demo_referrals', []);

  // Background fetch from server
  apiFetch<{ success: boolean; team: Array<{ uid: string; name: string; mobile: string; joinedAt: string; rewardCoins: number }> }>(
    `/api/referrals/team/${userId}`
  ).then((res) => {
    if (res && res.success && res.team) {
      const serverRefs: ReferralRecord[] = res.team.map((t, idx) => ({
        id: `ref_srv_${idx}_${t.uid}`,
        referrerId: userId,
        referredUserId: t.uid,
        referredUserName: t.name,
        referredMobile: t.mobile,
        bonusCoins: t.rewardCoins || 100,
        status: 'active',
        createdAt: t.joinedAt,
      }));
      setLocalItem('freeearn_demo_referrals', serverRefs);
    }
  }).catch(() => {});

  return refs.filter((r) => r.referrerId === userId);
}

export async function recordReferral(
  referrerId: string,
  newUser: { uid: string; name: string; mobile: string },
  bonusCoins: number
): Promise<void> {
  const id = generateId('ref');
  const refRecord: ReferralRecord = {
    id,
    referrerId,
    referredUserId: newUser.uid,
    referredUserName: newUser.name,
    referredMobile: newUser.mobile,
    bonusCoins,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const refs = getLocalItem<ReferralRecord[]>('freeearn_demo_referrals', []);
  refs.unshift(refRecord);
  setLocalItem('freeearn_demo_referrals', refs);

  if (db) {
    setDoc(doc(db, 'referrals', id), refRecord).catch(() => {});
  }
}

// ---------------- MOBILE OTP AUTHENTICATION ----------------
export async function sendMobileOtp(
  mobile: string,
  name?: string,
  mode: 'register' | 'login' = 'login'
): Promise<{ success: boolean; message: string; otp?: string; error?: string }> {
  const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
  if (cleanMobile.length !== 10) {
    return { success: false, message: '', error: 'Kripya 10-digit valid mobile number enter karein.' };
  }

  const hardwareEntropy = getDeviceHardwareEntropy();

  try {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      mobile: string;
      otp?: string;
      error?: string;
    }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile: cleanMobile, name, mode, hardwareEntropy }),
    });

    if (res && res.success) {
      return {
        success: true,
        message: res.message || `OTP sent to +91 ${cleanMobile}`,
        otp: res.otp,
      };
    } else {
      return {
        success: false,
        message: '',
        error: res?.error || 'Failed to send OTP. Kripya punah koshish karein.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: '',
      error: 'Network error. Please try again.',
    };
  }
}

export async function verifyMobileOtp(
  mobile: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
  const cleanOtp = (otp || '').trim();

  if (cleanMobile.length !== 10 || !cleanOtp) {
    return { success: false, error: 'Mobile number aur OTP dono enter karein.' };
  }

  try {
    const res = await apiFetch<{ success: boolean; message?: string; error?: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile: cleanMobile, otp: cleanOtp }),
    });

    if (res && res.success) {
      return { success: true };
    }
    return { success: false, error: res?.error || 'Galat OTP! Kripya sahi 6-digit code dalein.' };
  } catch {
    return { success: false, error: 'Verification failed. Please try again.' };
  }
}

// ---------------- BACKEND AUTHENTICATION & DEVICE REGISTRATION ----------------
export async function backendAuthLogin(params: {
  uid?: string;
  mobile?: string;
  name?: string;
  email?: string;
  password?: string;
  referralCode?: string;
  isNew?: boolean;
}): Promise<{ success: boolean; user?: UserProfile; isNew?: boolean; error?: string }> {
  const hardwareEntropy = getDeviceHardwareEntropy();
  const res = await apiFetch<{
    success: boolean;
    user?: UserProfile;
    isNew?: boolean;
    error?: string;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      hardwareEntropy,
    }),
  });

  if (res && res.success && res.user) {
    return { success: true, user: res.user, isNew: res.isNew };
  }
  return {
    success: false,
    error: res?.error || 'Authentication failed. Please try again.',
  };
}

export async function passwordLogin(
  identifier: string,
  pass: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; user?: UserProfile; error?: string }>('/api/auth/password-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password: pass }),
    });
    if (res && res.success && res.user) {
      return { success: true, user: res.user };
    }
    return { success: false, error: res?.error || 'Login failed. Kripya details check karein.' };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// ---------------- ADMIN DEVICE & 1-PHONE-1-ACCOUNT MANAGEMENT ----------------
export async function getAdminDevicesList(): Promise<{
  success: boolean;
  devices: any[];
  phones: any[];
  appeals: any[];
  error?: string;
}> {
  const res = await apiFetch<any>('/api/admin/devices');
  if (res && res.success) {
    return res;
  }
  return { success: false, devices: [], phones: [], appeals: [], error: res?.error || 'Failed to fetch devices' };
}

export async function adminUnlockDevice(params: {
  deviceHash?: string;
  mobile?: string;
  reason: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await apiFetch<any>('/api/admin/devices/unlock', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res || { success: false, error: 'Server error' };
}
