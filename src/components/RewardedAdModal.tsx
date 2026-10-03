import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Play,
} from 'lucide-react';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ isOpen, onClose }) => {
  const { user, settings, recordRewardedAdReward } = useApp();

  const [sponsor, setSponsor] = useState<AdSponsor | null>(null);
  const [adSessionId, setAdSessionId] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [rewardGranted, setRewardGranted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const selectedSponsor = RewardedAdController.getRandomSponsor();
      setSponsor(selectedSponsor);
      setAdSessionId(`AD_SESS_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      setSecondsRemaining(selectedSponsor.videoDurationSeconds);
      setIsCompleted(false);
      setShowExitWarning(false);
      setVerifying(false);
      setRewardGranted(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isCompleted || showExitWarning || !sponsor) return;

    if (secondsRemaining <= 0) {
      setIsCompleted(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, secondsRemaining, isCompleted, showExitWarning, sponsor]);

  if (!isOpen || !sponsor) return null;

  const totalDuration = sponsor.videoDurationSeconds;
  const progressPercent = Math.min(100, Math.round(((totalDuration - secondsRemaining) / totalDuration) * 100));

  const handleClaimReward = async () => {
    if (!isCompleted || verifying || rewardGranted) return;
    setVerifying(true);

    const result = RewardedAdController.verifyAdCompletion(
      adSessionId,
      sponsor,
      totalDuration,
      settings.adRewardCoins
    );

    if (result.verified) {
      await recordRewardedAdReward(settings.adRewardCoins, sponsor.brand);
      setRewardGranted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      alert(result.error || 'Verification failed');
    }
    setVerifying(false);
  };

  const handleAttemptClose = () => {
    if (isCompleted || rewardGranted) {
      onClose();
    } else {
      setShowExitWarning(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-slate-900 border border-indigo-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Ad Network Bar */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 uppercase tracking-wider">
              Sponsored Video
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {!isCompleted ? `Ad ends in ${secondsRemaining}s` : 'Ad Completed'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleAttemptClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Interactive Simulated Video Screen */}
        <div className="relative h-64 bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 opacity-20 blur-2xl pointer-events-none"
            style={{ backgroundColor: sponsor.accentColor }}
          />

          <div className="relative z-10 space-y-3">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-xl text-white font-extrabold text-2xl"
              style={{ backgroundColor: sponsor.accentColor }}
            >
              {sponsor.brand.charAt(0)}
            </div>

            <span className="inline-block text-[11px] font-semibold text-indigo-300 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-indigo-800/40">
              {sponsor.category}
            </span>

            <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
              {sponsor.brand}
            </h3>

            <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto leading-relaxed">
              {sponsor.tagline}
            </p>
          </div>

          {/* Playing wave animation indicator */}
          {!isCompleted && (
            <div className="absolute bottom-3 left-4 flex items-center space-x-1.5 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Playing Commercial</span>
            </div>
          )}
        </div>

        {/* Ad Details & Action Call */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
            {sponsor.description}
          </p>

          <a
            href={sponsor.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-700 transition-colors"
          >
            <span>{sponsor.actionText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Claim / Complete Button */}
          {isCompleted ? (
            <button
              onClick={handleClaimReward}
              disabled={verifying || rewardGranted}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2 ${
                rewardGranted
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:opacity-95 shadow-emerald-500/30'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>{rewardGranted ? 'Ad Completed!' : 'Finish & Close Ad'}</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Please watch sponsored video till end ({secondsRemaining}s)</span>
            </div>
          )}
        </div>

        {/* Exit Warning Dialog */}
        {showExitWarning && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Leave early?</h4>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              If you close the ad now, the sponsored video will be stopped.
            </p>
            <div className="space-y-2 w-full">
              <button
                onClick={() => setShowExitWarning(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                Resume Video ({secondsRemaining}s left)
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-xs font-semibold"
              >
                Close Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
