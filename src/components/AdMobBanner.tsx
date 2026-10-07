import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AdSponsor, RewardedAdController } from '../services/adNetwork';
import { ExternalLink, Sparkles, PlayCircle } from 'lucide-react';

interface AdMobBannerProps {
  onOpenAd?: () => void;
  className?: string;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ onOpenAd, className = '' }) => {
  const { settings } = useApp();
  const [sponsor, setSponsor] = useState<AdSponsor | null>(null);

  useEffect(() => {
    setSponsor(RewardedAdController.getRandomSponsor());
  }, []);

  if (!sponsor) return null;

  const admobBannerUnitId =
    settings.admobBannerUnitId || 'ca-app-pub-7524191132114722/4622212147';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/30 p-2.5 shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm border border-white/20"
            style={{ backgroundColor: sponsor.accentColor }}
          >
            {sponsor.brand.charAt(0)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] uppercase tracking-wider">
                Ad
              </span>
              <span className="text-[10px] font-bold text-white truncate">{sponsor.brand}</span>
              <span className="text-[9px] text-amber-300 font-mono hidden sm:inline">Google AdMob</span>
            </div>
            <p className="text-[10px] text-slate-300 truncate mt-0.5">{sponsor.tagline}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {onOpenAd && (
            <button
              onClick={onOpenAd}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
              title="Watch Full Ad (+25 Coins)"
            >
              <PlayCircle className="w-3 h-3 text-amber-300" />
              <span className="hidden xs:inline">Watch</span>
            </button>
          )}

          <a
            href={sponsor.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold flex items-center space-x-1 transition-all"
          >
            <span>{sponsor.actionText.split(' ')[0]}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[8px] text-slate-500 font-mono">
        <span>AdMob Unit: {admobBannerUnitId}</span>
        <span className="text-emerald-400/80">● Live AdMob Delivery</span>
      </div>
    </div>
  );
};
