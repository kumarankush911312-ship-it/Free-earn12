import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AdSponsor, RewardedAdController } from '../services/adNetwork';
import {
  X,
  Volume2,
  VolumeX,
  Coins,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Play,
  Pause,
  Sparkles,
  ChevronRight,
  Tv,
  Star,
  Download,
} from 'lucide-react';

interface AdMobPageAdModalProps {
  isOpen: boolean;
  targetTab: string;
  onClose: () => void;
}

export const AdMobPageAdModal: React.FC<AdMobPageAdModalProps> = ({
  isOpen,
  targetTab,
  onClose,
}) => {
  const { settings, recordRewardedAdReward } = useApp();

  const [sponsor, setSponsor] = useState<AdSponsor | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const totalDuration = settings.pageAdSkipSeconds || 5; // 5-second full screen interstitial page ad
  const rewardCoins = settings.pageAdRewardCoins ?? 5; // Fixed 5 coins per page ad

  useEffect(() => {
    if (isOpen) {
      const selected = RewardedAdController.getRandomSponsor();
      setSponsor(selected);
      setSecondsRemaining(5);
      setCanSkip(false);
      setIsCompleted(false);
      setRewardClaimed(false);
      setIsPlaying(true);
    }
  }, [isOpen, targetTab]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !sponsor || isCompleted || !isPlaying) return;

    if (secondsRemaining <= 0) {
      setIsCompleted(true);
      setCanSkip(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsCompleted(true);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, sponsor, isCompleted, isPlaying, secondsRemaining]);

  // Full Screen 60FPS Video Canvas Engine (Simulates 1080p high-tech AdMob mobile commercial)
  useEffect(() => {
    if (!isOpen || !sponsor) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let frame = 0;
    const accent = sponsor.accentColor || '#6366f1';

    // Particle field
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 1.5,
      speedY: (Math.random() - 0.5) * 1.5,
      opacity: Math.random() * 0.7 + 0.3,
    }));

    const render = () => {
      frame++;

      // Deep dark cinematic background with dynamic radial gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#05070c');
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Pulsing Aurora lights in sponsor accent color
      const pulse = Math.sin(frame * 0.03) * 0.5 + 0.5;
      const glowGrad = ctx.createRadialGradient(
        width / 2 + Math.cos(frame * 0.02) * 120,
        height / 2 + Math.sin(frame * 0.02) * 80,
        20,
        width / 2,
        height / 2,
        width * 0.65
      );
      glowGrad.addColorStop(0, `${accent}${Math.round((0.25 + pulse * 0.15) * 255).toString(16).padStart(2, '0')}`);
      glowGrad.addColorStop(0.6, `${accent}15`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Concentric rotating rings (Holographic Video HUD)
      ctx.save();
      ctx.translate(width / 2, height * 0.42);

      // Ring 1
      ctx.beginPath();
      ctx.arc(0, 0, 110 + Math.sin(frame * 0.05) * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `${accent}55`;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.stroke();

      // Ring 2 (outer counter-rotating)
      ctx.beginPath();
      ctx.arc(0, 0, 140, frame * 0.02, frame * 0.02 + Math.PI * 1.4);
      ctx.strokeStyle = '#ffffff25';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([20, 15]);
      ctx.stroke();

      // Audio frequency wave bars at center bottom of stage
      const barCount = 28;
      const barWidth = 4;
      const barGap = 6;
      const totalWaveWidth = barCount * (barWidth + barGap);
      ctx.setLineDash([]);
      for (let i = 0; i < barCount; i++) {
        const barHeight = 15 + Math.abs(Math.sin(frame * 0.08 + i * 0.35)) * 40;
        const barX = -totalWaveWidth / 2 + i * (barWidth + barGap);
        const barGrad = ctx.createLinearGradient(0, 180, 0, 180 - barHeight);
        barGrad.addColorStop(0, `${accent}99`);
        barGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = barGrad;
        ctx.fillRect(barX, 180 - barHeight, barWidth, barHeight);
      }

      ctx.restore();

      // Render floating glow particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${accent}${Math.round(p.opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      });

      // Video scanlines subtle texture
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, sponsor]);

  if (!isOpen || !sponsor) return null;

  const progressPercent = Math.min(
    100,
    Math.round(((totalDuration - secondsRemaining) / totalDuration) * 100)
  );

  const handleFinishAndContinue = async () => {
    if (!rewardClaimed && isCompleted) {
      try {
        await recordRewardedAdReward(rewardCoins, `Full Screen Page Ad (${targetTab})`);
        setRewardClaimed(true);
      } catch {}
    }
    onClose();
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'home':
        return 'Home';
      case 'earn':
        return 'Earn Tasks';
      case 'wallet':
        return 'Wallet';
      case 'team':
        return 'Team';
      case 'profile':
        return 'Profile';
      default:
        return `${tab.toUpperCase()}`;
    }
  };

  const admobAppId = settings.admobAppId || 'ca-app-pub-7524191132114722~4422067441';
  const admobUnitId = settings.admobRewardedUnitId || 'ca-app-pub-7524191132114722/4622212147';

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-black flex flex-col justify-between overflow-hidden select-none animate-fadeIn">
      {/* 60FPS Full-Screen Canvas Video Backdrop */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* ================= 1. FULL-SCREEN ADMOB TOP HEADER ================= */}
      <header className="relative z-20 w-full px-4 pt-4 sm:pt-6 pb-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent">
        {/* Left: Google AdMob Official Badging */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 backdrop-blur-md shadow-lg shadow-black/50">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-0.5" />
            <span className="text-amber-400 font-black text-xs tracking-wider">AdMob</span>
            <span className="text-[10px] text-slate-400 font-semibold border-l border-slate-700 pl-1.5 hidden xs:inline">
              Video Ad
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center space-x-1 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>+{rewardCoins} Coins</span>
          </div>
        </div>

        {/* Right: Sound Toggle + Real-time Skip / Close Button */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-slate-300 hover:text-white rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md transition-all active:scale-95"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {canSkip ? (
            <button
              onClick={handleFinishAndContinue}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center space-x-1.5 shadow-xl shadow-emerald-600/50 border border-emerald-400/50 transition-all active:scale-95 animate-pulse"
            >
              <span>Skip Video</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-3.5 py-1.5 rounded-full bg-black/80 border border-amber-500/30 text-[11px] font-mono text-amber-300 font-bold flex items-center space-x-1.5 backdrop-blur-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Skip in {secondsRemaining}s</span>
            </div>
          )}

          <button
            onClick={handleFinishAndContinue}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md transition-colors"
            title="Close Ad"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= 2. FULL-SCREEN VIDEO CENTER STAGE ================= */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-xl mx-auto w-full text-center space-y-4">
        {/* Animated Brand Hologram Icon */}
        <div className="relative">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl mx-auto flex items-center justify-center shadow-2xl text-white font-black text-4xl sm:text-5xl border-2 border-white/30 backdrop-blur-md transition-transform duration-500 hover:scale-105"
            style={{
              backgroundColor: sponsor.accentColor,
              boxShadow: `0 0 50px ${sponsor.accentColor}88`,
            }}
          >
            {sponsor.brand.charAt(0)}
          </div>

          {/* Floating live indicator */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/90 border border-slate-700 text-[10px] font-bold text-slate-200 flex items-center space-x-1 shadow-md whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Commercial Video 1080p</span>
          </div>
        </div>

        {/* Sponsor Titles & Descriptions */}
        <div className="space-y-1.5 max-w-md mx-auto pt-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
              Featured Ad
            </span>
            <span className="text-xs font-bold text-slate-300">
              {sponsor.category}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
            {sponsor.brand}
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed drop-shadow">
            {sponsor.tagline}
          </p>

          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto line-clamp-2 leading-normal">
            {sponsor.description}
          </p>
        </div>

        {/* Video Scrubber Timeline */}
        <div className="w-full max-w-xs sm:max-w-sm pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>0:0{totalDuration - secondsRemaining}</span>
            <span className="text-amber-400 font-bold">0:0{totalDuration}</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800/80 border border-slate-700/60 overflow-hidden shadow-inner p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-1000 ease-linear shadow-lg shadow-amber-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </main>

      {/* ================= 3. FULL-SCREEN ADMOB BOTTOM OVERLAY CARD ================= */}
      <footer className="relative z-20 w-full px-4 pb-4 sm:pb-6 pt-3 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-lg mx-auto w-full rounded-3xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl p-3.5 sm:p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg border border-white/20"
                style={{ backgroundColor: sponsor.accentColor }}
              >
                {sponsor.brand.charAt(0)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-black text-sm text-white truncate">{sponsor.brand}</h4>
                  <div className="flex text-amber-400 text-[10px]">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="font-bold ml-0.5 text-slate-300">4.9</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{sponsor.tagline}</p>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 mt-0.5">
                  <span>Free Download</span>
                  <span>•</span>
                  <span>10M+ Users</span>
                </div>
              </div>
            </div>

            {/* Install / Explore CTA Button */}
            <a
              href={sponsor.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shrink-0 shadow-lg shadow-amber-500/30 flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <span>{sponsor.actionText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Action / Next Page Navigation Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span>Next:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-bold">
                {getPageTitle(targetTab)} Page
              </span>
            </div>

            {isCompleted ? (
              <button
                onClick={handleFinishAndContinue}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 active:scale-95 transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Open {getPageTitle(targetTab)} (+{rewardCoins} Coins)</span>
              </button>
            ) : (
              <button
                onClick={handleFinishAndContinue}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center space-x-1 transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Official Google AdMob Production Credentials Verification */}
          <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <div className="truncate max-w-[200px]">
              <span className="text-slate-400">App ID:</span> {admobAppId}
            </div>
            <div className="truncate max-w-[200px] text-right">
              <span className="text-slate-400">Unit ID:</span> {admobUnitId}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
