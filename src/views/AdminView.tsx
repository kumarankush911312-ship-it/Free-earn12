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
  AlertTriangle,
  Plus,
  Settings,
  Megaphone,
  Search,
  Lock,
  Unlock,
  Edit3,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Task, TaskSubmission, Withdrawal, UserProfile } from '../types';

export const AdminView: React.FC = () => {
  const {
    isAdmin,
    user,
    settings,
    allUsers,
    allSubmissions,
    allWithdrawals,
    tasks,
    adminApproveTask,
    adminRejectTask,
    adminProcessWithdrawalAction,
    adminCreateNewTask,
    adminUpdateAppSettings,
    adminAdjustBalance,
    adminToggleUserBlock,
    adminPostAnnouncement,
    refreshAllData,
  } = useApp();

  const [activeSection, setActiveSection] = useState<
    'withdrawals' | 'submissions' | 'users' | 'tasks' | 'settings' | 'broadcast'
  >('withdrawals');

  const [refreshing, setRefreshing] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [actionReason, setActionReason] = useState('');

  // Balance adjustment modal
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');

  // Task creation form
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReward, setNewReward] = useState(150);
  const [newCategory, setNewCategory] = useState<'app' | 'survey' | 'social' | 'daily'>('app');
  const [newInstructions, setNewInstructions] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Settings form
  const [minWdCoins, setMinWdCoins] = useState(settings.minWithdrawalCoins);
  const [refCoins, setRefCoins] = useState(settings.referralRewardCoins);
  const [joinBonusCoins, setJoinBonusCoins] = useState(settings.referralJoinBonusCoins);
  const [adReward, setAdReward] = useState(settings.adRewardCoins);
  const [dailyAdCap, setDailyAdCap] = useState(settings.dailyAdLimit);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annBadge, setAnnBadge] = useState('Update');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAdjust || !adjustReason.trim()) return;

    await adminAdjustBalance(selectedUserForAdjust.uid, adjustAmount, adjustReason);
    setSelectedUserForAdjust(null);
    setAdjustReason('');
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
      dailyLimit: 500,
      status: 'active',
      badge: 'New',
      externalUrl: newUrl,
      verificationMethod: 'proof_link',
    });

    setShowNewTaskModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewInstructions('');
    setNewUrl('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminUpdateAppSettings({
      minWithdrawalCoins: Number(minWdCoins),
      referralRewardCoins: Number(refCoins),
      referralJoinBonusCoins: Number(joinBonusCoins),
      adRewardCoins: Number(adReward),
      dailyAdLimit: Number(dailyAdCap),
    });
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMsg.trim()) return;

    await adminPostAnnouncement(annTitle, annMsg, annBadge, 'high');
    setAnnTitle('');
    setAnnMsg('');
  };

  // Metrics
  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === 'pending');
  const pendingSubmissions = allSubmissions.filter((s) => s.status === 'pending');
  const totalCoinsInCirculation = allUsers.reduce((sum, u) => sum + u.coins, 0);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Top Admin Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border border-rose-600/40 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">Free Earn Admin Console</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/40">
                  Master Privileges
                </span>
              </div>
              <p className="text-xs text-rose-200/80">Authorized Admin: {user?.email || user?.name}</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-indigo-300 hover:text-white rounded-xl bg-slate-800 border border-slate-700 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Admin KPI stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-rose-900/40">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-[10px] text-slate-400">Total Registered Users</p>
            <p className="text-sm font-extrabold text-white mt-0.5">{allUsers.length}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-[10px] text-slate-400">Pending Withdrawals</p>
            <p className="text-sm font-extrabold text-amber-300 mt-0.5">
              {pendingWithdrawals.length}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-[10px] text-slate-400">Pending Task Proofs</p>
            <p className="text-sm font-extrabold text-cyan-300 mt-0.5">
              {pendingSubmissions.length}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-[10px] text-slate-400">Active Coins Ledger</p>
            <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
              {totalCoinsInCirculation.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'withdrawals' as const, label: `Withdrawals (${pendingWithdrawals.length})` },
          { id: 'submissions' as const, label: `Task Proofs (${pendingSubmissions.length})` },
          { id: 'users' as const, label: `Users (${allUsers.length})` },
          { id: 'tasks' as const, label: `Tasks (${tasks.length})` },
          { id: 'settings' as const, label: 'Settings' },
          { id: 'broadcast' as const, label: 'Broadcast' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
              activeSection === tab.id
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                : 'bg-slate-900 border-indigo-950 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Withdrawals Management */}
      {activeSection === 'withdrawals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Withdrawal Queue ({allWithdrawals.length})
            </h4>
          </div>

          {allWithdrawals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No withdrawal requests logged yet.
            </div>
          ) : (
            allWithdrawals.map((wd) => (
              <div
                key={wd.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-indigo-900/40 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        wd.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : wd.status === 'approved'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : wd.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      ● {wd.status}
                    </span>
                    <h5 className="text-sm font-bold text-white mt-1">
                      {settings.currencySymbol}
                      {wd.amountCurrency.toFixed(2)} ({wd.amountCoins} Coins)
                    </h5>
                    <p className="text-xs text-slate-300 mt-0.5">
                      User: <strong>{wd.userName}</strong> ({wd.userMobile})
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      UID: {wd.userId} • Req: {new Date(wd.requestedAt).toLocaleString()}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-indigo-300 uppercase px-2.5 py-1 rounded-xl bg-indigo-950 border border-indigo-800">
                    {wd.method}
                  </span>
                </div>

                {/* Account Details Box */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
                  {wd.method === 'upi' ? (
                    <div>
                      <strong className="text-indigo-400">UPI ID:</strong> {wd.upiId}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div>
                        <strong className="text-indigo-400">Account:</strong> {wd.bankAccountNumber}
                      </div>
                      <div>
                        <strong className="text-indigo-400">IFSC:</strong> {wd.bankIfsc}
                      </div>
                      <div>
                        <strong className="text-indigo-400">Name:</strong> {wd.bankAccountName}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions if Pending */}
                {wd.status === 'pending' && (
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => adminProcessWithdrawalAction(wd, 'approved', 'Approved by admin')}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() =>
                        adminProcessWithdrawalAction(wd, 'paid', 'Payment confirmed via banking channel')
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Mark Paid</span>
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason for user:') || 'Details did not match';
                        adminProcessWithdrawalAction(wd, 'rejected', reason);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-xs font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Submissions Review */}
      {activeSection === 'submissions' && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            User Task Submissions ({allSubmissions.length})
          </h4>

          {allSubmissions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No task proofs awaiting review.
            </div>
          ) : (
            allSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-indigo-900/40 space-y-2.5 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        sub.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : sub.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      ● {sub.status}
                    </span>
                    <h5 className="text-sm font-bold text-white mt-1">{sub.taskTitle}</h5>
                    <p className="text-xs text-slate-300">
                      User: <strong>{sub.userName}</strong> ({sub.userMobile})
                    </p>
                  </div>

                  <span className="text-xs font-black text-amber-300 bg-amber-400/10 px-2 py-1 rounded-xl">
                    +{sub.rewardCoins} Coins
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  {sub.proofLink && (
                    <div>
                      <strong className="text-indigo-400">Proof Link:</strong>{' '}
                      <a
                        href={sub.proofLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline"
                      >
                        {sub.proofLink}
                      </a>
                    </div>
                  )}
                  {sub.proofNotes && (
                    <div>
                      <strong className="text-indigo-400">User Notes:</strong> {sub.proofNotes}
                    </div>
                  )}
                </div>

                {sub.status === 'pending' && (
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => adminApproveTask(sub, 'Verified and approved')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Credit Coins</span>
                    </button>

                    <button
                      onClick={() => {
                        const note = prompt('Rejection reason:') || 'Proof verification failed';
                        adminRejectTask(sub, note);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-xs font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. User Management */}
      {activeSection === 'users' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name, mobile, or UID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-indigo-900 rounded-xl text-xs text-white"
            />
          </div>

          <div className="space-y-2">
            {allUsers
              .filter(
                (u) =>
                  u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.mobile.includes(userSearch) ||
                  u.uid.includes(userSearch)
              )
              .map((u) => (
                <div
                  key={u.uid}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-950 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <h5 className="text-xs font-bold text-white">{u.name}</h5>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {u.level}
                      </span>
                      {u.isBlocked && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {u.mobile} • {u.coins} Coins (Total: {u.totalEarnings})
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setSelectedUserForAdjust(u)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold"
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => adminToggleUserBlock(u.uid, !u.isBlocked)}
                      className={`p-1.5 rounded-lg text-xs font-semibold ${
                        u.isBlocked
                          ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-rose-950 text-rose-300 hover:bg-rose-900'
                      }`}
                      title={u.isBlocked ? 'Unblock User' : 'Block User'}
                    >
                      {u.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Task Management */}
      {activeSection === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Tasks</h4>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Task</span>
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-950 flex items-center justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-white">{t.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Category: {t.category} • Reward: +{t.rewardCoins} Coins
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400">● {t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. System Settings */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveSettings} className="glass-card rounded-3xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Global Reward & Withdrawal Settings
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Minimum Withdrawal (Coins)
              </label>
              <input
                type="number"
                value={minWdCoins}
                onChange={(e) => setMinWdCoins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Referral Inviter Reward (Coins)
              </label>
              <input
                type="number"
                value={refCoins}
                onChange={(e) => setRefCoins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Referral Invitee Bonus (Coins)
              </label>
              <input
                type="number"
                value={joinBonusCoins}
                onChange={(e) => setJoinBonusCoins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Rewarded Ad Bonus (Coins)
              </label>
              <input
                type="number"
                value={adReward}
                onChange={(e) => setAdReward(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Daily Ad Limit Per User
              </label>
              <input
                type="number"
                value={dailyAdCap}
                onChange={(e) => setDailyAdCap(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95"
          >
            Save App Settings
          </button>
        </form>
      )}

      {/* 6. Broadcast Announcement */}
      {activeSection === 'broadcast' && (
        <form onSubmit={handleBroadcastAnnouncement} className="glass-card rounded-3xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Broadcast System Announcement
          </h4>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. ⚡ Special Weekend 2X Bonus Active!"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Message</label>
            <textarea
              rows={3}
              required
              placeholder="Describe the update or promotion..."
              value={annMsg}
              onChange={(e) => setAnnMsg(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Badge Tag</label>
            <input
              type="text"
              value={annBadge}
              onChange={(e) => setAnnBadge(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95"
          >
            Send Broadcast Announcement
          </button>
        </form>
      )}

      {/* Balance Adjustment Modal */}
      {selectedUserForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">
              Adjust Balance: {selectedUserForAdjust.name}
            </h4>
            <p className="text-xs text-slate-400">
              Current Balance: {selectedUserForAdjust.coins} Coins
            </p>

            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amount Coins (Positive to credit, Negative to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Auditable Reason (Required)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manual compensation / Contest winner"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  Confirm Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForAdjust(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">Create New Earning Task</h4>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Try New Video Streaming App"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Short brief description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reward Coins
                  </label>
                  <input
                    type="number"
                    required
                    value={newReward}
                    onChange={(e) => setNewReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as 'app' | 'survey' | 'social' | 'daily')
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                  >
                    <option value="app">App Install</option>
                    <option value="survey">Survey</option>
                    <option value="social">Social Media</option>
                    <option value="daily">Daily Read</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Step-by-Step Instructions
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="1. Open link&#10;2. Register with phone&#10;3. Submit confirmation"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  placeholder="https://play.google.com/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-950 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white text-xs font-bold"
                >
                  Publish Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
