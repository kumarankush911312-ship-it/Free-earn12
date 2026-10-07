import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  Coins,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  DollarSign,
  Video,
} from 'lucide-react';
import { fetchUserReferralDashboard, UserReferralDashboardData } from '../services/api';

interface TeamViewProps {
  onOpenAuth: () => void;
  onOpenVideoCreator?: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ onOpenAuth, onOpenVideoCreator }) => {
  const { user, settings, transactions } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<UserReferralDashboardData | null>(null);

  // Referral Code: always permanently associated with user (format SE...)
  const referralCode = user?.referralCode || 'SE7K4P9X';
  
  // Production URL requirement: https://free-earn12.vercel.app/?ref=USER_REFERRAL_CODE
  const productionReferralLink = `https://free-earn12.vercel.app/?ref=${referralCode}`;
  const localReferralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${referralCode}`
    : productionReferralLink;

  // Fetch real referral data from backend API
  const loadReferralData = React.useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const data = await fetchUserReferralDashboard(user.uid);
      if (data && data.success) {
        setDashboardData(data);
      }
    } catch (err) {
      console.warn('Could not load live referral dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  // Fallback calculation from transactions if offline
  const referralTransactions = transactions.filter(
    (t) => (t.type === 'referral_bonus' || t.type === 'referral_reward') && t.status === 'completed'
  );

  const totalInvited = dashboardData?.stats.totalInvited ?? referralTransactions.length;
  const successfulReferrals = dashboardData?.stats.successfulReferrals ?? referralTransactions.length;
  const pendingReferrals = dashboardData?.stats.pendingReferrals ?? 0;
  const eligibleRewardsCoins = dashboardData?.stats.eligibleRewardsCoins ?? 0;
  const totalRewardCoins = dashboardData?.stats.totalRewardCoins ?? referralTransactions.reduce((acc, t) => acc + t.amountCoins, 0);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setCopyToast('Referral Code Copied!');
    setTimeout(() => {
      setCopiedCode(false);
      setCopyToast(null);
    }, 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productionReferralLink);
    setCopiedLink(true);
    setCopyToast('Referral Link Copied!');
    setTimeout(() => {
      setCopiedLink(false);
      setCopyToast(null);
    }, 2200);
  };

  // Requirement 5: Share message without misleading promises
  const shareMessageText = `Join Smart Earn using my referral link and explore the available rewards and activities:\n${productionReferralLink}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Smart Earn - Earn Smart. Earn Daily.',
          text: `Join Smart Earn using my referral link and explore the available rewards and activities:`,
          url: productionReferralLink,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const shareWhatsapp = () => {
    const text = encodeURIComponent(
      `Join Smart Earn using my referral link and explore the available rewards and activities:\n${productionReferralLink}\n\nReferral Code: ${referralCode}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(
      `Join Smart Earn using my referral link and explore the available rewards and activities:\n${productionReferralLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(productionReferralLink)}&text=${text}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rewarded':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Rewarded</span>
          </span>
        );
      case 'reward_eligible':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Award className="w-3 h-3" />
            <span>Reward Eligible</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const getQualificationRuleLabel = (rule?: string) => {
    switch (rule) {
      case 'first_task_completed':
        return 'Referee must complete at least 1 verified sponsor task';
      case 'checkin_completed':
        return 'Referee must complete their first daily check-in';
      case 'account_verified':
        return 'Referee must verify their mobile number';
      case 'instant':
        return 'Credited upon genuine verified account registration';
      default:
        return 'Referee must complete qualifying onboarding activity';
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300 max-w-lg mx-auto">
      {settings.referralEnabled === false && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>The referral program is temporarily paused for maintenance. Past referral rewards remain credited.</span>
        </div>
      )}

      {/* Copy Toast Alert */}
      {copyToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 py-2 px-4 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xl shadow-emerald-950/60 flex items-center space-x-1.5 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* =========================================================================
          HERO CARD: INVITE FRIENDS
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/90 via-indigo-900/80 to-slate-900/95 p-5 sm:p-6 border border-purple-500/30 shadow-2xl shadow-purple-950/40">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-purple-300 block">
                  Official Referral Program
                </span>
                <h3 className="text-xl font-black text-white tracking-tight">Invite Friends</h3>
              </div>
            </div>

            <button
              onClick={loadReferralData}
              disabled={isLoading}
              title="Refresh referral status"
              className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-white hover:bg-purple-900/50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-indigo-100/90 leading-relaxed">
            Invite genuine friends to Smart Earn. You earn{' '}
            <strong className="text-amber-300 font-extrabold">+{dashboardData?.campaign?.referrerRewardCoins || settings.referralRewardCoins || 100} Coins</strong>{' '}
            when your friend joins and completes the qualification condition. New members receive{' '}
            <strong className="text-emerald-300 font-extrabold">+{dashboardData?.campaign?.refereeJoinBonusCoins || settings.referralJoinBonusCoins || 50} Coins</strong>{' '}
            welcome bonus.
          </p>

          {/* MY REFERRAL CODE BOX */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/40 backdrop-blur-md flex items-center justify-between">
            <div className="pl-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                My Referral Code
              </span>
              <span className="text-xl font-black text-white tracking-widest font-mono">
                {referralCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md ${
                copiedCode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
              }`}
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* MY REFERRAL LINK BOX */}
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="overflow-hidden pl-1">
              <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block">
                My Referral Link
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate block font-mono">
                {productionReferralLink}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 transition-all ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Link</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-md shadow-pink-600/30 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* AI Promo Video Tool Card */}
          {onOpenVideoCreator && (
            <div
              onClick={onOpenVideoCreator}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/80 via-rose-950/70 to-indigo-950/80 border border-pink-500/40 cursor-pointer hover:border-pink-400 transition-all flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-pink-600 text-white shadow-md shadow-pink-600/40">
                  <Video className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center space-x-1.5">
                    <span>AI Video Maker & Downloader</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-300 font-bold">REELS</span>
                  </div>
                  <p className="text-[10px] text-pink-200/80 mt-0.5">
                    Viral 9:16 Video download karke Instagram & Shorts par post karein
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shrink-0 shadow-md"
              >
                Create
              </button>
            </div>
          )}

          {/* Native Social Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={shareWhatsapp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-md shadow-emerald-950/30"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200" />
              <span>Share on WhatsApp</span>
            </button>
            <button
              onClick={shareTelegram}
              className="py-2.5 px-3 rounded-xl bg-sky-600/90 hover:bg-sky-600 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-md shadow-sky-950/30"
            >
              <Share2 className="w-4 h-4 text-sky-200" />
              <span>Share on Telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KEY STATS CARDS: TOTAL INVITED, SUCCESSFUL, PENDING, REWARDS
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl p-3.5 bg-slate-900/80 border border-indigo-900/40 backdrop-blur-md text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Invited</p>
          <p className="text-xl font-black text-white mt-1">{totalInvited}</p>
          <span className="text-[10px] text-indigo-300 mt-0.5 block">Invited members</span>
        </div>

        <div className="rounded-2xl p-3.5 bg-slate-900/80 border border-indigo-900/40 backdrop-blur-md text-center">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Successful Referrals</p>
          <p className="text-xl font-black text-emerald-300 mt-1">{successfulReferrals}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Verified & credited</span>
        </div>

        <div className="rounded-2xl p-3.5 bg-slate-900/80 border border-indigo-900/40 backdrop-blur-md text-center">
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Pending Referrals</p>
          <p className="text-xl font-black text-purple-300 mt-1">{pendingReferrals}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Awaiting criteria</span>
        </div>

        <div className="rounded-2xl p-3.5 bg-slate-900/80 border border-indigo-900/40 backdrop-blur-md text-center">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Referral Rewards</p>
          <p className="text-xl font-black text-amber-300 mt-1">+{totalRewardCoins}</p>
          <span className="text-[10px] text-amber-400/80 mt-0.5 block">
            ₹{(totalRewardCoins / (settings.coinToCurrencyRatio || 100)).toFixed(2)} earned
          </span>
        </div>
      </div>

      {/* Eligible Rewards Highlight Banner if any */}
      {eligibleRewardsCoins > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-extrabold text-amber-300">Eligible Rewards: +{eligibleRewardsCoins} Coins</p>
              <p className="text-[11px] text-amber-200/80">Pending admin automated ledger release.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-300 font-bold text-[10px] uppercase">
            Queued
          </span>
        </div>
      )}

      {/* =========================================================================
          QUALIFICATION CONDITIONS & FAIR PLAY RULES
         ========================================================================= */}
      <div className="rounded-3xl p-5 bg-slate-900/70 border border-indigo-900/40 space-y-3.5">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            Qualification Rule & Fair Play
          </h4>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/60 border border-indigo-950/60 text-xs text-slate-300 leading-relaxed space-y-1.5">
          <p className="font-semibold text-purple-200">
            • {getQualificationRuleLabel(dashboardData?.campaign?.qualificationRule)}
          </p>
          <p className="text-[11px] text-slate-400">
            Rewards are not credited merely for opening the link. The invited friend must be a genuine user who registers, verifies their phone, and completes legitimate app activities.
          </p>
          <p className="text-[11px] text-slate-400">
            Self-referrals, emulator spoofing, and duplicate accounts on the same device violate Fair Play and will be rejected automatically.
          </p>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-indigo-900/20">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center mx-auto mb-1">
              1
            </span>
            <p className="text-[11px] font-bold text-white">Share Link</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Send invite to friends</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-indigo-900/20">
            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center mx-auto mb-1">
              2
            </span>
            <p className="text-[11px] font-bold text-white">Friend Qualifies</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Completes condition</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-indigo-900/20">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center mx-auto mb-1">
              3
            </span>
            <p className="text-[11px] font-bold text-white">Reward Credited</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Added to ledger</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REFERRAL HISTORY: REAL PRODUCTION LIST WITH MASKED IDENTIFIERS
         ========================================================================= */}
      <div className="rounded-3xl p-4 sm:p-5 bg-slate-900/70 border border-indigo-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Referral History</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-semibold">
            {dashboardData?.referrals?.length ?? referralTransactions.length} recorded
          </span>
        </div>

        {dashboardData && dashboardData.referrals && dashboardData.referrals.length > 0 ? (
          <div className="space-y-2.5">
            {dashboardData.referrals.map((ref) => (
              <div
                key={ref.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-indigo-950/80 hover:border-indigo-800/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                      {ref.referredUserName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">
                        {ref.referredUserName}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {ref.referredUserMobile}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center space-x-2 pl-9">
                    <span>Joined: {new Date(ref.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {ref.rewardedAt && (
                      <span className="text-emerald-400">
                        • Rewarded {new Date(ref.rewardedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-2.5 pl-9 sm:pl-0">
                  {getStatusBadge(ref.status)}
                  <span className="text-xs font-black text-amber-300">
                    +{ref.rewardAmountCoins} Coins
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : referralTransactions.length > 0 ? (
          <div className="space-y-2">
            {referralTransactions.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-2xl bg-slate-950/60 border border-indigo-950 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Rewarded
                  </span>
                  <span className="text-xs font-black text-amber-300">+{t.amountCoins} Coins</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-950/30 border border-dashed border-indigo-950 p-6 space-y-2">
            <Users className="w-8 h-8 mx-auto text-purple-400/50" />
            <p className="font-semibold text-slate-300">No referrals recorded yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Share your referral link with friends. When they register and complete their first verified activity, your rewards will appear here automatically!
            </p>
            <button
              onClick={handleCopyLink}
              className="mt-2 inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy My Referral Link</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
