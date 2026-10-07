import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Task, TaskCategory, TaskSubmission } from '../types';
import {
  Flame,
  Tv,
  Coins,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
  FileCheck,
  Smartphone,
  Share2,
  Search,
  AlertCircle,
  X,
  PlayCircle,
  Sparkles,
  Gift,
} from 'lucide-react';

interface EarnViewProps {
  onOpenAd: () => void;
  onOpenAuth: () => void;
}

export const EarnView: React.FC<EarnViewProps> = ({ onOpenAd, onOpenAuth }) => {
  const { user, settings, tasks, submissions, submitTask } = useApp();

  const [activeTab, setActiveTab] = useState<'marketplace' | 'submissions'>('marketplace');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofLink, setProofLink] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const categories = [
    { id: 'all', label: 'All Tasks' },
    { id: 'app', label: 'App Installs' },
    { id: 'daily', label: 'Video Ads & Daily' },
    { id: 'social', label: 'Social Channels' },
    { id: 'survey', label: 'Surveys' },
  ];

  const filteredTasks = tasks.filter((t) => {
    if (t.status !== 'active') return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const adsWatchedToday = user?.adsWatchedToday || 0;
  const adsRemaining = Math.max(0, settings.dailyAdLimit - adsWatchedToday);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!selectedTask) return;

    if (!proofNotes.trim() && !proofLink.trim()) {
      setSubmitError('Please provide proof notes or a verification link');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    const res = await submitTask(selectedTask.id, proofLink, proofNotes);
    setSubmitLoading(false);

    if (res.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedTask(null);
        setProofLink('');
        setProofNotes('');
        setActiveTab('submissions');
      }, 1500);
    } else {
      setSubmitError(res.error || 'Submission failed');
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* View Switcher: Marketplace vs Submissions */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-indigo-900/50">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'marketplace'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Task Marketplace</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'submissions'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>My Submissions ({submissions.length})</span>
        </button>
      </div>

      {activeTab === 'marketplace' ? (
        <>
          {/* Rewarded Ad Card Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950 border border-indigo-500/40 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black text-white">Sponsored Video Network</h3>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      AdMob
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Watch short 15s sponsored video ads • Daily: {adsWatchedToday}/{settings.dailyAdLimit}
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenAd}
                disabled={adsRemaining <= 0 || settings.videoAdsEnabled === false}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  settings.videoAdsEnabled === false
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : adsRemaining > 0
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 hover:scale-105'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-white" />
                <span>
                  {settings.videoAdsEnabled === false
                    ? 'Paused'
                    : adsRemaining > 0
                    ? 'Watch Ad'
                    : 'Limit Done'}
                </span>
              </button>
            </div>
          </div>

          {/* Categories Horizontal Filter */}
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600/30 border-indigo-400 text-white'
                    : 'bg-slate-900/60 border-indigo-950/60 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Promotional Task Booster Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/20 via-purple-600/20 to-indigo-600/20 border border-amber-500/30 p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-md shadow-amber-500/30">
                <Coins className="w-5 h-5 text-amber-950" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-300">
                    25% Boost
                  </span>
                  <h4 className="text-xs font-black text-white">Daily Partner Bounty</h4>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Complete tasks with the <strong>Popular</strong> tag to get automatic bonus coin multipliers!
                </p>
              </div>
            </div>
          </div>

          {/* Tasks List (Admin Controlled) */}
          {settings.tasksEnabled === false ? (
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 text-center space-y-2">
              <Flame className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="font-bold text-sm text-white">Tasks Marketplace Paused</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tasks marketplace is currently paused by administrator for catalog update. Please check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active tasks found in this category right now.
                </div>
              ) : (
                filteredTasks.map((t) => {
                const userSubmission = submissions.find((s) => s.taskId === t.id);

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-4 rounded-3xl glass-card border border-indigo-500/20 hover:border-indigo-400/50 transition-all cursor-pointer group shadow-lg shadow-indigo-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {t.badge && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {t.badge}
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-semibold text-slate-400">
                            {t.category}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center space-x-1 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xl">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-black text-amber-300">
                            +{t.rewardCoins}
                          </span>
                        </div>

                        {userSubmission ? (
                          <span
                            className={`mt-2 block text-[10px] font-bold uppercase ${
                              userSubmission.status === 'approved'
                                ? 'text-emerald-400'
                                : userSubmission.status === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            ● {userSubmission.status}
                          </span>
                        ) : (
                          <span className="mt-2 block text-[10px] font-semibold text-indigo-400 flex items-center justify-end space-x-0.5 group-hover:translate-x-1 transition-transform">
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Integrated Task Ad Booster Row */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-center space-x-1.5 text-purple-300 font-extrabold text-[10px]">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>+{t.adBonusCoins || 25} Ad Booster Bonus</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAd();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-[10px] font-extrabold flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
                        title="Watch Ad for Instant Coins"
                      >
                        <PlayCircle className="w-3 h-3 text-amber-300" />
                        <span>Watch Ad</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          )}
        </>
      ) : (
        /* Submissions View */
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center">
              <FileCheck className="w-10 h-10 text-slate-600 mb-3" />
              <p className="font-semibold text-white">No task proofs submitted yet</p>
              <p className="text-slate-400 mt-1 max-w-xs">
                Browse available tasks in the marketplace, complete the steps, and submit your proof.
              </p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-3xl bg-slate-900/80 border border-indigo-900/40 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        sub.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : sub.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      ● {sub.status}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{sub.taskTitle}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Submitted: {new Date(sub.submittedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <span className="text-xs font-black text-amber-300 bg-amber-400/10 px-2 py-1 rounded-xl">
                    +{sub.rewardCoins} Coins
                  </span>
                </div>

                {sub.proofNotes && (
                  <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-slate-400 text-[10px] uppercase block mb-0.5">
                      Your Proof:
                    </strong>
                    {sub.proofNotes}
                  </p>
                )}

                {sub.adminNotes && (
                  <p className="text-xs text-indigo-300 mt-2 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/40">
                    <strong className="text-indigo-400 text-[10px] uppercase block mb-0.5">
                      Reviewer Feedback:
                    </strong>
                    {sub.adminNotes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Details & Proof Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-indigo-900/40">
              <div className="flex-1 pr-4">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedTask.category}
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">{selectedTask.title}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs font-black text-amber-300 flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reward: +{selectedTask.rewardCoins} Coins</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Instructions:
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-3 rounded-xl border border-indigo-950">
                  {selectedTask.instructions}
                </p>
              </div>

              {selectedTask.externalUrl && (
                <div>
                  <a
                    href={selectedTask.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md hover:opacity-95"
                  >
                    <span>Open Task Link / App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Sponsored Video Ad Booster in every task */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-slate-900 border border-purple-500/40 shadow-lg space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center space-x-1.5">
                        <span>Task Ad Bonus Booster</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black border border-amber-400/30">
                          +{selectedTask.adBonusCoins || 25} Coins
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        Watch a quick 30s sponsored video ad to claim bonus coins & unlock fast-track approval!
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAd()}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-purple-950/60 active:scale-95 transition-all"
                >
                  <PlayCircle className="w-4 h-4 text-amber-300" />
                  <span>Watch Sponsored Ad (+{selectedTask.adBonusCoins || 25} Coins)</span>
                </button>
              </div>

              {/* Submission Form */}
              <form onSubmit={handleSubmitProof} className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Submit Verification Proof:
                </h4>

                {submitError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Task proof submitted! Reviewer will verify shortly.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Proof Screenshot URL / Link (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... or image link"
                    value={proofLink}
                    onChange={(e) => setProofLink(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Proof Notes / Registered Details (Required)
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter registered mobile number, survey completion code, or username..."
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitLoading || submitSuccess}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 hover:opacity-95 transition-opacity"
                >
                  {submitLoading ? 'Submitting...' : 'Submit Proof for Verification'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
