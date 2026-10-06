import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  CreditCard,
  QrCode,
  X,
  Filter,
} from 'lucide-react';

interface WalletViewProps {
  onOpenAuth: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ onOpenAuth }) => {
  const { user, settings, transactions, withdrawals, submitWithdrawal } = useApp();

  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [filterType, setFilterType] = useState<string>('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [withdrawCoins, setWithdrawCoins] = useState(settings.minWithdrawalCoins);
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState(user?.name || '');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const availableCoins = user?.coins || 0;
  const availableCurrency = (availableCoins / settings.coinToCurrencyRatio).toFixed(2);
  const pendingCoins = user?.pendingWithdrawalCoins || 0;
  const totalWithdrawnCoins = user?.totalWithdrawn || 0;
  const totalEarnedCoins = user?.totalEarnings || 0;

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'all') return true;
    if (filterType === 'credits') return t.amountCoins > 0;
    if (filterType === 'debits') return t.amountCoins < 0;
    return true;
  });

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError('');

    const res = await submitWithdrawal(withdrawCoins, withdrawMethod, {
      upiId,
      bankAccountNumber: bankAccount,
      bankIfsc,
      bankAccountName: bankName,
    });

    setWithdrawLoading(false);

    if (res.success) {
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdrawModal(false);
        setActiveTab('withdrawals');
      }, 1500);
    } else {
      setWithdrawError(res.error || 'Failed to submit withdrawal');
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Wallet Balance Hero Card in 3D */}
      <div className="card-3d relative overflow-hidden rounded-3xl p-6 border-t border-purple-400/40 border-b-4 border-indigo-950 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-200 uppercase tracking-wider drop-shadow-sm">
              Available Balance
            </span>
          </div>

          <span className="badge-3d text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
            ● Verified Wallet
          </span>
        </div>

        <div className="mt-4 flex items-baseline space-x-3">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
            {settings.currencySymbol}
            {availableCurrency}
          </span>
          <span className="text-sm font-black text-indigo-300">
            ({availableCoins.toLocaleString()} Coins)
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mt-1">
          Minimum withdrawal: {settings.minWithdrawalCoins} Coins ({settings.currencySymbol}
          {(settings.minWithdrawalCoins / settings.coinToCurrencyRatio).toFixed(2)})
        </p>

        {/* 3D Action Button */}
        {settings.withdrawalsEnabled === false && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold text-center">
            ⚠️ {settings.withdrawalsDisabledReason || 'Withdrawals are temporarily paused for system maintenance.'}
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={() => {
              if (settings.withdrawalsEnabled === false) return;
              if (!user) {
                onOpenAuth();
              } else {
                setShowWithdrawModal(true);
              }
            }}
            disabled={settings.withdrawalsEnabled === false}
            className={`btn-3d w-full py-3.5 px-4 rounded-2xl font-black text-xs shadow-xl flex items-center justify-center space-x-2 ${
              settings.withdrawalsEnabled === false
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'btn-3d-emerald text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>
              {settings.withdrawalsEnabled === false
                ? 'Withdrawals Paused by Administrator'
                : 'Request Instant Withdrawal (UPI / Bank)'}
            </span>
          </button>
        </div>

        {/* Sub-metrics */}
        <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-indigo-900/50 text-center">
          <div>
            <p className="text-[10px] text-slate-400">Pending</p>
            <p className="text-xs font-bold text-amber-300 mt-0.5">
              {settings.currencySymbol}
              {(pendingCoins / settings.coinToCurrencyRatio).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Total Withdrawn</p>
            <p className="text-xs font-bold text-indigo-300 mt-0.5">
              {settings.currencySymbol}
              {(totalWithdrawnCoins / settings.coinToCurrencyRatio).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Total Earned</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">
              {settings.currencySymbol}
              {(totalEarnedCoins / settings.coinToCurrencyRatio).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs: Transactions vs Withdrawals */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-indigo-900/50">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'transactions'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Coin Ledger ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'withdrawals'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Withdrawal Requests ({withdrawals.length})
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex space-x-2">
            {[
              { id: 'all', label: 'All Activity' },
              { id: 'credits', label: 'Earnings (+)' },
              { id: 'debits', label: 'Withdrawals (-)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  filterType === f.id
                    ? 'bg-indigo-600/30 border-indigo-400 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No transactions recorded yet.
            </div>
          ) : (
            filteredTransactions.map((txn) => (
              <div
                key={txn.id}
                className="p-3.5 rounded-2xl bg-slate-900/70 border border-indigo-950/60 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
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
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span>
                        {new Date(txn.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{txn.id.substring(0, 10)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <p
                    className={`text-xs font-black ${
                      txn.amountCoins >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {txn.amountCoins >= 0 ? `+${txn.amountCoins}` : txn.amountCoins} Coins
                  </p>
                  <span className="text-[9px] block text-slate-400 uppercase font-semibold">
                    {txn.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Withdrawals List */
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No withdrawal requests submitted yet.
            </div>
          ) : (
            withdrawals.map((wd) => (
              <div
                key={wd.id}
                className="p-4 rounded-3xl bg-slate-900/80 border border-indigo-900/40 space-y-2 shadow-md"
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
                    <h4 className="text-sm font-bold text-white mt-1">
                      {settings.currencySymbol}
                      {wd.amountCurrency.toFixed(2)} ({wd.amountCoins} Coins)
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Requested:{' '}
                      {new Date(wd.requestedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <span className="text-[10px] uppercase font-bold text-indigo-300 bg-indigo-950 px-2 py-1 rounded-lg border border-indigo-800">
                    {wd.method.toUpperCase()}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 text-xs text-slate-300 font-mono">
                  {wd.method === 'upi' ? (
                    <div>UPI ID: {wd.upiId}</div>
                  ) : (
                    <div>
                      Bank A/C: {wd.bankAccountNumber} ({wd.bankIfsc}) - {wd.bankAccountName}
                    </div>
                  )}
                </div>

                {wd.rejectionReason && (
                  <p className="text-xs text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-900/40">
                    Reason: {wd.rejectionReason}
                  </p>
                )}

                {wd.txnHash && (
                  <p className="text-[10px] text-emerald-300 font-mono">
                    Bank Ref / UTR: {wd.txnHash}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Withdrawal Request Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Request Withdrawal</h3>
                  <p className="text-xs text-slate-400">Withdraw your Free Earn Coins</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="py-4 space-y-4">
              {withdrawError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {withdrawError}
                </div>
              )}

              {withdrawSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Withdrawal queued! Funds will process in 2-24 hours.</span>
                </div>
              )}

              {/* Amount Coins Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Coins to Withdraw (Available: {availableCoins.toLocaleString()})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={settings.minWithdrawalCoins}
                    max={availableCoins}
                    value={withdrawCoins}
                    onChange={(e) => setWithdrawCoins(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-900 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                  <div className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">
                    ≈ {settings.currencySymbol}
                    {(withdrawCoins / settings.coinToCurrencyRatio).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Method Selector: UPI vs Bank */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('upi')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                      withdrawMethod === 'upi'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI VPA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bank')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                      withdrawMethod === 'bank'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {withdrawMethod === 'upi' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@okaxis or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name as per bank records"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter 9-18 digit account number"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-900 rounded-xl text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-950 text-[10px] text-slate-400 space-y-1 border border-slate-800">
                <p>• Payout is sent only to accounts matching your verified details.</p>
                <p>• The amount will move to pending until confirmed by payment gateway/admin.</p>
              </div>

              <button
                type="submit"
                disabled={withdrawLoading || withdrawSuccess || availableCoins < withdrawCoins}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {withdrawLoading ? 'Processing Request...' : 'Confirm Withdrawal Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
