import React from 'react';
import { X, HelpCircle, Shield, FileText, Mail, MessageCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaqModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useApp();
  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How does Free Earn work?',
      a: 'Free Earn partners with verified app developers, survey networks, and brand sponsors. When you complete approved tasks, check in daily, or watch sponsored ads, partners pay us a fee, which we share directly with you as Free Earn Coins.',
    },
    {
      q: `What is the value of 100 Free Earn Coins?`,
      a: `100 Coins equal ${settings.currencySymbol}${(100 / settings.coinToCurrencyRatio).toFixed(2)}. Coins can be withdrawn directly to your UPI ID or Bank Account once you reach the minimum balance.`,
    },
    {
      q: `What is the minimum withdrawal limit?`,
      a: `The minimum withdrawal threshold is ${settings.minWithdrawalCoins} Coins (${settings.currencySymbol}${(settings.minWithdrawalCoins / settings.coinToCurrencyRatio).toFixed(2)}). This ensures low transaction fees for users.`,
    },
    {
      q: 'How long do withdrawals take?',
      a: 'All withdrawal requests are processed within 2 to 24 business hours directly via automated banking rails or UPI.',
    },
    {
      q: 'How do Task verifications work?',
      a: 'After you submit proof (e.g. registered phone or confirmation ID), our automated backend and review team verifies the activity. Once approved, coins are immediately credited to your wallet.',
    },
    {
      q: 'Can I create multiple accounts?',
      a: 'No. Strictly one account is permitted per device/mobile number. Using VPNs, emulators, auto-clickers, or duplicate accounts leads to permanent ban and coin forfeiture under our Fair Play policy.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Frequently Asked Questions</h3>
              <p className="text-xs text-indigo-300/80">Everything you need to know about Free Earn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {faqs.map((f, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/60 border border-indigo-950/60">
              <h4 className="text-xs font-bold text-indigo-300 flex items-start space-x-2">
                <span className="text-indigo-400 font-mono">Q.</span>
                <span>{f.q}</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 pl-4 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const TermsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Terms & Conditions</h3>
              <p className="text-xs text-indigo-300/80">Free Earn Fair Play & Service Terms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-300 leading-relaxed pr-1">
          <section>
            <h4 className="font-bold text-white mb-1">1. Acceptance of Terms</h4>
            <p>
              By accessing or using the Free Earn mobile or web application ("Free Earn", "we", "us"), you agree to abide by these terms. If you do not agree, do not use the app.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-white mb-1">2. Legitimate Earning Conditions</h4>
            <p>
              Free Earn provides rewards for genuine human completion of engagement activities, sponsored surveys, app testing, and rewarded advertising. We do not promise guaranteed income, investment returns, or financial compensation beyond verified partner rewards.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-white mb-1">3. Anti-Fraud & Account Integrity</h4>
            <p>
              Any attempt to manipulate reward counters, use robotic scripts, automate ad views, exploit system bugs, or create multiple accounts on the same device is strictly prohibited. Free Earn reserves the right to freeze accounts and zero fraudulent balances.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-white mb-1">4. Withdrawal Rules</h4>
            <p>
              Withdrawals require reaching the active minimum threshold and providing authentic UPI or Bank account information. Free Earn is not liable for funds sent to incorrect UPI IDs provided by users.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const ContactSupportModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useApp();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Contact & Support</h3>
              <p className="text-xs text-indigo-300/80">We’re here to help 24/7</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <a
            href={`mailto:${settings.supportEmail}`}
            className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-900/40 flex items-center space-x-3 hover:border-indigo-500 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Email Helpdesk</h4>
              <p className="text-xs text-slate-400">{settings.supportEmail}</p>
            </div>
          </a>

          <a
            href={`https://wa.me/${settings.supportWhatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-900/40 flex items-center space-x-3 hover:border-emerald-500 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">WhatsApp Fast Help</h4>
              <p className="text-xs text-slate-400">{settings.supportWhatsapp}</p>
            </div>
          </a>

          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-indigo-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              For withdrawal or task verification queries, please mention your <strong>User ID</strong> and <strong>Transaction ID</strong> in the message.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
