import React, { useState } from 'react';
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
} from 'lucide-react';

interface TeamViewProps {
  onOpenAuth: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ onOpenAuth }) => {
  const { user, settings, transactions } = useApp();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referralCode || 'FREE99';
  const referralLink = `${window.location.origin}/r/${referralCode}`;

  // Filter referral bonus transactions
  const referralTransactions = transactions.filter(
    (t) => t.type === 'referral_bonus' && t.status === 'completed'
  );

  const totalReferrals = referralTransactions.length;
  const activeReferrals = totalReferrals;
  const totalReferralCoins = referralTransactions.reduce((acc, t) => acc + t.amountCoins, 0);

  const [copyToast, setCopyToast] = useState<string | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setCopyToast('Code Copied!');
    setTimeout(() => {
      setCopied(false);
      setCopyToast(null);
    }, 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopyToast('Invite Link Copied!');
    setTimeout(() => setCopyToast(null), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Free Earn - Earn Smart. Earn Daily.',
        text: `Join Free Earn app and earn real daily cash rewards! Use my invite code ${referralCode} to get +50 Free Coins instantly!`,
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  const shareWhatsapp = () => {
    const text = encodeURIComponent(
      `🎁 *Free Earn App Invite*\nEarn real cash daily with daily check-ins, tasks & video ads!\n\nUse my Referral Code: *${referralCode}* to get an instant *+${settings.referralJoinBonusCoins || 50} Free Coins* joining bonus!\n\n👇 Click this link to register & start earning:\n${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(
      `🎁 Join Free Earn App and earn daily rewards! Use code ${referralCode} for +${settings.referralJoinBonusCoins || 50} Free Coins bonus!\n${referralLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {settings.referralEnabled === false && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold text-center">
          ⚠️ Referral Program is temporarily paused by the administrator. Any past earned referral commissions remain credited.
        </div>
      )}

      {/* Referral Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 p-6 border border-purple-500/30 shadow-xl">
        <div className="relative z-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-pink-500/30">
            <Gift className="w-6 h-6" />
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">Refer Friends & Earn</h3>
          <p className="text-xs text-indigo-200 max-w-xs mx-auto leading-relaxed">
            Invite your friends to Free Earn. You get{' '}
            <strong className="text-amber-300">+{settings.referralRewardCoins} Coins</strong> and they get{' '}
            <strong className="text-emerald-300">+{settings.referralJoinBonusCoins} Coins</strong> on signup!
          </p>

          {copyToast && (
            <div className="py-1 px-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold inline-block animate-bounce">
              ✓ {copyToast}
            </div>
          )}

          {/* Referral Code Box */}
          <div className="mt-3 p-3 rounded-2xl bg-slate-950/80 border border-purple-500/40 flex items-center justify-between max-w-sm mx-auto">
            <div className="text-left pl-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Your Unique Invite Code
              </span>
              <span className="text-lg font-black text-white tracking-widest font-mono">
                {referralCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Short Referral Link Box */}
          <div className="mt-2 p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between max-w-sm mx-auto">
            <div className="text-left pl-2 overflow-hidden mr-2">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block">
                ⚡ Short Invite Link
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate block font-mono">
                {referralLink}
              </span>
            </div>

            <button
              onClick={handleCopyLink}
              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 flex items-center space-x-1 shadow-md transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
          </div>

          {/* Share Buttons */}
          <div className="pt-2 flex justify-center space-x-2">
            <button
              onClick={shareWhatsapp}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-md shadow-emerald-600/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={shareTelegram}
              className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-md shadow-sky-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Telegram</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Referral Statistics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card rounded-2xl p-3.5 text-center border border-indigo-900/40">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Referrals</p>
          <p className="text-lg font-black text-white mt-1">{totalReferrals}</p>
        </div>

        <div className="glass-card rounded-2xl p-3.5 text-center border border-indigo-900/40">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Active Team</p>
          <p className="text-lg font-black text-indigo-300 mt-1">{activeReferrals}</p>
        </div>

        <div className="glass-card rounded-2xl p-3.5 text-center border border-indigo-900/40">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Earned Coins</p>
          <p className="text-lg font-black text-amber-300 mt-1">+{totalReferralCoins}</p>
        </div>
      </div>

      {/* How Referral System Works */}
      <div className="glass-card rounded-3xl p-5 border border-indigo-900/40 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>How Free Earn Team System Works</span>
        </h4>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Share Your Code</h5>
              <p className="text-xs text-slate-300 mt-0.5">
                Send your unique referral code or link to friends, family, or social media followers.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Friend Registers</h5>
              <p className="text-xs text-slate-300 mt-0.5">
                Your friend gets an instant bonus of +{settings.referralJoinBonusCoins} Free Coins on creating their verified account.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">You Get Rewarded</h5>
              <p className="text-xs text-slate-300 mt-0.5">
                You receive +{settings.referralRewardCoins} Coins credited to your wallet, automatically moving you closer to higher level tiers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div className="glass-card rounded-3xl p-4 border border-indigo-900/40">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Recent Referral Rewards
        </h4>

        {referralTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No referral bonuses recorded yet. Share your code to build your team!
          </div>
        ) : (
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

                <span className="text-xs font-black text-amber-300">+{t.amountCoins} Coins</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
