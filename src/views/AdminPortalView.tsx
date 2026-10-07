import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Users,
  Coins,
  ArrowDownLeft,
  FileCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Settings,
  Megaphone,
  Search,
  Lock,
  Unlock,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Smartphone,
  LayoutDashboard,
  Layers,
  Check,
  Database,
  ChevronRight,
  ShieldAlert,
  Activity,
  Sliders,
  AlertTriangle,
  History,
  RotateCcw,
  Gift,
  UserPlus,
  Phone,
  Mail,
  Trash2,
  Calendar,
  Edit2,
  Video,
} from 'lucide-react';
import { SocialVideoCreatorModal } from '../components/SocialVideoCreatorModal';
import {
  Task,
  TaskSubmission,
  Withdrawal,
  UserProfile,
  AppSettings,
  TaskCategory,
  Announcement,
  Referral,
  ReferralCampaign,
  FraudReview,
} from '../types';
import {
  fetchSecurityEvents,
  fetchFlaggedAccounts,
  resolveSecurityFlag,
  fetchAntiCheatConfig,
  updateAntiCheatConfig,
  fetchAdminAuditLogs,
  SecurityEventItem,
  FlaggedAccountItem,
  AntiCheatConfigItem,
  AdminAuditItem,
} from '../services/security';
import {
  getAdminDevicesList,
  adminUnlockDevice,
  fetchAdminReferrals,
  adminApproveReferralReward,
  adminRejectReferral,
  adminUpdateReferralCampaign,
  fetchReferralFraudReviews,
  adminResolveFraudReview,
  AdminReferralsData,
} from '../services/api';

