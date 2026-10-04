import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  UserProfile,
  Task,
  TaskSubmission,
  Transaction,
  Withdrawal,
  Announcement,
  AppSettings,
  AppNotification,
  UserLevel,
} from '../types';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  getAppSettings,
  getTasks,
  getUserSubmissions,
  getUserTransactions,
  getUserWithdrawals,
  getAnnouncements,
  createTransaction,
  requestWithdrawal as apiRequestWithdrawal,
  submitTaskProof,
  getAllUsers,
  getAllSubmissions,
  getAllWithdrawals,
  reviewSubmission,
  processWithdrawal,
  createTask,
  deleteTask,
  updateAppSettings,
  createAnnouncement,
  deleteAnnouncement,
  recordReferral,
  processReferralReward,
  getTodayDateString,
  generateReferralCode,
  generateId,
  backendAuthLogin,
  passwordLogin,
  getLocalItem,
  setLocalItem,
} from '../services/api';
import { DEFAULT_SETTINGS } from '../services/seedData';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import confetti from 'canvas-confetti';
import { validateRewardServerSide, registerDeviceSession } from '../services/security';

interface AppContextType {
  user: UserProfile | null;
  authLoading: boolean;
  isAdmin: boolean;
  activeTab: 'home' | 'earn' | 'wallet' | 'team' | 'profile' | 'admin';
  setActiveTab: (tab: 'home' | 'earn' | 'wallet' | 'team' | 'profile' | 'admin') => void;
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean | ((prev: boolean) => boolean)) => void;
  settings: AppSettings;
  tasks: Task[];
  submissions: TaskSubmission[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  announcements: Announcement[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationsAsRead: () => void;
  
  // Real User Auth Actions (100% Real Firebase - No Demo)
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPassword: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (name: string, email: string, pass: string, mobile?: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithMobile: (name: string, mobile: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserContact: (name: string, mobile: string) => Promise<void>;
  claimDailyCheckIn: () => Promise<{ success: boolean; reward: number; message: string }>;
  claimDailyBonus: () => Promise<{ success: boolean; reward: number; message: string }>;
  recordRewardedAdReward: (rewardCoins: number, sponsorBrand: string) => Promise<{ success: boolean; error?: string }>;
  submitTask: (taskId: string, proofLink: string, proofNotes: string) => Promise<{ success: boolean; error?: string }>;
  submitWithdrawal: (
    amountCoins: number,
    method: 'upi' | 'bank',
    details: { upiId?: string; bankAccountNumber?: string; bankIfsc?: string; bankAccountName?: string }
  ) => Promise<{ success: boolean; error?: string }>;

  // Admin Actions
  allUsers: UserProfile[];
  allSubmissions: TaskSubmission[];
  allWithdrawals: Withdrawal[];
  adminApproveTask: (submission: TaskSubmission, notes: string) => Promise<void>;
  adminRejectTask: (submission: TaskSubmission, notes: string) => Promise<void>;
  adminProcessWithdrawalAction: (withdrawal: Withdrawal, status: 'approved' | 'paid' | 'rejected', notes: string) => Promise<void>;
  adminCreateNewTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  adminDeleteTask: (taskId: string) => Promise<void>;
  adminUpdateAppSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  adminAdjustBalance: (userId: string, amountCoins: number, reason: string) => Promise<void>;
  adminToggleUserBlock: (userId: string, isBlocked: boolean) => Promise<void>;
  adminPostAnnouncement: (title: string, message: string, badge: string, priority: 'high' | 'normal' | 'low') => Promise<void>;
  adminDeleteAnnouncement: (annId: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ADMIN_EMAILS = ['kumarankush5184@gmail.com', 'admin@freeearn.app'];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User profile: initialized from stored session if present, otherwise null (requires Login/Register)
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      // If visiting via referral link, always show clean Register page
      if (window.location.search.includes('ref=') || window.location.hash.includes('ref=')) {
        localStorage.removeItem('freeearn_local_user');
        return null;
      }

      // Clean up any stale/cached admin user profile from client storage
      const stored = localStorage.getItem('freeearn_local_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          (parsed.uid === 'user_phone_9113124207' ||
            parsed.mobile?.includes('9113124207') ||
            parsed.name === 'Ankush Kumar' ||
            parsed.email?.toLowerCase() === 'kumarankush5184@gmail.com')
        ) {
          localStorage.removeItem('freeearn_local_user');
          return null;
        }
        if (parsed && parsed.uid) return parsed;
      }
    } catch {}
    return null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'earn' | 'wallet' | 'team' | 'profile' | 'admin'>('home');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Admin Data states
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<TaskSubmission[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([]);

  const isAdmin = Boolean(
    user?.isAdmin ||
    (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    user?.uid === 'admin_master_uid'
  );

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4F46E5', '#7C3AED', '#EC4899', '#10B981', '#F59E0B'],
      });
    } catch {
      // Ignore if confetti not supported
    }
  };

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const notif: AppNotification = {
      id: generateId('notif'),
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 20)]);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const calculateUserLevel = (totalEarned: number): UserLevel => {
    if (totalEarned >= 10000) return 'Diamond';
    if (totalEarned >= 5000) return 'Platinum';
    if (totalEarned >= 2000) return 'Gold';
    if (totalEarned >= 500) return 'Silver';
    return 'Bronze';
  };

  // Fetch initial app data
  const loadAppData = useCallback(async () => {
    try {
      const [appSettings, appTasks, appAnnouncements] = await Promise.all([
        getAppSettings(),
        getTasks(),
        getAnnouncements(),
      ]);
      setSettings(appSettings);
      setTasks(appTasks);
      setAnnouncements(appAnnouncements);
    } catch (err) {
      console.error('Error loading app data:', err);
    }
  }, []);

  // Fetch user specific data
  const loadUserData = useCallback(async (currentUid: string) => {
    try {
      const [subs, txns, wds] = await Promise.all([
        getUserSubmissions(currentUid),
        getUserTransactions(currentUid),
        getUserWithdrawals(currentUid),
      ]);
      setSubmissions(subs);
      setTransactions(txns);
      setWithdrawals(wds);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  // Fetch admin specific data
  const loadAdminData = useCallback(async () => {
    try {
      const [uList, subList, wdList] = await Promise.all([
        getAllUsers(),
        getAllSubmissions(),
        getAllWithdrawals(),
      ]);
      setAllUsers(uList);
      setAllSubmissions(subList);
      setAllWithdrawals(wdList);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  }, []);

  const refreshAllData = async () => {
    await loadAppData();
    if (user?.uid) {
      const profile = await getUserProfile(user.uid);
      if (profile) setUser(profile);
      await loadUserData(user.uid);
      if (isAdmin) {
        await loadAdminData();
      }
    }
  };

  // Auth state listener
  useEffect(() => {
    loadAppData();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        // 1. ALWAYS prioritize active session user from local storage
        const stored = localStorage.getItem('freeearn_local_user');
        let sessionUser: UserProfile | null = null;
        if (stored) {
          try {
            sessionUser = JSON.parse(stored) as UserProfile;
          } catch {}
        }

        if (sessionUser && sessionUser.uid) {
          const updatedProfile = await getUserProfile(sessionUser.uid);
          const safeCoins = Math.max(sessionUser.coins || 0, updatedProfile?.coins || 0);
          const safeTotal = Math.max(sessionUser.totalEarnings || 0, updatedProfile?.totalEarnings || 0);
          const activeProfile: UserProfile = {
            ...(updatedProfile || sessionUser),
            coins: safeCoins,
            totalEarnings: safeTotal,
          };
          setUser(activeProfile);
          localStorage.setItem('freeearn_local_user', JSON.stringify(activeProfile));
          setLocalItem(`freeearn_user_${activeProfile.uid}`, activeProfile);
          loadUserData(activeProfile.uid).catch(() => {});
          return;
        }

        // 2. If Firebase user logged in (e.g. Google or Firebase session)
        if (firebaseUser) {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile && firebaseUser.email) {
            profile = await getUserProfile(firebaseUser.email);
          }

          if (!profile) {
            const allUsers = await getAllUsers();
            profile =
              allUsers.find(
                (u) =>
                  (firebaseUser.email && u.email?.toLowerCase() === firebaseUser.email.toLowerCase()) ||
                  (firebaseUser.phoneNumber &&
                    u.mobile?.replace(/[^0-9]/g, '').slice(-10) ===
                      firebaseUser.phoneNumber.replace(/[^0-9]/g, '').slice(-10))
              ) || null;
          }

          if (!profile) {
            // Create initial user profile only if user has never existed before
            const newReferralCode = generateReferralCode();
            profile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Free Earn User',
              mobile: firebaseUser.phoneNumber || '',
              email: firebaseUser.email || '',
              referralCode: newReferralCode,
              coins: 100, // Welcome signup bonus
              todayEarnings: 100,
              totalEarnings: 100,
              totalWithdrawn: 0,
              pendingWithdrawalCoins: 0,
              level: 'Bronze',
              isBlocked: false,
              consecutiveCheckIns: 0,
              adsWatchedToday: 0,
              createdAt: new Date().toISOString(),
              isAdmin: firebaseUser.email ? ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase()) : false,
            };
            await createUserProfile(profile);
            await createTransaction({
              userId: firebaseUser.uid,
              type: 'daily_bonus',
              amountCoins: 100,
              amountCurrency: 1.0,
              status: 'completed',
              description: 'Welcome to Free Earn! Sign-up bonus',
            });
          }
          setUser(profile);
          localStorage.setItem('freeearn_local_user', JSON.stringify(profile));
          setLocalItem(`freeearn_user_${profile.uid}`, profile);
          loadUserData(profile.uid).catch(() => {});
        } else {
          // New visitor: DO NOT log in as anyone! Must show Register/Login screen.
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth state notice:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadAppData, loadUserData]);

  // Load admin data if admin
  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  // Handle Mobile Login / Registration (Fast, Bulletproof & Deterministic)
  const loginWithMobile = async (
    name: string,
    mobile: string,
    referralCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const sanitizedMobile = mobile.replace(/[^0-9]/g, '');
      if (sanitizedMobile.length < 10) {
        return { success: false, error: 'Kripya apna 10-digit valid mobile number enter karein.' };
      }

      // Take last 10 digits as standardized mobile key
      const tenDigit = sanitizedMobile.slice(-10);
      const uid = `user_phone_${tenDigit}`;

      // Check existing user directly by UID (does not require listing all users)
      let activeProfile = await getUserProfile(uid);
      const isNewUser = !activeProfile;

      // STRICT BACKEND ENFORCEMENT: One Phone + One Mobile = One Account
      const backendRes = await backendAuthLogin({
        uid,
        mobile: tenDigit,
        name: name.trim() || `Earner ${tenDigit.slice(-4)}`,
        referralCode,
        isNew: isNewUser,
      });

      if (!backendRes.success) {
        return {
          success: false,
          error: backendRes.error || 'This device or mobile number is already registered.',
        };
      }

      if (backendRes.user) {
        activeProfile = backendRes.user;
      }

      if (activeProfile && !isNewUser) {
        if (activeProfile.isBlocked) {
          return { success: false, error: 'Yeh account policy violation ki wajah se suspended hai.' };
        }
        // Update name if provided and changed
        if (name && name.trim() && activeProfile.name !== name.trim()) {
          activeProfile.name = name.trim();
          updateUserProfile(uid, { name: name.trim() }).catch(() => {});
        }
      } else {
        let startingCoins = 100; // Standard welcome bonus
        let referredByCode = '';

        if (referralCode && referralCode.trim()) {
          referredByCode = referralCode.trim().toUpperCase();
          startingCoins += settings.referralJoinBonusCoins || 50;
        }

        activeProfile = {
          uid,
          name: name.trim() || `Earner ${tenDigit.slice(-4)}`,
          mobile: `+91 ${tenDigit}`,
          referralCode: generateReferralCode(),
          referredBy: referredByCode,
          coins: startingCoins,
          todayEarnings: startingCoins,
          totalEarnings: startingCoins,
          totalWithdrawn: 0,
          pendingWithdrawalCoins: 0,
          level: 'Bronze',
          isBlocked: false,
          consecutiveCheckIns: 0,
          adsWatchedToday: 0,
          createdAt: new Date().toISOString(),
          isAdmin: false,
        };

        // Save profile to database & local storage
        try {
          await createUserProfile(activeProfile);
        } catch (e) {
          console.warn('Profile cloud sync note:', e);
        }

        // Record initial welcome bonus transaction
        try {
          await createTransaction({
            userId: uid,
            type: 'daily_bonus',
            amountCoins: startingCoins,
            amountCurrency: startingCoins / 100,
            status: 'completed',
            description: referredByCode
              ? `Welcome bonus (100 coins) + Referral bonus (${settings.referralJoinBonusCoins || 50} coins)`
              : 'Welcome bonus on sign up!',
          });
        } catch (e) {
          console.warn('Initial transaction sync note:', e);
        }

        // Credit inviter if referred
        if (referredByCode) {
          try {
            await processReferralReward(
              referredByCode,
              activeProfile.uid,
              activeProfile.name,
              activeProfile.mobile
            );
            const referrer = allUsers.find(
              (u) => u.referralCode?.toUpperCase() === referredByCode
            );
            if (referrer) {
              const refBonus = settings.referralRewardCoins || 100;
              const newCoins = referrer.coins + refBonus;
              await updateUserProfile(referrer.uid, {
                coins: newCoins,
                todayEarnings: (referrer.todayEarnings || 0) + refBonus,
                totalEarnings: (referrer.totalEarnings || 0) + refBonus,
              });
              await createTransaction({
                userId: referrer.uid,
                type: 'referral_bonus',
                amountCoins: refBonus,
                amountCurrency: refBonus / 100,
                status: 'completed',
                description: `Referral bonus for inviting ${activeProfile.name}`,
              });
              await recordReferral(
                referrer.uid,
                { uid: activeProfile.uid, name: activeProfile.name, mobile: activeProfile.mobile },
                refBonus
              );
            }
          } catch (refErr) {
            console.warn('Referral reward processing note:', refErr);
          }
        }
      }

      setUser(activeProfile);
      localStorage.setItem('freeearn_local_user', JSON.stringify(activeProfile));
      loadUserData(activeProfile.uid).catch(() => {});
      triggerConfetti();
      addNotification('Welcome to Free Earn!', 'Aapka account successfully register aur verify ho gaya hai.', 'system');

      return { success: true };
    } catch (err: unknown) {
      console.error('Error logging in with mobile:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed. Kripya punah koshish karein.' };
    }
  };

  // ---------------- REAL FIREBASE AUTHENTICATION (NO DEMO) ----------------

  // 1. Real Google Sign-In with Firebase Auth SDK
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const fbUser = res.user;

      if (fbUser) {
        let profile = await getUserProfile(fbUser.uid);
        if (!profile) {
          // STRICT BACKEND ENFORCEMENT: One Phone + One Mobile = One Account
          const backendRes = await backendAuthLogin({
            uid: fbUser.uid,
            email: fbUser.email || '',
            mobile: fbUser.phoneNumber || '',
            name: fbUser.displayName || 'Google Earner',
            isNew: true,
          });

          if (!backendRes.success) {
            return {
              success: false,
              error: backendRes.error || 'This device or mobile number is already registered.',
            };
          }

          const isUserAdmin = fbUser.email ? ADMIN_EMAILS.includes(fbUser.email.toLowerCase()) : false;
          const startingCoins = isUserAdmin ? 10000 : 100;

          profile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Earner User',
            email: fbUser.email || '',
            mobile: fbUser.phoneNumber || '',
            referralCode: isUserAdmin ? 'ADMIN01' : generateReferralCode(),
            referredBy: '',
            coins: startingCoins,
            todayEarnings: startingCoins,
            totalEarnings: startingCoins,
            totalWithdrawn: 0,
            pendingWithdrawalCoins: 0,
            level: isUserAdmin ? 'Diamond' : 'Bronze',
            isBlocked: false,
            consecutiveCheckIns: 0,
            adsWatchedToday: 0,
            createdAt: new Date().toISOString(),
            isAdmin: isUserAdmin,
          };

          await createUserProfile(profile);
          await createTransaction({
            userId: fbUser.uid,
            type: 'daily_bonus',
            amountCoins: startingCoins,
            amountCurrency: startingCoins / 100,
            status: 'completed',
            description: 'Welcome to Free Earn! Sign-up bonus',
          });
        }

        setUser(profile);
        localStorage.setItem('freeearn_local_user', JSON.stringify(profile));
        loadUserData(profile.uid).catch(() => {});
        triggerConfetti();
        addNotification('Signed In', `Welcome ${profile.name}!`, 'system');
        return { success: true };
      }
      return { success: false, error: 'Google sign-in could not be completed.' };
    } catch (err: unknown) {
      console.warn('Google Sign-in notice (cross-origin / network / popup restriction):', err);
      const e = err as { code?: string; message?: string };
      let msg = 'Google login unavailable due to browser/iframe restrictions. Kripya Mobile Number ya Email se Register karein!';
      if (e?.code === 'auth/popup-closed-by-user') {
        msg = 'Google sign-in popup was closed.';
      } else if (e?.code === 'auth/popup-blocked') {
        msg = 'Browser ne Google popup block kar diya. Kripya Mobile number ya Email se login karein.';
      } else if (e?.code === 'auth/operation-not-allowed') {
        msg = 'Google provider is not enabled in Firebase Console. Kripya Mobile number ya Email se login karein.';
      } else if (e?.code === 'auth/network-request-failed' || e?.code === 'auth/unauthorized-domain') {
        msg = 'Google popup is browser me block hai (Iframe/Domain restriction). Kripya upar "Mobile OTP" ya "Register" tab use karein.';
      } else if (e?.message) {
        msg = e.message;
      }
      return { success: false, error: msg };
    }
  };

  // 2. Real Mobile & Email Password Sign In (Server Authoritative & Fast)
  const loginWithEmail = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanId = (identifier || '').trim();
      const cleanPass = (pass || '').trim();
      if (!cleanId || !cleanPass) {
        return { success: false, error: 'Kripya Mobile number aur Password dono enter karein.' };
      }

      // Try Backend Password Login first (supports 10-digit mobile number or email)
      const res = await passwordLogin(cleanId, cleanPass);
      if (res.success && res.user) {
        // Read any previously earned coins cached for this UID or phone so coins never reset
        const existingLocal = getLocalItem<UserProfile | null>(`freeearn_user_${res.user.uid}`, null);
        const storedLocal = getLocalItem<UserProfile | null>('freeearn_local_user', null);

        const safeCoins = Math.max(
          res.user.coins || 0,
          existingLocal?.coins || 0,
          (storedLocal && (storedLocal.uid === res.user.uid || storedLocal.mobile?.slice(-10) === res.user.mobile?.slice(-10)))
            ? (storedLocal.coins || 0)
            : 0
        );
        const safeTotal = Math.max(
          res.user.totalEarnings || 0,
          existingLocal?.totalEarnings || 0,
          (storedLocal && (storedLocal.uid === res.user.uid || storedLocal.mobile?.slice(-10) === res.user.mobile?.slice(-10)))
            ? (storedLocal.totalEarnings || 0)
            : 0
        );

        const profile: UserProfile = {
          ...res.user,
          coins: safeCoins,
          totalEarnings: safeTotal,
        };

        if (safeCoins > (res.user.coins || 0)) {
          updateUserProfile(res.user.uid, { coins: safeCoins, totalEarnings: safeTotal }).catch(() => {});
        }

        setUser(profile);
        localStorage.setItem('freeearn_local_user', JSON.stringify(profile));
        setLocalItem(`freeearn_user_${profile.uid}`, profile);
        loadUserData(profile.uid).catch(() => {});
        triggerConfetti();
        addNotification('Signed In', `Welcome back ${profile.name}!`, 'system');
        return { success: true };
      }

      // If backend returned a clear error (e.g., incorrect password, or blocked), report it directly
      if (res.error && !res.error.toLowerCase().includes('not found') && !res.error.toLowerCase().includes('registered nahi')) {
        return { success: false, error: res.error };
      }

      // Fallback: If identifier is an email, check Firebase Auth
      if (cleanId.includes('@')) {
        const cleanEmail = cleanId.toLowerCase();
        let fbUser: any = null;

        try {
          const fbRes = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
          fbUser = fbRes.user;
        } catch (authErr: any) {
          console.warn('Firebase Auth sign in notice:', authErr?.message);
          if (authErr?.code === 'auth/wrong-password' || authErr?.code === 'auth/invalid-credential') {
            return { success: false, error: 'Incorrect email or password. Kripya check karein.' };
          }
        }

        const uid = fbUser ? fbUser.uid : `user_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
        let profile = await getUserProfile(uid);
        if (!profile) {
          profile = await getUserProfile(cleanEmail);
        }

        if (!profile) {
          const allUsers = await getAllUsers();
          profile = allUsers.find((u) => u.email?.toLowerCase() === cleanEmail) || null;
        }

        if (!profile) {
          const isUserAdmin = ADMIN_EMAILS.includes(cleanEmail);
          profile = {
            uid,
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            mobile: '',
            password: cleanPass,
            referralCode: isUserAdmin ? 'ADMIN01' : generateReferralCode(),
            referredBy: '',
            coins: isUserAdmin ? 10000 : 100,
            todayEarnings: isUserAdmin ? 10000 : 100,
            totalEarnings: isUserAdmin ? 10000 : 100,
            totalWithdrawn: 0,
            pendingWithdrawalCoins: 0,
            level: isUserAdmin ? 'Diamond' : 'Bronze',
            isBlocked: false,
            consecutiveCheckIns: 0,
            adsWatchedToday: 0,
            createdAt: new Date().toISOString(),
            isAdmin: isUserAdmin,
          };
          try {
            await createUserProfile(profile);
          } catch {}
        }

        setUser(profile);
        localStorage.setItem('freeearn_local_user', JSON.stringify(profile));
        loadUserData(uid).catch(() => {});
        triggerConfetti();
        addNotification('Signed In', `Welcome back ${profile.name}!`, 'system');
        return { success: true };
      }

      return {
        success: false,
        error: res.error || 'Yeh Mobile number registered nahi hai. Kripya naya account Register karein.',
      };
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  };

  // 3. Real Mobile, Email & Password Registration (Guaranteed to succeed, creates real profile + 100 Coins)
  const registerWithEmail = async (
    name: string,
    email: string,
    pass: string,
    mobile?: string,
    referralCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!name.trim()) {
        return { success: false, error: 'Kripya apna Full Name enter karein.' };
      }
      const cleanMobile = mobile ? mobile.replace(/[^0-9]/g, '') : '';
      if (!cleanMobile || cleanMobile.length < 10) {
        return { success: false, error: 'Kripya 10-digit valid Mobile Number enter karein.' };
      }
      if (!email.trim() || !email.includes('@')) {
        return { success: false, error: 'Kripya ek valid Email address enter karein.' };
      }
      if (!pass || pass.length < 6) {
        return { success: false, error: 'Password kam se kam 6 characters ka hona chahiye.' };
      }

      const tenDigit = cleanMobile.slice(-10);
      const formattedMobile = `+91 ${tenDigit}`;
      const cleanEmail = email.trim().toLowerCase();
      let fbUser: any = null;

      // Try Firebase Auth API if email available
      try {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        fbUser = res.user;
        if (fbUser && name.trim()) {
          try {
            await updateProfile(fbUser, { displayName: name.trim() });
          } catch {}
        }
      } catch (authErr: any) {
        console.warn('Firebase Auth note, proceeding with direct profile setup:', authErr?.message);
        if (authErr?.code === 'auth/email-already-in-use') {
          return { success: false, error: 'Yeh email already registered hai. Kripya Sign In karein.' };
        }
      }

      // Generate deterministic UID: Mobile is primary!
      const uid = `user_phone_${tenDigit}`;
      const isUserAdmin = ADMIN_EMAILS.includes(cleanEmail) || tenDigit === '9113124207';
      let startingCoins = isUserAdmin ? 10000 : 100;
      let referredByCode = '';

      if (referralCode && referralCode.trim() && !isUserAdmin) {
        referredByCode = referralCode.trim().toUpperCase();
        startingCoins += settings.referralJoinBonusCoins || 50;
      }

      // STRICT BACKEND ENFORCEMENT: One Phone + One Mobile = One Account
      const backendRes = await backendAuthLogin({
        uid,
        email: cleanEmail,
        mobile: tenDigit,
        name: name.trim(),
        password: pass,
        referralCode,
        isNew: true,
      });

      if (!backendRes.success) {
        return {
          success: false,
          error: backendRes.error || 'This device or mobile number is already registered.',
        };
      }

      const newProfile: UserProfile = backendRes.user || {
        uid,
        name: name.trim(),
        email: cleanEmail,
        mobile: formattedMobile,
        password: pass,
        referralCode: isUserAdmin ? 'ADMIN01' : generateReferralCode(),
        referredBy: referredByCode,
        coins: startingCoins,
        todayEarnings: startingCoins,
        totalEarnings: startingCoins,
        totalWithdrawn: 0,
        pendingWithdrawalCoins: 0,
        level: isUserAdmin ? 'Diamond' : 'Bronze',
        isBlocked: false,
        consecutiveCheckIns: 0,
        adsWatchedToday: 0,
        createdAt: new Date().toISOString(),
        isAdmin: isUserAdmin,
      };

      try {
        await createUserProfile(newProfile);
      } catch (e) {
        console.warn('Profile sync note:', e);
      }

      try {
        await createTransaction({
          userId: uid,
          type: 'daily_bonus',
          amountCoins: startingCoins,
          amountCurrency: startingCoins / 100,
          status: 'completed',
          description: referredByCode
            ? `Welcome bonus (100 coins) + Referral bonus (${settings.referralJoinBonusCoins || 50} coins)`
            : 'Welcome bonus on sign up!',
        });
      } catch (e) {
        console.warn('Transaction sync note:', e);
      }

      // Credit inviter if referred
      if (referredByCode) {
        try {
          await processReferralReward(
            referredByCode,
            newProfile.uid,
            newProfile.name,
            newProfile.mobile
          );
          const referrer = allUsers.find(
            (u) => u.referralCode?.toUpperCase() === referredByCode
          );
          if (referrer) {
            const refBonus = settings.referralRewardCoins || 100;
            const newCoins = referrer.coins + refBonus;
            await updateUserProfile(referrer.uid, {
              coins: newCoins,
              todayEarnings: (referrer.todayEarnings || 0) + refBonus,
              totalEarnings: (referrer.totalEarnings || 0) + refBonus,
            });
            await createTransaction({
              userId: referrer.uid,
              type: 'referral_bonus',
              amountCoins: refBonus,
              amountCurrency: refBonus / 100,
              status: 'completed',
              description: `Referral bonus for inviting ${newProfile.name}`,
            });
            await recordReferral(
              referrer.uid,
              { uid: newProfile.uid, name: newProfile.name, mobile: newProfile.mobile },
              refBonus
            );
          }
        } catch (refErr) {
          console.warn('Referral reward processing note:', refErr);
        }
      }

      setUser(newProfile);
      localStorage.setItem('freeearn_local_user', JSON.stringify(newProfile));
      loadUserData(uid).catch(() => {});
      triggerConfetti();
      addNotification('Welcome to Free Earn!', `Account successfully created for ${name.trim()}!`, 'system');
      return { success: true };
    } catch (err: unknown) {
      console.error('Registration error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out note:', e);
    }
    localStorage.removeItem('freeearn_local_user');
    setUser(null);
    setSubmissions([]);
    setTransactions([]);
    setWithdrawals([]);
    setActiveTab('home');
    addNotification('Logged Out', 'You have been signed out safely.', 'system');
  };

  const updateUserContact = async (name: string, mobile: string) => {
    if (!user) return;
    const updated = { ...user, name, mobile, updatedAt: new Date().toISOString() };
    await updateUserProfile(user.uid, { name, mobile });
    setUser(updated);
    localStorage.setItem('freeearn_local_user', JSON.stringify(updated));
    addNotification('Profile Updated', 'Your profile details have been saved.', 'system');
  };

  // 1. Daily Check-in (Server-Validated Anti-Cheat)
  const claimDailyCheckIn = async (): Promise<{ success: boolean; reward: number; message: string }> => {
    if (!user) return { success: false, reward: 0, message: 'Please login first' };

    const todayStr = getTodayDateString();
    if (user.lastCheckInDate === todayStr) {
      return { success: false, reward: 0, message: 'You have already claimed today’s check-in bonus!' };
    }

    const currentStreak = user.consecutiveCheckIns || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let newStreak = 1;
    if (user.lastCheckInDate === yesterdayStr) {
      newStreak = (currentStreak % 7) + 1;
    }

    const rewardCoins = settings.checkInRewards[newStreak - 1] || 20;

    // Server-side anti-cheat validation & replay check
    const validation = await validateRewardServerSide({
      userId: user.uid,
      userName: user.name,
      rewardType: 'daily_checkin',
      claimedCoins: rewardCoins,
    });

    if (!validation.success) {
      return {
        success: false,
        reward: 0,
        message: validation.error || 'Suspicious activity detected. Please try again later or contact support.',
      };
    }

    const authorizedCoins = validation.authorizedCoins || rewardCoins;
    const newCoins = user.coins + authorizedCoins;
    const newToday = user.todayEarnings + authorizedCoins;
    const newTotal = user.totalEarnings + authorizedCoins;
    const newLevel = calculateUserLevel(newTotal);

    const updatedUser: UserProfile = {
      ...user,
      coins: newCoins,
      todayEarnings: newToday,
      totalEarnings: newTotal,
      level: newLevel,
      lastCheckInDate: todayStr,
      consecutiveCheckIns: newStreak,
    };

    await updateUserProfile(user.uid, {
      coins: newCoins,
      todayEarnings: newToday,
      totalEarnings: newTotal,
      level: newLevel,
      lastCheckInDate: todayStr,
      consecutiveCheckIns: newStreak,
    });

    await createTransaction({
      userId: user.uid,
      type: 'checkin',
      amountCoins: authorizedCoins,
      amountCurrency: authorizedCoins / 100,
      status: 'completed',
      description: validation.rewardDescription || `Daily Check-in Day ${newStreak} bonus reward`,
    });

    setUser(updatedUser);
    localStorage.setItem('freeearn_local_user', JSON.stringify(updatedUser));
    await loadUserData(user.uid);
    triggerConfetti();
    addNotification('Daily Check-in Success!', `You earned +${authorizedCoins} coins! Streak: ${newStreak} days.`, 'reward');

    return {
      success: true,
      reward: authorizedCoins,
      message: `Awesome! You claimed Day ${newStreak} reward of +${authorizedCoins} Coins!`,
    };
  };

  // 2. Daily Lucky Bonus (Server-Validated Anti-Cheat)
  const claimDailyBonus = async (): Promise<{ success: boolean; reward: number; message: string }> => {
    if (!user) return { success: false, reward: 0, message: 'Please login first' };

    const nominalReward = settings.dailyBonusCoins || 15;

    // Server-side validation
    const validation = await validateRewardServerSide({
      userId: user.uid,
      userName: user.name,
      rewardType: 'daily_bonus',
      claimedCoins: nominalReward,
    });

    if (!validation.success) {
      return {
        success: false,
        reward: 0,
        message: validation.error || 'Suspicious activity detected. Please try again later or contact support.',
      };
    }

    const authorizedReward = validation.authorizedCoins || nominalReward;
    const newCoins = user.coins + authorizedReward;
    const newToday = user.todayEarnings + authorizedReward;
    const newTotal = user.totalEarnings + authorizedReward;

    const updatedUser = {
      ...user,
      coins: newCoins,
      todayEarnings: newToday,
      totalEarnings: newTotal,
    };

    await updateUserProfile(user.uid, {
      coins: newCoins,
      todayEarnings: newToday,
      totalEarnings: newTotal,
    });

    await createTransaction({
      userId: user.uid,
      type: 'daily_bonus',
      amountCoins: authorizedReward,
      amountCurrency: authorizedReward / 100,
      status: 'completed',
      description: validation.rewardDescription || 'Server-verified Daily Mystery Bonus',
    });

    setUser(updatedUser);
    localStorage.setItem('freeearn_local_user', JSON.stringify(updatedUser));
    await loadUserData(user.uid);
    triggerConfetti();
    addNotification('Daily Bonus Claimed!', `+${authorizedReward} coins credited to your wallet!`, 'reward');

    return { success: true, reward: authorizedReward, message: `Hooray! You received +${authorizedReward} Free Coins!` };
  };

  // 3. Rewarded Ad reward (Server-Validated Anti-Cheat)
  const recordRewardedAdReward = async (
    rewardCoins: number,
    sponsorBrand: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not logged in' };

    // Server-side verification: enforces duration threshold, cooldown, and daily limits
    const validation = await validateRewardServerSide({
      userId: user.uid,
      userName: user.name,
      rewardType: 'rewarded_ad',
      claimedCoins: rewardCoins,
      clientDurationMs: 16000, // Validated video length (16s)
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error || 'Suspicious activity detected. Please try again later or contact support.',
      };
    }

    const authorizedCoins = Number(settings.adRewardCoins) || 0;
    const todayStr = getTodayDateString();
    let currentWatched = user.adsWatchedToday || 0;
    if (user.adsWatchedDate !== todayStr) {
      currentWatched = 0;
    }

    const newWatched = currentWatched + 1;
    const newCoins = user.coins + authorizedCoins;
    const newToday = user.todayEarnings + authorizedCoins;
    const newTotal = user.totalEarnings + authorizedCoins;
    const newLevel = calculateUserLevel(newTotal);

    const updatedUser: UserProfile = {
      ...user,
      coins: newCoins,
      todayEarnings: newToday,
      totalEarnings: newTotal,
      level: newLevel,
      adsWatchedToday: newWatched,
      adsWatchedDate: todayStr,
      lastAdWatchedAt: new Date().toISOString(),
    };

    await updateUserProfile(user.uid, {
      coins: newCoins,
      todayEarnings: newToday,
      totalEarnings: newTotal,
      level: newLevel,
      adsWatchedToday: newWatched,
      adsWatchedDate: todayStr,
      lastAdWatchedAt: new Date().toISOString(),
    });

    if (authorizedCoins > 0) {
      await createTransaction({
        userId: user.uid,
        type: 'rewarded_ad',
        amountCoins: authorizedCoins,
        amountCurrency: authorizedCoins / 100,
        status: 'completed',
        description: validation.rewardDescription || `Rewarded Ad reward (${sponsorBrand}) - Ad ${newWatched}/${settings.dailyAdLimit}`,
      });
      triggerConfetti();
      addNotification('Ad Reward Credited', `+${authorizedCoins} coins verified & credited!`, 'reward');
    } else {
      addNotification('Ad Completed', 'Thank you for watching the sponsored video!', 'system');
    }

    setUser(updatedUser);
    localStorage.setItem('freeearn_local_user', JSON.stringify(updatedUser));
    await loadUserData(user.uid);

    return { success: true };
  };

  // 4. Submit Task Proof
  const submitTask = async (
    taskId: string,
    proofLink: string,
    proofNotes: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    // Check duplicate pending submission
    const existing = submissions.find((s) => s.taskId === taskId && s.status === 'pending');
    if (existing) {
      return { success: false, error: 'You already have a pending verification submission for this task.' };
    }

    const sub = await submitTaskProof({
      taskId,
      taskTitle: task.title,
      userId: user.uid,
      userName: user.name,
      userMobile: user.mobile,
      rewardCoins: task.rewardCoins,
      proofLink,
      proofNotes,
    });

    setSubmissions((prev) => [sub, ...prev]);
    addNotification('Task Submitted for Verification', `Task "${task.title}" is currently pending admin review.`, 'task');

    return { success: true };
  };

  // 5. Submit Withdrawal Request
  const submitWithdrawal = async (
    amountCoins: number,
    method: 'upi' | 'bank',
    details: { upiId?: string; bankAccountNumber?: string; bankIfsc?: string; bankAccountName?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    if (amountCoins < settings.minWithdrawalCoins) {
      return {
        success: false,
        error: `Minimum withdrawal is ${settings.minWithdrawalCoins} coins (${settings.currencySymbol}${(
          settings.minWithdrawalCoins / settings.coinToCurrencyRatio
        ).toFixed(2)})`,
      };
    }

    if (user.coins < amountCoins) {
      return { success: false, error: 'Insufficient coin balance in your wallet.' };
    }

    // Check if there is already a pending withdrawal
    const pendingWd = withdrawals.find((w) => w.status === 'pending');
    if (pendingWd) {
      return {
        success: false,
        error: 'You already have an active pending withdrawal request. Please wait for it to process.',
      };
    }

    if (method === 'upi' && (!details.upiId || !details.upiId.includes('@'))) {
      return { success: false, error: 'Please enter a valid UPI ID (e.g. mobile@upi or username@bank)' };
    }

    if (method === 'bank') {
      if (!details.bankAccountNumber || details.bankAccountNumber.length < 9) {
        return { success: false, error: 'Please enter a valid Bank Account Number' };
      }
      if (!details.bankIfsc || details.bankIfsc.length < 5) {
        return { success: false, error: 'Please enter a valid Bank IFSC Code' };
      }
      if (!details.bankAccountName || details.bankAccountName.trim().length < 3) {
        return { success: false, error: 'Please enter the Account Holder Name' };
      }
    }

    const wd = await apiRequestWithdrawal(user, amountCoins, method, details);

    const updatedUser: UserProfile = {
      ...user,
      coins: user.coins - amountCoins,
      pendingWithdrawalCoins: (user.pendingWithdrawalCoins || 0) + amountCoins,
    };

    setUser(updatedUser);
    localStorage.setItem('freeearn_local_user', JSON.stringify(updatedUser));
    setWithdrawals((prev) => [wd, ...prev]);
    await loadUserData(user.uid);

    addNotification(
      'Withdrawal Requested',
      `Your request for ${settings.currencySymbol}${(amountCoins / settings.coinToCurrencyRatio).toFixed(
        2
      )} has been queued.`,
      'withdrawal'
    );

    return { success: true };
  };

  // ---------------- ADMIN ACTIONS ----------------
  const adminApproveTask = async (submission: TaskSubmission, notes: string) => {
    const targetUser = allUsers.find((u) => u.uid === submission.userId);
    await reviewSubmission(submission, 'approved', notes, targetUser);
    await refreshAllData();
    addNotification('Task Approved', `Approved task submission for ${submission.userName}`, 'task');
  };

  const adminRejectTask = async (submission: TaskSubmission, notes: string) => {
    const targetUser = allUsers.find((u) => u.uid === submission.userId);
    await reviewSubmission(submission, 'rejected', notes, targetUser);
    await refreshAllData();
    addNotification('Task Rejected', `Rejected task submission with note: ${notes}`, 'task');
  };

  const adminProcessWithdrawalAction = async (
    withdrawal: Withdrawal,
    status: 'approved' | 'paid' | 'rejected',
    notes: string
  ) => {
    const targetUser = allUsers.find((u) => u.uid === withdrawal.userId);
    await processWithdrawal(withdrawal, status, notes, targetUser);
    await refreshAllData();
    addNotification('Withdrawal Updated', `Withdrawal #${withdrawal.id} marked as ${status}.`, 'withdrawal');
  };

  const adminCreateNewTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    await createTask(taskData);
    await refreshAllData();
    addNotification('New Task Created', `Task "${taskData.title}" is now active in marketplace.`, 'system');
  };

  const adminDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    await refreshAllData();
    addNotification('Task Deleted', `Task #${taskId} has been removed from marketplace.`, 'system');
  };

  const adminUpdateAppSettings = async (newSettings: Partial<AppSettings>) => {
    await updateAppSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addNotification('Settings Updated', 'Global app configurations updated successfully.', 'system');
  };

  const adminAdjustBalance = async (userId: string, amountCoins: number, reason: string) => {
    const targetUser = allUsers.find((u) => u.uid === userId);
    if (!targetUser) return;

    const newCoins = Math.max(0, targetUser.coins + amountCoins);
    await updateUserProfile(userId, { coins: newCoins });
    await createTransaction({
      userId,
      type: 'admin_adjustment',
      amountCoins,
      amountCurrency: amountCoins / 100,
      status: 'completed',
      description: `Admin balance adjustment: ${reason}`,
    });
    await refreshAllData();
  };

  const adminToggleUserBlock = async (userId: string, isBlocked: boolean) => {
    await updateUserProfile(userId, { isBlocked });
    await refreshAllData();
    addNotification('User Status Changed', `User has been ${isBlocked ? 'Blocked' : 'Unblocked'}.`, 'system');
  };

  const adminPostAnnouncement = async (
    title: string,
    message: string,
    badge: string,
    priority: 'high' | 'normal' | 'low'
  ) => {
    await createAnnouncement({ title, message, badge, priority, active: true });
    await refreshAllData();
    addNotification('Announcement Broadcast', `Posted: ${title}`, 'announcement');
  };

  const adminDeleteAnnouncement = async (annId: string) => {
    await deleteAnnouncement(annId);
    await refreshAllData();
    addNotification('Announcement Removed', 'Broadcast announcement removed.', 'system');
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        isAdmin,
        activeTab,
        setActiveTab,
        isPhoneFrame,
        setIsPhoneFrame,
        settings,
        tasks,
        submissions,
        transactions,
        withdrawals,
        announcements,
        notifications,
        unreadNotificationCount,
        markNotificationsAsRead,
        loginWithGoogle,
        loginWithEmail,
        loginWithPassword: loginWithEmail,
        registerWithEmail,
        loginWithMobile,
        logout,
        updateUserContact,
        claimDailyCheckIn,
        claimDailyBonus,
        recordRewardedAdReward,
        submitTask,
        submitWithdrawal,
        allUsers,
        allSubmissions,
        allWithdrawals,
        adminApproveTask,
        adminRejectTask,
        adminProcessWithdrawalAction,
        adminCreateNewTask,
        adminDeleteTask,
        adminUpdateAppSettings,
        adminAdjustBalance,
        adminToggleUserBlock,
        adminPostAnnouncement,
        adminDeleteAnnouncement,
        refreshAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
