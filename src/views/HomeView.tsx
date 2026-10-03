import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PromoBannerCarousel } from '../components/PromoBannerCarousel';
import {
  Coins,
  TrendingUp,
  ArrowUpRight,
  Flame,
  Gift,
  Tv,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Clock,
  ArrowDownLeft,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';

interface HomeViewProps {
  onOpenAd: () => void;
  onOpenAuth: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenAd, onOpenAuth }) => {
  const {
    user,
    settings,
    transactions,
    announcements,
    tasks,
    submissions,
    setActiveTab,
    claimDailyCheckIn,
    claimDailyBonus,
  } = useApp();

  const [checkInLoading, setCheckInLoading] = useState(false);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const completedTodayTasks = submissions.filter((s) => s.status === 'approved').length;
  const targetDailyTasks = 5;
  const taskProgressPercent = Math.min(100, Math.round((completedTodayTasks / targetDailyTasks) * 100));

  // Calculate referral earnings from transactions
  const referralEarnings = transactions
    .filter((t) => t.type === 'referral_bonus' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amountCoins, 0);

  const handleClaimCheckIn = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setCheckInLoading(true);
    setFeedbackMsg('');
    const res = await claimDailyCheckIn();
    setCheckInLoading(false);
    setFeedbackMsg(res.message);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleClaimBonus = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setBonusLoading(true);
    const res = await claimDailyBonus();
    setBonusLoading(false);
    setFeedbackMsg(res.message);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const currentStreak = user?.consecutiveCheckIns || 0;
  const todayCheckedIn = Boolean(
    user?.lastCheckInDate && user.lastCheckInDate === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Announcements Banner */}
      {announcements.filter((a) => a.active).length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-800/40 p-3 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-pink-500/30 text-pink-300">
                  {announcements[0].badge || 'Announcement'}
                </span>
                <h4 className="text-xs font-bold text-white truncate">{announcements[0].title}</h4>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate">{announcements[0].message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Balance & Earnings Hero Card in 3D */}
      <div className="card-3d relative overflow-hidden rounded-3xl p-5 border-t border-purple-400/40 border-b border-indigo-950/80 shadow-2xl">
        {/* Ambient 3D Glow orb */}
        <div className="absolute -top-12 -right-12 w-52 h-52 bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-indigo-200 uppercase tracking-wider drop-shadow-sm">
                Total Coins Balance
              </span>
              <span className="badge-3d text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-200 border border-indigo-400/40">
                100 Coins = {settings.currencySymbol}1.00
              </span>
            </div>

            <button
              onClick={() => setActiveTab('wallet')}
              className="btn-3d btn-3d-emerald text-xs font-black text-white px-3.5 py-1.5 rounded-xl flex items-center space-x-1"
            >
              <span>Withdraw</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-baseline space-x-3">
              <div className="relative group">
                {/* 3D Animated Gold Coin with realistic embossed rim */}
                <div className="coin-3d w-11 h-11 flex items-center justify-center animate-float-3d cursor-pointer">
                  <Coins className="w-6 h-6 text-amber-950 font-black animate-spin-3d" />
                </div>
              </div>

              <div>
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                  {user ? user.coins.toLocaleString() : '0'}
                </span>
                <span className="block text-xs font-extrabold text-emerald-400 drop-shadow-sm">
                  ≈ {settings.currencySymbol}
                  {((user?.coins || 0) / settings.coinToCurrencyRatio).toFixed(2)} Available
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('earn')}
              className="btn-3d btn-3d-amber text-xs font-black text-slate-950 px-3.5 py-2 rounded-xl flex items-center space-x-1.5"
            >
              <Flame className="w-4 h-4 text-amber-950 fill-amber-950" />
              <span>Earn More</span>
            </button>
          </div>

          {/* Quick Metrics Bar with 3D Depth */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-indigo-800/40">
            <div className="bg-slate-950/70 rounded-xl p-2.5 border-t border-indigo-600/30 border-b-2 border-slate-950 shadow-md">
              <p className="text-[10px] text-slate-400 font-medium">Today’s Earnings</p>
              <p className="text-xs font-black text-white mt-0.5">
                +{user?.todayEarnings || 0} Coins
              </p>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-2.5 border-t border-purple-600/30 border-b-2 border-slate-950 shadow-md">
              <p className="text-[10px] text-slate-400 font-medium">Total Lifetime</p>
              <p className="text-xs font-black text-indigo-200 mt-0.5">
                +{user?.totalEarnings || 0} Coins
              </p>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-2.5 border-t border-emerald-600/30 border-b-2 border-slate-950 shadow-md">
              <p className="text-[10px] text-slate-400 font-medium">Available Cashout</p>
              <p className="text-xs font-black text-emerald-400 mt-0.5">
                {settings.currencySymbol}
                {((user?.coins || 0) / settings.coinToCurrencyRatio).toFixed(2)}
              </p>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-2.5 border-t border-pink-600/30 border-b-2 border-slate-950 shadow-md">
              <p className="text-[10px] text-slate-400 font-medium">Team Earnings</p>
              <p className="text-xs font-black text-purple-300 mt-0.5">
                +{referralEarnings} Coins
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg('')} className="text-indigo-300 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Interactive Promotional & Special Campaign Banners Carousel */}
      <PromoBannerCarousel onOpenAd={onOpenAd} onOpenAuth={onOpenAuth} />

      {/* Daily Check-In Streak System in 3D */}
      <div className="card-3d rounded-3xl p-4 border border-indigo-500/25">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shadow-inner">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>Daily Check-in Streak</span>
                <span className="badge-3d text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {currentStreak} Days
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Claim consecutive daily 3D coin rewards</p>
            </div>
          </div>

          <button
            onClick={handleClaimCheckIn}
            disabled={todayCheckedIn || checkInLoading}
            className={`btn-3d text-xs font-black px-4 py-2 rounded-xl transition-all ${
              todayCheckedIn
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'btn-3d-amber text-slate-950 font-black'
            }`}
          >
            {todayCheckedIn ? 'Claimed Today' : checkInLoading ? 'Claiming...' : 'Claim Today'}
          </button>
        </div>

        {/* 7-Day 3D Streak Blocks */}
        <div className="grid grid-cols-7 gap-1.5">
          {settings.checkInRewards.map((reward, idx) => {
            const dayNum = idx + 1;
            const isCompleted = dayNum <= currentStreak;
            const isTodayTarget = dayNum === currentStreak + 1 && !todayCheckedIn;

            return (
              <div
                key={dayNum}
                className={`btn-3d flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 border-b-4 border-b-emerald-800 shadow-md'
                    : isTodayTarget
                    ? 'bg-indigo-600/40 border-indigo-400 text-white ring-2 ring-indigo-500/50 border-b-4 border-b-indigo-700 scale-105 shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-950/70 border-indigo-950/80 text-slate-500 border-b-2 border-b-slate-900'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase">D{dayNum}</span>
                <div className="my-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                  ) : (
                    <div className="coin-3d w-4 h-4 mx-auto flex items-center justify-center">
                      <span className="text-[8px] font-black text-amber-950">¢</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black">+{reward}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Earning Primary Banner in 3D */}
      <div className="card-3d relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-700 to-blue-700 p-5 shadow-2xl border-t border-purple-300/40 border-b-4 border-indigo-950 text-white">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1 max-w-[70%]">
            <span className="badge-3d inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white shadow-sm">
              ⚡ Fast Track Rewards
            </span>
            <h3 className="text-base font-black tracking-tight leading-snug drop-shadow-md">
              Complete Verified Partner Tasks
            </h3>
            <p className="text-xs text-indigo-100 font-medium">
              High-paying app testing, research surveys, and engagement tasks.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('earn')}
            className="btn-3d px-4 py-2.5 rounded-2xl bg-white text-indigo-950 font-black text-xs shadow-xl border-b-4 border-slate-300 flex items-center space-x-1 shrink-0"
          >
            <span>Start Earning</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Action Grid in 3D */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Watch Ad 3D Button */}
        <button
          onClick={onOpenAd}
          className="btn-3d card-3d p-3.5 rounded-2xl bg-gradient-to-b from-indigo-950/80 to-slate-950 border-t border-indigo-500/30 border-b-4 border-b-indigo-950 text-left hover:border-indigo-400/60 transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mb-2 shadow-md shadow-indigo-600/30 group-hover:scale-110 transition-transform">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">Watch Ads</h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Sponsored Video
            </p>
          </div>
        </button>

        {/* Lucky Mystery Bonus 3D Button */}
        <button
          onClick={handleClaimBonus}
          disabled={bonusLoading}
          className="btn-3d card-3d p-3.5 rounded-2xl bg-gradient-to-b from-purple-950/80 to-slate-950 border-t border-purple-500/30 border-b-4 border-b-purple-950 text-left hover:border-purple-400/60 transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center mb-2 shadow-md shadow-purple-600/30 group-hover:scale-110 transition-transform">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">Daily Bonus</h4>
            <p className="text-[10px] text-purple-300 font-bold mt-0.5">
              +{settings.dailyBonusCoins} Coins
            </p>
          </div>
        </button>

        {/* Team Referral 3D Button */}
        <button
          onClick={() => setActiveTab('team')}
          className="btn-3d card-3d p-3.5 rounded-2xl bg-gradient-to-b from-pink-950/80 to-slate-950 border-t border-pink-500/30 border-b-4 border-b-pink-950 text-left hover:border-pink-400/60 transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center mb-2 shadow-md shadow-pink-600/30 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">Invite Team</h4>
            <p className="text-[10px] text-pink-300 font-bold mt-0.5">
              +{settings.referralRewardCoins} Coins/ref
            </p>
          </div>
        </button>
      </div>

      {/* Daily Task Progress Bar */}
      <div className="glass-card rounded-2xl p-4 border border-indigo-900/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h4 className="text-xs font-bold text-white">Daily Task Progress</h4>
          </div>
          <span className="text-xs font-bold text-indigo-300">
            {completedTodayTasks}/{targetDailyTasks} Done
          </span>
        </div>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${taskProgressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Complete 5 verified tasks daily to boost your earner level to Diamond and unlock withdrawal fee discounts.
        </p>
      </div>

      {/* Recent Transactions Feed */}
      <div className="glass-card rounded-3xl p-4 border border-indigo-900/40">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Recent Activity & Transactions</span>
          </h4>
          <button
            onClick={() => setActiveTab('wallet')}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
          >
            View All
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No transactions yet. Start daily tasks or watch ads to earn your first coins!
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 4).map((txn) => (
              <div
                key={txn.id}
                className="p-2.5 rounded-xl bg-slate-950/50 border border-indigo-950/50 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      txn.amountCoins >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {txn.amountCoins >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{txn.description}</p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(txn.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span
                    className={`text-xs font-extrabold ${
                      txn.amountCoins >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {txn.amountCoins >= 0 ? `+${txn.amountCoins}` : txn.amountCoins} Coins
                  </span>
                  <span className="text-[9px] block text-slate-400 uppercase font-medium">
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