export const AdminPortalView: React.FC = () => {
  const {
    user,
    settings,
    allUsers,
    allSubmissions,
    allWithdrawals,
    tasks,
    announcements,
    setActiveTab,
    adminApproveTask,
    adminRejectTask,
    adminProcessWithdrawalAction,
    adminCreateNewTask,
    adminUpdateTask,
    adminDeleteTask,
    adminUpdateAppSettings,
    adminAdjustBalance,
    adminToggleUserBlock,
    adminResetDailyBonusForUser,
    adminResetStreakForUser,
    adminDeleteUser,
    adminCreateRealUser,
    adminUpdateUser,
    adminPostAnnouncement,
    adminUpdateAnnouncement,
    adminDeleteAnnouncement,
    adminDeleteWithdrawal,
    refreshAllData,
  } = useApp();

  // ---------------- MASTER ADMIN PASSWORD GATE (A829860k) ----------------
  const MASTER_ADMIN_PASSWORD = 'A829860k';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('freeearn_admin_auth') === 'A829860k';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === MASTER_ADMIN_PASSWORD) {
      sessionStorage.setItem('freeearn_admin_auth', MASTER_ADMIN_PASSWORD);
      setIsAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Galat Admin Password! Kripya sahi password darj karein.');
    }
  };

  const handleLockPortal = () => {
    sessionStorage.removeItem('freeearn_admin_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const [activeSection, setActiveSection] = useState<
    'overview' | 'app_controls' | 'withdrawals' | 'submissions' | 'users' | 'tasks' | 'settings' | 'broadcast' | 'security' | 'referrals'
  >('overview');

  // Referral System Admin Dashboard State
  const [referralsData, setReferralsData] = useState<AdminReferralsData | null>(null);
  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<'all' | 'pending' | 'verified' | 'reward_eligible' | 'rewarded' | 'rejected'>('all');
  const [campaignForm, setCampaignForm] = useState<Partial<ReferralCampaign>>({
    name: 'Smart Earn Official Referral Program',
    referrerRewardCoins: 100,
    refereeJoinBonusCoins: 50,
    maxRewardsPerUser: 50,
    qualificationRule: 'first_task_completed',
    minTasksRequired: 1,
    rewardMode: 'auto_reward',
    isActive: true,
  });
  const [fraudReviews, setFraudReviews] = useState<FraudReview[]>([]);
  const [selectedRefForReject, setSelectedRefForReject] = useState<Referral | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [referralActionLoading, setReferralActionLoading] = useState(false);

  const loadReferralsData = React.useCallback(async () => {
    try {
      const [refRes, frRes] = await Promise.all([
        fetchAdminReferrals(),
        fetchReferralFraudReviews(),
      ]);
      if (refRes && refRes.success) {
        setReferralsData(refRes);
        if (refRes.campaign) {
          setCampaignForm(refRes.campaign);
        }
      }
      if (frRes && frRes.success) {
        setFraudReviews(frRes.reviews);
      }
    } catch (err) {
      console.warn('Error loading admin referrals:', err);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [wdStatusFilter, setWdStatusFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('pending');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 2500);
  };

  // Security & Anti-Cheat State
  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<FlaggedAccountItem[]>([]);
  const [securityConfig, setSecurityConfig] = useState<AntiCheatConfigItem>({
    minAdDurationSeconds: 15,
    adCooldownSeconds: 30,
    maxAccountsPerDevice: 2,
    maxDailyAdLimit: 10,
    maxDailyCoinCap: 5000,
    suspiciousRiskThreshold: 60,
  });
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([]);
  const [securityTab, setSecurityTab] = useState<'devices' | 'flagged' | 'events' | 'config' | 'audit'>('devices');
  const [registeredDevices, setRegisteredDevices] = useState<any[]>([]);
  const [registeredPhones, setRegisteredPhones] = useState<any[]>([]);
  const [deviceAppealsList, setDeviceAppealsList] = useState<any[]>([]);
  const [unlockActionLoading, setUnlockActionLoading] = useState(false);

  const loadSecurityData = React.useCallback(async () => {
    const [events, flagged, cfg, audits, devData] = await Promise.all([
      fetchSecurityEvents(),
      fetchFlaggedAccounts(),
      fetchAntiCheatConfig(),
      fetchAdminAuditLogs(),
      getAdminDevicesList(),
    ]);
    setSecurityEvents(events);
    setFlaggedAccounts(flagged);
    if (cfg) setSecurityConfig(cfg);
    setAuditLogs(audits);
    if (devData && devData.success) {
      setRegisteredDevices(devData.devices || []);
      setRegisteredPhones(devData.phones || []);
      setDeviceAppealsList(devData.appeals || []);
    }
  }, []);

  const handleAdminUnlockDevice = async (deviceHash?: string, mobile?: string, appealId?: string) => {
    const reason = prompt(
      'Enter authorization reason for phone replacement / device unlock:',
      'Verified legitimate phone replacement'
    );
    if (!reason || !reason.trim()) return;

    setUnlockActionLoading(true);
    const res = await adminUnlockDevice({
      deviceHash,
      mobile,
      reason: reason.trim(),
    });
    setUnlockActionLoading(false);

    if (res.success) {
      alert(res.message || 'Device/Phone successfully unlocked for replacement.');
      loadSecurityData();
    } else {
      alert(res.error || 'Failed to unlock device.');
    }
  };

  React.useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  // Balance adjustment modal
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');

  // Add Real User Modal State
  const [showAddRealUserModal, setShowAddRealUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserCoins, setNewUserCoins] = useState(100);
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  // Task creation form
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReward, setNewReward] = useState(150);
  const [newCategory, setNewCategory] = useState<TaskCategory>('app');
  const [newInstructions, setNewInstructions] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Settings form
  const [minWdCoins, setMinWdCoins] = useState(settings.minWithdrawalCoins);
  const [refCoins, setRefCoins] = useState(settings.referralRewardCoins);
  const [joinBonusCoins, setJoinBonusCoins] = useState(settings.referralJoinBonusCoins);
  const [adReward, setAdReward] = useState(settings.adRewardCoins || 5);
  const [pageAdReward, setPageAdReward] = useState(settings.pageAdRewardCoins || 5);
  const [dailyAdCap, setDailyAdCap] = useState(settings.dailyAdLimit || 100);
  const [coinRatio, setCoinRatio] = useState(settings.coinToCurrencyRatio || 100);
  const [dailyBonus, setDailyBonus] = useState(settings.dailyBonusCoins || 15);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail || 'support@freeearn.app');
  const [supportWhatsapp, setSupportWhatsapp] = useState(settings.supportWhatsapp || '+91 9113124207');
  const [telegramChannelUrl, setTelegramChannelUrl] = useState(settings.telegramChannelUrl || 'https://t.me/+gUbcV1SSrDQzMDNl');
  const [telegramMandatoryJoin, setTelegramMandatoryJoin] = useState(settings.telegramMandatoryJoin !== false);
  const [youtubeUrl, setYoutubeUrl] = useState(settings.youtubeUrl || 'https://youtube.com/@smartearn15?si=rvwi__ntl2jpgez1');
  const [meeshoUrl, setMeeshoUrl] = useState(settings.meeshoUrl || 'https://app.meesho.com/2yoV/r99th0qd?via=3fvfzp&from=home_page_pill');
  const [gpayUrl, setGpayUrl] = useState(settings.gpayUrl || 'https://gpay.app.goo.gl/invite-q211c0a');
  const [admobAppId, setAdmobAppId] = useState(settings.admobAppId || 'ca-app-pub-7524191132114722~4422067441');
  const [admobRewardedUnitId, setAdmobRewardedUnitId] = useState(settings.admobRewardedUnitId || 'ca-app-pub-7524191132114722/4622212147');
  const [admobBannerUnitId, setAdmobBannerUnitId] = useState(settings.admobBannerUnitId || 'ca-app-pub-7524191132114722/4622212147');

  // Master App Feature Controls State
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(Boolean(settings.maintenanceMode));
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(settings.maintenanceMessage || '');
  const [dailyCheckInEnabled, setDailyCheckInEnabled] = useState<boolean>(settings.dailyCheckInEnabled !== false);
  const [checkInRewardsList, setCheckInRewardsList] = useState<number[]>(settings.checkInRewards || [10, 15, 20, 25, 35, 50, 100]);
  const [dailyBonusEnabled, setDailyBonusEnabled] = useState<boolean>(settings.dailyBonusEnabled !== false);
  const [dailyBonusMinCoins, setDailyBonusMinCoins] = useState<number>(settings.dailyBonusMinCoins || 10);
  const [dailyBonusMaxCoins, setDailyBonusMaxCoins] = useState<number>(settings.dailyBonusMaxCoins || 50);
  const [videoAdsEnabled, setVideoAdsEnabled] = useState<boolean>(settings.videoAdsEnabled !== false);
  const [pageAdsEnabled, setPageAdsEnabled] = useState<boolean>(settings.pageAdsEnabled !== false);
  const [pageAdSkipSeconds, setPageAdSkipSeconds] = useState<number>(settings.pageAdSkipSeconds || 5);
  const [adCooldownSeconds, setAdCooldownSeconds] = useState<number>(settings.adCooldownSeconds || 0);
  const [tasksEnabled, setTasksEnabled] = useState<boolean>(settings.tasksEnabled !== false);
  const [referralEnabled, setReferralEnabled] = useState<boolean>(settings.referralEnabled !== false);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState<boolean>(settings.withdrawalsEnabled !== false);
  const [withdrawalsDisabledReason, setWithdrawalsDisabledReason] = useState<string>(settings.withdrawalsDisabledReason || '');
  const [allowedMethods, setAllowedMethods] = useState<('upi' | 'bank' | 'paytm' | 'phonepe')[]>(
    settings.allowedWithdrawalMethods || ['upi', 'bank', 'paytm', 'phonepe']
  );
  const [homeNoticeActive, setHomeNoticeActive] = useState<boolean>(Boolean(settings.homeNoticeActive));
  const [homeNoticeText, setHomeNoticeText] = useState<string>(settings.homeNoticeText || '');

  // Task edit state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editReward, setEditReward] = useState(150);
  const [editCategory, setEditCategory] = useState<TaskCategory>('app');
  const [editInstructions, setEditInstructions] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'completed'>('active');

  // User edit state
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserMobile, setEditUserMobile] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserCoins, setEditUserCoins] = useState(0);
  const [editUserIsAdmin, setEditUserIsAdmin] = useState(false);
  const [editUserIsBlocked, setEditUserIsBlocked] = useState(false);

  // Announcement edit state
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showSocialVideoModal, setShowSocialVideoModal] = useState(false);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnMsg, setEditAnnMsg] = useState('');
  const [editAnnBadge, setEditAnnBadge] = useState('Update');
  const [editAnnPriority, setEditAnnPriority] = useState<'high' | 'normal' | 'low'>('normal');

  // Sync settings when updated
  React.useEffect(() => {
    setMinWdCoins(settings.minWithdrawalCoins);
    setRefCoins(settings.referralRewardCoins);
    setJoinBonusCoins(settings.referralJoinBonusCoins);
    setAdReward(settings.adRewardCoins || 5);
    setPageAdReward(settings.pageAdRewardCoins || 5);
    setDailyAdCap(settings.dailyAdLimit || 100);
    setCoinRatio(settings.coinToCurrencyRatio || 100);
    setDailyBonus(settings.dailyBonusCoins || 15);
    setSupportEmail(settings.supportEmail || 'support@freeearn.app');
    setSupportWhatsapp(settings.supportWhatsapp || '+91 9113124207');
    setTelegramChannelUrl(settings.telegramChannelUrl || 'https://t.me/+gUbcV1SSrDQzMDNl');
    setTelegramMandatoryJoin(settings.telegramMandatoryJoin !== false);
    setYoutubeUrl(settings.youtubeUrl || 'https://youtube.com/@smartearn15?si=rvwi__ntl2jpgez1');
    setMeeshoUrl(settings.meeshoUrl || 'https://app.meesho.com/2yoV/r99th0qd?via=3fvfzp&from=home_page_pill');
    setGpayUrl(settings.gpayUrl || 'https://gpay.app.goo.gl/invite-q211c0a');
    setMaintenanceMode(Boolean(settings.maintenanceMode));
    setMaintenanceMessage(settings.maintenanceMessage || '');
    setDailyCheckInEnabled(settings.dailyCheckInEnabled !== false);
    setCheckInRewardsList(settings.checkInRewards || [10, 15, 20, 25, 35, 50, 100]);
    setDailyBonusEnabled(settings.dailyBonusEnabled !== false);
    setDailyBonusMinCoins(settings.dailyBonusMinCoins || 10);
    setDailyBonusMaxCoins(settings.dailyBonusMaxCoins || 50);
    setVideoAdsEnabled(settings.videoAdsEnabled !== false);
    setPageAdsEnabled(settings.pageAdsEnabled !== false);
    setPageAdSkipSeconds(settings.pageAdSkipSeconds || 5);
    setAdCooldownSeconds(settings.adCooldownSeconds || 0);
    setTasksEnabled(settings.tasksEnabled !== false);
    setReferralEnabled(settings.referralEnabled !== false);
    setWithdrawalsEnabled(settings.withdrawalsEnabled !== false);
    setWithdrawalsDisabledReason(settings.withdrawalsDisabledReason || '');
    setAllowedMethods(settings.allowedWithdrawalMethods || ['upi', 'bank', 'paytm', 'phonepe']);
    setHomeNoticeActive(Boolean(settings.homeNoticeActive));
    setHomeNoticeText(settings.homeNoticeText || '');
  }, [settings]);

  // Live real-time sync for withdrawals, users, and submissions in Admin Portal
  React.useEffect(() => {
    refreshAllData();
    const interval = setInterval(() => {
      refreshAllData();
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annBadge, setAnnBadge] = useState('Update');

  // UTR action state
  const [selectedWdForUtr, setSelectedWdForUtr] = useState<Withdrawal | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<Withdrawal | null>(null);
  const [isProcessingWd, setIsProcessingWd] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshAllData(), loadReferralsData(), loadSecurityData()]);
    setRefreshing(false);
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      loadReferralsData();
    }
  }, [isAuthenticated, loadReferralsData]);

  const handleApproveReward = async (refId: string) => {
    setReferralActionLoading(true);
    try {
      const res = await adminApproveReferralReward(refId);
      if (res.success) {
        setCopyToast('Referral reward approved & credited to user ledger!');
        setTimeout(() => setCopyToast(null), 2500);
        await Promise.all([loadReferralsData(), refreshAllData()]);
      } else {
        alert(res.error || 'Failed to approve referral reward');
      }
    } catch (err: any) {
      alert(err.message || 'Error approving reward');
    } finally {
      setReferralActionLoading(false);
    }
  };

  const handleRejectReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefForReject) return;
    setReferralActionLoading(true);
    try {
      const res = await adminRejectReferral(selectedRefForReject.id, rejectReasonInput || 'Rejected by Admin Fair Play audit');
      if (res.success) {
        setCopyToast('Referral rejected successfully.');
        setTimeout(() => setCopyToast(null), 2500);
        setSelectedRefForReject(null);
        setRejectReasonInput('');
        await loadReferralsData();
      } else {
        alert(res.error || 'Failed to reject referral');
      }
    } catch (err: any) {
      alert(err.message || 'Error rejecting referral');
    } finally {
      setReferralActionLoading(false);
    }
  };

  const handleSaveCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReferralActionLoading(true);
    try {
      const res = await adminUpdateReferralCampaign(campaignForm);
      if (res.success) {
        setCopyToast('Referral Campaign configuration saved!');
        setTimeout(() => setCopyToast(null), 2500);
        await Promise.all([loadReferralsData(), refreshAllData()]);
      } else {
        alert(res.error || 'Failed to update campaign rules');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving campaign');
    } finally {
      setReferralActionLoading(false);
    }
  };

  const handleResolveFraudReviewAction = async (id: string, status: 'approved' | 'rejected') => {
    setReferralActionLoading(true);
    try {
      const res = await adminResolveFraudReview(id, status, 'Resolved by Master Admin audit');
      if (res.success) {
        setCopyToast(`Fraud alert marked as ${status}!`);
        setTimeout(() => setCopyToast(null), 2500);
        await loadReferralsData();
      }
    } finally {
      setReferralActionLoading(false);
    }
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAdjust || !adjustReason.trim()) return;

    await adminAdjustBalance(selectedUserForAdjust.uid, adjustAmount, adjustReason);
    setSelectedUserForAdjust(null);
    setAdjustReason('');
    setCopyToast(`Balance adjusted for ${selectedUserForAdjust.name}`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleAddRealUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    if (!newUserName.trim()) {
      setAddUserError('Full Name is required.');
      return;
    }
    const cleanDigits = newUserMobile.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanDigits && !newUserEmail.trim()) {
      setAddUserError('Please provide a 10-digit mobile number or email address.');
      return;
    }
    if (newUserMobile.trim() && cleanDigits.length !== 10) {
      setAddUserError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setAddUserLoading(true);
    try {
      const res = await adminCreateRealUser({
        name: newUserName.trim(),
        mobile: cleanDigits,
        email: newUserEmail.trim(),
        password: newUserPassword.trim() || 'pass1234',
        coins: Number(newUserCoins) || 0,
        isAdmin: newUserIsAdmin,
      });

      if (res.success && res.user) {
        setShowAddRealUserModal(false);
        setNewUserName('');
        setNewUserMobile('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserCoins(100);
        setNewUserIsAdmin(false);
        setCopyToast(`Real user "${res.user.name}" registered successfully!`);
        setTimeout(() => setCopyToast(null), 3000);
      } else {
        setAddUserError(res.error || 'Failed to add real user.');
      }
    } catch (err: any) {
      setAddUserError(err.message || 'Error creating real user.');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstructions.trim()) return;

    await adminCreateNewTask({
      title: newTitle,
      description: newDesc,
      rewardCoins: Number(newReward),
      category: newCategory,
      instructions: newInstructions,
      stepGuide: newInstructions.split('\n').filter((l) => l.trim().length > 0),
      dailyLimit: 500,
      badge: 'Admin Exclusive',
      externalUrl: newUrl || 'https://google.com',
      verificationMethod: 'proof_link',
      status: 'active',
    });

    setShowNewTaskModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewInstructions('');
    setNewUrl('');
    setCopyToast('New task published to marketplace!');
    setTimeout(() => setCopyToast(null), 2500);
  };

  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditDesc(t.description);
    setEditReward(t.rewardCoins);
    setEditCategory(t.category);
    setEditInstructions(t.instructions || '');
    setEditUrl(t.externalUrl || '');
    setEditStatus(t.status || 'active');
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    await adminUpdateTask(editingTask.id, {
      title: editTitle,
      description: editDesc,
      rewardCoins: Number(editReward),
      category: editCategory,
      instructions: editInstructions,
      stepGuide: editInstructions.split('\n').filter((l) => l.trim().length > 0),
      externalUrl: editUrl,
      status: editStatus,
    });
    setEditingTask(null);
    setCopyToast(`Task "${editTitle}" updated successfully!`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleToggleTaskStatus = async (t: Task) => {
    const nextStatus = t.status === 'active' ? 'paused' : 'active';
    await adminUpdateTask(t.id, { status: nextStatus });
    setCopyToast(`Task "${t.title}" is now ${nextStatus.toUpperCase()}`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await adminUpdateAppSettings({
      minWithdrawalCoins: Number(minWdCoins),
      referralRewardCoins: Number(refCoins),
      referralJoinBonusCoins: Number(joinBonusCoins),
      adRewardCoins: Number(adReward) || 5,
      pageAdRewardCoins: Number(pageAdReward) || 5,
      dailyAdLimit: Number(dailyAdCap),
      coinToCurrencyRatio: Number(coinRatio),
      dailyBonusCoins: Number(dailyBonus),
      dailyBonusMinCoins: Number(dailyBonusMinCoins),
      dailyBonusMaxCoins: Number(dailyBonusMaxCoins),
      supportEmail: supportEmail,
      supportWhatsapp: supportWhatsapp,
      telegramChannelUrl: telegramChannelUrl,
      telegramMandatoryJoin: telegramMandatoryJoin,
      youtubeUrl: youtubeUrl,
      meeshoUrl: meeshoUrl,
      gpayUrl: gpayUrl,
      admobAppId: admobAppId,
      admobRewardedUnitId: admobRewardedUnitId,
      admobBannerUnitId: admobBannerUnitId,
      maintenanceMode: maintenanceMode,
      maintenanceMessage: maintenanceMessage,
      dailyCheckInEnabled: dailyCheckInEnabled,
      checkInRewards: checkInRewardsList,
      dailyBonusEnabled: dailyBonusEnabled,
      videoAdsEnabled: videoAdsEnabled,
      pageAdsEnabled: pageAdsEnabled,
      pageAdSkipSeconds: Number(pageAdSkipSeconds) || 5,
      adCooldownSeconds: Number(adCooldownSeconds),
      tasksEnabled: tasksEnabled,
      referralEnabled: referralEnabled,
      withdrawalsEnabled: withdrawalsEnabled,
      withdrawalsDisabledReason: withdrawalsDisabledReason,
      allowedWithdrawalMethods: allowedMethods,
      homeNoticeActive: homeNoticeActive,
      homeNoticeText: homeNoticeText,
    });
    setCopyToast('Settings & App Controls Saved Successfully!');
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleQuickToggle = async (key: keyof AppSettings, val: any, label: string) => {
    await adminUpdateAppSettings({ [key]: val });
    setCopyToast(`${label}: ${val ? 'Activated (ON)' : 'Disabled (OFF)'}`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMsg.trim()) return;
    await adminPostAnnouncement(annTitle, annMsg, annBadge, 'high');
    setAnnTitle('');
    setAnnMsg('');
  };

  const handleOpenAnnEdit = (a: Announcement) => {
    setEditingAnnouncement(a);
    setEditAnnTitle(a.title);
    setEditAnnMsg(a.message);
    setEditAnnBadge(a.badge);
    setEditAnnPriority(a.priority || 'normal');
  };

  const handleSaveAnnEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    await adminUpdateAnnouncement(editingAnnouncement.id, {
      title: editAnnTitle.trim(),
      message: editAnnMsg.trim(),
      badge: editAnnBadge,
      priority: editAnnPriority,
    });
    setEditingAnnouncement(null);
    setCopyToast(`Announcement "${editAnnTitle}" updated successfully!`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleOpenUserEdit = (u: UserProfile) => {
    setSelectedUserForEdit(u);
    setEditUserName(u.name || '');
    setEditUserMobile(u.mobile || '');
    setEditUserEmail(u.email || '');
    setEditUserPassword(u.password || '');
    setEditUserCoins(u.coins || 0);
    setEditUserIsAdmin(Boolean(u.isAdmin));
    setEditUserIsBlocked(Boolean(u.isBlocked));
  };
  const openEditUser = handleOpenUserEdit;

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    await adminUpdateUser(selectedUserForEdit.uid, {
      name: editUserName.trim(),
      mobile: editUserMobile.trim(),
      email: editUserEmail.trim(),
      password: editUserPassword.trim(),
      coins: Number(editUserCoins) || 0,
      isAdmin: editUserIsAdmin,
      isBlocked: editUserIsBlocked,
    });
    setSelectedUserForEdit(null);
    setCopyToast(`User "${editUserName}" updated successfully!`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleDeleteWithdrawal = async (wdId: string) => {
    if (window.confirm(`Delete withdrawal request #${wdId} permanently?`)) {
      await adminDeleteWithdrawal(wdId);
      setCopyToast(`Withdrawal #${wdId} deleted.`);
      setTimeout(() => setCopyToast(null), 2500);
    }
  };

  // KPIs
  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === 'pending');
  const paidWithdrawals = allWithdrawals.filter((w) => w.status === 'paid');
  const pendingSubmissions = allSubmissions.filter((s) => s.status === 'pending');
  const totalPaidOutINR = paidWithdrawals.reduce((acc, curr) => acc + curr.amountCurrency, 0);
  const totalPendingINR = pendingWithdrawals.reduce((acc, curr) => acc + curr.amountCurrency, 0);

  // Real registered users only (strictly exclude legacy demo/mock profiles)
  const realUsersOnly = allUsers.filter((u) => u && u.uid && !u.uid.startsWith('user_demo_'));

  const filteredUsers = realUsersOnly.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.mobile.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredWithdrawals = allWithdrawals.filter((w) => {
    if (wdStatusFilter === 'all') return true;
    return w.status === wdStatusFilter;
  });

  const filteredSubmissions = allSubmissions.filter((s) => {
    if (submissionFilter === 'all') return true;
    return s.status === submissionFilter;
  });

  // ================= MASTER PASSWORD SECURITY GATE (A829860k) =================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-8 shadow-2xl shadow-rose-950/70 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-rose-600/40">
            <Lock className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 tracking-wider">
              Restricted Area • Master Admin Gate
            </span>
            <h2 className="text-2xl font-black text-white mt-2">FREE EARN ADMIN PORTAL</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter the Master Admin Password to access payouts, user management & system controls.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Master Admin Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter Password (A829860k)"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-950 border border-rose-500/40 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs font-semibold text-rose-400 mt-1.5 animate-pulse">
                  ❌ {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-rose-600/40 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Controls</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setActiveTab('home');
                window.location.hash = '/app';
              }}
              className="text-slate-400 hover:text-indigo-300 transition-colors flex items-center space-x-1"
            >
              <span>← Back to User App</span>
            </button>
            <span className="text-[10px] text-slate-600 font-mono">Password Protected</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* ================= MASTER ADMIN TOP BAR ================= */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-900/90 border-b border-rose-500/20 px-4 lg:px-8 py-3.5 shadow-xl shadow-slate-950/60">
        <div className="flex items-center justify-between">
          {/* Logo & Portal Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-rose-300">
                  FREE EARN
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 tracking-wider">
                  Master Admin
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Firebase Live</span>
                </span>
                <span>•</span>
                <span>Full Control Active</span>
              </div>
            </div>
          </div>

            {/* Action Center */}
          <div className="flex items-center space-x-2.5">
            {copyToast && (
              <span className="text-xs font-bold text-emerald-300 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-xl animate-pulse">
                ✓ {copyToast}
              </span>
            )}

            {/* Copy User App Link */}
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/`, 'User App Link Copied! Share with earners.')}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
              title="Copy User App link to share with users"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">User App Link</span>
              <span className="sm:hidden">App Link</span>
            </button>

            {/* Copy Admin Link */}
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/#admin`, 'Admin Panel Link Copied! (Password: A829860k)')}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-600/50 text-rose-200 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
              title="Copy Direct Link to this Admin Panel"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Admin Link</span>
              <span className="sm:hidden">Admin</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Refresh Realtime Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
              <span className="hidden md:inline">Refresh Data</span>
            </button>

            {/* AI Social Promo Video Button */}
            <button
              onClick={() => setShowSocialVideoModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-95 animate-pulse"
              title="Create and Download AI Promo Video (Reels / Shorts / WhatsApp Status)"
            >
              <Video className="w-4 h-4 text-pink-200" />
              <span>AI Promo Video</span>
            </button>

            {/* Back to User Mobile App Button */}
            <button
              onClick={() => {
                setActiveTab('home');
                window.location.hash = '/app';
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open User App</span>
            </button>

            {/* Lock Admin Portal Button */}
            <button
              onClick={handleLockPortal}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-600/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Lock Admin Portal Session"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Lock</span>
            </button>

            {/* Admin Avatar */}
            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black text-xs flex items-center justify-center">
                AK
              </div>
              <div className="text-left text-xs">
                <div className="font-bold text-slate-200">{user?.name || 'Ankush Kumar'}</div>
                <div className="text-[10px] text-rose-400 font-semibold">Master Admin</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN PORTAL BODY ================= */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto p-4 lg:p-6 gap-6">
        {/* ================= SIDEBAR NAVIGATION ================= */}
        <aside className="w-full lg:w-64 shrink-0 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-3 shadow-xl backdrop-blur-md flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5">
          <div className="hidden lg:block px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Control Center
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'overview'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & KPIs</span>
          </button>

          <button
            onClick={() => setActiveSection('app_controls')}
            className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'app_controls'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-300" />
            <span>App Features Control</span>
          </button>

          <button
            onClick={() => setActiveSection('withdrawals')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'withdrawals'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Withdrawals Queue</span>
            </div>
            {pendingWithdrawals.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSection === 'withdrawals' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {pendingWithdrawals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('submissions')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'submissions'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <FileCheck className="w-4 h-4" />
              <span>Task Approvals</span>
            </div>
            {pendingSubmissions.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSection === 'submissions' ? 'bg-white text-rose-600' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {pendingSubmissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('users')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'users'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Users className="w-4 h-4" />
              <span>User Directory</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeSection === 'users' ? 'bg-white text-rose-600' : 'bg-slate-800 text-slate-400'
            }`}>
              {realUsersOnly.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('tasks')}
            className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'tasks'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tasks Marketplace</span>
          </button>

          <button
            onClick={() => setActiveSection('security')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'security'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Anti-Cheat & Security</span>
            </div>
            {flaggedAccounts.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSection === 'security' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {flaggedAccounts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('referrals')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'referrals'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Gift className="w-4 h-4 text-purple-400" />
              <span>Referral Program</span>
            </div>
            {referralsData && referralsData.stats && (referralsData.stats.pendingReferrals > 0 || referralsData.stats.rewardEligibleReferrals > 0) ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSection === 'referrals' ? 'bg-white text-rose-600' : 'bg-purple-500/20 text-purple-300'
              }`}>
                {referralsData.stats.pendingReferrals + referralsData.stats.rewardEligibleReferrals}
              </span>
            ) : null}
          </button>

          <div className="hidden lg:block my-2 border-t border-slate-800/80" />

          <button
            onClick={() => setActiveSection('broadcast')}
            className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'broadcast'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Broadcast Notice</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeSection === 'settings'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System Settings</span>
          </button>
        </aside>

        {/* ================= MAIN CONTENT VIEWPORT ================= */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* ================= 1. OVERVIEW & KPIS ================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Dual Portals Links: User App Link + Master Admin Link */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. USER APP LINK (Public Earning App for Users) */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/70 border border-indigo-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          User App Ka Link (Public App)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400">All Earners</span>
                    </div>

                    <h3 className="text-base font-black text-white flex items-center space-x-2">
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                      <span>User Mobile Earning App Link</span>
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Yeh link apne users, friends aur WhatsApp / Telegram channels par share karein taaki log register kar ke paise kama sakein.
                    </p>

                    <div className="pt-1">
                      <code className="text-xs font-mono bg-slate-950/90 px-3 py-2 rounded-xl border border-indigo-800/60 text-indigo-200 select-all block break-all font-semibold">
                        {`${window.location.origin}/`}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-indigo-900/40">
                    <button
                      onClick={() =>
                        copyToClipboard(`${window.location.origin}/`, 'User App Link copied to clipboard!')
                      }
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Copy User App Link</span>
                    </button>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `🎁 Join *Free Earn* App & Earn Daily Cash Rewards!\nDaily Check-ins, Tasks, Video Ads & instant UPI payouts!\n👉 Register Now: ${window.location.origin}/`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
                    >
                      <span>Share on WhatsApp</span>
                    </a>

                    <button
                      onClick={() => {
                        setActiveTab('home');
                        window.location.hash = '/app';
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold border border-slate-700 flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open App</span>
                    </button>
                  </div>
                </div>

                {/* 2. MASTER ADMIN PANEL LINK (Owner Secret Portal) */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950/50 to-slate-900 border border-rose-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Aapka Personal Admin Panel Link
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300">
                        Password: <strong className="text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">A829860k</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-rose-400" />
                      <span>Direct Standalone Admin Portal Access</span>
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Is link ko kisi bhi device ya laptop ke browser me bookmark kar ke direct access karein. Payouts aur task verify karein.
                    </p>

                    <div className="pt-1">
                      <code className="text-xs font-mono bg-slate-950/90 px-3 py-2 rounded-xl border border-rose-800/60 text-rose-200 select-all block break-all font-semibold">
                        {`${window.location.origin}/#admin`}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-rose-900/40">
                    <button
                      onClick={() =>
                        copyToClipboard(`${window.location.origin}/#admin`, 'Personal Admin Link copied to clipboard!')
                      }
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 flex items-center space-x-1.5 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Copy Admin Link</span>
                    </button>

                    <button
                      onClick={() => setActiveSection('app_controls')}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition-colors flex items-center space-x-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>App Controls</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live User App Feature Status Matrix */}
              <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      User App Real-time Feature Controls
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveSection('app_controls')}
                    className="text-[11px] font-bold text-rose-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Granular Settings & Limits</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {/* Maintenance Mode */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    maintenanceMode ? 'bg-rose-950/80 border-rose-500/60 text-rose-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Maintenance</span>
                    <button
                      onClick={() => {
                        const next = !maintenanceMode;
                        setMaintenanceMode(next);
                        handleQuickToggle('maintenanceMode', next, 'App Maintenance Mode');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        maintenanceMode ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {maintenanceMode ? 'ON (Locked)' : 'OFF (Live)'}
                    </button>
                  </div>

                  {/* Daily Check-In */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    dailyCheckInEnabled ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Daily Streak</span>
                    <button
                      onClick={() => {
                        const next = !dailyCheckInEnabled;
                        setDailyCheckInEnabled(next);
                        handleQuickToggle('dailyCheckInEnabled', next, 'Daily Check-In Streak');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        dailyCheckInEnabled ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {dailyCheckInEnabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Daily Mystery Bonus */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    dailyBonusEnabled ? 'bg-purple-950/60 border-purple-500/40 text-purple-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Daily Bonus</span>
                    <button
                      onClick={() => {
                        const next = !dailyBonusEnabled;
                        setDailyBonusEnabled(next);
                        handleQuickToggle('dailyBonusEnabled', next, 'Daily Mystery Bonus');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        dailyBonusEnabled ? 'bg-purple-500/30 text-purple-300 border-purple-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {dailyBonusEnabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Video Ads */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    videoAdsEnabled ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Video Ads</span>
                    <button
                      onClick={() => {
                        const next = !videoAdsEnabled;
                        setVideoAdsEnabled(next);
                        handleQuickToggle('videoAdsEnabled', next, 'Rewarded Video Ads');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        videoAdsEnabled ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {videoAdsEnabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Tasks Marketplace */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    tasksEnabled ? 'bg-blue-950/60 border-blue-500/40 text-blue-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Tasks</span>
                    <button
                      onClick={() => {
                        const next = !tasksEnabled;
                        setTasksEnabled(next);
                        handleQuickToggle('tasksEnabled', next, 'Tasks Marketplace');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        tasksEnabled ? 'bg-blue-500/30 text-blue-300 border-blue-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {tasksEnabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Referral Program */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    referralEnabled ? 'bg-pink-950/60 border-pink-500/40 text-pink-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Refer & Earn</span>
                    <button
                      onClick={() => {
                        const next = !referralEnabled;
                        setReferralEnabled(next);
                        handleQuickToggle('referralEnabled', next, 'Referral Program');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        referralEnabled ? 'bg-pink-500/30 text-pink-300 border-pink-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {referralEnabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Withdrawals */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    withdrawalsEnabled ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Withdrawals</span>
                    <button
                      onClick={() => {
                        const next = !withdrawalsEnabled;
                        setWithdrawalsEnabled(next);
                        handleQuickToggle('withdrawalsEnabled', next, 'Withdrawals Queue');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        withdrawalsEnabled ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' : 'bg-rose-800 text-white border-rose-600'
                      }`}
                    >
                      {withdrawalsEnabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Top Notice Marquee */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    homeNoticeActive ? 'bg-amber-950/60 border-amber-500/40 text-amber-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">Notice Ribbon</span>
                    <button
                      onClick={() => {
                        const next = !homeNoticeActive;
                        setHomeNoticeActive(next);
                        handleQuickToggle('homeNoticeActive', next, 'Home Marquee Notice');
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border w-fit ${
                        homeNoticeActive ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {homeNoticeActive ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Top KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">Total Registered Users</span>
                    <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{realUsersOnly.length}</div>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">Live active real users only</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">Pending Withdrawals</span>
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-300">
                    ₹{totalPendingINR.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-amber-400/80 mt-1">{pendingWithdrawals.length} payouts awaiting approval</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">Total Paid Out</span>
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    ₹{totalPaidOutINR.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-1">{paidWithdrawals.length} completed transactions</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">Active Tasks</span>
                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-indigo-300">{tasks.length}</div>
                  <p className="text-[11px] text-indigo-400/80 mt-1">{pendingSubmissions.length} proofs awaiting review</p>
                </div>
              </div>

              {/* Quick Actions & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Payouts Preview */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <ArrowDownLeft className="w-4 h-4 text-amber-400" />
                      <span>Immediate Pending Payouts</span>
                    </h3>
                    <button
                      onClick={() => setActiveSection('withdrawals')}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1"
                    >
                      <span>View All ({pendingWithdrawals.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pendingWithdrawals.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No pending withdrawal requests. All payouts are up to date! 🎉
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingWithdrawals.slice(0, 3).map((wd) => (
                        <div
                          key={wd.id}
                          className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-xs text-white">
                              {wd.method === 'upi' ? `UPI: ${wd.upiId}` : `A/C: ${wd.bankAccountNumber}`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              UID: {wd.userId.slice(0, 16)} • {new Date(wd.requestedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-amber-400">
                              ₹{wd.amountCurrency.toFixed(2)}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedWdForUtr(wd);
                                setActiveSection('withdrawals');
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Diagnostics & Firebase Health */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-4">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>System Configuration & Database Status</span>
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-400">Firebase Realtime DB</span>
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Connected (asia-southeast1)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-400">Cloud Firestore Ledger</span>
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active (free-earn-cd0ea)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-400">Min Withdrawal Threshold</span>
                        <span className="text-white font-bold">
                          {settings.minWithdrawalCoins} Coins (₹{(settings.minWithdrawalCoins / 100).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-[11px] text-slate-500">Free Earn Master Admin Engine v2.5</span>
                    <button
                      onClick={() => setActiveSection('settings')}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Manage Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= APP FEATURES CONTROL CENTER ================= */}
          {activeSection === 'app_controls' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    <span>User App Features Master Control</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    User app ke har ek function (Check-in, Bonus, Ads, Tasks, Referrals, Withdrawals, Maintenance) par 100% control
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSaveSettings()}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all hover:scale-105"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              {/* Grid of All Functions Control Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Maintenance Mode */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${maintenanceMode ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">App Maintenance Mode</h4>
                        <p className="text-[11px] text-slate-400">Lock user app while keeping admin portal active</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        maintenanceMode
                          ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {maintenanceMode ? 'Active (Locked)' : 'Disabled (Live)'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Maintenance Notice Message
                    </label>
                    <textarea
                      rows={2}
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Free Earn is currently undergoing scheduled optimization..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* 2. Daily Check-In & Streak */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${dailyCheckInEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Daily Check-In & 7-Day Streak</h4>
                        <p className="text-[11px] text-slate-400">7 din ka consecutive check-in streak reward system</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDailyCheckInEnabled(!dailyCheckInEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        dailyCheckInEnabled
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {dailyCheckInEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-2">
                      Streak Day 1 to Day 7 Coin Rewards
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {checkInRewardsList.map((reward, idx) => (
                        <div key={idx} className="text-center">
                          <span className="text-[9px] font-bold text-slate-400 block mb-1">D{idx + 1}</span>
                          <input
                            type="number"
                            value={reward}
                            onChange={(e) => {
                              const updated = [...checkInRewardsList];
                              updated[idx] = Number(e.target.value) || 0;
                              setCheckInRewardsList(updated);
                            }}
                            className="w-full px-1 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Lucky Mystery Bonus */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${dailyBonusEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Lucky Mystery Bonus (Daily Login)</h4>
                        <p className="text-[11px] text-slate-400">Din me ek bar claim hone wala random/fixed reward</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDailyBonusEnabled(!dailyBonusEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        dailyBonusEnabled
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {dailyBonusEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Standard Coins</label>
                      <input
                        type="number"
                        value={dailyBonus}
                        onChange={(e) => setDailyBonus(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Min Coins Range</label>
                      <input
                        type="number"
                        value={dailyBonusMinCoins}
                        onChange={(e) => setDailyBonusMinCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Max Coins Range</label>
                      <input
                        type="number"
                        value={dailyBonusMaxCoins}
                        onChange={(e) => setDailyBonusMaxCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Rewarded Video Ads */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${videoAdsEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Rewarded Video Ads (AdMob)</h4>
                        <p className="text-[11px] text-slate-400">Video ads dekh kar coins kamane ka system</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setVideoAdsEnabled(!videoAdsEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        videoAdsEnabled
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {videoAdsEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Coins Per Ad</label>
                      <input
                        type="number"
                        value={adReward}
                        onChange={(e) => setAdReward(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Daily Ad Limit</label>
                      <input
                        type="number"
                        value={dailyAdCap}
                        onChange={(e) => setDailyAdCap(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Cooldown (Sec)</label>
                      <input
                        type="number"
                        value={adCooldownSeconds}
                        onChange={(e) => setAdCooldownSeconds(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Tasks & Offers Marketplace */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${tasksEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Tasks Marketplace System</h4>
                        <p className="text-[11px] text-slate-400">User app me partner app tasks aur offers show karna</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setTasksEnabled(!tasksEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        tasksEnabled
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {tasksEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300">Total Catalog Tasks: <strong className="text-white">{tasks.length}</strong></span>
                    <button
                      onClick={() => setActiveSection('tasks')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1"
                    >
                      <span>Manage Tasks Catalog</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 6. Referral & Team System */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${referralEnabled ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Refer & Earn Program</h4>
                        <p className="text-[11px] text-slate-400">Referral code sharing aur invitation bonus</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setReferralEnabled(!referralEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        referralEnabled
                          ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {referralEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Inviter Reward (Coins)</label>
                      <input
                        type="number"
                        value={refCoins}
                        onChange={(e) => setRefCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-pink-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Invitee / Join Bonus (Coins)</label>
                      <input
                        type="number"
                        value={joinBonusCoins}
                        onChange={(e) => setJoinBonusCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-emerald-300"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Withdrawals & Limits */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${withdrawalsEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Withdrawals & Payout System</h4>
                        <p className="text-[11px] text-slate-400">Users ko payout request submit karne dena ya temporarily pause karna</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setWithdrawalsEnabled(!withdrawalsEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        withdrawalsEnabled
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                          : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                      }`}
                    >
                      {withdrawalsEnabled ? 'Withdrawals Active (ON)' : 'Withdrawals Paused (OFF)'}
                    </button>
                  </div>

                  {!withdrawalsEnabled && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Pause Message Shown To Users
                      </label>
                      <input
                        type="text"
                        value={withdrawalsDisabledReason}
                        onChange={(e) => setWithdrawalsDisabledReason(e.target.value)}
                        placeholder="Withdrawals are temporarily paused for banking reconciliation..."
                        className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Min Withdrawal Coins</label>
                      <input
                        type="number"
                        value={minWdCoins}
                        onChange={(e) => setMinWdCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        ₹{(minWdCoins / (coinRatio || 100)).toFixed(2)} threshold
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Coin to Rupee Ratio</label>
                      <input
                        type="number"
                        value={coinRatio}
                        onChange={(e) => setCoinRatio(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        {coinRatio} Coins = ₹1.00
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Supported Methods</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(['upi', 'bank', 'paytm', 'phonepe'] as const).map((method) => {
                          const isAllowed = allowedMethods.includes(method);
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => {
                                if (isAllowed) {
                                  if (allowedMethods.length > 1) {
                                    setAllowedMethods(allowedMethods.filter((m) => m !== method));
                                  }
                                } else {
                                  setAllowedMethods([...allowedMethods, method]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                                isAllowed
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-950 text-slate-500 border-slate-800'
                              }`}
                            >
                              {method === 'upi' ? 'UPI' : method === 'bank' ? 'Bank IMPS' : method}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. Home Marquee Notice Ribbon */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-2xl ${homeNoticeActive ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Home Marquee Notice Bar</h4>
                        <p className="text-[11px] text-slate-400">User app ke top par urgent alert ribbon dikhana</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setHomeNoticeActive(!homeNoticeActive)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        homeNoticeActive
                          ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {homeNoticeActive ? 'Visible (ON)' : 'Hidden (OFF)'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Notice Ribbon Text</label>
                    <input
                      type="text"
                      value={homeNoticeText}
                      onChange={(e) => setHomeNoticeText(e.target.value)}
                      placeholder="⚡ All UPI payouts are processing within 2 hours today! Complete tasks to earn extra bonus."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 9. Support Channels */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Customer Support Contacts</h4>
                        <p className="text-[11px] text-slate-400">Users ko Help screen par dikhne wale contact details</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">WhatsApp Support Number</label>
                      <input
                        type="text"
                        value={supportWhatsapp}
                        onChange={(e) => setSupportWhatsapp(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Support Email Address</label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 10. Official Telegram Channel & Mandatory Modal */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Official Telegram Community Modal</h4>
                        <p className="text-[11px] text-slate-400">App khulte hi samne dikhne wala mandatory join popup</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTelegramMandatoryJoin(!telegramMandatoryJoin)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        telegramMandatoryJoin
                          ? 'bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {telegramMandatoryJoin ? 'Mandatory (ON)' : 'Optional (OFF)'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        Telegram Channel Link
                      </label>
                      <input
                        type="url"
                        value={telegramChannelUrl}
                        onChange={(e) => setTelegramChannelUrl(e.target.value)}
                        placeholder="https://t.me/+gUbcV1SSrDQzMDNl"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        {telegramMandatoryJoin ? '⚡ Users ko pehle join hona padega' : 'ℹ️ Users skip kar sakte hain'}
                      </span>
                      <a
                        href={telegramChannelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-sky-950 border border-sky-800 text-sky-300 hover:text-white text-xs font-bold flex items-center space-x-1"
                      >
                        <span>Open Channel</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 11. Full-Screen Page Open Ads (AdMob Interstitial) */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Har Page Open Par Full-Screen AdMob Ads</h4>
                        <p className="text-[11px] text-slate-400">Home, Earn, Wallet, Team, Profile par 5-sec video ad</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPageAdsEnabled(!pageAdsEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
                        pageAdsEnabled
                          ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {pageAdsEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        Reward Coins (Fix 5 Coins)
                      </label>
                      <input
                        type="number"
                        value={pageAdReward}
                        onChange={(e) => setPageAdReward(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-emerald-400 mt-0.5 block">5 Coins Fixed</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        Skip Timer (Seconds)
                      </label>
                      <input
                        type="number"
                        value={pageAdSkipSeconds}
                        onChange={(e) => setPageAdSkipSeconds(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 5s duration</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Save Bar */}
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-2xl">
                <span className="text-xs text-slate-400">
                  Settings ko save karne par user app turant real-time update ho jayega.
                </span>
                <button
                  onClick={() => handleSaveSettings()}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all hover:scale-105"
                >
                  <Check className="w-4 h-4" />
                  <span>Save All Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= 2. WITHDRAWALS MANAGEMENT ================= */}
          {activeSection === 'withdrawals' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div>
                  <h2 className="text-base font-black text-white flex items-center space-x-2">
                    <ArrowDownLeft className="w-5 h-5 text-rose-400" />
                    <span>Withdrawals & Payout Processing</span>
                  </h2>
                  <p className="text-xs text-slate-400">Process user payout requests via UPI or Bank IMPS/NEFT</p>
                </div>

                <div className="flex items-center space-x-2">
                  {(['all', 'pending', 'paid', 'rejected'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setWdStatusFilter(tab)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                        wdStatusFilter === tab
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredWithdrawals.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/50">
                  <ArrowDownLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No withdrawal requests found for filter: {wdStatusFilter}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredWithdrawals.map((wd) => (
                    <div
                      key={wd.id}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              wd.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : wd.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {wd.status}
                          </span>
                          <span className="text-xs font-black text-white">
                            {wd.method.toUpperCase()} Transfer
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(wd.requestedAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-200">
                          {wd.method === 'upi' ? (
                            <span>UPI ID: <span className="text-emerald-400 select-all">{wd.upiId}</span></span>
                          ) : (
                            <span>
                              A/C: <span className="text-emerald-400 select-all">{wd.bankAccountNumber}</span> • IFSC: <span className="text-emerald-400 select-all">{wd.bankIfsc}</span> ({wd.bankAccountName})
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          User ID: <span className="text-slate-300 font-mono">{wd.userId}</span>
                          {wd.txnHash && (
                            <span className="ml-2 text-emerald-400">UTR: {wd.txnHash}</span>
                          )}
                          {wd.rejectionReason && (
                            <span className="ml-2 text-rose-400">Reason: {wd.rejectionReason}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                        <div className="text-right">
                          <div className="text-lg font-black text-emerald-400">
                            ₹{wd.amountCurrency.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            {wd.amountCoins.toLocaleString()} Coins
                          </div>
                        </div>

                        {wd.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedWdForUtr(wd);
                                setUtrNumber(`UTR${Date.now().toString().slice(-8)}`);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setShowRejectModal(wd)}
                              className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs transition-colors flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= 3. TASK APPROVALS ================= */}
          {activeSection === 'submissions' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div>
                  <h2 className="text-base font-black text-white flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-indigo-400" />
                    <span>Task Proof Submissions & Verification</span>
                  </h2>
                  <p className="text-xs text-slate-400">Review screenshots, app install links, and survey proofs submitted by users</p>
                </div>

                <div className="flex items-center space-x-2">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSubmissionFilter(tab)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                        submissionFilter === tab
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/50">
                  <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No submissions found for filter: {submissionFilter}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              sub.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : sub.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {sub.status}
                          </span>
                          <span className="text-xs font-black text-white">
                            Task: {sub.taskTitle}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300">
                          Proof Link:{' '}
                          <a
                            href={sub.proofLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline font-mono inline-flex items-center space-x-1"
                          >
                            <span>{sub.proofLink}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {sub.proofNotes && (
                          <div className="text-xs text-slate-400 italic">
                            "Notes: {sub.proofNotes}"
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500">
                          Submitted by: {sub.userName} (UID: {sub.userId.slice(0, 16)}) • {new Date(sub.submittedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                        <div className="text-right">
                          <div className="text-base font-black text-amber-300">
                            +{sub.rewardCoins} Coins
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            ₹{(sub.rewardCoins / 100).toFixed(2)}
                          </div>
                        </div>

                        {sub.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => adminApproveTask(sub, 'Approved by admin')}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => adminRejectTask(sub, 'Invalid proof or screenshot not verified')}
                              className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs transition-colors flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= 4. REAL USER DIRECTORY & MANAGEMENT ================= */}
          {activeSection === 'users' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white flex items-center space-x-2">
                        <span>Real Registered Users ({realUsersOnly.length})</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          100% Real Only
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Live registered accounts only. Mock & demo users have been permanently removed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search real user by name, phone, email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setAddUserError('');
                      setShowAddRealUserModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all whitespace-nowrap active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Real User</span>
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards for Real Users */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400">Total Real Users</div>
                  <div className="text-xl font-black text-white mt-1">{realUsersOnly.length}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Verified Accounts</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400">Active Earners</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {realUsersOnly.filter((u) => !u.isBlocked).length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Unrestricted</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400">Co-Admins</div>
                  <div className="text-xl font-black text-rose-400 mt-1">
                    {realUsersOnly.filter((u) => u.isAdmin).length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Admin Access</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400">Total Wallet Pool</div>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    ₹{(realUsersOnly.reduce((acc, u) => acc + (u.coins || 0), 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {realUsersOnly.reduce((acc, u) => acc + (u.coins || 0), 0).toLocaleString()} Coins
                  </div>
                </div>
              </div>

              {/* User List */}
              <div className="grid grid-cols-1 gap-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white">No real users found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {userSearch
                        ? 'No user matches your search query. Try searching by phone or name.'
                        : 'No real users have been registered yet. Click below to add the first real user.'}
                    </p>
                    <button
                      onClick={() => setShowAddRealUserModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md inline-flex items-center space-x-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Real User</span>
                    </button>
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.uid}
                      className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-start sm:items-center space-x-3.5">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-950 to-slate-800 border border-emerald-500/30 flex items-center justify-center font-black text-sm text-emerald-300 shadow-md">
                            {(u.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                            u.isBlocked ? 'bg-rose-500' : 'bg-emerald-500'
                          }`} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-sm text-white">{u.name}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Real User</span>
                            </span>
                            {u.isAdmin && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                Admin
                              </span>
                            )}
                            {u.isBlocked && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-900/50 text-rose-300 border border-rose-700">
                                Blocked
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700/50">
                              {u.level || 'Bronze'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            {u.mobile ? (
                              <span className="flex items-center space-x-1 text-slate-300 font-mono">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{u.mobile}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">No mobile</span>
                            )}

                            {u.email && (
                              <span className="flex items-center space-x-1 text-slate-300">
                                <Mail className="w-3 h-3 text-indigo-400" />
                                <span>{u.email}</span>
                              </span>
                            )}

                            {u.referralCode && (
                              <span className="text-slate-400">
                                Ref Code: <span className="font-mono font-bold text-purple-300">{u.referralCode}</span>
                              </span>
                            )}

                            {u.createdAt && (
                              <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                        <div className="text-right">
                          <div className="text-base font-black text-amber-300">
                            {(u.coins || 0).toLocaleString()} Coins
                          </div>
                          <div className="text-xs text-emerald-400 font-semibold">
                            ₹{((u.coins || 0) / 100).toFixed(2)}
                          </div>
                          {(u.totalWithdrawn || 0) > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Withdrawn: ₹{((u.totalWithdrawn || 0) / 100).toFixed(2)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openEditUser(u)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center space-x-1 shadow-sm"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForAdjust(u);
                              setAdjustAmount(100);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 font-bold text-xs transition-colors flex items-center space-x-1 shadow-sm"
                            title="Adjust Coin Balance"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Adjust</span>
                          </button>

                          {!u.isAdmin && (
                            <button
                              onClick={() => adminToggleUserBlock(u.uid, !u.isBlocked)}
                              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                                u.isBlocked
                                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                                  : 'bg-rose-950 border-rose-800 text-rose-300 hover:bg-rose-900'
                              }`}
                              title={u.isBlocked ? 'Unblock User' : 'Block User'}
                            >
                              {u.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {!u.isAdmin && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to permanently delete user "${u.name}" (${u.mobile || u.email})?`)) {
                                  await adminDeleteUser(u.uid);
                                }
                              }}
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/60 border border-slate-700/60 hover:border-rose-700 text-slate-400 hover:text-rose-200 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= 5. TASKS MARKETPLACE MANAGER ================= */}
          {activeSection === 'tasks' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div>
                  <h2 className="text-base font-black text-white flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <span>Tasks Marketplace Catalog</span>
                  </h2>
                  <p className="text-xs text-slate-400">Add new paid tasks, adjust coin rewards, and manage links</p>
                </div>

                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Task</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          {t.category}
                        </span>
                        <span className="text-sm font-black text-amber-300">
                          +{t.rewardCoins} Coins (₹{(t.rewardCoins / 100).toFixed(2)})
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mb-1">{t.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{t.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <a
                        href={t.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline flex items-center space-x-1"
                      >
                        <span>Open Task Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors ${
                            t.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                          title="Click to toggle Active / Paused"
                        >
                          {t.status === 'active' ? '● Active' : '⏸ Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditTask(t)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-bold transition-colors flex items-center space-x-1"
                          title="Edit Task Details"
                        >
                          <Edit2 className="w-3 h-3 text-indigo-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete task "${t.title}" permanently?`)) {
                              adminDeleteTask(t.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition-colors flex items-center space-x-1"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 6. BROADCAST ANNOUNCEMENTS ================= */}
          {activeSection === 'broadcast' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-base font-black text-white flex items-center space-x-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  <span>Broadcast System Announcement</span>
                </h2>
                <p className="text-xs text-slate-400">Post notifications and alerts to all registered user dashboards</p>
              </div>

              <form onSubmit={handlePostAnnouncement} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Announcement Headline
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹50 Instant Bonus Code Active!"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Announcement Message Body
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter message visible to all earners..."
                    value={annMsg}
                    onChange={(e) => setAnnMsg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Badge Tag
                  </label>
                  <select
                    value={annBadge}
                    onChange={(e) => setAnnBadge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Update">Update</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Important">Important</option>
                    <option value="Contest">Contest</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition-all"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Broadcast to All Users</span>
                </button>
              </form>

              {/* Active Announcements List */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white">Active Live Announcements ({announcements.length})</h3>
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {a.badge}
                          </span>
                          <span className="font-bold text-xs text-white">{a.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{a.message}</p>
                      </div>
                      <button
                        onClick={() => adminDeleteAnnouncement(a.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= 7. SYSTEM SETTINGS ================= */}
          {activeSection === 'settings' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-base font-black text-white flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-rose-400" />
                  <span>Global App Configuration</span>
                </h2>
                <p className="text-xs text-slate-400">Configure global economics, coin payout ratios, and daily limits</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Min Withdrawal (Coins)
                    </label>
                    <input
                      type="number"
                      value={minWdCoins}
                      onChange={(e) => setMinWdCoins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-slate-500">₹{(minWdCoins / (coinRatio || 100)).toFixed(2)} threshold</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Coin to Rupee Ratio (Coins per ₹1)
                    </label>
                    <input
                      type="number"
                      value={coinRatio}
                      onChange={(e) => setCoinRatio(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-slate-500">Standard: 100 coins = ₹1</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Referral Inviter Reward (Coins)
                    </label>
                    <input
                      type="number"
                      value={refCoins}
                      onChange={(e) => setRefCoins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Referral Invitee Bonus (Coins)
                    </label>
                    <input
                      type="number"
                      value={joinBonusCoins}
                      onChange={(e) => setJoinBonusCoins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Rewarded Video Ad Coins
                    </label>
                    <input
                      type="number"
                      value={adReward}
                      onChange={(e) => setAdReward(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-indigo-300 focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-emerald-400">Fixed 5 Coins recommended</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Page Open Ad Coins
                    </label>
                    <input
                      type="number"
                      value={pageAdReward}
                      onChange={(e) => setPageAdReward(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-emerald-400">Fixed 5 Coins per page open</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Daily Ad Watch Limit
                    </label>
                    <input
                      type="number"
                      value={dailyAdCap}
                      onChange={(e) => setDailyAdCap(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Daily Mystery Bonus (Coins)
                    </label>
                    <input
                      type="number"
                      value={dailyBonus}
                      onChange={(e) => setDailyBonus(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Official Telegram Channel Link (Mandatory Join Modal)
                    </label>
                    <input
                      type="url"
                      value={telegramChannelUrl}
                      onChange={(e) => setTelegramChannelUrl(e.target.value)}
                      placeholder="https://t.me/+gUbcV1SSrDQzMDNl"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      App open hone par user ko iss channel me join hone ka mandatory popup display hota hai.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Support WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={supportWhatsapp}
                      onChange={(e) => setSupportWhatsapp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Support Email Address
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Google AdMob Ad Network Credentials */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      <h4 className="font-bold text-xs text-amber-200">Google AdMob (Abdom) Ads Credentials</h4>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Ad Network Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Apna Google AdMob account ka App ID aur Rewarded Ad Unit ID yahan darj karein ya update karein.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Google AdMob App ID
                      </label>
                      <input
                        type="text"
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                        value={admobAppId}
                        onChange={(e) => setAdmobAppId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        AdMob Rewarded Video Unit ID
                      </label>
                      <input
                        type="text"
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                        value={admobRewardedUnitId}
                        onChange={(e) => setAdmobRewardedUnitId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        AdMob Banner Ad Unit ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                        value={admobBannerUnitId}
                        onChange={(e) => setAdmobBannerUnitId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Page Open Ads Feature Status */}
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Har Page Open Hone Par AdMob Ads</span>
                        </div>
                        <p className="text-[10px] text-emerald-300/80 mt-0.5">
                          User jab bhi koi page (Home, Earn, Wallet, Team, Profile) open karta hai, aapka AdMob ad play hota hai.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40 shrink-0">
                        Active 100%
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Configuration & AdMob IDs</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= 8. ANTI-CHEAT & PRODUCTION SECURITY HUB ================= */}
          {activeSection === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header & Status Indicator */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-rose-600/30">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center space-x-2">
                      <span>Anti-Cheat & Security Command Hub</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Active & Enforcing
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Multi-account detection, replay attack prevention, and server-side reward validation
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadSecurityData}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors shadow-sm self-start md:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {/* KPI Security Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">Flagged Accounts</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-rose-400">{flaggedAccounts.length}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Pending compliance review</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">Security Incidents (Logs)</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-300">{securityEvents.length}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Replays & timing checks intercepted</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">Max Device Accounts</span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-indigo-300">
                    {securityConfig.maxAccountsPerDevice} per Device
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Hardware concurrency & canvas check</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">Min Ad Watch Duration</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {securityConfig.minAdDurationSeconds}s Minimum
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Blocks impossible client skips</p>
                </div>
              </div>

              {/* Sub-Tabs: 1-Phone-1-Account / Flagged Accounts / Security Events / Configuration / Audit Logs */}
              <div className="flex border-b border-slate-800 text-xs font-bold space-x-2 overflow-x-auto">
                <button
                  onClick={() => setSecurityTab('devices')}
                  className={`pb-3 px-3 transition-colors flex items-center space-x-1.5 border-b-2 shrink-0 ${
                    securityTab === 'devices'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>1-Phone-1-Account ({registeredDevices.length})</span>
                </button>

                <button
                  onClick={() => setSecurityTab('flagged')}
                  className={`pb-3 px-3 transition-colors flex items-center space-x-1.5 border-b-2 shrink-0 ${
                    securityTab === 'flagged'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flagged Accounts ({flaggedAccounts.length})</span>
                </button>

                <button
                  onClick={() => setSecurityTab('events')}
                  className={`pb-3 px-3 transition-colors flex items-center space-x-1.5 border-b-2 shrink-0 ${
                    securityTab === 'events'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Incident Stream ({securityEvents.length})</span>
                </button>

                <button
                  onClick={() => setSecurityTab('config')}
                  className={`pb-3 px-3 transition-colors flex items-center space-x-1.5 border-b-2 shrink-0 ${
                    securityTab === 'config'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Anti-Cheat Config</span>
                </button>

                <button
                  onClick={() => setSecurityTab('audit')}
                  className={`pb-3 px-3 transition-colors flex items-center space-x-1.5 border-b-2 shrink-0 ${
                    securityTab === 'audit'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Admin Audit Log</span>
                </button>
              </div>

              {/* Sub-Tab 0: 1-Phone-1-Account Security & Replaced Phone Verification (Requirement 14) */}
              {securityTab === 'devices' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-900/40">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Registered Physical Devices
                      </span>
                      <div className="text-2xl font-black text-indigo-400">{registeredDevices.length}</div>
                      <p className="text-[10px] text-slate-500 mt-1">1 Account per device strictly enforced</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/40">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Registered Mobile Numbers
                      </span>
                      <div className="text-2xl font-black text-emerald-400">{registeredPhones.length}</div>
                      <p className="text-[10px] text-slate-500 mt-1">1 Account per mobile number enforced</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-900/40">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Pending Phone Replacement Appeals
                      </span>
                      <div className="text-2xl font-black text-amber-400">
                        {deviceAppealsList.filter((a) => a.status === 'pending').length}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Legitimate replaced phone verification</p>
                    </div>
                  </div>

                  {/* Pending Appeals Section */}
                  {deviceAppealsList.filter((a) => a.status === 'pending').length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pending Phone Replacement Appeals ({deviceAppealsList.filter((a) => a.status === 'pending').length})</span>
                      </h4>

                      <div className="space-y-2">
                        {deviceAppealsList
                          .filter((a) => a.status === 'pending')
                          .map((appeal) => (
                            <div
                              key={appeal.id}
                              className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-white">{appeal.name}</span>
                                  <span className="font-mono text-indigo-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-indigo-800">
                                    +91 {appeal.mobile}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(appeal.submittedAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-amber-200">
                                  <strong>Reason: </strong>"{appeal.reason}"
                                </div>
                              </div>

                              <button
                                onClick={() => handleAdminUnlockDevice(appeal.deviceHash, appeal.mobile, appeal.id)}
                                disabled={unlockActionLoading}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center space-x-1.5 self-start md:self-auto shrink-0"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approve Phone Replacement & Unlock</span>
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Devices Ledger */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Registered Physical Device Ledger</span>
                    </h4>

                    {registeredDevices.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/50 text-xs">
                        No registered devices recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-3">User & Mobile</th>
                              <th className="p-3">Device Signature</th>
                              <th className="p-3">Registered Date</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Admin Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-medium">
                            {registeredDevices.map((dev) => (
                              <tr key={dev.deviceHash} className="hover:bg-slate-850/50 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-white">{dev.userName || 'Verified User'}</div>
                                  <div className="text-[11px] text-indigo-400 font-mono">
                                    {dev.userMobile ? `+91 ${dev.userMobile}` : dev.userId}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate block max-w-[180px]">
                                    {dev.deviceHash}
                                  </span>
                                </td>
                                <td className="p-3 text-[11px] text-slate-400">
                                  {new Date(dev.registeredAt).toLocaleDateString()}
                                </td>
                                <td className="p-3">
                                  {dev.isUnlockedByAdmin ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      Unlocked (Phone Replaced)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      Bound (1-to-1)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleAdminUnlockDevice(dev.deviceHash, dev.userMobile)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors inline-flex items-center space-x-1"
                                  >
                                    <Unlock className="w-3 h-3 text-amber-400" />
                                    <span>{dev.isUnlockedByAdmin ? 'Update Authorization' : 'Unlock Device'}</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 1: Flagged Accounts Review Table */}
              {securityTab === 'flagged' && (
                <div className="space-y-4">
                  {flaggedAccounts.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/50">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400/50" />
                      <p className="text-xs font-bold text-slate-300">Clean Health Status</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Zero accounts currently flagged for suspicious behavior or cheat attempts.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {flaggedAccounts.map((acc) => (
                        <div
                          key={acc.userId}
                          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  acc.riskScore >= 80
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                Risk Score: {acc.riskScore}/100
                              </span>
                              <span className="text-xs font-black text-white">{acc.userName}</span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(acc.lastFlaggedAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="text-xs text-rose-300 font-medium">
                              Trigger: {acc.flaggedReason}
                            </div>

                            <div className="text-[11px] text-slate-400">
                              UID: <span className="font-mono text-slate-300">{acc.userId}</span> • Device: <span className="font-mono text-slate-300">{acc.deviceFingerprint}</span>
                            </div>

                            {acc.appealMessage && (
                              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 mt-2">
                                <span className="font-bold">User Appeal: </span>"{acc.appealMessage}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                            <button
                              onClick={async () => {
                                await resolveSecurityFlag(user?.email || 'admin@freeearn.app', acc.userId, 'clear', 'Cleared by admin');
                                await loadSecurityData();
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Clear Flag</span>
                            </button>

                            <button
                              onClick={async () => {
                                await resolveSecurityFlag(user?.email || 'admin@freeearn.app', acc.userId, 'restrict', 'Restricted by admin due to cheat violation');
                                await loadSecurityData();
                              }}
                              className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs transition-colors flex items-center space-x-1"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Restrict</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Security Events Stream */}
              {securityTab === 'events' && (
                <div className="space-y-3">
                  {securityEvents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/50 text-xs">
                      No security incidents logged yet. Anti-cheat server is actively scanning all incoming transactions.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                      {securityEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  ev.severity === 'critical'
                                    ? 'bg-rose-600 text-white'
                                    : ev.severity === 'high'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : ev.severity === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {ev.eventType}
                              </span>
                              <span className="text-xs font-bold text-white">
                                User: {ev.userName || ev.userId.slice(0, 14)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(ev.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{ev.reason}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-rose-400">
                              +{ev.riskScoreDelta} Risk
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 3: Anti-Cheat Configuration Form */}
              {securityTab === 'config' && (
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <span>Security & Threshold Rules Configuration</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure server-side verification limits. Changes apply in realtime without server restart.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await updateAntiCheatConfig(user?.email || 'admin@freeearn.app', securityConfig);
                      await loadSecurityData();
                      alert('Anti-Cheat configurations updated successfully!');
                    }}
                    className="space-y-4 max-w-xl"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Min Ad Watch Duration (Seconds)
                        </label>
                        <input
                          type="number"
                          value={securityConfig.minAdDurationSeconds}
                          onChange={(e) =>
                            setSecurityConfig({ ...securityConfig, minAdDurationSeconds: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        />
                        <span className="text-[10px] text-slate-500">Claims faster than this are rejected</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Ad Claim Cooldown (Seconds)
                        </label>
                        <input
                          type="number"
                          value={securityConfig.adCooldownSeconds}
                          onChange={(e) =>
                            setSecurityConfig({ ...securityConfig, adCooldownSeconds: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        />
                        <span className="text-[10px] text-slate-500">Delay between consecutive ad claims</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Max Accounts per Device Fingerprint
                        </label>
                        <input
                          type="number"
                          value={securityConfig.maxAccountsPerDevice}
                          onChange={(e) =>
                            setSecurityConfig({ ...securityConfig, maxAccountsPerDevice: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        />
                        <span className="text-[10px] text-slate-500">Detects multi-account referral farming</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Daily Max Coin Earnings Cap
                        </label>
                        <input
                          type="number"
                          value={securityConfig.maxDailyCoinCap}
                          onChange={(e) =>
                            setSecurityConfig({ ...securityConfig, maxDailyCoinCap: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        />
                        <span className="text-[10px] text-slate-500">Excess earnings flagged for review</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Anti-Cheat Thresholds</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Sub-Tab 4: Admin Audit Log Table */}
              {securityTab === 'audit' && (
                <div className="space-y-3">
                  {auditLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/50 text-xs">
                      No admin actions recorded yet. All admin modifications are permanently audited.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white mr-2">{log.action}</span>
                            <span className="text-slate-400">{log.details}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= 9. REFERRAL SYSTEM MANAGEMENT HUB ================= */}
          {activeSection === 'referrals' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header & Status Indicator */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center space-x-2">
                      <span>Production Referral Engine & Attribution Hub</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Live Tracking
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Server-validated referral relationships, idempotent rewards ledger, velocity limits & anti-abuse checks.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadReferralsData}
                    disabled={referralActionLoading}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${referralActionLoading ? 'animate-spin' : ''}`} />
                    <span>Sync Referrals</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Referrals</p>
                  <p className="text-xl font-black text-white mt-1">
                    {referralsData?.stats.totalReferrals ?? 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-blue-900/40">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Verified</p>
                  <p className="text-xl font-black text-blue-300 mt-1">
                    {referralsData?.stats.verifiedReferrals ?? 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <p className="text-[10px] font-bold text-purple-400 uppercase">Pending</p>
                  <p className="text-xl font-black text-purple-300 mt-1">
                    {referralsData?.stats.pendingReferrals ?? 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-900/40">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Reward Eligible</p>
                  <p className="text-xl font-black text-amber-300 mt-1">
                    {referralsData?.stats.rewardEligibleReferrals ?? 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-900/40">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Rewarded</p>
                  <p className="text-xl font-black text-emerald-300 mt-1">
                    {referralsData?.stats.rewardedReferrals ?? 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-900/40">
                  <p className="text-[10px] font-bold text-rose-400 uppercase">Rejected</p>
                  <p className="text-xl font-black text-rose-300 mt-1">
                    {referralsData?.stats.rejectedReferrals ?? 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-900/40">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase">Total Rewards</p>
                  <p className="text-xl font-black text-amber-300 mt-1">
                    +{referralsData?.stats.totalRewardsCoins ?? 0}
                  </p>
                  <span className="text-[9px] text-slate-500 font-mono">
                    ₹{(referralsData?.stats.totalRewardsCurrency ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-teal-900/40">
                  <p className="text-[10px] font-bold text-teal-400 uppercase">Conversion Rate</p>
                  <p className="text-xl font-black text-teal-300 mt-1">
                    {referralsData?.stats.conversionRate ?? 0}%
                  </p>
                </div>
              </div>

              {/* Campaign Rules Configuration Panel */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-black text-white">Referral Campaign Rules & Reward Logic</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    campaignForm.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    Campaign {campaignForm.isActive ? 'Active (Live)' : 'Paused'}
                  </span>
                </div>

                <form onSubmit={handleSaveCampaignSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Campaign Name
                      </label>
                      <input
                        type="text"
                        value={campaignForm.name || ''}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Referrer Reward (Coins)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaignForm.referrerRewardCoins ?? 100}
                        onChange={(e) => setCampaignForm({ ...campaignForm, referrerRewardCoins: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Credited when referee completes condition
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        New Referee Bonus (Coins)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaignForm.refereeJoinBonusCoins ?? 50}
                        onChange={(e) => setCampaignForm({ ...campaignForm, refereeJoinBonusCoins: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Instant welcome bonus for new user
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Qualification Condition
                      </label>
                      <select
                        value={campaignForm.qualificationRule || 'first_task_completed'}
                        onChange={(e) => setCampaignForm({ ...campaignForm, qualificationRule: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="first_task_completed">1st Verified Task Completed</option>
                        <option value="checkin_completed">1st Daily Check-In Completed</option>
                        <option value="account_verified">Mobile Verified Registration</option>
                        <option value="instant">Instant (No activity prerequisite)</option>
                      </select>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Enforces anti-abuse: rewards only genuine users
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Reward Disbursement Mode
                      </label>
                      <select
                        value={campaignForm.rewardMode || 'auto_reward'}
                        onChange={(e) => setCampaignForm({ ...campaignForm, rewardMode: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="auto_reward">Auto-disburse (Immediate on qualification)</option>
                        <option value="manual_approval">Manual Admin Approval Required</option>
                      </select>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        High risk referrals are always held for review
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Max Rewards Per User (Cap)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaignForm.maxRewardsPerUser ?? 50}
                        onChange={(e) => setCampaignForm({ ...campaignForm, maxRewardsPerUser: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        0 = Unlimited referral rewards
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignForm.isActive !== false}
                        onChange={(e) => setCampaignForm({ ...campaignForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-950"
                      />
                      <span>Enable Referral Program Globally</span>
                    </label>

                    <button
                      type="submit"
                      disabled={referralActionLoading}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center space-x-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Campaign Rules</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Anti-Abuse & Fraud Reviews Panel */}
              {fraudReviews.length > 0 && (
                <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <h3 className="text-sm font-black text-rose-300">
                        Suspicious Referrals Requiring Review ({fraudReviews.filter(r => r.status === 'pending_review').length} Pending)
                      </h3>
                    </div>
                    <span className="text-xs text-rose-400 font-bold">Anti-Fraud Engine Alerts</span>
                  </div>

                  <div className="space-y-2">
                    {fraudReviews.map((fr) => (
                      <div
                        key={fr.id}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">Review ID: {fr.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Risk Score: {fr.riskScore}/100
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(fr.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-slate-300 text-[11px]">
                            Referrer UID: <span className="font-mono text-purple-300">{fr.referrerUserId}</span> → Referred UID: <span className="font-mono text-indigo-300">{fr.referredUserId}</span>
                          </div>
                          <div className="text-rose-400 text-[11px] font-semibold">
                            Reasons: {fr.reasons.join('; ')}
                          </div>
                        </div>

                        {fr.status === 'pending_review' ? (
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleResolveFraudReviewAction(fr.id, 'approved')}
                              disabled={referralActionLoading}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleResolveFraudReviewAction(fr.id, 'rejected')}
                              disabled={referralActionLoading}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                            >
                              Reject & Flag
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            fr.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {fr.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referrals Directory & Search/Filter */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>Referral Relationships Ledger</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Immutable referredUserId → referrerUserId records with qualification and reward states.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {(['all', 'pending', 'verified', 'reward_eligible', 'rewarded', 'rejected'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setReferralStatusFilter(st)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 capitalize ${
                          referralStatusFilter === st
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    placeholder="Search by referrer code, name, mobile, or user ID..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Referrals List Table */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {(() => {
                    const list = (referralsData?.referrals || []).filter((r) => {
                      if (referralStatusFilter !== 'all' && r.status !== referralStatusFilter) return false;
                      if (!referralSearch.trim()) return true;
                      const q = referralSearch.toLowerCase();
                      return (
                        r.referrerCode.toLowerCase().includes(q) ||
                        r.referrerName?.toLowerCase().includes(q) ||
                        r.referrerMobile?.toLowerCase().includes(q) ||
                        r.referredUserName?.toLowerCase().includes(q) ||
                        r.referredUserMobile?.toLowerCase().includes(q) ||
                        r.referrerUserId.toLowerCase().includes(q) ||
                        r.referredUserId.toLowerCase().includes(q)
                      );
                    });

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-500 text-xs rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                          No referrals matching your filters. Share referral codes to record user relationships!
                        </div>
                      );
                    }

                    return list.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-purple-300 px-2 py-0.5 rounded-lg bg-purple-950/50 border border-purple-500/30">
                              Code: {ref.referrerCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ref.status === 'rewarded'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : ref.status === 'reward_eligible'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : ref.status === 'verified'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : ref.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {ref.status.replace('_', ' ')}
                            </span>
                            {ref.fraudScore >= 60 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                ⚠️ Risk {ref.fraudScore}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">
                              Created: {new Date(ref.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Referrer (Inviter)</span>
                              <span className="font-bold text-white">{ref.referrerName || 'Member'}</span>
                              <span className="text-slate-400 font-mono block text-[10px]">
                                UID: {ref.referrerUserId.slice(0, 16)}...
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Referred User (New)</span>
                              <span className="font-bold text-white">{ref.referredUserName || 'New Earner'}</span>
                              <span className="text-slate-400 font-mono block text-[10px]">
                                {ref.referredUserMobile || ref.referredUserId.slice(0, 16)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                            <span>
                              Qualification: <strong className="text-slate-200">{ref.qualificationStatus}</strong>
                            </span>
                            <span>
                              Reward: <strong className="text-amber-300">+{ref.rewardAmountCoins} Coins</strong>
                            </span>
                            {ref.rewardTransactionId && (
                              <span className="font-mono text-emerald-400">
                                Txn: {ref.rewardTransactionId}
                              </span>
                            )}
                            {ref.rejectionReason && (
                              <span className="text-rose-400">
                                Reason: {ref.rejectionReason}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0">
                          {ref.status !== 'rewarded' && ref.status !== 'rejected' && (
                            <button
                              onClick={() => handleApproveReward(ref.id)}
                              disabled={referralActionLoading}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1"
                              title="Approve referral and immediately disburse coins to referrer ledger"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve & Credit</span>
                            </button>
                          )}

                          {ref.status !== 'rejected' && ref.status !== 'rewarded' && (
                            <button
                              onClick={() => setSelectedRefForReject(ref)}
                              disabled={referralActionLoading}
                              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-bold text-xs border border-rose-600/30 transition-all flex items-center space-x-1"
                              title="Reject referral due to anti-abuse policy"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODAL: BALANCE ADJUSTMENT ================= */}
      {selectedUserForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-white">Adjust User Balance</h3>
              <button
                onClick={() => setSelectedUserForAdjust(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              User: <span className="font-bold text-white">{selectedUserForAdjust.name}</span> (Current: {selectedUserForAdjust.coins} Coins)
            </p>

            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Coins Amount (+ to add, - to deduct)</label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compensation for survey issue"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForAdjust(null)}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                >
                  Apply Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: APPROVE WITH UTR ================= */}
      {selectedWdForUtr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-sm text-white">Approve Withdrawal & Confirm Payout</h3>
            <p className="text-xs text-slate-300">
              Amount: <span className="font-black text-emerald-400">₹{selectedWdForUtr.amountCurrency.toFixed(2)}</span> ({selectedWdForUtr.amountCoins} Coins)
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Bank Reference / UTR Number</label>
              <input
                type="text"
                required
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWdForUtr(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingWd}
                onClick={async () => {
                  if (!selectedWdForUtr) return;
                  setIsProcessingWd(true);
                  try {
                    await adminProcessWithdrawalAction(selectedWdForUtr, 'paid', utrNumber || `UTR${Date.now().toString().slice(-8)}`);
                    setCopyToast(`Withdrawal marked as PAID with UTR reference!`);
                    setTimeout(() => setCopyToast(null), 3000);
                    setSelectedWdForUtr(null);
                  } catch (err: any) {
                    alert('Error updating withdrawal: ' + (err.message || 'Unknown error'));
                  } finally {
                    setIsProcessingWd(false);
                  }
                }}
                className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1"
              >
                {isProcessingWd ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Mark Paid & Complete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT WITHDRAWAL ================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-sm text-white">Reject Withdrawal Request</h3>
            <p className="text-xs text-slate-400">Coins will be refunded to user balance.</p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Reason for Rejection</label>
              <input
                type="text"
                required
                placeholder="e.g. Invalid UPI ID / Account Number"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingWd}
                onClick={async () => {
                  if (!showRejectModal) return;
                  setIsProcessingWd(true);
                  try {
                    await adminProcessWithdrawalAction(showRejectModal, 'rejected', rejectionReason || 'Invalid details provided');
                    setCopyToast(`Withdrawal rejected & coins refunded.`);
                    setTimeout(() => setCopyToast(null), 3000);
                    setShowRejectModal(null);
                  } catch (err: any) {
                    alert('Error rejecting withdrawal: ' + (err.message || 'Unknown error'));
                  } finally {
                    setIsProcessingWd(false);
                  }
                }}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1"
              >
                {isProcessingWd ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE TASK ================= */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-white">Create New Paid Task</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Install & Sign Up on Fintech App"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Short description of what the user needs to do"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Reward (Coins)</label>
                  <input
                    type="number"
                    required
                    value={newReward}
                    onChange={(e) => setNewReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="app">App Install</option>
                    <option value="survey">Survey</option>
                    <option value="social">Social Media</option>
                    <option value="daily">Daily Task</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">External Task / App URL</label>
                <input
                  type="url"
                  placeholder="https://play.google.com/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Verification Instructions</label>
                <textarea
                  required
                  rows={3}
                  placeholder="1. Open link\n2. Complete action\n3. Submit screenshot"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                >
                  Publish Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT REFERRAL ================= */}
      {selectedRefForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-white">Reject Referral Relationship</h3>
              <button
                onClick={() => {
                  setSelectedRefForReject(null);
                  setRejectReasonInput('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Rejecting referral for code <strong className="text-purple-300 font-mono">{selectedRefForReject.referrerCode}</strong> between referrer <span className="text-white font-bold">{selectedRefForReject.referrerName || selectedRefForReject.referrerUserId}</span> and referred user <span className="text-white font-bold">{selectedRefForReject.referredUserName || selectedRefForReject.referredUserId}</span>.
            </p>

            <form onSubmit={handleRejectReferralSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Rejection Reason / Fair Play Policy Violation
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Duplicate account on same device / emulator spoofing"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRefForReject(null);
                    setRejectReasonInput('');
                  }}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={referralActionLoading}
                  className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD REAL USER ================= */}
      {showAddRealUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Add New Real User</h3>
                  <p className="text-[11px] text-slate-400">Directly register a genuine user account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddRealUserModal(false);
                  setAddUserError('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{addUserError}</span>
              </div>
            )}

            <form onSubmit={handleAddRealUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mobile Number (10 digits) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={newUserMobile}
                    onChange={(e) => setNewUserMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-12 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">User can login using this number via Mobile OTP or Password</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Address <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh.kumar@gmail.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Initial Password <span className="text-slate-500 text-[10px]">(Default: pass1234)</span>
                </label>
                <input
                  type="text"
                  placeholder="pass1234"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Initial Balance (Coins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={newUserCoins}
                    onChange={(e) => setNewUserCoins(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">
                    = ₹{(newUserCoins / 100).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Account Role</label>
                  <select
                    value={newUserIsAdmin ? 'admin' : 'user'}
                    onChange={(e) => setNewUserIsAdmin(e.target.value === 'admin')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="user">Regular Earner</option>
                    <option value="admin">Co-Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRealUserModal(false);
                    setAddUserError('');
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 transition-all"
                >
                  {addUserLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Save Real User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT TASK ================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Edit Task Details</h3>
                  <p className="text-[11px] text-slate-400">Task #{editingTask.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Task Description</label>
                <textarea
                  required
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Reward (Coins)</label>
                  <input
                    type="number"
                    required
                    value={editReward}
                    onChange={(e) => setEditReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">₹{(editReward / 100).toFixed(2)} value</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="app">App Install</option>
                    <option value="survey">Survey</option>
                    <option value="social">Social Media</option>
                    <option value="daily">Daily Task</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">External Task / App URL</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Verification Instructions / Steps</label>
                <textarea
                  rows={3}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  placeholder="Step 1...\nStep 2..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Task Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active (Visible in Marketplace)</option>
                  <option value="paused">Paused (Temporarily Hidden)</option>
                  <option value="completed">Completed (Archived)</option>
                </select>
              </div>

              <div className="flex space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Task Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT REAL USER ================= */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Edit User Profile</h3>
                  <p className="text-[11px] text-slate-400">UID: {selectedUserForEdit.uid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editUserMobile}
                  onChange={(e) => setEditUserMobile(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
                <input
                  type="text"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Set or change user password"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Wallet Coins Balance</label>
                  <input
                    type="number"
                    value={editUserCoins}
                    onChange={(e) => setEditUserCoins(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">₹{((editUserCoins || 0) / 100).toFixed(2)} INR</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Account Role</label>
                  <select
                    value={editUserIsAdmin ? 'admin' : 'user'}
                    onChange={(e) => setEditUserIsAdmin(e.target.value === 'admin')}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="user">Regular Earner</option>
                    <option value="admin">Co-Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Account Status</label>
                <select
                  value={editUserIsBlocked ? 'blocked' : 'active'}
                  onChange={(e) => setEditUserIsBlocked(e.target.value === 'blocked')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active & Unrestricted</option>
                  <option value="blocked">Blocked / Suspended</option>
                </select>
              </div>

              <div className="flex space-x-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save User Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Social Media Promo Video Studio Modal */}
      <SocialVideoCreatorModal
        isOpen={showSocialVideoModal}
        onClose={() => setShowSocialVideoModal(false)}
      />
    </div>
  );
};
