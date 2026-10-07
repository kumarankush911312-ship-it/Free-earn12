import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Coins,
  Bell,
  Lock,
} from 'lucide-react';

interface TelegramJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmJoined?: () => void;
}

export const TelegramJoinModal: React.FC<TelegramJoinModalProps> = ({
  isOpen,
  onClose,
  onConfirmJoined,
}) => {
  const { settings, recordRewardedAdReward } = useApp();
  const [clickedJoin, setClickedJoin] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const telegramUrl =
    settings.telegramChannelUrl || 'https://t.me/+gUbcV1SSrDQzMDNl';

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      localStorage.setItem('freeearn_telegram_joined', 'true');
      localStorage.setItem('freeearn_telegram_joined_at', new Date().toISOString());

      // Reward 20 bonus coins for completing mandatory join
      try {
        await recordRewardedAdReward(20, 'Telegram Channel Mandatory Join');
      } catch {}

      if (onConfirmJoined) onConfirmJoined();
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-sky-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-sky-950/80 space-y-4">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-sky-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* Top Telegram Icon with Animated Pulse */}
        <div className="text-center relative">
          <div className="relative inline-block">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-sky-600 via-sky-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-sky-500/40 border-2 border-white/30 transform hover:scale-105 transition-transform">
              <Send className="w-8 h-8 sm:w-10 sm:h-10 text-white -rotate-12 translate-x-0.5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border border-slate-900" />
            </span>
          </div>

          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Join Hona Jaruri Hai (Mandatory Step)</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white mt-2 leading-tight">
            Telegram Channel Me Join Hona Zaroori Hai!
          </h2>

          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Sabhi new loot offers, daily bonus codes, UPI payment proofs aur withdrawal alerts sabse pehle hamare official Telegram par aate hain. App me aage badhne ke liye channel join karein:
          </p>
        </div>

        {/* Telegram Benefits List */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-sky-500/20 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Daily Free Giveaway Promo Codes</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant UPI & Bank Payout Proofs</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Fast-Track Account Verification & Support</span>
          </div>
        </div>

        {/* Link Box Preview */}
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setClickedJoin(true)}
          className="block p-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-center font-mono text-xs text-sky-400 hover:text-sky-300 truncate transition-colors"
        >
          {telegramUrl}
        </a>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Main Join Button */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setClickedJoin(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-sky-600/40 flex items-center justify-center space-x-2 active:scale-95 transition-all animate-bounce text-center cursor-pointer"
          >
            <Send className="w-4 h-4 -rotate-12" />
            <span>👉 Join Official Telegram Now (Click Here)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              clickedJoin
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 hover:opacity-95'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {confirming
                ? 'Verifying...'
                : '✅ Maine Join Kar Liya Hai (Continue to App)'}
            </span>
          </button>
        </div>

        {/* Reward Note */}
        <div className="text-center pt-1">
          <p className="text-[11px] text-amber-300 font-semibold flex items-center justify-center space-x-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Join karne par +20 Bonus Coins wallet me credit honge!</span>
          </p>
        </div>
      </div>
    </div>
  );
};
