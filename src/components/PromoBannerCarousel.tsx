import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Gift,
  Coins,
  ArrowRight,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  Tv,
  Flame,
  Award,
  BellRing,
} from 'lucide-react';

interface PromoBannerCarouselProps {
  onOpenAd?: () => void;
  onOpenAuth?: () => void;
}

interface BannerItem {
  id: string;
  category: 'FEATURED TASK' | 'APP UPDATE' | 'SPECIAL BONUS';
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  actionText: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  rewardTag?: string;
  action: () => void;
  icon: React.ReactNode;
}

export const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  onOpenAd,
  onOpenAuth,
}) => {
  const { setActiveTab, tasks, announcements, settings, user } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Build dynamic banners list combining Featured Tasks, Real App Updates, and Special Bonuses
  const banners: BannerItem[] = useMemo(() => {
    const list: BannerItem[] = [];

    // 1. Featured Top Task from real tasks catalog
    const topTask = tasks.find((t) => t.status === 'active' && t.rewardCoins >= 200) || tasks[0];
    if (topTask) {
      list.push({
        id: `task_${topTask.id}`,
        category: 'FEATURED TASK',
        badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-500/40',
        title: topTask.title,
        subtitle: `Highest Paying Mission`,
        description: topTask.description,
        actionText: 'Start This Task',
        rewardTag: `+${topTask.rewardCoins} Coins`,
        gradient: 'from-purple-950 via-indigo-950 to-slate-950',
        borderColor: 'border-amber-500/40',
        glowColor: 'bg-amber-500/15',
        action: () => setActiveTab('earn'),
        icon: (
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 blur-lg opacity-40 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 p-2.5 shadow-xl flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform">
              <Coins className="w-8 h-8 text-amber-950 font-black" />
            </div>
            <span className="absolute -top-1 -right-1 text-xs animate-bounce">🔥</span>
          </div>
        ),
      });
    }

    // 2. Real System Update / Announcement
    const activeAnn = announcements.find((a) => a.active) || announcements[0];
    if (activeAnn) {
      list.push({
        id: `ann_${activeAnn.id}`,
        category: 'APP UPDATE',
        badgeColor: 'bg-pink-500/25 text-pink-300 border-pink-500/40',
        title: activeAnn.title,
        subtitle: 'System Notice',
        description: activeAnn.message,
        actionText: 'Instant Withdraw',
        rewardTag: 'Fast Payout',
        gradient: 'from-indigo-950 via-slate-900 to-pink-950',
        borderColor: 'border-pink-500/40',
        glowColor: 'bg-pink-500/15',
        action: () => setActiveTab('wallet'),
        icon: (
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 blur-lg opacity-40 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 p-2.5 shadow-xl flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform">
              <Megaphone className="w-8 h-8 text-white font-black" />
            </div>
            <span className="absolute -bottom-1 -left-1 text-xs">⚡</span>
          </div>
        ),
      });
    }

    // 3. Special Bonus: Instant UPI & Banking Rails
    list.push({
      id: 'bonus_instant_upi',
      category: 'SPECIAL BONUS',
      badgeColor: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40',
      title: 'Instant UPI & Bank Cashouts',
      subtitle: 'Zero Hidden Fees',
      description: `Withdraw directly to Paytm, PhonePe, GPay or Bank from just ${settings.minWithdrawalCoins} Coins (${settings.currencySymbol}${(settings.minWithdrawalCoins / settings.coinToCurrencyRatio).toFixed(2)}).`,
      actionText: 'Open Wallet',
      rewardTag: '100 Coins = ₹1',
      gradient: 'from-emerald-950 via-slate-900 to-indigo-950',
      borderColor: 'border-emerald-500/40',
      glowColor: 'bg-emerald-500/15',
      action: () => setActiveTab('wallet'),
      icon: (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 blur-lg opacity-40 animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-2.5 shadow-xl flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform">
            <Zap className="w-8 h-8 text-white font-black" />
          </div>
          <span className="absolute -top-1 -right-1 text-xs">💸</span>
        </div>
      ),
    });

    // 4. Special Bonus: Referral Booster
    list.push({
      id: 'bonus_team_referral',
      category: 'SPECIAL BONUS',
      badgeColor: 'bg-purple-500/25 text-purple-300 border-purple-500/40',
      title: 'Refer & Earn Unlimited Coins',
      subtitle: 'Passive Daily Earnings',
      description: `Get +${settings.referralRewardCoins} Coins for every invited earner, plus your friend receives an instant +${settings.referralJoinBonusCoins} Coins welcome bonus!`,
      actionText: 'Invite Friends',
      rewardTag: `+${settings.referralRewardCoins} Coins/Ref`,
      gradient: 'from-purple-950 via-pink-950 to-indigo-950',
      borderColor: 'border-purple-500/40',
      glowColor: 'bg-purple-500/15',
      action: () => setActiveTab('team'),
      icon: (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 blur-lg opacity-40 animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 p-2.5 shadow-xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
            <Gift className="w-8 h-8 text-white font-black" />
          </div>
          <span className="absolute -bottom-1 -right-1 text-xs">🎁</span>
        </div>
      ),
    });

    // 5. Rewarded Ads Quick Video
    list.push({
      id: 'bonus_rewarded_ads',
      category: 'SPECIAL BONUS',
      badgeColor: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40',
      title: 'Watch Sponsored 15s Videos',
      subtitle: 'Instant Video Rewards',
      description: `Watch short partner ads with anti-fraud verification and earn +${settings.adRewardCoins} Free Coins instantly every time!`,
      actionText: 'Watch Ad Now',
      rewardTag: `+${settings.adRewardCoins} Coins/Ad`,
      gradient: 'from-cyan-950 via-blue-950 to-slate-950',
      borderColor: 'border-cyan-500/40',
      glowColor: 'bg-cyan-500/15',
      action: () => {
        if (onOpenAd) onOpenAd();
        else setActiveTab('earn');
      },
      icon: (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 blur-lg opacity-40 animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-2.5 shadow-xl flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform">
            <Tv className="w-8 h-8 text-white font-black" />
          </div>
          <span className="absolute -top-1 -left-1 text-xs">🎬</span>
        </div>
      ),
    });

    return list;
  }, [tasks, announcements, settings, onOpenAd, setActiveTab]);

  const totalSlides = banners.length;

  // Auto sliding timer (4.8 seconds)
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4800);

    return () => clearInterval(timer);
  }, [isPaused, totalSlides]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null && touchEndX !== null) {
      const distance = touchStartX - touchEndX;
      const minSwipeDistance = 45;
      if (distance > minSwipeDistance) {
        handleNext();
      } else if (distance < -minSwipeDistance) {
        handlePrev();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
    setIsPaused(false);
  };

  if (totalSlides === 0) return null;

  return (
    <div
      className="relative select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Outer Shell with Hidden Overflow to clamp slides */}
      <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-indigo-950/60 border border-indigo-500/20">
        {/* Horizontal Sliding Reel Track */}
        <div
          className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`w-full shrink-0 relative p-4 sm:p-5 bg-gradient-to-br ${banner.gradient} border-b sm:border-b-0 border-white/5 flex flex-col justify-between`}
            >
              {/* Dynamic ambient blur sphere */}
              <div
                className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${banner.glowColor}`}
              />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Category Pill & Special Indicator */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${banner.badgeColor}`}
                    >
                      {banner.category}
                    </span>
                    {banner.rewardTag && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.2 rounded-full">
                        {banner.rewardTag}
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug truncate">
                    {banner.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2">
                    {banner.description}
                  </p>

                  {/* Direct Call to Action */}
                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      onClick={banner.action}
                      className="py-1.5 px-3.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-xs shadow-md transition-all flex items-center space-x-1.5 group/btn"
                    >
                      <span>{banner.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {banner.subtitle}
                    </span>
                  </div>
                </div>

                {/* Right 3D Visual Asset Illustration */}
                <div className="shrink-0 flex items-center justify-center pl-2">
                  {banner.icon}
                </div>
              </div>

              {/* Slide Progress / Navigation Footer Bar */}
              <div className="mt-4 pt-2.5 flex items-center justify-between border-t border-white/10">
                {/* Horizontal Segment Indicators */}
                <div className="flex items-center space-x-1.5">
                  {banners.map((b, i) => (
                    <button
                      key={b.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        currentIndex === i
                          ? 'w-7 bg-white shadow-sm shadow-white/50'
                          : 'w-1.5 bg-white/25 hover:bg-white/45'
                      }`}
                      aria-label={`Jump to slide ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Slide Counter & Next/Prev Controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {currentIndex + 1} / {totalSlides}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handlePrev}
                      className="p-1 rounded-lg bg-black/25 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
                      aria-label="Previous banner"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-1 rounded-lg bg-black/25 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
                      aria-label="Next banner"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
